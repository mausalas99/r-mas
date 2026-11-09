// Cultivos table render, cache, refresh
import { sortLabHistoryChronological } from '../../tend-core.mjs';
import { normalizeLabLine } from '../../lab-history-auto-store-core.mjs';
import { getLabHistoryRevision, bumpLabHistoryRevision, TREND_REFRESH_DEBOUNCE_MS } from '../../lab-history-cache.mjs';
import { pendingCultivosForPatient, markCultivosSeen, markCultivoSeen, findPendingForRow } from '../cultivo-pending.mjs';
import { rt, aid, esc } from './expediente-runtime.mjs';
import {
  parseCultureBlockFromLineArray,
  isCultureTableHeaderLine,
} from './expediente-cultivos-parse.mjs';
import {
  buildCultivoAntibiogramCellHtmlForPatient,
  cultivoAtbSignature,
  wireAtbRisHoverPanels,
  removeAtbRisPanelsFromBody,
} from './expediente-cultivos-atb-ui.mjs';
import {
  pendingAtbCultivoItemsForPatient,
  refreshPatientCultivoLabsFromRepo,
  cultivoRefreshOutcomeMessage,
} from '../cultivo-queue-refresh.mjs';
import { deleteLabHistorySet } from '../lab-panel-history.mjs';
import { isAmpcOrganism } from '../../cultivo-intrinsic-resistance.mjs';
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
var _cultPop = null;
var _cultPopTimer = 0;

function hideCultPop_() {
  clearTimeout(_cultPopTimer);
  if (_cultPop) _cultPop.remove();
  _cultPop = null;
}

/** Cierra con una pausa corta: da tiempo de pasar el cursor de la pastilla al cuadro. */
function hideCultPopSoon_() {
  clearTimeout(_cultPopTimer);
  _cultPopTimer = setTimeout(hideCultPop_, 250);
}

/** Nombres del reporte plegado en un cuadro de <body>, junto a su pastilla R / I / S. */
function showCultPop_(wrap) {
  var names = wrap.querySelector('.cult-atb-ris-names');
  var chip = wrap.querySelector('.atb-chip');
  if (!names || !chip) return;
  hideCultPop_();
  var bucket = (/atb-chip--([a-z])/.exec(chip.className) || [])[1] || '';
  var pop = document.createElement('div');
  pop.className = 'cult-atb-pop cult-atb-pop--' + bucket;
  pop.innerHTML = names.innerHTML;
  if (pop.querySelectorAll('.cult-atb-item').length < 2) pop.style.gridTemplateColumns = 'minmax(220px, 1fr)';
  pop.addEventListener('pointerenter', function () {
    clearTimeout(_cultPopTimer);
  });
  pop.addEventListener('pointerleave', hideCultPopSoon_);
  document.body.appendChild(pop);
  var rc = wrap.getBoundingClientRect();
  var w = pop.offsetWidth;
  var h = pop.offsetHeight;
  var left = Math.max(8, Math.min(rc.left, window.innerWidth - w - 8));
  var top = rc.bottom;
  if (top + h > window.innerHeight - 8) top = Math.max(8, rc.top - h);
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
  _cultPop = pop;
}

var CULT_COLLAPSED_LS = 'rplus.cultCollapsed.v1';

function cultCollapsedList_() {
  try {
    var o = JSON.parse(localStorage.getItem(CULT_COLLAPSED_LS) || '{}');
    return o && typeof o === 'object' ? o : {};
  } catch (_e) {
    void _e;
    return {};
  }
}

/** Clave estable de un aislamiento plegado: paciente + sitio + organismo + fechas. */
function cultCollapsedKey_(r, group) {
  return [cultivoSiteLabel(r), r.organismo, group.map(rowFechaDisplay).join('|')].join('|').toLowerCase();
}

function cultIsCollapsed_(key) {
  return (cultCollapsedList_()[String(aid())] || []).indexOf(key) >= 0;
}

function cultSetCollapsed_(key, on) {
  var all = cultCollapsedList_();
  var pid = String(aid());
  var list = (all[pid] || []).filter(function (k) {
    return k !== key;
  });
  if (on) list.push(key);
  all[pid] = list;
  try {
    localStorage.setItem(CULT_COLLAPSED_LS, JSON.stringify(all));
  } catch (_e) {
    void _e;
  }
}

