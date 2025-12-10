# API (FastAPI + Supabase)

Backend service that powers registration and future workspace APIs. Built with FastAPI 0.116, Supabase, and uvicorn. Dependency management is handled by [`uv`](https://github.com/astral-sh/uv).

---

## Requirements

- Python 3.13
- [`uv`](https://docs.astral.sh/uv/) (recommended over pip/virtualenv)
- Docker (optional, for running via `docker compose`)

Install dependencies:

```bash
cd apps/api
uv sync   # or run `make setup` from the repo root
```

---

## Environment Variables

Create `apps/api/.env` (loaded via `python-dotenv`) with your Supabase service credentials:

```env
SUPABASE_URL=...
SUPABASE_SECRET_API_KEY=...
# Required: async SQLAlchemy DSN (use the Supabase session pooler locally for IPv4/Docker)
DATABASE_URL=postgresql://postgres:<password>@<pooler-host>:6543/postgres
```

> Use the **service role** key on the backend—you never expose this to clients.

### SQLAlchemy database

The service exposes a synchronous [`SQLAlchemy`](https://docs.sqlalchemy.org/en/20/core/engines.html) engine
(`src/core/database.py`) that you can tap into from routes/services:

- Database tables live under `src/db/models/` (pure SQLAlchemy models). Keep request/response Pydantic models in
  `src/models/` and import with aliases when needed, e.g. `from src.db.models import Profile as ProfileDB`.
- Use `Depends(get_session)` inside FastAPI routes (or `session_scope()` in scripts/tests) to obtain a standard
  `Session`. FastAPI will run synchronous DB work in a threadpool when necessary, so async endpoints remain supported.
- `DATABASE_URL` is required; point it at Postgres (or another database supported by SQLAlchemy), e.g.
  `postgresql+psycopg://...`.
- Schema changes should run through Alembic/Supabase migrations in your pipeline (runtime code no longer calls
  `create_all`).

### Supabase schema

Create the `profiles` table (linked to `auth.users`) in your Supabase project before hitting the signup endpoint:

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

The email is already stored on `auth.users`, so this table only needs the user id and timestamps until you’re ready to add custom profile fields.

---

## Running Locally

### With uv (recommended)

```bash
cd apps/api
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8080
```

### With Docker

```bash
docker compose up --build api    # from repo root
# or
docker build -t api:latest apps/api
docker run --rm -p 8080:8080 api:latest
```

The OpenAPI docs are available at [http://localhost:8080/docs](http://localhost:8080/docs).

---

## Development Tasks

| Task | Command |
|------|---------|
| Clean cache / `.venv` | `uv clean` |
| Install deps | `uv sync` |
| Generate Pydantic models from OpenAPI | `uv run datamodel-codegen --input ../../packages/openapi/api.yaml --input-file-type openapi --output src/models/model.py --output-model-type pydantic_v2.BaseModel --target-python-version 3.13` (or `make generate-api`) |
| Lint | `uvx ruff check .` |
| Lint + fix | `uvx ruff check . --fix` |
| Format | `uvx ruff format .` |

> The web (`apps/web`) and mobile (`apps/mobile`) clients consume this same OpenAPI spec via Orval. Run `make generate-api` from the repo root to regenerate the backend models and both client SDKs in one shot.

---

## Deployment Notes

- The provided `Dockerfile` runs `uvicorn` via `uv` (`CMD ["uv", "run", "uvicorn", ...]`).
- Cloud Build / Cloud Run can build directly from this Dockerfile.
- Store secrets (Supabase keys, etc.) in Secret Manager and inject them during the build/deploy phase so the container can scale to zero without extra startup calls.

For the shared contract and consumer implementations, see the root [`README.md`](../../README.md) and the service-specific docs in `apps/web` and `apps/mobile`.
