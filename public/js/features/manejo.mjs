/**
 * Pestaña Manejo electrolítico — tarjetas por ion, SOME y pendientes breves.
 */
import { patients } from '../app-state.mjs';
import {
  evaluateElectrolyteManejo,
  formatSomeBlock,
  parsePatientWeightKg,
  toSomeUpper,
} from '../electrolyte-manejo.mjs';
import { MANEJO_CALCULATORS } from '../manejo-calculators.mjs';
import {
  MANEJO_ATB_DRUGS,
  MANEJO_ATB_FAMILIES,
} from '../manejo-atb-catalog.mjs';
import { classifyAtbForIsolate } from '../manejo-atb-suggest.mjs';
import {
  CAD_CHECKLIST,
  EHH_CHECKLIST,
  evaluateCadEhh,
} from '../manejo-cad-ehh.mjs';
import { getCultureContextForManejo } from '../manejo-cultivo-bridge.mjs';
import {
  MANEJO_PROTOCOL_CATEGORIES,
  MANEJO_PROTOCOLS,
} from '../manejo-protocols-catalog.mjs';
import { shouldAddLabSuggestionTodo } from '../lab-clinical-suggestions.mjs';
import { storage } from '../storage.js';
import { normalizeFechaLabHistory, sortLabHistoryChronological } from '../tend-core.mjs';

const MANEJO_SUBTABS = [
  { id: 'electrolitos', label: 'Electrolitos' },
  { id: 'protocolos', label: 'Protocolos' },
  { id: 'atb', label: 'ATB' },
  { id: 'cad-ehh', label: 'CAD/EHH' },
];
const MANEJO_SUBTAB_KEY = 'manejoSubtab';

function getActiveManejoSubtab() {
  try {
    var s = sessionStorage.getItem(MANEJO_SUBTAB_KEY);
    if (MANEJO_SUBTABS.some(function (t) { return t.id === s; })) return s;
  } catch (_e) {}
  return 'electrolitos';
}

function setActiveManejoSubtab(id) {
  try { sessionStorage.setItem(MANEJO_SUBTAB_KEY, id); } catch (_e) {}
}

/** @type {{
 *   getActiveId(): string|null,
 *   ensureParsedLabHistory(id: string): unknown[],
 *   saveState(): void,
 *   showToast(msg: string, type?: string): void,
 *   emitLiveSyncTodoUpsert(id: string, row: unknown): void,
 *   refreshAllTodoUIs(): void,
 * }} */
var rt = {
  getActiveId() {
    return null;
  },
  ensureParsedLabHistory() {
    return [];
  },
  saveState() {},
  showToast() {},
  emitLiveSyncTodoUpsert() {},
  refreshAllTodoUIs() {},
};

export function registerManejoRuntime(partial) {
  if (partial && typeof partial === 'object') Object.assign(rt, partial);
}

function aid() {
  return rt.getActiveId();
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function copyToClipboard(txt) {
  var t = String(txt || '');
  var done = rt.showToast
    ? function () {
      rt.showToast('Copiado', 'success');
    }
    : function () {};

  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(t).then(done).catch(fallbackExec);
    }
  } catch (_e) {}

  fallbackExec();

  function fallbackExec() {
    try {
      var ta = document.createElement('textarea');
      ta.value = t;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      done();
    } catch (__e) {}
  }
}

function attachCopy(btn, getter) {
  btn.addEventListener('click', function () {
    copyToClipboard(getter());
  });
}

function findPatient(pid) {
  return patients.find(function (p) {
    return String(p.id) === String(pid);
  });
}

function buildManejoTodoText(row) {
  var ion = String(row.electrolyte || '').trim();
  var meta = ionMeta(ion);
  var ionLabel = meta.symbol || ion || '—';
  if (row.direction === 'hyper') ionLabel += ' ↑';
  else if (row.direction === 'hypo') ionLabel += ' ↓';

  var valStr = '';
  if (
    row.value != null &&
    row.value !== '' &&
    !(typeof row.value === 'number' && !Number.isFinite(row.value))
  ) {
    valStr = String(row.value).trim() + (row.unit ? ' ' + String(row.unit).trim() : '');
  }

  return valStr ? 'Repo ' + ionLabel + ' ' + valStr : 'Repo ' + ionLabel;
}

var ION_META = {
  K: { symbol: 'K⁺', name: 'Potasio' },
  Na: { symbol: 'Na⁺', name: 'Sodio' },
  Ca: { symbol: 'Ca²⁺', name: 'Calcio' },
  Mg: { symbol: 'Mg²⁺', name: 'Magnesio' },
  P: { symbol: 'P', name: 'Fósforo' },
};

function ionMeta(code) {
  var key = String(code || '').trim();
  return ION_META[key] || { symbol: key || '—', name: '' };
}

function addManejoGenericPendiente(ruleId, text, labFechaNorm) {
  var pid = aid();
  if (!pid) return;
  var ruleScoped = 'manejo:' + ruleId;
  var todos = storage.getTodos(pid);
  if (!shouldAddLabSuggestionTodo(todos, ruleScoped, labFechaNorm || '')) {
    rt.showToast('Ya hay un pendiente abierto para esta fila.', '');
    return;
  }
  var nowIso = new Date().toISOString();
  var entry = {
    id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 6),
    text: text,
    completed: false,
    priority: 'media',
    createdAt: nowIso,
    updatedAt: nowIso,
    labRuleId: ruleScoped,
    labFecha: labFechaNorm || '',
  };
  todos.push(entry);
  storage.saveTodos(pid, todos);
  rt.emitLiveSyncTodoUpsert(pid, entry);
  rt.refreshAllTodoUIs();
  rt.showToast('Pendiente agregado', 'success');
}

function addManejoPendiente(row, labFechaNorm) {
  var pid = aid();
  if (!pid || !row) return;
  var ruleScoped = 'manejo:' + String(row.ruleId || '');
  var todos = storage.getTodos(pid);
  if (!shouldAddLabSuggestionTodo(todos, ruleScoped, labFechaNorm)) {
    rt.showToast('Ya hay un pendiente abierto para esta fila del mismo día de lab.', '');
    return;
  }
  var nowIso = new Date().toISOString();
  var entry = {
    id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 6),
    text: buildManejoTodoText(row),
    completed: false,
    priority: 'media',
    createdAt: nowIso,
    updatedAt: nowIso,
    labRuleId: ruleScoped,
    labFecha: labFechaNorm,
  };
  todos.push(entry);
  storage.saveTodos(pid, todos);
  rt.emitLiveSyncTodoUpsert(pid, entry);
  rt.refreshAllTodoUIs();
  rt.showToast('Pendiente agregado', 'success');
}

