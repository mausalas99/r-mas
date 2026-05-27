/**
 * Filtros de infusiones, búsqueda y panel de referencia bomba insulina.
 */
import {
  loadProtoFavorites,
  loadProtoRecentIds,
} from '../manejo-protocol-favorites.mjs';
import {
  MANEJO_PROTOCOL_CATEGORIES,
} from '../manejo-protocols-catalog.mjs';
import {
  buildInsulinPumpTableText,
  INSULIN_PUMP_ALGORITHMS,
  INSULIN_PUMP_GLUCOSE_BANDS,
  insulinUnitsPerHourForGlucose,
} from '../manejo-insulin-pump-algorithms.mjs';

/** @type {{ attachCopy?: (btn: HTMLElement, getter: () => string) => void, copyToClipboard?: (txt: string) => void }} */
var toolbarDeps = {};

/**
 * @param {{ attachCopy?: (btn: HTMLElement, getter: () => string) => void, copyToClipboard?: (txt: string) => void }} deps
 */
export function configureManejoProtoToolbar(deps) {
  toolbarDeps = deps && typeof deps === 'object' ? deps : {};
}

function copyToClipboard(txt) {
  if (typeof toolbarDeps.copyToClipboard === 'function') {
    toolbarDeps.copyToClipboard(txt);
    return;
  }
  var t = String(txt || '');
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(t);
    }
  } catch (_e) {}
}

var PROTO_FILTER_KEY = 'manejoProtoCategory';
var PROTO_EXTRA_FILTERS_KEY = 'manejoProtoExtraFilters';

export function getProtoExtraFilters() {
  try {
    var raw = sessionStorage.getItem(PROTO_EXTRA_FILTERS_KEY);
    var parsed = raw ? JSON.parse(raw) : null;
    return {
      calcOnly: !!(parsed && parsed.calcOnly),
      useCategory: parsed && parsed.useCategory ? String(parsed.useCategory) : 'all',
    };
  } catch (_e) {
    return { calcOnly: false, useCategory: 'all' };
  }
}

export function setProtoExtraFilters(patch) {
  var next = Object.assign(getProtoExtraFilters(), patch || {});
  try {
    sessionStorage.setItem(PROTO_EXTRA_FILTERS_KEY, JSON.stringify(next));
  } catch (_e2) {}
}

export function getProtoCategoryFilter() {
  try {
    var s = sessionStorage.getItem(PROTO_FILTER_KEY);
    if (!s || s === 'all') return 'all';
    if (s === 'favorites' || s === 'recent') return s;
    if (MANEJO_PROTOCOL_CATEGORIES.some(function (c) { return c.id === s; })) return s;
  } catch (_e3) {}
  return 'all';
}

export function setProtoCategoryFilter(id) {
  try {
    sessionStorage.setItem(PROTO_FILTER_KEY, id || 'all');
  } catch (_e) {}
}

export function categoryLabelFor(catId) {
  var hit = MANEJO_PROTOCOL_CATEGORIES.find(function (c) {
    return c.id === catId;
  });
  return hit ? hit.label : catId;
}

