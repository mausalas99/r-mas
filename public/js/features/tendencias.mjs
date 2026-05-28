// Tendencias — tarjetas, sparks, detalle, prefs de salida de laboratorio relacionadas
import { notes } from '../app-state.mjs';
import {
  dedupeTrendSetsForSeries,
  getSetTrendValueForSeries,
  buildTendChartLabels,
  sortLabHistoryChronological,
  parseFechaLabToMs,
  normalizeFechaLabHistory,
  normalizeHoraLabHistory,
  tendEligibleSectionKey,
} from '../tend-core.mjs';
import { createTendGroupModal } from '../tend-group-modal.mjs';
import { scheduleAfterPaint, scheduleIdle } from '../deferred-work.mjs';
import {
  buildTrendSeriesIndexCached,
  getLabHistoryRevision,
  getTrendRenderWindow,
  TREND_DETAIL_DOWNSAMPLE,
  TREND_SPARK_WINDOW,
  trendCatalogSeriesKey,
} from '../lab-history-cache.mjs';
import { readTendCardOrder, writeTendCardOrder } from '../tend-prefs.mjs';
import {
  formatBhExtrasDisplayLine,
  parseBhTrendValuesFromResLab,
  bhTrendDisplayTitle,
  sortTrendSpecsBySomeOrder,
} from '../labs.js';
import { safeAttrJsString } from './lab-panel.mjs';
import { guidedTourAdvanceAfter, getGuidedTourContext } from './settings-help.mjs';
import { patients } from '../app-state.mjs';
import { registerSesionIngresoTrendsRuntime } from '../sesion-ingreso-trends-export.mjs';
import {
  closeSesionIngresoTrendsSendModal,
  openSesionIngresoTrendsSendModal,
  registerSesionIngresoTrendsSendRuntime,
} from './sesion-ingreso-trends-send-modal.mjs';

/** @type {{ getActiveId(): string|null, ensureParsedLabHistory(pid: string): any[], ensureParsedLabHistoryCached?(pid: string): any[], rerenderParsedLabOutputAfterPrefsChange(): void, rpcPrefersReducedMotion(): boolean, showToast(msg: string, type?: string): void, buildLabSetDateLine(set: any): string }} */
var rt = {
  getActiveId() { return null; },
  ensureParsedLabHistory() { return []; },
  ensureParsedLabHistoryCached() { return []; },
  rerenderParsedLabOutputAfterPrefsChange() {},
  rpcPrefersReducedMotion() { return false; },
  showToast() {},
  buildLabSetDateLine() { return ''; },
};

export function registerTendenciasRuntime(partial) {
  if (partial && typeof partial === 'object') Object.assign(rt, partial);
  initTendGroupModal();
  ensureTendenciasClickDelegation();
  registerSesionIngresoTrendsRuntime({
    buildCatalog: buildMergedTrendSeriesCatalog,
    sectionLabel: getTendSectionLabel,
    refForSeries: function (history, sectionKey, fieldKey) {
      return tendRefForSeries(history, sectionKey, fieldKey, null);
    },
    unitForField: function (fieldKey) {
      return TEND_UNITS[fieldKey] || '';
    },
  });
  registerSesionIngresoTrendsSendRuntime({
    showToast: function (msg, kind) {
      rt.showToast(msg, kind);
    },
    getHistory: function () {
      var pid = aid();
      return pid ? tendParsedHistoryDesc(pid) : [];
    },
    getPatientLabel: function () {
      var pid = aid();
      var patient = (patients || []).find(function (p) {
        return p.id === pid;
      });
      return patient ? patient.nombre || patient.registro || '' : '';
    },
    getPatientId: function () {
      return aid() || '';
    },
    sendPayload: function (payload) {
      if (window.electronAPI && window.electronAPI.sendToSesionIngreso) {
        window.electronAPI.sendToSesionIngreso(payload).then(function (ok) {
          if (ok) rt.showToast('Tendencias enviadas a Neo', 'ok');
          else rt.showToast('No se pudo abrir Neo', 'warn');
        });
        return;
      }
      rt.showToast('Integración disponible solo en la app de escritorio', 'warn');
    },
  });
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

var _tendCardSortables = [];
var sparkCharts = {};
var detailChart = null;
var _tendRenderState = {
  key: null,
  seriesKeys: [],
  seriesIndex: null,
  seriesAvail: null,
};

function buildTendRenderKey(patientId, revision, prefsHash, sectionsExpanded) {
  return [patientId, revision, prefsHash, sectionsExpanded].join('::');
}

function tendPrefsHash() {
  return String(tendAbnormalOnlyRead()) + '|' + String(tendHiddenSeriesRead().join(','));
}

function tendExpandedSectionsKey() {
  return TEND_SECTION_ORDER.filter(function (sk) {
    return tendSectionIsExpanded(sk);
  }).join(',');
}

function tendSeriesKeySelector(seriesKey) {
  if (typeof CSS !== 'undefined' && CSS.escape) {
    return '.tend-card[data-series-key="' + CSS.escape(seriesKey) + '"]';
  }
  return '.tend-card[data-series-key="' + String(seriesKey).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]';
}

function patchTendCardsFromIndex(seriesIndex, seriesAvail) {
  var patched = 0;
  for (var i = 0; i < seriesAvail.length; i += 1) {
    var sp = seriesAvail[i];
    var key = tendCatalogSeriesKey(sp.sectionKey, sp.fieldKey);
    var idx = seriesIndex[key];
    if (!idx) return false;
    var card = document.querySelector(tendSeriesKeySelector(key));
    if (!card) return false;
    var valEl = card.querySelector('.tend-param-value');
    if (valEl) {
      valEl.textContent = idx.latest != null ? String(idx.latest) : '—';
      valEl.classList.toggle('tend-abnormal', !!idx.isAbnormal);
    }
    card.setAttribute('data-abnormal', idx.isAbnormal ? '1' : '0');
    patched += 1;
  }
  return patched > 0;
}

function destroySparkChartEntry(ck) {
  var chart = sparkCharts[ck];
  if (!chart) return;
  if (typeof chart.destroy === 'function') chart.destroy();
  delete sparkCharts[ck];
}

function updateSparkChartsFromJobs(sparkJobs, chartAnim) {
  for (var i = 0; i < sparkJobs.length; i += 1) {
    var job = sparkJobs[i];
    var ck = trendSparkChartKey(job.sk2, job.fk2);
    var chart = sparkCharts[ck];
    if (chart) {
      chart.data.labels = job.labels2;
      chart.data.datasets[0].data = job.values2;
      chart.update(chartAnim === false ? 'none' : undefined);
    } else {
      mountOneTrendSparkChart(job, null, chartAnim);
    }
  }
}

function buildSparkJobsFromIndex(seriesAvail, seriesIndex, chartAnim) {
  var sparkJobs = [];
  for (var cj = 0; cj < seriesAvail.length; cj += 1) {
    var spec2 = seriesAvail[cj];
    var sk2 = spec2.sectionKey;
    var fk2 = spec2.fieldKey;
    if (!tendSectionIsExpanded(sk2)) continue;
    var idx = seriesIndex[tendCatalogSeriesKey(sk2, fk2)];
    if (!idx || !idx.setsDesc.length) continue;
    var sparkDesc = idx.setsDesc.slice(0, TREND_SPARK_WINDOW);
    var setsAsc2 = toTrendAscendingSets(sparkDesc);
    sparkJobs.push({
      sk2: sk2,
      fk2: fk2,
      setsDesc2: sparkDesc,
      labels2: buildTendChartLabels(setsAsc2),
      values2: setsAsc2.map(function (s) {
        return getSetTrendValueForSeries(s, sk2, fk2);
      }),
    });
  }
  var jobIndex = 0;
  var SPARK_BATCH = 6;
  function runSparkBatch() {
    var end = Math.min(jobIndex + SPARK_BATCH, sparkJobs.length);
    for (; jobIndex < end; jobIndex += 1) {
      mountOneTrendSparkChart(sparkJobs[jobIndex], null, chartAnim);
    }
    if (jobIndex < sparkJobs.length) {
      requestAnimationFrame(runSparkBatch);
      return;
    }
    mountTendCardSortables();
    syncTendHiddenModalIfOpen();
  }
  if (sparkJobs.length) runSparkBatch();
  else {
    mountTendCardSortables();
    syncTendHiddenModalIfOpen();
  }
  return sparkJobs;
}

