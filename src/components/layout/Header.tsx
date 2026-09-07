import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { ConnectivityPill } from '../common/ConnectivityPill';

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();

  const userName = user?.name || user?.email || 'Operator';
  const userRoles = (user?.roles || []).join(', ') || 'Technician';

  return (
    <header className="bg-white border-bottom shadow-sm sticky-top px-3 py-2 mb-3">
      <div className="d-flex justify-content-between align-items-center">
        {/* Brand */}
        <div className="d-flex align-items-center gap-2">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center bg-primary text-white shadow-sm"
            style={{ width: '34px', height: '34px', minWidth: '34px' }}
          >
            <i className="bi bi-speedometer2 fs-5"></i>
          </div>
          <div>
            <h6 className="mb-0 fw-bold text-dark" style={{ letterSpacing: '-0.2px' }}>
              Operations Dashboard
            </h6>
            <div className="d-flex align-items-center gap-1 extra-small text-muted">
              <span>{userRoles}</span>
              <span>·</span>
              <strong className="text-secondary">{userName}</strong>
            </div>
          </div>
        </div>

        {/* Connectivity & Logout Actions */}
        <div className="d-flex align-items-center gap-2">
          <ConnectivityPill />
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary rounded-circle shadow-sm d-flex align-items-center justify-content-center"
            onClick={logout}
            title="Log out of session"
            style={{ width: '32px', height: '32px', padding: 0 }}
          >
            <i className="bi bi-box-arrow-right"></i>
          </button>
        </div>
      </div>
    </header>
  );
};
