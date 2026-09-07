import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';

export const LoginOverlay: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    await login(email.trim(), password);
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100 px-3"
      style={{
        background: 'linear-gradient(135deg, #1a1d20 0%, #2b3035 100%)'
      }}
    >
      <div className="card shadow-lg border-0 rounded-4 p-4" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="text-center mb-4">
          <div
            className="rounded-circle d-inline-flex align-items-center justify-content-center bg-primary text-white mb-3 shadow"
            style={{ width: '56px', height: '56px' }}
          >
            <i className="bi bi-shield-lock-fill fs-3"></i>
          </div>
          <h4 className="fw-bold text-dark mb-1">Equipment Operations</h4>
          <p className="text-muted small mb-0">Sign in with your company credentials</p>
        </div>

        {error && (
          <div className="alert alert-danger py-2 px-3 small d-flex align-items-center mb-3 rounded-3" role="alert">
            <i className="bi bi-exclamation-circle-fill me-2 fs-6"></i>
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label extra-small fw-bold text-secondary text-uppercase">Email Address</label>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <i className="bi bi-envelope text-muted"></i>
              </span>
              <input
                type="email"
                className="form-control bg-light border-start-0 shadow-none"
                placeholder="operator@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label extra-small fw-bold text-secondary text-uppercase">Password</label>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <i className="bi bi-key text-muted"></i>
              </span>
              <input
                type="password"
                className="form-control bg-light border-start-0 shadow-none"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className="d-grid mb-3">
            <button
              type="submit"
              className="btn btn-primary btn-lg rounded-pill fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status"></span>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <i className="bi bi-arrow-right"></i>
                </>
              )}
            </button>
          </div>

          <div className="text-center">
            <small className="text-muted extra-small">
              Offline-ready: Authenticate once while online to enable full offline logging throughout your shift.
            </small>
          </div>
        </form>
      </div>
    </div>
  );
};
