## Implementation Tasks

1. **Planning & Validation**
   - [ ] Review docs/prd.md §5.1.1 and docs/schema.md §businesses to confirm required fields + constraints, updating the schema doc to reflect decoupled business IDs + the new `business_admins` join table.
   - [ ] Confirm backend-only storage flow: identify the Supabase bucket name + service credentials (frontends never call Storage directly).

2. **Contract Updates**
   - [ ] Update `packages/openapi/api.yaml` with `POST /businesses`, `GET /businesses/me`, and `PATCH /businesses/{businessId}` plus supporting schemas/errors, and ensure the security scheme indicates `Authorization: Bearer <token>` is required.
   - [ ] Regenerate clients/models (`make generate-api`) and commit artifacts for API, web, and mobile.

3. **Backend (FastAPI)**
   - [ ] Add router/service/repository logic for creating/updating the authenticated user’s business, including validation and uniqueness checks.
   - [ ] Provide upload helpers/endpoints that accept files from the UI, push them to Supabase Storage with service-role credentials, and return durable URLs.
   - [ ] Persist uploaded asset URLs and return the latest business representation in responses.
   - [ ] Add tests covering creation, duplicate create rejection, update validation, and unauthorized edits.

4. **Web Backoffice UI**
   - [ ] Gate `/backoffice` behind business creation (wizard or modal) when the current user is missing a business.
   - [ ] Build the “Business Profile” management view with Orval client hooks, form validation, and success/error handling.
   - [ ] Ensure every Orval request to `/businesses*` injects the Supabase session token into the `Authorization` header (e.g., via client middleware).
   - [ ] Integrate file uploads by posting to the new backend helpers (preview + replace) and wire the returned URLs into business API calls—no direct Supabase Storage access from the browser.
   - [ ] Add front-end tests or at minimum Storybook/interaction coverage for the new form (if existing patterns allow).

5. **Verification**
   - [ ] Run `make lint`, `uv run pytest` (API), and `npm run lint` in `apps/web`.
   - [ ] Manually verify the flow end-to-end: new admin signs in → prompted to create business → edits profile → data persists in Supabase.
   - [ ] Update this checklist to reflect completion before requesting review.
