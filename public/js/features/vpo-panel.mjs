/**
 * Panel VPO — calculadora, plantillas EKG/Rx, fármacos perioperatorios, copiar.
 */
import { vpoByPatient, notes, labHistory, medRecetaByPatient, patients, saveState } from '../app-state.mjs';
import {
  isVpoPeriopMedGuidanceHidden,
  isVpoRiskCalculationDisabled,
} from '../clinical-product-policy.mjs';
import { ASA_OPTIONS, FUNCTIONAL_STATUS, PROCEDURES, searchProcedures } from '../vpo-lookups.mjs';
import { asaOptionLabel, functionalLabel, procedureLabel, procedureSearchText } from '../vpo-display.mjs';
import {
  ensureVpoState,
  applyProcedureSelection,
  applyAsaSuggestion,
  applyDuracionKey,
  syncAhaFields,
  ensureDuracionKey,
  ensureScaleResults,
  mergeFarmacosFromMedReceta,
  getLatestLabValues,
  applyLabValues,
  applyVitalsFromMonitoreo,
  autofillVitalsFromMonitoreoIfEmpty,
  DURACION_OPCIONES,
  setDiagnosticosList,
  importDiagnosticosFromNota,
  importDiagnosticosFromPaste,
  ensureDiagnosticosList,
} from '../vpo-data.mjs';
import { formatDiagnosticosCopy, applyDiagnosticosInference } from '../vpo-dx-inference.mjs';
import {
  ensurePatientDiagnosticos,
  pushDiagnosticosToPatient,
} from '../patient-diagnosticos.mjs';
import { suggestPeriopMed } from '../vpo-periop-meds.mjs';
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

