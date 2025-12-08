#!/usr/bin/env bash
set -eo pipefail

ROOT_DIR=$(git rev-parse --show-toplevel)
cd "$ROOT_DIR"

VERSION_FILE="$ROOT_DIR/VERSION"
CHANGELOG_FILE="$ROOT_DIR/CHANGELOG.md"
REMOTE_NAME=${REMOTE_NAME:-origin}

if git status --porcelain --untracked-files=no | grep -q '.'; then
  echo "❌ Working tree has uncommitted changes. Commit or stash them before releasing." >&2
  exit 1
fi

if [ ! -f "$VERSION_FILE" ]; then
  echo "0.0.1" > "$VERSION_FILE"
fi

if [ ! -f "$CHANGELOG_FILE" ]; then
  printf '# Changelog\n\n' > "$CHANGELOG_FILE"
fi

current_version=$(cat "$VERSION_FILE" | tr -d ' \n')
echo "Current version: $current_version"
read -rp "Select version bump (major/minor/patch) [patch]: " bump_type
bump_type=${bump_type:-patch}
bump_type=$(echo "$bump_type" | tr '[:upper:]' '[:lower:]')

IFS='.' read -r major minor patch <<< "$current_version"
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
echo "⏫ Releasing v$new_version"

last_tag=$(git describe --tags --abbrev=0 2>/dev/null || true)
first_release=false
if [ -z "$last_tag" ]; then
  first_release=true
  echo "ℹ️ No previous tags detected; using kickoff release notes."
else
  commit_count=$(git rev-list --count "${last_tag}..HEAD")
  if [ "$commit_count" -eq 0 ]; then
    echo "❌ No commits found since last tag $last_tag. Nothing to release." >&2
    exit 1
  fi
fi

declare -a commit_entries=()
declare -a commit_messages=()
declare -a commit_files=()

update_pyproject_version() {
  local file=$1
  local version=$2
  python3 - "$file" "$version" <<'PY'
import pathlib, re, sys
path = pathlib.Path(sys.argv[1])
version = sys.argv[2]
text = path.read_text()
pattern = re.compile(r'^(version\s*=\s*)"(.*?)"', flags=re.MULTILINE)
new_text, count = pattern.subn(rf'\1"{version}"', text, count=1)
if count == 0:
    sys.stderr.write(f"Failed to update version in {path}\n")
    sys.exit(1)
path.write_text(new_text)
PY
}

update_pyproject_version "apps/api/pyproject.toml" "$new_version"
(cd apps/api && uv lock >/dev/null)

bump_node_version() {
  local dir=$1
  (cd "$dir" && npm version "$new_version" --no-git-tag-version >/dev/null)
}

bump_node_version "apps/web"
bump_node_version "apps/mobile"

log_range=()
if [ "$first_release" = false ]; then
  log_range=("${last_tag}..HEAD")
fi

while IFS=$'\t' read -r sha subject; do
  [ -z "$sha" ] && continue
  commit_entries+=("$sha")
  commit_messages+=("$subject")
  commit_files+=("$(git diff-tree --no-commit-id --name-only -r "$sha")")
done < <(git log "${log_range[@]}" --pretty=format:%H%x09%s)

commit_has_prefix() {
  local files="$1"
  local prefix="$2"
  while IFS= read -r file; do
    [ -z "$file" ] && continue
    if [[ "$file" == $prefix* ]]; then
      return 0
    fi
  done <<< "$files"
  return 1
}

api_block=""
web_block=""
mobile_block=""
other_block=""

if [ "$first_release" = true ]; then
  api_block="- Kickoff project"
  web_block="- Kickoff project"
  mobile_block="- Kickoff project"
  other_block="- Kickoff project"
else
  idx=0
  for sha in "${commit_entries[@]}"; do
    files="${commit_files[$idx]}"
    subject="${commit_messages[$idx]}"
    matched=false
    if commit_has_prefix "$files" "apps/api/"; then
      api_block+="- ${subject}"$'\n'
      matched=true
    fi
    if commit_has_prefix "$files" "apps/web/"; then
      web_block+="- ${subject}"$'\n'
      matched=true
    fi
    if commit_has_prefix "$files" "apps/mobile/"; then
      mobile_block+="- ${subject}"$'\n'
      matched=true
    fi
    if [ "$matched" = false ]; then
      other_block+="- ${subject}"$'\n'
    fi
    idx=$((idx + 1))
  done
  [ -z "$api_block" ] && api_block="- No changes"
  [ -z "$web_block" ] && web_block="- No changes"
  [ -z "$mobile_block" ] && mobile_block="- No changes"
  [ -z "$other_block" ] && other_block="- No changes"
fi

echo "$new_version" > "$VERSION_FILE"
release_date=$(date +%Y-%m-%d)
entry="## v${new_version} - ${release_date}
### API
${api_block}

### Web
${web_block}

### Mobile
${mobile_block}

### Other
${other_block}"

tmp=$(mktemp)
{
  read -r first_line < "$CHANGELOG_FILE"
  printf "%s\n\n" "$first_line"
  printf "%s\n\n" "$entry"
  tail -n +2 "$CHANGELOG_FILE" | sed '1{/^$/d;}'
} > "$tmp"
mv "$tmp" "$CHANGELOG_FILE"

git add "$VERSION_FILE" "$CHANGELOG_FILE" \
  apps/api/pyproject.toml apps/api/uv.lock \
  apps/web/package.json apps/web/package-lock.json \
  apps/mobile/package.json apps/mobile/package-lock.json
git commit -m "Release v$new_version"
git tag "v$new_version"

echo "🚀 Pushing changes to $REMOTE_NAME"
git push "$REMOTE_NAME" HEAD
git push "$REMOTE_NAME" "v$new_version"

echo "✅ Release v$new_version created and pushed."
