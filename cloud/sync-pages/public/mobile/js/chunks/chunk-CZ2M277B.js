import {
  bloqueCitoquimicoLiquidosFull,
  buildEgfrPatientCtx,
  buildRefsBySectionFromReport,
  computeGasaValue_,
  dedupeSingletonSections_,
  extractLabReportFechaDMY,
  extractLabReportHora,
  extraerConRangoPanel,
  fmtLabRanged_,
  gramIsPositive_,
  isGramNegative_,
  labSectionKey_,
  lcrBlocksNormText_,
  mergeRefsBySection_,
  parseBH_,
  parseCitoquimicoLiquidosParsed,
  parseCuantOrina_,
  parseESC_,
  parseFisicoquimicoHeces_,
  parseFluidLeu_,
  parseFrotisSangre_,
  parseGaso_,
  parseLcrParsed,
  parseLipasa_,
  parsePFH_,
  parsePIE_,
  parsePlaquetasCitrato_,
  parsePmnField_,
  parseQS_,
  parseSerologiaBancoSangre_,
  parseTroponina_,
  parsearCitoquimicoLiquidos,
  parsearLCR,
  resLabsHasAsciticFluid_,
  resLabsHasPleuralFluid_,
  resolveSerumAlbuminForGasa_,
  resolveSerumGlucoseForInterpret_
} from "/mobile/js/chunks/chunk-HDD2EUC6.js";

// public/js/labs-display.mjs
function normalizeGasometryInterpretationLine_(line) {
  var s = String(line == null ? "" : line);
  return /^Interpretación gasometría:/i.test(s.trim()) ? s.toUpperCase() : s;
}
function escTxt(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function renderToken(tok) {
  if (!tok) return tok;
  if (tok.endsWith("*")) {
    var inner = escTxt(tok.slice(0, -1));
    return '<strong class="lab-value-altered" title="Fuera de rango de referencia">' + inner + '</strong><span class="lab-value-star" aria-hidden="true">*</span>';
  }
  return escTxt(tok);
}
function formatLabSectionLabel(label, lineIndex) {
  var t = String(label || "").trim().replace(/:$/, "");
  if (/^Coag\.?$/i.test(t)) return "COAG";
  if (lineIndex === 0) return t;
  return t;
}
function isLabSectionLabel(label, lineIndex) {
  var t = String(label || "").trim().replace(/:$/, "");
  if (/^Coag\.?$/i.test(t) || /^COAG$/i.test(t)) return true;
  if (lineIndex !== 0) return false;
  return /^(BH|QS|ESC|PFHs|GASES|PIE|LCR|EGO|CUANTORINA|PltCit|FROTIS|SEROL|GS|HECES|COAG|LIPASA|TROP|TIR|ENDO|CARD|FE|FEB|INFL|INM|META|NEF|NIVEL|TM|NUT|GI|TOX|HEPB|VIRAL|MICRO)$/i.test(
    t
  );
}
function isLabSectionHeaderHtml(html) {
  return /<span class="section-lbl">/.test(String(html || ""));
}
function renderEntry(text) {
  text = normalizeGasometryInterpretationLine_(text);
  return text.split("\n").map(function(line, li) {
    var tabIdx = line.indexOf("	");
    if (tabIdx >= 0) {
      var label = line.substring(0, tabIdx);
      var rest = line.substring(tabIdx + 1);
      var lh = isLabSectionLabel(label, li) ? '<span class="section-lbl">' + escTxt(formatLabSectionLabel(label, li)) + "</span>" : escTxt(label);
      var rh = rest.split(" ").map(function(tok) {
        if (!tok) return tok;
        if (tok === "-") return '<span class="text-gray-500">-</span>';
        return renderToken(tok);
      }).join(" ");
      return lh + "	" + rh;
    }
    return line.split(" ").map(function(tok, ti) {
      if (!tok) return tok;
      if (li === 0 && ti === 0) return '<span class="section-lbl">' + escTxt(tok) + "</span>";
      if (tok === "-") return '<span class="text-gray-500">-</span>';
      return renderToken(tok);
    }).join(" ");
  });
}

// public/js/labs-reslabs-sanitize.mjs
var LAB_SECTION_LEAD_RE = /^(BH|QS|ESC|PFHs?|GASES|COAG|ORINA|EGO|CUANTORINA|PltCit|LIPASA|CULTIVO|LCR|TROP|GS|SEROL|FROTIS|HECES|PIE|INTERPRETACI[OÓ]N|LIQ|ASCITIS|TIR|ENDO|CARD|FE|FEB|INFL|INM|META|NEF|NIVEL|TM|NUT|GI|TOX|HEPB|VIRAL|MICRO)\b/i;
var CULTIVO_START_RE = /^(?:(?:CULTIVO|BACTERIOLOGIA|UROCULTIVO|HEMOCULTIVO|FUNGICULTIVO|TINCION\s+DE\s+GRAM|CATETER|ATB|Cultivos|BACILOSCOPIA)\b|Cuenta:)/i;
var PARSED_CULTIVO_HEADER_RE = /^(SECRECION|LIQUIDO|ASPIRADO|ABSCESO|BRONCOALVEOLAR)\b/i;
var PARSED_CULTIVO_DATED_RE = /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ()\s/.-]*\s+\d{1,2}\/\d{1,2}(?:\/\d{2,4})?:\s+\S/i;
function firstLine(text) {
  return String(text || "").trim().split(/\r?\n/, 1)[0] || "";
}
function isCultivoStartLineLocal(first) {
  var t = String(first || "").trim();
  if (!t) return false;
  if (CULTIVO_START_RE.test(t)) return true;
  if (/^CULTIVO\s+DE\s+MICOBACTERIAS\b/i.test(t)) return true;
  if (PARSED_CULTIVO_HEADER_RE.test(t)) return true;
  if (PARSED_CULTIVO_DATED_RE.test(t)) return true;
  if (/^[•\u2022\u00B7]\s*/.test(t)) return true;
  return false;
}
function isSomeReportChromeLine(line) {
  var t = String(line == null ? "" : line).trim();
  if (!t) return false;
  if (/^USER\b/i.test(t)) return true;
  if (/\bLabo\s*-?\d+/i.test(t) && /\b(DJEG|UANL|Campo|Feme)\b/i.test(t)) return true;
  if (/Sistema\s+SOME|UNIVERSIDAD\s+AUT[OÓ]NOMA|MOP-HU-\d+|REPORTE\s+DE\s+RESULTADOS/i.test(t)) {
    return true;
  }
  if (/^(Expediente|Solicitud|Nombre|Sexo|Ubicaci[oó]n|Edad|Medico)\s*:/i.test(t)) return true;
  return false;
}
function looksLikeLabSectionChunk(text) {
  var first = firstLine(text);
  return !!first && LAB_SECTION_LEAD_RE.test(first);
}
function stripTrailingSomeReportChrome(text) {
  var t = String(text == null ? "" : text);
  if (!t) return "";
  t = t.replace(
    /\s*(?:Sistema\s+SOME|UNIVERSIDAD\s+AUT[OÓ]NOMA|MOP-HU-\d+|REPORTE\s+DE\s+RESULTADOS)[\s\S]*$/i,
    ""
  );
  t = t.replace(/\s*(?:Expediente|Solicitud)\s*:[\s\S]*$/i, "");
  t = t.replace(/\s*^USER\b[\s\S]*$/im, "");
  return t.trim();
}
function stripChromeLinesFromChunk(text) {
  var t = String(text == null ? "" : text);
  if (!t.trim()) return "";
  var kept = t.split(/\r?\n/).filter(function(ln) {
    return !isSomeReportChromeLine(ln);
  });
  return kept.join("\n").trim();
}
function sanitizeResLabsChunks(rows) {
  var out = [];
  (rows || []).forEach(function(row) {
    var s = String(row == null ? "" : row);
    if (!s.trim()) return;
    var first = firstLine(s);
    if (isSomeReportChromeLine(first)) return;
    if (looksLikeLabSectionChunk(s)) {
      var cleaned = stripChromeLinesFromChunk(stripTrailingSomeReportChrome(s));
      if (cleaned && looksLikeLabSectionChunk(cleaned)) out.push(cleaned);
      return;
    }
    if (isCultivoStartLineLocal(first)) {
      var cult = stripChromeLinesFromChunk(stripTrailingSomeReportChrome(s));
      if (cult && isCultivoStartLineLocal(firstLine(cult))) out.push(cult);
    }
  });
  return out;
}

// public/js/labs-section-order.mjs
var HEAD_ORDER = ["BH", "QS", "ESC", "PFHS", "GASES"];
var TAIL_ORDER = ["CUANTORINA", "EGO"];
var HEAD_RANK = /* @__PURE__ */ Object.create(null);
var TAIL_RANK = /* @__PURE__ */ Object.create(null);
HEAD_ORDER.forEach(function(k, i) {
  HEAD_RANK[k] = i;
});
TAIL_ORDER.forEach(function(k, i) {
  TAIL_RANK[k] = i;
});
var HEAD_LEN = HEAD_ORDER.length;
var OTROS_RANK = HEAD_LEN;
var TAIL_BASE = HEAD_LEN + 1;
function labSectionOrderKey(row) {
  var s = String(row == null ? "" : row).trim();
  if (!s) return "";
  var firstLine2 = s.split(/\r?\n/, 1)[0] || "";
  var tab = firstLine2.indexOf("	");
  if (tab >= 0) firstLine2 = firstLine2.substring(0, tab);
  var colon = firstLine2.indexOf(":");
  if (colon > 0) firstLine2 = firstLine2.substring(0, colon);
  var m = firstLine2.match(/^([A-Za-zÁÉÍÓÚáéíóúÑñ0-9]+)/);
  return m ? m[1].toUpperCase() : "";
}
function sectionRank_(key) {
  if (!key) return OTROS_RANK;
  if (Object.prototype.hasOwnProperty.call(HEAD_RANK, key)) return HEAD_RANK[key];
  if (Object.prototype.hasOwnProperty.call(TAIL_RANK, key)) return TAIL_BASE + TAIL_RANK[key];
  return OTROS_RANK;
}
function sortResLabsByClinicalOrder(rows) {
  var list = (rows || []).map(function(row, idx) {
    return { row, idx, rank: sectionRank_(labSectionOrderKey(row)) };
  });
  list.sort(function(a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.idx - b.idx;
  });
  return list.map(function(item) {
    return String(item.row == null ? "" : item.row);
  });
}

