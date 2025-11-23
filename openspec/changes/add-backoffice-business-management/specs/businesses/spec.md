## ADDED Requirements

### Requirement: Facility admin creates a business profile
Facility administrators must submit their business details (name, description, contact number, logo, GCash QR) the first time they access the backoffice to unlock the rest of the management tools.

#### Scenario: Prompt new admin to create a business
- **GIVEN** an authenticated facility administrator without membership in `business_admins`
- **WHEN** they open `/backoffice`
- **THEN** the web app blocks navigation to other backoffice sections and shows a business creation form that includes the required fields (name, contact number) and optional fields (description, logo, GCash QR)
- **AND** the form prevents submission with inline validation errors until required fields are provided

#### Scenario: Persist business profile via API
- **GIVEN** the admin completes the business form with valid data and uploaded asset URLs
- **WHEN** they submit the form
- **THEN** the web app calls `POST /businesses` with the payload that matches the OpenAPI schema and includes the Supabase access token in the `Authorization` header
- **AND** any file uploads are sent to backend helpers (not directly to Supabase Storage), which return the public URLs applied to the payload
- **AND** the FastAPI endpoint creates a new UUID-backed row in `public.businesses`, associates the authenticated user as an admin (owner) inside `business_admins`, and stores logo/GCash URLs exactly as provided
- **AND** the response returns the saved business representation so the UI can display a confirmation state

### Requirement: Facility admin updates business details
Admins must be able to edit any business field from the backoffice at any time after initial setup.

#### Scenario: Fetch existing business profile for editing
- **GIVEN** an authenticated admin with at least one membership entry in `business_admins`
- **WHEN** they navigate to the “Business Profile” section
- **THEN** the web app loads the latest business data via the generated API client and pre-fills the edit form, including previews for logo and GCash QR assets if URLs exist

#### Scenario: Submit business edits
- **GIVEN** the admin changes one or more fields and optionally replaces uploaded assets
- **WHEN** they submit the edit form
- **THEN** the web app issues `PATCH /businesses/{businessId}` adhering to the OpenAPI contract and includes the Supabase access token in the `Authorization` header
- **AND** replacement files are uploaded through backend helpers that mint new Storage URLs
- **AND** the API validates membership via `business_admins`, updates only the changed fields, refreshes `updated_at`, and returns the new representation
- **AND** the UI reflects the saved data, showing success feedback and keeping the rest of `/backoffice` accessible

### Requirement: Ownership, validation, and auth safeguards
Creation and updates must be restricted to authenticated business admins, enforce the schema rules from docs/schema.md, and consistently pass the Supabase access token to the backend.

#### Scenario: Reject duplicate creation
- **GIVEN** an admin who already belongs to a business attempts to create another via `POST /businesses`
- **WHEN** the request reaches the API
- **THEN** the service responds with a 409 Conflict (or equivalent business error) indicating the user is already assigned to a business and the UI surfaces the error state without duplicating rows

#### Scenario: Prevent cross-business edits
- **GIVEN** an admin attempts to update a business id for which they have no membership
- **WHEN** the API receives the `PATCH /businesses/{businessId}` request (with or without a bearer token)
- **THEN** the service returns 403/404 and does not leak data from other businesses, and the UI shows an authorization error state

#### Scenario: Reject requests missing bearer tokens
- **GIVEN** the web app fails to attach the Supabase access token when calling any `/businesses*` endpoint
- **WHEN** the backend receives the request
- **THEN** it returns 401 Unauthorized and the UI prompts the user to re-authenticate before retrying
