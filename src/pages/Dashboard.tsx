import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DamageType, DamageStatus, DamageSeverity } from '@/types';
import { useCaptures } from '@/hooks/useCaptures';
import { hasPermission } from '@/lib/permissions';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import MapView from '@/components/map/MapView';
import DamageList from '@/components/damage/DamageList';
import ManagerReportDashboard from '@/components/dashboard/ManagerReportDashboard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, BarChart3, Download, List, Map } from 'lucide-react';
import { LocationSearchResult } from '@/services/geocoding';

type DashboardView = 'overview' | 'map' | 'list';

interface Filters {
  types: DamageType[];
  statuses: DamageStatus[];
  severities: DamageSeverity[];
}

const NO_DAMAGE_TYPE: DamageType = 'no-damage';
const DASHBOARD_STATE_KEY = 'roadvision-dashboard-state';

interface SavedDashboardState {
  view?: DashboardView;
  filters?: Filters;
  sortBy?: string;
  searchTerm?: string;
  selectedSearchLocation?: LocationSearchResult | null;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

function isDashboardView(value: unknown): value is DashboardView {
  return value === 'overview' || value === 'map' || value === 'list';
}

function getSavedDashboardState(): SavedDashboardState {
  try {
    const stored = window.sessionStorage.getItem(DASHBOARD_STATE_KEY);
    return stored ? JSON.parse(stored) as SavedDashboardState : {};
  } catch {
    return {};
  }
}

const Dashboard: React.FC = () => {
  const location = useLocation();
  const savedDashboardState = useMemo(getSavedDashboardState, []);
  const requestedView = (location.state as { view?: unknown } | null)?.view;
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const { data: damages = [], isLoading, isError, error } = useCaptures();
  const hasMountedRef = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [view, setView] = useState<DashboardView>(
    isDashboardView(requestedView)
      ? requestedView
      : isDashboardView(savedDashboardState.view)
        ? savedDashboardState.view
        : 'overview',
  );
  const [filters, setFilters] = useState<Filters>(savedDashboardState.filters ?? {
    types: [],
    statuses: [],
    severities: [],
  });
  const [sortBy, setSortBy] = useState(savedDashboardState.sortBy ?? 'date-desc');
  const [searchTerm, setSearchTerm] = useState(savedDashboardState.searchTerm ?? '');
  const [selectedSearchLocation, setSelectedSearchLocation] = useState<LocationSearchResult | null>(
    savedDashboardState.selectedSearchLocation ?? null,
  );
  const [dateFrom, setDateFrom] = useState(savedDashboardState.dateFrom ?? '');
  const [dateTo, setDateTo] = useState(savedDashboardState.dateTo ?? '');
  const [page, setPage] = useState(savedDashboardState.page ?? 1);
  const [pageSize, setPageSize] = useState(savedDashboardState.pageSize ?? 25);
  const canExportReports = hasPermission(user, 'reports:export');
  const canViewManagerOverview = hasPermission(user, 'reports:export');

  const mapReportPool = useMemo(() => {
    let result = [...damages];
    const includeNoDamage = filters.types.includes(NO_DAMAGE_TYPE);

    if (!includeNoDamage) {
      result = result.filter(d => d.type !== NO_DAMAGE_TYPE);
    }

    return result;
  }, [damages, filters.types]);

  const filteredDamages = useMemo(() => {
    let result = [...mapReportPool];

    if (dateFrom) {
      const fromTime = new Date(`${dateFrom}T00:00:00`).getTime();
      result = result.filter(d => new Date(d.dateReported).getTime() >= fromTime);
    }

    if (dateTo) {
      const toTime = new Date(`${dateTo}T23:59:59`).getTime();
      result = result.filter(d => new Date(d.dateReported).getTime() <= toTime);
    }

    // Apply type filter
    if (filters.types.length > 0) {
      result = result.filter(d => filters.types.includes(d.type));
    }

    // Apply status filter
    if (filters.statuses.length > 0) {
      result = result.filter(d => filters.statuses.includes(d.status));
    }

    // Apply severity filter
    if (filters.severities.length > 0) {
      result = result.filter(d => filters.severities.includes(d.severity));
    }

    // Apply sorting (only for list view, but we'll do it anyway)
    const severityOrder: Record<DamageSeverity, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.dateReported).getTime() - new Date(b.dateReported).getTime();
        case 'date-desc':
          return new Date(b.dateReported).getTime() - new Date(a.dateReported).getTime();
        case 'severity-desc':
          return severityOrder[b.severity] - severityOrder[a.severity];
        case 'severity-asc':
          return severityOrder[a.severity] - severityOrder[b.severity];
        default:
          return 0;
      }
    });

    return result;
  }, [dateFrom, dateTo, filters.severities, filters.statuses, filters.types, mapReportPool, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredDamages.length / pageSize));
  const pagedDamages = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDamages.slice(start, start + pageSize);
  }, [filteredDamages, page, pageSize]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    setPage(1);
  }, [dateFrom, dateTo, filters, pageSize, sortBy, view]);

  useEffect(() => {
    if (isDashboardView(requestedView)) {
      setView(requestedView);
    }
  }, [requestedView]);

  useEffect(() => {
    const state: SavedDashboardState = {
      view,
      filters,
      sortBy,
      searchTerm,
      selectedSearchLocation,
      dateFrom,
      dateTo,
      page,
      pageSize,
    };

    window.sessionStorage.setItem(DASHBOARD_STATE_KEY, JSON.stringify(state));
  }, [dateFrom, dateTo, filters, page, pageSize, searchTerm, selectedSearchLocation, sortBy, view]);

  const handleLocationSelect = (location: LocationSearchResult | null) => {
    setSelectedSearchLocation(location);
    if (location) {
      setView('map');
    }
  };

  const exportFilteredReports = () => {
    if (!canExportReports) return;

    const headers = ['id', 'capture_id', 'type', 'severity', 'status', 'location', 'lat', 'lng', 'date_reported', 'contributor', 'assigned_team', 'traffic_status'];
    const rows = filteredDamages.map(d => [
      d.id,
      d.captureId ?? '',
      d.type,
      d.severity,
      d.status,
      d.location.address,
      d.location.lat,
      d.location.lng,
      d.dateReported,
      d.contributor.name,
      d.assignedTeam ?? '',
      d.trafficStatus,
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `road-damage-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isAuthLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const activeView = canViewManagerOverview ? view : view === 'overview' ? 'map' : view;
  const reportIds = filteredDamages.map((damage) => damage.id);
  const reportNavigationState = {
    returnView: activeView === 'overview' ? 'map' : activeView,
    reportIds,
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col">
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex min-h-[calc(100dvh-4rem)] flex-1 items-stretch">
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          filters={filters}
          onFiltersChange={setFilters}
          sortBy={sortBy}
          onSortChange={setSortBy}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedLocation={selectedSearchLocation}
          onLocationSelect={handleLocationSelect}
          dateFrom={dateFrom}
          onDateFromChange={setDateFrom}
          dateTo={dateTo}
          onDateToChange={setDateTo}
          view={activeView === 'overview' ? 'map' : activeView}
        />
        
        <main className="flex min-w-0 flex-1 flex-col">
          {/* View toggle */}
          <div className="p-4 border-b bg-card/95 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">
                {activeView === 'overview' ? 'Manager Report Dashboard' : 'Road Damage Reports'}
              </h2>
              <span className="text-sm text-muted-foreground">
                {filteredDamages.length} of {mapReportPool.length} reports
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {canExportReports && (
                <Button type="button" variant="outline" onClick={exportFilteredReports} disabled={!filteredDamages.length}>
                  <Download className="mr-2 h-4 w-4 text-primary" />
                  Export CSV
                </Button>
              )}
              <Tabs value={activeView} onValueChange={(v) => setView(v as DashboardView)}>
                <TabsList>
                  {canViewManagerOverview && (
                    <TabsTrigger value="overview" className="gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <span className="hidden sm:inline">Dashboard</span>
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="map" className="gap-2">
                    <Map className="w-4 h-4 text-primary" />
                    <span className="hidden sm:inline">Map View</span>
                  </TabsTrigger>
                  <TabsTrigger value="list" className="gap-2">
                    <List className="w-4 h-4 text-primary" />
                    <span className="hidden sm:inline">List View</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Content */}
          <div className={activeView === 'map' ? 'min-h-0 flex-1' : 'p-4'}>
            {isLoading ? (
              <div className={activeView === 'map' ? 'h-full min-h-[500px]' : 'space-y-4'}>
                <Skeleton className={activeView === 'map' ? 'h-full min-h-[500px] w-full' : 'h-[500px] w-full rounded-lg'} />
                {activeView === 'list' && <Skeleton className="h-12 w-64" />}
              </div>
            ) : isError ? (
              <div className="p-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <AlertTitle>Unable to load Firebase captures</AlertTitle>
                  <AlertDescription>
                    {error instanceof Error ? error.message : 'Check Firestore read rules and Firebase configuration.'}
                  </AlertDescription>
                </Alert>
              </div>
            ) : activeView === 'overview' ? (
              <ManagerReportDashboard damages={filteredDamages} />
            ) : activeView === 'map' ? (
              <MapView
                damages={filteredDamages}
                focusedLocation={selectedSearchLocation}
                reportNavigationState={reportNavigationState}
              />
            ) : (
              <div className="space-y-3">
                <DamageList damages={pagedDamages} reportNavigationState={reportNavigationState} />
                <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} ({filteredDamages.length} matching reports)
                  </p>
                  <div className="flex items-center gap-2">
                    <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
