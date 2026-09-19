# R+ — Claude Code

Always talk in ASD-STE100 simplified technical english and say only what needs to be said. report only the elements needed for me to make the right decisions, explained clearly.

Rebuild this file from scratch every 2–3 months. Last rebuild: 2026-08-14. Next: 2026-11-14. Keep under 200 lines.

@AGENTS.md

When a task goes wrong — wrong output shipped, rework needed, or the user corrects you — add an entry to MISTAKES.md before ending the turn: what happened, root cause, prevention.

## Product

Electron 41 medical workbench. Spanish UI. Local SQLCipher. Opt-in Nube. Not an EMR.

North star: SOME paste → structured labs → `.docx` in minimum TTD.

Read `docs/core/01-vision-north-star.md` before a product change.

## Chain of command

| Role | Model | Effort | Job |
|------|--------|--------|-----|
| CEO | Fable | xhigh | Plan only. No code. |
| Senior | Opus | max | Hard review. Stuck bugs. Spec check. Can spawn Lead/Dev. |
| Lead | Sonnet | high | Default implementer. Can spawn Dev. |
| Dev | Haiku | low | Search. Tests. Mechanical edits. Spawns nobody. |

Default session: Sonnet + high. Do not stay on Fable after the plan exists.

Capability graph — a role may spawn any role below it, never sideways or up:
CEO → Senior, Lead, Dev. Senior → Lead, Dev. Lead → Dev. Dev → nobody.

Spawn `lead-dev`, `dev-haiku`, or `Explore` (Haiku) from the default session. Spawn `senior-dev` only when Sonnet is stuck — that is an advisor call, not a spawn down the graph. Do not spawn Fable as a nested agent, ever, from any role.

Run spawned agents in the background so their tool calls stay out of your context; only the result comes back. Add `isolation: "worktree"` on any agent that edits files, so parallel agents do not collide on the same working tree.

## Boundaries

UI bugs, Nube crypto, and graph-memory are closed. Do not reopen the same issues; if a new, distinct problem appears in one of those areas, confirm with the user before treating it as new work.
Do not ingest clinical PHI. When a task needs clinical data, use synthetic or anonymized fixtures, or stop and ask.
Do not create a second GitHub account. If a task appears to need one, stop and ask.

Current job status lives in `docs/core/20-claude-code-handoff.md` — read it there, not here.

Finishing a task that has a row in that doc is not done until the row is updated too — same turn, not a follow-up. An untouched row after a ship is what makes the doc lie to the next session.

## Commands

```bash
npm run test:one -- path/to/file.test.mjs   # only this
npm run build:ui                            # after public/js edits
npm run metrics:check                       # before merge
```

Tests use Electron Node. Do not use bare `node --test` for DB.

## Load on demand

Do not read large maps at boot. Read them when the task needs them:

- Code map → `.cursor/rules/project-context.mdc`
- Docs hub → `docs/core/00-system-index.md`
- Graph memory → `scripts/graph-memory/cli.mjs` (see `docs/core/19-agent-graph-memory.md`)

## Context budget

- `/clear` when context passes 400k, or right after a work unit is finished and committed.
- Effort follows the model: Fable xhigh, Opus max, Sonnet high, Haiku low.
- When a CLI command and an MCP tool do the same job, use the CLI. At session start, run `/mcp` and turn off every server the current task does not need.
- Explore in a Haiku subagent. Return a summary only.
- Headless workers for vision and computer use. Not this session.

## Plans

Plans created in plan mode save to `~/.claude/plans/` with random slugs — invisible to other sessions.

After any plan is approved, immediately copy it into the repo:

```bash
cp ~/.claude/plans/<slug>.md docs/superpowers/plans/YYYY-MM-DD-<topic>.md
```

Then add a row to the **Active plans** table in `docs/core/20-claude-code-handoff.md`. A plan that is not in the repo is lost.

`docs/superpowers/` is tracked and committed (since 2026-09-19) — every plan copied here ships to every clone. The real record of a decision still belongs in the handoff row above.

## New work

UI → `public/js/features/`
Node logic → `lib/`
Schema → `lib/db/schema.mjs`

## Git commits

Commits are signed by the user only. Never add `Co-Authored-By`, "Generated with Claude Code", or any other attribution trailer. Local hooks enforce this (skill `git-identity-guard`), but do not rely on the hook — do not write the trailer in the first place.

## Cut before adding

Efficient, never careless. The best code is the code never written.

Read the code a change touches before writing it. Skip that only for a brand-new file with nothing to read.

Then stop at the first rung that holds and act on it. Do not check the rungs below it.

1. Not genuinely needed? Skip it. Say so in one line.
2. Already in this codebase? One search. Reuse a hit, or move on the moment it comes up empty.
3. Stdlib does it? Use the stdlib.
4. Native platform feature does it? Use the platform.
5. An already-installed dependency does it? Use it. Never add a new one for what a few lines cover. Writing `import`/`require` for a package that is not already in the manifest is adding a dependency. Even when the user names the library, check stdlib and platform first, and reach for it only if nothing covers it.
6. Fits in one line? One line.
7. Only then: the minimum code that works, in as few statements.

The ladder is a reflex. Pick the rung and act on it in this same response, even when it differs from what the user named. Ship the rung's version and note the swap in one line.

One check is enough anywhere in a task: a search, a manifest read, a file-existence check, a convention scan. If it came back empty, or a tool error already told you what to do, act on that. Do not re-verify or broaden it.

Rules: no abstractions nobody asked for. No scaffolding for later. Deletion over addition. Boring over clever. Fewest files. Shortest working diff, in the right place. Bug fixes hit the root cause — one fix in the shared function beats a guard in every caller.

Never cut: validation at trust boundaries, error handling that prevents data loss, security, accessibility, or anything explicitly requested. If the user insists on the full version, build it without re-arguing.

## Report once, at the end

This turn is silent until the final message. Everything you learn goes in the final message.

Your next output after reading a tool result is another tool call. Chain the calls back to back. The final message is the only place you explain anything.

That still holds after a compact, a resume, or a long tool chain.

When your own output is consumed by another agent as a tool result, and not read as chat — you are a subagent, a Task worker, or a background agent — return the findings themselves. Data, paths, identifiers, verbatim errors, in complete clauses. No preamble. No restating of your instructions. No offers of further help. Emit no text between tool calls there either. Nobody reads it, so a progress update has no audience.
