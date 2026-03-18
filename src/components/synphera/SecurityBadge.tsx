import { Shield, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { SecurityStatus } from '@/lib/synphera-types';
import { cn } from '@/lib/utils';

interface SecurityBadgeProps {
  status: SecurityStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function SecurityBadge({ status, size = 'md', showLabel = true }: SecurityBadgeProps) {
  const config = {
    GREEN: {
      icon: Shield,
      label: 'CLEARED',
      className: 'status-green',
    },
    AMBER: {
      icon: AlertTriangle,
      label: 'CAUTION',
      className: 'status-amber',
    },
    RED: {
      icon: XCircle,
      label: 'BLOCKED',
      className: 'status-red',
    },
    PENDING: {
      icon: Clock,
      label: 'PENDING SCAN',
      className: 'bg-muted text-muted-foreground border border-border',
    },
  };
  
  const { icon: Icon, label, className } = config[status];
  
  const iconSize = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider',
      className
    )}>
      <Icon className={iconSize[size]} />
      {showLabel && <span>{label}</span>}
    </span>
  );
}