// public/js/labs-procesar.mjs
function extractLabExpedienteFromReport(textoBruto) {
  var mExp = String(textoBruto || "").match(/Expediente:\s*([^\n\r]+)/i);
  if (!mExp) return "";
  return mExp[1].split(/\s+(?:Solicitud|Medico|Médico|Fecha|Sexo|Edad|Ubicaci)/i)[0].trim();
}
function parseLabSexoNorm_(mSexo) {
  if (!mSexo) return "";
  var sm = mSexo[1].match(/^(MASCULINO|FEMENINO|HOMBRE|MUJER|MALE|FEMALE|M\b|F\b)/i);
  if (!sm) return "";
  var sv = sm[1].toUpperCase();
  return sv === "MASCULINO" || sv === "HOMBRE" || sv === "MALE" || sv === "M" ? "M" : "F";
}
function parseLabEdadParts_(mEdad) {
  var edadRaw = mEdad ? (mEdad[1].match(/^\d+/) || [""])[0] : "";
  var edadUnidad = mEdad ? (mEdad[1].match(/\b(años|meses|dias|días|semanas)\b/i) || ["a\xF1os"])[0].toLowerCase() : "a\xF1os";
  if (edadUnidad === "dias" || edadUnidad === "d\xEDas") edadUnidad = "d\xEDas";
  return { edadRaw, edadUnidad };
}
function parseLabUbicacion_(textoBruto) {
  var mUbic = textoBruto.match(/Ubicaci[oó]n:\s*([^\n\r]+)/i);
  if (!mUbic) return "";
  var uRaw = mUbic[1].trim();
  var uTok = uRaw.split(/\t+/).map(function(x) {
    return x.trim();
  }).filter(Boolean);
  return (uTok[0] || uRaw.split(/\s+(?:Medico|Médico|Edad)\s*:/i)[0] || uRaw).trim();
}
function segmentLabReportBlocks_(deps, textoBruto, tNorm) {
  var mGaso = tNorm.match(
    /GASOMETRIA.*?(?=BIOMETRIA|CITOLOGIA|QUIMICA|ELECTROLITOS|PFH|COAGULACION|CITOQUIMICO|$)/i
  );
  var bloqueGaso = mGaso ? mGaso[0] : "";
  var lcrNormChunks = lcrBlocksNormText_(textoBruto);
  var bloqueCitoLC = deps.bloqueCitoquimicoLiquidosFull(textoBruto);
  var mEGO = tNorm.match(
    /(?:URIANALISIS|EXAMEN GENERAL DE ORINA|ANALISIS DE ORINA).*?(?=BACTERIOLOGIA|CULTIVO|COMENTARIO DE MUESTRA|$)/i
  );
  var bloqueEGO = mEGO ? mEGO[0] : "";
  var tSinLiqCorp = tNorm;
  if (bloqueCitoLC) {
    tSinLiqCorp = tNorm.replace(bloqueCitoLC.replace(/\r/g, "").replace(/\s+/g, " "), " ");
  }
  var textoQS = tSinLiqCorp.replace(bloqueGaso, " ").replace(bloqueEGO, " ");
  for (var li = 0; li < lcrNormChunks.length; li++) {
    textoQS = textoQS.replace(lcrNormChunks[li], " ");
  }
  var textoParaBh = tSinLiqCorp;
  if (bloqueEGO) textoParaBh = textoParaBh.replace(bloqueEGO, " ");
  var esSoloGaso = /GASOMETRIA/i.test(tNorm) && !/BIOMETRIA|QUIMICA|ELECTROLITOS|PFH|COAGULACION|CULTIVO/i.test(tNorm);
  return { bloqueGaso, textoQS, textoParaBh, esSoloGaso };
}
function pushLabSection_(resLabs, value) {
  if (value) resLabs.push(value);
}
function sectionPrior_(priorBySec, key) {
  return priorBySec && priorBySec[key] ? priorBySec[key] : null;
}
function collectCoreLabSections_(deps, resLabs, blocks, demograf, textoBruto, tNorm, priorBySec) {
  var bhRes = deps.parseBH_(blocks.textoParaBh, sectionPrior_(priorBySec, "BH"));
  if (bhRes && bhRes.visible) resLabs.push(bhRes.visible);
  if (bhRes && bhRes.coagVisible) resLabs.push(bhRes.coagVisible);
  pushLabSection_(resLabs, deps.parseQS_(blocks.textoQS, demograf, sectionPrior_(priorBySec, "QS")));
  pushLabSection_(resLabs, deps.parseESC_(blocks.textoQS, sectionPrior_(priorBySec, "ESC")));
  pushLabSection_(resLabs, deps.parsePFH_(blocks.textoParaBh, sectionPrior_(priorBySec, "PFHs")));
  pushLabSection_(resLabs, deps.parseLipasa_(blocks.textoQS, sectionPrior_(priorBySec, "LIPASA")));
  pushLabSection_(
    resLabs,
    deps.parsePlaquetasCitrato_(textoBruto, tNorm, sectionPrior_(priorBySec, "PltCit"))
  );
  return bhRes && bhRes.extras ? bhRes.extras : {};
}
function appendFrotisLines_(deps, resLabs, textoBruto) {
  var fro = deps.parseFrotisSangre_(textoBruto);
  if (!fro) return;
  fro.split("\n").forEach(function(line) {
    if (line) resLabs.push(line);
  });
}
function collectLabSections_(deps, textoBruto, tNorm, blocks, demograf, priorBySec) {
  var resLabs = [];
  var bhExtras = blocks.esSoloGaso ? {} : collectCoreLabSections_(deps, resLabs, blocks, demograf, textoBruto, tNorm, priorBySec);
  pushLabSection_(
    resLabs,
    deps.parseGaso_(blocks.bloqueGaso, blocks.textoQS, sectionPrior_(priorBySec, "GASES"))
  );
  pushLabSection_(resLabs, deps.parsePIE_(tNorm));
  pushLabSection_(resLabs, deps.parsearLCR(textoBruto));
  pushLabSection_(resLabs, deps.parsearCitoquimicoLiquidos(textoBruto));
  pushLabSection_(
    resLabs,
    deps.formatCitoquimicoInterpretacionLine_(deps.buildCitoquimicoInterpretAlerts_(textoBruto))
  );
  pushLabSection_(resLabs, deps.parseFisicoquimicoHeces_(textoBruto));
  appendFrotisLines_(deps, resLabs, textoBruto);
  pushLabSection_(resLabs, deps.parseEGO_(textoBruto));
  pushLabSection_(resLabs, deps.parseCuantOrina_(textoBruto));
  pushLabSection_(resLabs, deps.parseCultivo_(textoBruto, tNorm));
  pushLabSection_(resLabs, deps.parseSerologiaBancoSangre_(textoBruto));
  pushLabSection_(resLabs, deps.parseGrupoSangreCoombs_(textoBruto));
  pushLabSection_(resLabs, deps.parseTroponina_(textoBruto, sectionPrior_(priorBySec, "TROP")));
  appendExtendedPanelLines_(deps, resLabs, textoBruto, priorBySec);
  return { resLabs, bhExtras };
}
function appendExtendedPanelLines_(deps, resLabs, textoBruto, priorBySec) {
  if (typeof deps.parseExtendedLabPanels_ !== "function") return;
  var lines = deps.parseExtendedLabPanels_(textoBruto, priorBySec) || [];
  for (var i = 0; i < lines.length; i++) {
    pushLabSection_(resLabs, lines[i]);
  }
}
function parseLabPatientHeader_(deps, textoBruto) {
  var mNombre = textoBruto.match(/Nombre:\s*([^\n\r]+)/i);
  var mExp = textoBruto.match(/Expediente:\s*([^\n\r]+)/i);
  var mSexo = textoBruto.match(/Sexo:\s*([^\n\r]+)/i);
  var mEdad = textoBruto.match(/Edad:\s*([^\n\r]+)/i);
  var expRaw = mExp ? mExp[1].split(/\s+(?:Solicitud|Medico|Médico|Fecha|Sexo|Edad|Ubicaci)/i)[0].trim() : "";
  var edadParts = parseLabEdadParts_(mEdad);
  var sexoRaw = parseLabSexoNorm_(mSexo);
  var patient = {
    name: mNombre ? mNombre[1].split(/Fecha|Sexo|Edad/i)[0].trim() : "",
    expediente: expRaw,
    sexo: sexoRaw,
    edad: edadParts.edadRaw ? edadParts.edadRaw + " " + edadParts.edadUnidad : "",
    fecha: deps.extractLabReportFechaDMY(textoBruto),
    hora: deps.extractLabReportHora(textoBruto),
    ubicacion: parseLabUbicacion_(textoBruto)
  };
  return {
    patient,
    edadRaw: edadParts.edadRaw,
    edadUnidad: edadParts.edadUnidad,
    sexoRaw
  };
}
function createProcesarLabs(deps) {
  return function procesarLabs2(textoBruto, options) {
    var tNorm = textoBruto.replace(/\s+/g, " ");
    var hdr = parseLabPatientHeader_(deps, textoBruto);
    var blocks = segmentLabReportBlocks_(deps, textoBruto, tNorm);
    var chartPatient = options && options.patient ? options.patient : null;
    var priorBySec = options && options.priorRefsBySection && typeof options.priorRefsBySection === "object" ? Object.assign(/* @__PURE__ */ Object.create(null), options.priorRefsBySection) : /* @__PURE__ */ Object.create(null);
    if (options && options.gasRefs) {
      priorBySec.GASES = Object.assign(
        /* @__PURE__ */ Object.create(null),
        priorBySec.GASES || /* @__PURE__ */ Object.create(null),
        options.gasRefs
      );
    }
    var egfrCtx = buildEgfrPatientCtx(hdr.edadRaw, hdr.edadUnidad, chartPatient);
    var sections = collectLabSections_(deps, textoBruto, tNorm, blocks, egfrCtx, priorBySec);
    var reportRefs = deps.buildRefsBySectionFromReport(textoBruto);
    return {
      patient: hdr.patient,
      resLabs: sanitizeResLabsChunks(
        sortResLabsByClinicalOrder(deps.dedupeSingletonSections_(sections.resLabs))
      ),
      bhExtras: sections.bhExtras,
      // Reporte gana; prior rellena huecos (SOME sin Valor de Referencia).
      refsBySection: mergeRefsBySection_(reportRefs, priorBySec)
    };
  };
}

// public/js/labs-citoquimico-interpret-rules.mjs
var PBE_PMN_CUTOFF = 250;
var PBE_LEU_CUTOFF = 250;
var PLEURAL_PH_EMPYEMA = 7.2;
var PLEURAL_GLU_EMPYEMA = 60;
var PLEURAL_LEU_EMPYEMA = 5e4;
var LCR_PH_MIN = 7.28;
var LCR_PH_MAX = 7.42;
function evaluarLcrPhSanity_(pH) {
  if (pH == null || !isFinite(pH)) return "";
  if (pH < LCR_PH_MIN || pH > LCR_PH_MAX) {
    return "pH LCR " + pH + " fuera de rango fisiol\xF3gico (" + LCR_PH_MIN + "\u2013" + LCR_PH_MAX + ") \u2014 verificar muestra/reporte";
  }
  return "";
}
function evaluarPbeAscitis_(leu, pmnInfo, gram) {
  var alerts = [];
  var pmn = pmnInfo && pmnInfo.pmnNum;
  if (pmn == null && leu != null && leu >= PBE_PMN_CUTOFF && pmnInfo && pmnInfo.predominant) {
    pmn = leu;
  }
  if (pmn != null && pmn >= PBE_PMN_CUTOFF) {
    alerts.push(
      "PMN " + pmn + " \u2265250/mm\xB3 \u2014 peritonitis bacteriana espont\xE1nea? (cultivo + ATB emp\xEDrico)"
    );
  } else if (leu != null && leu >= PBE_LEU_CUTOFF) {
    alerts.push("Leu " + leu + " \u2265250/mm\xB3 \u2014 descartar PBE (confirmar PMN absoluto)");
  }
  if (gramIsPositive_(gram)) {
    alerts.push("Gram " + gram + " \u2014 infecci\xF3n bacteriana en l\xEDquido asc\xEDtico?");
  }
  return alerts;
}
function evaluarPleuralInfeccion_(pH, glu, leu) {
  var alerts = [];
  if (pH != null && pH < PLEURAL_PH_EMPYEMA) {
    alerts.push("pH pleural " + pH + " <7.20 \u2014 derrame complicado / empiema?");
  }
  if (glu != null && glu < PLEURAL_GLU_EMPYEMA) {
    alerts.push("Glu pleural " + glu + " <60 mg/dL \u2014 derrame complicado / empiema?");
  }
  if (leu != null && leu >= PLEURAL_LEU_EMPYEMA) {
    alerts.push("Leu " + leu + " \u226550k/mm\xB3 \u2014 empiema?");
  }
  return alerts;
}
function lcrGluLow_(glu, serumGlu) {
  if (glu == null) return false;
  if (glu < 40) return true;
  if (serumGlu != null && serumGlu > 0 && glu / serumGlu < 0.4) return true;
  return false;
}
function pushLcrBacterialAlert_(alerts, leu, glu, gram) {
  if (gramIsPositive_(gram)) {
    alerts.push("Meningitis bacteriana? (Gram " + gram + ")");
    return;
  }
  var gluTxt = glu != null ? ", Glu LCR " + glu : "";
  alerts.push("Meningitis bacteriana? (Leu " + leu + gluTxt + " \u2014 cultivo/ATB emp\xEDrico)");
}
function pushLcrViralAlert_(alerts, leu) {
  alerts.push("Meningitis viral/as\xE9ptica? (Leu " + leu + " \u2014 correlacionar PCR/virolog\xEDa)");
}
function pushLcrTbAlert_(alerts, leu, glu, prot) {
  var bits = ["Leu " + leu];
  if (glu != null) bits.push("Glu " + glu);
  if (prot != null) bits.push("Prot " + prot);
  alerts.push("Meningitis tuberculosa? (" + bits.join(", ") + " \u2014 ADA/BAAR/genXpert)");
}
function lcrTintaSuggestive_(tinta) {
  return tinta && !isGramNegative_(tinta) && /POSITIV|LEVADUR|COC/i.test(tinta);
}
function isLcrNormocellular_(leu, glu, prot, serumGlu) {
  return leu != null && leu <= 5 && !lcrGluLow_(glu, serumGlu) && (prot == null || prot <= 45);
}
function evaluarLcrLeu100Plus_(alerts, leu, glu, prot, gram, serumGlu) {
  if (!lcrGluLow_(glu, serumGlu)) {
    alerts.push(
      "Meningitis bacteriana parcialmente tratada vs viral? (Leu " + leu + " \u2014 correlacionar cl\xEDnica)"
    );
    return;
  }
  if (prot != null && prot > 100) {
    pushLcrTbAlert_(alerts, leu, glu, prot);
    return;
  }
  pushLcrBacterialAlert_(alerts, leu, glu, gram);
}
function evaluarLcrEtiologia_(leu, glu, prot, gram, tinta, serumGlu) {
  var alerts = [];
  if (leu == null && glu == null && prot == null) return alerts;
  if (isLcrNormocellular_(leu, glu, prot, serumGlu)) return alerts;
  if (gramIsPositive_(gram) || lcrTintaSuggestive_(tinta)) {
    pushLcrBacterialAlert_(alerts, leu, glu, gram || tinta);
    return alerts;
  }
  if (leu == null) return alerts;
  if (leu >= 1e3) {
    pushLcrBacterialAlert_(alerts, leu, glu, gram);
    return alerts;
  }
  if (leu >= 100) {
    evaluarLcrLeu100Plus_(alerts, leu, glu, prot, gram, serumGlu);
    return alerts;
  }
  if (leu >= 10) {
    pushLcrViralAlert_(alerts, leu);
    return alerts;
  }
  if (leu > 5) {
    alerts.push("Pleocitosis leve LCR (Leu " + leu + ") \u2014 correlacionar cl\xEDnica");
  }
  return alerts;
}

