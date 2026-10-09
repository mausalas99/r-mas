# 11 · Releases & updates

> **You'll learn:** what `npm run release:bump` and `release:publish` actually do, how a commit becomes an installer on a resident's laptop, how the app finds and verifies updates, and the two safety valves (`min-version.json`, `stable-versions.json`).
>
> **Prereqs:** [02](./02-how-the-app-is-built.md) (build step), [09](./09-storage-and-security.md) (native modules)

---

## The journey of a release

```
 feature commits on main ──► CI (lint, metrics:check, unit tests on macOS)
          │
          ▼
 npm run release:bump -- 8.4.9      ← version, notes template, README, highlights stub
          │  (you edit docs/RELEASE_NOTES_8.4.9.txt + highlights)
          ▼
 npm run release:publish -- --yes
   preflight → "chore(release): prepare 8.4.9" → tests → push
   → verify natives → build mac (sign bundle, electron-builder, notarize)
   → build win → tag v8.4.9 → gh release create (assets)
   → "chore(release): publish 8.4.9 update manifests" (dist/latest*.yml) → push
          │
          ▼
 GitHub Release  ◄── update-worker (Cloudflare) ◄── installed apps poll it
                                                      download, verify sha512,
                                                      install on quit
```

Look at the real thing: `git show --stat 07096a8` (*prepare 8.4.9*) and `git show 291a02b` (*publish 8.4.9 update manifests*).

---

## 1. `release:bump` — prepare the paperwork

`scripts/release.js` → `cmdBump`:

1. Resolve the version (`8.4.9`, `patch`, `minor`, `major`, or prompt).
2. `npm version X --no-git-tag-version` (package.json + lockfile).
3. Create `docs/RELEASE_NOTES_X.txt` from a template: title, `Fecha:`, `## Resumen`, `## Nuevo / mejorado`, `## Instalación`.
4. Update the README's "Versión estable actual" line and add a section.
5. Overwrite `packages/core/data/release-notes-highlights.mjs` with TODO stubs (the in-app *What's new* cards).
6. Rebuild `CHANGELOG.md` (gitignored, local only) and sync `build.files`.

Then **you** fill in the notes and highlights. Leftover TODOs only warn — they don't block.

### Where release notes end up
| Source | Shown where |
|---|---|
| `## Resumen` + `## Nuevo / mejorado` bullets | stripped to plain text → `releaseNotes:` in `latest*.yml` → **the in-app update prompt** |
| whole notes file | GitHub Release body (prefixed "# Descargar R+ X") |
| newest 6 notes files | landing site `novedades.html` (sentences mentioning SOME are dropped) |
| `release-notes-highlights.mjs` | in-app *What's new* cards |

---

## 2. `release:publish` — build, sign, ship

`cmdPublish` in `scripts/release.js`, in order:

| # | Step | Notes |
|---|---|---|
| 1 | **Preflight** | notes file exists; tag `vX` and GitHub release don't (unless `--allow-existing-gh`) |
| 2 | Commit `chore(release): prepare X` | stages `RELEASE_STAGE_PATHS` (`scripts/lib/release-git.js`) |
| 3 | Restore natives + `npm test` | strict native rebuild first |
| 4 | Push `main` | |
| 5 | **Verify natives** | SQLite module + argon2 `.node` for darwin-arm64, darwin-x64, win32-x64 must exist (`verify-release-natives.mjs`) |
| 6 | **Build mac** | `prebuild:mac` → `sign-release-bundle.mjs` → `electron-builder --mac` (dmg + zip, arm64 + x64, notarized) |
| 7 | **Build win** | same with NSIS x64 `.exe` |
| 8 | Verify `dist/` | |
| 9 | Tag `vX` + push | |
| 10 | Assets | readable aliases (`R+-X-Mac-Apple-Silicon.dmg`, `Instalar-R+-X-Windows.exe`) + updater zips |
| 11 | `gh release create vX --repo mausalas99/r-mas` | |
| 12 | `stable-versions.json` | new entry `recommended:true` (working tree only — committed with the *next* prepare) |
| 13 | Commit `chore(release): publish X update manifests` | `git add -f dist/latest-mac.yml dist/latest.yml` |
| 14 | Reminder | deploy `cloud/sync-worker` and `cloud/equipos-worker` by hand (`npm run deploy`) |

> 🧩 **Why some files "lag one release":** `module-manifest.json`/`module-signature.txt` and the `stable-versions.json` entry are written *during* publish, after the release commit, so they land in the **next** release's *prepare* commit. In `07096a8` (prepare 8.4.9) you see the **8.4.8** stable entry being added. That's expected, not a bug.

### Why argon2 binaries are fetched by hand
npm only installs native packages for the machine you're on. To build Windows and Intel-Mac installers from an Apple Silicon Mac, `fetch-argon2-win.mjs` / `fetch-argon2-darwin-x64.mjs` download the right `@node-rs/argon2-<platform>` tarball from npm and extract the `.node` file. `electron-builder-after-pack.cjs` then removes the wrong-arch files.

---

## 3. electron-builder in one table

Config lives in `package.json` → `"build"`.

| Setting | Value / meaning |
|---|---|
| `appId` / `productName` | `com.rmas.rplusclinical` / `R+` |
| Mac | dmg + zip, arm64 + x64, `hardenedRuntime`, `notarize` (Apple's malware scan; needed for Gatekeeper) |
| Windows | NSIS, `oneClick` (no wizard), per-user, desktop shortcut always |
| **Fuses** | runAsNode off, NODE_OPTIONS off, inspector off, only load from asar — turns off ways to hijack a shipped app |
| `asarUnpack` | native `.node` files + `.docx` templates stay outside the archive |
| `afterAllArtifactBuild` | runs `write-release-yml.js` to fix the manifests (electron-builder writes `r-plus-…` URLs because of the `+` in the name, and doesn't merge arm64/x64) |

---

## 4. How an installed app updates itself

### Full app updates (electron-updater)
- `main.js` → `getAutoUpdater()`; `lib/update-feed.js` sets `UPDATE_FEED_MODE = 'worker'` and the feed URL `https://rmas-update-feed.rmas-workersdev.workers.dev/`.
- That's `cloud/update-worker`. It fetches `latest*.yml` from **GitHub** (falling back to **GitLab** `rmas-group1/rmas`), rewrites URLs to absolute ones, and **never proxies the big files** — the app downloads them directly. It was added after the GitHub account lock on 2026-08-14 (decision log 2026-08-15).
- Checks happen 1.5 s after the window loads, from the menu, and via Ajustes. Per decision log 2026-08-13 they're **silent** (30 min throttle, no "you're up to date" toast) except from Ajustes.
- electron-updater verifies the download against the yml's **sha512**; on Mac the code signature must also match. Install on quit or on click.
- **Channels:** estable / beta. **Downgrade / reinstall** points the feed at a specific GitHub tag (`lib/update-downgrade.js`), using `stable-versions.json` as the menu.

### Renderer-only "module updates" (signed bundles)
At release, `scripts/sign-release-bundle.mjs` hashes `app.bundle.mjs` + `chunks/*` (SHA-256) into `module-manifest.json` and signs it with an **ECDSA P-256 private key that lives only on the maintainer's machine** (`~/.rplus-release-key.pem`). The public half is `packages/core/module-update-pubkey.pem`.

- **Every packaged boot:** `verifyModuleBootOrRollback` checks signature + every file hash. Fail → refuse to load (fail closed), try automatic rollback to the last good version, else error and quit.
- **Two failed boots in a row** on a version → rollback (`rollback-tracker.mjs`). Menu: *"Mantener versión pese a fallos…"* turns that off.
- **Live module updates:** `lib/module-update-fetch.mjs` can fetch a newer signed bundle, verify it, extract it safely (zip-slip guard) to `userData/modules/<version>`, and the app serves it via `app://`. No UI calls `checkForModuleUpdate` yet. The owner keeps it as planned work (decision log 2026-10-09).

### Safety valves
| File | Purpose | How it reaches users |
|---|---|---|
| `min-version.json` (now `8.4.6`) | apps older than this get a **blocking** "please update" modal | read from the Worker → GitHub raw → bundled copy, **remote first**, so raising it affects apps already installed |
| `stable-versions.json` | catalog of known-good versions for downgrade | Worker + bundled |

> 🚨 To force everyone off a bad build: ship a fix, then raise `minVersion` in `min-version.json` on `main`. No new release needed for the gate itself.

---

## 5. CI and the website

- **`.github/workflows/ci.yml`** — on push to `main` and PRs, macOS, Node 22: `npm ci` → `build:ui` → `lint` → `metrics:check` → `npm test`. **E2E does not run in CI**; run `npm run e2e` locally (it drives the real app; xvfb on Linux).
- `metrics:check` = debt metrics + guards in `scripts/ci/`: build outputs ignored, no duplicate files, structure pinning, no LAN imports, module boundaries, core-drift report.
- **`.github/workflows/pages.yml`** — rebuilds the landing site (`build-landing.mjs` → GitHub Pages) when the landing source or release notes change. Download buttons find the newest release in the browser, so a release doesn't need a Pages deploy.

---

## Glossary for this page

- **electron-builder** — turns the app into dmg/zip/exe installers.
- **electron-updater** — reads `latest*.yml`, downloads, verifies, installs.
- **`latest.yml` / `latest-mac.yml`** — update manifests: version, file URLs, sha512, size, notes.
- **NSIS** — Windows installer system.
- **Notarization / hardened runtime** — Apple requirements for distributing Mac apps outside the App Store.
- **asar** — Electron's packed app archive.
- **Fuses** — build-time switches that disable risky Electron features.
- **Blockmap** — lets electron-updater download only changed blocks.
- **Preflight** — checks before publishing.

## Check yourself

1. You found a crash in 8.4.9 an hour after release. What two levers stop people running it?
2. Why is `dist/latest.yml` committed with `git add -f`?
3. What would happen if someone edited `app.bundle.mjs` inside an installed R+?

<details><summary>Answers</summary>

1. Ship 8.4.10 (or point users to downgrade via `stable-versions.json`), and raise `min-version.json` so 8.4.9 is blocked.
2. `dist/` is gitignored; only the two manifests are tracked.
3. The SHA-256 no longer matches the signed manifest → boot fails closed → automatic rollback.
</details>

**Next:** [12 · Glossary →](./12-glossary.md)
