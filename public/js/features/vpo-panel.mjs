/**
 * Panel VPO — plantillas EKG/Rx, escalas documentadas manualmente, copiar.
 */
import { vpoByPatient, notes, medRecetaByPatient, patients, saveState } from '../app-state.mjs';
import {
  ensureVpoState,
  ensureDuracionKey,
  ensureScaleResults,
  mergeFarmacosFromMedReceta,
  applyVitalsFromMonitoreo,
  autofillVitalsFromMonitoreoIfEmpty,
  setDiagnosticosList,
  importDiagnosticosFromNota,
  importDiagnosticosFromPaste,
  ensureDiagnosticosList,
} from '../vpo-data.mjs';
import { formatDiagnosticosCopy } from '../patient-diagnosticos.mjs';
import {
  ensurePatientDiagnosticos,
  pushDiagnosticosToPatient,
} from '../patient-diagnosticos.mjs';
import {
  buildVpoFullCopyText,
  buildFarmacosCopyText,
  formatRiskLines,
  renderEkgWithFc,
  VPO_OFFICIAL_CALCULATOR_DISCLAIMER,
  VPO_SUGGESTED_SCALES,
} from '../vpo-text.mjs';
import { copyToClipboardSafe } from './soap-estado.mjs';

/** @type {{ getActiveId(): string|null, showToast(msg: string, type?: string): void, switchAppTab(tab: string): void }} */
let rt = {
  getActiveId() {
    return null;
  },
  showToast() {},
  switchAppTab() {},
};

var _saveTimer = null;

export function registerVpoPanelRuntime(ctx) {
  if (ctx && typeof ctx === 'object') Object.assign(rt, ctx);
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function scheduleSave() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(function () {
    _saveTimer = null;
    saveState();
  }, 400);
}

function copyText(label, text) {
  var t = String(text || '').trim();
  if (!t) {
    rt.showToast('Nada que copiar en ' + label, 'error');
    return;
  }
  copyToClipboardSafe(t).then(function (ok) {
    rt.showToast(ok ? label + ' copiado' : 'No se pudo copiar', ok ? 'success' : 'error');
  });
}

function renderRiskScalesOnlyBody(state) {
  ensureScaleResults(state);
  var sr = state.scaleResults;
  return (
    '<p class="overview-hint">' +
    esc(VPO_OFFICIAL_CALCULATOR_DISCLAIMER) +
    '</p>' +
    '<div class="field-group" style="margin-top:10px;">' +
    '<label class="ea-label">Introducción (texto previo a escalas)</label>' +
    '<textarea class="ea-input" data-vpo-field="valoracionIntro" rows="2">' +
    esc(state.valoracionIntro) +
    '</textarea></div>' +
    '<p class="ea-label vpo-scales-grid-title">Resultado por escala (calculadora externa)</p>' +
    '<div class="vpo-scales-results">' +
    VPO_SUGGESTED_SCALES.map(function (s) {
      return (
        '<label class="vpo-scale-cell" title="' +
        esc(s.hint) +
        '">' +
        '<span class="vpo-scale-label">' +
        esc(s.label) +
        '</span>' +
        '<input type="text" class="ea-input" data-vpo-scale="' +
        esc(s.key) +
        '" value="' +
        esc(sr[s.key]) +
        '" placeholder="Resultado…" autocomplete="off">' +
        '</label>'
      );
    }).join('') +
    '</div>'
  );
}

/**
 * @param {string} title
 * @param {string} tone
 * @param {boolean} open
 * @param {string} body
 */
function vpoSection(title, tone, open, body) {
  return (
    '<details class="vpo-section ea-card"' +
    (open ? ' open' : '') +
    '>' +
    '<summary class="card-header card-header--tone-' +
    tone +
    '">' +
    esc(title) +
    '</summary>' +
    '<div class="vpo-section-body">' +
    body +
    '</div></details>'
  );
}

