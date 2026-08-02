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

### Create room (Sala or Torre HU only)

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
ROOM_ID="<room id from create>"
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

## Tests

```bash
npm test
```
