import Dexie, { Table } from 'dexie';
import { Equipment, Schedule, OverrideSchedule, RuntimeLog, OutboxItem, PhotoBlobItem } from '../types';

export class EqrtDatabase extends Dexie {
  equipment!: Table<Equipment, string>;
  schedules!: Table<Schedule, string>;
  overrides!: Table<OverrideSchedule, string>;
  runtimeLogs!: Table<RuntimeLog, string>;
  outbox!: Table<OutboxItem, string>;
  photos!: Table<PhotoBlobItem, string>;

  constructor() {
    super('EqrtOperationsDB');
    this.version(3).stores({
      equipment: 'taggingNumber, System, Location, Status',
      schedules: 'taggingNumber',
      overrides: 'id, taggingNumber, Date',
      routineLogs: null,
      downtimeLogs: null,
      runtimeLogs: 'transactionId, taggingNumber, LoggedDate, activityCategory, activityState',
      outbox: 'id, status, clientTimestamp, taggingNumber',
      photos: 'txId, logType, status, createdAt'
    });
  }
}

export const db = new EqrtDatabase();
