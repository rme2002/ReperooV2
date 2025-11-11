# 🧩 Monorepo Starter Template

This repository contains a full-stack **monorepo** setup for modern web, mobile, and backend development.  

---

## 📂 Project Structure

```
/apps
  /web          → Next.js web app
  /mobile       → Expo / React Native app
  /api          → FastAPI backend
/packages
  /openapi      → OpenAPI spec (source of truth)
docker-compose.yml
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-------------|
| Web | Next.js + TypeScript |
| Mobile | Expo / React Native |
| Backend | FastAPI |
| Contracts | OpenAPI 3.x |
| Codegen | datamodel-codegen, openapi |
| Tooling | Docker, GCP, Vercel |

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/rjaay23/starter-mono.git
cd starter-mono
```

### 2. Requirements

Make sure you have the following installed:

| Tool | Recommended Version | Notes |
|------|----------------------|-------|
| **Node.js** | ≥ 20.x | Used for the web and mobile apps |
| **Python** | ≥ 3.13 | Used for the FastAPI backend |
| **uv** | latest | Fast dependency manager for Python |
| **Docker** | latest | For local development and container builds |

---

## 🐳 Local Development (Docker)

Start shared backend services (FastAPI, DBs, etc.) via Docker:

```bash
docker compose up --build        # API on http://localhost:8080
docker compose up api           # Only the API service
docker compose down             # Stop/remove containers
```

Run the web + mobile apps natively for the best hot-reload experience:

```bash
# Web (Next.js)
cd apps/web && npm install && npm run dev

# Mobile (Expo / iOS example)
cd apps/mobile && npm install && npx expo run:ios
```

Need everything at once? The Makefile bundles the workflow (Docker API + local web + local mobile) and tears it all down with a single Ctrl+C:

```bash
make dev

# Variations
make dev-web      # API + Web only
make dev-mobile   # API + Mobile only
```

> **Ports:**
> - API → [http://localhost:8080](http://localhost:8080)
> - Web → [http://localhost:3000](http://localhost:3000) when run manually
> - Expo Dev Server → 19000 / 19001 / 19002 (when you run Metro locally)

---

## 🧱 Folder Conventions

| Path | Description |
|------|--------------|
| `/apps/web` | Next.js web frontend (deployed to Vercel) |
| `/apps/mobile` | Expo / React Native mobile app (runs locally outside Docker) |
| `/apps/api` | FastAPI backend (deployed to Cloud Run) |
| `/packages/openapi` | OpenAPI spec (source of truth for all apps) |
| `docker-compose.yml` | Unified local environment setup |

---

## 🧪 Testing & CI/CD

- **GitHub Actions** runs tests, type-checks, and builds per app.
- Each app runs its own OpenAPI type generation before build.
- **Cloud Build** handles backend deployments to Google Cloud Run.
- **Vercel** handles frontend deployments from the `main` branch.
- Deploys are independent — only contracts need to stay in sync.

---

## 🧰 Useful Commands

| Command | Description |
|----------|-------------|
| `make dev` | Start Docker API + local web + local mobile (auto cleanup) |
| `make dev-web` | Start Docker API + local web only |
| `make dev-mobile` | Start Docker API + local mobile only |
| `docker compose up --build` | Start backend services (API) |
| `docker compose up api` | Start only the API service |
| `docker compose down` | Stop/remove backend containers |
| `cd apps/web && npm run dev` | Run the web app locally |
| `cd apps/mobile && npx expo run:ios` | Run the mobile app locally |
