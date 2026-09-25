// Cultivos table render, cache, refresh
import { sortLabHistoryChronological } from '../../tend-core.mjs';
import { normalizeLabLine } from '../../lab-history-auto-store-core.mjs';
import { getLabHistoryRevision, TREND_REFRESH_DEBOUNCE_MS } from '../../lab-history-cache.mjs';
import { scheduleIdle } from '../../deferred-work.mjs';
import { rt, aid, esc } from './expediente-runtime.mjs';
import {
  parseCultureBlockFromLineArray,
  isCultureTableHeaderLine,
} from './expediente-cultivos-parse.mjs';
import {
  buildCultivoAntibiogramCellHtmlForPatient,
  wireAtbRisHoverPanels,
  removeAtbRisPanelsFromBody,
} from './expediente-cultivos-atb-ui.mjs';
import {
  pendingAtbCultivoItemsForPatient,
  refreshPatientCultivoLabsFromRepo,
  cultivoRefreshOutcomeMessage,
} from '../cultivo-queue-refresh.mjs';
import { deleteLabHistorySet } from '../lab-panel-history.mjs';

var CULTIVO_TIPO_ORDER = ['hemo', 'uro', 'cateter', 'gram', 'fungi', 'otro'];
var CULTIVO_TIPO_LABELS = {
  hemo: 'Hemocultivo',
  uro: 'Urocultivo',
  cateter: 'Cultivo de catéter',
  gram: 'Tinción Gram',
  fungi: 'Fungicultivo',
  otro: 'Otros cultivos',
};
function cultivoOrganismoCellHtml(r) {
  var html = esc(r.organismo);
  if (r.cuenta && !r.negativo) {
    html += '<div class="cultivos-cuenta">' + esc(r.cuenta) + '</div>';
  }
  return html;
}

function cultivoAntibiogramCellHtml(r) {
  return buildCultivoAntibiogramCellHtmlForPatient(r, aid());
}
/**
 * Un mismo cultivo puede quedar duplicado en el historial cuando "Actualizar"
 * vuelve a consultar el repositorio y crea un set nuevo en vez de reemplazar
 * el existente (p. ej. la hora reportada por el repositorio varía unos
 * segundos entre consultas, o el texto de sitio cambia de formato). El
 * microorganismo + cuenta de colonias identifican el mismo aislamiento sin
 * depender de ese texto — se mantienen constantes cuando el reporte se
 * actualiza más tarde con el antibiograma. El duplicado más reciente trae el
 * reporte completo (sourceText) para el chip de antibiograma, así que nos
 * quedamos con la última ocurrencia por clave.
 */
function cultivoRowDedupeKey_(row) {
  return [
    row.tipoKey || '',
    normalizeLabLine(row.fechaMuestra || ''),
    normalizeLabLine(row.organismo || ''),
    normalizeLabLine(row.cuenta || ''),
  ].join('\x01');
}

/**
 * Al haber empate (mismo sortMs — el mismo trazado clínico), preferir el set
 * con sourceText (necesario para el chip de antibiograma) y, si ambos lo
 * tienen o ninguno, el más reciente por updatedAt. sortMs solo alcanza
 * cuando son estudios de fechas/horas distintas.
 */
function cultivoRowIsBetter_(candidate, current) {
  var cSortMs = candidate.sortMs || 0;
  var kSortMs = current.sortMs || 0;
  if (cSortMs !== kSortMs) return cSortMs > kSortMs;
  var cHasSrc = !!candidate._hasSourceText;
  var kHasSrc = !!current._hasSourceText;
  if (cHasSrc !== kHasSrc) return cHasSrc;
  return (candidate._updatedAtMs || 0) >= (current._updatedAtMs || 0);
}

function extractCultivoTableRowsFromHistory(patientId) {
  var history = sortLabHistoryChronological(rt.ensureParsedLabHistory(patientId));
  var byKey = Object.create(null);
  var order = [];
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
        var row = parseCultureBlockFromLineArray(lines, set, seq++).row;
        row._hasSourceText = !!(set.sourceText && String(set.sourceText).trim());
        row._updatedAtMs = set.updatedAt ? Date.parse(set.updatedAt) || 0 : 0;
        var key = cultivoRowDedupeKey_(row);
        if (!byKey[key] || cultivoRowIsBetter_(row, byKey[key])) {
          if (!byKey[key]) order.push(key);
          byKey[key] = row;
        }
      });
    });
  });
  return order.map(function (key) {
    return byKey[key];
  });
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

/** Resumen: positivos siempre; negativos solo si hay cambio de signo vs. otro resultado del mismo tipo+muestra (cronológico). */
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

var _cultivosTableCacheKey = '';
var CULTIVOS_CHUNK_ROWS = 40;
var _cultivoRefreshBusy = false;
var _cultivoToolbarWired = false;

