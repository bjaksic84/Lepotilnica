import { z } from "zod";

export const bookingSchema = z.object({
    customerName: z.string().min(2, "Name is required"),
    customerEmail: z.string().email("Invalid email address"),
    customerPhone: z.string().min(9, "Phone number is required"),
    serviceId: z.string().min(1, "Service is required"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:mm)"),
    notes: z.string().optional(),
});

export type BookingFormData = z.infer<typeof bookingSchema>;
