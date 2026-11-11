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
import { focusMissingInput, mountCalcForm, unmountCalcForm } from './vpo-calc-form.jsx';
import { drawVpoPanel, drawVpoNoPatient, drawVpoDxList } from './vpo-panel-view.jsx';
import { toast } from '../ui-kit/toast.mjs';
import { vpoOpenDialog } from './vpo-ui-state.mjs';
import { autofillCalc, buildScaleLines } from '../vpo-calc.mjs';
import { isVpoCalculatorEnabled } from './profile-prefs.mjs';
import { formatDiagnosticosCopy } from '../patient-diagnosticos.mjs';
import { pushDiagnosticosToPatient, stampCensoFieldsClock } from '../patient-diagnosticos.mjs';
import { scheduleCloudSyncPush } from './cloud-sync/mutate-bridge.mjs';
import {
  buildVpoFullCopyFromState,
  buildVpoRiskBlock,
  buildFarmacosCopyText,
  renderEkgWithFc,
  VPO_SUGGESTED_SCALES,
} from '../vpo-text.mjs';
import { copyToClipboardSafe } from './soap-estado.mjs';
import {
  hydrateVpoPatientDefaults,
  handleVpoDxDelegationAction,
  handleVpoDxRemoveRow,
} from './vpo-panel-helpers.mjs';

/** @type {{ getActiveId(): string|null, switchAppTab(tab: string): void }} */
let rt = {
  getActiveId() {
    return null;
  },
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
    toast('Nada que copiar en ' + label, 'error');
    return;
  }
  copyToClipboardSafe(t).then(function (ok) {
    toast(ok ? label + ' copiado' : 'No se pudo copiar', ok ? 'success' : 'error');
  });
}

/** Names of scales that lacked data on the last «Calcular todo»; shown once on the next render. */
var _missingNote = '';

function showVpoDialog(mount, key) {
  var dlg = mount.querySelector('dialog[data-vpo-dialog="' + key + '"]');
  if (!dlg || dlg.open) return;
  dlg.showModal();
  vpoOpenDialog.set(key);
}

function wireVpoCopyActions(mount, state) {
  ['copy-ekg', 'copy-rx', 'copy-risk', 'copy-farm', 'copy-full'].forEach(function (action) {
    mount.querySelector('[data-vpo-action="' + action + '"]')?.addEventListener('click', function () {
      if (action === 'copy-ekg') {
        copyText('EKG', 'ELECTROCARDIOGRAMA:\n\n' + renderEkgWithFc(state.ekgText, state.fcLpm));
      } else if (action === 'copy-rx') {
        copyText('Rx tórax', 'RADIOGRAFÍA DE TÓRAX:\n\n' + state.rxText);
      } else if (action === 'copy-risk') {
        copyText('Riesgos', buildVpoRiskBlock(state));
      } else if (action === 'copy-farm') {
        copyText('Fármacos', buildFarmacosCopyText(state.farmacos));
      } else if (action === 'copy-full') {
        copyText('Valoración completa', buildVpoFullCopyFromState(state));
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
      toast('Sin FC o SpO₂ en Estado actual', 'error');
      return;
    }
    scheduleSave();
    renderVpoPanel(mount, patientId);
    toast('FC y SpO₂ tomados de Estado actual', 'success');
  });

  mount.querySelector('[data-vpo-action="calc-fill"]')?.addEventListener('click', function () {
    var n = autofillCalc(state, { labHistory: getLabHistory()[patientId], patient: getPatients().find(function (p) { return p.id === patientId; }) }).length;
    scheduleSave();
    renderVpoPanel(mount, patientId);
    toast(n ? n + ' datos tomados de R+' : 'Nada nuevo en R+', n ? 'success' : 'error');
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
    toast(done + ' escalas calculadas', done ? 'success' : 'error');
  });

  mount.querySelectorAll('[data-vpo-open]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      showVpoDialog(mount, btn.getAttribute('data-vpo-open'));
    });
  });
  // Kit dialogs (data-kit-dialog) close themselves and clear vpoOpenDialog; the string-built ones are wired here.
  mount.querySelectorAll('dialog[data-vpo-dialog]:not([data-kit-dialog])').forEach(function (dlg) {
    dlg.addEventListener('close', function () {
      if (vpoOpenDialog.get() === dlg.getAttribute('data-vpo-dialog')) vpoOpenDialog.set('');
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
      toast(ln && ln.text ? 'Escala calculada' : 'Faltan datos', ln && ln.text ? 'success' : 'error');
    });
  });

  mount.querySelector('[data-vpo-action="tomar-dx"]')?.addEventListener('click', function () {
    var note = getNotes()[patientId] || {};
    if (state.diagnosticosTouched && (state.diagnosticosList || []).some(function (d) { return String(d).trim(); })) {
      toast('Diagnósticos ya editados — no se sobrescriben', 'error');
      return;
    }
    if (!importDiagnosticosFromNota(state, note.diagnosticos || [])) {
      toast('Sin diagnósticos en la nota', 'error');
      return;
    }
    scheduleSave();
    renderVpoPanel(mount, patientId);
    toast('Diagnósticos importados', 'success');
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
      toast('Sin diagnósticos en VPO para enviar', 'error');
      return;
    }
    pushDiagnosticosToPatient(patient, list);
    stampCensoFieldsClock(patient, undefined, 'diagnosticosList');
    persistClinicalState();
    scheduleCloudSyncPush();
    toast('Diagnósticos guardados en Datos del paciente', 'success');
  });

  mount.querySelector('[data-vpo-action="tomar-meds"]')?.addEventListener('click', function () {
    var block = getMedRecetaByPatient()[patientId];
    if (!block || !block.items || !block.items.length) {
      toast('Procesa la receta en Medicamentos primero', 'error');
      return;
    }
    mergeFarmacosFromMedReceta(state, block.items);
    scheduleSave();
    renderVpoPanel(mount, patientId);
    toast('Fármacos actualizados desde SOME', 'success');
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

function refreshDxListDom(mount, state) {
  var listEl = mount.querySelector('.vpo-dx-list');
  if (listEl) drawVpoDxList(listEl, state);
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
      toast(msg, type);
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
  unmountCalcForm(mount);
  if (!patientId) {
    drawVpoNoPatient(mount);
    return;
  }
  var state = ensureVpoState(getVpoByPatient(), patientId);
  var patient = getPatients().find(function (p) {
    return p.id === patientId;
  });
  hydrateVpoPatientDefaults(state, patient || null);
  if (isVpoCalculatorEnabled() && autofillCalc(state, { labHistory: getLabHistory()[patientId], patient: getPatients().find(function (p) { return p.id === patientId; }) }).length) scheduleSave();
  mount._vpoPatientId = patientId;

  ensureScaleResults(state);
  var calc = isVpoCalculatorEnabled();
  var note = _missingNote;
  _missingNote = '';
  drawVpoPanel(mount, { state: state, calc: calc, lines: calc ? buildScaleLines(state) : {}, note: note });
  if (calc) mountCalcForm(mount, state);

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
  if (vpoOpenDialog.get()) showVpoDialog(mount, vpoOpenDialog.get());
}

export function stashVpoForPatient(_patientId) {
  scheduleSave();
}
