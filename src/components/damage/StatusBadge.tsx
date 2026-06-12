import React from 'react';
import { DamageStatus } from '@/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: DamageStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<DamageStatus, { label: string; className: string }> = {
  urgent: { label: 'Urgent', className: 'status-urgent' },
  pending: { label: 'Pending', className: 'status-pending' },
  'in-progress': { label: 'In Progress', className: 'status-in-progress' },
  completed: { label: 'Completed', className: 'status-completed' },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full",
        config.className,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge;
