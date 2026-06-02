import { patients, labHistory, saveState } from '../app-state.mjs';
import { sortLabHistoryChronological, parseFechaLabToMs } from '../tend-core.mjs';
import { createMutationBuilder } from '../versioned-mutation.mjs';
import {
  scanHistoriaClinicaSafety,
  pendingSafetyAcknowledgements,
  buildSafetyAuditEntries,
} from '../clinical-history-safety.mjs';
import {
  lanPushHistoriaClinica,
  lanFetchHistoriaClinica,
  getActiveLiveSyncRoomId,
  isLanSessionConfiguredForRest,
} from './lan-sync.mjs';
import {
  compileHistoriaClinicaNarrative,
  compileHistoriaClinicaPlainText,
} from '../../../lib/historia-clinica/compile-narrative.mjs';
import {
  defaultHistoriaClinicaData,
  HC_INTERROGADO_NEGADO,
} from '../../../lib/historia-clinica/defaults.mjs';
import { migrateLegacyHistoriaData } from '../../../lib/historia-clinica/migrate-legacy.mjs';
import { mergeHcPatch } from '../../../lib/drive-import/merge-hc-patch.mjs';
import appConditions from '../../../lib/historia-clinica/catalogs/app-conditions.json' with { type: 'json' };
import ahfConditions from '../../../lib/historia-clinica/catalogs/ahf-conditions.json' with { type: 'json' };
import ipasSystems from '../../../lib/historia-clinica/catalogs/ipas-systems.json' with { type: 'json' };
import { renderChecklistBlock } from './historia-clinica-checklist.mjs';
import { mountTabaquismoWidget, mountAlcoholismoWidget } from './historia-clinica-apnp-widgets.mjs';
import { mountToxicomaniasPanel } from './historia-clinica-toxicomanias.mjs';
import { summarizeToxicomanias } from '../../../lib/historia-clinica/toxicomanias.mjs';
import { mountHistoriaAppPanel } from './historia-clinica-app-panel.mjs';
import { normalizeAppData } from '../../../lib/historia-clinica/normalize-app.mjs';
import { mountHistoriaAhfPanel } from './historia-clinica-ahf-panel.mjs';
import { syncAhfConditionsFromEntries } from '../../../lib/historia-clinica/compile-ahf.mjs';
import { normalizeGeneroBlock } from '../../../lib/historia-clinica/genero-options.mjs';
import { mountHistoriaGeneroPanel } from './historia-clinica-genero-panel.mjs';
import { wireClinicalHistoryUppercase } from './historia-clinica-uppercase.mjs';
import {
  applyClinicalHistoryUppercase,
  toClinicalHistoryText,
} from '../../../lib/historia-clinica/clinical-text.mjs';
import {
  formatSignosVitalesIngresoFromSnapshot,
  signosVitalesSnapshotHasData,
} from '../../../lib/historia-clinica/signos-vitales-ingreso.mjs';
import { deriveSnapshot, ensureMonitoreo } from './estado-actual-data.mjs';

const CATALOGS = { appConditions, ahfConditions, ipasSystems };
const DEFAULT_LOOKBACK_H = 48;
const DATA_KEYS = [
  'identificacion',
  'motivoConsulta',
  'apnp',
  'app',
  'ahf',
  'genero',
  'sexual',
  'padecimientoActual',
  'datosNegados',
  'ipas',
  'signosVitalesIngreso',
  'labsAtAdmission',
  'labAnchor',
  'meta',
  'labLookbackHours',
];

let rt = {
  getActiveId() {
    return null;
  },
  getSettings() {
    return {};
  },
  showToast(_msg, _type) {},
  copyToClipboardSafe(_t) {
    return Promise.resolve(false);
  },
  navigateToEstadoActualPanel() {},
};

export function registerHistoriaClinicaRuntime(partial) {
  if (partial && typeof partial === 'object') Object.assign(rt, partial);
}

let _version = 0;
let _data = null;
let _editMode = false;
let _step = 1;
let _pendingAck = [];
/** @type {Set<string>} */
let _dirtyKeys = new Set();
const _mountId = 'historia-clinica-mount';

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function activePatient() {
  var id = rt.getActiveId();
  if (!id) return null;
  return patients.find(function (p) {
    return String(p.id) === String(id);
  });
}

function lookbackHours() {
  var s = typeof rt.getSettings === 'function' ? rt.getSettings() : {};
  var hc = s && s.historiaClinica;
  var n = hc && hc.labLookbackHours != null ? Number(hc.labLookbackHours) : DEFAULT_LOOKBACK_H;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_LOOKBACK_H;
}

function catalogOptions(map) {
  return Object.keys(map || {}).map(function (id) {
    return { id, label: map[id] };
  });
}

function prefillFromPatient(data, patient) {
  if (!data || !patient) return data;
  data.genero = normalizeGeneroBlock(data.genero, patient.sexo);
  var id = data.identificacion || {};
  if (!id.informante && patient.nombre) id.informante = String(patient.nombre);
  if (!id.registro && patient.registro) id.registro = String(patient.registro);
  if (!id.cama && patient.cama) id.cama = String(patient.cama);
  if (!id.dx && patient.diagnosticosText) id.dx = String(patient.diagnosticosText);
  if (!id.dx && Array.isArray(patient.diagnosticosList) && patient.diagnosticosList[0]) {
    id.dx = String(patient.diagnosticosList[0]);
  }
  if (patient.edad != null && patient.edad !== '') {
    id.edad = String(patient.edad);
  }
  data.identificacion = id;
  return data;
}