function severityClass(severity) {
  var k = String(severity || 'leve').toLowerCase();
  if (k === 'moderada') return 'manejo-card--moderada';
  if (k === 'grave' || k === 'emergencia') return 'manejo-card--grave';
  return 'manejo-card--leve';
}

function severityLabel(severity) {
  var map = {
    leve: 'Leve',
    moderada: 'Moderada',
    grave: 'Grave',
    emergencia: 'Emergencia',
  };
  return map[String(severity || '').toLowerCase()] || String(severity || '—');
}

function routeChipLabel(route) {
  var r = String(route || '').trim();
  if (!r) return '';
  var u = r.toUpperCase();
  if (u.indexOf('INTRAVEN') >= 0) return 'IV';
  if (u.indexOf('ORAL') >= 0 || u === 'VO') return 'VO';
  if (u.indexOf('PICC') >= 0) return 'PICC';
  if (u.indexOf('CVC') >= 0 || u.indexOf('CENTRAL') >= 0) return 'CVC';
  return r.length > 14 ? r.slice(0, 14) + '…' : r;
}

function buildKvBlock(label, value, opts) {
  opts = opts || {};
  var kv = document.createElement('div');
  kv.className = 'manejo-kv' + (opts.wide ? ' manejo-kv--wide' : '');
  var lbl = document.createElement('span');
  lbl.className = 'manejo-kv-label';
  lbl.textContent = label;
  var val = document.createElement('div');
  val.className = 'manejo-kv-val' + (opts.mono ? ' manejo-kv-val--mono' : '');
  val.textContent = value || '—';
  kv.appendChild(lbl);
  kv.appendChild(val);
  return kv;
}

function buildSomeField(label, text, copyText) {
  var field = document.createElement('div');
  field.className = 'manejo-some-field' + (label === 'Medicamento' ? ' manejo-some-field--wide' : '');
  var lbl = document.createElement('span');
  lbl.className = 'manejo-some-field-label';
  lbl.textContent = label;
  field.appendChild(lbl);
  var row = document.createElement('div');
  row.className = 'manejo-some-field-row';
  var val = document.createElement('div');
  val.className = 'manejo-some-field-val';
  val.textContent = text || '—';
  row.appendChild(val);
  if (copyText) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'manejo-copy-btn';
    btn.textContent = 'Copiar';
    attachCopy(btn, function () {
      return copyText;
    });
    row.appendChild(btn);
  }
  field.appendChild(row);
  return field;
}

function buildSomeOrderArticle(order, oi) {
  var blk = formatSomeBlock(order);
  var art = document.createElement('article');
  art.className = 'manejo-some-order';

  var head = document.createElement('div');
  head.className = 'manejo-some-order-head';
  var title = document.createElement('span');
  title.className = 'manejo-some-order-title';
  title.textContent = 'Pedido SOME #' + String(oi + 1);
  head.appendChild(title);
  if (order.requiresDilution) {
    var wn = document.createElement('span');
    wn.className = 'manejo-dilution-warn';
    wn.title = 'Confirmar volumen diluyente institucional';
    wn.textContent = 'Dilución';
    head.appendChild(wn);
  }
  art.appendChild(head);

  var grid = document.createElement('div');
  grid.className = 'manejo-some-grid';

  if (order.medication) {
    grid.appendChild(
      buildSomeField('Medicamento', toSomeUpper(order.medication), toSomeUpper(order.medication))
    );
  }

  var doseStr =
    String(order.doseValue ?? '').trim() +
    (order.doseUnit ? ' ' + toSomeUpper(order.doseUnit) : '').trim();
  if (doseStr) {
    grid.appendChild(buildSomeField('Dosis', doseStr, doseStr));
  }
  if (order.dilution) {
    grid.appendChild(
      buildSomeField('Dilución', toSomeUpper(order.dilution), toSomeUpper(order.dilution))
    );
  }
  if (
    order.infusionRateMlHr != null &&
    order.infusionRateMlHr !== '' &&
    !(typeof order.infusionRateMlHr === 'number' && !Number.isFinite(order.infusionRateMlHr))
  ) {
    var rateTxt = toSomeUpper(String(order.infusionRateMlHr) + ' CC/HR');
    grid.appendChild(buildSomeField('Velocidad', rateTxt, rateTxt));
  }
  if (order.route) {
    grid.appendChild(buildSomeField('Vía', toSomeUpper(order.route), toSomeUpper(order.route)));
  }

  art.appendChild(grid);

  var actions = document.createElement('div');
  actions.className = 'manejo-some-order-actions';
  var bAll = document.createElement('button');
  bAll.type = 'button';
  bAll.className = 'manejo-copy-btn primary';
  bAll.textContent = 'Copiar bloque SOME';
  attachCopy(bAll, function () {
    return blk;
  });
  actions.appendChild(bAll);
  art.appendChild(actions);

  return art;
}