function wireForm(mount, state, patientId) {
  var form = mount.querySelector('.vpo-form');
  if (!form || form._vpoWired) return;
  form._vpoWired = true;

  form.addEventListener('input', function (ev) {
    var el = ev.target;
    if (!el) return;
    var scaleKey = el.getAttribute('data-vpo-scale');
    if (scaleKey) {
      ensureScaleResults(state);
      state.scaleResults[scaleKey] = el.value;
      scheduleSave();
      return;
    }
    if (!el.getAttribute('data-vpo-field')) return;
    var field = el.getAttribute('data-vpo-field');
    if (field.indexOf('.') >= 0) {
      var parts = field.split('.');
      if (!state[parts[0]]) state[parts[0]] = {};
      if (el.type === 'checkbox') state[parts[0]][parts[1]] = el.checked;
      else state[parts[0]][parts[1]] = el.value;
    } else {
      state[field] = el.type === 'checkbox' ? el.checked : el.value;
    }
    scheduleSave();
  });

  mount.querySelector('[data-vpo-action="tomar-estado"]')?.addEventListener('click', function () {
    var patient = patients.find(function (p) {
      return p.id === patientId;
    });
    if (!applyVitalsFromMonitoreo(state, patient || null)) {
      rt.showToast('Sin FC o SpO₂ en Estado actual', 'error');
      return;
    }
    scheduleSave();
    renderVpoPanel(mount, patientId);
    rt.showToast('FC y SpO₂ tomados de Estado actual', 'success');
  });

  mount.querySelector('[data-vpo-action="tomar-dx"]')?.addEventListener('click', function () {
    var note = notes[patientId] || {};
    if (state.diagnosticosTouched && (state.diagnosticosList || []).some(function (d) { return String(d).trim(); })) {
      rt.showToast('Diagnósticos ya editados — no se sobrescriben', 'error');
      return;
    }
    if (!importDiagnosticosFromNota(state, note.diagnosticos || [])) {
      rt.showToast('Sin diagnósticos en la nota', 'error');
      return;
    }
    scheduleSave();
    renderVpoPanel(mount, patientId);
    rt.showToast('Diagnósticos importados', 'success');
  });

  mount.querySelector('[data-vpo-action="push-dx-datos"]')?.addEventListener('click', function () {
    var patient = patients.find(function (p) {
      return p.id === patientId;
    });
    if (!patient) return;
    var list = (state.diagnosticosList || []).filter(function (d) {
      return String(d).trim();
    });
    if (!list.length) {
      rt.showToast('Sin diagnósticos en VPO para enviar', 'error');
      return;
    }
    pushDiagnosticosToPatient(patient, list);
    saveState();
    rt.showToast('Diagnósticos guardados en Datos del paciente', 'success');
  });

  mount.querySelector('[data-vpo-action="tomar-meds"]')?.addEventListener('click', function () {
    var block = medRecetaByPatient[patientId];
    if (!block || !block.items || !block.items.length) {
      rt.showToast('Procesa la receta en Medicamentos primero', 'error');
      return;
    }
    mergeFarmacosFromMedReceta(state, block.items);
    scheduleSave();
    renderVpoPanel(mount, patientId);
    rt.showToast('Fármacos actualizados desde SOME', 'success');
  });

  mount.querySelector('[data-vpo-action="ir-med"]')?.addEventListener('click', function () {
    rt.switchAppTab('med');
  });

  ['copy-ekg', 'copy-rx', 'copy-risk', 'copy-farm', 'copy-full'].forEach(function (action) {
    mount.querySelector('[data-vpo-action="' + action + '"]')?.addEventListener('click', function () {
      if (action === 'copy-ekg') {
        copyText('EKG', 'ELECTROCARDIOGRAMA:\n\n' + renderEkgWithFc(state.ekgText, state.fcLpm));
      } else if (action === 'copy-rx') {
        copyText('Rx tórax', 'RADIOGRAFÍA DE TÓRAX:\n\n' + state.rxText);
      } else if (action === 'copy-risk') {
        var lines = formatRiskLines(null, state);
        copyText('Riesgos', state.valoracionIntro + '\n' + lines.join('\n'));
      } else if (action === 'copy-farm') {
        copyText('Fármacos', buildFarmacosCopyText(state.farmacos));
      } else if (action === 'copy-full') {
        var riskBlock = state.valoracionIntro + '\n' + formatRiskLines(null, state).join('\n');
        copyText(
          'Valoración completa',
          buildVpoFullCopyText({
            ekgBlock: renderEkgWithFc(state.ekgText, state.fcLpm),
            rxBlock: state.rxText,
            diagnosticosBlock: state.diagnosticosText,
            valoracionBlock: riskBlock,
          })
        );
      }
    });
  });
}

