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
SUPABASE_KEY=...
```

> Use the **service role** key on the backend—you never expose this to clients.

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
| Generate Pydantic models from OpenAPI | `uv run datamodel-codegen --input ../../packages/openapi/api.yaml --input-file-type openapi --output src/models/model.py --output-model-type pydantic_v2.BaseModel --target-python-version 3.13` |
| Lint | `uvx ruff check .` |
| Lint + fix | `uvx ruff check . --fix` |
| Format | `uvx ruff format .` |

---

## Deployment Notes

- The provided `Dockerfile` runs `uvicorn` via `uv` (`CMD ["uv", "run", "uvicorn", ...]`).
- Cloud Build / Cloud Run can build directly from this Dockerfile.
- Store secrets (Supabase keys, etc.) in Secret Manager and inject them during the build/deploy phase so the container can scale to zero without extra startup calls.

For the shared contract and consumer implementations, see the root [`README.md`](../../README.md) and the service-specific docs in `apps/web` and `apps/mobile`.
