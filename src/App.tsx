import React, { useState, useEffect } from 'react';
import { pingGasApi } from './api/gasClient';

export const App: React.FC = () => {
  const [onlineStatus, setOnlineStatus] = useState<boolean>(navigator.onLine);
  const [gasConnected, setGasConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial ping check
    pingGasApi().then(res => setGasConnected(res));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="container-fluid py-3 px-3">
      <header className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-cpu fs-4 text-primary"></i>
          <div>
            <h5 className="mb-0 fw-bold">Operations Dashboard</h5>
            <small className="text-muted">Offline-First React PWA</small>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className={`badge rounded-pill ${onlineStatus ? 'bg-success' : 'bg-danger'} shadow-sm`}>
            <i className={`bi ${onlineStatus ? 'bi-wifi' : 'bi-wifi-off'} me-1`}></i>
            {onlineStatus ? 'Network Online' : 'Network Offline'}
          </span>
          {onlineStatus && (
            <span className={`badge rounded-pill ${gasConnected ? 'bg-primary' : 'bg-warning text-dark'} shadow-sm`}>
              <i className={`bi ${gasConnected ? 'bi-cloud-check' : 'bi-cloud-slash'} me-1`}></i>
              {gasConnected ? 'API Connected' : 'Connecting to API...'}
            </span>
          )}
        </div>
      </header>

      <main>
        <div className="alert alert-info d-flex align-items-center rounded-3 shadow-sm mb-4" role="alert">
          <i className="bi bi-info-circle-fill fs-5 me-2"></i>
          <div>
            <strong>Phase 2 Scaffolding Initialized:</strong> React + Vite + TypeScript PWA foundation is established with JJJEI design system and Google Apps Script Simple-Request client.
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
