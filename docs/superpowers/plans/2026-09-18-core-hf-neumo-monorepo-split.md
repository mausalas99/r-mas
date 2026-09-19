# Split R+ into a core + specialty-module monorepo (R+ / R+ HF / R+ Neumo)

## Context

Three products exist today as three fully separate git repos on disk:

- `/Users/mauriciosalas/R+` — core, general internal medicine (`r-plus`, appId `com.rmas.rplusclinical`)
- `/Users/mauriciosalas/R+ HF` — paid heart-failure specialty (`r-plus-hf`, appId `com.rmas.rplushf`)
- `/Users/mauriciosalas/R+ Neumo` — pulmonology specialty (`r-plus-neumo`, appId `com.rmas.rplusneumo`)

Each has its own copy of `lib/`, `public/js/`, `main.js`, and its own electron-builder release config. HF and Neumo each carry a git `upstream` remote pointing at the local core repo, and sync by manual `git merge upstream/main` — the only mechanism keeping shared logic (labs parsing, note generation, DB schema, cloud sync) aligned across all three.

That mechanism has already failed once: **R+ HF has drifted 81 files from core, plus 28 HF-only files, 25+ days stale** (measured via `diff -rq lib/`). R+ Neumo is currently in sync (1 file diff) only because it merged from upstream very recently — the same drift will happen there too without a structural fix.

Two decisions already made in conversation, checked with Jev (`scripts/jev/choice.mjs`) against this repo's real drift data:
- **Fold all three into one repo, npm workspaces, core as a shared package** — beat "extract core as its own npm package + git dependency" 0.92 to 0.08 on ongoing maintenance cost, because a workspace package is symlinked (edit core once, all three apps see it immediately — no manual version bump/publish/install cycle per change).
- **Hard requirement**: R+ HF is a paid product handling patient data. The IM (core/general) app must never be able to reach HF's code, even by accident. This is a code-boundary rule, not a data-storage one — each app already has a fully distinct `userData` path / local SQLCipher DB (confirmed: `~/Library/Application Support/R+`, `.../R+ HF`, `.../R+ Neumo` — no collision risk from this migration). The thing that needs enforcing is: **the compiled IM app must not contain HF's code**, so a build can't leak it even if someone tried.

## Target structure

```
R+/                              (repo root — reuse this checkout, it's the most current)
├── package.json                 ("workspaces": ["packages/*"], root scripts fan out to each package)
├── packages/
│   ├── core/                    "@rplus/core" — lib/, shared public/js/features, cloud/sync-worker engine, doc-generators, db schema
│   ├── im/                      "@rplus/im" — was R+/'s app-only shell: main.js, preload.js, IM-only UI, electron-builder config
│   ├── hf/                      "@rplus/hf" — was R+ HF/: IC registry + HF-only screens, its own electron-builder config, its own extra deps (jimp, tesseract.js, @pushforge/builder — lab-photo OCR feature)
│   └── neumo/                   "@rplus/neumo" — was R+ Neumo/: currently near-empty diff from core, grows its own specialty code here over time
├── .dependency-cruiser.cjs      (extended with the new one-way boundary rules, see below)
└── .github/workflows/           (one shared ci.yml — the three repos already run an identical one; per-package release workflow keyed off that package's tag)
```

`packages/im`, `packages/hf`, `packages/neumo` each depend on `"@rplus/core": "*"` and import shared logic from there instead of relative `../../lib` paths. (**Confirmed in the dry run**: this repo uses plain `npm` workspaces, not pnpm/yarn — the `workspace:*` range those tools use is unsupported here and fails with `EUNSUPPORTEDPROTOCOL`; a bare `"*"` is what makes `npm install` link the local `packages/core` folder instead of trying to fetch it from the registry.)

## Dry run results, 2026-09-18

Ran against `github.com/mausalas99/r-mas-monorepo-test` (throwaway, private). Proved the two mechanisms this whole plan depends on, using a minimal `packages/core` + `packages/im` + `packages/hf` skeleton — not the real 450-file app yet:

