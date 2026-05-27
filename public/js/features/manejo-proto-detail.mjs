/**
 * Protocol / infusion detail panels, calculators, and catalog lookups for Manejo.
 */
import { formatSomeBlock, parsePatientWeightKg, toSomeUpper } from '../electrolyte-manejo.mjs';
import { MANEJO_CALCULATORS } from '../manejo-calculators.mjs';
import { protoCategoryCssClass } from '../manejo-proto-category-colors.mjs';
import {
  adminNoteOverlapsEntryNotes,
  buildProtocolAdminElement,
} from '../manejo-proto-admin-display.mjs';
import {
  applyEntryOverrides,
  loadCustomProtocols,
} from '../manejo-custom-protocols.mjs';
import {
  getDoseUnitMode,
  resolveProtocolWithDoseMode,
  setDoseUnitMode,
} from '../manejo-dose-units.mjs';
import {
  enrichProtocolEntry,
  MANEJO_PROTOCOL_USE_CATEGORIES,
  pathologiesLinkedToProtocol,
  useCategoryLabelFor,
} from '../manejo-protocol-links.mjs';
import { MANEJO_PATHOLOGIES } from '../manejo-pathology-catalog.mjs';
import {
  MANEJO_PROTOCOL_CATEGORIES,
  MANEJO_PROTOCOLS,
} from '../manejo-protocols-catalog.mjs';
import { protocolToSomeOrder } from '../manejo-some-format.mjs';
import { normalizeFechaLabHistory, sortLabHistoryChronological } from '../tend-core.mjs';
import {
  buildKvBlock,
  createManejoSomeUi,
  isManejoSomeCopyUiEnabled,
} from './manejo-some-ui.mjs';

/** @type {{
 *   ensureParsedLabHistory?(pid: string): unknown[],
 *   showToast?(msg: string, type?: string): void,
 * }} */
var rt = {
  ensureParsedLabHistory() {
    return [];
  },
  showToast() {},
};

/** @type {{
 *   onOpenPathology?: (id: string) => void,
 *   appendManejoSomeOrderArticle?: (parent: HTMLElement, orderOrGetter: unknown, index?: number) => void,
 *   attachCopy?: (btn: HTMLElement, getter: () => string) => void,
 * }} */
var protoDetailDeps = {};

/**
 * @param {{ ensureParsedLabHistory?: (pid: string) => unknown[], showToast?: (msg: string, type?: string) => void }} partial
 */
export function registerManejoProtoDetailRuntime(partial) {
  if (partial && typeof partial === 'object') Object.assign(rt, partial);
}

/**
 * @param {{
 *   onOpenPathology?: (id: string) => void,
 *   appendManejoSomeOrderArticle?: (parent: HTMLElement, orderOrGetter: unknown, index?: number) => void,
 *   attachCopy?: (btn: HTMLElement, getter: () => string) => void,
 * }} deps
 */
export function configureManejoProtoDetail(deps) {
  protoDetailDeps = deps && typeof deps === 'object' ? deps : {};
  refreshSomeUi();
}

function refreshSomeUi() {
  _someUi = createManejoSomeUi({
    attachCopy: protoDetailDeps.attachCopy || attachCopy,
  });
  buildSomeOrderArticle = _someUi.buildSomeOrderArticle;
}

function categoryLabelFor(catId) {
  var hit = MANEJO_PROTOCOL_CATEGORIES.find(function (c) {
    return c.id === catId;
  });
  return hit ? hit.label : catId;
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
  if (protoDetailDeps.attachCopy) {
    protoDetailDeps.attachCopy(btn, getter);
    return;
  }
  btn.addEventListener('click', function () {
    copyToClipboard(getter());
  });
}

var _someUi = createManejoSomeUi({ attachCopy: attachCopy });
var buildSomeOrderArticle = _someUi.buildSomeOrderArticle;

function defaultAppendManejoSomeOrderArticle(parent, orderOrGetter, index) {
  if (!isManejoSomeCopyUiEnabled() || !parent) return;
  parent.appendChild(buildSomeOrderArticle(orderOrGetter, index == null ? 0 : index));
}

