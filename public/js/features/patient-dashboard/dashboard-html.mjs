/**
 * Spanish HTML for the Paciente Resumen glance. Root class patient-dash.
 */
import { escHtml, escAttr } from '../../dom-escape.mjs';
import { isGlucometriaMarkedAltered, isVitalAltered } from '../estado-actual-ranges.mjs';
import { serviceById, hueForService } from './interconsult-catalog.mjs';
import { packSoapCols } from './ea-glance-model.mjs';
import { formatAlteredChip } from './labs-glance-model.mjs';

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

function buildVitalsCellsHtml(v, ta, glu, gluLast, io) {
  return (
    vitalCell('T/A', ta, isVitalAltered('tas', v.tas) || isVitalAltered('tad', v.tad)) +
    vitalCell('FC', numText(v.fc), isVitalAltered('fc', v.fc)) +
    vitalCell('FR', numText(v.fr), isVitalAltered('fr', v.fr)) +
    vitalCell('Temp', numText(v.temp), isVitalAltered('temp', v.temp)) +
    vitalCell('SatO₂', numText(v.sat) ? numText(v.sat) + '%' : '', isVitalAltered('sat', v.sat)) +
    vitalCell(
      'Glu',
      glu,
      isGlucometriaMarkedAltered(
        gluLast && typeof gluLast === 'object' ? gluLast : { value: glu },
      ),
    ) +
    vitalCell('I/O', io, false)
  );
}

function renderVitalsHtml(model) {
  var r = readingsFromModel(model);
  var v = r.vitals;
  var tas = numText(v.tas);
  var tad = numText(v.tad);
  var ta = tas || tad ? (tas || '—') + '/' + (tad || '—') : '';
  var gluList = r.glucometrias;
  var gluLast = gluList.length ? gluList[gluList.length - 1] : null;
  var glu = lastGlu(gluList);
  var io = ioBalance(r.io);
  var cells = buildVitalsCellsHtml(v, ta, glu, gluLast, io);
  var hasCoreVitals = !!(ta || numText(v.fc) || numText(v.fr) || numText(v.temp) || numText(v.sat) || glu);
  var emptyClass = hasCoreVitals ? '' : ' vitals-card--empty';
  return (
    '<button class="card clickable vitals-card' +
    emptyClass +
    '" type="button" data-dash-action="estadoActual">' +
    '<div class="card-h">Signos vitales</div>' +
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
    (dxHtml ? '<div class="chips">' + dxHtml + '</div>' : '') +
    '<div class="ic-mod"><small>Servicios interconsultantes</small>' +
    '<div class="chips" id="ic-assigned">' +
    renderIcAssignedHtml(idn.interconsultServiceIds) +
    '</div></div></div>' +
    '<button type="button" class="btn-med-secondary" data-dash-action="actualizar-labs">Actualizar labs</button>' +
    '</div>'
  );
}

function renderDrawHtml(envio) {
  var groups = (envio.groups || [])
    .map(function (g) {
      var chips = (g.chips || [])
        .map(function (c) {
          return '<span class="abn">' + escHtml(formatAlteredChip(c)) + '</span>';
        })
        .join('');
      if (!chips) return '';
      return (
        '<div class="draw-g"><span class="tipo">' +
        escHtml(g.tipo || '') +
        '</span><div class="vals">' +
        chips +
        '</div></div>'
      );
    })
    .join('');
  return (
    '<button class="draw' +
    (envio.wide ? ' is-wide' : '') +
    '" type="button" data-dash-action="labs-envio" data-lab-set-id="' +
    escAttr(String(envio.id || '')) +
    '"><time>' +
    escHtml(envio.hora || '') +
    '</time><div class="draw-groups">' +
    groups +
    '</div></button>'
  );
}

export function renderLabsHtml(model) {
  var pending = !!(model && model.labs && model.labs.pending);
  var envios = model && model.labs && Array.isArray(model.labs.envios) ? model.labs.envios : [];
  var visibleEnvios = envios.slice(-2);
  var body = pending
    ? ''
    : visibleEnvios.length
      ? '<div class="day-draws">' + visibleEnvios.map(renderDrawHtml).join('') + '</div>'
      : '<p class="empty-hint">Sin labs de hoy</p>';
  return (
    '<div class="card labs-card clickable" data-dash-labs data-dash-action="labs-full">' +
    '<div class="card-h">Labs: Solo alterados</div>' +
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

function renderRowsHtml(items, emptyText) {
  var list = Array.isArray(items) ? items : [];
  if (!list.length) {
    return '<p class="empty-hint">' + escHtml(emptyText || 'Sin registros') + '</p>';
  }
  return (
    '<ul class="rows">' +
    list
      .map(function (item) {
        var t = rowTime(item);
        return (
          '<li>' +
          (t ? '<time>' + escHtml(t) + '</time> ' : '') +
          escHtml(rowText(item)) +
          '</li>'
        );
      })
      .join('') +
    '</ul>'
  );
}

function renderListCardHtml(title, action, items, emptyText) {
  return (
    '<button class="card clickable" type="button" data-dash-action="' +
    escAttr(action) +
    '"><div class="card-h">' +
    escHtml(title) +
    '</div><div class="card-b">' +
    renderRowsHtml(items, emptyText) +
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
    renderListCardHtml('Pendientes', 'pendientes', m.pendientes, 'Sin pendientes') +
    '</div>' +
    renderMedsHtml(m) +
    '</div>'
  );
}

export { renderIcAssignedHtml };
