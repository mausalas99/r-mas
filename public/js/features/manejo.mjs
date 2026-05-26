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
import { classifyAtbForIsolate, drugMatchesAtbRisFilter } from '../manejo-atb-suggest.mjs';
import { atbFamilyCssClass } from '../manejo-atb-family-colors.mjs';
import {
  drugToSomeOrderAtb,
  getRenalLabContext,
  resolveAtbRenalGuidance,
} from '../manejo-atb-renal.mjs';
import {
  CAD_CHECKLIST,
  EHH_CHECKLIST,
  evaluateCadEhh,
  checklistForCadEhhMode,
  fluidGuidanceForMode,
  getPotassiumRepletionGuidance,
  labMonitoringForCadEhhMode,
  nursingMonitoringForCadEhhMode,
} from '../manejo-cad-ehh.mjs';
import { getCultureContextForManejo } from '../manejo-cultivo-bridge.mjs';
import {
  isProtoFavorite,
  loadProtoFavorites,
  loadProtoRecentIds,
  recordProtoRecent,
  toggleProtoFavorite,
} from '../manejo-protocol-favorites.mjs';
import {
  addCustomProtocol,
  applyEntryOverrides,
  deleteCustomProtocol,
  hasProtocolOverride,
  loadCustomProtocols,
  removeProtocolOverride,
  saveProtocolOverride,
  updateCustomProtocol,
} from '../manejo-custom-protocols.mjs';
import {
  buildInsulinPumpTableText,
  INSULIN_PUMP_ALGORITHMS,
  INSULIN_PUMP_GLUCOSE_BANDS,
  insulinUnitsPerHourForGlucose,
} from '../manejo-insulin-pump-algorithms.mjs';
import {
  buildSomeOrder,
  cadEhhFluidSomeOrder,
  checklistItemToSomeOrder,
  drugToSomeOrder,
  insulinPumpSomeOrder,
  kRepletionToSomeOrder,
  labMonitorToSomeOrder,
  protocolToSomeOrder,
  suggestIvFluidCarrier,
} from '../manejo-some-format.mjs';
import {
  MANEJO_PROTOCOL_CATEGORIES,
  MANEJO_PROTOCOLS,
} from '../manejo-protocols-catalog.mjs';
import { syncAllSubTabIndicators } from '../ui-tab-motion.mjs';
import { storage } from '../storage.js';
import { normalizeFechaLabHistory, sortLabHistoryChronological } from '../tend-core.mjs';
import {
  buildCultivoAntibiogramCellHtmlForPatient,
  removeAtbRisPanelsFromBody,
  wireAtbRisHoverPanels,
} from './expediente.mjs';

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

function formatIndicationChipLabel(text) {
  var s = String(text || '').trim();
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function normalizeAtbHintToken(text) {
  return String(text || '')
    .trim()
    .toLowerCase();
}

function splitIndicationTokens(source) {
  if (!source) return [];
  var raw = Array.isArray(source) ? source : [source];
  var out = [];
  raw.forEach(function (item) {
    String(item || '')
      .split(/\s*[;,·]\s*/g)
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean)
      .forEach(function (token) {
        out.push(token);
      });
  });
  return out;
}

function buildIndicationChips(items, familyId, opts) {
  opts = opts || {};
  var tokens = splitIndicationTokens(items);
  var row = document.createElement('div');
  row.className = 'manejo-indication-chips';
  if (opts.sectionChips) {
    row.classList.add('manejo-indication-chips--section');
  } else if (familyId) {
    row.className += ' manejo-indication-chips--' + familyId;
  }
  if (opts.clickable) {
    row.classList.add('manejo-indication-chips--clickable');
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', 'Filtrar por indicación');
  }
  if (!tokens.length) {
    row.textContent = '—';
    row.className += ' manejo-indication-chips--empty';
    return row;
  }
  tokens.forEach(function (text, idx) {
    var label = formatIndicationChipLabel(text);
    var norm = normalizeAtbHintToken(text);
    var isActive =
      opts.activeHint &&
      opts.activeHint.token === norm &&
      (!opts.activeHint.familyId || opts.activeHint.familyId === familyId);
    var toneClass = opts.sectionChips ? '' : ' manejo-indication-chip--tone-' + (idx % 3);
    var activeClass = isActive ? ' manejo-indication-chip--active' : '';

    if (opts.clickable && typeof opts.onHintClick === 'function') {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'manejo-indication-chip manejo-indication-chip--clickable' + toneClass + activeClass;
      btn.textContent = label;
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      btn.addEventListener('click', function () {
        opts.onHintClick(text, familyId);
      });
      row.appendChild(btn);
    } else {
      var chip = document.createElement('span');
      chip.className = 'manejo-indication-chip' + toneClass + activeClass;
      chip.textContent = label;
      row.appendChild(chip);
    }
  });
  return row;
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
  val.textContent = text ? toSomeUpper(text) : '—';
  row.appendChild(val);
  if (copyText) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'manejo-copy-btn';
    btn.textContent = 'Copiar';
    attachCopy(btn, function () {
      var raw = typeof copyText === 'function' ? copyText() : copyText;
      return toSomeUpper(raw);
    });
    row.appendChild(btn);
  }
  field.appendChild(row);
  return field;
}

function buildSomeOrderArticle(orderOrGetter, oi) {
  function resolveOrder() {
    return typeof orderOrGetter === 'function' ? orderOrGetter() : orderOrGetter;
  }
  var order = resolveOrder();
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

  function appendField(label, getVal) {
    var val = getVal(order);
    if (val == null || val === '') return;
    grid.appendChild(
      buildSomeField(label, toSomeUpper(val), function () {
        return toSomeUpper(getVal(resolveOrder()) || '');
      })
    );
  }

  appendField('Medicamento', function (o) {
    return o.medication;
  });

  var doseStr =
    String(order.doseValue ?? '').trim() +
    (order.doseUnit ? ' ' + toSomeUpper(order.doseUnit) : '').trim();
  if (doseStr) {
    grid.appendChild(
      buildSomeField('Dosis', doseStr, function () {
        var o = resolveOrder();
        return (
          String(o.doseValue ?? '').trim() +
          (o.doseUnit ? ' ' + toSomeUpper(o.doseUnit) : '')
        ).trim();
      })
    );
  }

  appendField('Vía', function (o) {
    return o.route;
  });
  appendField('Dilución', function (o) {
    return o.dilution;
  });
  appendField('Frecuencia', function (o) {
    return o.frequency;
  });

  if (
    order.infusionRateMlHr != null &&
    order.infusionRateMlHr !== '' &&
    !(
      typeof order.infusionRateMlHr === 'number' && !Number.isFinite(order.infusionRateMlHr)
    )
  ) {
    var rateRaw = String(order.infusionRateMlHr).trim();
    var rateTxt = /mcg\/min|mg\/min|u\/min|u\/kg\/h/i.test(rateRaw)
      ? toSomeUpper(rateRaw)
      : toSomeUpper(rateRaw + ' CC/HR');
    grid.appendChild(
      buildSomeField('Velocidad de infusión', rateTxt, function () {
        var r = String(resolveOrder().infusionRateMlHr || '').trim();
        return /mcg\/min|mg\/min|u\/min|u\/kg\/h/i.test(r) ? toSomeUpper(r) : toSomeUpper(r + ' CC/HR');
      })
    );
  }

  appendField('Comentarios adicionales', function (o) {
    return o.comments;
  });

  art.appendChild(grid);

  var actions = document.createElement('div');
  actions.className = 'manejo-some-order-actions';
  var bAll = document.createElement('button');
  bAll.type = 'button';
  bAll.className = 'manejo-copy-btn primary';
  bAll.textContent = 'Copiar bloque SOME';
  attachCopy(bAll, function () {
    return formatSomeBlock(resolveOrder());
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
var PROTO_EXTRA_FILTERS_KEY = 'manejoProtoExtraFilters';

function getProtoExtraFilters() {
  try {
    var raw = sessionStorage.getItem(PROTO_EXTRA_FILTERS_KEY);
    var parsed = raw ? JSON.parse(raw) : null;
    return {
      calcOnly: !!(parsed && parsed.calcOnly),
    };
  } catch (_e) {
    return { calcOnly: false };
  }
}

function setProtoExtraFilters(patch) {
  var next = Object.assign(getProtoExtraFilters(), patch || {});
  try {
    sessionStorage.setItem(PROTO_EXTRA_FILTERS_KEY, JSON.stringify(next));
  } catch (_e2) {}
}

function getProtoCategoryFilter() {
  try {
    var s = sessionStorage.getItem(PROTO_FILTER_KEY);
    if (!s || s === 'all') return 'all';
    if (s === 'favorites' || s === 'recent') return s;
    if (MANEJO_PROTOCOL_CATEGORIES.some(function (c) { return c.id === s; })) return s;
  } catch (_e3) {}
  return 'all';
}

function setProtoCategoryFilter(id) {
  try {
    sessionStorage.setItem(PROTO_FILTER_KEY, id || 'all');
  } catch (_e) {}
}

var ATB_FAMILY_KEY = 'manejoAtbFamily';
var ATB_HINT_KEY = 'manejoAtbHint';
var ATB_RIS_FILTER_KEY = 'manejoAtbRisFilter';
var ATB_SELECTED_KEY = 'manejoAtbSelectedId';

function getAtbSelectedId() {
  try {
    return sessionStorage.getItem(ATB_SELECTED_KEY) || '';
  } catch (_e) {
    return '';
  }
}

function setAtbSelectedId(id) {
  try {
    if (id) sessionStorage.setItem(ATB_SELECTED_KEY, id);
    else sessionStorage.removeItem(ATB_SELECTED_KEY);
  } catch (_e2) {}
}

function findAtbDrugById(id) {
  if (!id) return null;
  return (
    MANEJO_ATB_DRUGS.find(function (d) {
      return d.id === id;
    }) || null
  );
}

function buildAtbCopyText(drug, calcResult) {
  return formatSomeBlock(drugToSomeOrder(drug, calcResult));
}

function atbStatusLabel(classification, drug) {
  var status = (classification && classification.status) || 'neutral';
  if (status === 'compatible') return 'S antibiograma';
  if (status === 'caution') return 'Precaución';
  return drug.route || 'IV';
}

function buildAtbDetailEmpty() {
  var empty = document.createElement('div');
  empty.className = 'manejo-proto-detail-empty';
  var t = document.createElement('p');
  t.className = 'manejo-proto-detail-empty-title';
  t.textContent = 'Selecciona un antibiótico';
  empty.appendChild(t);
  var h = document.createElement('p');
  h.className = 'manejo-hint';
  h.textContent = 'El pedido SOME aparece aquí, campo por campo, listo para copiar.';
  empty.appendChild(h);
  return empty;
}

function buildAtbDetailPanel(drug, classification, patient, renalCtx) {
  var renalGuide = resolveAtbRenalGuidance(drug, renalCtx);
  var wrap = document.createElement('div');
  wrap.className = 'manejo-proto-detail ' + atbFamilyCssClass(drug.family);

  var head = document.createElement('header');
  head.className = 'manejo-proto-detail-head';
  var title = document.createElement('h3');
  title.className = 'manejo-proto-detail-title';
  title.textContent = drug.name;
  head.appendChild(title);
  var fam = document.createElement('span');
  fam.className = 'manejo-proto-detail-cat';
  fam.textContent = familyLabelForAtb(drug.family);
  head.appendChild(fam);
  var status = classification.status || 'neutral';
  if (status === 'compatible' || status === 'caution') {
    var st = document.createElement('span');
    st.className =
      'manejo-via-chip manejo-atb-status-chip manejo-atb-status-chip--' + status;
    st.textContent = atbStatusLabel(classification, drug);
    head.appendChild(st);
  }
  wrap.appendChild(head);

  if (renalGuide.hasEgfr) {
    wrap.appendChild(buildKvBlock('eTFG (lab)', renalGuide.summaryLine, { wide: true }));
    if (renalGuide.adjustment) {
      wrap.appendChild(buildKvBlock('Ajuste renal', renalGuide.adjustment, { wide: true }));
    }
  }

  if (drug.adultDose) {
    wrap.appendChild(buildKvBlock('Dosis adulto', drug.adultDose, { wide: true }));
  }
  if ((drug.indications || []).length) {
    wrap.appendChild(
      buildKvBlock(
        'Contexto clínico',
        drug.indications.map(formatIndicationChipLabel).join(' · '),
        { wide: true }
      )
    );
  }
  if (drug.renalNote && !(renalGuide.hasEgfr && renalGuide.adjustment)) {
    wrap.appendChild(buildKvBlock('Renal / TDM', drug.renalNote, { wide: true }));
  }

  if ((classification.reasons || []).length) {
    var notes = document.createElement('div');
    notes.className = 'manejo-card-notes manejo-card-notes--atb';
    var nul = document.createElement('ul');
    classification.reasons.forEach(function (n) {
      var li = document.createElement('li');
      li.textContent = String(n);
      nul.appendChild(li);
    });
    notes.appendChild(nul);
    wrap.appendChild(notes);
  }

  var calcDrawer = null;
  if (drug.calculatorId) {
    var calcEntry = {
      calculatorId: drug.calculatorId,
      calculatorMgPerKgOptions: drug.calculatorMgPerKgOptions,
      calculatorDefaultMgPerKg: drug.calculatorDefaultMgPerKg,
    };
    calcDrawer = buildManejoCalcDrawer(drug.calculatorId, calcEntry, patient);
    calcDrawer.drawer.hidden = false;
    calcDrawer.drawer.classList.add('manejo-proto-detail-calc');
    wrap.appendChild(calcDrawer.drawer);
  }

  var someHint = document.createElement('p');
  someHint.className = 'manejo-proto-detail-hint';
  someHint.textContent = 'Copia cada campo en su casilla correspondiente del SOME.';
  wrap.appendChild(someHint);

  wrap.appendChild(
    buildSomeOrderArticle(function () {
      return drugToSomeOrderAtb(
        drug,
        calcDrawer ? calcDrawer.getCalcResult() : null,
        renalCtx,
        drugToSomeOrder
      );
    }, 0)
  );

  return {
    root: wrap,
    getCalcResult: function () {
      return calcDrawer ? calcDrawer.getCalcResult() : null;
    },
  };
}

function buildAtbListRow(drug, classification, opts) {
  opts = opts || {};
  var selected = !!opts.selected;
  var onSelect = opts.onSelect || function () {};

  function getCopyText() {
    if (typeof opts.getCopyText === 'function') {
      return opts.getCopyText(drug);
    }
    return buildAtbCopyText(drug, null);
  }

  var card = document.createElement('article');
  card.className =
    'manejo-card manejo-card--proto manejo-proto-row manejo-proto-row--atb manejo-atb--' +
    (classification.status || 'neutral') +
    (selected ? ' manejo-proto-row--selected' : '');
  card.setAttribute('data-atb-id', drug.id);
  card.setAttribute('data-atb-family', drug.family || '');
  card.setAttribute('role', 'button');
  card.tabIndex = selected ? 0 : -1;
  card.setAttribute('aria-pressed', selected ? 'true' : 'false');

  var shell = document.createElement('div');
  shell.className = 'manejo-proto-row-shell';

  var main = document.createElement('div');
  main.className = 'manejo-proto-row-main manejo-atb-row-main';

  var meta = document.createElement('div');
  meta.className = 'manejo-proto-row-meta';
  var titleEl = document.createElement('span');
  titleEl.className = 'manejo-proto-row-title';
  titleEl.textContent = drug.name;
  titleEl.title = drug.name;
  meta.appendChild(titleEl);
  if (drug.adultDose) {
    var doseEl = document.createElement('span');
    doseEl.className = 'manejo-proto-row-cat manejo-atb-row-dose';
    doseEl.textContent = truncateProtoSnippet(drug.adultDose, 64);
    doseEl.title = drug.adultDose;
    meta.appendChild(doseEl);
  }
  main.appendChild(meta);

  var actions = document.createElement('div');
  actions.className = 'manejo-proto-row-actions';

  var st = classification.status || 'neutral';
  if (st === 'compatible' || st === 'caution') {
    var stChip = document.createElement('span');
    stChip.className =
      'manejo-via-chip manejo-atb-status-chip manejo-atb-status-chip--' + st;
    stChip.textContent = atbStatusLabel(classification, drug);
    actions.appendChild(stChip);
  } else if (drug.calculatorId) {
    var calcBadge = document.createElement('span');
    calcBadge.className = 'manejo-proto-row-calc-badge';
    calcBadge.title = 'Incluye calculadora';
    calcBadge.innerHTML = manejoCalcIconHtml();
    calcBadge.setAttribute('aria-hidden', 'true');
    actions.appendChild(calcBadge);
  }

  var copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'manejo-copy-btn manejo-proto-row-copy';
  copyBtn.textContent = 'Copiar';
  copyBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    onSelect(drug.id);
    copyToClipboard(getCopyText());
  });
  actions.appendChild(copyBtn);

  main.appendChild(actions);
  shell.appendChild(main);
  card.appendChild(shell);

  function activateRow() {
    onSelect(drug.id);
  }

  card.addEventListener('click', function (e) {
    if (e.target.closest('button')) return;
    activateRow();
  });
  card.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activateRow();
    }
  });

  return card;
}