function renderFarmacosList(farmacos) {
  if (!farmacos || !farmacos.length) {
    return '<p class="overview-hint">Sin fármacos en VPO. Usa «Tomar de Medicamentos (SOME)».</p>';
  }
  return farmacos
    .map(function (f, idx) {
      return (
        '<div class="vpo-farm-row">' +
        '<div class="vpo-farm-name">' +
        esc(f.nombreDisplay) +
        '</div>' +
        '<textarea class="vpo-farm-nota ea-input" data-vpo-farm-idx="' +
        idx +
        '" rows="2">' +
        esc(f.notaEditable || '') +
        '</textarea></div>'
      );
    })
    .join('');
}

function syncDxTextOnly(state) {
  if (!state) return;
  var nonEmpty = (state.diagnosticosList || []).filter(function (d) {
    return String(d || '').trim();
  });
  state.diagnosticosText = formatDiagnosticosCopy(nonEmpty);
}

function commitDxList(mount, state) {
  if (!state) return;
  state.diagnosticosTouched = true;
  setDiagnosticosList(state, state.diagnosticosList);
  scheduleSave();
  refreshDxListDom(mount, state);
}

function dxRowsForRender(state) {
  var list = (state.diagnosticosList || []).slice();
  return list.length ? list : [''];
}

function renderDxListHtml(state) {
  var rows = dxRowsForRender(state);
  return rows
    .map(function (dx, i) {
      var canRemove = rows.length > 1;
      return (
        '<div class="vpo-dx-row list-row">' +
        '<input type="text" class="ea-input" data-vpo-dx-idx="' +
        i +
        '" value="' +
        esc(dx) +
        '" placeholder="Diagnóstico ' +
        (i + 1) +
        '">' +
        '<button type="button" class="btn-remove" data-vpo-dx-remove="' +
        i +
        '"' +
        (canRemove ? '' : ' style="visibility:hidden"') +
        ' aria-label="Eliminar">×</button></div>'
      );
    })
    .join('');
}

function refreshDxListDom(mount, state) {
  var listEl = mount.querySelector('.vpo-dx-list');
  if (!listEl) return;
  listEl.innerHTML = renderDxListHtml(state);
}

function renderDiagnosticosSection(state) {
  return (
    '<div class="vpo-toolbar">' +
    '<button type="button" class="btn-med-secondary" data-vpo-action="tomar-dx">Tomar de la nota</button>' +
    '<button type="button" class="btn-med-secondary" data-vpo-action="push-dx-datos">Enviar a Datos del paciente</button>' +
    '<button type="button" class="btn-add-row" data-vpo-action="dx-add-row">+ Agregar diagnóstico</button>' +
    '</div>' +
    '<div class="vpo-dx-list">' +
    renderDxListHtml(state) +
    '</div>' +
    '<div class="vpo-dx-paste">' +
    '<span class="ea-label">Pegar lista con « + » entre diagnósticos</span>' +
    '<textarea class="ea-input vpo-dx-paste-input" data-vpo-dx-paste placeholder="DX1 + DX2 + DX3…"></textarea>' +
    '<button type="button" class="btn-med-secondary" data-vpo-action="dx-split-plus">Separar por +</button>' +
    '</div>'
  );
}

function liveVpoState(mount) {
  var pid = mount._vpoPatientId;
  if (!pid) return null;
  return ensureVpoState(vpoByPatient, pid);
}


