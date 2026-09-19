import React, { useState, useEffect } from 'react';
import { OutboxItem } from '../../types';
import { getAllOutboxItems, retryFailedOutboxItem, deleteOutboxItem } from '../../db/outbox';
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
import { CloudUpload, RefreshCw, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface OutboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OutboxModal: React.FC<OutboxModalProps> = ({ isOpen, onClose }) => {
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const { token } = useAuthStore();
  const { hydrateDataSilently } = useEquipmentStore();

  const loadItems = async () => {
    const list = await getAllOutboxItems();
    setItems(list);
  };

  useEffect(() => {
    if (isOpen) {
      loadItems();
      const interval = setInterval(loadItems, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleSyncAll = async () => {
    if (!token || isSyncing) return;
    setIsSyncing(true);
    try {
      await drainOutboxQueue(token);
      await hydrateDataSilently(token);
      await loadItems();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetryItem = async (id: string) => {
    await retryFailedOutboxItem(id);
    await loadItems();
    if (token) {
      handleSyncAll();
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm('Are you sure you want to discard this offline action? This cannot be undone.')) {
      await deleteOutboxItem(id);
      await loadItems();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <CloudUpload className="h-5 w-5 text-primary" />
            <span>Offline Actions Queue ({items.length})</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Review, manually retry, or discard actions captured while disconnected from the network.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto space-y-2.5 my-2 pr-1">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-60" />
              <p className="text-xs">Outbox is completely clear. All actions have synchronized with the server.</p>
            </div>
          ) : (
            items.map(item => {
              const isSyncingItem = item.status === 'SYNCING';
              const isFailed = item.status === 'FAILED';

              let badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
              if (isFailed) badgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
              if (isSyncingItem) badgeColor = 'bg-blue-100 text-blue-800 border-blue-300';

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-border bg-card p-3 shadow-xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {item.taggingNumber}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          · {item.commonName}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {item.actionType} · {new Date(item.clientTimestamp).toLocaleTimeString()}
                      </div>
                    </div>

                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeColor}`}>
                      {item.status}
                    </span>
                  </div>

                  {item.lastError && (
                    <div className="flex items-start gap-1.5 rounded-md bg-rose-50 border border-rose-200 p-2 text-[11px] text-rose-700">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span className="break-all">{item.lastError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-border/60 text-xs">
                    <span className="text-[11px] text-muted-foreground">
                      Operator: {item.operatorName}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isFailed && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => handleRetryItem(item.id)}
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>Retry</span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          {items.length > 0 && (
            <Button
              size="sm"
              disabled={isSyncing || !navigator.onLine}
              onClick={handleSyncAll}
              className="gap-1.5"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="h-3.5 w-3.5" />
                  <span>Sync All Now</span>
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
