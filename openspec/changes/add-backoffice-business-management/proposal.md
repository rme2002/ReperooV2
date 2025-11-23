# Change Proposal: add-backoffice-business-management

## Why
Facility administrators currently cannot create or update their business profile inside the `/backoffice` app, blocking downstream flows (locations, courts, reservation approvals) that depend on a fully populated business record. The PRD (docs/prd.md §§5.1.1) and schema (docs/schema.md §§businesses) already define the required fields, but the capability has not been specced or implemented. We need a guided workflow so a newly-onboarded admin can capture basic facility details (name, description, logo/contact info, payout QR) and edit them later without touching Supabase directly.

## Requirements
- Facility admins must be able to create a business profile the first time they open `/backoffice` after sign-in.
- Facility admins must be able to edit business details (name, description, contact number, logo, payout/GCash QR) from `/backoffice` at any time.
- Multiple facility admins may manage the same business record; ownership is tracked through a join table (e.g., `business_admins`) instead of tying `businesses.id` directly to `auth.users.id`.
- Business data must persist to the `businesses` table defined in docs/schema.md, and access must be scoped through the authenticated admin’s membership.
- Web forms should surface validation for required fields and upload progress/errors for media inputs.

## Proposed Changes

### API / Contract
- Add `POST /businesses` and `PATCH /businesses/{businessId}` endpoints under `/api/v1`.
  - Request/response schemas align with `businesses` columns: `name`, `description`, `logoUrl`, `contactNumber`, `gcashQrUrl`.
  - Automatically associate the creating user as an admin (owner) in `business_admins` so future admins can coexist.
- Add `GET /businesses/me` (or equivalent) so the backoffice can detect whether the authenticated user already belongs to a business and fetch their primary record.
- Every endpoint requires a Supabase access token carried via the `Authorization: Bearer <token>` header; Orval clients must inject the session token on each request.
- Extend OpenAPI spec plus generated models/clients to expose these endpoints to web/mobile surfaces (mobile can ignore for now but stays type-safe).

### Backend Implementation (FastAPI)
- Router + service layer that reads the authenticated Supabase user (service role) and upserts records into Supabase `businesses` table.
- Validation rules: `name` + `contact_number` required; `description` optional; `logo_url` + `gcash_qr_url` stored as public URLs after upload to Supabase Storage.
- Provide backend helpers/endpoints for handling logo/QR uploads so the frontend only streams files to FastAPI; the API then interacts with Supabase Storage using service credentials.
- Error responses for duplicate creation (409) or editing without ownership (403/404).

### Web Backoffice UI
- Gated onboarding step: if `GET /businesses/me` (or `supabase` row) is empty, show the “Create business” form before revealing other backoffice modules.
- Main “Business Profile” page allowing edits, preview of uploaded logo/QR, and success/error toasts.
- Configure the Orval-generated clients (or fetch wrappers) to inject the Supabase access token in the `Authorization` header for all `/businesses*` calls.
- File uploads go through backend endpoints (no direct Supabase Storage access from the browser); the UI just surfaces progress and uses the returned URLs from the API responses.

### Data / Storage
- Decouple `businesses.id` from `auth.users.id`; generate UUIDs server-side and introduce a `business_admins` table that links `business_id` ↔ `user_id` with role metadata (owner vs admin).
- Ensure FastAPI services always query/update businesses through the membership table so multiple admins can collaborate safely.
- All Supabase Storage interactions originate from the backend (service role); client apps never call Storage directly. The frontend receives pre-signed upload URLs or posts files to backend handlers, which then stash the resulting public URLs back into the business payload.

## Non-Goals / Out of Scope
- Location/resource CRUD and reservation workflows (handled by other changes).
- Player-facing business visibility (handled separately via venue discovery stories).
- Advanced branding (color palettes, social links) beyond the schema fields already defined.
- Automated invitation/onboarding flows for additional admins; current users manage business membership through existing mechanisms.

## Risks & Open Questions
1. Multi-admin membership requires new schema + RLS rules (`business_admins`). We must coordinate migrations to avoid downgrading existing single-admin data.
2. Supabase Storage bucket/ACL decisions sit outside this change; we assume the `business-assets` bucket exists and surface configuration toggles if needed.
3. This flow is only for already-authenticated facility users; invitations or user provisioning live in a separate change if/when prioritized.

## Dependencies
- Supabase Storage configured for logo/QR uploads.
- Existing Supabase auth middleware in Next.js to surface the current user in `/backoffice`.
