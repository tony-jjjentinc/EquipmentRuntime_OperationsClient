import React, { useState } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useEquipmentStore } from '../../store/useEquipmentStore';
import { PhotoUploader } from './PhotoUploader';
import { ProcessedPhoto } from '../../services/cameraService';
import { getFormattedDate, get24HourTime } from '../../services/timeService';
import { queueOutboxAction, queuePhotoBlob } from '../../db/outbox';
import { drainOutboxQueue } from '../../services/syncEngine';
import { DowntimeLog, RoutineLog } from '../../types';

export const DowntimeModal: React.FC = () => {
  const { selectedEquipment, downtimeAction, showDowntimeModal, closeDowntimeModal } = useUIStore();
  const { user, token } = useAuthStore();
  const { appConfig, shutdownTypes, routineLogs, optimisticAddDowntimeLog, optimisticRestartDowntime } = useEquipmentStore();

  const [shutdownType, setShutdownType] = useState('Unscheduled Maintenance');
  const [remarks, setRemarks] = useState('');
  const [photoData, setPhotoData] = useState<ProcessedPhoto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!showDowntimeModal || !selectedEquipment) return null;

  const tag = selectedEquipment["Tagging Number"] || selectedEquipment["Equipment ID"] || "";
  const commonName = selectedEquipment["Common Name"] || tag;
  const operatorName = user?.name || user?.email || 'Operator';
  const operatorEmail = user?.email || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    const txId = photoData ? photoData.transactionId : crypto.randomUUID();
    const todayFormatted = getFormattedDate();
    const timeNow = get24HourTime();

    try {
      if (downtimeAction === 'Shutdown') {
        const downtimeLog: DowntimeLog = {
          "Transaction ID": txId,
          transactionId: txId,
          "System": selectedEquipment["System"] || "",
          "Component": selectedEquipment["Component"] || "",
          "Tagging Number": tag,
          "Common Name": commonName,
          "Logged Date": todayFormatted,
          "Action": "Shutdown",
          "Shutdown At": timeNow,
          "Restarted At": "",
          "Shutdown Type": shutdownType,
          "Shutdown Reason": shutdownType,
          "Shutdown Reported By": operatorEmail,
          "Shutdown On-Ground Remarks": remarks,
          "Shutdown Image Attachments": photoData ? 'data:image/jpeg;base64,' + photoData.base64 : ''
        };

        // Check if routine log exists for today. If none, auto-create 0-runtime anchor
        let autoRoutine: RoutineLog | undefined;
        const hasRoutineToday = routineLogs.some(
          l => (l["Tagging Number"] || l["Equipment ID"]) === tag
        );

        if (!hasRoutineToday) {
          autoRoutine = {
            "Transaction ID": txId,
            transactionId: txId,
            "System": selectedEquipment["System"] || "",
            "Component": selectedEquipment["Component"] || "",
            "Tagging Number": tag,
            "Common Name": commonName,
            "Logged Date": todayFormatted,
            "Action": "Shutdown",
            "Started At": timeNow,
            "Shutdown At": timeNow,
            "Started By": operatorEmail,
            "Shutdown By": operatorEmail,
            "Schedule Context": selectedEquipment.scheduleContext || "Standard Routine",
            "Estimated Operational Time": 0,
            "Shutdown On-Ground Remarks": `[Auto-Created on Downtime Shutdown] ${remarks}`.trim()
          };
        }

        // 1. Optimistic Update
        await optimisticAddDowntimeLog(downtimeLog, autoRoutine);

        // 2. Queue into Offline Outbox
        await queueOutboxAction({
          id: txId,
          actionType: 'Downtime',
          taggingNumber: tag,
          commonName,
          operatorEmail,
          operatorName,
          clientTimestamp: new Date().toISOString(),
          payload: {
            ...downtimeLog,
            captureDateStr: photoData ? photoData.captureDateStr : '',
            captureTimeStr: photoData ? photoData.captureTimeStr : ''
          },
          hasPhoto: !!photoData
        });
      } else if (downtimeAction === 'Restart') {
        // 1. Optimistic Restart
        await optimisticRestartDowntime(tag, timeNow, operatorEmail, remarks);

        // 2. Queue into Offline Outbox
        await queueOutboxAction({
          id: txId,
          actionType: 'Restart',
          taggingNumber: tag,
          commonName,
          operatorEmail,
          operatorName,
          clientTimestamp: new Date().toISOString(),
          payload: {
            "Action": "Restart",
            "Tagging Number": tag,
            "Restarted At": timeNow,
            "Restarted By": operatorEmail,
            "Restart On-Ground Remarks": remarks,
            "Restart Image Attachments": photoData ? 'data:image/jpeg;base64,' + photoData.base64 : '',
            captureDateStr: photoData ? photoData.captureDateStr : '',
            captureTimeStr: photoData ? photoData.captureTimeStr : ''
          },
          hasPhoto: !!photoData
        });
      }

      // 3. Queue Photo Blob if captured
      if (photoData) {
        await queuePhotoBlob(txId, tag, 'downtime', downtimeAction, photoData.blob);
      }

      // 4. Trigger sync in background if online
      if (navigator.onLine && token) {
        drainOutboxQueue(token).catch(err => console.warn('Background sync error:', err));
      }

      closeDowntimeModal();
    } catch (err) {
      console.error('Failed to submit downtime action:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}>
      <div className="modal-dialog modal-dialog-centered modal-dialog-bottom">
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header border-bottom-0 pb-0 pt-3 px-3">
            <div>
              <h5 className={`modal-title fw-bold ${downtimeAction === 'Restart' ? 'text-warning' : 'text-danger'}`}>
                {downtimeAction === 'Restart' ? 'Restart Equipment' : 'Report Equipment Downtime'}
              </h5>
              <p className="text-muted extra-small mb-0">
                Operating as {operatorName} ({operatorEmail})
              </p>
            </div>
            <button type="button" className="btn-close shadow-none" onClick={closeDowntimeModal} disabled={isSubmitting}></button>
          </div>

          <div className="modal-body px-3 py-3">
            {/* Equipment Banner */}
            <div className={`rounded-3 p-3 mb-3 border ${downtimeAction === 'Restart' ? 'bg-warning bg-opacity-10 border-warning' : 'bg-danger bg-opacity-10 border-danger'}`}>
              <h6 className="mb-1 text-dark fw-bold">{commonName}</h6>
              <div className="d-flex justify-content-between align-items-center extra-small text-muted">
                <span>Tag: <strong className="text-secondary">{tag}</strong></span>
                <span>{selectedEquipment["Location"] || ''}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {downtimeAction === 'Shutdown' && (
                <div className="mb-3">
                  <label className="form-label extra-small fw-bold text-secondary text-uppercase mb-1">
                    Shutdown Reason / Type <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select bg-light shadow-none"
                    value={shutdownType}
                    onChange={e => setShutdownType(e.target.value)}
                    required
                    disabled={isSubmitting}
                  >
                    {shutdownTypes.map(type => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <PhotoUploader
                label={downtimeAction === 'Shutdown' ? 'Incident Photo (Optional)' : 'Restart Photo (Optional)'}
                taggingNumber={tag}
                commonName={commonName}
                actionType={downtimeAction === 'Shutdown' ? 'Downtime Outage' : 'Downtime Restart'}
                operatorName={operatorName}
                operatorEmail={operatorEmail}
                maxRecencyHours={appConfig.photoRecencyHours}
                isStrict={appConfig.strictPhotoRecency}
                disabled={isSubmitting}
                onPhotoCaptured={setPhotoData}
                onPhotoRemoved={() => setPhotoData(null)}
              />

              <div className="mb-3">
                <label className="form-label extra-small fw-bold text-secondary text-uppercase mb-1">
                  Incident Remarks <span className="text-danger">*</span>
                </label>
                <textarea
                  className="form-control bg-light shadow-none"
                  rows={3}
                  placeholder={downtimeAction === 'Shutdown' ? 'Describe the issue or failure...' : 'Describe resolution and restart condition...'}
                  maxLength={255}
                  value={remarks}
                  required
                  onInput={e => setRemarks((e.target as HTMLTextAreaElement).value)}
                  disabled={isSubmitting}
                ></textarea>
                <div className="d-flex justify-content-between align-items-center mt-1">
                  <small className="text-muted extra-small">Max 255 characters</small>
                  <small className={`extra-small ${remarks.length >= 240 ? 'text-danger fw-bold' : 'text-muted'}`}>
                    {remarks.length} / 255
                  </small>
                </div>
              </div>

              <div className="d-grid gap-2 pt-2">
                <button
                  type="submit"
                  className={`btn btn-lg rounded-pill fw-bold shadow-sm ${
                    downtimeAction === 'Restart' ? 'btn-warning text-dark' : 'btn-danger text-white'
                  }`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>{downtimeAction === 'Restart' ? 'Confirm Restart' : 'Submit Downtime Report'}</span>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-light rounded-pill fw-bold text-muted"
                  onClick={closeDowntimeModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
