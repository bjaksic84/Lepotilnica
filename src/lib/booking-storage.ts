/**
 * Shared persistence for the in-progress booking.
 *
 * Both the services page and the /book flow read and write the SAME record so
 * that the current service selection survives every round trip, regardless of
 * how the flow is (re)entered:
 *   1. landing page popular service  → /book?service=X
 *   2. navbar "Rezerviraj"           → /book        (restores from this store)
 *   3. services page floating button → /book?services=X,Y
 *
 * Before this was centralised, the services page kept its selection only in the
 * URL, so re-entering via the navbar (entry #2, which has no params) restored a
 * stale snapshot and silently dropped later add/remove edits.
 */

export type Step = "service" | "date" | "time" | "details" | "confirmation";

export type SavedProgress = {
    selectedServiceIds?: number[];
    selectedDate?: string | null; // yyyy-MM-dd
    selectedTime?: string | null;
    name?: string;
    email?: string;
    phone?: string;
    notes?: string;
    step?: Step;
    fromServices?: boolean;
    savedAt?: number;
};

// Persist in-progress bookings so a reload / accidental navigation doesn't lose work.
export const BOOKING_STORAGE_KEY = "lepotilnica:booking:v1";
export const STORAGE_MAX_AGE_MS = 1000 * 60 * 60 * 24; // Ignore progress older than 24h

/** Order-insensitive equality for two service-id lists. */
export function sameIdSet(a: number[] | undefined, b: number[] | undefined): boolean {
    if (!a || !b || a.length !== b.length) return false;
    const sa = [...a].sort((x, y) => x - y);
    const sb = [...b].sort((x, y) => x - y);
    return sa.every((v, i) => v === sb[i]);
}

/** Read saved progress, treating anything older than the max age as absent. */
export function readProgress(): SavedProgress | null {
    try {
        const raw = localStorage.getItem(BOOKING_STORAGE_KEY);
        if (!raw) return null;
        const saved = JSON.parse(raw) as SavedProgress;
        if (saved.savedAt && Date.now() - saved.savedAt >= STORAGE_MAX_AGE_MS) return null;
        return saved;
    } catch {
        return null;
    }
}

/** Persist the whole record (stamped with the current time). */
export function writeProgress(progress: SavedProgress): void {
    try {
        localStorage.setItem(
            BOOKING_STORAGE_KEY,
            JSON.stringify({ ...progress, savedAt: Date.now() })
        );
    } catch {
        // Storage may be unavailable (private mode) — ignore.
    }
}

export function clearProgress(): void {
    try {
        localStorage.removeItem(BOOKING_STORAGE_KEY);
    } catch {
        // ignore
    }
}

/**
 * Reconcile a services-page selection into the shared store, preserving as much
 * downstream progress (date / contact fields) as still makes sense.
 *
 * Mirrors the in-flow service toggle: changing which services are selected
 * invalidates a previously chosen time (the total duration differs), so the
 * time is cleared and the flow rewinds to the date step. An empty selection
 * drops the booking specifics but keeps any typed contact details.
 */
export function syncServiceSelection(selectedIds: number[]): void {
    const prev = readProgress();

    if (selectedIds.length === 0) {
        writeProgress({
            ...prev,
            selectedServiceIds: [],
            selectedDate: null,
            selectedTime: null,
            step: "service",
            fromServices: false,
        });
        return;
    }

    const changed = !sameIdSet(prev?.selectedServiceIds, selectedIds);
    writeProgress({
        ...prev,
        selectedServiceIds: selectedIds,
        // A changed set makes any previously chosen time invalid.
        selectedTime: changed ? null : prev?.selectedTime ?? null,
        step: changed ? "date" : prev?.step ?? "date",
        // The selection originates from the services page → skip the in-flow
        // service step and send "back" to /services.
        fromServices: true,
    });
}
