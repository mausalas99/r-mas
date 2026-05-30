import { sortLabHistoryChronological } from './tend-core.mjs';
import { formatCensoMedsFromReceta } from './censo-meds-format.mjs';
import { formatLabsForCensoCompact } from './censo-labs-format.mjs';
import {
  ensurePatientDiagnosticos,
  diagnosticosTextForCenso,
} from './patient-diagnosticos.mjs';
import { formatCultivosForCenso } from './censo-cultivo-format.mjs';
import { formatAccesosForCenso } from './patient-accesos.mjs';
import { buildCensoDocumentHeader, resolveCensoEquipoMembers } from './censo-header-format.mjs';

/** @param {Date} [date] */
export function formatCensusMonthLabel(date) {
  var d = date || new Date();
  var mes = d.toLocaleString('es-MX', { month: 'long' }).toUpperCase();
  return mes + ' ' + d.getFullYear();
}

/** @param {Date} [date] */
export function formatCensusDateLabel(date) {
  var d = date || new Date();
  return (
    String(d.getDate()).padStart(2, '0') +
    '/' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '/' +
    d.getFullYear()
  );
}

/** @param {string} text @param {number} maxLen */
export function truncateCensusCell(text, maxLen) {
  var s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return '—';
  if (s.length <= maxLen) return s;
  return s.slice(0, Math.max(1, maxLen - 1)) + '…';
}

function bedSortKey(patient) {
  var cuarto = parseInt(String(patient.cuarto || '').replace(/\D/g, ''), 10);
  var cama = parseInt(String(patient.cama || '').replace(/\D/g, ''), 10);
  if (Number.isFinite(cuarto)) {
    return cuarto * 1000 + (Number.isFinite(cama) ? cama : 0);
  }
  return 999999;
}

/** @param {Array<Record<string, unknown>>} patients */
export function sortPatientsForCensus(patients) {
  return (patients || []).slice().sort(function (a, b) {
    var ka = bedSortKey(a);
    var kb = bedSortKey(b);
    if (ka !== kb) return ka - kb;
    return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es');
  });
}

function splitLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map(function (l) {
      return l.trim();
    })
    .filter(Boolean);
}

function buildPatientSections(patient, ctx) {
  var pid = String(patient.id);
  var sections = [];

  var dx = diagnosticosTextForCenso(patient.diagnosticosList);
  if (dx && dx !== '—') {
    sections.push({ label: 'Diagnósticos', lines: [dx] });
  }

  var meds =
    String(patient.censoMedsText || '').trim() ||
    formatCensoMedsFromReceta(/** @type {{ items?: unknown[] }} */ (ctx.medRecetaByPatient[pid]));
  var medLines = splitLines(meds).slice(0, 2);
  if (medLines.length) {
    sections.push({ label: 'ATB / Medicamentos', lines: medLines });
  }

  var signos = formatSignosCell(patient);
  if (signos) {
    sections.push({ label: 'Signos / Estado actual', lines: [signos] });
  }

  var labLines = formatLabsForCensoCompact(ctx.labHistoryByPatient[pid] || []);
  if (labLines.length) {
    sections.push({ label: 'Laboratorios', lines: labLines });
  }

  var acc = formatAccesosCell(patient);
  if (acc && acc !== '—') {
    sections.push({ label: 'Accesos', lines: [acc] });
  }

  var cult = formatCultivosForCenso(ctx.labHistoryByPatient[pid] || []);
  if (cult && cult !== '—') {
    sections.push({ label: 'Cultivos', lines: cult.split(/\n\n+/).filter(Boolean) });
  }

  var pend = formatPendientesCell(ctx.todosByPatient[pid] || []);
  if (pend && pend !== '—') {
    sections.push({
      label: 'Pendientes',
      lines: pend.split(/\n/).map(function (p) {
        return p.trim();
      }),
    });
  }

  return sections;
}