function ensureVpoMountDelegation(mount) {
  if (mount._vpoDelegationWired) return;
  mount._vpoDelegationWired = true;

  mount.addEventListener('click', function (ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest('[data-vpo-action]') : null;
    if (!btn || !mount.contains(btn)) return;
    var action = btn.getAttribute('data-vpo-action');
    var state = liveVpoState(mount);
    if (!state) return;
    var pid = mount._vpoPatientId;

    if (action === 'dx-split-plus') {
      ev.preventDefault();
      var ta = mount.querySelector('[data-vpo-dx-paste]');
      if (!importDiagnosticosFromPaste(state, ta ? ta.value : '')) {
        rt.showToast('Pega diagnósticos separados por +', 'error');
        return;
      }
      if (ta) ta.value = '';
      scheduleSave();
      refreshDxListDom(mount, state);
      rt.showToast('Diagnósticos separados', 'success');
      return;
    }

    if (action === 'dx-add-row') {
      ev.preventDefault();
      if (!state.diagnosticosList) state.diagnosticosList = [''];
      if (state.diagnosticosList[state.diagnosticosList.length - 1]) {
        state.diagnosticosList.push('');
      }
      commitDxList(mount, state);
      var lastInput = mount.querySelector(
        '[data-vpo-dx-idx="' + (state.diagnosticosList.length - 1) + '"]'
      );
      if (lastInput) lastInput.focus();
      return;
    }

    var removeBtn = ev.target.closest ? ev.target.closest('[data-vpo-dx-remove]') : null;
    if (removeBtn && mount.contains(removeBtn)) {
      ev.preventDefault();
      var idx = parseInt(removeBtn.getAttribute('data-vpo-dx-remove'), 10);
      if (!state.diagnosticosList || state.diagnosticosList.length <= 1) return;
      state.diagnosticosList.splice(idx, 1);
      if (!state.diagnosticosList.length) state.diagnosticosList = [''];
      commitDxList(mount, state);
    }
  });

  mount.addEventListener('input', function (ev) {
    var el = ev.target;
    if (!el || el.getAttribute('data-vpo-dx-idx') == null || !mount.contains(el)) return;
    var state = liveVpoState(mount);
    if (!state) return;
    var idx = parseInt(el.getAttribute('data-vpo-dx-idx'), 10);
    if (!state.diagnosticosList) state.diagnosticosList = [''];
    state.diagnosticosList[idx] = el.value.toUpperCase();
    state.diagnosticosTouched = true;
    syncDxTextOnly(state);
    scheduleSave();
  });

  mount.addEventListener('keydown', function (ev) {
    var el = ev.target;
    if (!el || el.getAttribute('data-vpo-dx-idx') == null || !mount.contains(el)) return;
    if (ev.key !== 'Enter') return;
    ev.preventDefault();
    var state = liveVpoState(mount);
    if (!state) return;
    var idx = parseInt(el.getAttribute('data-vpo-dx-idx'), 10);
    if (!state.diagnosticosList) state.diagnosticosList = [''];
    if (idx >= state.diagnosticosList.length - 1) {
      state.diagnosticosList.push('');
    }
    commitDxList(mount, state);
    var next = mount.querySelector('[data-vpo-dx-idx="' + (idx + 1) + '"]');
    if (next) next.focus();
  });
}

/**
 * @param {HTMLElement} mount
 * @param {string|null} patientId
 */
