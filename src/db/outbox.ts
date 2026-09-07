import { db } from './db';
import { OutboxItem, PhotoBlobItem, OutboxStatus } from '../types';

/**
 * Add a new action to the offline Outbox queue
 */
export async function queueOutboxAction(
  item: Omit<OutboxItem, 'status' | 'retryCount'>
): Promise<OutboxItem> {
  const outboxItem: OutboxItem = {
    ...item,
    status: 'PENDING',
    retryCount: 0
  };

  await db.outbox.put(outboxItem);
  return outboxItem;
}

/**
 * Store a captured & watermarked photo blob in IndexedDB
 */
export async function queuePhotoBlob(
  txId: string,
  taggingNumber: string,
  logType: 'routine' | 'downtime',
  actionType: string,
  blob: Blob
): Promise<PhotoBlobItem> {
  const photoItem: PhotoBlobItem = {
    txId,
    taggingNumber,
    logType,
    actionType,
    blob,
    status: 'PENDING',
    createdAt: Date.now()
  };

  await db.photos.put(photoItem);
  return photoItem;
}

/**
 * Retrieve all pending outbox actions ordered by client timestamp (FIFO)
 */
export async function getPendingOutboxActions(): Promise<OutboxItem[]> {
  const items = await db.outbox.where('status').equals('PENDING').toArray();
  return items.sort((a, b) => new Date(a.clientTimestamp).getTime() - new Date(b.clientTimestamp).getTime());
}

/**
 * Update the status and optional error of an outbox item
 */
export async function updateOutboxStatus(
  id: string,
  status: OutboxStatus,
  lastError?: string
): Promise<void> {
  const existing = await db.outbox.get(id);
  if (existing) {
    await db.outbox.update(id, {
      status,
      lastError,
      retryCount: status === 'FAILED' ? existing.retryCount + 1 : existing.retryCount
    });
  }
}

/**
 * Remove confirmed outbox item and associated photo blob
 */
export async function purgeConfirmedOutboxItem(id: string): Promise<void> {
  await db.outbox.delete(id);
  await db.photos.delete(id);
}

/**
 * Get total pending count
 */
export async function getPendingOutboxCount(): Promise<number> {
  return await db.outbox.where('status').equals('PENDING').count();
}

/**
 * Retrieve photo blob by transaction id
 */
export async function getPhotoBlob(txId: string): Promise<PhotoBlobItem | undefined> {
  return await db.photos.get(txId);
}
