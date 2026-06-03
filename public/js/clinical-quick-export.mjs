import { isModeSala } from './mode-features.mjs';
import { resolveQuickOutputAction } from './quick-output.mjs';
import { guardMobileDocExport } from './document-export-client.mjs';
import { normalizeQuickOutputFormat } from './features/profile.mjs';
import { generateWord, generateIndicaciones } from './features/notes-indicaciones.mjs';
import { generateListado } from './features/expediente.mjs';
import { incrementPendingJobs, decrementPendingJobs } from './features/platform/offline.mjs';
import { formatDateSlug, downloadTextPayload } from './features/platform/shared.mjs';
import { patients, notes, indicaciones, listadoProblemas } from './app-state.mjs';

const quickExportRt = {
  getActiveId() {
    return null;
  },
  getActiveInner() {
    return 'todo';
  },
  getSettings() {
    return {};
  },
  showToast() {},
};

export function registerClinicalQuickExportRuntime(ctx) {
  if (!ctx || typeof ctx !== 'object') return;
  Object.assign(quickExportRt, ctx);
}

export function escHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function toLines(value) {
  if (Array.isArray(value)) {
    return value.map(function (v) {
      return String(v || '').trim();
    }).filter(Boolean);
  }
  return String(value || '')
    .split('\n')
    .map(function (v) {
      return v.trim();
    })
    .filter(Boolean);
}

export function slugFilePart(value, fallback) {
  var base = String(value || '').trim().toLowerCase();
  var slug = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || fallback;
}

export function getCurrentPatientClinicalData() {
  var patient = patients.find(function (p) {
    return p.id === quickExportRt.getActiveId();
  });
  if (!patient) return null;
  return {
    patient: patient,
    note: notes[quickExportRt.getActiveId()] || {},
    indicacion: indicaciones[quickExportRt.getActiveId()] || {},
  };
}

export function buildClinicalTextExport(bundle) {
  var patient = bundle.patient || {};
  var note = bundle.note || {};
  var ind = bundle.indicacion || {};
  var mode = bundle.mode || 'both';
  var blocks = [];
  blocks.push('R+ - SALIDA CLINICA');
  blocks.push('PACIENTE: ' + (patient.nombre || ''));
  blocks.push('REGISTRO: ' + (patient.registro || ''));
  blocks.push('SERVICIO: ' + (patient.servicio || ''));
  blocks.push('CUARTO/CAMA: ' + (patient.cuarto || '') + '/' + (patient.cama || ''));
  blocks.push('');
  if (mode !== 'indica') {
    blocks.push('== NOTA DE EVOLUCION ==');
    blocks.push('FECHA/HORA: ' + (note.fecha || '') + ' ' + (note.hora || ''));
    blocks.push('DIAGNOSTICOS:');
    toLines(note.diagnosticos || []).forEach(function (v, idx) {
      blocks.push(idx + 1 + '. ' + v);
    });
    if (!toLines(note.diagnosticos || []).length) blocks.push('(sin contenido)');
  }
  function pushBlock(label, value) {
    blocks.push(label + ':');
    var lines = toLines(value);
    if (!lines.length) blocks.push('(sin contenido)');
    lines.forEach(function (l) {
      blocks.push('- ' + l);
    });
  }
  if (mode !== 'indica') {
    pushBlock('INTERROGATORIO', note.interrogatorio);
    pushBlock('EXPLORACION FISICA', note.exploracion);
    pushBlock('ESTUDIOS', note.estudios);
    pushBlock('ANALISIS', note.analisis);
    pushBlock('PLAN', note.plan);
    blocks.push(
      'SIGNOS VITALES: TA ' +
        (note.ta || '-') +
        ' | FR ' +
        (note.fr || '-') +
        ' | FC ' +
        (note.fc || '-') +
        ' | TEMP ' +
        (note.temp || '-') +
        ' | PESO ' +
        (note.peso || '-')
    );
    pushBlock('TRATAMIENTO E INDICACIONES', note.tratamiento || []);
    blocks.push('MEDICO TRATANTE: ' + (note.medico || ''));
    blocks.push('PROFESOR RESPONSABLE: ' + (note.profesor || ''));
  }
  if (mode === 'both') blocks.push('');
  if (mode !== 'note') {
    blocks.push('== INDICACIONES ==');
    blocks.push('FECHA/HORA: ' + (ind.fecha || '') + ' ' + (ind.hora || ''));
    pushBlock('MEDICOS', ind.medicos);
    pushBlock('DIETA', ind.dieta);
    pushBlock('CUIDADOS', ind.cuidados);
    pushBlock('ESTUDIOS', ind.estudios);
    pushBlock('MEDICAMENTOS', ind.medicamentos);
    pushBlock('INTERCONSULTAS', ind.interconsultas);
    var otros = Array.isArray(ind.otros) ? ind.otros : [];
    if (otros.length) {
      blocks.push('OTROS:');
      otros.forEach(function (item, idx) {
        if (!item || typeof item !== 'object') return;
        blocks.push(idx + 1 + '. ' + (item.titulo || 'Seccion sin titulo'));
        toLines(item.contenido || '').forEach(function (line) {
          blocks.push('   - ' + line);
        });
      });
    }
  }
  return blocks.join('\n');
}

