/**
 * Returns the current time as "HH:MM" (24-hour) in the given IANA timezone,
 * e.g. "America/New_York". Uses the built-in Intl API, no extra dependency.
 */
export function getCurrentTimeInZone(timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  return formatter.format(new Date());
}

/** Returns the current date as "YYYY-MM-DD" in the given IANA timezone. */
export function getCurrentDateInZone(timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA formats as YYYY-MM-DD already, but build it explicitly to be safe
  // across Node ICU builds.
  const parts = formatter.formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Parses "8:30am", "8:30 AM", "08:30", "20:15" into a "HH:MM:SS" string, or returns null if it can't. */
export function parseTimeInput(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();

  const twelveHour = trimmed.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)$/);
  if (twelveHour) {
    let hour = parseInt(twelveHour[1], 10);
    const minute = twelveHour[2] ? parseInt(twelveHour[2], 10) : 0;
    const meridiem = twelveHour[3];
    if (hour < 1 || hour > 12 || minute > 59) return null;
    if (meridiem === "am") hour = hour === 12 ? 0 : hour;
    if (meridiem === "pm") hour = hour === 12 ? 12 : hour + 12;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
  }

  const twentyFourHour = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHour) {
    const hour = parseInt(twentyFourHour[1], 10);
    const minute = parseInt(twentyFourHour[2], 10);
    if (hour > 23 || minute > 59) return null;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
  }

  return null;
}

/** Basic IANA timezone validity check by trying to format a date with it. */
export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
