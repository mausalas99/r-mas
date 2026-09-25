export const BOOT_HUBS = [
  'public/js/app.js',
  'public/js/app-runtimes.mjs',
  'public/js/app-shell.mjs',
];

export const BOOT_GRAPH_DEBT_PER_IMPORT = 25;

/**
 * Paths the size ratchet (trackedLoc/moduleCount) does not measure. `docs/`
 * is prose, and the rules in CLAUDE.md and AGENTS.md require a 50-to-90-line
 * handoff and plan entry for every finished job, so counting it would turn
 * the ratchet red on documentation alone. `packages/hf` and `packages/neumo`
 * were excluded too until both vendored their copy of `packages/core`
 * instead of tracking it (PR #56, PR #53) — now their tracked size is their
 * own product code, not a duplicate, so they are back in scope here. `.claude/`
 * is Claude Code harness/skill config, not product code (found 2026-09-21: a
 * harness-skill commit added 2,377 lines there and tripped the ratchet).
 */
export const SIZE_GATE_EXCLUDED_RE = /^(docs\/|\.claude\/)/;

/**
 * Paths scripts/ci/no-duplicate-files.mjs does not compare. Narrower than
 * SIZE_GATE_EXCLUDED_RE on purpose: `packages/hf` and `packages/neumo` are
 * separate electron-builder app roots that vendor `packages/core` at build
 * time rather than import it (they cannot share a package directly), so
 * they still carry their own copies of non-code assets — shared icons,
 * docs, build config — that happen to be byte-identical to each other or to
 * core's copy because neither side has ever diverged, not because someone
 * duplicated logic that should be merged. That is the "two competing
 * implementations of one thing" case this gate exists to catch, and it
 * isn't what these pairs are (measured 2026-09-21: 243 pairs, none of them
 * duplicated logic). `docs/` is excluded for the same reason as the size
 * ratchet.
 */
export const DUPLICATE_GATE_EXCLUDED_RE = /^(packages\/(hf|neumo)\/|docs\/)/;
