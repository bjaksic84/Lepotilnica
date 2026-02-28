# ✨ Lepotilnica by Karin

**A full-stack beauty salon booking & management platform**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Rust](https://img.shields.io/badge/Rust-WebSocket-DEA584?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Turso](https://img.shields.io/badge/Turso-SQLite-4FF8D2?logo=turso&logoColor=white)](https://turso.tech/)

Customers can browse services, book appointments online, and manage cancellations — while the salon owner gets a real-time admin dashboard with analytics, customer logs, and complete booking control.

> **Live:** [lepotilnica.si](https://lepotilnica.si)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Scripts](#available-scripts)
- [Database](#database-migrations)
- [SEO & Discoverability](#seo--discoverability)
- [Deployment](#deployment)
- [License](#license)

---

## Features

### 🪞 Customer-Facing

- **Service catalogue** — Browse services organised by category with pricing, duration, and descriptions
- **Online booking** — Interactive calendar with real-time availability, time-slot selection, and instant confirmation
- **Email confirmations** — Automated booking confirmation and cancellation emails via Resend
- **Token-based cancellation** — Customers can cancel bookings through a secure link in their email
- **Responsive design** — Fully mobile-friendly with smooth page transitions and animations

### 🔐 Admin Dashboard

- **Weekly calendar view** — Visual timetable showing all bookings and blocked time slots; drag to block time
- **Booking management** — Confirm, cancel, or delete bookings; view full customer details per booking
- **Service & category management** — Full CRUD for services and categories from a dedicated admin page
- **Analytics** — Revenue tracking, booking trends, top services, peak hours, customer breakdowns, daily revenue chart, and loyal customer identification
- **No-show tracking** — Record no-shows per customer; automatic blacklisting after 2 strikes
- **Customer logs** — Complete customer directory keyed by email; view booking notes and add/delete admin notes (useful for treatments, allergies, preferences)
- **Real-time updates** — All admin views update instantly via WebSocket when bookings are created, modified, or cancelled
- **Rate limiting** — API-level protection against abuse

### 🔍 SEO & Discoverability

- **Dynamic sitemap** (`/sitemap.xml`) — Auto-generated from all public routes
- **robots.txt** — Proper crawling rules; admin and API routes excluded
- **JSON-LD structured data** — `BeautySalon`, `WebSite`, `BreadcrumbList`, and `FAQPage` schemas
- **Open Graph & Twitter cards** — Rich previews on social media and messaging apps
- **Web app manifest** — PWA-ready metadata for mobile install prompts
- **Slovenian + international keywords** — Bilingual meta tags targeting local and English searches
- **Canonical URLs & hreflang** — Proper duplicate-content prevention and locale signals

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
| **WebSocket Server** | Rust ([axum](https://github.com/tokio-rs/axum) + [tokio](https://tokio.rs/)) — see [`ws-server/`](ws-server/) |
| **State Management** | [Zustand](https://zustand.docs.pmnd.rs/) |
| **Validation** | [Zod](https://zod.dev/) |
| **Deployment** | [Vercel](https://vercel.com/) (web) · [Shuttle](https://www.shuttle.dev/) / Docker (WebSocket server) |

---

## Architecture

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│              │  HTTP  │                  │  SQL   │              │
│   Browser    │◄──────►│   Next.js App    │◄──────►│  Turso DB    │
│  (React 19)  │       │  (Vercel Edge)   │       │  (libSQL)    │
│              │       │                  │       │              │
└──────┬───────┘       └────────┬─────────┘       └──────────────┘
       │                        │
       │  WebSocket             │  HTTP broadcast
       │                        │
       ▼                        ▼
┌──────────────────────────────────────────┐
│         Rust WebSocket Server            │
│       (axum · tokio · Shuttle)           │
└──────────────────────────────────────────┘
```

The Next.js app handles all HTTP requests, API routes, and server-side rendering. When a booking is created or modified, the API broadcasts an event to the Rust WebSocket server, which fans it out to all connected admin dashboard clients in real time.

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
| `TURSO_DATABASE_URL` | Turso database URL (`libsql://...turso.io`) |
| `TURSO_AUTH_TOKEN` | Auth token from `turso db tokens create <db>` |
| `ADMIN_PASSWORD` | Password for the admin login page |
| `NEXT_PUBLIC_BASE_URL` | Public site URL (e.g. `https://lepotilnica.si`) |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL (e.g. `wss://ws.lepotilnica.si/ws`) |
| `WS_BROADCAST_URL` | Broadcast endpoint (e.g. `https://ws.lepotilnica.si/broadcast`) |
| `RESEND_API_KEY` | [Resend](https://resend.com/) API key for transactional emails |

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

## SEO & Discoverability

The app ships with production-ready SEO out of the box:

| File | Purpose |
|---|---|
| `src/app/sitemap.ts` | Dynamic XML sitemap at `/sitemap.xml` |
| `src/app/robots.ts` | Crawler rules at `/robots.txt` |
| `src/app/manifest.ts` | Web app manifest at `/manifest.webmanifest` |
| `src/app/layout.tsx` | Global metadata, Open Graph, JSON-LD schemas |

**Structured data** includes four JSON-LD schemas injected on every page:

1. `BeautySalon` — local business info, hours, location, service catalog
2. `WebSite` — site identity and language
3. `BreadcrumbList` — navigation hierarchy
4. `FAQPage` — common questions in Slovenian (rich snippet eligible)

**After deploying**, complete these external steps:

1. **Google Search Console** — verify domain and submit `/sitemap.xml`
2. **Google Business Profile** — claim the listing for Maps & local search
3. **Directory listings** — register on Bizi.si, Najdi.si, and beauty directories

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

Private project — all rights reserved.

Built with ❤️ in Ljubljana.