function buildManejoCard(row, labFechaNorm) {
  var meta = ionMeta(row.electrolyte);
  var card = document.createElement('article');
  card.className = 'manejo-card ' + severityClass(row.severity);

  var head = document.createElement('header');
  head.className = 'manejo-card-head';

  var ionWrap = document.createElement('div');
  ionWrap.className = 'manejo-card-ion-wrap';
  var sym = document.createElement('span');
  sym.className = 'manejo-card-symbol';
  sym.textContent = meta.symbol;
  ionWrap.appendChild(sym);
  if (meta.name) {
    var nm = document.createElement('span');
    nm.className = 'manejo-card-ion-name';
    nm.textContent = meta.name;
    ionWrap.appendChild(nm);
  }
  if (row.direction === 'hyper') {
    var up = document.createElement('span');
    up.className = 'manejo-card-dir';
    up.textContent = '↑';
    ionWrap.appendChild(up);
  } else if (row.direction === 'hypo') {
    var dn = document.createElement('span');
    dn.className = 'manejo-card-dir';
    dn.textContent = '↓';
    ionWrap.appendChild(dn);
  }
  head.appendChild(ionWrap);

  var headRight = document.createElement('div');
  headRight.className = 'manejo-card-head-right';

  var chips = document.createElement('div');
  chips.className = 'manejo-card-chips';
  var sev = document.createElement('span');
  sev.className = 'manejo-severity';
  sev.textContent = severityLabel(row.severity);
  chips.appendChild(sev);
  if (row.route) {
    var via = document.createElement('span');
    via.className = 'manejo-via-chip';
    via.title = String(row.route);
    via.textContent = routeChipLabel(row.route);
    chips.appendChild(via);
  }
  headRight.appendChild(chips);

  var valEl = document.createElement('span');
  valEl.className = 'manejo-card-value';
  if (
    row.value != null &&
    row.value !== '' &&
    !(typeof row.value === 'number' && !Number.isFinite(row.value))
  ) {
    valEl.textContent = String(row.value) + (row.unit ? ' ' + String(row.unit).trim() : '');
  } else {
    valEl.textContent = '—';
    valEl.style.opacity = '0.55';
  }
  headRight.appendChild(valEl);
  head.appendChild(headRight);
  card.appendChild(head);

  var grid = document.createElement('div');
  grid.className = 'manejo-card-grid';
  grid.appendChild(buildKvBlock('Interpretación', row.interpretation || '—'));

  var formulaTxt = row.formula || '';
  if (row.formulaResult) {
    formulaTxt = formulaTxt
      ? formulaTxt + ' → ' + String(row.formulaResult)
      : String(row.formulaResult);
  }
  grid.appendChild(buildKvBlock('Dosis sugerida', row.suggestedDose || '—'));
  grid.appendChild(buildKvBlock('Fórmula', formulaTxt || '—', { mono: true }));
  grid.appendChild(buildKvBlock('Monitoreo', row.monitoring || '—'));
  card.appendChild(grid);

  if ((row.alerts || []).length) {
    var alerts = document.createElement('div');
    alerts.className = 'manejo-card-alerts';
    var aul = document.createElement('ul');
    row.alerts.forEach(function (a) {
      var li = document.createElement('li');
      li.textContent = String(a);
      aul.appendChild(li);
    });
    alerts.appendChild(aul);
    card.appendChild(alerts);
  }

  if ((row.clinicalNotes || []).length) {
    var notes = document.createElement('div');
    notes.className = 'manejo-card-notes';
    var nul = document.createElement('ul');
    row.clinicalNotes.forEach(function (n) {
      var li = document.createElement('li');
      li.textContent = String(n);
      nul.appendChild(li);
    });
    notes.appendChild(nul);
    card.appendChild(notes);
  }

  var someOrders = row.someOrders || [];
  var hasSome = someOrders.length > 0;
  var drawer = document.createElement('div');
  drawer.className = 'manejo-some-drawer';
  drawer.hidden = true;
  someOrders.forEach(function (order, oi) {
    drawer.appendChild(buildSomeOrderArticle(order, oi));
  });

  var foot = document.createElement('footer');
  foot.className = 'manejo-card-foot';
  var actions = document.createElement('div');
  actions.className = 'manejo-card-foot-actions';

  if (hasSome) {
    var tg = document.createElement('button');
    tg.type = 'button';
    tg.className = 'manejo-toggle-some btn-med-secondary';
    tg.textContent = 'SOME ▸';
    tg.setAttribute('aria-expanded', 'false');
    tg.addEventListener('click', function () {
      var open = drawer.hidden;
      drawer.hidden = !open;
      tg.setAttribute('aria-expanded', open ? 'true' : 'false');
      tg.textContent = open ? 'SOME ▾' : 'SOME ▸';
    });
    actions.appendChild(tg);
  }

  var pend = document.createElement('button');
  pend.type = 'button';
  pend.className = 'manejo-btn-pendiente btn-med-secondary';
  pend.textContent = '+ Pendiente';
  pend.addEventListener('click', function () {
    addManejoPendiente(row, labFechaNorm);
  });
  actions.appendChild(pend);
  foot.appendChild(actions);
  card.appendChild(foot);

  if (hasSome) {
    card.appendChild(drawer);
  }

  return card;
}

var PROTO_FILTER_KEY = 'manejoProtoCategory';
var PROTO_SEARCH_KEY = 'manejoProtoSearch';

function getProtoCategoryFilter() {
  try {
    var s = sessionStorage.getItem(PROTO_FILTER_KEY);
    if (!s || s === 'all') return 'all';
    if (MANEJO_PROTOCOL_CATEGORIES.some(function (c) { return c.id === s; })) return s;
  } catch (_e) {}
  return 'all';
}

function setProtoCategoryFilter(id) {
  try {
    sessionStorage.setItem(PROTO_FILTER_KEY, id || 'all');
  } catch (_e) {}
}

function getProtoSearchQuery() {
  try {
    return String(sessionStorage.getItem(PROTO_SEARCH_KEY) || '').trim();
  } catch (_e2) {}
  return '';
}

function setProtoSearchQuery(q) {
  try {
    sessionStorage.setItem(PROTO_SEARCH_KEY, String(q || ''));
  } catch (_e3) {}
}

function categoryLabelFor(catId) {
  var hit = MANEJO_PROTOCOL_CATEGORIES.find(function (c) {
    return c.id === catId;
  });
  return hit ? hit.label : catId;
}

function protocolMatchesSearch(entry, q) {
  if (!q) return true;
  var needle = q.toLowerCase();
  var hay =
    String(entry.title || '') +
    ' ' +
    String(entry.indicationText || '') +
    ' ' +
    (entry.notes || []).join(' ');
  return hay.toLowerCase().indexOf(needle) >= 0;
}

function getProtocolLabFechaNorm(pid) {
  if (!pid) return '';
  var hist = rt.ensureParsedLabHistory(pid);
  var ordered = sortLabHistoryChronological(hist);
  var latest = ordered[0];
  if (!latest) return '';
  var labFechaRaw = latest.fecha || '';
  return normalizeFechaLabHistory(labFechaRaw) || String(labFechaRaw || '').trim();
}

function buildProtocolCopyText(entry, calcResult) {
  var parts = [];
  var tpl = String(entry.copyTemplate || '').trim();
  if (tpl) parts.push(tpl);
  if (calcResult && calcResult.copyLine) parts.push(String(calcResult.copyLine).trim());
  return parts.filter(Boolean).join('\n');
}

