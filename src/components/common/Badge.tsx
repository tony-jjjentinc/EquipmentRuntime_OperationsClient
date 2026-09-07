import React from 'react';
import { OperationalState, OperationalSubState } from '../../types';

interface BadgeProps {
  state: OperationalState;
  subState: OperationalSubState;
  reason?: string;
  isPendingSync?: boolean;
}

export const OperationalBadge: React.FC<BadgeProps> = ({
  state,
  subState,
  reason,
  isPendingSync
}) => {
  if (isPendingSync) {
    return (
      <span className="badge badge-pending-sync d-inline-flex align-items-center gap-1 shadow-sm px-2 py-1">
        <span className="spinner-grow spinner-grow-sm" role="status" style={{ width: '0.65rem', height: '0.65rem' }}></span>
        <span>Pending Sync</span>
      </span>
    );
  }

  if (state === 'Running') {
    return (
      <span className="badge badge-running d-inline-flex align-items-center gap-1 shadow-sm px-2 py-1">
        <i className="bi bi-check-circle-fill text-success"></i>
        <span>Running</span>
      </span>
    );
  }

  if (subState === 'Downtime') {
    return (
      <span className="badge badge-downtime d-inline-flex align-items-center gap-1 shadow-sm px-2 py-1">
        <i className="bi bi-exclamation-triangle-fill text-danger"></i>
        <span>{reason || 'Downtime'}</span>
      </span>
    );
  }

  return (
    <span className="badge badge-off d-inline-flex align-items-center gap-1 shadow-sm px-2 py-1">
      <i className="bi bi-power text-secondary"></i>
      <span>Not Running (Off)</span>
    </span>
  );
};