/** @param {Record<string, unknown>} patient @param {ReturnType<typeof buildPatientSections>} sections */
function flattenRowForCompactPdf(patient, sections) {
  var pick = function (label) {
    var sec = sections.find(function (s) {
      return s.label === label;
    });
    return sec ? sec.lines.join('\n') : '';
  };
  return {
    dx: pick('Diagnósticos'),
    meds: pick('ATB / Medicamentos'),
    signos: pick('Signos / Estado actual'),
    labs: pick('Laboratorios'),
    accesos: pick('Accesos'),
    cultivos: pick('Cultivos'),
    pendientes: pick('Pendientes'),
  };
}

function formatAccesosCell(patient) {
  return formatAccesosForCenso(patient);
}

function formatSignosCell(patient) {
  var mon = patient.monitoreo;
  var tg = mon && mon.textoGuardado;
  var texto = tg && tg.texto != null ? String(tg.texto) : '';
  return texto.replace(/\s+/g, ' ').trim();
}

function formatPendientesCell(todos) {
  var open = (todos || []).filter(function (t) {
    return t && !t.completed && String(t.text || '').trim();
  });
  if (!open.length) return '';
  return open
    .slice(0, 6)
    .map(function (t) {
      return String(t.text).trim();
    })
    .join('\n');
}

/** Cuarto y cama en líneas separadas para columna vertical del PDF. */
export function formatCamaCellForCenso(patient) {
  var cuarto = String(patient.cuarto || '').trim();
  var cama = String(patient.cama || '').trim();
  if (!cuarto && !cama) return '—';
  if (cuarto && cama) return cuarto + '\n' + cama;
  return cuarto || cama;
}

/** Registro y edad en líneas separadas (sin sexo) para PDF / vista previa. */
export function formatPacienteMetaForCenso(patient) {
  var lines = [];
  if (patient.registro) lines.push(String(patient.registro).trim());
  if (patient.edad) lines.push(String(patient.edad).trim() + ' años');
  return lines.join('\n');
}

/**
 * @param {{
 *   settings: Record<string, unknown>,
 *   patients: Array<Record<string, unknown>>,
 *   includeArchived?: boolean,
 *   labHistoryByPatient: Record<string, unknown[]>,
 *   medRecetaByPatient: Record<string, unknown>,
 *   todosByPatient: Record<string, Array<{ text?: string, completed?: boolean }>>,
 *   now?: Date,
 * }} opts
 */
export function buildCensusPayload(opts) {
  var settings = opts.settings || {};
  var now = opts.now || new Date();
  var includeArchived = !!opts.includeArchived;
  var list = (opts.patients || []).filter(function (p) {
    return p && (includeArchived || !p.archived);
  });
  var sorted = sortPatientsForCensus(list);
  var servicio = String(settings.defaultServicio || sorted[0]?.servicio || 'GUARDIA').trim();
  var docHead = buildCensoDocumentHeader(settings);
  var equipo = resolveCensoEquipoMembers(settings);
  var header = {
    mes: formatCensusMonthLabel(now),
    fecha: formatCensusDateLabel(now),
    titleLine: docHead.titleLine,
    equipoLine: docHead.equipoLine,
    sala: docHead.sala,
    torre: docHead.torre,
    profesor: equipo.maestro,
    doctor: String(settings.doctorName || '').trim(),
    r2: equipo.r2,
    r1: equipo.r1a,
    r1a: equipo.r1a,
    r1b: equipo.r1b,
    maestro: equipo.maestro,
    servicio: servicio,
  };
  var ctx = {
    medRecetaByPatient: opts.medRecetaByPatient,
    labHistoryByPatient: opts.labHistoryByPatient,
    todosByPatient: opts.todosByPatient,
  };

  var rows = sorted.map(function (patient, idx) {
    ensurePatientDiagnosticos(patient);
    var cama = formatCamaCellForCenso(patient);
    var sections = buildPatientSections(patient, ctx);
    var flat = flattenRowForCompactPdf(patient, sections);
    return {
      num: String(idx + 1),
      cama: cama,
      pacienteNombre: String(patient.nombre || '').trim() || '—',
      pacienteMeta: formatPacienteMetaForCenso(patient),
      sections: sections,
      dx: flat.dx,
      meds: flat.meds,
      signos: flat.signos,
      labs: flat.labs,
      accesos: flat.accesos,
      cultivos: flat.cultivos,
      pendientes: flat.pendientes,
    };
  });
  return { header: header, rows: rows, servicio: servicio };
}
