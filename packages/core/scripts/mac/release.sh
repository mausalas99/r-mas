#!/usr/bin/env bash
# Full local pipeline. Steps with a missing credential are skipped, the rest run.
#   build -> sign -> notarize+staple app -> package -> notarize+staple dmg
# Does NOT upload or publish anything. Output: mac/.build/dist/
set -uo pipefail
D="$(cd "$(dirname "$0")" && pwd)"
source "$D/common.sh"; set +e

"$D/build-app.sh" || exit 1
"$D/sign.sh";        signed=$?
notarized=3
if [ $signed -eq 0 ]; then "$D/notarize.sh" "$APP"; notarized=$?; fi
[ $signed -eq 0 ] || [ $signed -eq 3 ] || exit 1
[ $notarized -eq 0 ] || [ $notarized -eq 3 ] || exit 1
"$D/package.sh" || exit 1
if [ $notarized -eq 0 ]; then
  "$D/notarize.sh" "$OUT/$ART_BASE.dmg" || exit 1
fi
say "---"
say "sign:     $([ $signed -eq 0 ] && echo done || echo skipped)"
say "notarize: $([ $notarized -eq 0 ] && echo done || echo skipped)"
