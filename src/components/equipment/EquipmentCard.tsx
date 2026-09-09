import React, { useState, useEffect } from 'react';
import { Equipment, RuntimeLog } from '../../types';
import { useEquipmentStore } from '../../store/useEquipmentStore';
import { useUIStore } from '../../store/useUIStore';
import { getEquipmentState } from '../../services/equipmentStateService';
import { resolveScheduleMetadata } from '../../services/scheduleService';
import { calculateElapsedSince } from '../../services/timeService';
import { OperationalBadge } from '../common/Badge';
import { db } from '../../db/db';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import {
  Play,
  Power,
  AlertTriangle,
  RotateCw,
  History,
  Clock,
  MapPin,
  Calendar
} from 'lucide-react';

interface EquipmentCardProps {
  equipment: Equipment;
}

export const EquipmentCard: React.FC<EquipmentCardProps> = ({ equipment }) => {
  const { schedules, overrideSchedules, runtimeLogs } = useEquipmentStore();
  const { openRoutineModal, openDowntimeModal, openTimelineModal } = useUIStore();

  const [hasPendingOutbox, setHasPendingOutbox] = useState<boolean>(false);

  const tag = equipment["Tagging Number"] || equipment["Equipment ID"] || "";
  const commonName = equipment["Common Name"] || tag;

  // Operational State & Schedule Meta
  const opState = getEquipmentState(equipment, runtimeLogs, schedules, overrideSchedules);
  const scheduleMeta = resolveScheduleMetadata(equipment, schedules, overrideSchedules);

  // Check pending outbox actions
  useEffect(() => {
    let isMounted = true;
    const checkOutbox = async () => {
      try {
        const pending = await db.outbox
          .where('taggingNumber')
          .equals(tag)
          .and(item => item.status === 'PENDING' || item.status === 'SYNCING')
          .count();
        if (isMounted) setHasPendingOutbox(pending > 0);
      } catch {
        if (isMounted) setHasPendingOutbox(false);
      }
    };
    checkOutbox();
    const interval = setInterval(checkOutbox, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [tag, runtimeLogs]);

  // Elapsed duration calculations
  let elapsedText = '';
  let activeLog: RuntimeLog | null = null;

  if (opState.state === 'Running') {
    activeLog = opState.log as RuntimeLog;
    const startedAt = activeLog ? activeLog["Started At"] : '';
    elapsedText = startedAt ? `Running for ${calculateElapsedSince(startedAt)}` : 'Running';
  } else if (opState.subState === 'Downtime') {
    activeLog = opState.log as RuntimeLog;
    const shutAt = activeLog ? (activeLog["Started At"] || activeLog["Shutdown At"]) : '';
    elapsedText = shutAt ? `Down for ${calculateElapsedSince(shutAt)}` : 'Outage Reported';
  } else {
    elapsedText = 'Standby / Off';
  }

  // Border & Glow Stylings
  const borderClass =
    opState.state === 'Running'
      ? 'border-l-4 border-l-emerald-500 hover:border-l-emerald-600'
      : opState.subState === 'Downtime'
      ? 'border-l-4 border-l-rose-500 hover:border-l-rose-600'
      : 'border-l-4 border-l-slate-300 dark:border-l-slate-700';

  return (
    <Card className={`flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md transition-all ${borderClass} bg-card`}>
      <div className="p-3.5 space-y-2.5">
        {/* Layer 1: Monospace Tag + State Badge */}
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
            {tag}
          </span>
          <OperationalBadge
            state={opState.state}
            subState={opState.subState}
            reason={opState.reason}
            isPendingSync={hasPendingOutbox}
          />
        </div>

        {/* Layer 2: Equipment Name & Hierarchy */}
        <div>
          <h3 className="font-bold text-sm leading-tight text-foreground truncate" title={commonName}>
            {commonName}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 truncate">
            <span>{equipment["System"] || 'General'}</span>
            {equipment["Component"] && (
              <>
                <span>·</span>
                <span className="truncate">{equipment["Component"]}</span>
              </>
            )}
          </div>
        </div>

        {/* Layer 3: Contextual Operational Status Box */}
        <div
          className={`rounded-lg border p-2 text-xs space-y-1 ${
            opState.state === 'Running'
              ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900'
              : opState.subState === 'Downtime'
              ? 'border-rose-200 bg-rose-50/80 text-rose-900'
              : 'border-border bg-muted/40 text-muted-foreground'
          }`}
        >
          {/* Schedule Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-[11px]">
              <Calendar className="h-3 w-3 opacity-70" />
              <span>Schedule:</span>
            </div>
            <span className="font-semibold text-foreground text-[11px]">
              {scheduleMeta.is24h ? '24/7 Continuous' : `${scheduleMeta.startup} - ${scheduleMeta.shutdown}`}
            </span>
          </div>

          {/* Duration / Outage Row */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-1 text-[11px]">
              <Clock className="h-3 w-3 opacity-70" />
              <span>Duration:</span>
            </div>
            <span
              className={`font-bold text-[11px] ${
                opState.state === 'Running'
                  ? 'text-emerald-700'
                  : opState.subState === 'Downtime'
                  ? 'text-rose-700'
                  : 'text-foreground'
              }`}
            >
              {elapsedText}
            </span>
          </div>

          {/* Downtime Reason Row (if applicable) */}
          {opState.subState === 'Downtime' && opState.reason && (
            <div className="pt-0.5 text-[11px] text-rose-800 border-t border-rose-200/60 truncate">
              <strong>Reason: </strong> {opState.reason}
            </div>
          )}
        </div>
      </div>

      {/* Layer 4 & 5: Attribution & Action Bar */}
      <div className="p-3.5 pt-0 mt-auto">
        {/* Attribution Row */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-2 mb-2.5">
          <span className="truncate">
            Operator: <strong className="text-foreground font-semibold">{activeLog?.["Operator Name"] || 'Unassigned'}</strong>
          </span>
          {equipment["Location"] && (
            <span className="inline-flex items-center gap-0.5 text-muted-foreground shrink-0 max-w-[120px] truncate" title={equipment["Location"]}>
              <MapPin className="h-2.5 w-2.5" />
              {equipment["Location"]}
            </span>
          )}
        </div>

        {/* Action Buttons Group */}
        <div className="flex items-center gap-1.5">
          {opState.state === 'Running' ? (
            <>
              {/* Report Outage */}
              <Button
                variant="outline"
                size="sm"
                className="px-2 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                onClick={() => openDowntimeModal(equipment, 'Shutdown')}
                title="Report Downtime Outage"
              >
                <AlertTriangle className="h-4 w-4" />
              </Button>
              {/* Routine Shutdown */}
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 font-bold bg-slate-800 hover:bg-slate-900 text-white cursor-pointer"
                onClick={() => openRoutineModal(equipment, 'Shutdown', opState.log)}
                title="Turn off equipment (Routine Shutdown)"
              >
                <Power className="h-3.5 w-3.5 mr-1" />
                <span>Shutdown</span>
              </Button>
            </>
          ) : opState.subState === 'Downtime' ? (
            <>
              {/* Restart Equipment */}
              <Button
                variant="warning"
                size="sm"
                className="flex-1 font-bold cursor-pointer"
                onClick={() => openDowntimeModal(equipment, 'Restart')}
                title="Restart Equipment from Outage"
              >
                <RotateCw className="h-3.5 w-3.5 mr-1" />
                <span>Restart</span>
              </Button>
              {/* Secondary Routine Shutdown */}
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 font-bold bg-slate-700 hover:bg-slate-800 text-white cursor-pointer"
                onClick={() => openRoutineModal(equipment, 'Shutdown', opState.log)}
                title="Turn off equipment completely"
              >
                <Power className="h-3.5 w-3.5 mr-1" />
                <span>Shutdown</span>
              </Button>
            </>
          ) : (
            <>
              {/* Report Outage While Off */}
              <Button
                variant="outline"
                size="sm"
                className="px-2 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                onClick={() => openDowntimeModal(equipment, 'Shutdown')}
                title="Report Outage / Breakdown"
              >
                <AlertTriangle className="h-4 w-4" />
              </Button>
              {/* Startup */}
              <Button
                variant="success"
                size="sm"
                className="flex-1 font-bold cursor-pointer"
                onClick={() => openRoutineModal(equipment, 'Startup')}
                title="Start Equipment"
              >
                <Play className="h-3.5 w-3.5 mr-1 fill-white" />
                <span>Startup</span>
              </Button>
            </>
          )}

          {/* Activity Timeline Trigger */}
          <Button
            variant="outline"
            size="sm"
            className="px-2 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => openTimelineModal(equipment)}
            title="View History & Timeline"
          >
            <History className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
