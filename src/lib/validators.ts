import { z } from "zod";

export const bookingSchema = z.object({
    customerName: z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name is too long")
        .regex(/^[a-zA-Z\u00C0-\u017E\s\-'.]+$/, "Name can only contain letters, spaces and hyphens"),
    customerEmail: z
        .string()
        .email("Please enter a valid email address")
        .max(255, "Email address is too long"),
    customerPhone: z
        .string()
        .min(8, "Phone number must be at least 8 characters")
        .max(20, "Phone number is too long")
        .regex(/^\+?[\d\s\-()]{8,20}$/, "Please enter a valid phone number (e.g. +386 40 123 456)"),
    serviceId: z.coerce.number().int().positive("Please select a service"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
    notes: z.string().max(500, "Notes are too long (max 500 characters)").optional(),
});

export type BookingFormData = z.infer<typeof bookingSchema>;

export const blockedTimeSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
    reason: z.string().optional(),
});

export type BlockedTimeFormData = z.infer<typeof blockedTimeSchema>;

export const multiBookingSchema = z.object({
    customerName: z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name is too long")
        .regex(/^[a-zA-Z\u00C0-\u017E\s\-'.]+$/, "Name can only contain letters, spaces and hyphens"),
    customerEmail: z
        .string()
        .email("Please enter a valid email address")
        .max(255, "Email address is too long"),
    customerPhone: z
        .string()
        .min(8, "Phone number must be at least 8 characters")
        .max(20, "Phone number is too long")
        .regex(/^\+?[\d\s\-()]{8,20}$/, "Please enter a valid phone number (e.g. +386 40 123 456)"),
    serviceIds: z.array(z.coerce.number().int().positive("Invalid service")).min(1, "Please select at least one service"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
    notes: z.string().max(500, "Notes are too long (max 500 characters)").optional(),
});

export type MultiBookingFormData = z.infer<typeof multiBookingSchema>;
