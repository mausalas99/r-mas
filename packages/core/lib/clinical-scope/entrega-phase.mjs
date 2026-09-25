export const ENTREGA_PHASE_LS_KEY = 'guardia.entregaPhase';

/**
 * Pure domain reader — callers must pass storage (or null → false).
 * Renderer adapter may default to globalThis.localStorage.
 * @param {{ getItem?: (key: string) => string|null }|null|undefined} storage
 */
export function readEntregaPhaseActive(storage) {
  if (!storage || typeof storage.getItem !== 'function') return false;
  try {
    const raw = storage.getItem(ENTREGA_PHASE_LS_KEY);
    if (!raw) return false;
    const o = JSON.parse(raw);
    return !!(o && o.active);
  } catch {
    return false;
  }
}
