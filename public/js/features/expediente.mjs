// Expediente — cultivos, listado (sala), pestaña Datos
import {
  labHistory,
  listadoProblemas,
  patients,
  saveState,
} from "../app-state.mjs";
import {
  emptyListado,
  addProblema as listadoAddProblema,
  removeProblema as listadoRemoveProblema,
} from "../listado-problemas-core.mjs";
import { LISTADO_PROBLEMAS_AI_PROMPT } from "../listado-problemas-ai-prompt.mjs";
import {
  sortLabHistoryChronological,
  parseFechaLabToMs,
  normalizeFechaLabHistory,
} from "../tend-core.mjs";
import { isPaseMode } from "./chrome.mjs";
import {
  renderEntry,
  buildAtbRisSummaryHtml,
  extractSensCrudasForGermFromSource,
  formatCultivoCondensedForCopy,
} from "../labs.js";
import { isModeSala } from "../mode-features.mjs";

let rt = {
  getActiveId() { return null; },
  getActiveAppTab() { return 'lab'; },
  getActiveInner() { return 'todo'; },
  getSettings() { return /** @type {any} */ ({}); },
  showToast() {},
  renderTendencias() {},
  renderPaseBoard() {},
  splitResLabsByTipo(rows) { void rows; return { labs: [], cultivo: [] }; },
  buildLabSetDateLine(set) { void set; return ''; },
  ensureParsedLabHistory(pid) { void pid; return []; },
  isRpcOffline() { return false; },
  requestDocumentJson() { return Promise.resolve(null); },
  handleDocumentGenerateResponse() { return Promise.resolve(null); },
  incrementPendingJobs() {},
  decrementPendingJobs() {},
  syncOfflineButtonStates() {},
  copyToClipboardSafe(_t) { return Promise.resolve(false); },
  guardMobileDocExport() {
    return false;
  },
};

export function registerExpedienteRuntime(partial) {
  if (!partial || typeof partial !== 'object') return;
  Object.assign(rt, partial);
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

var _listadoSortables = [];

// ── Expediente cultivos ──────────────────────────────────────────────
// ── Expediente: pestaña Cultivos (tabla desde historial) ───────────
var CULTIVO_TIPO_ORDER = ['hemo', 'uro', 'cateter', 'gram', 'fungi', 'otro'];
var CULTIVO_TIPO_LABELS = {
  hemo: 'Hemocultivo',
  uro: 'Urocultivo',
  cateter: 'Cultivo de catéter',
  gram: 'Tinción Gram',
  fungi: 'Fungicultivo',
  otro: 'Otros cultivos',
};

function isCultureTableHeaderLine(t) {
  var s = String(t || '').trim();
  return (
    /^CULTIVO\b/i.test(s) ||
    /^(UROCULTIVO|HEMOCULTIVO|FUNGICULTIVO)\b/i.test(s) ||
    /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s\/.-]*\s+\d{1,2}\/\d{1,2}(?:\/\d{2,4})?:\s+\S/i.test(s) ||
    /^TINCION\s+DE\s+GRAM/i.test(s) ||
    /^CATETER\b/i.test(s)
  );
}

/** Clave estable desde la línea cabecera del bloque (UROCULTIVO / HEMOCULTIVO / …). */
function classifyCultureTipoKeyFromHeaderLine(rawLine) {
  var s = String(rawLine || '').replace(/\s+/g, ' ').trim();
  var beforeColon = (s.split(':')[0] || s).toUpperCase();
  if (/^HEMOCULTIVO\b/.test(beforeColon)) return 'hemo';
  if (/^UROCULTIVO\b/.test(beforeColon)) return 'uro';
  if (/^FUNGICULTIVO\b/.test(beforeColon)) return 'fungi';
  if (/^TINCION(\s+DE)?\s+GRAM\b/.test(beforeColon)) return 'gram';
  if (/^CATETER\b/.test(beforeColon)) return 'cateter';
  return 'otro';
}

function completePartialFechaForCultivo(dm, set) {
  if (!dm) return '';
  var parts = String(dm).trim().split('/');
  if (parts.length === 3) {
    var y3 = parts[2].length === 2 ? '20' + parts[2] : parts[2];
    var joined = parts[0].padStart(2, '0') + '/' + parts[1].padStart(2, '0') + '/' + y3;
    return normalizeFechaLabHistory(joined) || joined;
  }
  if (parts.length !== 2) return dm;
  var y = new Date().getFullYear();
  if (set && set.fecha && set.fecha !== 'Anterior') {
    var fd = normalizeFechaLabHistory(set.fecha) || String(set.fecha);
    var ms = parseFechaLabToMs(fd, '');
    if (typeof ms === 'number' && isFinite(ms)) y = new Date(ms).getFullYear();
  }
  return parts[0].padStart(2, '0') + '/' + parts[1].padStart(2, '0') + '/' + y;
}

function cultureBlockLooksNegative(left, right) {
  var L = (left + ' ' + right).toUpperCase();
  if (!String(right || '').trim()) return true;
  return (
    /NEGATIVO|NO HAY CRECIMIENTO|SIN AISLAMIENTO|AUSENCIA(\s+DE)?\s+CRECIMIENTO|NO SE AISL|ESCASA FLORA|CONTAMINACI(O|Ó)N|SIN CRECIMIENTO/i.test(L)
  );
}

/**
 * Una fila de tabla = primera línea cabecera (sitio/fecha:germen) + resto (ATB, cuenta…).
 */
