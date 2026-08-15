---
type: "core"
name: "Claude Code Handoff"
status: "in-progress"
description: "Resume here in Claude Code. Job: update-feed Worker (GitHub first, GitLab fallback). GitHub account lock 2026-08-14."
---

# Handoff — update feed (GitHub lock)

**Date:** 2026-08-15  
**From:** Cursor (Grok 4.6)  
**To:** Claude Code  
**Branch:** `main` (local 8.1.4; `origin/main` may match)  
**Worktree:** `/Users/mauriciosalas/R+`

---

## Start Claude Code

```bash
cd /Users/mauriciosalas/R+
claude --model sonnet --effort medium
```

First prompt (paste once):

```
Read CLAUDE.md and docs/core/20-claude-code-handoff.md only.
Then read docs/superpowers/specs/2026-08-15-update-feed-worker-design.md.
Do not read the docs hub or project-context yet.
UI bugs, Nube crypto, and graph-memory tests are closed. Do not reopen them.
Task: implement the update-feed Worker + UPDATE_FEED_MODE per the spec.
GitHub first. GitLab fallback. Easy revert = upload to GitHub; do not drop the Worker.
Do not change the baked-in feed inside the already-built 8.1.4 dist.
Do not create a second GitHub account.
```

Plan a hard task: new session `claude --agent ceo-fable --effort high` (or `/model fable` then `/plan`). Then `/clear` and execute on Sonnet.

---

## Active plans

| Plan | Path |
|------|------|
| **Update feed Worker (this job)** | `docs/superpowers/specs/2026-08-15-update-feed-worker-design.md` |
| Nube client-encryption compliance review | `docs/superpowers/plans/2026-08-14-nube-client-encryption-compliance.md` — **do not start** |
| Startup lag optimization | `docs/superpowers/plans/2026-08-15-startup-lag-optimization.md` — **do not start** |

---

## What happened (do not re-investigate)

| When | Fact |
|------|------|
| 2026-08-14 morning | `v8.1.3` GitHub Release existed and was Latest |
| ~11h before lock | Failed login `189.175.111.234` Monterrey |
| ~9h before evening | GitHub staff: `user.suspend` → password randomized → revoke all OAuth (CLI, Cursor, Copilot, …) → `user.unsuspend` |
| Email | Standard “suspicious login / force password reset”. Mentions infostealer as a common cause. Not a ToS/malware-in-Releases letter |
| After lock | Releases page empty. **Tags remain** (`v8.1.4` … `v8.0.8`). Unauthenticated `github.com/mausalas99/r-mas` **404** (private or hidden) |
| This machine `gh` | Keyring token was dead; Mauricio re-authed and added SSH `SHA256:aYBWi+4xbr5okYzL0desqwOiBCoLFUqC2U1B417xsX0` |
| Local scan | No AMOS/Atomic persistence. No AV. Only old `curl\|sh` was June FCC installer. Not a proof of clean — Malwarebytes still recommended |
| Support | Ticket open (`djsalas99@gmail.com`). First reply was **intake template** (asked username/email again). Saturday unsuspend possible, not likely |
| GitLab | Public project under **rmas-group1** / slug **rmas**. Release **8.1.4** notes exist. Web UI cannot upload binaries — use `glab release upload` |

`scripts/release.js` does **not** delete other Releases. This machine’s `gh` could not have wiped them (token invalid). Staff lock + missing Release objects; tags are git and stayed.

---

## What still works locally

All 8.1.4 artifacts are in `/Users/mauriciosalas/R+/dist`. Upload **these** names (GitHub or GitLab):

- `R+-8.1.4-Mac-Apple-Silicon.dmg`
- `R+-8.1.4-Mac-Intel.dmg`
- `R+-8.1.4-Windows.exe`
- `R+-8.1.4-autoupdate-mac-arm64.zip` + `.blockmap`
- `R+-8.1.4-autoupdate-mac-x64.zip` + `.blockmap`
- `R+-8.1.4-x64.exe` + `.blockmap`
- `latest-mac.yml` (points at `autoupdate-mac-*` zips)
- `latest.yml`
- Notes: `GITHUB_RELEASE_NOTES_8.1.4.md`

Do **not** upload `R+-8.1.4-arm64.dmg`, `*-x64.dmg`, `*-arm64.zip`, `*-x64.zip`, or `*.dmg.blockmap`.

GitHub tag already exists: **`v8.1.4`**. Recreate the Release on that tag. Do not make a new tag.

---

## Constraints (hard)

1. **Old apps** (8.1.2 / 8.1.3 / 8.1.4 already installed) only check `mausalas99/r-mas`. GitLab and the Worker do not reach them until they install a new build **or** GitHub Releases are public again.
2. Do **not** open a second GitHub account.
3. Do **not** put the feed Worker on `cloud/sync-worker` (Nube / PHI rooms).
4. Do **not** proxy 140 MB zips through Cloudflare.
5. Do **not** put a GitHub PAT in the Worker.
6. Dual Electron providers: **no**. One generic URL → Worker. Worker fails over.
7. This weekend residents get the Silicon DMG **by hand**. Auto-update of old copies waits for GitHub.

---

## Implement (this session)

Spec is the contract: `docs/superpowers/specs/2026-08-15-update-feed-worker-design.md`.

1. `cloud/update-worker/` — probe GitHub then GitLab; rewrite yml URLs to absolute; `/health`.
2. `lib/update-feed.mjs` — `UPDATE_FEED_MODE = 'worker' | 'github'` and `UPDATE_WORKER_URL`. Default for **new** builds: `worker`.
3. Wire default `setFeedURL` in `main.js` from that module. Leave downgrade generic-on-GitHub until GitHub is back unless the spec’s optional step is cheap.
4. Point `min-version-fetch.mjs` and `STABLE_VERSIONS_RAW_URL` at the Worker first.
5. Tests via `npm run test:one`. Register new `*.test.mjs` in `package.json` `scripts.test`.
6. Do not run full `npm test`. Do not `build:ui` unless you edit `public/js`.
7. Do not publish. Do not `gh release`. Do not refresh metrics baseline.

**Revert path (document in code comment + README of the Worker):**

```
GitHub public again
  → upload v8.1.4 assets to existing tag
  → old apps update
  → Worker /health using=github
  → optional later: UPDATE_FEED_MODE=github
```

---

## Closed (do not reopen)

- Paciente Resumen pills, hide-sidebar, ⌘1/⌘E/⌘T, census Filtros
- Nube V1 crypto (plaintext D1 accepted)
- Graph-memory pipeline (landed 2026-08-14). Do not ingest PHI. Do not add it to the Electron app
- Mac App Store as a weekend ship
- Changing 8.1.4 dist feed

## Dirty / local (do not fold into this commit unless they are the feed work)

`min-version.json`, `scripts/write-release-yml.js`, `scripts/graph-memory/`, `.mcp.json.example` may be dirty. Only stage files you change for the Worker + feed module.

---

## Test plan

```bash
npm run test:one -- cloud/update-worker/src/feed.test.mjs
npm run test:one -- lib/update-feed.test.mjs
# plus any colocated test you add
```

Pass: GitHub 200 → yml uses GitHub absolute URLs. GitHub 404 + GitLab 200 → GitLab URLs. Both fail → 502. `UPDATE_FEED_MODE=github` does not call the Worker.
