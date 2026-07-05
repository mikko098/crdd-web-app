import React, { useEffect, useRef, useState } from 'react';
import { DamageType, DamageStatus, DamageSeverity } from '@/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar,
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  SortAsc,
  RotateCcw,
  Loader2,
  MapPin,
  Search,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LocationSearchResult, searchNominatimLocations } from '@/services/geocoding';

interface Filters {
  types: DamageType[];
  statuses: DamageStatus[];
  severities: DamageSeverity[];
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  searchTerm: string;
  onSearchChange: (search: string) => void;
  selectedLocation: LocationSearchResult | null;
  onLocationSelect: (location: LocationSearchResult | null) => void;
  dateFrom: string;
  onDateFromChange: (date: string) => void;
  dateTo: string;
  onDateToChange: (date: string) => void;
  view: 'map' | 'list';
}

const damageTypes: { value: DamageType; label: string }[] = [
  { value: 'pothole', label: 'Pothole' },
  { value: 'transverse-crack', label: 'Transverse Crack' },
  { value: 'alligator', label: 'Alligator Crack' },
  { value: 'longitudinal-crack', label: 'Longitudinal Crack' },
  { value: 'other', label: 'Other' },
  { value: 'no-damage', label: 'No Damage' },
];

const statuses: { value: DamageStatus; label: string; color: string }[] = [
  { value: 'urgent', label: 'Urgent', color: 'bg-status-urgent' },
  { value: 'pending', label: 'Pending', color: 'bg-status-pending' },
  { value: 'in-progress', label: 'In Progress', color: 'bg-status-in-progress' },
  { value: 'completed', label: 'Completed', color: 'bg-status-completed' },
];

