/**
 * Pure helpers for paste-anywhere / Procesar inteligente.
 * Match SOME text to census by registro, then by nombre; decide confirm once.
 */
import { significantNameTokens, scoreNombreAgainstPatient, matchPatientsByNombre } from '../patient-name-match.mjs';
import {
  buildBulkLabPreview,
  shouldShowBulkLabPreview,
  mixedExpedienteWarning,
} from '../lab-bulk-paste.mjs';
import { looksLikeSomeIndicacionesPaste } from '../med-receta-parse.mjs';
import { looksLikeIcSugerenciasPaste } from '../ic-sugerencias-parse.mjs';

export { significantNameTokens, scoreNombreAgainstPatient, matchPatientsByNombre };

/**
 * @param {string} textoBruto
 * @returns {string}
 */
export function extractSomeNombreFromReport(textoBruto) {
  var m = String(textoBruto || '').match(/Nombre:\s*([^\n\r]+)/i);
  if (!m) return '';
  var raw = m[1]
    .split(/\t+/)[0]
    .split(/\s{2,}/)[0]
    .trim();
  return raw.split(/\s+(?:Fecha|Sexo|Edad|Ubicaci)/i)[0].trim();
}

/**
 * @param {string} registro
 * @param {{ id: string, registro?: string }[]} patients
 * @returns {object|null}
 */
export function matchPatientByRegistro(registro, patients) {
  var r = String(registro || '').trim();
  if (!r) return null;
  return (
    (patients || []).find(function (p) {
      return p && String(p.registro || '').trim() === r;
    }) || null
  );
}

/**
 * Enrich a no-patient bulk block with nombre matches from census.
 * @param {object} block
 * @param {object[]} patients
 * @returns {{ candidates: object[], best: object|null, ambiguous: boolean }}
 */
export function enrichBlockWithNombreMatches(block, patients) {
  var nombre =
    (block && block.reports && block.reports[0] && block.reports[0].nombre) ||
    extractSomeNombreFromReport(
      block && block.reports && block.reports[0] && block.reports[0].reportText
        ? block.reports[0].reportText
        : ''
    );
  if (!nombre) return { candidates: [], best: null, ambiguous: false };
  var ranked = matchPatientsByNombre(nombre, patients);
  var candidates = ranked.map(function (r) {
    return r.patient;
  });
  if (!candidates.length) return { candidates: [], best: null, ambiguous: false };
  if (candidates.length === 1) {
    return { candidates: candidates, best: candidates[0], ambiguous: false };
  }
  var top = ranked[0].score;
  var second = ranked[1].score;
  if (top - second >= 8) {
    return { candidates: candidates, best: candidates[0], ambiguous: false };
  }
  return { candidates: candidates, best: null, ambiguous: true };
}

/**
 * Apply a chosen census patient onto a bulk preview block (local only).
 * @param {object} block
 * @param {{ id: string, nombre?: string, registro?: string }} patient
 * @returns {object}
 */
export function assignPatientToBulkBlock(block, patient) {
  if (!block || !patient) return block;
  var next = Object.assign({}, block, {
    patient: patient,
    patientName: patient.nombre || 'Sin nombre',
    primaryExpediente: String(patient.registro || block.primaryExpediente || '').trim(),
    status: 'ok',
    canProcess: !!(block.okReportCount > 0),
  });
  return next;
}

/**
 * @typedef {'not-some'|'empty'|'ready'|'confirm-single'|'ambiguous'|'preview'|'indicas'|'ic-sugerencias'|'mixed-expediente'} SmartPasteKind
 */

/**
 * @param {string} text
 * @returns {boolean}
 */
export function looksLikeIndicasPasteCandidate(text) {
  return looksLikeSomeIndicacionesPaste(text);
}

/**
 * Which app tab paste-anywhere should jump to for a given plan kind.
 * @param {SmartPasteKind} kind
 * @returns {'lab'|'med'|null}
 */
export function appTabForSmartPasteKind(kind) {
  if (kind === 'indicas') return 'med';
  return null;
}

/**
 * Plan routing for paste-anywhere. Pure — no DOM.
 * @param {string} text
 * @param {{
 *   patients: object[],
 *   findPatientByRegistro?: (reg: string) => object|null,
 *   quickLabOutput?: boolean,
 * }} opts
 */
