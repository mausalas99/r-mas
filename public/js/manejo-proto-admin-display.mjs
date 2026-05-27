/** Vista legible de administración de infusiones (sin bloque SOME en mayúsculas). */

function trim(s) {
  return String(s || '').trim();
}

function humanizeAdminValue(val) {
  val = trim(val);
  if (!val) return '';
  val = val.replace(/\bCC\/HR\b/gi, 'cc/h');
  val = val.replace(/\bMCG\/MIN\b/gi, 'mcg/min');
  val = val.replace(/\bMG\/MIN\b/gi, 'mg/min');
  val = val.replace(/\bU\/MIN\b/gi, 'U/min');
  val = val.replace(/\bU\/KG\/H\b/gi, 'U/kg/h');
  if (val === val.toUpperCase() && val.length > 4 && /[A-ZÁÉÍÓÚÑ]/.test(val)) {
    return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
  }
  return val;
}

function humanizeDrugName(name) {
  name = trim(name);
  if (!name) return '—';
  if (name === name.toUpperCase()) {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }
  var first = name.charAt(0);
  if (first === first.toLowerCase() && first !== first.toUpperCase()) {
    return first.toUpperCase() + name.slice(1);
  }
  return name;
}

function hasDosePattern(s) {
  return (
    /\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|ui|mEq|ml|cc|%|u|gotas?)\b/i.test(String(s || '')) ||
    /\d+\s*ml\s+c\//i.test(String(s || '')) ||
    /\d+(?:[–-]\d+)?\s*gotas?\b/i.test(String(s || ''))
  );
}

function inferDrugNameFromText(text) {
  var m = String(text || '').match(/^([A-Za-zÁÉÍÓÚáéíóúÑñ/+\-().]{2,42}?)\s+\d/);
  return m ? humanizeDrugName(trim(m[1])) : '';
}

export function looksLikeClinicalDoseText(text) {
  text = trim(text);
  if (!text) return false;

  if (/(→|->)/.test(text) && (hasDosePattern(text) || /\d\s*ml/i.test(text))) return true;

  if (
    /\b[A-Za-zÁÉÍÓÚáéíóúÑñ/]{3,}\s+IV\b|\b[A-Za-zÁÉÍÓÚáéíóúÑñ/]{3,}\s+IM\b|\s\+\s+[A-Za-z]/i.test(
      text
    ) &&
    !/^oxígeno|^o2\b|spO2|posición|monitoreo continuo|no profilaxis|precipitantes:|suspender nitro/i.test(
      text.toLowerCase()
    )
  ) {
    return true;
  }

  if (!hasDosePattern(text)) return false;

  var lower = text.toLowerCase();
  if (/^meta\b/.test(lower) && !/\d\s*(mg|mcg|ml|cc)\s+c\//i.test(text)) return false;
  if (
    /^oxígeno|^o2\b|spO2|posición|monitoreo continuo|no profilaxis|precipitantes:|suspender nitro|^requiere intubación y eeg|^no agregar potasio|^vigilar\b/i.test(
      lower
    ) &&
    !/\d\s*mg/i.test(text)
  ) {
    return false;
  }
  if (/^hemodiálisis|^hemodialisis|^alternativa:\s*ácido valproico|^alternativa:\s*pentobarbital/i.test(lower)) {
    return false;
  }

  var altParts = text.split(/\s*,\s*(?=[A-ZÁÉÍÓÚ][a-záéíóúñ/])|\s+\bo\b\s+(?=[A-ZÁÉÍÓÚ][a-záéíóúñ/])/i);
  var namedDrugs = altParts.filter(function (part) {
    part = trim(part);
    return /^[A-ZÁÉÍÓÚ][A-Za-zÁÉÍÓÚáéíóúñ/+\-()]{2,}/.test(part);
  });
  if (namedDrugs.length >= 2 && altParts.filter(hasDosePattern).length >= 2) return false;

  return true;
}

function formatInfusionRate(rate) {
  var r = trim(rate);
  if (!r) return '';
  if (/mcg\/min|mg\/min|u\/min|u\/kg\/h|cc\/h/i.test(r)) return humanizeAdminValue(r);
  return humanizeAdminValue(r + ' cc/h');
}

function looksLikeSomeBlock(text) {
  return /^MEDICAMENTO:/im.test(String(text || ''));
}

/**
 * @param {string} line
 * @returns {{ drug: string, bolo: string, infusion: string, prep: string, alt: string }|null}
 */
export function parseDrugRegimen(line) {
  var alt = '';
  var altMatch = String(line || '').match(/\s+o\s+(.+)$/i);
  var core = String(line || '');
  if (altMatch && /(→|->)/.test(core.slice(0, altMatch.index))) {
    alt = altMatch[1].replace(/\.\s*$/, '');
    core = core.slice(0, altMatch.index).trim();
  }

  var arrowMatch = core.match(/(.+?)\s*(→|->)\s*(.+)/);
  if (!arrowMatch) return null;

  var left = trim(arrowMatch[1]);
  var right = trim(arrowMatch[3]).replace(/\.\s*$/, '');
  var prep = '';
  var prepMatch = right.match(/\(([^)]+)\)\s*$/);
  if (prepMatch) {
    prep = prepMatch[1];
    right = trim(right.slice(0, prepMatch.index));
  }

  var drugMatch = left.match(/^(.+?)\s+([\d.].+)$/);
  return {
    drug: drugMatch ? trim(drugMatch[1]) : left,
    bolo: drugMatch ? trim(drugMatch[2]) : '',
    infusion: right,
    prep: prep,
    alt: alt,
  };
}

