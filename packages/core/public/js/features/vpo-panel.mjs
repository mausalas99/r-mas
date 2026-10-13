/**
 * Panel VPO — plantillas EKG/Rx, escalas documentadas manualmente, copiar.
 */
import { getPatients, getVpoByPatient, getNotes, getMedRecetaByPatient, getLabHistory, persistClinicalState } from '../app-state.mjs';
import {
  ensureVpoState,
  ensureScaleResults,
  mergeFarmacosFromMedReceta,
  applyVitalsFromMonitoreo,
  importDiagnosticosFromNota,
  setDiagnosticosList,
  applyProcedureSelection,
  applyAsaSuggestion,
} from '../vpo-data.mjs';
import { focusMissingInput, renderCalcInputsHtml } from './vpo-calc-form.mjs';
import { autofillCalc, buildScaleLines } from '../vpo-calc.mjs';
import { isVpoCalculatorEnabled } from './profile-prefs.mjs';
import { formatDiagnosticosCopy } from '../patient-diagnosticos.mjs';
import { pushDiagnosticosToPatient, stampCensoFieldsClock } from '../patient-diagnosticos.mjs';
import { scheduleCloudSyncPush } from './cloud-sync/mutate-bridge.mjs';
import {
  buildVpoFullCopyText,
  buildFarmacosCopyText,
  formatRiskLines,
  renderEkgWithFc,
  VPO_SUGGESTED_SCALES,
  VPO_OFFICIAL_CALCULATOR_DISCLAIMER,
} from '../vpo-text.mjs';
import { copyToClipboardSafe } from './soap-estado.mjs';
import {
  hydrateVpoPatientDefaults,
  buildVpoPanelInnerHtml,
  handleVpoDxDelegationAction,
  handleVpoDxRemoveRow,
} from './vpo-panel-helpers.mjs';

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