function parseCultureBlockFromLineArray(lines, set, seq) {
  var rawHeader = String(lines[0] || '');
  var line = rawHeader.replace(/\s+/g, ' ').trim();
  var tipoKey = classifyCultureTipoKeyFromHeaderLine(rawHeader);
  var studyDate = rt.buildLabSetDateLine(set) || '—';
  var sortMs = parseFechaLabToMs(set.fecha, set.hora);
  if (typeof sortMs !== 'number' || !isFinite(sortMs)) sortMs = 0;

  var colon = line.indexOf(':');
  var left = colon >= 0 ? line.slice(0, colon).trim() : line;
  var right = colon >= 0 ? line.slice(colon + 1).trim() : '';

  var fechaMuestra = '';
  var sitio = left;
  var dm = left.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*$/);
  if (dm) {
    fechaMuestra = completePartialFechaForCultivo(dm[1], set);
    sitio = left.slice(0, dm.index).trim() || left.replace(/\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*$/, '').trim();
  }

  var organismo = right.replace(/\s+/g, ' ').trim();
  var negativo = cultureBlockLooksNegative(left, right);
  if (negativo && !organismo) organismo = 'Negativo';
  else if (negativo && /^NEGATIVO$/i.test(organismo)) organismo = 'Negativo';
  else if (!organismo) organismo = '—';

  var resistencias = lines.slice(1);
  var resStr = resistencias.join('\n').trim();

  var sortKeyMs = sortMs;
  if (fechaMuestra) {
    var fmNorm = normalizeFechaLabHistory(fechaMuestra) || fechaMuestra;
    var fmParsed = parseFechaLabToMs(fmNorm, '');
    if (typeof fmParsed === 'number' && isFinite(fmParsed)) sortKeyMs = fmParsed;
  }

  return {
    row: {
      studyDate: studyDate,
      fechaMuestra: fechaMuestra || '—',
      sitio: sitio || '—',
      organismo: organismo,
      resistencias: resStr || (negativo ? '—' : ''),
      negativo: negativo,
      sortMs: sortMs,
      sortKeyMs: sortKeyMs,
      tipoKey: tipoKey,
      tipoLabel: CULTIVO_TIPO_LABELS[tipoKey] || CULTIVO_TIPO_LABELS.otro,
      labSetId: set && set.id != null ? set.id : '',
      _seq: typeof seq === 'number' ? seq : 0,
    },
  };
}

function findCultivoChunkInSet(set, organismoQuery) {
  if (!set || !set.resLabs) return null;
  var q = String(organismoQuery || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  if (!q || q === '—') return null;
  var cult = rt.splitResLabsByTipo(set.resLabs).cultivo;
  for (var ei = 0; ei < cult.length; ei++) {
    var chunks = String(cult[ei] || '')
      .split(/\n\n+/)
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
    for (var ci = 0; ci < chunks.length; ci++) {
      var head = chunks[ci].split(/\n/)[0] || '';
      var gq = germQueryFromCultivoChunkHead(head)
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
      if (!gq) continue;
      if (gq === q || gq.indexOf(q) !== -1 || q.indexOf(gq) !== -1) return chunks[ci];
      var gTok = gq.split(/\s+/).filter(Boolean)[0] || '';
      var qTok = q.split(/\s+/).filter(Boolean)[0] || '';
      if (
        gTok.length > 3 &&
        qTok.length > 3 &&
        (gTok === qTok || gq.indexOf(qTok) === 0 || q.indexOf(gTok) === 0)
      ) {
        return chunks[ci];
      }
    }
  }
  return null;
}

function copyCultivoCondensado(setId, organismo) {
  var pid = aid();
  if (!pid) {
    rt.showToast('Selecciona un paciente', 'error');
    return;
  }
  var sets = labHistory[pid] || [];
  var set = sets.find(function (s) {
    return String(s.id) === String(setId);
  });
  if (!set) {
    rt.showToast('No se encontró el envío en historial', 'error');
    return;
  }
  var chunk = findCultivoChunkInSet(set, organismo);
  if (!chunk) {
    rt.showToast('No hay resumen de cultivo procesado para copiar', 'error');
    return;
  }
  var t = formatCultivoCondensedForCopy(chunk, rt.buildLabSetDateLine(set) || '');
  if (!t.trim()) {
    rt.showToast('No hay texto para copiar', 'error');
    return;
  }
  var p =
    navigator.clipboard && navigator.clipboard.writeText
      ? navigator.clipboard.writeText(t)
      : Promise.reject(new Error('no clipboard'));
  p.then(
    function () {
      rt.showToast('Cultivo condensado copiado', 'success');
    },
    function () {
      rt.showToast('No se pudo copiar al portapapeles', 'error');
    }
  );
}

function germHintFromCultivoHeadLine(headLine) {
  var line = String(headLine || '').replace(/\s+/g, ' ').trim();
  var colon = line.lastIndexOf(':');
  if (colon >= 0) {
    var right = line.slice(colon + 1).trim();
    if (right) return right;
  }
  return line;
}

function germQueryFromCultivoChunkHead(headLine) {
  var h = germHintFromCultivoHeadLine(headLine);
  var base = h.split(/\s*·\s*/)[0].trim();
  return base || h;
}

function isResLabChunkPureCultivo(text) {
  var sp = rt.splitResLabsByTipo([text]);
  if (sp.labs.length) return false;
  return sp.cultivo.some(function (r) {
    return String(r || '').trim();
  });
}

function buildCultivoOutputHtmlFragments(text, sourceText) {
  var raw = String(text || '');
  var chunks = raw
    .split(/\n\n+/)
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean);
  if (!chunks.length) return '';
  var parts = [];
  chunks.forEach(function (chunk) {
    var lines = chunk.split(/\n/);
    var germQuery = germQueryFromCultivoChunkHead(lines[0] || '');
    var sens = sourceText ? extractSensCrudasForGermFromSource(sourceText, germQuery) : null;
    lines.forEach(function (lineRaw) {
      var t = String(lineRaw || '').trim();
      if (/^ATB\b/i.test(t) && sens && sens.length) {
        parts.push(
          '<div class="out-line cultivos-atb-chips lab-out-atb">' + buildAtbRisSummaryHtml(sens) + '</div>'
        );
        return;
      }
      renderEntry(lineRaw).forEach(function (html, idx) {
        parts.push('<div class="' + (idx === 0 ? 'out-line' : 'out-indent') + '">' + html + '</div>');
      });
    });
  });
  return parts.join('');
}

