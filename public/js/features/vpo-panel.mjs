/**
 * Panel VPO — calculadora, plantillas EKG/Rx, fármacos perioperatorios, copiar.
 */
import { vpoByPatient, notes, labHistory, medRecetaByPatient, patients, saveState } from '../app-state.mjs';
import { computeVpoScores } from '../vpo-calculator.mjs';
import {
  ASA_OPTIONS,
  FUNCTIONAL_STATUS,
  PROCEDURES,
  searchProcedures,
} from '../vpo-lookups.mjs';
import {
  ensureVpoState,
  applyProcedureSelection,
  applyAsaSuggestion,
  mergeFarmacosFromMedReceta,
  buildDiagnosticosFromNota,
  getLatestLabValues,
  applyLabValues,
  applyFcFromNote,
} from '../vpo-data.mjs';
import { suggestPeriopMed } from '../vpo-periop-meds.mjs';
import {
  buildVpoFullCopyText,
  buildFarmacosCopyText,
  formatRiskLines,
  renderEkgWithFc,
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

function buildScores(state) {
  return computeVpoScores({
    edad: state.edad,
    creatinina: state.creatinina,
    hemoglobina: state.hemoglobina,
    spo2: state.spo2,
    duracionCirugiaHoras: state.duracionCirugiaHoras,
    asaKey: state.asaKey,
    functionalKey: state.functionalKey,
    procedureId: state.procedureId,
    rcri: state.rcri,
    ariscat: state.ariscat,
    caprini: state.caprini,
  });
}

function renderSummaryHtml(scores) {
  return (
    '<div class="vpo-summary card"><div class="card-body" style="font-size:13px;line-height:1.5;">' +
    '<div><strong>ASA</strong> ' +
    esc(scores.asaClass) +
    '</div>' +
    '<div><strong>RCRI (Lee)</strong> ' +
    scores.rcri.points +
    ' — ' +
    esc(scores.rcri.riskLabel) +
    '</div>' +
    '<div><strong>Gupta MICA</strong> ' +
    (scores.gupta.micaPercent * 100).toFixed(2) +
    '% — ' +
    esc(scores.gupta.interpretation) +
    '</div>' +
    '<div><strong>ARISCAT</strong> ' +
    scores.ariscat.points +
    ' — ' +
    esc(scores.ariscat.riskLabel) +
    ' ' +
    esc(scores.ariscat.detailPct) +
    '</div>' +
    '<div><strong>Caprini</strong> ' +
    scores.caprini.points +
    ' — ' +
    esc(scores.caprini.riskLabel) +
    '</div>' +
    '<p class="overview-hint" style="margin:8px 0 0;">Gupta: aproximación del Excel; validar con juicio clínico.</p>' +
    '</div></div>'
  );
}

function wireForm(mount, state, patientId) {
  var form = mount.querySelector('.vpo-form');
  if (!form || form._vpoWired) return;
  form._vpoWired = true;

  form.addEventListener('input', function (ev) {
    var el = ev.target;
    if (!el || !el.getAttribute('data-vpo-field')) return;
    var field = el.getAttribute('data-vpo-field');
    if (field.indexOf('.') >= 0) {
      var parts = field.split('.');
      if (!state[parts[0]]) state[parts[0]] = {};
      if (el.type === 'checkbox') state[parts[0]][parts[1]] = el.checked;
      else state[parts[0]][parts[1]] = el.value;
    } else {
      state[field] = el.type === 'checkbox' ? el.checked : el.value;
    }
    if (field === 'diagnosticosText') state.diagnosticosTouched = true;
    scheduleSave();
    var summary = mount.querySelector('.vpo-summary-wrap');
    if (summary) summary.innerHTML = renderSummaryHtml(buildScores(state));
  });

  form.addEventListener('change', function (ev) {
    var el = ev.target;
    if (el && el.id === 'vpo-procedure-select') {
      applyProcedureSelection(state, el.value);
      scheduleSave();
      var summary = mount.querySelector('.vpo-summary-wrap');
      if (summary) summary.innerHTML = renderSummaryHtml(buildScores(state));
    }
    if (el && el.id === 'vpo-asa-select') {
      applyAsaSuggestion(state, el.value);
      scheduleSave();
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

  mount.querySelector('[data-vpo-action="tomar-fc"]')?.addEventListener('click', function () {
    var note = notes[patientId] || {};
    if (!note.fc) {
      rt.showToast('Sin FC en la nota', 'error');
      return;
    }
    applyFcFromNote(state, note.fc);
    scheduleSave();
    renderVpoPanel(mount, patientId);
    rt.showToast('FC tomada de la nota', 'success');
  });

  mount.querySelector('[data-vpo-action="tomar-dx"]')?.addEventListener('click', function () {
    var note = notes[patientId] || {};
    var dx = buildDiagnosticosFromNota(note.diagnosticos);
    if (!dx) {
      rt.showToast('Sin diagnósticos en la nota', 'error');
      return;
    }
    if (state.diagnosticosTouched && state.diagnosticosText.trim()) {
      rt.showToast('Diagnósticos ya editados — no se sobrescriben', 'error');
      return;
    }
    state.diagnosticosText = dx;
    scheduleSave();
    renderVpoPanel(mount, patientId);
  });

  mount.querySelector('[data-vpo-action="tomar-meds"]')?.addEventListener('click', function () {
    var block = medRecetaByPatient[patientId];
    if (!block || !block.items || !block.items.length) {
      rt.showToast('Procesa la receta en Medicamentos primero', 'error');
      return;
    }
    mergeFarmacosFromMedReceta(state, block.items, function (name) {
      return suggestPeriopMed(name);
    });
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
      var hits = searchProcedures(procSearch.value);
      procSelect.innerHTML = hits
        .map(function (p) {
          return '<option value="' + esc(p.id) + '">' + esc(p.labelEn) + '</option>';
        })
        .join('');
    });
  }

  ['copy-ekg', 'copy-rx', 'copy-risk', 'copy-farm', 'copy-full'].forEach(function (action) {
    mount.querySelector('[data-vpo-action="' + action + '"]')?.addEventListener('click', function () {
      var scores = buildScores(state);
      if (action === 'copy-ekg') {
        copyText('EKG', 'ELECTROCARDIOGRAMA:\n\n' + renderEkgWithFc(state.ekgText, state.fcLpm));
      } else if (action === 'copy-rx') {
        copyText('Rx tórax', 'RADIOGRAFÍA DE TÓRAX:\n\n' + state.rxText);
      } else if (action === 'copy-risk') {
        var lines = formatRiskLines(scores, state);
        copyText('Riesgos', state.valoracionIntro + '\n' + lines.join('\n'));
      } else if (action === 'copy-farm') {
        copyText('Fármacos', buildFarmacosCopyText(state.farmacos));
      } else if (action === 'copy-full') {
        var riskBlock = state.valoracionIntro + '\n' + formatRiskLines(scores, state).join('\n');
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
        '<div class="vpo-farm-row" style="margin-bottom:10px;">' +
        '<div style="font-weight:600;font-size:12px;">' +
        esc(f.nombreDisplay) +
        '</div>' +
        '<textarea class="vpo-farm-nota" data-vpo-farm-idx="' +
        idx +
        '" rows="2" style="width:100%;margin-top:4px;">' +
        esc(f.notaEditable || '') +
        '</textarea></div>'
      );
    })
    .join('');
}

/**
 * @param {HTMLElement} mount
 * @param {string|null} patientId
 */
export function renderVpoPanel(mount, patientId) {
  if (!mount) return;
  if (!patientId) {
    mount.innerHTML =
      '<p class="overview-hint">Selecciona un paciente para valoración preoperatoria.</p>';
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

  var scores = buildScores(state);
  var procOptions = PROCEDURES.map(function (p) {
    var sel = p.id === state.procedureId ? ' selected' : '';
    return '<option value="' + esc(p.id) + '"' + sel + '>' + esc(p.labelEn) + '</option>';
  }).join('');

  mount.innerHTML =
    '<div class="vpo-form rpc-form-stack">' +
    '<div class="card"><div class="card-header">Riesgo preoperatorio</div><div class="card-body">' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;">' +
    '<div class="field-group"><label>Edad</label><input data-vpo-field="edad" type="text" value="' +
    esc(state.edad) +
    '"></div>' +
    '<div class="field-group"><label>Creatinina</label><input data-vpo-field="creatinina" type="text" value="' +
    esc(state.creatinina) +
    '"></div>' +
    '<div class="field-group"><label>Hb</label><input data-vpo-field="hemoglobina" type="text" value="' +
    esc(state.hemoglobina) +
    '"></div>' +
    '<div class="field-group"><label>SpO₂ %</label><input data-vpo-field="spo2" type="text" value="' +
    esc(state.spo2) +
    '"></div>' +
    '<div class="field-group"><label>Duración (h)</label><input data-vpo-field="duracionCirugiaHoras" type="text" value="' +
    esc(state.duracionCirugiaHoras) +
    '"></div>' +
    '<div class="field-group"><label>FC (lpm)</label><input data-vpo-field="fcLpm" type="text" value="' +
    esc(state.fcLpm) +
    '"></div></div>' +
    '<div style="margin:10px 0;"><button type="button" class="btn-edit-templates" data-vpo-action="tomar-lab">Tomar del laboratorio</button> ' +
    '<button type="button" class="btn-edit-templates" data-vpo-action="tomar-fc">Tomar FC de la nota</button></div>' +
    '<div class="field-group"><label>ASA</label><select id="vpo-asa-select" data-vpo-field="asaKey">' +
    '<option value="">—</option>' +
    ASA_OPTIONS.map(function (a) {
      return (
        '<option value="' +
        esc(a.key) +
        '"' +
        (a.key === state.asaKey ? ' selected' : '') +
        '>' +
        esc(a.asaClass + ' — ' + a.labelEn) +
        '</option>'
      );
    }).join('') +
    '</select></div>' +
    '<div class="field-group"><label>Dependencia funcional</label><select data-vpo-field="functionalKey">' +
    FUNCTIONAL_STATUS.map(function (f) {
      return (
        '<option value="' +
        esc(f.key) +
        '"' +
        (f.key === state.functionalKey ? ' selected' : '') +
        '>' +
        esc(f.labelEn) +
        '</option>'
      );
    }).join('') +
    '</select></div>' +
    '<div class="field-group"><label>Buscar procedimiento</label><input id="vpo-procedure-search" type="search" placeholder="colecist, torácica…"></div>' +
    '<div class="field-group"><label>Procedimiento Gupta</label><select id="vpo-procedure-select">' +
    procOptions +
    '</select></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
    '<div class="field-group"><label>AHA clínico</label><select data-vpo-field="ahaClinico">' +
    ['', 'Bajo', 'Intermedio', 'Alto']
      .map(function (v) {
        return (
          '<option value="' +
          esc(v) +
          '"' +
          (v === state.ahaClinico ? ' selected' : '') +
          '>' +
          (v || '—') +
          '</option>'
        );
      })
      .join('') +
    '</select></div>' +
    '<div class="field-group"><label>AHA quirúrgico</label><select data-vpo-field="ahaQuirurgico">' +
    ['', 'Bajo', 'Intermedio', 'Alto']
      .map(function (v) {
        return (
          '<option value="' +
          esc(v) +
          '"' +
          (v === state.ahaQuirurgico ? ' selected' : '') +
          '>' +
          (v || '—') +
          '</option>'
        );
      })
      .join('') +
    '</select></div></div>' +
    '<div class="vpo-flags" style="margin-top:10px;font-size:12px;display:grid;grid-template-columns:1fr 1fr;gap:6px;">' +
    [
      ['rcri.cardiopatiaIsquemica', 'Cardiopatía isquémica'],
      ['rcri.insuficienciaCardiaca', 'IC'],
      ['rcri.evc', 'EVC/AIT'],
      ['rcri.dmInsulina', 'DM con insulina'],
      ['rcri.cirugiaAltoRiesgo', 'Cirugía alto riesgo RCRI'],
      ['rcri.urgente', 'Urgente (RCRI)'],
      ['ariscat.infeccionRespiratoriaUltimoMes', 'IR último mes'],
      ['ariscat.cirugiaMayor45Min', 'Cirugía >45 min'],
      ['ariscat.urgente', 'Urgente (ARISCAT)'],
      ['caprini.imcMayor25', 'IMC >25'],
      ['caprini.insuficienciaVenosa', 'IVC/varices'],
      ['caprini.reposoMovilidadReducida', 'Reposo/movilidad reducida'],
      ['caprini.antecedenteEvc', 'TEV previo'],
      ['caprini.trombofilia', 'Trombofilia'],
      ['caprini.esteroideCronico', 'Esteroide crónico'],
      ['caprini.artritisInflamatoria', 'AR/inflamatoria'],
    ]
      .map(function (pair) {
        var checked = false;
        var parts = pair[0].split('.');
        if (state[parts[0]] && state[parts[0]][parts[1]]) checked = true;
        return (
          '<label><input type="checkbox" data-vpo-field="' +
          pair[0] +
          '"' +
          (checked ? ' checked' : '') +
          '> ' +
          esc(pair[1]) +
          '</label>'
        );
      })
      .join('') +
    '</div>' +
    '<div class="vpo-summary-wrap" style="margin-top:12px;">' +
    renderSummaryHtml(scores) +
    '</div></div></div>' +
    '<div class="card"><div class="card-header">EKG / Rx (editable)</div><div class="card-body">' +
    '<label>EKG</label><textarea data-vpo-field="ekgText" rows="5" style="width:100%;">' +
    esc(state.ekgText) +
    '</textarea>' +
    '<label style="margin-top:10px;display:block;">Rx tórax</label><textarea data-vpo-field="rxText" rows="5" style="width:100%;">' +
    esc(state.rxText) +
    '</textarea></div></div>' +
    '<div class="card"><div class="card-header">Diagnósticos</div><div class="card-body">' +
    '<button type="button" class="btn-edit-templates" data-vpo-action="tomar-dx">Tomar de la nota</button>' +
    '<textarea data-vpo-field="diagnosticosText" rows="4" style="width:100%;margin-top:8px;">' +
    esc(state.diagnosticosText) +
    '</textarea></div></div>' +
    '<div class="card"><div class="card-header">Fármacos perioperatorios</div><div class="card-body">' +
    '<p class="overview-hint">Orientativo. Fuente: receta SOME en Medicamentos.</p>' +
    '<button type="button" class="btn-edit-templates" data-vpo-action="tomar-meds">Tomar de Medicamentos (SOME)</button> ' +
    '<button type="button" class="btn-edit-templates" data-vpo-action="ir-med">Ir a Medicamentos</button>' +
    '<div class="vpo-farm-list" style="margin-top:10px;">' +
    renderFarmacosList(state.farmacos) +
    '</div></div></div>' +
    '<div class="vpo-actions" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">' +
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

  mount._vpoWired = false;
  var form = mount.querySelector('.vpo-form');
  if (form) form._vpoWired = false;
  wireForm(mount, state, patientId);
}

export function stashVpoForPatient(_patientId) {
  scheduleSave();
}