var TEND_UNITS = {
  Hb:'g/dL',  Hto:'%',    Leu:'K/μL', Plt:'K/μL', VCM:'fL', HCM:'pg',
  RBC:'M/μL', CHCM:'g/dL', RDW:'%', MPV:'fL',
  Neu:'K/μL', Eos:'K/μL', Lin:'K/μL', Mono:'K/μL', Baso:'K/μL',
  NeuPct:'%', LinPct:'%', MonoPct:'%', EosPct:'%', BasoPct:'%',
  Bandas:'%', Mielo:'%', Metamielo:'%', Promielo:'%', Blastos:'%', Atipicos:'%',
  Ret:'%', TP:'s', TTP:'s', INR:'', Fib:'mg/dL', DD:'ng/mL',
  Glu:'mg/dL',Cr:'mg/dL', eTFG:'mL/min/1.73m²', BUN:'mg/dL',PCR:'mg/dL',
  AU:'mg/dL', TGL:'mg/dL',COL:'mg/dL', VSG:'mm/h', CPK:'U/L',
  Na:'mEq/L', K:'mEq/L',  Cl:'mEq/L', HCO3:'mEq/L',Ca:'mg/dL', F:'mg/dL', Mg:'mEq/L',
  AST:'U/L',  ALT:'U/L',  FA:'U/L',   BT:'mg/dL', Alb:'g/dL', BD:'mg/dL', BI:'mg/dL',
  LDH:'U/L', Amil:'U/L',
  Lactato:'mmol/L', Dens:'g/L', Prot:'mg/dL', Vol:'mL', GLU:'mg/dL', Bica:'mEq/L', pH:'', pCO2:'mmHg', pO2:'mmHg',
  iCa:'mmol/L'
};
var TEND_REF = {
  Hb:[12,17.5], Hto:[36,53], Leu:[4,11], Plt:[150,400], VCM:[80,100], HCM:[27,33],
  RBC:[4.2,5.4], CHCM:[31.5,34.5], RDW:[11.5,14.5], MPV:[7.4,10.4],
  Neu:[1.5,8], Eos:[0,0.6], Lin:[0.6,3.4], Mono:[0,0.9], Baso:[0,0.2],
  NeuPct:[37,80], LinPct:[10,50], MonoPct:[0,12], EosPct:[0,7], BasoPct:[0,2.5],
  Bandas:[0,5], Mielo:[0,1], Metamielo:[0,1], Promielo:[0,1], Blastos:[0,1], Atipicos:[0,5],
  Ret:[0.5,2.5], TP:[11,14], TTP:[25,35], INR:[0.8,1.2], Fib:[150,400], DD:[0,500],
  Glu:[70,100], Cr:[0.5,1.3], BUN:[7,20], PCR:[0,0.5],
  AU:[3.5,7], TGL:[0,150], COL:[0,200], CPK:[30,200],
  Na:[136,145], K:[3.5,5.0], Cl:[96,106], HCO3:[22,28], Ca:[8.5,10.5], F:[2.5,4.5], Mg:[1.6,2.6],
  AST:[10,40], ALT:[7,56], FA:[44,147], BT:[0.1,1.2], Alb:[3.5,5.2], BD:[0,0.3], BI:[0.1,1],
  LDH:[120,250], Amil:[30,110],
  LCR_pH:[7.28,7.42], LCR_Leu:[0,5], LCR_Glu:[40,80], LCR_Cl:[118,132], LCR_Prot:[15,45],
  Liq_pH:[7.1,7.6], Liq_Glu:[20,600], Liq_Leu:[0,5000], Liq_LDH:[0,500], Liq_Dens:[1000,1050], Liq_Prot:[10,50]
};
/** Rangos orientativos en gasometría (arterial/capilar; solo tendencias / color). */
var TEND_REF_GASES = {
  pH: [7.35, 7.45],
  pCO2: [35, 45],
  pO2: [83, 100],
  Lactato: [0.5, 2.2],
  Na: [135, 148],
  K: [3.5, 5.3],
  GLU: [70, 110],
  Hto: [34, 50],
  Bica: [22, 28],
  iCa: [1.12, 1.32]
};
var TEND_SECTION_LABELS = {
  BH: 'Biometría hemática',
  QS: 'Química sanguínea',
  ESC: 'Electrolitos séricos',
  PFHs: 'Función hepática',
  GASES: 'Gasometría',
  LCR: 'LCR (citoquímico)',
  Liq: 'Líquidos corporales',
  Prot12h: 'Proteinuria 12 h',
  Prot24h: 'Proteinuria 24 h',
  PIE: 'Prueba de embarazo',
  EGO: 'EGO',
  CUANTORINA: 'Cuantificación urinaria',
  PltCit: 'Plaquetas (citrato)',
  FROTIS: 'Frotis de sangre'
};
var TEND_SECTION_ORDER = [
  'BH', 'PltCit', 'QS', 'ESC', 'PFHs', 'GASES', 'LCR', 'Liq', 'Prot12h', 'Prot24h', 'PIE', 'EGO', 'CUANTORINA', 'FROTIS'
];

/**
 * Series tendibles declaradas (parsearSecciones / resLabs). Pueden añadirse más vía merge dinámico
 * si aparecen pares sección/campo numéricos no listados.
 */
var TEND_SERIES_CATALOG = [
  { sectionKey: 'BH', fieldKey: 'RBC', cardTitle: 'Eritrocitos', hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'Hb', cardTitle: 'Hb' },
  { sectionKey: 'BH', fieldKey: 'Hto', cardTitle: 'Hto' },
  { sectionKey: 'BH', fieldKey: 'VCM', cardTitle: 'VCM' },
  { sectionKey: 'BH', fieldKey: 'HCM', cardTitle: 'HCM' },
  { sectionKey: 'BH', fieldKey: 'CHCM', cardTitle: 'CHCM', hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'RDW', cardTitle: 'RDW', hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'Leu', cardTitle: 'Leucocitos' },
  { sectionKey: 'BH', fieldKey: 'Neu', cardTitle: 'Neutrófilos' },
  { sectionKey: 'BH', fieldKey: 'NeuPct', cardTitle: bhTrendDisplayTitle('NeuPct') },
  { sectionKey: 'BH', fieldKey: 'Lin', cardTitle: 'Linfocitos', hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'LinPct', cardTitle: bhTrendDisplayTitle('LinPct') },
  { sectionKey: 'BH', fieldKey: 'Mono', cardTitle: 'Monocitos', hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'MonoPct', cardTitle: bhTrendDisplayTitle('MonoPct') },
  { sectionKey: 'BH', fieldKey: 'Eos', cardTitle: 'Eosinófilos' },
  { sectionKey: 'BH', fieldKey: 'EosPct', cardTitle: bhTrendDisplayTitle('EosPct') },
  { sectionKey: 'BH', fieldKey: 'Baso', cardTitle: 'Basófilos', hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'BasoPct', cardTitle: bhTrendDisplayTitle('BasoPct') },
  { sectionKey: 'BH', fieldKey: 'Plt', cardTitle: 'Plaquetas' },
  { sectionKey: 'BH', fieldKey: 'MPV', cardTitle: 'VPM', hiddenByDefault: true },
  { sectionKey: 'PltCit', fieldKey: 'Plt', cardTitle: 'Plaquetas (citrato)' },
  { sectionKey: 'BH', fieldKey: 'Ret', cardTitle: 'Reticulocitos', hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'TP', cardTitle: 'TP', hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'TTP', cardTitle: 'TTP', hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'INR', cardTitle: 'INR', hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'Fib', cardTitle: 'Fibrinógeno', hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'DD', cardTitle: 'Dímero D', hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'Bandas', cardTitle: bhTrendDisplayTitle('Bandas') },
  { sectionKey: 'BH', fieldKey: 'Mielo', cardTitle: bhTrendDisplayTitle('Mielo') },
  { sectionKey: 'BH', fieldKey: 'Metamielo', cardTitle: bhTrendDisplayTitle('Metamielo') },
  { sectionKey: 'BH', fieldKey: 'Promielo', cardTitle: bhTrendDisplayTitle('Promielo') },
  { sectionKey: 'BH', fieldKey: 'Blastos', cardTitle: bhTrendDisplayTitle('Blastos') },
  { sectionKey: 'BH', fieldKey: 'Atipicos', cardTitle: bhTrendDisplayTitle('Atipicos') },
  { sectionKey: 'QS', fieldKey: 'Glu', cardTitle: 'Glucosa' },
  { sectionKey: 'QS', fieldKey: 'BUN', cardTitle: 'BUN' },
  { sectionKey: 'QS', fieldKey: 'Cr', cardTitle: 'Creatinina' },
  { sectionKey: 'QS', fieldKey: 'eTFG', cardTitle: 'eTFG (CKD-EPI 2021)' },
  { sectionKey: 'QS', fieldKey: 'AU', cardTitle: 'Ácido úrico' },
  { sectionKey: 'QS', fieldKey: 'PCR', cardTitle: 'PCR' },
  { sectionKey: 'QS', fieldKey: 'PCT', cardTitle: 'Procalcitonina' },
  { sectionKey: 'QS', fieldKey: 'COL', cardTitle: 'Colesterol' },
  { sectionKey: 'QS', fieldKey: 'TGL', cardTitle: 'Triglicéridos' },
  { sectionKey: 'QS', fieldKey: 'VSG', cardTitle: 'VSG' },
  { sectionKey: 'QS', fieldKey: 'CPK', cardTitle: 'CPK' },
  { sectionKey: 'ESC', fieldKey: 'Na', cardTitle: 'Na' },
  { sectionKey: 'ESC', fieldKey: 'K', cardTitle: 'K' },
  { sectionKey: 'ESC', fieldKey: 'Cl', cardTitle: 'Cl' },
  { sectionKey: 'ESC', fieldKey: 'Ca', cardTitle: 'Ca' },
  { sectionKey: 'ESC', fieldKey: 'F', cardTitle: 'Fósforo' },
  { sectionKey: 'ESC', fieldKey: 'Mg', cardTitle: 'Mg' },
  { sectionKey: 'PFHs', fieldKey: 'Alb', cardTitle: 'Albúmina' },
  { sectionKey: 'PFHs', fieldKey: 'AST', cardTitle: 'AST' },
  { sectionKey: 'PFHs', fieldKey: 'ALT', cardTitle: 'ALT' },
  { sectionKey: 'PFHs', fieldKey: 'FA', cardTitle: 'FA' },
  { sectionKey: 'PFHs', fieldKey: 'BT', cardTitle: 'Bilirrubina total' },
  { sectionKey: 'PFHs', fieldKey: 'BD', cardTitle: 'Bilirrubina directa' },
  { sectionKey: 'PFHs', fieldKey: 'BI', cardTitle: 'Bilirrubina indirecta' },
  { sectionKey: 'PFHs', fieldKey: 'LDH', cardTitle: 'LDH' },
  { sectionKey: 'PFHs', fieldKey: 'Amil', cardTitle: 'Amilasa' },
  { sectionKey: 'GASES', fieldKey: 'pH', cardTitle: 'pH (gas)' },
  { sectionKey: 'GASES', fieldKey: 'pCO2', cardTitle: 'pCO₂ (gas)' },
  { sectionKey: 'GASES', fieldKey: 'pO2', cardTitle: 'pO₂ (gas)' },
  { sectionKey: 'GASES', fieldKey: 'Na', cardTitle: 'Na (gas)' },
  { sectionKey: 'GASES', fieldKey: 'K', cardTitle: 'K (gas)' },
  { sectionKey: 'GASES', fieldKey: 'GLU', cardTitle: 'Glu (gas)' },
  { sectionKey: 'GASES', fieldKey: 'Lactato', cardTitle: 'Lactato (gas)' },
  { sectionKey: 'GASES', fieldKey: 'Bica', cardTitle: 'HCO₃⁻ (gas)' },
  { sectionKey: 'GASES', fieldKey: 'Hto', cardTitle: 'Hto (gas)' },
  { sectionKey: 'GASES', fieldKey: 'iCa', cardTitle: 'Ca²⁺ ionizado (gas)' },
  { sectionKey: 'LCR', fieldKey: 'pH', cardTitle: 'pH (LCR)' },
  { sectionKey: 'LCR', fieldKey: 'Leu', cardTitle: 'Leucocitos (LCR)' },
  { sectionKey: 'LCR', fieldKey: 'Glu', cardTitle: 'Glucosa (LCR)' },
  { sectionKey: 'LCR', fieldKey: 'Prot', cardTitle: 'Proteínas (LCR)' },
  { sectionKey: 'LCR', fieldKey: 'Cl', cardTitle: 'Cl (LCR)' },
  { sectionKey: 'Liq', fieldKey: 'Dens', cardTitle: 'Densidad (liq.)' },
  { sectionKey: 'Liq', fieldKey: 'pH', cardTitle: 'pH (liq.)' },
  { sectionKey: 'Liq', fieldKey: 'Glu', cardTitle: 'Glucosa (liq.)' },
  { sectionKey: 'Liq', fieldKey: 'Prot', cardTitle: 'Proteínas (liq.)' },
  { sectionKey: 'Liq', fieldKey: 'LDH', cardTitle: 'LDH (liq.)' },
  { sectionKey: 'Liq', fieldKey: 'Leu', cardTitle: 'Leucocitos (liq.)' }
];
var TEND_SECTION_EXPANDED_LS = 'rpc-tend-sections-expanded';
var TEND_HIDDEN_SERIES_LS = 'rpc-tend-hidden-series';
var TEND_ABNORMAL_ONLY_LS = 'rpc-tend-abnormal-only';
var LAB_OUTPUT_PREFS_KEY = 'rpc-lab-output-prefs-v1';

