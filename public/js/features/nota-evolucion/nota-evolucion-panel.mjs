/**
 * Nota de evolución (SOAP) — screen 9a, montaje en DOM.
 * S: autosave con toast `om-rise` reversible (Deshacer). O: derivado, el
 * residente confirma. A: campo más grande. P: por zona con marcas mono.
 */
import { persistClinicalState } from '../../app-state.mjs';
import { showUndoToast } from '../workbench/undo-toast.mjs';
import { nextPlanMark } from './nota-evolucion-html.mjs';
import { buildNotaEvolucionHtml } from './nota-evolucion-html.mjs';
import {
  ensureNotaEvolucion,
  addPlanItem,
  removePlanItem,
  cyclePlanItemMark,
  planZonesForRender,
  confirmObjetivoForPatient,
} from './nota-evolucion-state.mjs';

const AUTOSAVE_DEBOUNCE_MS = 900;

/** @type {{ getActiveId: () => string|null, getPatients: () => Array<Record<string, unknown>>, showToast: (msg: string, kind?: string) => void }} */
let rt = {
  getActiveId() {
    return null;
  },
  getPatients() {
    return [];
  },
  showToast() {},
};

/** @param {typeof rt} ctx */
export function registerNotaEvolucionRuntime(ctx) {
  if (!ctx || typeof ctx !== 'object') return;
  Object.assign(rt, ctx);
}

/** @returns {Record<string, unknown>|null} */
function activePatient() {
  const id = rt.getActiveId();
  if (!id) return null;
  return rt.getPatients().find((p) => p.id === id) || null;
}

/** @type {ReturnType<typeof setTimeout>|null} */
let autosaveTimer = null;

/**
 * `insertables` (screen 9a right column, "Sin insertar") and `cambios`
 * ("Cambió desde ayer") have no wired data source yet — the app has no
 * per-note diff of "what's new since the last note" today. Rendering an
 * honest empty state here (never a fabricated item) until that source
 * exists is intentional; see `objetivoInputFromPatient` for the same rule
 * applied to labs.
 * @param {Record<string, unknown>} patient
 * @returns {{ subjetivo: string, objetivo: unknown, analisis: string, plan: unknown[], insertables: unknown[], cambios: unknown[] }}
 */
export function buildRenderModel(patient) {
  const state = ensureNotaEvolucion(patient);
  return {
    subjetivo: state.subjetivo,
    objetivo: state.objetivo || { zones: [] },
    analisis: state.analisis,
    plan: planZonesForRender(state),
    insertables: [],
    cambios: [],
  };
}

/** @param {HTMLElement} mount */
function render(mount) {
  const patient = activePatient();
  if (!patient) {
    mount.innerHTML = '<div class="ne-empty-hint">Selecciona un paciente primero.</div>';
    return;
  }
  mount.innerHTML = buildNotaEvolucionHtml(buildRenderModel(patient));
  wireEvents(mount, patient);
}

/**
 * @param {HTMLElement} mount
 * @param {Record<string, unknown>} patient
 */
