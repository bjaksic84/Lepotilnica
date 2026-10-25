import { z } from "zod";

/**
 * Name, e-mail and phone, as every form that records a customer takes them:
 * online booking, manual booking, and adding or editing a customer in Logs.
 * One definition, so a customer Karin saves can always book with the same
 * details and vice versa.
 */
const customerFields = {
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
};

export const bookingSchema = z.object({
    ...customerFields,
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
    ...customerFields,
    serviceIds: z.array(z.coerce.number().int().positive("Neveljavna storitev")).min(1, "Izberite vsaj eno storitev"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neveljaven format datuma"),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Neveljaven format časa"),
    notes: z.string().max(500, "Opombe so predolge (največ 500 znakov)").optional(),
});

export type MultiBookingFormData = z.infer<typeof multiBookingSchema>;

/**
 * Karin's own entries may leave the e-mail out: clients from her old booking
 * system often have only a phone number. Online bookings still require one
 * (multiBookingSchema above) — it is how the customer gets their confirmation
 * and cancellation link.
 */
const optionalEmail = customerFields.customerEmail.or(z.literal("")).default("");

/** A booking Karin enters by hand in the dashboard. */
export const adminBookingSchema = multiBookingSchema.extend({ customerEmail: optionalEmail });

/** Adding a customer in Logs, before they have booked. */
export const newCustomerSchema = z.object({
    ...customerFields,
    customerEmail: optionalEmail,
    note: z.string().max(2000, "Opomba je predolga (največ 2000 znakov)").optional(),
});

/** Editing a customer in Logs; `merge` confirms joining another customer. */
export const editCustomerSchema = z.object({
    key: z.string().min(3),
    ...customerFields,
    customerEmail: optionalEmail,
    merge: z.boolean().optional(),
});

/**
 * Website enquiry form (the "povpraševanje" box on the homepage).
 *
 * Unlike a booking this creates no database row and reserves no time — it just
 * sends Karin an e-mail — so the only hard requirements are a way to reply and
 * something to reply about. The phone number is optional for exactly that
 * reason: insisting on one costs more enquiries than it gains.
 */
export const enquirySchema = z.object({
    name: z
        .string()
        .min(2, "Ime mora vsebovati vsaj 2 znaka")
        .max(100, "Ime je predolgo")
        .regex(/^[a-zA-ZÀ-ž\s\-'.]+$/, "Ime sme vsebovati le črke, presledke in vezaje"),
    email: z
        .string()
        .email("Vnesite veljaven e-poštni naslov")
        .max(255, "E-poštni naslov je predolg"),
    phone: z
        .string()
        .max(20, "Telefonska številka je predolga")
        .regex(/^\+?[\d\s\-()]{8,20}$/, "Vnesite veljavno telefonsko številko (npr. +386 40 123 456)")
        .optional()
        .or(z.literal("")),
    topic: z.string().max(80, "Izbira je predolga").optional().or(z.literal("")),
    message: z
        .string()
        .min(10, "Sporočilo mora vsebovati vsaj 10 znakov")
        .max(2000, "Sporočilo je predolgo (največ 2000 znakov)"),
    consent: z.literal(true, {
        message: "Za oddajo povpraševanja je potrebno soglasje",
    }),
    /**
     * Honeypot. Hidden from sighted users and from assistive tech, so a real
     * visitor can never fill it in — anything that does is a bot.
     *
     * Deliberately permissive: rejecting a non-empty value *here* would answer
     * with a validation error naming this field, which tells the bot precisely
     * which input to leave alone next time. The emptiness check lives in the
     * route instead, where a hit can be answered with a plain success.
     */
    website: z.string().max(200).optional(),
});

export type EnquiryFormData = z.infer<typeof enquirySchema>;