function buildProtocolCalcFields(calcId, entry, patient, host) {
  host.innerHTML = '';
  var runner = MANEJO_CALCULATORS[calcId];
  if (!runner) {
    var err = document.createElement('p');
    err.className = 'manejo-hint';
    err.textContent = 'Calculadora no disponible.';
    host.appendChild(err);
    return { getInputs: function () { return {}; }, run: function () { return null; } };
  }

  var wKg = patient ? parsePatientWeightKg(patient) : null;
  var fieldsWrap = document.createElement('div');
  fieldsWrap.className = 'manejo-proto-calc-fields';

  var weightInp = document.createElement('input');
  weightInp.type = 'text';
  weightInp.inputMode = 'decimal';
  weightInp.className = 'manejo-proto-calc-input';
  weightInp.placeholder = 'Peso (kg)';
  weightInp.value = wKg != null ? String(wKg) : String((patient && patient.peso) || '');
  fieldsWrap.appendChild(weightInp);

  var extraInputs = {};

  if (calcId === 'vanco-load' || calcId === 'vanco-maint') {
    var mgLbl = document.createElement('label');
    mgLbl.className = 'manejo-proto-calc-label';
    mgLbl.textContent = 'mg/kg';
    var mgInp = document.createElement('input');
    mgInp.type = 'text';
    mgInp.inputMode = 'decimal';
    mgInp.className = 'manejo-proto-calc-input';
    mgInp.value = String(
      (entry.calculatorParams && entry.calculatorParams.mgPerKg) ||
        (calcId === 'vanco-maint' ? 17.5 : 25)
    );
    mgLbl.appendChild(mgInp);
    fieldsWrap.appendChild(mgLbl);
    extraInputs.mgPerKg = mgInp;
  }

  if (calcId === 'bic-hu-balanceada') {
    var bicLbl = document.createElement('label');
    bicLbl.className = 'manejo-proto-calc-label';
    bicLbl.textContent = 'Bic px';
    var bicInp = document.createElement('input');
    bicInp.type = 'text';
    bicInp.inputMode = 'decimal';
    bicInp.className = 'manejo-proto-calc-input';
    bicInp.placeholder = 'Ej. 10';
    bicLbl.appendChild(bicInp);
    fieldsWrap.appendChild(bicLbl);
    extraInputs.bicPx = bicInp;
  }

  if (calcId === 'albumin-paracentesis') {
    var lLbl = document.createElement('label');
    lLbl.className = 'manejo-proto-calc-label';
    lLbl.textContent = 'Litros drenados';
    var lInp = document.createElement('input');
    lInp.type = 'text';
    lInp.inputMode = 'decimal';
    lInp.className = 'manejo-proto-calc-input';
    lInp.placeholder = 'Ej. 5';
    lLbl.appendChild(lInp);
    fieldsWrap.appendChild(lLbl);
    extraInputs.litersRemoved = lInp;
  }

  if (calcId === 'hypertonic-volume') {
    var ruleLbl = document.createElement('label');
    ruleLbl.className = 'manejo-proto-calc-check';
    var ruleChk = document.createElement('input');
    ruleChk.type = 'checkbox';
    ruleChk.checked = wKg != null;
    ruleLbl.appendChild(ruleChk);
    ruleLbl.appendChild(document.createTextNode(' 3 cc/kg (por peso)'));
    fieldsWrap.appendChild(ruleLbl);
    extraInputs.useWeightRule = ruleChk;
  }

  if (calcId === 'insulin-u-kg-h') {
    var uLbl = document.createElement('label');
    uLbl.className = 'manejo-proto-calc-label';
    uLbl.textContent = 'U/kg/h';
    var uInp = document.createElement('input');
    uInp.type = 'text';
    uInp.inputMode = 'decimal';
    uInp.className = 'manejo-proto-calc-input';
    uInp.value = String(
      (entry.calculatorParams && entry.calculatorParams.unitsPerKgPerHour) || 0.1
    );
    uLbl.appendChild(uInp);
    fieldsWrap.appendChild(uLbl);
    extraInputs.unitsPerKgPerHour = uInp;
  }

  host.appendChild(fieldsWrap);

  function getInputs() {
    var w = Number(String(weightInp.value || '').replace(',', '.'));
    var inputs = { weightKg: w };
    if (entry.calculatorParams && typeof entry.calculatorParams === 'object') {
      Object.keys(entry.calculatorParams).forEach(function (k) {
        if (k !== 'mgPerKg' && k !== 'unitsPerKgPerHour') inputs[k] = entry.calculatorParams[k];
      });
    }
    if (extraInputs.mgPerKg) {
      inputs.mgPerKg = Number(String(extraInputs.mgPerKg.value || '').replace(',', '.'));
    }
    if (extraInputs.bicPx) {
      inputs.bicPx = Number(String(extraInputs.bicPx.value || '').replace(',', '.'));
    }
    if (extraInputs.litersRemoved) {
      inputs.litersRemoved = Number(
        String(extraInputs.litersRemoved.value || '').replace(',', '.')
      );
    }
    if (extraInputs.useWeightRule) {
      inputs.useWeightRule = !!extraInputs.useWeightRule.checked;
    }
    if (extraInputs.unitsPerKgPerHour) {
      inputs.unitsPerKgPerHour = Number(
        String(extraInputs.unitsPerKgPerHour.value || '').replace(',', '.')
      );
    }
    return inputs;
  }

  function run() {
    try {
      return runner(getInputs());
    } catch (_e) {
      return null;
    }
  }

  return { getInputs: getInputs, run: run };
}

function buildProtocolCard(entry, patient, labFechaNorm) {
  var card = document.createElement('article');
  card.className = 'manejo-card manejo-card--proto';
  card.setAttribute('data-protocol-id', entry.id);

  var head = document.createElement('header');
  head.className = 'manejo-card-head';

  var titleWrap = document.createElement('div');
  titleWrap.className = 'manejo-card-ion-wrap';
  var titleEl = document.createElement('span');
  titleEl.className = 'manejo-card-symbol manejo-card-symbol--proto';
  titleEl.textContent = entry.title;
  titleWrap.appendChild(titleEl);
  head.appendChild(titleWrap);

  var headRight = document.createElement('div');
  headRight.className = 'manejo-card-head-right';
  var chips = document.createElement('div');
  chips.className = 'manejo-card-chips';
  var catChip = document.createElement('span');
  catChip.className = 'manejo-via-chip';
  catChip.textContent = categoryLabelFor(entry.category);
  chips.appendChild(catChip);
  headRight.appendChild(chips);
  head.appendChild(headRight);
  card.appendChild(head);

  var body = document.createElement('div');
  body.className = 'manejo-card-grid manejo-card-grid--proto';
  body.appendChild(buildKvBlock('Indicación', entry.indicationText || '—', { wide: true }));
  card.appendChild(body);

  var calcResult = null;
  var calcApi = null;

  if (entry.calculatorId) {
    var calcSec = document.createElement('div');
    calcSec.className = 'manejo-proto-calc';
    var calcHost = document.createElement('div');
    calcHost.className = 'manejo-proto-calc-inner';
    calcApi = buildProtocolCalcFields(entry.calculatorId, entry, patient, calcHost);
    calcSec.appendChild(calcHost);

    var resultEl = document.createElement('div');
    resultEl.className = 'manejo-proto-calc-result';
    resultEl.hidden = true;
    calcSec.appendChild(resultEl);

    var calcBtn = document.createElement('button');
    calcBtn.type = 'button';
    calcBtn.className = 'manejo-copy-btn primary';
    calcBtn.textContent = 'Calcular';
    calcBtn.addEventListener('click', function () {
      var r = calcApi.run();
      if (!r) {
        resultEl.hidden = false;
        resultEl.textContent = 'No se pudo calcular (revisa peso y valores).';
        calcResult = null;
        return;
      }
      calcResult = r;
      resultEl.hidden = false;
      resultEl.textContent = r.copyLine || JSON.stringify(r);
    });
    calcSec.appendChild(calcBtn);
    card.appendChild(calcSec);
  }

  if ((entry.notes || []).length) {
    var notes = document.createElement('div');
    notes.className = 'manejo-card-notes';
    var nul = document.createElement('ul');
    entry.notes.forEach(function (n) {
      var li = document.createElement('li');
      li.textContent = String(n);
      nul.appendChild(li);
    });
    notes.appendChild(nul);
    card.appendChild(notes);
  }

  function getCopyText() {
    if (entry.calculatorId && calcApi) {
      var r = calcResult || calcApi.run();
      return buildProtocolCopyText(entry, r);
    }
    return buildProtocolCopyText(entry, calcResult);
  }

  var foot = document.createElement('footer');
  foot.className = 'manejo-card-foot';
  var actions = document.createElement('div');
  actions.className = 'manejo-card-foot-actions';

  var copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'manejo-copy-btn primary';
  copyBtn.textContent = 'Copiar';
  attachCopy(copyBtn, getCopyText);
  actions.appendChild(copyBtn);

  var pend = document.createElement('button');
  pend.type = 'button';
  pend.className = 'manejo-btn-pendiente btn-med-secondary';
  pend.textContent = '+ Pendiente';
  pend.addEventListener('click', function () {
    addManejoGenericPendiente(
      'manejo-proto:' + entry.id,
      'Proto: ' + entry.title,
      labFechaNorm
    );
  });
  actions.appendChild(pend);
  foot.appendChild(actions);
  card.appendChild(foot);

  return card;
}

