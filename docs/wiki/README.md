# R+ knowledge base

The rest of `docs/` is **reference**: short and terse, written for people who already know the system. This wiki is **teaching material**. Each page explains a part of R+ from first principles, follows real examples through the code, and ends with self-check questions.

Written against **v8.4.9** (`291a02b`). Pages point to files and function names, not line numbers, so they keep working when the code moves. Every claim that matters was checked in the code. Where something was only reported by a research pass, the page says so.

## Three maps, one base

| Map | Answers | Start here when |
|---|---|---|
| [UI map](./ui-map/00-index.md) | what is on each screen, and which function each button calls (checked live 2026-10-05) | you start from something you see in the app |
| [Feature map](./04-feature-map.md) | which feature domains feed which; each domain's screens and e2e scenarios | **before changing a domain**: use its impact checklist |
| [Codebase map](./05-codebase-map.md) | which code areas import which; hub files; rules written twice (CI-guarded) | you touch a shared file or `lib/` |

They link to each other: every feature domain points to its UI-map screens, and both point to the code.

## Reading order

| # | Page | You'll understand… | Time |
|---|---|---|---|
| 1 | [The big picture](./01-the-big-picture.md) | what R+ is for, the moving parts, the repo layout, daily commands | 10 min |
| 2 | [How the app is built](./02-how-the-app-is-built.md) | Electron main / preload / renderer, IPC, startup, how features plug in, the build step | 20 min |
| 3 | [Shared state & how features talk](./03-shared-state-and-wiring.md) | the in-memory record, the two save paths, how Nube data reaches the screen, patient switching, every wiring mechanism | 25 min |
| 4 | [The feature map](./04-feature-map.md) | 20 feature domains and 82 verified connections between them (interactive in the artifact) | 20 min |
| 5 | [The codebase map](./05-codebase-map.md) | 1,205 files in 23 areas, measured import connections, hub files, mirrored code | 20 min |
| 6 | [From pasted labs to a Word note](./06-labs-to-word.md) | SOME parsing, the patient-safety rule, lab sets, `*` marks, how `.docx` templates are filled | 20 min |
| 7 | [The patient desk](./07-patient-desk.md) | Estado actual, medications → SOAP, pendientes, agenda, census, every clinical calculation | 30 min |
| 8 | [The team layer](./08-team-layer.md) | users, teams, cycle letters, scope, guardia, entrega, interno, clinicalOps sync | 30 min |
| 9 | [Storage & security](./09-storage-and-security.md) | the SQLite file, migrations, the crypto toolbox, and what's actually switched on | 15 min |
| 10 | [Nube cloud sync](./10-nube-sync.md) | rooms, ops, push/pull, LWW, sharding, end-to-end room keys, phones | 25 min |
| 11 | [Releases & updates](./11-releases-and-updates.md) | bump → publish → GitHub → auto-update, signed bundles, min-version | 15 min |
| 12 | [Glossary](./12-glossary.md) | every Spanish clinical term, R+ concept and tech term in one place | reference |
| 13 | [Open questions & doc drift](./13-open-questions-and-doc-drift.md) | findings that need a decision, and older docs that disagree with the code | 15 min |
| UI | [UI map](./ui-map/00-index.md) (4 files) | every screen, control, modal and flow, with `path:line` citations | reference |

**Short on time?** Read 1 → 3 → 4, then whichever deep dive matches what you're changing.

## ⚠️ Read page 13 early

Researching this wiki turned up things worth deciding on soon:

- **The local clinical database has no encryption key** — kept off on purpose for 8.5.1; docs now say so ([09 § 5](./09-storage-and-security.md#5-what-is-actually-on-today)).
- **The Nube Worker's monitoreo merge has drifted from the client's**, and `db:rotation-nueva` has no privilege check ([13](./13-open-questions-and-doc-drift.md)).

## Using it while you develop

1. **Before changing a feature:** open its entry in the [feature map's impact checklist](./04-feature-map.md#impact-checklist-before-you-change-a-domain). It lists the screens to look at, the e2e scenarios to run, and the domains downstream.
2. **When you change a rule that exists twice** (ward list, Estado actual merge fields, blob keys, username, privileges): `npm run metrics:check` runs `scripts/ci/mirror-drift.mjs`, which tells you if you forgot the other copy.
3. **When you settle an open question**, record the decision in `docs/core/18-knowledge-capture.md` and delete the row in [13](./13-open-questions-and-doc-drift.md).
4. **After a release,** run the `codebase-wiki` skill to refresh the maps.

## How to use these pages

- Keep the code open next to the page. Every chapter traces at least one real flow file by file.
- Try the "Check yourself" questions before opening the answers.
- The e2e scenarios in `scripts/e2e/` are the best hands-on companion. For example, [06](./06-labs-to-word.md) and `labs-to-docx.e2e.mjs` describe the same flow.

## Keeping it current

Run the `codebase-wiki` skill (saved locally at `.claude/skills/codebase-wiki/SKILL.md`) to refresh pages or add new ones with the same method: research in parallel, verify in code, write learner-style pages, rebuild the maps, log drift. The import graph behind chapter 5 is recomputed by `import_graph.py` in the skill's `artifact/` folder.
