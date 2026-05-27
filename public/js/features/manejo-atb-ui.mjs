/**
 * UI de antibióticos en Manejo / Guía clínica (filtros, lectura, cultivo).
 */
import { formatSomeBlock } from '../electrolyte-manejo.mjs';
import {
  MANEJO_ATB_DRUGS,
  MANEJO_ATB_FAMILIES,
} from '../manejo-atb-catalog.mjs';
import { drugMatchesAtbRisFilter } from '../manejo-atb-suggest.mjs';
import { atbFamilyCssClass } from '../manejo-atb-family-colors.mjs';
import {
  drugToSomeOrderAtb,
  getRenalLabContext,
  resolveAtbRenalGuidance,
} from '../manejo-atb-renal.mjs';
import { getCultureContextForManejo } from '../manejo-cultivo-bridge.mjs';
import { drugToSomeOrder } from '../manejo-some-format.mjs';
import { sortLabHistoryChronological } from '../tend-core.mjs';
import { buildCultivoAntibiogramCellHtmlForPatient } from './expediente.mjs';
import {
  buildIndicationChips,
  buildKvBlock,
  formatIndicationChipLabel,
  normalizeAtbHintToken,
} from './manejo-some-ui.mjs';

export { classifyAtbForIsolate, drugMatchesAtbRisFilter } from '../manejo-atb-suggest.mjs';
export { atbFamilyCssClass } from '../manejo-atb-family-colors.mjs';
export {
  buildIndicationChips,
  buildKvBlock,
  formatIndicationChipLabel,
  normalizeAtbHintToken,
} from './manejo-some-ui.mjs';

export const ATB_FAMILY_KEY = 'manejoAtbFamily';
export const ATB_HINT_KEY = 'manejoAtbHint';
export const ATB_RIS_FILTER_KEY = 'manejoAtbRisFilter';
export const ATB_SELECTED_KEY = 'manejoAtbSelectedId';

export const ATB_RIS_FILTER_META = {
  s: { chip: 's', label: 'Sensibles (S)', title: 'Antibióticos con S en antibiograma' },
  r: { chip: 'r', label: 'Resistentes (R)', title: 'Antibióticos con R en antibiograma' },
  i: { chip: 'i', label: 'Intermedios (I)', title: 'Antibióticos con I en antibiograma' },
};

/** @type {{ ensureParsedLabHistory?(pid: string): unknown[] }} */
var atbRuntime = {};

/** @type {{
 *   buildManejoCalcDrawer?: Function,
 *   appendManejoSomeOrderArticle?: Function,
 *   isManejoSomeCopyUiEnabled?: () => boolean,
 *   renderManejo?: () => void,
 * }} */
var readingPanelDeps = {};

/**
 * @param {{ ensureParsedLabHistory?: (pid: string) => unknown[] }} partial
 */
export function registerManejoAtbUiRuntime(partial) {
  if (partial && typeof partial === 'object') Object.assign(atbRuntime, partial);
}

/**
 * @param {{
 *   buildManejoCalcDrawer: Function,
 *   appendManejoSomeOrderArticle?: Function,
 *   isManejoSomeCopyUiEnabled?: () => boolean,
 *   renderManejo?: () => void,
 * }} deps
 */
export function configureManejoAtbReadingPanel(deps) {
  readingPanelDeps = deps && typeof deps === 'object' ? deps : {};
}

export function getAtbSelectedId() {
  try {
    return sessionStorage.getItem(ATB_SELECTED_KEY) || '';
  } catch (_e) {
    return '';
  }
}

export function setAtbSelectedId(id) {
  try {
    if (id) sessionStorage.setItem(ATB_SELECTED_KEY, id);
    else sessionStorage.removeItem(ATB_SELECTED_KEY);
  } catch (_e2) {}
}

export function findAtbDrugById(id) {
  if (!id) return null;
  return (
    MANEJO_ATB_DRUGS.find(function (d) {
      return d.id === id;
    }) || null
  );
}

export function buildAtbCopyText(drug, calcResult) {
  return formatSomeBlock(drugToSomeOrder(drug, calcResult));
}

export function atbStatusLabel(classification, drug) {
  var status = (classification && classification.status) || 'neutral';
  if (status === 'compatible') return 'S antibiograma';
  if (status === 'caution') return 'Precaución';
  return drug.route || 'IV';
}

