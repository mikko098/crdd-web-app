import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RoadDamage } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import StatusBadge from './StatusBadge';
import SeverityIndicator from './SeverityIndicator';
import DamageImageWithDetections from './DamageImageWithDetections';
import { MapPin } from 'lucide-react';

interface DamageListProps {
  damages: RoadDamage[];
  reportNavigationState?: {
    returnView: 'map' | 'list';
    reportIds: string[];
  };
}

const DamageList: React.FC<DamageListProps> = ({ damages, reportNavigationState }) => {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const damageTypeLabels: Record<string, string> = {
    pothole: 'Pothole',
    "transverse-crack": 'transverse Crack',
    "longitudinal-crack": 'Longitudinal Crack',
    "alligator": 'Alligator Crack',
    other: 'Other',
    'no-damage': 'No Damage',
  };

  if (damages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <MapPin className="w-12 h-12 mb-4 text-primary opacity-70" />
        <p className="text-lg font-medium">No damage reports found</p>
        <p className="text-sm">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-24">ID</TableHead>
            <TableHead className="w-20">Image</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Traffic</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Contributor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {damages.map((damage) => (
            <TableRow 
              key={damage.id} 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate(`/damage/${damage.id}`, { state: reportNavigationState })}
            >
              <TableCell className="font-medium">{damage.captureId ?? damage.id}</TableCell>
              <TableCell>
                <div className="h-12 w-12">
                  <DamageImageWithDetections
                    src={damage.imageUrl}
                    alt={`Damage ${damage.captureId ?? damage.id}`}
                    detections={damage.inferenceResults}
                    className="h-full w-full rounded-md"
                  />
                </div>
              </TableCell>
              <TableCell className="capitalize">
                {damageTypeLabels[damage.type]}
              </TableCell>
              <TableCell className="max-w-[200px]">
                <span className="truncate block">{damage.location.address}</span>
              </TableCell>
              <TableCell>
                <StatusBadge status={damage.status} size="sm" />
              </TableCell>
              <TableCell>
                <SeverityIndicator severity={damage.severity} />
              </TableCell>
              <TableCell>
                <span className="text-sm font-medium capitalize">{damage.trafficStatus}</span>
                {damage.trafficCongestion && (
                  <span className="block text-xs text-muted-foreground">
                    {damage.trafficCongestion.percent}% at {damage.trafficCongestion.speed} km/h
                  </span>
                )}
              </TableCell>
              <TableCell>{formatDate(damage.dateReported)}</TableCell>
              <TableCell>{damage.contributor.name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DamageList;