// public/js/labs-citoquimico-interpret.mjs
var CITOQUIM_INTERPRETACION_HEADER = "INTERPRETACI\xD3N CITOQU\xCDMICO:";
var ASCITIS_INTERPRETACION_HEADER = "INTERPRETACI\xD3N ASCITIS:";
var CITOQUIM_INTERP_HEADERS = [
  CITOQUIM_INTERPRETACION_HEADER,
  ASCITIS_INTERPRETACION_HEADER,
  "INTERPRETACI\xD3N PLEURAL:"
];
function escapeRegExp_(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function matchesInterpHeader_(head, header) {
  return new RegExp("^" + escapeRegExp_(header), "i").test(head);
}
function isCitoquimInterpretacionResLabChunk(text) {
  var head = String(text || "").split("\n")[0].trim();
  for (var i = 0; i < CITOQUIM_INTERP_HEADERS.length; i++) {
    if (matchesInterpHeader_(head, CITOQUIM_INTERP_HEADERS[i])) return true;
  }
  return false;
}
function formatCitoquimicoInterpretacionLine_(alerts) {
  var list = (alerts || []).filter(Boolean);
  if (!list.length) return "";
  return CITOQUIM_INTERPRETACION_HEADER + "	" + list.join(" \xB7 ");
}
function evaluarAscitisNoPortal_(gasa, protGdl, tglMgdl, amilUl, citologia) {
  if (gasa == null || gasa >= 1.1) return "";
  if (tglMgdl == null) {
    if (amilUl == null) return "Solicitar triglic\xE9ridos y amilasa en l\xEDquido asc\xEDtico";
    return "Solicitar triglic\xE9ridos en l\xEDquido asc\xEDtico";
  }
  if (tglMgdl > 200) return "Ascitis quilosa (TGL>200)";
  if (protGdl == null) return "Evaluar prote\xEDnas totales en l\xEDquido asc\xEDtico";
  if (protGdl < 2.5) return "S\xEDndrome nefr\xF3tico? (Prot<2.5; proteinuria 24h)";
  if (amilUl == null) {
    if (citologia === "positive") return "Carcinomatosis peritoneal? (citolog\xEDa +)";
    if (citologia === "negative") return "Peritonitis tuberculosa? (citolog\xEDa \u2212; BAAR, ADA, biopsia)";
    return "Solicitar amilasa y citolog\xEDa en l\xEDquido asc\xEDtico";
  }
  if (amilUl > 1e3) return "Ascitis pancre\xE1tica/perforaci\xF3n? (Amil>1000)";
  if (citologia == null) return "Solicitar citolog\xEDa de l\xEDquido asc\xEDtico";
  if (citologia === "positive") return "Carcinomatosis peritoneal? (citolog\xEDa +)";
  return "Peritonitis tuberculosa? (citolog\xEDa \u2212; BAAR, ADA, biopsia)";
}
function appendGasaAlerts_(alerts, parsed) {
  if (!parsed.alb) return;
  if (parsed.serumAlb == null) {
    alerts.push("Incluir alb\xFAmina s\xE9rica del mismo d\xEDa para calcular GASA");
    return;
  }
  if (parsed.gasaVal == null) return;
  if (parsed.gasaVal >= 1.1) {
    alerts.push("GASA " + parsed.gasaVal + " \u22651.1 \u2014 probable hipertensi\xF3n portal");
    return;
  }
  alerts.push("GASA " + parsed.gasaVal + " <1.1 \u2014 ascitis no portal");
  var dx = evaluarAscitisNoPortal_(
    parsed.gasaVal,
    parsed.protGdl,
    parsed.tgl,
    parsed.amil,
    parsed.citologia
  );
  if (dx) alerts.push(dx);
}
function buildAscitisLabAlerts_(textoBruto, serumOpts, parsedIn) {
  var parsed = parsedIn || parseCitoquimicoLiquidosParsed(textoBruto, serumOpts);
  if (!parsed || !parsed.esAscitico) return [];
  var alerts = evaluarPbeAscitis_(parsed.leu, parsed.pmnInfo, parsed.gram);
  appendGasaAlerts_(alerts, parsed);
  return alerts;
}
function buildPleuralLabAlerts_(textoBruto, serumOpts, parsedIn) {
  var parsed = parsedIn || parseCitoquimicoLiquidosParsed(textoBruto, serumOpts);
  if (!parsed || !parsed.esPleural) return [];
  var alerts = [];
  if (parsed.lightTxt) alerts.push(parsed.lightTxt);
  var inf = evaluarPleuralInfeccion_(parsed.pH, parsed.glu, parsed.leu);
  for (var i = 0; i < inf.length; i++) alerts.push(inf[i]);
  return alerts;
}
function buildLcrLabAlerts_(textoBruto, serumOpts) {
  var parsed = parseLcrParsed(textoBruto);
  if (!parsed) return [];
  var alerts = [];
  var phFlag = evaluarLcrPhSanity_(parsed.pH);
  if (phFlag) alerts.push(phFlag);
  var serumGlu = resolveSerumGlucoseForInterpret_(textoBruto, serumOpts);
  alerts = alerts.concat(
    evaluarLcrEtiologia_(
      parsed.leu,
      parsed.glu,
      parsed.protMgdl,
      parsed.gram,
      parsed.tinta,
      serumGlu
    )
  );
  return alerts;
}
function buildCitoquimicoInterpretAlerts_(textoBruto, serumOpts, parsedIn) {
  var parsed = parsedIn || parseCitoquimicoLiquidosParsed(textoBruto, serumOpts);
  var alerts = [];
  if (parsed && parsed.line) {
    alerts = alerts.concat(
      buildAscitisLabAlerts_(textoBruto, serumOpts, parsed),
      buildPleuralLabAlerts_(textoBruto, serumOpts, parsed)
    );
  }
  alerts = alerts.concat(buildLcrLabAlerts_(textoBruto, serumOpts));
  return alerts;
}
function parseLiqValuesFromResLabLine_(line) {
  var leuMatch = line.match(/\bLeu\s+([0-9]+(?:[.,][0-9]+)?)\*?/i);
  var pmnMatch = line.match(/\bPMN\s+([^\s]+)/i);
  var albMatch = line.match(/\bAlb\s+([0-9]+(?:[.,][0-9]+)?)\*?/i);
  var leuNum = leuMatch ? parseFluidLeu_(leuMatch[1]) : null;
  return {
    esAscitico: /\bASCIT|PERITONEAL|L[IÍ]QUIDO\s+ASCIT/i.test(line),
    esPleural: /\bPLEURAL\b/i.test(line),
    alb: albMatch ? parseFloat(String(albMatch[1]).replace(",", ".")) : null,
    leu: leuNum,
    pmnInfo: pmnMatch ? parsePmnField_(pmnMatch[1], leuNum) : { pmnNum: null, pmnPct: null, predominant: false },
    gram: (line.match(/\bGram\s+([^\s]+(?:\s+[^\s]+)*)/i) || [])[1] || "",
    serumAlb: null,
    gasaVal: null,
    protGdl: null,
    tgl: null,
    amil: null,
    citologia: null,
    lightTxt: "",
    pH: null,
    glu: null,
    line
  };
}
function ascitisParsedFromResLabsLiq_(resLabs) {
  var rows = resLabs || [];
  for (var i = 0; i < rows.length; i++) {
    var line = String(rows[i] || "");
    if (labSectionKey_(line) !== "LIQ:") continue;
    return parseLiqValuesFromResLabLine_(line);
  }
  return null;
}
function enrichAscitisGasa_(parsed, src, serumOpts) {
  if (parsed.alb == null || parsed.serumAlb != null) return;
  var serumAlb = resolveSerumAlbuminForGasa_(src, src ? bloqueCitoquimicoLiquidosFull(src) : "", serumOpts);
  if (serumAlb == null) return;
  parsed.serumAlb = serumAlb;
  parsed.gasaVal = computeGasaValue_(serumAlb, parsed.alb);
}
function replaceLiqLineFromSource_(out, src, serumOpts) {
  var newLiq = parsearCitoquimicoLiquidos(src, serumOpts);
  if (!newLiq) return out;
  return out.filter(function(r) {
    return labSectionKey_(r) !== "LIQ:";
  }).concat([newLiq]);
}
function updateLiqLineWithGasa_(out, parsed) {
  if (parsed.gasaVal == null || !parsed.line) return out;
  var liqLine = parsed.line;
  if (!/\bGASA\b/.test(liqLine)) {
    liqLine = liqLine + " GASA " + String(parsed.gasaVal);
  } else {
    liqLine = liqLine.replace(/\bGASA\s+[0-9]+(?:[.,][0-9]+)?/, "GASA " + String(parsed.gasaVal));
  }
  return out.filter(function(r) {
    return labSectionKey_(r) !== "LIQ:";
  }).concat([liqLine]);
}
function resLabsHasLcr_(resLabs) {
  return !!(resLabs || []).some(function(row) {
    return labSectionKey_(String(row || "")) === "LCR:";
  });
}
function resLabsHasCitoquimFluid_(resLabs) {
  return resLabsHasAsciticFluid_(resLabs) || resLabsHasPleuralFluid_(resLabs) || resLabsHasLcr_(resLabs);
}
function hasCitoquimRefreshTarget_(parsed, hasLcr) {
  if (hasLcr) return true;
  if (!parsed) return false;
  return parsed.esAscitico || parsed.esPleural || parsed.line;
}
function applyLiqLineRefresh_(out, src, serumOpts, parsed) {
  if (src) return replaceLiqLineFromSource_(out, src, serumOpts);
  if (parsed && parsed.esAscitico) return updateLiqLineWithGasa_(out, parsed);
  return out;
}
function refreshCitoquimicoInterpretacionInResLabs_(resLabs, textoBruto, serumOpts) {
  var rows = resLabs || [];
  var src = String(textoBruto || "").trim();
  var parsed = src ? parseCitoquimicoLiquidosParsed(src, serumOpts) : ascitisParsedFromResLabsLiq_(rows);
  var hasLcr = src ? !!parseLcrParsed(src) : resLabsHasLcr_(rows);
  if (!hasCitoquimRefreshTarget_(parsed, hasLcr)) return rows.slice();
  if (parsed && parsed.esAscitico) enrichAscitisGasa_(parsed, src, serumOpts);
  var out = rows.filter(function(r) {
    return !isCitoquimInterpretacionResLabChunk(r);
  });
  out = applyLiqLineRefresh_(out, src, serumOpts, parsed);
  var interpParsed = parsed && parsed.line ? parsed : null;
  var interp = formatCitoquimicoInterpretacionLine_(
    buildCitoquimicoInterpretAlerts_(src, serumOpts, interpParsed)
  );
  if (interp) out.push(interp);
  return dedupeSingletonSections_(out);
}

// public/js/labs-ego-parse-helpers.mjs
var EGO_SKIP_SEARCH = /^(N\/A|EstudioResultado|ESTUDIO|SEDIMENTO|QUIMICO|FISICO|MICROSCOPICO|URIANALISIS|EXAMEN GENERAL|OBSERVACIONES)/i;
var EGO_SKIP_LABEL = /^(N\/A|Estudio|Resultado|Unidades|Valor de Referencia|VALOR DE REF)/i;
var EGO_ABBREV = {
  NEGATIVO: "NEG",
  NEGATIVE: "NEG",
  POSITIVO: "POS",
  POSITIVE: "POS",
  AUSENTES: "AUS",
  AUSENTE: "AUS",
  ESCASAS: "ESC",
  ESCASO: "ESC",
  MODERADAS: "MOD",
  MODERADO: "MOD",
  ABUNDANTES: "ABD",
  ABUNDANTE: "ABD",
  AMARILLO: "AMAR",
  TURBIO: "TURB",
  CLARO: "CLARO"
};
var EGO_POS_NEG_TYPES = ["PROT", "GLU", "CET", "BILI", "NITR", "ESTLEU"];
var EGO_AUS_TYPES = ["BACT", "CELEP", "CLING", "CLINH", "LEVAD", "MOCO"];
function valorTrasEtiqueta(lineas, etiquetas) {
  for (var e = 0; e < etiquetas.length; e++) {
    var lbl = etiquetas[e].toUpperCase();
    for (var i = 0; i < lineas.length; i++) {
      if (lineas[i].toUpperCase() !== lbl) continue;
      for (var j = i + 1; j < Math.min(i + 10, lineas.length); j++) {
        var l = lineas[j].trim();
        if (!l || /^[ABHL]$/.test(l) || EGO_SKIP_LABEL.test(l) || /^[-–:/.]+$/.test(l)) continue;
        var mNum = l.match(/^(-?\d+[.,]?\d*)/);
        if (mNum) return mNum[1].replace(",", ".");
      }
    }
  }
  return null;
}
function esUnidadEGO_(l) {
  return /^(Hem\/uL|Leucocitos\/uL|E\.U\.\/dL|mOsm\/L|mg\/dL|mmol\/L|g\/dL|\/CAMPO|K\/uL|fL|pg|uL|U\/L|SEG\.?)$/i.test(l) || /^[a-zA-Z]+\/[a-zA-Z]+$/.test(l);
}
function tryParseEgoValue(l) {
  var mApr = l.match(/^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+)/i);
  if (mApr) return mApr[1];
  if (esUnidadEGO_(l)) return null;
  if (/^\d[\d.,]*\s+[-–]\s+\d[\d.,]*$/.test(l)) return null;
  if (/^\d+[-–]\d+\//.test(l)) return null;
  if (/^\d+[-–]\d+$/.test(l)) return l;
  var mNum = l.match(/^(-?\d+[.,]?\d*)/);
  if (mNum) return mNum[1].replace(",", ".");
  if (l.length <= 30 && !/\d{4,}/.test(l) && !/VALOR DE REF/i.test(l)) return l.toUpperCase();
  return null;
}
function buscarValorEGO_(lineas, nombres) {
  for (var n = 0; n < nombres.length; n++) {
    for (var i = 0; i < lineas.length; i++) {
      if (lineas[i].toUpperCase() !== nombres[n].toUpperCase()) continue;
      for (var j = i + 1; j < Math.min(i + 8, lineas.length); j++) {
        var l = lineas[j].trim();
        if (!l || /^[ABHL]$/.test(l) || /^[:\-/.\s]+$/.test(l) || EGO_SKIP_SEARCH.test(l)) continue;
        var parsed = tryParseEgoValue(l);
        if (parsed != null) return parsed;
      }
    }
  }
  return "---";
}
function abreviarEGO_(val) {
  if (!val || val === "---") return "---";
  var v = val.toUpperCase().trim();
  return EGO_ABBREV[v] || v;
}
function marcarEGOPosNeg_(ab, tipo) {
  if (EGO_POS_NEG_TYPES.indexOf(tipo) !== -1) return ab !== "NEG" && ab !== "AUS" ? ab + "*" : ab;
  if (EGO_AUS_TYPES.indexOf(tipo) !== -1) return ab !== "AUS" ? ab + "*" : ab;
  return ab;
}
function marcarEGOThreshold_(ab, val, threshold) {
  var mR = val.match(/^(\d+)[-–](\d+)$/);
  if (mR) return parseInt(mR[1], 10) > threshold ? ab + "*" : ab;
  var vC = parseFloat(val);
  return !isNaN(vC) && vC > threshold ? ab + "*" : ab;
}
function marcarEGORange_(ab, val, low, high) {
  var v = parseFloat(val);
  return !isNaN(v) && (v < low || v > high) ? ab + "*" : ab;
}
function marcarEGO_(val, tipo) {
  if (!val || val === "---") return "---";
  var ab = abreviarEGO_(val);
  if (tipo === "SANG") {
    var vSang = parseFloat(val);
    if (!isNaN(vSang)) return vSang > 0 ? val + "*" : "NEG";
    return ab !== "NEG" && ab !== "AUS" ? ab + "*" : ab;
  }
  if (tipo === "UROBIL") {
    var vU = parseFloat(val);
    return !isNaN(vU) && vU > 1 ? ab + "*" : ab;
  }
  if (tipo === "PH") return marcarEGORange_(ab, val, 5.5, 6.5);
  if (tipo === "DENS") return marcarEGORange_(ab, val, 1.005, 1.025);
  if (tipo === "LEU") return marcarEGOThreshold_(ab, val, 5);
  if (tipo === "ERI") return marcarEGOThreshold_(ab, val, 2);
  return marcarEGOPosNeg_(ab, tipo);
}
var EGO_FIELD_DEFS = [
  { section: "fisico", key: "color", prefix: "", tipo: "COLOR" },
  { section: "fisico", key: "aspecto", prefix: "", tipo: "ASPECTO" },
  { section: "fisico", key: "ph", prefix: "pH ", tipo: "PH" },
  { section: "fisico", key: "dens", prefix: "D ", tipo: "DENS" },
  { section: "quimico", key: "prot", prefix: "Prot ", tipo: "PROT" },
  { section: "quimico", key: "glu", prefix: "Glu ", tipo: "GLU" },
  { section: "quimico", key: "cet", prefix: "Cet ", tipo: "CET" },
  { section: "quimico", key: "bilis", prefix: "Bili ", tipo: "BILI" },
  { section: "quimico", key: "sangre", prefix: "Sang ", tipo: "SANG" },
  { section: "quimico", key: "nitr", prefix: "Nitr ", tipo: "NITR" },
  { section: "quimico", key: "urobil", prefix: "Urobil ", tipo: "UROBIL" },
  { section: "quimico", key: "estLeu", prefix: "EstLeu ", tipo: "ESTLEU" },
  { section: "sedimento", key: "leu", prefix: "Leu ", tipo: "LEU" },
  { section: "sedimento", key: "eri", prefix: "Eri ", tipo: "ERI" },
  { section: "sedimento", key: "bact", prefix: "Bact ", tipo: "BACT", skipAus: true },
  { section: "sedimento", key: "celEpit", prefix: "CelEp ", tipo: "CELEP", skipAus: true },
  { section: "sedimento", key: "cilinG", prefix: "CilinG ", tipo: "CLING", skipAus: true },
  { section: "sedimento", key: "cilinH", prefix: "CilinH ", tipo: "CLINH", skipAus: true },
  { section: "sedimento", key: "levad", prefix: "Levad ", tipo: "LEVAD", skipAus: true },
  { section: "sedimento", key: "moco", prefix: "Moco ", tipo: "MOCO", skipAus: true }
];
var EGO_FIELD_LABELS = {
  color: ["COLOR"],
  aspecto: ["ASPECTO"],
  ph: ["PH"],
  dens: ["DENSIDAD", "GRAVEDAD ESPECIFICA"],
  prot: ["PROTEINAS", "PROTEINURIA"],
  glu: ["GLUCOSA"],
  cet: ["CETONAS", "CUERPOS CETONICOS"],
  bilis: ["BILIRRUBINAS", "BILIRRUBINA"],
  sangre: ["SANGRE"],
  nitr: ["NITRITOS"],
  urobil: ["UROBILINOGENO", "UROBILIN\xD3GENO"],
  estLeu: ["ESTERASA LEUCOCITARIA"],
  leu: ["LEUCOCITOS"],
  eri: ["ERITROCITOS", "HEMATIES"],
  bact: ["BACTERIAS"],
  celEpit: ["CELULAS EPITELIALES"],
  cilinG: ["CILINDROS GRANOLOSOS"],
  cilinH: ["CILINDROS HIALINOS"],
  levad: ["LEVADURAS"],
  moco: ["MOCO"]
};
function collectEgoFieldValues_(lineas) {
  var out = {};
  Object.keys(EGO_FIELD_LABELS).forEach(function(key) {
    out[key] = buscarValorEGO_(lineas, EGO_FIELD_LABELS[key]);
  });
  return out;
}
function buildEgoSections_(f, qOrina) {
  var sections = { fisico: [], quimico: [], sedimento: [] };
  EGO_FIELD_DEFS.forEach(function(def) {
    var val = f[def.key];
    if (val === "---") return;
    if (def.skipAus && abreviarEGO_(val) === "AUS") return;
    sections[def.section].push(def.prefix + marcarEGO_(val, def.tipo));
  });
  if (qOrina.na) sections.quimico.push("NaU " + qOrina.na);
  if (qOrina.k) sections.quimico.push("KU " + qOrina.k);
  if (qOrina.cl) sections.quimico.push("ClU " + qOrina.cl);
  if (qOrina.cr) sections.quimico.push("CrU " + qOrina.cr);
  return sections;
}

// public/js/labs-ego-parse.mjs
function extraerQuimicaOrinaParaEGO_(textoBruto) {
  var out = { na: null, k: null, cl: null, cr: null };
  if (!textoBruto) return out;
  var lineas = textoBruto.split(/\r?\n/).map(function(l) {
    return l.replace(/\*/g, "").trim();
  });
  out.k = valorTrasEtiqueta(lineas, ["POTASIO EN ORINA"]);
  out.na = valorTrasEtiqueta(lineas, ["SODIO EN ORINA"]);
  out.cr = valorTrasEtiqueta(lineas, ["CREATININA EN ORINA"]);
  var mCl = textoBruto.match(/CLORO\s+EN\s+ORINA\s*:?\s*(\d+[.,]?\d*)/i);
  if (mCl) out.cl = mCl[1].replace(",", ".");
  return out;
}
function egoBlockLineas_(textoBruto) {
  var tUp = textoBruto.toUpperCase();
  var pos = tUp.indexOf("EXAMEN GENERAL DE ORINA") !== -1 ? tUp.indexOf("EXAMEN GENERAL DE ORINA") : tUp.indexOf("ANALISIS DE ORINA") !== -1 ? tUp.indexOf("ANALISIS DE ORINA") : tUp.indexOf("URIANALISIS") !== -1 ? tUp.indexOf("URIANALISIS") : -1;
  if (pos === -1) return [];
  var fin = tUp.search(/BACTERIOLOGIA|CULTIVO|COMENTARIO DE MUESTRA/);
  var bloque = fin !== -1 && fin > pos ? textoBruto.substring(pos, fin) : textoBruto.substring(pos);
  return bloque.split(/\r?\n/).map(function(l) {
    return l.replace(/\*/g, "").trim();
  });
}
function egoHasMinimalFields_(f) {
  return f.color !== "---" || f.aspecto !== "---" || f.ph !== "---" || f.leu !== "---" || f.eri !== "---";
}
function parseEGO_(textoBruto) {
  var qOrina = extraerQuimicaOrinaParaEGO_(textoBruto);
  var hasQO = !!(qOrina.na || qOrina.k || qOrina.cl || qOrina.cr);
  var lineas = egoBlockLineas_(textoBruto);
  if (!lineas.length && !hasQO) return "";
  var f = collectEgoFieldValues_(lineas);
  if (!hasQO && !egoHasMinimalFields_(f)) return "";
  var sections = buildEgoSections_(f, qOrina);
  if (!sections.fisico.length && !sections.quimico.length && !sections.sedimento.length) return "";
  var sub = ["EGO:"];
  if (sections.fisico.length) sub.push("  " + sections.fisico.join("  "));
  if (sections.quimico.length) sub.push("  " + sections.quimico.join("  "));
  if (sections.sedimento.length) sub.push("  " + sections.sedimento.join("  "));
  return sub.join("\n");
}

// public/js/labs-cultivo-scan.mjs
function findBacteriologiaSectionIdx_(lineasTexto) {
  var idxBact = -1;
  var idxMyco = -1;
  for (var i = 0; i < lineasTexto.length; i++) {
    var sec = lineasTexto[i].replace(/\r/g, "").replace(/\s+/g, " ").trim();
    if (/^BACTERIOLOGIA$/i.test(sec)) {
      idxBact = i;
      break;
    }
    if (/^MYCOBACTERIAS$/i.test(sec)) idxMyco = i;
  }
  return idxBact !== -1 ? idxBact : idxMyco;
}
function isTipoCultivoSkipLine_(lUp) {
  return /^BACTERIOLOGIA$/.test(lUp) || /^ESTUDIO\b/.test(lUp) || /^RESULTADO$/.test(lUp) || /^UNIDADES$/.test(lUp) || /^VALOR DE REFERENCIA$/.test(lUp);
}
function isExplicitTipoCultivoLine_(l, lUp) {
  return /\bUROCULTIVO\b/i.test(l) || /\bHEMOCULTIVO\b/i.test(l) || /^CATETER(\b|$)/i.test(lUp) || /^BACILOSCOPIA\b/i.test(lUp) || /^CULTIVO\s+DE\s+MICOBACTERIAS\b/i.test(lUp);
}
function isTipoCultivoCandidate_(lUp) {
  return !/^(TINCION|CALIDAD|ESTADO|MICROORGANISMO|COMENTARIO|CUENTA|ANTIBIOGRAMA|REPORTE\s+PRELIMINAR|1\s+MUESTRA|OBSERVACIONES|SECCION)\b/i.test(
    lUp
  );
}
function detectTipoCultivoLine(lineasTexto) {
  var idxSec = findBacteriologiaSectionIdx_(lineasTexto);
  if (idxSec === -1) return "";
  var candidate = "";
  for (var ii = idxSec + 1; ii < Math.min(idxSec + 35, lineasTexto.length); ii++) {
    var l = lineasTexto[ii].replace(/\r/g, "").replace(/\*/g, " ").replace(/\s+/g, " ").trim();
    if (!l) continue;
    var lUp = l.toUpperCase();
    if (isTipoCultivoSkipLine_(lUp)) continue;
    if (/^PRODUCTO$/.test(lUp)) break;
    if (isExplicitTipoCultivoLine_(l, lUp)) return l;
    if (!candidate && isTipoCultivoCandidate_(lUp)) candidate = l;
  }
  return candidate;
}
function cleanMycoLine_(line) {
  return String(line || "").replace(/\r/g, "").replace(/\*+/g, "").replace(/\s+/g, " ").trim();
}
function extractMuestraMycobacterias_(slice) {
  for (var o = 0; o < slice.length; o++) {
    if (!/^OBSERVACIONES\b/i.test(cleanMycoLine_(slice[o]))) continue;
    for (var o2 = o + 1; o2 < Math.min(o + 8, slice.length); o2++) {
      var obs = cleanMycoLine_(slice[o2]);
      if (!obs || /^OBSERVACIONES$/i.test(obs)) continue;
      if (/^(ESTUDIO|RESULTADO|UNIDADES|\*+)$/i.test(obs)) continue;
      return obs.toUpperCase();
    }
    break;
  }
  return "";
}
function isMycoResultSkipLine_(tUp) {
  return /^(ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA|1\s+MUESTRA)$/i.test(tUp) || /^SECCION\s+DE\s+MICOBACTERIAS/i.test(tUp) || /^REPORTE\s+PRELIMINAR/i.test(tUp);
}
function readMycoCultivoValue_(slice, k) {
  for (var k2 = k + 1; k2 < Math.min(k + 6, slice.length); k2++) {
    var v = cleanMycoLine_(slice[k2]);
    if (v && v.length > 2) return v.toUpperCase();
  }
  return "";
}
function findMycoStudyResult_(slice, fromIdx) {
  for (var k = fromIdx + 1; k < Math.min(fromIdx + 22, slice.length); k++) {
    var t = cleanMycoLine_(slice[k]);
    if (!t) continue;
    var tUp = t.toUpperCase();
    if (/^(BACILOSCOPIA|CULTIVO\s+DE\s+MICOBACTERIAS)/i.test(tUp)) break;
    if (/^OBSERVACIONES/i.test(tUp)) break;
    if (isMycoResultSkipLine_(tUp)) continue;
    if (/^CULTIVO$/i.test(tUp)) {
      var cultVal = readMycoCultivoValue_(slice, k);
      if (cultVal) return cultVal;
      continue;
    }
    if (/NEGATIVO|POSITIVO|PENDIENTE|EN CURSO|CRECIMIENTO|NO SE AISL/i.test(tUp) && t.length < 120) {
      return tUp;
    }
  }
  return "NEGATIVO";
}
function parseMycobacteriasStudies_(lineasTexto, fechaC) {
  var idxM = -1;
  for (var i = 0; i < lineasTexto.length; i++) {
    if (/^MYCOBACTERIAS$/i.test(cleanMycoLine_(lineasTexto[i]))) {
      idxM = i;
      break;
    }
  }
  if (idxM === -1) return "";
  var end = lineasTexto.length;
  for (var j = idxM + 1; j < lineasTexto.length; j++) {
    var sec = cleanMycoLine_(lineasTexto[j]);
    if (/^(HEMATOLOGIA|BACTERIOLOGIA|QUIMICA|BIOMETRIA|GASOMETRIA)\b/i.test(sec)) {
      end = j;
      break;
    }
  }
  var slice = lineasTexto.slice(idxM, end);
  var muestra = extractMuestraMycobacterias_(slice);
  var studyRe = /^(BACILOSCOPIA|CULTIVO\s+DE\s+MICOBACTERIAS|CULTIVO\s+DE\s+MYCOBACTERIAS)\b/i;
  var chunks = [];
  for (var si = 0; si < slice.length; si++) {
    var tipo = cleanMycoLine_(slice[si]);
    if (!studyRe.test(tipo)) continue;
    tipo = tipo.toUpperCase();
    var resultado = findMycoStudyResult_(slice, si);
    var header = tipo;
    if (muestra && header.indexOf(muestra) === -1) header += " (" + muestra + ")";
    chunks.push(header + " " + fechaC + ": " + resultado);
  }
  return chunks.length ? chunks.join("\n\n") : "";
}
function detectMuestraDesdeProducto(lineasTexto) {
  var idxProd = -1;
  for (var i = 0; i < lineasTexto.length; i++) {
    var prodLine = lineasTexto[i].replace(/\r/g, "").replace(/\*+/g, "").trim();
    if (/^PRODUCTO\b/i.test(prodLine)) {
      idxProd = i;
      break;
    }
  }
  if (idxProd === -1) return "";
  for (var j = idxProd + 1; j < Math.min(idxProd + 14, lineasTexto.length); j++) {
    var s = lineasTexto[j].replace(/\r/g, "").replace(/\*/g, "").trim();
    if (!s) continue;
    if (/^TINCION(\s+DE)?\s*GRAM/i.test(s)) break;
    if (/^CALIDAD DE LA MUESTRA$/i.test(s)) break;
    if (/^ESTADO DE CULTIVO$/i.test(s)) break;
    if (/^REPORTE PRELIMINAR$/i.test(s)) break;
    if (/^MICROORGANISMO$/i.test(s)) break;
    if (/^COMENTARIO/i.test(s)) break;
    return s;
  }
  return "";
}
function buildCultivoTipoDisplay(tipoLine, muestra) {
  var t = tipoLine ? tipoLine.replace(/\s+/g, " ").trim().toUpperCase() : "";
  var m = muestra ? muestra.replace(/\s+/g, " ").trim().toUpperCase() : "";
  if (t && m) return t + " (" + m + ")";
  if (t) return t;
  if (m) return "CULTIVO (" + m + ")";
  return "CULTIVO";
}
function parseInterpAntibiograma(vL) {
  var vClean = vL.replace(/\*+$/g, "").trim();
  if (!vClean) return null;
  var tabs = vClean.split(/\t+/).map(function(x) {
    return x.trim();
  }).filter(Boolean);
  if (tabs.length >= 2) {
    var interp = tabs[tabs.length - 1].toUpperCase().replace(/\*+$/, "");
    var mic = tabs.slice(0, -1).join(" ").trim();
    if (/^(S|R|I|NEG|POS|ESBL|BLEE|BLAC|KPC|NDM|VIM|IMP|MBL)$/.test(interp)) return { mic, interp };
    if (/^NO\s+SUSCEPTIBLE$/i.test(interp)) return { mic, interp: "NO SUSCEPTIBLE" };
  }
  var mV = vClean.match(/^([<>]=?\s*\d+(?:\.\d+)?(?:\/\d+)?)\s+(S|R|I|NEG|POS|ESBL|BLEE|BLAC|KPC|NDM|VIM|IMP|MBL)$/i);
  if (mV) return { mic: mV[1].replace(/\s/g, ""), interp: mV[2].toUpperCase() };
  var mN = vClean.match(/^(\d+)\s+(S|R|I|ESBL|BLEE|BLAC|KPC|NDM|VIM|IMP|MBL)$/i);
  if (mN) return { mic: mN[1], interp: mN[2].toUpperCase() };
  var lim = vClean.toUpperCase();
  if (/^(S|R|I)$/.test(lim)) return { mic: "", interp: lim };
  if (/NO\s+SUSCEPTIBLE/i.test(vClean)) return { mic: "", interp: "NO SUSCEPTIBLE" };
  return null;
}
var ORDEN_MARCA_RESISTENCIA = {
  KPC: 1,
  NDM: 2,
  VIM: 3,
  IMP: 4,
  "OXA-48": 5,
  "OXA-otras": 6,
  MBL: 7,
  SPM: 8,
  GIM: 9,
  ESBL: 20,
  BLEE: 21,
  CRE: 30,
  "Carb-R": 31,
  AmpC: 40,
  MRSA: 50,
  VRE: 51,
  "Col-R": 52
};
function normalizeResistenciaText_(texto) {
  return texto.toUpperCase().replace(/Á/g, "A").replace(/É/g, "E").replace(/Í/g, "I").replace(/Ó/g, "O").replace(/Ú/g, "U");
}
function applyCarbapenemasaTags_(u, add) {
  if (/\bKPC\b|KPC-/.test(u)) add("KPC");
  if (/\bNDM\b|NDM-/.test(u)) add("NDM");
  if (/\bVIM\b|VIM-/.test(u)) add("VIM");
  if (/\bIMP-\d|\bIMP\s*1\b|\bIMP1\b/.test(u) || /BETALACTAMASA\s+IMP/.test(u)) add("IMP");
  if (/\bOXA[- ]?48\b|OXA48\b/.test(u)) add("OXA-48");
  if (/\bOXA[- ]?(23|24|51|58)(?![0-9])\b/i.test(u)) add("OXA-otras");
  if (/\bMBL\b|METALO\s*BETA|METALOCARBAPENEMAS|METALO-?\s*BETALACTAMASA|BETALACTAMASA\s+DE\s+ZINC/.test(u)) {
    add("MBL");
  }
  if (/\bSPM\b|SPM-/.test(u)) add("SPM");
  if (/\bGIM\b|GIM-/.test(u)) add("GIM");
}
function applyCreCarbTags_(u, add, seen) {
  if (/\bCPE\b|\bCRE\b|ENTEROBACTER(I)?A\s+RESISTENTE\s+A\s+CARBAPEN|BACILO\s+CARBAPEN/.test(u)) {
    add("CRE");
  }
  if (/RESISTEN(CIA|TE)\s+.*CARBAPEN|CARBAPEN.*RESIST|NO\s+SUSCEPTIB.*CARBAPEN|ANTICARBAPEN|ANTI-?CARBAPEN|PRODUCTOR\s+DE\s+CARBAPENEMASA|PRODUCTOR(ES)?\s+CARBAPEN|DETECTO\s+CARBAPENEMASA|DETECT[OÓ]\s+CARBAPENEMASA|CARBAPENEMASA\s+DETECTAD/i.test(
    u
  )) {
    if (!seen.KPC && !seen.NDM && !seen.VIM && !seen.IMP && !seen["OXA-48"] && !seen.MBL) add("Carb-R");
  }
}
function applyBetaLactamTags_(u, add) {
  if (/\bESBL\b|BETALACTAMASAS?\s+DE\s+ESPECTRO|ESPECTRO\s+EXTENDIDO|BLEE\s*\+\s*ESBL/.test(u)) add("ESBL");
  if (/\(BLEE\)|\bBLEE\b|BETALACTAMASAS?\s*\(?BLEE\)?|PRODUCTOR\s+DE\s+BETALACTAMASAS(?!\s+DE\s+ESPECTRO)/.test(u)) {
    add("BLEE");
  }
  if (/\bAMPC\b|AMP\s*C\b|BETALACTAMASA\s+AMPC|CEPHAMYCIN/.test(u)) add("AmpC");
}
function applyStaphEnteroColTags_(u, add) {
  if (/\bMECA\b|\bMRSA\b|METICILIN(A)?\s*-?\s*RESIST|OXACILIN(A)?\s*:\s*R(?!\s*\d)/.test(u)) add("MRSA");
  if (/\bVRE\b|VANCOMICIN(A)?\s*-?\s*RESIST|ENTEROCOC.*VANCO\s*R|VANCO\s*[-–]\s*R/.test(u)) add("VRE");
  if (/COLISTIN(A)?\s*[-–:]?\s*R|POLIMIXIN(A)?\s*[-–:]?\s*R|RESIST.*COLISTIN/.test(u)) add("Col-R");
}
function extractMarcasResistenciaDesdeTexto(texto) {
  var u = normalizeResistenciaText_(texto);
  var seen = {};
  var tags = [];
  function add(tag) {
    if (!tag || seen[tag]) return;
    seen[tag] = 1;
    tags.push(tag);
  }
  applyCarbapenemasaTags_(u, add);
  applyCreCarbTags_(u, add, seen);
  applyBetaLactamTags_(u, add);
  applyStaphEnteroColTags_(u, add);
  tags.sort(function(a, b) {
    return (ORDEN_MARCA_RESISTENCIA[a] || 99) - (ORDEN_MARCA_RESISTENCIA[b] || 99);
  });
  return tags;
}
function finalizeMarcasResistencia_(marcas) {
  marcas.sort(function(a, b) {
    return (ORDEN_MARCA_RESISTENCIA[a] || 99) - (ORDEN_MARCA_RESISTENCIA[b] || 99);
  });
  if (marcas.indexOf("BLEE") !== -1) marcas = marcas.filter(function(m) {
    return m !== "ESBL";
  });
  if (marcas.some(function(m) {
    return /^(KPC|NDM|VIM|IMP|OXA-48|OXA-otras|MBL|SPM|GIM)$/.test(m);
  })) {
    marcas = marcas.filter(function(m) {
      return m !== "Carb-R";
    });
  }
  if (marcas.indexOf("CRE") !== -1) marcas = marcas.filter(function(m) {
    return m !== "Carb-R";
  });
  return marcas;
}
function detectMarcasResistenciaCultivoSlice(sliceLines) {
  var blob = sliceLines.join("\n");
  var marcas = extractMarcasResistenciaDesdeTexto(blob);
  var seen = {};
  marcas.forEach(function(m) {
    seen[m] = 1;
  });
  var inAb = false;
  for (var i = 0; i < sliceLines.length; i++) {
    var L = sliceLines[i].replace(/\*+$/g, "").trim();
    if (/^ANTIBIOGRAMA/i.test(L)) {
      inAb = true;
      continue;
    }
    if (inAb && /^MICROORGANISMO|^IDENTIFICACION/i.test(L)) {
      inAb = false;
      continue;
    }
    if (!inAb) continue;
    var p = parseInterpAntibiograma(L);
    if (!p || !p.interp) continue;
    var it = p.interp.toUpperCase();
    if (it === "ESBL" && !seen.ESBL) {
      marcas.push("ESBL");
      seen.ESBL = 1;
    }
    if (it === "BLEE" && !seen.BLEE) {
      marcas.push("BLEE");
      seen.BLEE = 1;
    }
    if (/^(KPC|NDM|VIM|IMP|MBL)$/.test(it) && !seen[it]) {
      marcas.push(it);
      seen[it] = 1;
    }
  }
  return finalizeMarcasResistencia_(marcas);
}
function compactarLineasAntibiograma(sensCrudas, abreviarFn) {
  if (!sensCrudas.length) return "";
  var rank = { R: 4, "NO SUSCEPTIBLE": 4, ESBL: 4, BLEE: 4, BLAC: 4, KPC: 4, NDM: 4, VIM: 4, IMP: 4, MBL: 4, I: 2, S: 1, POS: 1 };
  var byKey = {};
  sensCrudas.forEach(function(s) {
    var key = abreviarFn(s.med);
    if (!key) return;
    var it = String(s.interp || "").toUpperCase();
    var r = rank[it] || 0;
    if (!byKey[key] || r > byKey[key]._r) byKey[key] = { interp: it, _r: r };
  });
  var R = [], I = [], E = [], S = [];
  Object.keys(byKey).sort().forEach(function(k) {
    var it = byKey[k].interp;
    if (it === "S" || it === "POS") S.push(k);
    else if (it === "I") I.push(k);
    else if (it === "ESBL") E.push(k);
    else R.push(k);
  });
  function cap(arr, n) {
    if (!arr.length) return "";
    if (arr.length <= n) return arr.join(", ");
    return arr.slice(0, n).join(", ") + " +" + (arr.length - n);
  }
  var parts = [];
  if (R.length) parts.push("R: " + cap(R, 14));
  if (I.length) parts.push("I: " + cap(I, 8));
  if (E.length) parts.push("ESBL: " + cap(E, 8));
  if (S.length) parts.push("S: " + cap(S, 18));
  if (!parts.length) return "ATB sin interpretaciones";
  var line = "ATB " + parts.join(" | ");
  if (line.length <= 220) return line;
  return "ATB " + parts.join("\n");
}
function readGermenName_(lineasTexto, i) {
  for (var k = i + 1; k < Math.min(i + 14, lineasTexto.length); k++) {
    var cand = lineasTexto[k].replace(/\r/g, "").replace(/\*/g, "").trim();
    if (!cand) continue;
    if (/^COMENTARIO/i.test(cand)) break;
    if (/^MICROORGANISMO/i.test(cand)) break;
    if (/^ANTIBIOGRAMA/i.test(cand)) break;
    if (/^CUENTA/i.test(cand)) break;
    if (!/MALDI|IDENTIF|ESPECTROMETRIA|ESPECTRO/i.test(cand)) {
      return { germen: cand.toUpperCase(), nameEnd: k };
    }
  }
  return null;
}
function findGermenRunEnd_(lineasTexto, i, nameEnd) {
  for (var m = i + 1; m < lineasTexto.length; m++) {
    var Lm = lineasTexto[m].replace(/\r/g, "").replace(/\*+$/g, "").trim();
    if (/^MICROORGANISMO(\s|$)/i.test(Lm) && m > nameEnd) return m;
    if (/^IDENTIFICACION\s+POR\s+ESPECTROMETRIA/i.test(Lm)) return m;
  }
  return lineasTexto.length;
}
function findCultivoGermenRuns(lineasTexto) {
  var runs = [];
  for (var i = 0; i < lineasTexto.length; i++) {
    var L = lineasTexto[i].replace(/\r/g, "").replace(/\*+$/g, "").trim();
    if (!/^MICROORGANISMO(\s|$)/i.test(L)) continue;
    var named = readGermenName_(lineasTexto, i);
    if (!named) continue;
    runs.push({ germen: named.germen, i0: i, i1: findGermenRunEnd_(lineasTexto, i, named.nameEnd) });
    i = findGermenRunEnd_(lineasTexto, i, named.nameEnd) - 1;
  }
  return runs;
}
function extractCuentaKassFromLineas(sliceLines) {
  var tNorm = sliceLines.join(" ").replace(/\s+/g, " ");
  var tUpper = tNorm.toUpperCase();
  var pCuenta = tUpper.indexOf("CUENTA DE KASS");
  if (pCuenta === -1) pCuenta = tUpper.indexOf("CUENTA");
  if (pCuenta === -1) return "";
  var fragC = tNorm.substring(pCuenta, pCuenta + 110);
  var fragBeforeAb = fragC.split(/\bANTIBIOGRAMA\b/i)[0];
  var mUfc = fragBeforeAb.match(/\+?\d[\d,]*(?:\.\d+)?\s*UFC(?:\s*\/\s*M?L)?/i);
  if (mUfc) {
    return mUfc[0].replace(/\s+/g, " ").replace(/\s*\/\s*/g, "/").trim().toUpperCase();
  }
  var mC = fragBeforeAb.match(/([<>]=?\s?\d+(\.\d+)?\s*[A-Z%/]*)/i);
  if (mC) return mC[1].trim().toUpperCase();
  var mColonias = fragBeforeAb.match(/(\d[\d,]*\s+COLONIAS?)/i);
  if (mColonias) return mColonias[1].replace(/\s+/g, " ").trim().toUpperCase();
  for (var li = 0; li < sliceLines.length; li++) {
    var Lc = sliceLines[li].replace(/\r/g, "").replace(/\*+$/g, "").trim();
    if (!/^CUENTA/i.test(Lc)) continue;
    for (var lk = li + 1; lk < Math.min(li + 6, sliceLines.length); lk++) {
      var cand = sliceLines[lk].replace(/\r/g, "").replace(/\*/g, "").trim();
      if (!cand || cand === "*") continue;
      if (/^MICROORGANISMO|^ANTIBIOGRAMA|^COMENTARIO/i.test(cand)) break;
      return cand.replace(/\s+/g, " ").replace(/\s*\/\s*/g, "/").trim().toUpperCase();
    }
  }
  return "";
}
function parseSensCrudasAntibiogramaSlice(lineasAb) {
  var sensCrudas = [];
  for (var i = 0; i < lineasAb.length - 1; i++) {
    var nL = lineasAb[i], vL = lineasAb[i + 1];
    if (!nL || nL.length <= 3 || /ANTIBIOGRAMA|MICROORGANISMO|COMENTARIO:?|CUENTA|PRODUCTO|ESTADO|MUESTRA|GRAM|IDENTIFICACION|ESTUDIO\s+RESULTADO/i.test(nL)) continue;
    var parsed = parseInterpAntibiograma(vL);
    if (!parsed) {
      var lim = vL.toUpperCase();
      if (/^(S|R|I)$/.test(lim)) parsed = { mic: "", interp: lim };
    }
    if (parsed && parsed.interp) sensCrudas.push({ med: nL.toUpperCase(), mic: parsed.mic, interp: parsed.interp });
  }
  return sensCrudas;
}
function parseCuentaFromCultivoChunkLines(lines) {
  if (!lines || !lines.length) return "";
  for (var i = 0; i < lines.length; i++) {
    var m = String(lines[i] == null ? "" : lines[i]).replace(/\*+$/g, "").trim().match(/^Cuenta:\s*(.+)$/i);
    if (m) {
      return m[1].replace(/\s+/g, " ").replace(/\s*\/\s*/g, "/").trim();
    }
  }
  return "";
}

// public/js/labs-cultivo-abbr.mjs
var ATB_ABBR_RULES = [
  [/PIPERACILINA|PIP\/TAZ/, "PIP/TAZO"],
  [/TRIMET|TMP\/SMX|TRIMET\/SULFA/, "TMP/SMX"],
  [/AMP\S*\/\s*SULB|AMPICILINA.*SULBACTAM|AMP\/SULB/, "AMP-SULB"],
  [/GENT\.?\s*SINERG|SINERG/, "GENT-SIN"],
  [/GENTAMICINA/, "GENT"],
  [/AMIKACINA/, "AMIK"],
  [/TOBRAMICINA/, "TOBRA"],
  [/TETRACICLINA/, "TETRA"],
  [/NITROFURANTOINA/, "NITRO"],
  [/CIPROFLOXACINA/, "CIPRO"],
  [/LEVOFLOXACINA/, "LVX"],
  [/MEROPENEM/, "MERO"],
  [/ERTAPENEM/, "ERTA"],
  [/IMIPENEM/, "IMI"],
  [/CEFTRIAXONA/, "CFTX"],
  [/CEFOTAXIMA/, "CTX"],
  [/CEFOXITINA/, "CFXN"],
  [/CEFAZOLINA/, "CFZ"],
  [/CEFEPIMA/, "FEP"],
  [/CEFTAZIDIM.*AVIBACT|AVIBACTAM/, "CAZ-AVI"],
  [/CEFTAZIDIM|CEFTAZIDIMA/, "CAZ"],
  [/DAPTOMICINA/, "DAPTO"],
  [/LINEZOLID/, "LINEZ"],
  [/VANCOMICINA/, "VANCO"],
  [/PENICILINA|BENZILPENICILINA/, "PEN"],
  [/AMPICILINA/, "AMP"],
  [/CLINDAMICINA/, "CLINDA"]
];
function abreviarAbAtb_(n) {
  n = String(n || "").toUpperCase().trim();
  for (var i = 0; i < ATB_ABBR_RULES.length; i++) {
    if (ATB_ABBR_RULES[i][0].test(n)) return ATB_ABBR_RULES[i][1];
  }
  if (/AMPICILINA/.test(n) && !/SULB/.test(n)) return "AMP";
  var base = n.replace(/\bSODICO\b|\bSODIUM\b|\bDISODICO\b/g, "").trim().split("(")[0].trim().split(/\s+/)[0];
  return base.length > 10 ? base.substring(0, 10) : base;
}

// public/js/labs-cultivo-atb.mjs
function isCultivoChromeBodyLine_(line) {
  var t = String(line || "").trim();
  if (!t) return true;
  if (/^USER\b/i.test(t)) return true;
  if (/\bLabo\s*-?\d+/i.test(t) && /\b(DJEG|UANL|Campo|Feme)\b/i.test(t)) return true;
  return false;
}
function formatCultivoCondensedForCopy(chunkText, _studyDateLine) {
  var lines = [];
  var chunkLines = String(chunkText || "").trim().split(/\n/).map(function(l) {
    return l.trim();
  }).filter(function(l) {
    return l && !isCultivoChromeBodyLine_(l);
  });
  if (!chunkLines.length) return lines.join("\n");
  var head = chunkLines[0].replace(/\s*·\s*Preliminar\b/gi, "").replace(/\s*·\s*$/g, "").replace(/\s{2,}/g, " ").trim();
  if (head) lines.push(head);
  for (var i = 1; i < chunkLines.length; i++) {
    if (/^ATB\b/i.test(chunkLines[i]) || /^Cuenta:/i.test(chunkLines[i])) {
      lines.push(chunkLines[i]);
    }
  }
  return lines.join("\n");
}
function classifyAtbInterp(itRaw) {
  var u = String(itRaw || "").trim().toUpperCase().replace(/\s+/g, " ");
  if (u === "S" || u === "POS" || u === "SENSIBLE" || u === "SUSCEPTIBLE") return "s";
  if (u === "I" || u === "IND" || u.indexOf("INDETER") !== -1 || u.indexOf("INTERMED") !== -1) {
    return "i";
  }
  return "r";
}
function extractMicSortKey(micRaw) {
  var t = String(micRaw || "").trim().replace(/\s+/g, " ").replace(/,/g, ".").replace(/\u2264/g, "<=").replace(/\u2265/g, ">=");
  if (!t) return NaN;
  var m = t.match(/(?:<=|>=|<|>|=)?\s*(\d+(?:\.\d+)?)/);
  if (m) return parseFloat(m[1]);
  return NaN;
}
function sortSensByGradeInBucket(items, bucket) {
  var arr = items.slice();
  arr.sort(function(a, b) {
    var ka = extractMicSortKey(a.mic);
    var kb = extractMicSortKey(b.mic);
    var na = isNaN(ka);
    var nb = isNaN(kb);
    if (na && nb) {
      return String(a.med || "").localeCompare(String(b.med || ""), "es", { sensitivity: "base" });
    }
    if (na) return 1;
    if (nb) return -1;
    if (bucket === "r") {
      if (kb !== ka) return kb - ka;
      return String(a.med || "").localeCompare(String(b.med || ""), "es", { sensitivity: "base" });
    }
    if (ka !== kb) return ka - kb;
    return String(a.med || "").localeCompare(String(b.med || ""), "es", { sensitivity: "base" });
  });
  return arr;
}
function formatAtbDetailRowHtml(s) {
  var med = String(s.med || "").trim();
  var mic = String(s.mic || "").trim();
  var itTrim = String(s.interp || "").trim();
  var medEl = '<span class="atb-ris-drug">' + escTxt(med || "\u2014") + "</span>";
  var chunks = [];
  if (mic) {
    chunks.push(
      '<span class="atb-ris-mic"><span class="atb-ris-mic-lbl">CMI</span> ' + escTxt(mic) + "</span>"
    );
  }
  if (itTrim) {
    chunks.push(
      '<span class="atb-ris-int atb-ris-int--' + escTxt(classifyAtbInterp(itTrim)) + '">' + escTxt(itTrim) + "</span>"
    );
  }
  var meta = chunks.length > 0 ? '<span class="atb-ris-meta">' + chunks.join('<span class="atb-ris-meta-sep" aria-hidden="true">\xB7</span>') + "</span>" : "";
  return '<li class="atb-ris-detail-item"><div class="atb-ris-detail-line">' + medEl + (meta ? meta : "") + "</div></li>";
}
function buildAtbRisSummaryHtml(sensCrudas) {
  if (!sensCrudas || !sensCrudas.length) return "";
  var buckets = { r: [], i: [], s: [] };
  sensCrudas.forEach(function(s) {
    buckets[classifyAtbInterp(s.interp)].push(s);
  });
  var order = [
    { key: "r", label: "R", panelTitle: "Resistencias" },
    { key: "i", label: "I", panelTitle: "Indeterminado" },
    { key: "s", label: "S", panelTitle: "Sensible" }
  ];
  var wraps = [];
  order.forEach(function(o) {
    var list = buckets[o.key];
    if (!list.length) return;
    var sorted = sortSensByGradeInBucket(list, o.key);
    var items = sorted.map(formatAtbDetailRowHtml).join("");
    wraps.push(
      '<span class="cult-atb-ris-chip-wrap"><span class="atb-chip atb-chip--' + o.key + '" tabindex="0" role="button">' + escTxt(o.label) + '</span><div class="atb-ris-hover-panel atb-ris-hover-panel--' + o.key + '" role="region" aria-label="' + escTxt(o.panelTitle) + '"><div class="atb-ris-panel-head">' + escTxt(o.panelTitle) + '</div><ul class="atb-ris-detail-list">' + items + "</ul></div></span>"
    );
  });
  return '<div class="cult-atb-ris-summary"><div class="cult-atb-ris-chips" role="group" aria-label="Antibiograma (R / I / S); coloca el cursor sobre cada letra para el detalle">' + wraps.join("") + "</div></div>";
}
function extractSensCrudasForGermFromSource(sourceText, germQuery) {
  var q = String(germQuery || "").replace(/\s+/g, " ").trim().toUpperCase();
  if (!q || q === "\u2014" || q === "NEGATIVO") return null;
  var lineasTexto = String(sourceText || "").split("\n").map(function(l) {
    return l.replace(/\r/g, "");
  });
  var runs = findCultivoGermenRuns(lineasTexto);
  function matches(run) {
    var g = String(run.germen || "").replace(/\s+/g, " ").trim().toUpperCase();
    if (!g) return false;
    if (g === q || q === g) return true;
    if (q.indexOf(g) !== -1 || g.indexOf(q) !== -1) return true;
    var qTok = q.split(/\s+/).filter(Boolean)[0] || "";
    var gTok = g.split(/\s+/).filter(Boolean)[0] || "";
    if (qTok.length > 3 && gTok.length > 3 && (qTok === gTok || q.indexOf(gTok) === 0 || g.indexOf(qTok) === 0)) return true;
    return false;
  }
  for (var ri = 0; ri < runs.length; ri++) {
    if (!matches(runs[ri])) continue;
    var sliceLines = lineasTexto.slice(runs[ri].i0, runs[ri].i1);
    var subNorm = sliceLines.join("\n");
    var idxAbLoc = subNorm.toUpperCase().indexOf("ANTIBIOGRAMA");
    if (idxAbLoc === -1) return null;
    var lineasAb = subNorm.substring(idxAbLoc).split("\n").map(function(l) {
      return l.replace(/\r/g, "").replace(/\*+/g, "").trim();
    });
    return parseSensCrudasAntibiogramaSlice(lineasAb);
  }
  return null;
}
function isParsedCultivoHeaderLine(t) {
  var s = String(t || "").trim();
  if (!s) return false;
  if (/^CULTIVO\b/i.test(s)) return true;
  if (/^(UROCULTIVO|HEMOCULTIVO|FUNGICULTIVO)\b/i.test(s)) return true;
  if (/^TINCION\s+DE\s+GRAM/i.test(s)) return true;
  if (/^CATETER\b/i.test(s)) return true;
  if (/^BACILOSCOPIA\b/i.test(s)) return true;
  if (/^CULTIVO\s+DE\s+MICOBACTERIAS\b/i.test(s)) return true;
  if (/^(SECRECION|LIQUIDO|ASPIRADO|ABSCESO|BRONCOALVEOLAR)\b/i.test(s)) return true;
  return /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ()\s/.-]*\s+\d{1,2}\/\d{1,2}(?:\/\d{2,4})?:\s+\S/i.test(s);
}

