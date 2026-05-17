function numOrNull(v) {
  if (v == null || v === '') return null;
  var n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\*/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function pickSection(parsedBySection, section, key, parsedFlat) {
  var sec = parsedBySection && parsedBySection[section];
  if (sec && sec[key] != null) return numOrNull(sec[key]);
  if (parsedFlat && parsedFlat[key] != null) return numOrNull(parsedFlat[key]);
  return null;
}

/** Reglas v1: Hb y electrolitos (umbrales moderados). */
export const LAB_CLINICAL_RULES = [
  {
    id: 'hb-transfusion',
    test: function (v) {
      return v.hb != null && v.hb < 7;
    },
    text: function (v) {
      return 'TRANSFUSION DE CONCENTRADO ERITROCITARIO (HB ' + formatLabVal(v.hb) + ')';
    },
  },
  {
    id: 'k-repletion',
    test: function (v) {
      return v.k != null && v.k < 3.5;
    },
    text: function (v) {
      return 'REPO DE POTASIO (K ' + formatLabVal(v.k) + ')';
    },
  },
  {
    id: 'na-repletion',
    test: function (v) {
      return v.na != null && v.na < 135;
    },
    text: function (v) {
      return 'REPO DE SODIO (NA ' + formatLabVal(v.na) + ')';
    },
  },
  {
    id: 'mg-repletion',
    test: function (v) {
      return v.mg != null && v.mg < 1.6;
    },
    text: function (v) {
      return 'REPO DE MAGNESIO (MG ' + formatLabVal(v.mg) + ')';
    },
  },
  {
    id: 'ca-repletion',
    test: function (v) {
      return v.ca != null && v.ca < 8.5;
    },
    text: function (v) {
      return 'REPO DE CALCIO (CA ' + formatLabVal(v.ca) + ')';
    },
  },
];

function formatLabVal(n) {
  var s = String(n);
  return s.indexOf('.') >= 0 ? s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') : s;
}

export function extractLabValuesForSuggestions(parsed, parsedBySection) {
  var pb = parsedBySection || {};
  return {
    hb: pickSection(pb, 'BH', 'Hb', parsed),
    na: pickSection(pb, 'ESC', 'Na', parsed),
    k: pickSection(pb, 'ESC', 'K', parsed),
    mg: pickSection(pb, 'ESC', 'Mg', parsed),
    ca: pickSection(pb, 'ESC', 'Ca', parsed),
  };
}

/**
 * @returns {{ ruleId: string, text: string, fechaEstudio: string }[]}
 */
export function evaluateLabSuggestions(parsed, parsedBySection, fechaEstudio) {
  var fecha = String(fechaEstudio || '').trim();
  var values = extractLabValuesForSuggestions(parsed, parsedBySection);
  var out = [];
  for (var i = 0; i < LAB_CLINICAL_RULES.length; i += 1) {
    var rule = LAB_CLINICAL_RULES[i];
    if (!rule.test(values)) continue;
    out.push({
      ruleId: rule.id,
      text: rule.text(values),
      fechaEstudio: fecha,
    });
  }
  return out;
}

/** No duplicar la misma regla el mismo día si ya hay pendiente abierto. */
export function shouldAddLabSuggestionTodo(todos, ruleId, fechaEstudio) {
  var rid = String(ruleId || '');
  var fecha = String(fechaEstudio || '').trim();
  if (!rid || !fecha) return true;
  var list = Array.isArray(todos) ? todos : [];
  for (var i = 0; i < list.length; i += 1) {
    var t = list[i];
    if (!t || t.completed) continue;
    if (String(t.labRuleId || '') === rid && String(t.labFecha || '').trim() === fecha) return false;
  }
  return true;
}

export function filterNewLabSuggestions(suggestions, todos) {
  return (suggestions || []).filter(function (s) {
    return shouldAddLabSuggestionTodo(todos, s.ruleId, s.fechaEstudio);
  });
}