function getAtbFamilyFilter() {
  try {
    var s = sessionStorage.getItem(ATB_FAMILY_KEY);
    if (!s || s === 'all') return 'all';
    if (MANEJO_ATB_FAMILIES.some(function (f) { return f.id === s; })) return s;
  } catch (_e) {}
  return 'all';
}

function setAtbFamilyFilter(id) {
  try {
    sessionStorage.setItem(ATB_FAMILY_KEY, id || 'all');
  } catch (_e2) {}
}

function applyAtbFamilyFilter(id) {
  clearAtbHintFilter();
  setAtbFamilyFilter(id);
  if (id !== 'all') {
    var sid = getAtbSelectedId();
    if (sid) {
      var drug = findAtbDrugById(sid);
      if (drug && drug.family !== id) setAtbSelectedId('');
    }
  }
  renderManejo();
}

function getAtbHintFilter() {
  try {
    var raw = sessionStorage.getItem(ATB_HINT_KEY);
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    if (!parsed || !parsed.token) return null;
    return {
      token: normalizeAtbHintToken(parsed.token),
      familyId: parsed.familyId || '',
    };
  } catch (_e3) {}
  return null;
}

function setAtbHintFilter(token, familyId) {
  try {
    sessionStorage.setItem(
      ATB_HINT_KEY,
      JSON.stringify({
        token: normalizeAtbHintToken(token),
        familyId: familyId || '',
      })
    );
  } catch (_e4) {}
}

function clearAtbHintFilter() {
  try {
    sessionStorage.removeItem(ATB_HINT_KEY);
  } catch (_e5) {}
}

function getAtbRisFilter() {
  try {
    var s = sessionStorage.getItem(ATB_RIS_FILTER_KEY);
    if (s === 's' || s === 'r' || s === 'i') return s;
  } catch (_e6) {}
  return null;
}

function setAtbRisFilter(value) {
  try {
    if (value === 's' || value === 'r' || value === 'i') {
      sessionStorage.setItem(ATB_RIS_FILTER_KEY, value);
    } else {
      sessionStorage.removeItem(ATB_RIS_FILTER_KEY);
    }
  } catch (_e7) {}
}

function clearAtbRisFilter() {
  setAtbRisFilter(null);
}

function toggleAtbRisFilter(key) {
  setAtbRisFilter(getAtbRisFilter() === key ? null : key);
}

var ATB_RIS_FILTER_META = {
  s: { chip: 's', label: 'Solo sensibles (S)', title: 'Antibióticos con S en antibiograma' },
  r: { chip: 'r', label: 'Solo resistentes (R)', title: 'Antibióticos con R en antibiograma' },
  i: { chip: 'i', label: 'Solo intermedios (I)', title: 'Antibióticos con I en antibiograma' },
};

function syncManejoAtbRisChipFilterUi(root) {
  if (!root) return;
  var active = getAtbRisFilter();
  ['s', 'r', 'i'].forEach(function (key) {
    root.querySelectorAll('.manejo-atb-culture-banner .atb-chip--' + key).forEach(function (chip) {
      chip.classList.toggle('atb-chip--filter-active', active === key);
      chip.setAttribute('aria-pressed', active === key ? 'true' : 'false');
    });
    var pill = root.querySelector('.manejo-atb-ris-filter-pill--' + key);
    if (pill) {
      pill.classList.toggle('manejo-proto-chip--active', active === key);
      pill.setAttribute('aria-pressed', active === key ? 'true' : 'false');
    }
  });
}

function wireManejoAtbRisChipFilters(root, onChange) {
  if (!root) return;
  [
    { key: 's', title: 'Clic para filtrar antibióticos sensibles (S)' },
    { key: 'r', title: 'Clic para filtrar antibióticos resistentes (R)' },
    { key: 'i', title: 'Clic para filtrar antibióticos intermedios (I)' },
  ].forEach(function (cfg) {
    root.querySelectorAll('.manejo-atb-culture-banner .atb-chip--' + cfg.key).forEach(function (chip) {
      chip.classList.add('atb-chip--clickable-filter');
      if (!chip.title) chip.title = cfg.title;
      if (chip._manejoRisFilterWired) return;
      chip._manejoRisFilterWired = true;
      function onToggle(ev) {
        if (ev.type === 'keydown' && ev.key !== 'Enter' && ev.key !== ' ') return;
        if (ev.type === 'keydown') ev.preventDefault();
        if (ev.type === 'click') ev.preventDefault();
        toggleAtbRisFilter(cfg.key);
        syncManejoAtbRisChipFilterUi(root);
        if (typeof onChange === 'function') onChange();
      }
      chip.addEventListener('click', onToggle);
      chip.addEventListener('keydown', onToggle);
    });
  });
  syncManejoAtbRisChipFilterUi(root);
}

function drugMatchesAtbHint(drug, token) {
  var needle = normalizeAtbHintToken(token);
  if (!needle) return true;
  var hay = (
    String(drug.name || '') +
    ' ' +
    String(drug.adultDose || '') +
    ' ' +
    (drug.indications || []).join(' ') +
    ' ' +
    familyHintForAtb(drug.family) +
    ' ' +
    familyLabelForAtb(drug.family)
  ).toLowerCase();
  return hay.indexOf(needle) >= 0;
}

function onAtbHintChipClick(token, familyId) {
  var cur = getAtbHintFilter();
  var norm = normalizeAtbHintToken(token);
  if (cur && cur.token === norm && cur.familyId === familyId) {
    clearAtbHintFilter();
    setAtbFamilyFilter('all');
  } else {
    setAtbHintFilter(token, familyId);
    setAtbFamilyFilter(familyId);
  }
  renderManejo();
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
    String(entry.copyTemplate || '') +
    ' ' +
    categoryLabelFor(entry.category) +
    ' ' +
    (entry.notes || []).join(' ');
  return hay.toLowerCase().indexOf(needle) >= 0;
}

function filterProtocolEntries(entries, opts) {
  opts = opts || {};
  var cat = opts.category || 'all';
  var q = opts.query || '';
  var extra = opts.extra || getProtoExtraFilters();
  var favSet = {};
  loadProtoFavorites().forEach(function (id) {
    favSet[id] = true;
  });
  var recentOrder = loadProtoRecentIds();
  var recentRank = {};
  recentOrder.forEach(function (id, i) {
    recentRank[id] = i;
  });

  var out = entries.filter(function (entry) {
    if (extra.calcOnly && !entry.calculatorId) return false;
    if (cat === 'favorites') {
      if (!favSet[entry.id]) return false;
    } else if (cat === 'recent') {
      if (recentRank[entry.id] == null) return false;
    } else if (cat !== 'all' && entry.category !== cat) {
      return false;
    }
    return protocolMatchesSearch(entry, q);
  });

  if (cat === 'recent') {
    out.sort(function (a, b) {
      return (recentRank[a.id] != null ? recentRank[a.id] : 99) -
        (recentRank[b.id] != null ? recentRank[b.id] : 99);
    });
  }

  return out;
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
  return formatSomeBlock(protocolToSomeOrder(entry, calcResult));
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
    var mgSel = document.createElement('select');
    mgSel.className = 'manejo-proto-calc-input manejo-proto-calc-select';
    var opts =
      (entry.calculatorMgPerKgOptions ||
        entry.calculatorParams && entry.calculatorParams.mgPerKgOptions) ||
      (calcId === 'vanco-maint' ? [15, 17.5, 20] : [20, 25, 30]);
    var defMg =
      (entry.calculatorDefaultMgPerKg != null
        ? entry.calculatorDefaultMgPerKg
        : entry.calculatorParams && entry.calculatorParams.mgPerKg) ||
      (calcId === 'vanco-maint' ? 17.5 : 25);
    opts.forEach(function (v) {
      var o = document.createElement('option');
      o.value = String(v);
      o.textContent = String(v) + ' mg/kg';
      if (Number(v) === Number(defMg)) o.selected = true;
      mgSel.appendChild(o);
    });
    mgLbl.appendChild(mgSel);
    fieldsWrap.appendChild(mgLbl);
    extraInputs.mgPerKg = mgSel;
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

function buildManejoCalcDrawer(calcId, entry, patient) {
  var drawer = document.createElement('div');
  drawer.className = 'manejo-calc-drawer';
  drawer.hidden = true;
  var calcHost = document.createElement('div');
  calcHost.className = 'manejo-proto-calc-inner';
  var calcApi = buildProtocolCalcFields(calcId, entry, patient, calcHost);
  drawer.appendChild(calcHost);
  var resultEl = document.createElement('div');
  resultEl.className = 'manejo-proto-calc-result';
  resultEl.hidden = true;
  drawer.appendChild(resultEl);
  var calcBtn = document.createElement('button');
  calcBtn.type = 'button';
  calcBtn.className = 'manejo-copy-btn primary';
  calcBtn.textContent = 'Calcular';
  var calcResult = null;
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
    resultEl.textContent = toSomeUpper(r.copyLine) || '—';
  });
  drawer.appendChild(calcBtn);
  return {
    drawer: drawer,
    calcApi: calcApi,
    getCalcResult: function () {
      return calcResult || calcApi.run();
    },
    toggle: function (open) {
      drawer.hidden = !open;
    },
  };
}


