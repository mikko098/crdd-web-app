import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RoadDamage } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from './StatusBadge';
import SeverityIndicator from './SeverityIndicator';
import DamageImageWithDetections from './DamageImageWithDetections';
import { MapPin, Calendar, User, MessageSquare, Eye } from 'lucide-react';

interface DamageCardProps {
  damage: RoadDamage;
  compact?: boolean;
  locationLabel?: string;
  showImage?: boolean;
  reportNavigationState?: {
    returnView: 'map' | 'list';
    reportIds: string[];
  };
}

const DamageCard: React.FC<DamageCardProps> = ({
  damage,
  compact = false,
  locationLabel,
  showImage = true,
  reportNavigationState,
}) => {
  const navigate = useNavigate();
  const displayLocation = locationLabel ?? damage.location.address;
  const openDetail = () => navigate(`/damage/${damage.id}`, { state: reportNavigationState });

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

  if (compact) {
    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group animate-fade-in">
        <CardContent className="p-0">
          <div className="flex gap-4 p-4">
            {showImage && (
              <div className="relative w-20 h-20 shrink-0">
                <DamageImageWithDetections
                  src={damage.imageUrl}
                  alt={`Damage ${damage.captureId ?? damage.id}`}
                  detections={damage.inferenceResults}
                  className="h-full w-full rounded-lg"
                  imageClassName="group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-semibold text-sm">{damage.captureId ?? damage.id}</span>
                <StatusBadge status={damage.status} size="sm" />
              </div>
              <p className="text-xs text-muted-foreground truncate mb-1">
                {displayLocation}
              </p>
              <SeverityIndicator severity={damage.severity} />
            </div>
          </div>
          <div className="px-4 pb-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={openDetail}
            >
              <Eye className="w-3 h-3 mr-1 text-primary" />
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow animate-fade-in">
      <CardContent className="p-0">
        <div className="relative h-40 overflow-hidden">
          <DamageImageWithDetections
            src={damage.imageUrl}
            alt={`Damage ${damage.captureId ?? damage.id}`}
            detections={damage.inferenceResults}
            className="h-full w-full"
          />
          <div className="absolute top-3 left-3">
            <StatusBadge status={damage.status} />
          </div>
        </div>
        
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">{damage.captureId ?? damage.id}</h3>
              <span className="text-sm text-muted-foreground capitalize">
                {damageTypeLabels[damage.type]}
              </span>
            </div>
            <SeverityIndicator severity={damage.severity} />
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="truncate">{displayLocation}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4 text-status-in-progress" />
              <span>{formatDate(damage.dateReported)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4 text-status-completed" />
              <span>{damage.contributor.name}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DamageCard;
