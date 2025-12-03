# Branching Strategy (Trunk-Based)

This repo follows a trunk-based flow built around a single protected `main` branch. All other branches are short-lived, and deployments are simply “which commit on `main` did we ship?” Keeping `main` releasable at all times—via feature flags or hidden toggles—is the guiding rule.

## Branch Types and Environment Mapping
- **Long-lived**: `main` only. Force PRs + CI before merge.
- **Short-lived**: `feature/*` for new work, `hotfix/*` for urgent fixes.
- **Dev environment**: automatically deploy the latest `main` commit on every push.
- **Prod environment**: deploy a tagged commit (`v*`) taken from `main`. Dev might run `abc1234` while prod stays on `v1.2.0 -> 789def0`.

## Daily Workflow
1. Branch from `main` (`git checkout main && git pull && git checkout -b feature/...`).
2. Build the feature plus migrations.
3. Open a PR to `main`; CI must pass.
4. Merge → CI/CD deploys that commit to dev and applies migrations there.
5. When stable, tag the desired commit (e.g., `git tag -a v1.3.0`) and push the tag to trigger prod deploy. Prod only changes when a new tag is promoted.

## Migrations with Supabase
- Keep migrations as code (e.g., `supabase/migrations/*`). Never edit schemas directly in the UI.
- **In feature branches**: create a migration (`supabase migration new add_sessions_capacity`), fill in SQL, commit alongside code.
- **After merge**: the dev pipeline runs tests, applies migrations to the dev DB (`supabase db push --db-url "$SUPABASE_DB_URL_DEV"`), then deploys.
- **Promotion to prod**: tagging kicks off the prod pipeline, which reruns tests (smoke/quick), applies migrations to prod (`supabase db push --db-url "$SUPABASE_DB_URL_PROD"`), and deploys that exact commit.
- **Safe pattern**: split destructive migrations (add column nullable first, backfill, then enforce constraints) so prod can lag a few commits without breaking.

## Hotfix Flow
- **Ideal path (main is releasable)**:
  - Branch from `main` (`hotfix/fix-...`), implement, PR, merge.
  - Dev auto-deploys head of `main`.
  - Tag the hotfix commit (e.g., `v1.2.1`) so prod deploys only the fix.
- **If main contains unfinished work**:
  - Branch off the prod tag (`git checkout v1.2.0 && git checkout -b hotfix/...`), build the fix, tag + deploy (`v1.2.1`).
  - Immediately merge or cherry-pick that hotfix into `main` so trunk retains the fix.
  - Longer term, rely on feature flags or reverts to keep `main` deployable.

## CI/CD Triggers
```yaml
# Dev (on push to main)
on:
  push:
    branches: [main]

# Prod (on release tag)
on:
  push:
    tags: ["v*"]
```
Each job should checkout code, run tests, apply migrations for the target DB, and deploy to the corresponding environment. Prod jobs can optionally verify the tag is on `main`.

## When This Model Works Best
- Small teams or solo maintainers who want minimal branch clutter.
- Projects comfortable mapping environments to “which commit/tag is deployed”.
- Teams disciplined about feature flags, migration safety, and CI quality so `main` stays releasable.

Stick to these habits and trunk-based development remains simple: develop on short-lived branches, merge only when releasable, let dev follow `main`, and promote specific tags to prod when you’re ready.