function normalizeData(raw, patientId, patient) {
  if (!raw || typeof raw !== 'object') {
    return prefillFromPatient(
      defaultHistoriaClinicaData(patientId, CATALOGS, { labLookbackHours: lookbackHours() }),
      patient
    );
  }
  var base = migrateLegacyHistoriaData(raw, CATALOGS);
  if (!base.app || typeof base.app !== 'object') {
    var fresh = defaultHistoriaClinicaData(patientId, CATALOGS, { labLookbackHours: lookbackHours() });
    fresh.labAnchor = raw.labAnchor || null;
    fresh.labsAtAdmission = raw.labsAtAdmission || null;
    fresh.meta = Object.assign({}, fresh.meta, raw.meta || {});
    base = fresh;
  }
  base.labLookbackHours = base.labLookbackHours || lookbackHours();
  if (!trimHc(base.datosNegados)) {
    base.datosNegados = HC_INTERROGADO_NEGADO;
  }
  base.genero = normalizeGeneroBlock(base.genero, patient && patient.sexo);
  if (!base.ipas || typeof base.ipas !== 'object') {
    base.ipas = {};
  }
  Object.keys(ipasSystems).forEach(function (sid) {
    var block = base.ipas[sid];
    if (!block || typeof block !== 'object') {
      base.ipas[sid] = { checks: [], descripcion: HC_INTERROGADO_NEGADO, negado: true };
      return;
    }
    if (block.negado !== false && !trimHc(block.descripcion) && !(block.checks && block.checks.length)) {
      block.descripcion = HC_INTERROGADO_NEGADO;
      block.negado = true;
    }
  });
  base.apnp = normalizeApnp(base.apnp);
  base.app = normalizeApp(base.app);
  base.ahf = normalizeAhf(base.ahf);
  base = prefillFromPatient(base, patient);
  applyClinicalHistoryUppercase(base);
  return base;
}

function normalizeApp(app) {
  return normalizeAppData(app, defaultHistoriaClinicaData('_', CATALOGS).app);
}

function normalizeAhf(ahf) {
  var def = defaultHistoriaClinicaData('_', CATALOGS).ahf;
  ahf = Object.assign({}, def, ahf || {});
  if (!Array.isArray(ahf.customConditions)) ahf.customConditions = [];
  if (!Array.isArray(ahf.entries)) ahf.entries = [];
  if (!Array.isArray(ahf.conditions)) ahf.conditions = [];
  if (ahf.entries.length) {
    return syncAhfConditionsFromEntries(ahf);
  }
  if (ahf.conditions.length && !ahf.entries.length) {
    ahf.entries = ahf.conditions.map(function (cid) {
      return {
        id: 'ahf_legacy_' + cid,
        conditionId: cid,
        relativeId: '',
        diagnosis: trimHc(ahf.descripcionDetallada) || '',
        treatment: '',
        vitalStatus: 'desconocido',
      };
    });
    ahf.descripcionDetallada = '';
  }
  return syncAhfConditionsFromEntries(ahf);
}

function normalizeApnp(apnp) {
  apnp = apnp && typeof apnp === 'object' ? Object.assign({}, apnp) : {};
  if (!apnp.tabaquismoDetail || typeof apnp.tabaquismoDetail !== 'object') {
    apnp.tabaquismoDetail = {
      status: trimHc(apnp.tabaquismo) && !/^negado$/i.test(trimHc(apnp.tabaquismo)) ? 'activo' : 'negado',
    };
  }
  if (!apnp.alcoholismoDetail || typeof apnp.alcoholismoDetail !== 'object') {
    apnp.alcoholismoDetail = {
      status: trimHc(apnp.alcoholismo) && !/^negado$/i.test(trimHc(apnp.alcoholismo)) ? 'activo' : 'negado',
    };
  }
  const tox = summarizeToxicomanias(apnp);
  apnp.toxicomaniasEntries = tox.entries;
  if (!trimHc(apnp.toxicomanias) || /^negad/i.test(trimHc(apnp.toxicomanias))) {
    apnp.toxicomanias = tox.summary;
  }
  return apnp;
}

function signosVitalesFromMonitoreo(patient) {
  if (!patient) return '';
  ensureMonitoreo(patient);
  var mon = patient.monitoreo;
  var snap = deriveSnapshot(mon);
  if (!signosVitalesSnapshotHasData(snap)) return '';
  var ec = mon && mon.estadoClinico && typeof mon.estadoClinico === 'object' ? mon.estadoClinico : null;
  return formatSignosVitalesIngresoFromSnapshot(snap, ec);
}

function compileCtx(patient) {
  var age = patient && patient.edad != null ? Number(patient.edad) : NaN;
  return {
    currentAge: Number.isFinite(age) ? age : undefined,
    patientSex: patient && patient.sexo === 'M' ? 'M' : 'F',
    signosVitalesIngresoFromMonitoreo: signosVitalesFromMonitoreo(patient),
  };
}