function scheduleSave() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(function () {
    _saveTimer = null;
    persistClinicalState();
    scheduleCloudSyncPush();
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

/* UI copy only. Copy-output labels stay in vpo-text.mjs. */
var VPO_SCALE_UI_LABEL = { rcri: 'RCRI (Lee)', ahaCv: 'Riesgo CV AHA/ACC', ahaSurg: 'Riesgo quirúrgico AHA/ACC', guptaResp: 'Gupta resp.', guptaPneu: 'Gupta neumonía' };

/** Which EKG/Rx dialog is open; a re-render reopens it. */
var _openDialog = '';
/** Which «Otras escalas» tab is showing. */
var _scaleTab = '';

/** Names of scales that lacked data on the last «Calcular todo»; shown once on the next render. */
var _missingNote = '';

/** Results shown in three cards by system; keys not listed here land in the last card. */
var VPO_GROUPS = [
  ['Función', ['mets', 'abvd', 'cfs', 'asa', 'nrs', 'awol']],
  ['Cardiaco', ['ahaSurg', 'ahaCv', 'ahaMod', 'rcri', 'gupta', 'aub', 'chads', 'escSurg', 'hasbled']],
  ['Pulmonar y trombosis', null],
];

/** Results: one row per scale, grouped in cards. A scale without data shows what it lacks and a «Completar» button. */
function renderScaleRows(state) {
  var sr = state.scaleResults;
  var calc = isVpoCalculatorEnabled();
  var lines = calc ? buildScaleLines(state) : {};
  var shown = VPO_SUGGESTED_SCALES.filter(function (s) {
    return !s.optional || String(sr[s.key] || '').trim();
  });
  var named = [].concat.apply([], VPO_GROUPS.map(function (g) { return g[1] || []; }));
  function row(s) {
    var miss = !String(sr[s.key] || '').trim() && lines[s.key] && lines[s.key].missing;
    return (
      '<div class="vpo-row" title="' + esc(s.hint) + '"><span class="vpo-row-name">' + esc(VPO_SCALE_UI_LABEL[s.key] || s.label) + '</span>' +
      (miss
        ? '<span class="vpo-row-miss">Falta: ' + esc(miss.join(', ')) + '</span><button type="button" class="wb-btn" data-vpo-complete="' + esc(miss.join('|')) + '">Completar</button>'
        : '<input type="text" class="vpo-row-val" data-vpo-scale="' + esc(s.key) + '" value="' + esc(sr[s.key]) + '" placeholder="' + (calc ? 'Calcular todo' : '') + '" autocomplete="off" aria-label="' + esc(s.label) + '">') +
      '</div>'
    );
  }
  return (
    '<div class="vpo-rows">' +
    VPO_GROUPS.map(function (g) {
      var list = shown.filter(function (s) {
        return g[1] ? g[1].indexOf(s.key) >= 0 : named.indexOf(s.key) < 0;
      });
      return list.length ? '<div class="vpo-card"><h4 class="vpo-card-title">' + esc(g[0]) + '</h4>' + list.map(row).join('') + '</div>' : '';
    }).join('') +
    '</div>'
  );
}

function showVpoDialog(mount, key) {
  var dlg = mount.querySelector('dialog[data-vpo-dialog="' + key + '"]');
  if (!dlg || dlg.open) return;
  _openDialog = key;
  dlg.showModal();
}

function renderRiskScalesOnlyBody(state) {
  ensureScaleResults(state);
  var note = _missingNote;
  _missingNote = '';
  return (
    '<div class="vpo-risk-grid">' +
    (isVpoCalculatorEnabled() ? '<div class="vpo-risk-in">' + renderCalcInputsHtml(state, esc, _scaleTab) + '</div>' : '') +
    '<div class="vpo-risk-out">' +
    (note ? '<p class="vpo-disclaimer">' + esc(note) + '</p>' : '') +
    renderScaleRows(state) +
    '<details class="vpo-more"><summary class="ea-io-link">Introducción del texto</summary>' +
    '<textarea id="vpo-intro" class="ea-input" data-vpo-field="valoracionIntro" rows="2" aria-label="Introducción">' +
    esc(state.valoracionIntro) +
    '</textarea></details>' +
    '<p class="vpo-disclaimer">' +
    esc(VPO_OFFICIAL_CALCULATOR_DISCLAIMER) +
    '</p>' +
    '</div></div>'
  );
}

/**
 * @param {string} title
 * @param {string} body
 * @param {string} [headActions] extra links/buttons right-aligned next to the title
 */

import { esc } from '../dom-escape.mjs';
function vpoSection(title, body, headActions) {
  return (
    '<section class="vpo-section">' +
    '<div class="vpo-section-head">' +
    '<h3 class="vpo-section-title">' +
    esc(title) +
    '</h3>' +
    (headActions ? '<div class="vpo-section-actions">' + headActions + '</div>' : '') +
    '</div>' +
    '<div class="vpo-section-body">' +
    body +
    '</div></section>'
  );
}

function wireVpoCopyActions(mount, state) {
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

function wireVpoImportActions(mount, state, patientId) {
  mount.querySelector('[data-vpo-action="tomar-estado"]')?.addEventListener('click', function () {
    var patient = getPatients().find(function (p) {
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

  mount.querySelector('[data-vpo-action="calc-fill"]')?.addEventListener('click', function () {
    var n = autofillCalc(state, { labHistory: getLabHistory()[patientId], patient: getPatients().find(function (p) { return p.id === patientId; }) }).length;
    scheduleSave();
    renderVpoPanel(mount, patientId);
    rt.showToast(n ? n + ' datos tomados de R+' : 'Nada nuevo en R+', n ? 'success' : 'error');
  });

  mount.querySelector('[data-vpo-action="calc-all"]')?.addEventListener('click', function () {
    var lines = buildScaleLines(state);
    var done = 0;
    var missing = [];
    VPO_SUGGESTED_SCALES.forEach(function (sc) {
      if (sc.optional) return;
      var ln = lines[sc.key];
      if (ln && ln.text) {
        state.scaleResults[sc.key] = ln.text;
        done++;
      } else if (ln && ln.missing) {
        missing.push(sc.label + ' (' + ln.missing.join(', ') + ')');
      }
    });
    _missingNote = missing.length ? 'Faltan datos: ' + missing.join('; ') + '.' : '';
    scheduleSave();
    renderVpoPanel(mount, patientId);
    rt.showToast(done + ' escalas calculadas', done ? 'success' : 'error');
  });

  mount.querySelectorAll('[data-vpo-open]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      showVpoDialog(mount, btn.getAttribute('data-vpo-open'));
    });
  });
  mount.querySelectorAll('[data-vpo-tab]').forEach(function (tab) {
    tab.addEventListener('click', function () {
      _scaleTab = tab.getAttribute('data-vpo-tab');
      mount.querySelectorAll('[data-vpo-tab]').forEach(function (t) {
        t.setAttribute('aria-selected', String(t === tab));
      });
      mount.querySelectorAll('[data-vpo-panel]').forEach(function (panel) {
        panel.hidden = panel.getAttribute('data-vpo-panel') !== _scaleTab;
      });
    });
  });
  mount.querySelectorAll('dialog[data-vpo-dialog]').forEach(function (dlg) {
    dlg.addEventListener('close', function () {
      if (_openDialog === dlg.getAttribute('data-vpo-dialog')) _openDialog = '';
    });
    dlg.addEventListener('click', function (ev) {
      if (ev.target === dlg || (ev.target.closest && ev.target.closest('[data-vpo-close]'))) dlg.close();
    });
  });

  mount.querySelectorAll('[data-vpo-complete]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      focusMissingInput(mount, btn.getAttribute('data-vpo-complete'));
    });
  });

  mount.querySelectorAll('[data-vpo-calc-one]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-vpo-calc-one');
      var ln = buildScaleLines(state)[key];
      if (ln && ln.text) state.scaleResults[key] = ln.text;
      _missingNote = ln && ln.missing ? 'Faltan datos: ' + ln.missing.join(', ') + '.' : '';
      scheduleSave();
      renderVpoPanel(mount, patientId);
      rt.showToast(ln && ln.text ? 'Escala calculada' : 'Faltan datos', ln && ln.text ? 'success' : 'error');
    });
  });

  mount.querySelector('[data-vpo-action="tomar-dx"]')?.addEventListener('click', function () {
    var note = getNotes()[patientId] || {};
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
    var patient = getPatients().find(function (p) {
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
    stampCensoFieldsClock(patient, undefined, 'diagnosticosList');
    persistClinicalState();
    scheduleCloudSyncPush();
    rt.showToast('Diagnósticos guardados en Datos del paciente', 'success');
  });

  mount.querySelector('[data-vpo-action="tomar-meds"]')?.addEventListener('click', function () {
    var block = getMedRecetaByPatient()[patientId];
    if (!block || !block.items || !block.items.length) {
      rt.showToast('Procesa la receta en Medicamentos primero', 'error');
      return;
    }
    mergeFarmacosFromMedReceta(state, block.items);
    scheduleSave();
    renderVpoPanel(mount, patientId);
    rt.showToast('Fármacos actualizados desde SOME', 'success');
  });

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
    var calcKey = el.getAttribute('data-vpo-calc');
    if (calcKey) {
      state.calc = state.calc || { touched: {} };
      state.calc.touched = state.calc.touched || {};
      state.calc[calcKey] = el.type === 'checkbox' ? el.checked : el.value;
      state.calc.touched[calcKey] = true;
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
      if (field === 'procedureId') applyProcedureSelection(state, el.value);
      else if (field === 'asaKey') applyAsaSuggestion(state, el.value);
    }
    scheduleSave();
  });

  wireVpoImportActions(mount, state, patientId);
  wireVpoCopyActions(mount, state);
}

