# R+ Nube sync worker (7.9 Free pilot)

Cloudflare Worker + D1 room authority for **Sala** and **Torre HU**. HTTP push/pull only (no WebSockets). Equipos stays in [`../equipos-worker/`](../equipos-worker/).

**Spec:** [`../../docs/superpowers/specs/2026-08-02-cloud-sync-free-pilot-design.md`](../../docs/superpowers/specs/2026-08-02-cloud-sync-free-pilot-design.md)

> **Pilot warning:** This service stores encrypted room state server-side. Only opt in from the ⇄ LAN panel when your team accepts the trade-offs in the design spec. Cloudflare Free tier has daily request and D1 write caps — see [Pilot sizing](#pilot-sizing-free-tier).

## Scope

| Profile sala | Sync path |
|--------------|-----------|
| **Sala**, **Torre HU** | Nube (this worker) when connected |
| Interconsultas, UX, Eme, Área A/Pensionistas | LAN only (unchanged) |

When Nube is connected for Sala or Torre HU, **cloud room authority overrides LAN** for that turn (no host Mac required). Disconnecting Nube falls back to LAN.

---

## Pilot cutover (7.9 user wipe)

Release **7.9** resets **clinical user accounts** (local + cloud pilot). **Patient/lab blobs are not wiped by default** — teams re-register and reclaim turn censo via the cloud turn room.

### Desktop (each workstation)

1. Install **7.9.0**.
2. Re-register **@usuario + nombre** (LAN salas) or **@usuario + nombre + contraseña nube** (Sala / Torre HU).
3. Flow: **Cuenta nube** → **Mi rotación** → app calls **`ensure-turn`** (canonical turn room for today’s `sala` + `turnKey`).
4. Shared turn patients reappear after pull from the turn room (if state already exists in D1).

User-facing copy: [`../../docs/RELEASE_NOTES_7.9.0.txt`](../../docs/RELEASE_NOTES_7.9.0.txt) § *Corte de usuarios*.

### Cloud D1 reset (pilot day)

Use when you want a **clean slate** for accounts/sessions/rooms on deploy day. **Destructive** — back up first if any room has live censo you need to keep.

**Option A — truncate auth + rooms (keep schema):**

```bash
cd cloud/sync-worker
npx wrangler d1 execute rplus-sync --remote --command "
  DELETE FROM tombstones;
  DELETE FROM mutations;
  DELETE FROM room_state;
  DELETE FROM room_members;
  DELETE FROM rooms;
  DELETE FROM sessions;
  DELETE FROM users;
"
```

**Option B — recreate database** (new `database_id` in `wrangler.toml`, then `npm run db:migrate:remote`).

**Option C — surgical purge** — per-room `POST /admin/rooms/:id/purge` or per-user `DELETE /admin/users/:id` (see [Admin API](#admin-api-r4--program-admin)).

After reset, bootstrap at least one **program admin** (below) before the team registers.

### Bootstrap first admin (`SYNC_ADMIN_KEY`)

```bash
openssl rand -hex 32 | npx wrangler secret put SYNC_ADMIN_KEY
```

1. Any resident registers via the app or `POST /auth/register`.
2. Copy their `user.id` from the register response (or `GET /admin/users?q=` once an admin exists).
3. Promote:

```bash
BASE="https://YOUR-URL"
ADMIN_KEY="<SYNC_ADMIN_KEY>"
USER_ID="<user id>"

curl -s -X POST "$BASE/api/sync/v1/admin/users/$USER_ID/promote" \
  -H "X-Sync-Admin-Key: $ADMIN_KEY" \
  -H 'content-type: application/json' \
  -d '{"role":"admin"}'
```

`role` may be `admin` or `program_admin`. After promotion, that user can open **Administración nube** in R+ (Sala/Torre, admin session).

---

## Plug-and-play deploy

From repo root (Wrangler logged in):

```bash
node cloudflare/setup-sync.mjs
```

This will:

1. `npm install` in this package
2. Create D1 `rplus-sync` and patch `wrangler.toml`
3. Apply `schema/001-init.sql` remotely
4. Set secret `WORKER_DATA_KEY` (AES-GCM at-rest; auto-generated if you press Enter)
5. `wrangler deploy` → `https://rplus-sync.<account>.workers.dev`

Verify:

```bash
curl -s "https://YOUR-URL/api/sync/v1/ping"
# → {"ok":true,"service":"rplus-sync"}
```

In R+ desktop (profile sala **Sala** or **Torre HU**): **⇄** → Nube → paste Worker URL.

---

## Manual steps

```bash
cd cloud/sync-worker
npm install
npx wrangler d1 create rplus-sync
# paste database_id into wrangler.toml
npm run db:migrate:remote
openssl rand -hex 32 | npx wrangler secret put WORKER_DATA_KEY
npm run deploy
```

## Local dev

```bash
cd cloud/sync-worker
npm install
cp .dev.vars.example .dev.vars   # or let setup-sync write it
npm run db:migrate:local
npm run dev
curl http://127.0.0.1:8787/api/sync/v1/ping
```

## Custom domain

Dashboard → **rplus-sync** → Domains & Routes → e.g. `sync.tudominio.org`, then uncomment `[[routes]]` in `wrangler.toml` and redeploy.

## Pilot sizing (Free tier)

```bash
npm run estimate:free
```

Default assumptions (**10 users × 12 h × 15 s poll** + light edits) stay under **100k requests/day** and **100k D1 writes/day**. Poll runs only while the app is focused.

| Resource | Free / day | V1 behavior |
|----------|------------|-------------|
| Worker requests | 100k | 15s poll when visible + push-on-save |
| D1 rows written | 100k | Coalesced mutations |
| D1 storage | 500 MB / DB | Room storage quota |

Override assumptions: `USERS=15 HOURS=8 POLL_SEC=20 npm run estimate:free`

## Secrets

| Secret | Purpose |
|--------|---------|
| `WORKER_DATA_KEY` | 64 hex chars — AES-256-GCM for `room_state` ciphertext |
| `SYNC_ADMIN_KEY` | Bootstrap + break-glass admin API (`X-Sync-Admin-Key` header); optional if all admins use `role=admin` sessions |

## API smoke (curl)

Replace `BASE` with `http://127.0.0.1:8787` (dev) or your workers.dev URL.

### Ping

```bash
curl -s "$BASE/api/sync/v1/ping"
```

### Register + login

```bash
curl -s -X POST "$BASE/api/sync/v1/auth/register" \
  -H 'content-type: application/json' \
  -d '{"username":"r1demo","password":"test-password-1","displayName":"R1 Demo"}'

curl -s -X POST "$BASE/api/sync/v1/auth/login" \
  -H 'content-type: application/json' \
  -d '{"username":"r1demo","password":"test-password-1"}'
# → {"token":"...","expiresAt":"...","user":{...}}
```

### Me / logout

```bash
TOKEN="<paste token>"
curl -s "$BASE/api/sync/v1/auth/me" -H "Authorization: Bearer $TOKEN"
curl -s -X POST "$BASE/api/sync/v1/auth/logout" -H "Authorization: Bearer $TOKEN"
```

### Ensure turn room (join-or-create)

Canonical room for **Sala** or **Torre HU** + today’s turn key (America/Mexico_City). The desktop client calls this after **Mi rotación** — no manual room code.

```bash
curl -s -X POST "$BASE/api/sync/v1/rooms/ensure-turn" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"sala":"Sala"}'
# optional explicit turn: {"sala":"Torre HU","turnKey":"2026-08-02"}
# → {"room":{"id":"...","code":"ABC123","sala":"Sala","turnKey":"2026-08-02",...}}
```

### Create room (manual / smoke)

```bash
curl -s -X POST "$BASE/api/sync/v1/rooms" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"name":"Guardia demo","sala":"Sala"}'
# → {"room":{"id":"...","code":"ABC123",...}}
```

### Join by code

```bash
curl -s -X POST "$BASE/api/sync/v1/rooms/join" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"code":"ABC123"}'
```

### Push mutation + pull

```bash
ROOM_ID="<room id from create or ensure-turn>"
curl -s -X POST "$BASE/api/sync/v1/rooms/$ROOM_ID/mutations" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{
    "clientMutationId":"smoke-1",
    "baseRevision":0,
    "ops":[{"path":"entries/0","value":{"id":"p1","name":"Demo"}}]
  }'

curl -s "$BASE/api/sync/v1/rooms/$ROOM_ID/pull?since=0" \
  -H "Authorization: Bearer $TOKEN"
```


## Admin API (R4 / program admin)

All routes under `/api/sync/v1/admin/...`. Requires **Bearer** session with `role` `admin` or `program_admin`, **or** header `X-Sync-Admin-Key` matching wrangler secret `SYNC_ADMIN_KEY`.

Set the secret:

```bash
openssl rand -hex 32 | npx wrangler secret put SYNC_ADMIN_KEY
```

Bootstrap first admin (no admin user yet — admin key only):

```bash
BASE="https://YOUR-URL"
ADMIN_KEY="<paste SYNC_ADMIN_KEY>"
USER_ID="<user id from register>"

curl -s -X POST "$BASE/api/sync/v1/admin/users/$USER_ID/promote" \
  -H "X-Sync-Admin-Key: $ADMIN_KEY" \
  -H 'content-type: application/json' \
  -d '{"role":"admin"}'
```

Overview:

```bash
curl -s "$BASE/api/sync/v1/admin/overview" \
  -H "Authorization: Bearer $TOKEN"
# or: -H "X-Sync-Admin-Key: $ADMIN_KEY"
```

| Method | Path | Notes |
|--------|------|-------|
| GET | `/admin/overview` | counts + storage meters |
| GET | `/admin/rooms` | list rooms + memberCount |
| GET | `/admin/rooms/:id` | room detail + members |
| POST | `/admin/rooms/:id/rotate-code` | new join code |
| POST | `/admin/rooms/:id/purge` | delete room data |
| GET | `/admin/rooms/:id/mutations?limit=50` | recent mutations (ops truncated) |
| GET | `/admin/users?q=` | search users |
| POST | `/admin/users/:id/revoke-sessions` | logout everywhere |
| POST | `/admin/users/:id/promote` | set `role` (admin key OK for bootstrap) |
| POST | `/admin/users/:id/disable` | `disabled=1` + revoke sessions |
| DELETE | `/admin/users/:id` | delete user (sessions + memberships) |

## Tests

```bash
npm test
```