export function planSmartPaste(text, opts) {
  var sourceText = String(text || '').trim();
  var patients = (opts && opts.patients) || [];
  var findByReg = resolveFindByRegistro(opts, patients);

  if (!sourceText) return emptyPlan('empty', 'Pega un reporte SOME primero');

  if (looksLikeIndicasPasteCandidate(sourceText)) {
    return Object.assign(emptyPlan('indicas', ''), { sourceText: sourceText });
  }
  if (looksLikeIcSugerenciasPaste(sourceText)) {
    return Object.assign(emptyPlan('ic-sugerencias', ''), { sourceText: sourceText });
  }

  var blocks = buildBulkLabPreview(sourceText, { findPatientByRegistro: findByReg });
  var mixedWarning = mixedExpedienteWarning(blocks);
  if (mixedWarning) {
    return Object.assign(emptyPlan('mixed-expediente', mixedWarning), {
      sourceText: sourceText,
      blocks: blocks,
    });
  }
  var totalOk = sumOkReports(blocks);
  if (!totalOk) {
    return Object.assign(emptyPlan('not-some', 'No parece un reporte SOME (copia desde «Expediente:»)'), {
      sourceText: sourceText,
      blocks: blocks,
    });
  }

  var resolved = resolveBlocksWithNombre(blocks, patients);
  var processable = filterProcessableBlocks(resolved.blocks);
  var needsPreview = shouldShowBulkLabPreview(resolved.blocks, totalOk, {
    quickLabOutput: !!(opts && opts.quickLabOutput),
  });

  return decideSmartPastePlan({
    sourceText: sourceText,
    resolved: resolved,
    processable: processable,
    totalOk: totalOk,
    needsPreview: needsPreview,
  });
}

function resolveFindByRegistro(opts, patients) {
  if (opts && typeof opts.findPatientByRegistro === 'function') return opts.findPatientByRegistro;
  return function (reg) {
    return matchPatientByRegistro(reg, patients);
  };
}

function filterProcessableBlocks(blocks) {
  return (blocks || []).filter(function (b) {
    return b && b.canProcess && b.patient && b.okReportCount > 0;
  });
}

function processablePatients(processable) {
  return processable
    .map(function (b) {
      return b.patient;
    })
    .filter(Boolean);
}

function planResult(kind, sourceText, blocks, totalOk, primary, candidates, needsPreview, message) {
  return {
    kind: kind,
    sourceText: sourceText,
    blocks: blocks,
    totalOkReports: totalOk,
    primaryPatient: primary || null,
    candidates: candidates || [],
    needsPreview: !!needsPreview,
    message: message || '',
  };
}

function decideSmartPastePlan(ctx) {
  var sourceText = ctx.sourceText;
  var blocks = ctx.resolved.blocks;
  var totalOk = ctx.totalOk;
  var processable = ctx.processable;
  var needsPreview = ctx.needsPreview;
  var amb = ctx.resolved.ambiguousCandidates;
  var pending = ctx.resolved.pendingConfirm;

  if (amb && amb.length) {
    return planResult('ambiguous', sourceText, blocks, totalOk, null, amb, true, 'Varios pacientes coinciden — elige uno');
  }
  if (pending && pending.multi) {
    return planResult(
      'preview',
      sourceText,
      blocks,
      totalOk,
      processable[0] && processable[0].patient,
      processablePatients(processable),
      true,
      'Varios pacientes en el pegado'
    );
  }
  if (pending && pending.patient) {
    return planResult(
      'confirm-single',
      sourceText,
      blocks,
      totalOk,
      pending.patient,
      [pending.patient],
      needsPreview,
      '¿Procesar labs de ' + (pending.patient.nombre || 'este paciente') + '?'
    );
  }
  if (!processable.length) {
    return planResult('preview', sourceText, blocks, totalOk, null, [], true, 'Revisa coincidencias antes de procesar');
  }
  if (needsPreview || processable.length > 1) {
    return planResult(
      'preview',
      sourceText,
      blocks,
      totalOk,
      processable[0].patient,
      processablePatients(processable),
      true,
      processable.length > 1 ? 'Varios pacientes en el pegado' : 'Confirmar laboratorios'
    );
  }
  return planResult(
    'ready',
    sourceText,
    blocks,
    totalOk,
    processable[0].patient,
    [processable[0].patient].filter(Boolean),
    false,
    ''
  );
}

/**
 * Detect clipboard text that should trigger paste-anywhere.
 * @param {string} text
 * @returns {boolean}
 */
