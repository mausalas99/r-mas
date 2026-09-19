# Update feed Worker — GitHub first, GitLab fallback

> **For implementation:** After this spec is accepted, use **writing-plans**. Do not change the baked-in feed in 8.1.4. Old installs still hit GitHub only.

**Date:** 2026-08-15  
**Status:** Done — built and tested  
**Codename:** Update feed  
**Handoff:** [`docs/core/20-claude-code-handoff.md`](../../core/20-claude-code-handoff.md)

---

## Intent

Own one public URL for `latest-mac.yml` / `latest.yml`. The Worker tries **GitHub first**. If GitHub 404s or errors, it serves GitLab. When `mausalas99/r-mas` is public again, the Worker uses GitHub with **no app change**.

This does **not** update 8.1.2 / 8.1.3. Those builds call GitHub directly. They move only after GitHub Releases exist again, or after a **manual** install of a build whose feed is the Worker.

---

## Decisions locked

| Decision | Choice |
|---|---|
| Default origin | **GitHub** `mausalas99/r-mas` |
| Fallback origin | **GitLab** `rmas-group1/rmas` (confirm path) |
| App feed (new builds only) | `provider: generic` → Worker base URL |
| Revert when GitHub is back | Upload `v8.1.4` to GitHub. Worker already prefers GitHub. Optional later: set `UPDATE_FEED_MODE=github` |
| Where the Worker lives | **New** Worker. Not `rplus-sync`. Not `equipos-worker`. |
| Proxy zips / DMGs | **No.** Rewrite yml `url:` to absolute URLs on the live host |
| Tokens in Worker | **None** if both remotes are public. Do not put a GitHub PAT in a public Worker |
| Cache | Short (`s-maxage=60`) so a GitHub restore shows up fast |
| Mac App Store | Out of scope |
| Second GitHub account | Forbidden (circumvention) |

---

## Why

2026-08-14 GitHub staff locked `mausalas99` after a suspicious login (`user.suspend` → password randomized → `user.unsuspend`). Releases objects were wiped. Tags remain. Unauthenticated `github.com/mausalas99/r-mas` 404s. Ticket is open. Support is intake-only so far.

Installed apps use `package.json` `publish`: `provider: github`, `owner: mausalas99`, `repo: r-mas`. They hit:

- `https://github.com/mausalas99/r-mas/releases/latest`
- `https://github.com/mausalas99/r-mas/releases/download/<tag>/latest-mac.yml`

A GitLab-only publish does not answer those URLs.

---

## Architecture

```
New R+ build
  setFeedURL({ provider: 'generic', url: 'https://<updates-host>/' })
       │
       ▼
  GET /latest-mac.yml   (darwin)
  GET /latest.yml       (win32)
       │
       ├─ 1. GitHub  GET …/releases/download/v<latest>/latest-mac.yml
       └─ 2. GitLab  GET release asset latest-mac.yml
       │
       ▼
  200 + rewritten yml (absolute zip/exe URLs on the host that answered)
       │
       ▼
  electron-updater downloads zip from GitHub or GitLab directly
```

Also serve (same probe order):

- `GET /min-version.json`
- `GET /stable-versions.json`

Today those are `raw.githubusercontent.com/mausalas99/r-mas/main/…` (`min-version-fetch.mjs`, `lib/update-downgrade.mjs`). A private GitHub 404s them too.

---

## App change (next version, not 8.1.4)

One module, e.g. `lib/update-feed.mjs`:

```js
export const UPDATE_FEED_MODE = 'worker' // 'github' | 'worker'
export const UPDATE_WORKER_URL = 'https://<updates-host>/'
```

- `worker`: default `setFeedURL` generic → `UPDATE_WORKER_URL`
- `github`: today’s GitHub provider (easy revert in a later build)
- Downgrade already uses generic + `buildGenericFeedUrl` (GitHub tag folder). Keep that until GitHub is back; then optionally point downgrade at the Worker too
- `min-version-fetch.mjs` and `STABLE_VERSIONS_RAW_URL`: Worker first, GitHub second

Do **not** dual-`setFeedURL` GitHub+GitLab inside Electron. The Worker is the only failover.

---

## Worker

New dir: `cloud/update-worker/` (`wrangler.toml`, `src/index.js`, tests).

| Route | Behavior |
|---|---|
| `GET /latest-mac.yml` | Probe GitHub then GitLab. Rewrite file `url` to absolute. |
| `GET /latest.yml` | Same for Windows |
| `GET /min-version.json` | Same probe; no rewrite |
| `GET /stable-versions.json` | Same probe; no rewrite |
| `GET /health` | `{ github: ok\|fail, gitlab: ok\|fail, using: github\|gitlab }` |

Rules:

- Do not attach this Worker to `rplus-sync` assets
- Do not stream 140 MB through the Worker
- If both origins fail, 502 + short body (updater already surfaces errors)
- Confirm GitLab asset URLs work **signed out** before relying on them (some package-registry links require login)

---

## GitLab (human, this weekend)

Project: public `rmas-group1/rmas` (confirm). Tag on the Release page may be `8.1.4` (not `v8.1.4`).

The GitLab web UI **Add URL** does not upload binaries. Use:

```bash
cd /Users/mauriciosalas/R+
glab release upload 8.1.4 -R rmas-group1/rmas \
  dist/R+-8.1.4-Mac-Apple-Silicon.dmg \
  dist/R+-8.1.4-Mac-Intel.dmg \
  dist/R+-8.1.4-Windows.exe \
  dist/R+-8.1.4-autoupdate-mac-arm64.zip \
  dist/R+-8.1.4-autoupdate-mac-arm64.zip.blockmap \
  dist/R+-8.1.4-autoupdate-mac-x64.zip \
  dist/R+-8.1.4-autoupdate-mac-x64.zip.blockmap \
  dist/R+-8.1.4-x64.exe \
  dist/R+-8.1.4-x64.exe.blockmap \
  dist/latest-mac.yml \
  dist/latest.yml
```

Test downloads in a private window.

---

## When GitHub is back (revert)

1. Keep `r-mas` **Public**.
2. Create GitHub Release **from existing tag** `v8.1.4` (do not make a new tag).
3. Upload the same `dist/` list (human DMG names + `autoupdate-mac-*` zips + yml). Do not upload builder `arm64.dmg` / `arm64.zip` / `*.dmg.blockmap`.
4. Notes: `dist/GITHUB_RELEASE_NOTES_8.1.4.md`. Latest, not draft.
5. Old 8.1.2 / 8.1.3 apps start updating. Worker `using` becomes `github`.
6. Optional later build: `UPDATE_FEED_MODE = 'github'` if you want to drop the Worker. Not required.

---

## Out of scope

- Changing 8.1.4’s baked-in GitHub feed
- Mac App Store
- New GitHub account
- Graph memory, Nube crypto, UI bugs
- Proxying installers through Cloudflare

---

## Acceptance

- [x] Worker prefers GitHub when public; GitLab when GitHub 404s
- [x] yml `url` fields are absolute; zips are not proxied
- [x] `/health` reports which origin is live
- [x] `UPDATE_FEED_MODE` flips default feed without other edits
- [x] Colocated Worker tests + `test:one` (no full `npm test`)
- [x] New Worker path registered; not imported from `rplus-sync`
- [x] Docs: this spec + handoff updated. Features-index row already present (line 45).
