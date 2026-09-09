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
import { RefreshCw, MapPin } from 'lucide-react';

export const RoutineModal: React.FC = () => {
  const { selectedEquipment, routineAction, showRoutineModal, closeRoutineModal } = useUIStore();
  const { user, token } = useAuthStore();
  const { appConfig, optimisticAddRuntimeLog } = useEquipmentStore();

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
      "Activity Category": 'Routine',
      activityCategory: 'Routine',
      "Activity State": routineAction === 'Startup' ? 'Running' : 'Completed',
      activityState: routineAction === 'Startup' ? 'Running' : 'Completed',
      "Action": routineAction,
      "Started At": routineAction === 'Startup' ? timeNow : '',
      "Shutdown At": routineAction === 'Shutdown' ? timeNow : '',
      "Started By": routineAction === 'Startup' ? operatorEmail : '',
      "Shutdown By": routineAction === 'Shutdown' ? operatorEmail : '',
      "Schedule Context": selectedEquipment.scheduleContext || "Standard Routine",
      "Start On-Ground Remarks": routineAction === 'Startup' ? remarks : '',
      "Shutdown On-Ground Remarks": routineAction === 'Shutdown' ? remarks : '',
      "Start Image Attachments": routineAction === 'Startup' && photoData ? 'data:image/jpeg;base64,' + photoData.base64 : '',
      "Shutdown Image Attachments": routineAction === 'Shutdown' && photoData ? 'data:image/jpeg;base64,' + photoData.base64 : '',
      "Notes": ''
    };

    try {
      // 1. Optimistic Local State Update
      await optimisticAddRuntimeLog(runtimeLog);

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
          ...runtimeLog,
          "Start Image Attachments": "",
          "Shutdown Image Attachments": "",
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
    <Dialog open={showRoutineModal} onOpenChange={open => !open && closeRoutineModal()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {routineAction === 'Startup' ? 'Routine Startup' : 'Routine Shutdown'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Operating as <strong className="text-foreground">{operatorName}</strong> ({operatorEmail})
          </DialogDescription>
        </DialogHeader>

        {/* Equipment Context Banner */}
        <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-1">
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

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              On-Ground Remarks
            </label>
            <Textarea
              rows={3}
              placeholder={`Add optional notes for ${routineAction.toLowerCase()}...`}
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
              onClick={closeRoutineModal}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={routineAction === 'Startup' ? 'success' : 'default'}
              disabled={isSubmitting}
              className="cursor-pointer font-bold gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <span>Confirm {routineAction}</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
