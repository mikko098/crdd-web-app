import React, { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DamageType, DamageStatus, DamageSeverity } from '@/types';
import { useCaptures } from '@/hooks/useCaptures';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import MapView from '@/components/map/MapView';
import DamageList from '@/components/damage/DamageList';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, List, Map } from 'lucide-react';

interface Filters {
  types: DamageType[];
  statuses: DamageStatus[];
  severities: DamageSeverity[];
  showNoDetections: boolean;
}

const Dashboard: React.FC = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { data: damages = [], isLoading, isError, error } = useCaptures();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [filters, setFilters] = useState<Filters>({
    types: [],
    statuses: [],
    severities: [],
    showNoDetections: false,
  });
  const [sortBy, setSortBy] = useState('date-desc');

  const filteredDamages = useMemo(() => {
    let result = [...damages];

    if (!filters.showNoDetections) {
      result = result.filter(d => (d.inferenceResults?.length ?? 0) > 0);
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
  }, [damages, filters, sortBy]);

  if (isAuthLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          filters={filters}
          onFiltersChange={setFilters}
          sortBy={sortBy}
          onSortChange={setSortBy}
          view={view}
        />
        
        <main className="flex-1 overflow-hidden flex flex-col">
          {/* View toggle */}
          <div className="p-4 border-b bg-card flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">Road Damage Reports</h2>
              <span className="text-sm text-muted-foreground">
                {filteredDamages.length} of {damages.length} reports
              </span>
            </div>
            
            <Tabs value={view} onValueChange={(v) => setView(v as 'map' | 'list')}>
              <TabsList>
                <TabsTrigger value="map" className="gap-2">
                  <Map className="w-4 h-4" />
                  <span className="hidden sm:inline">Map View</span>
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-2">
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">List View</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-[500px] w-full rounded-lg" />
                <Skeleton className="h-12 w-64" />
              </div>
            ) : isError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Unable to load Firebase captures</AlertTitle>
                <AlertDescription>
                  {error instanceof Error ? error.message : 'Check Firestore read rules and Firebase configuration.'}
                </AlertDescription>
              </Alert>
            ) : view === 'map' ? (
              <MapView damages={filteredDamages} />
            ) : (
              <DamageList damages={filteredDamages} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