function getAllManejoProtocols() {
  return MANEJO_PROTOCOLS.map(applyEntryOverrides).concat(loadCustomProtocols());
}

function protocolPatchFromSomeFields(fields, category) {
  var order = buildSomeOrder(fields || {});
  var block = formatSomeBlock(order);
  var patch = {
    title: String(order.medication || '').trim() || 'Protocolo',
    indicationText: block,
    copyTemplate: block,
    someFields: {
      medication: order.medication,
      route: order.route,
      doseValue: order.doseValue,
      doseUnit: order.doseUnit,
      dilution: order.dilution,
      frequency: order.frequency,
      infusionRateMlHr: order.infusionRateMlHr,
      comments: order.comments,
    },
  };
  if (category) patch.category = category;
  return patch;
}

function buildManejoProtoFormInput(type, className, placeholder) {
  var el = document.createElement('input');
  el.type = type || 'text';
  if (className) el.className = className;
  if (placeholder) el.placeholder = placeholder;
  return el;
}

function buildManejoProtoFormField(labelText, controlEl, opts) {
  opts = opts || {};
  var wrap = document.createElement('label');
  wrap.className = 'manejo-proto-editor-field' + (opts.full ? ' manejo-proto-editor-field--full' : '');
  var span = document.createElement('span');
  span.className = 'manejo-proto-editor-label';
  span.textContent = labelText;
  wrap.appendChild(span);
  wrap.appendChild(controlEl);
  return wrap;
}

function buildManejoProtoEditorSection(titleText) {
  var sec = document.createElement('section');
  sec.className = 'manejo-proto-editor-section';
  var h = document.createElement('h4');
  h.className = 'manejo-proto-editor-section-title';
  h.textContent = titleText;
  sec.appendChild(h);
  var grid = document.createElement('div');
  grid.className = 'manejo-proto-editor-grid';
  sec.appendChild(grid);
  return { section: sec, grid: grid };
}

/**
 * Modal para agregar o editar plantillas SOME (sin window.prompt — no funciona en Electron).
 * @param {{ mode?: 'add'|'edit', entry?: object, onSaved?: () => void }} opts
 */
function openManejoProtocolEditorModal(opts) {
  opts = opts || {};
  var mode = opts.mode === 'edit' ? 'edit' : 'add';
  var entry = opts.entry || null;
  var isCustom = !!(entry && entry.isCustom);
  var canRestore = mode === 'edit' && entry && !isCustom && hasProtocolOverride(entry.id);

  var seed = entry ? protocolToSomeOrder(entry, null) : buildSomeOrder({ route: 'IV' });

  var backdrop = document.createElement('div');
  backdrop.className = 'manejo-proto-editor-backdrop';
  backdrop.setAttribute('role', 'presentation');

  var modal = document.createElement('div');
  modal.className = 'manejo-proto-editor';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'manejo-proto-editor-title');
  modal.tabIndex = -1;

  var head = document.createElement('header');
  head.className = 'manejo-proto-editor-head';

  var headText = document.createElement('div');
  headText.className = 'manejo-proto-editor-head-text';

  var title = document.createElement('h3');
  title.id = 'manejo-proto-editor-title';
  title.className = 'manejo-proto-editor-title';
  title.textContent = mode === 'add' ? 'Nuevo protocolo SOME' : 'Editar plantilla SOME';
  headText.appendChild(title);

  var hint = document.createElement('p');
  hint.className = 'manejo-proto-editor-subtitle';
  hint.textContent =
    mode === 'add'
      ? 'Se guardará en tus protocolos personalizados.'
      : isCustom
        ? 'Cambios en tu biblioteca local.'
        : 'Override local — no modifica el catálogo base.';
  headText.appendChild(hint);
  head.appendChild(headText);

  var closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'manejo-proto-editor-close';
  closeBtn.setAttribute('aria-label', 'Cerrar');
  closeBtn.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  head.appendChild(closeBtn);
  modal.appendChild(head);

  var body = document.createElement('div');
  body.className = 'manejo-proto-editor-body';

  var medSec = buildManejoProtoEditorSection('Medicamento');
  var medInp = buildManejoProtoFormInput('text', 'manejo-proto-editor-input', 'Ej. Noradrenalina');
  medInp.value = seed.medication || (entry && entry.title) || '';
  medSec.grid.appendChild(buildManejoProtoFormField('Nombre', medInp, { full: true }));

  var doseValInp = buildManejoProtoFormInput('text', 'manejo-proto-editor-input', '16');
  doseValInp.value = seed.doseValue != null ? String(seed.doseValue) : '';
  medSec.grid.appendChild(buildManejoProtoFormField('Dosis', doseValInp));

  var doseUnitInp = buildManejoProtoFormInput('text', 'manejo-proto-editor-input', 'MG, MCG, MEQ…');
  doseUnitInp.value = seed.doseUnit || '';
  medSec.grid.appendChild(buildManejoProtoFormField('Unidad', doseUnitInp));
  body.appendChild(medSec.section);

  var adminSec = buildManejoProtoEditorSection('Administración');
  var routeInp = buildManejoProtoFormInput('text', 'manejo-proto-editor-input', 'IV');
  routeInp.value = seed.route || 'IV';
  adminSec.grid.appendChild(buildManejoProtoFormField('Vía', routeInp));

  var rateInp = buildManejoProtoFormInput('number', 'manejo-proto-editor-input', 'ml/h');
  rateInp.min = '0';
  rateInp.step = 'any';
  if (seed.infusionRateMlHr != null && seed.infusionRateMlHr !== '') {
    rateInp.value = String(seed.infusionRateMlHr);
  }
  adminSec.grid.appendChild(buildManejoProtoFormField('Velocidad', rateInp));

  var dilInp = buildManejoProtoFormInput('text', 'manejo-proto-editor-input', 'EN NaCl 0.9% 1000 ML');
  dilInp.value = seed.dilution || '';
  adminSec.grid.appendChild(buildManejoProtoFormField('Dilución', dilInp, { full: true }));

  var freqInp = buildManejoProtoFormInput('text', 'manejo-proto-editor-input', 'CONTINUO, CADA 8 H…');
  freqInp.value = seed.frequency || '';
  adminSec.grid.appendChild(buildManejoProtoFormField('Frecuencia', freqInp, { full: true }));
  body.appendChild(adminSec.section);

  var notesSec = buildManejoProtoEditorSection('Comentarios');
  var commentsTa = document.createElement('textarea');
  commentsTa.className = 'manejo-proto-editor-input manejo-proto-editor-textarea';
  commentsTa.rows = 3;
  commentsTa.placeholder = 'Titular, vigilancia, metas clínicas…';
  commentsTa.value = seed.comments || '';
  notesSec.grid.appendChild(buildManejoProtoFormField('Notas SOME', commentsTa, { full: true }));
  body.appendChild(notesSec.section);

  var catSelect = null;
  if (mode === 'add' || isCustom) {
    var catSec = buildManejoProtoEditorSection('Clasificación');
    catSelect = document.createElement('select');
    catSelect.className = 'manejo-proto-editor-input manejo-proto-editor-select';
    MANEJO_PROTOCOL_CATEGORIES.forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.label;
      catSelect.appendChild(opt);
    });
    var catId = (entry && entry.category) || 'otros';
    catSelect.value = MANEJO_PROTOCOL_CATEGORIES.some(function (c) { return c.id === catId; })
      ? catId
      : 'otros';
    catSec.grid.appendChild(buildManejoProtoFormField('Categoría', catSelect, { full: true }));
    body.appendChild(catSec.section);
  }

  modal.appendChild(body);

  var errEl = document.createElement('p');
  errEl.className = 'manejo-proto-editor-error';
  errEl.hidden = true;
  modal.appendChild(errEl);

  var foot = document.createElement('footer');
  foot.className = 'manejo-proto-editor-foot';

  var secondary = document.createElement('div');
  secondary.className = 'manejo-proto-editor-foot-secondary';

  function closeModal() {
    backdrop.classList.remove('open');
    setTimeout(function () {
      backdrop.remove();
    }, 180);
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    }
  }

  closeBtn.addEventListener('click', closeModal);

  var cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'manejo-proto-editor-btn manejo-proto-editor-btn--ghost';
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.addEventListener('click', closeModal);
  secondary.appendChild(cancelBtn);

  if (canRestore) {
    var restoreBtn = document.createElement('button');
    restoreBtn.type = 'button';
    restoreBtn.className = 'manejo-proto-editor-btn manejo-proto-editor-btn--ghost';
    restoreBtn.textContent = 'Restaurar original';
    restoreBtn.addEventListener('click', function () {
      removeProtocolOverride(entry.id);
      rt.showToast('Plantilla restaurada', 'success');
      closeModal();
      if (typeof opts.onSaved === 'function') opts.onSaved();
      else renderManejo();
    });
    secondary.appendChild(restoreBtn);
  }

  var saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'manejo-proto-editor-btn manejo-proto-editor-btn--primary';
  saveBtn.textContent = 'Guardar plantilla';
  saveBtn.addEventListener('click', function () {
    var medication = medInp.value.trim();
    if (!medication) {
      errEl.textContent = 'Indica el medicamento.';
      errEl.hidden = false;
      medInp.focus();
      return;
    }
    errEl.hidden = true;

    var rateRaw = rateInp.value.trim();
    var rateNum = rateRaw ? Number(rateRaw) : null;
    var category = catSelect ? catSelect.value : entry && entry.category;

    var patch = protocolPatchFromSomeFields(
      {
        medication: medication,
        doseValue: doseValInp.value.trim(),
        doseUnit: doseUnitInp.value.trim(),
        route: routeInp.value.trim() || 'IV',
        dilution: dilInp.value.trim(),
        frequency: freqInp.value.trim(),
        infusionRateMlHr: rateNum != null && Number.isFinite(rateNum) ? rateNum : null,
        comments: commentsTa.value.trim(),
      },
      category
    );

    if (mode === 'add') {
      addCustomProtocol(patch);
      setProtoCategoryFilter('otros');
      rt.showToast('Protocolo guardado en Otros', 'success');
    } else if (isCustom) {
      updateCustomProtocol(entry.id, patch);
      rt.showToast('Protocolo actualizado', 'success');
    } else {
      saveProtocolOverride(entry.id, patch);
      rt.showToast('Plantilla actualizada', 'success');
    }

    closeModal();
    if (typeof opts.onSaved === 'function') opts.onSaved();
    else renderManejo();
  });

  foot.appendChild(secondary);
  foot.appendChild(saveBtn);
  modal.appendChild(foot);

  backdrop.appendChild(modal);
  backdrop.addEventListener('click', function (e) {
    if (e.target === backdrop) closeModal();
  });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(backdrop);
  requestAnimationFrame(function () {
    backdrop.classList.add('open');
  });
  setTimeout(function () {
    try {
      medInp.focus();
    } catch (_e) {}
  }, 30);
}

function truncateProtoSnippet(text, maxLen) {
  var s = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return '—';
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + '…';
}

function manejoCalcIconHtml() {
  return (
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
    '<rect x="5" y="3" width="14" height="18" rx="2"/>' +
    '<path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M16 15h0M8 19h8"/>' +
    '</svg>'
  );
}

var PROTO_SELECTED_KEY = 'manejoProtoSelectedId';

function getProtoSelectedId() {
  try {
    return sessionStorage.getItem(PROTO_SELECTED_KEY) || '';
  } catch (_e) {
    return '';
  }
}

