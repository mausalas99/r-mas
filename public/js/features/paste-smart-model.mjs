/**
 * Pure helpers for paste-anywhere / Procesar inteligente.
 * Match SOME text to census by registro, then by nombre; decide confirm once.
 */
import { foldText } from '../fuzzy-match.mjs';
import {
  buildBulkLabPreview,
  shouldShowBulkLabPreview,
} from '../lab-bulk-paste.mjs';

var NAME_STOP = Object.create(null);
['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'do', 'dos', 'das'].forEach(function (w) {
  NAME_STOP[w] = true;
});

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
 * @param {string} name
 * @returns {string[]}
 */
export function significantNameTokens(name) {
  return foldText(name)
    .split(/[^a-z0-9]+/)
    .filter(function (t) {
      return t.length >= 3 && !NAME_STOP[t];
    });
}

/**
 * Higher is better; -Infinity = no match.
 * @param {string} reportName
 * @param {string} patientName
 * @returns {number}
 */
export function scoreNombreAgainstPatient(reportName, patientName) {
  var a = foldText(reportName);
  var b = foldText(patientName);
  if (!a || !b) return -Infinity;
  if (a === b) return 1000;
  var ta = significantNameTokens(a);
  var tb = significantNameTokens(b);
  if (!ta.length || !tb.length) return -Infinity;
  var setB = Object.create(null);
  tb.forEach(function (t) {
    setB[t] = true;
  });
  var hits = 0;
  ta.forEach(function (t) {
    if (setB[t]) hits += 1;
  });
  if (hits < 2 && !(hits === 1 && ta.length === 1 && tb.length === 1)) {
    return -Infinity;
  }
  var coverage = hits / Math.max(ta.length, tb.length);
  return hits * 10 + coverage * 5 - Math.abs(ta.length - tb.length) * 0.5;
}

/**
 * @param {string} nombre
 * @param {{ id: string, nombre?: string, registro?: string, cuarto?: string }[]} patients
 * @param {{ minScore?: number, limit?: number }} [opts]
 * @returns {{ patient: object, score: number }[]}
 */
export function matchPatientsByNombre(nombre, patients, opts) {
  var minScore = opts && typeof opts.minScore === 'number' ? opts.minScore : 15;
  var limit = opts && opts.limit ? opts.limit : 8;
  var out = [];
  (patients || []).forEach(function (p) {
    if (!p || p.id == null) return;
    var score = scoreNombreAgainstPatient(nombre, p.nombre || '');
    if (score < minScore || score === -Infinity) return;
    out.push({ patient: p, score: score });
  });
  out.sort(function (a, b) {
    return b.score - a.score;
  });
  return out.slice(0, limit);
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
 * @typedef {'not-some'|'empty'|'ready'|'confirm-single'|'ambiguous'|'preview'} SmartPasteKind
 */

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

  var blocks = buildBulkLabPreview(sourceText, { findPatientByRegistro: findByReg });
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
  if (!/Expediente\s*:/i.test(s)) return false;
  return /Nombre\s*:/i.test(s) || /GASOMETR|BIOMETRIA|QUIMICA|HEMOGLOBINA|BH\b|EGO\b/i.test(s);
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
  if (el.id === 'lab-input') return true;
  if (el.closest && el.closest('#lab-input, .lab-input-wrap, #db-unlock-modal, #clinical-login-modal')) {
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

function resolveBlocksWithNombre(blocks, patients) {
  var ambiguousCandidates = [];
  var pendingConfirm = null;
  var nextBlocks = (blocks || []).map(function (block) {
    if (!block || block.canProcess || !(block.okReportCount > 0)) return block;
    if (block.status !== 'no-patient') return block;
    var enrich = enrichBlockWithNombreMatches(block, patients);
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
