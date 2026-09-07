export interface RoutineLog {
  "Transaction ID"?: string;
  "transactionId"?: string;
  "System"?: string;
  "Component"?: string;
  "Tagging Number": string;
  "Equipment ID"?: string;
  "Common Name"?: string;
  "Logged Date": string;
  "Action": string; // "Startup", "Shutdown", "Power Off"
  "Started At": string;
  "Shutdown At": string;
  "Started By"?: string;
  "Shutdown By"?: string;
  "Schedule Context"?: string;
  "Estimated Operational Time"?: number | string;
  "Startup On-Ground Remarks"?: string;
  "Shutdown On-Ground Remarks"?: string;
  "Startup Image Attachments"?: string;
  "Shutdown Image Attachments"?: string;
  [key: string]: any;
}

export interface DowntimeLog {
  "Transaction ID"?: string;
  "transactionId"?: string;
  "System"?: string;
  "Component"?: string;
  "Tagging Number": string;
  "Equipment ID"?: string;
  "Common Name"?: string;
  "Logged Date": string;
  "Shutdown At": string;
  "Restarted At": string;
  "Shutdown Type"?: string;
  "Shutdown Reason"?: string;
  "Shutdown Reported By"?: string;
  "Restarted By"?: string;
  "Estimated Down Time"?: number | string;
  "Shutdown On-Ground Remarks"?: string;
  "Restart On-Ground Remarks"?: string;
  "Shutdown Image Attachments"?: string;
  "Restart Image Attachments"?: string;
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
  log: RoutineLog | DowntimeLog | null;
}
