import {
  Equipment,
  Schedule,
  OverrideSchedule,
  RuntimeLog,
  EquipmentOperationalState
} from '../types';
import { resolveScheduleMetadata } from './scheduleService';

/**
 * Derives the live operational state of an equipment unit from unified RuntimeLogs.
 * Implements the 2-state visual hierarchy: Running vs Not Running (Off / Downtime).
 */
export function getEquipmentState(
  eq: Equipment,
  runtimeLogs: RuntimeLog[],
  schedules: Schedule[],
  overrides: OverrideSchedule[]
): EquipmentOperationalState {
  const tag = eq["Tagging Number"] || eq["Equipment ID"] || "";

  // FIX-06: Reverse-scan for open downtime and check sequence against latest routine log
  const openDowntime = [...runtimeLogs].reverse().find(
    log => (log["Tagging Number"] === tag || log["Equipment ID"] === tag) &&
           log["Activity Category"] === 'Downtime' &&
           !log["Shutdown At"] && !log["Restarted At"]
  );

  const latestRoutine = [...runtimeLogs].reverse().find(
    log => (log["Tagging Number"] === tag || log["Equipment ID"] === tag) &&
           log["Activity Category"] === 'Routine'
  );

  if (openDowntime) {
    const dtIndex = runtimeLogs.indexOf(openDowntime);
    const routineIndex = latestRoutine ? runtimeLogs.indexOf(latestRoutine) : -1;
    // Only latch to downtime if it is newer than the latest routine log
    if (dtIndex >= routineIndex) {
      const dReason =
        openDowntime["Activity State"] ||
        openDowntime["Shutdown Type"] ||
        'Unscheduled Maintenance';
      return {
        state: 'Not Running',
        subState: 'Downtime',
        reason: dReason,
        log: openDowntime
      };
    }
  }

  // 2. Check Schedule Metadata
  const meta = resolveScheduleMetadata(eq, schedules, overrides);
  const is24hSchedule =
    (meta.startup === '00:00' && meta.shutdown === '23:59') ||
    (meta.context && (meta.context.includes('Always On') || meta.context.includes('Always Online')));

  // 3. Find Most Recent Routine Log
  const todayRoutine = [...runtimeLogs]
    .reverse()
    .find(
      log => (log["Tagging Number"] === tag || log["Equipment ID"] === tag) &&
             log["Activity Category"] === 'Routine'
    );

  if (todayRoutine) {
    if (todayRoutine["Started At"] && todayRoutine["Shutdown At"]) {
      // If 24/7 equipment with nominal shutdown at 23:59, it is Running
      if (
        todayRoutine["Shutdown At"] === '23:59' &&
        (is24hSchedule ||
          (todayRoutine["Schedule Context"] &&
            (todayRoutine["Schedule Context"].includes('Always On') ||
              todayRoutine["Schedule Context"].includes('Always Online'))))
      ) {
        return { state: 'Running', subState: 'Running', reason: 'Running', log: todayRoutine };
      }

      return { state: 'Not Running', subState: 'Off', reason: 'Off', log: todayRoutine };
    } else if (todayRoutine["Started At"]) {
      return { state: 'Running', subState: 'Running', reason: 'Running', log: todayRoutine };
    }
  }

  return { state: 'Not Running', subState: 'Off', reason: 'Off', log: null };
}