export function renderVpoPanel(mount, patientId) {
  if (!mount) return;
  if (!patientId) {
    mount.innerHTML = '<p class="overview-hint vpo-panel">Selecciona un paciente para valoración preoperatoria.</p>';
    return;
  }
  var state = ensureVpoState(vpoByPatient, patientId);
  var patient = patients.find(function (p) {
    return p.id === patientId;
  });
  if (!state.edad && patient && patient.edad) {
    var m = String(patient.edad).match(/(\d+)/);
    if (m) state.edad = m[1];
  }
  ensureDuracionKey(state);
  ensureDiagnosticosList(state);
  if (patient && !state.diagnosticosTouched) {
    var vpoDxEmpty = !(state.diagnosticosList || []).some(function (d) {
      return String(d).trim();
    });
    if (vpoDxEmpty) {
      ensurePatientDiagnosticos(patient);
      var fromPat = (patient.diagnosticosList || []).filter(function (d) {
        return String(d).trim();
      });
      if (fromPat.length) setDiagnosticosList(state, fromPat.concat(['']));
    }
  }
  autofillVitalsFromMonitoreoIfEmpty(state, patient || null);
  mount._vpoPatientId = patientId;

  var riesgoBody = renderRiskScalesOnlyBody(state);

  var ekgBody =
    '<div class="vpo-grid" style="margin-bottom:10px;">' +
    '<div class="field-group"><label>FC (lpm) para plantilla EKG</label><input class="ea-input" data-vpo-field="fcLpm" type="text" value="' +
    esc(state.fcLpm) +
    '"></div></div>' +
    '<div class="vpo-toolbar" style="margin-bottom:10px;">' +
    '<button type="button" class="btn-med-secondary" data-vpo-action="tomar-estado">Tomar FC de Estado actual</button>' +
    '</div>' +
    '<label class="ea-label">EKG</label><textarea class="ea-input" data-vpo-field="ekgText" rows="5">' +
    esc(state.ekgText) +
    '</textarea>' +
    '<label class="ea-label" style="margin-top:10px;display:block;">Rx tórax</label><textarea class="ea-input" data-vpo-field="rxText" rows="5">' +
    esc(state.rxText) +
    '</textarea>';

  mount.innerHTML =
    '<div class="vpo-panel vpo-form rpc-form-stack">' +
    vpoSection('Riesgo preoperatorio', 'amber', true, riesgoBody) +
    vpoSection('EKG y Rx tórax', 'indigo', false, ekgBody) +
    vpoSection('Diagnósticos', 'rose', true, renderDiagnosticosSection(state)) +
    vpoSection(
      'Fármacos perioperatorios',
      'teal',
      false,
      '<p class="overview-hint">Fuente: receta SOME en Medicamentos.</p>' +
        '<div class="vpo-toolbar">' +
        '<button type="button" class="btn-med-secondary" data-vpo-action="tomar-meds">Tomar de Medicamentos (SOME)</button> ' +
        '<button type="button" class="btn-med-secondary" data-vpo-action="ir-med">Ir a Medicamentos</button></div>' +
        '<div class="vpo-farm-list">' +
        renderFarmacosList(state.farmacos) +
        '</div>'
    ) +
    '<div class="vpo-actions">' +
    '<button type="button" class="manejo-copy-btn primary" data-vpo-action="copy-full">Copiar valoración completa</button>' +
    '<button type="button" class="manejo-copy-btn" data-vpo-action="copy-ekg">Copiar EKG</button>' +
    '<button type="button" class="manejo-copy-btn" data-vpo-action="copy-rx">Copiar Rx</button>' +
    '<button type="button" class="manejo-copy-btn" data-vpo-action="copy-risk">Copiar riesgos</button>' +
    '<button type="button" class="manejo-copy-btn" data-vpo-action="copy-farm">Copiar fármacos</button>' +
    '</div></div>';

  mount.querySelectorAll('.vpo-farm-nota').forEach(function (ta) {
    ta.addEventListener('input', function () {
      var idx = parseInt(ta.getAttribute('data-vpo-farm-idx'), 10);
      if (state.farmacos[idx]) {
        state.farmacos[idx].notaEditable = ta.value;
        scheduleSave();
      }
    });
  });

  ensureVpoMountDelegation(mount);

  mount._vpoWired = false;
  var form = mount.querySelector('.vpo-form');
  if (form) form._vpoWired = false;
  wireForm(mount, state, patientId);
}

export function stashVpoForPatient(_patientId) {
  scheduleSave();
}