function mergeDoseParts(parts) {
  parts = parts.map(trim).filter(Boolean);
  if (!parts.length) return '';
  var merged = parts[0];
  for (var i = 1; i < parts.length; i++) {
    var part = parts[i];
    var mergedLow = merged.toLowerCase();
    var partLow = part.toLowerCase();
    if (mergedLow.indexOf(partLow) >= 0) continue;
    if (partLow.indexOf(mergedLow) >= 0) {
      merged = part;
      continue;
    }
    merged = merged + ' · ' + part;
  }
  return humanizeAdminValue(merged);
}

function splitDoseClauses(text) {
  text = trim(text);
  if (!text) return [];

  if (text.indexOf(' · ') >= 0) {
    var mergedBits = text.split(/\s·\s/).map(trim).filter(Boolean);
    if (mergedBits.length > 1) {
      var mergedOut = [];
      mergedBits.forEach(function (bit) {
        splitDoseClauses(bit).forEach(function (clause) {
          mergedOut.push(clause);
        });
      });
      return mergedOut;
    }
  }

  if (/\s+\+\s+/.test(text)) {
    var bundleParts = text.split(/\.\s+(?=[A-ZÁÉÍÓÚÑ]|Permitir|No |Máx|Meta|Si )/);
    var bundleHead = bundleParts[0];
    var bundleTail = bundleParts.slice(1);
    if (/\s+\+\s+/.test(bundleHead)) {
      var bundleOut = bundleHead.split(/\s+\+\s+/).map(trim).filter(Boolean);
      var flatBundle = [];
      bundleOut.forEach(function (part) {
        if (/\s+o\s+(?=[A-Za-zÁÉÍÓÚ])/i.test(part) && !/cefalopat|grados \d/i.test(part)) {
          part.split(/\s+o\s+/i).forEach(function (piece, idx) {
            piece = trim(piece);
            if (!piece) return;
            flatBundle.push(idx > 0 ? 'Alternativa: ' + piece : piece);
          });
        } else {
          flatBundle.push(part);
        }
      });
      bundleTail.forEach(function (part) {
        flatBundle.push(trim(part));
      });
      return flatBundle;
    }
  }

  var parts = text.split(
    /\.\s+(?=[A-ZÁÉÍÓÚÑ¿¡]|No |Máx|Max|Permitir|Iniciar|Meta|Si |Solo |CAD:|EHH:|Fórmula|Agregar|Luego |\d+(?:[.,]\d+)?(?:\s*[–-]\s*\d+(?:[.,]\d+)?)?\s*(?:mg|mcg|g|u|meq|ui|cc|ml)\b)/i
  );
  parts = parts.map(function (part) {
    return trim(part).replace(/\.$/, '');
  }).filter(Boolean);

  if (parts.length <= 1) {
    parts = text.split(/\s*;\s*/).map(trim).filter(Boolean);
  }

  if (parts.length === 1) {
    var inlineParts = expandInlineDoseParts(parts[0]);
    if (inlineParts.length > 1) parts = inlineParts;
  }

  var expanded = [];
  parts.forEach(function (part) {
    var inline = expandInlineDoseParts(part);
    if (inline.length > 1) {
      inline.forEach(function (piece) {
        expanded.push(piece);
      });
      return;
    }
    part.split(/,\s*(?=luego\s)/i).forEach(function (piece, idx) {
      piece = trim(piece);
      if (!piece) return;
      if (idx > 0) piece = piece.replace(/^luego\s+/i, 'Luego ');
      expanded.push(piece);
    });
  });
  return expanded;
}

