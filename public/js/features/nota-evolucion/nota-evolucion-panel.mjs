/**
 * Nota de evolución (SOAP) — screen 9a, montaje en DOM.
 * S: autosave con toast `om-rise` reversible (Deshacer). O: derivado en vivo,
 * el residente lo revisa (no lo teclea); se firma junto con toda la nota.
 * A: campo más grande. P: por zona con marcas mono.
 */
import { persistClinicalState } from '../../app-state.mjs';
import { showUndoToast } from '../workbench/undo-toast.mjs';
import { shortenPatientDisplayName, formatPatientBedLabel } from '../../patient-sidebar-card.mjs';
import { nextPlanMark } from './nota-evolucion-html.mjs';
import { buildNotaEvolucionHtml } from './nota-evolucion-html.mjs';
import {
  ensureNotaEvolucion,
  addPlanItem,
  removePlanItem,
  cyclePlanItemMark,
  editPlanItemText,
  planZonesForRender,
  objetivoZonesForRender,
  setObjetivoNarrative,
  signNoteForPatient,
  dayOfStayForPatient,
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

/** @param {string|null} iso */
function formatTimeHHMM(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Top identity/action bar model (mockup #9a L803-812): patient · bed ·
 * día N on the left (mono), draft/signed status on the right. Fields with
 * no real data (no admission date on record → no día N) are simply omitted,
 * never fabricated.
 * @param {Record<string, unknown>} patient
 * @param {import('./nota-evolucion-state.mjs').NotaEvolucionState} state
 * @returns {{ context: string, metadata: string, signed: boolean }}
 */
function buildHeaderModel(patient, state) {
  const p = /** @type {any} */ (patient);
  const nombre = shortenPatientDisplayName(String(p?.nombre || '')) || 'Sin nombre';
  const bed = formatPatientBedLabel(p);
  const day = dayOfStayForPatient(p);
  const contextParts = [nombre, bed, day != null ? `día ${day}` : ''].filter(Boolean);
  const signed = !!state.signedAt;
  const metadata = signed
    ? `firmada ${formatTimeHHMM(state.signedAt)}`
    : state.lastSavedAt
      ? `borrador · guardado ${formatTimeHHMM(state.lastSavedAt)}`
      : 'borrador · sin guardar';
  return { context: contextParts.join(' · '), metadata, signed };
}

/**
 * `insertables` (screen 9a right column, "Sin insertar") and `cambios`
 * ("Cambió desde ayer") have no wired data source yet — the app has no
 * per-note diff of "what's new since the last note" today. Rendering an
 * honest empty state here (never a fabricated item) until that source
 * exists is intentional; see `objetivoInputFromPatient` for the same rule
 * applied to labs.
 * @param {Record<string, unknown>} patient
 * @returns {{ subjetivo: string, objetivo: unknown, analisis: string, plan: unknown[], insertables: unknown[], cambios: unknown[], header: unknown }}
 */
export function buildRenderModel(patient) {
  const state = ensureNotaEvolucion(patient);
  // O · Objetivo is always the live derivation from today's real vitals/labs
  // until the note is signed, at which point the signed snapshot — not a
  // moving target — is what the resident committed to (see
  // `signNoteForPatient` / README: "se guarda el snapshot que se firmó").
  // Each zone also carries a narrative (edited > default) — see
  // `objetivoZonesForRender`.
  const objetivo = { zones: objetivoZonesForRender(state, patient) };
  return {
    subjetivo: state.subjetivo,
    objetivo,
    analisis: state.analisis,
    plan: planZonesForRender(state),
    insertables: [],
    cambios: [],
    header: buildHeaderModel(patient, state),
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
      persistNotaChange(state);
    });
  }
  wireHeaderActions(mount, patient);
  // Objetivo narrative — editable default per zone (problem 3b): edits persist
  // without a full re-render, so the resident's cursor/focus is not lost
  // mid-sentence (same pattern as Subjetivo/Análisis above).
  mount.querySelectorAll('[data-ne-objetivo-narrative]').forEach((el) => {
    el.addEventListener('input', () => {
      const zoneId = el.getAttribute('data-ne-objetivo-narrative');
      if (!zoneId) return;
      const state = ensureNotaEvolucion(patient);
      setObjetivoNarrative(state, zoneId, /** @type {HTMLTextAreaElement} */ (el).value);
      persistNotaChange(state);
    });
  });
  // Plan item text — editable in place (problem 4): no full re-render either,
  // for the same reason.
  mount.querySelectorAll('[data-ne-plan-edit]').forEach((el) => {
    el.addEventListener('input', () => {
      const zoneEl = el.closest('[data-ne-plan-zone]');
      const zoneId = zoneEl && zoneEl.getAttribute('data-ne-plan-zone');
      const itemId = el.getAttribute('data-ne-plan-edit');
      if (!zoneId || !itemId) return;
      const state = ensureNotaEvolucion(patient);
      editPlanItemText(state, zoneId, itemId, /** @type {HTMLInputElement} */ (el).value);
      persistNotaChange(state);
    });
  });
  mount.querySelectorAll('[data-ne-plan-cycle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const zoneEl = btn.closest('[data-ne-plan-zone]');
      const zoneId = zoneEl && zoneEl.getAttribute('data-ne-plan-zone');
      const itemId = btn.getAttribute('data-ne-plan-cycle');
      if (!zoneId || !itemId) return;
      const state = ensureNotaEvolucion(patient);
      cyclePlanItemMark(state, zoneId, itemId, nextPlanMark);
      persistNotaChange(state);
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
      persistNotaChange(state);
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
      persistNotaChange(state);
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
 * Stamps `lastSavedAt` and persists — every nota mutation goes through this
 * so the header's "borrador · guardado HH:MM" status (mockup #9a L811) is
 * real, not decorative.
 * @param {import('./nota-evolucion-state.mjs').NotaEvolucionState} state
 */
function persistNotaChange(state) {
  state.lastSavedAt = new Date().toISOString();
  persistClinicalState();
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
  persistNotaChange(state);
}

/**
 * Header actions (mockup #9a L809-812) — "Copiar nota de ayer" (honestly
 * disabled: the app keeps one live note per patient, not a per-day archive,
 * so there is no real "yesterday's note" to copy), "Vista de impresión"
 * (real browser print), "Firmar y cerrar" (the note-level sign action —
 * see `signNoteForPatient`).
 * @param {HTMLElement} mount
 * @param {Record<string, unknown>} patient
 */
function wireHeaderActions(mount, patient) {
  const copyBtn = mount.querySelector('[data-wb-secondary="0"]');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      rt.showToast('Sin nota de ayer registrada', 'info');
    });
  }
  const printBtn = mount.querySelector('[data-wb-secondary="1"]');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      if (typeof window !== 'undefined' && typeof window.print === 'function') window.print();
    });
  }
  const signBtn = mount.querySelector('[data-wb-primary]');
  if (signBtn) {
    signBtn.addEventListener('click', () => {
      signNoteForPatient(patient);
      persistClinicalState();
      rt.showToast('Nota firmada ✓', 'success');
      render(mount);
    });
  }
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
    persistNotaChange(state);
    showUndoToast({
      message: 'Subjetivo guardado',
      undoLabel: 'Deshacer',
      onUndo: () => {
        const s = ensureNotaEvolucion(patient);
        s.subjetivo = previous;
        persistNotaChange(s);
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
