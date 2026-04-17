#!/usr/bin/env bash
set -euo pipefail

# ─── Config ────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()  { echo -e "${CYAN}i${RESET}  $*"; }
ok()    { echo -e "${GREEN}✔${RESET}  $*"; }
warn()  { echo -e "${YELLOW}!${RESET}  $*"; }
fail()  { echo -e "${RED}✖${RESET}  $*"; exit 1; }

# ─── Pre-flight checks ────────────────────────────────────────────────────────
cd "$PROJECT_DIR"

command -v node >/dev/null 2>&1 || fail "node is not installed"
command -v npm  >/dev/null 2>&1 || fail "npm is not installed"
command -v git  >/dev/null 2>&1 || fail "git is not installed"

# Ensure working directory is clean
if ! git diff --quiet HEAD -- . 2>/dev/null; then
  warn "Working directory has uncommitted changes"
  read -rp "Continue anyway? (y/N) " answer
  [[ "$answer" =~ ^[Yy]$ ]] || { info "Cancelled"; exit 0; }
fi

# Ensure tests pass
info "Running tests..."
npm test || fail "Tests failed, aborting publish"
ok "Tests passed"

# ─── Bump patch version ───────────────────────────────────────────────────────
CURRENT_VERSION=$(node -p "require('./package.json').version")
info "Current version: ${BOLD}${CURRENT_VERSION}${RESET}"

# Split version: major.minor.patch
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
NEW_PATCH=$((PATCH + 1))
NEW_VERSION="${MAJOR}.${MINOR}.${NEW_PATCH}"

# Allow overriding via argument:  ./scripts/publish.sh 1.2.0
if [[ "${1:-}" != "" ]]; then
  NEW_VERSION="$1"
  info "Using manually specified version: ${BOLD}${NEW_VERSION}${RESET}"
fi

info "About to publish version: ${BOLD}${NEW_VERSION}${RESET}"
read -rp "Confirm? (Y/n) " confirm
[[ "${confirm:-Y}" =~ ^[Yy]?$ ]] || { info "Cancelled"; exit 0; }

# Write new version to package.json
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.version = '${NEW_VERSION}';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"
ok "Version updated: ${CURRENT_VERSION} -> ${NEW_VERSION}"

# ─── Publish ───────────────────────────────────────────────────────────────────
info "Publishing to npm..."
npm publish --access public
ok "Published iterm2-tier@${NEW_VERSION}"

# ─── Git commit & tag ──────────────────────────────────────────────────────────
info "Committing version change and creating tag..."
git add package.json
git commit -m "chore: release v${NEW_VERSION}"
git tag "v${NEW_VERSION}"
ok "Committed and tagged: v${NEW_VERSION}"

echo ""
echo -e "${GREEN}${BOLD}Done!${RESET}"
echo -e "  Run ${CYAN}git push && git push --tags${RESET} to push to remote"
