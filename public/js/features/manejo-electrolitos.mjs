/**
 * Subpanel Electrolitos — tarjetas por ion y + Pendiente.
 */
import {
  evaluateElectrolyteManejo,
  parsePatientWeightKg,
} from '../electrolyte-manejo.mjs';
import { shouldAddLabSuggestionTodo } from '../lab-clinical-suggestions.mjs';
import { storage } from '../storage.js';
import { normalizeFechaLabHistory, sortLabHistoryChronological } from '../tend-core.mjs';

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

export function registerManejoElectrolitosRuntime(partial) {
  if (partial && typeof partial === 'object') Object.assign(rt, partial);
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

function addManejoPendiente(row, labFechaNorm) {
  var pid = rt.getActiveId();
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

/**
 * @param {HTMLElement} panelEl
 * @param {string|null} pid
 * @param {object|null} patient
 * @param {{
 *   esc(s: string): string,
 *   buildKvBlock(label: string, value: string, opts?: object): HTMLElement,
 *   buildSomeOrderArticle(orderOrGetter: unknown, oi: number): Node,
 *   isManejoSomeCopyUiEnabled(): boolean,
 * }} ui
 */
export function renderManejoElectrolitos(panelEl, pid, patient, ui) {
  ui = ui || {};
  var esc = ui.esc || function (s) { return String(s || ''); };
  var buildKvBlock = ui.buildKvBlock;
  var buildSomeOrderArticle = ui.buildSomeOrderArticle;
  var isManejoSomeCopyUiEnabled =
    typeof ui.isManejoSomeCopyUiEnabled === 'function' ? ui.isManejoSomeCopyUiEnabled : function () {
      return false;
    };

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
  var viaEmpty = patient.viaAcceso == null || String(patient.viaAcceso).trim() === '';
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
        if (typeof window.updatePatient === 'function') window.updatePatient('peso', inp.value);
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
        if (typeof window.updatePatient === 'function') window.updatePatient('viaAcceso', sel.value);
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
    (latest.hora ? ' · <span>' + esc(String(latest.hora).slice(0, 8)) + '</span>' : '');
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
    cards.appendChild(
      buildManejoCard(row, labFechaNorm, {
        buildKvBlock: buildKvBlock,
        buildSomeOrderArticle: buildSomeOrderArticle,
        isManejoSomeCopyUiEnabled: isManejoSomeCopyUiEnabled,
      })
    );
  });

  root.appendChild(cards);
  panelEl.appendChild(root);
}

/**
 * @param {object} row
 * @param {string} labFechaNorm
 * @param {object} ui
 */
function buildManejoCard(row, labFechaNorm, ui) {
  var buildKvBlock = ui.buildKvBlock;
  var buildSomeOrderArticle = ui.buildSomeOrderArticle;
  var isManejoSomeCopyUiEnabled = ui.isManejoSomeCopyUiEnabled;

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
  var hasSome = isManejoSomeCopyUiEnabled() && someOrders.length > 0;
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
