# Biometric unlock (Touch ID + Windows Hello)

## Context

Users unlock R+ with a passphrase today. There's already a "remember" path: when a user unlocks with `remember: true`, the DB encryption key gets wrapped with Electron's `safeStorage` (backed by macOS Keychain / Windows DPAPI) and stored. Next boot, `ensureUnlocked()` silently unwraps it — no prompt.

The ask: gate that silent unwrap behind a biometric prompt (Touch ID on Mac, Windows Hello on Windows) instead of skipping the check entirely. This ships to both platforms together, one release.

## Approach

Reuse the existing wrapped-key plumbing. Add one new unlock path: **prompt biometric → on success, unwrap the already-stored key the same way `remember` does today.** No new crypto, no new key storage.

### 1. Main process — `main.js`
- Add `systemPreferences` to the existing `require('electron')` destructure (line 6).
- Expose a small platform check: `canUseBiometric()` → `darwin`: `systemPreferences.canPromptTouchID()`. `win32`: check the chosen Windows Hello module's availability call (see Windows note below). Other platforms: `false`.

### 2. IPC handler — `lib/db/ipc-handlers-register-core.mjs`
Next to `registerDbCoreUnlockHandlers` (~line 118), add `db:unlock-biometric`:
- macOS: `await systemPreferences.promptTouchID('desbloquear R+')`, throws on failure/cancel.
- Windows: call the Windows Hello module's prompt function, throws on failure/cancel.
- On success, call the same code path `db:auto-unlock` already uses (`dbManager.ensureUnlocked()` in `db-manager-auth-unlock-flows.mjs`) to unwrap the stored `wrapped_dek` and open the DB.
- On failure, return the same shape `ipcError()` produces elsewhere in this file — the renderer already knows how to show that.

### 3. Preload bridge — `preload.js`
Add next to `dbAutoUnlock` (line 142):
```js
dbUnlockBiometric: function() {
  return ipcRenderer.invoke('db:unlock-biometric');
},
canUseBiometric: function() {
  return ipcRenderer.invoke('db:can-use-biometric');
},
```

### 4. Renderer — unlock overlay
Find the `db-unlock-overlay` component (passphrase + recovery code fields). Add a "Usar Touch ID / Windows Hello" button, shown only when:
- `canUseBiometric()` returns true, AND
- a remembered wrapped key exists for this user (same condition that today lets `db:auto-unlock` skip the prompt).
Button click → `dbUnlockBiometric()` → same success/failure handling the passphrase form already has.

### Windows Hello — the one open item
No existing dependency covers this. `systemPreferences.promptTouchID()` is Mac-only; Electron has no Windows Hello equivalent. This needs one small native module. I'll pick and wire in the most maintained option at implementation time (checking npm downloads/last-publish before adding it — per house rule, no unmaintained deps). The app already has native-module infra to lean on (`@electron/rebuild`, `scripts/rebuild-native-db.mjs`, `scripts/fetch-argon2-win.mjs` pattern for Windows-only native deps) — the new module slots into that same prebuild step.

### Files touched
- `main.js` — import `systemPreferences`, add platform check
- `preload.js:139-150` — two new bridge calls
- `lib/db/ipc-handlers-register-core.mjs:118` — new handler, reusing `ensureUnlocked()`
- `lib/db/db-manager-auth-unlock-flows.mjs` — no new function needed, reuse `ensureUnlocked()`
- unlock overlay renderer file (found via `db-unlock-overlay` search) — new button
- `package.json` — new Windows-only dependency + prebuild:win step
- new colocated `*.test.mjs` for the IPC handler and the renderer button (required by house rule)

### Not doing
- No new key storage, no new crypto. Biometric is a gate in front of the existing wrapped-key unwrap, not a new secret.
- No changes to the passphrase flow — it stays as the fallback.

## Verification
1. `npm run test:one -- <new test files>`
2. `npm run build:ui`
3. Manual: on Mac, set up unlock with "remember" checked, restart app, confirm Touch ID prompt appears and unlocks; cancel it and confirm passphrase fallback still works.
4. Manual on Windows: same flow with Windows Hello.
5. `npm run metrics:check` before merge.
