# R+ Wiki — learn the codebase

The rest of `docs/` is **reference**: short and terse, written for people who already know the system. This wiki is **teaching material**. Each page explains a part of R+ from first principles, follows one real example through the code, and ends with a few self-check questions.

Written against **v8.4.9** (`291a02b`). Pages point to files and function names, not line numbers, so they keep working when the code moves.

## Reading order

| # | Page | You'll understand… | Time |
|---|---|---|---|
| 1 | [The big picture](./01-the-big-picture.md) | what R+ is for, the four moving parts, the repo layout, daily commands | 10 min |
| 2 | [How the app is built](./02-how-the-app-is-built.md) | Electron main / preload / renderer, IPC, startup, how features plug in, the build step | 20 min |
| 3 | [From pasted labs to a Word note](./03-labs-to-word.md) | SOME parsing, the patient-safety rule, lab sets, `*` marks, how `.docx` templates are filled | 20 min |
| 4 | [Storage & security](./04-storage-and-security.md) | the SQLite file, migrations, the crypto toolbox — and what's actually switched on | 15 min |
| 5 | [Nube cloud sync](./05-nube-sync.md) | rooms, ops, push/pull, LWW, sharding, end-to-end room keys, phones | 25 min |
| 6 | [Releases & updates](./06-releases-and-updates.md) | bump → publish → GitHub → auto-update, signed bundles, min-version | 15 min |
| 7 | [Glossary](./07-glossary.md) | every Spanish clinical term, R+ concept and tech term in one place | reference |
| 8 | [Open questions & doc drift](./08-open-questions-and-doc-drift.md) | findings that need a decision, and older docs that disagree with the code | 10 min |

## ⚠️ Read page 8 early

Researching this wiki turned up a few things worth deciding on soon. The biggest one: **the local clinical database currently has no encryption key**, even though several docs say it is encrypted with SQLCipher. Details are in [04 § 5](./04-storage-and-security.md#5-what-is-actually-on-today) and [08](./08-open-questions-and-doc-drift.md).

## How to use these pages

- Keep the code open next to the page. Every page includes at least one end-to-end walkthrough you can follow file by file.
- Try the "Check yourself" questions before you open the answers.
- The e2e scenarios in `scripts/e2e/` are the best hands-on companion. For example, [03](./03-labs-to-word.md) and `labs-to-docx.e2e.mjs` describe the same flow.

## Keeping it current

Run the `codebase-wiki` skill (saved locally at `.claude/skills/codebase-wiki/SKILL.md`) to refresh pages or add new ones with the same method. Its steps are: research in parallel, verify claims in the code, write learner-style pages, and log drift.
