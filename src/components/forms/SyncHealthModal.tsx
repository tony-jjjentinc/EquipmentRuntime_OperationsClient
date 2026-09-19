import React, { useState, useEffect } from 'react';
import { SyncHealthReport, calculateSyncHealth } from '../../services/syncHealthService';
import { drainOutboxQueue } from '../../services/syncEngine';
import { useAuthStore } from '../../store/useAuthStore';
import { useEquipmentStore } from '../../store/useEquipmentStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../ui/dialog';
import { Button } from '../ui/button';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  CloudUpload,
  RefreshCw,
  Clock,
  Image as ImageIcon,
  ExternalLink
} from 'lucide-react';

interface SyncHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOutbox: () => void;
}

export const SyncHealthModal: React.FC<SyncHealthModalProps> = ({ isOpen, onClose, onOpenOutbox }) => {
  const { token } = useAuthStore();
  const { lastHydrated, hydrateDataSilently, loadInitialData } = useEquipmentStore();

  const [report, setReport] = useState<SyncHealthReport | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const fetchHealth = async () => {
    const data = await calculateSyncHealth(lastHydrated);
    setReport(data);
  };

  useEffect(() => {
    if (isOpen) {
      fetchHealth();
      const interval = setInterval(fetchHealth, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen, lastHydrated]);

  const handleSyncNow = async () => {
    if (!token || isSyncing) return;
    setIsSyncing(true);
    try {
      await drainOutboxQueue(token);
      await hydrateDataSilently(token);
      await fetchHealth();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleForceFullSourceRefresh = async () => {
    if (!token || isSyncing) return;
    setIsSyncing(true);
    try {
      await loadInitialData(token);
      await fetchHealth();
    } finally {
      setIsSyncing(false);
    }
  };

  if (!report) return null;

  // Visual score color
  let scoreBg = 'bg-emerald-500';
  let scoreText = 'text-emerald-700 dark:text-emerald-400';
  let scoreBorder = 'border-emerald-200 dark:border-emerald-800';
  if (report.score < 60 || report.status === 'offline') {
    scoreBg = 'bg-rose-500';
    scoreText = 'text-rose-700 dark:text-rose-400';
    scoreBorder = 'border-rose-200 dark:border-rose-800';
  } else if (report.score < 85) {
    scoreBg = 'bg-amber-500';
    scoreText = 'text-amber-700 dark:text-amber-400';
    scoreBorder = 'border-amber-200 dark:border-amber-800';
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Activity className="h-5 w-5 text-primary" />
            <span>Data Sync Health & Telemetry</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Real-time synchronization status between local offline cache and Google Sheets.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Main Health Card with Progress Bar */}
          <div className={`rounded-2xl border ${scoreBorder} bg-card p-4 shadow-xs space-y-3`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Sync Health Score
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className={`text-3xl font-extrabold ${scoreText}`}>
                    {report.score}%
                  </span>
                  <span className="text-xs font-semibold capitalize text-muted-foreground">
                    · {report.status}
                  </span>
                </div>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60">
                {report.isOnline ? (
                  <CheckCircle2 className={`h-7 w-7 ${scoreText}`} />
                ) : (
                  <WifiOff className="h-7 w-7 text-rose-500" />
                )}
              </div>
            </div>

            {/* Health Meter Progress Bar */}
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${scoreBg}`}
                style={{ width: `${report.score}%` }}
              />
            </div>

            <p className="text-xs text-foreground/80 leading-relaxed bg-muted/40 p-2.5 rounded-xl border border-border/50">
              {report.advice}
            </p>
          </div>

          {/* Sync Metrics Breakdown Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Metric 1: Data Freshness */}
            <div className="rounded-xl border border-border bg-card p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-semibold">Data Freshness</span>
              </div>
              <div className="font-bold text-foreground">
                {report.ageMinutes === 0
                  ? 'Just now'
                  : report.ageMinutes > 900
                  ? 'Never synced'
                  : `${report.ageMinutes}m ago`}
              </div>
            </div>

            {/* Metric 2: Gateway Status */}
            <div className="rounded-xl border border-border bg-card p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Activity className="h-3.5 w-3.5" />
                <span className="font-semibold">GAS Gateway</span>
              </div>
              <div className="font-bold text-foreground">
                {report.isApiReachable ? (
                  <span className="text-emerald-600">Reachable (OK)</span>
                ) : (
                  <span className="text-rose-600">Unreachable</span>
                )}
              </div>
            </div>

            {/* Metric 3: Pending Actions */}
            <div className="rounded-xl border border-border bg-card p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CloudUpload className="h-3.5 w-3.5" />
                <span className="font-semibold">Outbox Queue</span>
              </div>
              <div className="flex items-center justify-between font-bold text-foreground">
                <span>{report.pendingActionsCount} pending</span>
                {report.failedActionsCount > 0 && (
                  <span className="text-rose-600 font-bold">({report.failedActionsCount} err)</span>
                )}
              </div>
            </div>

            {/* Metric 4: Photos Storage */}
            <div className="rounded-xl border border-border bg-card p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <ImageIcon className="h-3.5 w-3.5" />
                <span className="font-semibold">Pending Photos</span>
              </div>
              <div className="font-bold text-foreground">
                <span>{report.pendingPhotosCount} queued</span>
              </div>
            </div>
          </div>

          {/* Quick Outbox Link if items pending */}
          {(report.pendingActionsCount > 0 || report.failedActionsCount > 0) && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenOutbox();
              }}
              className="flex w-full items-center justify-between rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 p-2.5 text-xs text-amber-900 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Manage queued actions in Outbox drawer</span>
              </div>
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isSyncing || !report.isOnline}
            onClick={handleForceFullSourceRefresh}
            className="w-full sm:w-auto text-xs"
          >
            Pull Fresh from Source
          </Button>

          <Button
            size="sm"
            disabled={isSyncing || !report.isOnline}
            onClick={handleSyncNow}
            className="w-full sm:w-auto text-xs gap-1.5"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <CloudUpload className="h-3.5 w-3.5" />
                <span>Sync Now</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
