import { Equipment, Schedule, OverrideSchedule, ScheduleMetadata } from '../types';
import { getTodayDateString } from './timeService';

/**
 * Resolves the highest-priority override for an equipment on a given target date.
 * Based on the priority scale:
 * Specificity: One-Time (+40), Ranged (+30), Seasonal (+20), Seasonal Ranged (+10)
 * Runtime Dominance: Always Offline (+4), Always Online (+3), Custom/Startup/Shutdown (+2)
 */
export function resolvePrioritizedOverride(
  overrides: OverrideSchedule[],
  tag: string,
  targetDateStr: string
): OverrideSchedule | null {
  if (!overrides || overrides.length === 0 || !tag) return null;

  const matches: { override: OverrideSchedule; score: number; index: number }[] = [];

  overrides.forEach((ov, idx) => {
    const ovTag = ov["Tagging Number"] || ov["Equipment ID"];
    if (ovTag !== tag) return;

    const ovDate = ov["Date"];
    const startDate = ov["Start Date"];
    const endDate = ov["End Date"];
    const rule = ov["Recurrence Rule"] || "One-Time";

    let dateMatch = false;

    if (rule === "One-Time") {
      if (ovDate === targetDateStr) dateMatch = true;
    } else if (rule === "Ranged" || rule === "Seasonal Ranged") {
      if (startDate && endDate && targetDateStr >= startDate && targetDateStr <= endDate) {
        dateMatch = true;
      }
    } else if (rule === "Seasonal") {
      if (ovDate && targetDateStr.endsWith(ovDate.substring(4))) {
        dateMatch = true;
      }
    }

    if (dateMatch) {
      let score = 0;
      // Specificity Score
      if (rule === "One-Time") score += 40;
      else if (rule === "Ranged") score += 30;
      else if (rule === "Seasonal") score += 20;
      else if (rule === "Seasonal Ranged") score += 10;

      // Runtime Type Dominance
      const runtimeType = ov["Runtime Type"] || "";
      if (runtimeType === "Always Offline") score += 4;
      else if (runtimeType === "Always Online") score += 3;
      else score += 2;

      matches.push({ override: ov, score, index: idx });
    }
  });

  if (matches.length === 0) return null;

  // Sort descending by score, tie-break by later index
  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.index - a.index;
  });

  return matches[0].override;
}

/**
 * Resolves schedule metadata (context, expected startup, expected shutdown, is24h)
 */
export function resolveScheduleMetadata(
  eq: Equipment,
  schedules: Schedule[],
  overrides: OverrideSchedule[]
): ScheduleMetadata {
  if (!eq) {
    return { context: "Standard Routine", startup: "--:--", shutdown: "--:--", is24h: false };
  }

  if (eq.expectedStartup !== undefined || eq.expectedShutdown !== undefined) {
    return {
      context: eq.scheduleContext || "Standard Routine",
      startup: eq.expectedStartup || "--:--",
      shutdown: eq.expectedShutdown || "--:--",
      is24h: !!eq.is24h
    };
  }

  const tag = eq["Tagging Number"] || eq["Equipment ID"] || "";
  const todayStr = getTodayDateString();

  const schedule = schedules.find(s => (s["Tagging Number"] === tag || s["Equipment ID"] === tag));
  const override = resolvePrioritizedOverride(overrides, tag, todayStr);

  let context = "Standard Routine";
  let expStartup = schedule ? (schedule["Startup Time"] || "--:--") : "--:--";
  let expShutdown = schedule ? (schedule["Shutdown Time"] || "--:--") : "--:--";
  let is24h = (expStartup === '00:00' && expShutdown === '23:59') || !!(schedule && schedule["Is 24Hours"]);

  if (override) {
    const runtimeType = override["Runtime Type"] || "";
    context = `Override: ${override["Recurrence Rule"] || 'One-Time'} (${runtimeType})`;

    if (runtimeType === "Always Online") {
      expStartup = "00:00";
      expShutdown = "23:59";
      is24h = true;
    } else if (runtimeType === "Always Offline") {
      expStartup = "--:--";
      expShutdown = "--:--";
      is24h = false;
    } else if (override["Startup Schedule Override"] || override["Shutdown Schedule Override"]) {
      if (override["Startup Schedule Override"]) expStartup = override["Startup Schedule Override"];
      if (override["Shutdown Schedule Override"]) expShutdown = override["Shutdown Schedule Override"];
      is24h = (expStartup === '00:00' && expShutdown === '23:59');
    }
  }

  return {
    context,
    startup: expStartup,
    shutdown: expShutdown,
    is24h
  };
}
