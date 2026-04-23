#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# push.sh — safe GitHub push with repo allowlist verification
#
# Usage: called internally by Claude. Do not run manually unless you know
# what you're doing.
# ─────────────────────────────────────────────────────────────────────────────

set -e  # exit immediately on any error

# ── Allowlist — only this repo is ever permitted ──────────────────────────────
ALLOWED_REPO="https://github.com/christinewilkes-commits/AI-Evaluations.git"

# ── Read commit message from argument ────────────────────────────────────────
COMMIT_MSG="${1:-"Update eval toolkit"}"

# ── Read token ────────────────────────────────────────────────────────────────
TOKEN_FILE="$(dirname "$0")/../.github_token"
if [ ! -f "$TOKEN_FILE" ]; then
  echo "ERROR: .github_token not found at $TOKEN_FILE"
  exit 1
fi
TOKEN=$(cat "$TOKEN_FILE" | tr -d '\n')

# ── Build authenticated URL ───────────────────────────────────────────────────
AUTH_URL="https://${TOKEN}@github.com/christinewilkes-commits/AI-Evaluations.git"

# ── VERIFICATION: confirm target before doing anything ───────────────────────
TARGET_URL=$(echo "$AUTH_URL" | sed 's|https://[^@]*@|https://|')

if [ "$TARGET_URL" != "$ALLOWED_REPO" ]; then
  echo "────────────────────────────────────────────────────"
  echo "PUSH BLOCKED"
  echo "Target:  $TARGET_URL"
  echo "Allowed: $ALLOWED_REPO"
  echo "These do not match. No push was made."
  echo "────────────────────────────────────────────────────"
  exit 1
fi

echo "✓ Repo verified: $TARGET_URL"

# ── Clone, update, commit, push ───────────────────────────────────────────────
WORK_DIR="/tmp/ai-evals-push-$(date +%s)"
SOURCE_DIR="$(dirname "$0")"

git clone "$AUTH_URL" "$WORK_DIR" 2>&1 | grep -v "Cloning into"

# Sync files (exclude .git, .github_token, node_modules)
rsync -a --exclude='.git' --exclude='node_modules' "$SOURCE_DIR/" "$WORK_DIR/"

cd "$WORK_DIR"
git config user.email "christinewilkes@navapbc.com"
git config user.name "Christine Wilkes"

if git diff --quiet && git diff --staged --quiet; then
  echo "Nothing to commit — repo is already up to date."
  rm -rf "$WORK_DIR"
  exit 0
fi

git add .
git commit -m "$COMMIT_MSG"
git push origin main

echo "✓ Pushed to $ALLOWED_REPO"

# Clean up
rm -rf "$WORK_DIR"