export function buildClinicalHtmlExport(bundle) {
  var patient = bundle.patient || {};
  var note = bundle.note || {};
  var ind = bundle.indicacion || {};
  var mode = bundle.mode || 'both';
  function renderList(values) {
    var lines = toLines(values);
    if (!lines.length) return '<p><em>Sin contenido</em></p>';
    return (
      '<ul>' +
      lines
        .map(function (line) {
          return '<li>' + escHtml(line) + '</li>';
        })
        .join('') +
      '</ul>'
    );
  }
  function renderOtherSections() {
    var otros = Array.isArray(ind.otros) ? ind.otros : [];
    if (!otros.length) return '<p><em>Sin secciones adicionales</em></p>';
    return otros
      .filter(function (item) {
        return item && typeof item === 'object';
      })
      .map(function (item) {
        return (
          '<article><h4>' +
          escHtml(item.titulo || 'Seccion sin titulo') +
          '</h4>' +
          renderList(item.contenido || '') +
          '</article>'
        );
      })
      .join('');
  }
  var noteHtml =
    '<section><h2>Nota de evolucion</h2>' +
    '<p><strong>Fecha/Hora:</strong> ' +
    escHtml(note.fecha || '') +
    ' ' +
    escHtml(note.hora || '') +
    '</p>' +
    '<h3>Diagnosticos</h3>' +
    renderList(note.diagnosticos || []) +
    '<h3>Interrogatorio</h3>' +
    renderList(note.interrogatorio) +
    '<h3>Exploracion fisica</h3>' +
    renderList(note.exploracion) +
    '<h3>Estudios</h3>' +
    renderList(note.estudios) +
    '<h3>Analisis</h3>' +
    renderList(note.analisis) +
    '<h3>Plan</h3>' +
    renderList(note.plan) +
    '<h3>Signos vitales</h3><p>TA ' +
    escHtml(note.ta || '-') +
    ' | FR ' +
    escHtml(note.fr || '-') +
    ' | FC ' +
    escHtml(note.fc || '-') +
    ' | TEMP ' +
    escHtml(note.temp || '-') +
    ' | PESO ' +
    escHtml(note.peso || '-') +
    '</p>' +
    '<h3>Tratamiento e indicaciones medicas</h3>' +
    renderList(note.tratamiento || []) +
    '</section>';
  var indicaHtml =
    '<section><h2>Indicaciones</h2>' +
    '<p><strong>Fecha/Hora:</strong> ' +
    escHtml(ind.fecha || '') +
    ' ' +
    escHtml(ind.hora || '') +
    '</p>' +
    '<h3>Medicos</h3>' +
    renderList(ind.medicos) +
    '<h3>Dieta</h3>' +
    renderList(ind.dieta) +
    '<h3>Cuidados</h3>' +
    renderList(ind.cuidados) +
    '<h3>Estudios</h3>' +
    renderList(ind.estudios) +
    '<h3>Medicamentos</h3>' +
    renderList(ind.medicamentos) +
    '<h3>Interconsultas</h3>' +
    renderList(ind.interconsultas) +
    '<h3>Otros</h3>' +
    renderOtherSections() +
    '</section>';
  return (
    '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:;">' +
    '<title>R+ salida clinica</title>' +
    '<style>body{font-family:Arial,sans-serif;line-height:1.45;margin:24px;color:#111}h1,h2{margin-bottom:8px}section{margin:20px 0;padding-top:8px;border-top:1px solid #ddd}h3{margin:14px 0 6px}ul{margin:0 0 8px 20px}p{margin:0 0 8px}</style>' +
    '</head><body>' +
    '<h1>R+ - Salida clinica</h1>' +
    '<p><strong>Paciente:</strong> ' +
    escHtml(patient.nombre || '') +
    ' | <strong>Registro:</strong> ' +
    escHtml(patient.registro || '') +
    '</p>' +
    '<p><strong>Servicio:</strong> ' +
    escHtml(patient.servicio || '') +
    ' | <strong>Cuarto/Cama:</strong> ' +
    escHtml(patient.cuarto || '') +
    '/' +
    escHtml(patient.cama || '') +
    '</p>' +
    (mode !== 'indica' ? noteHtml : '') +
    (mode !== 'note' ? indicaHtml : '') +
    '</body></html>'
  );
}

