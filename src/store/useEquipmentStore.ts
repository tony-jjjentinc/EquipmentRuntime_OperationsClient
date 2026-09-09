import { create } from 'zustand';
import {
  Equipment,
  Schedule,
  OverrideSchedule,
  RuntimeLog,
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
  runtimeLogs: RuntimeLog[];
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
  optimisticAddRuntimeLog: (log: RuntimeLog) => Promise<void>;
  optimisticRestartDowntime: (tag: string, restartTime: string, operator: string, remarks?: string, shutdownImage?: string) => Promise<void>;
}

export const useEquipmentStore = create<EquipmentStore>((set, get) => ({
  equipment: [],
  schedules: [],
  overrideSchedules: [],
  runtimeLogs: [],
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
    let cachedRuntime: RuntimeLog[] = [];

    try {
      cachedEq = await db.equipment.toArray();
      cachedSched = await db.schedules.toArray();
      cachedOv = await db.overrides.toArray();
      cachedRuntime = await db.runtimeLogs.toArray();

      if (cachedEq.length > 0) {
        set({
          equipment: cachedEq,
          schedules: cachedSched,
          overrideSchedules: cachedOv,
          runtimeLogs: cachedRuntime,
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

        const rawLogs = data.runtimeLogs || data.routineLogs || [];
        const runtimes: RuntimeLog[] = rawLogs.map((r: any, idx: number) => ({
          ...r,
          id: r['Transaction ID'] || r.transactionId || `rt-${idx}`,
          transactionId: r['Transaction ID'] || r.transactionId || `rt-${idx}`,
          taggingNumber: r['Tagging Number'] || r['Equipment ID'] || '',
          LoggedDate: r['Logged Date'] || '',
          "Activity Category": r['Activity Category'] || r.activityCategory || 'Routine',
          activityCategory: r['Activity Category'] || r.activityCategory || 'Routine',
          "Activity State": r['Activity State'] || r.activityState || 'Running',
          activityState: r['Activity State'] || r.activityState || 'Running'
        }));

        const hist = data.historyLogs || [];
        const assignments = data.equipmentAssignments || [];
        const shutTypes = data.shutdownTypes || get().shutdownTypes;

        set({
          equipment: enrichedEq,
          schedules: scheds,
          overrideSchedules: overrides,
          runtimeLogs: runtimes,
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
          await db.runtimeLogs.clear();
          await db.runtimeLogs.bulkPut(runtimes);
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
        const rawLogs = data.runtimeLogs || data.routineLogs;
        let freshLogs: RuntimeLog[] = rawLogs ? rawLogs.map((r: any, idx: number) => ({
          ...r,
          id: r['Transaction ID'] || r.transactionId || `rt-${idx}`,
          transactionId: r['Transaction ID'] || r.transactionId || `rt-${idx}`,
          taggingNumber: r['Tagging Number'] || r['Equipment ID'] || '',
          LoggedDate: r['Logged Date'] || '',
          "Activity Category": r['Activity Category'] || r.activityCategory || 'Routine',
          activityCategory: r['Activity Category'] || r.activityCategory || 'Routine',
          "Activity State": r['Activity State'] || r.activityState || 'Running',
          activityState: r['Activity State'] || r.activityState || 'Running'
        })) : [...get().runtimeLogs];

        // FIX-11: Overlay local in-flight outbox actions that have not yet landed in remote Google Sheets
        try {
          const pendingItems = await db.outbox.where('status').anyOf('PENDING', 'SYNCING').toArray();
          for (const item of pendingItems) {
            const txId = item.id;
            const alreadyInRemote = freshLogs.some((l: any) => (l['Transaction ID'] || l.transactionId) === txId);
            if (!alreadyInRemote && item.payload) {
              const p = item.payload;
              if (item.actionType === 'Restart') {
                const tag = item.taggingNumber;
                const dtIdx = freshLogs.findIndex((l: any) =>
                  (l['Tagging Number'] === tag || l.taggingNumber === tag) &&
                  l['Activity Category'] === 'Downtime' &&
                  !l['Shutdown At']
                );
                if (dtIdx !== -1) {
                  freshLogs[dtIdx] = {
                    ...freshLogs[dtIdx],
                    "Shutdown At": p["Shutdown At"] || '',
                    "Activity State": 'Completed'
                  };
                }
              } else {
                freshLogs.push({
                  ...p,
                  id: txId,
                  transactionId: txId,
                  taggingNumber: item.taggingNumber,
                  "Tagging Number": item.taggingNumber,
                  "Activity Category": p["Activity Category"] || (item.actionType === 'Downtime' ? 'Downtime' : 'Routine'),
                  "Activity State": p["Activity State"] || (item.actionType === 'Startup' ? 'Running' : 'Completed'),
                  "Logged Date": p["Logged Date"] || p.LoggedDate || '',
                  LoggedDate: p["Logged Date"] || p.LoggedDate || ''
                } as RuntimeLog);
              }
            }
          }
        } catch (dbErr) {
          console.warn('Could not overlay outbox items during silent hydration:', dbErr);
        }

        set({
          equipment: data.equipment || get().equipment,
          schedules: data.schedules || get().schedules,
          overrideSchedules: data.overrideSchedules || get().overrideSchedules,
          runtimeLogs: freshLogs,
          historyLogs: data.historyLogs || get().historyLogs,
          lastHydrated: new Date(),
          isHydrating: false
        });
      }
    } catch (err) {
      set({ isHydrating: false });
    }
  },

  optimisticAddRuntimeLog: async (log: RuntimeLog) => {
    const normalizedLog: RuntimeLog = {
      ...log,
      taggingNumber: log["Tagging Number"] || log["Equipment ID"] || log.taggingNumber || '',
      transactionId: log["Transaction ID"] || log.transactionId || crypto.randomUUID(),
      LoggedDate: log["Logged Date"] || ''
    };

    set(state => {
      const existingIdx = state.runtimeLogs.findIndex(
        l => (l["Transaction ID"] || l.transactionId) === normalizedLog.transactionId
      );
      if (existingIdx !== -1) {
        const updated = [...state.runtimeLogs];
        updated[existingIdx] = { ...updated[existingIdx], ...normalizedLog };
        return { runtimeLogs: updated };
      }
      return { runtimeLogs: [...state.runtimeLogs, normalizedLog] };
    });

    try {
      await db.runtimeLogs.put(normalizedLog);
    } catch (err) {
      console.warn('Dexie optimisticAddRuntimeLog notice:', err);
    }
  },

  optimisticRestartDowntime: async (tag: string, restartTime: string, operator: string, remarks?: string, shutdownImage?: string) => {
    const todayFormatted = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    set(state => {
      // 1. Close open downtime log
      const updated = state.runtimeLogs.map(log => {
        const isMatch = (log["Tagging Number"] === tag || log["Equipment ID"] === tag || log.taggingNumber === tag);
        const isDowntime = (log["Activity Category"] === 'Downtime' || log.activityCategory === 'Downtime');
        const isOpen = !log["Shutdown At"] && !log["Restarted At"];
        if (isMatch && isDowntime && isOpen) {
          return {
            ...log,
            "Shutdown At": restartTime,
            "Shutdown By": operator,
            "Shutdown On-Ground Remarks": remarks || '',
            "Shutdown Image Attachments": shutdownImage || '',
            "Activity State": 'Completed',
            activityState: 'Completed'
          };
        }
        return log;
      });

      // 2. Append optimistic resumed routine log
      const resumedTxId = crypto.randomUUID();
      const resumedLog: RuntimeLog = {
        "Transaction ID": resumedTxId,
        transactionId: resumedTxId,
        "Logged Date": todayFormatted,
        LoggedDate: todayFormatted,
        "Tagging Number": tag,
        taggingNumber: tag,
        "Activity Category": 'Routine',
        activityCategory: 'Routine',
        "Activity State": 'Running',
        activityState: 'Running',
        "Started At": restartTime,
        "Started By": operator,
        "Shutdown At": '',
        "Shutdown By": '',
        "Start On-Ground Remarks": `[Resumed after Downtime Outage] ${remarks || ''}`.trim(),
        Action: 'Startup'
      };

      return { runtimeLogs: [...updated, resumedLog] };
    });

    try {
      const openLogs = await db.runtimeLogs.where('taggingNumber').equals(tag).toArray();
      for (const d of openLogs) {
        if ((d["Activity Category"] === 'Downtime' || d.activityCategory === 'Downtime') && !d["Shutdown At"] && !d["Restarted At"]) {
          await db.runtimeLogs.put({
            ...d,
            "Shutdown At": restartTime,
            "Shutdown By": operator,
            "Shutdown On-Ground Remarks": remarks || '',
            "Activity State": 'Completed',
            activityState: 'Completed'
          });
        }
      }
    } catch (err) {
      console.warn('Dexie optimisticRestartDowntime notice:', err);
    }
  }
}));