function getLabOutputPrefs() {
  try {
    var raw = localStorage.getItem(LAB_OUTPUT_PREFS_KEY);
    var o = raw ? JSON.parse(raw) : {};
    return {
      showBhExtendedLine: !!o.showBhExtendedLine,
      hideGasoAdvInterp: !!o.hideGasoAdvInterp,
      quickLabOutput: !!o.quickLabOutput,
    };
  } catch (_e) {
    return { showBhExtendedLine: false, hideGasoAdvInterp: false, quickLabOutput: false };
  }
}

function setLabOutputPrefs(partial) {
  var cur = getLabOutputPrefs();
  if (partial.showBhExtendedLine != null) cur.showBhExtendedLine = !!partial.showBhExtendedLine;
  if (partial.hideGasoAdvInterp != null) cur.hideGasoAdvInterp = !!partial.hideGasoAdvInterp;
  if (partial.quickLabOutput != null) cur.quickLabOutput = !!partial.quickLabOutput;
  try {
    localStorage.setItem(LAB_OUTPUT_PREFS_KEY, JSON.stringify(cur));
  } catch (_e) {}
  return cur;
}

function isGasoInterpretacionResLabChunk(text) {
  var head = String(text || '').split('\n')[0].trim();
  return /^INTERPRETACI[ÓO]N\s+GASOMETR[IÍ]A\s*:/i.test(head);
}

function isBhMainResLabChunk(text) {
  if (!text) return false;
  var head = String(text).split('\n')[0].trim();
  return head.indexOf('BH\t') === 0 || /^BH:?\s*$/.test(head) || /^BH\s/.test(head);
}

function formatBhExtendedTabLine(bhExtras, sourceText) {
  return formatBhExtrasDisplayLine(bhExtras, sourceText || '');
}

function _syncLabPrefSwitchAria(el) {
  if (!el || el.getAttribute('role') !== 'switch') return;
  el.setAttribute('aria-checked', el.checked ? 'true' : 'false');
}

function openLabDisplayPrefsModal() {
  var backdrop = document.getElementById('lab-display-prefs-backdrop');
  if (!backdrop) return;
  var p = getLabOutputPrefs();
  var cbBh = document.getElementById('lab-pref-bh-extended');
  var cbGaso = document.getElementById('lab-pref-gaso-extended');
  var cbQuick = document.getElementById('lab-pref-quick-output');
  if (cbBh) {
    cbBh.checked = p.showBhExtendedLine;
    _syncLabPrefSwitchAria(cbBh);
  }
  if (cbGaso) {
    cbGaso.checked = !p.hideGasoAdvInterp;
    _syncLabPrefSwitchAria(cbGaso);
  }
  if (cbQuick) {
    cbQuick.checked = p.quickLabOutput;
    _syncLabPrefSwitchAria(cbQuick);
  }
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
}

function closeLabDisplayPrefsModal() {
  var backdrop = document.getElementById('lab-display-prefs-backdrop');
  if (!backdrop) return;
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
}

function onLabDisplayPrefsChanged() {
  var cbBh = document.getElementById('lab-pref-bh-extended');
  var cbGaso = document.getElementById('lab-pref-gaso-extended');
  var cbQuick = document.getElementById('lab-pref-quick-output');
  setLabOutputPrefs({
    showBhExtendedLine: cbBh ? cbBh.checked : false,
    hideGasoAdvInterp: cbGaso ? !cbGaso.checked : false,
    quickLabOutput: cbQuick ? cbQuick.checked : false,
  });
  _syncLabPrefSwitchAria(cbBh);
  _syncLabPrefSwitchAria(cbGaso);
  _syncLabPrefSwitchAria(cbQuick);
  rt.rerenderParsedLabOutputAfterPrefsChange();
}

function toTrendAscendingSets(sets) {
  return (sets || []).slice().reverse();
}

function tendSectionExpandedRead() {
  try {
    var raw = localStorage.getItem(TEND_SECTION_EXPANDED_LS);
    if (!raw) return {};
    var o = JSON.parse(raw);
    return o && typeof o === 'object' ? o : {};
  } catch (_e) {
    return {};
  }
}

function tendSectionExpandedWrite(map) {
  try {
    localStorage.setItem(TEND_SECTION_EXPANDED_LS, JSON.stringify(map || {}));
  } catch (_e) {}
}

/** @param {string} sectionKey */
function tendSectionIsExpanded(sectionKey) {
  var m = tendSectionExpandedRead();
  if (!Object.prototype.hasOwnProperty.call(m, sectionKey)) return true;
  return m[sectionKey] !== false;
}

function destroySparkChartsForSection(sectionKey) {
  var prefix = String(sectionKey) + '\x01';
  Object.keys(sparkCharts).forEach(function (ck) {
    if (!ck.startsWith(prefix)) return;
    destroySparkChartEntry(ck);
  });
}

function mountSectionSparkCharts(sectionKey, chartAnim) {
  var seriesIndex = _tendRenderState.seriesIndex;
  var seriesAvail = _tendRenderState.seriesAvail;
  if (!seriesIndex || !seriesAvail) return;
  var jobs = [];
  for (var i = 0; i < seriesAvail.length; i += 1) {
    var spec = seriesAvail[i];
    if (spec.sectionKey !== sectionKey) continue;
    var sk2 = spec.sectionKey;
    var fk2 = spec.fieldKey;
    var idx = seriesIndex[tendCatalogSeriesKey(sk2, fk2)];
    if (!idx || !idx.setsDesc.length) continue;
    var sparkDesc = idx.setsDesc.slice(0, TREND_SPARK_WINDOW);
    var setsAsc2 = toTrendAscendingSets(sparkDesc);
    jobs.push({
      sk2: sk2,
      fk2: fk2,
      setsDesc2: sparkDesc,
      labels2: buildTendChartLabels(setsAsc2),
      values2: setsAsc2.map(function (s) {
        return getSetTrendValueForSeries(s, sk2, fk2);
      }),
    });
  }
  if (!jobs.length) return;
  var jobIndex = 0;
  var SPARK_BATCH = 8;
  function runBatch() {
    var end = Math.min(jobIndex + SPARK_BATCH, jobs.length);
    for (; jobIndex < end; jobIndex += 1) {
      mountOneTrendSparkChart(jobs[jobIndex], null, chartAnim);
    }
    if (jobIndex < jobs.length) scheduleIdle(runBatch, 24);
  }
  runBatch();
}

function applyTendSectionExpandedState(sectionEl, sectionKey, expanded) {
  var btn = sectionEl.querySelector('.tend-section-toggle');
  var body = sectionEl.querySelector('.tend-section-body');
  var chevron = sectionEl.querySelector('.tend-section-chevron');
  if (btn) btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  if (chevron) chevron.textContent = expanded ? '▼' : '▶';
  if (body) body.classList.toggle('tend-section-body--collapsed', !expanded);

  if (!expanded) {
    destroySparkChartsForSection(sectionKey);
    sectionEl.querySelectorAll('.tend-spark-canvas-cell').forEach(function (cell) {
      if (cell.querySelector('canvas')) {
        cell.innerHTML = '<div class="tend-spark-placeholder" aria-hidden="true"></div>';
      }
    });
    return;
  }

  sectionEl.querySelectorAll('.tend-card').forEach(function (card) {
    var seriesKey = card.getAttribute('data-series-key');
    if (!seriesKey) return;
    var pipe = seriesKey.indexOf('|');
    if (pipe < 0) return;
    var sk = seriesKey.slice(0, pipe);
    var fk = seriesKey.slice(pipe + 1);
    var cell = card.querySelector('.tend-spark-canvas-cell');
    if (!cell || cell.querySelector('canvas')) return;
    cell.innerHTML = '<canvas id="' + trendSparkDomId(sk, fk) + '"></canvas>';
  });

  var chartAnim = rt.rpcPrefersReducedMotion() ? false : { duration: 400, easing: 'easeOutQuart' };
  mountSectionSparkCharts(sectionKey, chartAnim);
}

