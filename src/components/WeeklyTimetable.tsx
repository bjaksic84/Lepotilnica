"use client";

import { useState } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

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

type WeeklyTimetableProps = {
    bookings: Booking[];
    blockedTimes: BlockedTime[];
    currentDate: Date;
    onDateChange: (date: Date) => void;
    onBlockTime: (date: string, startTime: string, endTime: string) => Promise<void>;
    onDeleteBlock: (id: number) => Promise<void>;
    onBookingClick?: (bookingId: number) => void;
};

// 30-min slots from 09:00 to 20:00 (Mon–Thu close at 20:00)
const SLOT_COUNT = 22; // 9:00,9:30,10:00,...,19:30
const SLOT_HEIGHT = 48; // px per 30-min slot
const HOUR_HEIGHT = SLOT_HEIGHT * 2; // 96px per hour
const TOP_PADDING = 12; // px above the first row so 9AM isn't clipped
const GRID_HEIGHT = SLOT_COUNT * SLOT_HEIGHT + TOP_PADDING; // total grid height

const SLOTS = Array.from({ length: SLOT_COUNT }, (_, i) => 9 + i * 0.5);

function formatTime(hour: number) {
    const h = Math.floor(hour);
    const m = (hour % 1) * 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function timeToFloat(time: string) {
    const [h, m] = time.split(":").map(Number);
    return h + m / 60;
}

export default function WeeklyTimetable({
    bookings,
    blockedTimes,
    currentDate,
    onDateChange,
    onBlockTime,
    onDeleteBlock,
    onBookingClick,
}: WeeklyTimetableProps) {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // Drag selection state
    const [isDragging, setIsDragging] = useState(false);
    const [selectionStart, setSelectionStart] = useState<{ date: Date; time: number } | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<{ date: Date; time: number } | null>(null);

    const handleMouseDown = (date: Date, time: number) => {
        setIsDragging(true);
        setSelectionStart({ date, time });
        setSelectionEnd({ date, time: time + 0.5 });
    };

    const handleMouseEnter = (date: Date, time: number) => {
        if (!isDragging || !selectionStart) return;
        if (!isSameDay(date, selectionStart.date)) return;
        if (time >= selectionStart.time) {
            setSelectionEnd({ date, time: time + 0.5 });
        }
    };

    const handleMouseUp = async () => {
        if (isDragging && selectionStart && selectionEnd) {
            const dateStr = format(selectionStart.date, "yyyy-MM-dd");
            const startVal = Math.min(selectionStart.time, selectionEnd.time - 0.5);
            const endVal = Math.max(selectionStart.time + 0.5, selectionEnd.time);
            await onBlockTime(dateStr, formatTime(startVal), formatTime(endVal));
        }
        setIsDragging(false);
        setSelectionStart(null);
        setSelectionEnd(null);
    };

    // Current-time indicator position
    const now = new Date();
    const nowFloat = now.getHours() + now.getMinutes() / 60;
    const showNowLine = nowFloat >= 9 && nowFloat <= 20;
    const nowTop = TOP_PADDING + (nowFloat - 9) * HOUR_HEIGHT;

    return (
        <div
            className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col select-none overflow-hidden"
            style={{ height: "min(920px, 90vh)" }}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
                if (isDragging) {
                    setIsDragging(false);
                    setSelectionStart(null);
                    setSelectionEnd(null);
                }
            }}
        >
            {/* ── Header: Week navigation + Day columns ── */}
            <div className="flex border-b border-gray-200 bg-gray-50 rounded-t-2xl flex-shrink-0">
                {/* Nav buttons */}
                <div className="w-[60px] flex-shrink-0 flex flex-col items-center justify-center gap-0.5 border-r border-gray-200 bg-white rounded-tl-2xl">
                    <button
                        onClick={() => onDateChange(subWeeks(currentDate, 1))}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Previous week"
                    >
                        <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={() => onDateChange(new Date())}
                        className="text-[9px] font-bold text-gray-400 hover:text-yellow-600 transition-colors uppercase tracking-wider"
                    >
                        Today
                    </button>
                    <button
                        onClick={() => onDateChange(addWeeks(currentDate, 1))}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Next week"
                    >
                        <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                {/* Day headers */}
                <div className="flex-1 grid grid-cols-7">
                    {days.map((day, idx) => {
                        const isToday = isSameDay(day, now);
                        return (
                            <div
                                key={day.toISOString()}
                                className={`text-center py-3 ${isToday ? "bg-yellow-50/80" : ""} ${idx < 6 ? "border-r border-gray-200" : ""}`}
                            >
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    {format(day, "EEE")}
                                </div>
                                <div
                                    className={`text-lg font-bold mt-0.5 ${
                                        isToday
                                            ? "bg-yellow-500 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto leading-none"
                                            : "text-gray-900"
                                    }`}
                                >
                                    {format(day, "d")}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Scrollable Grid ── */}
            <div className="overflow-auto flex-1 min-h-0 rounded-b-2xl">
                <div className="flex" style={{ minHeight: `${GRID_HEIGHT}px`, minWidth: 800 }}>
                    {/* Time Axis */}
                    <div
                        className="w-[60px] flex-shrink-0 bg-white border-r border-gray-200 sticky left-0 z-20 relative"
                        style={{ height: `${GRID_HEIGHT}px` }}
                    >
                        {SLOTS.filter((h) => Number.isInteger(h)).map((hour) => (
                            <div
                                key={hour}
                                className="absolute right-0 pr-2 text-[11px] font-medium text-gray-400 leading-none"
                                style={{ top: `${TOP_PADDING + (hour - 9) * HOUR_HEIGHT - 6}px` }}
                            >
                                {formatTime(hour)}
                            </div>
                        ))}
                    </div>

                    {/* Day Columns */}
                    <div className="flex-1 grid grid-cols-7 relative">
                        {days.map((day, colIdx) => {
                            const isToday = isSameDay(day, now);
                            const dayBookings = bookings.filter(
                                (b) => isSameDay(new Date(b.date), day) && b.status !== "cancelled"
                            );
                            const dayBlocks = blockedTimes.filter((b) => isSameDay(new Date(b.date), day));

                            return (
                                <div
                                    key={day.toISOString()}
                                    className={`relative ${colIdx < 6 ? "border-r border-gray-200" : ""} ${isToday ? "bg-yellow-50/30" : ""}`}
                                    style={{ height: `${GRID_HEIGHT}px` }}
                                >
                                    {/* Grid lines */}
                                    {SLOTS.map((hour) => (
                                        <div
                                            key={hour}
                                            className={`absolute left-0 right-0 border-b cursor-pointer transition-colors hover:bg-gray-100/60 ${
                                                Number.isInteger(hour) ? "border-gray-200" : "border-gray-100 border-dashed"
                                            }`}
                                            style={{
                                                top: `${TOP_PADDING + (hour - 9) * HOUR_HEIGHT}px`,
                                                height: `${SLOT_HEIGHT}px`,
                                            }}
                                            onMouseDown={() => handleMouseDown(day, hour)}
                                            onMouseEnter={() => handleMouseEnter(day, hour)}
                                        />
                                    ))}

                                    {/* Current time indicator */}
                                    {isToday && showNowLine && (
                                        <div
                                            className="absolute left-0 right-0 z-30 pointer-events-none"
                                            style={{ top: `${nowTop}px` }}
                                        >
                                            <div className="flex items-center">
                                                <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-[5px] shadow-sm" />
                                                <div className="flex-1 h-[2px] bg-red-500 opacity-70" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Bookings */}
                                    {dayBookings.map((booking) => {
                                        const start = timeToFloat(booking.time);
                                        const top = TOP_PADDING + (start - 9) * HOUR_HEIGHT;
                                        const duration = booking.serviceDuration || 30;
                                        const MIN_DURATION_PX = 10; // floor for services < 10min
                                        // 10min = 16px, 15min = 24px, 20min = 32px, 30min = 46px
                                        const naturalHeight = (duration / 60) * HOUR_HEIGHT - 2;
                                        const displayHeight = duration < 10
                                            ? MIN_DURATION_PX
                                            : Math.max(naturalHeight, MIN_DURATION_PX);
                                        const isTiny = displayHeight < 22;   // < ~14min — only name
                                        const isShort = displayHeight < 44;  // < ~28min — single row

                                        const statusColors =
                                            booking.status === "confirmed"
                                                ? "bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200"
                                                : "bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200";

                                        const textPrimary =
                                            booking.status === "confirmed" ? "text-pink-900" : "text-amber-900";
                                        const textSecondary =
                                            booking.status === "confirmed" ? "text-pink-500" : "text-amber-500";
                                        const textTertiary =
                                            booking.status === "confirmed" ? "text-pink-400" : "text-amber-400";

                                        return (
                                            <motion.div
                                                key={booking.id}
                                                initial={{ opacity: 0, scale: 0.96 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ duration: 0.2 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onBookingClick?.(booking.id);
                                                }}
                                                className={`absolute left-[3px] right-[3px] rounded-lg border shadow-sm cursor-pointer z-10
                                                    hover:shadow-lg hover:z-20 hover:brightness-[0.97] active:scale-[0.99] transition-all
                                                    ${statusColors}`}
                                                style={{
                                                    top: `${top + 1}px`,
                                                    height: `${displayHeight}px`,
                                                }}
                                                title={`${booking.customerName} — ${booking.serviceName} (${duration}min, ${booking.time})`}
                                            >
                                                <div className={`h-full px-2 flex overflow-hidden ${
                                                    isTiny
                                                        ? "flex-row items-center"
                                                        : isShort
                                                            ? "flex-row items-center gap-2"
                                                            : "flex-col justify-between py-1.5"
                                                }`}>
                                                    {isTiny ? (
                                                        /* Ultra-compact: just the name */
                                                        <span className={`font-bold ${textPrimary} text-[10px] truncate leading-none`}>
                                                            {booking.customerName}
                                                        </span>
                                                    ) : isShort ? (
                                                        /* Compact single-row for ≤30min bookings */
                                                        <>
                                                            <span className={`font-bold ${textPrimary} text-[11px] truncate flex-1`}>{booking.customerName}</span>
                                                            <span className={`${textSecondary} text-[10px] flex-shrink-0`}>{booking.time}</span>
                                                        </>
                                                    ) : (
                                                        /* Multi-line for longer bookings */
                                                        <>
                                                            <div className="min-w-0">
                                                                <div className={`font-bold ${textPrimary} text-[11px] leading-tight truncate`}>
                                                                    {booking.customerName}
                                                                </div>
                                                                <div className={`${textSecondary} text-[10px] leading-tight truncate mt-0.5`}>
                                                                    {booking.serviceName}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className={`${textTertiary} text-[10px]`}>{booking.time}</span>
                                                                <span className={`${textTertiary} text-[10px]`}>{duration}m</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}

                                    {/* Blocked Times */}
                                    {dayBlocks.map((block) => {
                                        const start = timeToFloat(block.startTime);
                                        const end = timeToFloat(block.endTime);
                                        const top = TOP_PADDING + (start - 9) * HOUR_HEIGHT;
                                        const height = (end - start) * HOUR_HEIGHT;

                                        return (
                                            <div
                                                key={`block-${block.id}`}
                                                className="absolute left-[3px] right-[3px] rounded-lg bg-gray-100/80 border border-gray-300/60 flex items-center justify-center group z-[5]"
                                                style={{
                                                    top: `${top + 1}px`,
                                                    height: `${Math.max(height - 2, 20)}px`,
                                                    backgroundImage:
                                                        "repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,0.04) 4px, rgba(0,0,0,0.04) 8px)",
                                                }}
                                            >
                                                <span className="text-[10px] text-gray-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity mr-1">
                                                    Blocked
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteBlock(block.id);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 bg-white text-red-500 rounded-full p-1 shadow-sm hover:bg-red-50 transition-all active:scale-95"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        );
                                    })}

                                    {/* Drag Selection Preview */}
                                    {isDragging && selectionStart && isSameDay(day, selectionStart.date) && selectionEnd && (
                                        <div
                                            className="absolute left-[3px] right-[3px] bg-blue-500/10 border-2 border-dashed border-blue-400 pointer-events-none z-30 rounded-lg"
                                            style={{
                                                top: `${TOP_PADDING + (Math.min(selectionStart.time, selectionEnd.time - 0.5) - 9) * HOUR_HEIGHT}px`,
                                                height: `${Math.abs(selectionEnd.time - selectionStart.time) * HOUR_HEIGHT}px`,
                                            }}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
