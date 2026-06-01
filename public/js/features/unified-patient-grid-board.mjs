/**
 * High-density Guardia census grid with R4 ward partitioning.
 * Separate from pase-board.mjs (single-patient Pase summary view).
 */

/** @param {string|Date|undefined|null} last @param {string|undefined|null} freq */
export function calcVitalsBanner(last, freq) {
  if (!freq || freq === 'None') return { str: 'Rutina', cls: 'nominal-gray' };
  let ms = 4 * 3600000;
  if (freq === '1h') ms = 3600000;
  if (freq === '2h') ms = 7200000;
  if (freq === 'Shift_Once') ms = 8 * 3600000;

  const due = new Date(last || Date.now()).getTime() + ms;
  const diff = due - Date.now();
  if (diff <= 0) return { str: '⚠️ SIGNOS VENCIDOS', cls: 'breached' };
  const mins = Math.floor(diff / 60000);
  if (mins <= 15) {
    return { str: `⏳ Toca en: ${mins} min`, cls: 'warning' };
  }
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return { str: `⏱️ Toca en: ${h}h ${m}m`, cls: 'nominal' };
}

export const R4_FOLLOWUP_PIN_LABEL = 'Interconsultas — Seguimiento';

/** @param {Array<{ interconsult_type?: string, interconsult_status?: string }>} patients */
export function filterR4FollowUpPinPatients(patients) {
  return patients.filter(
    (p) => p.interconsult_type === 'Follow-up' && p.interconsult_status !== 'Resolved'
  );
}

export class UnifiedPatientGridBoard {
  /**
   * @param {string} domGridContainerId
   * @param {'GUARDIA'|'HANDOFF'} [appViewContext]
   */
  constructor(domGridContainerId, appViewContext = 'GUARDIA') {
    this.container = typeof document !== 'undefined' ? document.getElementById(domGridContainerId) : null;
    this.context = appViewContext;
    /** @type {(patientId: string) => void|null} */
    this.onChipClick = null;
  }

  /**
   * @param {'GUARDIA'|'HANDOFF'} appViewContext
   */
  setViewContext(appViewContext) {
    this.context = appViewContext === 'HANDOFF' ? 'HANDOFF' : 'GUARDIA';
  }

  /**
   * @param {string} patientId
   */
  handleChipClick(patientId) {
    const id = String(patientId || '');
    if (!id) return;
    if (this.context === 'HANDOFF') {
      if (typeof this.onChipClick === 'function') {
        this.onChipClick(id);
      }
      return;
    }
    const selectFn =
      (typeof window !== 'undefined' && typeof window.selectPatient === 'function'
        ? window.selectPatient
        : null) ||
      (typeof globalThis.selectPatient === 'function' ? globalThis.selectPatient : null);
    if (selectFn) selectFn(id);
  }

  /**
   * @param {Array<{ id: string, bed_label?: string, name?: string, service?: string, sub_area?: string, negativa_maniobras_firmada?: number, dxText?: string, pendingCount?: number, labsSnippet?: string, isCritical?: boolean, guardiaMeta?: object }>} patients
   * @param {Map<string, { is_critical?: number, last_vitals_check?: string, vitals_frequency?: string }>} guardiasMap
   * @param {string} [userRank]
   */
  drawCensusGrid(patients, guardiasMap, userRank = 'R1') {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.container.classList.add('patient-chips-grid');

    if (userRank === 'R4') {
      const followUpPatients = filterR4FollowUpPinPatients(patients);
      const followUpIds = new Set(followUpPatients.map((p) => p.id));
      if (followUpPatients.length > 0) {
        this.appendDivider(R4_FOLLOWUP_PIN_LABEL);
        this.renderBatch(followUpPatients, guardiasMap);
      }

      const sectors = ['Sala A', 'Sala B', 'Eme', 'Torre HU'];
      sectors.forEach((sector) => {
        const sectorPatients = patients.filter(
          (p) =>
            !followUpIds.has(p.id) &&
            (p.service === sector || p.sub_area === sector)
        );
        if (sectorPatients.length > 0) {
          this.appendDivider(sector);
          this.renderBatch(sectorPatients, guardiasMap);
        }
      });
      return;
    }

    this.renderBatch(patients, guardiasMap);
  }

  /**
   * @param {Array<{ id: string }>} patients
   * @param {Map<string, { is_critical?: number, last_vitals_check?: string, vitals_frequency?: string }>} guardiasMap
   */
  renderBatch(patients, guardiasMap) {
    const sorted = [...patients].sort(
      (a, b) =>
        (guardiasMap.get(b.id)?.is_critical || b.isCritical ? 1 : 0) -
        (guardiasMap.get(a.id)?.is_critical || a.isCritical ? 1 : 0)
    );
    sorted.forEach((p) => {
      if (this.container) {
        this.container.appendChild(this.compileChip(p, guardiasMap.get(p.id)));
      }
    });
  }

  /** @param {string} label */
  appendDivider(label) {
    if (!this.container) return;
    const div = document.createElement('div');
    div.className = 'r4-section-divider';
    div.textContent = label;
    this.container.appendChild(div);
  }

  /**
   * @param {{ id: string, bed_label?: string, name?: string, negativa_maniobras_firmada?: number, dxText?: string, pendingCount?: number, labsSnippet?: string, isCritical?: boolean, guardiaMeta?: { last_vitals_check?: string, vitals_frequency?: string, is_critical?: number } }} p
   * @param {{ is_critical?: number, last_vitals_check?: string, vitals_frequency?: string }|undefined} g
   */
  compileChip(p, g) {
    const card = document.createElement('div');
    const meta = p.guardiaMeta || g;
    const critical = !!(p.isCritical || meta?.is_critical);
    card.className = `patient-chip-card ${critical ? 'priority-critical' : ''}`;
    card.setAttribute('data-patient-id', p.id);

    const dnr = p.negativa_maniobras_firmada ? '<span class="dnr-badge">DNR</span>' : '';
    const vitals = calcVitalsBanner(meta?.last_vitals_check, meta?.vitals_frequency);
    const bed = p.bed_label ? `Cama ${p.bed_label}` : 'Sin cama';
    const name = String(p.name || '').toUpperCase();
    const dx = String(p.dxText || 'Sin diagnóstico registrado');
    const pending = Number(p.pendingCount || 0);
    const labs = String(p.labsSnippet || '—');
    const dotClass = critical ? 'dot-alta' : 'dot-media';

    card.innerHTML = `
      <div class="patient-chip-header">
        <span class="patient-chip-location">${bed}</span>
        <span class="patient-chip-name">${name}</span>
        <span class="priority-dot ${dotClass}" aria-hidden="true"></span>
      </div>
      <div class="patient-chip-body">
        ${dnr ? `<div class="patient-chip-dnr-row">${dnr}</div>` : ''}
        <p class="patient-chip-dx">${dx}</p>
        <div class="vitals-banner ${vitals.cls}">${vitals.str}</div>
      </div>
      <div class="patient-chip-footer">
        <span class="patient-chip-tasks">📋 ${pending} Pendiente${pending === 1 ? '' : 's'}</span>
        <span class="patient-chip-labs">${labs}</span>
      </div>`;

    card.addEventListener('click', () => {
      this.handleChipClick(p.id);
    });
    return card;
  }
}