function toggleTendSection(ev, sectionKey) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  var m = tendSectionExpandedRead();
  var cur = tendSectionIsExpanded(sectionKey);
  var next = !cur;
  m[sectionKey] = next;
  tendSectionExpandedWrite(m);

  var container = document.getElementById('tendencias-container');
  var sectionEl =
    container &&
    container.querySelector('.tend-section[data-section="' + String(sectionKey).replace(/"/g, '\\"') + '"]');
  if (sectionEl && container.querySelector('.tend-grid') && _tendRenderState.seriesIndex) {
    applyTendSectionExpandedState(sectionEl, sectionKey, next);
    return;
  }
  renderTendencias();
}

/** Título y unidad para tarjeta spark (evita «%» duplicado en título y unidad). */
function tendCardLabelParts(sectionKey, fieldKey) {
  var spec = tendFindSeriesSpec(sectionKey, fieldKey);
  var title = spec && spec.cardTitle ? String(spec.cardTitle) : String(fieldKey);
  var unit = tendUnitForSeries(sectionKey, fieldKey);
  if (unit === '%') {
    title = title.replace(/\s*%+\s*$/u, '').trim();
  }
  return { title: title, unit: unit };
}

function tendUnitForSeries(sectionKey, fieldKey) {
  if (sectionKey === 'GASES') {
    if (fieldKey === 'GLU') return TEND_UNITS.Glu || '';
    if (fieldKey === 'Na') return TEND_UNITS.Na || '';
    if (fieldKey === 'K') return TEND_UNITS.K || '';
    if (fieldKey === 'Hto') return TEND_UNITS.Hto || '';
    if (fieldKey === 'Bica') return TEND_UNITS.HCO3 || '';
    if (fieldKey === 'pCO2' || fieldKey === 'pO2') return 'mmHg';
    if (fieldKey === 'Lactato') return 'mmol/L';
    if (fieldKey === 'pH') return '';
  }
  if (sectionKey === 'LCR') {
    if (fieldKey === 'pH') return '';
    if (fieldKey === 'Leu') return '/μL';
    if (fieldKey === 'Glu') return TEND_UNITS.Glu || '';
    if (fieldKey === 'Prot') return 'mg/dL';
    if (fieldKey === 'Cl') return TEND_UNITS.Cl || '';
  }
  if (sectionKey === 'Liq') {
    if (fieldKey === 'pH') return '';
    if (fieldKey === 'Dens') return 'g/L';
    if (fieldKey === 'Glu') return TEND_UNITS.Glu || '';
    if (fieldKey === 'Prot') return 'mg/dL';
    if (fieldKey === 'LDH') return TEND_UNITS.LDH || '';
    if (fieldKey === 'Leu') return '/μL';
  }
  return TEND_UNITS[fieldKey] || '';
}

/** Rango orientativo fijo (respaldo si el reporte no trae referencia). */
function tendRefOrientative(sectionKey, fieldKey) {
  if (sectionKey === 'GASES') {
    var gg = TEND_REF_GASES[fieldKey];
    if (gg) return gg;
    if (fieldKey === 'Bica') return TEND_REF.HCO3;
    return null;
  }
  if (sectionKey === 'LCR') {
    var lr = {
      pH: TEND_REF.LCR_pH,
      Leu: TEND_REF.LCR_Leu,
      Glu: TEND_REF.LCR_Glu,
      Cl: TEND_REF.LCR_Cl,
      Prot: TEND_REF.LCR_Prot
    };
    return lr[fieldKey] || null;
  }
  if (sectionKey === 'Liq') {
    var lq = {
      pH: TEND_REF.Liq_pH,
      Glu: TEND_REF.Liq_Glu,
      Leu: TEND_REF.Liq_Leu,
      LDH: TEND_REF.Liq_LDH,
      Dens: TEND_REF.Liq_Dens,
      Prot: TEND_REF.Liq_Prot
    };
    return lq[fieldKey] || null;
  }
  return TEND_REF[fieldKey] || null;
}

function tendRefFromLabSet(set, sectionKey, fieldKey) {
  var refs = set && set.refsBySection;
  var row = refs && refs[sectionKey];
  var r = row && row[fieldKey];
  if (r && r.length === 2 && isFinite(r[0]) && isFinite(r[1]) && r[1] > r[0]) return r;
  return null;
}

/** Rango del reporte (set preferido o historial reciente); si no, orientativo. */
function tendRefForSeries(history, sectionKey, fieldKey, preferSet) {
  var fromPrefer = preferSet ? tendRefFromLabSet(preferSet, sectionKey, fieldKey) : null;
  if (fromPrefer) return fromPrefer;
  if (history && history.length) {
    var sorted = sortLabHistoryChronological(history);
    for (var i = sorted.length - 1; i >= 0; i--) {
      var r = tendRefFromLabSet(sorted[i], sectionKey, fieldKey);
      if (r) return r;
    }
  }
  return tendRefOrientative(sectionKey, fieldKey);
}

function tendParsedHistoryDesc(patientId) {
  if (rt.ensureParsedLabHistoryCached) {
    return sortLabHistoryChronological(rt.ensureParsedLabHistoryCached(patientId));
  }
  return sortLabHistoryChronological(rt.ensureParsedLabHistory(patientId));
}

function tendCatalogSeriesKey(sectionKey, fieldKey) {
  return trendCatalogSeriesKey(sectionKey, fieldKey);
}

function orderTrendSeriesBySaved(specs, savedOrder) {
  var rank = Object.create(null);
  if (savedOrder && savedOrder.length) {
    savedOrder.forEach(function (key, i) {
      rank[key] = i;
    });
  }
  var missingBase = (savedOrder && savedOrder.length ? savedOrder.length : specs.length) + 1000;
  return specs.slice().sort(function (a, b) {
    var ka = tendCatalogSeriesKey(a.sectionKey, a.fieldKey);
    var kb = tendCatalogSeriesKey(b.sectionKey, b.fieldKey);
    var ra = Object.prototype.hasOwnProperty.call(rank, ka) ? rank[ka] : missingBase;
    var rb = Object.prototype.hasOwnProperty.call(rank, kb) ? rank[kb] : missingBase;
    if (ra !== rb) return ra - rb;
    return 0;
  });
}

function tendHiddenSeriesRead() {
  try {
    var j = localStorage.getItem(TEND_HIDDEN_SERIES_LS);
    if (!j) return [];
    var a = JSON.parse(j);
    return Array.isArray(a) ? a : [];
  } catch (_e) {
    return [];
  }
}

function tendHiddenSeriesWrite(arr) {
  try {
    localStorage.setItem(TEND_HIDDEN_SERIES_LS, JSON.stringify(arr || []));
  } catch (_e) {}
}

function tendSeriesIsUserHidden(sectionKey, fieldKey) {
  return tendHiddenSeriesRead().indexOf(tendCatalogSeriesKey(sectionKey, fieldKey)) !== -1;
}

function tendSeriesSetUserHidden(sectionKey, fieldKey, hidden) {
  var k = tendCatalogSeriesKey(sectionKey, fieldKey);
  var a = tendHiddenSeriesRead().slice();
  var i = a.indexOf(k);
  if (hidden && i === -1) a.push(k);
  if (!hidden && i !== -1) a.splice(i, 1);
  tendHiddenSeriesWrite(a);
}

function seedTendHiddenDefaults() {
  var SEED_KEY = 'rpc-tend-hidden-seeded-v2';
  try {
    if (localStorage.getItem(SEED_KEY) === '1') return;
  } catch (_e) {
    return;
  }
  var current = tendHiddenSeriesRead().slice();
  var seen = {};
  current.forEach(function (k) {
    seen[k] = true;
  });
  var changed = false;
  TEND_SERIES_CATALOG.forEach(function (sp) {
    if (sp && sp.hiddenByDefault) {
      var key = tendCatalogSeriesKey(sp.sectionKey, sp.fieldKey);
      if (!seen[key]) {
        current.push(key);
        seen[key] = true;
        changed = true;
      }
    }
  });
  try {
    if (changed) tendHiddenSeriesWrite(current);
    localStorage.setItem(SEED_KEY, '1');
  } catch (_e) {
    /* ignore */
  }
}

function tendFindSeriesSpec(sectionKey, fieldKey) {
  for (var i = 0; i < TEND_SERIES_CATALOG.length; i++) {
    if (
      TEND_SERIES_CATALOG[i].sectionKey === sectionKey &&
      TEND_SERIES_CATALOG[i].fieldKey === fieldKey
    ) {
      return TEND_SERIES_CATALOG[i];
    }
  }
  return {
    sectionKey: sectionKey,
    fieldKey: fieldKey,
    cardTitle: fieldKey + ' · ' + sectionKey
  };
}

/** Catálogo estático + pares numéricos presentes en historial y no declarados. */
function buildMergedTrendSeriesCatalog(history) {
  var mapped = Object.create(null);
  var out = [];
  function add(spec) {
    var k = tendCatalogSeriesKey(spec.sectionKey, spec.fieldKey);
    if (mapped[k]) return;
    mapped[k] = true;
    out.push(spec);
  }
  TEND_SERIES_CATALOG.forEach(function (e) {
    add({ sectionKey: e.sectionKey, fieldKey: e.fieldKey, cardTitle: e.cardTitle });
  });
  (history || []).forEach(function (set) {
    var pb = set && set.parsedBySection;
    if (!pb) return;
    Object.keys(pb).forEach(function (sk) {
      if (!tendEligibleSectionKey(sk)) return;
      var row = pb[sk];
      if (!row) return;
      Object.keys(row).forEach(function (fk) {
        var k = tendCatalogSeriesKey(sk, fk);
        if (mapped[k]) return;
        var v = row[fk];
        if (!isFinite(Number(v))) return;
        mapped[k] = true;
        out.push({
          sectionKey: sk,
          fieldKey: fk,
          cardTitle: sk === 'BH' ? bhTrendDisplayTitle(fk) : fk + ' · ' + sk,
          _dynamic: true
        });
      });
    });
  });
  return out;
}

function getTendCatalogSpecsForSection(sectionKey, history) {
  var specs = buildMergedTrendSeriesCatalog(history || []).filter(function (sp) {
    return sp.sectionKey === sectionKey;
  });
  if (sectionKey === 'BH' || sectionKey === 'QS') {
    return sortTrendSpecsBySomeOrder(sectionKey, specs);
  }
  return specs;
}

function getTendSectionLabel(sectionKey) {
  return TEND_SECTION_LABELS[sectionKey] || sectionKey;
}

function tendEyeVisibilitySvg() {
  return (
    '<svg class="tend-eye-svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
  );
}

function tendAbnormalOnlyRead() {
  try {
    return localStorage.getItem(TEND_ABNORMAL_ONLY_LS) === '1';
  } catch (_e) {
    return false;
  }
}

function tendAbnormalOnlyWrite(on) {
  try {
    if (on) localStorage.setItem(TEND_ABNORMAL_ONLY_LS, '1');
    else localStorage.removeItem(TEND_ABNORMAL_ONLY_LS);
  } catch (_e) {}
}

function tendSeriesLatestAbnormal(history, sectionKey, fieldKey) {
  var raw = history.filter(function (s) {
    return getSetTrendValueForSeries(s, sectionKey, fieldKey) != null;
  });
  var setsDesc = dedupeTrendSetsForSeries(raw, sectionKey, fieldKey);
  if (setsDesc.length < 2) return false;
  var latestSet = setsDesc[0];
  var latest = getSetTrendValueForSeries(latestSet, sectionKey, fieldKey);
  var ref = tendRefForSeries(history, sectionKey, fieldKey, latestSet);
  return !!(ref && latest != null && (latest < ref[0] || latest > ref[1]));
}

function tendHiddenChipDescriptors() {
  var hiddenKeys = tendHiddenSeriesRead();
  var list = [];
  for (var hi = 0; hi < hiddenKeys.length; hi++) {
    var entry = hiddenKeys[hi];
    var pipe = entry.indexOf('|');
    if (pipe < 1) continue;
    var sk = entry.slice(0, pipe);
    var fk = entry.slice(pipe + 1);
    if (!fk) continue;
    list.push({ sectionKey: sk, fieldKey: fk });
  }
  return list;
}

function buildTendHiddenChipsHtml() {
  var desc = tendHiddenChipDescriptors();
  var svg = tendEyeVisibilitySvg();
  var chips = [];
  for (var i = 0; i < desc.length; i++) {
    var sk = desc[i].sectionKey;
    var fk = desc[i].fieldKey;
    var label = esc(tendFindSeriesSpec(sk, fk).cardTitle || fk);
    chips.push(
      '<span class="tend-hidden-chip" data-series-key="' +
      esc(tendCatalogSeriesKey(sk, fk)) +
      '">' +
      '<span class="tend-hidden-chip-label">' +
      label +
      '</span>' +
      '<button type="button" class="tend-hidden-chip-btn" title="Volver a mostrar" aria-label="Mostrar de nuevo">' +
      svg +
      '</button></span>'
    );
  }
  return chips.join('');
}

function refreshTendHiddenModalContent() {
  var el = document.getElementById('tend-hidden-modal-chips');
  if (!el) return;
  var html = buildTendHiddenChipsHtml();
  el.innerHTML =
    html ||
    '<p style="margin:0;font-size:13px;color:var(--text-muted);">No hay analitos ocultos.</p>';
}

function openTendHiddenModal() {
  var bd = document.getElementById('tend-hidden-modal-backdrop');
  if (!bd) return;
  refreshTendHiddenModalContent();
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');
}

export function closeTendHiddenModal() {
  var bd = document.getElementById('tend-hidden-modal-backdrop');
  if (!bd) return;
  bd.classList.remove('open');
  bd.setAttribute('aria-hidden', 'true');
}

function buildTendInlineControlsHtml(hiddenCount, opts) {
  opts = opts || {};
  var on = tendAbnormalOnlyRead();
  var hint = on
    ? 'Solo analitos con último valor fuera del rango de referencia del laboratorio (si hay referencia).'
    : 'Vista completa: todos los analitos con datos suficientes para tendencia.';
  var toggleLabel = on ? 'Ver todas' : 'Solo fuera de rango';
  var ocultosBtn =
    hiddenCount > 0
      ? '<button type="button" class="tend-toolbar-btn tend-ocultos-trigger">Ocultos (' +
        hiddenCount +
        ')</button>'
      : '';
  var gasoBtn = opts.showGasoExtended
    ? '<button type="button" class="tend-toolbar-btn tend-gaso-ext-trigger" data-tend-action="gaso-extended">Gasometría extendida</button>'
    : '';
  return (
    '<div class="tend-inline-controls">' +
    '<button type="button" class="tend-toolbar-toggle' +
    (on ? ' is-active' : '') +
    '" aria-pressed="' +
    (on ? 'true' : 'false') +
    '" title="' +
    esc(hint) +
    '">' +
    esc(toggleLabel) +
    '</button>' +
    ocultosBtn +
    gasoBtn +
    '<button type="button" class="tend-toolbar-btn" data-tour="casiopea-trends-send" onclick="openSesionIngresoTrendsSendModal()">Enviar a Neo</button>' +
    '</div>'
  );
}

function historyHasGasoForExtended(historyDesc) {
  var latest = historyDesc && historyDesc[0];
  if (!latest || !latest.parsedBySection || !latest.parsedBySection.GASES) return false;
  return getSetTrendValueForSeries(latest, 'GASES', 'pH') != null;
}

function toggleTendAbnormalOnlyFilter() {
  tendAbnormalOnlyWrite(!tendAbnormalOnlyRead());
  renderTendencias();
}

function tendHideSeriesFromCard(ev, sectionKey, fieldKey) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  tendSeriesSetUserHidden(sectionKey, fieldKey, true);
  renderTendencias();
}

