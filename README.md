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

Start all apps locally:

```bash
docker compose up --build
```

Run API only:

```bash
docker compose up api
```

Stop all containers:

```bash
docker compose down
```

> **Ports:**
> - API → [http://localhost:8080](http://localhost:8080)
> - Web → [http://localhost:3000](http://localhost:3000)
> - (Optional) Expo Mobile → 19000 / 19006 (via profile `mobile`)

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
| `docker compose up --build` | Start API + Web locally + build |
| `docker compose up` | Start API + Web locally |
| `docker compose up api` | Start only backend |
| `cd apps/web && npm run dev` | Run the web app locally |
| `cd apps/mobile && npx expo run:ios` | Run the mobile app locally |