function buildCultivosToolbarHtml(patientId) {
  var pending = pendingAtbCultivoItemsForPatient(patientId).length;
  var title =
    pending > 0
      ? 'Buscar antibiograma en el repositorio para ' +
        pending +
        ' cultivo' +
        (pending === 1 ? '' : 's') +
        ' con ATB pendiente'
      : 'Consultar repositorio (no hay cultivos con ATB pendiente)';
  var btnClass = 'tend-toolbar-btn cultivo-refresh-repo-btn';
  if (pending === 0) btnClass += ' cultivo-refresh-idle';
  return (
    '<div class="cultivos-toolbar">' +
    '<button type="button" class="' +
    btnClass +
    '"' +
    (_cultivoRefreshBusy ? ' disabled aria-busy="true"' : '') +
    ' title="' +
    esc(title) +
    '">Actualizar</button>' +
    '<p class="cultivos-table-hint">Por categoría (tipo de estudio), orden cronológico de más reciente a más antiguo.</p>' +
    '</div>'
  );
}

function wireCultivosToolbarOnce() {
  if (_cultivoToolbarWired) return;
  var container = document.getElementById('cultivos-table-container');
  if (!container) return;
  _cultivoToolbarWired = true;
  container.addEventListener('click', function (ev) {
    var removeBtn = ev.target && ev.target.closest ? ev.target.closest('.cultivos-row-remove-btn') : null;
    if (removeBtn) {
      ev.preventDefault();
      var setId = removeBtn.getAttribute('data-cult-set-id');
      if (setId) void deleteLabHistorySet(setId);
      return;
    }
    var btn = ev.target && ev.target.closest ? ev.target.closest('.cultivo-refresh-repo-btn') : null;
    if (!btn || btn.disabled) return;
    ev.preventDefault();
    void handleCultivoRefreshClick();
  });
}

async function handleCultivoRefreshClick() {
  var pid = aid();
  if (!pid || _cultivoRefreshBusy) return;
  _cultivoRefreshBusy = true;
  invalidateCultivosTableCache();
  renderCultivosTable();
  try {
    var outcome = await refreshPatientCultivoLabsFromRepo(pid);
    var msg = cultivoRefreshOutcomeMessage(outcome);
    rt.showToast(msg.toast, msg.type);
  } finally {
    _cultivoRefreshBusy = false;
    invalidateCultivosTableCache();
    renderCultivosTable();
  }
}

/** Fuerza re-render de Cultivos (p. ej. tras re-seed del tour pitch). */
export function invalidateCultivosTableCache() {
  _cultivosTableCacheKey = '';
}
var CULTIVOS_CHUNKED_THRESHOLD = 72;

function renderCultivosTableBodyChunked(container, shellHtml, rowChunks, onDone) {
  container.innerHTML = shellHtml;
  var tbody = container.querySelector(".cultivos-table tbody");
  if (!tbody || !rowChunks.length) {
    onDone();
    return;
  }
  var i = 0;
  function appendChunk() {
    var end = Math.min(i + CULTIVOS_CHUNK_ROWS, rowChunks.length);
    for (; i < end; i += 1) {
      tbody.insertAdjacentHTML("beforeend", rowChunks[i]);
    }
    if (i < rowChunks.length) {
      scheduleIdle(appendChunk, 12);
      return;
    }
    onDone();
  }
  scheduleIdle(appendChunk, 0);
}

function rowFechaDisplay(r) {
  if (r.fechaMuestra && r.fechaMuestra !== '—') return r.fechaMuestra;
  return r.studyDate || '—';
}

export function buildCultivosNegStrip(negs) {
  if (!negs.length) return '';
  var chips = negs
    .map(function (r) {
      var fd = rowFechaDisplay(r);
      var sitio = r.sitio || '—';
      return (
        '<li class="cultivos-neg-chip">' +
        '<span class="cultivos-neg-chip-tipo">' +
        esc(r.tipoLabel || '') +
        '</span> · ' +
        esc(fd) +
        ' · ' +
        esc(sitio) +
        cultivoRowRemoveBtnHtml(r) +
        '</li>'
      );
    })
    .join('');
  return (
    '<div class="cultivos-neg-strip" role="status">' +
    '<div class="cultivos-neg-header">' +
    '<strong>Cultivos negativos</strong>' +
    '<span class="cultivos-neg-count">' +
    negs.length +
    '</span>' +
    '</div>' +
    '<p class="cultivos-neg-hint">En la tabla, por tipo y fecha</p>' +
    '<ul class="cultivos-neg-chips">' +
    chips +
    '</ul>' +
    '</div>'
  );
}

function cultivoRowRemoveBtnHtml(r) {
  if (r.labSetId == null || r.labSetId === '') return '';
  return (
    '<button type="button" class="cultivos-row-remove-btn" data-cult-set-id="' +
    esc(String(r.labSetId)) +
    '" title="Eliminar este cultivo del historial" aria-label="Eliminar este cultivo del historial">×</button>'
  );
}