// public/js/labs-cultivo.mjs
function isCultivoReportText_(tUpper) {
  return tUpper.indexOf("HEMOCULTIVO") !== -1 || tUpper.indexOf("CULTIVO") !== -1 || tUpper.indexOf("MICROORGANISMO") !== -1 || tUpper.indexOf("MYCOBACTERIAS") !== -1 || tUpper.indexOf("BACILOSCOPIA") !== -1;
}
function parseCultivoFecha_(tNorm) {
  var mFecha = tNorm.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  return mFecha ? mFecha[1].padStart(2, "0") + "/" + mFecha[2].padStart(2, "0") : "N/D";
}
function buildGermenChunk_(run, sliceLines, sitio, fechaC, reportePreliminar) {
  var subNorm = sliceLines.join("\n");
  var idxAbLoc = subNorm.toUpperCase().indexOf("ANTIBIOGRAMA");
  var head = sitio + " " + fechaC + ": " + run.germen;
  var headTags = [];
  if (reportePreliminar) headTags.push("Preliminar");
  detectMarcasResistenciaCultivoSlice(sliceLines).forEach(function(m) {
    if (headTags.indexOf(m) === -1) headTags.push(m);
  });
  if (headTags.length) head += " \xB7 " + headTags.join(" \xB7 ");
  var chunk = head;
  if (idxAbLoc !== -1) {
    var lineasAb = subNorm.substring(idxAbLoc).split("\n").map(function(l) {
      return l.replace(/\r/g, "").replace(/\*/g, "").trim();
    });
    var abCompact = compactarLineasAntibiograma(parseSensCrudasAntibiogramaSlice(lineasAb), abreviarAbAtb_);
    if (abCompact) chunk += "\n" + abCompact;
  }
  var cuentaRun = extractCuentaKassFromLineas(sliceLines);
  if (cuentaRun) chunk += "\nCuenta: " + cuentaRun;
  return chunk;
}
function parseCultivoGermenRuns_(germenRuns, lineasTexto, sitio, fechaC, reportePreliminar) {
  var chunks = [];
  for (var ri = 0; ri < germenRuns.length; ri++) {
    var run = germenRuns[ri];
    chunks.push(buildGermenChunk_(run, lineasTexto.slice(run.i0, run.i1), sitio, fechaC, reportePreliminar));
  }
  return chunks.join("\n\n");
}
function parseCultivoNegativo_(tNorm, tUpper, sitio, fechaC) {
  if (tNorm.toUpperCase().indexOf("BACILOSCOPIA") !== -1 && tNorm.toUpperCase().indexOf("POSITIVO") !== -1) {
    var mPos = tNorm.match(/BACILOSCOPIA[^.\n]*POSITIVO[^\n.]*/i);
    return "BACILOSCOPIA " + fechaC + ": " + (mPos ? mPos[0].trim() : "BACILOSCOPIA POSITIVA");
  }
  var estado = "NEGATIVO";
  var pEst = tUpper.indexOf("ESTADO");
  if (pEst !== -1) {
    var fEst = tNorm.substring(pEst + 17, pEst + 80).split("*")[1] || tNorm.substring(pEst + 17, pEst + 80);
    estado = fEst.split("MICROORGANISMO")[0].split("PRODUCTO")[0].trim().toUpperCase();
  }
  return sitio + " " + fechaC + ": " + estado;
}
function parseCultivo_(textoBruto, tNorm) {
  var tUpper = tNorm.toUpperCase();
  if (!isCultivoReportText_(tUpper)) return "";
  var fechaC = parseCultivoFecha_(tNorm);
  var lineasTexto = textoBruto.split("\n").map(function(l) {
    return l.replace(/\r/g, "");
  });
  var germenRuns = findCultivoGermenRuns(lineasTexto);
  var mycoOut = parseMycobacteriasStudies_(lineasTexto, fechaC);
  if (mycoOut && !germenRuns.length) return mycoOut;
  var sitio = buildCultivoTipoDisplay(detectTipoCultivoLine(lineasTexto), detectMuestraDesdeProducto(lineasTexto));
  var reportePreliminar = /REPORTE\s+PRELIMINAR/i.test(lineasTexto.join("\n"));
  if (germenRuns.length) {
    return parseCultivoGermenRuns_(germenRuns, lineasTexto, sitio, fechaC, reportePreliminar);
  }
  return parseCultivoNegativo_(tNorm, tUpper, sitio, fechaC);
}

