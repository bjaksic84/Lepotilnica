# Lepotilnica WebSocket Server (Rust)

A high-performance real-time WebSocket server built with Rust (axum + tokio) for the Lepotilnica beauty salon admin dashboard.

## Prerequisites

- [Rust](https://rustup.rs/) (1.75+ recommended)

## Quick Start (local)

```bash
cd ws-server
cargo run
```

The server starts on `http://localhost:8000` by default.

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

## Deploy to Railway (recommended)

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select this repo and set the **Root Directory** to `ws-server`
4. Railway auto-detects the Dockerfile and deploys
5. Go to **Settings** → **Networking** → **Generate Domain** to get your public URL

Once deployed, update your Vercel environment variables:

| Variable             | Value                                                  |
|----------------------|--------------------------------------------------------|
| `NEXT_PUBLIC_WS_URL` | `wss://YOUR-RAILWAY-DOMAIN.up.railway.app/ws`         |
| `WS_BROADCAST_URL`   | `https://YOUR-RAILWAY-DOMAIN.up.railway.app/broadcast`|
