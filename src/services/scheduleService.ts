import { Equipment, Schedule, OverrideSchedule, ScheduleMetadata } from '../types';
import { getTodayDateString } from './timeService';

/**
 * Checks if a target date matches an ordinal weekday specification (e.g. 1st Mon, 2nd Tue, Last Fri).
 */
export function isOrdinalWeekdayMatch(targetDate: Date, ordinal: string, weekday: string): boolean {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const targetDayIdx = targetDate.getDay();
  if (dayNames[targetDayIdx] !== weekday) return false;

  const targetDayNum = targetDate.getDate();
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();

  if (ordinal === '1st') return targetDayNum >= 1 && targetDayNum <= 7;
  if (ordinal === '2nd') return targetDayNum >= 8 && targetDayNum <= 14;
  if (ordinal === '3rd') return targetDayNum >= 15 && targetDayNum <= 21;
  if (ordinal === '4th') return targetDayNum >= 22 && targetDayNum <= 28;
  if (ordinal === 'Last') {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return targetDayNum > (daysInMonth - 7);
  }
  return false;
}

/**
 * Evaluates whether an override rule matches a given target date string (YYYY-MM-DD).
 * Full parity implementation with OperationsDashboard GAS recurrence engine.
 */
export function isOverrideDateMatch(override: OverrideSchedule, targetDateStr: string): boolean {
  const rule = String(override["Recurrence Rule"] || "One-Time");
  const pattern = String(override["Recurrence Pattern"] || "");
  const startDateStr = override["Start Date"] || override["Date"];
  const endDateStr = override["End Date"];
  if (!startDateStr) return false;

  const target = new Date(targetDateStr);
  const startD = new Date(startDateStr);
  const endD = endDateStr ? new Date(endDateStr) : null;
  if (isNaN(target.getTime()) || isNaN(startD.getTime())) return false;

  const targetNorm = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const startNorm = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate()).getTime();

  if (!rule.startsWith('Seasonal') && rule !== 'Weekly' && rule !== 'Monthly' && rule !== 'Quarterly') {
    if (targetNorm < startNorm) return false;
    if (endD && !isNaN(endD.getTime())) {
      const endNorm = new Date(endD.getFullYear(), endD.getMonth(), endD.getDate()).getTime();
      if (targetNorm > endNorm) return false;
    }
  }

  if (rule === "One-Time") {
    return startD.getFullYear() === target.getFullYear() &&
           startD.getMonth() === target.getMonth() &&
           startD.getDate() === target.getDate();
  }

  if (rule === "Ranged") {
    if (!endD || isNaN(endD.getTime())) return false;
    const endRangedNorm = new Date(endD.getFullYear(), endD.getMonth(), endD.getDate()).getTime();
    return targetNorm >= startNorm && targetNorm <= endRangedNorm;
  }

  if (rule === "Seasonal (Weekly)" || rule === "Weekly") {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const targetDayName = dayNames[target.getDay()];
    let activeDays = [dayNames[startD.getDay()]];
    if (pattern.startsWith("Days:")) {
      activeDays = pattern.replace("Days:", "").split(",").map(d => d.trim());
    }
    return activeDays.includes(targetDayName);
  }

  if (rule === "Seasonal (Monthly)" || rule === "Monthly") {
    if (pattern.includes("Ordinal:")) {
      let ordinal = "1st", weekday = "Mon";
      pattern.split(";").forEach(p => {
        if (p.startsWith("Ordinal:")) ordinal = p.replace("Ordinal:", "").trim();
        if (p.startsWith("Weekday:")) weekday = p.replace("Weekday:", "").trim();
      });
      return isOrdinalWeekdayMatch(target, ordinal, weekday);
    }
    
    const targetDay = target.getDate();
    if (pattern.startsWith("Days:")) {
      const rangeSpec = pattern.replace("Days:", "").trim();
      if (rangeSpec.includes("-")) {
        const [minDay, maxDay] = rangeSpec.split("-").map(Number);
        return targetDay >= minDay && targetDay <= maxDay;
      } else {
        const discreteDays = rangeSpec.split(",").map(Number);
        return discreteDays.includes(targetDay);
      }
    }
    return targetDay === startD.getDate();
  }

  if (rule === "Seasonal (Quarterly)" || rule === "Quarterly") {
    const monthInQuarter = (target.getMonth() % 3) + 1;
    let reqQMonth = "ALL";

    const qMatch = pattern.match(/QMonth:([^;]+)/);
    if (qMatch) reqQMonth = qMatch[1].trim();

    const qMonthMatch = (reqQMonth === "ALL" || Number(reqQMonth) === monthInQuarter);
    if (!qMonthMatch) return false;

    if (pattern.includes("Ordinal:")) {
      let ordinal = "1st", weekday = "Mon";
      pattern.split(";").forEach(p => {
        if (p.startsWith("Ordinal:")) ordinal = p.replace("Ordinal:", "").trim();
        if (p.startsWith("Weekday:")) weekday = p.replace("Weekday:", "").trim();
      });
      return isOrdinalWeekdayMatch(target, ordinal, weekday);
    }

    const targetDay = target.getDate();
    let minDay = 1, maxDay = 31;
    const dMatch = pattern.match(/Days:([^;]+)/);
    if (dMatch) {
      const dSpec = dMatch[1].trim();
      if (dSpec.includes("-")) {
        [minDay, maxDay] = dSpec.split("-").map(Number);
      } else {
        minDay = maxDay = Number(dSpec);
      }
    }
    return targetDay >= minDay && targetDay <= maxDay;
  }

  if (rule === "Seasonal (Yearly)" || rule === "Seasonal" || rule === "Seasonal Ranged") {
    if (endD && !isNaN(endD.getTime())) {
      let tempStart = new Date(target.getFullYear(), startD.getMonth(), startD.getDate()).getTime();
      let tempEnd = new Date(target.getFullYear(), endD.getMonth(), endD.getDate()).getTime();
      if (tempStart > tempEnd) {
        if (targetNorm <= tempEnd) {
          tempStart = new Date(target.getFullYear() - 1, startD.getMonth(), startD.getDate()).getTime();
        } else {
          tempEnd = new Date(target.getFullYear() + 1, endD.getMonth(), endD.getDate()).getTime();
        }
      }
      return targetNorm >= tempStart && targetNorm <= tempEnd;
    }
    return startD.getMonth() === target.getMonth() && startD.getDate() === target.getDate();
  }

  return false;
}

