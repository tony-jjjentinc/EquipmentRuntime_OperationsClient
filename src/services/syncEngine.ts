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

async function _executeDrainQueue(token: string): Promise<SyncResult> {
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

  // FIX-02: Quarantine set for tags that encountered permanent errors
  const blockedTags = new Set<string>();

  try {
    for (const item of pendingActions) {
      // If a previous action for this equipment failed permanently, halt subsequent actions for this tag
      if (blockedTags.has(item.taggingNumber)) {
        continue;
      }

      try {
        await updateOutboxStatus(item.id, 'SYNCING');

        // FIX-01: Defensively strip any Base64 strings from payload before sending to Google Sheets
        const cleanPayload = { ...item.payload };
        const attachmentKeys = ['Start Image Attachments', 'Shutdown Image Attachments', 'Restart Image Attachments'];
        for (const k of attachmentKeys) {
          if (cleanPayload[k] && (String(cleanPayload[k]).startsWith('data:') || String(cleanPayload[k]).length > 2000)) {
            cleanPayload[k] = '';
          }
        }

        // Step A: Send text action payload
        await callGasApi('submitRuntimeLog', cleanPayload, token);

        // Step B: Upload associated photo if present
        if (item.hasPhoto) {
          const photo = await getPhotoBlob(item.id);
          if (photo && photo.blob) {
            const base64 = await blobToBase64(photo.blob);
            const attachCol = (item.actionType === 'Startup' || item.actionType === 'Restart')
              ? 'Start Image Attachments'
              : 'Shutdown Image Attachments';

            await callGasApi(
              'uploadLogPhoto',
              {
                txId: item.id,
                base64Data: base64,
                captureDateStr: item.payload['captureDateStr'] || '',
                captureTimeStr: item.payload['captureTimeStr'] || '',
                logType: photo.logType || 'runtime',
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
        const errMsg = err?.message || String(err);
        
        // Discriminate transient errors (network / script lock) from permanent errors
        const isTransient = 
          errMsg.includes('LOCK_TIMEOUT') ||
          errMsg.includes('System busy') ||
          errMsg.includes('NETWORK_ERROR') ||
          errMsg.includes('Failed to fetch') ||
          err?.name === 'TypeError' ||
          (err?.status && err.status >= 500);

        if (isTransient) {
          // Transient error: revert to PENDING so it can be retried cleanly next cycle
          await updateOutboxStatus(item.id, 'PENDING', errMsg);
          result.failed++;
          result.errors.push(`${item.commonName} (${item.actionType}) [Transient]: ${errMsg}`);
          // Terminate this drain cycle early to allow backoff
          break;
        } else {
          // Permanent error (e.g. VALIDATION_ERROR): mark FAILED and quarantine this tag
          await updateOutboxStatus(item.id, 'FAILED', errMsg);
          blockedTags.add(item.taggingNumber);
          result.failed++;
          result.errors.push(`${item.commonName} (${item.actionType}): ${errMsg}`);

          if (err.errorCode === 'SESSION_EXPIRED' || err.errorCode === 'UNAUTHORIZED') {
            break;
          }
        }
      }
    }
  } finally {
    isSyncing = false;
  }

  return result;
}

/**
 * Drain the offline outbox queue and synchronize with Google Apps Script
 * Protected by multi-tab Web Lock when available.
 */
export async function drainOutboxQueue(token: string): Promise<SyncResult> {
  if (typeof navigator !== 'undefined' && 'locks' in navigator && (navigator as any).locks?.request) {
    return await (navigator as any).locks.request('eqrts_outbox_drain', { ifAvailable: true }, async (lock: any) => {
      if (!lock) {
        return { totalPending: 0, synced: 0, failed: 0, errors: ['Sync lock held by another tab'] };
      }
      return await _executeDrainQueue(token);
    });
  }
  return await _executeDrainQueue(token);
}
