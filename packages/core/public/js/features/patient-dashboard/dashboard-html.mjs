/**
 * Spanish HTML for the Paciente Resumen glance. Root class patient-dash.
 */
import { escHtml, escAttr } from '../../dom-escape.mjs';
import { isGlucometriaMarkedAltered, isVitalAltered } from '../estado-actual-ranges.mjs';
import { isTodoOverdue } from '../../todos-due.mjs';
import { serviceById, hueForService } from './interconsult-catalog.mjs';
import { packSoapCols } from './ea-glance-model.mjs';
import { clinicalPriorityRank } from '../../labs-critical-values.mjs';

function numText(value) {
  if (value == null || value === '') return '';
  var n = Number(value);
  if (Number.isFinite(n)) return String(n);
  return String(value).trim();
}

function readingsFromModel(model) {
  var snap = model && model.vitals;
  if (!snap || typeof snap !== 'object') return { vitals: {}, glucometrias: [], io: {} };
  return {
    vitals: snap.vitals && typeof snap.vitals === 'object' ? snap.vitals : {},
    glucometrias: Array.isArray(snap.glucometrias) ? snap.glucometrias : [],
    io: snap.io && typeof snap.io === 'object' ? snap.io : {},
  };
}

function lastGlu(glucometrias) {
  if (!glucometrias.length) return '';
  var last = glucometrias[glucometrias.length - 1];
  if (last == null) return '';
  if (typeof last === 'object') return numText(last.value);
  return numText(last);
}

function ioBalance(io) {
  var ing = Number(io.ing);
  var egr = Number(io.egr);
  if (!Number.isFinite(ing) && !Number.isFinite(egr)) return '';
  var a = Number.isFinite(ing) ? ing : 0;
  var b = Number.isFinite(egr) ? egr : 0;
  var delta = a - b;
  return (delta > 0 ? '+' : '') + String(delta);
}

function vitalCell(label, value, hi, range) {
  if (!value) return '';
  return (
    '<div class="vital' +
    (hi ? ' hi' : '') +
    '"><small>' +
    escHtml(label) +
    '</small><b>' +
    escHtml(value) +
    '</b>' +
    (range ? '<span class="vital-range">' + escHtml(range) + '</span>' : '') +
    '</div>'
  );
}

/**
 * 8.4.3 board A1: lowest–highest reading of the last 24 h (counted back from
 * the newest reading), shown under the value. Fewer than 2 readings → none.
 */
function range24h(series) {
  var list = Array.isArray(series) ? series : [];
  var at = function (r) {
    var t = Date.parse(r && r.recordedAt);
    return Number.isFinite(t) ? t : NaN;
  };
  var newest = list.reduce(function (max, r) {
    var t = at(r);
    return t > max ? t : max;
  }, -Infinity);
  var values = list
    .filter(function (r) {
      return at(r) >= newest - 86400000 && Number.isFinite(Number(r.value));
    })
    .map(function (r) {
      return Number(r.value);
    });
  if (values.length < 2) return '';
  var lo = Math.min.apply(null, values);
  var hi = Math.max.apply(null, values);
  return lo === hi ? '' : lo + '–' + hi;
}

function vitalAlteredFlags(v, gluLast, glu) {
  return [
    isVitalAltered('tas', v.tas) || isVitalAltered('tad', v.tad),
    isVitalAltered('fc', v.fc),
    isVitalAltered('fr', v.fr),
    isVitalAltered('temp', v.temp),
    isVitalAltered('sat', v.sat),
    isGlucometriaMarkedAltered(gluLast && typeof gluLast === 'object' ? gluLast : { value: glu }),
  ];
}

function buildVitalsCellsHtml(v, ta, glu, flags, io, series) {
  var s = series || {};
  return (
    vitalCell('T/A', ta, flags[0], range24h(s.tas)) +
    vitalCell('FC', numText(v.fc), flags[1], range24h(s.fc)) +
    vitalCell('FR', numText(v.fr), flags[2], range24h(s.fr)) +
    vitalCell('Temp', numText(v.temp), flags[3], range24h(s.temp)) +
    vitalCell('SatO₂', numText(v.sat) ? numText(v.sat) + '%' : '', flags[4], range24h(s.sat)) +
    vitalCell('Glu', glu, flags[5]) +
    vitalCell('I/O', io, false)
  );
}

