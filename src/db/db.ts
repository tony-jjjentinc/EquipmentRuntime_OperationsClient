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
    this.version(1).stores({
      equipment: 'Tagging Number, System, Location, Status',
      schedules: 'Tagging Number',
      overrides: 'id, Tagging Number, Date',
      routineLogs: 'transactionId, Tagging Number, Logged Date',
      downtimeLogs: 'transactionId, Tagging Number, Logged Date',
      outbox: 'id, status, clientTimestamp, taggingNumber',
      photos: 'txId, logType, status, createdAt'
    });
  }
}

export const db = new EqrtDatabase();