- **Workspace live-linking works as expected**: `npm install` symlinks `node_modules/@rplus/core` → `packages/core`. Editing `packages/core/index.mjs` directly changed what `packages/im` saw on the next run, zero reinstall — confirms the exact mechanism Jev's 0.92-confidence pick was based on.
- **The paid-HF boundary rule works**: a `.dependency-cruiser.cjs` rule (`im-not-to-hf`, mirroring the real repo's existing rule style) passed clean, then correctly failed with `error im-not-to-hf: packages/im/probe.mjs → packages/hf/decoy.mjs` the moment a bad import was added, and passed clean again once removed.

**Scope correction, found while reading the real `package.json` in full**: this app's electron-builder config is heavier than Phase A's one-line description assumed — native modules (`better-sqlite3-multiple-ciphers`, `@node-rs/argon2`) with their own `asarUnpack`/rebuild steps, notarization hooks (`beforePack`/`afterPack`/`afterAllArtifactBuild`), and a `files` allowlist with paths hardcoded relative to the repo root. Moving the actual `lib/`, `public/`, `main.js`, and this build config into `packages/core` — the real remaining Phase A/B work — needs its own careful pass re-rooting those paths and re-testing a real `electron-builder --mac` build, not just a workspace-symlink proof. Treat that as its own next step, not something to rush after this mechanism check.

## Reused, not rebuilt

- **Boundary enforcement**: `.dependency-cruiser.cjs` already enforces this exact shape of rule today (`settings-not-to-patients`, `labs-not-to-lan-sync`, `lib-not-to-public-js`), wired into `npm run lint`/CI. Add new rules the same way, don't write a new script:
  - `im-not-to-hf`: nothing under `packages/im` may import from `packages/hf`
  - `im-not-to-neumo`, `hf-not-to-neumo`, `neumo-not-to-hf`: same shape, keeps specialty modules from leaking into each other too
- **Git history**: pull HF and Neumo's existing commit history into `packages/hf/` and `packages/neumo/` with `git subtree add` (not submodule — a submodule keeps a separate repo pointer, which defeats the "one workspace, live-linked" goal; subtree folds it in as normal tracked files with history preserved).
- **CI**: the three repos already run an identical `ci.yml` (`npm ci` → `build:ui` → lint → metrics → test). Keep one copy at the new root instead of three.

## Migration steps

0. **Dry run in a throwaway GitHub repo first.** Create a new, empty repo (e.g. `mausalas99/r-mas-monorepo-test`) and do steps 1–9 below against clones pointed at that repo, not the real `r-mas` / `rmashf`. Confirm the workspace builds, tests pass, and the `dependency-cruiser` boundary check works. Only once that's proven, redo the same `git subtree` commands against the real `R+` checkout (subtree preserves history either way, so nothing from the dry run needs to be "copied over" — it's just proof the steps are safe before they touch production repos or your real `origin`/`upstream` remotes).
1. **Safety**: confirm `git status` clean and everything pushed to each repo's remote (`origin` for R+ and R+ HF, R+ Neumo's origin if any) before touching anything — this is a one-time, hard-to-cleanly-undo restructuring.

### Fine-grained sub-phases, each with a real pass/fail gate before moving on

The dry run found the "move everything into `packages/core`" step is bigger than one line — native modules, notarization hooks, hardcoded repo-root-relative paths. Split it into small slices, each independently buildable and testable, instead of one big move:

