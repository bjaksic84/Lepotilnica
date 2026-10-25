import { describe, expect, it } from "vitest";
import { customerKey, isAnonymised, normalizeEmail, normalizePhone, parseCustomerKey } from "@/lib/customer-identity";
import { adminBookingSchema, editCustomerSchema, multiBookingSchema, newCustomerSchema } from "@/lib/validators";
import { salonNow } from "@/lib/schedule";

/**
 * Who counts as the same customer.
 *
 * The rule is the e-mail + phone pair, compared after normalisation, and never
 * the name. Formatting must not split a customer (the same number typed three
 * ways is one person), while a genuinely different e-mail or number must.
 */
describe("customer identity", () => {
    describe("phone normalisation", () => {
        it("reduces every way of writing a Slovenian number to one form", () => {
            for (const written of [
                "+38640123456",
                "+386 40 123 456",
                "040 123 456",
                "040-123-456",
                "(040) 123 456",
                "00386 40 123 456",
                "+386 (0)40 123 456",
                "386 40 123 456",
                "40 123 456",
                " 040123456 ",
            ]) {
                expect(normalizePhone(written), written).toBe("+38640123456");
            }
        });

        it("handles landlines the same way", () => {
            expect(normalizePhone("01 234 56 78")).toBe("+38612345678");
            expect(normalizePhone("+386 1 234 56 78")).toBe("+38612345678");
        });

        it("leaves foreign numbers with their own country code", () => {
            expect(normalizePhone("+49 151 1234 5678")).toBe("+4915112345678");
            expect(normalizePhone("0049 151 1234 5678")).toBe("+4915112345678");
        });

        it("is idempotent, so stored normalised numbers still match", () => {
            const once = normalizePhone("040 123 456");
            expect(normalizePhone(once)).toBe(once);
        });

        it("treats a missing number as empty", () => {
            expect(normalizePhone(null)).toBe("");
            expect(normalizePhone(undefined)).toBe("");
            expect(normalizePhone("")).toBe("");
            expect(normalizePhone("   ")).toBe("");
        });

        it("keeps genuinely different numbers apart", () => {
            expect(normalizePhone("040 123 456")).not.toBe(normalizePhone("041 123 456"));
        });
    });

    it("compares e-mail without case or surrounding space", () => {
        expect(normalizeEmail("  John.Doe@Example.COM ")).toBe("john.doe@example.com");
    });

    describe("the John Doe scenario", () => {
        const first = { name: "John Doe", email: "john.doe@example.com", phone: "+386 40 123 456" };

        it("keeps a booking under a different name on the same customer", () => {
            // Same number and e-mail, two weeks later, name typed "John Joe".
            const second = { name: "John Joe", email: "john.doe@example.com", phone: "+386 40 123 456" };
            expect(customerKey(second.email, second.phone)).toBe(customerKey(first.email, first.phone));
        });

        it("is not fooled by formatting or capitalisation", () => {
            expect(customerKey("John.Doe@example.com", "040 123 456")).toBe(customerKey(first.email, first.phone));
        });

        it("starts a new customer when the phone number differs", () => {
            expect(customerKey(first.email, "+386 41 999 888")).not.toBe(customerKey(first.email, first.phone));
        });

        it("starts a new customer when the e-mail differs", () => {
            expect(customerKey("j.doe@example.com", first.phone)).not.toBe(customerKey(first.email, first.phone));
        });
    });

    it("round-trips a key", () => {
        const key = customerKey("Ana@Example.com", "031 222 333");
        expect(parseCustomerKey(key)).toEqual({ email: "ana@example.com", phone: "+38631222333" });
        expect(parseCustomerKey("no-separator")).toBeNull();
    });

    describe("customers without an e-mail", () => {
        it("are identified by the phone alone", () => {
            const key = customerKey("", "040 123 456");
            expect(key).toBe("|+38640123456");
            expect(parseCustomerKey(key)).toEqual({ email: "", phone: "+38640123456" });
            expect(customerKey("  ", "+386 40 123 456")).toBe(key);
        });

        it("are not mistaken for deleted ones, which have neither", () => {
            expect(isAnonymised("", "040 123 456")).toBe(false);
            expect(isAnonymised("ana@example.com", null)).toBe(false);
            expect(isAnonymised("", null)).toBe(true);
            expect(parseCustomerKey("|")).toBeNull();
        });
    });

    describe("which forms require an e-mail", () => {
        const booking = { customerName: "Ana Novak", customerPhone: "040 123 456", serviceIds: [1], date: "2026-11-02", time: "10:00" };

        it("still requires one online", () => {
            expect(multiBookingSchema.safeParse({ ...booking, customerEmail: "" }).success).toBe(false);
            expect(multiBookingSchema.safeParse(booking).success).toBe(false);
        });

        it("lets Karin leave it out, but not get it wrong", () => {
            expect(adminBookingSchema.safeParse(booking).data?.customerEmail).toBe("");
            expect(adminBookingSchema.safeParse({ ...booking, customerEmail: "ana@" }).success).toBe(false);
            expect(newCustomerSchema.safeParse({ customerName: "Ana Novak", customerPhone: "040 123 456" }).data?.customerEmail).toBe("");
            expect(editCustomerSchema.safeParse({ key: "|+38640123456", customerName: "Ana Novak", customerPhone: "040 123 456", customerEmail: "" }).success).toBe(true);
        });

        it("still requires a phone everywhere", () => {
            expect(adminBookingSchema.safeParse({ ...booking, customerPhone: "" }).success).toBe(false);
            expect(newCustomerSchema.safeParse({ customerName: "Ana Novak", customerEmail: "ana@example.com" }).success).toBe(false);
        });
    });
});

/**
 * Bookings are stored as the salon's wall clock while the server runs in UTC,
 * so "has this happened yet" must be asked in Ljubljana time.
 */
describe("salon clock", () => {
    it("is two hours ahead of UTC in summer", () => {
        expect(salonNow(new Date("2026-07-01T10:00:00Z"))).toEqual({ date: "2026-07-01", time: "12:00" });
    });

    it("is one hour ahead of UTC in winter", () => {
        expect(salonNow(new Date("2026-12-01T10:00:00Z"))).toEqual({ date: "2026-12-01", time: "11:00" });
    });

    it("rolls the date over before UTC does", () => {
        expect(salonNow(new Date("2026-06-01T22:05:00Z"))).toEqual({ date: "2026-06-02", time: "00:05" });
        expect(salonNow(new Date("2026-12-31T23:30:00Z"))).toEqual({ date: "2027-01-01", time: "00:30" });
    });

    it("follows the clocks going back in October", () => {
        expect(salonNow(new Date("2026-10-25T00:59:00Z")).time).toBe("02:59");
        expect(salonNow(new Date("2026-10-25T01:00:00Z")).time).toBe("02:00");
    });
});
