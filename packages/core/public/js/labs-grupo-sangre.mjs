/**
 * Grupo sanguíneo / RH + Coombs (BANCO DE SANGRE / SOME).
 * Compacta a: GS\tB+ CD 1+*  |  GS\tO- CD neg CI 2+*
 */

function hasGrupoSangreMarkers_(textoBruto) {
  return (
    /GRUPO\s+SANGU[IÍ]NEO/i.test(textoBruto) ||
    /COOMBS\s+DIRECTO/i.test(textoBruto) ||
    /COOMBS\s+INDIRECTO/i.test(textoBruto)
  );
}

function normalizeGrupoRh_(raw) {
  var s = String(raw || '')
    .toUpperCase()
    .replace(/−/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return '';
  var m = s.match(/^(A|B|AB|O)\s*(POSITIVO|NEGATIVO|\+|-)$/);
  if (!m) return '';
  var rh = m[2] === 'POSITIVO' || m[2] === '+' ? '+' : '-';
  return m[1] + rh;
}

function formatCoombsToken_(raw) {
  var s = String(raw || '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return '';
  var strength = (s.match(/(?:^|[^0-9A-Z])([1-4]\+)(?![0-9A-Z])/) || [])[1];
  var hasPos = /\bPOSITIVO\b/.test(s) || !!strength;
  var hasNeg = /\bNEGATIVO\b/.test(s);
  if (hasPos) return (strength || 'pos') + '*';
  if (hasNeg) return 'neg';
  return '';
}

function isLabelOrNoise_(line) {
  return (
    !line ||
    /^ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA$/i.test(line) ||
    /^BANCO\s+DE\s+SANGRE$/i.test(line) ||
    /^REPORTE\s+DE\s+GRUPO/i.test(line) ||
    /^GRUPO\s+SANGU/i.test(line) ||
    /^COOMBS\s+(DIRECTO|INDIRECTO)/i.test(line)
  );
}

function resultFromSameOrNextLine_(lineas, i) {
  var same = String(lineas[i] || '');
  var tabIdx = same.indexOf('\t');
  if (tabIdx >= 0) {
    var after = same
      .substring(tabIdx + 1)
      .replace(/\t/g, ' ')
      .trim();
    if (after && !isLabelOrNoise_(after)) return after;
  }
  for (var j = i + 1; j < Math.min(i + 6, lineas.length); j++) {
    var t = String(lineas[j] || '').replace(/\t/g, ' ').trim();
    if (isLabelOrNoise_(t)) {
      if (/^GRUPO\s+SANGU|^COOMBS\s+(DIRECTO|INDIRECTO)/i.test(t)) break;
      continue;
    }
    return t;
  }
  return '';
}

function findEstudioResult_(lineas, pattern) {
  for (var i = 0; i < lineas.length; i++) {
    var head = String(lineas[i] || '')
      .replace(/\t.*$/, '')
      .trim();
    if (!pattern.test(head)) continue;
    return resultFromSameOrNextLine_(lineas, i);
  }
  return '';
}

/**
 * @param {string} textoBruto
 * @returns {string} línea GS\t… o ''
 */
export function parseGrupoSangreCoombs_(textoBruto) {
  if (!textoBruto || typeof textoBruto !== 'string') return '';
  if (!hasGrupoSangreMarkers_(textoBruto)) return '';

  var lineas = textoBruto.split(/\r?\n/).map(function (l) {
    return String(l || '').trim();
  });

  var grupo = normalizeGrupoRh_(
    findEstudioResult_(lineas, /^GRUPO\s+SANGU[IÍ]NEO(?:\s*\/\s*RH)?$/i)
  );
  var cd = formatCoombsToken_(findEstudioResult_(lineas, /^COOMBS\s+DIRECTO$/i));
  var ci = formatCoombsToken_(findEstudioResult_(lineas, /^COOMBS\s+INDIRECTO$/i));

  var parts = [];
  if (grupo) parts.push(grupo);
  if (cd) parts.push('CD ' + cd);
  if (ci) parts.push('CI ' + ci);
  if (!parts.length) return '';
  return 'GS\t' + parts.join(' ');
}