export function looksLikeSmartPasteCandidate(text) {
  var s = String(text || '');
  if (s.length < 40) return false;
  if (looksLikeIndicasPasteCandidate(s)) return true;
  if (looksLikeIcSugerenciasPaste(s)) return true;
  if (!/Expediente\s*:/i.test(s)) return false;
  return /Nombre\s*:/i.test(s) || /GASOMETR|BIOMETRIA|QUIMICA|HEMOGLOBINA|BH\b|EGO\b/i.test(s);
}

/**
 * One bare registro, digits + dash + check digit.
 * @param {string} text
 * @returns {string} trimmed registro, or '' when not a registro paste
 */
export function registroFromPaste(text) {
  var s = String(text || '').trim();
  return /^\d{4,10}-\d$/.test(s) ? s : '';
}

/**
 * @param {EventTarget|null} target
 * @returns {boolean}
 */
export function isPasteTargetEditable(target) {
  if (!target || typeof target !== 'object') return false;
  var el = /** @type {HTMLElement} */ (target);
  if (el.isContentEditable) return true;
  var tag = String(el.tagName || '').toUpperCase();
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    var type = String(/** @type {HTMLInputElement} */ (el).type || 'text').toLowerCase();
    return type !== 'button' && type !== 'submit' && type !== 'checkbox' && type !== 'radio' && type !== 'file';
  }
  return false;
}

/**
 * Skip global intercept when user is already in Labs textarea or auth fields.
 * @param {EventTarget|null} target
 * @returns {boolean}
 */
export function shouldSkipGlobalSmartPaste(target) {
  if (!target || typeof target !== 'object') return false;
  var el = /** @type {HTMLElement} */ (target);
  if (el.id === 'lab-input' || el.id === 'med-input') return true;
  if (el.closest && el.closest('#lab-input, .lab-input-wrap, #med-receta-paste-modal, #db-unlock-modal, #clinical-login-modal')) {
    return true;
  }
  var tag = String(el.tagName || '').toUpperCase();
  if (tag === 'INPUT') {
    var type = String(/** @type {HTMLInputElement} */ (el).type || '').toLowerCase();
    if (type === 'password') return true;
  }
  return false;
}

function sumOkReports(blocks) {
  return (blocks || []).reduce(function (acc, b) {
    return acc + (b && b.okReportCount ? b.okReportCount : 0);
  }, 0);
}

function emptyPlan(kind, message) {
  return {
    kind: kind,
    sourceText: '',
    blocks: [],
    totalOkReports: 0,
    primaryPatient: null,
    candidates: [],
    needsPreview: false,
    message: message || '',
  };
}

/**
 * Name matching is only a fallback for census patients with no registro yet:
 * the lab workbench refuses to file expediente X under a patient whose
 * registro is Y, so offering that patient would be a dead-end confirm.
 */
function patientsWithoutRegistro(patients) {
  return (patients || []).filter(function (p) {
    return p && !String(p.registro || '').trim();
  });
}

function resolveBlocksWithNombre(blocks, patients) {
  var ambiguousCandidates = [];
  var pendingConfirm = null;
  var nameMatchPool = patientsWithoutRegistro(patients);
  var nextBlocks = (blocks || []).map(function (block) {
    if (!block || block.canProcess || !(block.okReportCount > 0)) return block;
    if (block.status !== 'no-patient') return block;
    var enrich = enrichBlockWithNombreMatches(block, nameMatchPool);
    if (enrich.ambiguous) {
      pushUniquePatients(ambiguousCandidates, enrich.candidates);
      return block;
    }
    if (enrich.best) {
      pendingConfirm = mergePendingConfirm(pendingConfirm, enrich.best, block.blockIndex);
      return assignPatientToBulkBlock(block, enrich.best);
    }
    return block;
  });
  return {
    blocks: nextBlocks,
    ambiguousCandidates: ambiguousCandidates,
    pendingConfirm: pendingConfirm,
  };
}

function pushUniquePatients(list, candidates) {
  (candidates || []).forEach(function (c) {
    if (!c || c.id == null) return;
    if (
      list.some(function (x) {
        return String(x.id) === String(c.id);
      })
    ) {
      return;
    }
    list.push(c);
  });
}

function mergePendingConfirm(pending, patient, blockIndex) {
  if (!patient) return pending;
  if (!pending) return { patient: patient, blockIndex: blockIndex };
  if (pending.multi) return pending;
  if (String(pending.patient.id) !== String(patient.id)) return { multi: true };
  return pending;
}