function wireEvents(mount, patient) {
  const sEl = /** @type {HTMLTextAreaElement|null} */ (mount.querySelector('[data-ne-subjetivo]'));
  if (sEl) {
    sEl.addEventListener('input', () => scheduleSubjetivoAutosave(patient, sEl.value, mount));
  }
  const aEl = /** @type {HTMLTextAreaElement|null} */ (mount.querySelector('[data-ne-analisis]'));
  if (aEl) {
    aEl.addEventListener('input', () => {
      const state = ensureNotaEvolucion(patient);
      state.analisis = aEl.value;
      persistClinicalState();
    });
  }
  const confirmBtn = mount.querySelector('[data-ne-confirm-objetivo]');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      confirmObjetivoForPatient(patient);
      persistClinicalState();
      rt.showToast('Objetivo confirmado ✓', 'success');
      render(mount);
    });
  }
  mount.querySelectorAll('[data-ne-plan-cycle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const zoneEl = btn.closest('[data-ne-plan-zone]');
      const zoneId = zoneEl && zoneEl.getAttribute('data-ne-plan-zone');
      const itemId = btn.getAttribute('data-ne-plan-cycle');
      if (!zoneId || !itemId) return;
      const state = ensureNotaEvolucion(patient);
      cyclePlanItemMark(state, zoneId, itemId, nextPlanMark);
      persistClinicalState();
      render(mount);
    });
  });
  mount.querySelectorAll('[data-ne-plan-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const zoneEl = btn.closest('[data-ne-plan-zone]');
      const zoneId = zoneEl && zoneEl.getAttribute('data-ne-plan-zone');
      const itemId = btn.getAttribute('data-ne-plan-remove');
      if (!zoneId || !itemId) return;
      const state = ensureNotaEvolucion(patient);
      removePlanItem(state, zoneId, itemId);
      persistClinicalState();
      render(mount);
    });
  });
  mount.querySelectorAll('[data-ne-plan-add]').forEach((input) => {
    input.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter') return;
      const zoneId = input.getAttribute('data-ne-plan-add');
      const value = /** @type {HTMLInputElement} */ (input).value;
      if (!zoneId || !value.trim()) return;
      const state = ensureNotaEvolucion(patient);
      addPlanItem(state, zoneId, value);
      persistClinicalState();
      render(mount);
    });
  });
  // "Sin insertar" — no data source is wired in yet (see buildRenderModel),
  // so these never render today; wired ahead of that source landing so the
  // click contract (append into Análisis) is fixed once.
  mount.querySelectorAll('[data-ne-insertar-item]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = btn.closest('[data-ne-insertar-row]');
      const text = row && row.querySelector('.ne-insertar-item-title');
      if (!text) return;
      appendToAnalisis(patient, text.textContent || '');
      render(mount);
    });
  });
  const insertAllBtn = mount.querySelector('[data-ne-insertar-all]');
  if (insertAllBtn) {
    insertAllBtn.addEventListener('click', () => {
      mount.querySelectorAll('.ne-insertar-item-title').forEach((el) => {
        appendToAnalisis(patient, el.textContent || '');
      });
      render(mount);
    });
  }
}

/**
 * @param {Record<string, unknown>} patient
 * @param {string} text
 */
function appendToAnalisis(patient, text) {
  const t = String(text || '').trim();
  if (!t) return;
  const state = ensureNotaEvolucion(patient);
  state.analisis = state.analisis ? `${state.analisis}\n${t}` : t;
  persistClinicalState();
}

/**
 * Autosave S with a reversible-weight `om-rise` undo toast — same pattern
 * as the workbench-kit reversible confirm (public/js/features/workbench/confirm.mjs).
 * @param {Record<string, unknown>} patient
 * @param {string} nextText
 * @param {HTMLElement} mount
 */
function scheduleSubjetivoAutosave(patient, nextText, mount) {
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    const state = ensureNotaEvolucion(patient);
    const previous = state.subjetivo;
    if (previous === nextText) return;
    state.subjetivo = nextText;
    persistClinicalState();
    showUndoToast({
      message: 'Subjetivo guardado',
      undoLabel: 'Deshacer',
      onUndo: () => {
        const s = ensureNotaEvolucion(patient);
        s.subjetivo = previous;
        persistClinicalState();
        const el = /** @type {HTMLTextAreaElement|null} */ (mount.querySelector('[data-ne-subjetivo]'));
        if (el) el.value = previous;
      },
    });
  }, AUTOSAVE_DEBOUNCE_MS);
}

/** @param {HTMLElement} mount */
export function mountNotaEvolucionPanel(mount) {
  if (!mount) return;
  render(mount);
}

export function openNotaEvolucionPanel() {
  if (!rt.getActiveId()) {
    rt.showToast('Selecciona un paciente primero', 'error');
    return;
  }
  if (typeof document === 'undefined') return;
  const backdrop = document.getElementById('nota-evolucion-modal-backdrop');
  const mount = document.getElementById('nota-evolucion-mount');
  if (!backdrop || !mount) return;
  render(/** @type {HTMLElement} */ (mount));
  backdrop.classList.add('open');
}

export function closeNotaEvolucionPanel() {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
  }
  if (typeof document === 'undefined') return;
  const backdrop = document.getElementById('nota-evolucion-modal-backdrop');
  if (backdrop) backdrop.classList.remove('open');
}

export const windowHandlers = {
  openNotaEvolucionPanel,
  closeNotaEvolucionPanel,
};
