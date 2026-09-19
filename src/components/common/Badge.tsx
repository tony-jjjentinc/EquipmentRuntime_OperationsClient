import React from 'react';
import { Badge } from '../ui/badge';
import { OperationalState, OperationalSubState } from '../../types';
import { Play, AlertTriangle, Power, RefreshCw, UserCheck } from 'lucide-react';
import { OperatorStatus } from '../../services/operatorAssignmentService';

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

interface OperatorRoleBadgeProps {
  status: OperatorStatus;
}

export const OperatorRoleBadge: React.FC<OperatorRoleBadgeProps> = ({ status }) => {
  if (!status || status.role === 'Unassigned') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        Unassigned
      </span>
    );
  }

  if (status.isPrimary) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold shadow-2xs">
        <UserCheck className="h-2.5 w-2.5" />
        <span>Primary Operator</span>
      </span>
    );
  }

  if (status.isActingPoP) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300 bg-cyan-100 dark:bg-cyan-950/60 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300 px-2 py-0.5 text-[10px] font-bold shadow-2xs">
        <UserCheck className="h-2.5 w-2.5" />
        <span>Reliever (Point-of-Person)</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 text-[10px] font-semibold">
      <span>Reliever Operator</span>
    </span>
  );
};
