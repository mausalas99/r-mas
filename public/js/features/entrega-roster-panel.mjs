/**
 * Entrega roster panel — full-width slide-over listing all patients
 * for handoff. Opened by the "Entrega" toolbar button.
 */
import {
  clinicalSessionContext,
  mapPatientForGuardiaGrid,
  refreshGuardiaCensusFromDb,
} from '../clinical-access-runtime.mjs';
import { patients } from '../app-state.mjs';
import { normalizePendientesJson } from '../../../lib/entrega/entrega-pendientes.mjs';
import {
  normalizeHandoffContext,
  handoffContextSummary,
} from '../../../lib/entrega/entrega-handoff-context.mjs';
import { openEntregaModal } from './clinical-entrega.mjs';

const PANEL_ID = 'entrega-roster-panel';
const WARN_SVG = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>`;
const LUNG_SVG = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2a7 7 0 00-7 7c0 4.5 7 13 7 13s7-8.5 7-13a7 7 0 00-7-7z"/></svg>`;
const ACTIVE_SVG = `<svg width="7" height="7" viewBox="0 0 8 8" aria-hidden="true"><circle cx="4" cy="4" r="4" fill="#6c5ce7"/></svg>`;

const STATUS_LABELS = {
  critical: 'Crítico',
  unstable: 'Inestable',
  stable: 'Estable',
  postop: 'Postoperatorio',
  '': '—',
};

const STATUS_CLASS = {
  critical: 'roster-sbadge--critical',
  unstable: 'roster-sbadge--unstable',
  stable: 'roster-sbadge--stable',
  postop: 'roster-sbadge--stable',
  '': 'roster-sbadge--none',
};

/** @param {object} g — guardia map entry */
function rowContextSummary(g) {
  if (!g?.pendientes_json) return null;
  const doc = normalizePendientesJson(g.pendientes_json);
  const ctx = normalizeHandoffContext(doc.handoffContext);
  const summary = handoffContextSummary(ctx);
  return summary === 'Sin resumen clínico' ? null : summary;
}

/** @param {object} g */
function rowIcons(g) {
  if (!g?.pendientes_json) return '';
  const doc = normalizePendientesJson(g.pendientes_json);
  const ctx = normalizeHandoffContext(doc.handoffContext);
  const flags = [];
  if (ctx.vasopressor.active) flags.push(`<span class="roster-icon-flag">${WARN_SVG} Vaso</span>`);
  if (ctx.ventilation.active) flags.push(`<span class="roster-icon-flag">${LUNG_SVG} Vent</span>`);
  return flags.join('');
}

/** @param {object} g */
function rowStatus(g) {
  if (!g?.pendientes_json) return '';
  const doc = normalizePendientesJson(g.pendientes_json);
  const ctx = normalizeHandoffContext(doc.handoffContext);
  return ctx.clinicalStatus || '';
}

/** @param {object} g */
function rowIsCriticalOrUnstable(g) {
  const status = rowStatus(g);
  return status === 'critical' || status === 'unstable' || !!g?.is_critical;
}

/**
 * @param {Record<string, unknown>|null|undefined} settings
 */
export function openEntregaRosterPanel(settings) {
  let host = document.getElementById(PANEL_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = PANEL_ID;
    document.body.appendChild(host);
  }

  const guardiasMap = clinicalSessionContext.guardiasMap;

  const censusPatients = patients
    .filter((p) => p && p.id && !p.isDemo && !p.archived)
    .map((p) => ({ ...mapPatientForGuardiaGrid(p), _raw: p }));

  const critical = censusPatients.filter((p) => rowIsCriticalOrUnstable(guardiasMap.get(p.id)));
  const rest = censusPatients.filter((p) => !rowIsCriticalOrUnstable(guardiasMap.get(p.id)));

  function renderRow(p) {
    const g = guardiasMap.get(p.id);
    const summary = rowContextSummary(g);
    const icons = rowIcons(g);
    const status = rowStatus(g);
    const label = STATUS_LABELS[status] || '—';
    const cls = STATUS_CLASS[status] || 'roster-sbadge--none';
    const hasCtx = !!summary;

    return `
      <div class="roster-row${hasCtx ? ' roster-row--ctx' : ''}" data-patient-id="${p.id}" role="button" tabindex="0">
        <div class="roster-row-bed">${p.bed_label || '—'}</div>
        <div class="roster-row-body">
          <div class="roster-row-name">${p.name || '—'}</div>
          <div class="roster-row-dx">${String(p.diagnosticosText || p.service || '').toUpperCase() || '—'}</div>
          ${summary
            ? `<div class="roster-row-ctx">${summary}</div>`
            : `<div class="roster-row-empty">Sin contexto — toca para completar</div>`}
        </div>
        <div class="roster-row-right">
          <span class="roster-sbadge ${cls}">${label}</span>
          <div class="roster-icon-flags">${icons}</div>
        </div>
      </div>`;
  }

  host.innerHTML = `
    <div class="roster-panel">
      <div class="roster-panel-header">
        <div class="roster-panel-title">Entrega</div>
        <div class="roster-panel-sub">Sala · ${censusPatients.length} pacientes</div>
        <span class="roster-active-badge">${ACTIVE_SVG} Activa</span>
      </div>
      <div class="roster-list">
        ${critical.length ? `<div class="roster-section">Críticos / inestables</div>${critical.map(renderRow).join('')}` : ''}
        ${rest.length ? `<div class="roster-section">Resto del servicio</div>${rest.map(renderRow).join('')}` : ''}
      </div>
      <div class="roster-panel-footer">
        <button class="btn-roster-cancel" id="roster-btn-cancel">Cancelar</button>
        <button class="btn-roster-confirm" id="roster-btn-confirm">Confirmar entrega</button>
      </div>
    </div>`;

  const rosterPatientIds = censusPatients.map((p) => String(p.id));

  host.querySelectorAll('.roster-row').forEach((row) => {
    const patientId = row.dataset.patientId;
    const open = () => {
      const g = guardiasMap.get(patientId);
      const patientIndex = rosterPatientIds.indexOf(String(patientId));
      openEntregaModal({
        patientId,
        guardiaId: g?.guardia_id ? String(g.guardia_id) : undefined,
        patientIndex: patientIndex >= 0 ? patientIndex : undefined,
        patientTotal: rosterPatientIds.length,
        rosterPatientIds,
        onConfirm: () => {
          void refreshGuardiaCensusFromDb(settings);
          openEntregaRosterPanel(settings);
        },
      });
    };
    row.addEventListener('click', open);
    row.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        open();
      }
    });
  });

  document.getElementById('roster-btn-cancel')?.addEventListener('click', () => {
    closeEntregaRosterPanel();
  });

  document.getElementById('roster-btn-confirm')?.addEventListener('click', () => {
    closeEntregaRosterPanel();
    activateTurnoActivo();
    window.dispatchEvent(new CustomEvent('guardia:turno-activo'));
  });
}

export function closeEntregaRosterPanel() {
  const host = document.getElementById(PANEL_ID);
  if (host) host.innerHTML = '';
  host?.removeAttribute('style');
}

/** Persist turno-activo state to localStorage. */
export function activateTurnoActivo() {
  try {
    localStorage.setItem('guardia.turnoActive', '1');
  } catch {
    /* quota */
  }
}

export function deactivateTurnoActivo() {
  try {
    localStorage.removeItem('guardia.turnoActive');
  } catch {
    /* quota */
  }
}

export function isTurnoActivo() {
  try {
    return !!localStorage.getItem('guardia.turnoActive');
  } catch {
    return false;
  }
}
