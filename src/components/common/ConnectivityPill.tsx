import React, { useState, useEffect } from 'react';
import { pingGasApi } from '../../api/gasClient';
import { getPendingOutboxCount } from '../../db/outbox';
import { drainOutboxQueue } from '../../services/syncEngine';
import { useAuthStore } from '../../store/useAuthStore';
import { useEquipmentStore } from '../../store/useEquipmentStore';
import { RefreshCw, CloudUpload, WifiOff, CheckCircle2 } from 'lucide-react';

export const ConnectivityPill: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isApiReachable, setIsApiReachable] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const { token } = useAuthStore();
  const { hydrateDataSilently } = useEquipmentStore();

  const checkPending = async () => {
    try {
      const count = await getPendingOutboxCount();
      setPendingCount(count);
    } catch {
      setPendingCount(0);
    }
  };

  const checkStatusAndSync = async () => {
    const online = navigator.onLine;
    setIsOnline(online);
    if (!online) {
      setIsApiReachable(false);
      return;
    }

    const reachable = await pingGasApi();
    setIsApiReachable(reachable);

    if (reachable && token) {
      await checkPending();
      const count = await getPendingOutboxCount();
      if (count > 0) {
        setIsSyncing(true);
        await drainOutboxQueue(token);
        await checkPending();
        await hydrateDataSilently(token);
        setIsSyncing(false);
      }
    }
  };

  useEffect(() => {
    checkStatusAndSync();

    const handleOnline = () => checkStatusAndSync();
    const handleOffline = () => {
      setIsOnline(false);
      setIsApiReachable(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(async () => {
      await checkPending();
      if (navigator.onLine && token) {
        const count = await getPendingOutboxCount();
        if (count > 0) {
          await checkStatusAndSync();
        }
      }
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [token]);

  const handleManualSync = async () => {
    if (isSyncing || !token) return;
    setIsSyncing(true);
    await checkStatusAndSync();
    setIsSyncing(false);
  };

  if (isSyncing) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary shadow-xs">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>Syncing...</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        onClick={handleManualSync}
        title="Tap to sync pending offline actions"
      >
        <CloudUpload className="h-3.5 w-3.5" />
        <span>{pendingCount} Pending Sync</span>
      </button>
    );
  }

  if (!isOnline || !isApiReachable) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 shadow-xs">
        <WifiOff className="h-3.5 w-3.5 text-rose-600" />
        <span>Offline Mode</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background hover:bg-accent px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-xs transition-colors cursor-pointer"
      onClick={handleManualSync}
      title="Connected to Google Apps Script. Tap to refresh."
    >
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
      <span className="text-foreground">Online</span>
    </button>
  );
};
