"use client";

import { useEffect, useRef, useCallback, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

export type WsEventType =
    | "connected"
    | "booking_created"
    | "booking_updated"
    | "booking_deleted"
    | "blocked_time_created"
    | "blocked_time_deleted"
    | "service_created"
    | "service_updated"
    | "service_deleted"
    | "category_created"
    | "category_updated"
    | "category_deleted";

export type WsEvent = {
    event: WsEventType;
    data: Record<string, unknown>;
};

type WsStatus = "connecting" | "connected" | "disconnected" | "reconnecting";

type UseWebSocketOptions = {
    /** WebSocket server URL (defaults to ws://localhost:8080/ws) */
    url?: string;
    /** Event handlers for specific event types */
    onEvent?: (event: WsEvent) => void;
    /** Called when connection status changes */
    onStatusChange?: (status: WsStatus) => void;
    /** Max reconnection attempts (0 = infinite, default 20) */
    maxRetries?: number;
    /** Enable the connection (default true) */
    enabled?: boolean;
};

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useWebSocket(options: UseWebSocketOptions = {}) {
    const {
        url = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws",
        onEvent,
        onStatusChange,
        maxRetries = 20,
        enabled = true,
    } = options;

    const [status, setStatus] = useState<WsStatus>("disconnected");
    const [lastEvent, setLastEvent] = useState<WsEvent | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const retriesRef = useRef(0);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const pingTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
    const onEventRef = useRef(onEvent);
    const onStatusChangeRef = useRef(onStatusChange);

    // Keep callback refs fresh
    onEventRef.current = onEvent;
    onStatusChangeRef.current = onStatusChange;

    const updateStatus = useCallback((newStatus: WsStatus) => {
        setStatus(newStatus);
        onStatusChangeRef.current?.(newStatus);
    }, []);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        try {
            updateStatus("connecting");
            const ws = new WebSocket(url);

            ws.onopen = () => {
                retriesRef.current = 0;
                updateStatus("connected");

                // Keepalive ping every 25s
                pingTimerRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send("ping");
                    }
                }, 25000);
            };

            ws.onmessage = (e) => {
                try {
                    const event: WsEvent = JSON.parse(e.data);
                    setLastEvent(event);
                    onEventRef.current?.(event);
                } catch {
                    // Ignore non-JSON messages
                }
            };

            ws.onclose = () => {
                clearInterval(pingTimerRef.current);
                wsRef.current = null;

                if (maxRetries === 0 || retriesRef.current < maxRetries) {
                    updateStatus("reconnecting");
                    // Exponential backoff: 1s, 2s, 4s, 8s... max 30s
                    const delay = Math.min(1000 * Math.pow(2, retriesRef.current), 30000);
                    retriesRef.current++;
                    reconnectTimerRef.current = setTimeout(connect, delay);
                } else {
                    updateStatus("disconnected");
                }
            };

            ws.onerror = () => {
                // onclose will fire after onerror, handled there
            };

            wsRef.current = ws;
        } catch {
            updateStatus("disconnected");
        }
    }, [url, maxRetries, updateStatus]);

    const disconnect = useCallback(() => {
        clearTimeout(reconnectTimerRef.current);
        clearInterval(pingTimerRef.current);
        retriesRef.current = maxRetries + 1; // Prevent auto-reconnect
        wsRef.current?.close();
        wsRef.current = null;
        updateStatus("disconnected");
    }, [maxRetries, updateStatus]);

    useEffect(() => {
        if (enabled) {
            connect();
        } else {
            disconnect();
        }
        return () => {
            clearTimeout(reconnectTimerRef.current);
            clearInterval(pingTimerRef.current);
            wsRef.current?.close();
        };
    }, [enabled, connect, disconnect]);

    return { status, lastEvent, disconnect, reconnect: connect };
}
