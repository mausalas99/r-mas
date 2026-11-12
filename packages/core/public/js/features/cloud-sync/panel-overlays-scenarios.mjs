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
