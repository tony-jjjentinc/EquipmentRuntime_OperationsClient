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
import { RefreshCw } from 'lucide-react';

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-3 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Validating session credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginOverlay />;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background text-foreground pb-8">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Navigation />

        {activeTab === 'equipment' && <EquipmentGrid />}
        {activeTab === 'history' && <ActivityHistoryFeed />}
      </main>

      {/* Action Modals & Drawers */}
      <RoutineModal />
      <DowntimeModal />
      <StateTimeline />
      <ImageModal />
    </div>
  );
};

export default App;
