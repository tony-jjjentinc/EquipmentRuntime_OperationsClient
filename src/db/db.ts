import Dexie, { Table } from 'dexie';
import { Equipment, Schedule, OverrideSchedule, RoutineLog, DowntimeLog, OutboxItem, PhotoBlobItem } from '../types';

export class EqrtDatabase extends Dexie {
  equipment!: Table<Equipment, string>;
  schedules!: Table<Schedule, string>;
  overrides!: Table<OverrideSchedule, string>;
  routineLogs!: Table<RoutineLog, string>;
  downtimeLogs!: Table<DowntimeLog, string>;
  outbox!: Table<OutboxItem, string>;
  photos!: Table<PhotoBlobItem, string>;

  constructor() {
    super('EqrtOperationsDB');
    // Using valid identifier keyPaths without spaces for full IndexedDB compliance
    this.version(2).stores({
      equipment: 'taggingNumber, System, Location, Status',
      schedules: 'taggingNumber',
      overrides: 'id, taggingNumber, Date',
      routineLogs: 'transactionId, taggingNumber, LoggedDate',
      downtimeLogs: 'transactionId, taggingNumber, LoggedDate',
      outbox: 'id, status, clientTimestamp, taggingNumber',
      photos: 'txId, logType, status, createdAt'
    });
  }
}

export const db = new EqrtDatabase();