| Sub-phase | Moves | Gate before moving on |
|---|---|---|
| A1+A2 | **Done, 2026-09-18.** `lib/` and `public/` → `packages/core/`, folded into one move — `lib/` has real relative imports reaching into `public/js` (`clinical-repo/transforms/eventualidades.mjs`, `interno/interno-vitals.mjs`, `renderer-protocol.test.mjs`), so moving either alone breaks the other. `data/` and `template*.docx` moved too (same reason: `release-notes-curated.mjs`, `doc-generators/shared.js`). Root-level symlinks (`lib`, `public`, `data`, `template*.docx`) keep `main.js`/`scripts/`/root `package.json` resolving unchanged until A3/A4. Reverse bridge added inside core (`packages/core/scripts` → `../../scripts`, `packages/core/cloud` → `../../cloud`) for the few `public/js` tests reaching into `scripts/metrics`, `scripts/lib`, `cloud/sync-worker` — moving `scripts/` wholesale was tried and reverted, broke ~30 unrelated tests (native-rebuild path assumptions, RELEASE_NOTES canonical-list checks). Also restored 4 `public/lib/equipos/*.mjs` symlink shims wrongly deleted as "dead" in an unrelated prior commit. | `npm test` (5050 pass, 0 fail) and `npm run build:ui` green — **done** |
| A3 | **Done, 2026-09-18.** `main.js`, `preload.js` → `packages/core/`, plus `generate-receta-hu.js`/`generate-censo.js`/`templates/` (found via the same reverse-coupling check: `lib/doc-export-service.js` reaches into them with a relative import). `build/` (icons, entitlements) stayed at root on purpose — nothing under `packages/core` reaches into it, and root `package.json` still owns the electron-builder `build` config until sub-phase B. Root-level symlinks bridge the rest as before. | `CSC_IDENTITY_AUTO_DISCOVERY=false npm run build:mac:arm64-only` packaged clean (beforePack/afterPack/native-rebuild hooks, no path errors) and `dist/mac-arm64/R+.app` **launched and ran** without crashing — **done**. `npm test`: 5049 pass, 1 pre-existing fail unrelated to this move (eager-boot-budget ratchet, 6,695 B over from an earlier medications-actions.mjs split — confirmed unrelated by reverting just A3's moves and rerunning, identical byte count; needs owner sign-off to raise per `eager-boot-changelog.md`'s own convention, not touched here). |
| A4 | `cloud/`, remaining `scripts/` | `npm run metrics:check` green (this already chains `dependency-cruiser`, `forbid-lan-imports`, structure-pinning) |
| B | Carve `packages/im` back out of `packages/core` — app-shell-only files (`main.js`, `preload.js`, electron-builder config, IM-only screens) move out; shared logic stays in `core` | new `im-not-to-hf`/`im-not-to-neumo` `dependency-cruiser` rules pass; `build:mac:unsigned` still launches |
| C | `git subtree add --prefix=packages/hf <path-to-R+ HF> main`; reconcile the 81 drifted files (bug fix → lands in `core`; real specialty → stays in `hf`) | HF's own `npm test` + `build:mac:unsigned` green after reconciliation; boundary rules still pass |
| D | `git subtree add --prefix=packages/neumo ...` — lighter, 1 file differs today | same gate as C |

