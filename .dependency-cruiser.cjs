/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'settings-not-to-patients',
      severity: 'error',
      comment: 'settings domain must not import patients list',
      from: { path: '^public/js/features/settings-help' },
      to: { path: '^public/js/features/patients' },
    },
    {
      name: 'labs-not-to-lan-sync',
      severity: 'error',
      comment: 'labs domain must not import LAN orchestrator',
      from: { path: '^public/js/features/(lab-|tendencias)' },
      to: { path: '^public/js/features/(lan-sync|lan/)' },
    },
    {
      name: 'lan-not-to-patients',
      severity: 'error',
      comment: 'lan domain must not import patients list',
      from: { path: '^public/js/features/lan/' },
      to: { path: '^public/js/features/patients' },
    },
    {
      name: 'lib-not-to-public-js',
      severity: 'warn',
      comment: 'lib/ is Node-only. Shared logic goes in lib/shared/, not a public/js import.',
      from: { path: '^lib/' },
      to: { path: '^public/js/' },
    },
    {
      name: 'im-not-to-hf',
      severity: 'error',
      comment: 'free IM app must never import paid HF-only code',
      from: { path: '^packages/im/' },
      to: { path: '^packages/hf/' },
    },
    {
      name: 'im-not-to-neumo',
      severity: 'error',
      comment: 'IM app must not import Neumo-only code',
      from: { path: '^packages/im/' },
      to: { path: '^packages/neumo/' },
    },
    {
      name: 'core-not-to-im',
      severity: 'error',
      comment: 'shared core must not depend on the IM app shell',
      from: { path: '^packages/core/' },
      to: { path: '^packages/im/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: false,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
};
