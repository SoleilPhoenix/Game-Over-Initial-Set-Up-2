#!/usr/bin/env bash
#
# mac-autopull.sh — keep this checkout's branch in sync with the remote so a
# running Metro dev server (Fast Refresh) reflects commits pushed from other
# environments, e.g. the iPhone Claude Code cloud app.
#
# SAFE BY DESIGN: it only ever fast-forwards. It never runs reset/clean/stash,
# so it can never discard your local or uncommitted work. If a fast-forward is
# blocked (e.g. a local edit collides with an incoming change), it logs a clear
# warning and keeps polling — you resolve it by hand.
#
# Usage:  ./scripts/mac-autopull.sh [repo_dir] [branch] [interval_seconds]
# Default: this repo, branch "main", every 15s.

set -uo pipefail

REPO_DIR="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
BRANCH="${2:-main}"
INTERVAL="${3:-15}"

cd "$REPO_DIR" || { echo "[autopull] cannot cd into $REPO_DIR"; exit 1; }

CURRENT="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
if [ "$CURRENT" != "$BRANCH" ]; then
  echo "[autopull] ⚠ checkout is on '$CURRENT', not '$BRANCH'. Switch with: git checkout $BRANCH"
fi

echo "[autopull] watching $REPO_DIR ($BRANCH) every ${INTERVAL}s — Ctrl-C to stop"
while true; do
  if git fetch origin "$BRANCH" --quiet 2>/dev/null; then
    LOCAL="$(git rev-parse "$BRANCH" 2>/dev/null)"
    REMOTE="$(git rev-parse "origin/$BRANCH" 2>/dev/null)"
    if [ -n "$LOCAL" ] && [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ]; then
      echo "[autopull] $(date '+%H:%M:%S') new commits on origin/$BRANCH → fast-forwarding"
      if git pull --ff-only origin "$BRANCH"; then
        echo "[autopull] ✓ now at $(git rev-parse --short HEAD)"
      else
        echo "[autopull] ⚠ fast-forward blocked (local changes collide). Nothing was discarded — resolve manually, then it resumes."
      fi
    fi
  else
    echo "[autopull] fetch failed (offline?), retrying in ${INTERVAL}s"
  fi
  sleep "$INTERVAL"
done
