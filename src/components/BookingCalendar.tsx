"use client";

import { useState } from "react";
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameDay,
    addMonths,
    subMonths,
    isBefore,
    startOfDay,
    getDay,
} from "date-fns";
import { motion } from "framer-motion";

export default function BookingCalendar({
    onSelect,
    selectedDate,
}: {
    onSelect: (date: Date) => void;
    selectedDate?: Date;
}) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const days = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
    });

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const isPast = (date: Date) => isBefore(date, startOfDay(new Date()));
    const isWeekend = (date: Date) => {
        const d = getDay(date);
        return d === 0; // Sunday = 0 (Saturday is now open)
    };

    // Monday-start offset: getDay returns 0=Sun, 1=Mon, ..., 6=Sat
    // Convert to Mon=0, Tue=1, ..., Sun=6
    const firstDay = startOfMonth(currentMonth);
    const dayOfWeek = getDay(firstDay);
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    return (
        <div className="w-full max-w-md mx-auto bg-porcelain rounded-2xl shadow-sm border border-dusty-rose/30 p-6">
            {/* Month navigation */}
            <div className="flex justify-between items-center mb-6">
                <button
                    onClick={prevMonth}
                    disabled={isBefore(currentMonth, startOfMonth(new Date()))}
                    className="p-2 hover:bg-blush rounded-full disabled:opacity-30 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-charcoal">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                </button>
                <span className="font-playfair text-xl font-bold text-charcoal">
                    {format(currentMonth, "MMMM yyyy")}
                </span>
                <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-blush rounded-full transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-charcoal">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                </button>
            </div>

            {/* Day headers — Monday start */}
            <div className="grid grid-cols-7 gap-1 mb-2 text-center text-[11px] font-bold text-charcoal/40 uppercase tracking-widest">
                {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                    <div key={d} className={d === "Su" ? "text-charcoal/20" : ""}>
                        {d}
                    </div>
                ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1">
                {/* Empty offset cells for proper alignment */}
                {Array.from({ length: mondayOffset }).map((_, i) => (
                    <div key={`empty-${i}`} />
                ))}

                {/* Day cells */}
                {days.map((day) => {
                    const disabled = isPast(day) || isWeekend(day);
                    const selected = selectedDate && isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());
                    const weekend = isWeekend(day);

                    return (
                        <motion.button
                            key={day.toISOString()}
                            whileHover={!disabled ? { scale: 1.1 } : {}}
                            whileTap={!disabled ? { scale: 0.95 } : {}}
                            onClick={() => !disabled && onSelect(day)}
                            disabled={disabled}
                            className={`
                                h-10 w-full flex items-center justify-center rounded-full text-sm transition-all relative font-medium
                                ${selected
                                    ? "bg-charcoal text-porcelain shadow-lg"
                                    : disabled
                                        ? weekend
                                            ? "text-charcoal/15 cursor-not-allowed"
                                            : "text-charcoal/20 cursor-not-allowed"
                                        : "hover:bg-blush text-charcoal cursor-pointer"
                                }
                                ${isToday && !selected ? "ring-1 ring-gold font-bold text-gold-dark" : ""}
                            `}
                        >
                            {format(day, "d")}
                        </motion.button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-5 pt-4 border-t border-dusty-rose/20">
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full ring-1 ring-gold" />
                    <span className="text-[10px] text-charcoal/40">Today</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-charcoal" />
                    <span className="text-[10px] text-charcoal/40">Selected</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-dusty-rose/30" />
                    <span className="text-[10px] text-charcoal/40">Closed</span>
                </div>
            </div>
        </div>
    );
}