function renderFarmacosList(farmacos) {
  if (!farmacos || !farmacos.length) {
    return '<p class="vpo-empty-hint">Aún no hay fármacos. «Tomar de SOME» trae los de hoy.</p>';
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
        '" rows="1">' +
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
        '<button type="button" class="ea-io-remove" data-vpo-dx-remove="' +
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
    '<div class="vpo-dx-list">' +
    renderDxListHtml(state) +
    '</div>' +
    '<div class="vpo-dx-actions">' +
    '<button type="button" class="ea-io-link" data-vpo-action="dx-add-row">+ Agregar</button>' +
    '<details class="vpo-dx-paste">' +
    '<summary class="ea-io-link">Pegar lista</summary>' +
    '<textarea class="ea-input vpo-dx-paste-input" data-vpo-dx-paste placeholder="DX1 + DX2 + DX3…"></textarea>' +
    '<button type="button" class="ea-io-link" data-vpo-action="dx-split-plus">Separar por +</button>' +
    '</details>' +
    '</div>'
  );
}

function liveVpoState(mount) {
  var pid = mount._vpoPatientId;
  if (!pid) return null;
  return ensureVpoState(getVpoByPatient(), pid);
}


function ensureVpoMountDelegation(mount) {
  if (mount._vpoDelegationWired) return;
  mount._vpoDelegationWired = true;

  var dxDeps = {
    showToast: function (msg, type) {
      rt.showToast(msg, type);
    },
    scheduleSave: scheduleSave,
    refreshDxListDom: refreshDxListDom,
    commitDxList: commitDxList,
  };

  mount.addEventListener('click', function (ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest('[data-vpo-action]') : null;
    if (!btn || !mount.contains(btn)) return;
    var action = btn.getAttribute('data-vpo-action');
    var state = liveVpoState(mount);
    if (!state) return;

    if (action === 'dx-split-plus' || action === 'dx-add-row') {
      ev.preventDefault();
      handleVpoDxDelegationAction(mount, action, state, dxDeps);
      return;
    }

    var removeBtn = ev.target.closest ? ev.target.closest('[data-vpo-dx-remove]') : null;
    if (removeBtn && mount.contains(removeBtn)) {
      ev.preventDefault();
      handleVpoDxRemoveRow(mount, removeBtn, state, dxDeps);
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
  var state = ensureVpoState(getVpoByPatient(), patientId);
  var patient = getPatients().find(function (p) {
    return p.id === patientId;
  });
  hydrateVpoPatientDefaults(state, patient || null);
  if (isVpoCalculatorEnabled() && autofillCalc(state, { labHistory: getLabHistory()[patientId], patient: getPatients().find(function (p) { return p.id === patientId; }) }).length) scheduleSave();
  mount._vpoPatientId = patientId;

  mount.innerHTML = buildVpoPanelInnerHtml(
    state,
    esc,
    vpoSection,
    renderRiskScalesOnlyBody,
    renderDiagnosticosSection,
    renderFarmacosList
  );

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
  if (_openDialog) showVpoDialog(mount, _openDialog);
}

export function stashVpoForPatient(_patientId) {
  scheduleSave();
}
