export interface Equipment {
  "Tagging Number": string;
  "Equipment ID"?: string;
  "Common Name": string;
  "System"?: string;
  "Component"?: string;
  "Location"?: string;
  "Status"?: string;
  "Criticality"?: string;
  "Tracking Status"?: string;
  expectedStartup?: string;
  expectedShutdown?: string;
  scheduleContext?: string;
  is24h?: boolean;
  isOffline?: boolean;
  effectiveSchedule?: {
    "Startup Time"?: string;
    "Shutdown Time"?: string;
    "Schedule Context"?: string;
    "Is 24Hours"?: boolean;
    "Is Offline"?: boolean;
  };
  [key: string]: any;
}

export interface Schedule {
  "Tagging Number"?: string;
  "Equipment ID"?: string;
  "Startup Time"?: string;
  "Shutdown Time"?: string;
  "Schedule Context"?: string;
  "Is 24Hours"?: boolean;
  [key: string]: any;
}

export interface OverrideSchedule {
  "Override ID"?: string;
  "id"?: string;
  "Tagging Number"?: string;
  "Equipment ID"?: string;
  "Date"?: string;
  "Start Date"?: string;
  "End Date"?: string;
  "Startup Schedule Override"?: string;
  "Shutdown Schedule Override"?: string;
  "Runtime Type"?: string;
  "Recurrence Rule"?: string;
  "Schedule Context"?: string;
  "Priority"?: number;
  [key: string]: any;
}

export interface EquipmentAssignment {
  "Tagging Number"?: string;
  "Equipment ID"?: string;
  "Primary Operator"?: string;
  "Reliever Operator"?: string;
  "Scope"?: string;
  [key: string]: any;
}

export interface ScheduleMetadata {
  context: string;
  startup: string;
  shutdown: string;
  is24h: boolean;
}
