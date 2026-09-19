import Dexie, { Table } from 'dexie';
import {
  Equipment,
  Schedule,
  OverrideSchedule,
  RuntimeLog,
  HistoryLog,
  EquipmentAssignment,
  OutboxItem,
  PhotoBlobItem
} from '../types';

export interface CachedAppConfig {
  key: string;
  value: any;
}

export class EqrtDatabase extends Dexie {
  equipment!: Table<Equipment, string>;
  schedules!: Table<Schedule, string>;
  overrides!: Table<OverrideSchedule, string>;
  runtimeLogs!: Table<RuntimeLog, string>;
  historyLogs!: Table<HistoryLog, string>;
  equipmentAssignments!: Table<EquipmentAssignment, string>;
  appConfig!: Table<CachedAppConfig, string>;
  outbox!: Table<OutboxItem, string>;
  photos!: Table<PhotoBlobItem, string>;

  constructor() {
    super('EqrtOperationsDB');
    this.version(4).stores({
      equipment: 'taggingNumber, System, Location, Status',
      schedules: 'taggingNumber',
      overrides: 'id, taggingNumber, Date',
      routineLogs: null,
      downtimeLogs: null,
      runtimeLogs: 'transactionId, taggingNumber, LoggedDate, activityCategory, activityState',
      historyLogs: '++id, tagNumber, action, date, reportedBy, transactionId',
      equipmentAssignments: 'taggingNumber, Scope, Primary Operator',
      appConfig: 'key',
      outbox: 'id, status, clientTimestamp, taggingNumber',
      photos: 'txId, logType, status, createdAt'
    });
  }
}

export const db = new EqrtDatabase();
