import React, { useState } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useEquipmentStore } from '../../store/useEquipmentStore';
import { PhotoUploader } from './PhotoUploader';
import { ProcessedPhoto } from '../../services/cameraService';
import { getFormattedDate, get24HourTime } from '../../services/timeService';
import { queueOutboxAction, queuePhotoBlob } from '../../db/outbox';
import { drainOutboxQueue } from '../../services/syncEngine';
import { RuntimeLog } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { RefreshCw, MapPin, AlertTriangle } from 'lucide-react';

export const DowntimeModal: React.FC = () => {
  const { selectedEquipment, downtimeAction, showDowntimeModal, closeDowntimeModal } = useUIStore();
  const { user, token } = useAuthStore();
  const { appConfig, shutdownTypes, optimisticAddRuntimeLog, optimisticRestartDowntime } = useEquipmentStore();

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
        const runtimeLog: RuntimeLog = {
          "Transaction ID": txId,
          transactionId: txId,
          "System": selectedEquipment["System"] || "",
          "Component": selectedEquipment["Component"] || "",
          "Tagging Number": tag,
          taggingNumber: tag,
          "Common Name": commonName,
          "Logged Date": todayFormatted,
          LoggedDate: todayFormatted,
          "Activity Category": 'Downtime',
          activityCategory: 'Downtime',
          "Activity State": shutdownType,
          activityState: shutdownType,
          "Action": "Shutdown",
          "Started At": timeNow,
          "Shutdown At": "",
          "Duration (Minutes)": "",
          "Started By": operatorEmail,
          "Shutdown By": "",
          "Schedule Context": selectedEquipment.scheduleContext || "Standard Routine",
          "Start On-Ground Remarks": remarks,
          "Shutdown On-Ground Remarks": "",
          "Start Image Attachments": photoData ? 'data:image/jpeg;base64,' + photoData.base64 : '',
          "Shutdown Image Attachments": '',
          "Notes": ''
        };

        // 1. Optimistic Update
        await optimisticAddRuntimeLog(runtimeLog);

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
            ...runtimeLog,
            "Start Image Attachments": "",
            "Shutdown Image Attachments": "",
            captureDateStr: photoData ? photoData.captureDateStr : '',
            captureTimeStr: photoData ? photoData.captureTimeStr : ''
          },
          hasPhoto: !!photoData
        });
      } else if (downtimeAction === 'Restart') {
        const photoUrl = photoData ? 'data:image/jpeg;base64,' + photoData.base64 : '';

        // 1. Optimistic Restart
        await optimisticRestartDowntime(tag, timeNow, operatorEmail, remarks, photoUrl);

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
            "Shutdown At": timeNow,
            "Shutdown By": operatorEmail,
            "Shutdown On-Ground Remarks": remarks,
            "Shutdown Image Attachments": "",
            captureDateStr: photoData ? photoData.captureDateStr : '',
            captureTimeStr: photoData ? photoData.captureTimeStr : '',
            "Activity Category": 'Downtime',
            "Activity State": 'Completed'
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
    <Dialog open={showDowntimeModal} onOpenChange={open => !open && closeDowntimeModal()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <span>{downtimeAction === 'Shutdown' ? 'Report Downtime Outage' : 'Restart Equipment'}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Reporting as <strong className="text-foreground">{operatorName}</strong> ({operatorEmail})
          </DialogDescription>
        </DialogHeader>

        {/* Equipment Context Banner */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 space-y-1">
          <h4 className="font-bold text-sm text-foreground">{commonName}</h4>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Tag: <strong className="font-mono text-foreground">{tag}</strong></span>
            {selectedEquipment["Location"] && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {selectedEquipment["Location"]}
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {downtimeAction === 'Shutdown' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Outage Reason / Category *
              </label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={shutdownType}
                onChange={e => setShutdownType(e.target.value)}
                disabled={isSubmitting}
                required
              >
                {shutdownTypes.length > 0 ? (
                  shutdownTypes.map(st => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Unscheduled Maintenance">Unscheduled Maintenance</option>
                    <option value="Emergency Breakdown">Emergency Breakdown</option>
                    <option value="Facility Power Loss">Facility Power Loss</option>
                    <option value="Parts Replacement">Parts Replacement</option>
                  </>
                )}
              </select>
            </div>
          )}

          <PhotoUploader
            label={downtimeAction === 'Shutdown' ? 'Outage Photo (Optional)' : 'Restart Photo (Optional)'}
            taggingNumber={tag}
            commonName={commonName}
            actionType={`Downtime ${downtimeAction}`}
            operatorName={operatorName}
            operatorEmail={operatorEmail}
            maxRecencyHours={appConfig.photoRecencyHours}
            isStrict={appConfig.strictPhotoRecency}
            disabled={isSubmitting}
            onPhotoCaptured={setPhotoData}
            onPhotoRemoved={() => setPhotoData(null)}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {downtimeAction === 'Shutdown' ? 'Outage Remarks / Findings' : 'Restart Remarks / Resolution'}
            </label>
            <Textarea
              rows={3}
              placeholder={
                downtimeAction === 'Shutdown'
                  ? 'Describe problem, alarms, or breakdown cause...'
                  : 'Describe corrective action taken before restarting...'
              }
              maxLength={255}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              disabled={isSubmitting}
            />
            <div className="flex justify-between items-center text-[11px] text-muted-foreground">
              <span>Max 255 characters</span>
              <span className={remarks.length >= 240 ? 'text-rose-600 font-bold' : ''}>
                {remarks.length} / 255
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={closeDowntimeModal}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={downtimeAction === 'Shutdown' ? 'downtime' : 'warning'}
              disabled={isSubmitting}
              className="cursor-pointer font-bold gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>{downtimeAction === 'Shutdown' ? 'Confirm Outage' : 'Confirm Restart'}</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
