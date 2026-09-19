# Handoff — Stage A local rehearsal (safe, does not touch the real database)

Goal: run the sync-worker's plan doc Stage A rehearsal
(`2026-08-23-nube-e2ee-deploy.md`) against a **local-only** copy of the
Worker + D1, using the same schema as production, without ever writing to
the real Cloudflare D1 or deploying anything. Every command below is scoped
to local state (`--local` / no `--remote` flag). None of them can reach
prod. Where a command *would* touch prod, it's called out explicitly so
it's obvious what to skip.

Run everything from `cloud/sync-worker/`.

## 0. Preflight

```bash
cd cloud/sync-worker
git status .          # confirm no uncommitted edits in this folder
```

## 1. Local secrets (`.dev.vars`, gitignored, local only)

`wrangler dev` needs `WORKER_DATA_KEY` (used to encrypt `room_state` at
rest) or every push/pull throws. Any 64-hex-char value works locally — it
does **not** need to match the real production secret.

```bash
openssl rand -hex 32
```

Create `cloud/sync-worker/.dev.vars` (create the file, don't touch anything
in `wrangler.toml`):

```
WORKER_DATA_KEY=<paste the 64-hex value here>
```

## 2. Apply migrations to a local D1 copy only

```bash
npm run db:migrate:local
```

This runs `wrangler d1 migrations apply rplus-sync --local` — it creates/
updates a SQLite file under `.wrangler/state/`, entirely local, separate
from the real D1. Confirms migrations 006 through 012 (room DEK, admin
rescue key, app-version columns) apply cleanly from empty.

**Do not run `npm run db:migrate:remote`** — that's the one that touches
the real database. Skip it for this rehearsal.

## 3. Run the Worker locally

```bash
npm run dev
```

This is `wrangler dev` with no `--remote` flag — Miniflare runs the Worker,
the Durable Object, and D1 entirely in-process. No network call reaches
Cloudflare. Leave it running in this terminal; run the checks below from a
second terminal. Default URL: `http://localhost:8787`.

## 4. Smoke tests (second terminal)

Set a shortcut:

```bash
API=http://localhost:8787/api/sync/v1
```

**a. An "old" client (no `appVersion`) must be rejected at register:**

```bash
curl -s -w '\n%{http_code}\n' -X POST "$API/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"username":"dra.vieja","password":"correct-horse-battery"}'
```

Expect `426` and `"error":"update_required"`.

**b. A current client registers fine:**

```bash
curl -s -w '\n%{http_code}\n' -X POST "$API/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"username":"dra.nueva","password":"correct-horse-battery","appVersion":"8.2.0"}'
```

Expect `200` and a `token`. Save it:

```bash
TOKEN=<paste the token from the response above>
```

**c. An already-logged-in "old" device (valid token, old/missing version
header) must be rejected on room access, not just at login:**

```bash
curl -s -w '\n%{http_code}\n' "$API/rooms" -H "Authorization: Bearer $TOKEN"
```

Expect `426` — no `X-App-Version` header, same block as (a), even though the
token itself is valid.

**d. The same token, with a current version header, works normally:**

```bash
curl -s -w '\n%{http_code}\n' "$API/rooms" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'X-App-Version: 8.2.0'
```

Expect `200` and `{"rooms":[]}` (empty — no room created yet).

**e. Full round trip — create a room, set the room key, push/pull:**

```bash
curl -s -X POST "$API/rooms" \
  -H "Authorization: Bearer $TOKEN" -H 'X-App-Version: 8.2.0' \
  -H 'Content-Type: application/json' \
  -d '{"sala":"rehearsal"}'
```

Note the returned `id` and `code`, then:

```bash
ROOM_ID=<paste the id>

curl -s -w '\n%{http_code}\n' -X PUT "$API/rooms/$ROOM_ID/dek" \
  -H "Authorization: Bearer $TOKEN" -H 'X-App-Version: 8.2.0' \
  -H 'Content-Type: application/json' \
  -d '{"ct":"deadbeef","iv":"deadbeef","salt":"deadbeef"}'
```

Expect `200` — confirms the DEK write path (schema/006 columns) works
against the freshly-migrated local D1.

**f. Check version-stats visibility (admin endpoint):** promote `dra.nueva`
to admin locally first, or just confirm the route responds (401/403 is
fine here — it proves the route exists and the version-stats query itself
doesn't error against the migrated schema):

```bash
curl -s -w '\n%{http_code}\n' "$API/admin/version-stats" \
  -H "Authorization: Bearer $TOKEN" -H 'X-App-Version: 8.2.0'
```

## 5. Reset local state (optional, between reruns)

```bash
rm -rf .wrangler/state
```

Wipes the local D1/Durable Object state only. Cannot affect anything real —
`.wrangler/state` never leaves this machine.

## 6. What to report back

For each of (a)-(f): status code + whether it matched "expect". If
everything matches, Stage A's local rehearsal is done and it's safe to
talk about the next real step (applying migrations to the *real* D1 — still
not deploying yet). If anything doesn't match, paste the exact curl output
and I'll dig in from there.
