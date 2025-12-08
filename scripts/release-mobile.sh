#!/usr/bin/env bash
set -eo pipefail

ROOT_DIR=$(git rev-parse --show-toplevel)
cd "$ROOT_DIR"

REMOTE_NAME=${REMOTE_NAME:-origin}
PACKAGE_FILE="apps/mobile/package.json"
APP_JSON_FILE="apps/mobile/app.json"
MOBILE_CHANGELOG_FILE="apps/mobile/CHANGELOG.md"

if git status --porcelain --untracked-files=no | grep -q '.'; then
  echo "❌ Working tree has uncommitted changes. Commit or stash them before releasing." >&2
  exit 1
fi

if [ ! -f "$PACKAGE_FILE" ]; then
  echo "Unable to find $PACKAGE_FILE" >&2
  exit 1
fi

if [ ! -f "$MOBILE_CHANGELOG_FILE" ]; then
  printf '# Mobile Changelog\n\n' > "$MOBILE_CHANGELOG_FILE"
fi

last_mobile_tag=$(git describe --tags --match 'mobile-v*' --abbrev=0 2>/dev/null || true)
first_release=false
if [ -z "$last_mobile_tag" ]; then
  first_release=true
  echo "ℹ️ No previous mobile tags detected; using kickoff release notes."
else
  commit_count=$(git rev-list --count "${last_mobile_tag}..HEAD" -- apps/mobile)
  if [ "$commit_count" -eq 0 ]; then
    echo "❌ No mobile commits found since last tag $last_mobile_tag. Nothing to release." >&2
    exit 1
  fi
fi

current_version=$(node -p "require('./apps/mobile/package.json').version")
echo "Current mobile version: $current_version"
read -rp "Select version bump (major/minor/patch) [patch]: " bump_type
bump_type=${bump_type:-patch}
bump_type=$(echo "$bump_type" | tr '[:upper:]' '[:lower:]')

IFS='.' read -r major minor patch <<<"$current_version"
case "$bump_type" in
  major)
    major=$((major + 1))
    minor=0
    patch=0
    ;;
  minor)
    minor=$((minor + 1))
    patch=0
    ;;
  patch)
    patch=$((patch + 1))
    ;;
  *)
    echo "Unknown bump type: $bump_type" >&2
    exit 1
    ;;
esac

new_version="${major}.${minor}.${patch}"
echo "📱 Releasing mobile v$new_version"

(cd apps/mobile && npm version "$new_version" --no-git-tag-version >/dev/null)

python3 - "$APP_JSON_FILE" "$new_version" <<'PY'
import json, sys
from pathlib import Path

path = Path(sys.argv[1])
version = sys.argv[2]
data = json.loads(path.read_text())

expo = data.setdefault("expo", {})
expo["version"] = version

path.write_text(json.dumps(data, indent=2) + "\n")
PY

declare -a mobile_messages=()
log_range=()
if [ "$first_release" = false ]; then
  log_range=("${last_mobile_tag}..HEAD")
fi

while IFS=$'\t' read -r sha subject; do
  [ -z "$sha" ] && continue
  mobile_messages+=("- ${subject}")
done < <(git log "${log_range[@]}" --pretty=format:%H%x09%s -- apps/mobile)

if [ "$first_release" = true ]; then
  mobile_block="- Kickoff project"
else
  if [ "${#mobile_messages[@]}" -eq 0 ]; then
    mobile_block="- No changes"
  else
    mobile_block="$(printf "%s\n" "${mobile_messages[@]}")"
  fi
fi

release_date=$(date +%Y-%m-%d)
mobile_entry="## v${new_version} - ${release_date}
${mobile_block}"

tmp=$(mktemp)
{
  read -r first_line < "$MOBILE_CHANGELOG_FILE"
  printf "%s\n\n" "$first_line"
  printf "%s\n\n" "$mobile_entry"
  tail -n +2 "$MOBILE_CHANGELOG_FILE" | sed '1{/^$/d;}'
} > "$tmp"
mv "$tmp" "$MOBILE_CHANGELOG_FILE"

git add apps/mobile/package.json apps/mobile/package-lock.json "$APP_JSON_FILE" "$MOBILE_CHANGELOG_FILE"
git commit -m "chore(mobile-release): v$new_version"
git tag "mobile-v$new_version"

echo "🚀 Pushing changes to $REMOTE_NAME"
git push "$REMOTE_NAME" HEAD
git push "$REMOTE_NAME" "mobile-v$new_version"

echo "✅ Mobile release v$new_version created and pushed."