function syncSignosVitalesIngresoFromEstadoActual(patient) {
  if (!_data || !patient) return;
  var derived = signosVitalesFromMonitoreo(patient);
  if (derived) {
    _data.signosVitalesIngreso = derived;
    _dirtyKeys.add('signosVitalesIngreso');
  }
}

function trimHc(s) {
  return String(s || '').trim();
}

function scanSafety(patient) {
  return scanHistoriaClinicaSafety({
    data: _data,
    catalogs: CATALOGS,
    patient,
    latestLabSet: latestLabSet(patient.id),
  });
}

function labSetsInLookback(patientId) {
  var sets = labHistory[patientId];
  if (!Array.isArray(sets)) return [];
  var sorted = sortLabHistoryChronological(sets.slice());
  var hours = lookbackHours();
  var cutoff = Date.now() - hours * 3600 * 1000;
  return sorted.filter(function (set) {
    var ms = parseFechaLabToMs(set.fecha, set.hora);
    if (typeof ms !== 'number' || !isFinite(ms)) return true;
    return ms >= cutoff;
  });
}

function latestLabSet(patientId) {
  var sets = labHistory[patientId];
  if (!Array.isArray(sets) || !sets.length) return null;
  var sorted = sortLabHistoryChronological(sets.slice());
  return sorted[sorted.length - 1] || null;
}

function buildLabAnchorFromSet(set) {
  if (!set) return null;
  var patient = activePatient();
  var renalCtx = scanHistoriaClinicaSafety({ patient, latestLabSet: set }).labContext;
  return {
    setId: String(set.id || set.fecha || ''),
    fecha: String(set.fecha || ''),
    egfr: renalCtx && renalCtx.egfr != null ? renalCtx.egfr : null,
    creatinineMgDl: renalCtx && renalCtx.creatinineMgDl != null ? renalCtx.creatinineMgDl : null,
    source: renalCtx && renalCtx.source ? renalCtx.source : 'lab',
    capturedAt: new Date().toISOString(),
  };
}

function readLocalHistoria(patient) {
  if (!patient || !patient.historiaClinica || !patient.historiaClinica.data) return null;
  return {
    version: Number(patient.historiaClinica.version || 0),
    data: patient.historiaClinica.data,
    pendingLanSync: !!patient.historiaClinica.pendingLanSync,
  };
}

async function fetchHistoriaRemote(patientId, roomId) {
  if (!isLanSessionConfiguredForRest() || !roomId) return null;
  try {
    var res = await Promise.race([
      lanFetchHistoriaClinica(patientId, roomId),
      new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error('historia_fetch_timeout'));
        }, 4000);
      }),
    ]);
    if (!res || !res.ok || res.missing) return null;
    return { version: Number(res.version || 0), data: res.data };
  } catch (_e) {
    return null;
  }
}

async function fetchHistoria(patientId, roomId) {
  var local = readLocalHistoria(activePatient());
  if (!isLanSessionConfiguredForRest() || !roomId) {
    return local;
  }
  if (local && local.pendingLanSync) {
    return local;
  }
  var remote = await fetchHistoriaRemote(patientId, roomId);
  if (!remote) return local;
  var localVer = local ? local.version : 0;
  if (local && localVer > remote.version) return local;
  return remote;
}

function stepComplete(n) {
  if (!_data) return false;
  if (n === 1) return !!String(_data.motivoConsulta || '').trim();
  if (n === 2) {
    return (
      !!String(_data.padecimientoActual || '').trim() ||
      Object.keys(ipasSystems).every(function (sid) {
        var b = _data.ipas && _data.ipas[sid];
        return b && b.negado;
      })
    );
  }
  if (n === 3) return !!(_data.meta && _data.meta.admissionConfirmedLabs);
  return false;
}

function renderSafetyBanner(rules) {
  if (!rules.length) return '';
  return (
    '<div class="hc-safety-banner" role="alert">' +
    rules
      .map(function (r) {
        return '<p><strong>' + esc(r.title) + ':</strong> ' + esc(r.message) + '</p>';
      })
      .join('') +
    '</div>'
  );
}

function renderStepperHeader() {
  var labels = ['Antecedentes', 'Padecimiento e IPAS', 'Ingreso y labs'];
  return (
    '<nav class="hc-stepper" aria-label="Pasos historia clínica">' +
    labels
      .map(function (label, i) {
        var n = i + 1;
        var cls = 'hc-step' + (n === _step ? ' hc-step--active' : '') + (stepComplete(n) ? ' hc-step--done' : '');
        return (
          '<button type="button" class="' +
          cls +
          '" data-hc-step="' +
          n +
          '">' +
          esc(label) +
          '</button>'
        );
      })
      .join('') +
    '</nav>'
  );
}

function fieldRow(label, html) {
  return (
    '<div class="field-group">' +
    '<label>' +
    esc(label) +
    '</label>' +
    html +
    '</div>'
  );
}

function textInput(path, value, placeholder) {
  return (
    '<input type="text" data-hc-path="' +
    esc(path) +
    '" value="' +
    esc(toClinicalHistoryText(value)) +
    '" placeholder="' +
    esc(placeholder ? toClinicalHistoryText(placeholder) : '') +
    '">'
  );
}

