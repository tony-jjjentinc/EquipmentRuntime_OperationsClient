import React, { useMemo } from 'react';
import { useEquipmentStore } from '../../store/useEquipmentStore';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Clock, Image as ImageIcon, User, Inbox, Play, Power, AlertTriangle, RotateCw } from 'lucide-react';

export const ActivityHistoryFeed: React.FC = () => {
  const { historyLogs } = useEquipmentStore();
  const { user } = useAuthStore();
  const {
    historyFilterAction,
    setHistoryFilterAction,
    historySystemFilter,
    setHistorySystemFilter,
    historyMyActionsOnly,
    setHistoryMyActionsOnly,
    openImagePreview
  } = useUIStore();

  const userEmail = user?.email || '';

  // Action counts
  const actionCounts = useMemo(() => {
    const counts: Record<string, number> = { All: historyLogs.length };
    historyLogs.forEach(log => {
      const act = log.action === 'Shutdown' && log.type === 'Downtime' ? 'Report Downtime' : log.action;
      counts[act] = (counts[act] || 0) + 1;
    });
    return counts;
  }, [historyLogs]);

  // Unique systems
  const uniqueSystems = useMemo(() => {
    return Array.from(new Set(historyLogs.map(l => l.raw?.["System"]).filter(Boolean))) as string[];
  }, [historyLogs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return historyLogs.filter(log => {
      const normalizedAction = log.action === 'Shutdown' && log.type === 'Downtime' ? 'Report Downtime' : log.action;
      if (historyFilterAction !== 'All' && normalizedAction !== historyFilterAction) {
        return false;
      }

      if (historySystemFilter !== 'All' && log.raw?.["System"] !== historySystemFilter) {
        return false;
      }

      if (historyMyActionsOnly && userEmail) {
        const reportedBy = (log.reportedBy || '').toLowerCase();
        if (!reportedBy.includes(userEmail.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [historyLogs, historyFilterAction, historySystemFilter, historyMyActionsOnly, userEmail]);

  return (
    <div className="space-y-3 mb-8">
      {/* Tier 2: Action Type Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        {['All', 'Startup', 'Shutdown', 'Report Downtime', 'Restart'].map(act => {
          const isActive = historyFilterAction === act;
          const count = actionCounts[act] || 0;
          return (
            <button
              key={act}
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-primary bg-primary text-white shadow-xs'
                  : 'border-border bg-background hover:bg-accent text-muted-foreground'
              }`}
              onClick={() => setHistoryFilterAction(act)}
            >
              <span>{act}</span>
              <span
                className={`rounded-full px-1.5 text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tier 3: System Filter Pills & My Actions Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              historySystemFilter === 'All'
                ? 'border-primary bg-primary text-white shadow-xs'
                : 'border-border bg-background hover:bg-accent text-muted-foreground'
            }`}
            onClick={() => setHistorySystemFilter('All')}
          >
            All Systems
          </button>
          {uniqueSystems.map(sys => (
            <button
              key={sys}
              type="button"
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                historySystemFilter === sys
                  ? 'border-primary bg-primary text-white shadow-xs'
                  : 'border-border bg-background hover:bg-accent text-muted-foreground'
              }`}
              onClick={() => setHistorySystemFilter(sys)}
            >
              {sys}
            </button>
          ))}
        </div>

        {/* My Actions Toggle */}
        <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={historyMyActionsOnly}
            onChange={e => setHistoryMyActionsOnly(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
          />
          <span>My Actions Only</span>
        </label>
      </div>

      {/* History Feed Cards */}
      {filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-xs my-4 space-y-2">
          <Inbox className="h-8 w-8 text-muted-foreground" />
          <h4 className="font-bold text-sm text-foreground">No Events Match Filter</h4>
          <p className="text-xs text-muted-foreground">Try clearing filters or changing selection.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredLogs.map((log, index) => {
            const isStartup = log.action === 'Startup';
            const isShutdown = log.action === 'Shutdown';
            const isDowntime =
              log.action === 'Report Downtime' ||
              (log.action === 'Shutdown' && log.type === 'Downtime');
            const isRestart = log.action === 'Restart';

            let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
            let Icon = Clock;

            if (isStartup) {
              badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
              Icon = Play;
            } else if (isRestart) {
              badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
              Icon = RotateCw;
            } else if (isDowntime) {
              badgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
              Icon = AlertTriangle;
            } else if (isShutdown) {
              badgeClass = 'bg-slate-800 text-white border-slate-700';
              Icon = Power;
            }

            return (
              <Card key={index} className="p-3.5 space-y-2 shadow-xs bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${badgeClass}`}>
                      <Icon className="h-3 w-3" />
                      <span>{log.action}</span>
                    </span>
                    <strong className="text-sm font-bold text-foreground">{log.commonName}</strong>
                    <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-1.5 py-0.2 font-mono text-[11px] text-muted-foreground">
                      {log.tagNumber}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {log.date} · {log.time}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60">
                  <div className="flex items-center gap-1 truncate">
                    <User className="h-3 w-3" />
                    <span>Reported by:</span>
                    <strong className="text-foreground">{log.reportedBy || 'Unknown'}</strong>
                  </div>
                  {log.imageUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] gap-1 px-2 cursor-pointer"
                      onClick={() => openImagePreview(log.imageUrl!)}
                    >
                      <ImageIcon className="h-3 w-3 text-primary" />
                      <span>View Photo</span>
                    </Button>
                  )}
                </div>

                {log.remarks && (
                  <div className="rounded-md border border-border/80 bg-muted/40 p-2 text-xs italic text-foreground">
                    "{log.remarks}"
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
