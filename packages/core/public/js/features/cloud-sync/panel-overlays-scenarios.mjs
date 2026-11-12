/** Synthetic inputs (no real patients) for cloud-sync-overlays-view.test.mjs. Fixed clock so output is stable. */
export const NOW = Date.parse('2026-11-11T18:00:00Z');

export const PROMPTS = {
  text: { title: 'Confirmar', message: 'Escribe "BORRAR" para seguir', placeholder: 'BORRAR', confirmLabel: 'Borrar', inputType: 'text' },
  password: { title: 'Clave <temporal> & más', message: 'Línea 1\nLínea 2 > 3', placeholder: "p'q\"r", confirmLabel: 'Guardar', inputType: 'password' },
};

export const FIX_GUIDES = {
  plain: { title: 'Problema de envío', summary: 'No se pudo enviar.', steps: ['Revisa la red', 'Pulsa «Sincronizar»'] },
  special: { title: 'A <b> & "c"', summary: "It's > fine", steps: ['Uno & dos', '<script>x</script>'] },
  none: { title: 'Sin pasos', summary: 'Nada que hacer.', steps: [] },
};

const ago = (ms) => new Date(NOW - ms).toISOString();
export const HISTORY_CASES = {
  basic: { handle: 'ana', displayName: 'Ana Prueba', history: [{ at: ago(3600e3), source: 'login' }, { at: ago(86400e3), source: 'sync' }] },
  noName: { handle: 'beto', history: [{ at: ago(5000), source: 'sync' }] },
  empty: { handle: 'cris <x>', displayName: 'C & D', history: [] },
  many: { handle: 'dani', displayName: '', history: Array.from({ length: 1005 }, (_, i) => ({ at: ago(i * 60e3), source: i % 2 ? 'sync' : 'login' })) },
  noAt: { handle: 'eva', history: [{ source: 'login' }, { at: ago(60e3) }] },
};

export const POPOVERS = {
  full: {
    status: 'idle', pending: 3, lastPushAt: ago(120e3), lastPullAt: ago(30e3),
    room: { sala: 'Sala <A>', turnKey: '2026-11', memberCount: 5, code: 'ABC-123' },
  },
  noSala: { status: 'error', pending: 0, lastPushAt: '', lastPullAt: '', room: {} },
  noRoom: { status: 'pending', pending: 'x', lastPushAt: ago(5 * 3600e3), lastPullAt: '', room: { sala: 'Sala B', memberCount: 0 } },
};

export const ROOMS = [{ id: 7, sala: 'Sala <A>', turnKey: '2026-11', memberCount: 3 }, { id: 'r&2', sala: 'Sala B' }];
export const SALAS = ['Medicina Interna', 'Sala <X> & Y', 'Urgencias'];

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