export function protocolMatchesSearch(entry, q) {
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

export function filterProtocolEntries(entries, opts) {
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
    if (extra.useCategory && extra.useCategory !== 'all') {
      if ((entry.useCategories || []).indexOf(extra.useCategory) < 0) return false;
    }
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

export function buildManejoSearchInput(placeholder, ariaLabel) {
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

export function buildManejoProtoToolbarShell(extraClass) {
  var toolbar = document.createElement('div');
  toolbar.className = 'manejo-proto-toolbar-v2 manejo-proto-toolbar-card';
  if (extraClass) toolbar.className += ' ' + extraClass;
  return toolbar;
}

export function buildManejoProtoSearchRow() {
  var searchRow = document.createElement('div');
  searchRow.className = 'manejo-proto-search-row';
  return searchRow;
}

export function buildManejoProtoCountBadge() {
  var badge = document.createElement('span');
  badge.className = 'manejo-proto-count';
  badge.setAttribute('aria-live', 'polite');
  return badge;
}

export function buildManejoProtoFiltersRow() {
  var row = document.createElement('div');
  row.className = 'manejo-proto-filters-row';
  return row;
}

export function buildManejoProtoSegmentGroup(ariaLabel) {
  var seg = document.createElement('div');
  seg.className = 'manejo-proto-segment';
  seg.setAttribute('role', 'group');
  seg.setAttribute('aria-label', ariaLabel);
  return seg;
}

export function buildManejoProtoSegmentChip(label, isActive, onClick, opts) {
  opts = opts || {};
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className =
    'manejo-proto-chip manejo-proto-chip--segment' +
    (opts.extraClass ? ' ' + opts.extraClass : '') +
    (isActive ? ' manejo-proto-chip--active' : '');
  btn.textContent = label;
  if (opts.title) btn.title = opts.title;
  btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  btn.addEventListener('click', onClick);
  return btn;
}

export function buildManejoProtoToggleChip(label, isActive, onClick) {
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'manejo-proto-toggle' + (isActive ? ' manejo-proto-toggle--active' : '');
  btn.textContent = label;
  btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  btn.addEventListener('click', onClick);
  return btn;
}

export function buildManejoProtoFilterMenu(opts) {
  opts = opts || {};
  var activeId = opts.activeId == null ? 'all' : opts.activeId;
  var selectedId = activeId;

  function labelFor(id) {
    var hit = (opts.options || []).find(function (o) {
      return o.id === id;
    });
    if (hit) return hit.label;
    return opts.defaultOptionLabel || 'Todos';
  }

  var wrap = document.createElement('div');
  wrap.className = 'manejo-proto-filter';
  if (opts.wrapClass) wrap.className += ' ' + opts.wrapClass;
  if (activeId !== 'all' && opts.activeAccentClass) wrap.className += ' ' + opts.activeAccentClass;

  if (opts.fieldLabel) {
    var fieldLbl = document.createElement('span');
    fieldLbl.className = 'manejo-proto-filter-label';
    fieldLbl.textContent = opts.fieldLabel;
    wrap.appendChild(fieldLbl);
  }

  var menu = document.createElement('div');
  menu.className = 'manejo-proto-filter-menu';
  if (activeId !== 'all' && opts.activeAccentClass) menu.className += ' ' + opts.activeAccentClass;

  var trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'manejo-proto-filter-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-label', opts.ariaLabel || 'Filtrar');

  var triggerDot = document.createElement('span');
  triggerDot.className = 'manejo-proto-filter-trigger-dot';
  triggerDot.hidden = activeId === 'all';

  var triggerText = document.createElement('span');
  triggerText.className = 'manejo-proto-filter-trigger-text';
  triggerText.textContent = labelFor(activeId);

  var triggerChevron = document.createElement('span');
  triggerChevron.className = 'manejo-proto-filter-trigger-chevron';
  triggerChevron.setAttribute('aria-hidden', 'true');
  triggerChevron.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';

  trigger.appendChild(triggerDot);
  trigger.appendChild(triggerText);
  trigger.appendChild(triggerChevron);

  var panel = document.createElement('div');
  panel.className = 'manejo-proto-filter-panel';
  panel.setAttribute('role', 'listbox');
  panel.setAttribute('aria-label', opts.ariaLabel || 'Filtros');
  panel.setAttribute('aria-hidden', 'true');

  var outsideHandler = null;
  var keyHandler = null;

  function setOpen(open) {
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.classList.toggle('manejo-proto-filter-menu--open', open);
    if (!open) {
      if (outsideHandler) {
        document.removeEventListener('click', outsideHandler);
        outsideHandler = null;
      }
      if (keyHandler) {
        document.removeEventListener('keydown', keyHandler);
        keyHandler = null;
      }
    }
  }

  (opts.options || []).forEach(function (opt) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'manejo-proto-filter-option';
    if (opt.accentClass) btn.className += ' ' + opt.accentClass;
    if (activeId === opt.id) btn.className += ' manejo-proto-filter-option--active';
    btn.setAttribute('role', 'option');
    btn.setAttribute('data-filter-id', opt.id);
    btn.setAttribute('aria-selected', activeId === opt.id ? 'true' : 'false');

    var dot = document.createElement('span');
    dot.className =
      'manejo-proto-filter-option-dot' + (opt.id === 'all' ? ' manejo-proto-filter-option-dot--all' : '');
    if (opt.accentClass) dot.className += ' ' + opt.accentClass;
    btn.appendChild(dot);

    var txtWrap = document.createElement('span');
    txtWrap.className = 'manejo-proto-filter-option-copy';
    var txt = document.createElement('span');
    txt.className = 'manejo-proto-filter-option-label';
    txt.textContent = opt.label;
    txtWrap.appendChild(txt);
    if (opt.hint) {
      var hint = document.createElement('span');
      hint.className = 'manejo-proto-filter-option-hint';
      hint.textContent = opt.hint;
      txtWrap.appendChild(hint);
    }
    btn.appendChild(txtWrap);

    if (activeId === opt.id) {
      var check = document.createElement('span');
      check.className = 'manejo-proto-filter-option-check';
      check.textContent = '✓';
      btn.appendChild(check);
    }

    btn.addEventListener('click', function () {
      setOpen(false);
      if (opt.id !== selectedId && typeof opts.onSelect === 'function') opts.onSelect(opt.id);
    });
    panel.appendChild(btn);
  });

  trigger.addEventListener('click', function (e) {
    e.stopPropagation();
    var willOpen = !menu.classList.contains('manejo-proto-filter-menu--open');
    setOpen(willOpen);
    if (willOpen) {
      outsideHandler = function (ev) {
        if (!menu.contains(ev.target)) setOpen(false);
      };
      keyHandler = function (ev) {
        if (ev.key === 'Escape') setOpen(false);
      };
      setTimeout(function () {
        document.addEventListener('click', outsideHandler);
        document.addEventListener('keydown', keyHandler);
      }, 0);
    }
  });

  menu.appendChild(trigger);
  menu.appendChild(panel);
  wrap.appendChild(menu);

  wrap.syncActive = function (id, accentClass) {
    selectedId = id;
    triggerText.textContent = labelFor(id);
    triggerDot.hidden = id === 'all';
    wrap.className = 'manejo-proto-filter';
    if (opts.wrapClass) wrap.className += ' ' + opts.wrapClass;
    menu.className = 'manejo-proto-filter-menu';
    if (id !== 'all' && accentClass) {
      wrap.className += ' ' + accentClass;
      menu.className += ' ' + accentClass;
    }
    panel.querySelectorAll('.manejo-proto-filter-option').forEach(function (btn) {
      var optId = btn.getAttribute('data-filter-id');
      var isActive = optId === id;
      btn.classList.toggle('manejo-proto-filter-option--active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      var check = btn.querySelector('.manejo-proto-filter-option-check');
      if (isActive && !check) {
        check = document.createElement('span');
        check.className = 'manejo-proto-filter-option-check';
        check.textContent = '✓';
        btn.appendChild(check);
      } else if (!isActive && check) {
        check.remove();
      }
    });
  };

  return wrap;
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
export function buildInsulinPumpReferencePanel() {
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
    if (details.open) paintTable();
  });
  if (details.open) paintTable();
  return details;
}