function vitalsAtLabel(vitalsAt) {
  if (!vitalsAt) return '';
  var d = new Date(vitalsAt);
  if (Number.isNaN(d.getTime())) return '';
  return 'toma ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function taLabel(v) {
  var tas = numText(v.tas);
  var tad = numText(v.tad);
  return tas || tad ? (tas || '—') + '/' + (tad || '—') : '';
}

function hasCoreVitalsData(v, ta, glu) {
  return !!(ta || numText(v.fc) || numText(v.fr) || numText(v.temp) || numText(v.sat) || glu);
}

function buildVitalsMetaHtml(atLabel, hasCoreVitals, alteredCount) {
  var metaParts = [];
  if (atLabel) metaParts.push(escHtml(atLabel));
  if (hasCoreVitals && alteredCount) {
    metaParts.push(
      '<span class="vitals-alert-count">' + alteredCount + ' fuera de rango</span>',
    );
  }
  return metaParts.length ? '<span class="card-h-meta">' + metaParts.join(' · ') + '</span>' : '';
}

function renderVitalsHtml(model) {
  var r = readingsFromModel(model);
  var v = r.vitals;
  var ta = taLabel(v);
  var gluList = r.glucometrias;
  var gluLast = gluList.length ? gluList[gluList.length - 1] : null;
  var glu = lastGlu(gluList);
  var io = ioBalance(r.io);
  var flags = vitalAlteredFlags(v, gluLast, glu);
  var cells = buildVitalsCellsHtml(v, ta, glu, flags, io, model && model.vitals && model.vitals.vitalSeries);
  var hasCoreVitals = hasCoreVitalsData(v, ta, glu);
  var emptyClass = hasCoreVitals ? '' : ' vitals-card--empty';
  var alteredCount = flags.filter(Boolean).length;
  var atLabel = vitalsAtLabel(model && model.vitalsAt);
  var metaHtml = buildVitalsMetaHtml(atLabel, hasCoreVitals, alteredCount);
  return (
    '<button class="card clickable vitals-card' +
    emptyClass +
    '" type="button" data-dash-action="estadoActual">' +
    '<div class="card-h"><span>Signos vitales</span>' +
    metaHtml +
    '</div>' +
    '<div class="card-b"><div class="vitals">' +
    (cells || '<p class="meta">Sin signos vitales</p>') +
    '</div></div></button>'
  );
}

function ctxPillHtml(label, value) {
  return (
    '<span class="ctx-pill"><small>' +
    escHtml(label) +
    '</small>' +
    (value ? ' ' + escHtml(value) : '') +
    '</span>'
  );
}

/**
 * One slim row above vitals: care plan (soporte, dieta, bomba → Estado actual)
 * and lines/tubes with their day count (→ Datos). Nothing to show → no row.
 */
function renderContextHtml(model) {
  var kpis = (model.ea && model.ea.kpis) || [];
  var accesos = Array.isArray(model.accesos) ? model.accesos : [];
  if (!kpis.length && !accesos.length) return '';
  return (
    '<div class="dash-context">' +
    (kpis.length
      ? '<button type="button" class="ctx-group" data-dash-action="estadoActual">' +
        kpis
          .map(function (k) {
            return k.label === 'Bomba' && !k.value
              ? ctxPillHtml('Bomba de insulina', '')
              : ctxPillHtml(k.label, k.value);
          })
          .join('') +
        '</button>'
      : '') +
    (accesos.length
      ? '<button type="button" class="ctx-group" data-dash-action="datos">' +
        accesos
          .map(function (a) {
            return ctxPillHtml(a.label, a.dia ? 'día ' + a.dia : '');
          })
          .join('') +
        '</button>'
      : '') +
    '</div>'
  );
}

