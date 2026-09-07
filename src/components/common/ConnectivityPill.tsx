import React, { useState, useEffect } from 'react';
import { pingGasApi } from '../../api/gasClient';
import { getPendingOutboxCount } from '../../db/outbox';
import { drainOutboxQueue } from '../../services/syncEngine';
import { useAuthStore } from '../../store/useAuthStore';
import { useEquipmentStore } from '../../store/useEquipmentStore';

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
      <button
        type="button"
        className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 shadow-sm rounded-pill px-2 py-1"
        disabled
        style={{ fontSize: '0.75rem' }}
      >
        <span className="spinner-border spinner-border-sm" role="status"></span>
        <span>Syncing...</span>
      </button>
    );
  }

  if (pendingCount > 0) {
    return (
      <button
        type="button"
        className="btn btn-sm btn-warning text-dark d-inline-flex align-items-center gap-1 shadow-sm rounded-pill px-2 py-1"
        onClick={handleManualSync}
        title="Tap to sync pending offline actions"
        style={{ fontSize: '0.75rem' }}
      >
        <i className="bi bi-cloud-arrow-up-fill"></i>
        <span>{pendingCount} Pending Sync</span>
      </button>
    );
  }

  if (!isOnline || !isApiReachable) {
    return (
      <span
        className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 d-inline-flex align-items-center gap-1 shadow-sm rounded-pill px-2 py-1"
        style={{ fontSize: '0.75rem' }}
      >
        <i className="bi bi-wifi-off"></i>
        <span>Offline Mode</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-sm btn-light border border-secondary border-opacity-25 d-inline-flex align-items-center gap-1 shadow-sm rounded-pill px-2 py-1"
      onClick={handleManualSync}
      title="Connected to Google Apps Script. Tap to refresh."
      style={{ fontSize: '0.75rem' }}
    >
      <i className="bi bi-check-circle-fill text-success"></i>
      <span className="text-secondary">Online</span>
    </button>
  );
};
