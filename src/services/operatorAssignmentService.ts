import { Equipment, EquipmentAssignment } from '../types';

/**
 * Normalizes date inputs into a numeric YYYYMMDD key for fast ordinal comparisons.
 */
export function parseDateToKey(dateInput: any): number | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    const y = dateInput.getFullYear();
    const m = dateInput.getMonth() + 1;
    const d = dateInput.getDate();
    return y * 10000 + m * 100 + d;
  }
  const str = String(dateInput).trim();
  const mYMD = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (mYMD) {
    return Number(mYMD[1]) * 10000 + Number(mYMD[2]) * 100 + Number(mYMD[3]);
  }
  const dObj = new Date(str);
  if (!isNaN(dObj.getTime())) {
    const y = dObj.getFullYear();
    const m = dObj.getMonth() + 1;
    const d = dObj.getDate();
    return y * 10000 + m * 100 + d;
  }
  return null;
}

/**
 * Checks if an assignment schedule is active on a given target date string.
 * Supports: Permanent, One-Time, Ranged, Seasonal, Seasonal Ranged.
 */
export function isAssignmentActiveOnDate(assignment: EquipmentAssignment, targetDateStr: string): boolean {
  if (!assignment) return false;
  const rRule = String(assignment["Recurrence Rule"] || "Permanent").trim();
  const startDateStr = assignment["Start Date"] || assignment["Date"];
  const endDateStr = assignment["End Date"];

  const targetKey = parseDateToKey(targetDateStr);
  if (!targetKey) return false;

  const startKey = parseDateToKey(startDateStr);
  const endKey = parseDateToKey(endDateStr);

  // 1. Permanent / Default
  if (rRule === "Permanent" || rRule === "Permanent (Default)" || rRule === "" || !startDateStr) {
    if (startKey !== null && targetKey < startKey) return false;
    if (endKey !== null && targetKey > endKey) return false;
    return true;
  }

  // 2. One-Time
  if (rRule === "One-Time") {
    if (startKey !== null) return targetKey === startKey;
    return true;
  }

  // 3. Ranged
  if (rRule === "Ranged") {
    if (startKey !== null && targetKey < startKey) return false;
    if (endKey !== null && targetKey > endKey) return false;
    return true;
  }

  // 4. Seasonal (Yearly)
  if (rRule === "Seasonal" || rRule === "Seasonal (Yearly)") {
    if (startKey !== null) {
      const targetMonthDay = targetKey % 10000;
      const startMonthDay = startKey % 10000;
      return targetMonthDay === startMonthDay;
    }
    return true;
  }

  // 5. Seasonal Ranged
  if (rRule === "Seasonal Ranged") {
    if (startKey !== null && endKey !== null) {
      const tMD = targetKey % 10000;
      const sMD = startKey % 10000;
      const eMD = endKey % 10000;
      if (sMD <= eMD) {
        return tMD >= sMD && tMD <= eMD;
      } else {
        return tMD >= sMD || tMD <= eMD;
      }
    }
    return true;
  }

  if (startKey !== null && targetKey < startKey) return false;
  if (endKey !== null && targetKey > endKey) return false;
  return true;
}

export interface OperatorStatus {
  role: string;
  badgeText: string;
  isPrimary: boolean;
  isActingPoP: boolean;
}

/**
 * Checks if a specific piece of equipment is visible to the logged-in user.
 * Management roles bypass filtering and see all equipment.
 * Technicians / operators only see equipment explicitly assigned to them on targetDateStr.
 */
export function isEquipmentVisibleToUser(
  eq: Equipment,
  userEmail?: string,
  userRoles?: string[],
  assignments: EquipmentAssignment[] = [],
  targetDateStr: string | null = null,
  userEmpNum?: string
): boolean {
  const adminRoles = ['Admin', 'Manager', 'Lead', 'Superuser', 'Facilities Lead'];
  const hasAdminRole = (userRoles || []).some(role => adminRoles.includes(role));
  if (hasAdminRole) return true;

  if (!assignments || !Array.isArray(assignments) || assignments.length === 0 || !eq) {
    return false;
  }

  const dateStr = targetDateStr || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const cleanUserEmail = String(userEmail || '').trim().toLowerCase();
  const cleanEmpNum = String(userEmpNum || '').trim().toLowerCase();

  const eqSystem = String(eq["System"] || '').trim().toLowerCase();
  const eqComponent = String(eq["Component"] || '').trim().toLowerCase();
  const eqTag = String(eq["Tagging Number"] || eq["Equipment ID"] || '').trim().toLowerCase();

  for (let i = 0; i < assignments.length; i++) {
    const a = assignments[i];
    const assgnEmail = String(a["Assigned Staff Email"] || a["Assigned Staff"] || '').trim().toLowerCase();
    const assgnEmpNum = String(a["Employee Number"] || '').trim().toLowerCase();

    // Match operator identity
    const isUserMatch =
      (cleanUserEmail && assgnEmail === cleanUserEmail) ||
      (cleanEmpNum && assgnEmpNum && assgnEmpNum === cleanEmpNum);
    if (!isUserMatch) continue;

    // Check recurrence and active date validity
    if (!isAssignmentActiveOnDate(a, dateStr)) continue;

    // Check target scope match: System, Component, or Tagging Number
    const scope = String(a["Target Scope"] || a["Scope"] || '').trim();
    const target = String(a["Target Value"] || a["Tagging Number"] || '').trim().toLowerCase();

    if (scope === 'System' && eqSystem === target) return true;
    if (scope === 'Component' && eqComponent === target) return true;
    if ((scope === 'Tagging Number' || !scope) && eqTag === target) return true;
  }

  return false;
}

