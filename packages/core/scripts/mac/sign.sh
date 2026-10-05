#!/usr/bin/env bash
# Sign the .app with Developer ID + hardened runtime.
# Env: CODESIGN_IDENTITY  e.g. "Developer ID Application: Name (TEAMID)".
#      Use "-" for an ad-hoc local test signature (not for release).
# Optional: CODESIGN_KEYCHAIN  path of the keychain that holds the identity.
source "$(dirname "$0")/common.sh"

if ! need_env CODESIGN_IDENTITY >/dev/null; then
  skip sign "CODESIGN_IDENTITY is not set. Owner: list names with" \
    "  security find-identity -v -p codesigning" \
    "then export CODESIGN_IDENTITY=\"Developer ID Application: ...\""
  exit 3
fi
[ -d "$APP" ] || { say "No app at $APP. Run build-app.sh first."; exit 1; }

kc=(); [ -n "${CODESIGN_KEYCHAIN:-}" ] && kc=(--keychain "$CODESIGN_KEYCHAIN")
ts=(--timestamp); rt=(--options runtime)
# Ad-hoc test signature: no timestamp, no hardened runtime. With runtime on, macOS
# refuses Sparkle.framework (library validation needs one Team ID, ad-hoc has none).
[ "$CODESIGN_IDENTITY" = "-" ] && { ts=(); rt=(); }
# No entitlements: native Swift app, no JIT, not sandboxed.
# --deep is not used. Sign nested code first, deepest first (find -depth), then the app.
# This covers Sparkle: Autoupdate, XPC services, Updater.app, then Sparkle.framework.
# --preserve-metadata keeps entitlements Sparkle puts on its own helpers.
find "$APP/Contents/Frameworks" -depth \( -type d -o -type f \) \
  \( -name '*.xpc' -o -name '*.app' -o -name '*.framework' -o -name '*.dylib' -o -name Autoupdate \) -print0 |
  while IFS= read -r -d '' f; do
    codesign --force ${ts[@]+"${ts[@]}"} ${rt[@]+"${rt[@]}"} --preserve-metadata=entitlements ${kc[@]+"${kc[@]}"} -s "$CODESIGN_IDENTITY" "$f"
  done
codesign --force ${ts[@]+"${ts[@]}"} ${rt[@]+"${rt[@]}"} ${kc[@]+"${kc[@]}"} -s "$CODESIGN_IDENTITY" "$APP"
codesign --verify --deep --strict --verbose=2 "$APP"
say "Signed: $APP"
