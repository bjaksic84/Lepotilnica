use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    extract::State,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use futures::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    net::SocketAddr,
    sync::Arc,
};
use tokio::sync::{broadcast, RwLock};
use tower_http::cors::{Any, CorsLayer};
use tracing::{info, warn};
use uuid::Uuid;

// ── Types ──────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsEvent {
    /// Event type: booking_created, booking_updated, booking_deleted,
    /// blocked_time_created, blocked_time_deleted,
    /// service_created, service_updated, service_deleted,
    /// category_created, category_updated, category_deleted
    pub event: String,

    /// Optional JSON payload with the affected entity
    #[serde(default)]
    pub data: serde_json::Value,
}

// ── App State ──────────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct AppState {
    /// Broadcast channel for sending events to all connected WebSocket clients
    tx: broadcast::Sender<String>,
    /// Track connected clients (id → peer addr)
    clients: Arc<RwLock<HashMap<String, String>>>,
}

// ── Main ───────────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    // Broadcast channel with generous buffer
    let (tx, _rx) = broadcast::channel::<String>(256);

    let state = AppState {
        tx,
        clients: Arc::new(RwLock::new(HashMap::new())),
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/ws", get(ws_handler))
        .route("/broadcast", post(broadcast_handler))
        .route("/health", get(health_handler))
        .route("/stats", get(stats_handler))
        .layer(cors)
        .with_state(state);

    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "8000".to_string())
        .parse()
        .unwrap_or(8000);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("\u{1f680} Lepotilnica WebSocket server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

// ── Handlers ───────────────────────────────────────────────────────────────────

/// Health check endpoint
async fn health_handler() -> impl IntoResponse {
    Json(serde_json::json!({ "status": "ok", "server": "lepotilnica-ws" }))
}

/// Stats endpoint — returns number of connected clients
async fn stats_handler(State(state): State<AppState>) -> impl IntoResponse {
    let clients = state.clients.read().await;
    Json(serde_json::json!({
        "connected_clients": clients.len(),
        "client_ids": clients.keys().collect::<Vec<_>>(),
    }))
}

/// POST /broadcast — called by Next.js API routes to push events to all WS clients
async fn broadcast_handler(
    State(state): State<AppState>,
    Json(event): Json<WsEvent>,
) -> impl IntoResponse {
    let msg = serde_json::to_string(&event).unwrap_or_default();
    let receiver_count = state.tx.receiver_count();

    if receiver_count > 0 {
        match state.tx.send(msg) {
            Ok(n) => {
                info!(
                    "📡 Broadcast event '{}' to {} client(s)",
                    event.event, n
                );
                Json(serde_json::json!({ "success": true, "receivers": n }))
            }
            Err(e) => {
                warn!("Failed to broadcast: {}", e);
                Json(serde_json::json!({ "success": false, "error": e.to_string() }))
            }
        }
    } else {
        info!("📡 No clients connected, event '{}' dropped", event.event);
        Json(serde_json::json!({ "success": true, "receivers": 0 }))
    }
}

/// WebSocket upgrade handler
async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

/// Per-client WebSocket connection handler
async fn handle_socket(socket: WebSocket, state: AppState) {
    let client_id = Uuid::new_v4().to_string();
    let client_id_clone = client_id.clone();

    // Register client
    {
        let mut clients = state.clients.write().await;
        clients.insert(client_id.clone(), "connected".to_string());
        info!("✅ Client connected: {} (total: {})", client_id, clients.len());
    }

    let (mut sender, mut receiver) = socket.split();

    // Subscribe to broadcast channel
    let mut rx = state.tx.subscribe();

    // Send welcome message
    let welcome = serde_json::json!({
        "event": "connected",
        "data": { "clientId": client_id, "message": "Connected to Lepotilnica real-time server" }
    });
    let _ = sender.send(Message::Text(welcome.to_string().into())).await;

    // Spawn task: forward broadcast messages → WebSocket client
    let send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if sender.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    });

    // Spawn task: read from WebSocket client (mainly for ping/pong and keepalive)
    let state_clone = state.clone();
    let recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Text(text) => {
                    // Clients can send ping messages
                    if text.as_str() == "ping" {
                        // No-op, connection stays alive
                    }
                }
                Message::Close(_) => break,
                _ => {}
            }
        }

        // Client disconnected — clean up
        let mut clients = state_clone.clients.write().await;
        clients.remove(&client_id_clone);
        info!(
            "❌ Client disconnected: {} (remaining: {})",
            client_id_clone,
            clients.len()
        );
    });

    // Wait for either task to finish (means client disconnected)
    tokio::select! {
        _ = send_task => {},
        _ = recv_task => {},
    }
}