/**
 * Resolves the equipment operator status (Primary vs Reliever vs Acting Point-of-Person)
 * based on hierarchy: Tagging Number (Weight 3) > Component (Weight 2) > System (Weight 1).
 */
export function resolveEquipmentOperatorStatus(
  eq: Equipment,
  userEmail?: string,
  assignments: EquipmentAssignment[] = [],
  todayStr: string | null = null,
  userEmpNum?: string
): OperatorStatus {
  const dateStr = todayStr || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

  if (!assignments || !Array.isArray(assignments) || assignments.length === 0 || !eq) {
    return { role: 'Unassigned', badgeText: 'Unassigned', isPrimary: false, isActingPoP: false };
  }

  const activeAssgns: {
    assignment: EquipmentAssignment;
    scopeWeight: number;
    isExplicitPrimary: boolean;
    email: string;
    employeeNumber: string;
    timestamp: string;
  }[] = [];

  const eqSystem = String(eq["System"] || '').trim().toLowerCase();
  const eqComponent = String(eq["Component"] || '').trim().toLowerCase();
  const eqTag = String(eq["Tagging Number"] || eq["Equipment ID"] || '').trim().toLowerCase();

  for (let i = 0; i < assignments.length; i++) {
    const a = assignments[i];
    if (!isAssignmentActiveOnDate(a, dateStr)) continue;

    const scope = String(a["Target Scope"] || a["Scope"] || '').trim();
    const target = String(a["Target Value"] || a["Tagging Number"] || '').trim().toLowerCase();

    let isMatch = false;
    if ((scope === 'Tagging Number' || !scope) && eqTag === target) isMatch = true;
    else if (scope === 'Component' && eqComponent === target) isMatch = true;
    else if (scope === 'System' && eqSystem === target) isMatch = true;

    if (isMatch) {
      activeAssgns.push({
        assignment: a,
        scopeWeight: (scope === 'Tagging Number' || !scope) ? 3 : scope === 'Component' ? 2 : 1,
        isExplicitPrimary: String(a["Operator Type"] || '').trim() === 'Primary',
        email: String(a["Assigned Staff Email"] || a["Assigned Staff"] || '').trim().toLowerCase(),
        employeeNumber: String(a["Employee Number"] || '').trim().toLowerCase(),
        timestamp: String(a["Timestamp"] || '')
      });
    }
  }

  if (activeAssgns.length === 0) {
    return { role: 'Unassigned', badgeText: 'Unassigned', isPrimary: false, isActingPoP: false };
  }

  const cleanUserEmail = String(userEmail || '').trim().toLowerCase();
  const cleanEmpNum = String(userEmpNum || '').trim().toLowerCase();

  // 1. Explicit Primary Operator resolution
  const explicitPrimaries = activeAssgns.filter(item => item.isExplicitPrimary);
  if (explicitPrimaries.length > 0) {
    explicitPrimaries.sort((a, b) => b.scopeWeight - a.scopeWeight || b.timestamp.localeCompare(a.timestamp));
    const winnerPrimary = explicitPrimaries[0];

    const isWinnerUser =
      (cleanUserEmail && winnerPrimary.email === cleanUserEmail) ||
      (cleanEmpNum && winnerPrimary.employeeNumber && winnerPrimary.employeeNumber === cleanEmpNum);
    if (isWinnerUser) {
      return { role: 'Primary Operator', badgeText: 'Primary Operator', isPrimary: true, isActingPoP: false };
    } else {
      return { role: 'Reliever Operator', badgeText: 'Reliever Operator', isPrimary: false, isActingPoP: false };
    }
  }

  // 2. Fallback Point-of-Person resolution among Relievers
  activeAssgns.sort((a, b) => b.scopeWeight - a.scopeWeight || b.timestamp.localeCompare(a.timestamp));
  const actingPoPWinner = activeAssgns[0];

  const isPoPUser =
    (cleanUserEmail && actingPoPWinner.email === cleanUserEmail) ||
    (cleanEmpNum && actingPoPWinner.employeeNumber && actingPoPWinner.employeeNumber === cleanEmpNum);

  if (isPoPUser) {
    return { role: 'Reliever Operator', badgeText: 'Reliever (Point-of-Person)', isPrimary: false, isActingPoP: true };
  } else {
    return { role: 'Reliever Operator', badgeText: 'Reliever Operator', isPrimary: false, isActingPoP: false };
  }
}
