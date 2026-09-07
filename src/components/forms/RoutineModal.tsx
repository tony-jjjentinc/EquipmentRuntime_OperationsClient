import React, { useState } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useEquipmentStore } from '../../store/useEquipmentStore';
import { PhotoUploader } from './PhotoUploader';
import { ProcessedPhoto } from '../../services/cameraService';
import { getFormattedDate, get24HourTime } from '../../services/timeService';
import { queueOutboxAction, queuePhotoBlob } from '../../db/outbox';
import { drainOutboxQueue } from '../../services/syncEngine';
import { RoutineLog } from '../../types';

export const RoutineModal: React.FC = () => {
  const { selectedEquipment, routineAction, showRoutineModal, closeRoutineModal } = useUIStore();
  const { user, token } = useAuthStore();
  const { appConfig, optimisticAddRoutineLog } = useEquipmentStore();

  const [remarks, setRemarks] = useState('');
  const [photoData, setPhotoData] = useState<ProcessedPhoto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!showRoutineModal || !selectedEquipment) return null;

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

    const routineLog: RoutineLog = {
      "Transaction ID": txId,
      transactionId: txId,
      "System": selectedEquipment["System"] || "",
      "Component": selectedEquipment["Component"] || "",
      "Tagging Number": tag,
      "Common Name": commonName,
      "Logged Date": todayFormatted,
      "Action": routineAction,
      "Started At": routineAction === 'Startup' ? timeNow : '',
      "Shutdown At": routineAction === 'Shutdown' ? timeNow : '',
      "Started By": routineAction === 'Startup' ? operatorEmail : '',
      "Shutdown By": routineAction === 'Shutdown' ? operatorEmail : '',
      "Schedule Context": selectedEquipment.scheduleContext || "Standard Routine",
      "Startup On-Ground Remarks": routineAction === 'Startup' ? remarks : '',
      "Shutdown On-Ground Remarks": routineAction === 'Shutdown' ? remarks : '',
      "Startup Image Attachments": routineAction === 'Startup' && photoData ? 'data:image/jpeg;base64,' + photoData.base64 : '',
      "Shutdown Image Attachments": routineAction === 'Shutdown' && photoData ? 'data:image/jpeg;base64,' + photoData.base64 : ''
    };

    try {
      // 1. Optimistic Local State Update
      await optimisticAddRoutineLog(routineLog);

      // 2. Queue into Offline Outbox
      await queueOutboxAction({
        id: txId,
        actionType: routineAction,
        taggingNumber: tag,
        commonName,
        operatorEmail,
        operatorName,
        clientTimestamp: new Date().toISOString(),
        payload: {
          ...routineLog,
          captureDateStr: photoData ? photoData.captureDateStr : '',
          captureTimeStr: photoData ? photoData.captureTimeStr : ''
        },
        hasPhoto: !!photoData
      });

      // 3. Queue Photo Blob if captured
      if (photoData) {
        await queuePhotoBlob(txId, tag, 'routine', routineAction, photoData.blob);
      }

      // 4. Trigger asynchronous sync in background if online
      if (navigator.onLine && token) {
        drainOutboxQueue(token).catch(err => console.warn('Background sync error:', err));
      }

      closeRoutineModal();
    } catch (err) {
      console.error('Failed to submit routine action:', err);
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
              <h5 className="modal-title fw-bold text-dark">
                {routineAction === 'Startup' ? 'Routine Startup' : 'Routine Shutdown'}
              </h5>
              <p className="text-muted extra-small mb-0">
                Operating as {operatorName} ({operatorEmail})
              </p>
            </div>
            <button type="button" className="btn-close shadow-none" onClick={closeRoutineModal} disabled={isSubmitting}></button>
          </div>

          <div className="modal-body px-3 py-3">
            {/* Equipment Context Banner */}
            <div className="bg-light rounded-3 p-3 mb-3 border">
              <h6 className="mb-1 text-dark fw-bold">{commonName}</h6>
              <div className="d-flex justify-content-between align-items-center extra-small text-muted">
                <span>Tag: <strong className="text-secondary">{tag}</strong></span>
                <span>{selectedEquipment["Location"] || ''}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <PhotoUploader
                label={routineAction === 'Startup' ? 'Startup Photo (Optional)' : 'Shutdown Photo (Optional)'}
                taggingNumber={tag}
                commonName={commonName}
                actionType={`Routine ${routineAction}`}
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
                  On-Ground Remarks
                </label>
                <textarea
                  className="form-control bg-light shadow-none"
                  rows={3}
                  placeholder={`Add optional remarks for ${routineAction.toLowerCase()}...`}
                  maxLength={255}
                  value={remarks}
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
                    routineAction === 'Startup' ? 'btn-success text-white' : 'btn-secondary text-white'
                  }`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      <span>Recording...</span>
                    </>
                  ) : (
                    <span>Confirm {routineAction}</span>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-light rounded-pill fw-bold text-muted"
                  onClick={closeRoutineModal}
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
