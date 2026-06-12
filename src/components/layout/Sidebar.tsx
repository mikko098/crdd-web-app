import React from 'react';
import { DamageType, DamageStatus, DamageSeverity } from '@/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  SortAsc,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Filters {
  types: DamageType[];
  statuses: DamageStatus[];
  severities: DamageSeverity[];
  showNoDetections: boolean;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  view: 'map' | 'list';
}

const damageTypes: { value: DamageType; label: string }[] = [
  { value: 'pothole', label: 'Pothole' },
  { value: 'transverse-crack', label: 'Transverse Crack' },
  { value: 'alligator', label: 'Alligator Crack' },
  { value: 'longitudinal-crack', label: 'Longitudinal Crack' },
  { value: 'other', label: 'Other' },
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
  view,
}) => {
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
    onFiltersChange({ types: [], statuses: [], severities: [], showNoDetections: false });
    onSortChange('date-desc');
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
          "fixed lg:relative h-[calc(100vh-4rem)] bg-sidebar border-r border-sidebar-border z-50 transition-sidebar overflow-hidden",
          isOpen ? "w-72" : "w-0 lg:w-14"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Toggle button */}
          <div className="p-2 flex justify-end border-b border-sidebar-border">
            <Button variant="ghost" size="icon" onClick={onToggle}>
              {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>

          {isOpen && (
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold">Filters</span>
                </div>
                <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 px-2">
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
              </div>

              {/* No-detection captures */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-no-detections"
                    checked={filters.showNoDetections}
                    onCheckedChange={(checked) =>
                      onFiltersChange({ ...filters, showNoDetections: Boolean(checked) })
                    }
                  />
                  <label
                    htmlFor="show-no-detections"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Show captures with no detections
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Hidden by default so the map only shows confirmed damage reports.
                </p>
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
                      <SortAsc className="w-4 h-4 text-muted-foreground" />
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
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
