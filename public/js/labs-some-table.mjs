/**
 * Parser y exportación de tablas SOME por tipo de estudio (departamento + subgrupo).
 * Complementa procesarLabs: conserva filas tabulares del reporte original.
 */
import { buildTableTsv, copyTableModelAsPng, copyTableText } from './tend-export.mjs';

export const SOME_DEPARTMENTS = [
  'HEMATOLOGIA',
  'QUIMICA CLINICA',
  'BACTERIOLOGIA',
  'GASOMETRIA',
  'GASOMETRIAS',
  'INMUNOLOGIA',
  'COAGULACION',
  'URIANALISIS',
  'EXAMEN GENERAL DE ORINA',
  'ANALISIS DE ORINA',
  'CULTIVO',
  'BANDEJA',
];

const DEPT_RE = new RegExp(
  '^(' +
    SOME_DEPARTMENTS.map(function (d) {
      return d.replace(/\s+/g, '\\s+');
    }).join('|') +
    ')$',
  'i'
);

function normLine(raw) {
  return String(raw == null ? '' : raw).replace(/\r/g, '').trim();
}

function cleanValue(raw) {
  return normLine(raw).replace(/^\*+\s*/, '').trim();
}

function cleanEstudio(raw) {
  return normLine(raw).replace(/\t+$/, '').trim();
}

function isTableHeaderLine(line) {
  var u = line.toUpperCase();
  return /ESTUDIO/.test(u) && /RESULTADO/.test(u);
}

function isDepartmentLine(line) {
  var c = cleanEstudio(line).toUpperCase();
  return DEPT_RE.test(c);
}

function departmentKey(line) {
  var c = cleanEstudio(line).toUpperCase();
  var m = c.match(DEPT_RE);
  if (!m) return '';
  var hit = SOME_DEPARTMENTS.find(function (d) {
    return d.replace(/\s+/g, ' ') === m[1].replace(/\s+/g, ' ');
  });
  return hit || m[1];
}

function isFlagToken(tok) {
  return /^(\*|A|B|CB|CA)$/i.test(String(tok || '').trim());
}

function isAbnormalFlag(flag) {
  return /^(\*|A|B|CB|CA)$/i.test(String(flag || '').trim()) && String(flag).trim() !== '*';
}

/** Departamentos que se muestran como una sola tabla (sin subgrupos). */
const FLATTEN_DEPT_KEYS = {
  'QUIMICA CLINICA': true,
  'EXAMEN GENERAL DE ORINA': true,
  'ANALISIS DE ORINA': true,
  'URIANALISIS': true,
};

const CITO_GROUP_RE = /CITOQUIMICO\s+DE\s+LIQUIDOS\s+CORPORALES/i;

