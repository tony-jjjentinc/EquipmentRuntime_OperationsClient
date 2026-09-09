import React from 'react';
import { Badge } from '../ui/badge';
import { OperationalState, OperationalSubState } from '../../types';
import { Play, AlertTriangle, Power, RefreshCw } from 'lucide-react';

interface OperationalBadgeProps {
  state: OperationalState;
  subState: OperationalSubState;
  reason?: string;
  isPendingSync?: boolean;
}

export const OperationalBadge: React.FC<OperationalBadgeProps> = ({
  state,
  subState,
  reason,
  isPendingSync = false
}) => {
  if (isPendingSync) {
    return (
      <Badge variant="pending" className="gap-1 shadow-xs">
        <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
        <span>Syncing...</span>
      </Badge>
    );
  }

  if (state === 'Running' || subState === 'Running') {
    return (
      <Badge variant="running" className="gap-1 shadow-xs">
        <Play className="w-3 h-3 fill-emerald-600 text-emerald-600" />
        <span>Running</span>
      </Badge>
    );
  }

  if (subState === 'Downtime') {
    return (
      <Badge variant="downtime" className="gap-1 shadow-xs">
        <AlertTriangle className="w-3 h-3 text-rose-600" />
        <span className="truncate max-w-[120px]">{reason || 'Downtime'}</span>
      </Badge>
    );
  }

  return (
    <Badge variant="off" className="gap-1 shadow-xs">
      <Power className="w-3 h-3 text-slate-500" />
      <span>Off</span>
    </Badge>
  );
};