function tendUnhideSeries(sectionKey, fieldKey) {
  tendSeriesSetUserHidden(sectionKey, fieldKey, false);
  renderTendencias();
}

function tendResetAllHiddenSeries() {
  tendHiddenSeriesWrite([]);
  closeTendHiddenModal();
  renderTendencias();
}

function trendSparkDomId(sectionKey, fieldKey) {
  return (
    'spark-' +
    String(sectionKey).replace(/[^a-zA-Z0-9]+/g, '_') +
    '-' +
    String(fieldKey).replace(/[^a-zA-Z0-9]+/g, '_')
  );
}

function trendSparkChartKey(sectionKey, fieldKey) {
  return sectionKey + '\x01' + fieldKey;
}


function formatDMYDate(d) {
  if (!d || isNaN(d.getTime())) return '';
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
}

/** Fecha aproximada desde id numérico (timestamp al guardar el set). */
function inferFechaLabSetFromId(set) {
  if (!set || set.fecha === 'Anterior') return '';
  var id = String(set.id || '');
  if (!/^\d{10,}$/.test(id)) return '';
  var ms = parseInt(id, 10);
  if (id.length === 10) ms *= 1000;
  return formatDMYDate(new Date(ms));
}

/**
 * Bloque "anterior" de estudios (líneas 0–2): suele traer la fecha en la 1.ª línea
 * o en FECHA/HORA. Si no, se usa la fecha de la nota clínica como último recurso.
 */
