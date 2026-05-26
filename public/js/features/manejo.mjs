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

function renderManejoProtocolos(panel, pid, patient) {
  var p = document.createElement('p');
  p.className = 'manejo-hint';
  p.textContent = 'En construcción';
  panel.appendChild(p);
}

function renderManejoAtb(panel, pid, patient) {
  var p = document.createElement('p');
  p.className = 'manejo-hint';
  p.textContent = 'En construcción';
  panel.appendChild(p);
}

function renderManejoCadEhh(panel, pid, patient) {
  var p = document.createElement('p');
  p.className = 'manejo-hint';
  p.textContent = 'En construcción';
  panel.appendChild(p);
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
