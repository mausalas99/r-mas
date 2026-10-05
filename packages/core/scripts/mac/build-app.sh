#!/usr/bin/env bash
# Build the unsigned .app bundle from the SwiftPM product.
# Env: SU_PUBLIC_ED_KEY (adds Sparkle keys to Info.plist), SU_FEED_URL, VERSION, BUILD_NUMBER, ARCH (arm64|x86_64|universal), APP_NAME, BUNDLE_ID, OUT.
source "$(dirname "$0")/common.sh"

archs=(--arch "$ARCH")
[ "$ARCH" = universal ] && archs=(--arch arm64 --arch x86_64)

( cd "$PKG_DIR" && swift build -c release "${archs[@]}" )
BIN_DIR="$(cd "$PKG_DIR" && swift build -c release "${archs[@]}" --show-bin-path)"

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BIN_DIR/$EXECUTABLE" "$APP/Contents/MacOS/$EXECUTABLE"
cp "$REPO/build/AppIcon.icns" "$APP/Contents/Resources/AppIcon.icns"
# Sparkle ships as a framework. The binary looks in Contents/Frameworks.
mkdir -p "$APP/Contents/Frameworks"
cp -R "$BIN_DIR/Sparkle.framework" "$APP/Contents/Frameworks/"
install_name_tool -add_rpath @executable_path/../Frameworks "$APP/Contents/MacOS/$EXECUTABLE"
# SwiftPM resource bundles (if any target has resources) sit next to the binary.
for b in "$BIN_DIR"/*.bundle; do [ -e "$b" ] && cp -R "$b" "$APP/Contents/Resources/"; done

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleIdentifier</key><string>$BUNDLE_ID</string>
	<key>CFBundleName</key><string>$APP_NAME</string>
	<key>CFBundleDisplayName</key><string>$APP_NAME</string>
	<key>CFBundleExecutable</key><string>$EXECUTABLE</string>
	<key>CFBundleIconFile</key><string>AppIcon</string>
	<key>CFBundlePackageType</key><string>APPL</string>
	<key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
	<key>CFBundleShortVersionString</key><string>$VERSION</string>
	<key>CFBundleVersion</key><string>$BUILD_NUMBER</string>
	<key>LSMinimumSystemVersion</key><string>14.0</string>
	<key>LSApplicationCategoryType</key><string>public.app-category.medical</string>
	<key>NSPrincipalClass</key><string>NSApplication</string>
	<key>NSHighResolutionCapable</key><true/>
${SU_PUBLIC_ED_KEY:+	<key>SUPublicEDKey</key><string>$SU_PUBLIC_ED_KEY</string>
	<key>SUFeedURL</key><string>${SU_FEED_URL:-https://rmas-update-feed.rmas-workersdev.workers.dev/appcast-mac.xml}</string>
}</dict>
</plist>
PLIST
plutil -lint "$APP/Contents/Info.plist" >/dev/null
say "Built: $APP"
