"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    format,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameDay,
    addWeeks,
    subWeeks,
    addDays,
    subDays,
} from "date-fns";
import { sl } from "date-fns/locale";
import { motion, useDragControls, useMotionValue } from "framer-motion";
import {
    ADMIN_OPEN,
    ADMIN_CLOSE,
    ADMIN_OPEN_MIN,
    ADMIN_CLOSE_MIN,
    minutesToTime,
    snapAdminStart,
    timeToMinutes,
    toDateStr,
} from "@/lib/schedule";

export type Booking = {
    id: number;
    customerName: string;
    serviceName: string;
    date: string;
    time: string;
    status: "pending" | "confirmed" | "cancelled";
    serviceDuration?: number;
};

export type BlockedTime = {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    reason?: string;
};

export type DropTarget = { date: string; time: string };

type WeeklyTimetableProps = {
    bookings: Booking[];
    blockedTimes: BlockedTime[];
    currentDate: Date;
    onDateChange: (date: Date) => void;
    onDeleteBlock: (id: number) => Promise<void>;
    onBookingClick?: (bookingId: number) => void;
    // Admin tapped empty space → open the action sheet (book / block) at this time.
    onEmptySlotClick?: (dateStr: string, time: string) => void;
    // A booking was dragged to a new day/time → ask for confirmation.
    onBookingMove?: (bookingId: number, date: string, time: string) => void;
};

/**
 * The grid spans the full admin window (06:00–22:00), not the public booking
 * hours: manual entries are allowed anywhere in that range, so the calendar has
 * to be able to show them. Rows are drawn — and labelled — every half hour,
 * which is the granularity the salon actually schedules at.
 */
const DAY_START_HOUR = ADMIN_OPEN_MIN / 60;
const DAY_END_HOUR = ADMIN_CLOSE_MIN / 60;
const SLOT_COUNT = (DAY_END_HOUR - DAY_START_HOUR) * 2;
const SLOT_HEIGHT = 44;                            // px per 30-min slot
const HOUR_HEIGHT = SLOT_HEIGHT * 2;
const TOP_PADDING = 12;                            // px above the first row
const GRID_HEIGHT = SLOT_COUNT * SLOT_HEIGHT + TOP_PADDING;

/** Pixels per 15 minutes — the granularity a drag snaps to. */
const SNAP_MINUTES = 15;
const SNAP_PX = (SLOT_HEIGHT / 30) * SNAP_MINUTES;

/** How long a finger must rest on a booking before it is picked up. */
const LONG_PRESS_MS = 300;
/** Moving further than this before the long press fires cancels it (it was a scroll). */
const LONG_PRESS_TOLERANCE_PX = 10;

/** Auto-scroll band at the top/bottom of the timetable while dragging. */
const EDGE_ZONE_PX = 76;
const MAX_SCROLL_STEP_PX = 15;

const SLOTS = Array.from({ length: SLOT_COUNT }, (_, i) => DAY_START_HOUR + i * 0.5);

