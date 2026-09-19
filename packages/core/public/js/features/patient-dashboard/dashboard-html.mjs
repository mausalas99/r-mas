/**
 * Spanish HTML for the Paciente Resumen glance. Root class patient-dash.
 */
import { escHtml, escAttr } from '../../dom-escape.mjs';
import { isGlucometriaMarkedAltered, isVitalAltered } from '../estado-actual-ranges.mjs';
import { isTodoOverdue } from '../../todos-due.mjs';
import { serviceById, hueForService } from './interconsult-catalog.mjs';
import { packSoapCols } from './ea-glance-model.mjs';

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

function vitalCell(label, value, hi) {
  if (!value) return '';
  return (
    '<div class="vital' +
    (hi ? ' hi' : '') +
    '"><small>' +
    escHtml(label) +
    '</small><b>' +
    escHtml(value) +
    '</b></div>'
  );
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

function buildVitalsCellsHtml(v, ta, glu, flags, io) {
  return (
    vitalCell('T/A', ta, flags[0]) +
    vitalCell('FC', numText(v.fc), flags[1]) +
    vitalCell('FR', numText(v.fr), flags[2]) +
    vitalCell('Temp', numText(v.temp), flags[3]) +
    vitalCell('SatO₂', numText(v.sat) ? numText(v.sat) + '%' : '', flags[4]) +
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
  var cells = buildVitalsCellsHtml(v, ta, glu, flags, io);
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
      return '<span class="chip">' + escHtml(d) + '</span>';
    })
    .join('');
  return (
    '<div class="idrow"><div>' +
    '<div class="id-name-row">' +
    '<h1><button class="dash-name" type="button" data-dash-action="datos">' +
    escHtml(idn.nombre || 'Paciente') +
    '</button></h1>' +
    '</div>' +
    '<div class="chips" id="ic-assigned">' +
    dxHtml +
    renderIcAssignedHtml(idn.interconsultServiceIds) +
    '</div></div>' +
    '<button type="button" class="btn-med-secondary" data-dash-action="actualizar-labs">Actualizar labs</button>' +
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
    (chip && chip.delta
      ? '<span class="draw-delta">' +
        trendArrowHtml(chip.trend) +
        ' ' +
        escHtml(String(chip.delta)) +
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

/**
 * Clinical-importance fallback order for altered-lab chips that are not
 * worsening (trend !== 'down'). Earlier = more important = shown first.
 * A clinician can review/edit this list directly; keep it as the single
 * source of ordering truth — do not duplicate it elsewhere.
 */
var CLINICAL_PRIORITY_LABELS = [
  'lactato', 'lac',
  'ph',
  'pco2',
  'po2',
  'bica', 'bicarbonato', 'hco3',
  'k', 'potasio',
  'na', 'sodio',
  'glu', 'glucosa',
  'cr', 'creatinina',
  'bun',
  'hb', 'hemoglobina',
  'hto', 'hematocrito',
  'plaquetas', 'plt',
  'tp', 'inr',
];

function clinicalPriorityRank(label) {
  var norm = String(label || '').trim().toLowerCase();
  var idx = CLINICAL_PRIORITY_LABELS.indexOf(norm);
  return idx === -1 ? CLINICAL_PRIORITY_LABELS.length : idx;
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

function visibleDrawChips(envio) {
  var all = (envio.groups || []).reduce(function (acc, g) {
    return acc.concat(g.chips || []);
  }, []);
  return sortDrawChips(all).slice(0, MAX_DRAW_CELLS);
}

function renderDrawHtml(envio, totalAltered) {
  var visible = visibleDrawChips(envio);
  var cells = visible.map(renderDrawCellHtml).join('');
  var count = visible.length;
  return (
    '<button class="draw' +
    (envio.wide ? ' is-wide' : '') +
    '" type="button" data-dash-action="labs-envio" data-lab-set-id="' +
    escAttr(String(envio.id || '')) +
    '">' +
    '<div class="draw-head">' +
    '<span class="draw-head-label">LABS FUERA DE RANGO' +
    (totalAltered ? ' &middot; ' + count + ' DE ' + totalAltered : '') +
    '</span>' +
    (envio.hora
      ? '<span class="draw-head-caption">corte ' +
        escHtml(envio.hora) +
        ' &middot; el resto en Laboratorio</span>'
      : '') +
    '</div>' +
    '<div class="draw-grid">' +
    cells +
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

export function renderLabsHtml(model) {
  var labs = (model && model.labs) || {};
  var pending = !!labs.pending;
  var envios = Array.isArray(labs.envios) ? labs.envios : [];
  var visibleEnvios = dedupeChipsAcrossEnvios(envios.slice(-2));
  var totalAltered = envios.reduce(function (n, e) {
    return n + envioChipCount(e);
  }, 0);
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
          return renderDrawHtml(envio, totalAltered);
        })
        .join('') +
      '</div>' +
      enRangoHtml;
  } else if (enRango > 0) {
    body = enRangoHtml;
  } else {
    body = '<p class="empty-hint">Sin labs de hoy</p>';
  }
  return (
    '<div class="card labs-card clickable" data-dash-labs data-dash-action="labs-full">' +
    '<div class="card-h">Labs' + (visibleEnvios.length ? ': fuera de rango' : '') + '</div>' +
    '<div class="card-b">' +
    body +
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
    '<div class="med"><span class="name">' +
    escHtml(name) +
    '</span>' +
    (token
      ? '<span class="meta' + (emphasis ? ' is-key' : '') + '">' + escHtml(token) + '</span>'
      : '') +
    '</div>'
  );
}

function renderSoapZoneHtml(zone, headingClass) {
  var meds = (zone.items || []).map(renderMedItemHtml).join('');
  var letter = String(zone.letter || '');
  return (
    '<span class="' +
    (headingClass || 'z') +
    '" data-soap="' +
    escAttr(letter) +
    '">' +
    escHtml(letter) +
    (zone.subtitle ? ' <em>' + escHtml(zone.subtitle) + '</em>' : '') +
    '</span>' +
    meds
  );
}

function renderEaSoapHtml(soap) {
  return packSoapCols(soap || [])
    .map(function (col) {
      return (
        '<section>' +
        col
          .map(function (zone, i) {
            return renderSoapZoneHtml(zone, i === 0 ? 'z' : 'z2');
          })
          .join('') +
        '</section>'
      );
    })
    .join('');
}

function renderMedsHtml(model) {
  var soap = model && model.ea && model.ea.soap;
  if (!soap || !soap.length) return '';
  return (
    '<div class="bento meds-band">' +
    '<button class="card clickable meds-card" type="button" data-dash-action="estadoActual">' +
    '<div class="card-h">Medicamentos</div>' +
    '<div class="card-b"><div class="soap-pack">' +
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

function renderRowsHtml(items, emptyText, markOverdue) {
  var list = Array.isArray(items) ? items : [];
  if (!list.length) {
    return '<p class="empty-hint">' + escHtml(emptyText || 'Sin registros') + '</p>';
  }
  return (
    '<ul class="rows">' +
    list
      .map(function (item) {
        var overdue = !!markOverdue && isTodoOverdue(item);
        var t = rowTime(item);
        return (
          '<li' +
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

function renderListCardHtml(title, action, items, emptyText, markOverdue) {
  return (
    '<button class="card clickable" type="button" data-dash-action="' +
    escAttr(action) +
    '"><div class="card-h">' +
    escHtml(title) +
    '</div><div class="card-b">' +
    renderRowsHtml(items, emptyText, markOverdue) +
    '</div></button>'
  );
}

/**
 * @param {ReturnType<import('./dashboard-model.mjs').buildDashboardModel>} model
 * @returns {string}
 */
export function renderDashboardHtml(model) {
  var m = model || {};
  return (
    '<div class="patient-dash dash">' +
    renderIdentityHtml(m) +
    '<div class="bento vitals-labs">' +
    renderVitalsHtml(m) +
    renderLabsHtml(m) +
    '</div>' +
    '<div class="bento rest">' +
    renderListCardHtml('Eventualidades', 'eventualidades', m.eventualidades, 'Sin eventualidades') +
    renderListCardHtml('Pendientes', 'pendientes', m.pendientes, 'Sin pendientes', true) +
    '</div>' +
    renderMedsHtml(m) +
    '</div>'
  );
}

export { renderIcAssignedHtml };