function cultivoOrganismoCellHtml(r, pend, group) {
  var parts = String(r.organismo || '').split(/\s*·\s*/);
  var iso = cultivoRowIsIsolate(r);
  var ckey = iso ? cultCollapsedKey_(r, group) : '';
  var collapsed = iso && cultIsCollapsed_(ckey);
  // Aislamiento: el nombre es un botón que pliega o abre su reporte.
  var html =
    '<' + (iso ? 'button type="button" aria-expanded="' + (collapsed ? 'false' : 'true') + '" data-cult-ckey="' + esc(ckey) + '"' : 'span') +
    ' class="cult-org-name' +
    (iso ? ' cult-org-name--isolate cult-org-toggle' : '') +
    '">' +
    esc(parts[0]) +
    '</' + (iso ? 'button' : 'span') + '>';
  parts.slice(1).forEach(function (tag) {
    if (!tag) return;
    html +=
      ' <span class="cult-org-tag' +
      (CULTIVO_TAG_ALERT_RE.test(tag) ? ' cult-org-tag--alert' : '') +
      '">' +
      esc(tag) +
      '</span>';
  });
  if (cultivoRowIsIsolate(r) && isAmpcOrganism(parts[0]) && !/AmpC/i.test(r.organismo)) {
    html += ' <span class="cult-org-tag">AmpC</span>';
  }
  if (group.length > 1) html += ' <span class="cult-org-n">· ' + group.length + ' muestras</span>';
  if (pend) {
    html +=
      ' <span class="cult-org-tag cult-org-tag--new">' + (pend.atbOnly ? 'ATB nuevo' : 'Nuevo') + '</span>';
  }
  // Cuenta sin número ("X") no aporta nada. En hemocultivos agrupados, el
  // sitio real (brazo/mano) va aquí porque el encabezado solo dice el grupo.
  var sub = [];
  var sitios = [];
  group.forEach(function (g) {
    var lbl = hemoSitioGrupo(g) ? sentenceCase_(cultivoRawSiteLabel(g)) : '';
    if (lbl && sitios.indexOf(lbl) < 0) sitios.push(lbl);
  });
  if (sitios.length) sub.push(sitios.join(' / '));
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
/** Cultivos sin revisar del paciente abierto; se fija en cada render. */
var _pendingNow = [];

/** Título, resumen y botón Actualizar (texto). */
function buildCultivosToolbarHtml(patientId, rows) {
  var isoOrgs = Object.create(null);
  var nOrg = 0;
  rows.forEach(function (r) {
    if (!cultivoRowIsIsolate(r)) return;
    var k = String(r.organismo || '').split(/\s*·\s*/)[0].toUpperCase();
    if (!isoOrgs[k]) {
      isoOrgs[k] = 1;
      nOrg++;
    }
  });
  var nSites = groupCultivoRowsBySite(rows).filter(function (s) {
    return s.positive;
  }).length;
  var last = rows.reduce(function (a, r) {
    return cultivoRowMs(r) > cultivoRowMs(a) ? r : a;
  }, rows[0]);
  var summary =
    nOrg +
    (nOrg === 1 ? ' microorganismo' : ' microorganismos') +
    ' en ' +
    nSites +
    (nSites === 1 ? ' sitio' : ' sitios') +
    ' · último ' +
    rowFechaDisplay(last);
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
    '<div class="cultivos-toolbar"><h2 class="cultivos-title">Cultivos</h2><span class="cultivos-summary">' +
    esc(summary) +
    '</span>' +
    (_pendingNow.length
      ? '<button type="button" class="cultivo-seen-btn" title="Marcar todos los cultivos nuevos como vistos">Marcar todo como visto</button>'
      : '') +
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
  var popWrap = function (ev) {
    return ev.target && ev.target.closest ? ev.target.closest('.cult-row--collapsed .cult-atb-ris-chip-wrap') : null;
  };
  container.addEventListener('pointerover', function (ev) {
    var w = popWrap(ev);
    if (w) showCultPop_(w);
  });
  container.addEventListener('pointerout', function (ev) {
    var w = popWrap(ev);
    if (w && !(ev.relatedTarget && w.contains(ev.relatedTarget))) hideCultPopSoon_();
  });
  container.addEventListener('focusin', function (ev) {
    var w = popWrap(ev);
    if (w) showCultPop_(w);
  });
  container.addEventListener('focusout', hideCultPopSoon_);
  container.addEventListener('scroll', hideCultPop_, true);
  container.addEventListener('click', function (ev) {
    var removeBtn = ev.target && ev.target.closest ? ev.target.closest('.cultivos-row-remove-btn') : null;
    if (removeBtn) {
      ev.preventDefault();
      var setId = removeBtn.getAttribute('data-cult-set-id');
      if (setId) void deleteLabHistorySet(setId);
      return;
    }
    var orgBtn = ev.target && ev.target.closest ? ev.target.closest('.cult-org-toggle') : null;
    if (orgBtn) {
      ev.preventDefault();
      var collapsed = orgBtn.closest('tr').classList.toggle('cult-row--collapsed');
      orgBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      cultSetCollapsed_(orgBtn.getAttribute('data-cult-ckey') || '', collapsed);
      hideCultPop_();
      return;
    }
    var dateBtn = ev.target && ev.target.closest ? ev.target.closest('.cult-date-btn') : null;
    if (dateBtn) {
      ev.preventDefault();
      var open = dateBtn.getAttribute('aria-expanded') !== 'true';
      dateBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      var key = '|' + dateBtn.getAttribute('data-cult-fecha') + '|';
      dateBtn.closest('.cult-site').querySelectorAll('tr.cult-row--folded').forEach(function (tr) {
        if ((tr.getAttribute('data-fechas') || '').indexOf(key) >= 0) tr.classList.toggle('cult-row--open', open);
      });
      return;
    }
    var rowSeen = ev.target && ev.target.closest ? ev.target.closest('.cultivo-row-seen-btn') : null;
    if (rowSeen) {
      ev.preventDefault();
      var spid = aid();
      if (!spid) return;
      try {
        JSON.parse(rowSeen.getAttribute('data-cult-keys') || '[]').forEach(function (k) {
          markCultivoSeen(spid, k);
        });
      } catch (_e) {
        void _e;
      }
      invalidateCultivosTableCache();
      renderCultivosTable();
      bumpLabHistoryRevision(spid);
      return;
    }
    var seenBtn = ev.target && ev.target.closest ? ev.target.closest('.cultivo-seen-btn') : null;
    if (seenBtn) {
      ev.preventDefault();
      var pid = aid();
      if (!pid) return;
      markCultivosSeen(pid);
      rt.showToast('Cultivos marcados como vistos', 'success');
      invalidateCultivosTableCache();
      renderCultivosTable();
      bumpLabHistoryRevision(pid);
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

function sentenceCase_(t) {
  // Siglas sin vocales (HD, CVC) se quedan en mayúsculas.
  var x = String(t || '')
    .split(' ')
    .map(function (w) {
      return /^[^AEIOUÁÉÍÓÚ\s.]{2,4}$/.test(w) && /^[A-Z]+$/.test(w) ? w : w.toLowerCase();
    })
    .join(' ');
  return x.charAt(0).toUpperCase() + x.slice(1);
}

function shortDate_(f) {
  return String(f || '').replace(/\/\d{4}$/, '');
}

/** "Staphylococcus aureus" → "S. aureus". */
function abbrevOrg_(name) {
  var w = String(name || '').trim().split(/\s+/);
  return w.length > 1 && w[0].length > 3 ? w[0].charAt(0).toUpperCase() + '. ' + w.slice(1).join(' ').toLowerCase() : sentenceCase_(name);
}

/** "Último: negativo 04/11" · "Último: S. aureus MRSA 04/11". */
function cultivoLastLine(r) {
  var parts = String(r.organismo || '').split(/\s*·\s*/);
  var what = !cultivoRowIsIsolate(r)
    ? r.negativo
      ? 'negativo'
      : 'contaminado'
    : abbrevOrg_(parts[0]) +
      parts
        .slice(1)
        .filter(function (t) {
          return CULTIVO_TAG_ALERT_RE.test(t);
        })
        .map(function (t) {
          return ' ' + t;
        })
        .join('');
  return 'Último: ' + what + ' ' + shortDate_(rowFechaDisplay(r));
}

/** "TEJIDO CUTANEO (TEJIDO DE HERIDA TOBILLO IZQUIERDO)" → nombre corto + detalle. */
function splitSiteName(label) {
  var m = /^([^(]*?)\s*(\(.+\))\s*$/.exec(String(label || ''));
  if (!m) return { main: String(label || ''), detail: '' };
  var inner = /^\(([^()]*)\)$/.exec(m[2]);
  return { main: m[1] || m[2], detail: inner ? inner[1] : m[2] };
}

/** Un punto por fecha de muestra (positivo si algún aislamiento lo es), antiguo → reciente, unidos por líneas, con fechas. */
function cultivoSiteDotsHtml(rows, newFechas, fold) {
  var byFecha = Object.create(null);
  var fechas = [];
  rows.forEach(function (r) {
    var f = rowFechaDisplay(r);
    if (!byFecha[f]) fechas.push((byFecha[f] = { fecha: f, orgs: [] }));
    if (cultivoRowIsIsolate(r)) byFecha[f].orgs.push(r.organismo);
  });
  newFechas = newFechas || {};
  // Una sola muestra: la fecha ya va en el encabezado.
  if (fechas.length < 2) return '';
  var list = fechas.slice(0, CULTIVO_SITE_MAX_DOTS).reverse();
  var dots = list
    .map(function (d) {
      return (
        '<span class="cult-dot cult-dot--' +
        (d.orgs.length ? 'pos' : 'neg') +
        (newFechas[d.fecha] ? ' cult-dot--new' : '') +
        '"></span>'
      );
    })
    .join('<span class="cult-dot-line"></span>');
  var text = list
    .map(function (d) {
      var short = esc(d.fecha.replace(/\/\d{4}$/, ''));
      if (!d.orgs.length) return short + ' neg';
      // Sitio que hoy es negativo: la fecha positiva abre su aislamiento.
      return fold
        ? '<button type="button" class="cult-date-btn" aria-expanded="false" data-cult-fecha="' + esc(d.fecha) + '">' + short + '</button>'
        : short;
    })
    .join(' · ');
  return dots + '<span class="cult-dots-text">' + text + '</span>';
}

function cultivoSiteHtml(site) {
  var last = site.rows[0];
  var newFechas = Object.create(null);
  var siteNew = null;
  site.rows.forEach(function (r) {
    var p = cultivoRowIsIsolate(r) ? findPendingForRow(_pendingNow, r, rowFechaDisplay(r)) : null;
    if (!p) return;
    newFechas[rowFechaDisplay(r)] = true;
    if (!siteNew || !p.atbOnly) siteNew = p;
  });
  // Aislamientos iguales (mismo organismo y mismo R/I/S) en un solo bloque; negativos al final, en una línea.
  var pid = aid();
  var bySig = Object.create(null);
  var iso = [];
  var compact = [];
  site.rows.forEach(function (r) {
    if (!cultivoRowIsIsolate(r)) {
      compact.push([r]);
      return;
    }
    var sig = cultivoAtbSignature(r, pid);
    var k = sig ? String(r.organismo || '').toLowerCase().replace(/\s+/g, ' ').trim() + '\x01' + sig : '';
    if (k && bySig[k]) {
      bySig[k].push(r);
      return;
    }
    var g = [r];
    iso.push(g);
    if (k) bySig[k] = g;
  });
  // Último resultado negativo: se ve «negativo» y los aislamientos viejos se abren con su fecha.
  var fold = !cultivoRowIsIsolate(last) && iso.length > 0;
  var rowsHtml = iso
    .concat(compact)
    .map(function (group) {
      var r = group[0];
      var fecha = rowFechaDisplay(r);
      var pends = group
        .map(function (g) {
          return cultivoRowIsIsolate(g) ? findPendingForRow(_pendingNow, g, rowFechaDisplay(g)) : null;
        })
        .filter(Boolean);
      var pend =
        pends.filter(function (p) {
          return !p.atbOnly;
        })[0] ||
        pends[0] ||
        null;
      return (
        '<tr class="' +
        (r.negativo ? 'cultivos-row-neg' : cultivoRowIsIsolate(r) ? '' : 'cult-row-muted') +
        (pend ? ' cult-row--new' : '') +
        (fold && cultivoRowIsIsolate(r) && !pend ? ' cult-row--folded' : '') +
        (cultivoRowIsIsolate(r) && cultIsCollapsed_(cultCollapsedKey_(r, group)) ? ' cult-row--collapsed' : '') +
        '" data-fecha="' +
        esc(fecha) +
        '" data-fechas="|' +
        esc(group.map(rowFechaDisplay).join('|')) +
        '|"><td class="cultivos-cell-fecha">' +
        esc(
          group
            .map(function (g) {
              return shortDate_(rowFechaDisplay(g));
            })
            .join(' · ')
        ) +
        '</td><td class="cultivos-cell-org">' +
        cultivoOrganismoCellHtml(r, pend, group) +
        '</td><td class="cultivos-cell-atb">' +
        cultivoAntibiogramCellHtml(r) +
        '</td><td class="cultivos-cell-remove">' +
        (pend
          ? '<button type="button" class="cultivo-row-seen-btn" data-cult-keys="' +
            esc(JSON.stringify(pends.map(function (p) { return p.key; }))) +
            '">Visto</button>'
          : '') +
        (group.length === 1 ? cultivoRowRemoveBtnHtml(r) : '') +
        '</td></tr>'
      );
    })
    .join('');
  var dotsHtml = cultivoSiteDotsHtml(site.rows, newFechas, fold);
  var siteParts = splitSiteName(cultivoSiteLabel(last));
  var siteName = siteParts.main;
  var tipo = String(last.tipoLabel || 'Otros cultivos');
  return (
    '<details class="cult-site' +
    (iso.length <= 1 ? ' cult-site--solo' : '') +
    (site.positive ? ' cult-site--pos" open>' : '">') +
    '<summary class="cult-site-head"><span class="rp-dot" aria-hidden="true"></span>' +
    '<span class="cult-status-dot' +
    (cultivoRowIsIsolate(last) ? ' cult-status-dot--pos' : '') +
    '" aria-hidden="true"></span>' +
    '<span class="cult-site-headtext"><span class="cult-site-title">' +
    esc(siteName) +
    (tipo.toUpperCase() === siteName.toUpperCase()
      ? ''
      : ' · <span class="cult-site-tipo">' + esc(tipo) + '</span>') +
    (siteParts.detail ? '<span class="cult-site-detail">' + esc(siteParts.detail) + '</span>' : '') +
    '</span><span class="cult-site-ultimo">' +
    esc(cultivoLastLine(last)) +
    '</span></span>' +
    (siteNew
      ? '<span class="cult-org-tag cult-org-tag--new">' + (siteNew.atbOnly ? 'ATB nuevo' : 'Nuevo') + '</span>'
      : '') +
    '<span class="cult-site-last">' +
    esc(shortDate_(rowFechaDisplay(last))) +
    '</span></summary>' +
    (dotsHtml ? '<div class="cult-site-dots" aria-label="Historia de muestras">' + dotsHtml + '</div>' : '') +
    '<table class="cultivos-table"><tbody>' +
    rowsHtml +
    '</tbody></table></details>'
  );
}

function buildCultivoSitesHtml(rows) {
  var sites = groupCultivoRowsBySite(rows);
  var pos = sites.filter(function (s) {
    return s.positive;
  });
  var neg = sites.filter(function (s) {
    return !s.positive;
  });
  var negHtml = neg.length
    ? '<details class="cultivos-neg-fold"' +
      (pos.length ? '' : ' open') +
      '><summary class="cultivos-neg-head"><b>Negativos</b><span class="cultivos-neg-count">' +
      neg.length +
      (neg.length === 1 ? ' sitio' : ' sitios') +
      '</span><span class="cultivos-neg-list"><span class="cultivos-neg-names">' +
      neg
        .map(function (s) {
          var l = s.rows[0];
          var sp = splitSiteName(cultivoSiteLabel(l));
          var nm = sp.detail && !/\)/.test(sp.detail) ? sp.detail : sp.main;
          return esc(sentenceCase_(nm) + ' · ' + rowFechaDisplay(l).replace(/\/\d{4}$/, ''));
        })
        .join('</span><span class="cultivos-neg-names">') +
      '</span></span></summary>' +
      '<div class="cult-sites-grid">' +
      neg.map(cultivoSiteHtml).join('') +
      '</div>' +
      '</details>'
    : '';
  // Tarjetas y franja de negativos en el mismo flujo de columnas: se reparten por altura.
  return '<div class="cult-sites-grid">' + pos.map(cultivoSiteHtml).join('') + negHtml + '</div>';
}

function renderCultivosTable() {
  var container = document.getElementById('cultivos-table-container');
  hideCultPop_();
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
  _pendingNow = pendingCultivosForPatient(pid);
  container.innerHTML = buildCultivosToolbarHtml(pid, flatRows) + buildCultivoSitesHtml(flatRows);
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
