# Lepotilnica WebSocket Server (Rust)

A high-performance real-time WebSocket server built with Rust (axum + tokio) for the Lepotilnica beauty salon admin dashboard.

## Prerequisites

- [Rust](https://rustup.rs/) (1.75+ recommended)

## Quick Start

```bash
cd ws-server
cargo run
```

The server starts on `http://localhost:8080` by default.

## Environment Variables

| Variable  | Default | Description                     |
|-----------|---------|---------------------------------|
| `WS_PORT` | `8080`  | Port for the WebSocket server   |

## Endpoints

| Method | Path         | Description                       |
|--------|-------------|-----------------------------------|
| GET    | `/ws`       | WebSocket upgrade endpoint        |
| POST   | `/broadcast`| Push events to all WS clients     |
| GET    | `/health`   | Health check                      |
| GET    | `/stats`    | Connected client count            |

## Event Format

```json
{
    "event": "booking_created",
    "data": { "id": 1, "customerName": "Jane Doe" }
}
```

## Supported Events

- `booking_created`, `booking_updated`, `booking_deleted`
- `blocked_time_created`, `blocked_time_deleted`
- `service_created`, `service_updated`, `service_deleted`
- `category_created`, `category_updated`, `category_deleted`

## Production Build

```bash
cargo build --release
./target/release/lepotilnica-ws
```

## Deploy to Fly.io (recommended)

```bash
# Install flyctl: https://fly.io/docs/flyctl/install/
cd ws-server

# First time — creates the app
fly launch --no-deploy
fly deploy

# After that, just:
fly deploy
```

Once deployed, update your Vercel environment variables:

| Variable             | Value                                       |
|----------------------|---------------------------------------------|
| `NEXT_PUBLIC_WS_URL` | `wss://lepotilnica-ws.fly.dev/ws`          |
| `WS_BROADCAST_URL`   | `https://lepotilnica-ws.fly.dev/broadcast` |