function renderIcAssignedHtml(ids) {
  var chips = (Array.isArray(ids) ? ids : [])
    .map(function (id) {
      var svc = serviceById(id);
      if (!svc) return '';
      return (
        '<button type="button" class="svc" style="--h:' +
        hueForService(svc) +
        '" data-dash-action="ic-toggle" data-ic-id="' +
        escAttr(svc.id) +
        '">' +
        escHtml(svc.name) +
        '</button>'
      );
    })
    .join('');
  return (
    chips +
    '<button type="button" class="svc-add" data-dash-action="ic-add">+ Agregar</button>'
  );
}

function renderIdentityHtml(model) {
  var idn = (model && model.identity) || {};
  var dx = Array.isArray(idn.diagnosticos) ? idn.diagnosticos : [];
  var dxHtml = dx
    .map(function (d) {
      return '<span class="chip" title="' + escAttr(d) + '">' + escHtml(d) + '</span>';
    })
    .join('');
  return (
    '<div class="idrow"><div>' +
    '<div class="id-name-row">' +
    '<button type="button" class="dash-back-cards" data-sv-home aria-label="Volver a todas las camas" title="Volver a todas las camas (Esc)">‹ Camas</button>' +
    '<h1><button class="dash-name" type="button" data-dash-action="datos">' +
    escHtml(idn.nombre || 'Paciente') +
    '</button></h1>' +
    '</div>' +
    '<div class="chips" id="ic-assigned">' +
    dxHtml +
    renderIcAssignedHtml(idn.interconsultServiceIds) +
    '</div></div>' +
    '<button type="button" class="wb-btn wb-btn-secondary" data-dash-action="actualizar-labs">Actualizar labs</button>' +
    '</div>'
  );
}

function trendArrowHtml(trend) {
  if (trend === 'up') return '<span class="draw-trend is-up">&#8593;</span>';
  if (trend === 'down') return '<span class="draw-trend is-down">&#8595;</span>';
  if (trend === 'flat') return '<span class="draw-trend is-flat">&#8594;</span>';
  return '';
}

function renderDrawCellHtml(chip) {
  var value = String((chip && chip.value) || '').replace(/\*$/, '');
  return (
    '<div class="draw-cell">' +
    '<span class="draw-label">' +
    escHtml(String((chip && chip.label) || '')) +
    '</span>' +
    '<span class="draw-value abn">' +
    escHtml(value) +
    '</span>' +
    (chip && chip.prev
      ? '<span class="draw-delta">antes ' +
        escHtml(String(chip.prev)) +
        ' ' +
        trendArrowHtml(chip.trend) +
        '</span>'
      : '<span class="draw-delta"></span>') +
    '</div>'
  );
}

function envioChipCount(envio) {
  return (envio.groups || []).reduce(function (n, g) {
    return n + (g.chips ? g.chips.length : 0);
  }, 0);
}

var MAX_DRAW_CELLS = 8;

/**
 * Orders altered-lab chips for display: worsening values (trend 'down', a
 * drop since the prior reading) rank first, worst drop first. Everything
 * else (up/flat/no prior reading) falls back to CLINICAL_PRIORITY_LABELS.
 * Ties keep their original (stable) order within each group.
 */
function sortDrawChips(chips) {
  var indexed = chips.map(function (chip, i) {
    return { chip: chip, i: i };
  });
  indexed.sort(function (a, b) {
    var aDown = a.chip && a.chip.trend === 'down';
    var bDown = b.chip && b.chip.trend === 'down';
    if (aDown && bDown) {
      var aMag = Math.abs(parseFloat(String(a.chip.delta).replace(/^[+-]/, ''))) || 0;
      var bMag = Math.abs(parseFloat(String(b.chip.delta).replace(/^[+-]/, ''))) || 0;
      if (aMag !== bMag) return bMag - aMag;
      return a.i - b.i;
    }
    if (aDown !== bDown) return aDown ? -1 : 1;
    var aRank = clinicalPriorityRank(a.chip && a.chip.label);
    var bRank = clinicalPriorityRank(b.chip && b.chip.label);
    if (aRank !== bRank) return aRank - bRank;
    return a.i - b.i;
  });
  return indexed.map(function (entry) {
    return entry.chip;
  });
}

