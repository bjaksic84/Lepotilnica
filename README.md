# ✨ Lepotilnica by Karin

**A full-stack beauty salon booking & management platform**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Turso](https://img.shields.io/badge/Turso-SQLite-4FF8D2?logo=turso&logoColor=white)](https://turso.tech/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)

Customers can browse services, book appointments online, and manage cancellations — while the salon owner gets an auto-refreshing admin dashboard with analytics, customer logs, and complete booking control.

> **Live:** [lepotilnicabykarin.si](https://lepotilnicabykarin.si)

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
- **Auto-refreshing views** — The admin dashboard and logs poll for changes on a short interval, so new bookings appear without a manual reload
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
| **State Management** | [Zustand](https://zustand.docs.pmnd.rs/) |
| **Validation** | [Zod](https://zod.dev/) |
| **Deployment** | [Cloudflare Workers](https://workers.cloudflare.com/) via [OpenNext](https://opennext.js.org/cloudflare) |

---

## Architecture

```
┌──────────────┐       ┌──────────────────────┐       ┌──────────────┐
│              │  HTTP  │   Next.js App        │  SQL   │              │
│   Browser    │◄──────►│   on Cloudflare      │◄──────►│  Turso DB    │
│  (React 19)  │       │   Workers (OpenNext) │       │  (libSQL)    │
│              │       │                      │       │              │
└──────────────┘       └──────────────────────┘       └──────────────┘
```

The Next.js app is adapted for Cloudflare Workers with [OpenNext](https://opennext.js.org/cloudflare), serving all HTTP requests, API routes, and server-side rendering from Cloudflare's edge network. The admin dashboard keeps itself current by polling the API on a short interval, so newly created or modified bookings surface without a manual refresh.

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
│   ├── lib/                  # Utilities (site config, email, rate-limit, schedule, validators)
│   ├── store/                # Zustand stores
│   └── types/                # Shared TypeScript types
├── drizzle/                  # SQL migration files
├── public/                   # Static assets (og-image, logo, icons)
├── open-next.config.ts       # OpenNext (Cloudflare) adapter config
├── wrangler.jsonc            # Cloudflare Workers config
└── drizzle.config.ts         # Drizzle Kit configuration
```

---

## Prerequisites

- **Node.js** 18+ (20+ recommended)
- **npm** (or pnpm / yarn)
- A [Turso](https://turso.tech/) database
- A [Resend](https://resend.com/) API key (for emails)
- A [Cloudflare](https://cloudflare.com/) account (for deployment only)

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
| `NEXT_PUBLIC_BASE_URL` | Public site URL — used for SEO, sitemap & email links (e.g. `https://lepotilnicabykarin.si`). Inlined at build time. |
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

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Production build (Next.js) |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run preview` | Build with OpenNext and preview the Workers bundle locally |
| `npm run deploy` | Build with OpenNext and deploy to Cloudflare Workers |
| `npm run cf-typegen` | Generate Cloudflare env type bindings |

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
| `src/lib/site.ts` | Single source of truth for the canonical site URL (used everywhere below) |
| `src/app/sitemap.ts` | XML sitemap at `/sitemap.xml` |
| `src/app/robots.ts` | Crawler rules at `/robots.txt` (admin & API excluded) |
| `src/app/manifest.ts` | Web app manifest at `/manifest.webmanifest` |
| `src/app/layout.tsx` | Global metadata, Open Graph, Twitter cards, `viewport` theme-color, JSON-LD |
| `src/app/services/page.tsx` | Per-service structured data generated from the live catalogue |

**Structured data** — four JSON-LD schemas are injected site-wide, plus two more on the services page:

1. `BeautySalon` — local business info, hours, geo-location, payment, area served
2. `WebSite` — site identity and language
3. `BreadcrumbList` — navigation hierarchy
4. `FAQPage` — common questions in Slovenian (rich-snippet eligible)
5. `OfferCatalog` + `Service` (services page) — every service with its **price in EUR**, built dynamically from the database so it never drifts from what's on screen
6. `BreadcrumbList` (services page) — scoped Domov → Storitve trail

Every page also emits an accurate **canonical URL**, `hreflang` (`sl-SI` + `x-default`), Open Graph and Twitter card metadata with a 1200×630 preview image, and Slovenian + English keywords targeting local search.

**After deploying**, complete these external steps:

1. **Google Search Console** — verify the domain and submit `/sitemap.xml`
2. **Google Business Profile** — claim the listing for Maps & local search
3. **Directory listings** — register on Bizi.si, Najdi.si, and beauty directories

---

## Deployment

### Cloudflare Workers (OpenNext)

The app runs on [Cloudflare Workers](https://workers.cloudflare.com/), adapted from Next.js with the [OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare). Config lives in `open-next.config.ts` and `wrangler.jsonc`.

**One-time setup**

```bash
npx wrangler login
```

**Environment variables** — set the server secrets on the Worker (these are *not* inlined at build time):

```bash
npx wrangler secret put TURSO_DATABASE_URL
npx wrangler secret put TURSO_AUTH_TOKEN
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put RESEND_API_KEY
```

`NEXT_PUBLIC_BASE_URL` is a public, build-time value — set it in the build environment (or rely on the production default baked into `src/lib/site.ts`).

**Preview & deploy**

```bash
npm run preview   # build + run the Workers bundle locally
npm run deploy     # build + deploy to Cloudflare
```

The live deployment is served at **[lepotilnicabykarin.si](https://lepotilnicabykarin.si)**.

---

## License

Private project — all rights reserved.

Built with ❤️ in Ljubljana.
