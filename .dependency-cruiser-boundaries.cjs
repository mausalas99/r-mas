/**
 * Module boundary rules, and nothing else.
 *
 * Kept apart from .dependency-cruiser.cjs on purpose. That config also carries
 * `no-circular`, which reports 1,277 pre-existing errors in this codebase, so
 * any gate built on it is red from the first run and stays red. These rules
 * report zero today, so this config can be enforced now.
 *
 * The boundary is the foundation of the Phase E module layer: each package's
 * renderer bundle is downloaded and live-updated on its own, so a module that
 * can import across a boundary can ship code reaching into another module.
 *
 * A module importing `packages/core` is allowed. That is the whole point.
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
const MODULES = ['im', 'hf', 'neumo'];

const forbidden = [
  ...MODULES.map((mod) => ({
    name: `core-not-to-${mod}`,
    severity: 'error',
    comment: `shared core must not depend on the ${mod} module`,
    from: { path: '^packages/core/' },
    to: { path: `^packages/${mod}/` },
  })),
  ...MODULES.flatMap((from) =>
    MODULES.filter((to) => to !== from).map((to) => ({
      name: `${from}-not-to-${to}`,
      severity: 'error',
      comment: `the ${from} module must not reach into the ${to} module`,
      from: { path: `^packages/${from}/` },
      to: { path: `^packages/${to}/` },
    }))
  ),
];

module.exports = {
  forbidden,
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: 'node_modules' },
    tsPreCompilationDeps: false,
  },
};