function cultivoAntibiogramCellHtml(r) {
  if (!aid()) return '<pre class="cultivos-atb-fallback">—</pre>';
  var sets = labHistory[aid()] || [];
  var set = sets.find(function (s) {
    return String(s.id) === String(r.labSetId);
  });
  var sens =
    set && set.sourceText ? extractSensCrudasForGermFromSource(set.sourceText, r.organismo) : null;
  var copyBtn =
    set && r.labSetId != null && String(r.labSetId) !== ''
      ? '<button type="button" class="cultivos-copy-full-btn" onclick=\'copyCultivoCondensado(' +
        JSON.stringify(String(r.labSetId)) +
        ',' +
        JSON.stringify(String(r.organismo || '')) +
        ')\'>Copiar informe completo</button>'
      : '';
  if (sens && sens.length) {
    return (
      '<div class="cultivos-atb-wrap">' +
      '<div class="cultivos-atb-chips" role="list">' +
      buildAtbRisSummaryHtml(sens) +
      '</div>' +
      copyBtn +
      '</div>'
    );
  }
  return (
    '<div class="cultivos-atb-wrap">' +
    '<pre class="cultivos-atb-fallback">' +
    esc(r.resistencias || '—') +
    '</pre>' +
    copyBtn +
    '</div>'
  );
}

var _atbRisScrollResizeWired = false;
var _atbRisScrollRootsWired = new WeakSet();
var _atbRisDelegatedHoverRoots = new WeakSet();
var ATB_RIS_HIDE_DELAY_MS = 140;

function ensureAtbRisScrollRepositionOn(el) {
  if (!el || _atbRisScrollRootsWired.has(el)) return;
  _atbRisScrollRootsWired.add(el);
  el.addEventListener('scroll', repositionOpenAtbRisPanel, { passive: true });
}

function cancelHideAtbPanel(panel) {
  if (!panel || !panel._atbHideTid) return;
  clearTimeout(panel._atbHideTid);
  panel._atbHideTid = null;
}

function scheduleHideAtbPanel(panel) {
  if (!panel) return;
  cancelHideAtbPanel(panel);
  panel._atbHideTid = setTimeout(function () {
    panel._atbHideTid = null;
    hideAtbRisHoverPanel(panel);
  }, ATB_RIS_HIDE_DELAY_MS);
}

function panelAtbRisForWrap(wrap) {
  return wrap.querySelector('.atb-ris-hover-panel') || wrap._atbRisPanelEl || null;
}

function hideAtbRisHoverPanel(panel) {
  if (!panel) return;
  cancelHideAtbPanel(panel);
  panel.classList.remove('is-open');
  panel.style.left = '';
  panel.style.top = '';
  panel.style.visibility = '';
  var wrap = panel._atbRisOwnerWrap;
  if (wrap) {
    wrap._atbRisPanelEl = null;
  }
  panel._atbRisOwnerWrap = null;
  if (wrap && wrap.isConnected) {
    wrap.appendChild(panel);
  } else if (panel.parentNode === document.body) {
    panel.remove();
  }
}

function closeAtbRisPanelsExcept(exceptWrap) {
  document.querySelectorAll('.atb-ris-hover-panel.is-open').forEach(function (panel) {
    var w = panel._atbRisOwnerWrap || panel.closest('.cult-atb-ris-chip-wrap');
    if (w !== exceptWrap) hideAtbRisHoverPanel(panel);
  });
}

function repositionOpenAtbRisPanel() {
  var panel = document.querySelector('.atb-ris-hover-panel.is-open');
  if (!panel) return;
  var wrap = panel._atbRisOwnerWrap || panel.closest('.cult-atb-ris-chip-wrap');
  if (wrap) positionAtbRisHoverPanel(wrap);
}

function positionAtbRisHoverPanel(wrap) {
  var panel = panelAtbRisForWrap(wrap);
  var chip = wrap.querySelector('.atb-chip');
  if (!panel || !chip) return;
  closeAtbRisPanelsExcept(wrap);
  cancelHideAtbPanel(panel);
  panel._atbRisOwnerWrap = wrap;
  wrap._atbRisPanelEl = panel;
  if (panel.parentNode !== document.body) {
    document.body.appendChild(panel);
  }
  panel.classList.add('is-open');
  panel.style.visibility = 'hidden';
  panel.style.left = '-9999px';
  panel.style.top = '0';
  void panel.offsetWidth;
  var chipRect = chip.getBoundingClientRect();
  var pr = panel.getBoundingClientRect();
  var pw = pr.width;
  var ph = pr.height;
  var margin = 8;
  var gap = 1;
  var vh = window.innerHeight;
  var vw = window.innerWidth;
  var top = chipRect.bottom + gap;
  if (top + ph > vh - margin) {
    var aboveTop = chipRect.top - gap - ph;
    if (aboveTop >= margin) top = aboveTop;
    else top = Math.max(margin, vh - margin - ph);
  }
  var left = chipRect.left;
  if (left + pw > vw - margin) left = vw - margin - pw;
  if (left < margin) left = margin;
  panel.style.left = left + 'px';
  panel.style.top = top + 'px';
  panel.style.visibility = '';
}

