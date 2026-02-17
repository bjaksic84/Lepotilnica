/**
 * Server-side broadcast helper.
 * Called from Next.js API routes to push events through the Rust WebSocket server.
 */

type BroadcastEvent = {
    event: string;
    data?: Record<string, unknown>;
};

const WS_BROADCAST_URL =
    process.env.WS_BROADCAST_URL || "http://localhost:8080/broadcast";

/**
 * Sends a real-time event to all connected WebSocket clients via the Rust WS server.
 * This is fire-and-forget — it won't throw or block the API response.
 */
export async function broadcast(event: BroadcastEvent): Promise<void> {
    try {
        await fetch(WS_BROADCAST_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                event: event.event,
                data: event.data || {},
            }),
            // Short timeout so it doesn't slow down API responses
            signal: AbortSignal.timeout(3000),
        });
    } catch (error) {
        // Non-critical — log but don't throw
        console.warn(`[WS Broadcast] Failed to send '${event.event}':`, error);
    }
}
