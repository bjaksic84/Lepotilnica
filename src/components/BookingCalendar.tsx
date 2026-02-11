"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isBefore, startOfDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline"; // Assuming we have heroicons or use SVGs

export default function BookingCalendar({ onSelect, selectedDate }: { onSelect: (date: Date) => void, selectedDate?: Date }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const days = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
    });

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const isPast = (date: Date) => isBefore(date, startOfDay(new Date()));

    return (
        <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-pink-100 p-6">
            <div className="flex justify-between items-center mb-6">
                <button onClick={prevMonth} disabled={isBefore(currentMonth, startOfMonth(new Date()))} className="p-2 hover:bg-pink-50 rounded-full disabled:opacity-30">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                </button>
                <span className="font-playfair text-xl font-bold text-gray-900">
                    {format(currentMonth, "MMMM yyyy")}
                </span>
                <button onClick={nextMonth} className="p-2 hover:bg-pink-50 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                </button>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-gray-500 uppercase tracking-widest">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => (
                    <div key={day}>{day}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
                {days.map((day) => {
                    const isDisabled = isPast(day);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);

                    return (
                        <motion.button
                            key={day.toISOString()}
                            whileHover={!isDisabled ? { scale: 1.1 } : {}}
                            whileTap={!isDisabled ? { scale: 0.95 } : {}}
                            onClick={() => !isDisabled && onSelect(day)}
                            disabled={isDisabled}
                            className={`
              h-10 w-10 flex items-center justify-center rounded-full text-sm transition-all relative font-medium
              ${!isSameMonth(day, currentMonth) ? "invisible" : ""}
              ${isSelected ? "bg-gray-900 text-white shadow-lg" : "hover:bg-yellow-100 text-gray-700"}
              ${isDisabled ? "text-gray-300 cursor-not-allowed hover:bg-transparent" : "cursor-pointer"}
              ${isSameDay(day, new Date()) && !isSelected ? "ring-1 ring-yellow-400 font-bold" : ""}
            `}
                        >
                            {format(day, "d")}
                            {isSelected && <motion.div layoutId="selectedDay" className="absolute inset-0 border-2 border-white rounded-full" />}
                        </motion.button>
                    )
                })}
            </div>
        </div>
    );
}