function inferAnteriorLabDateFromNote(patientId) {
  var n = notes[patientId];
  if (!n || !n.estudios) return '';
  var lines = n.estudios.split('\n');
  for (var i = 0; i < 3 && i < lines.length; i++) {
    var t = (lines[i] || '').trim();
    if (!t) continue;
    var mFh = t.match(/FECHA[^\d:]*(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/i);
    if (mFh) {
      var nf0 = normalizeFechaLabHistory(mFh[1]);
      if (nf0 && nf0 !== 'Anterior' && parseFechaLabToMs(nf0, '') > 0) return nf0;
    }
    var mSub = t.match(/(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/);
    if (mSub) {
      var nf1 = normalizeFechaLabHistory(mSub[1]);
      if (nf1 && nf1 !== 'Anterior' && parseFechaLabToMs(nf1, '') > 0) return nf1;
    }
    var nf2 = normalizeFechaLabHistory(t);
    if (nf2 && nf2 !== 'Anterior' && parseFechaLabToMs(nf2, '') > 0) return nf2;
  }
  if (n.fecha) {
    var nf3 = normalizeFechaLabHistory(n.fecha);
    if (nf3 && nf3 !== 'Anterior' && parseFechaLabToMs(nf3, '') > 0) return nf3;
  }
  return '';
}

function tendFinishRangeVbars(container) {
  if (!container) return;
  var reduced = rt.rpcPrefersReducedMotion();
  var apply = function () {
    var vbars = container.querySelectorAll('.tend-range-vbar');
    for (var i = 0; i < vbars.length; i++) {
      var vb = vbars[i];
      vb.classList.add('tend-vbar-ready');
      var m = vb.querySelector('.tend-range-vbar-marker');
      if (m) {
        var t = m.getAttribute('data-target-bottom');
        if (t !== null && t !== '') {
          m.style.bottom = 'max(2px, calc(' + t + '% - 5px))';
        }
      }
    }
  };
  if (reduced) apply();
  else {
    requestAnimationFrame(function () {
      requestAnimationFrame(apply);
    });
  }
}

/**
 * HTML de la barra de rango (modal de tendencia).
 * Con yBounds (eje Y del gráfico): misma escala que el chart; solo si el rango
 * orientativo intersecta lo visible; si no hay intersección, no se dibuja.
 */
function tendRefVbarMarkup(ref, latest, delayMs, extraClass, yBounds) {
  extraClass = extraClass || '';
  if (!ref || !isFinite(ref[0]) || !isFinite(ref[1]) || ref[1] <= ref[0] || !isFinite(latest)) {
    return '';
  }
  var low = Number(ref[0]);
  var high = Number(ref[1]);
  var latestN = Number(latest);
  var isAb = latestN < low || latestN > high;
  var normBottom;
  var normTop;
  var pos;

  if (yBounds && isFinite(yBounds.min) && isFinite(yBounds.max) && yBounds.max > yBounds.min) {
    var yMin = yBounds.min;
    var yMax = yBounds.max;
    var ySpan = yMax - yMin;
    var visLow = Math.max(low, yMin);
    var visHigh = Math.min(high, yMax);
    if (visHigh <= visLow) return '';
    normBottom = ((visLow - yMin) / ySpan) * 100;
    normTop = ((visHigh - yMin) / ySpan) * 100;
    pos = ((latestN - yMin) / ySpan) * 100;
  } else {
    var span = high - low;
    var fullMin = low - span * 0.5;
    var fullMax = high + span * 0.5;
    if (fullMax <= fullMin) {
      fullMin = low;
      fullMax = high;
    }
    var range = fullMax - fullMin;
    pos = ((latestN - fullMin) / range) * 100;
    normBottom = ((low - fullMin) / range) * 100;
    normTop = ((high - fullMin) / range) * 100;
  }

  if (pos < 0) pos = 0;
  if (pos > 100) pos = 100;
  if (normBottom < 0) normBottom = 0;
  if (normTop > 100) normTop = 100;
  var normH = normTop - normBottom;
  if (normH <= 0) return '';
  var stateClass = isAb ? ' is-abnormal' : ' is-normal';
  var d = delayMs != null ? delayMs : 0;
  return (
    '<div class="tend-range-vbar' +
    extraClass +
    stateClass +
    '" style="--tend-vbar-delay:' +
    d +
    'ms" title="Rango de referencia (' +
    low +
    '–' +
    high +
    ') · último ' +
    latest +
    '">' +
    '<div class="tend-range-vbar-track"></div>' +
    '<div class="tend-range-vbar-norm" style="bottom:' +
    normBottom.toFixed(2) +
    '%;height:' +
    normH.toFixed(2) +
    '%"></div>' +
    '<div class="tend-range-vbar-marker" data-target-bottom="' +
    pos.toFixed(2) +
    '"></div>' +
    '</div>'
  );
}

function tendDetailChartYBounds(chart) {
  if (!chart || !chart.scales || !chart.scales.y) return null;
  var y = chart.scales.y;
  if (!isFinite(y.min) || !isFinite(y.max) || y.max <= y.min) return null;
  return { min: y.min, max: y.max };
}

function syncTendDetailVbar(ref, latest) {
  var vbarSlot = document.getElementById('tend-detail-vbar-slot');
  if (!vbarSlot) return;
  var yBounds = tendDetailChartYBounds(detailChart);
  vbarSlot.innerHTML = tendRefVbarMarkup(ref, latest, 0, ' tend-detail-vbar', yBounds);
  vbarSlot.setAttribute('aria-hidden', vbarSlot.innerHTML ? 'false' : 'true');
  tendFinishRangeVbars(vbarSlot);
}

var tendGroupModal = null;

export function closeTendGroupModal() {
  var ctx = getGuidedTourContext();
  var advanceTourAfterChart = ctx.active && ctx.stepId === 'sala_tend_chart';
  if (tendGroupModal) tendGroupModal.close();
  if (advanceTourAfterChart) guidedTourAdvanceAfter('sala_tend_chart');
}

function initTendGroupModal() {
  if (tendGroupModal) return;
  tendGroupModal = createTendGroupModal({
    onRequestClose: closeTendGroupModal,
    getActiveId: function () {
      return aid();
    },
    getHistory: function () {
      var pid = aid();
      return pid ? tendParsedHistoryDesc(pid) : [];
    },
    getSectionLabel: getTendSectionLabel,
    getCatalogSpecs: getTendCatalogSpecsForSection,
    buildMergedTrendSeriesCatalog: buildMergedTrendSeriesCatalog,
    tendUnitForSeries: tendUnitForSeries,
    tendRefFromLabSet: tendRefFromLabSet,
    tendRefForSeries: tendRefForSeries,
    buildColHeader: function (set) {
      return rt.buildLabSetDateLine(set);
    },
    esc: esc,
    Chart: typeof Chart !== 'undefined' ? Chart : undefined,
    showToast: function (a, b) {
      rt.showToast(a, b);
    },
  });
}

function openTendGroupModal(sectionKey) {
  initTendGroupModal();
  tendGroupModal.open(sectionKey);
}

function openTendGasoExtendedModal() {
  initTendGroupModal();
  tendGroupModal.openGasoExtended();
}

function setTendGroupTab(name) {
  initTendGroupModal();
  tendGroupModal.setTab(name);
}

function copyTendGroupTablePng() {
  initTendGroupModal();
  tendGroupModal.copyTablePng();
}

function copyTendGroupTableText() {
  initTendGroupModal();
  tendGroupModal.copyTableText();
}

function tendSectionChartSvg() {
  return (
    '<svg class="tend-section-chart-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M3 17l6-6 4 4 8-10"/>' +
    '<path d="M3 12l5-4 4 3 9-7"/>' +
    '</svg>'
  );
}

function destroyTendCardSortables() {
  _tendCardSortables.forEach(function (s) {
    try {
      if (s && typeof s.destroy === 'function') s.destroy();
    } catch (_e) {}
  });
  _tendCardSortables = [];
}

function syncTendCardOrderFromDom(sectionKey) {
  if (!aid() || !sectionKey) return;
  var zone = null;
  document.querySelectorAll('.tend-sort-zone[data-section-key]').forEach(function (el) {
    if (el.getAttribute('data-section-key') === sectionKey) zone = el;
  });
  if (!zone) return;
  var order = [];
  zone.querySelectorAll('.tend-card[data-series-key]').forEach(function (el) {
    var k = el.getAttribute('data-series-key');
    if (k) order.push(k);
  });
  if (order.length) writeTendCardOrder(aid(), sectionKey, order);
}

var _tendPointerDidDrag = false;
var TEND_CARD_DRAG_THRESHOLD_PX = 5;
var _tendenciasClickDelegationWired = false;

/** Clics en Tendencias sin depender de onclick en window (módulos ES). */
function ensureTendenciasClickDelegation() {
  if (_tendenciasClickDelegationWired) return;
  var root = document.getElementById('tendencias-container');
  if (!root) {
    if (typeof document !== 'undefined' && document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ensureTendenciasClickDelegation, {
        once: true,
      });
    }
    return;
  }
  _tendenciasClickDelegationWired = true;
  root.addEventListener('click', onTendenciasContainerClick);

  var hiddenBackdrop = document.getElementById('tend-hidden-modal-backdrop');
  if (hiddenBackdrop) {
    hiddenBackdrop.addEventListener('click', onTendHiddenModalClick);
    var resetBtn = hiddenBackdrop.querySelector('.modal-actions .btn-save');
    if (resetBtn) resetBtn.setAttribute('data-tend-action', 'reset-hidden');
  }
}

function onTendHiddenModalClick(ev) {
  if (ev.target === ev.currentTarget) {
    closeTendHiddenModal();
    return;
  }
  onTendenciasContainerClick(ev);
}

function onTendenciasContainerClick(ev) {
  var t = ev.target;
  if (!t || !t.closest) return;

  var abnormalBtn = t.closest('.tend-toolbar-toggle');
  if (abnormalBtn) {
    ev.preventDefault();
    toggleTendAbnormalOnlyFilter();
    return;
  }
  var ocultosBtn = t.closest('.tend-ocultos-trigger');
  if (ocultosBtn) {
    ev.preventDefault();
    openTendHiddenModal();
    return;
  }
  var gasoBtn = t.closest('[data-tend-action="gaso-extended"]');
  if (gasoBtn) {
    ev.preventDefault();
    openTendGasoExtendedModal();
    return;
  }
  var sectionToggle = t.closest('.tend-section-toggle');
  if (sectionToggle) {
    var sectionEl = sectionToggle.closest('.tend-section');
    var sk = sectionEl && sectionEl.getAttribute('data-section');
    if (sk) toggleTendSection(ev, sk);
    return;
  }
  var chartBtn = t.closest('.tend-section-chart-btn');
  if (chartBtn) {
    var sectionEl2 = chartBtn.closest('.tend-section');
    var sk2 = sectionEl2 && sectionEl2.getAttribute('data-section');
    if (sk2) openTendGroupModal(sk2);
    return;
  }
  var unhideBtn = t.closest('.tend-hidden-chip-btn');
  if (unhideBtn) {
    var chip = unhideBtn.closest('.tend-hidden-chip');
    var seriesKey = chip && chip.getAttribute('data-series-key');
    if (seriesKey) {
      var pipe = seriesKey.indexOf('|');
      if (pipe > 0) {
        ev.preventDefault();
        ev.stopPropagation();
        tendUnhideSeries(seriesKey.slice(0, pipe), seriesKey.slice(pipe + 1));
      }
    }
    return;
  }
  var resetBtn = t.closest('[data-tend-action="reset-hidden"]');
  if (resetBtn) {
    ev.preventDefault();
    tendResetAllHiddenSeries();
    return;
  }
  var card = t.closest('.tend-card');
  if (card) {
    var key = card.getAttribute('data-series-key');
    if (key) {
      var p = key.indexOf('|');
      if (p > 0) tendCardActivate(ev, key.slice(0, p), key.slice(p + 1));
    }
  }
}

function tendCardActivate(ev, sectionKey, fieldKey) {
  if (_tendPointerDidDrag) {
    _tendPointerDidDrag = false;
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    return;
  }
  openTendDetail(sectionKey, fieldKey);
}

/** Arrastre por puntero (clon fixed): evita conflictos Sortable + grid/transform en Electron. */
function mountTendCardPointerSort(zone, sectionKey) {
  var scrollRoot = document.getElementById('tendencias-container');
  var state = null;

  function zoneCards() {
    return Array.prototype.slice.call(zone.children).filter(function (el) {
      return (
        el.classList &&
        el.classList.contains('tend-card') &&
        el.hasAttribute('data-series-key')
      );
    });
  }

  function beginDragVisuals() {
    if (!state || state.ghost) return;
    var card = state.card;
    var rect = card.getBoundingClientRect();
    var ghost = card.cloneNode(true);
    ghost.classList.add('tend-drag-hovercard');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.style.position = 'fixed';
    ghost.style.left = rect.left + 'px';
    ghost.style.top = rect.top + 'px';
    ghost.style.width = rect.width + 'px';
    ghost.style.height = rect.height + 'px';
    ghost.style.margin = '0';
    ghost.style.boxSizing = 'border-box';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '10060';
    ghost.style.transition = 'none';
    ghost.style.opacity = '1';
    document.body.appendChild(ghost);
    card.classList.add('tend-card--sort-source');
    state.ghost = ghost;
    state.offsetX = state.startX - rect.left;
    state.offsetY = state.startY - rect.top;
  }

  function clearState() {
    if (!state) return;
    if (state.ghost && state.ghost.parentNode) state.ghost.parentNode.removeChild(state.ghost);
    state.card.classList.remove('tend-card--sort-source');
    state.card.style.width = '';
    state.card.style.maxWidth = '';
    state = null;
  }

  /** Devuelve el nodo antes del cual insertar (null = al final). Soporta huecos horizontales en la rejilla. */
  function findInsertBefore(clientX, clientY) {
    var cards = zoneCards().filter(function (c) {
      return c !== state.card;
    });
    if (!cards.length) return null;

    var i;
    for (i = 0; i < cards.length; i++) {
      var r = cards[i].getBoundingClientRect();
      if (
        clientX >= r.left &&
        clientX <= r.right &&
        clientY >= r.top &&
        clientY <= r.bottom
      ) {
        if (clientX < r.left + r.width * 0.5) return cards[i];
        return cards[i + 1] || null;
      }
    }

    for (i = 0; i < cards.length - 1; i++) {
      var ra = cards[i].getBoundingClientRect();
      var rb = cards[i + 1].getBoundingClientRect();
      var sameRow = Math.abs(ra.top - rb.top) < Math.min(ra.height, rb.height) * 0.45;
      if (!sameRow) continue;
      if (
        clientX > ra.right &&
        clientX < rb.left &&
        clientY >= Math.min(ra.top, rb.top) - 10 &&
        clientY <= Math.max(ra.bottom, rb.bottom) + 10
      ) {
        return cards[i + 1];
      }
    }

    for (i = 0; i < cards.length; i++) {
      var rj = cards[i].getBoundingClientRect();
      if (clientY < rj.top + rj.height * 0.5) return cards[i];
    }
    return null;
  }

  function onPointerMove(e) {
    if (!state || e.pointerId !== state.pointerId) return;
    var dx = e.clientX - state.startX;
    var dy = e.clientY - state.startY;
    if (!state.moved) {
      if (dx * dx + dy * dy < TEND_CARD_DRAG_THRESHOLD_PX * TEND_CARD_DRAG_THRESHOLD_PX) return;
      state.moved = true;
      beginDragVisuals();
    }
    if (!state.ghost) return;
    state.ghost.style.left = e.clientX - state.offsetX + 'px';
    state.ghost.style.top = e.clientY - state.offsetY + 'px';
    var before = findInsertBefore(e.clientX, e.clientY);
    if (before) zone.insertBefore(state.card, before);
    else zone.appendChild(state.card);
    if (scrollRoot) {
      var sr = scrollRoot.getBoundingClientRect();
      if (e.clientY < sr.top + 54) scrollRoot.scrollTop -= 9;
      else if (e.clientY > sr.bottom - 54) scrollRoot.scrollTop += 9;
    }
  }

  function onPointerUp(e) {
    if (!state || e.pointerId !== state.pointerId) return;
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);
    if (state.moved) {
      syncTendCardOrderFromDom(sectionKey);
      _tendPointerDidDrag = true;
    }
    clearState();
  }

  function onPointerDown(e) {
    if (state) return;
    if (e.button !== 0) return;
    if (e.target.closest('button, a[href], input, textarea, select')) return;
    var card = e.target.closest('.tend-card');
    if (!card || !zone.contains(card)) return;
    state = {
      card: card,
      ghost: null,
      pointerId: e.pointerId,
      offsetX: 0,
      offsetY: 0,
      startX: e.clientX,
      startY: e.clientY,
      moved: false
    };
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
  }

  zone.addEventListener('pointerdown', onPointerDown);
  return {
    destroy: function () {
      zone.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
      clearState();
    }
  };
}