export function buildAtbReadingPanel(drug, classification, patient, renalCtx, activeIso) {
  var buildManejoCalcDrawer = readingPanelDeps.buildManejoCalcDrawer;
  var appendManejoSomeOrderArticle = readingPanelDeps.appendManejoSomeOrderArticle;
  var isManejoSomeCopyUiEnabled = readingPanelDeps.isManejoSomeCopyUiEnabled;
  var renalGuide = resolveAtbRenalGuidance(drug, renalCtx);
  var wrap = document.createElement('div');
  wrap.className =
    'manejo-guia-atb-reading-body manejo-proto-detail ' + atbFamilyCssClass(drug.family);

  if ((drug.indications || []).length) {
    wrap.appendChild(
      buildKvBlock(
        'Indicaciones',
        drug.indications.map(formatIndicationChipLabel).join(' · '),
        { wide: true }
      )
    );
  }
  if (drug.adultDose) {
    wrap.appendChild(buildKvBlock('Dosis adulto', drug.adultDose, { wide: true }));
  }

  if (renalGuide.hasEgfr) {
    wrap.appendChild(buildKvBlock('eTFG (lab)', renalGuide.summaryLine, { wide: true }));
    if (renalGuide.adjustment) {
      wrap.appendChild(buildKvBlock('Ajuste renal', renalGuide.adjustment, { wide: true }));
    }
  } else if (drug.renalNote) {
    wrap.appendChild(buildKvBlock('Renal / TDM', drug.renalNote, { wide: true }));
  }

  var calcDrawer = null;
  if (drug.calculatorId && typeof buildManejoCalcDrawer === 'function') {
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
  if (typeof isManejoSomeCopyUiEnabled === 'function' && isManejoSomeCopyUiEnabled()) {
    wrap.appendChild(someHint);
  }

  if (typeof appendManejoSomeOrderArticle === 'function') {
    appendManejoSomeOrderArticle(
      wrap,
      function () {
        return drugToSomeOrderAtb(
          drug,
          calcDrawer ? calcDrawer.getCalcResult() : null,
          renalCtx,
          drugToSomeOrder
        );
      },
      0
    );
  }

  if (
    activeIso &&
    (classification.status === 'compatible' ||
      classification.status === 'caution' ||
      (classification.reasons || []).length)
  ) {
    var cultSec = document.createElement('section');
    cultSec.className = 'manejo-guia-atb-culture-summary';
    var cultTitle = document.createElement('h3');
    cultTitle.className = 'manejo-guia-atb-culture-summary-title';
    cultTitle.textContent = 'Cultivo activo';
    cultSec.appendChild(cultTitle);
    var status = classification.status || 'neutral';
    if (status === 'compatible' || status === 'caution') {
      var st = document.createElement('span');
      st.className =
        'manejo-via-chip manejo-atb-status-chip manejo-atb-status-chip--' + status;
      st.textContent = atbStatusLabel(classification, drug);
      cultSec.appendChild(st);
    }
    if ((classification.reasons || []).length) {
      var notes = document.createElement('ul');
      notes.className = 'manejo-guia-atb-culture-reasons';
      classification.reasons.forEach(function (n) {
        var li = document.createElement('li');
        li.textContent = String(n);
        notes.appendChild(li);
      });
      cultSec.appendChild(notes);
    }
    wrap.appendChild(cultSec);
  }

  return {
    root: wrap,
    getCalcResult: function () {
      return calcDrawer ? calcDrawer.getCalcResult() : null;
    },
  };
}

export function getAtbFamilyFilter() {
  try {
    var s = sessionStorage.getItem(ATB_FAMILY_KEY);
    if (!s || s === 'all') return 'all';
    if (MANEJO_ATB_FAMILIES.some(function (f) { return f.id === s; })) return s;
  } catch (_e) {}
  return 'all';
}

export function setAtbFamilyFilter(id) {
  try {
    sessionStorage.setItem(ATB_FAMILY_KEY, id || 'all');
  } catch (_e2) {}
}

function defaultAtbRerender() {
  if (typeof readingPanelDeps.renderManejo === 'function') readingPanelDeps.renderManejo();
}

export function applyAtbFamilyFilter(id, rerenderFn) {
  clearAtbHintFilter();
  setAtbFamilyFilter(id);
  if (id !== 'all') {
    var sid = getAtbSelectedId();
    if (sid) {
      var drug = findAtbDrugById(sid);
      if (drug && drug.family !== id) setAtbSelectedId('');
    }
  }
  if (typeof rerenderFn === 'function') rerenderFn();
  else defaultAtbRerender();
}

export function getAtbHintFilter() {
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

export function setAtbHintFilter(token, familyId) {
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

export function clearAtbHintFilter() {
  try {
    sessionStorage.removeItem(ATB_HINT_KEY);
  } catch (_e5) {}
}

export function getAtbRisFilter() {
  try {
    var s = sessionStorage.getItem(ATB_RIS_FILTER_KEY);
    if (s === 's' || s === 'r' || s === 'i') return s;
  } catch (_e6) {}
  return null;
}

export function setAtbRisFilter(value) {
  try {
    if (value === 's' || value === 'r' || value === 'i') {
      sessionStorage.setItem(ATB_RIS_FILTER_KEY, value);
    } else {
      sessionStorage.removeItem(ATB_RIS_FILTER_KEY);
    }
  } catch (_e7) {}
}

export function clearAtbRisFilter() {
  setAtbRisFilter(null);
}

export function toggleAtbRisFilter(key) {
  setAtbRisFilter(getAtbRisFilter() === key ? null : key);
}

export function syncManejoAtbRisChipFilterUi(root) {
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

export function wireManejoAtbRisChipFilters(root, onChange) {
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

export function drugMatchesAtbHint(drug, token) {
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

export function onAtbHintChipClick(token, familyId) {
  var cur = getAtbHintFilter();
  var norm = normalizeAtbHintToken(token);
  if (cur && cur.token === norm && cur.familyId === familyId) {
    clearAtbHintFilter();
    setAtbFamilyFilter('all');
  } else {
    setAtbHintFilter(token, familyId);
    setAtbFamilyFilter(familyId);
  }
  defaultAtbRerender();
}

export function familyLabelForAtb(familyId) {
  var f = MANEJO_ATB_FAMILIES.find(function (x) {
    return x.id === familyId;
  });
  return f ? f.label : familyId || '—';
}

export function familyHintForAtb(familyId) {
  var f = MANEJO_ATB_FAMILIES.find(function (x) {
    return x.id === familyId;
  });
  return f && f.hint ? f.hint : '';
}

export function isolateToCultivoRow(iso) {
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

export function cultivoRowFechaDisplay(r) {
  if (r.fechaMuestra && r.fechaMuestra !== '—') return r.fechaMuestra;
  return r.studyDate || '—';
}

export function getAtbPatientContext(pid, patient) {
  var ensure = atbRuntime.ensureParsedLabHistory;
  var hist = pid && typeof ensure === 'function' ? ensure(pid) : [];
  var latestLabSet = null;
  if (hist.length) {
    latestLabSet = sortLabHistoryChronological(hist)[0] || null;
  }
  var renalCtx = getRenalLabContext(latestLabSet, patient);
  var cultureCtx = getCultureContextForManejo(hist, { maxAgeDays: 14 });
  var activeIdx = cultureCtx.activeIsolateIndex || 0;
  try {
    var savedIdx = sessionStorage.getItem('manejoAtbIsolateIdx');
    if (savedIdx != null && cultureCtx.isolates[Number(savedIdx)]) activeIdx = Number(savedIdx);
  } catch (_e0) {}
  return {
    renalCtx: renalCtx,
    cultureCtx: cultureCtx,
    activeIdx: activeIdx,
    activeIso: cultureCtx.isolates[activeIdx] || null,
  };
}

export function buildGuiaAtbCultureBanner(cultureCtx, activeIdx, pid, onRerender) {
  var isolates = cultureCtx.isolates || [];
  if (!isolates.length) return null;
  var activeIso = isolates[activeIdx] || null;

  var banner = document.createElement('section');
  banner.className = 'manejo-atb-culture-banner manejo-guia-atb-culture-banner';

  var bh = document.createElement('strong');
  bh.textContent = 'Cultivo activo';
  banner.appendChild(bh);

  if (isolates.length > 1) {
    var sel = document.createElement('select');
    sel.className = 'manejo-atb-isolate-select';
    isolates.forEach(function (iso, i) {
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
      if (typeof onRerender === 'function') onRerender();
    });
    banner.appendChild(sel);
  }

  if (activeIso) {
    var row = isolateToCultivoRow(activeIso);
    var fecha = cultivoRowFechaDisplay(row);
    var sitio = row.sitio && row.sitio !== '—' ? row.sitio : row.tipoLabel || '—';
    var summaryLine = document.createElement('p');
    summaryLine.className = 'manejo-guia-atb-culture-summary-line';
    summaryLine.textContent = [fecha, sitio, row.organismo || '—']
      .filter(function (part) {
        return part && part !== '—';
      })
      .join(' · ');
    banner.appendChild(summaryLine);

    var details = document.createElement('details');
    details.className = 'manejo-guia-atb-antibiogram-details';
    var sum = document.createElement('summary');
    sum.textContent = 'Antibiograma';
    details.appendChild(sum);
    var abBody = document.createElement('div');
    abBody.className = 'manejo-guia-atb-antibiogram-body';
    abBody.innerHTML = buildCultivoAntibiogramCellHtmlForPatient(row, pid);
    details.appendChild(abBody);
    banner.appendChild(details);
  }

  if (cultureCtx.globalAlerts.length) {
    var al = document.createElement('ul');
    al.className = 'manejo-atb-alerts';
    cultureCtx.globalAlerts.forEach(function (a) {
      var li = document.createElement('li');
      li.textContent = a;
      al.appendChild(li);
    });
    banner.appendChild(al);
  }

  return banner;
}

export function getAtbDrugs() {
  return MANEJO_ATB_DRUGS;
}

export function getAtbFamilies() {
  return MANEJO_ATB_FAMILIES;
}
