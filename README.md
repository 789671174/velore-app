# Velore Booking Platform

Next.js 14 App Router project for multi-tenant salon scheduling with Prisma + Postgres, TailwindCSS, shadcn/ui, React Hook Form, Zod, Zustand-ready data stores, and react-day-picker.

## Features

- **Public Booking Flow** `/booking`
  - Form with validation for name, email, optional phone, notes, terms checkbox
  - Date picker and dynamic 15-minute time slots powered by tenant business hours, breaks, and holidays
  - Success toast feedback and automatic reset
- **Entrepreneur Dashboard** `/t/[tenant]/entrepreneur`
  - KPIs (today, week, cancel rate)
  - Calendar + booking list with status controls (pending/confirmed/cancelled)
- **Settings** `/t/[tenant]/entrepreneur/settings`
  - Manage company profile, work days/hours, breaks, holidays
  - Inline validation, dark/light mode ready
- **Multi-Tenant Support** via `/t/[tenant]` prefix and seeded `velora-hairstyles` tenant
- **API** endpoints for settings, holidays, slots, and bookings under `/api/(settings|holidays|slots|booking)` with `tenant` query param
- **Theming** using `next-themes` + shadcn/ui design tokens

## Tech Stack

- Next.js 14 App Router
- TypeScript + React
- Tailwind CSS with shadcn/ui components
- React Hook Form + Zod
- Prisma ORM with PostgreSQL
- Sonner toasts, react-day-picker calendar

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm/yarn
- PostgreSQL database

Create a `.env` file based on `.env.example` with at least:

```
DATABASE_URL="postgresql://user:password@localhost:5432/velore"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

Optional Supabase credentials if you prefer Supabase over a direct Postgres URL:

```
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
```

### Installation

```bash
pnpm install
```

### Database

Run migrations:

```bash
pnpm db:migrate
```

Seed default tenant & data:

```bash
pnpm db:seed
```

### Development

```bash
pnpm dev
```

Visit:

- `http://localhost:3000/booking`
- `http://localhost:3000/t/velora-hairstyles/entrepreneur`
- `http://localhost:3000/t/velora-hairstyles/entrepreneur/settings`

### Quality Checks

```bash
pnpm lint
pnpm tsc
pnpm build
```

## Deployment (Vercel)

1. Configure environment variables (`DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`).
2. Ensure database accessible from Vercel (e.g., Neon, Supabase, Railway).
3. Add `pnpm db:migrate` as migration step or use Prisma migrate deploy.
4. Deploy via Vercel; App Router & Edge ready.

## Screenshots

Generate after running locally (light/dark):

- Booking page
- Dashboard
- Settings

## Notes

- Time slots obey configured hours, breaks, and holidays; past days disabled.
- Booking conflicts prevented server-side.
- Server-rendered data with optimistic client refresh flows prepared for future live updates.
