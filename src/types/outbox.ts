export type OutboxStatus = 'PENDING' | 'SYNCING' | 'FAILED' | 'CONFIRMED';

export type OutboxActionType = 'Startup' | 'Shutdown' | 'Downtime' | 'Restart';

export interface OutboxItem {
  id: string; // Transaction UUID
  actionType: OutboxActionType;
  taggingNumber: string;
  commonName: string;
  operatorEmail: string;
  operatorName?: string;
  clientTimestamp: string; // ISO 8601
  payload: Record<string, any>;
  hasPhoto: boolean;
  status: OutboxStatus;
  retryCount: number;
  lastError?: string;
}

export interface PhotoBlobItem {
  txId: string; // Matches OutboxItem.id
  taggingNumber: string;
  logType?: 'routine' | 'downtime' | 'runtime';
  actionType: string;
  blob: Blob;
  status: 'PENDING' | 'UPLOADING' | 'UPLOADED' | 'FAILED';
  createdAt: number;
}