function formatTime(hour: number) {
    const h = Math.floor(hour);
    const m = Math.round((hour % 1) * 60);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function timeToFloat(time: string) {
    const [h, m] = time.split(":").map(Number);
    return h + m / 60;
}

function topFor(hour: number) {
    return TOP_PADDING + (hour - DAY_START_HOUR) * HOUR_HEIGHT;
}

function heightFor(durationMinutes: number) {
    return Math.max((durationMinutes / 60) * HOUR_HEIGHT - 2, 10);
}

/* ── Booking card ────────────────────────────────────────────────────────── */

/**
 * Drag-to-reschedule, on mouse and on touch.
 *
 * Touch needs care, because the timetable is a 16-hour scrolling surface and
 * the same vertical swipe means both "scroll" and "move this booking". The
 * gesture is therefore split by intent: a swipe scrolls as usual, a tap opens
 * the booking, and only a deliberate ~300 ms press picks it up. Once a card is
 * held, scrolling is suppressed (the timetable's non-passive touchmove handler
 * calls preventDefault) and the edges of the viewport take over that job —
 * holding the card near the top or bottom scrolls the day past it.
 *
 * Auto-scroll needs one trick. Framer recomputes the dragged element's offset
 * from the pointer on every move, so writing scroll compensation into its
 * motion values would be overwritten on the next frame. The compensation lives
 * on a wrapper element instead, written straight to the DOM (and deliberately
 * absent from the JSX style prop, so React never clobbers it).
 */
function BookingCard({
    booking,
    draggable,
    scrollRef,
    resolveTarget,
    onPreview,
    onCommit,
    onDragActiveChange,
    onOpen,
}: {
    booking: Booking;
    draggable: boolean;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    resolveTarget: (booking: Booking, dx: number, dy: number) => DropTarget;
    onPreview: (target: DropTarget | null) => void;
    onCommit: (booking: Booking, target: DropTarget) => void;
    onDragActiveChange: (active: boolean, didDrag: boolean) => void;
    onOpen: () => void;
}) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const controls = useDragControls();
    const wrapperRef = useRef<HTMLDivElement>(null);

    // `armed` gates framer's `drag` prop. It is turned off again after every
    // drag so that, on touch, the card stops swallowing swipes the moment the
    // finger lifts.
    const [armed, setArmed] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    // Same fact as `isDragging`, readable synchronously. A drag fast enough to
    // start and finish inside one batch would otherwise let the pointerup
    // handler see a stale `false`, disarm mid-gesture and strand the card.
    const draggingNow = useRef(false);

    const pendingEvent = useRef<PointerEvent | null>(null);
    const longPress = useRef<number | null>(null);
    const pressOrigin = useRef<{ x: number; y: number } | null>(null);
    // When the last drag finished. The click the browser emits after a drag
    // must not also open the detail modal, and a timestamp is the only ordering
    // that holds — framer reports onDragEnd from a render callback, so a timer
    // armed there can lose the race against the click event itself.
    const lastDragEnd = useRef(0);
    // Scroll compensation applied to the wrapper, in px.
    const compensation = useRef(0);
    const pointerClientY = useRef(0);
    const rafId = useRef<number | null>(null);
    const rafLoop = useRef<() => void>(() => {});
    const lastTarget = useRef<DropTarget | null>(null);

    // Read through refs so the rAF loop, which outlives any single render,
    // never calls into a stale closure.
    const resolveRef = useRef(resolveTarget);
    const previewRef = useRef(onPreview);
    useEffect(() => { resolveRef.current = resolveTarget; }, [resolveTarget]);
    useEffect(() => { previewRef.current = onPreview; }, [onPreview]);

    const duration = booking.serviceDuration || 30;
    const top = topFor(timeToFloat(booking.time));
    const displayHeight = heightFor(duration);

    const applyCompensation = useCallback(() => {
        const el = wrapperRef.current;
        if (el) el.style.transform = `translateY(${compensation.current}px)`;
    }, []);

    /** Recompute the landing slot from the card's total displacement. */
    const publishTarget = useCallback(() => {
        const target = resolveRef.current(booking, x.get(), y.get() + compensation.current);
        const prev = lastTarget.current;
        if (!prev || prev.date !== target.date || prev.time !== target.time) {
            lastTarget.current = target;
            previewRef.current(target);
        }
    }, [booking, x, y]);

    const stopAutoScroll = useCallback(() => {
        if (rafId.current !== null) {
            cancelAnimationFrame(rafId.current);
            rafId.current = null;
        }
    }, []);

    /**
     * While the pointer sits in the top or bottom band of the timetable, keep
     * scrolling the day past the held card. Runs on its own rAF loop so it
     * continues even when the finger is perfectly still.
     */
    const tickAutoScroll = useCallback(() => {
        rafId.current = null;
        const el = scrollRef.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const cy = pointerClientY.current;
        let step = 0;
        if (cy < rect.top + EDGE_ZONE_PX) {
            step = -MAX_SCROLL_STEP_PX * Math.min(1, (rect.top + EDGE_ZONE_PX - cy) / EDGE_ZONE_PX);
        } else if (cy > rect.bottom - EDGE_ZONE_PX) {
            step = MAX_SCROLL_STEP_PX * Math.min(1, (cy - (rect.bottom - EDGE_ZONE_PX)) / EDGE_ZONE_PX);
        }

        if (step !== 0) {
            const before = el.scrollTop;
            el.scrollTop = before + step;
            const actual = el.scrollTop - before;   // clamped at the ends
            if (actual !== 0) {
                compensation.current += actual;
                applyCompensation();
                publishTarget();
            }
        }

        rafId.current = requestAnimationFrame(() => rafLoop.current());
    }, [scrollRef, applyCompensation, publishTarget]);

    // The loop reschedules itself through this ref rather than by name, so the
    // callback never has to reference itself before it is declared.
    useEffect(() => { rafLoop.current = tickAutoScroll; }, [tickAutoScroll]);

    // Framer only subscribes the drag controls once `drag` is truthy, so the
    // pointerdown that should start the gesture is parked here and handed over
    // on the render after `armed` flips.
    useEffect(() => {
        if (!armed || !pendingEvent.current) return;
        const event = pendingEvent.current;
        pendingEvent.current = null;
        try {
            controls.start(event);
        } catch {
            // Gesture couldn't be picked up — the card stays clickable.
        }
    }, [armed, controls]);

    const clearLongPress = useCallback(() => {
        if (longPress.current !== null) {
            clearTimeout(longPress.current);
            longPress.current = null;
        }
    }, []);

    useEffect(() => () => { clearLongPress(); stopAutoScroll(); }, [clearLongPress, stopAutoScroll]);

    const beginDrag = useCallback(
        (event: PointerEvent) => {
            pendingEvent.current = event;
            // Suppress touch scrolling from the moment the card is picked up,
            // not from the moment framer clears its 3px threshold — otherwise a
            // swipe started right after the long press escapes as a scroll.
            onDragActiveChange(true, false);
            setArmed(true);
        },
        [onDragActiveChange]
    );

    return (
        <div
            ref={wrapperRef}
            className={`absolute left-0 right-0 ${isDragging ? "z-50" : "z-10 hover:z-20"}`}
            style={{ top: `${top + 1}px`, height: `${displayHeight}px` }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                style={{ x, y, WebkitTouchCallout: "none" }}
                drag={armed}
                dragListener={false}
                dragControls={controls}
                dragMomentum={false}
                dragElastic={0}
                onDragStart={() => {
                    draggingNow.current = true;
                    setIsDragging(true);
                    compensation.current = 0;
                    lastTarget.current = null;
                    publishTarget();
                    stopAutoScroll();
                    rafId.current = requestAnimationFrame(tickAutoScroll);
                }}
                onDrag={(event) => {
                    const pe = event as PointerEvent;
                    if (typeof pe.clientY === "number") pointerClientY.current = pe.clientY;
                    publishTarget();
                }}
                onDragEnd={() => {
                    draggingNow.current = false;
                    lastDragEnd.current = Date.now();
                    stopAutoScroll();
                    const target = lastTarget.current;
                    lastTarget.current = null;

                    // Snap home instantly rather than animating: the wrapper's
                    // compensation and the motion values have to be cleared in
                    // the same frame as `armed`, or disabling drag would cancel
                    // a half-finished animation and strand the card.
                    compensation.current = 0;
                    applyCompensation();
                    x.set(0);
                    y.set(0);

                    setIsDragging(false);
                    setArmed(false);
                    onDragActiveChange(false, true);
                    onPreview(null);

                    if (target && (target.date !== booking.date || target.time !== booking.time)) {
                        onCommit(booking, target);
                    }
                }}
                onPointerDown={(e) => {
                    if (!draggable || e.button !== 0) return;
                    pointerClientY.current = e.clientY;
                    if (e.pointerType === "mouse") {
                        beginDrag(e.nativeEvent);
                        return;
                    }
                    // Touch / pen: hold to pick up, so a swipe still scrolls
                    // the timetable and a tap still opens the booking.
                    pressOrigin.current = { x: e.clientX, y: e.clientY };
                    const native = e.nativeEvent;
                    clearLongPress();
                    longPress.current = window.setTimeout(() => {
                        longPress.current = null;
                        if (typeof navigator.vibrate === "function") navigator.vibrate(12);
                        beginDrag(native);
                    }, LONG_PRESS_MS);
                }}
                onPointerMove={(e) => {
                    pointerClientY.current = e.clientY;
                    if (longPress.current === null || !pressOrigin.current) return;
                    const dx = Math.abs(e.clientX - pressOrigin.current.x);
                    const dy = Math.abs(e.clientY - pressOrigin.current.y);
                    if (dx > LONG_PRESS_TOLERANCE_PX || dy > LONG_PRESS_TOLERANCE_PX) clearLongPress();
                }}
                onPointerUp={() => {
                    clearLongPress();
                    if (draggingNow.current) return;   // onDragEnd cleans up
                    setArmed(false);
                    onDragActiveChange(false, false);
                }}
                onPointerCancel={() => {
                    clearLongPress();
                    if (draggingNow.current) return;
                    setArmed(false);
                    onDragActiveChange(false, false);
                }}
                onContextMenu={(e) => { if (draggable) e.preventDefault(); }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (draggingNow.current || Date.now() - lastDragEnd.current < 350) return;
                    onOpen();
                }}
                className={`absolute inset-x-[3px] inset-y-0 rounded-lg border shadow-sm select-none transition-shadow ${
                    booking.status === "confirmed"
                        ? "bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200"
                        : "bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200"
                } ${draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${
                    isDragging ? "shadow-2xl ring-2 ring-yellow-400 opacity-95" : "hover:shadow-lg"
                }`}
                title={
                    draggable
                        ? `${booking.customerName} — ${booking.serviceName} (${duration}min, ${booking.time}) · povlecite za prestavitev`
                        : `${booking.customerName} — ${booking.serviceName} (${duration}min, ${booking.time})`
                }
            >
                <CardContent booking={booking} duration={duration} height={displayHeight} />
            </motion.div>
        </div>
    );
}