function wireAtbRisHoverPanels(rootEl) {
  if (!rootEl) return;
  if (!_atbRisScrollResizeWired) {
    _atbRisScrollResizeWired = true;
    window.addEventListener('scroll', repositionOpenAtbRisPanel, true);
    window.addEventListener('resize', repositionOpenAtbRisPanel);
  }
  ensureAtbRisScrollRepositionOn(rootEl);
  var tableWrap = rootEl.querySelector && rootEl.querySelector('.cultivos-table-wrap');
  if (tableWrap) ensureAtbRisScrollRepositionOn(tableWrap);
  var cultTab = document.getElementById('itab-content-cult');
  if (cultTab) ensureAtbRisScrollRepositionOn(cultTab);
  if (!_atbRisDelegatedHoverRoots.has(rootEl)) {
    _atbRisDelegatedHoverRoots.add(rootEl);
    rootEl.addEventListener('mouseover', function (ev) {
      var t = ev.target;
      if (t && t.nodeType !== 1) t = t.parentElement;
      if (!t || !t.closest) return;
      var wrap = t.classList.contains('cult-atb-ris-chip-wrap')
        ? t
        : t.closest('.cult-atb-ris-chip-wrap');
      if (!wrap || !rootEl.contains(wrap)) return;
      var p = panelAtbRisForWrap(wrap);
      if (p) cancelHideAtbPanel(p);
      positionAtbRisHoverPanel(wrap);
    });
    rootEl.addEventListener('mouseout', function (ev) {
      var t = ev.target;
      if (t && t.nodeType !== 1) t = t.parentElement;
      if (!t || !t.closest) return;
      var wrap = t.classList.contains('cult-atb-ris-chip-wrap')
        ? t
        : t.closest('.cult-atb-ris-chip-wrap');
      if (!wrap || !rootEl.contains(wrap)) return;
      var p = panelAtbRisForWrap(wrap);
      if (!p) return;
      var toEl = ev.relatedTarget;
      if (toEl && (wrap.contains(toEl) || p.contains(toEl))) return;
      scheduleHideAtbPanel(p);
    });
    rootEl.addEventListener('focusin', function (ev) {
      var t = ev.target;
      if (t && t.nodeType !== 1) t = t.parentElement;
      if (!t || !t.closest) return;
      var wrap = t.classList.contains('cult-atb-ris-chip-wrap')
        ? t
        : t.closest('.cult-atb-ris-chip-wrap');
      if (!wrap || !rootEl.contains(wrap)) return;
      var p = panelAtbRisForWrap(wrap);
      if (p) cancelHideAtbPanel(p);
      positionAtbRisHoverPanel(wrap);
    });
    rootEl.addEventListener('focusout', function (ev) {
      var t = ev.target;
      if (t && t.nodeType !== 1) t = t.parentElement;
      if (!t || !t.closest) return;
      var wrap = t.classList.contains('cult-atb-ris-chip-wrap')
        ? t
        : t.closest('.cult-atb-ris-chip-wrap');
      if (!wrap || !rootEl.contains(wrap)) return;
      var p = panelAtbRisForWrap(wrap);
      if (!p) return;
      var rel = ev.relatedTarget;
      if (rel && (wrap.contains(rel) || p.contains(rel))) return;
      hideAtbRisHoverPanel(p);
    });
  }
  rootEl.querySelectorAll('.atb-ris-hover-panel').forEach(function (panel) {
    if (panel._atbRisPanelHoverListeners) return;
    panel._atbRisPanelHoverListeners = true;
    panel.addEventListener('mouseenter', function () {
      cancelHideAtbPanel(panel);
    });
    panel.addEventListener('mouseleave', function (ev) {
      var w = panel._atbRisOwnerWrap || panel.closest('.cult-atb-ris-chip-wrap');
      var toEl = ev.relatedTarget;
      if (toEl && w && (w.contains(toEl) || panel.contains(toEl))) return;
      scheduleHideAtbPanel(panel);
    });
  });
}

/** Paneles portados a body al abrir; quitar antes de sustituir innerHTML del contenedor. */
function removeAtbRisPanelsFromBody() {
  document.querySelectorAll('body > .atb-ris-hover-panel').forEach(function (p) {
    hideAtbRisHoverPanel(p);
  });
}

function extractCultivoTableRowsFromHistory(patientId) {
  var history = sortLabHistoryChronological(rt.ensureParsedLabHistory(patientId));
  var rows = [];
  var seq = 0;
  history.forEach(function (set) {
    if (!set || !set.resLabs || !set.resLabs.length) return;
    var cult = rt.splitResLabsByTipo(set.resLabs).cultivo;
    cult.forEach(function (chunk) {
      var sections = String(chunk || '')
        .split(/\n\n+/)
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
      sections.forEach(function (sec) {
        var lines = sec.split(/\r?\n/).map(function (l) {
          return l.replace(/\*+$/g, '').trim();
        }).filter(function (l) {
          return l;
        });
        if (!lines.length) return;
        if (!isCultureTableHeaderLine(lines[0])) return;
        rows.push(parseCultureBlockFromLineArray(lines, set, seq++).row);
      });
    });
  });
  return rows;
}

/** Agrupa por tipo de cultivo y ordena del más reciente al más antiguo. */
function groupCultivoRowsByTipoChronologic(rows) {
  var byKey = Object.create(null);
  rows.forEach(function (r) {
    var k = r.tipoKey || 'otro';
    if (!byKey[k]) byKey[k] = [];
    byKey[k].push(r);
  });
  CULTIVO_TIPO_ORDER.forEach(function (k) {
    if (!byKey[k]) return;
    byKey[k].sort(function (a, b) {
      var da = a.sortKeyMs != null ? a.sortKeyMs : a.sortMs || 0;
      var db = b.sortKeyMs != null ? b.sortKeyMs : b.sortMs || 0;
      if (da !== db) return db - da;
      return (b._seq || 0) - (a._seq || 0);
    });
  });
  return CULTIVO_TIPO_ORDER.filter(function (k) {
    return byKey[k] && byKey[k].length;
  }).map(function (k) {
    return {
      key: k,
      label: CULTIVO_TIPO_LABELS[k] || CULTIVO_TIPO_LABELS.otro,
      rows: byKey[k],
    };
  });
}