function renderManejoProtocolos(panel, pid, patient) {
  var root = document.createElement('div');
  root.className = 'manejo-root manejo-root--protocolos';

  var labFechaNorm = pid ? getProtocolLabFechaNorm(pid) : '';

  var toolbar = document.createElement('div');
  toolbar.className = 'manejo-proto-toolbar';

  var searchWrap = document.createElement('div');
  searchWrap.className = 'manejo-proto-search-wrap';
  var searchLbl = document.createElement('label');
  searchLbl.className = 'manejo-proto-search-label';
  searchLbl.textContent = 'Buscar';
  var searchInp = document.createElement('input');
  searchInp.type = 'search';
  searchInp.className = 'manejo-proto-search';
  searchInp.placeholder = 'Título o indicación…';
  searchInp.value = getProtoSearchQuery();
  searchLbl.appendChild(searchInp);
  searchWrap.appendChild(searchLbl);
  toolbar.appendChild(searchWrap);

  var chipsNav = document.createElement('div');
  chipsNav.className = 'manejo-proto-chips';
  chipsNav.setAttribute('role', 'group');
  chipsNav.setAttribute('aria-label', 'Filtrar por categoría');

  var activeCat = getProtoCategoryFilter();

  function makeChip(id, label) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'manejo-proto-chip' + (activeCat === id ? ' manejo-proto-chip--active' : '');
    btn.textContent = label;
    btn.setAttribute('data-category', id);
    btn.addEventListener('click', function () {
      setProtoCategoryFilter(id);
      renderManejo();
    });
    chipsNav.appendChild(btn);
  }

  makeChip('all', 'Todos');
  MANEJO_PROTOCOL_CATEGORIES.forEach(function (c) {
    makeChip(c.id, c.label);
  });
  toolbar.appendChild(chipsNav);
  root.appendChild(toolbar);

  searchInp.addEventListener('input', function () {
    setProtoSearchQuery(searchInp.value);
    renderManejo();
  });

  if (!pid) {
    var emp = document.createElement('p');
    emp.className = 'manejo-empty';
    emp.textContent = 'Selecciona un paciente para usar calculadoras y pendientes.';
    root.appendChild(emp);
  }

  var q = getProtoSearchQuery();
  var filtered = MANEJO_PROTOCOLS.filter(function (entry) {
    if (activeCat !== 'all' && entry.category !== activeCat) return false;
    return protocolMatchesSearch(entry, q);
  });

  if (!filtered.length) {
    var nz = document.createElement('p');
    nz.className = 'manejo-hint';
    nz.textContent = q
      ? 'Sin protocolos que coincidan con la búsqueda.'
      : 'Sin protocolos en esta categoría.';
    root.appendChild(nz);
    panel.appendChild(root);
    return;
  }

  var cards = document.createElement('div');
  cards.className = 'manejo-cards';
  filtered.forEach(function (entry) {
    cards.appendChild(buildProtocolCard(entry, patient, labFechaNorm));
  });
  root.appendChild(cards);
  panel.appendChild(root);
}

function familyLabelForAtb(familyId) {
  var f = MANEJO_ATB_FAMILIES.find(function (x) {
    return x.id === familyId;
  });
  return f ? f.label : familyId || '—';
}

function buildAtbCard(drug, classification, labFechaNorm) {
  var card = document.createElement('article');
  card.className =
    'manejo-card manejo-card--atb manejo-atb--' + (classification.status || 'neutral');

  var head = document.createElement('header');
  head.className = 'manejo-card-head';
  var titleWrap = document.createElement('div');
  titleWrap.className = 'manejo-card-ion-wrap';
  var titleEl = document.createElement('span');
  titleEl.className = 'manejo-card-symbol manejo-card-symbol--proto';
  titleEl.textContent = drug.name;
  titleWrap.appendChild(titleEl);
  head.appendChild(titleWrap);

  var headRight = document.createElement('div');
  headRight.className = 'manejo-card-head-right';
  var chips = document.createElement('div');
  chips.className = 'manejo-card-chips';
  var stChip = document.createElement('span');
  stChip.className = 'manejo-via-chip manejo-atb-status-chip';
  stChip.textContent =
    classification.status === 'compatible'
      ? 'S antibiograma'
      : classification.status === 'caution'
        ? 'Precaución'
        : drug.route || 'IV';
  chips.appendChild(stChip);
  headRight.appendChild(chips);
  head.appendChild(headRight);
  card.appendChild(head);

  var body = document.createElement('div');
  body.className = 'manejo-card-grid manejo-card-grid--proto';
  body.appendChild(buildKvBlock('Dosis adulto', drug.adultDose, { wide: true }));
  if ((drug.indications || []).length) {
    body.appendChild(
      buildKvBlock('Indicaciones', drug.indications.join('; '), { wide: true })
    );
  }
  if (drug.renalNote) {
    body.appendChild(buildKvBlock('Ajuste renal', drug.renalNote, { wide: true }));
  }
  card.appendChild(body);

  if ((classification.reasons || []).length) {
    var notes = document.createElement('div');
    notes.className = 'manejo-card-notes';
    var nul = document.createElement('ul');
    classification.reasons.forEach(function (n) {
      var li = document.createElement('li');
      li.textContent = String(n);
      nul.appendChild(li);
    });
    notes.appendChild(nul);
    card.appendChild(notes);
  }

  function getCopyText() {
    return (
      drug.name.toUpperCase() +
      ': ' +
      drug.adultDose +
      (drug.renalNote ? ' · ' + drug.renalNote : '')
    );
  }

  var foot = document.createElement('footer');
  foot.className = 'manejo-card-foot';
  var actions = document.createElement('div');
  actions.className = 'manejo-card-foot-actions';
  var copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'manejo-copy-btn primary';
  copyBtn.textContent = 'Copiar';
  attachCopy(copyBtn, getCopyText);
  actions.appendChild(copyBtn);
  var pend = document.createElement('button');
  pend.type = 'button';
  pend.className = 'manejo-btn-pendiente btn-med-secondary';
  pend.textContent = '+ Pendiente';
  pend.addEventListener('click', function () {
    addManejoGenericPendiente('manejo-atb:' + drug.id, 'ATB: ' + drug.name, labFechaNorm);
  });
  actions.appendChild(pend);
  foot.appendChild(actions);
  card.appendChild(foot);
  return card;
}

