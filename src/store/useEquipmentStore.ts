import { create } from 'zustand';
import {
  Equipment,
  Schedule,
  OverrideSchedule,
  RoutineLog,
  DowntimeLog,
  EquipmentAssignment,
  HistoryLog
} from '../types';
import { db } from '../db/db';
import { callGasApi } from '../api/gasClient';

interface AppConfig {
  name: string;
  version: string;
  photoRecencyHours: number;
  strictPhotoRecency: boolean;
  backgroundHydrationIntervalMs: number;
}

interface EquipmentStore {
  equipment: Equipment[];
  schedules: Schedule[];
  overrideSchedules: OverrideSchedule[];
  routineLogs: RoutineLog[];
  downtimeLogs: DowntimeLog[];
  historyLogs: HistoryLog[];
  equipmentAssignments: EquipmentAssignment[];
  shutdownTypes: string[];
  appConfig: AppConfig;
  isLoading: boolean;
  isHydrating: boolean;
  lastHydrated: Date | null;
  error: string | null;

  loadInitialData: (token: string) => Promise<void>;
  hydrateDataSilently: (token: string) => Promise<void>;
  optimisticAddRoutineLog: (log: RoutineLog) => Promise<void>;
  optimisticAddDowntimeLog: (dLog: DowntimeLog, autoRoutine?: RoutineLog) => Promise<void>;
  optimisticRestartDowntime: (tag: string, restartTime: string, operator: string, remarks?: string) => Promise<void>;
}