/** Modo Pase: positivos siempre; negativos solo si hay cambio de signo vs. otro resultado del mismo tipo+muestra (cronológico). */
function filterCultivoRowsSignificantFlip(rows) {
  function seriesKey(r) {
    return (
      (r.tipoKey || 'otro') +
      '\x01' +
      String(r.sitio || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
    );
  }
  var bySeries = Object.create(null);
  rows.forEach(function (r) {
    var k = seriesKey(r);
    if (!bySeries[k]) bySeries[k] = [];
    bySeries[k].push(r);
  });
  var out = [];
  Object.keys(bySeries).forEach(function (k) {
    var arr = bySeries[k].slice().sort(function (a, b) {
      var da = a.sortKeyMs != null ? a.sortKeyMs : a.sortMs || 0;
      var db = b.sortKeyMs != null ? b.sortKeyMs : b.sortMs || 0;
      if (da !== db) return da - db;
      return (a._seq || 0) - (b._seq || 0);
    });
    for (var i = 0; i < arr.length; i++) {
      var r = arr[i];
      if (!r.negativo) {
        out.push(r);
        continue;
      }
      var prev = arr[i - 1];
      var next = arr[i + 1];
      if ((prev && !prev.negativo) || (next && !next.negativo)) out.push(r);
    }
  });
  return out;
}

function renderCultivosTable() {
  var container = document.getElementById('cultivos-table-container');
  if (!container) return;
  removeAtbRisPanelsFromBody();
  if (!aid()) {
    container.innerHTML = '<p class="tend-empty">Selecciona un paciente.</p>';
    if (isPaseMode()) rt.renderPaseBoard();
    return;
  }
  var flatRows = extractCultivoTableRowsFromHistory(aid());
  if (!flatRows.length) {
    container.innerHTML =
      '<p class="tend-empty">No hay cultivos en el historial. Aparecen urocultivos, hemocultivos, tinción Gram y cultivos de catéter enviados desde Laboratorio.</p>';
    if (isPaseMode()) rt.renderPaseBoard();
    return;
  }
  var groups = groupCultivoRowsByTipoChronologic(flatRows);
  function rowFechaDisplay(r) {
    if (r.fechaMuestra && r.fechaMuestra !== '—') return r.fechaMuestra;
    return r.studyDate || '—';
  }
  var negs = flatRows.filter(function (r) {
    return r.negativo;
  });
  negs.sort(function (a, b) {
    var oa = CULTIVO_TIPO_ORDER.indexOf(a.tipoKey || 'otro');
    var ob = CULTIVO_TIPO_ORDER.indexOf(b.tipoKey || 'otro');
    if (oa !== ob) return oa - ob;
    var da = a.sortKeyMs != null ? a.sortKeyMs : a.sortMs || 0;
    var db = b.sortKeyMs != null ? b.sortKeyMs : b.sortMs || 0;
    if (da !== db) return db - da;
    return (b._seq || 0) - (a._seq || 0);
  });
  var negStrip = '';
  if (negs.length) {
    var parts = negs.map(function (r) {
      var fd = rowFechaDisplay(r);
      var lab = r.tipoLabel || '';
      return lab + ' · ' + fd + ' · ' + (r.sitio.length > 36 ? r.sitio.slice(0, 34) + '…' : r.sitio);
    });
    negStrip =
      '<div class="cultivos-neg-strip" role="status"><strong>Cultivos negativos</strong> (en la tabla, por tipo y fecha) · ' +
      parts.map(function (p) {
        return '<span>' + esc(p) + '</span>';
      }).join(' <span class="cultivos-neg-sep">|</span> ') +
      '</div>';
  }
  var thead =
    '<thead><tr>' +
    '<th>Fecha</th>' +
    '<th>Sitio / muestra</th>' +
    '<th>Organismo</th>' +
    '<th>Antibiograma</th>' +
    '</tr></thead>';
  var tbody = groups
    .map(function (g) {
      var section =
        '<tr class="cultivos-section-row"><td colspan="4">' + esc(g.label) + '</td></tr>';
      var body = g.rows
        .map(function (r) {
          return (
            '<tr class="' +
            (r.negativo ? 'cultivos-row-neg' : '') +
            '">' +
            '<td>' +
            esc(rowFechaDisplay(r)) +
            '</td>' +
            '<td>' +
            esc(r.sitio) +
            '</td>' +
            '<td>' +
            esc(r.organismo) +
            '</td>' +
            '<td class="cultivos-cell-atb">' + cultivoAntibiogramCellHtml(r) + '</td>' +
            '</tr>'
          );
        })
        .join('');
      return section + body;
    })
    .join('');
  container.innerHTML =
    negStrip +
    '<p class="cultivos-table-hint">Por categoría (tipo de estudio), orden cronológico de más reciente a más antiguo.</p>' +
    '<div class="cultivos-table-wrap">' +
    '<table class="cultivos-table">' +
    thead +
    '<tbody>' +
    tbody +
    '</tbody></table></div>';
  wireAtbRisHoverPanels(container);
  if (isPaseMode()) rt.renderPaseBoard();
}

function refreshTendenciasOrCultivosPanel() {
  if (rt.getActiveAppTab() !== 'nota') return;
  if (rt.getActiveInner() === 'tend') rt.renderTendencias();
  else if (rt.getActiveInner() === 'cult') renderCultivosTable();
}

// ── Pase cultivos (antibiograma) ───────────────────────────────────
function formatPaseCultivoResistenciasHtml(raw) {
  var t = esc(String(raw || ''));
  t = t.replace(/\bR:/g, '<span class="pase-atb-tag pase-atb-tag--r">R:</span>');
  t = t.replace(/\bI:/g, '<span class="pase-atb-tag pase-atb-tag--i">I:</span>');
  t = t.replace(/\bS:/g, '<span class="pase-atb-tag pase-atb-tag--s">S:</span>');
  return t;
}

function paseCultivoAtbBlockHtml(patientId, r) {
  var sets = labHistory[patientId] || [];
  var set = sets.find(function (s) {
    return String(s.id) === String(r.labSetId);
  });
  var sens =
    set && set.sourceText ? extractSensCrudasForGermFromSource(set.sourceText, r.organismo) : null;
  if (sens && sens.length) {
    return (
      '<div class="pase-cult-atb-wrap">' +
      '<div class="cultivos-atb-chips pase-cult-atb-chips" role="list">' +
      buildAtbRisSummaryHtml(sens) +
      '</div></div>'
    );
  }
  var resH =
    r.resistencias && String(r.resistencias).trim()
      ? '<div class="pase-cult-atb">' + formatPaseCultivoResistenciasHtml(r.resistencias) + '</div>'
      : '';
  if (resH) {
    return '<div class="pase-cult-atb-wrap">' + resH + '</div>';
  }
  return '';
}

// ── Listado · médicos firma ─────────────────────────────────────────-
function getMedicosForListado(lst) {
  var tpl = (rt.getSettings() || {}).medicosPlantilla || {};
  var override = (lst && lst.medicos) || {};
  function pick(k) { return (override[k] && override[k].trim()) ? override[k] : (tpl[k] || ''); }
  return {
    profesor: pick('profesor'),
    r4:       pick('r4'),
    r2:       pick('r2'),
    r1a:      pick('r1a'),
    r1b:      pick('r1b'),
  };
}

function updateListadoMedico(field, value) {
  var lst = ensureListadoForActive(); if (!lst) return;
  if (!lst.medicos) lst.medicos = {};
  lst.medicos[field] = value;
  saveState();
}

// ── Listado sala ─────────────────────────────────────────────────────-
// Listado de Problemas (Task 8) — UI completa con drag-and-drop y autosave.
function _todayDDMMYYYY() {
  var d = new Date();
  return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
}
function _nowHHMM() {
  var d = new Date();
  return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}
function ensureListadoForActive() {
  if (!aid()) return null;
  if (!listadoProblemas[aid()]) {
    listadoProblemas[aid()] = emptyListado(_todayDDMMYYYY(), _nowHHMM());
  }
  // Defensive: ensure arrays exist (en caso de datos corruptos).
  var l = listadoProblemas[aid()];
  if (!Array.isArray(l.activos)) l.activos = [];
  if (!Array.isArray(l.inactivos)) l.inactivos = [];
  return l;
}
function _autoGrowTextarea(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 240) + 'px';
}
function _renderListadoRow(seccion, p, idx) {
  return (
    '<div class="listado-row" data-id="' + esc(p.id) + '" data-seccion="' + seccion + '">' +
      '<div class="listado-num listado-drag-handle" title="Arrastra para reordenar" aria-label="Arrastrar para reordenar">' + (idx + 1) + '</div>' +
      '<input type="date" value="' + esc(p.fecha || '') + '" oninput="updateProblemaField(\'' + seccion + '\',\'' + esc(p.id) + '\',\'fecha\',this.value)" aria-label="Fecha del problema">' +
      '<textarea rows="1" placeholder="Descripción del problema" oninput="updateProblemaField(\'' + seccion + '\',\'' + esc(p.id) + '\',\'descripcion\',this.value); _autoGrowTextarea(this)" aria-label="Descripción">' + esc(p.descripcion || '') + '</textarea>' +
      '<button class="btn-remove-listado" onclick="removeProblemaUI(\'' + seccion + '\',\'' + esc(p.id) + '\')" aria-label="Quitar problema" title="Quitar">×</button>' +
    '</div>'
  );
}
function _renderListadoSeccion(seccion, label, lst) {
  var arr = lst[seccion] || [];
  var rows = arr.length
    ? arr.map(function(p, i){ return _renderListadoRow(seccion, p, i); }).join('')
    : '<div class="listado-empty">Sin problemas ' + label.toLowerCase() + '.</div>';
  return (
    '<div class="listado-section">' +
      '<div class="listado-section-header ' + seccion + '">' +
        '<span>' + label + ' (' + arr.length + ')</span>' +
      '</div>' +
      '<div class="listado-section-body listado-sort-zone" data-seccion-rows="' + seccion + '">' +
        rows +
      '</div>' +
      '<div class="listado-section-body" style="padding-top:0;">' +
        '<button class="listado-add-row" onclick="addProblemaUI(\'' + seccion + '\')">+ Agregar problema ' + label.toLowerCase() + '</button>' +
      '</div>' +
    '</div>'
  );
}
function destroyListadoSortables() {
  _listadoSortables.forEach(function (s) {
    try {
      if (s && typeof s.destroy === 'function') s.destroy();
    } catch (_e) {}
  });
  _listadoSortables = [];
}