function renderDrawHtml(envio, showHead) {
  var all = (envio.groups || []).reduce(function (acc, g) {
    return acc.concat(g.chips || []);
  }, []);
  var visible = sortDrawChips(all).slice(0, MAX_DRAW_CELLS);
  var hidden = all.length - visible.length;
  return (
    '<button class="draw' +
    (envio.wide ? ' is-wide' : '') +
    '" type="button" data-dash-action="labs-envio" data-lab-set-id="' +
    escAttr(String(envio.id || '')) +
    '">' +
    (showHead && envio.hora
      ? '<div class="draw-head"><span class="draw-head-label">Corte ' +
        escHtml(envio.hora) +
        '</span></div>'
      : '') +
    '<div class="draw-grid">' +
    visible.map(renderDrawCellHtml).join('') +
    (hidden > 0 ? '<span class="draw-cell draw-more">+' + hidden + ' más</span>' : '') +
    '</div></button>'
  );
}

/**
 * A patient can have more than one lab draw ("envio") the same day, and each
 * draw renders as its own stacked card. When the same analyte (chip label)
 * is altered in more than one of the visible draws, showing it twice is
 * redundant and pushes the page below the fold. Keep each repeated label
 * only in the most recent draw that has it, dropping it from earlier ones.
 * If an earlier draw ends up with zero chips after that, drop the draw
 * entirely so no empty card renders. Matching is case-insensitive/trimmed,
 * same normalization style as clinicalPriorityRank above.
 */
function dedupeChipsAcrossEnvios(visibleEnvios) {
  var seenLabels = {};
  var deduped = [];
  for (var i = visibleEnvios.length - 1; i >= 0; i -= 1) {
    var envio = visibleEnvios[i];
    var groups = (envio.groups || []).map(function (g) {
      var chips = (g.chips || []).filter(function (chip) {
        var norm = String((chip && chip.label) || '').trim().toLowerCase();
        if (seenLabels[norm]) return false;
        seenLabels[norm] = true;
        return true;
      });
      return { tipo: g.tipo, chips: chips };
    });
    deduped.unshift(Object.assign({}, envio, { groups: groups }));
  }
  return deduped.filter(function (envio) {
    return envioChipCount(envio) > 0;
  });
}

function renderAtbPopHtml(c) {
  var groups = Array.isArray(c.atb) ? c.atb : [];
  if (!groups.length) return '';
  return (
    '<span class="cult-pop" role="tooltip"><span class="cult-pop-h">' +
    escHtml(c.sitioFull || c.sitio) +
    '</span>' +
    groups
      .map(function (g) {
        return (
          '<span class="cult-pop-row"><b class="atb-k is-' +
          escAttr(String(g.k).toLowerCase()) +
          '">' +
          escHtml(g.k) +
          '</b>' +
          escHtml(g.drugs) +
          '</span>'
        );
      })
      .join('') +
    '</span>'
  );
}

/**
 * Newest positive cultures; «ATB pendiente» while the antibiograma is missing.
 * Hover / focus shows the antibiogram when there is one. Click → Cultivos.
 */
function renderCultivosHtml(labs) {
  var list = Array.isArray(labs.cultivos) ? labs.cultivos : [];
  if (!list.length) return '';
  var more = (Number(labs.cultivosTotal) || 0) - list.length;
  return (
    '<div class="cultivos"><div class="cultivos-h"><span>Cultivos</span>' +
    (more > 0
      ? '<button type="button" class="card-h-count" data-dash-action="cultivos">+' + more + ' más</button>'
      : '') +
    '</div><div class="cult-grid">' +
    list
      .map(function (c) {
        var fecha = String(c.fecha || '').replace(/\/\d{4}$/, '');
        return (
          '<button type="button" class="cult' +
          (c.atbPendiente ? ' is-pending' : '') +
          '" data-dash-action="cultivos"><span class="cult-row"><b class="cult-sitio">' +
          escHtml(c.sitio) +
          '</b><span class="cult-date">' +
          escHtml(fecha + (c.preliminar ? ' · prelim.' : '')) +
          '</span></span><span class="cult-row"><i class="cult-org">' +
          escHtml(c.organismo) +
          '</i>' +
          (c.atbPendiente ? '<em>ATB pendiente</em>' : '') +
          '</span>' +
          renderAtbPopHtml(c) +
          '</button>'
        );
      })
      .join('') +
    '</div></div>'
  );
}

