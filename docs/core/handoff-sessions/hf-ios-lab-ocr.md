# Handoff: HF iOS companion + lab-photo OCR (2026-10-07)

Repo `~/R+-ios`, branch `main`, not pushed. Plan: `~/R+/docs/superpowers/plans/2026-10-07-hf-ios-companion.md` (uncommitted in R+ repo).

- Done, committed in R+-ios:
  - `ef792ce`: consult motivo, triage sort, team log, and the CLAUDE.md LLM rule (on-device FM, then PCC, then rule-based).
  - `dab6951`: step 2, the RPlusKit package.
- Step 2 detail: `Packages/RPlusKit` (Nube, Models, Theme, WidgetCounts, reslabs.js). Its declarations are now `public`. 56 tests pass. Live check: the saved login pulled from local wrangler (`/rooms/active` and pull returned 200).
- Uncommitted in R+-ios: none.
- Watch app work is in `git stash@{0}` ("Watch app work (WIP 2026-10-07)").
  - On pop: project.yml has the old path `RPlus/Widget/WidgetCounts.swift`. Watch targets must use the RPlusKit package instead.
  - NubeStore moved to `Packages/RPlusKit/Sources/RPlusKit/Nube/`. Two `WatchLink.shared.send` lines go there. WatchLink needs `import RPlusKit`.
- Owner picks:
  - Bundle ID `com.rmas.rplushf`.
  - V1 screens: Censo, Resumen glance, Labs + photo import, daily Congestión/POCUS + rondas entry.
  - Cardio wire: new Worker path `entries/{id}/cardioDaily`, merged by date, encrypted.
  - Turn on HF E2EE before App Store.
- Next step: 3. RPlusHF target on RPlusKit.
  - Theme accent is hard-coded teal; make it set per app (HF red).
  - Worker URL `rplus-hf-sync.rmas-workersdev.workers.dev`, sala "Unidad IC".
- Then: 4. design board (owner picks), 5. Vision OCR + FM `@Generable` parse + review.
- Step 0, in the R+ repo, must happen before daily entry: cardioDaily path + desktop merge + NT-proBNP synonym.
- Open: PCC entitlement / Small Business Program enrollment. Owner was told to answer No to all 4 associated-account questions if there is only one developer account.
- SDK fact: `PrivateCloudComputeLanguageModel()` exists in Xcode 27 FoundationModels.