function renderManejoAtb(panel, pid, patient) {
  var root = document.createElement('div');
  root.className = 'manejo-root manejo-root--atb';

  var labFechaNorm = pid ? getProtocolLabFechaNorm(pid) : '';
  var hist = pid ? rt.ensureParsedLabHistory(pid) : [];
  var ctx = getCultureContextForManejo(hist, { maxAgeDays: 14 });
  var activeIdx = ctx.activeIsolateIndex || 0;
  try {
    var savedIdx = sessionStorage.getItem('manejoAtbIsolateIdx');
    if (savedIdx != null && ctx.isolates[Number(savedIdx)]) activeIdx = Number(savedIdx);
  } catch (_e0) {}
  var activeIso = ctx.isolates[activeIdx] || null;

  var disc = document.createElement('p');
  disc.className = 'manejo-hint manejo-atb-disclaimer';
  disc.textContent = 'Sugerencia orientativa; confirmar clínicamente.';
  root.appendChild(disc);

  if (ctx.isolates.length) {
    var banner = document.createElement('section');
    banner.className = 'manejo-atb-culture-banner';
    var bh = document.createElement('strong');
    bh.textContent = 'Cultivo activo';
    banner.appendChild(bh);

    if (ctx.isolates.length > 1) {
      var sel = document.createElement('select');
      sel.className = 'manejo-atb-isolate-select';
      ctx.isolates.forEach(function (iso, i) {
        var o = document.createElement('option');
        o.value = String(i);
        o.textContent =
          (iso.tipoLabel || 'Cultivo') +
          ': ' +
          (iso.organismo || '—') +
          (iso.fecha && iso.fecha !== '—' ? ' · ' + iso.fecha : '');
        if (i === activeIdx) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', function () {
        try {
          sessionStorage.setItem('manejoAtbIsolateIdx', sel.value);
        } catch (_e) {}
        renderManejo();
      });
      banner.appendChild(sel);
    } else if (activeIso) {
      var one = document.createElement('p');
      one.className = 'manejo-atb-isolate-line';
      one.textContent =
        activeIso.tipoLabel +
        ' · ' +
        activeIso.organismo +
        (activeIso.fecha !== '—' ? ' · ' + activeIso.fecha : '');
      banner.appendChild(one);
    }

    if (activeIso && activeIso.risSummary) {
      var rs = document.createElement('pre');
      rs.className = 'manejo-atb-ris';
      rs.textContent = activeIso.risSummary;
      banner.appendChild(rs);
    }

    if (ctx.globalAlerts.length) {
      var al = document.createElement('ul');
      al.className = 'manejo-atb-alerts';
      ctx.globalAlerts.forEach(function (a) {
        var li = document.createElement('li');
        li.textContent = a;
        al.appendChild(li);
      });
      banner.appendChild(al);
    }
    root.appendChild(banner);
  } else {
    var noC = document.createElement('p');
    noC.className = 'manejo-hint';
    noC.textContent = 'Sin cultivos positivos recientes en historial.';
    root.appendChild(noC);
  }

  var toolbar = document.createElement('div');
  toolbar.className = 'manejo-proto-toolbar';
  var searchWrap = document.createElement('div');
  searchWrap.className = 'manejo-proto-search-wrap';
  var searchLbl = document.createElement('label');
  searchLbl.className = 'manejo-proto-search-label';
  searchLbl.textContent = 'Buscar ATB';
  var searchInp = document.createElement('input');
  searchInp.type = 'search';
  searchInp.className = 'manejo-proto-search';
  searchInp.placeholder = 'Nombre o indicación…';
  searchLbl.appendChild(searchInp);
  searchWrap.appendChild(searchLbl);
  toolbar.appendChild(searchWrap);
  root.appendChild(toolbar);

  var cards = document.createElement('div');
  cards.className = 'manejo-cards';

  function renderList() {
    while (cards.firstChild) cards.removeChild(cards.firstChild);
    var q = String(searchInp.value || '')
      .trim()
      .toLowerCase();
    var sorted = MANEJO_ATB_DRUGS.slice().sort(function (a, b) {
      var ca = classifyAtbForIsolate(a, activeIso || {});
      var cb = classifyAtbForIsolate(b, activeIso || {});
      var rank = { compatible: 0, caution: 1, neutral: 2 };
      return (rank[ca.status] || 2) - (rank[cb.status] || 2);
    });
    sorted.forEach(function (drug) {
      var hay =
        !q ||
        drug.name.toLowerCase().indexOf(q) !== -1 ||
        (drug.adultDose || '').toLowerCase().indexOf(q) !== -1 ||
        familyLabelForAtb(drug.family).toLowerCase().indexOf(q) !== -1;
      if (!hay) return;
      var cls = classifyAtbForIsolate(drug, activeIso || {});
      cards.appendChild(buildAtbCard(drug, cls, labFechaNorm));
    });
    if (!cards.firstChild) {
      var nz = document.createElement('p');
      nz.className = 'manejo-hint';
      nz.textContent = 'Sin antibióticos que coincidan.';
      cards.appendChild(nz);
    }
  }

  searchInp.addEventListener('input', renderList);
  renderList();
  root.appendChild(cards);
  panel.appendChild(root);
}