function labsHeaderHtml(visibleEnvios, enRango, prevFecha) {
  if (!visibleEnvios.length) return '<div class="card-h">Labs</div>';
  var meta = [];
  if (visibleEnvios.length === 1 && visibleEnvios[0].hora) {
    meta.push('corte ' + escHtml(visibleEnvios[0].hora));
  }
  if (enRango > 0) meta.push(enRango + ' en rango');
  if (prevFecha) meta.push('vs ' + escHtml(String(prevFecha).replace(/\/\d{4}$/, '')));
  return (
    '<div class="card-h"><span>Labs: fuera de rango</span>' +
    (meta.length ? '<span class="card-h-meta">' + meta.join(' &middot; ') + '</span>' : '') +
    '</div>'
  );
}

export function renderLabsHtml(model) {
  var labs = (model && model.labs) || {};
  var pending = !!labs.pending;
  var envios = Array.isArray(labs.envios) ? labs.envios : [];
  var visibleEnvios = dedupeChipsAcrossEnvios(envios.slice(-2));
  var single = visibleEnvios.length === 1;
  var enRango = Number(labs.enRangoCount) || 0;
  var enRangoHtml =
    !pending && enRango > 0
      ? '<p class="labs-en-rango">' + enRango + ' valores en rango</p>'
      : '';
  var body;
  if (pending) {
    body = '';
  } else if (visibleEnvios.length) {
    body =
      '<div class="day-draws">' +
      visibleEnvios
        .map(function (envio) {
          return renderDrawHtml(envio, !single);
        })
        .join('') +
      '</div>';
  } else if (enRango > 0) {
    body = enRangoHtml;
  } else {
    body =
      '<p class="empty-hint">Sin labs de hoy' +
      (labs.lastFecha ? ' · últimos: ' + escHtml(labs.lastFecha) : '') +
      '</p>';
  }
  return (
    '<div class="card labs-card clickable" data-dash-labs data-dash-action="labs-full">' +
    labsHeaderHtml(pending ? [] : visibleEnvios, enRango, labs.prevFecha) +
    '<div class="card-b">' +
    body +
    (pending ? '' : renderCultivosHtml(labs)) +
    '</div></div>'
  );
}

function medItemName(item) {
  if (item == null) return '';
  if (typeof item === 'string') return item;
  return String(item.name || '');
}

function medItemToken(item) {
  if (!item || typeof item === 'string') return '';
  return String(item.token || '');
}

function renderMedItemHtml(item) {
  var name = medItemName(item);
  if (!name) return '';
  var token = medItemToken(item);
  var emphasis = item && typeof item === 'object' && item.emphasis;
  return (
    '<div class="med" data-fit-item><span class="name">' +
    escHtml(name) +
    '</span>' +
    (token
      ? '<span class="meta' + (emphasis ? ' is-key' : '') + '">' + escHtml(token) + '</span>'
      : '') +
    '</div>'
  );
}

/** All meds render; dashboard-fit.mjs hides the rows that do not fit and fills «+N más». */
function renderSoapZoneHtml(zone) {
  var meds = (zone.items || []).map(renderMedItemHtml).join('');
  var letter = String(zone.letter || '');
  return (
    '<div class="soap-zone" data-fit-zone><span class="z" data-soap="' +
    escAttr(letter) +
    '">' +
    escHtml(letter) +
    (zone.subtitle ? ' <em>' + escHtml(zone.subtitle) + '</em>' : '') +
    '<small class="zone-more" data-fit-more hidden></small>' +
    '</span>' +
    meds +
    '</div>'
  );
}

