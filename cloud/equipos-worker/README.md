# R+ Equipos — Cloudflare Worker

Standalone **Lumify / EKG / Ultrasonido** queue on Cloudflare (no R+ LAN host required).

- **Worker** — `/api/equipos/v1/*` HTTP API
- **D1** — queue state (SQLite)
- **R2** — equipment photos
- **Assets** — mobile web UI (`cloud/equipos-pages/public`)

Clinical R+ stays local; only the equipos layer runs here.

## Prerequisites

- [Cloudflare account](https://dash.cloudflare.com) (free tier is enough)
- [Node.js](https://nodejs.org) 18+
- `npm install` in this directory

## One-time setup

**Quick path (repo root):**

```bash
npx wrangler login
node cloudflare/setup.mjs
```

**Manual path:**

```bash
cd cloud/equipos-worker
npm install

# Create D1 database
npx wrangler d1 create rplus-equipos
# Copy database_id into wrangler.toml → [[d1_databases]].database_id

# Create R2 bucket (Dashboard → R2 → Create bucket: rplus-equipos-photos)
# Or: npx wrangler r2 bucket create rplus-equipos-photos

# Apply schema
npm run db:migrate:remote

# Admin key (same value you enter in R+ desktop → Equipos → Cloudflare)
npx wrangler secret put EQUIPOS_ADMIN_KEY
```

## Deploy

```bash
npm run deploy
```

Note the workers.dev URL or attach a custom domain in Cloudflare Dashboard → Workers → Triggers.

## Bootstrap access token

1. In R+ desktop (R4): **⇄ LAN** panel → **Equipos** → expand **Cola en Cloudflare**
2. Enter **URL cloud** + **Clave admin** → **Guardar cloud**
3. Click **Regenerar token** — creates the program QR token in D1
4. Share QR / link with residents

## R+ desktop configuration

Stored in `rpc-settings` (`equiposCloudUrl`, `equiposAdminKey`):

| Field | Example |
|-------|---------|
| URL | `https://equipos.yourdomain.com` |
| Admin key | value from `wrangler secret put EQUIPOS_ADMIN_KEY` |

When cloud URL is set, the desktop board and QR panel use the Worker API instead of LAN host / SQLCipher.

## API (unchanged contract)

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/equipos/v1/ping` | — |
| GET | `/api/equipos/v1/board` | token or admin |
| POST | `/api/equipos/v1/checkout` | token |
| POST | `/api/equipos/v1/return` | token |
| POST | `/api/equipos/v1/waitlist/join` | token |
| POST | `/api/equipos/v1/waitlist/leave` | token |
| POST | `/api/equipos/v1/alert` | token |
| POST | `/api/equipos/v1/alert/:id/ack` | token |
| GET | `/api/equipos/v1/admin/access` | admin |
| POST | `/api/equipos/v1/admin/access/rotate` | admin |
| POST | `/api/equipos/v1/admin/access/set-active` | admin |
| POST | `/api/equipos/v1/admin/purge-queue` | admin |

Headers: `X-Equipos-Token` (mobile), `X-Equipos-Admin-Key` (desktop admin).

## Local dev

```bash
npm run db:migrate:local
EQUIPOS_ADMIN_KEY=dev-admin npm run dev
```

## Photo purge

Cron `0 6 * * *` (06:00 UTC) deletes photos **older than 14 days** (admin history window). Uploads are JPEG-compressed client-side (~720px).

## Syncing static UI after edits

If you change `public/equipos/*` in the main repo, copy to Pages assets:

```bash
cp public/equipos/{equipos-app.mjs,host-discovery.mjs,equipos-api.mjs,equipos-rotaciones.mjs,equipos.css} \
  cloud/equipos-pages/public/equipos/
```

Then redeploy the worker.
