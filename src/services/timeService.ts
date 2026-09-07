/**
 * Manila Timezone (UTC+8) Date & Time Utilities
 */

export function getManilaDate(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
}

export function getFormattedDate(d: Date = getManilaDate()): string {
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila"
  });
}

export function getFormattedTime(d: Date = getManilaDate()): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila"
  });
}

export function getFormattedDateTime(d: Date = getManilaDate()): string {
  return `${getFormattedDate(d)}, ${getFormattedTime(d)}`;
}

export function get24HourTime(d: Date = getManilaDate()): string {
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Manila"
  });
}

export function getTodayDateString(d: Date = getManilaDate()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseHHmm(timeStr?: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

export function formatMinutesToReadable(minutes: number): string {
  if (isNaN(minutes) || minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function calculateElapsedSince(timeStr?: string): string {
  if (!timeStr) return '0m';
  const now = getManilaDate();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseHHmm(timeStr);
  let diff = currentMinutes - startMinutes;
  if (diff < 0) diff += 24 * 60; // Cross-midnight guard
  return formatMinutesToReadable(diff);
}