function mountTendCardSortables() {
  destroyTendCardSortables();
  if (!aid()) return;
  document.querySelectorAll('.tend-sort-zone[data-section-key]').forEach(function (zone) {
    var sectionKey = zone.getAttribute('data-section-key');
    if (!sectionKey || !zone.querySelector('.tend-card')) return;
    _tendCardSortables.push(mountTendCardPointerSort(zone, sectionKey));
  });
}

function renderTendencias(opts) {
  opts = opts || {};
  var onReady = typeof opts.onReady === 'function' ? opts.onReady : null;
  var container = document.getElementById('tendencias-container');
  if (!container) {
    if (onReady) onReady();
    return;
  }
  ensureTendenciasClickDelegation();

  var paint = function () {
    try {
      renderTendenciasBody(container);
    } catch (err) {
      console.error('[R+ Tendencias] Error al renderizar:', err);
      container.innerHTML =
        '<p class="tend-empty">No se pudieron cargar las tendencias. Revisa la consola (F12) o recarga la app.</p>';
    }
    if (onReady) onReady();
  };

  if (opts.syncHeavy) {
    paint();
    return;
  }

  if (!container.querySelector('.tend-grid, .tend-toolbar, .tend-empty')) {
    container.innerHTML = '<p class="tend-empty tend-loading">Cargando tendencias…</p>';
  }
  scheduleAfterPaint(paint);
}

function renderTendenciasBody(container) {
  destroyTendCardSortables();
  Object.keys(sparkCharts).forEach(function (k) {
    destroySparkChartEntry(k);
  });
  if (!aid()) {
    _tendRenderState.key = null;
    _tendRenderState.seriesKeys = [];
    closeTendHiddenModal();
    container.innerHTML = '<p class="tend-empty">Selecciona un paciente.</p>';
    return;
  }
  var historyDesc = tendParsedHistoryDesc(aid());
  if (historyDesc.length < 2) {
    _tendRenderState.key = null;
    _tendRenderState.seriesKeys = [];
    closeTendHiddenModal();
    container.innerHTML = '<p class="tend-empty">Agrega al menos 2 sets de laboratorio para ver tendencias.</p>';
    return;
  }
  var historyAsc = historyDesc.slice().reverse();
  var catalogAsc = getTrendRenderWindow(historyAsc, 'catalog');

  var mergedCatalog = buildMergedTrendSeriesCatalog(historyDesc);
  var indexCacheKey =
    String(aid()) +
    '|' +
    getLabHistoryRevision(aid()) +
    '|' +
    mergedCatalog.length +
    '|' +
    historyDesc.length;
  var seriesIndex = buildTrendSeriesIndexCached(indexCacheKey, {
    catalogSpecs: mergedCatalog,
    historyFullDesc: historyDesc,
    windowHistoryAsc: catalogAsc,
    tendRefForSeries: tendRefForSeries,
  });
  _tendRenderState.seriesIndex = seriesIndex;
  _tendRenderState.seriesAvail = null;
  var seriesAvail = [];
  for (var ci = 0; ci < mergedCatalog.length; ci++) {
    var sp = mergedCatalog[ci];
    var sk = sp.sectionKey;
    var fk = sp.fieldKey;
    if (tendSeriesIsUserHidden(sk, fk)) continue;
    var idxAvail = seriesIndex[tendCatalogSeriesKey(sk, fk)];
    if (!idxAvail || idxAvail.setsDesc.length < 2) continue;
    seriesAvail.push(sp);
  }
  var seriesAvailFull = seriesAvail.slice();
  var abnormalOnly = tendAbnormalOnlyRead();
  if (abnormalOnly) {
    seriesAvail = seriesAvail.filter(function (sp) {
      var idxAb = seriesIndex[tendCatalogSeriesKey(sp.sectionKey, sp.fieldKey)];
      return idxAb && idxAb.isAbnormal;
    });
  }
  _tendRenderState.seriesAvail = seriesAvail;

  var hiddenChipN = tendHiddenChipDescriptors().length;
  var toolbarOpts = { showGasoExtended: historyHasGasoForExtended(historyDesc) };
  var toolbarHtml = buildTendInlineControlsHtml(hiddenChipN, toolbarOpts);

  if (!seriesAvail.length) {
    var anyData = mergedCatalog.some(function (sp) {
      var idxAny = seriesIndex[tendCatalogSeriesKey(sp.sectionKey, sp.fieldKey)];
      return idxAny && idxAny.setsDesc.length >= 2;
    });
    var hiddenAll =
      anyData &&
      !mergedCatalog.some(function (sp) {
        if (tendSeriesIsUserHidden(sp.sectionKey, sp.fieldKey)) return false;
        var idxVis = seriesIndex[tendCatalogSeriesKey(sp.sectionKey, sp.fieldKey)];
        return idxVis && idxVis.setsDesc.length >= 2;
      });
    if (abnormalOnly && seriesAvailFull.length) {
      container.innerHTML =
        toolbarHtml +
        '<p class="tend-empty">Ningún analito está fuera de rango de referencia (o no tiene referencia en el reporte). Pulsa <strong>Ver todas</strong> (tooltip en el botón) para volver a la vista completa.</p>';
      syncTendHiddenModalIfOpen();
      return;
    }
    if (hiddenAll) {
      container.innerHTML =
        toolbarHtml +
        '<p class="tend-empty">Los analitos con datos están <strong>ocultos</strong>. Pulsa <strong>Ocultos</strong> y restaura con el ojo o <strong>Mostrar todos</strong>.</p>';
    } else {
      container.innerHTML =
        toolbarHtml +
        '<p class="tend-empty">No hay parámetros con suficientes datos para graficar.</p>';
    }
    syncTendHiddenModalIfOpen();
    return;
  }

  var bySection = Object.create(null);
  seriesAvail.forEach(function (spec) {
    var k = spec.sectionKey;
    if (!bySection[k]) bySection[k] = [];
    bySection[k].push(spec);
  });
  var sectionsOrdered = [];
  for (var oi = 0; oi < TEND_SECTION_ORDER.length; oi++) {
    var sec = TEND_SECTION_ORDER[oi];
    if (bySection[sec] && bySection[sec].length) sectionsOrdered.push(sec);
  }
  Object.keys(bySection).forEach(function (sec) {
    if (sectionsOrdered.indexOf(sec) === -1) sectionsOrdered.push(sec);
  });

  var chartAnim = rt.rpcPrefersReducedMotion()
    ? false
    : { duration: 600, easing: 'easeOutQuart' };

  var renderKey = buildTendRenderKey(
    aid(),
    getLabHistoryRevision(aid()),
    tendPrefsHash(),
    tendExpandedSectionsKey()
  );
  var nextSeriesKeys = seriesAvail.map(function (sp) {
    return tendCatalogSeriesKey(sp.sectionKey, sp.fieldKey);
  });
  var canPatch =
    _tendRenderState.key === renderKey &&
    _tendRenderState.seriesKeys.length === nextSeriesKeys.length &&
    _tendRenderState.seriesKeys.every(function (k, i) {
      return k === nextSeriesKeys[i];
    }) &&
    container.querySelector('.tend-grid');

  if (canPatch && patchTendCardsFromIndex(seriesIndex, seriesAvail)) {
    var patchJobs = [];
    for (var pj = 0; pj < seriesAvail.length; pj += 1) {
      var spP = seriesAvail[pj];
      var skP = spP.sectionKey;
      var fkP = spP.fieldKey;
      if (!tendSectionIsExpanded(skP)) continue;
      var idxP = seriesIndex[tendCatalogSeriesKey(skP, fkP)];
      if (!idxP || !idxP.setsDesc.length) continue;
      var sparkDescP = idxP.setsDesc.slice(0, TREND_SPARK_WINDOW);
      var setsAscP = toTrendAscendingSets(sparkDescP);
      patchJobs.push({
        sk2: skP,
        fk2: fkP,
        setsDesc2: sparkDescP,
        labels2: buildTendChartLabels(setsAscP),
        values2: setsAscP.map(function (s) {
          return getSetTrendValueForSeries(s, skP, fkP);
        }),
      });
    }
    updateSparkChartsFromJobs(patchJobs, chartAnim);
    syncTendHiddenModalIfOpen();
    return;
  }

  _tendRenderState.key = renderKey;
  _tendRenderState.seriesKeys = nextSeriesKeys;

  var htmlParts = [];
  htmlParts.push(buildTendInlineControlsHtml(hiddenChipN, toolbarOpts));
  for (var si = 0; si < sectionsOrdered.length; si++) {
    var sectionKey = sectionsOrdered[si];
    var expanded = tendSectionIsExpanded(sectionKey);
    var secLabel = TEND_SECTION_LABELS[sectionKey] || sectionKey;
    var list = orderTrendSeriesBySaved(
      bySection[sectionKey],
      readTendCardOrder(aid(), sectionKey)
    );
    var cardParts = [];
    for (var li = 0; li < list.length; li++) {
      var spec = list[li];
      var fk = spec.fieldKey;
      var idxCard = seriesIndex[tendCatalogSeriesKey(sectionKey, fk)];
      var latest = idxCard ? idxCard.latest : null;
      var isAb = idxCard ? idxCard.isAbnormal : false;
      var domId = trendSparkDomId(sectionKey, fk);
      var labelParts = tendCardLabelParts(sectionKey, fk);
      var titleEsc = esc(labelParts.title);
      var unitHtml = labelParts.unit
        ? '<div class="tend-unit">' + esc(labelParts.unit) + '</div>'
        : '';
      var seriesKey = tendCatalogSeriesKey(sectionKey, fk);
      cardParts.push(
        '<div class="tend-card" role="button" tabindex="0" data-series-key="' +
          esc(seriesKey) +
          '" data-abnormal="' +
          (isAb ? '1' : '0') +
          '">' +
          '<div class="tend-card-header">' +
          '<span class="tend-param-name">' +
          titleEsc +
          '</span>' +
          '<span class="tend-param-value' +
          (isAb ? ' tend-abnormal' : '') +
          '">' +
          (latest != null ? latest : '—') +
          '</span>' +
          '</div>' +
          unitHtml +
          '<div class="tend-spark-wrap">' +
          '<div class="tend-spark-canvas-cell">' +
          (expanded
            ? '<canvas id="' + domId + '"></canvas>'
            : '<div class="tend-spark-placeholder" aria-hidden="true"></div>') +
          '</div>' +
          '</div>' +
          '</div>'
      );
    }
    htmlParts.push(
      '<section class="tend-section" data-section="' +
        esc(sectionKey) +
        '">' +
        '<div class="tend-section-head">' +
        '<button type="button" class="tend-section-toggle" aria-expanded="' +
        (expanded ? 'true' : 'false') +
        '">' +
        '<span class="tend-section-chevron" aria-hidden="true">' +
        (expanded ? '▼' : '▶') +
        '</span>' +
        '<span class="tend-section-title">' +
        esc(secLabel) +
        '</span></button>' +
        '<span class="tend-section-toggle-end">' +
        '<span class="tend-section-count">' +
        list.length +
        '</span>' +
        (list.length > 0
          ? '<button type="button" class="tend-section-chart-btn" title="Abrir gráfica y tabla del estudio" aria-label="Gráfica del estudio">' +
            tendSectionChartSvg() +
            '<span class="tend-section-chart-label">Gráfica</span></button>'
          : '') +
        '</span></div>' +
        '<div class="tend-section-body' +
        (expanded ? '' : ' tend-section-body--collapsed') +
        '">' +
        '<div class="tend-grid tend-sort-zone" data-section-key="' +
        esc(sectionKey) +
        '">' +
        cardParts.join('') +
        '</div></div></section>'
    );
  }
  container.innerHTML = htmlParts.join('');

  buildSparkJobsFromIndex(seriesAvail, seriesIndex, chartAnim);
}