const severities: { value: DamageSeverity; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const sortOptions = [
  { value: 'date-desc', label: 'Newest First' },
  { value: 'date-asc', label: 'Oldest First' },
  { value: 'severity-desc', label: 'Severity (High to Low)' },
  { value: 'severity-asc', label: 'Severity (Low to High)' },
];

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
  searchTerm,
  onSearchChange,
  selectedLocation,
  onLocationSelect,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  view,
}) => {
  const [locationResults, setLocationResults] = useState<LocationSearchResult[]>([]);
  const [isSearchingLocations, setIsSearchingLocations] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState('');
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const locationSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cleanSearch = searchTerm.trim();
    let isCurrent = true;

    if (cleanSearch.length < 3) {
      setLocationResults([]);
      setLocationSearchError('');
      setIsSearchingLocations(false);
      return undefined;
    }

    setIsSearchingLocations(true);
    setLocationSearchError('');

    const timer = window.setTimeout(() => {
      searchNominatimLocations(cleanSearch)
        .then((results) => {
          if (!isCurrent) return;
          setLocationResults(results);
          setIsLocationDropdownOpen(true);
        })
        .catch((error) => {
          if (!isCurrent) return;
          console.warn('Location search failed.', error);
          setLocationResults([]);
          setLocationSearchError('Unable to search locations.');
          setIsLocationDropdownOpen(true);
        })
        .finally(() => {
          if (isCurrent) setIsSearchingLocations(false);
        });
    }, 350);

    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [searchTerm]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!locationSearchRef.current?.contains(event.target as Node)) {
        setIsLocationDropdownOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const toggleType = (type: DamageType) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types: newTypes });
  };

  const toggleStatus = (status: DamageStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  const toggleSeverity = (severity: DamageSeverity) => {
    const newSeverities = filters.severities.includes(severity)
      ? filters.severities.filter(s => s !== severity)
      : [...filters.severities, severity];
    onFiltersChange({ ...filters, severities: newSeverities });
  };

  const resetFilters = () => {
    onFiltersChange({ types: [], statuses: [], severities: [] });
    onSortChange('date-desc');
    onSearchChange('');
    onLocationSelect(null);
    setLocationResults([]);
    setLocationSearchError('');
    onDateFromChange('');
    onDateToChange('');
  };

  const selectLocation = (location: LocationSearchResult) => {
    onLocationSelect(location);
    onSearchChange(location.label);
    setIsLocationDropdownOpen(false);
  };

  const clearLocationSearch = () => {
    onSearchChange('');
    onLocationSelect(null);
    setLocationResults([]);
    setLocationSearchError('');
    setIsLocationDropdownOpen(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-foreground/20 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      <aside
        className={cn(
          "fixed left-0 top-16 h-[calc(100dvh-4rem)] bg-sidebar text-sidebar-foreground border-r border-sidebar-border z-50 transition-sidebar overflow-hidden lg:sticky lg:top-16 lg:self-start lg:shrink-0",
          isOpen ? "w-72" : "w-0 lg:w-14"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Toggle button */}
          <div className="p-2 flex justify-end border-b border-sidebar-border">
            <Button variant="ghost" size="icon" onClick={onToggle}>
              {isOpen ? (
                <ChevronLeft className="w-4 h-4 text-sidebar-primary drop-shadow-sm" />
              ) : (
                <ChevronRight className="w-4 h-4 text-sidebar-primary drop-shadow-sm" />
              )}
            </Button>
          </div>

          {isOpen && (
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-sidebar-primary drop-shadow-sm" />
                  <span className="font-semibold">Filters</span>
                </div>
                <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 px-2">
                  <RotateCcw className="w-3 h-3 mr-1 text-sidebar-primary drop-shadow-sm" />
                  Reset
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location-search" className="text-sm font-medium">Search Locations</Label>
                <div ref={locationSearchRef} className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-primary drop-shadow-sm" />
                  <Input
                    id="location-search"
                    value={searchTerm}
                    onChange={(event) => {
                      onSearchChange(event.target.value);
                      onLocationSelect(null);
                      setIsLocationDropdownOpen(true);
                    }}
                    onFocus={() => setIsLocationDropdownOpen(true)}
                    placeholder="Search city, road, district"
                    className="pl-9 pr-9"
                  />
                  {isSearchingLocations ? (
                    <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-sidebar-primary" />
                  ) : searchTerm ? (
                    <button
                      type="button"
                      aria-label="Clear location search"
                      className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      onClick={clearLocationSearch}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}

                  {isLocationDropdownOpen && searchTerm.trim().length >= 3 && (
                    <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-[80] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg">
                      {locationResults.length > 0 ? (
                        <div className="max-h-72 overflow-y-auto py-1">
                          {locationResults.map((location) => (
                            <button
                              key={location.id}
                              type="button"
                              className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-sidebar-accent focus:bg-sidebar-accent focus:outline-none"
                              onClick={() => selectLocation(location)}
                            >
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sidebar-primary" />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium">{location.label}</span>
                                <span className="line-clamp-2 text-xs text-muted-foreground">{location.detail}</span>
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="px-3 py-2 text-sm text-muted-foreground">
                          {isSearchingLocations ? 'Searching locations...' : locationSearchError || 'No locations found.'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {selectedLocation ? (
                  <p className="text-xs text-muted-foreground">
                    Map target: {selectedLocation.label}
                  </p>
                ) : null}
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-medium">Date Range</Label>
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(event) => onDateFromChange(event.target.value)}
                      aria-label="Start date"
                      className="dashboard-date-input pr-9"
                    />
                    <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-primary drop-shadow-sm" />
                  </div>
                  <div className="relative">
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(event) => onDateToChange(event.target.value)}
                      aria-label="End date"
                      className="dashboard-date-input pr-9"
                    />
                    <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-primary drop-shadow-sm" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Damage Types */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Damage Type</Label>
                <div className="space-y-2">
                  {damageTypes.map(type => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={type.value}
                        checked={filters.types.includes(type.value)}
                        onCheckedChange={() => toggleType(type.value)}
                      />
                      <label
                        htmlFor={type.value}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {type.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Status */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Status</Label>
                <div className="space-y-2">
                  {statuses.map(status => (
                    <div key={status.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={status.value}
                        checked={filters.statuses.includes(status.value)}
                        onCheckedChange={() => toggleStatus(status.value)}
                      />
                      <div className={cn("w-2 h-2 rounded-full", status.color)} />
                      <label
                        htmlFor={status.value}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {status.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Severity */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Severity</Label>
                <div className="space-y-2">
                  {severities.map(severity => (
                    <div key={severity.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={severity.value}
                        checked={filters.severities.includes(severity.value)}
                        onCheckedChange={() => toggleSeverity(severity.value)}
                      />
                      <label
                        htmlFor={severity.value}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {severity.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sort - Only show for list view */}
              {view === 'list' && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <SortAsc className="w-4 h-4 text-sidebar-primary drop-shadow-sm" />
                      <Label className="text-sm font-medium">Sort By</Label>
                    </div>
                    <Select value={sortBy} onValueChange={onSortChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sortOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Collapsed state icons */}
          {!isOpen && (
            <div className="hidden lg:flex flex-col items-center gap-4 p-2 pt-4">
              <Button variant="ghost" size="icon" onClick={onToggle} title="Open Filters">
                <Filter className="w-4 h-4 text-sidebar-primary drop-shadow-sm" />
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