function textArea(path, value, rows, placeholder) {
  return (
    '<textarea data-hc-path="' +
    esc(path) +
    '" rows="' +
    (rows || 4) +
    '" placeholder="' +
    esc(placeholder ? toClinicalHistoryText(placeholder) : '') +
    '">' +
    esc(toClinicalHistoryText(value)) +
    '</textarea>'
  );
}

function renderLecturaView(root, patient) {
  var sections = compileHistoriaClinicaNarrative(_data, CATALOGS, compileCtx(patient));
  root.innerHTML =
    '<div class="hc-read-view">' +
    sections
      .map(function (s) {
        return (
          '<section class="card hc-read-section"><h3 class="card-header">' +
          esc(s.title) +
          '</h3><div class="card-body hc-read-body">' +
          esc(s.body).replace(/\n/g, '<br>') +
          '</div></section>'
        );
      })
      .join('') +
    (sections.length ? '' : '<p class="tend-empty">Historia sin contenido.</p>') +
    '</div>';
}

function renderStep1() {
  var id = (_data && _data.identificacion) || {};
  var apnp = (_data && _data.apnp) || {};
  return (
    '<div class="hc-step-body">' +
    '<h3 class="hc-step-title">Identificación y antecedentes</h3>' +
    fieldRow('Motivo de consulta', textArea('motivoConsulta', _data.motivoConsulta, 2)) +
    '<details class="card" open><summary class="card-header">Identificación</summary><div class="card-body hc-grid">' +
    fieldRow('Informante', textInput('identificacion.informante', id.informante)) +
    fieldRow('Lugar de nacimiento', textInput('identificacion.lugarNacimiento', id.lugarNacimiento)) +
    fieldRow('Ocupación actual', textInput('identificacion.ocupacionActual', id.ocupacionActual)) +
    fieldRow('Ocupación anterior', textInput('identificacion.ocupacionAnterior', id.ocupacionAnterior)) +
    fieldRow('Escolaridad', textInput('identificacion.escolaridad', id.escolaridad)) +
    fieldRow('Estado civil', textInput('identificacion.estadoCivil', id.estadoCivil)) +
    fieldRow('Religión', textInput('identificacion.religion', id.religion)) +
    '</div></details>' +
    '<details class="card" open><summary class="card-header">APNP</summary><div class="card-body">' +
    '<div class="hc-apnp-habits">' +
    '<div class="card hc-calc-wrap"><div class="card-header card-header--tone-slate">Tabaquismo</div><div class="card-body" id="hc-mount-tabaquismo"></div></div>' +
    '<div class="card hc-calc-wrap"><div class="card-header card-header--tone-slate">Alcoholismo</div><div class="card-body" id="hc-mount-alcoholismo"></div></div>' +
    '</div>' +
    '<div class="card hc-apnp-toxicomanias" style="margin-top:12px"><div class="card-header card-header--tone-slate">Toxicomanías</div><div class="card-body" id="hc-mount-toxicomanias"></div></div>' +
    '<div class="hc-grid" style="margin-top:12px">' +
    fieldRow('Tatuajes', textInput('apnp.tatuajes', apnp.tatuajes)) +
    fieldRow('Deportes/pasatiempos/mascotas', textInput('apnp.deportesPasatiemposMascotas', apnp.deportesPasatiemposMascotas)) +
    fieldRow('Dieta', textInput('apnp.dieta', apnp.dieta)) +
    '</div></details>' +
    '<details class="card" open><summary class="card-header">APP</summary><div class="card-body" id="hc-mount-app"></div></details>' +
    '<details class="card" open><summary class="card-header">AHF</summary><div class="card-body" id="hc-mount-ahf"></div></details>' +
    '</div>'
  );
}

function renderStep2(patient) {
  var sexual = (_data && _data.sexual) || {};
  return (
    '<div class="hc-step-body">' +
    '<h3 class="hc-step-title">Padecimiento e IPAS</h3>' +
    '<details class="card" open><summary class="card-header">Antecedentes por género</summary><div class="card-body" id="hc-mount-genero"></div></details>' +
    '<details class="card" open><summary class="card-header">Antecedentes sexuales</summary><div class="card-body hc-grid">' +
    fieldRow('IVS (edad)', textInput('sexual.ivsEdad', sexual.ivsEdad)) +
    fieldRow('Preferencias', textInput('sexual.preferencias', sexual.preferencias)) +
    fieldRow('Parejas', textInput('sexual.parejas', sexual.parejas)) +
    fieldRow('Portador VIH', textInput('sexual.portadorVih', sexual.portadorVih)) +
    fieldRow('Fecha dx VIH', textInput('sexual.fechaDxVih', sexual.fechaDxVih)) +
    fieldRow('ETS', textInput('sexual.ets', sexual.ets)) +
    '</div></details>' +
    fieldRow('Padecimiento actual (ingreso)', textArea('padecimientoActual', _data.padecimientoActual, 8)) +
    fieldRow(
      'Datos relevantes negados',
      textArea(
        'datosNegados',
        _data.datosNegados || HC_INTERROGADO_NEGADO,
        3,
        HC_INTERROGADO_NEGADO
      )
    ) +
    '<div id="hc-mount-ipas"></div>' +
    '</div>'
  );
}

