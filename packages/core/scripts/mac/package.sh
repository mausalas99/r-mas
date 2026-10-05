#!/usr/bin/env bash
# Make the .zip (update archive) and .dmg (first install) from the .app.
# The .dmg is signed when CODESIGN_IDENTITY is set. Names get "-unsigned"
# when the app is not signed with a real identity, so they never get shipped by mistake.
source "$(dirname "$0")/common.sh"
[ -d "$APP" ] || { say "No app at $APP. Run build-app.sh first."; exit 1; }

suffix=""
if ! codesign -dv "$APP" 2>&1 | grep -q 'Authority=Developer ID Application'; then suffix="-unsigned"; fi
zip="$OUT/$ART_BASE$suffix.zip"; dmg="$OUT/$ART_BASE$suffix.dmg"
rm -f "$zip" "$dmg"

ditto -c -k --keepParent "$APP" "$zip"

stage="$(mktemp -d)"
cp -R "$APP" "$stage/"; ln -s /Applications "$stage/Applications"
hdiutil create -quiet -volname "$APP_NAME" -srcfolder "$stage" -format UDZO -ov "$dmg"
rm -rf "$stage"
if [ -z "$suffix" ] && [ "${CODESIGN_IDENTITY:-}" != "" ]; then
  kc=(); [ -n "${CODESIGN_KEYCHAIN:-}" ] && kc=(--keychain "$CODESIGN_KEYCHAIN")
  codesign --force --timestamp ${kc[@]+"${kc[@]}"} -s "$CODESIGN_IDENTITY" "$dmg"
fi
say "Made: $zip"; say "Made: $dmg"
say "sha512 (base64, same format as latest-mac.yml):"
for f in "$zip" "$dmg"; do printf '  %s  %s\n' "$(openssl dgst -sha512 -binary "$f" | base64)" "$(basename "$f")"; done

# Takeover: also write the feed file Electron Mac apps read (local file, no upload).
if [ "${TAKEOVER:-}" = 1 ]; then
  if [ -n "$suffix" ]; then say "SKIP feed: app is not Developer ID signed, no latest-mac.yml."
  else node "$MAC_SCRIPTS/write-feed-yml.mjs" "$zip" "$VERSION"; fi
fi

# Sparkle: signed archive + appcast-mac.xml (Swift-only feed). Skips without a key.
if [ -z "$suffix" ]; then
  node "$MAC_SCRIPTS/sparkle.mjs" appcast "$zip" "$VERSION" "$BUILD_NUMBER" || [ $? -eq 3 ] || exit 1
fi
