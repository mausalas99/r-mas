# Task 2 xcodebuild blocker

## Command

```bash
xcodebuild test -project macos-swift/RPlusMac.xcodeproj -scheme RPlusMac -destination 'platform=macOS' -only-testing:RPlusMacTests/SharedJSONCodecTests/testRoundTripPreservesPatientIdAndLabEntries
```

## Output

```text
xcode-select: error: tool 'xcodebuild' requires Xcode, but active developer directory '/Library/Developer/CommandLineTools' is a command line tools instance
```