export function appendManejoSomeOrderArticle(parent, orderOrGetter, index) {
  if (typeof protoDetailDeps.appendManejoSomeOrderArticle === 'function') {
    protoDetailDeps.appendManejoSomeOrderArticle(parent, orderOrGetter, index);
    return;
  }
  defaultAppendManejoSomeOrderArticle(parent, orderOrGetter, index);
}

function openManejoPathology(pathologyId) {
  if (typeof protoDetailDeps.onOpenPathology === 'function') {
    protoDetailDeps.onOpenPathology(pathologyId);
  }
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

export function buildProtocolCopyText(entry, calcResult, doseMode, weightKg) {
  var resolved = resolveProtocolWithDoseMode(
    entry,
    doseMode || getDoseUnitMode(),
    weightKg != null ? weightKg : undefined
  );
  return formatSomeBlock(protocolToSomeOrder(resolved, calcResult));
}

function buildManejoDoseUnitSwitch(entry, patient, onChange) {
  var wrap = document.createElement('div');
  wrap.className = 'manejo-dose-unit-switch';
  var label = document.createElement('span');
  label.className = 'manejo-dose-unit-switch-label';
  label.textContent = 'Indicar dosis como:';
  wrap.appendChild(label);

  var seg = document.createElement('div');
  seg.className = 'manejo-dose-unit-switch-seg';
  seg.setAttribute('role', 'group');
  seg.setAttribute('aria-label', 'Unidad de dosis');

  var current = getDoseUnitMode();
  var wKg = patient ? parsePatientWeightKg(patient) : null;

  function makeBtn(mode, text) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'manejo-dose-unit-switch-btn' + (current === mode ? ' manejo-dose-unit-switch-btn--active' : '');
    btn.textContent = text;
    btn.setAttribute('aria-pressed', current === mode ? 'true' : 'false');
    btn.addEventListener('click', function () {
      setDoseUnitMode(mode);
      onChange(mode);
    });
    seg.appendChild(btn);
  }

  makeBtn('hu', 'mcg/min (HU)');
  makeBtn('standard', 'mcg/kg/min');
  wrap.appendChild(seg);

  if (wKg != null && entry.doseUnitSwitch && entry.doseUnitSwitch.perKgRange) {
    var hint = document.createElement('p');
    hint.className = 'manejo-hint manejo-dose-unit-switch-hint';
    hint.textContent = 'Peso paciente: ' + wKg + ' kg — en modo estándar se muestra equivalencia en mcg/min.';
    wrap.appendChild(hint);
  }

  return wrap;
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

export function buildManejoCalcDrawer(calcId, entry, patient) {
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

export function getAllManejoProtocols() {
  return MANEJO_PROTOCOLS.map(function (entry) {
    return applyEntryOverrides(enrichProtocolEntry(entry));
  }).concat(
    loadCustomProtocols().map(function (entry) {
      return enrichProtocolEntry(entry);
    })
  );
}

export function truncateProtoSnippet(text, maxLen) {
  var s = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return '—';
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + '…';
}

export function manejoCalcIconHtml() {
  return (
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
    '<rect x="5" y="3" width="14" height="18" rx="2"/>' +
    '<path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M16 15h0M8 19h8"/>' +
    '</svg>'
  );
}

export function findProtocolEntryById(id, allProtocols) {
  if (!id) return null;
  return (
    (allProtocols || getAllManejoProtocols()).find(function (p) {
      return p.id === id;
    }) || null
  );
}

function buildStanfordDetailPanel(entry) {
  var wrap = document.createElement('div');
  wrap.className = 'manejo-proto-detail ' + protoCategoryCssClass(entry.category);

  var head = document.createElement('header');
  head.className = 'manejo-proto-detail-head';
  var title = document.createElement('h3');
  title.className = 'manejo-proto-detail-title';
  title.textContent = entry.title;
  head.appendChild(title);
  var cat = document.createElement('span');
  cat.className = 'manejo-proto-detail-cat ' + protoCategoryCssClass(entry.category);
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
    if (isManejoSomeCopyUiEnabled()) {
      var cbtn = document.createElement('button');
      cbtn.type = 'button';
      cbtn.className = 'manejo-copy-btn';
      cbtn.textContent = 'Copiar';
      attachCopy(cbtn, function () {
        return toSomeUpper(comp.someText || '');
      });
      inner.appendChild(cbtn);
    }
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
  if (isManejoSomeCopyUiEnabled()) {
    var copyAll = document.createElement('button');
    copyAll.type = 'button';
    copyAll.className = 'manejo-copy-btn btn-med-secondary';
    copyAll.textContent = 'Copiar enjuague';
    attachCopy(copyAll, function () {
      return toSomeUpper(entry.copyTemplate || '');
    });
    foot.appendChild(copyAll);
    wrap.appendChild(foot);
  }

  return { root: wrap, getCalcResult: function () { return null; } };
}

export function buildProtocolDetailPanel(entry, patient, panelOpts) {
  panelOpts = panelOpts || {};
  if (entry.isComponentGroup) {
    return buildStanfordDetailPanel(entry);
  }

  var wrap = document.createElement('div');
  wrap.className = 'manejo-proto-detail ' + protoCategoryCssClass(entry.category);
  if (panelOpts.embed) wrap.className += ' manejo-proto-detail--embed';

  if (!panelOpts.embed) {
    var head = document.createElement('header');
    head.className = 'manejo-proto-detail-head';
    var title = document.createElement('h3');
    title.className = 'manejo-proto-detail-title';
    title.textContent = entry.title;
    head.appendChild(title);
    var cat = document.createElement('span');
    cat.className = 'manejo-proto-detail-cat ' + protoCategoryCssClass(entry.category);
    cat.textContent = categoryLabelFor(entry.category);
    head.appendChild(cat);
    wrap.appendChild(head);
  }

  var doseMode = getDoseUnitMode();
  var wKg = patient ? parsePatientWeightKg(patient) : null;
  var resolvedEntry = resolveProtocolWithDoseMode(entry, doseMode, wKg);

  var indicationBlock = document.createElement('div');
  indicationBlock.className = 'manejo-proto-indication-block';
  wrap.appendChild(indicationBlock);

  var calcDrawer = null;
  if (entry.calculatorId) {
    calcDrawer = buildManejoCalcDrawer(entry.calculatorId, entry, patient);
    calcDrawer.drawer.hidden = false;
    calcDrawer.drawer.classList.add('manejo-proto-detail-calc');
    wrap.appendChild(calcDrawer.drawer);
  }

  function renderAdminBlock() {
    while (indicationBlock.firstChild) indicationBlock.removeChild(indicationBlock.firstChild);
    resolvedEntry = resolveProtocolWithDoseMode(entry, doseMode, wKg);
    var calcResult = calcDrawer ? calcDrawer.getCalcResult() : null;
    var order = protocolToSomeOrder(resolvedEntry, calcResult);
    indicationBlock.appendChild(
      buildProtocolAdminElement(resolvedEntry, order, {
        compact: !!panelOpts.embed,
      })
    );
  }
  renderAdminBlock();

  var switchHost = document.createElement('div');
  if (entry.doseUnitSwitch) {
    wrap.appendChild(switchHost);
  }

  var hideSomeOrder = !!panelOpts.hideSomeOrder;
  var someHost = null;
  if (!hideSomeOrder) {
    someHost = document.createElement('div');
    someHost.className = 'manejo-proto-some-host';
    wrap.appendChild(someHost);
  }

  function renderSomeBlock() {
    if (hideSomeOrder || !someHost) return;
    while (someHost.firstChild) someHost.removeChild(someHost.firstChild);
    appendManejoSomeOrderArticle(
      someHost,
      function () {
        var r = calcDrawer ? calcDrawer.getCalcResult() : null;
        return protocolToSomeOrder(
          resolveProtocolWithDoseMode(entry, doseMode, wKg),
          r
        );
      },
      0
    );
  }

  function renderDoseSwitch() {
    if (!entry.doseUnitSwitch) return;
    while (switchHost.firstChild) switchHost.removeChild(switchHost.firstChild);
    switchHost.appendChild(
      buildManejoDoseUnitSwitch(entry, patient, function (mode) {
        doseMode = mode;
        renderDoseSwitch();
        renderAdminBlock();
        renderSomeBlock();
      })
    );
  }
  renderDoseSwitch();

  if (!hideSomeOrder) {
    var someHint = document.createElement('p');
    someHint.className = 'manejo-proto-detail-hint';
    someHint.textContent = 'Copia cada campo en su casilla correspondiente del SOME.';
    if (isManejoSomeCopyUiEnabled()) wrap.insertBefore(someHint, someHost);
    renderSomeBlock();
  }

  if (panelOpts.embed) {
    var embedMeta = document.createElement('div');
    embedMeta.className = 'manejo-proto-detail-embed-meta';
    var embedCat = document.createElement('span');
    embedCat.className =
      'manejo-proto-detail-embed-cat ' + protoCategoryCssClass(entry.category);
    embedCat.textContent = categoryLabelFor(entry.category);
    embedMeta.appendChild(embedCat);
    if ((entry.useCategories || []).length) {
      var embedUse = document.createElement('span');
      embedUse.className = 'manejo-proto-detail-embed-use';
      embedUse.textContent = entry.useCategories.map(useCategoryLabelFor).join(' · ');
      embedMeta.appendChild(embedUse);
    }
    wrap.insertBefore(embedMeta, indicationBlock);
  }

  var linkedPathologies = pathologiesLinkedToProtocol(MANEJO_PATHOLOGIES, entry);
  if (linkedPathologies.length && !panelOpts.hidePathologyLinks) {
    var pathSec = document.createElement('section');
    pathSec.className = 'manejo-proto-pathology-links';
    var pathLbl = document.createElement('span');
    pathLbl.className = 'manejo-proto-pathology-links-label';
    pathLbl.textContent = 'Patologías vinculadas';
    pathSec.appendChild(pathLbl);
    var pathRow = document.createElement('div');
    pathRow.className = 'manejo-pathology-related-row';
    linkedPathologies.forEach(function (p) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'manejo-pathology-related-link';
      btn.textContent = p.title;
      btn.addEventListener('click', function () {
        if (typeof panelOpts.onPathologyLink === 'function') {
          panelOpts.onPathologyLink(p.id);
        } else {
          openManejoPathology(p.id);
        }
      });
      pathRow.appendChild(btn);
    });
    pathSec.appendChild(pathRow);
    wrap.appendChild(pathSec);
  }

  if ((entry.useCategories || []).length && !panelOpts.embed) {
    wrap.appendChild(
      buildKvBlock(
        'Categoría de uso',
        entry.useCategories
          .map(function (id) {
            var hit = MANEJO_PROTOCOL_USE_CATEGORIES.find(function (c) {
              return c.id === id;
            });
            return hit ? hit.label : id;
          })
          .join(' · '),
        { wide: true }
      )
    );
  }

  if ((entry.notes || []).length || (resolvedEntry.notes || []).length) {
    var calcResultForNotes = calcDrawer ? calcDrawer.getCalcResult() : null;
    var orderForNotes = protocolToSomeOrder(resolvedEntry, calcResultForNotes);
    var noteItems = (resolvedEntry.notes || entry.notes || []).filter(function (n) {
      return !adminNoteOverlapsEntryNotes(orderForNotes.comments, [n]);
    });
    if (noteItems.length) {
      var notes = document.createElement('div');
      notes.className = 'manejo-card-notes manejo-proto-detail-notes';
      var nul = document.createElement('ul');
      noteItems.forEach(function (n) {
        var li = document.createElement('li');
        li.textContent = String(n);
        nul.appendChild(li);
      });
      notes.appendChild(nul);
      wrap.appendChild(notes);
    }
  }

  return {
    root: wrap,
    getCalcResult: function () {
      return calcDrawer ? calcDrawer.getCalcResult() : null;
    },
    getDoseMode: function () {
      return doseMode;
    },
    getCopyText: function () {
      return buildProtocolCopyText(
        entry,
        calcDrawer ? calcDrawer.getCalcResult() : null,
        doseMode,
        wKg
      );
    },
  };
}

export function buildProtocolDetailEmpty() {
  var empty = document.createElement('div');
  empty.className = 'manejo-proto-detail-empty';
  var t = document.createElement('p');
  t.className = 'manejo-proto-detail-empty-title';
  t.textContent = 'Selecciona una infusión';
  empty.appendChild(t);
  var h = document.createElement('p');
  h.className = 'manejo-hint';
  h.textContent = isManejoSomeCopyUiEnabled()
    ? 'El pedido SOME aparece aquí, campo por campo, listo para copiar.'
    : 'Revisa indicación, calculadora y notas clínicas aquí.';
  empty.appendChild(h);
  return empty;
}

export { getProtocolLabFechaNorm };
