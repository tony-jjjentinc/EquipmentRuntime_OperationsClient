export interface RuntimeLog {
  // --- Internal / Dexie keys (not sheet columns) ---
  id?: string;
  transactionId?: string;
  taggingNumber?: string;
  LoggedDate?: string;
  activityCategory?: string;
  activityState?: string;

  // --- 21 Canonical RuntimeLogs Columns ---
  "Transaction ID"?: string;
  "Logged Date": string;
  "System"?: string;
  "Component"?: string;
  "Tagging Number": string;
  "Common Name"?: string;
  "Activity Category": 'Routine' | 'Downtime' | string;
  "Activity State": 'Active' | 'Completed' | 'Running' | string;
  "Started At"?: string;
  "Shutdown At"?: string;
  "Duration (Minutes)"?: number | string;
  "Started By"?: string;
  "Shutdown By"?: string;
  "Schedule Context"?: string;
  "Expected Startup"?: string;
  "Expected Shutdown"?: string;
  "Start On-Ground Remarks"?: string;
  "Shutdown On-Ground Remarks"?: string;
  "Start Image Attachments"?: string;
  "Shutdown Image Attachments"?: string;
  "Notes"?: string;

  // --- Virtual routing key (not a column, used by backend dispatch) ---
  "Action"?: string;

  // Index signature for backward compatibility with unmigrated code paths
  [key: string]: any;
}


export interface HistoryLog {
  type: 'Routine' | 'Downtime';
  action: string;
  tagNumber: string;
  commonName: string;
  time: string;
  date: string;
  reportedBy: string;
  remarks?: string;
  imageUrl?: string;
  transactionId?: string;
  raw: any;
}

export type OperationalState = 'Running' | 'Not Running';
export type OperationalSubState = 'Running' | 'Off' | 'Downtime';

export interface EquipmentOperationalState {
  state: OperationalState;
  subState: OperationalSubState;
  reason: string;
  log: RuntimeLog | null;
}