export function exportCurrentPatientAsText() {
  var bundle = getCurrentPatientClinicalData();
  if (!bundle) return;
  bundle.mode = quickExportRt.getActiveInner() === 'indica' ? 'indica' : 'note';
  var fileName =
    'R-plus-' +
    slugFilePart(bundle.patient.nombre, 'paciente') +
    '-clinico-' +
    formatDateSlug(new Date()) +
    '.txt';
  incrementPendingJobs();
  try {
    downloadTextPayload(buildClinicalTextExport(bundle), fileName, 'text/plain');
    quickExportRt.showToast('Salida .txt descargada', 'success');
  } catch (e) {
    quickExportRt.showToast(
      'No se pudo exportar: ' + (e && e.message ? e.message : 'error'),
      'error'
    );
  } finally {
    decrementPendingJobs();
  }
}

export function exportCurrentPatientAsHtml() {
  var bundle = getCurrentPatientClinicalData();
  if (!bundle) return;
  bundle.mode = quickExportRt.getActiveInner() === 'indica' ? 'indica' : 'note';
  var fileName =
    'R-plus-' +
    slugFilePart(bundle.patient.nombre, 'paciente') +
    '-clinico-' +
    formatDateSlug(new Date()) +
    '.html';
  incrementPendingJobs();
  try {
    downloadTextPayload(buildClinicalHtmlExport(bundle), fileName, 'text/html');
    quickExportRt.showToast('Salida .html descargada', 'success');
  } catch (e) {
    quickExportRt.showToast(
      'No se pudo exportar: ' + (e && e.message ? e.message : 'error'),
      'error'
    );
  } finally {
    decrementPendingJobs();
  }
}

export function quickExportCurrentPatient() {
  if (guardMobileDocExport()) return;
  if (!quickExportRt.getActiveId()) {
    quickExportRt.showToast('Selecciona un paciente primero', 'error');
    return;
  }
  var format = normalizeQuickOutputFormat(quickExportRt.getSettings().quickOutputFormat);
  var action = resolveQuickOutputAction({
    format: format,
    appMode: isModeSala(quickExportRt.getSettings()) ? 'sala' : 'interconsulta',
    activeInner: quickExportRt.getActiveInner(),
    listado: listadoProblemas[quickExportRt.getActiveId()] || null,
  });
  switch (action.kind) {
    case 'html':
      exportCurrentPatientAsHtml();
      return;
    case 'txt':
      exportCurrentPatientAsText();
      return;
    case 'listado':
      generateListado();
      return;
    case 'listado_empty':
      quickExportRt.showToast(action.message, 'error');
      return;
    case 'indicaciones':
      generateIndicaciones();
      return;
    case 'nota':
    default:
      generateWord();
      return;
  }
}
