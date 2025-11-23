# Court Reservation Platform — Supabase Schema

This document captures the database layout for the reservation MVP. Keep schema details outside the PRD so product and technical views can evolve independently. MVP rule: **no database triggers**; all lifecycle logic lives in FastAPI services for clarity and maintainability. All UUID primary keys are created in FastAPI before insert (the DB does not auto-generate them).

## 1. Tables & Relationships

### businesses
- `id` (uuid, PK)
- `name`, `description`, `logo_url`, `contact_number`, `gcash_qr_url`
- `created_by` (uuid, FK → `auth.users.id`) optional helper for auditing

### locations
- `id` (uuid, PK)
- `business_id` (uuid, FK → `businesses.id`)
- `name`, `address`, `lat`, `lng`

### courts (generic resources)
- `id` (uuid, PK)
- `location_id` (uuid, FK → `locations.id`)
- `name`, `price_per_hour`, `is_active`

### blocked_hours
- `id` (uuid, PK)
- `court_id` (uuid, FK → `courts.id`)
- `start_time`, `end_time`, `reason`

### reservations
- `id` (uuid, PK)
- `player_id` (uuid, FK → `auth.users.id`)
- `court_id` (uuid, FK → `courts.id`)
- `start_time`, `end_time`, `status`, `payment_proof_url`, `expires_at`
- Partial unique index to prevent double-booking for pending/awaiting/confirmed states

### business_admins
- `business_id` (uuid, FK → `businesses.id` on delete cascade)
- `user_id` (uuid, FK → `auth.users.id`)
- `role` (text, `owner` or `admin`)
- `created_at`
- Composite PK `(business_id, user_id)` and unique constraint on `user_id` to keep one-business-per-user for now

## 2. SQL Migration

Run the following SQL (in Supabase SQL editor or via migration files). Adjust schema name if needed; defaults assume `public`. Every UUID is generated in FastAPI before inserting, so the database does not assign IDs automatically.

```sql
create table if not exists public.businesses (
  id uuid primary key,
  name text not null,
  description text,
  logo_url text,
  contact_number text,
  gcash_qr_url text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.locations (
  id uuid primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courts (
  id uuid primary key,
  location_id uuid not null references public.locations (id) on delete cascade,
  name text not null,
  price_per_hour numeric(10,2) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blocked_hours (
  id uuid primary key,
  court_id uuid not null references public.courts (id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.reservations (
  id uuid primary key,
  player_id uuid not null references auth.users (id),
  court_id uuid not null references public.courts (id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null check (status in ('pending_payment','awaiting_confirmation','confirmed','rejected','cancelled','expired')),
  payment_proof_url text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists reservations_court_start_unique
  on public.reservations (court_id, start_time)
  where status in ('pending_payment','awaiting_confirmation','confirmed'); -- prevents double-booking active slots

create table if not exists public.business_admins (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner','admin')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id),
  unique (user_id)
);
```

## 3. Notes

- Use Supabase Row-Level Security (RLS) to ensure facilities only access their own businesses, locations, courts, and reservations.
- Keep schema edits in this file and mirror them via migration scripts for reproducibility.
- As per WoW, avoid triggers/jobs unless a future iteration explicitly justifies them; rely on FastAPI background tasks or cron jobs for time-based transitions (e.g., expiring reservations).
