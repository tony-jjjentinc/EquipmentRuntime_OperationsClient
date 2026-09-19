import React, { useState, useEffect } from 'react';
import { pingGasApi } from '../../api/gasClient';
import { getPendingOutboxCount } from '../../db/outbox';
import { drainOutboxQueue } from '../../services/syncEngine';
import { useAuthStore } from '../../store/useAuthStore';
import { useEquipmentStore } from '../../store/useEquipmentStore';
import { RefreshCw, CloudUpload, WifiOff, CheckCircle2 } from 'lucide-react';
import { OutboxModal } from '../forms/OutboxModal';
import { SyncHealthModal } from '../forms/SyncHealthModal';
import { calculateSyncHealth } from '../../services/syncHealthService';

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

  const [showOutboxModal, setShowOutboxModal] = useState<boolean>(false);
  const [showHealthModal, setShowHealthModal] = useState<boolean>(false);
  const [healthScore, setHealthScore] = useState<number>(100);

  const { lastHydrated } = useEquipmentStore();

  useEffect(() => {
    let isMounted = true;
    const updateScore = async () => {
      try {
        const report = await calculateSyncHealth(lastHydrated);
        if (isMounted) setHealthScore(report.score);
      } catch {}
    };
    updateScore();
    const interval = setInterval(updateScore, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [lastHydrated, isOnline, isApiReachable, pendingCount]);

  let healthColor = 'text-emerald-700 bg-emerald-50 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300';
  if (healthScore < 60 || !isOnline || !isApiReachable) {
    healthColor = 'text-rose-700 bg-rose-50 border-rose-300 dark:bg-rose-950 dark:text-rose-300';
  } else if (healthScore < 85) {
    healthColor = 'text-amber-700 bg-amber-50 border-amber-300 dark:bg-amber-950 dark:text-amber-300';
  }

  return (
    <>
      {isSyncing ? (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary shadow-xs">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Syncing...</span>
        </div>
      ) : pendingCount > 0 ? (
        <div className="inline-flex items-center gap-1.5">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            onClick={() => setShowOutboxModal(true)}
            title="Tap to review and sync pending offline actions"
          >
            <CloudUpload className="h-3.5 w-3.5" />
            <span>{pendingCount} Pending</span>
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold shadow-xs cursor-pointer ${healthColor}`}
            onClick={() => setShowHealthModal(true)}
            title="Sync Health Score. Tap for details."
          >
            {healthScore}%
          </button>
        </div>
      ) : !isOnline || !isApiReachable ? (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 shadow-xs transition-colors cursor-pointer"
          onClick={() => setShowHealthModal(true)}
          title="Offline Mode. Tap to view sync health."
        >
          <WifiOff className="h-3.5 w-3.5 text-rose-600" />
          <span>Offline ({healthScore}%)</span>
        </button>
      ) : (
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shadow-xs transition-colors cursor-pointer ${healthColor}`}
          onClick={() => setShowHealthModal(true)}
          title="Tap to view detailed Sync Health & Telemetry"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span className="font-semibold">{healthScore}% Synced</span>
        </button>
      )}

      <OutboxModal
        isOpen={showOutboxModal}
        onClose={() => {
          setShowOutboxModal(false);
          checkPending();
        }}
      />

      <SyncHealthModal
        isOpen={showHealthModal}
        onClose={() => setShowHealthModal(false)}
        onOpenOutbox={() => setShowOutboxModal(true)}
      />
    </>
  );
};