function syncListadoOrderFromDom(seccion) {
  var lst = ensureListadoForActive();
  if (!lst || !seccion) return;
  var zone = document.querySelector(
    '#listado-form [data-seccion-rows="' + seccion + '"]'
  );
  if (!zone) return;
  var arr = (lst[seccion] || []).slice();
  var byId = Object.create(null);
  for (var i = 0; i < arr.length; i++) byId[arr[i].id] = arr[i];
  var newArr = [];
  zone.querySelectorAll('.listado-row[data-id]').forEach(function (row) {
    var id = row.getAttribute('data-id');
    if (id && byId[id]) newArr.push(byId[id]);
  });
  if (!newArr.length || newArr.length !== arr.length) return;
  listadoProblemas[aid()] = Object.assign({}, lst, { [seccion]: newArr });
}

function refreshListadoRowNumbers(seccion) {
  var zone = document.querySelector(
    '#listado-form [data-seccion-rows="' + seccion + '"]'
  );
  if (!zone) return;
  zone.querySelectorAll('.listado-row').forEach(function (row, idx) {
    var num = row.querySelector('.listado-num');
    if (num) num.textContent = String(idx + 1);
  });
}

function mountListadoSortables() {
  destroyListadoSortables();
  var SortableCtor = typeof globalThis !== 'undefined' ? globalThis.Sortable : null;
  if (!SortableCtor || typeof SortableCtor.create !== 'function') return;
  var scrollRoot = document.getElementById('listado-form');
  document.querySelectorAll('#listado-form [data-seccion-rows]').forEach(function (zone) {
    var seccion = zone.getAttribute('data-seccion-rows');
    if (!seccion || !zone.querySelector('.listado-row')) return;
    var sortable = SortableCtor.create(zone, {
      animation: 200,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
      draggable: '.listado-row',
      handle: '.listado-drag-handle',
      filter: 'textarea, input, button, a[href], select',
      preventOnFilter: true,
      delay: 0,
      delayOnTouchOnly: true,
      direction: 'vertical',
      forceFallback: true,
      fallbackClass: 'listado-drag-hovercard',
      fallbackOnBody: true,
      fallbackTolerance: 4,
      swapThreshold: 0.65,
      invertedSwapThreshold: 0.58,
      scroll: scrollRoot || true,
      bubbleScroll: true,
      scrollSensitivity: 54,
      scrollSpeed: 9,
      onEnd: function (evt) {
        if (evt.oldIndex === evt.newIndex && evt.from === evt.to) return;
        syncListadoOrderFromDom(seccion);
        refreshListadoRowNumbers(seccion);
        saveState();
      }
    });
    _listadoSortables.push(sortable);
  });
}