7. **Flag, don't silently fix**: R+ Neumo's release config currently publishes to the same GitHub repo as core (`r-mas`), while R+ HF has its own (`rmashf`). Point this out to the owner during migration — likely worth giving Neumo its own release repo too, but that's their call, not something to change without asking.
8. **Keep auto-update working for existing installs**: each app's `package.json` `"version"` field is stale (`"1.0.0"` in both HF and Neumo) — the real shipped version lives in git tags (`v8.3.x`) set by `scripts/release.js` at release time, and that's what `electron-updater` compares against each app's own GitHub release feed (`publish.repo`). Keep each package's own tag lineage and its own `release.js` invocation after the move — do not merge the three apps onto one shared version number. HF is currently at `v8.3.5`, Neumo and core at `v8.3.9`; they stay on separate cadences. As long as appId, productName, code-signing config, and each package's own `publish.repo` target are carried over unchanged, existing installs keep finding their update feed exactly as before.
9. Once the monorepo builds and tests pass, archive (don't delete yet) the standalone `/Users/mauriciosalas/R+ HF` and `/Users/mauriciosalas/R+ Neumo` folders — their history now lives in the monorepo via subtree.

## Where Jev actually fits in these sub-phases (and where it doesn't)

Jev (TypeSafe System One) returns short typed judgments — a pick from real options, a 0–1 probability, a score on a named scale — grounded in text state I give it. It does not write code and does not produce long-form risk write-ups; that's not what the primitive does (`noul`/`score`/`choice` — see the loaded `typesafe-ai` skill). I remain the one writing and running the actual migration code; Jev's real job here is the large, genuinely ambiguous *sorting* calls inside sub-phases B and C:

- **Sub-phase B** (core vs IM-shell): for each file being sorted, `noul("is this file IM-app-shell-specific, not reusable by HF/Neumo?")` grounded in the file's own content — screens ~450 files far faster than reading each one by hand, per the "screen before reading big things in" pattern already in this project's global rules.
- **Sub-phase C** (the 81 HF-drifted files): `choice()` per diff between `bug_fix_belongs_in_core` / `real_hf_specialty_stays_in_hf` / `needs_human_review`, grounded in the actual diff text. Anything under the 0.5 confidence floor (from this project's own threshold rule) gets flagged for a human look, not auto-decided.

Where Jev does **not** apply: whether a moved path actually resolves, whether `electron-builder` actually produces a launchable `.app`, whether `dependency-cruiser` actually catches a bad import. Those are deterministic — the gate columns above (`npm test`, a real build, a real launch) answer them by actually running the thing, which is more reliable here than a model's risk estimate of code it hasn't executed.

Phase this as: **A** (workspace plumbing + boundary rules with everything still parked in `packages/core`) → **B** (carve out `packages/im`) → **C** (subtree HF in, reconcile its 81-file drift) → **D** (subtree Neumo in, lighter pass). Don't try to do it in one sitting — it touches most of the codebase.

## What "shared core" does and doesn't mean for releases

Editing `packages/core` updates all three apps' *source code* instantly — that's the whole point of the workspace symlink. It does **not** mean a core fix reaches users instantly. Each app is still a separate compiled installer with its own release and its own `electron-updater` feed. A bug fixed in `packages/core` is available to build into R+, R+ HF, and R+ Neumo the moment it's committed, but it only reaches a given app's *users* once someone runs that app's own release (`npm run release:publish` inside that package). Fixing something once and cutting three small releases is still faster and safer than today's manual re-patch-per-repo — but it's three releases, not one push to everyone.

**Do you rebuild all three every time?** Only the apps that actually use the changed code. `electron-builder`/`electron-updater` ships a whole new app binary per release — there's no partial "just the changed module" download today, for any of the three apps, migration or not. So: change something only `packages/hf` imports → release just R+ HF. Change something `packages/core` that IM, HF, and Neumo all import (e.g. the labs parser) → release all three, same as you'd have needed to fix in all three anyway, just written once instead of three times.

**Modules update independently of the app shell, signed.** Owner decision: build this now, as Phase E, after the workspace split (Phases A–D) so there's a real per-package boundary to ship updates against.

### Phase E — signed module updates

Reuse, don't invent: `lib/db/clinical-crypto.mjs` already does exactly this kind of signing today (`crypto.createSign('SHA256')` / `crypto.createVerify('SHA256')` over PEM keys, for clinical LAN peer signing). The module-update signer reuses that same primitive — no new crypto dependency.

- **Unit shipped**: the renderer bundle each package already produces (`bundle:renderer:prod` → `app.bundle.mjs` + `chunks/*`). That's already a separate build artifact from the native Electron shell, so it's the natural update unit — no new packaging format to invent.
- **Release-time signing**: new `scripts/sign-module-bundle.mjs` — hashes every file in that package's bundle output into a manifest (`{version, package, files: [{path, sha256}]}`), signs the manifest with a release private key (kept offline, never committed — same handling discipline as any other release credential) using `crypto.createSign('SHA256')`. Runs as a step in each package's existing `release:publish`.
- **Public key**: one PEM baked into `packages/core` at build time (`packages/core/module-update-pubkey.pem`), so all three apps verify with the same key unless a package ever needs its own.
- **Distribution**: manifest + signature uploaded as extra assets on that package's *existing* GitHub Release (same repo, same `publish.repo` already in the plan — no new hosting).
- **Runtime verify + load** (main process, mirrors the existing `dbVerifyClinicalChange` IPC pattern): on boot, fetch the current manifest+signature for the running package, verify the signature against the baked-in public key, verify every file hash matches, only then unpack into `userData/module-update/<version>/` and load from there. Any failure at any step → discard, keep running the last verified (or bundled) version. Never load anything unverified.
- **Rollback**: track boot success per module version; N consecutive failed boots on a new version auto-falls back to the last-known-good one.
- **Versioning**: the module manifest gets its own small version counter per package, independent of the full-installer `v8.3.x` git tags used for real electron-builder releases — a module update doesn't require cutting a whole new signed installer.

This still sits on top of the per-package split from Phases A–D — a "module" here means one package's bundle, which only exists as a clean, separable unit once the workspace boundaries are real.

## Verification

- `npm run build:ui` and each package's electron build (`build:mac`) succeed independently.
- `npm test` (workspace-wide) green.
- Prove the guard works: deliberately add an `import` from `packages/im` into `packages/hf`, confirm `dependency-cruiser`/`npm run lint` fails on it, then remove the test import.
- Grep the built IM `.app` output for HF-only strings (e.g. a distinctive IC-registry label) and confirm zero matches — proves the paid HF code is physically absent from the free/IM build, not just hidden behind a flag.
- Re-check each app still launches against its own distinct `userData` path with no cross-app DB access.
