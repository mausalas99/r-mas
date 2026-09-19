export const BOOT_HUBS = [
  'public/js/app.js',
  'public/js/app-runtimes.mjs',
  'public/js/app-shell.mjs',
];

export const BOOT_GRAPH_DEBT_PER_IMPORT = 25;

/**
 * Paths the debt gate does not measure. `packages/hf` is a vendored subtree
 * waiting on the Phase C cleanup; `docs/` is prose, and the rules in
 * CLAUDE.md and AGENTS.md require a 50-to-90-line handoff and plan entry for
 * every finished job, so counting it would turn the ratchet red on
 * documentation alone. The ratchet is here to catch growth in product code.
 * Shared with scripts/ci/no-duplicate-files.mjs so both gates cut the same
 * tree.
 */
export const GATE_EXCLUDED_RE = /^(packages\/hf\/|docs\/)/;