function renderVitalsIngresoBlock(patient) {
  var derived = signosVitalesFromMonitoreo(patient);
  var has = !!derived;
  var legacy = trimHc(_data && _data.signosVitalesIngreso);
  var display = has ? derived : legacy;
  return fieldRow(
    'Signos vitales al ingreso',
    '<div class="hc-vitals-ingreso' +
      (has ? '' : ' hc-vitals-ingreso--empty') +
      '">' +
      (has
        ? '<p class="hc-vitals-ingreso__text">' +
          esc(display) +
          '</p>' +
          '<p class="profile-hint hc-vitals-ingreso__source">Tomados del registro en <strong>Estado actual</strong>.</p>'
        : '<p class="profile-hint hc-vitals-ingreso__empty-msg">Registra los signos vitales en la pestaña <strong>Estado actual</strong> (monitoreo). Aparecerán aquí al volver a este paso.</p>') +
      '<button type="button" class="' +
      (has ? 'btn-med-secondary' : 'btn-generate') +
      ' hc-vitals-ingreso__cta" id="hc-go-estado-actual">' +
      (has ? 'Ir a Estado actual' : 'Registrar en Estado actual') +
      '</button></div>'
  );
}

function renderLabsStep(patient) {
  var anchor = _data && _data.labAnchor;
  var labs = _data && _data.labsAtAdmission;
  var summary =
    anchor && anchor.egfr != null
      ? 'eTFG ' + anchor.egfr + ' · Cr ' + (anchor.creatinineMgDl != null ? anchor.creatinineMgDl : '—') + ' · ' + esc(anchor.fecha)
      : 'Sin laboratorios de ingreso anclados';
  return (
    '<div class="hc-step-body">' +
    '<h3 class="hc-step-title">Ingreso y laboratorios</h3>' +
    renderVitalsIngresoBlock(patient) +
    '<div class="card"><div class="card-body"><p class="profile-hint">' +
    esc(summary) +
    '</p>' +
    (labs && labs.qsSummary ? '<pre class="hc-labs-pre">' + esc(labs.qsSummary) + '</pre>' : '') +
    '<button type="button" class="btn-med-secondary" id="hc-resync-labs">Re-sincronizar labs</button> ' +
    '<button type="button" class="btn-med-secondary" id="hc-pick-labs">Elegir set de labs</button>' +
    '</div></div></div>'
  );
}

function setByPath(path, value) {
  if (!_data || !path) return;
  if (typeof value === 'string') value = toClinicalHistoryText(value);
  var parts = path.split('.');
  var key = parts[0];
  _dirtyKeys.add(key);
  if (parts.length === 1) {
    _data[key] = value;
    return;
  }
  if (!_data[key] || typeof _data[key] !== 'object') _data[key] = {};
  _data[key][parts[1]] = value;
}

function mountApnpHabits(root, patient) {
  if (!_data.apnp) _data.apnp = {};
  var tabEl = root.querySelector('#hc-mount-tabaquismo');
  if (tabEl) {
    mountTabaquismoWidget(
      tabEl,
      _data.apnp.tabaquismoDetail,
      compileCtx(patient),
      function (detail, summary) {
        _data.apnp.tabaquismoDetail = detail;
        _data.apnp.tabaquismo = summary;
        _dirtyKeys.add('apnp');
      }
    );
  }
  var alcEl = root.querySelector('#hc-mount-alcoholismo');
  if (alcEl) {
    mountAlcoholismoWidget(alcEl, _data.apnp.alcoholismoDetail, function (detail, summary) {
      _data.apnp.alcoholismoDetail = detail;
      _data.apnp.alcoholismo = summary;
      _dirtyKeys.add('apnp');
    });
  }
  var toxEl = root.querySelector('#hc-mount-toxicomanias');
  if (toxEl) {
    mountToxicomaniasPanel(toxEl, _data.apnp || {}, function (nextApnp) {
      applyClinicalHistoryUppercase(nextApnp);
      const tox = summarizeToxicomanias(nextApnp);
      _data.apnp = Object.assign({}, _data.apnp, nextApnp, {
        toxicomaniasEntries: tox.entries,
        toxicomanias: tox.summary,
      });
      _dirtyKeys.add('apnp');
      wireClinicalHistoryUppercase(toxEl);
    });
  }
}

