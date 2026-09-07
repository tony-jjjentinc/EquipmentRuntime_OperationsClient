import React, { useEffect } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { useEquipmentStore } from './store/useEquipmentStore';
import { useUIStore } from './store/useUIStore';

// Layout & Components
import { Header } from './components/layout/Header';
import { Navigation } from './components/layout/Navigation';
import { LoginOverlay } from './components/layout/LoginOverlay';
import { EquipmentGrid } from './components/equipment/EquipmentGrid';
import { ActivityHistoryFeed } from './components/equipment/ActivityHistoryFeed';
import { StateTimeline } from './components/equipment/StateTimeline';
import { RoutineModal } from './components/forms/RoutineModal';
import { DowntimeModal } from './components/forms/DowntimeModal';
import { ImageModal } from './components/common/ImageModal';

export const App: React.FC = () => {
  const { token, isAuthenticated, isLoading: isAuthLoading, initializeAuth } = useAuthStore();
  const { loadInitialData } = useEquipmentStore();
  const { activeTab } = useUIStore();

  // 1. Initialize Authentication session on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // 2. Hydrate equipment data when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      loadInitialData(token);
    }
  }, [isAuthenticated, token, loadInitialData]);

  // 3. Render Authentication Screen if not logged in
  if (isAuthLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading session...</span>
          </div>
          <p className="text-muted small">Validating session credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginOverlay />;
  }

  return (
    <div className="min-vh-100 bg-light pb-5">
      <Header />

      <main className="container-fluid px-3">
        <Navigation />

        {activeTab === 'equipment' && <EquipmentGrid />}
        {activeTab === 'history' && <ActivityHistoryFeed />}
      </main>

      {/* Action Modals */}
      <RoutineModal />
      <DowntimeModal />
      <StateTimeline />
      <ImageModal />
    </div>
  );
};

export default App;