/** Clinical zone order from packSoapCols, flattened: CSS columns balance the layout. */
function renderEaSoapHtml(soap) {
  return packSoapCols(soap || [])
    .flat()
    .map(renderSoapZoneHtml)
    .join('');
}

function renderMedsHtml(model) {
  var soap = model && model.ea && model.ea.soap;
  if (!soap || !soap.length) return '';
  return (
    '<div class="bento meds-band">' +
    '<button class="card clickable meds-card" type="button" data-dash-action="estadoActual">' +
    '<div class="card-h">Medicamentos</div>' +
    '<div class="card-b" data-fit><div class="soap-pack" data-fit-cols="3,4">' +
    renderEaSoapHtml(soap) +
    '</div></div></button></div>'
  );
}

function rowTime(item) {
  if (item == null) return '';
  if (typeof item === 'string') return '';
  if (item.time) return String(item.time);
  if (item.dueDate) return 'Vence';
  if (item.at) {
    var d = new Date(item.at);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    }
  }
  return '';
}

function rowText(item) {
  if (item == null) return '';
  if (typeof item === 'string') return item;
  return String(item.text || '');
}

function renderRowsHtml(list, markOverdue, fromStart) {
  return (
    '<ul class="rows" data-fit-zone' +
    (fromStart ? ' data-fit-from-start' : '') +
    '>' +
    list
      .map(function (item) {
        var overdue = !!markOverdue && isTodoOverdue(item);
        var t = rowTime(item);
        return (
          '<li data-fit-item' +
          (overdue ? ' class="is-overdue"' : '') +
          '>' +
          (overdue
            ? '<b class="due-tag">Vencido</b> '
            : t
              ? '<time>' + escHtml(t) + '</time> '
              : '') +
          escHtml(rowText(item)) +
          '</li>'
        );
      })
      .join('') +
    '</ul>'
  );
}

/**
 * Empty list → no card, the others take its space. The header shows the total;
 * when rows are cut (model cap or dashboard-fit.mjs) it shows «+N más».
 * Pendientes keep the newest rows, so they cut from the start.
 */
function renderListCardHtml(title, action, items, total, markOverdue) {
  var list = Array.isArray(items) ? items : [];
  if (!list.length) return '';
  var base = Math.max(0, (Number(total) || 0) - list.length);
  return (
    '<button class="card clickable" type="button" data-dash-action="' +
    escAttr(action) +
    '"><div class="card-h"><span>' +
    escHtml(title) +
    '</span><span class="card-h-count" data-fit-more data-fit-base="' +
    base +
    '" data-fit-idle="' +
    list.length +
    '">' +
    escHtml(base > 0 ? '+' + base + ' más' : String(list.length)) +
    '</span></div>' +
    '<div class="card-b" data-fit>' +
    renderRowsHtml(list, markOverdue, markOverdue) +
    '</div></button>'
  );
}

/**
 * @param {ReturnType<import('./dashboard-model.mjs').buildDashboardModel>} model
 * @returns {string}
 */
export function renderDashboardHtml(model) {
  var m = model || {};
  // 8.4.3 (board A1): no Eventualidades card; Medicamentos then Pendientes, both full width.
  var lists = renderListCardHtml('Pendientes', 'pendientes', m.pendientes, m.pendientesTotal, true);
  var bottom = renderMedsHtml(m) + (lists ? '<div class="bento rest">' + lists + '</div>' : '');
  return (
    '<div class="patient-dash dash">' +
    renderIdentityHtml(m) +
    renderContextHtml(m) +
    '<div class="bento vitals-labs">' +
    renderVitalsHtml(m) +
    renderLabsHtml(m) +
    '</div>' +
    (bottom ? '<div class="dash-bottom">' + bottom + '</div>' : '') +
    '</div>'
  );
}

export { renderIcAssignedHtml };
