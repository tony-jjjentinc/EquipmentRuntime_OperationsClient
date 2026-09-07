import {
  Equipment,
  Schedule,
  OverrideSchedule,
  RoutineLog,
  DowntimeLog,
  EquipmentOperationalState
} from '../types';
import { parseHHmm } from './timeService';
import { resolveScheduleMetadata } from './scheduleService';

/**
 * Derives the live operational state of an equipment unit.
 * Implements the 2-state visual hierarchy: Running vs Not Running (Off / Downtime).
 */
export function getEquipmentState(
  eq: Equipment,
  downtimeLogs: DowntimeLog[],
  routineLogs: RoutineLog[],
  schedules: Schedule[],
  overrides: OverrideSchedule[]
): EquipmentOperationalState {
  const tag = eq["Tagging Number"] || eq["Equipment ID"] || "";

  // 1. Check for Open Downtime
  const openDowntime = downtimeLogs.find(
    log => (log["Tagging Number"] === tag || log["Equipment ID"] === tag) && !log["Restarted At"]
  );

  if (openDowntime) {
    const dReason =
      openDowntime["Shutdown Type"] ||
      openDowntime["Shutdown Reason"] ||
      'Unscheduled Maintenance';
    return {
      state: 'Not Running',
      subState: 'Downtime',
      reason: dReason,
      log: openDowntime
    };
  }

  // 2. Check Schedule Metadata
  const meta = resolveScheduleMetadata(eq, schedules, overrides);
  const is24hSchedule =
    (meta.startup === '00:00' && meta.shutdown === '23:59') ||
    (meta.context && (meta.context.includes('Always On') || meta.context.includes('Always Online')));

  // 3. Find Today's Downtime & Routine Logs
  const todayDowntime = [...downtimeLogs]
    .reverse()
    .find(log => (log["Tagging Number"] === tag || log["Equipment ID"] === tag) && log["Restarted At"]);

  const todayRoutine = routineLogs.find(
    log => log["Tagging Number"] === tag || log["Equipment ID"] === tag
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

      // If restarted from downtime strictly after routine shutdown time (and not auto-closed on power off)
      if (todayDowntime && todayDowntime["Restarted At"]) {
        const isClosedOnPowerOff = String(
          todayDowntime["Shutdown On-Ground Remarks"] || ''
        ).includes('[Closed on Routine Power Off]');

        if (!isClosedOnPowerOff) {
          const restartMinutes = parseHHmm(todayDowntime["Restarted At"]);
          const shutdownMinutes = parseHHmm(todayRoutine["Shutdown At"]);
          if (restartMinutes > shutdownMinutes) {
            return {
              state: 'Running',
              subState: 'Running',
              reason: 'Running',
              log: {
                ...todayRoutine,
                "Started At": todayDowntime["Restarted At"] || todayRoutine["Started At"],
                "Shutdown At": ""
              }
            };
          }
        }
      }

      return { state: 'Not Running', subState: 'Off', reason: 'Off', log: todayRoutine };
    } else if (todayRoutine["Started At"]) {
      return { state: 'Running', subState: 'Running', reason: 'Running', log: todayRoutine };
    }
  }

  return { state: 'Not Running', subState: 'Off', reason: 'Off', log: null };
}
