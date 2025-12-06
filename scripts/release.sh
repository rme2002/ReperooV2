#!/usr/bin/env bash
set -euo pipefail

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

update_package_json_version() {
  local file=$1
  local version=$2
  python3 - "$file" "$version" <<'PY'
import json, pathlib, sys
path = pathlib.Path(sys.argv[1])
version = sys.argv[2]
data = json.loads(path.read_text())
data["version"] = version
path.write_text(json.dumps(data, indent=2) + "\n")
PY
}

update_pyproject_version "apps/api/pyproject.toml" "$new_version"
update_package_json_version "apps/web/package.json" "$new_version"
update_package_json_version "apps/mobile/package.json" "$new_version"

last_tag=$(git describe --tags --abbrev=0 2>/dev/null || true)
first_release=false
if [ -z "$last_tag" ]; then
  first_release=true
  echo "ℹ️ No previous tags detected; using kickoff release notes."
fi

declare -a commit_entries=()
declare -A commit_messages=()
declare -A commit_files=()

if [ "$first_release" = false ]; then
  while IFS=$'\t' read -r sha subject; do
    [ -z "$sha" ] && continue
    commit_entries+=("$sha")
    commit_messages["$sha"]="$subject"
    commit_files["$sha"]=$(git show --pretty="" --name-only "$sha")
  done < <(git log "${last_tag}..HEAD" --pretty=format:'%H\t%s')

  if [ "${#commit_entries[@]}" -eq 0 ]; then
    echo "❌ No commits found since last tag $last_tag. Nothing to release." >&2
    exit 1
  fi
fi

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

generate_notes() {
  local prefix=$1
  if [ "$first_release" = true ]; then
    echo "- Kickoff project"
    return
  fi
  local notes=()
  for sha in "${commit_entries[@]}"; do
    local files="${commit_files["$sha"]}"
    if commit_has_prefix "$files" "$prefix"; then
      notes+=("- ${commit_messages["$sha"]}")
    fi
  done
  if [ "${#notes[@]}" -eq 0 ]; then
    echo "- No changes"
  else
    printf "%s\n" "${notes[@]}"
  fi
}

api_block=$(generate_notes "apps/api/")
web_block=$(generate_notes "apps/web/")
mobile_block=$(generate_notes "apps/mobile/")

echo "$new_version" > "$VERSION_FILE"
release_date=$(date +%Y-%m-%d)
entry="## v${new_version} - ${release_date}
### API
${api_block}

### Web
${web_block}

### Mobile
${mobile_block}"

tmp=$(mktemp)
{
  read -r first_line < "$CHANGELOG_FILE"
  printf "%s\n\n" "$first_line"
  printf "%s\n\n" "$entry"
  tail -n +2 "$CHANGELOG_FILE" | sed '1{/^$/d;}'
} > "$tmp"
mv "$tmp" "$CHANGELOG_FILE"

git add "$VERSION_FILE" "$CHANGELOG_FILE" apps/api/pyproject.toml apps/web/package.json apps/mobile/package.json
git commit -m "Release v$new_version"
git tag "v$new_version"

echo "🚀 Pushing changes to $REMOTE_NAME"
git push "$REMOTE_NAME" HEAD
git push "$REMOTE_NAME" "v$new_version"

echo "✅ Release v$new_version created and pushed."