export const useEquipmentStore = create<EquipmentStore>((set, get) => ({
  equipment: [],
  schedules: [],
  overrideSchedules: [],
  routineLogs: [],
  downtimeLogs: [],
  historyLogs: [],
  equipmentAssignments: [],
  shutdownTypes: ['Scheduled Maintenance', 'Unscheduled Maintenance', 'Operational Hold', 'Power Outage'],
  appConfig: {
    name: 'Equipment Running Time',
    version: 'v1.0.0',
    photoRecencyHours: 3,
    strictPhotoRecency: true,
    backgroundHydrationIntervalMs: 120000
  },
  isLoading: false,
  isHydrating: false,
  lastHydrated: null,
  error: null,

  loadInitialData: async (token: string) => {
    // 1. Try loading cached data from Dexie first for instant offline render
    let cachedEq: Equipment[] = [];
    let cachedSched: Schedule[] = [];
    let cachedOv: OverrideSchedule[] = [];
    let cachedRoutine: RoutineLog[] = [];
    let cachedDowntime: DowntimeLog[] = [];

    try {
      cachedEq = await db.equipment.toArray();
      cachedSched = await db.schedules.toArray();
      cachedOv = await db.overrides.toArray();
      cachedRoutine = await db.routineLogs.toArray();
      cachedDowntime = await db.downtimeLogs.toArray();

      if (cachedEq.length > 0) {
        set({
          equipment: cachedEq,
          schedules: cachedSched,
          overrideSchedules: cachedOv,
          routineLogs: cachedRoutine,
          downtimeLogs: cachedDowntime,
          isLoading: false
        });
      } else {
        set({ isLoading: true });
      }
    } catch (dbErr) {
      console.warn('Dexie read notice:', dbErr);
      set({ isLoading: true });
    }

    // 2. Fetch fresh data from GAS API
    try {
      const data = await callGasApi<any>('getInitialData', {}, token);

      if (data) {
        const enrichedEq = (data.equipment || []).map((eq: any) => ({
          ...eq,
          taggingNumber: eq['Tagging Number'] || eq['Equipment ID'] || '',
          id: eq['Tagging Number'] || eq['Equipment ID'] || ''
        }));

        const scheds = (data.schedules || []).map((s: any) => ({
          ...s,
          taggingNumber: s['Tagging Number'] || s['Equipment ID'] || '',
          id: s['Tagging Number'] || s['Equipment ID'] || ''
        }));

        const overrides = (data.overrideSchedules || []).map((o: any, idx: number) => ({
          ...o,
          id: o['Override ID'] || o.id || `ov-${idx}`,
          taggingNumber: o['Tagging Number'] || o['Equipment ID'] || ''
        }));

        const routines = (data.routineLogs || []).map((r: any, idx: number) => ({
          ...r,
          id: r['Transaction ID'] || r.transactionId || `r-${idx}`,
          transactionId: r['Transaction ID'] || r.transactionId || `r-${idx}`,
          taggingNumber: r['Tagging Number'] || r['Equipment ID'] || '',
          LoggedDate: r['Logged Date'] || ''
        }));

        const downtimes = (data.downtimeLogs || []).map((d: any, idx: number) => ({
          ...d,
          id: d['Transaction ID'] || d.transactionId || `d-${idx}`,
          transactionId: d['Transaction ID'] || d.transactionId || `d-${idx}`,
          taggingNumber: d['Tagging Number'] || d['Equipment ID'] || '',
          LoggedDate: d['Logged Date'] || ''
        }));

        const hist = data.historyLogs || [];
        const assignments = data.equipmentAssignments || [];
        const shutTypes = data.shutdownTypes || get().shutdownTypes;

        set({
          equipment: enrichedEq,
          schedules: scheds,
          overrideSchedules: overrides,
          routineLogs: routines,
          downtimeLogs: downtimes,
          historyLogs: hist,
          equipmentAssignments: assignments,
          shutdownTypes: shutTypes,
          appConfig: {
            name: data.name || get().appConfig.name,
            version: data.version || get().appConfig.version,
            photoRecencyHours: data.photoRecencyHours !== undefined ? Number(data.photoRecencyHours) : 3,
            strictPhotoRecency: data.strictPhotoRecency !== undefined ? !!data.strictPhotoRecency : true,
            backgroundHydrationIntervalMs: data.backgroundHydrationIntervalMs || 120000
          },
          isLoading: false,
          lastHydrated: new Date(),
          error: null
        });

        // 3. Persist to IndexedDB cache
        try {
          await db.equipment.clear();
          await db.equipment.bulkPut(enrichedEq);
          await db.schedules.clear();
          await db.schedules.bulkPut(scheds);
          await db.overrides.clear();
          await db.overrides.bulkPut(overrides);
          await db.routineLogs.clear();
          await db.routineLogs.bulkPut(routines);
          await db.downtimeLogs.clear();
          await db.downtimeLogs.bulkPut(downtimes);
        } catch (cacheErr) {
          console.warn('Dexie cache write warning:', cacheErr);
        }
      }
    } catch (err: any) {
      console.warn('Network loadInitialData notice:', err.message);
      // If we already had cached data, do not wipe it out
      set({
        isLoading: false,
        error: cachedEq.length > 0 ? null : err.message
      });
    }
  },

  hydrateDataSilently: async (token: string) => {
    if (get().isHydrating) return;
    set({ isHydrating: true });
    try {
      const data = await callGasApi<any>('getInitialData', {}, token);
      if (data) {
        set({
          equipment: data.equipment || get().equipment,
          schedules: data.schedules || get().schedules,
          overrideSchedules: data.overrideSchedules || get().overrideSchedules,
          routineLogs: data.routineLogs || get().routineLogs,
          downtimeLogs: data.downtimeLogs || get().downtimeLogs,
          historyLogs: data.historyLogs || get().historyLogs,
          lastHydrated: new Date(),
          isHydrating: false
        });
      }
    } catch (err) {
      set({ isHydrating: false });
    }
  },

  optimisticAddRoutineLog: async (log: RoutineLog) => {
    const normalizedLog = {
      ...log,
      taggingNumber: log["Tagging Number"] || log["Equipment ID"] || log.taggingNumber || '',
      transactionId: log["Transaction ID"] || log.transactionId || crypto.randomUUID(),
      LoggedDate: log["Logged Date"] || ''
    };

    set(state => {
      const updated = state.routineLogs.filter(
        l => (l["Tagging Number"] || l["Equipment ID"]) !== normalizedLog.taggingNumber
      );
      return { routineLogs: [...updated, normalizedLog] };
    });

    try {
      await db.routineLogs.put(normalizedLog);
    } catch (err) {
      console.warn('Dexie optimisticAddRoutineLog notice:', err);
    }
  },

  optimisticAddDowntimeLog: async (dLog: DowntimeLog, autoRoutine?: RoutineLog) => {
    const normalizedDLog = {
      ...dLog,
      taggingNumber: dLog["Tagging Number"] || dLog["Equipment ID"] || dLog.taggingNumber || '',
      transactionId: dLog["Transaction ID"] || dLog.transactionId || crypto.randomUUID(),
      LoggedDate: dLog["Logged Date"] || ''
    };

    let normalizedAutoRoutine: RoutineLog | undefined;
    if (autoRoutine) {
      normalizedAutoRoutine = {
        ...autoRoutine,
        taggingNumber: autoRoutine["Tagging Number"] || autoRoutine["Equipment ID"] || autoRoutine.taggingNumber || '',
        transactionId: autoRoutine["Transaction ID"] || autoRoutine.transactionId || crypto.randomUUID(),
        LoggedDate: autoRoutine["Logged Date"] || ''
      };
    }

    set(state => {
      const newDowntimes = [...state.downtimeLogs, normalizedDLog];
      let newRoutines = state.routineLogs;
      if (normalizedAutoRoutine) {
        const hasToday = state.routineLogs.some(
          l => (l["Tagging Number"] || l["Equipment ID"]) === normalizedAutoRoutine!.taggingNumber
        );
        if (!hasToday) {
          newRoutines = [...state.routineLogs, normalizedAutoRoutine];
        }
      }
      return { downtimeLogs: newDowntimes, routineLogs: newRoutines };
    });

    try {
      await db.downtimeLogs.put(normalizedDLog);
      if (normalizedAutoRoutine) {
        await db.routineLogs.put(normalizedAutoRoutine);
      }
    } catch (err) {
      console.warn('Dexie optimisticAddDowntimeLog notice:', err);
    }
  },

  optimisticRestartDowntime: async (tag: string, restartTime: string, operator: string, remarks?: string) => {
    set(state => {
      // 1. Close open downtime log
      const updatedDowntimes = state.downtimeLogs.map(log => {
        if ((log["Tagging Number"] === tag || log["Equipment ID"] === tag) && !log["Restarted At"]) {
          return {
            ...log,
            "Restarted At": restartTime,
            "Restarted By": operator,
            "Restart On-Ground Remarks": remarks || ''
          };
        }
        return log;
      });

      // 2. If routine log was 0-runtime anchor, convert to active startup
      const updatedRoutines = state.routineLogs.map(r => {
        if (r["Tagging Number"] === tag || r["Equipment ID"] === tag) {
          if (r["Started At"] && r["Shutdown At"] && r["Started At"] === r["Shutdown At"]) {
            return {
              ...r,
              "Action": "Startup",
              "Started At": restartTime,
              "Shutdown At": "",
              "Started By": operator,
              "Shutdown By": "",
              "Estimated Operational Time": ""
            };
          }
        }
        return r;
      });

      return { downtimeLogs: updatedDowntimes, routineLogs: updatedRoutines };
    });

    // Update Dexie using the valid index 'taggingNumber'
    try {
      const openD = await db.downtimeLogs.where('taggingNumber').equals(tag).toArray();
      for (const d of openD) {
        if (!d["Restarted At"]) {
          await db.downtimeLogs.put({
            ...d,
            "Restarted At": restartTime,
            "Restarted By": operator,
            "Restart On-Ground Remarks": remarks || ''
          });
        }
      }
    } catch (err) {
      console.warn('Dexie optimisticRestartDowntime notice:', err);
    }
  }
}));
