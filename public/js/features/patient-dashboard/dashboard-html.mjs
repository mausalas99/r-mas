/**
 * Spanish HTML for the Paciente Resumen glance. Root class patient-dash.
 */
import { escHtml, escAttr } from '../../dom-escape.mjs';
import { serviceById, hueForService } from './interconsult-catalog.mjs';

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
    alteredAt: snap.alteredAt && typeof snap.alteredAt === 'object' ? snap.alteredAt : {},
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

function renderVitalsHtml(model) {
  var r = readingsFromModel(model);
  var v = r.vitals;
  var tas = numText(v.tas);
  var tad = numText(v.tad);
  var ta = tas || tad ? (tas || '—') + '/' + (tad || '—') : '';
  var glu = lastGlu(r.glucometrias);
  var io = ioBalance(r.io);
  var cells =
    vitalCell('T/A', ta, !!(r.alteredAt.tas || r.alteredAt.tad)) +
    vitalCell('FC', numText(v.fc), !!r.alteredAt.fc) +
    vitalCell('FR', numText(v.fr), !!r.alteredAt.fr) +
    vitalCell('Temp', numText(v.temp), !!r.alteredAt.temp) +
    vitalCell('SatO₂', numText(v.sat) ? numText(v.sat) + '%' : '', !!r.alteredAt.sat) +
    vitalCell('Glu', glu, false) +
    vitalCell('I/O', io, false);
  return (
    '<button class="card clickable vitals-card" type="button" data-dash-action="estadoActual">' +
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
    '<h1><button class="chip" type="button" data-dash-action="datos">' +
    escHtml(idn.nombre || 'Paciente') +
    '</button></h1>' +
    (idn.meta ? '<div class="meta">' + escHtml(idn.meta) + '</div>' : '') +
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
          return '<span class="abn">' + escHtml(c.raw || c.value || '') + '</span>';
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

function renderLabsHtml(model) {
  var envios = model && model.labs && Array.isArray(model.labs.envios) ? model.labs.envios : [];
  var body = envios.length
    ? '<div class="day-draws">' + envios.map(renderDrawHtml).join('') + '</div>'
    : '<p class="meta">Sin labs de hoy</p>';
  return (
    '<div class="card labs-card">' +
    '<div class="card-h">Labs de hoy · solo alteraciones ' +
    '<button class="link" type="button" data-dash-action="labs-full">Reportes completos</button></div>' +
    '<div class="card-b">' +
    body +
    '</div></div>'
  );
}

function renderEaKpisHtml(kpis) {
  return (kpis || [])
    .slice(0, 4)
    .map(function (k) {
      return (
        '<div><small>' +
        escHtml(k.label || '') +
        '</small><b>' +
        escHtml(k.value || '') +
        '</b></div>'
      );
    })
    .join('');
}

function renderEaSoapHtml(soap) {
  return (soap || [])
    .map(function (bucket) {
      var meds = (bucket.items || [])
        .map(function (item) {
          return '<span class="med">' + escHtml(item) + '</span>';
        })
        .join('');
      return (
        '<div><small>' +
        escHtml(bucket.label || '') +
        '</small><div class="meds">' +
        meds +
        '</div></div>'
      );
    })
    .join('');
}

function renderEaHtml(model) {
  var ea = (model && model.ea) || { kpis: [], soap: [] };
  return (
    '<button class="card clickable" type="button" data-dash-action="estadoActual">' +
    '<div class="card-h">Estado clínico <span class="link">Abrir EA</span></div>' +
    '<div class="card-b"><div class="ea-glance">' +
    '<div class="ea-kpis">' +
    (renderEaKpisHtml(ea.kpis) || '<p class="meta">Sin plan de cuidado</p>') +
    '</div><div class="ea-soap">' +
    renderEaSoapHtml(ea.soap) +
    '</div></div></div></button>'
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

function renderRowsHtml(items) {
  var list = Array.isArray(items) ? items : [];
  if (!list.length) return '<p class="meta">Sin registros</p>';
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

function renderListCardHtml(title, link, action, items) {
  return (
    '<button class="card clickable" type="button" data-dash-action="' +
    escAttr(action) +
    '"><div class="card-h">' +
    escHtml(title) +
    ' <span class="link">' +
    escHtml(link) +
    '</span></div><div class="card-b">' +
    renderRowsHtml(items) +
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
    '<div class="bento">' +
    renderVitalsHtml(m) +
    renderLabsHtml(m) +
    '</div>' +
    '<div class="bento rest">' +
    renderEaHtml(m) +
    renderListCardHtml('Eventualidades', 'Ver todas', 'eventualidades', m.eventualidades) +
    renderListCardHtml('Pendientes', 'Ver pendientes', 'pendientes', m.pendientes) +
    '</div></div>'
  );
}

export { renderIcAssignedHtml };
