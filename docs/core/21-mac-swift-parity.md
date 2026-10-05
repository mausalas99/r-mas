# Mac (Swift) parity rules

The Mac app is written in Swift (`mac/`). Windows stays on Electron.
Node is the source of truth. Swift must give the same result as Node.

## How fixtures work
- Fixtures live in `mac/Tests/RPlusCoreTests/Fixtures/`. Data is synthetic only.
- `make-schema-fixtures.mjs` makes them with Electron's Node. It writes `start-vN.db` (an old DB) and `expected-*.json` (what Node's `applyMigrations` makes of it).
- `SchemaParityTests.swift` upgrades each `start-vN.db` in Swift. It must match `expected-*.json`.
- Other threads add their own fixture folders here. Do not move or rename their files.

## Refresh fixtures
```bash
ELECTRON_RUN_AS_NODE=1 "$(node -p "require('electron')")" \
  mac/Tests/RPlusCoreTests/Fixtures/make-schema-fixtures.mjs node_modules/better-sqlite3-multiple-ciphers
cd mac && swift test
```
Then commit the changed fixtures with the Node change.
The run is not byte-stable. It writes wall-clock times and new `.db` bytes. A diff in only those is normal.

## What a Node change must do
Touched schema, a parser, crypto, or a doc generator? Do all of these in the same commit:
1. Refresh the fixtures (above). For a new schema version, also add the step to `make-schema-fixtures.mjs` and the Swift `Schema*.swift` port.
2. Run `cd mac && swift test`. Fix Swift until it matches. Do not edit expected files by hand to make Swift pass.
3. Run `npm run test:one -- packages/core/lib/db/mac-parity-fixtures.test.mjs`.

| Node area | Parity owner |
|---|---|
| Schema, `SCHEMA_VERSION` | `Repo/`, `Schema*.swift` |
| Lab paste parser | `Labs/` |
| Key, passphrase, Nube crypto | `Unlock/` |
| `.docx` generators | `Docx/` |

## Guards
- `packages/core/lib/db/mac-parity-fixtures.test.mjs` fails if `SCHEMA_VERSION` is not the version stored in `expected-fresh.json`. It runs in the normal Node suite.
- `.github/workflows/mac.yml` runs `swift test` on macOS. It also remakes the fixtures and fails if they differ from the committed ones.

## iOS companion (`R+-ios`, `RPlus/Nube/NubeCrypto.swift`, `NubeWire.swift`)
iOS uses PBKDF2-SHA256 (room code) to wrap a DEK, then AES-256-GCM on `{enc:1,iv,ct}` (`ct` = ciphertext + 16-byte tag). No existing fixture covers this.
- Partial reuse: `unlock-fixtures.json` `wrapped` and `legacyWrapped` (+ `wrappingKeyHex`) are AES-256-GCM vectors. iOS can test `open` on them. Join `data` + `tag` first.
- Not reusable: Argon2id key, recovery code (different KDF, different wrap).
- Now covered: `nube-fixtures.json` (made by `make-nube-fixtures.mjs` from desktop `cloud-sync/crypto.mjs` and `cloud-sync-crypto-wire.mjs`). It holds the password, room salt, wrap key (hex), raw room key, wrapped key, sample envelopes (number, text with accents, null, list, `monitoreo` with `vitals` TAS/TAD, `glucometrias`, `io`, `historial`) and push ops (`entries/p1/monitoreo`, `entries/p1/fields` with `registroFp`).
- Real key method: PBKDF2-HMAC-SHA256, 210000 iterations, 32 bytes. The input is the user's Nube **password** (UTF-8) plus the base64 room salt. iOS names it `roomCode`: check it feeds the same secret.
- Value envelope: AES-256-GCM, 12-byte IV, `ct` = ciphertext + 16-byte tag, plaintext = `JSON.stringify(value)`.
- Output is byte-stable (IVs from a counter), so CI compares the whole file. Remake: `ELECTRON_RUN_AS_NODE=1 "$(node -p "require('electron')")" mac/Tests/RPlusCoreTests/Fixtures/make-nube-fixtures.mjs`.
- Swift test: `NubeParityTests.swift`. Node test: `mac-parity-fixtures.test.mjs`.