function renderListadoForm() {
  var c = document.getElementById('listado-form');
  if (!c) return;
  destroyListadoSortables();
  if (!aid()) { c.innerHTML = ''; return; }
  var patient = patients.find(function(p){ return p.id === aid(); });
  if (!patient) { c.innerHTML = ''; return; }
  var lst = ensureListadoForActive();
  c.innerHTML = (
    '<div class="card"><div class="card-header"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Datos del Paciente</div><div class="card-body"><div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:10px;align-items:end;">' +
      '<div class="field-group"><label>Nombre</label><input type="text" value="' + esc(patient.nombre) + '" class="field-readonly" readonly></div>' +
      '<div class="field-group"><label>Registro</label><input type="text" value="' + esc(patient.registro) + '" class="field-readonly" readonly></div>' +
      '<div class="field-group"><label>Edad/Sexo</label><input type="text" value="' + esc(patient.edad) + ' / ' + esc(patient.sexo) + '" class="field-readonly" readonly></div>' +
      '<div class="field-group"><label>Cuarto</label><input type="text" value="' + esc(patient.cuarto) + '" class="field-readonly" readonly></div>' +
      '<div class="field-group"><label>Cama</label><input type="text" value="' + esc(patient.cama) + '" class="field-readonly" readonly></div>' +
    '</div></div></div>' +

    '<div class="card"><div class="card-header" style="background:#374151;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Fecha y Hora del Listado</div><div class="card-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
      '<div class="field-group"><label>Fecha</label><input type="text" value="' + esc(lst.fecha) + '" placeholder="DD/MM/AAAA" oninput="updateListadoMeta(\'fecha\',this.value)"></div>' +
      '<div class="field-group"><label>Hora</label><input type="text" value="' + esc(lst.hora) + '" placeholder="HH:MM" oninput="updateListadoMeta(\'hora\',this.value)"></div>' +
    '</div></div></div>' +

    _renderListadoSeccion('activos', 'Activos', lst) +
    _renderListadoSeccion('inactivos', 'Inactivos', lst) +

    _renderListadoMedicosCard(lst) +

    '<div class="action-bar"><button class="btn-generate rpc-doc-export" onclick="quickExportCurrentPatient()" id="btn-quick-export-listado" style="background:#475569;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3v12m0 0l4-4m-4 4l-4-4"/><path d="M5 21h14"/></svg>Salida rápida</button><button type="button" class="btn-generate" onclick="copyListadoProblemasAiPrompt()" style="background:#1e40af;" title="Copia el prompt para usar en un chat de IA"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Copiar prompt IA</button><button class="btn-generate rpc-doc-export" onclick="generateListado()" id="btn-gen-listado"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>Generar Listado de Problemas (.docx)</button></div>'
  );
  // auto-grow existing textareas
  c.querySelectorAll('.listado-row textarea').forEach(_autoGrowTextarea);
  mountListadoSortables();
}
function updateListadoMeta(field, value) {
  var lst = ensureListadoForActive(); if (!lst) return;
  lst[field] = value;
  saveState();
}
function updateProblemaField(seccion, id, field, value) {
  var lst = ensureListadoForActive(); if (!lst) return;
  var arr = lst[seccion] || [];
  var p = arr.find(function(x){ return x.id === id; });
  if (!p) return;
  p[field] = value;
  saveState();
}
function addProblemaUI(seccion) {
  var lst = ensureListadoForActive(); if (!lst) return;
  listadoProblemas[aid()] = listadoAddProblema(lst, seccion, { fecha: '', descripcion: '' });
  saveState();
  renderListadoForm();
  setTimeout(function(){
    var rows = document.querySelectorAll('[data-seccion-rows="' + seccion + '"] .listado-row textarea');
    if (rows.length) rows[rows.length - 1].focus();
  }, 0);
}
function removeProblemaUI(seccion, id) {
  var lst = ensureListadoForActive(); if (!lst) return;
  listadoProblemas[aid()] = listadoRemoveProblema(lst, seccion, id);
  saveState();
  renderListadoForm();
}
function _renderListadoMedicosCard(lst) {
  var meds = getMedicosForListado(lst);
  function row(key, label) {
    return (
      '<div class="field-group"><label>' + label + '</label>' +
      '<input type="text" value="' + esc(meds[key] || '') + '" oninput="updateListadoMedico(\'' + key + '\', this.value)">' +
      '</div>'
    );
  }
  return (
    '<div class="card"><div class="card-header" style="background:#0f766e;">' +
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
      'Médicos (firma)' +
      '<span style="margin-left:auto;font-size:11px;font-weight:500;color:rgba(255,255,255,0.85);">Pre-llena desde Mi Perfil. Edita aquí para este paciente.</span>' +
    '</div><div class="card-body" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
      row('profesor', 'Profesor') +
      row('r4',       'R4') +
      row('r2',       'R2') +
      row('r1a',      'R1 (1)') +
      row('r1b',      'R1 (2)') +
    '</div></div>'
  );
}