function expandInlineDoseParts(text) {
  text = trim(text);
  if (!text) return [];

  var out = [];
  var remaining = text;

  var exampleMatch = remaining.match(/^(.+?)\s*\(((?:ej\.|e\.g\.|hasta|ajustar|meta)[^)]*)\)\s*$/i);
  if (exampleMatch) {
    out.unshift(trim(exampleMatch[2]));
    remaining = trim(exampleMatch[1]);
  }

  var concMatch = remaining.match(/^(.+?)\s*\(([\d.]+\s*(?:mg|mcg|g|ui|meq|u)\/ml)\)\s*$/i);
  if (concMatch) {
    out.unshift(trim(concMatch[2]));
    remaining = trim(concMatch[1]);
  }

  if (/\s+si\s+(?=>|<|\d)/i.test(remaining)) {
    var siSplit = remaining.split(/\s+si\s+/i);
    out.unshift('Si ' + trim(siSplit.slice(1).join(' si ')));
    remaining = trim(siSplit[0]);
  }

  if (/\s+en\s+(grados|cefalopat|contexto)/i.test(remaining)) {
    var enMatch = remaining.match(/^(.+?)\s+en\s+(.+)$/i);
    if (enMatch) {
      out.unshift('En ' + trim(enMatch[2]));
      remaining = trim(enMatch[1]);
    }
  }

  var actionMatch = remaining.match(/^(.+?)\s+y\s+(titular[^.]*|agregar[^.]*|ajustar[^.]*)$/i);
  if (actionMatch) {
    out.unshift(trim(actionMatch[2]));
    remaining = trim(actionMatch[1]);
  }

  if (remaining) out.unshift(remaining);
  return out.map(trim).filter(Boolean);
}

function classifyDoseClause(clause, drugName) {
  var text = trim(clause);
  drugName = trim(drugName);
  if (drugName) {
    var drugRe = new RegExp('^' + drugName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s—–-]+', 'i');
    text = trim(text.replace(drugRe, ''));
  }

  if (/^si\s/i.test(text)) {
    return { tag: 'Criterio', text: humanizeAdminValue(text) };
  }
  if (/^meta\b/i.test(text)) {
    return { tag: 'Meta', text: humanizeAdminValue(text) };
  }
  if (/^alternativa:/i.test(text)) {
    return {
      tag: 'Alternativa',
      text: humanizeAdminValue(text.replace(/^alternativa:\s*/i, '')),
    };
  }
  if (/^en\s/i.test(text)) {
    return { tag: 'Criterio', text: humanizeAdminValue(text) };
  }
  if (/^ej\.|^e\.g\./i.test(text)) {
    return { tag: 'Ejemplo', text: humanizeAdminValue(text.replace(/^ej\.\s*/i, '')) };
  }
  if (/^hasta\s/i.test(text)) {
    return { tag: 'Límite', text: humanizeAdminValue(text) };
  }
  if (/^ajustar\b|^meta\b/i.test(text)) {
    return { tag: 'Acción', text: humanizeAdminValue(text) };
  }
  if (/mg\/ml|mcg\/ml|ui\/ml|meq\/ml/i.test(text) && text.length < 32) {
    return { tag: 'Concentración', text: humanizeAdminValue(text) };
  }

  var componentMatch = text.match(/^([A-Za-zÁÉÍÓÚáéíóúÑñ/+\-().]{2,42}?)\s+(\d.+)$/);
  if (
    componentMatch &&
    !/^(infusi[oó]n|esquema|meta|cad|ehh|solo|permitir|m[aá]x|no|luego|si)$/i.test(trim(componentMatch[1]))
  ) {
    return {
      tag: humanizeDrugName(trim(componentMatch[1])),
      text: humanizeAdminValue(trim(componentMatch[2])),
    };
  }

  if (/^no diluir|\ben\s+\d+\s*(cc|ml)\b|\d.+\s+(mg|mcg|g|ui|meq)\s+en\s+\d|\d.+\s+(ml|cc)\s+de\s+(glucosado|ss|fisiol|nacl)/i.test(text)) {
    return { tag: 'Preparación', text: humanizeAdminValue(text) };
  }
  if (/por (cada )?litro|por litro de sangre/i.test(text)) {
    return { tag: 'Regla', text: humanizeAdminValue(text) };
  }
  if (/^máx|^max\b|máximo/i.test(text)) {
    return { tag: 'Límite', text: humanizeAdminValue(text) };
  }
  if (/permitir titular|^titular\b/i.test(text)) {
    return { tag: 'Acción', text: humanizeAdminValue(text) };
  }
  if (/^iniciar|^administrar|^pasar|^infundir|^nebuliz|^agregar/i.test(text)) {
    return { tag: 'Acción', text: humanizeAdminValue(text) };
  }
  if (/^fórmula|^cad:|^ehh:/i.test(text)) {
    return { tag: 'Fórmula', text: humanizeAdminValue(text) };
  }
  if (/^luego\s/i.test(text) || /×\s*\d|→/.test(text)) {
    return { tag: 'Esquema', text: humanizeAdminValue(text) };
  }
  if (
    /\d+\s*min\b/i.test(text) &&
    (/luego|×|→/i.test(text) || /mg\/min|mcg\/min|cc\/h|mg\/h/i.test(text))
  ) {
    return { tag: 'Esquema', text: humanizeAdminValue(text) };
  }
  if (/mcg\/kg|mg\/kg|u\/kg|mg\/h|mcg\/min|mg\/min|cc\/h|~\d/i.test(text)) {
    return { tag: 'Rango', text: humanizeAdminValue(text) };
  }
  if (/^\d/.test(text) || /\d\s*(mg|mcg|g|ml|cc|meq|ui|u)\b/i.test(text)) {
    return { tag: 'Dosis', text: humanizeAdminValue(text) };
  }
  return { tag: 'Detalle', text: humanizeAdminValue(text) };
}