/**
 * Calculates priority score matching GAS OperationsDashboard:
 * Rule Specificity: +70..+20
 * Runtime Dominance: +5..+1
 */
export function getOverridePriorityScore(override: OverrideSchedule): number {
  let score = 0;
  const rule = String(override["Recurrence Rule"] || "One-Time");
  const type = String(override["Runtime Type"] || "Custom Schedule");
  
  if (rule === "One-Time") score += 70;
  else if (rule === "Ranged") score += 60;
  else if (rule === "Seasonal (Weekly)" || rule === "Weekly") score += 50;
  else if (rule === "Seasonal (Monthly)" || rule === "Monthly") score += 40;
  else if (rule === "Seasonal (Quarterly)" || rule === "Quarterly") score += 30;
  else if (rule === "Seasonal (Yearly)" || rule === "Seasonal" || rule === "Seasonal Ranged") score += 20;

  if (type === "Always Off" || type === "Always Offline") score += 5;
  else if (type === "Always On" || type === "Always Online") score += 4;
  else if (type === "Custom Schedule") score += 3;
  else if (type === "Startup Only") score += 2;
  else if (type === "Shutdown Only") score += 1;

  return score;
}

/**
 * Resolves the highest-priority override for an equipment on a given target date.
 */
export function resolvePrioritizedOverride(
  overrides: OverrideSchedule[],
  tag: string,
  targetDateStr: string
): OverrideSchedule | null {
  if (!overrides || overrides.length === 0 || !tag) return null;

  const matches = overrides.filter(o => {
    const oTag = o["Tagging Number"] || o["Equipment ID"];
    return oTag === tag && isOverrideDateMatch(o, targetDateStr);
  });

  if (matches.length === 0) return null;

  matches.sort((a, b) => {
    const scoreA = getOverridePriorityScore(a);
    const scoreB = getOverridePriorityScore(b);
    if (scoreA !== scoreB) return scoreB - scoreA;
    const timeA = new Date(a["Timestamp"] || 0).getTime();
    const timeB = new Date(b["Timestamp"] || 0).getTime();
    return timeB - timeA;
  });

  return matches[0];
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

    if (runtimeType === "Always Online" || runtimeType === "Always On") {
      expStartup = "00:00";
      expShutdown = "23:59";
      is24h = true;
    } else if (runtimeType === "Always Offline" || runtimeType === "Always Off") {
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
