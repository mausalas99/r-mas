/**
 * Mounts the Phase 8 S/O/A/P screen (screen 9a) as the PRIMARY content of
 * the "Nota de evolución" tab in Paciente. Before this file existed, that
 * tab rendered `notes-indicaciones.mjs`'s free-text legacy template and the
 * S/O/A/P screen was reachable only from a secondary "Nota SOAP" button
 * inside it — see MISTAKES.md 2026-08-18 and
 * docs/superpowers/plans/2026-08-18-teal-workbench-full-fidelity.md
 * (REMEDIATION item 1).
 *
 * The legacy template still owns functionality the new screen doesn't cover
 * yet (Diagnósticos, Signos vitales, Tratamiento e indicaciones, the .docx
 * export buttons), so it stays reachable behind "Plantilla clásica" instead
 * of being deleted.
 */
import { ensureNotaEvolucionLoaded } from '../../lazy-feature-routes.mjs';
import { renderNoteForm } from '../notes-indicaciones.mjs';
import { escHtml } from '../../dom-escape.mjs';

const MOUNT_ID = 'note-form';
const INNER_MOUNT_ID = 'ne-primary-mount';

/** @type {'nueva'|'classic'} Session-only toggle; resets on reload. */
let viewMode = 'nueva';

/** @param {'nueva'|'classic'} mode */
function toolbarHtml(mode) {
  const label = mode === 'nueva' ? 'Plantilla clásica' : 'Nota de evolución';
  const target = mode === 'nueva' ? 'classic' : 'nueva';
  return (
    '<div class="ne-primary-toolbar">' +
    `<button type="button" class="ne-primary-toolbar-link" data-ne-view="${target}">` +
    (mode === 'nueva' ? escHtml(label) : `← ${escHtml(label)}`) +
    '</button>' +
    '</div>'
  );
}

/** @param {HTMLElement} host */
function wireToolbar(host) {
  const btn = host.querySelector('[data-ne-view]');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const next = btn.getAttribute('data-ne-view');
    viewMode = next === 'classic' ? 'classic' : 'nueva';
    renderNotaEvolucionPrimaryTab();
  });
}

/** Renders the legacy free-text template with a toolbar link back to the new screen. */
function renderClassicView() {
  renderNoteForm();
  const host = typeof document !== 'undefined' ? document.getElementById(MOUNT_ID) : null;
  if (!host) return;
  host.insertAdjacentHTML('afterbegin', toolbarHtml('classic'));
  wireToolbar(host);
}

/** Renders the Phase 8 S/O/A/P screen with a toolbar link to the legacy template. */
function renderNuevaView() {
  const host = typeof document !== 'undefined' ? document.getElementById(MOUNT_ID) : null;
  if (!host) return;
  host.innerHTML =
    toolbarHtml('nueva') +
    `<div id="${INNER_MOUNT_ID}" class="ne-primary-mount"><div class="ne-empty-hint">Cargando…</div></div>`;
  wireToolbar(host);
  void ensureNotaEvolucionLoaded().then((mod) => {
    if (viewMode !== 'nueva') return; // the resident may have switched away while this loaded
    const target = typeof document !== 'undefined' ? document.getElementById(INNER_MOUNT_ID) : null;
    if (target) mod.mountNotaEvolucionPanel(target);
  });
}

/** Renders whichever view is currently active into `#note-form`. */
export function renderNotaEvolucionPrimaryTab() {
  if (typeof document === 'undefined' || !document.getElementById(MOUNT_ID)) return;
  if (viewMode === 'classic') {
    renderClassicView();
  } else {
    renderNuevaView();
  }
}

/** @returns {'nueva'|'classic'} */
export function getNotaEvolucionPrimaryTabView() {
  return viewMode;
}

/**
 * Forces the legacy "Plantilla clásica" view and renders it. Used by call
 * sites that write into legacy-only fields the new S/O/A/P screen doesn't
 * have (the free-text Evolución textarea, Tratamiento e indicaciones) — the
 * resident needs to land where the result of their action is visible.
 */
export function showNotaEvolucionClassicView() {
  viewMode = 'classic';
  renderNotaEvolucionPrimaryTab();
}

/** Test-only: resets the session-only view toggle back to the default. */
export function resetNotaEvolucionPrimaryTabViewForTests() {
  viewMode = 'nueva';
}
