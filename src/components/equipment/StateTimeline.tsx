import React from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useEquipmentStore } from '../../store/useEquipmentStore';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '../ui/sheet';
import {
  Play,
  Power,
  AlertTriangle,
  RotateCw,
  History,
  Image as ImageIcon,
  Clock
} from 'lucide-react';
import { Button } from '../ui/button';

export const StateTimeline: React.FC = () => {
  const { selectedEquipment, showTimelineModal, closeTimelineModal, openImagePreview } = useUIStore();
  const { historyLogs } = useEquipmentStore();

  if (!selectedEquipment) return null;

  const tag = selectedEquipment["Tagging Number"] || selectedEquipment["Equipment ID"] || "";
  const commonName = selectedEquipment["Common Name"] || tag;

  const equipmentLogs = historyLogs.filter(
    l => l.tagNumber === tag || l.raw?.["Tagging Number"] === tag || l.raw?.["Equipment ID"] === tag
  );

  return (
    <Sheet open={showTimelineModal} onOpenChange={open => !open && closeTimelineModal()}>
      <SheetContent side="right" className="sm:max-w-md w-full">
        <SheetHeader className="border-b border-border pb-3 mb-4">
          <SheetTitle className="text-lg font-bold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <span>Runtime Activity History</span>
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {commonName} (<span className="font-mono text-foreground">{tag}</span>)
          </SheetDescription>
        </SheetHeader>

        {equipmentLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-2">
            <Clock className="h-8 w-8 opacity-40" />
            <p className="text-xs">No recorded actions in the recent history window.</p>
          </div>
        ) : (
          <div className="relative pl-4 border-l-2 border-primary/20 space-y-4 ml-2">
            {equipmentLogs.map((log, index) => {
              const isStartup = log.action === 'Startup';
              const isShutdown = log.action === 'Shutdown';
              const isDowntime =
                log.action === 'Report Downtime' ||
                (log.action === 'Shutdown' && log.type === 'Downtime');
              const isRestart = log.action === 'Restart';

              let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
              let Icon = History;

              if (isStartup) {
                badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                Icon = Play;
              } else if (isRestart) {
                badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
                Icon = RotateCw;
              } else if (isDowntime) {
                badgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
                Icon = AlertTriangle;
              } else if (isShutdown) {
                badgeColor = 'bg-slate-800 text-white border-slate-700';
                Icon = Power;
              }

              return (
                <div key={index} className="relative group">
                  {/* Timeline Dot Icon */}
                  <span
                    className={`absolute -left-[25px] top-1.5 flex h-5 w-5 items-center justify-center rounded-full border shadow-xs ${badgeColor}`}
                  >
                    <Icon className="h-3 w-3" />
                  </span>

                  {/* Card Item */}
                  <div className="rounded-xl border border-border bg-card p-3 shadow-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${badgeColor}`}>
                        {log.action}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {log.date} · {log.time}
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      By: <strong className="text-foreground">{log.reportedBy || 'Unknown'}</strong>
                    </div>

                    {log.remarks && (
                      <div className="rounded-md border border-border/80 bg-muted/40 p-2 text-xs italic text-foreground">
                        "{log.remarks}"
                      </div>
                    )}

                    {log.imageUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5 mt-1 cursor-pointer"
                        onClick={() => openImagePreview(log.imageUrl!)}
                      >
                        <ImageIcon className="h-3.5 w-3.5 text-primary" />
                        <span>View Attached Photo</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
