"use client";

import { useState, Component } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks } from "date-fns";
import { motion } from "framer-motion";

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
};

const HOURS = Array.from({ length: 17 }, (_, i) => 9 + i * 0.5); // 09:00 to 17:00 in 30m intervals

function formatTime(hour: number) {
    const h = Math.floor(hour);
    const m = (hour % 1) * 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function timeToFloat(time: string) {
    const [h, m] = time.split(":").map(Number);
    return h + m / 60;
}

export default function WeeklyTimetable({ bookings, blockedTimes, currentDate, onDateChange, onBlockTime, onDeleteBlock }: WeeklyTimetableProps) {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // Drag selection state
    const [isDragging, setIsDragging] = useState(false);
    const [selectionStart, setSelectionStart] = useState<{ date: Date, time: number } | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<{ date: Date, time: number } | null>(null);

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

            const start = formatTime(startVal);
            const end = formatTime(endVal);

            await onBlockTime(dateStr, start, end);
        }
        setIsDragging(false);
        setSelectionStart(null);
        setSelectionEnd(null);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col h-[800px] select-none" onMouseUp={handleMouseUp}>
            {/* Header */}
            <div className="flex border-b border-gray-200 bg-gray-50">
                <div className="w-16 flex-shrink-0 flex items-center justify-center p-4 border-r border-gray-200 bg-white">
                    <div className="flex gap-1">
                        <button onClick={() => onDateChange(subWeeks(currentDate, 1))} className="p-1 hover:bg-gray-100 rounded">
                            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button onClick={() => onDateChange(addWeeks(currentDate, 1))} className="p-1 hover:bg-gray-100 rounded">
                            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>
                <div className="flex-1 grid grid-cols-7 divide-x divide-gray-200">
                    {days.map(day => (
                        <div key={day.toISOString()} className={`text-center py-2 ${isSameDay(day, new Date()) ? 'bg-yellow-50' : ''}`}>
                            <div className="text-xs font-bold text-gray-500 uppercase">{format(day, "EEE")}</div>
                            <div className={`text-lg font-bold ${isSameDay(day, new Date()) ? 'text-yellow-600' : 'text-gray-900'}`}>{format(day, "d")}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="overflow-y-auto flex-1 relative custom-scrollbar">
                <div className="flex min-h-[768px] min-w-[800px] lg:min-w-0"> {/* Force min-width for mobile scroll */}
                    {/* Time Axis */}
                    <div className="w-16 flex-shrink-0 bg-white border-r border-gray-200 sticky left-0 z-20">
                        {HOURS.map((hour, i) => (
                            /* Only show label for full hours */
                            Number.isInteger(hour) ? (
                                <div key={hour} className="h-24 border-b border-gray-100 text-xs text-gray-400 text-right pr-2 pt-1 relative -top-3">
                                    {formatTime(hour)}
                                </div>
                            ) : null
                        ))}
                    </div>

                    {/* Columns */}
                    <div className="flex-1 grid grid-cols-7 divide-x divide-gray-200 relative bg-gray-50/30">
                        {days.map(day => (
                            <div key={day.toISOString()} className="relative">
                                {/* Grid Lines (30 mins = 48px height) */}
                                {HOURS.map((hour) => (
                                    <div
                                        key={hour}
                                        className="h-12 border-b border-dashed border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer box-border"
                                        onMouseDown={() => handleMouseDown(day, hour)}
                                        onMouseEnter={() => handleMouseEnter(day, hour)}
                                    />
                                ))}

                                {/* Render Bookings */}
                                {bookings.filter(b => isSameDay(new Date(b.date), day) && b.status !== 'cancelled').map(booking => {
                                    const start = timeToFloat(booking.time);
                                    // 9:00 is at 0px. Each hour is 96px (2 * 48px).
                                    const top = (start - 9) * 96;
                                    const height = ((booking.serviceDuration || 30) / 60) * 96;

                                    return (
                                        <motion.div
                                            key={booking.id}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="absolute left-1 right-1 rounded-md bg-pink-100 border border-pink-200 p-2 text-xs flex flex-col overflow-hidden shadow-sm hover:shadow-md hover:z-10 transition-all cursor-pointer group"
                                            style={{ top: `${top}px`, height: `${height - 2}px` }}
                                            title={`${booking.customerName} - ${booking.serviceName}`}
                                        >
                                            <div className="font-bold text-pink-900 truncate">{booking.customerName}</div>
                                            <div className="text-pink-700 truncate text-[10px]">{booking.serviceName}</div>
                                            <div className="text-pink-600/70 mt-auto text-[10px]">{booking.time}</div>
                                        </motion.div>
                                    );
                                })}

                                {/* Render Blocked Times */}
                                {blockedTimes.filter(b => isSameDay(new Date(b.date), day)).map(block => {
                                    const start = timeToFloat(block.startTime);
                                    const end = timeToFloat(block.endTime);
                                    const top = (start - 9) * 96;
                                    const height = (end - start) * 96;

                                    return (
                                        <div
                                            key={`block-${block.id}`}
                                            className="absolute left-1 right-1 rounded bg-gray-100 border border-gray-300 flex items-center justify-center group z-0"
                                            style={{
                                                top: `${top}px`,
                                                height: `${height - 2}px`,
                                                backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 5px, rgba(0,0,0,0.05) 5px, rgba(0,0,0,0.05) 10px)'
                                            }}
                                        >
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDeleteBlock(block.id); }}
                                                className="opacity-0 group-hover:opacity-100 bg-white text-red-500 rounded-full p-1 shadow hover:bg-red-50 transition-all transform scale-90 active:scale-95"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    );
                                })}

                                {/* Selection Preview */}
                                {isDragging && selectionStart && isSameDay(day, selectionStart.date) && (
                                    <div
                                        className="absolute left-1 right-1 bg-blue-500/10 border-2 border-dashed border-blue-400 pointer-events-none z-30 rounded"
                                        style={{
                                            top: `${(Math.min(selectionStart.time, selectionEnd?.time || 0) - 9) * 96}px`,
                                            height: `${Math.abs((selectionEnd?.time || 0) - selectionStart.time) * 96}px`
                                        }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
