import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    CANCELLATION_NOTICE_HOURS,
    CANCEL_TOKEN_REGEX,
    hoursUntilBooking,
    isInsideNoticeWindow,
} from "@/lib/cancellation";

/**
 * The 36-hour cancellation cutoff.
 *
 * Worth pinning down because the number is load-bearing in two different ways:
 * it decides whether a customer can cancel themselves, and it decides whether
 * the cancellation page offers to notify the salon instead. It is also spelled
 * out in prose in five places — the ToS, the confirmation and reschedule
 * e-mails, the cancellation page and the homepage FAQ — none of which the
 * compiler can check, so a silent change here would quietly contradict all of
 * them.
 *
 * Time is frozen rather than slept through, so the boundary is tested exactly.
 */
describe("cancellation notice window", () => {
    /** A Monday, midday. */
    const NOW = new Date(2026, 5, 1, 12, 0, 0);

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const pad = (n: number) => String(n).padStart(2, "0");

    /** A booking `hours` from the frozen now, in the shape the helpers take. */
    const bookingIn = (hours: number) => {
        const d = new Date(NOW.getTime() + hours * 3600 * 1000);
        return {
            date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
            time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
        };
    };

    it("is 36 hours — change the ToS, e-mails, FAQ and cancel page with it", () => {
        expect(CANCELLATION_NOTICE_HOURS).toBe(36);
    });

    it("measures hours until the appointment", () => {
        expect(hoursUntilBooking(bookingIn(10))).toBeCloseTo(10, 5);
        expect(hoursUntilBooking(bookingIn(48))).toBeCloseTo(48, 5);
    });

    it("reports a past appointment as negative", () => {
        expect(hoursUntilBooking(bookingIn(-5))).toBeCloseTo(-5, 5);
    });

    it("lets a customer cancel comfortably ahead of the cutoff", () => {
        expect(isInsideNoticeWindow(bookingIn(48))).toBe(false);
        expect(isInsideNoticeWindow(bookingIn(37))).toBe(false);
    });

    it("blocks a customer inside the cutoff", () => {
        expect(isInsideNoticeWindow(bookingIn(35))).toBe(true);
        expect(isInsideNoticeWindow(bookingIn(1))).toBe(true);
    });

    it("treats exactly 36 hours as still cancellable", () => {
        // The rule is "at least 36 hours before", so the boundary itself is
        // allowed. Flipping this to a `<=` would refuse a customer who did
        // exactly what the terms asked of them.
        expect(isInsideNoticeWindow(bookingIn(CANCELLATION_NOTICE_HOURS))).toBe(false);
    });

    it("treats an appointment already past as inside the window", () => {
        // It cannot be self-cancelled, which is what matters: the page offers
        // to notify the salon rather than a cancel button.
        expect(isInsideNoticeWindow(bookingIn(-1))).toBe(true);
    });

    describe("token shape", () => {
        it("accepts a v4 UUID", () => {
            expect(CANCEL_TOKEN_REGEX.test("3f1a2b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b")).toBe(true);
        });

        it("rejects anything else, so a scan cannot probe the table", () => {
            for (const bad of [
                "not-a-uuid",
                "",
                "3f1a2b4c5d6e4f708a9b0c1d2e3f4a5b",
                "3f1a2b4c-5d6e-1f70-8a9b-0c1d2e3f4a5b", // version 1, not 4
                "' OR 1=1 --",
            ]) {
                expect(CANCEL_TOKEN_REGEX.test(bad)).toBe(false);
            }
        });
    });
});