// public/js/labs-grupo-sangre.mjs
function hasGrupoSangreMarkers_(textoBruto) {
  return /GRUPO\s+SANGU[IÍ]NEO/i.test(textoBruto) || /COOMBS\s+DIRECTO/i.test(textoBruto) || /COOMBS\s+INDIRECTO/i.test(textoBruto);
}
function normalizeGrupoRh_(raw) {
  var s = String(raw || "").toUpperCase().replace(/−/g, "-").replace(/\s+/g, " ").trim();
  if (!s) return "";
  var m = s.match(/^(A|B|AB|O)\s*(POSITIVO|NEGATIVO|\+|-)$/);
  if (!m) return "";
  var rh = m[2] === "POSITIVO" || m[2] === "+" ? "+" : "-";
  return m[1] + rh;
}
function formatCoombsToken_(raw) {
  var s = String(raw || "").toUpperCase().replace(/\s+/g, " ").trim();
  if (!s) return "";
  var strength = (s.match(/(?:^|[^0-9A-Z])([1-4]\+)(?![0-9A-Z])/) || [])[1];
  var hasPos = /\bPOSITIVO\b/.test(s) || !!strength;
  var hasNeg = /\bNEGATIVO\b/.test(s);
  if (hasPos) return (strength || "pos") + "*";
  if (hasNeg) return "neg";
  return "";
}
function isLabelOrNoise_(line) {
  return !line || /^ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA$/i.test(line) || /^BANCO\s+DE\s+SANGRE$/i.test(line) || /^REPORTE\s+DE\s+GRUPO/i.test(line) || /^GRUPO\s+SANGU/i.test(line) || /^COOMBS\s+(DIRECTO|INDIRECTO)/i.test(line);
}
function resultFromSameOrNextLine_(lineas, i) {
  var same = String(lineas[i] || "");
  var tabIdx = same.indexOf("	");
  if (tabIdx >= 0) {
    var after = same.substring(tabIdx + 1).replace(/\t/g, " ").trim();
    if (after && !isLabelOrNoise_(after)) return after;
  }
  for (var j = i + 1; j < Math.min(i + 6, lineas.length); j++) {
    var t = String(lineas[j] || "").replace(/\t/g, " ").trim();
    if (isLabelOrNoise_(t)) {
      if (/^GRUPO\s+SANGU|^COOMBS\s+(DIRECTO|INDIRECTO)/i.test(t)) break;
      continue;
    }
    return t;
  }
  return "";
}
function findEstudioResult_(lineas, pattern) {
  for (var i = 0; i < lineas.length; i++) {
    var head = String(lineas[i] || "").replace(/\t.*$/, "").trim();
    if (!pattern.test(head)) continue;
    return resultFromSameOrNextLine_(lineas, i);
  }
  return "";
}
function parseGrupoSangreCoombs_(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") return "";
  if (!hasGrupoSangreMarkers_(textoBruto)) return "";
  var lineas = textoBruto.split(/\r?\n/).map(function(l) {
    return String(l || "").trim();
  });
  var grupo = normalizeGrupoRh_(
    findEstudioResult_(lineas, /^GRUPO\s+SANGU[IÍ]NEO(?:\s*\/\s*RH)?$/i)
  );
  var cd = formatCoombsToken_(findEstudioResult_(lineas, /^COOMBS\s+DIRECTO$/i));
  var ci = formatCoombsToken_(findEstudioResult_(lineas, /^COOMBS\s+INDIRECTO$/i));
  var parts = [];
  if (grupo) parts.push(grupo);
  if (cd) parts.push("CD " + cd);
  if (ci) parts.push("CI " + ci);
  if (!parts.length) return "";
  return "GS	" + parts.join(" ");
}

