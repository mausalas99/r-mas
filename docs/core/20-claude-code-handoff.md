---
type: "core"
name: "Claude Code Handoff"
status: "in-progress"
description: "Resume here in Claude Code. Graph-memory pipeline landed 2026-08-14; product tree is 8.1.3 on main."
---

# Handoff — Claude Code + graph memory

**Date:** 2026-08-14  
**From:** Cursor (Grok 4.6)  
**To:** Claude Code  
**Branch:** `main` @ `06072d88` (`origin/main`, release 8.1.3)  
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
Do not read project-context or the docs hub yet.
UI bugs and Nube crypto are closed. Do not reopen them.
Task: test scripts/graph-memory locally (no Neo4j).
Call skill graph-memory. Run the Test plan in this handoff.
Report: unit tests, cache-prefix check, ingest+query, live extract if ANTHROPIC_API_KEY exists.
```

Plan a hard task: new session `claude --agent ceo-fable --effort high` (or `/model fable` then `/plan`). Then `/clear` and execute on Sonnet.

Token pass in a fresh session: `/context` → drop the largest unused plugin/MCP/skill → `/mcp` off for idle servers → `/usage` → `/clear` at a checkpoint or >400k.

Do not auto-load skill `graph-memory`. Call it only when ingesting or querying the graph.

---

## Active plans

| Plan | Path |
|------|------|
| Nube client-encryption compliance review | `docs/superpowers/plans/2026-08-14-nube-client-encryption-compliance.md` |
| Startup lag optimization (steps 0-8, step 9 outline only) | `docs/superpowers/plans/2026-08-15-startup-lag-optimization.md` |

---

## What landed this session

Agent graph memory is implemented as a **local pipeline**, not a product feature and not Neo4j-required.

| Piece | Path |
|-------|------|
| Frozen cached schema | `scripts/graph-memory/schema.mjs` |
| Extraction request + Batch plan | `scripts/graph-memory/extract.mjs` |
| Validation before write | `scripts/graph-memory/validate.mjs` |
| JSON store | `scripts/graph-memory/store.mjs` → `.graph-memory/graph.json` |
| Subgraph + temporal retrieve | `scripts/graph-memory/retrieve.mjs` |
| Ingest gate | `scripts/graph-memory/ingest.mjs` |
| CLI | `scripts/graph-memory/cli.mjs` |
| Tests | `scripts/graph-memory/graph-memory.test.mjs` |
| Architecture | `docs/core/19-agent-graph-memory.md` |
| Optional Graphiti MCP | `.mcp.json.example` |

**Strategies encoded in code:**

- Schema first, episode last, `cache_control: ephemeral` on the system prefix
- No extra reasoning budget on extraction (`max_tokens: 2000`, no thinking)
- Historical ingest returns a Message Batches payload instead of live calls
- Validate (JSON, types, duplicates, relations, time, PHI types) before `store.write`
- Retrieve the smallest subgraph + `valid_from`/`valid_until`; never dump the graph
- Hybrid = lexical seeds + graph edges (similarity is not an edge)

---

## How to use it in Claude Code

**Ingest (live, small):** extract with the cached prefix → `ingestFacts` / `cli.mjs ingest-facts`.

**Ingest (history):** `cli.mjs batch-plan --json episodes.json` and submit to Anthropic Batch API. Do not loop live `messages.create`.

**Query:** `cli.mjs query "…"` → reason over `evidence.citations` only. If you cannot cite an edge, say so.

**Graphiti (optional next):** start Neo4j or FalkorDB, copy `.mcp.json.example` → `.mcp.json` or `claude mcp add`. Still validate before writes. Official Graphiti MCP may use its own prompts — do not let that bypass `EXTRACTION_SYSTEM`.

PHI: this graph is codebase/process memory. Do not ingest SQLCipher dumps, census, labs, or patient identifiers.

---

## Closed (do not reopen)

- Paciente Resumen Medicamentos pills, hide-sidebar, ⌘1/⌘E/⌘T, census Filtros — **fixed**.
- Nube V1 crypto — **accepted** (plaintext D1). Envelope DEKs are not this task.

Do not add graph memory to the Electron app, `lib/`, or renderer.

## Dirty files (unrelated)

Do not fold these into a graph-memory commit: `stable-versions.json`, `scripts/lib/artifact-names.js` + tests, `scripts/lib/github-release-notes.test.js`, `scripts/release.js`, `scripts/write-release-yml.js`, deleted `dist/latest-*.yml`.

## Test plan (this session)

Local JSON store. No Neo4j. No Graphiti.

```bash
npm run test:one -- scripts/graph-memory/graph-memory.test.mjs

node scripts/graph-memory/cli.mjs request \
  --text scripts/graph-memory/fixtures/episode-nube-lww.txt \
  --occurred-at 2026-08-14
# Expect: system[0].cache_control.type === ephemeral
# Expect: episode text only in messages, not in system

node scripts/graph-memory/cli.mjs ingest-facts \
  --json scripts/graph-memory/fixtures/facts-nube-lww.json

node scripts/graph-memory/cli.mjs query \
  "What did clinicalOps LWW change in August 2026?" --at 2026-08
# Expect: citations include clinicalOps LWW edges. Not the full graph.

# Live extract (only if ANTHROPIC_API_KEY is set):
node scripts/graph-memory/cli.mjs extract --write \
  --text scripts/graph-memory/fixtures/episode-nube-lww.txt \
  --occurred-at 2026-08-14
```

Pass: unit tests green; cached prefix stable; query returns cited edges; live extract writes only after validation (or skipped if no key).

Out of scope: Neo4j, Graphiti MCP, embeddings, commit.