function collectCultivoTableRowChunks(groups, rowFechaDisplayFn) {
  var rowChunks = [];
  var totalRows = 0;
  groups.forEach(function (g) {
    rowChunks.push('<tr class="cultivos-section-row"><td colspan="5">' + esc(g.label) + '</td></tr>');
    g.rows.forEach(function (r) {
      totalRows += 1;
      rowChunks.push(
        '<tr class="' +
          (r.negativo ? 'cultivos-row-neg' : '') +
          '"><td>' +
          esc(rowFechaDisplayFn(r)) +
          '</td><td>' +
          esc(r.sitio) +
          '</td><td class="cultivos-cell-org">' +
          cultivoOrganismoCellHtml(r) +
          '</td><td class="cultivos-cell-atb">' +
          cultivoAntibiogramCellHtml(r) +
          '</td><td class="cultivos-cell-remove">' +
          cultivoRowRemoveBtnHtml(r) +
          '</td></tr>'
      );
    });
  });
  return { rowChunks: rowChunks, totalRows: totalRows };
}

function renderCultivosTable() {
  var container = document.getElementById('cultivos-table-container');
  if (!container) return;
  wireCultivosToolbarOnce();
  var pid = aid();
  if (pid) {
    var cultKey = String(pid) + '|L' + getLabHistoryRevision(pid);
    if (_cultivosTableCacheKey === cultKey && container.querySelector('.cultivos-table')) {
      return;
    }
    _cultivosTableCacheKey = cultKey;
  } else {
    _cultivosTableCacheKey = '';
  }
  removeAtbRisPanelsFromBody();
  if (!aid()) {
    container.innerHTML = '<p class="tend-empty">Selecciona un paciente.</p>';
    return;
  }
  var flatRows = extractCultivoTableRowsFromHistory(pid);
  if (!flatRows.length) {
    container.innerHTML =
      '<p class="tend-empty">No hay cultivos en el historial. Aparecen urocultivos, hemocultivos, tinción Gram y cultivos de catéter enviados desde Laboratorio.</p>';
    return;
  }
  var groups = groupCultivoRowsByTipoChronologic(flatRows);
  var negs = flatRows
    .filter(function (r) {
      return r.negativo;
    })
    .sort(function (a, b) {
      var oa = CULTIVO_TIPO_ORDER.indexOf(a.tipoKey || 'otro');
      var ob = CULTIVO_TIPO_ORDER.indexOf(b.tipoKey || 'otro');
      if (oa !== ob) return oa - ob;
      var da = a.sortKeyMs != null ? a.sortKeyMs : a.sortMs || 0;
      var db = b.sortKeyMs != null ? b.sortKeyMs : b.sortMs || 0;
      if (da !== db) return db - da;
      return (b._seq || 0) - (a._seq || 0);
    });
  var negStrip = buildCultivosNegStrip(negs);
  var toolbar = buildCultivosToolbarHtml(aid());
  var thead =
    '<thead><tr><th>Fecha</th><th>Sitio / muestra</th><th>Organismo</th><th>Antibiograma</th><th><span class="visually-hidden">Acciones</span></th></tr></thead>';
  var built = collectCultivoTableRowChunks(groups, rowFechaDisplay);
  var finishTable = function () {
    wireAtbRisHoverPanels(container);
  };
  if (built.totalRows > CULTIVOS_CHUNKED_THRESHOLD) {
    var shellHtml =
      negStrip +
      toolbar +
      '<div class="cultivos-table-wrap"><table class="cultivos-table">' +
      thead +
      '<tbody></tbody></table></div>';
    renderCultivosTableBodyChunked(container, shellHtml, built.rowChunks, finishTable);
    return;
  }
  container.innerHTML =
    negStrip +
    toolbar +
    '<div class="cultivos-table-wrap"><table class="cultivos-table">' +
    thead +
    '<tbody>' +
    built.rowChunks.join('') +
    '</tbody></table></div>';
  finishTable();
}

var _tendRefreshTimer = null;

function refreshTendenciasOrCultivosPanel() {
  if (rt.getActiveAppTab() !== 'nota' && rt.getActiveAppTab() !== 'lab') return;
  if (_tendRefreshTimer) clearTimeout(_tendRefreshTimer);
  _tendRefreshTimer = setTimeout(function () {
    _tendRefreshTimer = null;
    if (rt.getActiveInner() === 'tend') rt.renderTendencias();
    else if (rt.getActiveInner() === 'cult') renderCultivosTable();
  }, TREND_REFRESH_DEBOUNCE_MS);
}

export {
  refreshTendenciasOrCultivosPanel,
  renderCultivosTable,
  extractCultivoTableRowsFromHistory,
  filterCultivoRowsSignificantFlip,
};
