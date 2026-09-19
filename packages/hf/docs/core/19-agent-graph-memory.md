---
type: "core"
name: "Agent Graph Memory"
status: "stable"
description: "Cheap cached extraction vs expensive subgraph reasoning for Claude Code / agent memory. Not a product feature."
---

# Agent graph memory

R+ agents get a knowledge graph for **engineering memory** (modules, decisions, releases, dependencies). This is not clinical memory. Never extract patient identifiers, registros, labs, or chart contents.

A vector index finds similar text. A graph stores structure and time. Use both: lexical/vector neighborhood to find seeds, graph edges to explain how they connect, a frontier model only on the retrieved subgraph.

## Split the workloads

| Workload | Volume | Judgment | Spend |
|----------|--------|----------|--------|
| Extraction | High | Low | Cached prefix + optional Batch API. No extra reasoning budget. |
| Traversal / synthesis | Low | High | Retrieve a subgraph, then use expensive reasoning. |

Schema first. Variable episode last. The stable prefix is `EXTRACTION_SYSTEM` in `scripts/graph-memory/schema.mjs`. Prompt caching is why that string must stay byte-identical across requests.

```
[STABLE SYSTEM / SCHEMA]  →  cached prefix
        ↓
[VARIABLE EPISODE]
        ↓
[EXTRACTION] → validate → normalize → graph write
```

Opus 4.8 list prices (architecture example, not an invoice): standard input $5/M, cached reads $0.50/M, Batch input $2.50/M. 5,000 episodes × 600-token schema + 800-token body is the difference between paying for 7M fresh tokens and paying mostly for unique episode text plus cheap cache hits. Batch stacks with cache for backfills.

## Production shape

```
Conversations / docs / GitHub / tickets
        ↓
Ingestion queue (live vs historical Batch)
        ↓
Cached extraction prompt (low reasoning)
        ↓
JSON schema → entity normalize → duplicate detect
→ relationship check → temporal check
        ↓
Knowledge graph (.graph-memory/graph.json, optional Graphiti)
        ↓
Hybrid retrieve (lexical + subgraph + time)
        ↓
Opus reasoning over cited edges only
```

Bad extraction compounds: bad edge → bad retrieval → bad answer → worse memory. Unvalidated model output must not write.

Time is part of the knowledge (`valid_from` / `valid_until`), not metadata. "Where did Alice work when Project X started?" is a different question from "Where does Alice work?"

## Code

| Piece | Path |
|-------|------|
| Frozen schema | `scripts/graph-memory/schema.mjs` |
| Cached request + batch plan | `scripts/graph-memory/extract.mjs` |
| Validation | `scripts/graph-memory/validate.mjs` |
| JSON store | `scripts/graph-memory/store.mjs` |
| Subgraph retrieve | `scripts/graph-memory/retrieve.mjs` |
| Ingest gate | `scripts/graph-memory/ingest.mjs` |
| CLI | `scripts/graph-memory/cli.mjs` |
| Tests | `scripts/graph-memory/graph-memory.test.mjs` |
| Skill | `.agents/skills/graph-memory/SKILL.md` (symlinked into `.claude/skills/`) |
| Optional MCP | `.mcp.json.example` |

Default store is local JSON. Graphiti MCP is optional when Neo4j/FalkorDB is running. The existing `.understand-anything/knowledge-graph.json` is a **code** graph (stale unless re-analyzed); this layer is **episode** memory.

## Never

- Send the entire graph to the model
- Rebuild the extraction prompt per episode
- Run historical backfills synchronously
- Invent missing relationships
- Treat vector similarity as a verified edge
- Ingest PHI from the clinical app

Skill `graph-memory` has the routing policy. Handoff: [20-claude-code-handoff.md](./20-claude-code-handoff.md).
