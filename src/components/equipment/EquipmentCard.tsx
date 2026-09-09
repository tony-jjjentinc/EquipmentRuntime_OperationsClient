import React, { useState, useEffect } from 'react';
import { Equipment, RuntimeLog } from '../../types';
import { useEquipmentStore } from '../../store/useEquipmentStore';
import { useUIStore } from '../../store/useUIStore';
import { getEquipmentState } from '../../services/equipmentStateService';
import { resolveScheduleMetadata } from '../../services/scheduleService';
import { calculateElapsedSince } from '../../services/timeService';
import { OperationalBadge } from '../common/Badge';
import { db } from '../../db/db';

interface EquipmentCardProps {
  equipment: Equipment;
}

export const EquipmentCard: React.FC<EquipmentCardProps> = ({ equipment }) => {
  const { schedules, overrideSchedules, runtimeLogs } = useEquipmentStore();
  const { openRoutineModal, openDowntimeModal, openTimelineModal } = useUIStore();

  const [hasPendingOutbox, setHasPendingOutbox] = useState<boolean>(false);

  const tag = equipment["Tagging Number"] || equipment["Equipment ID"] || "";
  const commonName = equipment["Common Name"] || tag;

  // Derive operational state
  const opState = getEquipmentState(equipment, runtimeLogs, schedules, overrideSchedules);
  const scheduleMeta = resolveScheduleMetadata(equipment, schedules, overrideSchedules);

  // Check if this equipment has pending outbox actions
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
  if (opState.state === 'Running') {
    const routineLog = opState.log as RuntimeLog;
    const startedAt = routineLog ? routineLog["Started At"] : '';
    elapsedText = startedAt ? `Running for ${calculateElapsedSince(startedAt)}` : 'Running';
  } else if (opState.subState === 'Downtime') {
    const dLog = opState.log as RuntimeLog;
    const shutAt = dLog ? (dLog["Started At"] || dLog["Shutdown At"]) : '';
    elapsedText = shutAt ? `Down for ${calculateElapsedSince(shutAt)}` : 'Outage';
  } else {
    elapsedText = 'Off';
  }

  return (
    <div className={`card h-100 shadow-sm border equipment-card state-${opState.subState.toLowerCase()}`}>
      <div className="card-body p-3">
        {/* Header: Tag & Status Badge */}
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div>
            <span className="badge bg-light text-secondary border font-monospace extra-small px-2 py-1">
              {tag}
            </span>
          </div>
          <OperationalBadge
            state={opState.state}
            subState={opState.subState}
            reason={opState.reason}
            isPendingSync={hasPendingOutbox}
          />
        </div>

        {/* Equipment Name & Location */}
        <h6 className="card-title fw-bold text-dark mb-1 text-truncate" title={commonName}>
          {commonName}
        </h6>
        <div className="d-flex align-items-center gap-1 extra-small text-muted mb-2 text-truncate">
          <span>{equipment["System"] || 'General'}</span>
          {equipment["Component"] && (
            <>
              <span>·</span>
              <span>{equipment["Component"]}</span>
            </>
          )}
          {equipment["Location"] && (
            <>
              <span>·</span>
              <span className="text-secondary">{equipment["Location"]}</span>
            </>
          )}
        </div>

        {/* Schedule & Runtime Meta */}
        <div className="bg-light rounded-2 p-2 mb-3 border border-opacity-50">
          <div className="d-flex justify-content-between align-items-center extra-small">
            <span className="text-muted">Schedule:</span>
            <span className="fw-semibold text-dark">
              {scheduleMeta.is24h ? '24/7 Continuous' : `${scheduleMeta.startup} - ${scheduleMeta.shutdown}`}
            </span>
          </div>
          <div className="d-flex justify-content-between align-items-center extra-small mt-1">
            <span className="text-muted">Duration:</span>
            <span className={`fw-bold ${opState.state === 'Running' ? 'text-success' : opState.subState === 'Downtime' ? 'text-danger' : 'text-secondary'}`}>
              {elapsedText}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="d-flex gap-2 align-items-center justify-content-end pt-1">
          {opState.state === 'Running' ? (
            <>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger px-2 shadow-sm fw-semibold"
                onClick={() => openDowntimeModal(equipment, 'Shutdown')}
                title="Report Downtime Outage"
              >
                <i className="bi bi-exclamation-triangle-fill"></i>
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary text-white flex-fill fw-bold shadow-sm"
                onClick={() => openRoutineModal(equipment, 'Shutdown', opState.log)}
                title="Turn off equipment (Routine Shutdown)"
              >
                <i className="bi bi-power me-1"></i> Shutdown
              </button>
            </>
          ) : opState.subState === 'Downtime' ? (
            <>
              <button
                type="button"
                className="btn btn-sm btn-warning text-dark flex-fill fw-bold shadow-sm"
                onClick={() => openDowntimeModal(equipment, 'Restart')}
                title="Restart Equipment"
              >
                <i className="bi bi-arrow-clockwise me-1"></i> Restart
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary text-white flex-fill fw-bold shadow-sm"
                onClick={() => openRoutineModal(equipment, 'Shutdown', opState.log)}
                title="Turn off equipment (Routine Shutdown)"
              >
                <i className="bi bi-power me-1"></i> Shutdown
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger px-2 shadow-sm fw-semibold"
                onClick={() => openDowntimeModal(equipment, 'Shutdown')}
                title="Report Downtime Outage"
              >
                <i className="bi bi-exclamation-triangle-fill"></i>
              </button>
              <button
                type="button"
                className="btn btn-sm btn-success text-white flex-fill fw-bold shadow-sm"
                onClick={() => openRoutineModal(equipment, 'Startup')}
                title="Start equipment (Routine Startup)"
              >
                <i className="bi bi-play-fill me-1"></i> Startup
              </button>
            </>
          )}

          {/* Historical timeline drawer button */}
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary px-2 shadow-sm"
            onClick={() => openTimelineModal(equipment)}
            title="View History Timeline"
          >
            <i className="bi bi-clock-history"></i>
          </button>
        </div>
      </div>
    </div>
  );
};
