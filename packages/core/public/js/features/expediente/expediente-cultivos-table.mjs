// Cultivos table render, cache, refresh
import { sortLabHistoryChronological } from '../../tend-core.mjs';
import { normalizeLabLine } from '../../lab-history-auto-store-core.mjs';
import { getLabHistoryRevision, TREND_REFRESH_DEBOUNCE_MS } from '../../lab-history-cache.mjs';
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
import { cultivoSeriesKey, hemoSitioGrupo, HEMO_SITIO_LABELS } from '../../cultivo-block-core.mjs';

function cultivoRowMs(r) {
  return r.sortKeyMs != null ? r.sortKeyMs : r.sortMs || 0;
}

/** Aislamiento real: ni negativo ni muestra contaminada. */
function cultivoRowIsIsolate(r) {
  return !r.negativo && !/CONTAMINAD/i.test(r.organismo || '');
}

var CULTIVO_TAG_ALERT_RE = /^(BLEE|ESBL|Carb-?R|MRSA|SARM|VRE|ERV)$/i;

/** "ESCHERICHIA COLI · BLEE · Preliminar" → nombre + etiquetas en píldora. */
function cultivoOrganismoCellHtml(r) {
  var parts = String(r.organismo || '').split(/\s*·\s*/);
  var html =
    '<span class="cult-org-name' +
    (cultivoRowIsIsolate(r) ? ' cult-org-name--isolate' : '') +
    '">' +
    esc(parts[0]) +
    '</span>';
  parts.slice(1).forEach(function (tag) {
    if (!tag) return;
    html +=
      ' <span class="cult-org-tag' +
      (CULTIVO_TAG_ALERT_RE.test(tag) ? ' cult-org-tag--alert' : '') +
      '">' +
      esc(tag) +
      '</span>';
  });
  // Cuenta sin número ("X") no aporta nada. En hemocultivos agrupados, el
  // sitio real (brazo/mano) va aquí porque el encabezado solo dice el grupo.
  var sub = [];
  if (hemoSitioGrupo(r)) sub.push(cultivoRawSiteLabel(r));
  if (r.cuenta && !r.negativo && /\d/.test(r.cuenta)) sub.push(r.cuenta);
  if (sub.length) html += '<div class="cultivos-cuenta">' + esc(sub.join(' · ')) + '</div>';
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

/**
 * Un grupo por sitio (tipo + muestra), filas del más reciente al más antiguo.
 * Sitios ordenados por su resultado más reciente.
 */
function groupCultivoRowsBySite(rows) {
  var byKey = Object.create(null);
  var sites = [];
  rows.forEach(function (r) {
    var k = cultivoSeriesKey(r);
    if (!byKey[k]) sites.push((byKey[k] = { rows: [] }));
    byKey[k].rows.push(r);
  });
  sites.forEach(function (s) {
    s.rows.sort(function (a, b) {
      return cultivoRowMs(b) - cultivoRowMs(a) || (b._seq || 0) - (a._seq || 0);
    });
    s.positive = s.rows.some(cultivoRowIsIsolate);
  });
  return sites.sort(function (a, b) {
    return cultivoRowMs(b.rows[0]) - cultivoRowMs(a.rows[0]);
  });
}

/** Resumen: positivos siempre; negativos solo si hay cambio de signo vs. otro resultado del mismo tipo+muestra (cronológico). */
function filterCultivoRowsSignificantFlip(rows) {
  var bySeries = Object.create(null);
  rows.forEach(function (r) {
    var k = cultivoSeriesKey(r);
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

function rowFechaDisplay(r) {
  if (r.fechaMuestra && r.fechaMuestra !== '—') return r.fechaMuestra;
  return r.studyDate || '—';
}

function cultivoRowRemoveBtnHtml(r) {
  if (r.labSetId == null || r.labSetId === '') return '';
  return (
    '<button type="button" class="cultivos-row-remove-btn" data-cult-set-id="' +
    esc(String(r.labSetId)) +
    '" title="Eliminar este cultivo del historial" aria-label="Eliminar este cultivo del historial">×</button>'
  );
}

/** "HEMOCULTIVO (PERIFERICO DERECHO)" ya va bajo "Hemocultivo" → "PERIFERICO DERECHO". */
function cultivoRawSiteLabel(r) {
  var s = String(r.sitio || '').trim();
  var m = /^\S*CULTIVO\S*\s*\((.+)\)$/i.exec(s);
  return m ? m[1] : s || '—';
}

/** Hemocultivos agrupados (periférico/central) muestran el grupo, no el brazo. */
function cultivoSiteLabel(r) {
  return HEMO_SITIO_LABELS[hemoSitioGrupo(r)] || cultivoRawSiteLabel(r);
}

var CULTIVO_SITE_MAX_DOTS = 12;

/** Un punto por fecha de muestra (positivo si algún aislamiento lo es), antiguo → reciente. */
function cultivoSiteDotsHtml(rows) {
  var byFecha = Object.create(null);
  var fechas = [];
  rows.forEach(function (r) {
    var f = rowFechaDisplay(r);
    if (!byFecha[f]) fechas.push((byFecha[f] = { fecha: f, orgs: [] }));
    if (cultivoRowIsIsolate(r)) byFecha[f].orgs.push(r.organismo);
  });
  return fechas
    .slice(0, CULTIVO_SITE_MAX_DOTS)
    .reverse()
    .map(function (d) {
      return (
        '<span class="cult-dot cult-dot--' +
        (d.orgs.length ? 'pos' : 'neg') +
        '" title="' +
        esc(d.fecha + ' · ' + (d.orgs.length ? d.orgs.join(', ') : 'Negativo')) +
        '"></span>'
      );
    })
    .join('');
}

function cultivoSiteHtml(site) {
  var last = site.rows[0];
  var rowsHtml = site.rows
    .map(function (r, i) {
      var fecha = rowFechaDisplay(r);
      // Varios aislamientos de la misma muestra: la fecha solo en el primero.
      var sameAsPrev = i > 0 && rowFechaDisplay(site.rows[i - 1]) === fecha;
      return (
        '<tr class="' +
        (r.negativo ? 'cultivos-row-neg' : cultivoRowIsIsolate(r) ? '' : 'cult-row-muted') +
        '" data-fecha="' +
        esc(fecha) +
        '"><td class="cultivos-cell-fecha">' +
        (sameAsPrev ? '' : esc(fecha)) +
        '</td><td class="cultivos-cell-org">' +
        cultivoOrganismoCellHtml(r) +
        '</td><td class="cultivos-cell-atb">' +
        cultivoAntibiogramCellHtml(r) +
        '</td><td class="cultivos-cell-remove">' +
        cultivoRowRemoveBtnHtml(r) +
        '</td></tr>'
      );
    })
    .join('');
  return (
    '<details class="cult-site' +
    (site.positive ? ' cult-site--pos" open>' : '">') +
    '<summary class="cult-site-head"><span class="rp-dot" aria-hidden="true"></span>' +
    '<span class="cult-site-title"><span class="cult-site-tipo">' +
    esc(last.tipoLabel || 'Otros cultivos') +
    '</span> · ' +
    esc(cultivoSiteLabel(last)) +
    '</span><span class="cult-site-dots" aria-hidden="true">' +
    cultivoSiteDotsHtml(site.rows) +
    '</span><span class="cult-site-last">' +
    esc((last.negativo ? 'Negativo' : last.organismo) + ' · ' + rowFechaDisplay(last)) +
    '</span></summary>' +
    '<table class="cultivos-table"><tbody>' +
    rowsHtml +
    '</tbody></table></details>'
  );
}

/** Sitios con algún positivo abiertos arriba; sitios solo negativos plegados abajo. */
function buildCultivoSitesHtml(rows) {
  var sites = groupCultivoRowsBySite(rows);
  var pos = sites.filter(function (s) {
    return s.positive;
  });
  var neg = sites.filter(function (s) {
    return !s.positive;
  });
  var negCount = neg.reduce(function (n, s) {
    return n + s.rows.length;
  }, 0);
  var negHtml = neg.length
    ? '<details class="cultivos-neg-fold"' +
      (pos.length ? '' : ' open') +
      '><summary class="cultivos-neg-head"><span class="rp-dot" aria-hidden="true"></span>Sin aislamientos <span class="cultivos-neg-count">' +
      negCount +
      '</span><span class="cultivos-neg-sites">' +
      neg.length +
      (neg.length === 1 ? ' sitio' : ' sitios') +
      '</span></summary>' +
      neg.map(cultivoSiteHtml).join('') +
      '</details>'
    : '';
  return pos.map(cultivoSiteHtml).join('') + negHtml;
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
  container.innerHTML = buildCultivosToolbarHtml(pid) + buildCultivoSitesHtml(flatRows);
  wireAtbRisHoverPanels(container);
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
