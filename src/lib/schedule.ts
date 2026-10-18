/**
 * Shared salon schedule configuration.
 * Used server-side (API routes) and client-side (booking UI, timetable).
 *
 * There are two distinct windows, and conflating them is the easiest way to
 * break this file:
 *
 *   PUBLIC  07:30–19:30, Mon–Sat. What customers may book online. The salon's
 *           advertised working hours are "po dogovoru" (by arrangement), but
 *           self-service booking has to be bounded by *something*, and this is
 *           the window Karin is willing to be booked into without being asked
 *           first. A service must FINISH by 19:30, so a 45-minute treatment is
 *           not offered at 19:00.
 *
 *   ADMIN   06:00–22:00, any day. What the admin may enter by hand from the
 *           dashboard. Deliberately wider than the public window so early or
 *           late arrangements can be recorded, and it is also the range the
 *           admin timetable renders.
 *
 * Sundays and Slovenian public holidays are closed to public booking. The admin
 * window ignores the calendar entirely — a booking agreed by phone for a
 * holiday is still a booking that needs to be written down.
 */

export type DaySchedule = { open: string; close: string } | null;

/** Earliest start a customer may book online. */
export const PUBLIC_OPEN = "07:30";
/** Latest moment a customer's booking may *end*. */
export const PUBLIC_CLOSE = "19:30";

/** Bounds of the admin timetable and of manual (admin) booking entry. */
export const ADMIN_OPEN = "06:00";
export const ADMIN_CLOSE = "22:00";

// Day-of-week indexed (JS convention: 0 = Sunday … 6 = Saturday)
export const SCHEDULE: Record<number, DaySchedule> = {
    0: null,                                            // Sunday — closed
    1: { open: PUBLIC_OPEN, close: PUBLIC_CLOSE },      // Monday
    2: { open: PUBLIC_OPEN, close: PUBLIC_CLOSE },      // Tuesday
    3: { open: PUBLIC_OPEN, close: PUBLIC_CLOSE },      // Wednesday
    4: { open: PUBLIC_OPEN, close: PUBLIC_CLOSE },      // Thursday
    5: { open: PUBLIC_OPEN, close: PUBLIC_CLOSE },      // Friday
    6: { open: PUBLIC_OPEN, close: PUBLIC_CLOSE },      // Saturday
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

/** Local-midnight Date for a "YYYY-MM-DD" string (never UTC-shifted). */
function parseDateStr(dateStr: string): Date {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
}

/** "YYYY-MM-DD" for a Date, in local time. */
export function toDateStr(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/* ── Slovenian public holidays ────────────────────────── */

/**
 * Gregorian computus (Meeus/Jones/Butcher). Returns Easter Sunday for `year`
 * in local time — the anchor for the only two movable holidays that fall on a
 * working day (Easter Monday; Whit Sunday is a Sunday, already closed).
 */
function easterSunday(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);   // 3 = March, 4 = April
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

/**
 * Slovenian work-free days ("dela prosti dnevi") — the fixed-date ones.
 * Holidays that are commemorative but NOT work-free (17 August, 15 September,
 * 23 November …) are deliberately absent: the salon stays open on those.
 */
const FIXED_HOLIDAYS = [
    "01-01", // novo leto
    "01-02", // novo leto
    "02-08", // Prešernov dan
    "04-27", // dan upora proti okupatorju
    "05-01", // praznik dela
    "05-02", // praznik dela
    "06-25", // dan državnosti
    "08-15", // Marijino vnebovzetje
    "10-31", // dan reformacije
    "11-01", // dan spomina na mrtve
    "12-25", // božič
    "12-26", // dan samostojnosti in enotnosti
] as const;

/** Movable work-free days for a year, as "YYYY-MM-DD". */
function movableHolidays(year: number): string[] {
    const easter = easterSunday(year);
    const easterMonday = new Date(easter);
    easterMonday.setDate(easter.getDate() + 1);
    // Whit Sunday (binkošti) is Easter + 49 — always a Sunday, so it adds
    // nothing, but listing it keeps the set complete and self-documenting.
    const whitSunday = new Date(easter);
    whitSunday.setDate(easter.getDate() + 49);
    return [toDateStr(easter), toDateStr(easterMonday), toDateStr(whitSunday)];
}

/** Is this "YYYY-MM-DD" a Slovenian work-free public holiday? */
export function isHoliday(dateStr: string): boolean {
    if (FIXED_HOLIDAYS.includes(dateStr.slice(5) as (typeof FIXED_HOLIDAYS)[number])) return true;
    const year = Number(dateStr.slice(0, 4));
    if (!Number.isFinite(year)) return false;
    return movableHolidays(year).includes(dateStr);
}

/* ── Public (customer-facing) schedule ────────────────── */

/** Get the public booking schedule for a "YYYY-MM-DD" string (null = closed) */
export function getScheduleForDateStr(dateStr: string): DaySchedule {
    if (isHoliday(dateStr)) return null;
    return SCHEDULE[parseDateStr(dateStr).getDay()];
}

/** Get the public booking schedule for a Date object (null = closed) */
export function getScheduleForDate(date: Date): DaySchedule {
    return getScheduleForDateStr(toDateStr(date));
}

/** Generate all 30-minute slot starts for a "YYYY-MM-DD" date */
export function generateSlotsForDateStr(dateStr: string): string[] {
    const schedule = getScheduleForDateStr(dateStr);
    if (!schedule) return [];

    const openMin = timeToMinutes(schedule.open);
    const closeMin = timeToMinutes(schedule.close);

    const slots: string[] = [];
    for (let m = openMin; m < closeMin; m += 30) {
        slots.push(minutesToTime(m));
    }
    return slots;
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

/* ── Admin window ─────────────────────────────────────── */

export const ADMIN_OPEN_MIN = timeToMinutes(ADMIN_OPEN);
export const ADMIN_CLOSE_MIN = timeToMinutes(ADMIN_CLOSE);

/**
 * Slot starts the admin may pick, every `stepMinutes` across the admin window.
 * Unlike the public slots this is day-independent: manual entry is allowed on
 * Sundays and holidays too.
 */
export function generateAdminSlots(stepMinutes = 15): string[] {
    const slots: string[] = [];
    for (let m = ADMIN_OPEN_MIN; m < ADMIN_CLOSE_MIN; m += stepMinutes) {
        slots.push(minutesToTime(m));
    }
    return slots;
}

/** Does `start` + `duration` fit inside the admin window? */
export function fitsAdminWindow(start: string, durationMinutes: number): boolean {
    const startMin = timeToMinutes(start);
    return startMin >= ADMIN_OPEN_MIN && startMin + durationMinutes <= ADMIN_CLOSE_MIN;
}

/**
 * Where a booking dragged by `minuteDelta` should land: clamped so it can
 * neither start before the admin window opens nor overrun its close. Pulled out
 * of the timetable so the rule that decides a drop is the same one the server
 * validates against, and so it can be exercised without a browser.
 */
export function snapAdminStart(
    startTime: string,
    minuteDelta: number,
    durationMinutes: number
): string {
    const latestStart = Math.max(ADMIN_OPEN_MIN, ADMIN_CLOSE_MIN - durationMinutes);
    const startMin = Math.min(
        Math.max(timeToMinutes(startTime) + minuteDelta, ADMIN_OPEN_MIN),
        latestStart
    );
    return minutesToTime(startMin);
}
