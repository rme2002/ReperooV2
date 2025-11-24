# Reusable Prompts for MVP Planning

Use these prompts to quickly generate an MVP plan similar to `docs/mvp-plan.md` in any project with standardized paths.

## Prompt — Generate MVP Plan for Any Repo

Copy/paste and use as-is:

"""
You are a coding assistant working in Codex CLI on a repository.

Context
- PRD: docs/prd.md
- Schema: docs/schema.md
- OpenAPI: packages/openapi/api.yaml
- OpenSpec guide (if present): openspec/AGENTS.md

Task
- Read the PRD and schema and infer the smallest set of incremental features required to reach the first MVP (aim for 8–12 features) aligned with the PRD.
- Produce a single markdown output that I can save as docs/mvp-plan.md.
- Follow this structure per feature:
  - Scope (1–2 lines)
  - DB note (existing table(s) or new) referencing docs/schema.md
  - OpenAPI edit prompt (concrete endpoints + schemas to add or adjust)
  - Generate prompt (how to regenerate clients/models)
  - OpenSpec proposal prompt (if OpenSpec exists), otherwise a short checklist
  - Implement prompt (backend + minimal UI)
  - Quick test notes (curl/UX)
  - Close/Archive prompt (if OpenSpec exists)
- Also include a top section describing the per-feature loop and reusable micro-prompts I can copy for each step.

Conventions
- Use camelCase for payload properties and createdAt/updatedAt for timestamps.
- Date-times are RFC3339/UTC. UUIDs typed as string with format: uuid in OpenAPI.
- Keep each change small and focused; avoid breaking existing endpoints.
- Assume ownership/authorization checks are enforced consistently (e.g., via memberships/RLS) and call that out in prompts.

Output
- A clear, concise docs/mvp-plan.md content with:
  - Reusable micro-prompts for: OpenAPI edit, generate, DB, OpenSpec proposal, implement, close.
  - A numbered list of MVP features, each with copy-ready prompts.
- Do not run commands or modify files; just produce the markdown content.
"""

## Per-Feature Micro‑Prompts (Generic)

- OpenAPI edit
  - “Edit packages/openapi/api.yaml to add [feature endpoints/models] exactly as described. Keep naming consistent (camelCase, createdAt/updatedAt, RFC3339 date‑time). Avoid breaking changes.”

- Generate
  - “Run make generate-api to regenerate FastAPI models and the web/mobile clients.”

- Database
  - “Apply the SQL for [tables/indexes] from docs/schema.md (or confirm they already exist). Avoid triggers unless explicitly required.”

- OpenSpec proposal
  - “Create an OpenSpec change [change-id]. Add ## ADDED Requirements with at least one #### Scenario: per requirement. Include tasks.md with backend + minimal UI tasks. Validate with openspec validate [change-id] --strict.”

- Implement
  - “Implement the approved change: backend routes/services/repos with authorization/ownership checks, and minimal web UI. Keep the diff small and focused.”

- Close change
  - “Archive the change with openspec archive [change-id] --yes after verification.”

## Minimal Variant (Non‑OpenSpec Projects)

"""
Read docs/prd.md and docs/schema.md. Generate a concise MVP plan (8–12 features). For each feature, provide: scope, DB note, exact OpenAPI edits, a short implementation checklist (backend + UI), and quick test notes. Output only a markdown document I can save as docs/mvp-plan.md. Keep changes incremental and non‑breaking.
"""

## Tips

- Paths are standardized across projects. If any file is missing, ask to locate equivalents (e.g., README.md, api.yaml, migrations folder).
- When unsure about conventions, mirror the project’s existing patterns and naming.
