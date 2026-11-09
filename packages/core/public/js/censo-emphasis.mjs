/**
 * Negrita solo para lo anormal en Labs y Signos del censo (vista previa y PDF).
 * Devuelve segmentos {text, bold}. En Labs se quita el * de anormal (la negrita lo
 * reemplaza); en el resto, unidos dan la línea original.
 * Umbrales de signos (adulto): T° <36 o ≥38 · FC <60 o >100 · FR <12 o >20 ·
 * PAM <65 (TA) · SAT <92 % · DXT <70 o >180.
 */

function out(parts) {
  var segs = [];
  parts.forEach(function (p) {
    if (!p.text) return;
    var last = segs[segs.length - 1];
    if (last && last.bold === p.bold) last.text += p.text;
    else segs.push({ text: p.text, bold: p.bold });
  });
  return segs;
}

function num(s) {
  var n = parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function between(n, lo, hi) {
  return n != null && (n < lo || n > hi);
}

/** Labs: "Hb 10.3*" — el valor marcado con * y su nombre. */
function labsSegments(line) {
  var tokens = line.split(/(\s+)/); // conserva los espacios
  var bold = tokens.map(function () {
    return false;
  });
  for (var i = 0; i < tokens.length; i++) {
    if (tokens[i] && !/^\s+$/.test(tokens[i]) && /\*$/.test(tokens[i])) {
      bold[i] = true;
      // nombre del analito: token anterior no vacío (salta el espacio)
      if (i >= 2 && !/\*$/.test(tokens[i - 2])) {
        bold[i - 1] = true;
        bold[i - 2] = true;
      }
    }
  }
  return out(
    tokens.map(function (t, i) {
      return { text: bold[i] ? t.replace(/\*$/, '') : t, bold: bold[i] };
    })
  );
}

function signosSegments(line) {
  var m;
  if (/^T°\s/.test(line) || /^FC\s/.test(line) || /^FR\s/.test(line)) {
    var limits = { 'T°': [36, 37.9], FC: [60, 100], FR: [12, 20] };
    return out(
      line.split(/( · )/).map(function (part) {
        var mm = part.match(/^(T°|FC|FR)\s+([\d.,]+)/);
        var lim = mm && limits[mm[1]];
        return { text: part, bold: !!(lim && between(num(mm[2]), lim[0], lim[1])) };
      })
    );
  }
  if ((m = line.match(/^TA:\s*(\d+)\/(\d+)/))) {
    var pam = (num(m[1]) + 2 * num(m[2])) / 3;
    return [{ text: line, bold: pam < 65 }];
  }
  if ((m = line.match(/^SAT:\s*(\d+)\s*%/))) {
    var cut = m[0].length;
    return out([
      { text: line.slice(0, cut), bold: num(m[1]) < 92 },
      { text: line.slice(cut), bold: false },
    ]);
  }
  if (/^DXT:/.test(line)) {
    return out(
      line.split(/(\d+)/).map(function (part, i) {
        return { text: part, bold: i % 2 === 1 && between(num(part), 70, 180) };
      })
    );
  }
  return [{ text: line, bold: false }];
}

/**
 * @param {string} colKey
 * @param {string} line
 * @returns {{ text: string, bold: boolean }[]}
 */
export function censoEmphasisSegments(colKey, line) {
  var s = String(line || '');
  if (colKey === 'labs') return labsSegments(s);
  if (colKey === 'signos') return signosSegments(s);
  return [{ text: s, bold: false }];
}
