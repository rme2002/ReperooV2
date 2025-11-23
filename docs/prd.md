# Court Reservation Platform — Product Requirements Document (PRD)

> **Idea Context:** Provide a generic reservation platform where facilities publish any reservable resource (courts, studios, rooms, etc.) and players book/pay via GCash proof. Runs on the shared FastAPI + Expo + Next.js + Supabase stack.

## 1. Product Overview

A cross-platform application that lets facilities publish their courts/resources, manage availability, and approve reservations, while players discover venues, reserve 1-hour slots, upload GCash payment proofs, and manage bookings. The platform is intentionally generic so facilities can list any resource (pickleball courts, tennis courts, badminton courts, studios, rooms, or other spaces).

### Tech Stack Alignment

- **Backend:** FastAPI REST API over Supabase Postgres + Storage
- **Web:** Next.js app with `/app` (player) and `/backoffice` (facility)
- **Mobile:** Expo app mirroring player flows
- **Auth/Storage:** Supabase Auth, Row-Level Security, Storage buckets

## 2. Target Users

### 2.1 Facility Administrators (Businesses)

- Publish and maintain business, location, and resource profiles
- Control availability via blocked hours and activation toggles
- Review reservations, inspect payment proofs, and confirm/reject bookings

### 2.2 Players (Consumers)

- Discover venues, browse resources, and view real-time pricing
- Reserve 1-hour slots, upload GCash payment proofs, and track reservation status
- Manage upcoming/past reservations, cancel when allowed, and view proof history

## 3. Customer Journeys

### 3.1 Facility Administrator Journey
1. **Sign Up & Business Creation** — Admin authenticates via Supabase Auth and provides business profile details plus payout/Gcash info.
2. **Location + Resource Setup** — Adds locations with address + photos, then creates courts/resources per location including pricing and availability.
3. **Publish Availability** — Sets default hours, blocks exceptions, and toggles resources to “active” once ready for bookings.
4. **Monitor Reservations** — Uses `/backoffice` dashboard to review daily reservations, inspect payment proofs, and confirm/reject within SLA.
5. **Manage Operations** — Adjusts pricing, blocks hours for maintenance, exports reservation reports, and communicates with players if issues arise.

### 3.2 Player Journey
1. **Discover Venues** — Browses `/app` home, applies filters/search, and opens venue detail pages to compare offerings.
2. **Select Slot** — Chooses resource/date, views hourly grid, and taps an available slot triggering backend validation + 15-minute lock.
3. **Pay & Upload Proof** — Sends GCash payment manually, snaps/upload proof to move reservation to `awaiting_confirmation`.
4. **Receive Confirmation** — Gets push/email once facility confirms; sees booking in upcoming list with QR/ID for check-in.
5. **Manage Booking** — Can cancel before cutoff, re-upload proof if needed, and review past reservations/history for reference.

## 4. Monetization Strategy

- **Facility Subscription:** Monthly fee per active facility to access the backoffice (tiered by number of locations/resources).
- **Transaction Fee:** Platform takes a flat 5% fee on each confirmed reservation (deducted from facility payout or passed to player as service fee).
- **Add-on Services:** Optional premium analytics or white-labeling offered as future upsells.

## 5. Core Flows

### 5.1 Facility Backoffice (`/backoffice`)

1. **Business Profile Setup**
   - Fields: name, description, logo, contact number, GCash QR/info
   - Actions: view/update profile
   - Auth/Storage: web app sends Supabase bearer token with every `/businesses*` request; backend handles all Supabase Storage uploads on behalf of the client
2. **Locations Management**
   - Fields: name, address, lat/lng, optional photo
   - Actions: create/edit/delete locations
3. **Resource (Court) Management**
   - Fields: name, location ID, price/hour, photos, `is_active`
   - Actions: create/edit/delete/activate/deactivate
4. **Blocked Hours**
   - Fields: court_id, start_time, end_time, reason (optional)
   - Actions: add/remove blocked time; blocked slots hidden/disabled for players