function normalizeDeptKey(key) {
  return String(key || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function isSkippedGroupTitle(name) {
  var u = cleanEstudio(name).toUpperCase();
  return isCommentNoiseEstudio(u) || /^OBSERVACIONES?\b/.test(u);
}

function isCommentNoiseEstudio(name) {
  var u = cleanEstudio(name).toUpperCase();
  if (u === 'COMENTARIO') return false;
  return (
    /^COMENTARIOS?\s+DE(?:\s+LA)?\s+MUESTRA\b/.test(u) ||
    /^OBSERVACIONES?\b/.test(u) ||
    /^OBSERVACION\b/.test(u) ||
    /^OBS\b/.test(u) ||
    /^SIN\s+VALOR\b/.test(u) ||
    /^TEXTO\s+LIBRE\b/.test(u) ||
    /^VALOR\s+DE\s+REFERENCIA\b/.test(u) ||
    /^NOTA(?:S)?\s+(?:DE\s+)?MUESTRA\b/.test(u)
  );
}

function isCitoGroupTitle(title) {
  return CITO_GROUP_RE.test(String(title || ''));
}

function isSectionDividerEstudio(name) {
  var u = cleanEstudio(name).toUpperCase();
  return /^(FISICO|QUIMICO|SEDIMENTO|MICROSCOPICO)$/.test(u);
}

function skipSectionDividerBlock(lines, startIdx) {
  var label = cleanEstudio(lines[startIdx] || '');
  var i = startIdx + 1;
  while (i < lines.length) {
    var p = cleanEstudio(lines[i]);
    i++;
    if (!p) continue;
    if (isTableHeaderLine(p) || isDepartmentLine(p)) {
      i--;
      break;
    }
    if (isFlagToken(p)) continue;
    if (p.toUpperCase() === label.toUpperCase()) continue;
    if (p === ':' || /^AUSENTE$/i.test(p)) continue;
    break;
  }
  return i;
}

function isCultureGroupTitle(title) {
  var t = cleanEstudio(title);
  if (!t) return false;
  return isCultureSampleTitle(t, ['PRODUCTO']);
}

function pruneSomeCultureRows(rows) {
  return (rows || []).filter(function (r) {
    if (!r || !r.estudio || isSectionDividerRow(r)) return false;
    var res = String(r.resultado || '').trim();
    if (/^MICROORGANISMO|^CUENTA|^COMENTARIO/i.test(r.estudio)) {
      return !!res && res !== ':' && res !== '—';
    }
    if (!res || res === ':' || res === '—') return false;
    return true;
  });
}

function pruneSomeRows(rows) {
  var out = [];
  (rows || []).forEach(function (r) {
    if (!r || !r.estudio || isSectionDividerRow(r)) return;
    var res = String(r.resultado || '').trim();
    if (!res || res === ':' || res === '—') return;
    var key = r.estudio.toUpperCase();
    var idx = -1;
    for (var k = 0; k < out.length; k++) {
      if (out[k].estudio.toUpperCase() === key) {
        idx = k;
        break;
      }
    }
    if (idx >= 0) {
      var prevRes = String(out[idx].resultado || '').trim();
      if (!prevRes || prevRes === '—') out[idx] = r;
      return;
    }
    out.push(r);
  });
  return out;
}

function isSectionDividerRow(row) {
  if (!row) return false;
  var u = String(row.estudio || '')
    .trim()
    .toUpperCase();
  if (isSectionDividerEstudio(u)) return true;
  if (/^EXAMEN\s+QUIMICO$/.test(u)) return true;
  if (/^CITOQUIMICO\s+DE\s*$/.test(u)) return true;
  var res = String(row.resultado || '').trim();
  if ((res === ':' || res === '') && !row.unidades && !row.ref && /^EXAMEN\b/.test(u)) return true;
  return false;
}

/** Resultado con unidades integradas (todas las tablas SOME). */
export function formatSomeResultado(row) {
  if (!row) return '—';
  var val = String(row.resultado == null ? '' : row.resultado).trim();
  if (!val) return '—';
  var units = String(row.unidades || '').trim();
  return units ? val + ' ' + units : val;
}

function isMetadataLine(line) {
  var t = line.trim();
  if (!t) return true;
  if (/^(Expediente|Solicitud|Nombre|Sexo|Edad|Ubicaci[oó]n|M[eé]dico|Fecha\s+Registro)\s*:/i.test(t)) {
    return true;
  }
  if (/^[A-Za-z]{3}\s+\d{1,2}\s+\d{4}/.test(t) && t.indexOf('\t') !== -1) return true;
  return false;
}

/** Quita Expediente/Solicitud pegados al valor (copia parcial al final del reporte). */
function stripSomeInlineMetadata(raw) {
  var t = String(raw == null ? '' : raw).trim();
  if (!t) return '';
  if (/^(?:Expediente|Solicitud)\s*:/i.test(t)) return '';
  return t.replace(/\s*(?:Expediente|Solicitud)\s*:[\s\S]*$/i, '').trim();
}

function lineHasSomeMetadata(line) {
  var t = String(line || '').trim();
  if (!t) return false;
  if (isMetadataLine(t)) return true;
  return /\b(?:Expediente|Solicitud)\s*:/i.test(t);
}

/** SOME row header: estudio line then flag (or duplicate estudio) before valores. */
function isStudyRowHeader(line, nextLines) {
  var name = cleanEstudio(line);
  if (!name || isTableHeaderLine(name) || isDepartmentLine(name) || isFlagToken(name)) {
    return false;
  }
  if (/^\d+([.,]\d+)?$/.test(name) || name === ':') return false;
  if (isSkippedGroupTitle(name) || isCommentNoiseEstudio(name)) return false;
  if (!/[A-ZÁÉÍÓÚÑ]/.test(name)) return false;
  var n0 = cleanEstudio(nextLines[0] || '');
  var n1 = cleanEstudio(nextLines[1] || '');
  if (n0 && n0.toUpperCase() === name.toUpperCase()) return true;
  if (isFlagToken(n0)) return true;
  if (n0 && n0.toUpperCase() === name.toUpperCase() && isFlagToken(n1)) return true;
  return false;
}

/** Analitos de química sérica que siguen al bloque de citoquímico en el mismo departamento. */
function isSerumQcAnalyte(name) {
  return /^(ALBUMINA|COLESTEROL|TRIGLICERIDOS)\b/i.test(String(name || '').trim());
}

function isLikelyGroupTitle(line, nextLines, currentGroupTitle) {
  var name = cleanEstudio(line);
  if (!name || isTableHeaderLine(name) || isDepartmentLine(name)) return false;
  if (/^COMENTARIO$/i.test(name)) return false;
  if (/^EXAMEN\s+QUIMICO$/i.test(name)) return false;
  if (isFlagToken(name)) return false;
  if (/^\d+([.,]\d+)?$/.test(name)) return false;
  if (name === ':') return false;
  if (looksLikeUnitsRefLine(name)) return false;
  if (currentGroupTitle && name.toUpperCase() === String(currentGroupTitle).toUpperCase()) return false;
  if (!/[A-ZÁÉÍÓÚÑ]/.test(name)) return false;
  var upper = name.toUpperCase();
  if (upper !== name && upper.replace(/[^A-ZÁÉÍÓÚÑ0-9\s/().-]/g, '') !== upper) return false;

  for (var i = 0; i < Math.min(nextLines.length, 4); i++) {
    var n = cleanEstudio(nextLines[i]);
    if (!n) continue;
    if (isTableHeaderLine(n)) return true;
    if (isDepartmentLine(n)) return true;
    if (n.toUpperCase().indexOf(upper + ' ') === 0) return true;
    break;
  }
  return /\b(CITOQUIMICO DE|LIQUIDOS CORPORALES|BIOMETRIA HEMATICA|TIEMPO DE|EXAMEN GENERAL DE ORINA|FISICOQUIMICO|FIBRAS VEGETALES|RELACION A\/G|PLAQUETAS CON|FROTIS|VELOCIDAD DE)\b/i.test(
    name
  );
}

function stripCommentNoiseFromDepartment(dept) {
  if (!dept || !dept.groups) return dept;
  dept.groups = dept.groups
    .map(function (g) {
      var title = cleanEstudio(g.title || '');
      if (isSkippedGroupTitle(title) || isCommentNoiseEstudio(title)) return null;
      g.rows = (g.rows || []).filter(function (r) {
        return r && !isCommentNoiseEstudio(r.estudio) && !isSkippedGroupTitle(r.estudio);
      });
      return g;
    })
    .filter(function (g) {
      return g && g.rows && g.rows.length > 0;
    });
  return dept;
}

function looksLikeReferenceValue(line) {
  var t = String(line || '').trim();
  if (!t) return false;
  if (/^(NEGATIVO|POSITIVO|AUSENTE|AUSENTES|N\/A|NA)$/.test(t)) return true;
  if (/^\d/.test(t) && /\s-\s/.test(t)) return true;
  if (/^\d+([.,]\d+)?\s*-\s*\d+([.,]\d+)?(\/[A-Za-z]+)?$/i.test(t)) return true;
  return false;
}

function looksLikeQualitativeResult(line) {
  var t = String(line || '').trim();
  if (!t) return false;
  return /^(negativo|positivo|ausente|ausentes|escasas?|abundantes?|moderadas?|claro|amarillo|turbi[do]a?|presente|no\s+detectado)$/i.test(
    t
  );
}

function looksLikeUnitsRefLine(line) {
  var t = String(line || '').trim();
  if (!t) return false;
  if (looksLikeQualitativeResult(t)) return false;
  if (/\t/.test(t)) {
    var left = t.split('\t')[0].trim();
    if (left && !/^\d/.test(left)) return true;
    if (/\d/.test(t)) return true;
  }
  if (looksLikeReferenceValue(t)) return true;
  if (/^\d/.test(t) && /\s-\s/.test(t)) return true;
  if (
    /^(g\/dL|mg\/dL|mmol\/L|K\/uL|M\/uL|mm\/hr|mm3|\/CAMPO|UI\/L|IU\/L|E\.U\.|Hem\/uL|Leucocitos\/uL|%|SEG\.?|fL|pg)$/i.test(
      t
    )
  ) {
    return true;
  }
  if (/^[A-Za-z][A-Za-z0-9/.%\-]*\/[A-Za-z0-9/.%\-]+$/i.test(t)) return true;
  return false;
}

function parseUnitsRef(line) {
  var t = stripSomeInlineMetadata(line);
  if (!t) return { unidades: '', ref: '' };
  var tab = t.indexOf('\t');
  if (tab >= 0) {
    return {
      unidades: stripSomeInlineMetadata(t.slice(0, tab)),
      ref: stripSomeInlineMetadata(t.slice(tab + 1)),
    };
  }
  if (looksLikeReferenceValue(t)) {
    return { unidades: '', ref: t };
  }
  if (/^\d/.test(t) && /\s-\s/.test(t) && !/[a-zA-Z]{3,}/.test(t.split(/\s-\s/)[0])) {
    return { unidades: '', ref: t };
  }
  return { unidades: t, ref: '' };
}

/** Campos típicos de informes SOME de cultivos (uro/hemo/aspirado, etc.). */
var CULTURE_FIELD_RE =
  /^(PRODUCTO|TINCION|CALIDAD|ESTADO(\s+DE)?\s+CULTIVO|REPORTE\s+PRELIMINAR|MICROORGANISMO|COMENTARIO:?|CUENTA(\s+DE\s+KASS)?|ANTIBIOGRAMA|IDENTIFICACION)/i;

function isCultureFieldLine(line) {
  var n = cleanEstudio(line);
  return !!(n && CULTURE_FIELD_RE.test(n));
}

function isCultureSampleTitle(line, nextLines) {
  var name = cleanEstudio(line);
  if (!name || isFlagToken(name) || isDepartmentLine(name) || isTableHeaderLine(name)) return false;
  if (isCultureFieldLine(name)) return false;
  if (isCitoGroupTitle(name) || /^FIBRAS\s+VEGETALES$/i.test(name)) return false;
  if (/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(name)) return false;
  if (
    /^(ASPIRADO|UROCULTIVO|HEMOCULTIVO|FUNGICULTIVO|CATETER|LIQUIDO|SECRECION|ABSCESO|BRONCOALVEOLAR|CULTIVO)\b/i.test(
      name
    )
  ) {
    return true;
  }
  if (name !== name.toUpperCase()) return false;
  for (var i = 0; i < Math.min(nextLines.length, 8); i++) {
    var n = cleanEstudio(nextLines[i]);
    if (!n || isFlagToken(n)) continue;
    if (/^PRODUCTO|^TINCION|^CALIDAD|^ESTADO(\s+DE)?\s+CULTIVO/i.test(n)) return true;
    if (n.toUpperCase() === name.toUpperCase()) continue;
    break;
  }
  return false;
}

function cultureBlockEndIdx(lines, startIdx) {
  for (var k = startIdx + 1; k < lines.length; k++) {
    var t = cleanEstudio(lines[k]);
    if (!t || isFlagToken(t)) continue;
    if (isDepartmentLine(t) || isTableHeaderLine(t)) return k;
    if (k > startIdx + 1 && isCultureSampleTitle(t, lines.slice(k + 1))) return k;
  }
  return lines.length;
}

function readCultureSomeRowAt(lines, startIdx, endIdx) {
  var estudio = cleanEstudio(lines[startIdx]);
  if (!estudio || !isCultureFieldLine(estudio)) return null;

  var j = startIdx + 1;
  var flag = '*';
  var parts = [];

  while (j < endIdx) {
    var t = cleanEstudio(lines[j]);
    j++;
    if (!t) continue;
    if (isCultureFieldLine(t) || isCultureSampleTitle(t, lines.slice(j))) {
      j--;
      break;
    }
    if (isDepartmentLine(t) || isTableHeaderLine(t)) {
      j--;
      break;
    }
    if (!parts.length && isFlagToken(t)) {
      var peek = cleanEstudio(lines[j] || '');
      if (peek && (isCultureFieldLine(peek) || isCultureSampleTitle(peek, lines.slice(j + 1)))) {
        break;
      }
      flag = t;
      continue;
    }
    if (t.toUpperCase() === estudio.toUpperCase()) continue;
    parts.push(t);
    if (/^MICROORGANISMO$/i.test(estudio) || /^CUENTA/i.test(estudio)) break;
    if (
      /^PRODUCTO$|^TINCION|^CALIDAD|^ESTADO|^REPORTE\s+PRELIMINAR/i.test(estudio) &&
      parts.length >= 1
    ) {
      break;
    }
  }

  var row = finalizeRow(estudio, flag, parts);
  if (!row) return null;
  return { row: row, nextIdx: j };
}

function parseBacteriologiaCultureGroup(lines, startIdx) {
  var title = cleanEstudio(lines[startIdx]);
  var endIdx = cultureBlockEndIdx(lines, startIdx);
  var rows = [];
  var i = startIdx + 1;
  while (i < endIdx) {
    var parsed = readCultureSomeRowAt(lines, i, endIdx);
    if (!parsed) {
      i++;
      continue;
    }
    rows.push(parsed.row);
    i = parsed.nextIdx;
  }
  return { title: title, rows: rows, nextIdx: endIdx };
}

function finalizeRow(estudio, flag, valueParts) {
  var est = cleanEstudio(estudio);
  if (!est) return null;
  var flagTok = isFlagToken(flag) ? flag.trim() : '*';
  var value = '';
  var unidades = '';
  var ref = '';
  for (var i = 0; i < valueParts.length; i++) {
    var p = cleanValue(stripSomeInlineMetadata(valueParts[i]));
    if (!p) continue;
    if (lineHasSomeMetadata(p)) continue;
    if (!value && p !== ':' && p !== '—') {
      value = p;
      continue;
    }
    if (value === ':' && p !== ':' && p !== '—') {
      value = p;
      continue;
    }
    var ur = parseUnitsRef(p);
    if (!unidades && ur.unidades) unidades = ur.unidades;
    if (!ref && ur.ref) ref = ur.ref;
    if (!unidades && !ref && p !== value) {
      if (/^\d/.test(p) && /\s-\s/.test(p)) ref = p;
      else if (!unidades) unidades = p;
    }
  }
  return {
    estudio: est,
    flag: flagTok,
    resultado: value,
    unidades: unidades,
    ref: ref,
    abnormal: isAbnormalFlag(flagTok),
  };
}

function readRowAt(lines, startIdx, currentGroupTitle) {
  var estudio = cleanEstudio(lines[startIdx]);
  if (
    !estudio ||
    isFlagToken(estudio) ||
    isTableHeaderLine(estudio) ||
    isDepartmentLine(estudio) ||
    isSkippedGroupTitle(estudio) ||
    isCommentNoiseEstudio(estudio) ||
    isSectionDividerEstudio(estudio) ||
    estudio === ':' ||
    estudio === '—'
  ) {
    return null;
  }

  var j = startIdx + 1;
  var flag = '*';
  var parts = [];

  while (j < lines.length) {
    var raw = lines[j];
    var t = cleanEstudio(raw);
    j++;
    if (!t) continue;
    if (isTableHeaderLine(t) || isDepartmentLine(t)) {
      j--;
      break;
    }
    if (!parts.length && isFlagToken(t)) {
      var peekAfterFlag = cleanEstudio(lines[j] || '');
      if (
        /^COMENTARIO/i.test(estudio) &&
        peekAfterFlag &&
        /^(CUENTA|MICROORGANISMO|ANTIBIOGRAMA)\b/i.test(peekAfterFlag)
      ) {
        break;
      }
      flag = t;
      continue;
    }
    if (t.toUpperCase() === estudio.toUpperCase()) {
      continue;
    }
    if (lineHasSomeMetadata(t)) {
      var withoutMeta = stripSomeInlineMetadata(t);
      if (!withoutMeta || /^\d+-\d+$/.test(withoutMeta)) {
        j--;
        break;
      }
      parts.push(withoutMeta);
      continue;
    }
    if (isLikelyGroupTitle(t, lines.slice(j), currentGroupTitle)) {
      var stopRow =
        parts.length > 0 ||
        isCitoGroupTitle(t) ||
        /\b(FIBRAS VEGETALES|BIOMETRIA HEMATICA|TIEMPO DE|FROTIS)\b/i.test(t);
      if (stopRow) {
        j--;
        break;
      }
    }
    parts.push(t);
    if (parts.length > 1 && looksLikeUnitsRefLine(t)) {
      var nxtRef = cleanEstudio(lines[j] || '');
      if (
        nxtRef &&
        looksLikeReferenceValue(nxtRef) &&
        !isFlagToken(cleanEstudio(lines[j + 1] || ''))
      ) {
        parts.push(nxtRef);
        j++;
      }
      break;
    }
    if (parts.length >= 1) {
      var nxt = cleanEstudio(lines[j] || '');
      var nxtFlag = cleanEstudio(lines[j + 1] || '');
      if (nxt && isFlagToken(nxtFlag)) break;
    }
    if (parts.length >= 4) break;
  }

  var row = finalizeRow(estudio, flag, parts);
  if (!row) return null;
  return { row: row, nextIdx: j };
}

/**
 * @param {string} textoBruto — reporte SOME completo
 * @returns {{ departments: Array<{ key: string, label: string, groups: Array<{ title: string, rows: object[] }> }> }}
 */
export function parseSomeReportTables(textoBruto) {
  if (!textoBruto || typeof textoBruto !== 'string') {
    return { departments: [] };
  }

  var lines = textoBruto.replace(/\r/g, '').split('\n');
  var departments = [];
  var currentDept = null;
  var currentGroup = null;
  var skipSection = false;

  function ensureDept(key) {
    if (currentDept && currentDept.key === key) return currentDept;
    currentDept = { key: key, label: key, groups: [] };
    departments.push(currentDept);
    currentGroup = null;
    return currentDept;
  }

  function ensureGroup(title) {
    if (!currentDept) return null;
    var t = title || '';
    if (currentGroup && currentGroup.title === t) return currentGroup;
    currentGroup = {
      title: t,
      rows: [],
      tableVariant: isCitoGroupTitle(t) ? 'cito' : 'standard',
      fluidSource: '',
    };
    currentDept.groups.push(currentGroup);
    return currentGroup;
  }

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var trimmed = cleanEstudio(line);
    if (!trimmed || isMetadataLine(trimmed)) continue;

    if (isDepartmentLine(trimmed)) {
      ensureDept(departmentKey(trimmed));
      currentGroup = null;
      skipSection = false;
      continue;
    }

    if (isTableHeaderLine(trimmed)) continue;

    if (!currentDept) continue;

    if (
      normalizeDeptKey(currentDept.key) === 'BACTERIOLOGIA' &&
      isCultureSampleTitle(trimmed, lines.slice(i + 1))
    ) {
      var cultBlock = parseBacteriologiaCultureGroup(lines, i);
      ensureGroup(cultBlock.title);
      cultBlock.rows.forEach(function (r) {
        currentGroup.rows.push(r);
      });
      i = cultBlock.nextIdx - 1;
      continue;
    }

    if (isSectionDividerRow({ estudio: trimmed, resultado: '', unidades: '', ref: '' })) {
      continue;
    }

    if (trimmed === ':' || trimmed === '—') continue;

    if (isSectionDividerEstudio(trimmed)) {
      i = skipSectionDividerBlock(lines, i) - 1;
      continue;
    }

    if (/^TIPO\s+DE\s+MUESTRA$/i.test(trimmed)) {
      i++;
      while (i < lines.length) {
        var tipoNext = cleanEstudio(lines[i]);
        i++;
        if (!tipoNext) continue;
        if (isFlagToken(tipoNext)) continue;
        if (isCitoGroupTitle(tipoNext) || CITO_GROUP_RE.test(tipoNext)) {
          ensureGroup(tipoNext);
          continue;
        }
        break;
      }
      // for-loop always increments i; back up two so the next line (e.g. RECUENTO) is parsed
      i = i - 2;
      continue;
    }

    if (/^COMENTARIO$/i.test(trimmed)) {
      var fluidVal = '';
      var fj = i + 1;
      while (fj < lines.length) {
        var fline = cleanEstudio(lines[fj]);
        fj++;
        if (!fline) break;
        if (isDepartmentLine(fline) || isTableHeaderLine(fline)) {
          fj--;
          break;
        }
        if (isFlagToken(fline)) continue;
        fluidVal = fline;
        break;
      }
      if (currentGroup) {
        currentGroup.fluidSource = fluidVal || currentGroup.fluidSource || '';
      }
      i = fj - 1;
      continue;
    }

    if (isSkippedGroupTitle(trimmed)) {
      skipSection = true;
      currentGroup = null;
      continue;
    }

    if (skipSection) {
      if (!isCommentNoiseEstudio(trimmed)) {
        var resumeIdx = i;
        var nextTrim = cleanEstudio(lines[i + 1] || '');
        if (nextTrim && nextTrim.toUpperCase() === trimmed.toUpperCase()) resumeIdx = i + 1;
        var resumeParsed = readRowAt(lines, resumeIdx, currentGroup && currentGroup.title);
        if (
          resumeParsed &&
          resumeParsed.row &&
          !isCommentNoiseEstudio(resumeParsed.row.estudio) &&
          resumeParsed.row.resultado &&
          !isFlagToken(resumeParsed.row.resultado)
        ) {
          skipSection = false;
          if (!currentGroup) ensureGroup('');
          currentGroup.rows.push(resumeParsed.row);
          i = resumeParsed.nextIdx - 1;
        }
      }
      continue;
    }

    if (isLikelyGroupTitle(trimmed, lines.slice(i + 1), currentGroup && currentGroup.title)) {
      if (FLATTEN_DEPT_KEYS[normalizeDeptKey(currentDept.key)]) {
        if (isCitoGroupTitle(trimmed)) {
          ensureGroup(trimmed);
          var citoDup = cleanEstudio(lines[i + 1] || '');
          if (citoDup && citoDup.toUpperCase() === trimmed.toUpperCase()) {
            var citoParsed = readRowAt(lines, i + 1, trimmed);
            if (citoParsed && citoParsed.row) {
              currentGroup.rows.push(citoParsed.row);
              i = citoParsed.nextIdx - 1;
            } else {
              i++;
            }
          }
          continue;
        }
        ensureGroup('');
        var flatParsed = readRowAt(lines, i, '');
        if (flatParsed && flatParsed.row) {
          currentGroup.rows.push(flatParsed.row);
          i = flatParsed.nextIdx - 1;
        }
        continue;
      }
      ensureGroup(trimmed);
      var dup = cleanEstudio(lines[i + 1] || '');
      if (dup && dup.toUpperCase() === trimmed.toUpperCase()) {
        var parsedDup = readRowAt(lines, i + 1, trimmed);
        if (parsedDup && parsedDup.row) {
          currentGroup.rows.push(parsedDup.row);
          i = parsedDup.nextIdx - 1;
        } else {
          i++;
        }
      } else {
        i++;
      }
      continue;
    }

    var parsedRow = readRowAt(lines, i, currentGroup && currentGroup.title);
    if (
      parsedRow &&
      parsedRow.row &&
      (isCitoGroupTitle(parsedRow.row.resultado) || CITO_GROUP_RE.test(parsedRow.row.resultado || ''))
    ) {
      ensureGroup(String(parsedRow.row.resultado).trim());
      i = parsedRow.nextIdx - 1;
      continue;
    }

    if (
      FLATTEN_DEPT_KEYS[normalizeDeptKey(currentDept.key)] &&
      !isCitoGroupTitle(trimmed) &&
      isStudyRowHeader(trimmed, lines.slice(i + 1)) &&
      !(currentGroup && isCitoGroupTitle(currentGroup.title) && !isSerumQcAnalyte(trimmed)) &&
      !isLikelyGroupTitle(trimmed, lines.slice(i + 1), currentGroup && currentGroup.title)
    ) {
      ensureGroup('');
      var flatRow = readRowAt(lines, i, '');
      if (flatRow && flatRow.row) {
        currentGroup.rows.push(flatRow.row);
        i = flatRow.nextIdx - 1;
      }
      continue;
    }

    var parsed = parsedRow;
    if (!parsed || !parsed.row) continue;
    if (!currentGroup) ensureGroup('');
    currentGroup.rows.push(parsed.row);
    i = parsed.nextIdx - 1;
  }

  departments.forEach(function (dept) {
    dept.groups.forEach(function (g) {
      normalizeSomeGroup(g);
    });
    dept.groups = dept.groups.filter(function (g) {
      return g.rows.length > 0;
    });
    if (FLATTEN_DEPT_KEYS[normalizeDeptKey(dept.key)]) {
      flattenDeptGroups(dept);
    }
    stripCommentNoiseFromDepartment(dept);
  });

  return {
    departments: departments.filter(function (d) {
      return d.groups.length > 0;
    }),
  };
}

function normalizeSomeGroup(group) {
  if (!group) return group;
  if (group._someNormalized) return group;
  var isCito = group.tableVariant === 'cito' || isCitoGroupTitle(group.title);
  var fluidSource = group.fluidSource || '';
  var rows = [];
  group.rows.forEach(function (r) {
    if (/^COMENTARIO$/i.test(r.estudio)) {
      fluidSource = String(r.resultado || '').trim() || fluidSource;
      return;
    }
    if (/^TIPO\s+DE\s+MUESTRA$/i.test(r.estudio)) return;
    if (isCitoGroupTitle(r.resultado) || isCitoGroupTitle(r.estudio)) return;
    if (isSectionDividerRow(r)) return;
    rows.push(r);
  });
  if (isCito) {
    var extracted = extractFluidSourceFromRows(rows);
    rows = extracted.rows;
    fluidSource = fluidSource || extracted.fluid || '';
  }
  group.rows = isCultureGroupTitle(group.title) ? pruneSomeCultureRows(rows) : pruneSomeRows(rows);
  group.fluidSource = fluidSource;
  group.tableVariant = isCito ? 'cito' : 'standard';
  group._someNormalized = true;
  return group;
}

function flattenDeptGroupsSimple(dept) {
  var rows = [];
  dept.groups.forEach(function (g) {
    rows = rows.concat(g.rows);
  });
  dept.groups = rows.length ? [{ title: '', rows: rows, tableVariant: 'standard' }] : [];
}

function extractFluidSourceFromRows(rows) {
  var fluid = '';
  var kept = [];
  rows.forEach(function (r) {
    if (/^COMENTARIO$/i.test(r.estudio)) {
      fluid = String(r.resultado || '').trim() || fluid;
      return;
    }
    if (/^LIQUIDO\s+DE\s+/i.test(r.estudio) || /^CITOQUIMICO\s+DE\s*$/i.test(r.estudio)) {
      if (!fluid && r.resultado) fluid = r.resultado;
      if (/^LIQUIDO\s+DE\s+/i.test(r.estudio) && !r.resultado) fluid = r.estudio;
      return;
    }
    if (!isSectionDividerRow(r)) kept.push(r);
  });
  return { fluid: fluid, rows: kept };
}

function flattenQuimicaClinica(dept) {
  var normalRows = [];
  var citoGroups = [];
  dept.groups.forEach(function (g) {
    if (isCitoGroupTitle(g.title) || g.tableVariant === 'cito') {
      var extracted = extractFluidSourceFromRows(g.rows);
      g.rows = extracted.rows;
      g.fluidSource = g.fluidSource || extracted.fluid || '';
      normalizeSomeGroup(g);
      if (g.rows.length) citoGroups.push(g);
    } else {
      g.rows.forEach(function (r) {
        if (!isSectionDividerRow(r)) normalRows.push(r);
      });
    }
  });
  var out = [];
  if (normalRows.length) {
    out.push({ title: '', rows: normalRows, tableVariant: 'standard' });
  }
  citoGroups.forEach(function (g) {
    out.push(g);
  });
  dept.groups = out;
}

function flattenDeptGroups(dept) {
  var key = normalizeDeptKey(dept.key);
  if (key === 'QUIMICA CLINICA') {
    flattenQuimicaClinica(dept);
    return;
  }
  flattenDeptGroupsSimple(dept);
}

export function buildSomeGroupExportModel(group) {
  var g = normalizeSomeGroup(group || { rows: [] });
  var rows = g.rows || [];
  var isCito = g.tableVariant === 'cito';
  var columns = [{ header: 'Resultado', hidden: false }];
  if (!isCito) {
    columns.push({ header: 'Valor de Referencia', hidden: false });
  }
  return {
    theme: isCito ? 'some-cito' : 'some',
    labelHeader: 'Estudio',
    columns: columns,
    rows: rows.map(function (r) {
      var resTxt = formatSomeResultado(r);
      if (r.flag && r.flag !== '*' && resTxt === '—') resTxt = r.flag;
      var cells = [
        {
          text: resTxt,
          abnormal: r.abnormal,
          flag: r.flag,
        },
      ];
      if (!isCito) {
        cells.push({ text: r.ref || '', abnormal: false });
      }
      return {
        label: r.estudio,
        hidden: false,
        cells: cells,
      };
    }),
  };
}

export function buildSomeGroupTsv(group, title) {
  var model = buildSomeGroupExportModel(group);
  var tsv = buildTableTsv(model);
  if (!tsv) return '';
  var lines = tsv.split('\n');
  if (lines.length) lines[0] = lines[0].replace(/^Analito\t/, 'Estudio\t');
  if (title) lines.unshift(String(title));
  return lines.join('\n');
}

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderSomeTableGroupHtml(group, opts) {
  var options = opts || {};
  var g = normalizeSomeGroup(group || { rows: [] });
  var rows = g.rows || [];
  if (!rows.length) return '';

  var isCito = g.tableVariant === 'cito';
  var title = g.title ? String(g.title) : '';
  var tableId = options.tableId || '';
  var exportLabel = options.exportLabel || title || 'Tabla';
  if (!options.exportLabel && isCito && g.fluidSource) {
    exportLabel = (exportLabel + ' — ' + g.fluidSource).trim();
  }

  var deptIndex = options.deptIndex;
  var groupIndex = options.groupIndex;
  var html =
    '<div class="lab-some-group' +
    (isCito ? ' lab-some-group--cito' : '') +
    '"' +
    (tableId ? ' data-table-id="' + escHtml(tableId) + '"' : '') +
    (deptIndex != null ? ' data-dept-index="' + escHtml(String(deptIndex)) + '"' : '') +
    (groupIndex != null ? ' data-group-index="' + escHtml(String(groupIndex)) + '"' : '') +
    ' data-variant="' +
    (isCito ? 'cito' : 'standard') +
    '">';
  if (title && !options.hideGroupTitles) {
    html += '<div class="lab-some-group-title">' + escHtml(title) + '</div>';
  }
  if (isCito && g.fluidSource) {
    html +=
      '<div class="lab-some-fluid-source"><span class="lab-some-fluid-label">Origen del líquido:</span> ' +
      escHtml(g.fluidSource) +
      '</div>';
  }
  if (!options.hideToolbar) {
    var deptAttr =
      deptIndex != null ? ' data-dept-index="' + escHtml(String(deptIndex)) + '"' : '';
    var groupAttr =
      groupIndex != null ? ' data-group-index="' + escHtml(String(groupIndex)) + '"' : '';
    html +=
      '<div class="lab-some-table-toolbar">' +
      '<button type="button" class="lab-some-export-btn" data-export="tsv"' +
      deptAttr +
      groupAttr +
      ' data-label="' +
      escHtml(exportLabel) +
      '" title="Copiar tabla como texto">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>' +
      'TSV</button>' +
      '<button type="button" class="lab-some-export-btn" data-export="png"' +
      deptAttr +
      groupAttr +
      ' data-label="' +
      escHtml(exportLabel) +
      '" title="Copiar tabla como imagen">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>' +
      'PNG</button>' +
      '</div>';
  }
  html += '<div class="lab-some-table-wrap"><table class="lab-some-table lab-some-table--cols-' + (isCito ? '2' : '3') + '"><thead><tr>';
  html += '<th>Estudio</th><th>Resultado</th>';
  if (!isCito) html += '<th>Valor de Referencia</th>';
  html += '</tr></thead><tbody>';
  rows.forEach(function (r) {
    var resClass = r.abnormal ? ' lab-some-abnormal' : '';
    var flagHtml =
      r.flag && r.flag !== '*'
        ? '<span class="lab-some-flag">' + escHtml(r.flag) + '</span> '
        : '';
    var resDisplay = formatSomeResultado(r);
    html += '<tr>';
    html += '<td class="lab-some-estudio">' + escHtml(r.estudio) + '</td>';
    html +=
      '<td class="lab-some-resultado' +
      resClass +
      '" data-unidades="' +
      escHtml(r.unidades || '') +
      '" data-ref="' +
      escHtml(r.ref || '') +
      '">' +
      flagHtml +
      escHtml(resDisplay) +
      '</td>';
    if (!isCito) {
      html += '<td class="lab-some-ref">' + escHtml(r.ref || '') + '</td>';
    }
    html += '</tr>';
  });
  html += '</tbody></table></div></div>';
  return html;
}

function renderSomeDeptExportActions(deptLabel, deptIndex) {
  var label = escHtml(deptLabel);
  return (
    '<span class="lab-some-dept-summary-actions" onclick="event.stopPropagation()">' +
    '<button type="button" class="lab-some-export-btn lab-some-dept-export-btn" data-export="tsv" data-dept-index="' +
    deptIndex +
    '" data-label="' +
    label +
    '" title="Copiar sección como texto">TSV</button>' +
    '<button type="button" class="lab-some-export-btn lab-some-dept-export-btn" data-export="png" data-dept-index="' +
    deptIndex +
    '" data-label="' +
    label +
    '" title="Copiar sección como imagen">PNG</button>' +
    '</span>'
  );
}

export function buildSomeDeptTsv(dept, title) {
  var tsv = buildTableTsv(buildSomeDeptExportModel(dept, title));
  if (!tsv) return '';
  var lines = tsv.split('\n');
  if (lines.length) lines[0] = lines[0].replace(/^Analito\t/, 'Estudio\t');
  if (title) lines.unshift(String(title));
  return lines.join('\n');
}

export function buildSomeDeptExportModel(dept, title) {
  var rows = [];
  (dept.groups || []).forEach(function (group) {
    var g = normalizeSomeGroup(group);
    var isCito = g.tableVariant === 'cito';
    (g.rows || []).forEach(function (r) {
      var resTxt = formatSomeResultado(r);
      var cells = [{ text: resTxt, abnormal: r.abnormal, flag: r.flag }];
      if (!isCito) cells.push({ text: r.ref || '', abnormal: false });
      rows.push({ label: r.estudio, cells: cells });
    });
  });
  var hasCitoOnly =
    dept.groups &&
    dept.groups.length &&
    dept.groups.every(function (g) {
      return normalizeSomeGroup(g).tableVariant === 'cito';
    });
  return {
    theme: hasCitoOnly ? 'some-cito' : 'some',
    labelHeader: 'Estudio',
    columns: hasCitoOnly
      ? [{ header: 'Resultado', hidden: false }]
      : [
          { header: 'Resultado', hidden: false },
          { header: 'Valor de Referencia', hidden: false },
        ],
    rows: rows,
  };
}

export function renderSomeReportTablesHtml(parsed, opts) {
  var options = opts || {};
  if (!parsed || !parsed.departments || !parsed.departments.length) return '';

  var modalLayout = !!options.modalLayout;
  var html = '<div class="lab-some-tables' + (modalLayout ? ' lab-some-tables--modal' : '') + '">';
  parsed.departments.forEach(function (dept, di) {
    html +=
      '<section class="lab-some-dept" data-dept="' +
      escHtml(dept.key) +
      '" data-dept-index="' +
      di +
      '">';
    if (modalLayout) {
      html +=
        '<details class="lab-some-dept-details" open><summary class="lab-some-dept-summary">' +
        '<span class="lab-some-dept-summary-label">' +
        escHtml(dept.label) +
        '</span>' +
        renderSomeDeptExportActions(dept.label, di) +
        '</summary><div class="lab-some-dept-body">';
    } else {
      html += '<header class="lab-some-dept-header">' + escHtml(dept.label) + '</header>';
    }
    dept.groups.forEach(function (group, gi) {
      var tableId = 'some-' + di + '-' + gi;
      var g = normalizeSomeGroup(group);
      var exportLabel = (dept.label + (g.title ? ' — ' + g.title : '')).trim();
      if (g.tableVariant === 'cito' && g.fluidSource) {
        exportLabel += ' — ' + g.fluidSource;
      }
      html += renderSomeTableGroupHtml(g, {
        tableId: tableId,
        exportLabel: exportLabel,
        hideGroupTitles: !!options.hideGroupTitles,
        hideToolbar: modalLayout,
        deptIndex: di,
        groupIndex: gi,
      });
    });
    html += modalLayout ? '</div></details>' : '';
    html += '</section>';
  });
  html += '</div>';
  return html;
}

export function exportSomeGroupCopy(group, format, title, onDone) {
  var done = typeof onDone === 'function' ? onDone : function () {};
  var model = buildSomeGroupExportModel(group);
  if (format === 'png') {
    copyTableModelAsPng(model, title || 'Tabla SOME', done);
    return;
  }
  copyTableText(buildSomeGroupTsv(group, title || ''), done);
}

export function exportSomeDeptCopy(dept, format, title, onDone) {
  var done = typeof onDone === 'function' ? onDone : function () {};
  if (!dept) {
    done(false);
    return;
  }
  var label = title || dept.label || 'Tabla';
  if (format === 'png') {
    copyTableModelAsPng(buildSomeDeptExportModel(dept, label), label, done);
    return;
  }
  copyTableText(buildSomeDeptTsv(dept, label), done);
}

function resolveSomeExportLookup(lookup) {
  if (typeof lookup === 'function') {
    return { getDept: lookup, getGroup: null };
  }
  if (lookup && typeof lookup === 'object') {
    return {
      getDept: typeof lookup.getDept === 'function' ? lookup.getDept : null,
      getGroup: typeof lookup.getGroup === 'function' ? lookup.getGroup : null,
    };
  }
  return { getDept: null, getGroup: null };
}

function readSomeExportIndices(btn, groupEl) {
  var di = parseInt(btn.getAttribute('data-dept-index') || '', 10);
  var gi = parseInt(btn.getAttribute('data-group-index') || '', 10);
  if ((!Number.isFinite(di) || !Number.isFinite(gi)) && groupEl) {
    di = parseInt(groupEl.getAttribute('data-dept-index') || '', 10);
    gi = parseInt(groupEl.getAttribute('data-group-index') || '', 10);
  }
  return { deptIndex: di, groupIndex: gi };
}

export function wireSomeTableExportButtons(container, onToast, lookup) {
  if (!container) return;
  var resolved = resolveSomeExportLookup(lookup);
  container.querySelectorAll('.lab-some-export-btn').forEach(function (btn) {
    if (btn.dataset.someWired === '1') return;
    btn.dataset.someWired = '1';
    btn.addEventListener('click', function () {
      var format = btn.getAttribute('data-export');
      var label = btn.getAttribute('data-label') || '';
      if (btn.classList.contains('lab-some-dept-export-btn') && resolved.getDept) {
        var deptIndex = parseInt(btn.getAttribute('data-dept-index') || '', 10);
        var dept = resolved.getDept(deptIndex);
        exportSomeDeptCopy(dept, format, label || (dept && dept.label) || '', function (ok) {
          if (typeof onToast === 'function') {
            onToast(
              ok ? 'Sección copiada ✓' : 'No se pudo copiar la sección',
              ok ? 'success' : 'error'
            );
          }
        });
        return;
      }
      if (!resolved.getGroup) return;
      var groupEl = btn.closest('.lab-some-group');
      var indices = readSomeExportIndices(btn, groupEl);
      if (!Number.isFinite(indices.deptIndex) || !Number.isFinite(indices.groupIndex)) return;
      var group = resolved.getGroup(indices.deptIndex, indices.groupIndex);
      if (!group) return;
      exportSomeGroupCopy(group, format, label, function (ok) {
        if (typeof onToast === 'function') {
          onToast(
            ok ? 'Tabla copiada ✓' : 'No se pudo copiar la tabla',
            ok ? 'success' : 'error'
          );
        }
      });
    });
  });
}