function setProtoSelectedId(id) {
  try {
    if (id) sessionStorage.setItem(PROTO_SELECTED_KEY, id);
    else sessionStorage.removeItem(PROTO_SELECTED_KEY);
  } catch (_e2) {}
}

function findProtocolEntryById(id, allProtocols) {
  if (!id) return null;
  return (
    (allProtocols || getAllManejoProtocols()).find(function (p) {
      return p.id === id;
    }) || null
  );
}

function buildStanfordDetailPanel(entry) {
  var wrap = document.createElement('div');
  wrap.className = 'manejo-proto-detail';

  var head = document.createElement('header');
  head.className = 'manejo-proto-detail-head';
  var title = document.createElement('h3');
  title.className = 'manejo-proto-detail-title';
  title.textContent = entry.title;
  head.appendChild(title);
  var cat = document.createElement('span');
  cat.className = 'manejo-proto-detail-cat';
  cat.textContent = categoryLabelFor(entry.category);
  head.appendChild(cat);
  wrap.appendChild(head);

  wrap.appendChild(
    buildKvBlock('Indicación', toSomeUpper(entry.indicationText || '') || '—', { wide: true })
  );

  var compWrap = document.createElement('div');
  compWrap.className = 'manejo-stanford-components';
  (entry.components || []).forEach(function (comp) {
    var row = document.createElement('div');
    row.className = 'manejo-some-field manejo-stanford-row';
    var lbl = document.createElement('span');
    lbl.className = 'manejo-some-field-label';
    lbl.textContent = comp.label;
    row.appendChild(lbl);
    var inner = document.createElement('div');
    inner.className = 'manejo-some-field-row';
    var val = document.createElement('div');
    val.className = 'manejo-some-field-val manejo-some-field-val--mono';
    val.textContent = toSomeUpper(comp.someText) || '—';
    inner.appendChild(val);
    var cbtn = document.createElement('button');
    cbtn.type = 'button';
    cbtn.className = 'manejo-copy-btn';
    cbtn.textContent = 'Copiar';
    attachCopy(cbtn, function () {
      return toSomeUpper(comp.someText || '');
    });
    inner.appendChild(cbtn);
    row.appendChild(inner);
    compWrap.appendChild(row);
  });
  wrap.appendChild(compWrap);

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
    wrap.appendChild(notes);
  }

  var foot = document.createElement('div');
  foot.className = 'manejo-proto-detail-foot';
  var copyAll = document.createElement('button');
  copyAll.type = 'button';
  copyAll.className = 'manejo-copy-btn btn-med-secondary';
  copyAll.textContent = 'Copiar enjuague';
  attachCopy(copyAll, function () {
    return toSomeUpper(entry.copyTemplate || '');
  });
  foot.appendChild(copyAll);
  wrap.appendChild(foot);

  return { root: wrap, getCalcResult: function () { return null; } };
}

function buildProtocolDetailPanel(entry, patient) {
  if (entry.isComponentGroup) {
    return buildStanfordDetailPanel(entry);
  }

  var wrap = document.createElement('div');
  wrap.className = 'manejo-proto-detail';

  var head = document.createElement('header');
  head.className = 'manejo-proto-detail-head';
  var title = document.createElement('h3');
  title.className = 'manejo-proto-detail-title';
  title.textContent = entry.title;
  head.appendChild(title);
  var cat = document.createElement('span');
  cat.className = 'manejo-proto-detail-cat';
  cat.textContent = categoryLabelFor(entry.category);
  head.appendChild(cat);
  wrap.appendChild(head);

  wrap.appendChild(
    buildKvBlock('Indicación', toSomeUpper(entry.indicationText || '') || '—', { wide: true })
  );

  var calcDrawer = null;
  if (entry.calculatorId) {
    calcDrawer = buildManejoCalcDrawer(entry.calculatorId, entry, patient);
    calcDrawer.drawer.hidden = false;
    calcDrawer.drawer.classList.add('manejo-proto-detail-calc');
    wrap.appendChild(calcDrawer.drawer);
  }

  var someHint = document.createElement('p');
  someHint.className = 'manejo-proto-detail-hint';
  someHint.textContent = 'Copia cada campo en su casilla correspondiente del SOME.';
  wrap.appendChild(someHint);

  wrap.appendChild(
    buildSomeOrderArticle(function () {
      var r = calcDrawer ? calcDrawer.getCalcResult() : null;
      return protocolToSomeOrder(entry, r);
    }, 0)
  );

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
    wrap.appendChild(notes);
  }

  return {
    root: wrap,
    getCalcResult: function () {
      return calcDrawer ? calcDrawer.getCalcResult() : null;
    },
  };
}

function buildProtocolDetailEmpty() {
  var empty = document.createElement('div');
  empty.className = 'manejo-proto-detail-empty';
  var t = document.createElement('p');
  t.className = 'manejo-proto-detail-empty-title';
  t.textContent = 'Selecciona un protocolo';
  empty.appendChild(t);
  var h = document.createElement('p');
  h.className = 'manejo-hint';
  h.textContent = 'El pedido SOME aparece aquí, campo por campo, listo para copiar.';
  empty.appendChild(h);
  return empty;
}

function buildProtocolListRow(entry, opts) {
  opts = opts || {};
  var selected = !!opts.selected;
  var onSelect = opts.onSelect || function () {};

  var card = document.createElement('article');
  card.className =
    'manejo-card manejo-card--proto manejo-proto-row' +
    (selected ? ' manejo-proto-row--selected' : '');
  card.setAttribute('data-protocol-id', entry.id);
  card.setAttribute('role', 'button');
  card.tabIndex = selected ? 0 : -1;
  card.setAttribute('aria-pressed', selected ? 'true' : 'false');

  function getCopyText() {
    if (typeof opts.getCopyText === 'function') {
      return opts.getCopyText(entry);
    }
    return buildProtocolCopyText(entry, null);
  }

  var shell = document.createElement('div');
  shell.className = 'manejo-proto-row-shell';

  var main = document.createElement('div');
  main.className = 'manejo-proto-row-main';

  var meta = document.createElement('div');
  meta.className = 'manejo-proto-row-meta';
  var titleEl = document.createElement('span');
  titleEl.className = 'manejo-proto-row-title';
  titleEl.textContent = entry.title;
  titleEl.title = entry.title;
  meta.appendChild(titleEl);
  var catSub = document.createElement('span');
  catSub.className = 'manejo-proto-row-cat';
  catSub.textContent = categoryLabelFor(entry.category);
  meta.appendChild(catSub);
  main.appendChild(meta);

  var snippet = document.createElement('p');
  snippet.className = 'manejo-proto-row-snippet';
  var indicationFull = toSomeUpper(entry.indicationText || '') || '—';
  snippet.textContent = truncateProtoSnippet(indicationFull, 120);
  snippet.title = indicationFull;
  main.appendChild(snippet);

  var actions = document.createElement('div');
  actions.className = 'manejo-proto-row-actions';

  if (entry.calculatorId) {
    var calcBadge = document.createElement('span');
    calcBadge.className = 'manejo-proto-row-calc-badge';
    calcBadge.title = 'Incluye calculadora';
    calcBadge.innerHTML = manejoCalcIconHtml();
    calcBadge.setAttribute('aria-hidden', 'true');
    actions.appendChild(calcBadge);
  }

  var favBtn = document.createElement('button');
  favBtn.type = 'button';
  favBtn.className =
    'manejo-card-fav-btn' + (isProtoFavorite(entry.id) ? ' manejo-card-fav-btn--active' : '');
  favBtn.setAttribute('data-proto-fav', entry.id);
  favBtn.setAttribute('aria-label', isProtoFavorite(entry.id) ? 'Quitar de favoritos' : 'Agregar a favoritos');
  favBtn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>';
  actions.appendChild(favBtn);

  var editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'manejo-card-edit-btn';
  editBtn.setAttribute('aria-label', 'Editar plantilla SOME');
  editBtn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  editBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    openManejoProtocolEditorModal({ mode: 'edit', entry: entry });
  });
  actions.appendChild(editBtn);

  if (entry.isCustom) {
    var delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'manejo-card-edit-btn';
    delBtn.setAttribute('aria-label', 'Eliminar protocolo');
    delBtn.title = 'Eliminar';
    delBtn.textContent = '×';
    delBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      deleteCustomProtocol(entry.id);
      if (getProtoSelectedId() === entry.id) setProtoSelectedId('');
      renderManejo();
    });
    actions.appendChild(delBtn);
  }

  var copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'manejo-copy-btn primary manejo-proto-row-copy';
  copyBtn.textContent = 'Copiar';
  copyBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    onSelect(entry.id);
    recordProtoRecent(entry.id);
    copyToClipboard(getCopyText());
  });
  actions.appendChild(copyBtn);

  main.appendChild(actions);
  shell.appendChild(main);
  card.appendChild(shell);

  function activateRow() {
    onSelect(entry.id);
  }

  card.addEventListener('click', function (e) {
    if (e.target.closest('button')) return;
    activateRow();
  });
  card.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activateRow();
    }
  });

  return card;
}

function buildManejoSearchInput(placeholder, ariaLabel) {
  var field = document.createElement('div');
  field.className = 'manejo-filter-search';
  var icon = document.createElement('span');
  icon.className = 'manejo-filter-search-icon';
  icon.setAttribute('aria-hidden', 'true');
  var inp = document.createElement('input');
  inp.type = 'search';
  inp.className = 'manejo-filter-search-input';
  inp.placeholder = placeholder;
  inp.setAttribute('aria-label', ariaLabel || placeholder);
  inp.setAttribute('enterkeyhint', 'search');
  inp.autocomplete = 'off';
  field.appendChild(icon);
  field.appendChild(inp);
  return { field: field, input: inp };
}

function buildManejoFilterBar(searchField, chipsEl) {
  var bar = document.createElement('div');
  bar.className = 'manejo-filter-bar';
  if (searchField) bar.appendChild(searchField);
  if (chipsEl) {
    chipsEl.classList.add('manejo-filter-chips');
    bar.appendChild(chipsEl);
  }
  return bar;
}

