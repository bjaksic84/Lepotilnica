# Lepotilnica — Beauty Salon Booking Platform

A full-stack appointment booking and business management platform built for **Lepotilnica**, a beauty salon. Customers can browse services, book appointments online, and manage cancellations — while the salon owner gets a real-time admin dashboard with analytics, customer logs, and complete booking control.
Links available:
- https://lepotilnica.vercel.app/
---

## Features

### Customer-Facing

- **Service catalogue** — Browse services organised by category with pricing, duration, and descriptions
- **Online booking** — Interactive calendar with real-time availability, time-slot selection, and instant confirmation
- **Email confirmations** — Automated booking confirmation and cancellation emails via Resend
- **Token-based cancellation** — Customers can cancel bookings through a secure link in their email
- **Responsive design** — Fully mobile-friendly with smooth page transitions and animations

### Admin Dashboard

- **Weekly calendar view** — Visual timetable showing all bookings and blocked time slots; drag to block time
- **Booking management** — Confirm, cancel, or delete bookings; view full customer details per booking
- **Service & category management** — Full CRUD for services and categories from a dedicated admin page
- **Analytics** — Revenue tracking, booking trends, top services, peak hours, customer breakdowns, daily revenue chart, and loyal customer identification
- **No-show tracking** — Record no-shows per customer; automatic blacklisting after 2 strikes
- **Customer logs** — Complete customer directory keyed by email; view all booking notes a customer has ever left, and add/delete your own admin notes (useful for custom treatments, allergies, preferences)
- **Real-time updates** — All admin views update instantly via WebSocket when bookings are created, modified, or cancelled
- **Rate limiting** — API-level protection against abuse

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, React 19, React Compiler) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS 3 |
| **Animations** | Framer Motion |
| **Database** | [Turso](https://turso.tech/) (libSQL — SQLite on the edge) |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) |
| **Email** | [Resend](https://resend.com/) |
| **WebSocket Server** | Rust (axum + tokio) — see [`ws-server/`](ws-server/) |
| **State Management** | Zustand |
| **Validation** | Zod |
| **Deployment** | Vercel (web) · Shuttle / Docker (WebSocket server) |

---

## Project Structure

```
├── src/
│   ├── app/                  # Next.js App Router pages & API routes
│   │   ├── admin/            # Admin dashboard, services, logs
│   │   ├── api/              # REST API (bookings, services, auth, etc.)
│   │   ├── book/             # Customer booking page
│   │   ├── cancel/           # Token-based cancellation page
│   │   └── services/         # Public service catalogue
│   ├── components/           # Shared React components
│   ├── db/                   # Drizzle schema, DB client, migration scripts
│   ├── lib/                  # Utilities (email, rate-limit, schedule, WS, validators)
│   ├── store/                # Zustand stores
│   └── types/                # Shared TypeScript types
├── ws-server/                # Rust WebSocket server (axum)
├── drizzle/                  # SQL migration files
├── public/                   # Static assets
└── drizzle.config.ts         # Drizzle Kit configuration
```

---

## Prerequisites

- **Node.js** 18+ (20+ recommended)
- **npm** (or pnpm / yarn)
- **Rust** 1.75+ (only if running the WebSocket server locally)
- A [Turso](https://turso.tech/) database
- A [Resend](https://resend.com/) API key (for emails)

---

## Getting Started

### 1. Clone & install

```bash
git clone <your-repo-url>
cd Lepotilnica
npm install
```

### 2. Environment variables

Copy the example and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `TURSO_DATABASE_URL` | Your Turso database URL (`libsql://...turso.io`) |
| `TURSO_AUTH_TOKEN` | Auth token from `turso db tokens create <name>` |
| `ADMIN_PASSWORD` | Password for the admin login page |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL (e.g. `ws://localhost:8000/ws`) |
| `WS_BROADCAST_URL` | Broadcast endpoint (e.g. `http://localhost:8000/broadcast`) |

### 3. Push the database schema

```bash
npx drizzle-kit push
```

Or run individual migration scripts if needed:

```bash
npx tsx src/db/migrate-cancellation-token.ts
npx tsx src/db/migrate-customer-notes.ts
```

### 4. Start the WebSocket server

```bash
cd ws-server
cargo run
```

The server starts on `http://localhost:8000`.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Or run both at once:

```bash
npm run dev:all
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js development server |
| `npm run dev:ws` | Start the Rust WebSocket server |
| `npm run dev:all` | Start both servers simultaneously |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Database Migrations

Managed with [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview). Migration files live in `drizzle/`.

```bash
# Push schema changes directly to the database
npx drizzle-kit push

# Generate a new migration file from schema changes
npx drizzle-kit generate

# Open Drizzle Studio (database browser)
npx drizzle-kit studio
```

---

## Deployment

### Web (Vercel)

The Next.js app deploys to [Vercel](https://vercel.com/) with zero configuration. Set the environment variables in your Vercel project settings.

### WebSocket Server

The Rust WebSocket server can be deployed via:

- **[Shuttle](https://www.shuttle.dev/)** — `cd ws-server && cargo shuttle deploy`
- **Docker** — a `Dockerfile` is provided in `ws-server/`

Update `NEXT_PUBLIC_WS_URL` and `WS_BROADCAST_URL` in production to point to the deployed WebSocket server.

---

## License

Private project. All rights reserved.
