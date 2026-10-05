#!/usr/bin/env bash
# Shared settings for scripts/mac/*. Sourced, never run alone.
# Credentials come from the environment only. Nothing here prints them.
set -euo pipefail

MAC_SCRIPTS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$MAC_SCRIPTS/../.." && pwd)"
PKG_DIR="$REPO/mac"

# TAKEOVER=1: build the app that replaces the Electron Mac app through its own
# updater. Squirrel.Mac installs an update only if its code requirement matches
# the old app's, and that requirement holds the bundle id. So the id must match.
if [ "${TAKEOVER:-}" = 1 ]; then
  APP_NAME="${APP_NAME:-R+}"; BUNDLE_ID="${BUNDLE_ID:-com.rmas.rplusclinical}"; ARCH="${ARCH:-universal}"
fi
APP_NAME="${APP_NAME:-R+ Mac}"                     # name of the .app
BUNDLE_ID="${BUNDLE_ID:-com.rmas.rplus.swift}"     # Electron app: com.rmas.rplusclinical
EXECUTABLE="RPlusMac"                              # SwiftPM product
ARCH="${ARCH:-arm64}"                              # arm64 | x86_64 | universal
VERSION="${VERSION:-$(node -p "require('$REPO/package.json').version")}"
BUILD_NUMBER="${BUILD_NUMBER:-$(git -C "$REPO" rev-list --count HEAD)}"
OUT="${OUT:-$PKG_DIR/.build/dist}"                 # .build/ is git-ignored
APP="$OUT/$APP_NAME.app"
ART_BASE="R-Mac-$VERSION-$ARCH"                    # GitHub-safe, no "+"

say()  { printf '%s\n' "$*"; }
skip() { printf 'SKIP %s\n' "$1"; shift; printf '  %s\n' "$@"; }

# Exit 3 = "step skipped, credential missing". release.sh keeps going on 3.
need_env() {
  local miss=()
  for v in "$@"; do [ -n "${!v:-}" ] || miss+=("$v"); done
  [ ${#miss[@]} -eq 0 ] || { say "Missing env: ${miss[*]}"; return 1; }
}

# notarytool credential args. Profile wins. Else Apple ID trio. Else API key trio.
# Fills the NOTARY_ARGS array. Returns 1 when nothing is set.
notary_args() {
  NOTARY_ARGS=()
  if [ -n "${NOTARY_PROFILE:-}" ]; then
    NOTARY_ARGS=(--keychain-profile "$NOTARY_PROFILE")
  elif [ -n "${APPLE_ID:-}" ] && [ -n "${APPLE_APP_SPECIFIC_PASSWORD:-}" ] && [ -n "${APPLE_TEAM_ID:-}" ]; then
    NOTARY_ARGS=(--apple-id "$APPLE_ID" --password "$APPLE_APP_SPECIFIC_PASSWORD" --team-id "$APPLE_TEAM_ID")
  elif [ -n "${NOTARY_KEY_PATH:-}" ] && [ -n "${NOTARY_KEY_ID:-}" ] && [ -n "${NOTARY_ISSUER:-}" ]; then
    NOTARY_ARGS=(--key "$NOTARY_KEY_PATH" --key-id "$NOTARY_KEY_ID" --issuer "$NOTARY_ISSUER")
  else
    return 1
  fi
}