function downsampleTrendChartSeries(labels, values, maxPoints) {
  var slots = maxPoints == null ? TREND_DETAIL_DOWNSAMPLE : maxPoints;
  if (!labels || !labels.length || labels.length <= slots) {
    return { labels: labels || [], values: values || [] };
  }
  var outL = [];
  var outV = [];
  var n = labels.length;
  for (var i = 0; i < slots; i += 1) {
    var idx = Math.round((i * (n - 1)) / (slots - 1));
    outL.push(labels[idx]);
    outV.push(values[idx]);
  }
  return { labels: outL, values: outV };
}

function mountOneTrendSparkChart(job, history, chartAnim) {
  var sk2 = job.sk2;
  var fk2 = job.fk2;
  var canvas2 = document.getElementById(trendSparkDomId(sk2, fk2));
  if (!canvas2 || typeof Chart === 'undefined') return;
  var ck = trendSparkChartKey(sk2, fk2);
  var latestSetSpark = job.setsDesc2.length ? job.setsDesc2[0] : null;
  var latestSpark = latestSetSpark
    ? getSetTrendValueForSeries(latestSetSpark, sk2, fk2)
    : null;
  var refSpark = tendRefForSeries(history, sk2, fk2, latestSetSpark);
  var isAbSpark =
    refSpark &&
    latestSpark != null &&
    (latestSpark < refSpark[0] || latestSpark > refSpark[1]);
  var lineColor = isAbSpark ? '#f87171' : 'rgba(52,211,153,0.95)';
  sparkCharts[ck] = new Chart(canvas2, {
    type: 'line',
    data: {
      labels: job.labels2,
      datasets: [
        {
          data: job.values2,
          borderColor: lineColor,
          borderWidth: 2.25,
          pointRadius: 2,
          pointBackgroundColor: lineColor,
          tension: 0.3,
          fill: false,
          clip: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: chartAnim,
      layout: { padding: { left: 6, right: 6, top: 8, bottom: 6 } },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { display: false, grid: { display: false }, offset: true },
        y: { display: false, grid: { display: false }, grace: '12%' },
      },
    },
  });
}

function syncTendHiddenModalIfOpen() {
  var bd = document.getElementById('tend-hidden-modal-backdrop');
  if (bd && bd.classList.contains('open')) {
    refreshTendHiddenModalContent();
  }
}

function openTendDetail(sectionKey, fieldKey) {
  if (!aid() || sectionKey == null || fieldKey == null) return;
  var history = tendParsedHistoryDesc(aid());
  var setsDesc = dedupeTrendSetsForSeries(
    history.filter(function (s) {
      return getSetTrendValueForSeries(s, sectionKey, fieldKey) != null;
    }),
    sectionKey,
    fieldKey
  );
  if (setsDesc.length < 2) return;
  var setsAsc = toTrendAscendingSets(setsDesc);
  var labels = buildTendChartLabels(setsAsc);
  var values = setsAsc.map(function (s) {
    return getSetTrendValueForSeries(s, sectionKey, fieldKey);
  });
  var sampled =
    labels.length > TREND_DETAIL_DOWNSAMPLE
      ? downsampleTrendChartSeries(labels, values, TREND_DETAIL_DOWNSAMPLE)
      : { labels: labels, values: values };
  labels = sampled.labels;
  values = sampled.values;
  var labelParts = tendCardLabelParts(sectionKey, fieldKey);
  var spec = tendFindSeriesSpec(sectionKey, fieldKey);
  var title = labelParts.title;
  var unit = labelParts.unit;
  var latestSet = setsDesc.length ? setsDesc[0] : null;
  var latest = latestSet ? getSetTrendValueForSeries(latestSet, sectionKey, fieldKey) : null;
  var ref = tendRefForSeries(history, sectionKey, fieldKey, latestSet);
  document.getElementById('tend-detail-title').textContent =
    title + (labelParts.unit ? ' (' + labelParts.unit + ')' : '');
  var vbarSlot = document.getElementById('tend-detail-vbar-slot');
  if (vbarSlot) {
    vbarSlot.innerHTML = '';
    vbarSlot.setAttribute('aria-hidden', 'true');
  }
  var backdrop = document.getElementById('tend-detail-backdrop');
  if (!backdrop) return;
  backdrop.style.display = 'flex';
  var canvas = document.getElementById('tend-detail-canvas');
  if (!canvas || typeof Chart === 'undefined') {
    rt.showToast('Gráfica no disponible (Chart.js no cargó). Recarga la app.', 'error');
    backdrop.style.display = 'none';
    return;
  }
  if (detailChart) {
    detailChart.destroy();
    detailChart = null;
  }
  var datasets = [
    {
      label: title,
      data: values,
      borderColor: '#10b981',
      backgroundColor: 'rgba(16,185,129,0.08)',
      borderWidth: 2.5,
      pointRadius: 5,
      pointBackgroundColor: '#10b981',
      tension: 0.3,
      fill: false
    }
  ];
  detailChart = new Chart(canvas, {
    type: 'line',
    data: { labels: labels, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { right: 12, left: 4, top: 8, bottom: 4 } },
      interaction: { mode: 'index', intersect: false, axis: 'x' },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false,
          position: 'nearest',
          callbacks: {
            label: function (ctx) {
              return ctx.datasetIndex === 0 ? title + ': ' + ctx.parsed.y + ' ' + unit : null;
            }
          }
        }
      },
      scales: {
        x: { ticks: { font: { size: 12 } }, offset: true },
        y: {
          ticks: { font: { size: 12 } },
          title: { display: !!unit, text: unit, font: { size: 11 } }
        }
      }
    }
  });
  syncTendDetailVbar(ref, latest);
}

export function closeTendDetail() {
  document.getElementById('tend-detail-backdrop').style.display = 'none';
  var vbarSlot = document.getElementById('tend-detail-vbar-slot');
  if (vbarSlot) {
    vbarSlot.innerHTML = '';
    vbarSlot.setAttribute('aria-hidden', 'true');
  }
  if (detailChart) { detailChart.destroy(); detailChart = null; }
}

export function isTendGroupModalOpen() {
  return !!(tendGroupModal && tendGroupModal.isOpen());
}

export {
  getLabOutputPrefs,
  setLabOutputPrefs,
  isGasoInterpretacionResLabChunk,
  isBhMainResLabChunk,
  formatBhExtendedTabLine,
  openLabDisplayPrefsModal,
  closeLabDisplayPrefsModal,
  onLabDisplayPrefsChanged,
  inferFechaLabSetFromId,
  formatDMYDate,
  seedTendHiddenDefaults,
  renderTendencias,
};

export const tendenciasWindowHandlers = {
  openSesionIngresoTrendsSendModal,
  closeSesionIngresoTrendsSendModal,
  closeTendDetail,
  openTendGroupModal,
  openTendGasoExtendedModal,
  closeTendGroupModal,
  setTendGroupTab,
  copyTendGroupTablePng,
  copyTendGroupTableText,
  toggleTendSection,
  toggleTendAbnormalOnlyFilter,
  tendHideSeriesFromCard,
  tendUnhideSeries,
  tendResetAllHiddenSeries,
  openTendHiddenModal,
  closeTendHiddenModal,
  openTendDetail,
  tendCardActivate,
  openLabDisplayPrefsModal,
  closeLabDisplayPrefsModal,
  onLabDisplayPrefsChanged,
};