function renderManejoCadEhh(panel, pid, patient) {
  var root = document.createElement('div');
  root.className = 'manejo-root manejo-root--cad-ehh';

  var labFechaNorm = pid ? getProtocolLabFechaNorm(pid) : '';
  var latest = null;
  if (pid) {
    var hist = rt.ensureParsedLabHistory(pid);
    var ordered = sortLabHistoryChronological(hist);
    latest = ordered[0] || null;
  }

  var evalOut = evaluateCadEhh({
    parsed: latest && latest.parsed,
    parsedBySection: latest && latest.parsedBySection,
    patient: patient,
  });

  var modeKey = 'manejoCadEhhMode';
  var mode = evalOut.suggestedMode;
  try {
    var saved = sessionStorage.getItem(modeKey);
    if (saved === 'cad' || saved === 'ehh' || saved === 'indeterminate') mode = saved;
  } catch (_e) {}

  var disc = document.createElement('p');
  disc.className = 'manejo-hint';
  disc.textContent = evalOut.disclaimer;
  root.appendChild(disc);

  var modeNav = document.createElement('div');
  modeNav.className = 'manejo-proto-chips';
  modeNav.setAttribute('role', 'group');
  modeNav.setAttribute('aria-label', 'Modo protocolo');

  function modeBtn(id, label) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'manejo-proto-chip' + (mode === id ? ' manejo-proto-chip--active' : '');
    btn.textContent = label;
    btn.addEventListener('click', function () {
      try {
        sessionStorage.setItem(modeKey, id);
      } catch (_e2) {}
      renderManejo();
    });
    modeNav.appendChild(btn);
  }

  modeBtn('cad', 'CAD');
  modeBtn('ehh', 'EHH');
  modeBtn('indeterminate', 'Indeterminado');
  root.appendChild(modeNav);

  var labBlock = document.createElement('section');
  labBlock.className = 'manejo-cad-labs';
  var lbTitle = document.createElement('strong');
  lbTitle.textContent = 'Último laboratorio';
  labBlock.appendChild(lbTitle);
  var L = evalOut.labs || {};
  var labLines = [
    'Glucosa: ' + (L.glucoseMgDl != null ? L.glucoseMgDl + ' mg/dL' : '—'),
    'pH: ' + (L.ph != null ? L.ph : '—'),
    'HCO₃: ' + (L.hco3 != null ? L.hco3 + ' mEq/L' : '—'),
    'K⁺: ' + (L.k != null ? L.k : '—'),
    'Cetonas: ' + (L.ketonesPositive ? 'Positivas' : 'No positivas / sin dato'),
    'Anion gap: ' + (L.anionGap != null ? L.anionGap : '—'),
  ];
  var labPre = document.createElement('p');
  labPre.className = 'manejo-cad-lab-lines';
  labPre.textContent = labLines.join(' · ');
  labBlock.appendChild(labPre);

  if (mode === 'cad' && evalOut.resolutionChecks) {
    var rc = evalOut.resolutionChecks;
    var chk = document.createElement('ul');
    chk.className = 'manejo-cad-resolution';
    [
      ['pH > 7.3', rc.phOk],
      ['HCO₃ ≥ 18', rc.hco3Ok],
      ['Glucosa < 200', rc.glucoseOk],
      ['Gap normalizado', rc.agOk],
    ].forEach(function (row) {
      var li = document.createElement('li');
      li.textContent = (row[1] ? '✓ ' : '○ ') + row[0];
      chk.appendChild(li);
    });
    labBlock.appendChild(chk);
  }
  root.appendChild(labBlock);

  var wKg = patient ? parsePatientWeightKg(patient) : null;
  if (wKg != null) {
    var calcSec = document.createElement('section');
    calcSec.className = 'manejo-proto-calc';
    var calcTitle = document.createElement('strong');
    calcTitle.textContent = 'Calculadoras';
    calcSec.appendChild(calcTitle);
    var rates =
      mode === 'ehh'
        ? [{ label: 'EHH 0.14 U/kg/h', rate: 0.14 }]
        : [
            { label: 'CAD 0.1 U/kg/h', rate: 0.1 },
            { label: 'CAD 0.05 U/kg/h (al 250)', rate: 0.05 },
          ];
    rates.forEach(function (r) {
      var line = MANEJO_CALCULATORS['insulin-u-kg-h']({
        weightKg: wKg,
        unitsPerKgPerHour: r.rate,
      });
      var p = document.createElement('p');
      p.className = 'manejo-cad-calc-line';
      p.textContent = r.label + ': ' + (line && line.copyLine ? line.copyLine : '—');
      calcSec.appendChild(p);
    });
    var fl = document.createElement('p');
    fl.className = 'manejo-cad-calc-line';
    fl.textContent =
      'Líquidos (referencia EHH): 15–20 mL/kg/h ≈ ' +
      Math.round(wKg * 17.5) +
      ' mL/h (peso ' +
      wKg +
      ' kg)';
    calcSec.appendChild(fl);
    root.appendChild(calcSec);
  }

  var checklist = mode === 'ehh' ? EHH_CHECKLIST : CAD_CHECKLIST;
  if (mode === 'indeterminate') {
    checklist = CAD_CHECKLIST.concat(EHH_CHECKLIST);
  }

  var list = document.createElement('div');
  list.className = 'manejo-cards';
  checklist.forEach(function (step) {
    var card = document.createElement('article');
    card.className = 'manejo-card manejo-card--proto';
    var head = document.createElement('header');
    head.className = 'manejo-card-head';
    var t = document.createElement('span');
    t.className = 'manejo-card-symbol manejo-card-symbol--proto';
    t.textContent = step.phase;
    head.appendChild(t);
    card.appendChild(head);
    card.appendChild(buildKvBlock('Paso', step.text, { wide: true }));
    var foot = document.createElement('footer');
    foot.className = 'manejo-card-foot';
    var actions = document.createElement('div');
    actions.className = 'manejo-card-foot-actions';
    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'manejo-copy-btn primary';
    copyBtn.textContent = 'Copiar';
    attachCopy(copyBtn, function () {
      return step.text;
    });
    actions.appendChild(copyBtn);
    var pend = document.createElement('button');
    pend.type = 'button';
    pend.className = 'manejo-btn-pendiente btn-med-secondary';
    pend.textContent = '+ Pendiente';
    pend.addEventListener('click', function () {
      var prefix = step.id.indexOf('ehh') === 0 ? 'EHH: ' : 'CAD: ';
      addManejoGenericPendiente('manejo-cad:' + step.id, prefix + step.phase, labFechaNorm);
    });
    actions.appendChild(pend);
    foot.appendChild(actions);
    card.appendChild(foot);
    list.appendChild(card);
  });
  root.appendChild(list);
  panel.appendChild(root);
}