function mountChecklists(root, patient) {
  var appEl = root.querySelector('#hc-mount-app');
  if (appEl) {
    mountHistoriaAppPanel(appEl, _data.app || {}, appConditions, function (next) {
      applyClinicalHistoryUppercase(next);
      _data.app = next;
      _dirtyKeys.add('app');
      wireClinicalHistoryUppercase(appEl);
    });
  }
  var ahfEl = root.querySelector('#hc-mount-ahf');
  if (ahfEl) {
    mountHistoriaAhfPanel(ahfEl, _data.ahf || {}, ahfConditions, function (next) {
      applyClinicalHistoryUppercase(next);
      _data.ahf = next;
      _dirtyKeys.add('ahf');
      wireClinicalHistoryUppercase(ahfEl);
    });
  }
  var genEl = root.querySelector('#hc-mount-genero');
  if (genEl) {
    mountHistoriaGeneroPanel(
      genEl,
      _data.genero || {},
      patient && patient.sexo,
      function (next) {
        applyClinicalHistoryUppercase(next);
        _data.genero = next;
        _dirtyKeys.add('genero');
        wireClinicalHistoryUppercase(genEl);
      }
    );
  }
  var ipasHost = root.querySelector('#hc-mount-ipas');
  if (ipasHost) {
    ipasHost.innerHTML = '';
    Object.keys(ipasSystems).forEach(function (sid) {
      var wrap = document.createElement('details');
      wrap.className = 'card';
      wrap.open = true;
      wrap.innerHTML =
        '<summary class="card-header">' + esc(ipasSystems[sid]) + '</summary><div class="card-body"></div>';
      ipasHost.appendChild(wrap);
      var body = wrap.querySelector('.card-body');
      renderChecklistBlock(
        body,
        { id: sid, variant: 'negado_default', options: [] },
        (_data.ipas && _data.ipas[sid]) || {
          checks: [],
          descripcion: HC_INTERROGADO_NEGADO,
          negado: true,
        },
        function (next) {
          if (!_data.ipas) _data.ipas = {};
          _data.ipas[sid] = next;
          _dirtyKeys.add('ipas');
        }
      );
    });
  }
}

function renderPanel(root) {
  var patient = activePatient();
  if (!patient) {
    root.innerHTML = '<p class="tend-empty">Selecciona un paciente.</p>';
    return;
  }
  var mobile = window.matchMedia('(max-width: 768px)').matches;
  var safety = scanSafety(patient);
  var pending = pendingSafetyAcknowledgements(safety.rules, _pendingAck);

  var toolbar =
    '<div class="hc-toolbar">' +
    (!_editMode && !mobile
      ? '<button type="button" class="btn-generate" id="hc-edit-toggle">Editar historia</button>' +
        '<button type="button" class="btn-med-secondary" id="hc-copy">Copiar historia</button>'
      : '') +
    (_editMode && !mobile
      ? '<button type="button" class="btn-generate" id="hc-save">Guardar</button>' +
        '<button type="button" class="btn-med-secondary" id="hc-cancel-edit">Cancelar</button>'
      : '') +
    '</div>';

  if (mobile) {
    var teaser = compileHistoriaClinicaPlainText(
      compileHistoriaClinicaNarrative(_data, CATALOGS, compileCtx(patient)).slice(0, 3)
    );
    root.innerHTML =
      toolbar +
      renderSafetyBanner(pending) +
      '<div class="hc-summary"><pre class="hc-mobile-teaser">' +
      esc(teaser.slice(0, 600)) +
      '</pre><p class="profile-hint">Abre en escritorio para editar la historia completa.</p></div>';
    wirePanel(root, patient);
    return;
  }

  if (!_editMode) {
    root.innerHTML = toolbar + renderSafetyBanner(pending);
    var lecturaMount = document.createElement('div');
    root.appendChild(lecturaMount);
    renderLecturaView(lecturaMount, patient);
    wirePanel(root, patient);
    return;
  }

  var stepBody =
    _step === 1 ? renderStep1() : _step === 2 ? renderStep2(patient) : renderLabsStep(patient);
  root.innerHTML =
    toolbar +
    renderSafetyBanner(pending) +
    renderStepperHeader() +
    stepBody +
    '<div class="hc-step-footer">' +
    (_step > 1 ? '<button type="button" class="btn-med-secondary" id="hc-prev">Anterior</button>' : '') +
    (_step < 3
      ? '<button type="button" class="btn-generate" id="hc-next">Siguiente</button>'
      : '<button type="button" class="btn-generate" id="hc-save">Guardar</button>') +
    '</div>';

  mountApnpHabits(root, patient);
  mountChecklists(root, patient);
  wirePanel(root, patient);
}

