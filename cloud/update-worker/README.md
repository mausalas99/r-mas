# rmas-update-feed

New Worker, sibling to `cloud/equipos-worker` and `cloud/sync-worker`. Stateless
— no D1/DO/R2/KV bindings, no PHI, no GitHub/GitLab token (both repos are
public).

## Why this exists

GitHub locked `mausalas99` on 2026-08-14. Releases were wiped; the repo 404s
unauthenticated. Installed apps read `latest-mac.yml` / `latest.yml` straight
from `github.com/mausalas99/r-mas/releases/...`, so a private repo breaks
auto-update for everyone already running the app.

This Worker owns one public URL. It tries **GitHub first**; if GitHub 404s or
errors, it serves the same file from **GitLab** (`rmas-group1/rmas`). New
builds point `setFeedURL` at this Worker instead of GitHub directly
(`lib/update-feed.mjs`, `UPDATE_FEED_MODE = 'worker'`). Old 8.1.2/8.1.3
installs are unaffected — they call GitHub directly and don't know this Worker
exists.

## Routes

| Route | Behavior |
|---|---|
| `GET /latest-mac.yml` | GitHub `releases/latest/download` (redirect-follow, no hardcoded tag) → GitLab release asset for tag `8.1.4`. Rewrites every `url:` line to an absolute URL on whichever origin answered. |
| `GET /latest.yml` | Same, for Windows. |
| `GET /min-version.json` | GitHub raw (`raw.githubusercontent.com/.../main/...`) → GitLab raw. Body proxied untouched. |
| `GET /stable-versions.json` | Same as above. |
| `GET /health` | `{ github: 'ok'\|'fail', gitlab: 'ok'\|'fail', using: 'github'\|'gitlab'\|'none' }` |

The Worker never proxies zip/dmg/exe bytes — only rewrites the yml so
electron-updater downloads the binary directly from GitHub or GitLab.
Successful responses carry `Cache-Control: s-maxage=60` so a GitHub restore
shows up within a minute.

## Revert path — when GitHub is public again

```
GitHub public again
  → upload v8.1.4 assets to the existing tag (do not create a new tag)
  → old 8.1.2/8.1.3/8.1.4 apps resume updating directly from GitHub
  → this Worker's /health flips to using=github (GitHub is tried first)
  → optional, later build: set UPDATE_FEED_MODE='github' in lib/update-feed.mjs
    to stop pointing new builds at this Worker
```

No code change is required to "restore" GitHub — the Worker already prefers
it. Dropping the Worker afterward is optional cleanup, not a requirement.

## GitLab data files

`min-version.json` and `stable-versions.json` must exist on `rmas-group1/rmas`
`main` — the `/min-version.json` and `/stable-versions.json` routes 502 on the
GitLab fallback until they're pushed there. No PHI in either file. This is a
publish-step task, not a code change — push them as part of publishing, not
before.

## Local dev

```bash
cd cloud/update-worker
npm install
npm run dev      # wrangler dev
```

## Tests

```bash
npm run test:one -- cloud/update-worker/src/feed.test.mjs
npm run test:one -- cloud/update-worker/src/index.test.mjs
```
