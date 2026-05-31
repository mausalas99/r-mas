import catalog from './catalog.json' with { type: 'json' };

/** @param {string} s */
export function normalizeClinicalText(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {string} text normalized
 * @param {Array<{ anyOf: string[] }>} clauses
 */
export function matchAllClauses(text, clauses) {
  if (!clauses || !clauses.length) return true;
  for (var i = 0; i < clauses.length; i += 1) {
    var clause = clauses[i];
    var terms = clause && Array.isArray(clause.anyOf) ? clause.anyOf : [];
    var hit = false;
    for (var j = 0; j < terms.length; j += 1) {
      var term = normalizeClinicalText(terms[j]);
      if (term && text.includes(term)) {
        hit = true;
        break;
      }
    }
    if (!hit) return false;
  }
  return true;
}

/** @param {string} predicate @param {Record<string, unknown>} ctx */
export function evalSafetyPredicate(predicate, ctx) {
  var p = String(predicate || '').trim();
  if (!p) return true;
  var renal = /** @type {{ egfr?: number|null, creatinineMgDl?: number|null }} */ (ctx.renal || {});
  var egfr = renal.egfr;
  var cr = renal.creatinineMgDl;

  if (p === 'renal.egfr != null && renal.egfr < 30') {
    return egfr != null && Number.isFinite(egfr) && egfr < 30;
  }
  if (p === 'renal.egfr != null && renal.egfr < 60') {
    return egfr != null && Number.isFinite(egfr) && egfr < 60;
  }
  if (p === 'renal.creatinineMgDl != null && renal.creatinineMgDl > 1.5') {
    return cr != null && Number.isFinite(cr) && cr > 1.5;
  }

  var lt = p.match(/^renal\.egfr\s*<\s*(\d+(?:\.\d+)?)$/);
  if (lt) {
    var n = Number(lt[1]);
    return egfr != null && Number.isFinite(egfr) && egfr < n;
  }
  return false;
}

/**
 * @param {{
 *   appText?: string,
 *   peeaText?: string,
 *   renal?: { egfr?: number|null, creatinineMgDl?: number|null, fecha?: string, setId?: string, source?: string }|null,
 *   patient?: { sexo?: string, edadYears?: number|null },
 *   rules?: typeof catalog,
 * }} opts
 */
export function evaluateSafetyRules(opts) {
  var rules = opts.rules || catalog;
  var appNorm = normalizeClinicalText(opts.appText || '');
  var peeaNorm = normalizeClinicalText(opts.peeaText || '');
  var combined = (appNorm + ' ' + peeaNorm).trim();
  var ctx = {
    renal: opts.renal || null,
    patient: opts.patient || {},
    app: appNorm,
    peea: peeaNorm,
  };

  /** @type {Array<{ id: string, severity: string, title: string, message: string, reference?: string }>} */
  var fired = [];

  for (var i = 0; i < rules.length; i += 1) {
    var rule = rules[i];
    if (!rule || !rule.id) continue;
    if (!matchAllClauses(appNorm, rule.clauses || [])) continue;

    var requires = rule.requires || rule.requiresContext || [];
    if (requires.indexOf('renal') >= 0 && (!ctx.renal || ctx.renal.egfr == null)) {
      if (rule.scope === 'cross_field') continue;
    }

    if (rule.scope === 'cross_field' && rule.predicate) {
      if (!evalSafetyPredicate(rule.predicate, ctx)) continue;
    }

    if (rule.scope === 'text' && requires.indexOf('peea') >= 0) {
      if (!matchAllClauses(peeaNorm, rule.clauses || [])) continue;
    }

    fired.push({
      id: rule.id,
      severity: rule.severity || 'high',
      title: rule.title || rule.id,
      message: rule.message || '',
      reference: rule.reference,
    });
  }

  return fired;
}

export { catalog };