function CardContent({ booking, duration, height }: { booking: Booking; duration: number; height: number }) {
    const isTiny = height < 22;
    const isShort = height < 44;
    const textPrimary = booking.status === "confirmed" ? "text-pink-900" : "text-amber-900";
    const textSecondary = booking.status === "confirmed" ? "text-pink-500" : "text-amber-500";
    const textTertiary = booking.status === "confirmed" ? "text-pink-400" : "text-amber-400";

    return (
        <div className={`h-full px-2 flex overflow-hidden ${isTiny ? "flex-row items-center" : isShort ? "flex-row items-center gap-2" : "flex-col justify-between py-1.5"}`}>
            {isTiny ? (
                <span className={`font-bold ${textPrimary} text-[10px] truncate leading-none`}>{booking.customerName}</span>
            ) : isShort ? (
                <>
                    <span className={`font-bold ${textPrimary} text-[11px] truncate flex-1`}>{booking.customerName}</span>
                    <span className={`${textSecondary} text-[10px] flex-shrink-0`}>{booking.time}</span>
                </>
            ) : (
                <>
                    <div className="min-w-0">
                        <div className={`font-bold ${textPrimary} text-[11px] leading-tight truncate`}>{booking.customerName}</div>
                        <div className={`${textSecondary} text-[10px] leading-tight truncate mt-0.5`}>{booking.serviceName}</div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className={`${textTertiary} text-[10px]`}>{booking.time}</span>
                        <span className={`${textTertiary} text-[10px]`}>{duration}m</span>
                    </div>
                </>
            )}
        </div>
    );
}