function wirePanel(root, patient) {
  var editBtn = root.querySelector('#hc-edit-toggle');
  if (editBtn) {
    editBtn.onclick = function () {
      _editMode = true;
      _step = (_data.meta && _data.meta.lastStep) || 1;
      _dirtyKeys = new Set();
      renderPanel(root);
    };
  }
  var copyBtn = root.querySelector('#hc-copy');
  if (copyBtn) {
    copyBtn.onclick = async function () {
      var text = compileHistoriaClinicaPlainText(
        compileHistoriaClinicaNarrative(_data, CATALOGS, compileCtx(patient))
      );
      var ok = await rt.copyToClipboardSafe(text);
      rt.showToast(ok ? 'Historia copiada.' : 'No se pudo copiar.', ok ? 'success' : 'error');
    };
  }
  var cancelBtn = root.querySelector('#hc-cancel-edit');
  if (cancelBtn) {
    cancelBtn.onclick = function () {
      _editMode = false;
      renderPanel(root);
    };
  }
  var saveBtn = root.querySelector('#hc-save');
  if (saveBtn) {
    saveBtn.onclick = function () {
      saveHistoria(root, patient, false);
    };
  }
  root.querySelectorAll('[data-hc-path]').forEach(function (el) {
    el.addEventListener('input', function () {
      setByPath(el.getAttribute('data-hc-path'), el.value);
    });
  });
  wireClinicalHistoryUppercase(root);
  root.querySelectorAll('[data-hc-step]').forEach(function (btn) {
    btn.onclick = function () {
      var n = parseInt(btn.getAttribute('data-hc-step'), 10);
      if (Number.isFinite(n)) {
        _step = n;
        if (_data.meta) _data.meta.lastStep = n;
        renderPanel(root);
      }
    };
  });
  var prev = root.querySelector('#hc-prev');
  if (prev) {
    prev.onclick = function () {
      _step = Math.max(1, _step - 1);
      renderPanel(root);
    };
  }
  var next = root.querySelector('#hc-next');
  if (next) {
    next.onclick = function () {
      _step = Math.min(3, _step + 1);
      if (_data.meta) _data.meta.lastStep = _step;
      renderPanel(root);
    };
  }
  var resync = root.querySelector('#hc-resync-labs');
  if (resync) {
    resync.onclick = function () {
      openLabPickModal(patient, true);
    };
  }
  var pick = root.querySelector('#hc-pick-labs');
  if (pick) {
    pick.onclick = function () {
      openLabPickModal(patient, false);
    };
  }
  var goEa = root.querySelector('#hc-go-estado-actual');
  if (goEa) {
    goEa.onclick = function () {
      if (typeof rt.navigateToEstadoActualPanel === 'function') {
        rt.navigateToEstadoActualPanel();
      } else {
        rt.showToast('Abre la pestaña Estado actual en Clínico.', 'info');
      }
    };
  }
}

function openLabPickModal(patient, isResync) {
  var sets = labSetsInLookback(patient.id);
  if (!sets.length) {
    alert('No hay laboratorios en la ventana de ' + lookbackHours() + ' h.');
    return;
  }
  var needConfirm = !_data.meta || !_data.meta.admissionConfirmedLabs;
  if (needConfirm && !isResync) {
    var ok = confirm(
      '¿Usar labs de las últimas ' + lookbackHours() + ' horas? (' + sets.length + ' sets disponibles)'
    );
    if (!ok) return;
  }
  var label = sets
    .map(function (s, i) {
      return i + 1 + ': ' + (s.fecha || '') + ' ' + (s.hora || '');
    })
    .join('\n');
  var choice = prompt('Elige número de set:\n' + label, '1');
  var idx = parseInt(choice, 10) - 1;
  if (!Number.isFinite(idx) || idx < 0 || idx >= sets.length) return;
  applyLabSet(sets[idx], !isResync && needConfirm);
  var root = document.getElementById(_mountId);
  if (root) renderPanel(root);
}

function applyLabSet(set, markConfirmed) {
  if (!_data) return;
  _data.labAnchor = buildLabAnchorFromSet(set);
  _data.labsAtAdmission = {
    setId: String(set.id || ''),
    fecha: String(set.fecha || ''),
    qsSummary: String(set.sourceText || '').slice(0, 4000),
    parsedBySection: set.parsedBySection || set.parsed || null,
  };
  if (!_data.meta) _data.meta = {};
  if (markConfirmed) _data.meta.admissionConfirmedLabs = true;
  _dirtyKeys.add('labsAtAdmission');
  _dirtyKeys.add('labAnchor');
  _dirtyKeys.add('meta');
}

async function saveHistoria(root, patient, skipAckCheck) {
  if (_data) applyClinicalHistoryUppercase(_data);
  syncSignosVitalesIngresoFromEstadoActual(patient);
  var safety = scanSafety(patient);
  var pending = pendingSafetyAcknowledgements(safety.rules, _pendingAck);
  if (!skipAckCheck && pending.length) {
    var msg = pending
      .map(function (r) {
        return r.title + ': ' + r.message;
      })
      .join('\n\n');
    var ok = confirm(
      'Alertas de seguridad clínica:\n\n' + msg + '\n\n¿Continuar con riesgo documentado?'
    );
    if (!ok) return;
    _pendingAck = buildSafetyAuditEntries(pending, safety.labContext, true);
  }

  var dirty = Array.from(_dirtyKeys);
  if (!dirty.length && _version > 0) {
    rt.showToast('No hay cambios para guardar.', 'info');
    return;
  }
  if (!_version && !dirty.length) {
    dirty = DATA_KEYS.slice();
  }

  var roomId = getActiveLiveSyncRoomId() || '';
  var builder = createMutationBuilder('historiaClinica', patient.id).captureBase(
    Object.assign({ version: _version }, _data)
  );
  dirty.forEach(function (k) {
    if (_data[k] !== undefined) builder.set(k, _data[k]);
  });

  var mutation = builder.build({
    roomId,
    patientId: patient.id,
    clientId: localStorage.getItem('rpc-lan-client-id') || 'local',
    audit: {
      sections: dirty,
      safety: _pendingAck,
    },
  });

  if (isLanSessionConfiguredForRest() && roomId) {
    var out = await lanPushHistoriaClinica(patient.id, mutation);
    if (out && out.conflict) return;
    if (out && out.ok) {
      _version = out.version;
      _data = migrateLegacyHistoriaData(out.data, CATALOGS);
      patient.historiaClinica = { version: _version, data: Object.assign({}, _data) };
      saveState();
      _editMode = false;
      _pendingAck = [];
      _dirtyKeys = new Set();
      renderPanel(root);
      rt.showToast('Historia clínica guardada.', 'success');
    }
    return;
  }

  patient.historiaClinica = { version: _version + 1, data: Object.assign({}, _data) };
  _version += 1;
  _editMode = false;
  _pendingAck = [];
  _dirtyKeys = new Set();
  saveState();
  renderPanel(root);
  rt.showToast('Historia clínica guardada.', 'success');
}

