#!/usr/bin/env bash
# Notarize and staple. Usage: notarize.sh <path>   (.app, .dmg or .zip)
# A .app is zipped first. Only .app and .dmg can be stapled.
# Credentials (first set found wins):
#   NOTARY_PROFILE                                   (xcrun notarytool store-credentials name)
#   APPLE_ID + APPLE_APP_SPECIFIC_PASSWORD + APPLE_TEAM_ID
#   NOTARY_KEY_PATH + NOTARY_KEY_ID + NOTARY_ISSUER  (App Store Connect API key)
source "$(dirname "$0")/common.sh"
target="${1:?usage: notarize.sh <path>}"

if ! notary_args; then
  skip notarize "No notary credentials in env. Owner: pick one set from the header of" \
    "  scripts/mac/notarize.sh and export it. Easiest: run once in your own shell" \
    "  xcrun notarytool store-credentials rplus-notary" \
    "  then export NOTARY_PROFILE=rplus-notary"
  exit 3
fi
[ -e "$target" ] || { say "Not found: $target"; exit 1; }

submit="$target"
if [ -d "$target" ]; then
  submit="$(mktemp -d)/$(basename "$target" .app).zip"
  ditto -c -k --keepParent "$target" "$submit"
fi
# --wait blocks until Apple answers. Log goes to stdout; it holds no secrets.
xcrun notarytool submit "$submit" "${NOTARY_ARGS[@]}" --wait
case "$target" in
  *.app|*.dmg) xcrun stapler staple "$target" && xcrun stapler validate "$target" ;;
  *) say "Zip cannot be stapled. Staple the .app before you zip it." ;;
esac
