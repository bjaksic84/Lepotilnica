/**
 * Who is a customer?
 *
 * There is no customers table: a customer is whoever the bookings say they
 * are. Two bookings belong to the same customer when they carry the same
 * e-mail AND the same phone number, both compared after normalisation.
 *
 * The name is deliberately not part of it. It is free text, gets typed
 * differently from one booking to the next ("John Doe", then "John Joe"), and
 * is displayed as whatever was entered most recently. A different e-mail or a
 * different phone number, on the other hand, is a different customer.
 *
 * The pair rather than the e-mail alone because addresses get shared — a
 * household, or one person booking for others — and merging two people's
 * histories, notes and absences into one record is worse than the opposite
 * mistake. That opposite mistake is a returning customer with a new number
 * getting a second record; the Logs page links records that share an e-mail
 * or a phone so it is visible rather than silent.
 *
 * Pure and dependency-free: the manual booking form runs this in the browser
 * to tell Karin whether she is about to create a new customer.
 */

export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

/**
 * One canonical form per phone number, so formatting never splits a customer:
 * "040 123 456", "040-123-456", "+386 40 123 456", "00386 40 123 456" and
 * "+386 (0)40 123 456" all become "+38640123456".
 *
 * A number written without a country code is taken to be Slovenian, which is
 * what the salon's customers type. Anything unrecognisable keeps its digits,
 * so two identical oddities still match each other.
 */
export function normalizePhone(phone: string | null | undefined): string {
    if (!phone) return "";
    const trimmed = phone.trim();
    const international = trimmed.startsWith("+");
    let digits = trimmed.replace(/\D/g, "");
    if (!digits) return "";

    if (!international) {
        if (digits.startsWith("00")) {
            digits = digits.slice(2);
        } else if (digits.startsWith("0")) {
            digits = "386" + digits.slice(1);
        } else if (digits.length === 8) {
            // The national number without its leading 0.
            digits = "386" + digits;
        }
    }
    // "+386 (0)40 …": the trunk 0 does not belong after a country code.
    if (digits.startsWith("3860")) digits = "386" + digits.slice(4);

    return "+" + digits;
}

/** Stable identifier for the e-mail + phone pair. */
export function customerKey(email: string, phone: string | null | undefined): string {
    return `${normalizeEmail(email)}|${normalizePhone(phone)}`;
}

/** Inverse of customerKey. Normalised e-mails never contain "|". */
export function parseCustomerKey(key: string): { email: string; phone: string } | null {
    const split = key.lastIndexOf("|");
    if (split <= 0) return null;
    return { email: key.slice(0, split), phone: key.slice(split + 1) };
}