function shouldSchematizeDose(text, clauses) {
  text = trim(text);
  if (!text) return false;
  if ((clauses || []).length > 1) return true;
  if (text.length > 36) return true;
  if (/\.\s+[A-ZÁÉÍÓÚ]| · | si |→|\([^)]{4,}\)|\/kg\b|\s+\+\s+/i.test(text)) return true;
  return false;
}

function calcLineRedundantWithDose(calcLine, doseLines, doseText) {
  var calcLow = calcLine.text.toLowerCase();
  if ((doseLines || []).some(function (line) {
    return line.text.length > 8 && calcLow.indexOf(line.text.toLowerCase()) >= 0;
  })) {
    return true;
  }
  var doseLow = trim(doseText).toLowerCase();
  return doseLow.length > 12 && calcLow.indexOf(doseLow.slice(0, 24)) >= 0;
}

function pullCalcLinesFromNote(noteParts) {
  var calcLines = [];
  var kept = [];
  (noteParts || []).forEach(function (part) {
    part.split(/\s*;\s*/).forEach(function (piece) {
      piece = trim(piece);
      if (!piece) return;
      if (
        /^[\d.]+\s*g albumina \(~[\d.]+\s*amp/i.test(piece) ||
        /^propofol \d/i.test(piece) ||
        /^dexmedetomidina \d/i.test(piece) ||
        /^midazolam \d/i.test(piece) ||
        /insulina regular .*→/i.test(piece) ||
        /^balanceada hu total/i.test(piece) ||
        /^hipertónica:/i.test(piece) ||
        /^levetiracetam \d+/i.test(piece) ||
        /^[\d.]+\s*u\/h\b/i.test(piece)
      ) {
        calcLines.push({ tag: 'Calculado', text: humanizeAdminValue(piece) });
        return;
      }
      kept.push(piece);
    });
  });
  return { calcLines: calcLines, noteParts: kept };
}

/** @returns {Array<{ tag: string, text: string }>|null} */
export function schematizeAdminDose(text, drugName) {
  text = trim(text);
  if (!text) return null;

  var clauses = splitDoseClauses(text);
  if (!shouldSchematizeDose(text, clauses)) return null;

  if (clauses.length <= 1) {
    return [{ tag: 'Detalle', text: humanizeAdminValue(text) }];
  }

  return clauses.map(function (clause) {
    return classifyDoseClause(clause, drugName);
  });
}

function notePartInDose(part, doseText, doseLines) {
  part = trim(part);
  if (!part) return true;
  var partLow = part.toLowerCase();
  if (partLow.length < 4) return false;

  var blobs = [trim(doseText).toLowerCase()];
  (doseLines || []).forEach(function (line) {
    blobs.push(line.text.toLowerCase());
    blobs.push((line.tag + ' ' + line.text).toLowerCase());
  });

  return blobs.some(function (blob) {
    return blob && (blob.indexOf(partLow) >= 0 || partLow.indexOf(blob) >= 0);
  });
}

function dedupeAdminNote(note, doseText, doseLines) {
  note = trim(note);
  if (!note) return '';

  var parts = note.split(/\s*;\s*/).map(trim).filter(Boolean);
  var kept = parts.filter(function (part) {
    return !notePartInDose(part, doseText, doseLines);
  });

  if (!kept.length) return '';
  if (kept.length === 1 && notePartInDose(kept[0], doseText, doseLines)) return '';
  return humanizeAdminValue(kept.join('; '));
}

function appendNotePart(noteParts, val) {
  val = trim(val);
  if (!val) return;
  var exists = noteParts.some(function (part) {
    var partLow = part.toLowerCase();
    var valLow = val.toLowerCase();
    return partLow === valLow || partLow.indexOf(valLow) >= 0 || valLow.indexOf(partLow) >= 0;
  });
  if (!exists) noteParts.push(val);
}

function isCriteriaDoseLineTag(tag) {
  return tag === 'Criterio' || tag === 'Meta' || tag === 'Ejemplo' || tag === 'Alternativa';
}

function isPrimaryDoseLine(line) {
  if (line.tag === 'Dosis') return true;
  return (
    line.tag === 'Esquema' &&
    /^\d/.test(line.text) &&
    !/×|→/.test(line.text) &&
    /\d\s*(mg|mcg|g|ml|cc|meq|ui|u)\b/i.test(line.text)
  );
}

/** Oral/simple regimens: one Dosis row + criteria in note (layout Morfina). */
function flattenSimpleDoseLines(dose, doseLines, noteParts) {
  if (!doseLines || doseLines.length < 2) {
    return { dose: dose, doseLines: doseLines };
  }

  var mainDose = [];
  var criteria = [];
  var keepStacked = false;

  doseLines.forEach(function (line) {
    if (isCriteriaDoseLineTag(line.tag)) {
      criteria.push(line.text);
    } else if (isPrimaryDoseLine(line)) {
      mainDose.push(line.text);
    } else {
      keepStacked = true;
    }
  });

  if (keepStacked || mainDose.length !== 1 || !criteria.length) {
    return { dose: dose, doseLines: doseLines };
  }

  criteria.forEach(function (text) {
    appendNotePart(noteParts, text);
  });
  return { dose: mainDose[0], doseLines: null };
}

/** @returns {{ drug: string, rows: Array<{label:string,value:string}>, note: string }} */
function normalizeAdminView(view) {
  view = view || {};
  var doseParts = [];
  var via = '';
  var noteParts = trim(view.note) ? [trim(view.note)] : [];

  (view.rows || []).forEach(function (row) {
    var label = trim(row.label).toLowerCase();
    var value = humanizeAdminValue(row.value);
    if (row.lines && row.lines.length) {
      row.lines.forEach(function (line) {
        var lineText = humanizeAdminValue(line.text);
        if (!lineText) return;
        if (label === 'dosis') doseParts.push(lineText);
        else appendNotePart(noteParts, line.tag && line.tag !== 'Detalle' ? line.tag + ': ' + lineText : lineText);
      });
      return;
    }
    if (!value) return;
    if (label === 'dosis') doseParts.push(value);
    else if (label === 'dilución' || label === 'dilucion') doseParts.push(value);
    else if (label === 'vía' || label === 'via') via = value;
    else appendNotePart(noteParts, value);
  });

  var rows = [];
  var dose = mergeDoseParts(doseParts);
  var pulled = pullCalcLinesFromNote(noteParts);
  noteParts = pulled.noteParts;
  var doseLines = schematizeAdminDose(dose, view.drug);
  if (pulled.calcLines.length) {
    pulled.calcLines.forEach(function (calcLine) {
      if (!calcLineRedundantWithDose(calcLine, doseLines, dose)) {
        doseLines = (doseLines || []).concat([calcLine]);
      }
    });
  }
  var flattened = flattenSimpleDoseLines(dose, doseLines, noteParts);
  dose = flattened.dose;
  doseLines = flattened.doseLines;
  if (dose) {
    rows.push({
      label: 'Dosis',
      value: doseLines ? '' : dose,
      lines: doseLines || undefined,
    });
  }
  if (via) rows.push({ label: 'Vía', value: via });

  return {
    drug: view.drug,
    rows: rows,
    note: dedupeAdminNote(noteParts.join('; '), dose, doseLines),
  };
}

function isMessySomeOrder(order) {
  if (!order) return true;
  var unit = trim(order.doseUnit);
  if (unit.length > 28 || /administrar|titular|[.;]/.test(unit)) return true;
  if (!trim(order.doseValue) && !trim(order.dilution) && !trim(order.frequency) && order.infusionRateMlHr == null) {
    return true;
  }
  return false;
}

var SOME_LABELS = {
  DOSIS: 'Dosis',
  VIA: 'Vía',
  DILUCION: 'Dilución',
  FRECUENCIA: 'Frecuencia',
  'VELOCIDAD DE INFUSION': 'Velocidad',
  'COMENTARIOS ADICIONALES': 'Notas',
};

function rowsFromSomeBlock(text) {
  var rows = [];
  var drug = '';
  String(text || '')
    .split(/\n/)
    .map(trim)
    .filter(Boolean)
    .forEach(function (line) {
      var m = line.match(/^([^:]+):\s*(.+)$/);
      if (!m) return;
      var key = trim(m[1]).toUpperCase();
      var val = humanizeAdminValue(m[2]);
      if (!val || val === '—') return;
      if (key === 'MEDICAMENTO') {
        drug = humanizeDrugName(val);
        return;
      }
      var label = SOME_LABELS[key] || humanizeAdminValue(key);
      rows.push({ label: label, value: val });
    });
  return { drug: drug, rows: rows };
}

function rowsFromSomeFields(fields) {
  var rows = [];
  var dose =
    trim(fields.doseValue) + (fields.doseUnit ? ' ' + trim(fields.doseUnit) : '');
  if (trim(dose)) rows.push({ label: 'Dosis', value: humanizeAdminValue(dose) });
  if (fields.route) rows.push({ label: 'Vía', value: humanizeAdminValue(fields.route) });
  if (fields.dilution) rows.push({ label: 'Dilución', value: humanizeAdminValue(fields.dilution) });
  if (fields.frequency) rows.push({ label: 'Frecuencia', value: humanizeAdminValue(fields.frequency) });
  if (fields.infusionRateMlHr != null && fields.infusionRateMlHr !== '') {
    rows.push({ label: 'Velocidad', value: formatInfusionRate(fields.infusionRateMlHr) });
  }
  return {
    drug: humanizeDrugName(fields.medication),
    rows: rows,
    note: humanizeAdminValue(fields.comments),
  };
}

function rowsFromSomeOrder(order) {
  var rows = [];
  var dose = trim(order.doseValue);
  var unit = trim(order.doseUnit);
  if (dose && unit && unit.length <= 28 && !/[.;]/.test(unit)) {
    rows.push({ label: 'Dosis', value: humanizeAdminValue(dose + ' ' + unit) });
  } else if (dose) {
    rows.push({ label: 'Dosis', value: humanizeAdminValue(dose) });
  }
  if (order.route) rows.push({ label: 'Vía', value: humanizeAdminValue(order.route) });
  if (order.dilution) rows.push({ label: 'Dilución', value: humanizeAdminValue(order.dilution) });
  if (order.frequency) rows.push({ label: 'Frecuencia', value: humanizeAdminValue(order.frequency) });
  if (order.infusionRateMlHr != null && order.infusionRateMlHr !== '') {
    rows.push({ label: 'Velocidad', value: formatInfusionRate(order.infusionRateMlHr) });
  }
  return {
    drug: humanizeDrugName(order.medication),
    rows: rows,
    note: humanizeAdminValue(order.comments),
  };
}

function splitSentences(text) {
  return trim(text).split(/\.\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/);
}

function firstSentence(text) {
  var parts = splitSentences(text);
  return trim(parts[0] || text).replace(/\.$/, '');
}

function restAfterFirstSentence(text) {
  var parts = splitSentences(text);
  if (parts.length <= 1) return '';
  return trim(parts.slice(1).join('. '));
}

function extractRoute(text) {
  var t = String(text || '').toLowerCase();
  if (/sublingual|\bsl\b/.test(t)) return 'SL';
  if (/nebuliz/.test(t)) return 'Nebul';
  if (/\bvo\b|vía oral|\bv\.?\s*o\.?\b|\boral\b/.test(t)) return 'VO';
  if (/\biv\b|intraven|infusión iv/.test(t)) return 'IV';
  if (/\bim\b|intramus/.test(t)) return 'IM';
  if (/\bbolo\b/.test(t)) return 'IV';
  if (
    (/\bmg\b.*\bc\/\d+\s*h\b|\bml\b.*\bc\/\d/i.test(t) || /lactulosa|rifaximina|omeprazol|pantoprazol/i.test(t)) &&
    !/\biv\b|\binfus|\ben\s+\d+\s*(cc|ml)/i.test(t)
  ) {
    return 'VO';
  }
  return '';
}

function stripRouteWords(doseLine, route) {
  var s = trim(doseLine);
  if (!s || !route) return s;
  if (route === 'SL') s = s.replace(/\bsublingual\b/gi, '').replace(/\bSL\b/gi, '');
  if (route === 'IV') s = s.replace(/\bIV\b/gi, '').replace(/\bintraven\w*/gi, '');
  if (route === 'VO') s = s.replace(/\bVO\b/gi, '').replace(/\bvía oral\b/gi, '').replace(/\boral\b/gi, '');
  if (route === 'IM') s = s.replace(/\bIM\b/gi, '').replace(/\bintramus\w*/gi, '');
  if (route === 'Nebul') s = s.replace(/\bnebuliz\w*/gi, '');
  return s.replace(/\s+/g, ' ').replace(/\s+([,.;])/g, '$1').trim();
}

function rowsFromIndicationText(entry, order) {
  entry = entry || {};
  order = order || null;
  var indication = trim(entry.indicationText);
  var drug = humanizeDrugName(entry.title);
  var rows = [];
  var first = firstSentence(indication);
  var route = extractRoute(first) || humanizeAdminValue(order && order.route);
  var doseLine = stripRouteWords(first, route);

  if (trim(doseLine)) rows.push({ label: 'Dosis', value: humanizeAdminValue(doseLine) });
  if (route) rows.push({ label: 'Vía', value: route });

  if (order && trim(order.dilution)) {
    rows.push({ label: 'Dilución', value: humanizeAdminValue(order.dilution) });
  }
  if (order && trim(order.frequency)) {
    rows.push({ label: 'Frecuencia', value: humanizeAdminValue(order.frequency) });
  }
  if (order && order.infusionRateMlHr != null && order.infusionRateMlHr !== '') {
    rows.push({ label: 'Velocidad', value: formatInfusionRate(order.infusionRateMlHr) });
  }

  var note = humanizeAdminValue(restAfterFirstSentence(indication) || (order && order.comments) || '');

  return { drug: drug, rows: rows, note: note };
}

/** @returns {{ drug: string, rows: Array<{label:string,value:string}>, note: string }} */
export function resolveProtocolAdminView(entry, order) {
  entry = entry || {};

  var raw;
  if (entry.someFields) {
    raw = rowsFromSomeFields(entry.someFields);
  } else if (looksLikeSomeBlock(entry.indicationText)) {
    var parsed = rowsFromSomeBlock(entry.indicationText);
    var noteFromBlock = '';
    parsed.rows = parsed.rows.filter(function (row) {
      if (row.label === 'Notas') {
        noteFromBlock = row.value;
        return false;
      }
      return true;
    });
    raw = {
      drug: parsed.drug || humanizeDrugName(entry.title),
      rows: parsed.rows,
      note: noteFromBlock,
    };
  } else if (order && !isMessySomeOrder(order)) {
    raw = rowsFromSomeOrder(order);
  } else {
    raw = rowsFromIndicationText(entry, order);
  }

  return normalizeAdminView(raw);
}

/**
 * @param {string} text
 * @param {{ label?: string, title?: string }} [opts]
 * @returns {{ drug: string, rows: Array<{label:string,value:string}>, note: string }|null}
 */
export function resolveClinicalTextAdminView(text, opts) {
  opts = opts || {};
  text = trim(text);
  if (!text) return null;

  var altLead = text.match(/^alternativa\s*:\s*(.+)$/i);
  if (altLead) {
    var altBody = trim(altLead[1]);
    var altDrug = inferDrugNameFromText(altBody) || humanizeDrugName(opts.label || '') || 'Alternativa';
    if (looksLikeClinicalDoseText(altBody)) {
      return normalizeAdminView(
        rowsFromIndicationText({ title: altDrug, indicationText: altBody }, null)
      );
    }
  }

  var drugTitle =
    humanizeDrugName(opts.label || opts.title || '') || inferDrugNameFromText(text) || '—';

  var regimen = parseDrugRegimen(text);
  if (regimen && (regimen.bolo || regimen.infusion)) {
    var drug = /^[A-Za-zÁÉÍÓÚÑ]/.test(trim(regimen.drug))
      ? humanizeDrugName(regimen.drug)
      : drugTitle;
    var route = extractRoute(regimen.bolo + ' ' + text);
    var rows = [];
    var dosePart = regimen.bolo || (/^\d/.test(trim(regimen.drug)) ? trim(regimen.drug) : '');
    if (dosePart) rows.push({ label: 'Dosis', value: humanizeAdminValue(dosePart) });
    if (route) rows.push({ label: 'Vía', value: route });
    var noteParts = [];
    if (regimen.infusion) noteParts.push(humanizeAdminValue(regimen.infusion));
    if (regimen.prep) noteParts.push(humanizeAdminValue(regimen.prep));
    if (regimen.alt) noteParts.push('Alternativa: ' + humanizeAdminValue(regimen.alt));
    var tail = restAfterFirstSentence(text);
    if (tail) noteParts.push(humanizeAdminValue(tail));
    return normalizeAdminView({ drug: drug, rows: rows, note: noteParts.join('; ') });
  }

  if (!looksLikeClinicalDoseText(text)) return null;

  var body = text;
  var metaTail = restAfterFirstSentence(text);
  if (/^meta\b/i.test(metaTail)) {
    body = firstSentence(text);
  }

  var view = normalizeAdminView(
    rowsFromIndicationText({ title: drugTitle, indicationText: body }, null)
  );
  if (/^meta\b/i.test(metaTail)) {
    view.note = humanizeAdminValue([view.note, metaTail].filter(Boolean).join('; '));
  }
  return view;
}

function appendAdminRow(grid, label, value, lines) {
  value = trim(value);
  lines = lines || null;
  if ((!value || value === '—') && !(lines && lines.length)) return;

  var row = document.createElement('div');
  row.className = 'manejo-proto-admin-row';
  if (lines && lines.length) row.className += ' manejo-proto-admin-row--stacked';

  var lbl = document.createElement('span');
  lbl.className = 'manejo-proto-admin-label';
  lbl.textContent = label;

  var val = document.createElement('div');
  val.className = 'manejo-proto-admin-val';
  if (lines && lines.length) {
    val.className += ' manejo-proto-admin-val--stacked';
    lines.forEach(function (line) {
      var item = document.createElement('div');
      item.className = 'manejo-proto-admin-dose-line';
      var tag = document.createElement('span');
      tag.className = 'manejo-proto-admin-dose-tag';
      tag.textContent = line.tag;
      var txt = document.createElement('span');
      txt.className = 'manejo-proto-admin-dose-text';
      txt.textContent = line.text;
      item.appendChild(tag);
      item.appendChild(txt);
      val.appendChild(item);
    });
  } else {
    val.textContent = value;
  }

  row.appendChild(lbl);
  row.appendChild(val);
  grid.appendChild(row);
}

function buildAdminGridShell(drug, rows, note, opts) {
  opts = opts || {};
  var wrap = document.createElement('div');
  wrap.className = 'manejo-proto-admin' + (opts.compact ? ' manejo-proto-admin--compact' : '');

  if (drug && !opts.hideDrug) {
    var head = document.createElement('div');
    head.className = 'manejo-proto-admin-head';
    var drugEl = document.createElement('span');
    drugEl.className = 'manejo-proto-admin-drug';
    drugEl.textContent = drug;
    head.appendChild(drugEl);
    wrap.appendChild(head);
  }

  var grid = document.createElement('div');
  grid.className = 'manejo-proto-admin-grid';
  (rows || []).forEach(function (row) {
    appendAdminRow(grid, row.label, row.value, row.lines);
  });
  if (grid.childElementCount) wrap.appendChild(grid);

  if (note) {
    var noteEl = document.createElement('p');
    noteEl.className = 'manejo-proto-admin-note';
    noteEl.textContent = note;
    wrap.appendChild(noteEl);
  }

  if (!wrap.childElementCount) {
    wrap.textContent = '—';
  }
  return wrap;
}

/**
 * @param {{ drug?: string, rows?: Array<{label:string,value:string}>, note?: string }} view
 * @param {{ compact?: boolean }} [opts]
 */
export function buildAdminGridElement(view, opts) {
  opts = opts || {};
  view = normalizeAdminView(view);
  return buildAdminGridShell(view.drug, view.rows, view.note, opts);
}

/**
 * @param {object} entry
 * @param {object|null} order
 * @param {{ compact?: boolean }} [opts]
 */
export function buildProtocolAdminElement(entry, order, opts) {
  opts = opts || {};
  var view = resolveProtocolAdminView(entry, order);
  return buildAdminGridShell(view.drug, view.rows, view.note, opts);
}

export function adminNoteOverlapsEntryNotes(note, notes) {
  note = trim(note).toLowerCase();
  if (!note) return false;
  return (notes || []).some(function (n) {
    var t = trim(n).toLowerCase();
    return t && (note.indexOf(t) >= 0 || t.indexOf(note) >= 0);
  });
}

export { humanizeAdminValue, looksLikeSomeBlock, isMessySomeOrder };