function renderManejoProtocolos(panel, pid, patient) {
  var root = document.createElement('div');
  root.className = 'manejo-root manejo-root--protocolos';

  var activeCat = getProtoCategoryFilter();
  var extraFilters = getProtoExtraFilters();
  var allProtocols = getAllManejoProtocols();

  var toolbar = document.createElement('div');
  toolbar.className = 'manejo-proto-toolbar-v2 manejo-proto-toolbar-card';

  var searchRow = document.createElement('div');
  searchRow.className = 'manejo-proto-search-row';
  var search = buildManejoSearchInput('Buscar fármaco o indicación…', 'Buscar protocolos');
  var searchInp = search.input;
  searchRow.appendChild(search.field);

  var countBadge = document.createElement('span');
  countBadge.className = 'manejo-proto-count';
  countBadge.setAttribute('aria-live', 'polite');
  searchRow.appendChild(countBadge);

  var addProtoBtn = document.createElement('button');
  addProtoBtn.type = 'button';
  addProtoBtn.className = 'manejo-proto-add-btn';
  addProtoBtn.textContent = '+ Protocolo';
  addProtoBtn.title = 'Agregar protocolo SOME personalizado';
  addProtoBtn.addEventListener('click', function () {
    openManejoProtocolEditorModal({ mode: 'add' });
  });
  searchRow.appendChild(addProtoBtn);
  toolbar.appendChild(searchRow);

  var filtersRow = document.createElement('div');
  filtersRow.className = 'manejo-proto-filters-row';

  var viewsSeg = document.createElement('div');
  viewsSeg.className = 'manejo-proto-segment';
  viewsSeg.setAttribute('role', 'group');
  viewsSeg.setAttribute('aria-label', 'Vista de protocolos');

  function makeViewChip(id, label) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'manejo-proto-chip manejo-proto-chip--segment' +
      (activeCat === id ? ' manejo-proto-chip--active' : '');
    btn.textContent = label;
    btn.addEventListener('click', function () {
      setProtoCategoryFilter(id);
      renderManejo();
    });
    viewsSeg.appendChild(btn);
  }

  makeViewChip('favorites', '★ Favoritos');
  makeViewChip('recent', 'Recientes');
  makeViewChip('all', 'Todos');
  filtersRow.appendChild(viewsSeg);

  var calcToggleBtn = document.createElement('button');
  calcToggleBtn.type = 'button';
  calcToggleBtn.className =
    'manejo-proto-toggle' + (extraFilters.calcOnly ? ' manejo-proto-toggle--active' : '');
  calcToggleBtn.textContent = 'Con calculadora';
  calcToggleBtn.setAttribute('aria-pressed', extraFilters.calcOnly ? 'true' : 'false');
  calcToggleBtn.addEventListener('click', function () {
    setProtoExtraFilters({ calcOnly: !extraFilters.calcOnly });
    renderManejo();
  });
  filtersRow.appendChild(calcToggleBtn);
  toolbar.appendChild(filtersRow);

  var isCatDropdown =
    activeCat !== 'all' && activeCat !== 'favorites' && activeCat !== 'recent';
  var catFold = document.createElement('details');
  catFold.className = 'manejo-proto-cat-fold';
  catFold.open = isCatDropdown;
  var catSummary = document.createElement('summary');
  catSummary.className = 'manejo-proto-cat-fold-summary';
  catSummary.textContent = isCatDropdown
    ? 'Categoría: ' + categoryLabelFor(activeCat)
    : 'Filtrar por categoría';
  catFold.appendChild(catSummary);

  var catScroll = document.createElement('div');
  catScroll.className = 'manejo-proto-cat-scroll';
  catScroll.setAttribute('role', 'group');
  catScroll.setAttribute('aria-label', 'Categorías');

  MANEJO_PROTOCOL_CATEGORIES.forEach(function (c) {
    var count = allProtocols.filter(function (p) {
      return p.category === c.id;
    }).length;
    if (!count) return;
    var pill = document.createElement('button');
    pill.type = 'button';
    pill.className =
      'manejo-proto-cat-pill' + (activeCat === c.id ? ' manejo-proto-cat-pill--active' : '');
    pill.textContent = c.label;
    pill.title = count + ' protocolo' + (count === 1 ? '' : 's');
    pill.addEventListener('click', function () {
      setProtoCategoryFilter(c.id);
      renderManejo();
    });
    catScroll.appendChild(pill);
  });
  catFold.appendChild(catScroll);
  toolbar.appendChild(catFold);

  root.appendChild(toolbar);
  root.appendChild(buildInsulinPumpReferencePanel());

  if (!pid) {
    var emp = document.createElement('p');
    emp.className = 'manejo-empty';
    emp.textContent = 'Selecciona un paciente para usar calculadoras y pendientes.';
    root.appendChild(emp);
  }

  var split = document.createElement('div');
  split.className = 'manejo-proto-split';

  var listCol = document.createElement('div');
  listCol.className = 'manejo-proto-list-col';

  var listHost = document.createElement('div');
  listHost.className = 'manejo-proto-list';
  listCol.appendChild(listHost);

  var detailBackdrop = document.createElement('div');
  detailBackdrop.className = 'manejo-proto-detail-backdrop';
  detailBackdrop.hidden = true;
  detailBackdrop.addEventListener('click', function () {
    setProtoSelectedId('');
    renderDetail();
    syncDetailSheet();
    renderList();
  });

  var detailCol = document.createElement('div');
  detailCol.className = 'manejo-proto-detail-col';

  var detailClose = document.createElement('button');
  detailClose.type = 'button';
  detailClose.className = 'manejo-proto-detail-close';
  detailClose.setAttribute('aria-label', 'Cerrar detalle');
  detailClose.innerHTML = '&times;';
  detailClose.addEventListener('click', function () {
    setProtoSelectedId('');
    renderDetail();
    syncDetailSheet();
    renderList();
  });
  detailCol.appendChild(detailClose);

  var detailHost = document.createElement('div');
  detailHost.className = 'manejo-proto-detail-host';
  detailCol.appendChild(detailHost);

  split.appendChild(listCol);
  split.appendChild(detailBackdrop);
  split.appendChild(detailCol);
  root.appendChild(split);

  var activeDetailUi = null;

  function syncDetailSheet() {
    var narrow = typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 899px)').matches;
    var open = narrow && !!getProtoSelectedId();
    detailCol.classList.toggle('manejo-proto-detail-col--open', open);
    detailBackdrop.hidden = !open;
  }

  function renderDetail() {
    while (detailHost.firstChild) detailHost.removeChild(detailHost.firstChild);
    var sid = getProtoSelectedId();
    var entry = findProtocolEntryById(sid, allProtocols);
    if (!entry) {
      activeDetailUi = null;
      detailHost.appendChild(buildProtocolDetailEmpty());
      syncDetailSheet();
      return;
    }
    activeDetailUi = buildProtocolDetailPanel(entry, patient);
    detailHost.appendChild(activeDetailUi.root);
    syncDetailSheet();
  }

  function selectProtocol(id) {
    setProtoSelectedId(id);
    renderDetail();
    renderList();
  }

  function renderList() {
    while (listHost.firstChild) listHost.removeChild(listHost.firstChild);
    var q = String(searchInp.value || '').trim();
    var filtered = filterProtocolEntries(allProtocols, {
      category: activeCat,
      query: q,
      extra: extraFilters,
    });

    countBadge.textContent =
      filtered.length === 1 ? '1 protocolo' : filtered.length + ' protocolos';

    if (!filtered.length) {
      var nz = document.createElement('div');
      nz.className = 'manejo-proto-empty';
      var nzTitle = document.createElement('p');
      nzTitle.className = 'manejo-proto-empty-title';
      nzTitle.textContent = q ? 'Sin coincidencias' : 'Sin protocolos con estos filtros';
      nz.appendChild(nzTitle);
      var nzHint = document.createElement('p');
      nzHint.className = 'manejo-hint';
      if (activeCat === 'favorites') {
        nzHint.textContent = 'Marca protocolos con ★ para acceder rápido aquí.';
      } else if (activeCat === 'recent') {
        nzHint.textContent = 'Los protocolos que copies aparecerán en Recientes.';
      } else if (extraFilters.calcOnly) {
        nzHint.textContent = 'Desactiva «Con calculadora» para ver el catálogo completo.';
      } else {
        nzHint.textContent = 'Prueba otra categoría o limpia la búsqueda.';
      }
      nz.appendChild(nzHint);
      listHost.appendChild(nz);
      return;
    }

    var cards = document.createElement('div');
    cards.className = 'manejo-cards manejo-cards--proto';
    filtered.forEach(function (entry) {
      cards.appendChild(
        buildProtocolListRow(entry, {
          selected: getProtoSelectedId() === entry.id,
          onSelect: selectProtocol,
          getCopyText: function (e) {
            if (getProtoSelectedId() === e.id && activeDetailUi) {
              return buildProtocolCopyText(e, activeDetailUi.getCalcResult());
            }
            return buildProtocolCopyText(e, null);
          },
        })
      );
    });
    listHost.appendChild(cards);
  }

  listHost.addEventListener('click', function (e) {
    var favEl = e.target.closest('[data-proto-fav]');
    if (!favEl) return;
    e.preventDefault();
    toggleProtoFavorite(favEl.getAttribute('data-proto-fav'));
    renderList();
  });

  searchInp.addEventListener('input', renderList);
  renderDetail();
  renderList();
  if (typeof window.matchMedia === 'function') {
    window.matchMedia('(max-width: 899px)').addEventListener('change', syncDetailSheet);
  }
  panel.appendChild(root);
}

function familyLabelForAtb(familyId) {
  var f = MANEJO_ATB_FAMILIES.find(function (x) {
    return x.id === familyId;
  });
  return f ? f.label : familyId || '—';
}

function familyHintForAtb(familyId) {
  var f = MANEJO_ATB_FAMILIES.find(function (x) {
    return x.id === familyId;
  });
  return f && f.hint ? f.hint : '';
}

function escManejoHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isolateToCultivoRow(iso) {
  return {
    labSetId: iso.labSetId,
    organismo: iso.organismo,
    resistencias: iso.risSummary,
    risSummary: iso.risSummary,
    fechaMuestra: iso.fecha,
    sitio: iso.sitio,
    studyDate: iso.fecha,
    tipoLabel: iso.tipoLabel,
  };
}

function cultivoRowFechaDisplay(r) {
  if (r.fechaMuestra && r.fechaMuestra !== '—') return r.fechaMuestra;
  return r.studyDate || '—';
}

function buildManejoActiveCultivoTable(iso, pid) {
  var row = isolateToCultivoRow(iso);
  var fecha = cultivoRowFechaDisplay(row);
  var sitio = row.sitio && row.sitio !== '—' ? row.sitio : row.tipoLabel || '—';
  var wrap = document.createElement('div');
  wrap.className = 'cultivos-table-wrap manejo-atb-cultivo-table';
  wrap.innerHTML =
    '<table class="cultivos-table">' +
    '<thead><tr>' +
    '<th>Fecha</th>' +
    '<th>Sitio / muestra</th>' +
    '<th>Organismo</th>' +
    '<th>Antibiograma</th>' +
    '</tr></thead>' +
    '<tbody><tr>' +
    '<td>' +
    escManejoHtml(fecha) +
    '</td>' +
    '<td>' +
    escManejoHtml(sitio) +
    '</td>' +
    '<td>' +
    escManejoHtml(row.organismo || '—') +
    '</td>' +
    '<td class="cultivos-cell-atb">' +
    buildCultivoAntibiogramCellHtmlForPatient(row, pid) +
    '</td>' +
    '</tr></tbody></table>';
  return wrap;
}

