import React from 'react';
import { DamageSeverity } from '@/types';
import { cn } from '@/lib/utils';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';

interface SeverityIndicatorProps {
  severity: DamageSeverity;
  showLabel?: boolean;
}

const severityConfig: Record<DamageSeverity, { 
  label: string; 
  className: string;
  icon: React.ElementType;
}> = {
  critical: { label: 'Critical', className: 'severity-critical', icon: AlertTriangle },
  high: { label: 'High', className: 'severity-high', icon: AlertCircle },
  medium: { label: 'Medium', className: 'severity-medium', icon: Info },
  low: { label: 'Low', className: 'severity-low', icon: CheckCircle },
};

const SeverityIndicator: React.FC<SeverityIndicatorProps> = ({ severity, showLabel = true }) => {
  const config = severityConfig[severity];
  const Icon = config.icon;
  
  return (
    <div className={cn("inline-flex items-center gap-1.5", config.className)}>
      <Icon className="w-4 h-4" />
      {showLabel && <span className="font-medium text-sm">{config.label}</span>}
    </div>
  );
};

export default SeverityIndicator;