export async function renderHistoriaClinicaPanel(opts) {
  opts = opts || {};
  var root = document.getElementById(_mountId);
  if (!root) return;
  var patient = activePatient();
  if (!patient) {
    root.innerHTML = '';
    if (opts.onReady) opts.onReady();
    return;
  }

  var local = readLocalHistoria(patient);
  if (local) {
    _version = local.version || 1;
    _data = normalizeData(local.data, patient.id, patient);
  } else {
    _version = 0;
    _data = normalizeData(null, patient.id, patient);
  }

  var roomId = getActiveLiveSyncRoomId() || '';
  if (isLanSessionConfiguredForRest() && roomId && !(local && local.pendingLanSync)) {
    var remote = await fetchHistoriaRemote(patient.id, roomId);
    if (remote && (!local || remote.version >= local.version)) {
      _version = remote.version;
      _data = normalizeData(remote.data, patient.id, patient);
    }
  }

  _editMode = false;
  _step = (_data.meta && _data.meta.lastStep) || 1;
  renderPanel(root);
  if (opts.onReady) opts.onReady();
}

export function invalidateHistoriaClinicaPanel() {
  _data = null;
  _version = 0;
  _editMode = false;
  _step = 1;
  _pendingAck = [];
  _dirtyKeys = new Set();
}

/**
 * @param {object} patient
 * @param {Record<string, unknown>} patch
 * @param {'fill' | 'replace' | 'eventos'} mode
 * @returns {Promise<{ ok: boolean }>}
 */
var DRIVE_IMPORT_LAN_MS = 8000;

function driveImportLanTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(function (_, reject) {
      setTimeout(function () {
        reject(new Error('lan-timeout'));
      }, ms);
    }),
  ]);
}

/** Drive import uses local HC as merge base — remote fetch can hang without timeout. */
async function resolveDriveImportHcBase(patient) {
  var data = normalizeData(patient.historiaClinica && patient.historiaClinica.data, patient.id, patient);
  var version = patient.historiaClinica ? Number(patient.historiaClinica.version || 0) : 0;
  return { data: data, version: version };
}

export async function applyDriveImportHcPatch(patient, patch, mode, opts) {
  opts = opts || {};
  if (!patient || mode === 'eventos') return { ok: true };
  var roomId = getActiveLiveSyncRoomId() || '';
  var mergeMode = opts.fromReview || mode === 'replace' ? 'replace' : 'fill';
  var dirty = Object.keys(patch || {}).filter(function (k) {
    return !String(k).startsWith('_');
  });

  async function pushMergedHc(base) {
    var merged = mergeHcPatch(base.data, patch || {}, mergeMode);
    applyClinicalHistoryUppercase(merged);
    if (!isLanSessionConfiguredForRest() || !roomId || !dirty.length) {
      return { ok: true, merged: merged, version: base.version, localOnly: true };
    }
    var builder = createMutationBuilder('historiaClinica', patient.id).captureBase({
      version: base.version,
      data: base.data,
    });
    dirty.forEach(function (k) {
      if (merged[k] !== undefined) builder.set(k, merged[k]);
    });
    var mutation = builder.build({
      roomId: roomId,
      patientId: patient.id,
      clientId: localStorage.getItem('rpc-lan-client-id') || 'local',
      audit: { sections: dirty, source: 'drive-import' },
    });
    var out;
    try {
      out = await driveImportLanTimeout(lanPushHistoriaClinica(patient.id, mutation), DRIVE_IMPORT_LAN_MS);
    } catch (_e) {
      return { ok: true, merged: merged, version: base.version, localOnly: true, lanDeferred: true };
    }
    if (out && out.conflict) {
      return { ok: true, merged: merged, version: base.version, localOnly: true, lanDeferred: true };
    }
    if (out && out.ok) {
      return {
        ok: true,
        merged: migrateLegacyHistoriaData(out.data, CATALOGS),
        version: out.version,
        localOnly: false,
      };
    }
    return { ok: true, merged: merged, version: base.version, localOnly: true, lanDeferred: true };
  }

  var base = await resolveDriveImportHcBase(patient);
  var result = await pushMergedHc(base);
  if (!result.ok) return { ok: false };

  patient.historiaClinica = {
    version: result.localOnly ? Number(result.version || 0) + 1 : result.version,
    data: result.merged,
  };
  if (result.lanDeferred) {
    patient.historiaClinica.pendingLanSync = true;
  } else if (patient.historiaClinica.pendingLanSync) {
    delete patient.historiaClinica.pendingLanSync;
  }
  saveState();
  invalidateHistoriaClinicaPanel();
  return { ok: true, lanDeferred: !!result.lanDeferred };
}