function renderManejoAtb(panel, pid, patient) {
  removeAtbRisPanelsFromBody();
  var root = document.createElement('div');
  root.className = 'manejo-root manejo-root--atb';

  var hist = pid ? rt.ensureParsedLabHistory(pid) : [];
  var latestLabSet = null;
  if (hist.length) {
    latestLabSet = sortLabHistoryChronological(hist)[0] || null;
  }
  var renalCtx = getRenalLabContext(latestLabSet, patient);
  var ctx = getCultureContextForManejo(hist, { maxAgeDays: 14 });
  var activeIdx = ctx.activeIsolateIndex || 0;
  try {
    var savedIdx = sessionStorage.getItem('manejoAtbIsolateIdx');
    if (savedIdx != null && ctx.isolates[Number(savedIdx)]) activeIdx = Number(savedIdx);
  } catch (_e0) {}
  var activeIso = ctx.isolates[activeIdx] || null;

  var disc = document.createElement('p');
  disc.className = 'manejo-hint manejo-atb-disclaimer';
  disc.hidden = true;
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
        var sitio =
          iso.sitio && iso.sitio !== '—' ? iso.sitio : iso.tipoLabel || 'Cultivo';
        o.textContent =
          sitio +
          ' · ' +
          (iso.organismo || '—') +
          (iso.fecha && iso.fecha !== '—' ? ' · ' + iso.fecha : '');
        if (i === activeIdx) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', function () {
        clearAtbRisFilter();
        try {
          sessionStorage.setItem('manejoAtbIsolateIdx', sel.value);
        } catch (_e) {}
        renderManejo();
      });
      banner.appendChild(sel);
    }

    if (activeIso) {
      banner.appendChild(buildManejoActiveCultivoTable(activeIso, pid));
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
  }

  var toolbar = document.createElement('div');
  toolbar.className = 'manejo-proto-toolbar-v2 manejo-proto-toolbar-card manejo-atb-toolbar-v2';

  var searchRow = document.createElement('div');
  searchRow.className = 'manejo-proto-search-row';
  var search = buildManejoSearchInput('Nombre, familia o indicación…', 'Buscar antibióticos');
  var searchInp = search.input;
  searchRow.appendChild(search.field);

  var countBadge = document.createElement('span');
  countBadge.className = 'manejo-proto-count';
  countBadge.setAttribute('aria-live', 'polite');
  searchRow.appendChild(countBadge);

  if (renalCtx && renalCtx.egfr != null) {
    var renalChip = document.createElement('span');
    renalChip.className = 'manejo-proto-count manejo-atb-renal-chip';
    var renalParts = ['eTFG ' + renalCtx.egfr];
    if (renalCtx.creatinineMgDl != null) renalParts.push('Cr ' + renalCtx.creatinineMgDl);
    renalChip.textContent = renalParts.join(' · ');
    renalChip.title =
      'Laboratorio' +
      (renalCtx.fecha ? ' ' + renalCtx.fecha : '') +
      (renalCtx.source === 'computed' ? ' · eTFG calculada CKD-EPI' : '') +
      '. Se usa para sugerir ajuste renal.';
    searchRow.appendChild(renalChip);
  }

  toolbar.appendChild(searchRow);

  var activeFam = getAtbFamilyFilter();
  var filtersRow = document.createElement('div');
  filtersRow.className = 'manejo-proto-filters-row';

  if (activeIso) {
    ['s', 'r', 'i'].forEach(function (key) {
      var meta = ATB_RIS_FILTER_META[key];
      var risPill = document.createElement('button');
      risPill.type = 'button';
      risPill.className =
        'manejo-proto-chip manejo-proto-chip--segment manejo-atb-ris-filter-pill manejo-atb-ris-filter-pill--' +
        key +
        (getAtbRisFilter() === key ? ' manejo-proto-chip--active' : '');
      risPill.textContent = meta.label;
      risPill.setAttribute('aria-pressed', getAtbRisFilter() === key ? 'true' : 'false');
      risPill.title = meta.title;
      risPill.addEventListener('click', function () {
        toggleAtbRisFilter(key);
        syncManejoAtbRisChipFilterUi(root);
        renderList(false);
      });
      filtersRow.appendChild(risPill);
    });
  }

  if (filtersRow.childNodes.length) toolbar.appendChild(filtersRow);

  var isFamDropdown = activeFam !== 'all';
  var famFold = document.createElement('details');
  famFold.className = 'manejo-proto-cat-fold manejo-atb-fam-fold';
  famFold.open = isFamDropdown;
  var famSummary = document.createElement('summary');
  famSummary.className = 'manejo-proto-cat-fold-summary';
  famSummary.textContent = isFamDropdown
    ? 'Familia: ' + familyLabelForAtb(activeFam)
    : 'Filtrar por familia';
  famFold.appendChild(famSummary);

  var famScroll = document.createElement('div');
  famScroll.className = 'manejo-proto-cat-scroll';
  famScroll.setAttribute('role', 'group');
  famScroll.setAttribute('aria-label', 'Familias ATB');

  function makeFamPill(id, label) {
    var pill = document.createElement('button');
    pill.type = 'button';
    var cls = 'manejo-proto-cat-pill';
    if (id !== 'all') cls += ' ' + atbFamilyCssClass(id);
    if (activeFam === id) {
      cls += id === 'all' ? ' manejo-proto-cat-pill--active' : ' manejo-atb-family-pill--active';
    }
    pill.className = cls;
    pill.textContent = label;
    pill.addEventListener('click', function () {
      applyAtbFamilyFilter(id);
    });
    famScroll.appendChild(pill);
  }

  makeFamPill('all', 'Todas');
  MANEJO_ATB_FAMILIES.forEach(function (f) {
    makeFamPill(f.id, f.label);
  });
  famFold.appendChild(famScroll);
  toolbar.appendChild(famFold);

  var discInline = document.createElement('p');
  discInline.className = 'manejo-hint manejo-atb-toolbar-hint';
  discInline.textContent =
    'Sugerencia orientativa; confirmar clínicamente.' +
    (ctx.isolates.length ? '' : ' Sin cultivos positivos recientes.');
  toolbar.appendChild(discInline);

  root.appendChild(toolbar);

  var split = document.createElement('div');
  split.className = 'manejo-proto-split';

  var listCol = document.createElement('div');
  listCol.className = 'manejo-proto-list-col';

  var listScroll = document.createElement('div');
  listScroll.className = 'manejo-proto-list';

  var listRoot = document.createElement('div');
  listRoot.className = 'manejo-atb-sections';
  listScroll.appendChild(listRoot);
  listCol.appendChild(listScroll);

  var detailBackdrop = document.createElement('div');
  detailBackdrop.className = 'manejo-proto-detail-backdrop';
  detailBackdrop.hidden = true;
  detailBackdrop.addEventListener('click', function () {
    setAtbSelectedId('');
    renderDetail();
    syncAtbDetailSheet();
    renderList(true);
  });

  var detailCol = document.createElement('div');
  detailCol.className = 'manejo-proto-detail-col';

  var detailClose = document.createElement('button');
  detailClose.type = 'button';
  detailClose.className = 'manejo-proto-detail-close';
  detailClose.setAttribute('aria-label', 'Cerrar detalle');
  detailClose.innerHTML = '&times;';
  detailClose.addEventListener('click', function () {
    setAtbSelectedId('');
    renderDetail();
    syncAtbDetailSheet();
    renderList(true);
  });
  detailCol.appendChild(detailClose);

  var detailHost = document.createElement('div');
  detailHost.className = 'manejo-proto-detail-host';
  detailCol.appendChild(detailHost);

  split.appendChild(listCol);
  split.appendChild(detailBackdrop);
  split.appendChild(detailCol);
  root.appendChild(split);

  var activeDetailUi = null;
  var activeClassification = { status: 'neutral', reasons: [] };

  function syncAtbDetailSheet() {
    var narrow = typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 899px)').matches;
    var open = narrow && !!getAtbSelectedId();
    detailCol.classList.toggle('manejo-proto-detail-col--open', open);
    detailBackdrop.hidden = !open;
  }

  function renderDetail() {
    while (detailHost.firstChild) detailHost.removeChild(detailHost.firstChild);
    var sid = getAtbSelectedId();
    var drug = findAtbDrugById(sid);
    if (!drug) {
      activeDetailUi = null;
      activeClassification = { status: 'neutral', reasons: [] };
      detailHost.appendChild(buildAtbDetailEmpty());
      syncAtbDetailSheet();
      return;
    }
    activeClassification = classifyAtbForIsolate(drug, activeIso || {});
    activeDetailUi = buildAtbDetailPanel(drug, activeClassification, patient, renalCtx);
    detailHost.appendChild(activeDetailUi.root);
    syncAtbDetailSheet();
  }

  function selectAtb(id) {
    setAtbSelectedId(id);
    renderDetail();
    renderList(true);
  }

  function drugMatchesSearch(drug, q) {
    if (!q) return true;
    var hay =
      drug.name +
      ' ' +
      drug.adultDose +
      ' ' +
      (drug.indications || []).join(' ') +
      ' ' +
      familyLabelForAtb(drug.family);
    return hay.toLowerCase().indexOf(q) !== -1;
  }

  function renderList(refreshDetail) {
    while (listRoot.firstChild) listRoot.removeChild(listRoot.firstChild);
    var q = String(searchInp.value || '')
      .trim()
      .toLowerCase();
    var famFilter = getAtbFamilyFilter();
    var hintFilter = getAtbHintFilter();
    var risFilter = getAtbRisFilter();

    var filtered = MANEJO_ATB_DRUGS.filter(function (drug) {
      if (famFilter !== 'all' && drug.family !== famFilter) return false;
      if (hintFilter && hintFilter.token && !drugMatchesAtbHint(drug, hintFilter.token)) {
        return false;
      }
      if (hintFilter && hintFilter.familyId && drug.family !== hintFilter.familyId) {
        return false;
      }
      if (!drugMatchesAtbRisFilter(drug, activeIso, risFilter)) return false;
      return drugMatchesSearch(drug, q);
    });

    countBadge.textContent =
      filtered.length === 1 ? '1 ATB' : filtered.length + ' ATB';

    filtered.sort(function (a, b) {
      var ca = classifyAtbForIsolate(a, activeIso || {});
      var cb = classifyAtbForIsolate(b, activeIso || {});
      var rank = { compatible: 0, caution: 1, neutral: 2 };
      var dr = (rank[ca.status] || 2) - (rank[cb.status] || 2);
      if (dr !== 0) return dr;
      return String(a.name).localeCompare(String(b.name), 'es');
    });

    function appendRow(parent, drug) {
      var cls = classifyAtbForIsolate(drug, activeIso || {});
      parent.appendChild(
        buildAtbListRow(drug, cls, {
          selected: getAtbSelectedId() === drug.id,
          onSelect: selectAtb,
          getCopyText: function (d) {
            if (getAtbSelectedId() === d.id && activeDetailUi) {
              return buildAtbCopyText(d, activeDetailUi.getCalcResult());
            }
            return buildAtbCopyText(d, null);
          },
        })
      );
    }

    function appendFamilyHints(famId) {
      var hint = familyHintForAtb(famId);
      if (!hint) return;
      var hintWrap = document.createElement('div');
      hintWrap.className = 'manejo-atb-family-hints ' + atbFamilyCssClass(famId);
      hintWrap.appendChild(
        buildIndicationChips(hint, famId, {
          clickable: true,
          sectionChips: true,
          activeHint: hintFilter,
          onHintClick: onAtbHintChipClick,
        })
      );
      listRoot.appendChild(hintWrap);
    }

    if (!filtered.length) {
      var nz = document.createElement('p');
      nz.className = 'manejo-hint manejo-atb-empty';
      nz.textContent =
        risFilter === 's'
          ? 'Sin antibióticos del catálogo con S en este antibiograma.'
          : risFilter === 'r'
            ? 'Sin antibióticos del catálogo con R en este antibiograma.'
            : risFilter === 'i'
              ? 'Sin antibióticos del catálogo con I en este antibiograma.'
              : 'Sin antibióticos que coincidan.';
      listRoot.appendChild(nz);
      if (refreshDetail !== false && getAtbSelectedId()) renderDetail();
      return;
    }

    if (famFilter !== 'all') {
      appendFamilyHints(famFilter);
      var flat = document.createElement('div');
      flat.className = 'manejo-cards manejo-cards--proto';
      filtered.forEach(function (drug) {
        appendRow(flat, drug);
      });
      listRoot.appendChild(flat);
      if (refreshDetail !== false && getAtbSelectedId()) renderDetail();
      return;
    }

    var byFamily = Object.create(null);
    filtered.forEach(function (drug) {
      var fk = drug.family || 'otro';
      if (!byFamily[fk]) byFamily[fk] = [];
      byFamily[fk].push(drug);
    });

    var familiesOrder = MANEJO_ATB_FAMILIES.map(function (f) {
      return f.id;
    });

    familiesOrder.forEach(function (famId) {
      var drugs = byFamily[famId];
      if (!drugs || !drugs.length) return;

      var section = document.createElement('section');
      section.className = 'manejo-atb-family-section ' + atbFamilyCssClass(famId);

      var secHead = document.createElement('div');
      secHead.className = 'manejo-atb-family-label';
      var h3 = document.createElement('h3');
      h3.className = 'manejo-atb-family-title';
      h3.textContent = familyLabelForAtb(famId);
      secHead.appendChild(h3);
      var famHint = familyHintForAtb(famId);
      if (famHint) {
        secHead.appendChild(
          buildIndicationChips(famHint, famId, {
            clickable: true,
            sectionChips: true,
            activeHint: hintFilter,
            onHintClick: onAtbHintChipClick,
          })
        );
      }
      section.appendChild(secHead);

      var grid = document.createElement('div');
      grid.className = 'manejo-cards manejo-cards--proto';
      drugs.forEach(function (drug) {
        appendRow(grid, drug);
      });
      section.appendChild(grid);
      listRoot.appendChild(section);
    });

    if (refreshDetail !== false && getAtbSelectedId()) renderDetail();
  }

  if (!activeIso) clearAtbRisFilter();

  searchInp.addEventListener('input', function () {
    renderList(true);
  });
  renderDetail();
  renderList(true);
  if (typeof window.matchMedia === 'function') {
    window.matchMedia('(max-width: 899px)').addEventListener('change', syncAtbDetailSheet);
  }
  wireManejoAtbRisChipFilters(root, function () {
    renderList(false);
  });
  wireAtbRisHoverPanels(root);
  panel.appendChild(root);
}

function getCadEhhModeOverride(suggestedMode) {
  var modeKey = 'manejoCadEhhMode';
  var mode = suggestedMode;
  try {
    var saved = sessionStorage.getItem(modeKey);
    if (saved === 'cad' || saved === 'ehh' || saved === 'indeterminate') mode = saved;
  } catch (_e) {}
  return mode;
}

function setCadEhhMode(mode) {
  try {
    sessionStorage.setItem('manejoCadEhhMode', mode);
  } catch (_e2) {}
}

function cadStepDoneKey(pid, stepId) {
  return 'manejoCadStepDone:' + String(pid || 'none') + ':' + stepId;
}

function isCadStepDone(pid, stepId) {
  try {
    return sessionStorage.getItem(cadStepDoneKey(pid, stepId)) === '1';
  } catch (_e) {
    return false;
  }
}

function setCadStepDone(pid, stepId, done) {
  try {
    sessionStorage.setItem(cadStepDoneKey(pid, stepId), done ? '1' : '0');
  } catch (_e2) {}
}

