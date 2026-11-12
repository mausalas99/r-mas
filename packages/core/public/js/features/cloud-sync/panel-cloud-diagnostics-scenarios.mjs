// Synthetic dashboard views (no patient data) shared by the old/new HTML equality test.
const chain = (states) => ['Internet', 'Sesión', 'Sala', 'En vivo'].map((label, i) => ({ label, state: states[i], detail: 'detalle ' + label }));

export const DASH_SCENARIOS = {
  ok: {
    verdict: { level: 'ok', headline: 'Todo en orden', subline: '' },
    chain: chain(['ok', 'ok', 'ok', 'ok']), outboxCount: 0, outboxBreakdown: [], labsQueued: 0, techLine: 'Cola 0 · Rev. 12',
  },
  info: {
    verdict: { level: 'info', headline: 'Sincronizando', subline: 'Un momento <b>& "más"</b>' },
    chain: chain(['ok', 'ok', 'ok', 'off']), outboxCount: 1, outboxBreakdown: [{ label: 'pacientes', count: 1 }], labsQueued: 1, techLine: 'Cola 1',
  },
  warn: {
    verdict: { level: 'warn', headline: 'Sin conexión', subline: 'Reintenta' },
    chain: chain(['error', 'ok', 'off', 'off']), outboxCount: 3, oldestWait: '5 min',
    outboxBreakdown: [{ label: 'pacientes', count: 2 }, { label: 'labs', count: 1 }],
    toxicOutbox: [{ clientMutationId: 'm1', opCount: 40, totalLabel: '2 MB', maxOpPath: 'a/b' }, { opCount: 0 }],
    labsQueued: 4, techLine: 'Cola 3 <x>',
    issues: [{ fixId: 'f1', severity: 'warn', title: 'Token vencido', detail: 'Vuelve a entrar', hint: 'Cierra sesión' }, { title: '', detail: '' }],
    recentErrors: [{ fixId: 'f2', op: 'push', at: '10:32', explain: 'Rechazado', code: 'E42' }, { op: 'pull', at: '10:33', explain: 'Falló' }],
  },
  error: {
    verdict: { level: 'error', headline: 'Error', subline: 'Soporte' },
    chain: [], outboxCount: 0, labsQueued: 0,
  },
  empty: {},
};
