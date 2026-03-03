import { z } from "zod";

export const bookingSchema = z.object({
    customerName: z
        .string()
        .min(2, "Ime mora vsebovati vsaj 2 znaka")
        .max(100, "Ime je predolgo")
        .regex(/^[a-zA-Z\u00C0-\u017E\s\-'.]+$/, "Ime sme vsebovati le črke, presledke in vezaje"),
    customerEmail: z
        .string()
        .email("Vnesite veljaven e-poštni naslov")
        .max(255, "E-poštni naslov je predolg"),
    customerPhone: z
        .string()
        .min(8, "Telefonska številka mora imeti vsaj 8 znakov")
        .max(20, "Telefonska številka je predolga")
        .regex(/^\+?[\d\s\-()]{8,20}$/, "Vnesite veljavno telefonsko številko (npr. +386 40 123 456)"),
    serviceId: z.coerce.number().int().positive("Izberite storitev"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neveljaven format datuma"),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Neveljaven format časa"),
    notes: z.string().max(500, "Opombe so predolge (največ 500 znakov)").optional(),
});

export type BookingFormData = z.infer<typeof bookingSchema>;

export const blockedTimeSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neveljaven format datuma"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Neveljaven format časa"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Neveljaven format časa"),
    reason: z.string().optional(),
});

export type BlockedTimeFormData = z.infer<typeof blockedTimeSchema>;

export const multiBookingSchema = z.object({
    customerName: z
        .string()
        .min(2, "Ime mora vsebovati vsaj 2 znaka")
        .max(100, "Ime je predolgo")
        .regex(/^[a-zA-Z\u00C0-\u017E\s\-'.]+$/, "Ime sme vsebovati le črke, presledke in vezaje"),
    customerEmail: z
        .string()
        .email("Vnesite veljaven e-poštni naslov")
        .max(255, "E-poštni naslov je predolg"),
    customerPhone: z
        .string()
        .min(8, "Telefonska številka mora imeti vsaj 8 znakov")
        .max(20, "Telefonska številka je predolga")
        .regex(/^\+?[\d\s\-()]{8,20}$/, "Vnesite veljavno telefonsko številko (npr. +386 40 123 456)"),
    serviceIds: z.array(z.coerce.number().int().positive("Neveljavna storitev")).min(1, "Izberite vsaj eno storitev"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neveljaven format datuma"),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Neveljaven format časa"),
    notes: z.string().max(500, "Opombe so predolge (največ 500 znakov)").optional(),
});

export type MultiBookingFormData = z.infer<typeof multiBookingSchema>;