export function registerVpoPanelRuntime(partial) {
  if (partial && typeof partial === 'object') Object.assign(rt, partial);
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

function renderAhaBadges(state) {
  syncAhaFields(state);
  var c = state.ahaClinico || '—';
  var q = state.ahaQuirurgico || '—';
  return (
    '<div class="vpo-aha-row">' +
    '<div class="vpo-aha-badge vpo-aha-clinico"><span>AHA clínico</span> ' +
    esc(c) +
    '</div>' +
    '<div class="vpo-aha-badge vpo-aha-quirurgico"><span>AHA quirúrgico</span> ' +
    esc(q) +
    '</div></div>'
  );
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

function riskCopyOpts() {
  return isVpoRiskCalculationDisabled() ? { noCalculatedRisk: true } : undefined;
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

function refreshVpoRiskSection(mount, state) {
  if (isVpoRiskCalculationDisabled()) return;
  syncAhaFields(state);
  var ahaWrap = mount.querySelector('.vpo-aha-wrap');
  if (ahaWrap) ahaWrap.innerHTML = renderAhaBadges(state);
}

function periopMedSuggestFn(name) {
  if (isVpoPeriopMedGuidanceHidden()) {
    return { sugerencia: '', notaEditable: '' };
  }
  return suggestPeriopMed(name);
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
    if (field === 'asaKey') {
      state.asaFromDiagnosticos = false;
      applyAsaSuggestion(state, state.asaKey);
    }
    scheduleSave();
    refreshVpoRiskSection(mount, state);
  });

  form.addEventListener('change', function (ev) {
    var el = ev.target;
    if (el && el.id === 'vpo-procedure-select') {
      applyProcedureSelection(state, el.value);
      scheduleSave();
      refreshVpoRiskSection(mount, state);
    }
    if (el && el.id === 'vpo-asa-select') {
      state.asaFromDiagnosticos = false;
      applyAsaSuggestion(state, el.value);
      scheduleSave();
      refreshVpoRiskSection(mount, state);
    }
    if (el && el.id === 'vpo-duracion-select') {
      applyDuracionKey(state, el.value);
      scheduleSave();
      refreshVpoRiskSection(mount, state);
    }
  });

  mount.querySelector('[data-vpo-action="tomar-lab"]')?.addEventListener('click', function () {
    var vals = getLatestLabValues(labHistory[patientId], patients.find((p) => p.id === patientId));
    if (!vals) {
      rt.showToast('Sin laboratorios en Resultados', 'error');
      return;
    }
    applyLabValues(state, vals);
    scheduleSave();
    renderVpoPanel(mount, patientId);
    rt.showToast('Valores de laboratorio aplicados', 'success');
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
    rt.showToast('Diagnósticos importados; factores de riesgo actualizados', 'success');
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
    mergeFarmacosFromMedReceta(state, block.items, periopMedSuggestFn);
    scheduleSave();
    renderVpoPanel(mount, patientId);
    rt.showToast('Fármacos actualizados desde SOME', 'success');
  });

  mount.querySelector('[data-vpo-action="ir-med"]')?.addEventListener('click', function () {
    rt.switchAppTab('med');
  });

  var procSearch = form.querySelector('#vpo-procedure-search');
  var procSelect = form.querySelector('#vpo-procedure-select');
  if (procSearch && procSelect) {
    procSearch.addEventListener('input', function () {
      var hits = searchProcedures(procSearch.value, procedureSearchText);
      procSelect.innerHTML = hits
        .map(function (p) {
          return '<option value="' + esc(p.id) + '">' + esc(procedureLabel(p)) + '</option>';
        })
        .join('');
    });
  }

  ['copy-ekg', 'copy-rx', 'copy-risk', 'copy-farm', 'copy-full'].forEach(function (action) {
    mount.querySelector('[data-vpo-action="' + action + '"]')?.addEventListener('click', function () {
      if (action === 'copy-ekg') {
        copyText('EKG', 'ELECTROCARDIOGRAMA:\n\n' + renderEkgWithFc(state.ekgText, state.fcLpm));
      } else if (action === 'copy-rx') {
        copyText('Rx tórax', 'RADIOGRAFÍA DE TÓRAX:\n\n' + state.rxText);
      } else if (action === 'copy-risk') {
        var lines = formatRiskLines(null, state, riskCopyOpts());
        copyText('Riesgos', state.valoracionIntro + '\n' + lines.join('\n'));
      } else if (action === 'copy-farm') {
        copyText('Fármacos', buildFarmacosCopyText(state.farmacos));
      } else if (action === 'copy-full') {
        var riskBlock = state.valoracionIntro + '\n' + formatRiskLines(null, state, riskCopyOpts()).join('\n');
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

var FLAG_GROUPS = [
  {
    title: 'RCRI (Lee)',
    flags: [
      ['rcri.cardiopatiaIsquemica', 'Cardiopatía isquémica'],
      ['rcri.insuficienciaCardiaca', 'Insuficiencia cardíaca'],
      ['rcri.evc', 'EVC / AIT'],
      ['rcri.dmInsulina', 'DM con insulina'],
      ['rcri.cirugiaAltoRiesgo', 'Cirugía alto riesgo'],
      ['rcri.urgente', 'Urgente'],
    ],
  },
  {
    title: 'ARISCAT',
    flags: [
      ['ariscat.infeccionRespiratoriaUltimoMes', 'IR último mes'],
      ['ariscat.cirugiaMayor45Min', 'Cirugía >45 min'],
      ['ariscat.urgente', 'Urgente'],
    ],
  },
  {
    title: 'Caprini',
    flags: [
      ['caprini.imcMayor25', 'IMC >25'],
      ['caprini.insuficienciaVenosa', 'IVC / varices'],
      ['caprini.reposoMovilidadReducida', 'Reposo / movilidad'],
      ['caprini.antecedenteEvc', 'TEV previo'],
      ['caprini.trombofilia', 'Trombofilia'],
      ['caprini.esteroideCronico', 'Esteroide crónico'],
      ['caprini.artritisInflamatoria', 'AR / inflamatoria'],
    ],
  },
];

function isFlagChecked(state, fieldPath) {
  var parts = fieldPath.split('.');
  return !!(state[parts[0]] && state[parts[0]][parts[1]]);
}

function renderFlagChip(state, fieldPath, label) {
  var checked = isFlagChecked(state, fieldPath);
  return (
    '<label class="vpo-chip">' +
    '<input type="checkbox" data-vpo-field="' +
    esc(fieldPath) +
    '"' +
    (checked ? ' checked' : '') +
    '>' +
    '<span>' +
    esc(label) +
    '</span></label>'
  );
}

function renderFlagGroups(state) {
  return (
    '<div class="vpo-flag-groups">' +
    FLAG_GROUPS.map(function (group) {
      return (
        '<div class="vpo-flag-group">' +
        '<p class="vpo-flag-group-title">' +
        esc(group.title) +
        '</p>' +
        '<div class="vpo-flag-chips">' +
        group.flags
          .map(function (pair) {
            return renderFlagChip(state, pair[0], pair[1]);
          })
          .join('') +
        '</div></div>'
      );
    }).join('') +
    '<p class="overview-hint" style="margin:4px 0 0;">Los diagnósticos marcan criterios compatibles para documentación; los puntajes de riesgo se calculan fuera de R+.</p>' +
    '</div>'
  );
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

function syncDxInferenceOnly(state) {
  if (!state) return;
  var nonEmpty = (state.diagnosticosList || []).filter(function (d) {
    return String(d || '').trim();
  });
  state.diagnosticosText = formatDiagnosticosCopy(nonEmpty);
  applyDiagnosticosInference(state);
  syncAhaFields(state);
}

function commitDxList(mount, state) {
  if (!state) return;
  state.diagnosticosTouched = true;
  setDiagnosticosList(state, state.diagnosticosList);
  scheduleSave();
  refreshDxListDom(mount, state);
  refreshFlagsAndSummary(mount, state);
}

/**
 * Delegación en el contenedor (sobrevive re-renders parciales).
 * @param {HTMLElement} mount
 */
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
      refreshFlagsAndSummary(mount, state);
      var asaSel = mount.querySelector('#vpo-asa-select');
      if (asaSel) asaSel.value = state.asaKey || '';
      rt.showToast('Diagnósticos separados; criterios actualizados', 'success');
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
    syncDxInferenceOnly(state);
    scheduleSave();
    refreshFlagsAndSummary(mount, state);
    var asaSel = mount.querySelector('#vpo-asa-select');
    if (asaSel) asaSel.value = state.asaKey || '';
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

function refreshFlagsAndSummary(mount, state) {
  if (isVpoRiskCalculationDisabled()) return;
  var flagsWrap = mount.querySelector('.vpo-flags-wrap');
  if (flagsWrap) flagsWrap.innerHTML = renderFlagGroups(state);
  var asaSel = mount.querySelector('#vpo-asa-select');
  if (asaSel) asaSel.value = state.asaKey || '';
  refreshVpoRiskSection(mount, state);
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
  syncAhaFields(state);
  autofillVitalsFromMonitoreoIfEmpty(state, patient || null);
  mount._vpoPatientId = patientId;

  var procOptions = PROCEDURES.map(function (p) {
    var sel = p.id === state.procedureId ? ' selected' : '';
    return '<option value="' + esc(p.id) + '"' + sel + '>' + esc(procedureLabel(p)) + '</option>';
  }).join('');

  var durOpts = '<option value="">—</option>' +
    DURACION_OPCIONES.map(function (d) {
      return (
        '<option value="' +
        esc(d.key) +
        '"' +
        (d.key === state.duracionCirugiaKey ? ' selected' : '') +
        '>' +
        esc(d.label) +
        '</option>'
      );
    }).join('');

  var riesgoBody = isVpoRiskCalculationDisabled()
    ? renderRiskScalesOnlyBody(state)
    : '<div class="vpo-grid">' +
      '<div class="field-group"><label>Edad</label><input class="ea-input" data-vpo-field="edad" type="text" value="' +
      esc(state.edad) +
      '"></div>' +
      '<div class="field-group"><label>Creatinina</label><input class="ea-input" data-vpo-field="creatinina" type="text" value="' +
      esc(state.creatinina) +
      '"></div>' +
      '<div class="field-group"><label>Hemoglobina</label><input class="ea-input" data-vpo-field="hemoglobina" type="text" value="' +
      esc(state.hemoglobina) +
      '"></div>' +
      '<div class="field-group"><label>SpO₂ %</label><input class="ea-input" data-vpo-field="spo2" type="text" value="' +
      esc(state.spo2) +
      '"></div>' +
      '<div class="field-group"><label>Duración estimada</label><select class="ea-input" id="vpo-duracion-select">' +
      durOpts +
      '</select></div>' +
      '<div class="field-group"><label>FC (lpm)</label><input class="ea-input" data-vpo-field="fcLpm" type="text" value="' +
      esc(state.fcLpm) +
      '"></div></div>' +
      '<div class="vpo-toolbar">' +
      '<button type="button" class="btn-med-secondary" data-vpo-action="tomar-lab">Tomar del laboratorio</button>' +
      '<button type="button" class="btn-med-secondary" data-vpo-action="tomar-estado">Tomar de Estado actual</button>' +
      '</div>' +
      '<div class="field-group"><label>ASA</label><select class="ea-input" id="vpo-asa-select" data-vpo-field="asaKey">' +
      '<option value="">—</option>' +
      ASA_OPTIONS.map(function (a) {
        return (
          '<option value="' +
          esc(a.key) +
          '"' +
          (a.key === state.asaKey ? ' selected' : '') +
          '>' +
          esc(asaOptionLabel(a)) +
          '</option>'
        );
      }).join('') +
      '</select></div>' +
      '<div class="field-group"><label>Dependencia funcional</label><select class="ea-input" data-vpo-field="functionalKey">' +
      FUNCTIONAL_STATUS.map(function (f) {
        return (
          '<option value="' +
          esc(f.key) +
          '"' +
          (f.key === state.functionalKey ? ' selected' : '') +
          '>' +
          esc(functionalLabel(f)) +
          '</option>'
        );
      }).join('') +
      '</select></div>' +
      '<div class="field-group"><label>Buscar procedimiento</label><input class="ea-input" id="vpo-procedure-search" type="search" placeholder="colecistectomía, torácica…"></div>' +
      '<div class="field-group"><label>Procedimiento</label><select class="ea-input" id="vpo-procedure-select">' +
      procOptions +
      '</select></div>' +
      '<div class="vpo-aha-wrap">' +
      renderAhaBadges(state) +
      '</div>' +
      '<div class="vpo-flags-wrap">' +
      renderFlagGroups(state) +
      '</div>';

  var ekgBody =
    (isVpoRiskCalculationDisabled()
      ? '<div class="vpo-grid" style="margin-bottom:10px;">' +
        '<div class="field-group"><label>FC (lpm) para plantilla EKG</label><input class="ea-input" data-vpo-field="fcLpm" type="text" value="' +
        esc(state.fcLpm) +
        '"></div></div>' +
        '<div class="vpo-toolbar" style="margin-bottom:10px;">' +
        '<button type="button" class="btn-med-secondary" data-vpo-action="tomar-estado">Tomar FC de Estado actual</button>' +
        '</div>'
      : '') +
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