/* ── Timetable ───────────────────────────────────────────────────────────── */

export default function WeeklyTimetable({
    bookings,
    blockedTimes,
    currentDate,
    onDateChange,
    onDeleteBlock,
    onBookingClick,
    onEmptySlotClick,
    onBookingMove,
}: WeeklyTimetableProps) {
    // Mobile shows a single day; desktop shows the whole week. The timetable only
    // renders client-side (behind the dashboard's loading gate), so reading
    // matchMedia in the initializer is safe and avoids a mobile→week flash.
    const [isDesktop, setIsDesktop] = useState(() =>
        typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : false
    );
    useEffect(() => {
        const mq = window.matchMedia("(min-width: 768px)");
        const update = () => setIsDesktop(mq.matches);
        update();
        mq.addEventListener("change", update);
        return () => mq.removeEventListener("change", update);
    }, []);

    const scrollRef = useRef<HTMLDivElement>(null);
    const columnsRef = useRef<HTMLDivElement>(null);

    // Where the held booking would land. Drives the landing indicator.
    const [dropPreview, setDropPreview] = useState<(DropTarget & { duration: number }) | null>(null);
    const draggingRef = useRef(false);
    // A touch drag ends over an empty-slot target; ignore the click it emits.
    const suppressSlotClick = useRef(0);

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const days = isDesktop ? weekDays : [currentDate];

    const goPrev = () => onDateChange(isDesktop ? subWeeks(currentDate, 1) : subDays(currentDate, 1));
    const goNext = () => onDateChange(isDesktop ? addWeeks(currentDate, 1) : addDays(currentDate, 1));

    // The day now starts at 06:00, and the hours before ~07:00 are almost always
    // empty. Open on the first row that matters rather than on dead space.
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTop = Math.max(0, topFor(7) - SLOT_HEIGHT);
    }, []);

    /**
     * Touch scrolling and dragging are the same gesture, so while a card is
     * held the timetable refuses to scroll itself — the drag's edge auto-scroll
     * does that job instead. The listener must be non-passive for
     * preventDefault to have any effect.
     */
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const block = (e: TouchEvent) => { if (draggingRef.current) e.preventDefault(); };
        el.addEventListener("touchmove", block, { passive: false });
        return () => el.removeEventListener("touchmove", block);
    }, []);

    // Current-time indicator position
    const now = new Date();
    const nowFloat = now.getHours() + now.getMinutes() / 60;
    const showNowLine = nowFloat >= DAY_START_HOUR && nowFloat <= DAY_END_HOUR;
    const nowTop = topFor(nowFloat);

    const gridCols = { gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` };

    /**
     * Translate a drag displacement into a day and time, snapped to 15-minute
     * steps and clamped to the admin window.
     */
    const resolveTarget = useCallback(
        (booking: Booking, dx: number, dy: number): DropTarget => {
            const gridWidth = columnsRef.current?.clientWidth ?? 0;
            const colWidth = days.length > 0 ? gridWidth / days.length : 0;
            const dayDelta = days.length > 1 && colWidth > 0 ? Math.round(dx / colWidth) : 0;
            const minuteDelta = Math.round(dy / SNAP_PX) * SNAP_MINUTES;

            const fromIdx = days.findIndex((d) => isSameDay(new Date(`${booking.date}T00:00:00`), d));
            const baseIdx = fromIdx === -1 ? 0 : fromIdx;
            const targetIdx = Math.min(Math.max(baseIdx + dayDelta, 0), days.length - 1);
            const date = toDateStr(days[targetIdx]);

            const duration = booking.serviceDuration || 30;
            return { date, time: snapAdminStart(booking.time, minuteDelta, duration) };
        },
        [days]
    );

    const handleDragActive = useCallback((active: boolean, didDrag: boolean) => {
        draggingRef.current = active;
        // Only a real drag ends over some other slot; a plain click doesn't and
        // must not have its click swallowed.
        if (!active && didDrag) suppressSlotClick.current = Date.now() + 300;
    }, []);

    return (
        <div
            className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden"
            style={{ height: "min(920px, 90vh)" }}
        >
            {/* ── Mobile: single-day nav header ── */}
            {!isDesktop && (
                <div className="flex items-center justify-between px-2 py-2.5 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                    <button onClick={goPrev} aria-label="Prejšnji dan" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="text-center leading-tight">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest capitalize">
                            {format(currentDate, "EEEE", { locale: sl })}
                        </div>
                        <div className={`text-base font-bold capitalize ${isSameDay(currentDate, now) ? "text-yellow-600" : "text-gray-900"}`}>
                            {format(currentDate, "d. MMMM yyyy", { locale: sl })}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => onDateChange(new Date())} className="text-[10px] font-bold text-gray-400 hover:text-yellow-600 uppercase tracking-wider px-1.5">Danes</button>
                        <button onClick={goNext} aria-label="Naslednji dan" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>
            )}

            {/* ── Scroll area: header + grid ── */}
            <div ref={scrollRef} className="overflow-auto flex-1 min-h-0 rounded-b-2xl">
                <div style={{ minWidth: isDesktop ? 800 : undefined }}>
                    {/* ── Desktop: week nav + day headers (sticky) ── */}
                    {isDesktop && (
                        <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-40">
                            <div className="w-[60px] flex-shrink-0 flex flex-col items-center justify-center gap-0.5 border-r border-gray-200 bg-white sticky left-0 z-10">
                                <button onClick={goPrev} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Prejšnji teden">
                                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <button onClick={() => onDateChange(new Date())} className="text-[9px] font-bold text-gray-400 hover:text-yellow-600 transition-colors uppercase tracking-wider">Danes</button>
                                <button onClick={goNext} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Naslednji teden">
                                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                            <div className="flex-1 grid" style={gridCols}>
                                {days.map((day, idx) => {
                                    const isToday = isSameDay(day, now);
                                    const isDropDay = dropPreview?.date === toDateStr(day);
                                    return (
                                        <div key={day.toISOString()} className={`text-center py-3 transition-colors ${isDropDay ? "bg-yellow-100" : isToday ? "bg-yellow-50/80" : ""} ${idx < days.length - 1 ? "border-r border-gray-200" : ""}`}>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{format(day, "EEE")}</div>
                                            <div className={`text-lg font-bold mt-0.5 ${isToday ? "bg-yellow-500 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto leading-none" : "text-gray-900"}`}>
                                                {format(day, "d")}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Body grid ── */}
                    <div className="flex" style={{ minHeight: `${GRID_HEIGHT}px` }}>
                        {/* Time axis — every half hour, full hours emphasised */}
                        <div className="w-[60px] flex-shrink-0 bg-white border-r border-gray-200 sticky left-0 z-20 relative" style={{ height: `${GRID_HEIGHT}px` }}>
                            {SLOTS.map((hour) => {
                                const isFullHour = Number.isInteger(hour);
                                return (
                                    <div
                                        key={hour}
                                        className={`absolute right-0 pr-2 leading-none ${
                                            isFullHour
                                                ? "text-[11px] font-semibold text-gray-500"
                                                : "text-[10px] font-medium text-gray-300"
                                        }`}
                                        style={{ top: `${topFor(hour) - 5}px` }}
                                    >
                                        {formatTime(hour)}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Day Columns */}
                        <div ref={columnsRef} className="flex-1 grid relative" style={gridCols}>
                            {days.map((day, colIdx) => {
                                const isToday = isSameDay(day, now);
                                const dayStr = toDateStr(day);
                                const dayBookings = bookings.filter((b) => isSameDay(new Date(b.date), day) && b.status !== "cancelled");
                                const dayBlocks = blockedTimes.filter((b) => isSameDay(new Date(b.date), day));
                                const preview = dropPreview?.date === dayStr ? dropPreview : null;

                                return (
                                    <div key={day.toISOString()} className={`relative transition-colors ${colIdx < days.length - 1 ? "border-r border-gray-200" : ""} ${preview ? "bg-yellow-50/70" : isToday ? "bg-yellow-50/30" : ""}`} style={{ height: `${GRID_HEIGHT}px` }}>
                                        {/* Empty-space click targets (30-min granularity) */}
                                        {SLOTS.map((hour) => (
                                            <div
                                                key={hour}
                                                className={`absolute left-0 right-0 border-b cursor-pointer transition-colors hover:bg-yellow-50 ${Number.isInteger(hour) ? "border-gray-200" : "border-gray-100 border-dashed"}`}
                                                style={{ top: `${topFor(hour)}px`, height: `${SLOT_HEIGHT}px` }}
                                                onClick={() => {
                                                    if (draggingRef.current || Date.now() < suppressSlotClick.current) return;
                                                    onEmptySlotClick?.(dayStr, formatTime(hour));
                                                }}
                                            />
                                        ))}

                                        {/* Current time indicator */}
                                        {isToday && showNowLine && (
                                            <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: `${nowTop}px` }}>
                                                <div className="flex items-center">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-[5px] shadow-sm" />
                                                    <div className="flex-1 h-[2px] bg-red-500 opacity-70" />
                                                </div>
                                            </div>
                                        )}

                                        {/* Landing indicator — exactly the rect the booking will occupy */}
                                        {preview && <DropIndicator time={preview.time} duration={preview.duration} />}

                                        {/* Bookings */}
                                        {dayBookings.map((booking) => (
                                            <BookingCard
                                                key={booking.id}
                                                booking={booking}
                                                draggable={!!onBookingMove}
                                                scrollRef={scrollRef}
                                                resolveTarget={resolveTarget}
                                                onPreview={(target) =>
                                                    setDropPreview(
                                                        target ? { ...target, duration: booking.serviceDuration || 30 } : null
                                                    )
                                                }
                                                onCommit={(b, target) => onBookingMove?.(b.id, target.date, target.time)}
                                                onDragActiveChange={handleDragActive}
                                                onOpen={() => onBookingClick?.(booking.id)}
                                            />
                                        ))}

                                        {/* Blocked Times — tap to remove */}
                                        {dayBlocks.map((block) => {
                                            const start = timeToFloat(block.startTime);
                                            const end = timeToFloat(block.endTime);
                                            const top = topFor(start);
                                            const height = (end - start) * HOUR_HEIGHT;

                                            return (
                                                <button
                                                    key={`block-${block.id}`}
                                                    onClick={(e) => { e.stopPropagation(); onDeleteBlock(block.id); }}
                                                    className="absolute left-[3px] right-[3px] rounded-lg bg-gray-100/80 border border-gray-300/60 flex items-center justify-center gap-1 group z-[5] hover:bg-red-50 hover:border-red-200 transition-colors"
                                                    style={{
                                                        top: `${top + 1}px`,
                                                        height: `${Math.max(height - 2, 20)}px`,
                                                        backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,0.04) 4px, rgba(0,0,0,0.04) 8px)",
                                                    }}
                                                    title={block.reason || "Blokirano"}
                                                >
                                                    <span className="text-[10px] text-gray-400 font-medium group-hover:text-red-500">Blokirano</span>
                                                    <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Footer hint ── */}
            <div className="flex-shrink-0 border-t border-gray-100 px-3 py-2 bg-gray-50/80 text-[11px] text-gray-400 flex items-center justify-between gap-2">
                <span className="whitespace-nowrap">{ADMIN_OPEN}–{ADMIN_CLOSE}</span>
                <span className="hidden md:inline">Povlecite rezervacijo za prestavitev</span>
                <span className="md:hidden text-right">Pridržite za prestavitev</span>
            </div>
        </div>
    );
}

/**
 * The slot a held booking will drop into. Drawn as the exact rectangle the
 * booking will occupy, with its start and end time, so the landing is confirmed
 * visually before the modal asks for it in words.
 */
function DropIndicator({ time, duration }: { time: string; duration: number }) {
    const top = topFor(timeToFloat(time));
    const height = heightFor(duration);
    const endTime = minutesToTime(Math.min(timeToMinutes(time) + duration, ADMIN_CLOSE_MIN));
    const compact = height < 34;

    return (
        <div
            className="absolute left-0 right-0 z-40 pointer-events-none"
            style={{ top: `${top + 1}px`, height: `${height}px` }}
        >
            <div className="absolute inset-x-[2px] inset-y-0 rounded-lg border-2 border-dashed border-yellow-500 bg-yellow-300/25 shadow-[0_0_0_3px_rgba(250,204,21,0.18)]" />
            <span
                className={`absolute left-1/2 -translate-x-1/2 px-2 py-[3px] rounded-full bg-yellow-500 text-white text-[10px] font-bold tracking-wide whitespace-nowrap shadow-sm ${
                    compact ? "-top-3" : "top-1/2 -translate-y-1/2"
                }`}
            >
                {time}–{endTime}
            </span>
        </div>
    );
}