function buildCadEhhChecklistItem(opts) {
  var details = document.createElement('details');
  details.className = 'manejo-cad-check-item';
  var done = isCadStepDone(opts.pid, opts.id);
  if (done) {
    details.classList.add('manejo-cad-check-item--done');
  } else if (opts.defaultOpen) {
    details.setAttribute('open', '');
  }

  var summary = document.createElement('summary');
  summary.className = 'manejo-cad-check-summary';
  var check = document.createElement('input');
  check.type = 'checkbox';
  check.className = 'manejo-cad-check-done';
  check.checked = done;
  check.setAttribute('aria-label', 'Marcar paso completado');
  check.addEventListener('click', function (ev) {
    ev.stopPropagation();
  });
  check.addEventListener('change', function () {
    setCadStepDone(opts.pid, opts.id, check.checked);
    details.classList.toggle('manejo-cad-check-item--done', check.checked);
    if (check.checked) details.removeAttribute('open');
    else details.setAttribute('open', '');
  });
  var num = document.createElement('span');
  num.className = 'manejo-cad-check-num';
  num.textContent = String(opts.index);
  var title = document.createElement('span');
  title.className = 'manejo-cad-check-title';
  title.textContent = opts.title;
  summary.appendChild(check);
  summary.appendChild(num);
  summary.appendChild(title);
  details.appendChild(summary);

  var body = document.createElement('div');
  body.className = 'manejo-cad-check-body';
  if (opts.alert) {
    var alert = document.createElement('p');
    alert.className = 'manejo-cad-k-alert';
    alert.textContent = opts.alert;
    body.appendChild(alert);
  }
  if (opts.carrierNote) {
    var note = document.createElement('p');
    note.className = 'manejo-hint manejo-cad-carrier-note';
    note.textContent = opts.carrierNote;
    body.appendChild(note);
  }
  if (opts.orderGetter) {
    body.appendChild(buildSomeOrderArticle(opts.orderGetter, 0));
  }
  if (opts.extra) body.appendChild(opts.extra);
  if (opts.onPendiente) {
    var actions = document.createElement('div');
    actions.className = 'manejo-cad-checklist-actions';
    var pend = document.createElement('button');
    pend.type = 'button';
    pend.className = 'manejo-btn-pendiente btn-med-secondary';
    pend.textContent = '+ Pendiente';
    pend.addEventListener('click', opts.onPendiente);
    actions.appendChild(pend);
    body.appendChild(actions);
  }
  details.appendChild(body);
  return details;
}

function buildCadEhhPotassiumTableExtra(kGuide, labs) {
  var wrap = document.createElement('details');
  wrap.className = 'manejo-cad-k-details';
  var summary = document.createElement('summary');
  summary.textContent = 'Ver tabla completa de K⁺';
  wrap.appendChild(summary);
  var kTable = document.createElement('div');
  kTable.className = 'manejo-cad-k-table';
  (kGuide.ranges || []).forEach(function (row) {
    var isActive = kGuide.active && kGuide.active.id === row.id;
    var tr = document.createElement('div');
    tr.className = 'manejo-cad-k-row' + (isActive ? ' manejo-cad-k-row--active' : '');
    var cRange = document.createElement('span');
    cRange.className = 'manejo-cad-k-cell manejo-cad-k-cell--range';
    cRange.textContent = row.rangeLabel;
    var cAct = document.createElement('span');
    cAct.className = 'manejo-cad-k-cell manejo-cad-k-cell--action';
    cAct.textContent = row.detail;
    var cCopy = document.createElement('span');
    cCopy.className = 'manejo-cad-k-cell manejo-cad-k-cell--copy';
    var kCopyBtn = document.createElement('button');
    kCopyBtn.type = 'button';
    kCopyBtn.className = 'manejo-copy-btn';
    kCopyBtn.textContent = 'Copiar';
    attachCopy(kCopyBtn, function () {
      return formatSomeBlock(kRepletionToSomeOrder(row, labs));
    });
    cCopy.appendChild(kCopyBtn);
    tr.appendChild(cRange);
    tr.appendChild(cAct);
    tr.appendChild(cCopy);
    kTable.appendChild(tr);
  });
  wrap.appendChild(kTable);
  return wrap;
}

function buildCadEhhChecklistWorkflow(mode, pid, patient, evalOut, labFechaNorm) {
  var labs = evalOut.labs || {};
  var wKg = patient ? parsePatientWeightKg(patient) : null;
  var kGuide = evalOut.potassiumGuidance || getPotassiumRepletionGuidance(labs.k);
  var carrier = suggestIvFluidCarrier(labs);
  var carrierNote = carrier.warnings.length ? carrier.warnings.join(' ') : '';
  var host = document.createElement('div');
  host.className = 'manejo-cad-checklist-flow';
  var stepIdx = 1;

  host.appendChild(
    buildCadEhhChecklistItem({
      id: 'fluids',
      pid: pid,
      index: stepIdx++,
      title: 'Fluidos IV',
      defaultOpen: true,
      carrierNote: carrierNote,
      orderGetter: function () {
        return cadEhhFluidSomeOrder(mode === 'ehh' ? 'ehh' : 'cad', wKg, labs);
      },
      onPendiente: function () {
        addManejoGenericPendiente('manejo-cad:fluids', 'CAD/EHH: Fluidos', labFechaNorm);
      },
    })
  );

  var kAlert =
    kGuide.active && kGuide.active.holdInsulin
      ? 'K⁺ ' +
        kGuide.kValue +
        ' mEq/L — suspender insulina hasta K⁺ > 3.3 mEq/L y reponer potasio IV.'
      : null;
  var kExtra = buildCadEhhPotassiumTableExtra(kGuide, labs);
  host.appendChild(
    buildCadEhhChecklistItem({
      id: 'potassium',
      pid: pid,
      index: stepIdx++,
      title: 'Cloruro de potasio',
      defaultOpen: !isCadStepDone(pid, 'fluids'),
      alert: kAlert,
      carrierNote: carrierNote,
      orderGetter: kGuide.active
        ? function () {
            return kRepletionToSomeOrder(kGuide.active, labs);
          }
        : null,
      extra: kGuide.active ? kExtra : null,
      onPendiente: function () {
        addManejoGenericPendiente('manejo-cad:k', 'CAD/EHH: Potasio', labFechaNorm);
      },
    })
  );

  if (wKg != null) {
    var glu = labs.glucoseMgDl;
    var algPick = document.createElement('div');
    algPick.className = 'manejo-cad-insulin-pick';
    var algLbl = document.createElement('label');
    algLbl.textContent = 'Algoritmo bomba insulina';
    var algSel = document.createElement('select');
    algSel.className = 'manejo-atb-isolate-select';
    INSULIN_PUMP_ALGORITHMS.forEach(function (alg, i) {
      var o = document.createElement('option');
      o.value = String(i);
      o.textContent = alg.label;
      algSel.appendChild(o);
    });
    algPick.appendChild(algLbl);
    algPick.appendChild(algSel);

    host.appendChild(
      buildCadEhhChecklistItem({
        id: 'insulin-pump',
        pid: pid,
        index: stepIdx++,
        title: 'Insulina — bomba (algoritmo hospital)',
        orderGetter: function () {
          return insulinPumpSomeOrder(glu, Number(algSel.value || 0));
        },
        extra: algPick,
        onPendiente: function () {
          addManejoGenericPendiente('manejo-cad:insulin-pump', 'CAD/EHH: Insulina bomba', labFechaNorm);
        },
      })
    );

    var rates =
      mode === 'ehh'
        ? [{ label: 'Insulina EHH 0.14 U/kg/h', rate: 0.14 }]
        : [
            { label: 'Insulina CAD inicio 0.1 U/kg/h', rate: 0.1 },
            { label: 'Insulina CAD al 250 mg/dL 0.05 U/kg/h', rate: 0.05 },
          ];
    rates.forEach(function (r, ri) {
      host.appendChild(
        buildCadEhhChecklistItem({
          id: 'insulin-rate-' + ri,
          pid: pid,
          index: stepIdx++,
          title: r.label,
          orderGetter: function () {
            var line = MANEJO_CALCULATORS['insulin-u-kg-h']({
              weightKg: wKg,
              unitsPerKgPerHour: r.rate,
            });
            return drugToSomeOrder(
              {
                name: 'Insulina regular',
                route: 'IV',
                adultDose: line && line.copyLine ? line.copyLine : '',
                renalNote: 'INFUSIÓN CONTINUA; REEVALUAR CON GLUCOMETRÍA CAPILAR C/1 H',
              },
              line
            );
          },
        })
      );
    });
  } else {
    var needW = document.createElement('p');
    needW.className = 'manejo-hint';
    needW.textContent = 'Registra peso en el expediente para calcular insulina.';
    host.appendChild(needW);
  }

  function appendMonitorGroup(title, items, prefix) {
    if (title) {
      var gh = document.createElement('h4');
      gh.className = 'manejo-cad-checklist-group';
      gh.textContent = title;
      host.appendChild(gh);
    }
    items.forEach(function (item) {
      host.appendChild(
        buildCadEhhChecklistItem({
          id: prefix + item.id,
          pid: pid,
          index: stepIdx++,
          title: item.study,
          orderGetter: function () {
            return labMonitorToSomeOrder(item);
          },
          onPendiente: function () {
            addManejoGenericPendiente(
              'manejo-cad:' + item.id,
              'CAD/EHH: ' + item.study,
              labFechaNorm
            );
          },
        })
      );
    });
  }

  if (mode === 'indeterminate') {
    appendMonitorGroup('Laboratorio — CAD', labMonitoringForCadEhhMode('cad'), 'lab-');
    appendMonitorGroup('Laboratorio — EHH', labMonitoringForCadEhhMode('ehh'), 'lab-');
    appendMonitorGroup('Enfermería — CAD', nursingMonitoringForCadEhhMode('cad'), 'nur-');
    appendMonitorGroup('Enfermería — EHH', nursingMonitoringForCadEhhMode('ehh'), 'nur-');
  } else {
    appendMonitorGroup('Estudios de laboratorio', labMonitoringForCadEhhMode(mode), 'lab-');
    appendMonitorGroup('Cuidados de enfermería', nursingMonitoringForCadEhhMode(mode), 'nur-');
  }

  function appendProtocolGroup(title, items) {
    if (title) {
      var gh2 = document.createElement('h4');
      gh2.className = 'manejo-cad-checklist-group';
      gh2.textContent = title;
      host.appendChild(gh2);
    }
    items.forEach(function (stepItem) {
      host.appendChild(
        buildCadEhhChecklistItem({
          id: stepItem.id,
          pid: pid,
          index: stepIdx++,
          title: stepItem.phase,
          orderGetter: function () {
            return checklistItemToSomeOrder(stepItem);
          },
          onPendiente: function () {
            var prefix = stepItem.id.indexOf('ehh') === 0 ? 'EHH: ' : 'CAD: ';
            addManejoGenericPendiente(
              'manejo-cad:' + stepItem.id,
              prefix + stepItem.phase,
              labFechaNorm
            );
          },
        })
      );
    });
  }

  if (mode === 'indeterminate') {
    appendProtocolGroup('Protocolo CAD', CAD_CHECKLIST.filter(function (x) {
      return x.id !== 'cad-fluids' && x.id !== 'cad-k' && x.id !== 'cad-insulin';
    }));
    appendProtocolGroup('Protocolo EHH', EHH_CHECKLIST.filter(function (x) {
      return x.id !== 'ehh-fluids' && x.id !== 'ehh-k' && x.id !== 'ehh-insulin';
    }));
  } else {
    appendProtocolGroup(
      null,
      checklistForCadEhhMode(mode).filter(function (x) {
        return (
          x.id.indexOf('fluids') === -1 &&
          x.id.indexOf('-k') === -1 &&
          x.id.indexOf('insulin') === -1
        );
      })
    );
  }

  return host;
}

var PUMP_REF_OPEN_KEY = 'manejoPumpRefOpen';
var PUMP_REF_ALG_KEY = 'manejoPumpRefAlg';

function getPumpRefOpen() {
  try {
    return sessionStorage.getItem(PUMP_REF_OPEN_KEY) === '1';
  } catch (_e) {
    return false;
  }
}

function setPumpRefOpen(open) {
  try {
    sessionStorage.setItem(PUMP_REF_OPEN_KEY, open ? '1' : '0');
  } catch (_e2) {}
}

function getPumpRefAlgIndex() {
  try {
    var n = Number(sessionStorage.getItem(PUMP_REF_ALG_KEY));
    return Number.isFinite(n) && n >= 0 && n < INSULIN_PUMP_ALGORITHMS.length ? n : 0;
  } catch (_e3) {
    return 0;
  }
}

function setPumpRefAlgIndex(idx) {
  try {
    sessionStorage.setItem(PUMP_REF_ALG_KEY, String(idx));
  } catch (_e4) {}
}

