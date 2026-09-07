import { getPendingOutboxActions, updateOutboxStatus, purgeConfirmedOutboxItem, getPhotoBlob } from '../db/outbox';
import { callGasApi, pingGasApi } from '../api/gasClient';

export interface SyncResult {
  totalPending: number;
  synced: number;
  failed: number;
  errors: string[];
}

let isSyncing = false;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      const base64 = res.split(',')[1] || res;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Drain the offline outbox queue and synchronize with Google Apps Script
 */
export async function drainOutboxQueue(token: string): Promise<SyncResult> {
  if (isSyncing) {
    return { totalPending: 0, synced: 0, failed: 0, errors: ['Sync already in progress'] };
  }

  // 1. Verify upstream connectivity first
  const isOnline = await pingGasApi();
  if (!isOnline) {
    return { totalPending: 0, synced: 0, failed: 0, errors: ['Network or GAS API is unreachable'] };
  }

  isSyncing = true;
  const pendingActions = await getPendingOutboxActions();
  const result: SyncResult = {
    totalPending: pendingActions.length,
    synced: 0,
    failed: 0,
    errors: []
  };

  try {
    for (const item of pendingActions) {
      try {
        await updateOutboxStatus(item.id, 'SYNCING');

        // Step A: Send text action payload
        if (item.actionType === 'Startup' || item.actionType === 'Shutdown') {
          await callGasApi('submitRoutineLog', item.payload, token);
        } else if (item.actionType === 'Downtime' || item.actionType === 'Restart') {
          await callGasApi('submitDowntimeLog', item.payload, token);
        }

        // Step B: Upload associated photo if present
        if (item.hasPhoto) {
          const photo = await getPhotoBlob(item.id);
          if (photo && photo.blob) {
            const base64 = await blobToBase64(photo.blob);
            const isRoutine = item.actionType === 'Startup' || item.actionType === 'Shutdown';
            const attachCol = isRoutine
              ? item.actionType === 'Startup'
                ? 'Startup Image Attachments'
                : 'Shutdown Image Attachments'
              : item.actionType === 'Restart'
              ? 'Restart Image Attachments'
              : 'Shutdown Image Attachments';

            await callGasApi(
              'uploadLogPhoto',
              {
                txId: item.id,
                base64Data: base64,
                captureDateStr: item.payload['captureDateStr'] || '',
                captureTimeStr: item.payload['captureTimeStr'] || '',
                logType: photo.logType,
                attachmentColumn: attachCol
              },
              token
            );
          }
        }

        // Step C: Purge confirmed item
        await purgeConfirmedOutboxItem(item.id);
        result.synced++;
      } catch (err: any) {
        console.error(`Failed to sync outbox item ${item.id}:`, err);
        await updateOutboxStatus(item.id, 'FAILED', err.message);
        result.failed++;
        result.errors.push(`${item.commonName} (${item.actionType}): ${err.message}`);
        // If auth expired or lock timeout, halt further draining
        if (err.errorCode === 'SESSION_EXPIRED' || err.errorCode === 'UNAUTHORIZED') {
          break;
        }
      }
    }
  } finally {
    isSyncing = false;
  }

  return result;
}
