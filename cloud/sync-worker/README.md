# rplus-sync-worker

Cloudflare Worker for the **R+ 7.9 Nube Free pilot** — HTTP push/pull room sync for Sala and Torre HU (see `docs/superpowers/specs/2026-08-02-cloud-sync-free-pilot-design.md`).

> **Pilot warning:** This service stores encrypted room state server-side. Only opt in from the ⇄ LAN panel when your team accepts the trade-offs in the design spec.

## Setup

1. `npm install`
2. Create the D1 database (requires Cloudflare login):
   ```bash
   npx wrangler d1 create rplus-sync
   ```
3. Copy the returned `database_id` into `wrangler.toml` (replace `REPLACE_AFTER_CREATE`).
4. Apply migrations:
   ```bash
   npm run db:migrate:local   # local dev
   npm run db:migrate:remote  # production
   ```
5. Set the at-rest encryption key (required before rooms/sync go live):
   ```bash
   # 32-byte hex (64 chars)
   openssl rand -hex 32 | npx wrangler secret put WORKER_DATA_KEY
   ```

## Dev

```bash
npm run dev
curl http://127.0.0.1:8787/api/sync/v1/ping
# → {"ok":true,"service":"rplus-sync"}
```

## Auth (username + password)

Passwords are hashed with PBKDF2-SHA256 (600k iterations). Salt and hash are stored in D1 as **lowercase hex strings** in `password_salt` / `password_hash` (BLOB columns). Session tokens are random 32-byte hex; only the SHA-256 hash is stored in `sessions.token_hash`.

### Register

```bash
curl -s -X POST http://127.0.0.1:8787/api/sync/v1/auth/register \
  -H 'content-type: application/json' \
  -d '{"username":"r1demo","password":"test-password-1","displayName":"R1 Demo"}'
```

Expected: `{"token":"...","expiresAt":"...","user":{"id":"...","username":"r1demo","displayName":"R1 Demo"}}`

### Login

```bash
curl -s -X POST http://127.0.0.1:8787/api/sync/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"r1demo","password":"test-password-1"}'
```

### Me

```bash
TOKEN="<paste token>"
curl -s http://127.0.0.1:8787/api/sync/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Logout

```bash
curl -s -X POST http://127.0.0.1:8787/api/sync/v1/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

## Tests

```bash
node --test src/auth.test.js src/password.test.js
```

Rooms and sync LWW routes are added in follow-up tasks (5–6).