function buildInsulinPumpReferenceTable(algorithmIndex, glucoseMgDl) {
  var alg = INSULIN_PUMP_ALGORITHMS[algorithmIndex];
  if (!alg) return document.createElement('div');

  var lookup =
    glucoseMgDl != null && Number.isFinite(glucoseMgDl)
      ? insulinUnitsPerHourForGlucose(glucoseMgDl, algorithmIndex)
      : null;
  var activeBand = lookup && lookup.band ? lookup.band : null;

  var table = document.createElement('table');
  table.className = 'manejo-pump-ref-table';
  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  ['Glucosa (mg/dL)', 'U/h'].forEach(function (label) {
    var th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  INSULIN_PUMP_GLUCOSE_BANDS.forEach(function (band, i) {
    var tr = document.createElement('tr');
    if (activeBand === band.label) tr.className = 'manejo-pump-ref-row--active';
    var rate = alg.rates[i];
    var tdG = document.createElement('td');
    tdG.textContent = band.label;
    var tdR = document.createElement('td');
    tdR.textContent = rate == null ? 'Suspender' : String(rate);
    if (band.suspend) tdR.className = 'manejo-pump-ref-cell--suspend';
    tr.appendChild(tdG);
    tr.appendChild(tdR);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/** Panel colapsable — tablas bomba insulina (referencia, no SOME). */
function buildInsulinPumpReferencePanel() {
  var details = document.createElement('details');
  details.className = 'manejo-pump-ref';
  details.open = getPumpRefOpen();

  var summary = document.createElement('summary');
  summary.className = 'manejo-pump-ref-summary';
  var summaryTitle = document.createElement('span');
  summaryTitle.className = 'manejo-pump-ref-summary-title';
  summaryTitle.textContent = 'Tablas bomba insulina';
  summary.appendChild(summaryTitle);
  details.appendChild(summary);

  var body = document.createElement('div');
  body.className = 'manejo-pump-ref-body';

  var hint = document.createElement('p');
  hint.className = 'manejo-pump-ref-hint';
  hint.textContent =
    'Consulta rápida como las tablas en islas — no genera pedido SOME. Reevaluar cada 1 h con glucometría capilar; suspender si glucosa < 70 mg/dL.';
  body.appendChild(hint);

  var algNav = document.createElement('div');
  algNav.className = 'manejo-pump-ref-alg-nav';
  algNav.setAttribute('role', 'tablist');
  algNav.setAttribute('aria-label', 'Algoritmo de bomba');

  var activeAlg = getPumpRefAlgIndex();
  var tableHost = document.createElement('div');
  tableHost.className = 'manejo-pump-ref-table-host';

  var gluRow = document.createElement('div');
  gluRow.className = 'manejo-pump-ref-glu-row';
  var gluLbl = document.createElement('label');
  gluLbl.className = 'manejo-pump-ref-glu-label';
  gluLbl.textContent = 'Resaltar fila según glucosa';
  var gluInp = document.createElement('input');
  gluInp.type = 'number';
  gluInp.className = 'manejo-filter-search-input manejo-pump-ref-glu-input';
  gluInp.placeholder = 'mg/dL';
  gluInp.min = '0';
  gluInp.setAttribute('aria-label', 'Glucosa capilar mg/dL');
  gluLbl.appendChild(gluInp);
  gluRow.appendChild(gluLbl);

  var readout = document.createElement('p');
  readout.className = 'manejo-pump-ref-readout';
  readout.hidden = true;
  gluRow.appendChild(readout);
  body.appendChild(gluRow);

  function paintTable() {
    while (tableHost.firstChild) tableHost.removeChild(tableHost.firstChild);
    var g = Number(gluInp.value);
    tableHost.appendChild(
      buildInsulinPumpReferenceTable(activeAlg, Number.isFinite(g) ? g : null)
    );

    if (Number.isFinite(g)) {
      var hit = insulinUnitsPerHourForGlucose(g, activeAlg);
      readout.hidden = false;
      if (hit.suspend) {
        readout.textContent = g + ' mg/dL → Suspender infusión';
        readout.className = 'manejo-pump-ref-readout manejo-pump-ref-readout--warn';
      } else if (hit.unitsPerHour != null) {
        readout.textContent =
          g + ' mg/dL → ' + hit.unitsPerHour + ' U/h (banda ' + hit.band + ')';
        readout.className = 'manejo-pump-ref-readout';
      } else {
        readout.hidden = true;
      }
    } else {
      readout.hidden = true;
    }
  }

  INSULIN_PUMP_ALGORITHMS.forEach(function (alg, idx) {
    var tab = document.createElement('button');
    tab.type = 'button';
    tab.className =
      'manejo-pump-ref-alg-tab' + (idx === activeAlg ? ' manejo-pump-ref-alg-tab--active' : '');
    tab.textContent = alg.label;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', idx === activeAlg ? 'true' : 'false');
    tab.addEventListener('click', function () {
      activeAlg = idx;
      setPumpRefAlgIndex(idx);
      algNav.querySelectorAll('.manejo-pump-ref-alg-tab').forEach(function (btn, i) {
        var on = i === idx;
        btn.classList.toggle('manejo-pump-ref-alg-tab--active', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      paintTable();
    });
    algNav.appendChild(tab);
  });
  body.appendChild(algNav);
  body.appendChild(tableHost);

  var foot = document.createElement('div');
  foot.className = 'manejo-pump-ref-foot';
  var copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'manejo-copy-btn primary';
  copyBtn.textContent = 'Copiar tabla';
  copyBtn.addEventListener('click', function () {
    copyToClipboard(buildInsulinPumpTableText(activeAlg));
  });
  foot.appendChild(copyBtn);
  body.appendChild(foot);

  details.appendChild(body);
  gluInp.addEventListener('input', paintTable);
  details.addEventListener('toggle', function () {
    setPumpRefOpen(details.open);
  });
  paintTable();
  return details;
}

function renderManejoCadEhh(panel, pid, patient) {
  while (panel.firstChild) panel.removeChild(panel.firstChild);

  var root = document.createElement('div');
  root.className = 'manejo-root manejo-root--cad-ehh';

  var labFechaNorm = pid ? getProtocolLabFechaNorm(pid) : '';
  var latest = null;
  if (pid) {
    var hist = rt.ensureParsedLabHistory(pid);
    var ordered = sortLabHistoryChronological(hist);
    latest = ordered[0] || null;
  }

  if (!pid || !latest) {
    var emp = document.createElement('p');
    emp.className = 'manejo-empty';
    emp.textContent = pid
      ? 'Sin laboratorio reciente — envía BH/QS/gasometría para sugerir CAD vs EHH.'
      : 'Selecciona un paciente para ver el protocolo CAD/EHH.';
    root.appendChild(emp);
    panel.appendChild(root);
    return;
  }

  var evalOut = evaluateCadEhh({
    parsed: latest.parsed,
    parsedBySection: latest.parsedBySection,
    patient: patient,
  });
  var mode = getCadEhhModeOverride(evalOut.suggestedMode);
  var L = evalOut.labs || {};
  var wKg = patient ? parsePatientWeightKg(patient) : null;

  var disc = document.createElement('p');
  disc.className = 'manejo-hint manejo-cad-disclaimer';
  disc.textContent = evalOut.disclaimer;
  root.appendChild(disc);

  var hero = document.createElement('section');
  hero.className = 'manejo-cad-hero';

  var heroTop = document.createElement('div');
  heroTop.className = 'manejo-cad-hero-top';
  var heroTitle = document.createElement('div');
  heroTitle.className = 'manejo-cad-hero-title-wrap';
  var h2 = document.createElement('h2');
  h2.className = 'manejo-cad-hero-title';
  h2.textContent = mode === 'ehh' ? 'Estado hiperosmolar' : mode === 'cad' ? 'Cetoacidosis' : 'CAD / EHH';
  heroTitle.appendChild(h2);
  if (evalOut.suggestedMode !== mode) {
    var overrideHint = document.createElement('p');
    overrideHint.className = 'manejo-cad-mode-override-hint';
    overrideHint.textContent =
      'Sugerencia del sistema: ' +
      (evalOut.suggestedMode === 'cad'
        ? 'CAD'
        : evalOut.suggestedMode === 'ehh'
          ? 'EHH'
          : 'Indeterminado') +
      '. ' +
      evalOut.modeHint;
    heroTitle.appendChild(overrideHint);
  } else {
    var hint = document.createElement('p');
    hint.className = 'manejo-cad-mode-hint';
    hint.textContent = evalOut.modeHint;
    heroTitle.appendChild(hint);
  }
  heroTop.appendChild(heroTitle);

  var modeNav = document.createElement('div');
  modeNav.className = 'manejo-cad-mode-nav';
  modeNav.setAttribute('role', 'group');
  modeNav.setAttribute('aria-label', 'Modo protocolo');
  [
    { id: 'cad', label: 'CAD' },
    { id: 'ehh', label: 'EHH' },
    { id: 'indeterminate', label: 'Indeterminado' },
  ].forEach(function (opt) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'manejo-cad-mode-btn' +
      (mode === opt.id ? ' manejo-cad-mode-btn--active' : '') +
      (evalOut.suggestedMode === opt.id ? ' manejo-cad-mode-btn--suggested' : '');
    btn.textContent =
      opt.label + (evalOut.suggestedMode === opt.id ? ' · sugerido' : '');
    btn.setAttribute('aria-pressed', mode === opt.id ? 'true' : 'false');
    btn.addEventListener('click', function () {
      if (mode === opt.id) return;
      setCadEhhMode(opt.id);
      renderManejoCadEhh(panel, pid, patient);
    });
    modeNav.appendChild(btn);
  });
  heroTop.appendChild(modeNav);
  hero.appendChild(heroTop);

  var labGrid = document.createElement('div');
  labGrid.className = 'manejo-cad-lab-grid';
  [
    ['Glucosa', L.glucoseMgDl != null ? L.glucoseMgDl + ' mg/dL' : '—'],
    ['pH', L.ph != null ? String(L.ph) : '—'],
    ['HCO₃', L.hco3 != null ? L.hco3 + ' mEq/L' : '—'],
    ['K⁺', L.k != null ? L.k + ' mEq/L' : '—'],
    ['Cetonas', L.ketonesPositive ? 'Positivas' : 'No positivas'],
    ['Anion gap', L.anionGap != null ? String(L.anionGap) : '—'],
  ].forEach(function (pair) {
    var cell = document.createElement('div');
    cell.className = 'manejo-cad-lab-cell';
    var lbl = document.createElement('span');
    lbl.className = 'manejo-cad-lab-label';
    lbl.textContent = pair[0];
    var val = document.createElement('span');
    val.className = 'manejo-cad-lab-val';
    val.textContent = pair[1];
    cell.appendChild(lbl);
    cell.appendChild(val);
    labGrid.appendChild(cell);
  });
  hero.appendChild(labGrid);

  if (mode === 'cad' && evalOut.resolutionChecks) {
    var rc = evalOut.resolutionChecks;
    var res = document.createElement('ul');
    res.className = 'manejo-cad-resolution';
    [
      ['pH > 7.3', rc.phOk],
      ['HCO₃ ≥ 18', rc.hco3Ok],
      ['Glucosa < 200', rc.glucoseOk],
      ['Gap normalizado', rc.agOk],
    ].forEach(function (row) {
      var li = document.createElement('li');
      li.className = 'manejo-cad-resolution-item' + (row[1] ? ' manejo-cad-resolution-item--ok' : '');
      li.textContent = (row[1] ? '✓ ' : '○ ') + row[0];
      res.appendChild(li);
    });
    hero.appendChild(res);
  }

  root.appendChild(hero);

  if (wKg == null) {
    var wBan = document.createElement('section');
    wBan.className = 'manejo-banner';
    wBan.innerHTML =
      '<span class="manejo-banner-head">Registra peso en el expediente para calcular insulina U/kg/h.</span>';
    root.appendChild(wBan);
  }

  var workflow = document.createElement('div');
  workflow.className = 'manejo-cad-workflow';
  workflow.appendChild(buildCadEhhChecklistWorkflow(mode, pid, patient, evalOut, labFechaNorm));
  root.appendChild(workflow);

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
  nav.className = 'manejo-subtabs rpc-subtab-bar';
  nav.setAttribute('role', 'tablist');
  nav.setAttribute('aria-label', 'Secciones de manejo');

  var panelsWrap = document.createElement('div');
  panelsWrap.className = 'manejo-subpanels';

  var panels = {};
  MANEJO_SUBTABS.forEach(function (tab) {
    var isActive = tab.id === activeId;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'manejo-subtab rpc-subtab' + (isActive ? ' manejo-subtab--active active' : '');
    btn.textContent = tab.label;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    btn.setAttribute('aria-controls', 'manejo-subpanel-' + tab.id);
    btn.tabIndex = isActive ? 0 : -1;
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
  requestAnimationFrame(function () {
    syncAllSubTabIndicators();
  });
}

export const manejoWindowHandlers = {
  renderManejo,
};
