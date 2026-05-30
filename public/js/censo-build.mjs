import { sortLabHistoryChronological } from './tend-core.mjs';
import { formatCensoMedsFromReceta } from './censo-meds-format.mjs';
import { formatLabsForCensoCompact } from './censo-labs-format.mjs';
import { formatAccesoFechaDisplay } from './patient-date-fields.mjs';
import { resolveCensoFimiLabel } from './censo-header-format.mjs';
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

/** Quita ceros a la izquierda; cama 0 no existe (vacío). */
export function normalizeCensoCamaNumber(cama) {
  var s = String(cama ?? '').trim();
  if (!s) return '';
  if (/^\d+$/.test(s)) {
    var n = parseInt(s, 10);
    if (!n) return '';
    return String(n);
  }
  return s;
}

/**
 * @param {string} text
 * @returns {{ cuarto: string, cama: string }}
 */
export function parseCamaCellForCenso(text) {
  var raw = String(text || '').trim();
  if (!raw || raw === '—') return { cuarto: '', cama: '' };
  var lines = raw
    .replace(/\r/g, '')
    .split('\n')
    .map(function (l) {
      return l.trim();
    })
    .filter(Boolean);
  if (lines.length >= 2) {
    return { cuarto: lines[0], cama: normalizeCensoCamaNumber(lines[1]) };
  }
  var one = lines[0] || '';
  var dash = one.indexOf('-');
  if (dash >= 0) {
    return {
      cuarto: one.slice(0, dash).trim(),
      cama: normalizeCensoCamaNumber(one.slice(dash + 1)),
    };
  }
  var slash = one.split(/\//).map(function (l) {
    return l.trim();
  });
  if (slash.length >= 2) {
    return { cuarto: slash[0], cama: normalizeCensoCamaNumber(slash[1]) };
  }
  return { cuarto: one, cama: '' };
}

/**
 * Etiqueta única para columna Cama (211-1 o solo cuarto).
 * @param {{ cuarto?: string, cama?: string }} parts
 */
export function formatCamaCellLabel(parts) {
  var cuarto = String(parts.cuarto || '').trim();
  var cama = String(parts.cama || '').trim();
  if (!cuarto && !cama) return '—';
  if (cuarto && cama) return cuarto + '-' + cama;
  return cuarto || cama;
}

export function formatCamaCellForCenso(patient) {
  var cuarto = String(patient.cuarto || '').trim();
  var cama = normalizeCensoCamaNumber(patient.cama);
  return formatCamaCellLabel({ cuarto: cuarto, cama: cama });
}

/** Iniciales del nombre del paciente para columna Paciente del censo (no aplica al equipo). */
export function abbreviatePatientNameToInitials(name) {
  var s = String(name || '').trim();
  if (!s || s === '—') return '—';
  var parts = [];
  s.split(/\s+/)
    .map(function (w) {
      return w.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '');
    })
    .filter(Boolean)
    .forEach(function (word) {
      parts.push(word.charAt(0).toUpperCase());
    });
  if (!parts.length) return '—';
  return parts.join('.') + '.';
}

/**
 * Registro, edad, FIUX y FIMI (sin sexo) para PDF / vista previa.
 * @param {Record<string, unknown>} patient
 * @param {Record<string, unknown>} [settings]
 */
export function formatPacienteMetaForCenso(patient, settings) {
  var lines = [];
  if (patient.registro) lines.push(String(patient.registro).trim());
  if (patient.edad) lines.push(String(patient.edad).trim() + ' años');
  var fiux = formatAccesoFechaDisplay(patient.fiuxFecha);
  if (fiux) lines.push('FIUX: ' + fiux);
  var fimi = formatAccesoFechaDisplay(patient.fimiFecha);
  if (fimi) {
    var fimiLabel = resolveCensoFimiLabel(settings || {});
    lines.push(fimiLabel + ': ' + fimi);
  }
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
      pacienteNombre: abbreviatePatientNameToInitials(patient.nombre),
      pacienteMeta: formatPacienteMetaForCenso(patient, settings),
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