// public/js/labs-panel-defs.mjs
var LAB_EXTENDED_PANEL_DEFS = [
  {
    sectionKey: "TIR",
    mode: "num",
    gates: [/\bTSH\b/i, /T4\s*LIBRE/i, /TIROXINA\s+LIBRE/i, /TIROIDES/i],
    fields: [
      { key: "TSH", labels: ["TSH", "HORMONA ESTIMULANTE DE LA TIROIDES", "HORMONA ESTIMULANTE DE TIROIDES"] },
      { key: "T4L", labels: ["T4 LIBRE", "TIROXINA LIBRE", "FT4"] },
      { key: "T3L", labels: ["T3 LIBRE", "TRIYODOTIRONINA LIBRE", "FT3"] },
      { key: "T4T", labels: ["T4 TOTAL", "TIROXINA TOTAL"] },
      { key: "T3T", labels: ["T3 TOTAL", "TRIYODOTIRONINA TOTAL"] },
      { key: "AntiTPO", labels: ["ANTI TPO", "ANTICUERPOS ANTI TPO", "ANTI-TPO"] },
      { key: "AntiTg", labels: ["ANTI TIROGLOBULINA", "ANTICUERPOS ANTI TIROGLOBULINA", "ANTI-TG"] }
    ]
  },
  {
    sectionKey: "ENDO",
    mode: "num",
    gates: [
      /HEMOGLOBINA\s+GLICOSILADA/i,
      /\bHBA1C\b/i,
      /\bCORTISOL\b/i,
      /\bPTH\b/i,
      /VITAMINA\s+D/i,
      /\bINSULINA\b/i,
      /PEPTIDO\s+C/i,
      /PROLACTINA/i
    ],
    fields: [
      { key: "HbA1c", labels: ["HEMOGLOBINA GLICOSILADA", "HBA1C", "HB A1C"] },
      { key: "Cortisol", labels: ["CORTISOL"] },
      { key: "PTH", labels: ["PTH", "HORMONA PARATIROIDEA", "PARATHORMONA"] },
      { key: "VitD", labels: ["VITAMINA D 25 OH", "VITAMINA D 25-OH", "25-OH VITAMINA D", "VITAMINA D"] },
      { key: "Insulina", labels: ["INSULINA"] },
      { key: "PepC", labels: ["PEPTIDO C", "P\xC9PTIDO C"] },
      { key: "PRL", labels: ["PROLACTINA"] },
      { key: "LH", labels: ["HORMONA LUTEINIZANTE", "LH "] },
      { key: "FSH", labels: ["HORMONA FOLICULO ESTIMULANTE", "FSH "] },
      { key: "E2", labels: ["ESTRADIOL"] },
      { key: "Testo", labels: ["TESTOSTERONA"] },
      { key: "bHCG", labels: ["BETA HCG", "BHCG", "GONADOTROFINA CORIONICA"] }
    ]
  },
  {
    sectionKey: "CARD",
    mode: "num",
    gates: [/NT-?PROBNP/i, /\bBNP\b/i, /CK-?MB/i, /MIOGLOBINA/i],
    fields: [
      { key: "NTproBNP", labels: ["NT-PROBNP", "NT PROBNP", "NTproBNP"] },
      { key: "BNP", labels: ["BNP ", "PEPTIDO NATRIURETICO"] },
      { key: "CKMB", labels: ["CK-MB", "CK MB", "CKMB"] },
      { key: "Mio", labels: ["MIOGLOBINA"] }
    ]
  },
  {
    sectionKey: "FE",
    mode: "num",
    gates: [/HIERRO\s+SERICO/i, /\bFERRITINA\b/i, /SATURACION\s+DE\s+TRANSFERRINA/i, /FIJACION\s+DE\s+HIERRO/i],
    fields: [
      { key: "Fe", labels: ["HIERRO SERICO", "HIERRO S\xC9RICO", "HIERRO "] },
      { key: "TIBC", labels: ["CAPACIDAD DE FIJACION DE HIERRO", "TIBC", "CTFH"] },
      { key: "Sat", labels: ["% DE SATURACION DE TRANSFERRINA", "SATURACION DE TRANSFERRINA", "% SATURACION"] },
      { key: "Ferr", labels: ["FERRITINA"] },
      { key: "Transf", labels: ["TRANSFERRINA"] }
    ]
  },
  {
    sectionKey: "INFL",
    mode: "num",
    gates: [/FACTOR\s+REUMATOIDE/i, /IGE\s+TOTAL/i, /INMUNOGLOBULINA\s+E/i],
    fields: [
      { key: "FR", labels: ["FACTOR REUMATOIDE"] },
      { key: "IgE", labels: ["IGE TOTAL", "INMUNOGLOBULINA E"] }
    ]
  },
  {
    sectionKey: "INM",
    mode: "num",
    gates: [/COMPLEMENTO\s+C3/i, /COMPLEMENTO\s+C4/i, /\bC3\b/i, /\bC4\b/i],
    fields: [
      { key: "C3", labels: ["COMPLEMENTO C3"] },
      { key: "C4", labels: ["COMPLEMENTO C4"] },
      { key: "IgG", labels: ["INMUNOGLOBULINA G"] },
      { key: "IgA", labels: ["INMUNOGLOBULINA A"] },
      { key: "IgM", labels: ["INMUNOGLOBULINA M"] }
    ]
  },
  {
    sectionKey: "META",
    mode: "num",
    gates: [/\bAMONIO\b/i, /OSMOLARIDAD\s+SERICA/i, /OSMOLALIDAD\s+SERICA/i, /LACTATO\s+SERICO/i],
    fields: [
      { key: "NH3", labels: ["AMONIO"] },
      { key: "Osm", labels: ["OSMOLARIDAD SERICA", "OSMOLALIDAD SERICA", "OSMOLARIDAD"] },
      { key: "LacS", labels: ["LACTATO SERICO", "LACTATO S\xC9RICO"] }
    ]
  },
  {
    sectionKey: "NEF",
    mode: "num",
    gates: [/CISTATINA\s+C/i, /MICROALBUMINURIA/i, /ALBUMINA\s*\/\s*CREATININA/i, /PROTEINA\s*\/\s*CREATININA/i],
    fields: [
      { key: "CysC", labels: ["CISTATINA C"] },
      { key: "AlbCr", labels: ["MICROALBUMINURIA", "ALBUMINA/CREATININA", "ALBUMINA / CREATININA", "RELACION ALBUMINA CREATININA"] },
      { key: "ProtCr", labels: ["PROTEINA/CREATININA", "PROTEINA / CREATININA", "RELACION PROTEINA CREATININA"] }
    ]
  },
  {
    sectionKey: "NIVEL",
    mode: "num",
    gates: [
      /VANCOMICINA/i,
      /DIGOXINA/i,
      /\bLITIO\b/i,
      /ACIDO\s+VALPROICO/i,
      /CARBAMAZEPINA/i,
      /FENITOINA/i,
      /TACROLIMUS/i,
      /CICLOSPORINA/i
    ],
    fields: [
      { key: "Vanco", labels: ["VANCOMICINA"] },
      { key: "Dig", labels: ["DIGOXINA"] },
      { key: "Li", labels: ["LITIO"] },
      { key: "VPA", labels: ["ACIDO VALPROICO", "\xC1CIDO VALPROICO", "VALPROATO"] },
      { key: "Carb", labels: ["CARBAMAZEPINA"] },
      { key: "Fenit", labels: ["FENITOINA", "FENITO\xCDNA"] },
      { key: "Tacro", labels: ["TACROLIMUS"] },
      { key: "Ciclo", labels: ["CICLOSPORINA"] }
    ]
  },
  {
    sectionKey: "TM",
    mode: "num",
    gates: [/\bAFP\b/i, /\bCEA\b/i, /CA\s*125/i, /CA\s*19-?9/i, /CA\s*15-?3/i, /\bPSA\b/i],
    fields: [
      { key: "AFP", labels: ["AFP", "ALFA FETOPROTEINA", "ALFAFETOPROTEINA"] },
      { key: "CEA", labels: ["CEA", "ANTIGENO CARCINOEMBRIONARIO"] },
      { key: "CA125", labels: ["CA 125", "CA125"] },
      { key: "CA199", labels: ["CA 19-9", "CA 199", "CA19-9"] },
      { key: "CA153", labels: ["CA 15-3", "CA 153", "CA15-3"] },
      { key: "PSA", labels: ["PSA", "ANTIGENO PROSTATICO"] }
    ]
  },
  {
    sectionKey: "NUT",
    mode: "num",
    gates: [/VITAMINA\s+B12/i, /ACIDO\s+FOLICO/i, /ÁCIDO\s+FÓLICO/i, /\bFOLATO\b/i],
    fields: [
      { key: "B12", labels: ["VITAMINA B12", "COBALAMINA"] },
      { key: "Fol", labels: ["ACIDO FOLICO", "\xC1CIDO F\xD3LICO", "FOLATO"] }
    ]
  },
  {
    sectionKey: "GI",
    mode: "num",
    gates: [/CALPROTECTINA/i, /ELASTASA\s+FECAL/i],
    fields: [
      { key: "Calpro", labels: ["CALPROTECTINA FECAL", "CALPROTECTINA"] },
      { key: "Elast", labels: ["ELASTASA FECAL", "ELASTASA PANCREATICA"] }
    ]
  },
  {
    sectionKey: "GI",
    mode: "qual",
    gates: [/SANGRE\s+OCULTA/i],
    fields: [
      { key: "SOH", patterns: [/SANGRE\s+OCULTA\s+EN\s+HECES/i, /SANGRE\s+OCULTA/i] }
    ]
  },
  {
    sectionKey: "TOX",
    mode: "num",
    gates: [/\bETANOL\b/i, /PARACETAMOL/i, /ACETAMINOFEN/i, /SALICILATO/i, /CARBOXIHEMOGLOBINA/i, /METAHEMOGLOBINA/i],
    fields: [
      { key: "EtOH", labels: ["ETANOL"] },
      { key: "APAP", labels: ["PARACETAMOL", "ACETAMINOFEN", "ACETAMINOF\xC9N"] },
      { key: "ASA", labels: ["SALICILATOS", "SALICILATO"] },
      { key: "COHb", labels: ["CARBOXIHEMOGLOBINA", "COHB"] },
      { key: "MetHb", labels: ["METAHEMOGLOBINA", "METHB"] }
    ]
  },
  {
    sectionKey: "HEPB",
    mode: "qual",
    gates: [/ANTI-?HBS/i, /ANTI-?HBC/i, /HBEAG/i, /ANTI-?HBE/i, /ANTICUERPOS\s+ANTI-?HBS/i],
    fields: [
      { key: "AntiHBs", patterns: [/ANTICUERPOS\s+ANTI-?HBS/i, /ANTI-?HBS/i, /ANTI\s+HBS/i] },
      { key: "AntiHBc", patterns: [/ANTICUERPOS\s+ANTI-?HBC/i, /ANTI-?HBC\s+IG\s*M/i, /ANTI-?HBC/i] },
      { key: "HBeAg", patterns: [/ANTIGENO\s+E.*HEPATITIS\s+B/i, /\bHBEAG\b/i] },
      { key: "AntiHBe", patterns: [/ANTICUERPOS\s+ANTI-?HBE/i, /ANTI-?HBE/i] }
    ]
  },
  {
    sectionKey: "VIRAL",
    mode: "qual",
    gates: [/\bVDRL\b/i, /RPR\b/i, /TOXOPLASMA/i, /\bCMV\b/i, /\bEBV\b/i, /RUBEOLA/i, /HERPES/i],
    fields: [
      { key: "VDRL", patterns: [/\bVDRL\b/i, /\bRPR\b/i] },
      { key: "ToxoIgM", patterns: [/IGM\s+TOXOPLASMA/i, /TOXOPLASMA\s+IGM/i, /ANTICUERPOS\s+IGM\s+TOXOPLASMA/i] },
      { key: "ToxoIgG", patterns: [/IGG\s+TOXOPLASMA/i, /TOXOPLASMA\s+IGG/i] },
      { key: "CMVIgM", patterns: [/CMV\s+IGM/i, /IGM\s+CITOMEGALOVIRUS/i] },
      { key: "EBVIgM", patterns: [/EBV\s+IGM/i, /VCA\s+IGM/i] },
      { key: "RubIgM", patterns: [/RUBEOLA\s+IGM/i, /IGM\s+RUBEOLA/i] }
    ]
  },
  {
    sectionKey: "FEB",
    mode: "qual",
    gates: [/FEBRILES\s+COMPLETAS/i, /\bT[IÍ]FICO\s*["']?[OH]["']?/i, /PARAT[IÍ]FICO\s+[AB]\b/i],
    fields: [
      { key: "TifO", patterns: [/\bT[IÍ]FICO\s*["']?O["']?/i] },
      { key: "TifH", patterns: [/\bT[IÍ]FICO\s*["']?H["']?/i] },
      { key: "ParaA", patterns: [/PARAT[IÍ]FICO\s+A\b/i] },
      { key: "ParaB", patterns: [/PARAT[IÍ]FICO\s+B\b/i] },
      { key: "Bru", patterns: [/\bBRUCELLA\b/i] },
      { key: "ProtX", patterns: [/\bPROTEUS\b/i] }
    ]
  },
  {
    sectionKey: "MICRO",
    mode: "qual",
    gates: [
      /LEGIONELLA\s+EN\s+ORINA/i,
      /NEUMOCOCO\s+EN\s+ORINA/i,
      /ESTREPTOCOCO\s+A/i,
      /INFLUENZA/i,
      /CLOSTRIDIUM\s+DIFFICILE/i,
      /C\.\s*DIFF/i
    ],
    fields: [
      { key: "LegAg", patterns: [/ANTIGENO\s+LEGIONELLA\s+EN\s+ORINA/i, /LEGIONELLA\s+EN\s+ORINA/i] },
      { key: "PneuAg", patterns: [/ANTIGENO\s+NEUMOCOCO\s+EN\s+ORINA/i, /NEUMOCOCO\s+EN\s+ORINA/i] },
      { key: "StrepA", patterns: [/ESTREPTOCOCO\s+DEL\s+GRUPO\s+A/i, /ESTREPTOCOCO\s+A/i] },
      { key: "FluAg", patterns: [/ANTIGENO\s+INFLUENZA/i, /INFLUENZA\s+A\s*\/\s*B/i] },
      { key: "Cdiff", patterns: [/CLOSTRIDIUM\s+DIFFICILE/i, /C\.\s*DIFFICILE/i, /TOXINA\s+C\.\s*DIFF/i] }
    ]
  }
];
var LAB_EXTENDED_SECTION_KEYS = (function() {
  var seen = /* @__PURE__ */ Object.create(null);
  var keys = [];
  for (var i = 0; i < LAB_EXTENDED_PANEL_DEFS.length; i++) {
    var k = LAB_EXTENDED_PANEL_DEFS[i].sectionKey;
    if (seen[k]) continue;
    seen[k] = 1;
    keys.push(k);
  }
  return keys;
})();

// public/js/labs-panel-overlay.mjs
function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function hydrateGate(g) {
  if (typeof g !== "string") return g;
  if (/[\\^$*+?()|[\]{}]/.test(g)) return new RegExp(g, "i");
  return new RegExp(escapeRe(g), "i");
}
function hydrateField(f) {
  if (!f) return f;
  if (f.patterns) {
    return {
      key: f.key,
      patterns: (f.patterns || []).map(hydrateGate)
    };
  }
  return { key: f.key, labels: (f.labels || []).slice() };
}
function cloneDef(def) {
  return {
    sectionKey: def.sectionKey,
    mode: def.mode,
    gates: (def.gates || []).slice(),
    fields: (def.fields || []).map(function(f) {
      if (f.patterns) {
        return { key: f.key, patterns: f.patterns.slice() };
      }
      return { key: f.key, labels: (f.labels || []).slice() };
    })
  };
}
function findBuiltinIndex(list, rec) {
  var baseKey = rec.baseSectionKey || rec.sectionKey;
  var mode = rec.mode || "num";
  for (var i = 0; i < list.length; i++) {
    if (list[i].sectionKey === baseKey && list[i].mode === mode) return i;
  }
  return -1;
}
function overlayRecordToPanelDef(rec) {
  var gates = (rec.gates || []).map(hydrateGate);
  var fields = (rec.fields || []).map(hydrateField);
  return { sectionKey: rec.sectionKey, mode: rec.mode || "num", gates, fields };
}
function applyOverlayToBuiltins(builtins, overlayArr) {
  var list = (builtins || []).map(cloneDef);
  (overlayArr || []).forEach(function(rec) {
    if (String(rec.panelId || "").indexOf("builtin:") === 0) {
      var idx = findBuiltinIndex(list, rec);
      if (idx >= 0) list[idx] = overlayRecordToPanelDef(rec);
      else list.push(overlayRecordToPanelDef(rec));
    } else {
      list.push(overlayRecordToPanelDef(rec));
    }
  });
  return list;
}

// public/js/labs-panel-overlay-store.mjs
var LS_KEY = "rpc-lab-panel-overlay";
var memory = null;
function loadLabPanelOverlays() {
  if (memory !== null) return memory.slice();
  memory = [];
  try {
    if (typeof localStorage !== "undefined") {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.overlays)) {
          memory = parsed.overlays.slice();
        }
      }
    }
  } catch {
  }
  return memory.slice();
}
function getEffectivePanelDefs() {
  return applyOverlayToBuiltins(LAB_EXTENDED_PANEL_DEFS, loadLabPanelOverlays());
}

// public/js/labs-panel-parse.mjs
function panelGatesMatch_(def, texto) {
  var gates = def.gates || [];
  if (!gates.length) return true;
  for (var i = 0; i < gates.length; i++) {
    if (gates[i].test(texto)) return true;
  }
  return false;
}
function fmtNumField_(labels, texto, fieldKey, priorRefs) {
  var data = extraerConRangoPanel(labels, texto);
  return fmtLabRanged_(data, fieldKey, priorRefs);
}
function parseNumericPanel_(def, texto, priorRefs) {
  if (!texto || !panelGatesMatch_(def, texto)) return "";
  var parts = [];
  for (var i = 0; i < def.fields.length; i++) {
    var f = def.fields[i];
    var val = fmtNumField_(f.labels, texto, f.key, priorRefs);
    if (val !== "---") parts.push(f.key, val);
  }
  if (!parts.length) return "";
  return def.sectionKey + "	" + parts.join(" ");
}
function formatQualSco_(raw) {
  var n = parseFloat(String(raw || "").replace(",", "."));
  if (!isFinite(n)) return String(raw || "").trim();
  return n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}
function qualShort_(qual) {
  var q = String(qual || "").toUpperCase();
  if (q === "NEGATIVO") return "neg";
  if (q === "POSITIVO") return "pos*";
  if (q === "INDETERMINADO") return "indet*";
  return "";
}
function lineMatchesPatterns_(line, patterns) {
  for (var p = 0; p < patterns.length; p++) {
    if (patterns[p].test(line)) return true;
  }
  return false;
}
function isQualFollowNoiseLine_(t) {
  if (!t || t === ":") return true;
  if (/^ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA$/i.test(t)) return true;
  if (/^S\/CO$/i.test(t)) return true;
  if (/^(Positivo|Indeterminado|Negativo)\s*[<>=]/i.test(t)) return true;
  return false;
}
function qualDupTitleDecision_(t, j, i, sco, qual) {
  if (!/^(Anticuerpos|Ant[ií]geno|Antigeno)\b/i.test(t) || j <= i + 1) return "none";
  if (sco == null && !qual) return "skip";
  return "break";
}
function readQualFromFollowLines_(lineas, i) {
  var sco = null;
  var qual = "";
  for (var j = i + 1; j < Math.min(i + 12, lineas.length); j++) {
    var t = String(lineas[j] || "").replace(/\*/g, "").trim();
    if (isQualFollowNoiseLine_(t)) continue;
    var dup = qualDupTitleDecision_(t, j, i, sco, qual);
    if (dup === "skip") continue;
    if (dup === "break") break;
    var mNum = t.match(/^(\d+\.\d+|\d+)$/);
    if (mNum && sco === null) {
      sco = mNum[1];
      continue;
    }
    var mQ = t.match(/^(NEGATIVO|POSITIVO|INDETERMINADO)$/i);
    if (mQ) {
      qual = mQ[1].toUpperCase();
      break;
    }
  }
  return qual ? { sco, qual } : null;
}
function extractQualField_(lineas, patterns) {
  for (var i = 0; i < lineas.length; i++) {
    var line = String(lineas[i] || "").replace(/\t.*$/, "").trim();
    if (!line || !lineMatchesPatterns_(line, patterns)) continue;
    return readQualFromFollowLines_(lineas, i);
  }
  return null;
}
function parseQualPanel_(def, texto) {
  if (!texto || !panelGatesMatch_(def, texto)) return "";
  var lineas = texto.split(/\r?\n/).map(function(l) {
    return String(l || "").trim();
  });
  var parts = [];
  for (var e = 0; e < def.fields.length; e++) {
    var f = def.fields[e];
    var res = extractQualField_(lineas, f.patterns);
    if (!res || !res.qual) continue;
    var q = qualShort_(res.qual);
    if (!q) continue;
    var token = f.key + " " + q;
    if (res.sco != null) token += " (" + formatQualSco_(res.sco) + ")";
    parts.push(token);
  }
  if (!parts.length) return "";
  return def.sectionKey + "	" + parts.join(" ");
}
function parsePanelDef_(def, texto, priorRefs) {
  if (!def) return "";
  if (def.mode === "qual") return parseQualPanel_(def, texto);
  return parseNumericPanel_(def, texto, priorRefs);
}
function mergeSectionLines_(lines) {
  var bodies = /* @__PURE__ */ Object.create(null);
  var order = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var tab = line.indexOf("	");
    if (tab < 0) continue;
    var key = line.slice(0, tab);
    var body = line.slice(tab + 1).trim();
    if (!body) continue;
    if (!bodies[key]) {
      bodies[key] = [];
      order.push(key);
    }
    bodies[key].push(body);
  }
  return order.map(function(k) {
    return k + "	" + bodies[k].join(" ");
  });
}
function parseExtendedLabPanels_(textoBruto, priorRefsBySection) {
  if (!textoBruto || typeof textoBruto !== "string") return [];
  var out = [];
  var defs = getEffectivePanelDefs();
  var priorMap = priorRefsBySection && typeof priorRefsBySection === "object" ? priorRefsBySection : null;
  for (var i = 0; i < defs.length; i++) {
    var def = defs[i];
    var prior = priorMap && def ? priorMap[def.sectionKey] : null;
    var line = parsePanelDef_(def, textoBruto, prior);
    if (line) out.push(line);
  }
  return mergeSectionLines_(out);
}

// public/js/labs.js
var procesarLabs = createProcesarLabs({
  bloqueCitoquimicoLiquidosFull,
  dedupeSingletonSections_,
  buildRefsBySectionFromReport,
  extractLabReportFechaDMY,
  extractLabReportHora,
  parseBH_,
  parseQS_,
  parseESC_,
  parsePFH_,
  parseLipasa_,
  parseTroponina_,
  parseGrupoSangreCoombs_,
  parsePlaquetasCitrato_,
  parseGaso_,
  parsePIE_,
  parsearLCR,
  parsearCitoquimicoLiquidos,
  formatCitoquimicoInterpretacionLine_,
  buildCitoquimicoInterpretAlerts_,
  parseFisicoquimicoHeces_,
  parseFrotisSangre_,
  parseEGO_,
  parseCuantOrina_,
  parseCultivo_,
  parseSerologiaBancoSangre_,
  parseExtendedLabPanels_
});

export {
  escTxt,
  isLabSectionHeaderHtml,
  renderEntry,
  parseCuentaFromCultivoChunkLines,
  formatCultivoCondensedForCopy,
  buildAtbRisSummaryHtml,
  extractSensCrudasForGermFromSource,
  isParsedCultivoHeaderLine,
  sortResLabsByClinicalOrder,
  looksLikeLabSectionChunk,
  sanitizeResLabsChunks,
  extractLabExpedienteFromReport,
  isCitoquimInterpretacionResLabChunk,
  resLabsHasCitoquimFluid_,
  refreshCitoquimicoInterpretacionInResLabs_,
  LAB_EXTENDED_PANEL_DEFS,
  procesarLabs
};
//# sourceMappingURL=/js/chunks/chunk-CZ2M277B.js.map
