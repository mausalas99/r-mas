// Cultivo barrel — parseCultivo_ + re-exports
import {
  detectTipoCultivoLine,
  detectMuestraDesdeProducto,
  buildCultivoTipoDisplay,
  parseMycobacteriasStudies_,
  findCultivoGermenRuns,
  detectMarcasResistenciaCultivoSlice,
  parseSensCrudasAntibiogramaLines,
  compactarLineasAntibiograma,
  extractCuentaKassFromLineas,
} from './labs-cultivo-scan.mjs';
import { abreviarAbAtb_ } from './labs-cultivo-abbr.mjs';
import { TEND_MESES_MAP } from './tend-core.mjs';

function isCultivoReportText_(tUpper) {
  return (
    tUpper.indexOf('HEMOCULTIVO') !== -1 ||
    tUpper.indexOf('CULTIVO') !== -1 ||
    tUpper.indexOf('MICROORGANISMO') !== -1 ||
    tUpper.indexOf('MYCOBACTERIAS') !== -1 ||
    tUpper.indexOf('BACILOSCOPIA') !== -1
  );
}

function parseCultivoFecha_(tNorm) {
  var mFecha = tNorm.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (mFecha) return mFecha[1].padStart(2, '0') + '/' + mFecha[2].padStart(2, '0');
  // SOME's "Fecha Registro" also comes as an English month name ("May 13 2026 4:20PM"),
  // the same format parseFechaLabToMs/normalizeFechaLabHistory already accept elsewhere.
  var mEn = tNorm.match(/([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/i);
  if (mEn) {
    var mon = TEND_MESES_MAP[mEn[1].toLowerCase().slice(0, 3)];
    if (mon) return mEn[2].padStart(2, '0') + '/' + mon;
  }
  return 'N/D';
}

function buildGermenChunk_(run, sliceLines, sitio, fechaC, reportePreliminar) {
  var subNorm = sliceLines.join('\n');
  var idxAbLoc = subNorm.toUpperCase().indexOf('ANTIBIOGRAMA');
  var head = sitio + ' ' + fechaC + ': ' + run.germen;
  var headTags = [];
  if (reportePreliminar) headTags.push('Preliminar');
  detectMarcasResistenciaCultivoSlice(sliceLines).forEach(function (m) {
    if (headTags.indexOf(m) === -1) headTags.push(m);
  });
  if (headTags.length) head += ' · ' + headTags.join(' · ');
  var chunk = head;
  if (idxAbLoc !== -1) {
    var lineasAb = subNorm
      .substring(idxAbLoc)
      .split('\n')
      .map(function (l) {
        return l.replace(/\r/g, '').replace(/\*/g, '').trim();
      });
    var abCompact = compactarLineasAntibiograma(parseSensCrudasAntibiogramaLines(lineasAb), abreviarAbAtb_);
    if (abCompact) chunk += '\n' + abCompact;
  }
  var cuentaRun = extractCuentaKassFromLineas(sliceLines);
  if (cuentaRun) chunk += '\nCuenta: ' + cuentaRun;
  return chunk;
}

function parseCultivoGermenRuns_(germenRuns, lineasTexto, sitio, fechaC, reportePreliminar) {
  var chunks = [];
  for (var ri = 0; ri < germenRuns.length; ri++) {
    var run = germenRuns[ri];
    chunks.push(buildGermenChunk_(run, lineasTexto.slice(run.i0, run.i1), sitio, fechaC, reportePreliminar));
  }
  return chunks.join('\n\n');
}

function parseCultivoNegativo_(tNorm, tUpper, sitio, fechaC) {
  if (tNorm.toUpperCase().indexOf('BACILOSCOPIA') !== -1 && tNorm.toUpperCase().indexOf('POSITIVO') !== -1) {
    var mPos = tNorm.match(/BACILOSCOPIA[^.\n]*POSITIVO[^\n.]*/i);
    return 'BACILOSCOPIA ' + fechaC + ': ' + (mPos ? mPos[0].trim() : 'BACILOSCOPIA POSITIVA');
  }
  var estado = 'NEGATIVO';
  var pEst = tUpper.indexOf('ESTADO');
  if (pEst !== -1) {
    var fEst = tNorm.substring(pEst + 17, pEst + 80).split('*')[1] || tNorm.substring(pEst + 17, pEst + 80);
    estado = fEst.split('MICROORGANISMO')[0].split('PRODUCTO')[0].trim().toUpperCase();
  }
  return sitio + ' ' + fechaC + ': ' + estado;
}

export function parseCultivo_(textoBruto, tNorm) {
  var tUpper = tNorm.toUpperCase();
  if (!isCultivoReportText_(tUpper)) return '';
  var fechaC = parseCultivoFecha_(tNorm);
  var lineasTexto = textoBruto.split('\n').map(function (l) {
    return l.replace(/\r/g, '');
  });
  var germenRuns = findCultivoGermenRuns(lineasTexto);
  var mycoOut = parseMycobacteriasStudies_(lineasTexto, fechaC);
  if (mycoOut && !germenRuns.length) return mycoOut;
  var sitio = buildCultivoTipoDisplay(detectTipoCultivoLine(lineasTexto), detectMuestraDesdeProducto(lineasTexto));
  var reportePreliminar = /REPORTE\s+PRELIMINAR/i.test(lineasTexto.join('\n'));
  if (germenRuns.length) {
    return parseCultivoGermenRuns_(germenRuns, lineasTexto, sitio, fechaC, reportePreliminar);
  }
  return parseCultivoNegativo_(tNorm, tUpper, sitio, fechaC);
}

export {
  formatCultivoCondensedForCopy,
  formatSensCrudasBlockForCopy,
  classifyAtbInterp,
  buildAtbChipsHtml,
  extractMicSortKey,
  buildAtbRisSummaryHtml,
  extractSensCrudasForGermFromSource,
  isParsedCultivoHeaderLine,
} from './labs-cultivo-atb.mjs';

export {
  findCultivoGermenRuns,
  parseSensCrudasAntibiogramaSlice,
  parseCuentaFromCultivoChunkLines,
} from './labs-cultivo-scan.mjs';

