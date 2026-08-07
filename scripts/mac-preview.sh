#!/usr/bin/env bash
#
# mac-preview.sh — one command to test the app on a phone while away from the Mac.
#
# It does three things and cleans them all up on exit (Ctrl-C):
#   1. Keeps the Mac awake for as long as this script runs (caffeinate).
#   2. Auto-pulls `main` in the background (scripts/mac-autopull.sh) so commits
#      pushed from the iPhone Claude Code cloud app land on this machine.
#   3. Runs Metro in TUNNEL mode so the phone can connect from any network.
#
# Run this in your OWN Terminal (not inside a Claude Code session) so it keeps
# running after you walk away:
#
#     ./scripts/mac-preview.sh
#
# Then open the app in Expo Go on your iPhone via the tunnel QR/URL that Metro
# prints. JS/TS/i18n changes hot-reload; shake the phone → "Reload" to force it.
#
# NOTE: native/config changes (e.g. app.config.ts / LSApplicationQueriesSchemes)
# do NOT hot-reload — they need a fresh dev build (eas build / expo run:ios).

set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$HERE/.." && pwd)"
APP_DIR="$REPO_DIR/game-over-app"

cleanup() {
  echo
  echo "[preview] stopping (Metro, auto-pull, caffeinate)…"
  kill 0 2>/dev/null
}
trap cleanup EXIT INT TERM

# 1) keep the Mac awake until this script exits
caffeinate -dims -w "$$" &

# 2) auto-pull main in the background (15s poll)
"$HERE/mac-autopull.sh" "$REPO_DIR" main 15 &

# 3) Metro in tunnel mode (foreground; requires @expo/ngrok — see README note)
cd "$APP_DIR" || { echo "[preview] cannot cd into $APP_DIR"; exit 1; }
echo "[preview] starting Metro (tunnel). First run may install @expo/ngrok."
npx expo start --tunnel