async function copyListadoProblemasAiPrompt() {
  var ok = await rt.copyToClipboardSafe(LISTADO_PROBLEMAS_AI_PROMPT);
  rt.showToast(ok ? 'Prompt copiado al portapapeles ✓' : 'No se pudo copiar el prompt', ok ? 'success' : 'error');
}
function generateListado() {
  if (rt.guardMobileDocExport()) return;
  if (rt.isRpcOffline()) {
    rt.showToast('Sin conexión con el servidor local. Reinicia R+ para generar documentos.', 'error');
    return;
  }
  if (!aid()) { rt.showToast('Selecciona un paciente primero', 'error'); return; }
  var patient = patients.find(function(p){ return p.id === aid(); });
  if (!patient) return;
  var lst = ensureListadoForActive(); if (!lst) return;
  var hasProblems = (lst.activos && lst.activos.length) || (lst.inactivos && lst.inactivos.length);
  if (!hasProblems) {
    rt.showToast('Agrega al menos un problema antes de generar.', 'error');
    return;
  }
  var medicos = getMedicosForListado(lst);
  var btn = document.getElementById('btn-gen-listado');
  if (btn) { btn.classList.add('loading'); btn.disabled = true; }
  rt.incrementPendingJobs();
  function buildPayload(outputDir) {
    return {
      patient: patient,
      listado: lst,
      medicos: medicos,
      outputDir: outputDir || '',
    };
  }
  rt.requestDocumentJson('/generate-listado', buildPayload((rt.getSettings() || {}).outputDir || ''))
  .then(function(d){
    return rt.handleDocumentGenerateResponse({
      response: d,
      url: '/generate-listado',
      buildPayload: buildPayload,
      onSuccess: function(data) {
        rt.showToast('Listado guardado: ' + data.fileName, 'success');
      },
    });
  })
  .catch(function(){ rt.showToast('Error de conexión', 'error'); })
  .finally(function(){
    if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
    rt.decrementPendingJobs();
    rt.syncOfflineButtonStates();
  });
}

// ── Datos paciente sala ───────────────────────────────────────────────
function buildPatientDemographicsCardHtml(patient) {
  return (
    '<div class="card"><div class="card-header"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Datos del Paciente</div><div class="card-body"><div style="display:flex;flex-direction:column;gap:10px;">' +
    '<div class="field-group"><label>Nombre</label><input type="text" value="' + esc(patient.nombre) + '" oninput="updatePatient(\'nombre\',this.value)" style="text-transform:uppercase;"></div>' +
    '<div style="display:grid;grid-template-columns:1fr 100px 60px;gap:10px;">' +
    '<div class="field-group"><label>Registro</label><input type="text" value="' + esc(patient.registro) + '" oninput="updatePatient(\'registro\',this.value)"></div>' +
    '<div class="field-group"><label>Edad</label><input type="text" value="' + esc(patient.edad) + '" oninput="updatePatient(\'edad\',this.value)"></div>' +
    '<div class="field-group"><label>Sexo</label><select onchange="updatePatient(\'sexo\',this.value)"><option value="M"' + (patient.sexo==='M'?' selected':'') + '>M</option><option value="F"' + (patient.sexo==='F'?' selected':'') + '>F</option></select></div></div>' +
    '<div class="field-group"><label>Área</label><input type="text" value="' + esc(patient.area) + '" oninput="updatePatient(\'area\',this.value)" style="text-transform:uppercase;"></div>' +
    '<div class="field-group"><label>Servicio</label><input type="text" value="' + esc(patient.servicio) + '" oninput="updatePatient(\'servicio\',this.value)" style="text-transform:uppercase;"></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
    '<div class="field-group"><label>Cuarto</label><input type="text" value="' + esc(patient.cuarto) + '" oninput="updatePatient(\'cuarto\',this.value)"></div>' +
    '<div class="field-group"><label>Cama</label><input type="text" value="' + esc(patient.cama) + '" oninput="updatePatient(\'cama\',this.value)"></div></div>' +
    '</div></div></div>'
  );
}

/** En modo Sala la pestaña Nota está oculta: los mismos campos van en #patient-data-form. */
function renderPatientDataPane() {
  var wrap = document.getElementById('patient-data-form');
  if (!wrap) return;
  if (!isModeSala(rt.getSettings() || {})) {
    wrap.innerHTML = '';
    return;
  }
  var patient = patients.find(function (p) {
    return String(p.id) === String(aid());
  });
  if (!patient) {
    wrap.innerHTML = '';
    return;
  }
  wrap.innerHTML = buildPatientDemographicsCardHtml(patient);
}

export {
  refreshTendenciasOrCultivosPanel,
  renderCultivosTable,
  renderListadoForm,
  removeAtbRisPanelsFromBody,
  wireAtbRisHoverPanels,
  buildCultivoOutputHtmlFragments,
  isResLabChunkPureCultivo,
  extractCultivoTableRowsFromHistory,
  filterCultivoRowsSignificantFlip,
  formatPaseCultivoResistenciasHtml,
  paseCultivoAtbBlockHtml,
  buildPatientDemographicsCardHtml,
  renderPatientDataPane,
  copyCultivoCondensado,
  generateListado,
};

export const windowHandlers = {
  copyCultivoCondensado,
  updateListadoMeta,
  updateProblemaField,
  addProblemaUI,
  removeProblemaUI,
  copyListadoProblemasAiPrompt,
  generateListado,
  _autoGrowTextarea,
  renderPatientDataPane,
  updateListadoMedico,
};
