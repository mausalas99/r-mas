# Password Recovery: Master Recovery Code (`r+123`)

**Date:** 2026-05-31
**Scope:** R+ v6.5.2 (fix release, no new features from `feat/clinical-access-dashboard`)

## Problem

Users may lose or forget their master passphrase. The SQLCipher database is encrypted with a key derived from the passphrase + KDF salt. Currently there is **no recovery mechanism** — a lost passphrase means permanent data loss (unless a plaintext JSON backup exists).

## Solution

Add a **key escrow** recovery mechanism. On every successful unlock (or initial setup), the SQLCipher key is encrypted using a wrapping key derived from a hardcoded recovery code `r+123` and stored in the unlock metadata. Users who forget their passphrase can use the recovery code to decrypt the stored key and unlock the database.

## Architecture

### Files Modified

| File | Change |
|------|--------|
| `lib/db/crypto.mjs` | New functions: `deriveRecoveryWrappingKeyHex()`, `wrapKeyForRecovery()`, `unwrapKeyForRecovery()` |
| `lib/db/db-manager.mjs` | Auto-setup recovery after unlock; new `unlockWithRecoveryCode()` method |
| `lib/db/ipc-handlers.mjs` | New IPC handler `db:unlock-recovery` |
| `preload.js` | Expose `dbUnlockRecovery` to renderer |
| `public/js/features/db-unlock.mjs` | Recovery UI: toggle link, recovery field, submit handler |
| `public/index.src.html` | Recovery input/button in unlock overlay |

### Crypto Details

```
Recovery code: "r+123" (hardcoded, temporary safeguard)

Recovery salt:    16 random bytes (generated once, stored in meta)
Wrapping key:     Argon2id("r+123", salt=recoverySalt) → 32 bytes hex
Encryption:       AES-256-GCM (random IV, 16-byte auth tag)
                  Encrypt(SQLCipher key hex, wrapping key) → { iv, tag, data }
Storage:
  - meta file:   recovery_salt (base64), recovery_wrapped_key (JSON string)
  - DB app_meta: recovery_salt, recovery_wrapped_key (mirror)
```

### Key Derivation (Argon2id)

Uses the same `ARGON2_OPTS` as primary passphrase derivation:
- memoryCost: 65536 (64 MB)
- timeCost: 3
- parallelism: 4
- outputLen: 32

### Data Flow

**Auto-setup (on unlock):**
```
unlockWithPassphrase() succeeds
  → recoverySalt = newSalt()
  → wrappingKey = deriveRecoveryWrappingKeyHex(recoverySalt)
  → wrapped = wrapKeyForRecovery(activeKeyHex, wrappingKey)
  → store in meta + DB app_meta
```

**Recovery:**
```
User clicks "¿Olvidaste tu contraseña?" → shows recovery field
User enters "r+123"
  → read recoverySalt from meta
  → wrappingKey = deriveRecoveryWrappingKeyHex(recoverySalt)
  → sqlcipherKey = unwrapKeyForRecovery(wrapped, wrappingKey)
  → unlockWithKeyHex(sqlcipherKey)
  → audit: auth.recovery.unlock
```

### Audit Events

| Event | When |
|-------|------|
| `auth.recovery.unlock` | Successful recovery unlock |

## UI Design

### Unlock Overlay States

**Normal state:**
- Password field (unchanged)
- "Recordar en este equipo" checkbox (unchanged)
- New: `[¿Olvidaste tu contraseña?]` link below checkbox
- Button: "Desbloquear"

**Recovery state** (after clicking link):
- Password field: hidden
- "Recordar..." checkbox: hidden
- New: "Código de recuperación" input field
- New: `[Volver a contraseña]` link
- Button: "Recuperar acceso"

### Error Messages

- Invalid recovery code: `"Código de recuperación incorrecto."`
- Rate-limited: `"Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo."`
- Recovery not configured: `"La recuperación no está disponible para esta base de datos."`

### Rate Limiting

Recovery attempts count toward the same rate limit as passphrase attempts (5 per 15 minutes).

## Error Handling

| Scenario | Handling |
|----------|----------|
| Recovery salt missing from meta | `recovery_salt` not found → error "recovery not configured" |
| Wrapped key missing | `recovery_wrapped_key` not found → error "recovery not configured" |
| AES-GCM auth tag mismatch | Wrong code or corrupted data → generic "incorrect code" error |
| Argon2 derivation fails | Caught, returns generic "incorrect code" |
| Rate limited | Same `AUTH_RATE_LIMITED` error as normal unlock |
| Meta file read error | `DB_UNLOCK_METADATA_MISSING` |

## Migration

Existing databases (created before this release) automatically get recovery configured on the **first successful unlock** with the correct passphrase. No manual migration needed.

For the user's current situation: unlock with `npm start` (which works with `Msg170699`), recovery auto-configures, then `r+123` works in the packaged app after rebuilding.

## Testing

### Unit Tests
- `deriveRecoveryWrappingKeyHex()`: deterministic output for same salt
- `wrapKeyForRecovery()` / `unwrapKeyForRecovery()`: round-trip
- `unwrapKeyForRecovery()`: fails with wrong wrapping key
- `unwrapKeyForRecovery()`: fails with corrupted data (auth tag mismatch)

### Integration Tests
- Recovery auto-setup after `unlockWithPassphrase()`
- `unlockWithRecoveryCode("r+123")` succeeds
- `unlockWithRecoveryCode("wrong")` fails
- Rate limiting applies to recovery attempts

## Security Considerations

- The recovery code `r+123` is hardcoded — **temporary** safeguard. Future versions should allow admin-configurable recovery codes or per-user recovery phrases.
- The wrapped key in the meta file is encrypted with AES-256-GCM, so even if an attacker obtains the plaintext meta file, they cannot decrypt the key without knowing the recovery code.
- Recovery unlock is audited (`auth.recovery.unlock`).
- Rate limiting prevents brute-force of the recovery code.