5. **Reservation Management**
   - States: `pending_payment`, `awaiting_confirmation`, `confirmed`, `rejected`, `cancelled`, `expired`
   - Actions: view daily reservations, inspect payment proof, confirm/reject
   - Notifications: push/email to players on status changes

### 5.2 Player Experience (`/app` on web + Expo mobile)

1. **Venue Discovery**
   - Filters: location, keyword search
   - Venue card: facility name, address, resource count, price range, photos
2. **Availability & Slot Browser**
   - Player selects location → resource → date
   - Shows 1-hour slots; disables past, blocked, or reserved times
3. **Reservation Creation + 15-Minute Lock**
   - Reserve slot → backend validates → creates reservation with `status = pending_payment` and `expires_at = now() + 15m`
   - Slot is locked until payment proof upload or expiration
4. **Upload GCash Payment Proof**
   - Field: `payment_proof_url`
   - Actions: upload proof (status → `awaiting_confirmation`) or cancel if still pending
5. **Reservation Management**
   - View upcoming/past reservations, statuses, proofs, and details; cancel when permitted

## 6. Non-Functional Requirements

- **Performance:** Slot browsing < 400 ms; index heavy queries (court/date/location).
- **Security:** Role-based routing (`/app` vs `/backoffice`), Supabase RLS ensures facilities only manage owned data.
- **Reliability:** Constraints prevent double-booking; scheduled job expires reservations after `expires_at`.
- **Scalability:** Support multiple facilities, locations, and resources; generic resource definitions allow other industries.

## 7. Data Schema Reference

The Supabase schema, constraints, and SQL migrations are documented in `reservations/schema.md`. This PRD focuses on product behavior; refer to that file when applying database changes.

## 8. API Endpoints (High-Level)

### Player

- `GET /venues`
- `GET /locations/:id/courts`
- `GET /courts/:id/slots?date=YYYY-MM-DD`
- `POST /reservations`
- `POST /reservations/:id/payment-proof`
- `PATCH /reservations/:id/cancel`
- `GET /me/reservations`

### Facility Backoffice

- `POST /businesses`
- `PATCH /businesses/:id`
- `POST /locations`
- `PATCH /locations/:id`
- `POST /courts`
- `PATCH /courts/:id`
- `POST /courts/:id/block`
- `DELETE /blocked_hours/:id`
- `GET /reservations?location_id=…&date=YYYY-MM-DD`
- `PATCH /reservations/:id/confirm`
- `PATCH /reservations/:id/reject`

## 9. Reservation State Machine

- `pending_payment → awaiting_confirmation` (player uploads payment proof)
- `pending_payment → cancelled` (player cancels before payment)
- `pending_payment → expired` (system job after `expires_at`)
- `awaiting_confirmation → confirmed` (facility approves)
- `awaiting_confirmation → rejected` (facility rejects)
- `awaiting_confirmation → cancelled` (player cancels before decision)
- `confirmed` = final state (future scope for refunds/cancellations)

## 10. App Structure (Next.js + Expo)

- **Player Area (`/app`):** Home/upcoming reservations, venues list, venue detail/courts, court slots, reservations list/detail.
- **Backoffice (`/backoffice`):** Dashboard, locations list/detail, courts list/detail, blocked hours per court, reservations approval table.
- **Role Routing:** Middleware checks Supabase session + role; non-admins hitting `/backoffice` redirect to `/app`, while facility admins may access both (product decision).
- **Mobile:** Expo consumes same APIs, mirroring `/app` flows with native navigation.

## 11. Future Enhancements

- Direct GCash API integration for real payments
- Dynamic pricing rules (peak/off-peak, membership discounts)
- Equipment rental add-ons
- Memberships, packages, matchmaking/events
- Advanced analytics dashboards and white-labeling
- Automated refunds/cancellation policies and multi-sport tagging

## 12. MVP Status

Ready to implement using the shared FastAPI backend, Supabase schema, Next.js web app, and Expo mobile client following this PRD.