function renderManejoElectrolitos(panelEl, pid, patient) {
  if (!pid) {
    var emp = document.createElement('p');
    emp.className = 'manejo-empty';
    emp.textContent = 'Selecciona un paciente para ver el manejo electrolítico.';
    panelEl.appendChild(emp);
    return;
  }

  if (!patient) {
    var e2 = document.createElement('p');
    e2.className = 'manejo-empty';
    e2.textContent = 'Paciente no encontrado.';
    panelEl.appendChild(e2);
    return;
  }

  if (patient.manejoPending) {
    patient.manejoPending = null;
    rt.saveState();
  }

  var hist = rt.ensureParsedLabHistory(pid);
  var ordered = sortLabHistoryChronological(hist);
  var latest = ordered[0];
  if (!latest) {
    var e3 = document.createElement('p');
    e3.className = 'manejo-empty';
    e3.textContent = 'Sin historial de laboratorio para este paciente.';
    panelEl.appendChild(e3);
    return;
  }

  var labFechaRaw = latest.fecha || '';
  var labFechaNorm = normalizeFechaLabHistory(labFechaRaw) || String(labFechaRaw || '').trim();

  var evalOut = evaluateElectrolyteManejo({
    parsedBySection: latest.parsedBySection,
    parsed: latest.parsed,
    patient: patient,
    refsBySection: latest.refsBySection,
    labSetId: latest.id != null ? String(latest.id) : '',
    labFecha: labFechaNorm,
  });

  var root = document.createElement('div');
  root.className = 'manejo-root';

  var wKg = parsePatientWeightKg(patient);
  var viaEmpty =
    patient.viaAcceso == null || String(patient.viaAcceso).trim() === '';
  if (wKg == null || viaEmpty) {
    var ban = document.createElement('section');
    ban.className = 'manejo-banner';
    ban.setAttribute('role', 'status');
    var bh = document.createElement('span');
    bh.className = 'manejo-banner-head';
    bh.textContent =
      'Completa peso y vía de acceso para cálculos TBW y límites de infusión.';
    ban.appendChild(bh);

    var fields = document.createElement('div');
    fields.className = 'manejo-banner-fields';

    if (wKg == null) {
      var fgP = document.createElement('div');
      fgP.className = 'field-group';
      var lp = document.createElement('label');
      lp.textContent = 'Peso (kg)';
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.inputMode = 'decimal';
      inp.placeholder = 'Ej. 60';
      inp.value = String(patient.peso || '');
      inp.addEventListener('input', function () {
        if (typeof window.updatePatient === 'function')
          window.updatePatient('peso', inp.value);
      });
      fgP.appendChild(lp);
      fgP.appendChild(inp);
      fields.appendChild(fgP);
    }

    if (viaEmpty) {
      var fgV = document.createElement('div');
      fgV.className = 'field-group';
      var lv = document.createElement('label');
      lv.textContent = 'Vía de acceso';
      var sel = document.createElement('select');

      function addOpt(val, txt) {
        var o = document.createElement('option');
        o.value = val;
        o.textContent = txt;
        sel.appendChild(o);
      }

      addOpt('', '— No especificada —');
      addOpt('periferica', 'EV periférica');
      addOpt('cvc', 'CVC / catéter central');
      addOpt('picc', 'PICC');
      sel.value = String(patient.viaAcceso || '');
      sel.addEventListener('change', function () {
        if (typeof window.updatePatient === 'function')
          window.updatePatient('viaAcceso', sel.value);
      });
      fgV.appendChild(lv);
      fgV.appendChild(sel);
      fields.appendChild(fgV);
    }

    ban.appendChild(fields);
    root.appendChild(ban);
  }

  var meta = document.createElement('p');
  meta.className = 'manejo-meta';
  meta.innerHTML =
    'Laboratorio más reciente: <strong>' +
    esc(String(latest.fecha || labFechaNorm || '—')) +
    '</strong>' +
    (latest.hora
      ? ' · <span>' + esc(String(latest.hora).slice(0, 8)) + '</span>'
      : '');
  root.appendChild(meta);

  if (evalOut.crossAlerts && evalOut.crossAlerts.length) {
    var xc = document.createElement('aside');
    xc.className = 'manejo-cross-alerts';
    var xt = document.createElement('strong');
    xt.textContent = 'Alertas cruzadas';
    xc.appendChild(xt);
    var xul = document.createElement('ul');
    evalOut.crossAlerts.forEach(function (a) {
      var li = document.createElement('li');
      li.textContent = String(a);
      xul.appendChild(li);
    });
    xc.appendChild(xul);
    root.appendChild(xc);
  }

  var hasInterpretableIon = !!evalOut.hasAlterations;

  if (!(evalOut.rows && evalOut.rows.length) || !hasInterpretableIon) {
    var nz = document.createElement('p');
    nz.className = 'manejo-hint';
    nz.textContent = !(evalOut.rows && evalOut.rows.length)
      ? 'No se encontraron electrolitos clave interpretables en el último conjunto.'
      : 'Sin alteraciones electrolíticas detectadas con estos valores.';
    root.appendChild(nz);
    panelEl.appendChild(root);
    return;
  }

  var cards = document.createElement('div');
  cards.className = 'manejo-cards';

  evalOut.rows.forEach(function (row) {
    cards.appendChild(buildManejoCard(row, labFechaNorm));
  });

  root.appendChild(cards);
  panelEl.appendChild(root);
}

function renderActiveManejoSubpanel(panel, subtabId, pid, patient) {
  if (subtabId === 'electrolitos') {
    renderManejoElectrolitos(panel, pid, patient);
  } else if (subtabId === 'protocolos') {
    renderManejoProtocolos(panel, pid, patient);
  } else if (subtabId === 'atb') {
    renderManejoAtb(panel, pid, patient);
  } else if (subtabId === 'cad-ehh') {
    renderManejoCadEhh(panel, pid, patient);
  }
}

export function renderManejo() {
  var container = document.getElementById('manejo-container');
  if (!container) return;
  while (container.firstChild) container.removeChild(container.firstChild);

  var pid = aid();
  var patient = pid ? findPatient(pid) : null;
  var activeId = getActiveManejoSubtab();

  var nav = document.createElement('nav');
  nav.className = 'manejo-subtabs';
  nav.setAttribute('role', 'tablist');

  var panelsWrap = document.createElement('div');
  panelsWrap.className = 'manejo-subpanels';

  var panels = {};
  MANEJO_SUBTABS.forEach(function (tab) {
    var isActive = tab.id === activeId;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'manejo-subtab' + (isActive ? ' manejo-subtab--active' : '');
    btn.textContent = tab.label;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    btn.setAttribute('data-subtab', tab.id);
    btn.addEventListener('click', function () {
      if (getActiveManejoSubtab() === tab.id) return;
      setActiveManejoSubtab(tab.id);
      renderManejo();
    });
    nav.appendChild(btn);

    var panel = document.createElement('div');
    panel.className = 'manejo-subpanel';
    panel.id = 'manejo-subpanel-' + tab.id;
    panel.setAttribute('role', 'tabpanel');
    panel.hidden = !isActive;
    panelsWrap.appendChild(panel);
    panels[tab.id] = panel;
  });

  container.appendChild(nav);
  container.appendChild(panelsWrap);

  renderActiveManejoSubpanel(panels[activeId], activeId, pid, patient);
}

export const manejoWindowHandlers = {
  renderManejo,
};
