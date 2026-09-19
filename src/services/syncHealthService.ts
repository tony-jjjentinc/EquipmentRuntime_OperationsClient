import { pingGasApi } from '../api/gasClient';
import { db } from '../db/db';
import { getPendingOutboxCount } from '../db/outbox';

export interface SyncHealthReport {
  score: number; // 0 to 100
  status: 'optimal' | 'moderate' | 'degraded' | 'offline';
  isOnline: boolean;
  isApiReachable: boolean;
  lastHydrated: Date | null;
  ageMinutes: number;
  pendingActionsCount: number;
  failedActionsCount: number;
  pendingPhotosCount: number;
  totalLocalEquipment: number;
  advice: string;
}

/**
 * Calculates real-time synchronization health metrics between local Dexie and Google Sheets
 */
export async function calculateSyncHealth(lastHydrated: Date | null): Promise<SyncHealthReport> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  let isApiReachable = false;

  if (isOnline) {
    try {
      isApiReachable = await pingGasApi();
    } catch {
      isApiReachable = false;
    }
  }

  // 1. Pending / Failed actions count
  let pendingActionsCount = 0;
  let failedActionsCount = 0;
  try {
    pendingActionsCount = await getPendingOutboxCount();
    failedActionsCount = await db.outbox.where('status').equals('FAILED').count();
  } catch {
    pendingActionsCount = 0;
    failedActionsCount = 0;
  }

  // 2. Pending photos in blob storage
  let pendingPhotosCount = 0;
  try {
    pendingPhotosCount = await db.photos.where('status').equals('PENDING').count();
  } catch {
    pendingPhotosCount = 0;
  }

  // 3. Total equipment cached locally
  let totalLocalEquipment = 0;
  try {
    totalLocalEquipment = await db.equipment.count();
  } catch {
    totalLocalEquipment = 0;
  }

  // 4. Data freshness / age calculation
  const now = Date.now();
  const lastSyncMs = lastHydrated ? new Date(lastHydrated).getTime() : 0;
  const ageMinutes = lastSyncMs > 0 ? Math.max(0, Math.floor((now - lastSyncMs) / (1000 * 60))) : 999;

  // Weight Calculation:
  // Component A: Connectivity & Reachability (25 pts)
  let reachabilityScore = 0;
  if (isOnline && isApiReachable) {
    reachabilityScore = 25;
  } else if (isOnline) {
    reachabilityScore = 10;
  }

  // Component B: Data Freshness (30 pts)
  let freshnessScore = 0;
  if (ageMinutes <= 5) {
    freshnessScore = 30;
  } else if (ageMinutes <= 15) {
    freshnessScore = 24;
  } else if (ageMinutes <= 30) {
    freshnessScore = 18;
  } else if (ageMinutes <= 60) {
    freshnessScore = 10;
  } else {
    freshnessScore = 4;
  }

  // Component C: Outbox Backlog (25 pts)
  let outboxScore = 25;
  if (failedActionsCount > 0) {
    outboxScore = 5;
  } else if (pendingActionsCount > 5) {
    outboxScore = 10;
  } else if (pendingActionsCount > 0) {
    outboxScore = 18;
  }

  // Component D: Photo Blob Sync (20 pts)
  let photoScore = 20;
  if (pendingPhotosCount > 5) {
    photoScore = 8;
  } else if (pendingPhotosCount > 0) {
    photoScore = 14;
  }

  const totalScore = Math.min(100, Math.max(0, reachabilityScore + freshnessScore + outboxScore + photoScore));

  let status: SyncHealthReport['status'] = 'optimal';
  if (!isOnline || !isApiReachable) {
    status = 'offline';
  } else if (totalScore < 60) {
    status = 'degraded';
  } else if (totalScore < 85) {
    status = 'moderate';
  }

  // Advice generation
  let advice = 'Local equipment database is healthy and synchronized with Google Sheets.';
  if (!isOnline) {
    advice = 'You are working offline. Actions are queued safely in IndexedDB and will sync when reconnected.';
  } else if (!isApiReachable) {
    advice = 'Internet is detected, but the Google Apps Script gateway is unreachable. Check network restrictions.';
  } else if (failedActionsCount > 0) {
    advice = `${failedActionsCount} action(s) encountered validation errors. Tap to review and resolve outbox errors.`;
  } else if (pendingActionsCount > 0 || pendingPhotosCount > 0) {
    advice = `${pendingActionsCount} action(s) and ${pendingPhotosCount} photo(s) are queued. Tap Sync to push to Google Sheets.`;
  } else if (ageMinutes > 30) {
    advice = `Local data was updated ${ageMinutes}m ago. Tap Sync to refresh the latest fleet changes from Google Sheets.`;
  }

  return {
    score: totalScore,
    status,
    isOnline,
    isApiReachable,
    lastHydrated,
    ageMinutes,
    pendingActionsCount,
    failedActionsCount,
    pendingPhotosCount,
    totalLocalEquipment,
    advice
  };
}
