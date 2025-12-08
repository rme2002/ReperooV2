# Starting a New App from the Template

Use this guide whenever you want to spin up a standalone app repo from `starter-mono` while keeping a clean path to pull upstream template updates.

## 1. Clone the template into a fresh directory

```bash
git clone git@github.com:you/starter-mono.git my-new-app
cd my-new-app
```

Replace `my-new-app` with whatever you want your destination folder to be called.

## 2. Check out the app branch you want to base from

```bash
git checkout app/<app-name>
```

For example, `git checkout app/reservations`. Your working folder now matches that app.

## 3. Keep the template remote handy

Rename the current `origin` so it becomes `upstream`, which will continue to point at `starter-mono`.

```bash
git remote rename origin upstream
```

## 4. Create the new empty repo

Set up the new GitHub repo (e.g., `git@github.com:you/new-app.git`). Do **not** initialize it with any files.

## 5. Add the new repo as `origin`

```bash
git remote add origin git@github.com:you/new-app.git
```

## 6. Push the branch to the new repo

Option A — rename the branch to `main` on push (recommended):

```bash
git push -u origin app/<app-name>:main
```

Option B — keep the existing branch name:

```bash
git push -u origin app/<app-name>
```

Either way, the new repo now owns that branch with full history preserved.

## 7. Staying in sync with the template

Whenever you need updates from `starter-mono`, fetch and merge (or rebase) from `upstream`:

```bash
git fetch upstream
git merge upstream/main
# or
git rebase upstream/main
```

That keeps your app current with future template fixes and tooling improvements without sacrificing its independence.
