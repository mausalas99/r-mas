# rplus-sync-worker

Cloudflare Worker for the **R+ 7.9 Nube Free pilot** — HTTP push/pull room sync for Sala and Torre HU (see `docs/superpowers/specs/2026-08-02-cloud-sync-free-pilot-design.md`).

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

## Dev

```bash
npm run dev
curl http://127.0.0.1:8787/api/sync/v1/ping
# → {"ok":true,"service":"rplus-sync"}
```

Auth, rooms, and sync routes are added in follow-up tasks (3–6).
