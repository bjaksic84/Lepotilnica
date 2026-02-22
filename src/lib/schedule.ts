/**
 * Shared salon schedule configuration.
 * Used server-side (API routes) and client-side (booking UI, timetable).
 *
 * Hours:
 *   Monday–Thursday  09:00–20:00
 *   Friday           09:00–18:00
 *   Saturday         10:00–18:00
 *   Sunday           Closed
 */

export type DaySchedule = { open: string; close: string } | null;

// Day-of-week indexed (JS convention: 0 = Sunday … 6 = Saturday)
export const SCHEDULE: Record<number, DaySchedule> = {
    0: null,                                    // Sunday — closed
    1: { open: "09:00", close: "20:00" },       // Monday
    2: { open: "09:00", close: "20:00" },       // Tuesday
    3: { open: "09:00", close: "20:00" },       // Wednesday
    4: { open: "09:00", close: "20:00" },       // Thursday
    5: { open: "09:00", close: "18:00" },       // Friday
    6: { open: "10:00", close: "18:00" },       // Saturday
};

/* ── Helpers ─────────────────────────────────────────── */

/** Convert "HH:MM" → total minutes */
export function timeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
}

/** Convert total minutes → "HH:MM" */
export function minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** Get schedule for a JS Date object */
export function getScheduleForDate(date: Date): DaySchedule {
    return SCHEDULE[date.getDay()];
}

/** Get schedule for a "YYYY-MM-DD" string */
export function getScheduleForDateStr(dateStr: string): DaySchedule {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return SCHEDULE[date.getDay()];
}

/** Generate all 30-minute slot strings for a given day-of-week (0–6) */
export function generateSlotsForDay(dayOfWeek: number): string[] {
    const schedule = SCHEDULE[dayOfWeek];
    if (!schedule) return [];

    const openMin = timeToMinutes(schedule.open);
    const closeMin = timeToMinutes(schedule.close);

    const slots: string[] = [];
    for (let m = openMin; m < closeMin; m += 30) {
        slots.push(minutesToTime(m));
    }
    return slots;
}

/** Generate all 30-minute slot strings for a "YYYY-MM-DD" date */
export function generateSlotsForDateStr(dateStr: string): string[] {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return generateSlotsForDay(date.getDay());
}

/** Closing time in minutes for a date string (0 if closed) */
export function getClosingMinutes(dateStr: string): number {
    const schedule = getScheduleForDateStr(dateStr);
    if (!schedule) return 0;
    return timeToMinutes(schedule.close);
}

/** Opening time in minutes for a date string (0 if closed) */
export function getOpeningMinutes(dateStr: string): number {
    const schedule = getScheduleForDateStr(dateStr);
    if (!schedule) return 0;
    return timeToMinutes(schedule.open);
}

/** Max time range across all open days (for timetable display) */
export function getMaxRange(): { earliestHour: number; latestHour: number } {
    let earliest = 24;
    let latest = 0;
    for (const schedule of Object.values(SCHEDULE)) {
        if (!schedule) continue;
        const [oH, oM] = schedule.open.split(":").map(Number);
        const [cH, cM] = schedule.close.split(":").map(Number);
        const open = oH + oM / 60;
        const close = cH + cM / 60;
        if (open < earliest) earliest = open;
        if (close > latest) latest = close;
    }
    return { earliestHour: earliest, latestHour: latest };
}
