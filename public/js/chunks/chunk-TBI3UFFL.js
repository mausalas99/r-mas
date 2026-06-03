import {
  CLINICAL_LS_KEYS,
  computeSalaAbcdefDeficitWrite,
  dedupeTrendSetsForSeries,
  ensureMonitoreo,
  evaluateClinicalScope,
  filterTodosRespectingDismissals,
  formatMemberCycleLabel,
  getCycleFieldMetaForTeamCreate,
  getCycleLettersForTeamCreate,
  getGlucometriaRegistroWindow,
  getJoinedTeams,
  getSetTrendValueForSeries,
  indicaciones,
  inferMembershipCycleForJoin,
  isAbgAnalysisHidden,
  isDbMode,
  isManejoTabGloballyHidden,
  isOnCallToday,
  isVpoDxInferenceHidden,
  labHistory,
  listadoProblemas,
  medNotaSelectionByPatient,
  medPharmProfileByPatient,
  medRecetaByPatient,
  mergeMonitoreo,
  mergePatientMonitoreoFromImported,
  migratePatientMonitoreo,
  migratePatientsClinicalSala,
  notes,
  patients,
  recetaHuByPatient,
  resolveMembershipCycleForUser,
  salaOnCallR1,
  salaOnCallR2,
  saveState,
  setPatients,
  setSaveStateHooks,
  storage,
  tendEligibleSectionKey,
  vpoByPatient
} from "/js/chunks/chunk-NWJJI23U.js";
import {
  persistClinicalUserBinding,
  readRpcSettings,
  resolveClinicalClientId
} from "/js/chunks/chunk-ZYO74J2K.js";

// public/js/labs.js
function extraerConRango(nombres, texto) {
  if (!texto) return { valor: "---", min: null, max: null };
  var t2 = texto.toUpperCase();
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i].toUpperCase();
    var idx = t2.indexOf(nombre);
    if (idx === -1) continue;
    var start = idx + nombre.length;
    var sub = texto.substring(start, start + 220);
    var mValor = sub.match(/(-?\d+[.,]?\d*)/);
    if (!mValor) continue;
    var valorStr = mValor[1];
    var mRango = sub.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
    if (!mRango) return { valor: valorStr, min: null, max: null };
    return {
      valor: valorStr,
      min: parseFloat(mRango[1].replace(",", ".")),
      max: parseFloat(mRango[2].replace(",", "."))
    };
  }
  return { valor: "---", min: null, max: null };
}
function esContextoUrinario_(texto, idxNombre, nombreLen) {
  var b = Math.min(texto.length, idxNombre + nombreLen + 90);
  var w = texto.substring(idxNombre, b).toUpperCase();
  if (/\bEN\s+ORINA\b/.test(w)) return true;
  if (/\bURINARIO\b/.test(w)) return true;
  if (/\bURINARIA\b/.test(w)) return true;
  return false;
}
function esContextoSedimentoOrina_(texto, idxNombre, nombreLen) {
  var w = texto.substring(idxNombre, Math.min(texto.length, idxNombre + nombreLen + 120));
  if (/\/CAMPO\b/i.test(w)) return true;
  if (/Leucocitos\/uL|Hem\/uL|E\.U\.\/dL/i.test(w)) return true;
  var head = texto.substring(Math.max(0, idxNombre - 4500), idxNombre).toUpperCase();
  if (!/URIANALISIS|EXAMEN GENERAL DE ORINA|ANALISIS DE ORINA/.test(head)) return false;
  var lastOrina = Math.max(
    head.lastIndexOf("URIANALISIS"),
    head.lastIndexOf("EXAMEN GENERAL DE ORINA"),
    head.lastIndexOf("ANALISIS DE ORINA")
  );
  if (lastOrina === -1) return true;
  var after = head.substring(lastOrina);
  return !/BIOMETRIA\s+HEMATICA|\bHGB\b|\bWBC\b|\bRBC\s+\d|\bPLT\s+\d/i.test(after);
}
function extraerConRangoBH(nombres, texto) {
  if (!texto) return { valor: "---", min: null, max: null };
  var t2 = texto.toUpperCase();
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i].toUpperCase();
    var start = 0;
    while (true) {
      var idx = t2.indexOf(nombre, start);
      if (idx === -1) break;
      if (esContextoSedimentoOrina_(texto, idx, nombre.length)) {
        start = idx + nombre.length;
        continue;
      }
      var subStart = idx + nombre.length;
      var sub = texto.substring(subStart, subStart + 220);
      var mValor = sub.match(/(-?\d+[.,]?\d*)/);
      if (!mValor) {
        start = idx + nombre.length;
        continue;
      }
      var valorStr = mValor[1];
      var mRango = sub.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
      if (!mRango) return { valor: valorStr, min: null, max: null };
      return {
        valor: valorStr,
        min: parseFloat(mRango[1].replace(",", ".")),
        max: parseFloat(mRango[2].replace(",", "."))
      };
    }
  }
  return { valor: "---", min: null, max: null };
}
function extraerConRangoSuero(nombres, texto) {
  if (!texto) return { valor: "---", min: null, max: null };
  var t2 = texto.toUpperCase();
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i].toUpperCase();
    var start = 0;
    while (true) {
      var idx = t2.indexOf(nombre, start);
      if (idx === -1) break;
      if (esContextoUrinario_(texto, idx, nombre.length)) {
        start = idx + nombre.length;
        continue;
      }
      var subStart = idx + nombre.length;
      var sub = texto.substring(subStart, subStart + 220);
      var mValor = sub.match(/(-?\d+[.,]?\d*)/);
      if (!mValor) {
        start = idx + nombre.length;
        continue;
      }
      var valorStr = mValor[1];
      var mRango = sub.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
      if (!mRango) return { valor: valorStr, min: null, max: null };
      return {
        valor: valorStr,
        min: parseFloat(mRango[1].replace(",", ".")),
        max: parseFloat(mRango[2].replace(",", "."))
      };
    }
  }
  return { valor: "---", min: null, max: null };
}
function marcarSegunRango(valorStr, min, max) {
  if (valorStr === "---" || valorStr == null) return valorStr;
  var v = parseFloat(String(valorStr).replace(",", "."));
  if (isNaN(v) || min == null || max == null) return valorStr;
  return v < min || v > max ? valorStr + "*" : valorStr;
}
function fmt(val) {
  if (!val || val === "---") return val;
  var star = val.endsWith("*");
  var n = parseFloat((star ? val.slice(0, -1) : val).replace(",", "."));
  if (isNaN(n)) return val;
  return String(n) + (star ? "*" : "");
}
var BH_EXTRA_DISPLAY_LABELS = {
  RBC: "Eri",
  CHCM: "CHCM",
  RDW: "RDW",
  MPV: "VPM",
  Ret: "Ret",
  Lin: "Lin#",
  Mono: "Mono#",
  Baso: "Baso#",
  NeuPct: "Seg",
  LinPct: "Lin",
  MonoPct: "Mono",
  EosPct: "Eos",
  BasoPct: "Baso",
  Bandas: "Band",
  Mielo: "Mielo",
  Metamielo: "Meta",
  Promielo: "Prom",
  Blastos: "Blast",
  Atipicos: "Atip"
};
var BH_DIFF_DISPLAY_ORDER = [
  "NeuPct",
  "LinPct",
  "MonoPct",
  "EosPct",
  "BasoPct",
  "Bandas",
  "Mielo",
  "Metamielo",
  "Promielo",
  "Blastos",
  "Atipicos"
];
var BH_SCALAR_EXT_ORDER = ["RBC", "CHCM", "RDW", "MPV", "Ret", "Lin", "Mono", "Baso"];
var BH_SOME_TREND_ORDER = [
  "RBC",
  "Hb",
  "Hto",
  "VCM",
  "HCM",
  "CHCM",
  "RDW",
  "Leu",
  "Neu",
  "NeuPct",
  "Lin",
  "LinPct",
  "Mono",
  "MonoPct",
  "Eos",
  "EosPct",
  "Baso",
  "BasoPct",
  "Plt",
  "MPV",
  "Ret",
  "TP",
  "TTP",
  "INR",
  "Fib",
  "DD",
  "Bandas",
  "Mielo",
  "Metamielo",
  "Promielo",
  "Blastos",
  "Atipicos"
];
var QS_SOME_TREND_ORDER = [
  "Glu",
  "BUN",
  "Cr",
  "eTFG",
  "AU",
  "PCR",
  "PCT",
  "COL",
  "TGL",
  "VSG",
  "CPK"
];
function sortTrendSpecsBySomeOrder(sectionKey, specs) {
  var order = sectionKey === "BH" ? BH_SOME_TREND_ORDER : sectionKey === "QS" ? QS_SOME_TREND_ORDER : null;
  if (!order) return (specs || []).slice();
  var rank = /* @__PURE__ */ Object.create(null);
  order.forEach(function(fk, i) {
    rank[fk] = i;
  });
  return (specs || []).slice().sort(function(a, b) {
    var ra = Object.prototype.hasOwnProperty.call(rank, a.fieldKey) ? rank[a.fieldKey] : 9999;
    var rb = Object.prototype.hasOwnProperty.call(rank, b.fieldKey) ? rank[b.fieldKey] : 9999;
    if (ra !== rb) return ra - rb;
    return String(a.cardTitle || a.fieldKey).localeCompare(String(b.cardTitle || b.fieldKey), "es");
  });
}
var BH_DIFF_RANGE_LABELS = {
  NeuPct: ["SEGMENTADOS", "NEU%", "NEUTROFILOS%"],
  LinPct: ["LINFOCITOS", "LYM%", "LINFOCITOS%"],
  MonoPct: ["MONOCITOS", "MONO%"],
  EosPct: ["EOSINOFILOS", "EOS%"],
  BasoPct: ["BASOFILOS", "BASO%"],
  Bandas: ["BANDAS", "CAYADOS"],
  Mielo: ["MIELOCITOS"],
  Metamielo: ["METAMIELOCITOS"],
  Promielo: ["PROMIELOCITOS"],
  Blastos: ["BLASTOS"],
  Atipicos: ["LINF. ATIPICOS", "LINF ATIPICOS", "LINFOCITOS ATIPICOS", "VARIANTES", "ATIPICOS"]
};
function bhExtraDisplayLabel(key) {
  return BH_EXTRA_DISPLAY_LABELS[key] || key;
}
var BH_TREND_TITLES = {
  NeuPct: "Segmentados",
  LinPct: "Linfocitos",
  MonoPct: "Monocitos",
  EosPct: "Eosin\xF3filos",
  BasoPct: "Bas\xF3filos",
  Bandas: "Bandas",
  Mielo: "Mielocitos",
  Metamielo: "Metamielocitos",
  Promielo: "Promielocitos",
  Blastos: "Blastos",
  Atipicos: "Linf. at\xEDpicos"
};
function bhTrendDisplayTitle(fieldKey) {
  return BH_TREND_TITLES[fieldKey] || bhExtraDisplayLabel(fieldKey) || fieldKey;
}
var BH_OUTPUT_LABEL_TO_FIELD = {
  Seg: "NeuPct",
  Lin: "LinPct",
  Mono: "MonoPct",
  Eos: "EosPct",
  Baso: "BasoPct",
  Band: "Bandas",
  Meta: "Metamielo",
  Mielo: "Mielo",
  Prom: "Promielo",
  Blast: "Blastos",
  Atip: "Atipicos",
  NeuPct: "NeuPct",
  LinPct: "LinPct",
  MonoPct: "MonoPct",
  EosPct: "EosPct",
  BasoPct: "BasoPct",
  Bandas: "Bandas",
  Metamielo: "Metamielo",
  Promielo: "Promielo",
  Blastos: "Blastos",
  Atipicos: "Atipicos",
  Hb: "Hb",
  Hto: "Hto",
  VCM: "VCM",
  HCM: "HCM",
  Leu: "Leu",
  Neu: "Neu",
  Plt: "Plt",
  RBC: "RBC",
  Eri: "RBC",
  CHCM: "CHCM",
  RDW: "RDW",
  VPM: "MPV",
  MPV: "MPV",
  Ret: "Ret",
  TP: "TP",
  TTP: "TTP",
  INR: "INR",
  Fib: "Fib",
  DD: "DD"
};
function bhFieldKeyFromOutputLabel(label) {
  return BH_OUTPUT_LABEL_TO_FIELD[label] || label;
}
function parseBhTokenPairs_(text, into) {
  if (!text) return;
  var tokens = String(text).trim().split(/\s+/);
  var i = 0;
  while (i < tokens.length) {
    var label = tokens[i];
    if (!label || label === "-") {
      i++;
      continue;
    }
    var next = tokens[i + 1];
    if (next == null) {
      i++;
      continue;
    }
    var m = next.match(/^(-?\d+(?:[.,]\d+)?)(?:%)?(\*)?$/);
    if (m) {
      var fk = bhFieldKeyFromOutputLabel(label);
      var val = m[1].replace(",", ".");
      into[fk] = { val, ab: next.indexOf("*") >= 0 };
      i += 2;
    } else {
      i++;
    }
  }
}
function parseBhTrendValuesFromResLab(entry) {
  var out = {};
  if (!entry) return out;
  var lines = String(entry).split(/\r?\n/);
  lines.forEach(function(line) {
    var trimmed = line.trim();
    if (!trimmed) return;
    var tab = trimmed.indexOf("	");
    if (tab < 0) return;
    var head = trimmed.substring(0, tab).trim().replace(/:$/, "");
    var body = trimmed.substring(tab + 1).trim();
    if (/^BH$/i.test(head)) {
      parseBhTokenPairs_(body, out);
      return;
    }
    if (body) parseBhTokenPairs_(body, out);
  });
  return out;
}
function formatBhDiffPctDisplay_(key, rawVal, tNorm) {
  var label = bhExtraDisplayLabel(key);
  var val = String(rawVal);
  var labels = BH_DIFF_RANGE_LABELS[key];
  if (labels && tNorm) {
    var d = extraerConRangoBH(labels, tNorm);
    if (d.valor && d.valor !== "---") {
      val = fmt(marcarSegunRango(d.valor, d.min, d.max));
    }
  }
  if (val.endsWith("*")) return label + " " + val.slice(0, -1) + "%*";
  return label + " " + val + "%";
}
function formatBhExtrasDisplayParts(bhExtras, sourceText) {
  if (!bhExtras || typeof bhExtras !== "object") return [];
  var tNorm = sourceText ? String(sourceText) : "";
  var parts = [];
  var seen = {};
  function addScalarKey(k) {
    if (seen[k]) return;
    var v = bhExtras[k];
    if (v == null || String(v).trim() === "") return;
    seen[k] = true;
    parts.push(bhExtraDisplayLabel(k) + " " + String(v));
  }
  BH_SCALAR_EXT_ORDER.forEach(addScalarKey);
  BH_DIFF_DISPLAY_ORDER.forEach(function(k) {
    if (seen[k] || !bhExtras[k]) return;
    seen[k] = true;
    parts.push(formatBhDiffPctDisplay_(k, bhExtras[k], tNorm));
  });
  Object.keys(bhExtras).forEach(function(k) {
    if (seen[k]) return;
    var v = bhExtras[k];
    if (v == null || String(v).trim() === "") return;
    seen[k] = true;
    if (BH_DIFF_DISPLAY_ORDER.indexOf(k) !== -1) {
      parts.push(formatBhDiffPctDisplay_(k, v, tNorm));
    } else {
      parts.push(bhExtraDisplayLabel(k) + " " + String(v));
    }
  });
  return parts;
}
function formatBhExtrasDisplayLine(bhExtras, sourceText) {
  var parts = formatBhExtrasDisplayParts(bhExtras, sourceText);
  if (!parts.length) return "";
  return "BH ext	" + parts.join("  ");
}
function pairListToDisplay_(pairs) {
  var out = [];
  for (var i = 0; i < pairs.length; i += 2) {
    if (pairs[i + 1] !== void 0) out.push(pairs[i] + " " + pairs[i + 1]);
  }
  return out.join("  ");
}
function parseBH_(tNorm) {
  function extraerSimple(labels, texto) {
    if (!texto) return "";
    for (var li = 0; li < labels.length; li++) {
      var lbl = labels[li];
      var idx = -1;
      var up = String(texto).toUpperCase();
      var lu = lbl.toUpperCase();
      var from = 0;
      while (true) {
        var p = up.indexOf(lu, from);
        if (p === -1) break;
        var after = up.charAt(p + lu.length);
        var before = up.charAt(p - 1) || " ";
        var isWordBoundaryBefore = !/[A-Z0-9_]/.test(before);
        var isExactBoundary = lu.charAt(lu.length - 1) === "%" || !/[A-Z0-9]/.test(after);
        if (isWordBoundaryBefore && isExactBoundary) {
          idx = p + lu.length;
          break;
        }
        from = p + lu.length;
      }
      if (idx === -1) continue;
      var sub2 = texto.substring(idx, idx + 80);
      var m = sub2.match(/(-?\d+[.,]?\d*)/);
      if (m) return m[1].replace(",", ".");
    }
    return "";
  }
  var hbData = extraerConRango(["HGB", "HEMOGLOBINA TOTAL", "HEMOGLOBINA"], tNorm);
  var htoData = extraerConRango(["HCT ", "HEMATOCRITO"], tNorm);
  var vcmData = extraerConRango(["MCV ", "VCM "], tNorm);
  var hcmData = extraerConRango(["MCH ", "HCM "], tNorm);
  var leuData = extraerConRango(["WBC "], tNorm);
  var neuData = extraerConRango(["NEU "], tNorm);
  var eosData = extraerConRango(["EOS "], tNorm);
  var pltData = extraerConRango(["PLT "], tNorm);
  var retData = extraerConRango(["RETICULOCITOS"], tNorm);
  var tpData = extraerConRango(["TIEMPO DE PROTROMBINA"], tNorm);
  var ttpData = extraerConRango(["TIEMPO DE TROMBOPLASTINA"], tNorm);
  var inrData = extraerConRango(["INR ", "INR"], tNorm);
  var fibData = extraerConRango(["FIBRINOGENO"], tNorm);
  var ddData = extraerConRango(["DIMERO D", "D-DIMERO", "D DIMERO"], tNorm);
  var rbcData = extraerConRangoBH(["RBC ", "ERITROCITOS", "HEMATIES"], tNorm);
  var chcmData = extraerConRango(["MCHC", "CHCM"], tNorm);
  var rdwData = extraerConRango(["RDW "], tNorm);
  var mpvData = extraerConRango(["MPV ", "VPM "], tNorm);
  var Hb = fmt(marcarSegunRango(hbData.valor, hbData.min, hbData.max));
  var Hto = fmt(marcarSegunRango(htoData.valor, htoData.min, htoData.max));
  var VCM = fmt(marcarSegunRango(vcmData.valor, vcmData.min, vcmData.max));
  var HCM = fmt(marcarSegunRango(hcmData.valor, hcmData.min, hcmData.max));
  var CHCM = fmt(marcarSegunRango(chcmData.valor, chcmData.min, chcmData.max));
  var RDW = fmt(marcarSegunRango(rdwData.valor, rdwData.min, rdwData.max));
  var Leu = fmt(marcarSegunRango(leuData.valor, leuData.min, leuData.max));
  var RBC = fmt(marcarSegunRango(rbcData.valor, rbcData.min, rbcData.max));
  var Plt = fmt(marcarSegunRango(pltData.valor, pltData.min, pltData.max));
  var MPV = fmt(marcarSegunRango(mpvData.valor, mpvData.min, mpvData.max));
  var Ret = fmt(marcarSegunRango(retData.valor, retData.min, retData.max));
  var TP = fmt(marcarSegunRango(tpData.valor, tpData.min, tpData.max));
  var TTP = fmt(marcarSegunRango(ttpData.valor, ttpData.min, ttpData.max));
  var INR = fmt(marcarSegunRango(inrData.valor, inrData.min, inrData.max));
  var Fib = fmt(marcarSegunRango(fibData.valor, fibData.min, fibData.max));
  var DD = fmt(marcarSegunRango(ddData.valor, ddData.min, ddData.max));
  var Neu = fmt(marcarSegunRango(neuData.valor, neuData.min, neuData.max));
  var Eos = fmt(marcarSegunRango(eosData.valor, eosData.min, eosData.max));
  var extras = {};
  function pushExtra(key, value) {
    if (value && value !== "---" && value !== "") extras[key] = String(value);
  }
  var linData = extraerConRango(["LYM ", "LINFOCITOS"], tNorm);
  var monoData = extraerConRango(["MONO "], tNorm);
  var basoData = extraerConRango(["BASO "], tNorm);
  if (Leu !== "---") {
    pushExtra("Lin", linData.valor);
    pushExtra("Mono", monoData.valor);
    pushExtra("Baso", basoData.valor);
  }
  pushExtra("NeuPct", extraerSimple(["NEU%", "NEUTROFILOS%", "SEGMENTADOS"], tNorm));
  pushExtra("LinPct", extraerSimple(["LYM%", "LINFOCITOS%", "LINFOCITOS"], tNorm));
  pushExtra("MonoPct", extraerSimple(["MONO%", "MONOCITOS%", "MONOCITOS"], tNorm));
  pushExtra("EosPct", extraerSimple(["EOS%", "EOSINOFILOS%", "EOSINOFILOS"], tNorm));
  pushExtra("BasoPct", extraerSimple(["BASO%", "BASOFILOS%", "BASOFILOS"], tNorm));
  pushExtra("Bandas", extraerSimple(["BANDAS", "CAYADOS"], tNorm));
  pushExtra("Mielo", extraerSimple(["MIELOCITOS"], tNorm));
  pushExtra("Metamielo", extraerSimple(["METAMIELOCITOS"], tNorm));
  pushExtra("Promielo", extraerSimple(["PROMIELOCITOS"], tNorm));
  pushExtra("Blastos", extraerSimple(["BLASTOS"], tNorm));
  pushExtra("Atipicos", extraerSimple(["LINF. ATIPICOS", "LINF ATIPICOS", "LINFOCITOS ATIPICOS", "VARIANTES", "ATIPICOS"], tNorm));
  var hasCore = [Hb, Hto, VCM, HCM, Leu, Neu, Eos, Plt].some(function(v) {
    return v !== "---";
  });
  var hasExtIdx = [RBC, CHCM, RDW, MPV, Ret].some(function(v) {
    return v !== "---";
  });
  var hasCoag = [TP, TTP, INR, Fib, DD].some(function(v) {
    return v !== "---";
  });
  if (!hasCore && !hasExtIdx && !hasCoag && Object.keys(extras).length === 0) {
    return { visible: "", extras: {} };
  }
  var corePairs = [];
  if (Hb !== "---") corePairs.push("Hb", Hb);
  if (Hto !== "---") corePairs.push("Hto", Hto);
  if (VCM !== "---") corePairs.push("VCM", VCM);
  if (HCM !== "---") corePairs.push("HCM", HCM);
  if (Leu !== "---") corePairs.push("Leu", Leu);
  if (Neu !== "---") corePairs.push("Neu", Neu);
  if (Eos !== "---") corePairs.push("Eos", Eos);
  if (Plt !== "---") corePairs.push("Plt", Plt);
  var hasCompactBody = corePairs.length > 0;
  if (hasCompactBody || hasCoag) {
    if (RBC !== "---") pushExtra("RBC", RBC);
    if (CHCM !== "---") pushExtra("CHCM", CHCM);
    if (RDW !== "---") pushExtra("RDW", RDW);
    if (MPV !== "---") pushExtra("MPV", MPV);
    if (Ret !== "---") pushExtra("Ret", Ret);
  }
  var diffDisplay = [];
  if (!hasCompactBody) {
    BH_DIFF_DISPLAY_ORDER.forEach(function(k) {
      var v = extras[k];
      if (!v || v === "0") return;
      diffDisplay.push(formatBhDiffPctDisplay_(k, v, tNorm));
    });
  }
  var indexDisplay = [];
  if (!hasCompactBody) {
    if (RBC !== "---") indexDisplay.push("Eri " + RBC);
    if (CHCM !== "---") indexDisplay.push("CHCM " + CHCM);
    if (RDW !== "---") indexDisplay.push("RDW " + RDW);
    if (MPV !== "---") indexDisplay.push("VPM " + MPV);
    if (Ret !== "---") indexDisplay.push("Ret " + Ret);
  }
  var coagDisplay = [];
  if (TP !== "---") coagDisplay.push("TP " + TP);
  if (TTP !== "---") coagDisplay.push("TTP " + TTP);
  if (INR !== "---") coagDisplay.push("INR " + INR);
  if (Fib !== "---") coagDisplay.push("Fib " + Fib);
  if (DD !== "---") coagDisplay.push("DD " + DD);
  var visible = "";
  if (hasCompactBody) {
    var lines = ["BH	" + pairListToDisplay_(corePairs)];
    if (coagDisplay.length) lines.push("  Coag.	" + coagDisplay.join("  "));
    visible = lines.join("\n");
  } else if (indexDisplay.length || diffDisplay.length || coagDisplay.length) {
    var sub = ["BH:"];
    if (indexDisplay.length) sub.push("  Hem.	" + indexDisplay.join("  "));
    if (diffDisplay.length) sub.push("  Dif.	" + diffDisplay.join("  "));
    if (coagDisplay.length) sub.push("  Coag.	" + coagDisplay.join("  "));
    visible = sub.join("\n");
  }
  return { visible, extras };
}
function extraerProcalcitonina_(texto) {
  var defaultRange = { valor: "---", min: 0, max: 0.05 };
  if (!texto) return defaultRange;
  var t2 = texto.toUpperCase();
  var positions = [];
  var start = 0;
  while (true) {
    var p = t2.indexOf("PROCALCITONINA", start);
    if (p === -1) break;
    positions.push(p);
    start = p + "PROCALCITONINA".length;
  }
  if (!positions.length) return defaultRange;
  for (var i = positions.length - 1; i >= 0; i--) {
    var pos = positions[i] + "PROCALCITONINA".length;
    var sub = texto.substring(pos, pos + 220);
    var mVal = sub.match(/(-?\d+[.,]?\d*)/);
    if (!mVal) continue;
    var valor = mVal[1];
    var rangeM = sub.match(/ADULTO[^0-9<]*<\s*=?\s*(\d+[.,]?\d*)/i);
    var max = rangeM ? parseFloat(rangeM[1].replace(",", ".")) : 0.05;
    return { valor, min: 0, max };
  }
  return defaultRange;
}
function ageYearsFromLabDemographics(edadRaw, edadUnidad) {
  var n = parseInt(String(edadRaw == null ? "" : edadRaw).trim(), 10);
  if (!isFinite(n) || n < 0) return null;
  var u = String(edadUnidad || "a\xF1os").toLowerCase();
  if (u === "meses") return n / 12;
  if (u === "d\xEDas" || u === "dias") return n / 365.25;
  if (u === "semanas") return n / 52.143;
  return n;
}
function computeEgfrCkdEpi2021Creatinine(scrMgDl, ageYears, isFemale) {
  var scr = typeof scrMgDl === "number" ? scrMgDl : parseFloat(String(scrMgDl || "").replace(/,/g, "."));
  if (!isFinite(scr) || scr <= 0) return null;
  var age = Number(ageYears);
  if (!isFinite(age) || age < 18 || age > 120) return null;
  var k = isFemale ? 0.7 : 0.9;
  var alpha = isFemale ? -0.241 : -0.302;
  var scrK = scr / k;
  var minTerm = Math.min(scrK, 1);
  var maxTerm = Math.max(scrK, 1);
  var egfr = 142 * Math.pow(minTerm, alpha) * Math.pow(maxTerm, -1.2) * Math.pow(0.9938, age) * (isFemale ? 1.012 : 1);
  if (!isFinite(egfr) || egfr <= 0) return null;
  return egfr;
}
function parseQS_(texto, patientCtx) {
  var gluData = extraerConRangoSuero(["GLUCOSA EN SANGRE", "GLUCOSA EN", "GLUCOSA"], texto);
  var crData = extraerConRangoSuero(["CREATININA EN SANGRE", "CREATININA"], texto);
  var bunData = extraerConRangoSuero(["NITROGENO DE LA UREA EN SANGRE", "NITROGENO DE LA UREA", "UREA"], texto);
  var pcrData = extraerConRangoSuero(["PROTEINA C REACTIVA", "PROTE\xCDNA C REACTIVA"], texto);
  var pctData = extraerProcalcitonina_(texto);
  var auData = extraerConRangoSuero(["ACIDO URICO EN SANGRE", "ACIDO URICO", "\xC1CIDO \xDARICO"], texto);
  var tglData = extraerConRangoSuero(["TRIGLICERIDOS", "TRIGLIC\xC9RIDOS"], texto);
  var colData = extraerConRangoSuero(["COLESTEROL"], texto);
  var vsgData = extraerConRangoSuero(["VSG ", "VELOCIDAD DE SEDIMENTACION"], texto);
  var cpkData = extraerConRangoSuero(["CPK CREATIN FOSFO QUINASA", "CPK "], texto);
  var Glu = fmt(marcarSegunRango(gluData.valor, gluData.min, gluData.max));
  var Cr = fmt(marcarSegunRango(crData.valor, crData.min, crData.max));
  var BUN = fmt(marcarSegunRango(bunData.valor, bunData.min, bunData.max));
  var PCR = fmt(marcarSegunRango(pcrData.valor, pcrData.min, pcrData.max));
  var PCT = fmt(marcarSegunRango(pctData.valor, pctData.min, pctData.max));
  var AU = fmt(marcarSegunRango(auData.valor, auData.min, auData.max));
  var TGL = fmt(marcarSegunRango(tglData.valor, tglData.min, tglData.max));
  var COL = fmt(marcarSegunRango(colData.valor, colData.min, colData.max));
  var VSG = fmt(marcarSegunRango(vsgData.valor, vsgData.min, vsgData.max));
  var CPK = fmt(marcarSegunRango(cpkData.valor, cpkData.min, cpkData.max));
  if ([Glu, Cr, BUN, PCR, PCT, AU, TGL, COL, VSG, CPK].every(function(v) {
    return v === "---";
  })) return "";
  var p = ["QS"];
  if (Glu !== "---") p.push("Glu", Glu);
  if (Cr !== "---") {
    p.push("Cr", Cr);
    var ageY = patientCtx ? ageYearsFromLabDemographics(patientCtx.edad, patientCtx.edadUnidad) : null;
    var sexo = patientCtx && patientCtx.sexo;
    if (ageY != null && ageY >= 18 && (sexo === "M" || sexo === "F")) {
      var scrNum = toNum_(crData.valor);
      if (scrNum != null && scrNum > 0) {
        var egfr = computeEgfrCkdEpi2021Creatinine(scrNum, ageY, sexo === "F");
        if (egfr != null) p.push("eTFG", String(Math.round(egfr)));
      }
    }
  }
  if (BUN !== "---") p.push("BUN", BUN);
  if (PCR !== "---") p.push("PCR", PCR);
  if (PCT !== "---") p.push("PCT", PCT);
  if (AU !== "---") p.push("AU", AU);
  if (TGL !== "---") p.push("TGL", TGL);
  if (COL !== "---") p.push("COL", COL);
  if (VSG !== "---") p.push("VSG", VSG);
  if (CPK !== "---") p.push("CPK", CPK);
  return p[0] + "	" + p.slice(1).join(" ");
}
function parseESC_(texto) {
  var naData = extraerConRangoSuero(["SODIO"], texto);
  if (naData.valor === "---") return "";
  var clData = extraerConRangoSuero(["CLORO"], texto);
  var kData = extraerConRangoSuero(["POTASIO"], texto);
  var caData = extraerConRangoSuero(["CALCIO EN SUERO", "CALCIO"], texto);
  var fData = extraerConRangoSuero(["FOSFORO EN SANGRE", "FOSFORO", "F\xD3SFORO"], texto);
  var mgData = extraerConRangoSuero(["MAGNESIO"], texto);
  var Na = fmt(marcarSegunRango(naData.valor, naData.min, naData.max));
  var Cl = fmt(marcarSegunRango(clData.valor, clData.min, clData.max));
  var K = fmt(marcarSegunRango(kData.valor, kData.min, kData.max));
  var Ca = fmt(marcarSegunRango(caData.valor, caData.min, caData.max));
  var F = fmt(marcarSegunRango(fData.valor, fData.min, fData.max));
  var Mg = fmt(marcarSegunRango(mgData.valor, mgData.min, mgData.max));
  var p = ["ESC"];
  p.push("Na", Na);
  if (Cl !== "---") p.push("Cl", Cl);
  if (K !== "---") p.push("K", K);
  if (Ca !== "---") p.push("Ca", Ca);
  if (F !== "---") p.push("F", F);
  if (Mg !== "---") p.push("Mg", Mg);
  return p[0] + "	" + p.slice(1).join(" ");
}
function parsePFH_(tNorm) {
  var albData = extraerConRangoSuero(["ALBUMINA"], tNorm);
  var astData = extraerConRango(["AST(ASPARTATO AMINOTRANSFERASA)", "AST "], tNorm);
  var altData = extraerConRango(["ALT ALANIN AMINO TRANSFERASA", "ALT "], tNorm);
  var alpData = extraerConRango(["ALP FOSFATASA ALCALINA", "FOSFATASA ALCALINA"], tNorm);
  var btData = extraerConRango(["BILIRRUBINA TOTAL"], tNorm);
  var bdData = extraerConRango(["BILIRRUBINA DIRECTA"], tNorm);
  var biData = extraerConRango(["BILIRRUBINA INDIRECTA"], tNorm);
  var ldhData = extraerConRango(["LDH DESHIDROGENASA LACTICA", "LDH "], tNorm);
  var amilData = extraerConRango(["AMILASA SERICA", "AMILASA"], tNorm);
  var Alb = fmt(marcarSegunRango(albData.valor, albData.min, albData.max));
  var AST = fmt(marcarSegunRango(astData.valor, astData.min, astData.max));
  var ALT = fmt(marcarSegunRango(altData.valor, altData.min, altData.max));
  var FA = fmt(marcarSegunRango(alpData.valor, alpData.min, alpData.max));
  var BT = fmt(marcarSegunRango(btData.valor, btData.min, btData.max));
  var BD = fmt(marcarSegunRango(bdData.valor, bdData.min, bdData.max));
  var BI = fmt(marcarSegunRango(biData.valor, biData.min, biData.max));
  var LDH = fmt(marcarSegunRango(ldhData.valor, ldhData.min, ldhData.max));
  var Amil = fmt(marcarSegunRango(amilData.valor, amilData.min, amilData.max));
  if ([Alb, AST, ALT, FA, BT, BD, BI, LDH, Amil].every(function(v) {
    return v === "---";
  })) return "";
  var p = ["PFHs"];
  if (Alb !== "---") p.push("Alb", Alb);
  if (AST !== "---") p.push("AST", AST);
  if (ALT !== "---") p.push("ALT", ALT);
  if (FA !== "---") p.push("FA", FA);
  if (BT !== "---") p.push("BT", BT);
  if (BD !== "---") p.push("BD", BD);
  if (BI !== "---") p.push("BI", BI);
  if (LDH !== "---") p.push("LDH", LDH);
  if (Amil !== "---") p.push("Amil", Amil);
  return p[0] + "	" + p.slice(1).join(" ");
}
function gasoBlockForExtract_(bloqueGaso) {
  return String(bloqueGaso || "").replace(/\r/g, "").replace(/\s+/g, " ");
}
function parseGaso_(bloqueGaso, textoFuera) {
  if (!bloqueGaso) return "";
  var bloqueX = gasoBlockForExtract_(bloqueGaso);
  var phData = extraerConRango(["PH "], bloqueX);
  if (phData.valor === "---") {
    phData = extraerConRango(["PH"], bloqueX);
  }
  if (phData.valor === "---") return "";
  var pco2Data = extraerConRango(["PCO2"], bloqueX);
  var po2Data = extraerConRango(["PO2 "], bloqueX);
  var naData = extraerConRango(["SODIO"], bloqueX);
  var kData = extraerConRango(["POTASIO"], bloqueX);
  var gluData = extraerConRango(["GLUCOSA"], bloqueX);
  var lacData = extraerConRango(["LACTATO"], bloqueX);
  var hco3Data = extraerConRango(["HCO3"], bloqueX);
  var htoData = extraerConRango(["HCT ", "HEMATOCRITO"], bloqueX);
  var iCaData = extraerConRango(["CA++ IONIZADO", "CALCIO IONIZADO", "CA IONIZADO"], bloqueX);
  var iCaMin = iCaData.min != null ? iCaData.min : 1.12;
  var iCaMax = iCaData.max != null ? iCaData.max : 1.32;
  var naAG = textoFuera ? extraerConRangoSuero(["SODIO"], textoFuera) : { valor: "---" };
  var clAG = textoFuera ? extraerConRangoSuero(["CLORO"], textoFuera) : { valor: "---" };
  var albAG = textoFuera ? extraerConRangoSuero(["ALBUMINA"], textoFuera) : { valor: "---" };
  var pH = fmt(marcarSegunRango(phData.valor, phData.min, phData.max));
  var pCO2 = fmt(marcarSegunRango(pco2Data.valor, pco2Data.min, pco2Data.max));
  var pO2 = fmt(marcarSegunRango(po2Data.valor, po2Data.min, po2Data.max));
  var Na = fmt(marcarSegunRango(naData.valor, naData.min, naData.max));
  var K = fmt(marcarSegunRango(kData.valor, kData.min, kData.max));
  var GLU = fmt(marcarSegunRango(gluData.valor, gluData.min, gluData.max));
  var Lac = fmt(marcarSegunRango(lacData.valor, lacData.min, lacData.max));
  var Bica = fmt(marcarSegunRango(hco3Data.valor, hco3Data.min, hco3Data.max));
  var Hto = fmt(marcarSegunRango(htoData.valor, htoData.min, htoData.max));
  var iCa = fmt(marcarSegunRango(iCaData.valor, iCaMin, iCaMax));
  var AG = computeAnionGap_(naAG.valor, clAG.valor, hco3Data.valor, albAG.valor);
  var AGv = computeAnionGapValue_(naAG.valor, clAG.valor, hco3Data.valor, albAG.valor);
  var DD = computeDeltaDelta_(AGv, hco3Data.valor);
  var p = ["GASES"];
  p.push("pH", pH);
  if (pCO2 !== "---") p.push("pCO2", pCO2);
  if (pO2 !== "---") p.push("pO2", pO2);
  if (Na !== "---") p.push("Na", Na);
  if (K !== "---") p.push("K", K);
  if (GLU !== "---") p.push("GLU", GLU);
  if (Lac !== "---") p.push("Lactato", Lac);
  if (Bica !== "---") p.push("Bica", Bica);
  if (AG !== "---") p.push("AG", AG);
  if (DD !== "---") p.push("Delta-Delta", DD);
  if (Hto !== "---") p.push("Hto", Hto);
  if (iCa !== "---") p.push("iCa", iCa);
  return p[0] + "	" + p.slice(1).join(" ");
}
function toNum_(v) {
  if (v === "---" || v == null) return null;
  var n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
}
function buildGasoInterpretacion_(bloqueGaso, textoFuera) {
  if (isAbgAnalysisHidden()) return "";
  if (!bloqueGaso) return "";
  var bloqueX = gasoBlockForExtract_(bloqueGaso);
  var phData = extraerConRango(["PH "], bloqueX);
  if (phData.valor === "---") phData = extraerConRango(["PH"], bloqueX);
  if (phData.valor === "---") return "";
  var pco2Data = extraerConRango(["PCO2"], bloqueX);
  var hco3Data = extraerConRango(["HCO3"], bloqueX);
  var naAG = textoFuera ? extraerConRangoSuero(["SODIO"], textoFuera) : { valor: "---" };
  var clAG = textoFuera ? extraerConRangoSuero(["CLORO"], textoFuera) : { valor: "---" };
  var albAG = textoFuera ? extraerConRangoSuero(["ALBUMINA"], textoFuera) : { valor: "---" };
  var ag = computeAnionGapValue_(naAG.valor, clAG.valor, hco3Data.valor, albAG.valor);
  var dd = computeDeltaDeltaValue_(ag, hco3Data.valor);
  var pH = toNum_(phData.valor);
  var pCO2 = toNum_(pco2Data.valor);
  var hco3 = toNum_(hco3Data.valor);
  if (pH == null || pCO2 == null && hco3 == null) return "";
  return buildGasoInterpretacionFromValues_(pH, pCO2, hco3, ag, dd);
}
function labSectionKey_(line) {
  var s = String(line == null ? "" : line).trim();
  if (!s) return "";
  var tab = s.indexOf("	");
  if (tab >= 0) return s.substring(0, tab).trim().toUpperCase();
  var colon = s.indexOf(":");
  if (colon > 0) return s.substring(0, colon + 1).trim().toUpperCase();
  var m = s.match(/^([A-Za-zÁÉÍÓÚÑáéíóúñ]+)\b/);
  return m ? m[1].toUpperCase() : s.toUpperCase();
}
function lineRichnessScore_(line) {
  var s = normalizeLabLine_(line);
  if (!s) return 0;
  var score = s.length;
  score += (s.match(/\b(?:AG|DELTA-DELTA|ICA|LACTATO|BICA|PCO2|PO2)\b/gi) || []).length * 8;
  score += (s.match(/\d/g) || []).length;
  return score;
}
function normalizeGasometryInterpretationLine_(line) {
  var s = String(line == null ? "" : line);
  return /^Interpretación gasometría:/i.test(s.trim()) ? s.toUpperCase() : s;
}
function normalizeLabLine_(line) {
  return normalizeGasometryInterpretationLine_(line).replace(/\s+/g, " ").trim();
}
function labRowText_(row) {
  if (row && typeof row === "object" && typeof row.visible === "string") return row.visible;
  return String(row == null ? "" : row);
}
function dedupeSingletonSections_(rows) {
  var singleton = {
    BH: 1,
    QS: 1,
    ESC: 1,
    PFHS: 1,
    GASES: 1,
    PIE: 1,
    "LCR:": 1,
    "LIQ:": 1,
    HECES: 1,
    FROTIS: 1,
    EGO: 1,
    PROT12H: 1,
    PROT24H: 1,
    "INTERPRETACI\xD3N GASOMETR\xCDA:": 1,
    "INTERPRETACI\xD3N ASCITIS:": 1
  };
  var list = (rows || []).filter(function(r) {
    return normalizeLabLine_(labRowText_(r)) !== "";
  });
  var best = /* @__PURE__ */ Object.create(null);
  var keep = [];
  for (var i = 0; i < list.length; i++) {
    var raw = list[i];
    var rowText = labRowText_(raw);
    var key = labSectionKey_(rowText);
    if (!singleton[key]) {
      keep.push(raw);
      continue;
    }
    var cand = { row: raw, idx: i, score: lineRichnessScore_(rowText) };
    var prev = best[key];
    if (!prev || cand.score > prev.score || cand.score === prev.score && cand.idx > prev.idx) {
      best[key] = cand;
    }
  }
  var chosen = /* @__PURE__ */ Object.create(null);
  Object.keys(best).forEach(function(k2) {
    chosen[best[k2].idx] = best[k2].row;
  });
  var out = [];
  for (var j = 0; j < list.length; j++) {
    var raw = list[j];
    var rText = labRowText_(raw);
    var k = labSectionKey_(rText);
    if (!singleton[k]) out.push(raw);
    else if (chosen[j]) out.push(chosen[j]);
  }
  return out;
}
function valueFromSectionLine_(line, key) {
  var s = normalizeLabLine_(line);
  if (!s) return null;
  var m = s.match(new RegExp("(?:^|\\s)" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s+(-?\\d+(?:\\.\\d+)?)", "i"));
  return m ? m[1] : null;
}
function pickBestSectionLine_(rows, sectionName) {
  var sec = String(sectionName || "").toUpperCase();
  var best = null;
  (rows || []).forEach(function(row, idx) {
    if (labSectionKey_(row) !== sec) return;
    var cand = { row: String(row), idx, score: lineRichnessScore_(row) };
    if (!best || cand.score > best.score || cand.score === best.score && cand.idx > best.idx) best = cand;
  });
  return best ? best.row : "";
}
function formatNumericToken_(n) {
  if (n == null || !isFinite(n)) return "";
  var rounded = Math.round((n + Number.EPSILON) * 10) / 10;
  return rounded === Math.trunc(rounded) ? String(rounded.toFixed(0)) : String(rounded);
}
function buildGasoInterpretacionFromValues_(pH, pCO2, hco3, ag, dd) {
  if (pH == null || pCO2 == null && hco3 == null) return "";
  var metaLow = hco3 != null && hco3 < 22;
  var metaHigh = hco3 != null && hco3 > 26;
  var respLow = pCO2 != null && pCO2 < 35;
  var respHigh = pCO2 != null && pCO2 > 45;
  var primaria = "";
  if (pH < 7.35) {
    if (metaLow) primaria = "Acidosis metab\xF3lica";
    else if (respHigh) primaria = "Acidosis respiratoria";
  } else if (pH > 7.45) {
    if (metaHigh) primaria = "Alcalosis metab\xF3lica";
    else if (respLow) primaria = "Alcalosis respiratoria";
  } else if (hco3 != null && pCO2 != null) {
    if (metaLow && respLow) primaria = "Acidosis metab\xF3lica con compensaci\xF3n respiratoria";
    else if (metaHigh && respHigh) primaria = "Alcalosis metab\xF3lica con compensaci\xF3n respiratoria";
    else if (metaLow) primaria = "Acidosis metab\xF3lica con compensaci\xF3n respiratoria";
    else if (metaHigh) primaria = "Alcalosis metab\xF3lica con compensaci\xF3n respiratoria";
  }
  if (!primaria && pH >= 7.35 && pH <= 7.45 && hco3 != null) {
    if (metaLow) primaria = "Acidosis metab\xF3lica";
    else if (metaHigh) primaria = "Alcalosis metab\xF3lica";
  }
  var partes = [];
  if (primaria) partes.push(primaria);
  if (!primaria) partes.push("Trastorno \xE1cido-base compensado");
  if (metaLow && respLow && /respiratoria/i.test(primaria)) {
    partes.push("Acidosis metab\xF3lica concomitante (HCO3 bajo)");
  } else if (metaLow && respLow && /alcalosis respiratoria/i.test(primaria)) {
    partes.push("Acidosis metab\xF3lica concomitante (HCO3 bajo)");
  } else if (metaHigh && respHigh && /respiratoria/i.test(primaria)) {
    partes.push("Alcalosis metab\xF3lica concomitante (HCO3 alto)");
  } else if (metaLow && respHigh && /metabólica/i.test(primaria)) {
    partes.push("Acidosis respiratoria concomitante (PCO2 alto)");
  } else if (metaHigh && respLow && /metabólica/i.test(primaria)) {
    partes.push("Alcalosis respiratoria concomitante (PCO2 bajo)");
  }
  if (ag != null && ag > 12 && dd != null) {
    if (dd < 0.8) {
      if (/^Acidosis metabólica/i.test(primaria)) {
        partes.push("Componente hiperclor\xE9mico con anion gap elevado (Delta-Delta bajo)");
      } else {
        partes.push("Acidosis metab\xF3lica hiperclor\xE9mica con anion gap elevado (Delta-Delta bajo)");
      }
    } else if (dd > 2) {
      if (/^Alcalosis metabólica/i.test(primaria)) {
        partes.push("Componente agregado con anion gap elevado (Delta-Delta alto), considerar acidosis respiratoria cr\xF3nica");
      } else {
        partes.push("Alcalosis metab\xF3lica agregada o acidosis respiratoria cr\xF3nica con anion gap elevado (Delta-Delta alto)");
      }
    } else partes.push("Anion gap elevado");
  }
  return ("Interpretaci\xF3n gasometr\xEDa:	" + partes.join("; ")).toUpperCase();
}
function rebuildGasesFromResults_(rows) {
  var gases = pickBestSectionLine_(rows, "GASES");
  if (!gases) return { gasesLine: "", interpLine: "" };
  var base = normalizeLabLine_(gases);
  var out = ["GASES"];
  var orderedKeys = ["pH", "pCO2", "pO2", "Na", "K", "GLU", "Lactato", "Bica", "Hto", "iCa"];
  var values = {};
  orderedKeys.forEach(function(k) {
    values[k] = valueFromSectionLine_(base, k);
  });
  var qs = pickBestSectionLine_(rows, "QS");
  var esc2 = pickBestSectionLine_(rows, "ESC");
  var pfhs = pickBestSectionLine_(rows, "PFHS");
  var na = valueFromSectionLine_(qs, "Na") || valueFromSectionLine_(esc2, "Na") || values.Na;
  var cl = valueFromSectionLine_(qs, "Cl") || valueFromSectionLine_(esc2, "Cl");
  var alb = valueFromSectionLine_(pfhs, "Alb");
  var bica = values.Bica;
  orderedKeys.forEach(function(k) {
    if (values[k] != null && values[k] !== "") out.push(k, values[k]);
  });
  var agv = computeAnionGapValue_(na || "---", cl || "---", bica || "---", alb || "---");
  if (agv != null) {
    var agStr = formatNumericToken_(agv);
    out.push("AG", marcarSegunRango(agStr, 8, 12));
  }
  var ddv = computeDeltaDeltaValue_(agv, bica || "---");
  if (ddv != null) out.push("Delta-Delta", formatNumericToken_(ddv));
  var interp = "";
  if (!isAbgAnalysisHidden()) {
    var phV = toNum_(values.pH);
    var pco2V = toNum_(values.pCO2);
    var hco3V = toNum_(values.Bica);
    interp = buildGasoInterpretacionFromValues_(phV, pco2V, hco3V, agv, ddv);
  }
  return { gasesLine: out[0] + "	" + out.slice(1).join(" "), interpLine: interp };
}
function reprocessLabResultLines_(rows) {
  var clean = dedupeSingletonSections_(rows || []);
  var rebuilt = rebuildGasesFromResults_(clean);
  var out = clean.filter(function(r) {
    var k = labSectionKey_(r);
    return k !== "GASES" && k !== "INTERPRETACI\xD3N GASOMETR\xCDA:";
  });
  if (rebuilt.gasesLine) out.push(rebuilt.gasesLine);
  if (rebuilt.interpLine) out.push(rebuilt.interpLine);
  return dedupeSingletonSections_(out);
}
function computeAnionGapValue_(naStr, clStr, hco3Str, albStr) {
  if (naStr === "---" || clStr === "---" || hco3Str === "---") return null;
  var na = parseFloat(String(naStr).replace(",", "."));
  var cl = parseFloat(String(clStr).replace(",", "."));
  var hco3 = parseFloat(String(hco3Str).replace(",", "."));
  if (isNaN(na) || isNaN(cl) || isNaN(hco3)) return null;
  var ag = na - (cl + hco3);
  var alb = parseFloat(String(albStr == null ? "" : albStr).replace(",", "."));
  if (!isNaN(alb)) ag += 2.5 * (4 - alb);
  return ag;
}
function computeDeltaDeltaValue_(agValue, hco3Str) {
  if (agValue == null) return null;
  var hco3 = parseFloat(String(hco3Str).replace(",", "."));
  if (isNaN(hco3)) return null;
  var deltaHco3 = 24 - hco3;
  if (deltaHco3 <= 0) return null;
  return (agValue - 12) / deltaHco3;
}
function computeDeltaDelta_(agValue, hco3Str) {
  var dd = computeDeltaDeltaValue_(agValue, hco3Str);
  if (dd == null) return "---";
  var rounded = Math.round(dd * 10) / 10;
  return rounded === Math.trunc(rounded) ? String(rounded.toFixed(0)) : String(rounded);
}
function computeAnionGap_(naStr, clStr, hco3Str, albStr) {
  var ag = computeAnionGapValue_(naStr, clStr, hco3Str, albStr);
  if (ag == null) return "---";
  var rounded = Math.round((ag + Number.EPSILON) * 10) / 10;
  var agStr = rounded === Math.trunc(rounded) ? String(rounded.toFixed(0)) : String(rounded);
  return marcarSegunRango(agStr, 8, 12);
}
function parsePIE_(tNorm) {
  var hasPIEInmuno = /PRUEBA INMUNOLOGICA DE EMBARAZO/i.test(tNorm);
  var hasPrueba = /PRUEBA DE EMBARAZO/i.test(tNorm);
  if (!hasPIEInmuno && !hasPrueba) return "";
  if (hasPIEInmuno) {
    var idx = tNorm.toUpperCase().indexOf("PRUEBA INMUNOLOGICA DE EMBARAZO");
    var sub = tNorm.substring(idx, idx + 400);
    var subUp = sub.toUpperCase();
    var sueroIdx = subUp.indexOf("SUERO");
    var m = null;
    if (sueroIdx !== -1) {
      m = sub.substring(sueroIdx, sueroIdx + 100).match(/\b(NEGATIVO|POSITIVO)\b/i);
    }
    if (!m) {
      var orinaIdx = subUp.indexOf("ORINA");
      if (orinaIdx !== -1) m = sub.substring(orinaIdx, orinaIdx + 100).match(/\b(NEGATIVO|POSITIVO)\b/i);
    }
    if (!m) return "";
    return "PIE	" + m[1].toUpperCase() + "*";
  }
  var idx = tNorm.toUpperCase().indexOf("PRUEBA DE EMBARAZO");
  var sub = tNorm.substring(idx, idx + 300);
  var m = sub.match(/\b(NEGATIVO|POSITIVO)\b/i);
  if (!m) return "";
  return "PIE	" + m[1].toUpperCase() + "*";
}
function parsearLCR(textoBruto) {
  var tUp = textoBruto.toUpperCase();
  if (tUp.indexOf("CITOQUIMICO DE LCR") === -1 && tUp.indexOf("CITOQUIMICO LIQ. LCR") === -1 && tUp.indexOf("CITOQUIMICO LCR") === -1) return "";
  var lineas = textoBruto.split(/\r?\n/).map(function(l) {
    return l.trim();
  });
  var pH = "", aspecto = "", leu = "", glu = "", prot = "", cl = "", gram = "", tinta = "";
  for (var i = 0; i < lineas.length; i++) {
    var linUp = lineas[i].toUpperCase();
    if (linUp.indexOf("PH") === 0) {
      for (var j = i + 1; j < Math.min(i + 4, lineas.length); j++) {
        var m = lineas[j].match(/(\d+(\.\d+)?)/);
        if (m) {
          pH = m[1];
          break;
        }
      }
    }
    if (linUp.indexOf("ASPECTO") === 0) {
      for (var j = i + 1; j < Math.min(i + 4, lineas.length); j++) {
        var txt = lineas[j].replace(/\*/g, "").trim();
        if (txt && !/ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA/i.test(txt)) {
          aspecto = txt.toUpperCase();
          break;
        }
      }
    }
    if (linUp.indexOf("RECUENTO CELULAR") === 0 || linUp.indexOf("LEUCOCITOS") === 0) {
      for (var j = i + 1; j < Math.min(i + 5, lineas.length); j++) {
        var m = lineas[j].match(/(\d+)\s*$/);
        if (m) {
          leu = m[1];
          break;
        }
      }
    }
    if (linUp.indexOf("GLUCOSA") === 0) {
      for (var j = i + 1; j < Math.min(i + 4, lineas.length); j++) {
        var m = lineas[j].match(/(\d+(\.\d+)?)/);
        if (m) {
          glu = m[1];
          break;
        }
      }
    }
    if (linUp.indexOf("PROTEINAS") === 0) {
      var mL = lineas[i].match(/PROTEINAS\s*([A-Z])\s*$/i);
      var letra = mL ? mL[1].toUpperCase() : "";
      for (var j = i + 1; j < Math.min(i + 4, lineas.length); j++) {
        var m = lineas[j].match(/(\d+(\.\d+)?)/);
        if (m) {
          prot = m[1] + letra;
          break;
        }
      }
    }
    if (linUp.indexOf("CLORURO") === 0) {
      for (var j = i + 1; j < Math.min(i + 4, lineas.length); j++) {
        var m = lineas[j].match(/(\d+(\.\d+)?)/);
        if (m) {
          cl = m[1];
          break;
        }
      }
    }
    if (linUp.indexOf("GRAM") === 0) {
      for (var j = i + 1; j < Math.min(i + 4, lineas.length); j++) {
        var txt = lineas[j].replace(/\*/g, "").trim();
        if (txt) {
          gram = txt.toUpperCase();
          break;
        }
      }
    }
    if (linUp.indexOf("TINTA CHINA") === 0) {
      for (var j = i + 1; j < Math.min(i + 4, lineas.length); j++) {
        var txt = lineas[j].replace(/\*/g, "").trim();
        if (txt) {
          tinta = txt.toUpperCase();
          break;
        }
      }
    }
  }
  if (!aspecto && !leu && !glu && !prot && !cl && !gram && !tinta) return "";
  var p = ["LCR:"];
  if (pH) p.push("pH", pH);
  if (aspecto) p.push("Asp", aspecto);
  if (leu) p.push("Leu", leu);
  if (glu) p.push("Glu", glu);
  if (prot) p.push("Prot", prot);
  if (cl) p.push("Cl", cl);
  if (gram) p.push("Gram", gram);
  if (tinta) p.push("Tinta", tinta);
  return p[0] + "	" + p.slice(1).join(" ");
}
function bloqueCitoquimicoLiquidosFull(textoBruto) {
  var t2 = textoBruto.replace(/\r/g, "");
  var u = t2.toUpperCase();
  var key = "CITOQUIMICO DE LIQUIDOS CORPORALES";
  var i0 = u.indexOf(key);
  if (i0 === -1) return "";
  var i2 = u.indexOf(key, i0 + key.length);
  if (i2 === -1) return t2.substring(i0);
  var afterSecond = t2.substring(i2 + key.length);
  var stop = afterSecond.search(/\n\n\s*(?:QUIMICA CLINICA|HEMATOLOGIA|INMUNOLOGIA|GASOMETRIA|BANDEJA)\b/i);
  var end = stop === -1 ? t2.length : i2 + key.length + stop;
  return t2.substring(i0, end);
}
function normalizarProteinasFluidoGdl_(valStr) {
  var n = toNum_(String(valStr || "").replace(/[A-Z*]$/i, ""));
  if (n == null) return null;
  if (n >= 1e3) return n / 1e3;
  if (n >= 100) return n / 100;
  return n;
}
function esLiquidoPleural_(fluid, com, bloque) {
  var s = ((fluid || "") + " " + (com || "") + " " + (bloque || "")).toUpperCase();
  return /\bPLEURAL\b/.test(s) || /\bL[IÍ]QUIDO\s+PLEURAL\b/.test(s);
}
function esLiquidoAscitico_(fluid, com, bloque) {
  if (esLiquidoPleural_(fluid, com, bloque)) return false;
  var s = ((fluid || "") + " " + (com || "") + " " + (bloque || "")).toUpperCase();
  return /\bASCIT/i.test(s) || /\bPERITONEAL\b/.test(s) || /\bL[IÍ]QUIDO\s+PERITONEAL\b/.test(s);
}
function computeGasaValue_(serumAlbGdl, asciticAlbGdl) {
  if (serumAlbGdl == null || asciticAlbGdl == null) return null;
  return Math.round((serumAlbGdl - asciticAlbGdl) * 100) / 100;
}
var ASCITIS_INTERPRETACION_HEADER = "INTERPRETACI\xD3N ASCITIS:";
function isAscitisInterpretacionResLabChunk(text) {
  var head = String(text || "").split("\n")[0].trim();
  return new RegExp("^" + ASCITIS_INTERPRETACION_HEADER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(head);
}
function formatAscitisInterpretacionLine_(alerts) {
  var list = (alerts || []).filter(Boolean);
  if (!list.length) return "";
  return ASCITIS_INTERPRETACION_HEADER + "	" + list.join(" \xB7 ");
}
function serumTextWithoutCitoBlock_(textoBruto) {
  if (!textoBruto) return "";
  var bloqueCito = bloqueCitoquimicoLiquidosFull(textoBruto);
  if (!bloqueCito) return String(textoBruto);
  var tNorm = String(textoBruto).replace(/\s+/g, " ");
  var bloqueNorm = bloqueCito.replace(/\r/g, "").replace(/\s+/g, " ");
  return tNorm.replace(bloqueNorm, " ");
}
function extraerAlbuminaSueroParaGasa_(textoBruto, bloqueCito) {
  var t2 = serumTextWithoutCitoBlock_(textoBruto);
  if (!t2) return null;
  var albData = extraerConRangoSuero(["ALBUMINA"], t2);
  return toNum_(albData.valor);
}
function extractSerumAlbuminGdlFromResLabs_(resLabs) {
  var rows = resLabs || [];
  for (var i = 0; i < rows.length; i++) {
    var line = String(rows[i] || "");
    if (labSectionKey_(line) !== "PFHS") continue;
    var m = line.match(/\bAlb\s+([0-9]+(?:[.,][0-9]+)?)\*?/i);
    if (m) return toNum_(m[1]);
  }
  return null;
}
function resolveSerumAlbuminForGasa_(textoBruto, bloqueCito, serumOpts) {
  var alb = extraerAlbuminaSueroParaGasa_(textoBruto, bloqueCito);
  if (alb != null) return alb;
  var opts = serumOpts || {};
  var extras = opts.extraSourceTexts || [];
  for (var i = 0; i < extras.length; i++) {
    var txt = String(extras[i] || "").trim();
    if (!txt) continue;
    alb = extraerAlbuminaSueroParaGasa_(txt, bloqueCitoquimicoLiquidosFull(txt));
    if (alb != null) return alb;
  }
  var labGroups = opts.extraResLabs || [];
  for (var j = 0; j < labGroups.length; j++) {
    alb = extractSerumAlbuminGdlFromResLabs_(labGroups[j]);
    if (alb != null) return alb;
  }
  return null;
}
function ascitisParsedFromResLabsLiq_(resLabs) {
  var rows = resLabs || [];
  for (var i = 0; i < rows.length; i++) {
    var line = String(rows[i] || "");
    if (labSectionKey_(line) !== "LIQ:") continue;
    var mAlb = line.match(/\bAlb\s+([0-9]+(?:[.,][0-9]+)?)\*?/i);
    if (!mAlb) return null;
    var asciticAlb = toNum_(mAlb[1]);
    if (asciticAlb == null) return null;
    var esAsc = /\bASCIT|PERITONEAL|L[IÍ]QUIDO\s+ASCIT/i.test(line);
    return {
      esAscitico: esAsc,
      alb: asciticAlb,
      serumAlb: null,
      gasaVal: null,
      protGdl: null,
      tgl: null,
      amil: null,
      citologia: null,
      line
    };
  }
  return null;
}
function resLabsHasAsciticFluid_(resLabs) {
  return !!(resLabs || []).some(function(row) {
    var line = String(row || "");
    return labSectionKey_(line) === "LIQ:" && /\bASCIT|PERITONEAL/i.test(line);
  });
}
function refreshAscitisInterpretacionInResLabs_(resLabs, textoBruto, serumOpts) {
  var rows = resLabs || [];
  var src = String(textoBruto || "").trim();
  var parsed = src ? parseCitoquimicoLiquidosParsed_(src, serumOpts) : ascitisParsedFromResLabsLiq_(rows);
  if (!parsed || !parsed.esAscitico) return rows.slice();
  if (parsed.alb != null && parsed.serumAlb == null) {
    var serumAlb = resolveSerumAlbuminForGasa_(src, src ? bloqueCitoquimicoLiquidosFull(src) : "", serumOpts);
    if (serumAlb != null) {
      parsed.serumAlb = serumAlb;
      parsed.gasaVal = computeGasaValue_(serumAlb, parsed.alb);
    }
  }
  var out = rows.filter(function(r) {
    return !isAscitisInterpretacionResLabChunk(r);
  });
  if (src) {
    var newLiq = parsearCitoquimicoLiquidos(src, serumOpts);
    if (newLiq) {
      out = out.filter(function(r) {
        return labSectionKey_(r) !== "LIQ:";
      });
      out.push(newLiq);
    }
  } else if (parsed.gasaVal != null && parsed.line) {
    var liqLine = parsed.line;
    if (!/\bGASA\b/.test(liqLine)) {
      liqLine = liqLine + " GASA " + String(parsed.gasaVal);
    } else {
      liqLine = liqLine.replace(/\bGASA\s+[0-9]+(?:[.,][0-9]+)?/, "GASA " + String(parsed.gasaVal));
    }
    out = out.filter(function(r) {
      return labSectionKey_(r) !== "LIQ:";
    });
    out.push(liqLine);
  }
  var alerts = buildAscitisLabAlerts_(src, serumOpts, parsed);
  var interp = formatAscitisInterpretacionLine_(alerts);
  if (interp) out.push(interp);
  return dedupeSingletonSections_(out);
}
function extraerCitologiaAscitica_(textoBruto) {
  var t2 = String(textoBruto || "").toUpperCase();
  var idx = t2.search(/\bCITOLOG/i);
  if (idx === -1) return null;
  var chunk = t2.substring(idx, idx + 1200);
  if (!/\b(ASCIT|PERITONEAL|LIQUIDO\s+ASCIT)\b/.test(chunk)) return null;
  if (/\b(POSITIVO|MALIGN|ADENOCARCINOMA|CARCINOMA|CARCINOMATOSIS|METÁSTASIS|METASTASIS)\b/.test(chunk)) {
    return "positive";
  }
  if (/\bNEGATIVO\b/.test(chunk)) return "negative";
  return null;
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
function buildAscitisLabAlerts_(textoBruto, serumOpts, parsedIn) {
  var parsed = parsedIn || parseCitoquimicoLiquidosParsed_(textoBruto, serumOpts);
  if (!parsed || !parsed.esAscitico) return [];
  var alerts = [];
  if (parsed.alb && parsed.serumAlb == null) {
    alerts.push("Incluir alb\xFAmina s\xE9rica del mismo d\xEDa para calcular GASA");
    return alerts;
  }
  if (parsed.gasaVal == null) return alerts;
  if (parsed.gasaVal >= 1.1) {
    alerts.push("GASA " + parsed.gasaVal + " \u22651.1 \u2014 probable hipertensi\xF3n portal");
    return alerts;
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
  return alerts;
}
function evaluarCriteriosLight_(pleuralProtGdl, pleuralLdh, serumProtGdl, serumLdh, serumLdhUln) {
  var hits = [];
  var details = [];
  var nProt = 0;
  var nLdh = 0;
  var nUln = 0;
  if (pleuralProtGdl != null && serumProtGdl != null && serumProtGdl > 0) {
    nProt = 1;
    var r1 = pleuralProtGdl / serumProtGdl;
    var ok1 = r1 > 0.5;
    if (ok1) hits.push("prot");
    details.push("Prot " + r1.toFixed(2) + (ok1 ? "" : "\u2212"));
  }
  if (pleuralLdh != null && serumLdh != null && serumLdh > 0) {
    nLdh = 1;
    var r2 = pleuralLdh / serumLdh;
    var ok2 = r2 > 0.6;
    if (ok2) hits.push("ldh");
    details.push("LDH " + r2.toFixed(2) + (ok2 ? "" : "\u2212"));
  }
  if (pleuralLdh != null && serumLdhUln != null && serumLdhUln > 0) {
    nUln = 1;
    var umbral = 2 / 3 * serumLdhUln;
    var ok3 = pleuralLdh > umbral;
    if (ok3) hits.push("ldhUln");
    details.push("LDH>2/3" + (ok3 ? "" : "\u2212"));
  }
  var nEval = nProt + nLdh + nUln;
  if (!nEval || !details.length) return "";
  if (hits.length > 0) return "Light EXUDADO (" + details.join(", ") + ")";
  if (nProt && nLdh && nUln) return "Light TRASUDADO (" + details.join(", ") + ")";
  return "Light TRASUDADO parcial (" + details.join(", ") + ")";
}
function extraerSueroParaLight_(textoBruto, bloqueCito) {
  var t2 = textoBruto || "";
  if (bloqueCito) t2 = t2.replace(bloqueCito, " ");
  var protData = extraerConRangoSuero(
    ["PROTEINAS TOTALES EN SANGRE", "PROTEINAS TOTALES", "PROTEINA TOTAL EN SANGRE", "PROTEINAS EN SANGRE"],
    t2
  );
  var ldhData = extraerConRangoSuero(["LDH DESHIDROGENASA LACTICA", "LDH "], t2);
  return {
    protGdl: normalizarProteinasFluidoGdl_(protData.valor),
    ldh: toNum_(ldhData.valor),
    ldhUln: ldhData.max != null ? ldhData.max : null
  };
}
function normalizarRecuentoCelular_(valStr) {
  var c = String(valStr || "").replace(/\*/g, "").trim();
  if (/^\d{1,3},\d{3}$/.test(c)) return c.replace(",", "");
  return c.replace(",", ".");
}
function fmtProteinaFluido_(valStr) {
  var g2 = normalizarProteinasFluidoGdl_(valStr);
  if (g2 == null) return String(valStr || "").replace(/[A-Z*]$/i, "");
  var star = /[A-Z*]$/.test(String(valStr || ""));
  var s = g2 >= 10 ? String(Math.round(g2 * 10) / 10) : String(Math.round(g2 * 100) / 100);
  return s + (star ? "*" : "");
}
function buildLightPleural_(bloque, pleuralProtRaw, pleuralLdhRaw, textoBruto) {
  var pleuralProt = normalizarProteinasFluidoGdl_(pleuralProtRaw);
  var pleuralLdh = toNum_(pleuralLdhRaw);
  if (pleuralProt == null && pleuralLdh == null) return "";
  var suero = extraerSueroParaLight_(textoBruto, bloque);
  var ldhUln = suero.ldhUln;
  if (ldhUln == null && bloque) {
    var ldhRef = extraerConRango(["LDH DESHIDROGENASA LACTICA", "LDH "], bloque);
    if (ldhRef.max != null) ldhUln = ldhRef.max;
  }
  return evaluarCriteriosLight_(pleuralProt, pleuralLdh, suero.protGdl, suero.ldh, ldhUln);
}
function parseCitoquimicoLiquidosParsed_(textoBruto, serumOpts) {
  var bloque = bloqueCitoquimicoLiquidosFull(textoBruto);
  if (!bloque) return { line: "", esAscitico: false };
  var lineas = bloque.split(/\r?\n/).map(function(l) {
    return l.trim();
  });
  var fluid = "", dens = "", pH = "", glu = "", prot = "", ldh = "", alb = "", tgl = "", amil = "", aspecto = "", leu = "", rec = "", pmn = "", linf = "", eri = "", gram = "", com = "";
  function nextMeaningful(i0, maxJ) {
    for (var j2 = i0 + 1; j2 < Math.min(i0 + maxJ, lineas.length); j2++) {
      var txt = lineas[j2].replace(/\*/g, "").trim();
      if (!txt) continue;
      if (/^ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA$/i.test(txt)) continue;
      return txt;
    }
    return "";
  }
  for (var i = 0; i < lineas.length; i++) {
    var lin = lineas[i];
    var linUp = lin.toUpperCase();
    if (/^CITOQUIMICO DE\s*$/i.test(lin) && !/CORPORALES/i.test(lin)) {
      var f = nextMeaningful(i, 6);
      if (f && !/^:$/.test(f)) fluid = f.toUpperCase();
    }
    if (/^CITOQUIMICO DE\s+/i.test(lin) && !/CORPORALES/i.test(lin)) {
      var mTipo = lin.match(/^CITOQUIMICO DE\s+(.+)$/i);
      if (mTipo && mTipo[1].trim()) fluid = mTipo[1].trim().toUpperCase();
    }
    if (linUp.indexOf("DENSIDAD") === 0) {
      for (var j = i + 1; j < Math.min(i + 5, lineas.length); j++) {
        var m = lineas[j].match(/(\d+\.\d+|\d+)/);
        if (m) {
          dens = m[1];
          break;
        }
      }
    }
    if (linUp === "PH" || linUp.indexOf("PH	") === 0) {
      for (var j = i + 1; j < Math.min(i + 5, lineas.length); j++) {
        var m = lineas[j].match(/(\d+(\.\d+)?)/);
        if (m) {
          pH = m[1];
          break;
        }
      }
    }
    if (linUp.indexOf("GLUCOSA") === 0) {
      for (var j = i + 1; j < Math.min(i + 5, lineas.length); j++) {
        var m = lineas[j].match(/(\d+(\.\d+)?)/);
        if (m) {
          glu = m[1];
          break;
        }
      }
    }
    if (linUp.indexOf("PROTEINAS") === 0) {
      var mL = lin.match(/PROTEINAS\s*([A-Z])\s*$/i);
      var letra = mL ? mL[1].toUpperCase() : "";
      for (var j = i + 1; j < Math.min(i + 5, lineas.length); j++) {
        var m = lineas[j].match(/(\d+(\.\d+)?)/);
        if (m) {
          prot = m[1] + letra;
          break;
        }
      }
    }
    if (linUp.indexOf("LDH") === 0) {
      for (var j = i + 1; j < Math.min(i + 8, lineas.length); j++) {
        var c = lineas[j].replace(/\*/g, "").trim();
        if (/^[A-Z]$/i.test(c)) continue;
        var m = c.match(/(\d+(\.\d+)?)/);
        if (m) {
          ldh = m[1];
          break;
        }
      }
    }
    if (linUp.indexOf("ALBUMINA") === 0) {
      for (var j = i + 1; j < Math.min(i + 8, lineas.length); j++) {
        var c = lineas[j].replace(/\*/g, "").trim();
        if (/^[A-Z]$/i.test(c)) continue;
        var m = c.match(/(\d+(\.\d+)?)/);
        if (m) {
          alb = m[1];
          break;
        }
      }
    }
    if (linUp.indexOf("TRIGLICER") === 0) {
      for (var j = i + 1; j < Math.min(i + 8, lineas.length); j++) {
        var c = lineas[j].replace(/\*/g, "").trim();
        if (/^[A-Z]$/i.test(c)) continue;
        var m = c.match(/(\d+(\.\d+)?)/);
        if (m) {
          tgl = m[1];
          break;
        }
      }
    }
    if (linUp.indexOf("AMILASA") === 0) {
      for (var j = i + 1; j < Math.min(i + 8, lineas.length); j++) {
        var c = lineas[j].replace(/\*/g, "").trim();
        if (/^[A-Z]$/i.test(c)) continue;
        var m = c.match(/(\d+(\.\d+)?)/);
        if (m) {
          amil = m[1];
          break;
        }
      }
    }
    if (linUp.indexOf("ASPECTO") === 0) {
      var a = nextMeaningful(i, 5);
      if (a && !/^:$/.test(a)) aspecto = a.toUpperCase();
    }
    if (linUp.indexOf("RECUENTO") === 0 && linUp.indexOf("LEUCOCITOS") === -1) {
      var bits = [];
      for (var j = i + 1; j < Math.min(i + 5, lineas.length); j++) {
        var c = lineas[j].replace(/\*/g, "").trim();
        if (!c) continue;
        if (/^LEUCOCITOS/i.test(c)) break;
        if (/^\d+[.,]?\d*$/.test(c) || /^[A-Z]$/i.test(c)) bits.push(c.toUpperCase());
        if (bits.length >= 2) break;
      }
      if (bits.length) rec = bits.join(" ");
    }
    if (/^LEUCOCITOS/i.test(linUp)) {
      for (var j = i - 1; j >= Math.max(0, i - 6); j--) {
        var c = lineas[j].replace(/\*/g, "").trim();
        if (/^\d+[.,]?\d*$/.test(c)) {
          leu = normalizarRecuentoCelular_(c);
          break;
        }
      }
      if (!leu) {
        for (var j = i + 1; j < Math.min(i + 8, lineas.length); j++) {
          var c = lineas[j].replace(/\*/g, "").trim();
          if (/^\d+[.,]?\d*$/.test(c)) {
            leu = normalizarRecuentoCelular_(c);
            break;
          }
        }
      }
    }
    if (linUp.indexOf("POLIMORFONUCLEARES") === 0) {
      var ptxt = nextMeaningful(i, 5);
      if (ptxt) pmn = ptxt.toUpperCase();
    }
    if (linUp.indexOf("LINFOCITOS") === 0) {
      var ltxt = nextMeaningful(i, 5);
      if (ltxt && ltxt !== "%" && ltxt !== "---") linf = ltxt.replace(",", ".");
    }
    if (linUp.indexOf("ERITROCITOS") === 0) {
      var etxt = nextMeaningful(i, 5);
      if (etxt) eri = etxt.toUpperCase();
    }
    if (linUp.indexOf("GRAM") === 0) {
      var g2 = nextMeaningful(i, 5);
      if (g2) gram = g2.toUpperCase();
    }
    if (linUp.indexOf("COMENTARIO") === 0) {
      var cx = nextMeaningful(i, 4);
      if (cx && !/^\*+$/.test(cx)) com = cx.toUpperCase();
    }
  }
  if (!fluid && com && /\bPLEURAL\b/i.test(com)) fluid = com;
  if (!fluid && esLiquidoPleural_(fluid, com, bloque)) fluid = "LIQUIDO PLEURAL";
  if (!fluid && !dens && !pH && !glu && !prot && !ldh && !alb && !tgl && !amil && !aspecto && !leu && !rec && !pmn && !linf && !eri && !gram && !com) {
    return { line: "", esAscitico: false };
  }
  var esPleural = esLiquidoPleural_(fluid, com, bloque);
  var esAscitico = esLiquidoAscitico_(fluid, com, bloque);
  var lightTxt = esPleural ? buildLightPleural_(bloque, prot, ldh, textoBruto) : "";
  var gasaVal = null;
  var serumAlb = null;
  var asciticAlb = null;
  if (esAscitico && alb) {
    asciticAlb = toNum_(alb);
    serumAlb = resolveSerumAlbuminForGasa_(textoBruto, bloque, serumOpts);
    gasaVal = computeGasaValue_(serumAlb, asciticAlb);
  }
  var p = ["Liq:"];
  if (fluid) p.push("Tipo", fluid);
  if (dens) p.push("Dens", dens);
  if (pH) p.push("pH", pH);
  if (glu) p.push("Glu", glu);
  if (prot) p.push("Prot", fmtProteinaFluido_(prot));
  if (alb) p.push("Alb", alb);
  if (tgl) p.push("TGL", tgl);
  if (amil) p.push("Amil", amil);
  if (ldh) p.push("LDH", ldh);
  if (aspecto) p.push("Asp", aspecto);
  if (rec) p.push("Rec", rec);
  if (leu) p.push("Leu", leu);
  if (pmn && pmn !== "---") p.push("PMN", pmn);
  if (linf) p.push("Linf", linf + (/%/.test(linf) ? "" : "%"));
  if (eri) p.push("Eri", eri);
  if (gram) p.push("Gram", gram);
  if (com && com !== fluid) p.push("Obs", com);
  if (gasaVal != null) p.push("GASA", String(gasaVal));
  if (lightTxt) p.push(lightTxt);
  return {
    line: p[0] + "	" + p.slice(1).join(" "),
    esAscitico,
    alb: asciticAlb,
    serumAlb,
    gasaVal,
    protGdl: normalizarProteinasFluidoGdl_(prot),
    tgl: toNum_(tgl),
    amil: toNum_(amil),
    citologia: extraerCitologiaAscitica_(textoBruto)
  };
}
function parsearCitoquimicoLiquidos(textoBruto, serumOpts) {
  return parseCitoquimicoLiquidosParsed_(textoBruto, serumOpts).line;
}
function parseFisicoquimicoHeces_(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") return "";
  var tUp = textoBruto.toUpperCase();
  if (tUp.indexOf("FISICOQUIMICO DE HECES") === -1) return "";
  var lineas = textoBruto.split(/\r?\n/).map(function(l) {
    return String(l || "").trim();
  });
  var i0 = -1;
  for (var i = 0; i < lineas.length; i++) {
    if (lineas[i].toUpperCase().indexOf("FISICOQUIMICO DE HECES") !== -1) {
      i0 = i;
      break;
    }
  }
  if (i0 === -1) return "";
  var i1 = lineas.length;
  for (var j = i0 + 1; j < lineas.length; j++) {
    if (/^(BACTERIOLOGIA|HEMATOLOGIA|QUIMICA CLINICA|INMUNOLOGIA|GASOMETRIA|COAGULACION|URIANALISIS|EXAMEN GENERAL DE ORINA|CULTIVO)\b/i.test(
      lineas[j]
    )) {
      i1 = j;
      break;
    }
  }
  var bloque = lineas.slice(i0, i1);
  function nextMeaningful(iStart, maxStep) {
    for (var k = iStart + 1; k < Math.min(iStart + maxStep, bloque.length); k++) {
      var txt = (bloque[k] || "").replace(/\*/g, "").trim();
      if (!txt || txt === ":") continue;
      if (/^ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA$/i.test(txt)) continue;
      return txt;
    }
    return "";
  }
  function nextMeaningfulText(iStart, maxStep) {
    for (var k = iStart + 1; k < Math.min(iStart + maxStep, bloque.length); k++) {
      var txt = (bloque[k] || "").replace(/\*/g, "").trim();
      if (!txt || txt === ":") continue;
      if (/^ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA$/i.test(txt)) continue;
      if (/^\d+(\.\d+)?$/.test(txt)) continue;
      return txt;
    }
    return "";
  }
  var rows = [
    { key: "ASPECTO", out: "Asp" },
    { key: "PH", out: "pH" },
    { key: "PROTEINAS", out: "Prot" },
    { key: "GLUCOSA", out: "Glu" },
    { key: "LEUCOCITOS", out: "Leu" },
    { key: "ERITROCITOS", out: "Eri" },
    { key: "GRASA", out: "Grasa" },
    { key: "FIBRAS MUSCULARES", out: "Fibra" },
    { key: "COPROPARASITOSCOPICO INMEDIATO", out: "Copro" },
    { key: "OBSERVACIONES", out: "Obs" }
  ];
  var p = ["HECES"];
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    for (var bi = 0; bi < bloque.length; bi++) {
      if (bloque[bi].toUpperCase().indexOf(row.key) !== 0) continue;
      var v = nextMeaningful(bi, 7);
      if (row.key === "ASPECTO" && /^\d+(\.\d+)?$/.test(v)) {
        var v2 = nextMeaningfulText(bi, 10);
        if (v2) v = v + " " + v2;
      }
      if (!v) break;
      p.push(row.out, v.toUpperCase());
      break;
    }
  }
  if (p.length <= 1) return "";
  return p[0] + "	" + p.slice(1).join(" ");
}
function parseFrotisSangre_(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") return "";
  var tUp = textoBruto.toUpperCase();
  if (tUp.indexOf("FROTIS DE SANGRE PERIFERICA") === -1) return "";
  var lineas = textoBruto.split(/\r?\n/).map(function(l) {
    return String(l || "").trim();
  });
  var i0 = -1;
  for (var i = 0; i < lineas.length; i++) {
    if (lineas[i].toUpperCase().indexOf("FROTIS DE SANGRE PERIFERICA") !== -1) {
      i0 = i;
      break;
    }
  }
  if (i0 === -1) return "";
  function nextMeaningful(iStart, maxStep) {
    for (var j = iStart + 1; j < Math.min(iStart + maxStep, lineas.length); j++) {
      var txt = (lineas[j] || "").replace(/\*/g, "").trim();
      if (!txt || txt === ":") continue;
      if (/^ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA$/i.test(txt)) continue;
      if (/^FROTIS DE SANGRE PERIFERICA$/i.test(txt)) continue;
      return txt;
    }
    return "";
  }
  var desc = "";
  for (var k = i0; k < Math.min(i0 + 20, lineas.length); k++) {
    if (lineas[k].toUpperCase().indexOf("FROTIS DE SANGRE PERIFERICA") !== 0) continue;
    desc = nextMeaningful(k, 8);
    if (desc) break;
  }
  if (!desc) return "";
  var lines = formatFrotisSangreLines_(desc);
  var plaqObs = extraerObservacionPlaquetasHema_(textoBruto);
  if (plaqObs) {
    lines = lines ? lines + "\nFROTIS	PlaqObs " + plaqObs : "FROTIS	PlaqObs " + plaqObs;
  }
  return lines;
}
function extraerObservacionPlaquetasHema_(textoBruto) {
  if (!textoBruto || !/PLAQUETAS\s+DISMINUIDAS/i.test(textoBruto)) return "";
  var lineas = textoBruto.split(/\r?\n/).map(function(l) {
    return String(l || "").replace(/\*/g, "").trim();
  });
  for (var i = 0; i < lineas.length; i++) {
    if (!/^OBSERVACIONES$/i.test(lineas[i])) continue;
    for (var j = i + 1; j < Math.min(i + 6, lineas.length); j++) {
      var t2 = lineas[j];
      if (!t2 || /^[ABHL]$/i.test(t2)) continue;
      if (/^FROTIS|TIEMPO DE|FIBRINOGENO|DIMERO|HEMATOLOGIA/i.test(t2)) break;
      if (/PLAQUETAS/i.test(t2)) return t2.toUpperCase();
    }
  }
  return "PLAQUETAS DISMINUIDAS";
}
function formatFrotisSangreLines_(desc) {
  var up = String(desc || "").toUpperCase().trim();
  if (!up) return "";
  var calTokens = [];
  var plaqTokens = [];
  var otros = [];
  up.split(/\s*,\s*/).forEach(function(chunk) {
    var c = chunk.trim();
    if (!c) return;
    if (/PLAQUET|MACROPLAQUET/i.test(c)) plaqTokens.push(c);
    else if (/HIPOCROM|ANISOCIT|POIKILOCIT|ESFEROCIT|ELIPT|DACRIOCIT|ESQUIZOCIT|BITE|ROD|HELIN|CABEZA|CUELLO|CABEZA DE FLECHA|POLICROM|NORMOCROM|NORMOCIT|MACROCIT|MICROCIT|\+/i.test(c)) {
      calTokens.push(c);
    } else otros.push(c);
  });
  var lines = [];
  if (calTokens.length) lines.push("FROTIS	Cal " + calTokens.join(", "));
  if (plaqTokens.length) lines.push("FROTIS	Plaq " + plaqTokens.join(", "));
  if (otros.length) lines.push("FROTIS	Obs " + otros.join(", "));
  if (!lines.length) lines.push("FROTIS	Obs " + up);
  return lines.join("\n");
}
function parsePlaquetasCitrato_(textoBruto, tNorm) {
  if (!tNorm || !/PLAQUETAS\s+CON\s+CITRATO/i.test(tNorm)) return "";
  var bloque = "";
  var m = textoBruto.match(
    /PLAQUETAS\s+CON\s+CITRATO[\s\S]*?(?=\n\s*(?:HEMATOLOGIA|QUIMICA\s+CLINICA|URIANALISIS|BACTERIOLOGIA|GASOMETRIA|BIOMETRIA|COAGULACION)\b|$)/i
  );
  bloque = m ? m[0].replace(/\s+/g, " ") : tNorm;
  var pltData = extraerConRango(["CUENTA DE PLAQUETAS", "PLT "], bloque);
  if (pltData.valor === "---") return "";
  var Plt = fmt(marcarSegunRango(pltData.valor, pltData.min, pltData.max));
  return "PltCit	Plt " + Plt;
}
function extraerQuimicaOrinaParaEGO_(textoBruto) {
  var out = { na: null, k: null, cl: null, cr: null };
  if (!textoBruto) return out;
  var lineas = textoBruto.split(/\r?\n/).map(function(l) {
    return l.replace(/\*/g, "").trim();
  });
  function valorTrasEtiqueta(etiquetas) {
    for (var e = 0; e < etiquetas.length; e++) {
      var lbl = etiquetas[e].toUpperCase();
      for (var i = 0; i < lineas.length; i++) {
        if (lineas[i].toUpperCase() !== lbl) continue;
        for (var j = i + 1; j < Math.min(i + 10, lineas.length); j++) {
          var l = lineas[j].trim();
          if (!l) continue;
          if (/^[ABHL]$/.test(l)) continue;
          if (/^(N\/A|Estudio|Resultado|Unidades|Valor de Referencia|VALOR DE REF)/i.test(l)) continue;
          if (/^[\-–:\/\.]+$/.test(l)) continue;
          var mNum = l.match(/^(-?\d+[.,]?\d*)/);
          if (mNum) return mNum[1].replace(",", ".");
        }
      }
    }
    return null;
  }
  out.k = valorTrasEtiqueta(["POTASIO EN ORINA"]);
  out.na = valorTrasEtiqueta(["SODIO EN ORINA"]);
  out.cr = valorTrasEtiqueta(["CREATININA EN ORINA"]);
  var mCl = textoBruto.match(/CLORO\s+EN\s+ORINA\s*:?\s*(\d+[.,]?\d*)/i);
  if (mCl) out.cl = mCl[1].replace(",", ".");
  return out;
}
function parseEGO_(textoBruto) {
  var qOrina = extraerQuimicaOrinaParaEGO_(textoBruto);
  var hasQO = !!(qOrina.na || qOrina.k || qOrina.cl || qOrina.cr);
  var tUp = textoBruto.toUpperCase();
  var pos = tUp.indexOf("EXAMEN GENERAL DE ORINA") !== -1 ? tUp.indexOf("EXAMEN GENERAL DE ORINA") : tUp.indexOf("ANALISIS DE ORINA") !== -1 ? tUp.indexOf("ANALISIS DE ORINA") : tUp.indexOf("URIANALISIS") !== -1 ? tUp.indexOf("URIANALISIS") : -1;
  var lineas;
  if (pos === -1) {
    if (!hasQO) return "";
    lineas = [];
  } else {
    var fin = tUp.search(/BACTERIOLOGIA|CULTIVO|COMENTARIO DE MUESTRA/);
    var bloque = fin !== -1 && fin > pos ? textoBruto.substring(pos, fin) : textoBruto.substring(pos);
    lineas = bloque.split(/\r?\n/).map(function(l) {
      return l.replace(/\*/g, "").trim();
    });
  }
  function esUnidad(l) {
    return /^(Hem\/uL|Leucocitos\/uL|E\.U\.\/dL|mOsm\/L|mg\/dL|mmol\/L|g\/dL|\/CAMPO|K\/uL|fL|pg|uL|U\/L|SEG\.?)$/i.test(l) || /^[a-zA-Z]+\/[a-zA-Z]+$/.test(l);
  }
  function buscarValor(nombres) {
    for (var n = 0; n < nombres.length; n++) for (var i = 0; i < lineas.length; i++) if (lineas[i].toUpperCase() === nombres[n].toUpperCase()) {
      for (var j = i + 1; j < Math.min(i + 8, lineas.length); j++) {
        var l = lineas[j].trim();
        if (!l) continue;
        if (/^[ABHL]$/.test(l)) continue;
        if (/^[:\-\/\.\s]+$/.test(l)) continue;
        if (/^(N\/A|EstudioResultado|ESTUDIO|SEDIMENTO|QUIMICO|FISICO|MICROSCOPICO|URIANALISIS|EXAMEN GENERAL|OBSERVACIONES)/i.test(l)) continue;
        var mApr = l.match(/^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+)/i);
        if (mApr) return mApr[1];
        if (esUnidad(l)) continue;
        if (/^\d[\d\.,]*\s+[\-–]\s+\d[\d\.,]*$/.test(l)) continue;
        if (/^\d+[\-–]\d+\//.test(l)) continue;
        if (/^\d+[\-–]\d+$/.test(l)) return l;
        var mNum = l.match(/^(-?\d+[.,]?\d*)/);
        if (mNum) return mNum[1].replace(",", ".");
        if (l.length <= 30 && !/\d{4,}/.test(l) && !/VALOR DE REF/i.test(l)) return l.toUpperCase();
      }
    }
    return "---";
  }
  var color = buscarValor(["COLOR"]), aspecto = buscarValor(["ASPECTO"]), ph = buscarValor(["PH"]), dens = buscarValor(["DENSIDAD", "GRAVEDAD ESPECIFICA"]);
  var prot = buscarValor(["PROTEINAS", "PROTEINURIA"]), glu = buscarValor(["GLUCOSA"]), cet = buscarValor(["CETONAS", "CUERPOS CETONICOS"]);
  var bilis = buscarValor(["BILIRRUBINAS", "BILIRRUBINA"]), sangre = buscarValor(["SANGRE"]), nitr = buscarValor(["NITRITOS"]);
  var urobil = buscarValor(["UROBILINOGENO", "UROBILIN\xD3GENO"]), estLeu = buscarValor(["ESTERASA LEUCOCITARIA"]);
  var leu = buscarValor(["LEUCOCITOS"]), eri = buscarValor(["ERITROCITOS", "HEMATIES"]), bact = buscarValor(["BACTERIAS"]);
  var celEpit = buscarValor(["CELULAS EPITELIALES"]), cilinG = buscarValor(["CILINDROS GRANOLOSOS"]), cilinH = buscarValor(["CILINDROS HIALINOS"]);
  var levad = buscarValor(["LEVADURAS"]), moco = buscarValor(["MOCO"]);
  if (!hasQO && color === "---" && aspecto === "---" && ph === "---" && leu === "---" && eri === "---") return "";
  function abreviar(val) {
    if (!val || val === "---") return "---";
    var v = val.toUpperCase().trim();
    if (v === "NEGATIVO" || v === "NEGATIVE") return "NEG";
    if (v === "POSITIVO" || v === "POSITIVE") return "POS";
    if (v === "AUSENTES" || v === "AUSENTE") return "AUS";
    if (v === "ESCASAS" || v === "ESCASO") return "ESC";
    if (v === "MODERADAS" || v === "MODERADO") return "MOD";
    if (v === "ABUNDANTES" || v === "ABUNDANTE") return "ABD";
    if (v === "AMARILLO") return "AMAR";
    if (v === "TURBIO") return "TURB";
    if (v === "CLARO") return "CLARO";
    return v;
  }
  function marcarEGO(val, tipo) {
    if (!val || val === "---") return "---";
    var ab = abreviar(val);
    if (["PROT", "GLU", "CET", "BILI", "NITR", "ESTLEU"].indexOf(tipo) !== -1) return ab !== "NEG" && ab !== "AUS" ? ab + "*" : ab;
    if (tipo === "SANG") {
      var v = parseFloat(val);
      if (!isNaN(v)) return v > 0 ? val + "*" : "NEG";
      return ab !== "NEG" && ab !== "AUS" ? ab + "*" : ab;
    }
    if (tipo === "UROBIL") {
      var v = parseFloat(val);
      return !isNaN(v) && v > 1 ? ab + "*" : ab;
    }
    if (tipo === "PH") {
      var v = parseFloat(val);
      return !isNaN(v) && (v < 5.5 || v > 6.5) ? ab + "*" : ab;
    }
    if (tipo === "DENS") {
      var v = parseFloat(val);
      return !isNaN(v) && (v < 1.005 || v > 1.025) ? ab + "*" : ab;
    }
    if (tipo === "LEU") {
      var mR = val.match(/^(\d+)[\-–](\d+)$/);
      if (mR) return parseInt(mR[1]) > 5 ? ab + "*" : ab;
      var v = parseFloat(val);
      return !isNaN(v) && v > 5 ? ab + "*" : ab;
    }
    if (tipo === "ERI") {
      var mR = val.match(/^(\d+)[\-–](\d+)$/);
      if (mR) return parseInt(mR[1]) > 2 ? ab + "*" : ab;
      var v = parseFloat(val);
      return !isNaN(v) && v > 2 ? ab + "*" : ab;
    }
    if (["BACT", "CELEP", "CLING", "CLINH", "LEVAD", "MOCO"].indexOf(tipo) !== -1) return ab !== "AUS" ? ab + "*" : ab;
    return ab;
  }
  var fisico = [], quimico = [], sedimento = [];
  if (color !== "---") fisico.push(marcarEGO(color, "COLOR"));
  if (aspecto !== "---") fisico.push(marcarEGO(aspecto, "ASPECTO"));
  if (ph !== "---") fisico.push("pH " + marcarEGO(ph, "PH"));
  if (dens !== "---") fisico.push("D " + marcarEGO(dens, "DENS"));
  if (prot !== "---") quimico.push("Prot " + marcarEGO(prot, "PROT"));
  if (glu !== "---") quimico.push("Glu " + marcarEGO(glu, "GLU"));
  if (cet !== "---") quimico.push("Cet " + marcarEGO(cet, "CET"));
  if (bilis !== "---") quimico.push("Bili " + marcarEGO(bilis, "BILI"));
  if (sangre !== "---") quimico.push("Sang " + marcarEGO(sangre, "SANG"));
  if (nitr !== "---") quimico.push("Nitr " + marcarEGO(nitr, "NITR"));
  if (urobil !== "---") quimico.push("Urobil " + marcarEGO(urobil, "UROBIL"));
  if (estLeu !== "---") quimico.push("EstLeu " + marcarEGO(estLeu, "ESTLEU"));
  if (leu !== "---") sedimento.push("Leu " + marcarEGO(leu, "LEU"));
  if (eri !== "---") sedimento.push("Eri " + marcarEGO(eri, "ERI"));
  if (bact !== "---" && abreviar(bact) !== "AUS") sedimento.push("Bact " + marcarEGO(bact, "BACT"));
  if (celEpit !== "---" && abreviar(celEpit) !== "AUS") sedimento.push("CelEp " + marcarEGO(celEpit, "CELEP"));
  if (cilinG !== "---" && abreviar(cilinG) !== "AUS") sedimento.push("CilinG " + marcarEGO(cilinG, "CLING"));
  if (cilinH !== "---" && abreviar(cilinH) !== "AUS") sedimento.push("CilinH " + marcarEGO(cilinH, "CLINH"));
  if (levad !== "---" && abreviar(levad) !== "AUS") sedimento.push("Levad " + marcarEGO(levad, "LEVAD"));
  if (moco !== "---" && abreviar(moco) !== "AUS") sedimento.push("Moco " + marcarEGO(moco, "MOCO"));
  if (qOrina.na) quimico.push("NaU " + qOrina.na);
  if (qOrina.k) quimico.push("KU " + qOrina.k);
  if (qOrina.cl) quimico.push("ClU " + qOrina.cl);
  if (qOrina.cr) quimico.push("CrU " + qOrina.cr);
  if (!fisico.length && !quimico.length && !sedimento.length) return "";
  var sub = ["EGO:"];
  if (fisico.length) sub.push("  " + fisico.join("  "));
  if (quimico.length) sub.push("  " + quimico.join("  "));
  if (sedimento.length) sub.push("  " + sedimento.join("  "));
  return sub.join("\n");
}
function parseCuantOrina_(textoBruto) {
  var tUp = textoBruto.toUpperCase();
  var startIdx = tUp.indexOf("CUANTIFICACION PROTEINAS");
  if (startIdx === -1) return "";
  var bloque = textoBruto.substring(startIdx);
  var nextSec = bloque.search(/\n(?:HEMATOLOGIA|BACTERIOLOGIA|CULTIVO|EXAMEN GENERAL|GASOMETRIA|BIOMETRIA)\b/i);
  if (nextSec > 0) bloque = bloque.substring(0, nextSec);
  var lineas = bloque.split(/\r?\n/).map(function(l) {
    return l.replace(/\*/g, "").replace(/\t.*/, "").trim();
  });
  var vol = "---", res = "---";
  var tipo = /orina\s+de\s+12/i.test(bloque) ? "12h" : "24h";
  for (var i = 0; i < lineas.length; i++) {
    var lUp = lineas[i].toUpperCase();
    if (lUp.indexOf("VOLUMEN") !== -1) {
      for (var j = i + 1; j < Math.min(i + 6, lineas.length); j++) {
        var v = lineas[j];
        if (!v || /^[A-Z]$/.test(v)) continue;
        var m = v.match(/^(\d+\.?\d*)/);
        if (m) {
          vol = m[1];
          break;
        }
      }
    }
    if (lUp === "RESULTADO") {
      for (var j = i + 1; j < Math.min(i + 6, lineas.length); j++) {
        var v = lineas[j];
        if (!v || /^[A-Z]$/.test(v)) continue;
        var m = v.match(/^(\d+\.?\d*)/);
        if (m) {
          res = m[1];
          break;
        }
      }
    }
  }
  if (res === "---") return "";
  var parts = ["Prot" + tipo];
  if (vol !== "---") parts.push("Vol " + vol + "ml");
  parts.push(res + "*");
  parts.push("gr/vol");
  return parts[0] + "	" + parts.slice(1).join(" ");
}
function detectTipoCultivoLine(lineasTexto) {
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
  var idxSec = idxBact !== -1 ? idxBact : idxMyco;
  if (idxSec === -1) return "";
  var candidate = "";
  for (var i = idxSec + 1; i < Math.min(idxSec + 35, lineasTexto.length); i++) {
    var l = lineasTexto[i].replace(/\r/g, "").replace(/\*/g, " ").replace(/\s+/g, " ").trim();
    if (!l) continue;
    var lUp = l.toUpperCase();
    if (/^BACTERIOLOGIA$/.test(lUp)) continue;
    if (/^ESTUDIO\b/.test(lUp)) continue;
    if (/^RESULTADO$/.test(lUp) || /^UNIDADES$/.test(lUp) || /^VALOR DE REFERENCIA$/.test(lUp)) continue;
    if (/^PRODUCTO$/.test(lUp)) break;
    if (/\bUROCULTIVO\b/i.test(l) || /\bHEMOCULTIVO\b/i.test(l) || /^CATETER(\b|$)/i.test(lUp))
      return l;
    if (/^BACILOSCOPIA\b/i.test(lUp) || /^CULTIVO\s+DE\s+MICOBACTERIAS\b/i.test(lUp)) return l;
    if (!candidate && !/^(TINCION|CALIDAD|ESTADO|MICROORGANISMO|COMENTARIO|CUENTA|ANTIBIOGRAMA|REPORTE\s+PRELIMINAR|1\s+MUESTRA|OBSERVACIONES|SECCION)\b/i.test(lUp)) {
      candidate = l;
    }
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
function findMycoStudyResult_(slice, fromIdx) {
  for (var k = fromIdx + 1; k < Math.min(fromIdx + 22, slice.length); k++) {
    var t2 = cleanMycoLine_(slice[k]);
    if (!t2) continue;
    var tUp = t2.toUpperCase();
    if (/^(BACILOSCOPIA|CULTIVO\s+DE\s+MICOBACTERIAS)/i.test(tUp)) break;
    if (/^OBSERVACIONES/i.test(tUp)) break;
    if (/^(ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA|1\s+MUESTRA)$/i.test(tUp)) continue;
    if (/^SECCION\s+DE\s+MICOBACTERIAS/i.test(tUp)) continue;
    if (/^REPORTE\s+PRELIMINAR/i.test(tUp)) continue;
    if (/^CULTIVO$/i.test(tUp)) {
      for (var k2 = k + 1; k2 < Math.min(k + 6, slice.length); k2++) {
        var v = cleanMycoLine_(slice[k2]);
        if (v && v.length > 2) return v.toUpperCase();
      }
      continue;
    }
    if (/NEGATIVO|POSITIVO|PENDIENTE|EN CURSO|CRECIMIENTO|NO SE AISL/i.test(tUp) && t2.length < 120) return tUp;
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
  var t2 = tipoLine ? tipoLine.replace(/\s+/g, " ").trim().toUpperCase() : "";
  var m = muestra ? muestra.replace(/\s+/g, " ").trim().toUpperCase() : "";
  if (t2 && m) return t2 + " (" + m + ")";
  if (t2) return t2;
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
function extractMarcasResistenciaDesdeTexto(texto) {
  var u = texto.toUpperCase().replace(/Á/g, "A").replace(/É/g, "E").replace(/Í/g, "I").replace(/Ó/g, "O").replace(/Ú/g, "U");
  var seen = {};
  var tags = [];
  function add(tag) {
    if (!tag || seen[tag]) return;
    seen[tag] = 1;
    tags.push(tag);
  }
  if (/\bKPC\b|KPC-/.test(u)) add("KPC");
  if (/\bNDM\b|NDM-/.test(u)) add("NDM");
  if (/\bVIM\b|VIM-/.test(u)) add("VIM");
  if (/\bIMP-\d|\bIMP\s*1\b|\bIMP1\b/.test(u) || /BETALACTAMASA\s+IMP/.test(u)) add("IMP");
  if (/\bOXA[- ]?48\b|OXA48\b/.test(u)) add("OXA-48");
  if (/\bOXA[- ]?(23|24|51|58)(?![0-9])\b/i.test(u)) add("OXA-otras");
  if (/\bMBL\b|METALO\s*BETA|METALOCARBAPENEMAS|METALO-?\s*BETALACTAMASA|BETALACTAMASA\s+DE\s+ZINC/.test(u)) add("MBL");
  if (/\bSPM\b|SPM-/.test(u)) add("SPM");
  if (/\bGIM\b|GIM-/.test(u)) add("GIM");
  if (/\bCPE\b|\bCRE\b|ENTEROBACTER(I)?A\s+RESISTENTE\s+A\s+CARBAPEN|BACILO\s+CARBAPEN/.test(u)) add("CRE");
  if (/RESISTEN(CIA|TE)\s+.*CARBAPEN|CARBAPEN.*RESIST|NO\s+SUSCEPTIB.*CARBAPEN|ANTICARBAPEN|ANTI-?CARBAPEN|PRODUCTOR\s+DE\s+CARBAPENEMASA|PRODUCTOR(ES)?\s+CARBAPEN|DETECTO\s+CARBAPENEMASA|DETECT[OÓ]\s+CARBAPENEMASA|CARBAPENEMASA\s+DETECTAD/i.test(
    u
  )) {
    if (!seen.KPC && !seen.NDM && !seen.VIM && !seen.IMP && !seen["OXA-48"] && !seen.MBL) add("Carb-R");
  }
  if (/\bESBL\b|BETALACTAMASAS?\s+DE\s+ESPECTRO|ESPECTRO\s+EXTENDIDO|BLEE\s*\+\s*ESBL/.test(u)) add("ESBL");
  if (/\(BLEE\)|\bBLEE\b|BETALACTAMASAS?\s*\(?BLEE\)?|PRODUCTOR\s+DE\s+BETALACTAMASAS(?!\s+DE\s+ESPECTRO)/.test(u)) add("BLEE");
  if (/\bAMPC\b|AMP\s*C\b|BETALACTAMASA\s+AMPC|CEPHAMYCIN/.test(u)) add("AmpC");
  if (/\bMECA\b|\bMRSA\b|METICILIN(A)?\s*-?\s*RESIST|OXACILIN(A)?\s*:\s*R(?!\s*\d)/.test(u)) add("MRSA");
  if (/\bVRE\b|VANCOMICIN(A)?\s*-?\s*RESIST|ENTEROCOC.*VANCO\s*R|VANCO\s*[-–]\s*R/.test(u)) add("VRE");
  if (/COLISTIN(A)?\s*[-–:]?\s*R|POLIMIXIN(A)?\s*[-–:]?\s*R|RESIST.*COLISTIN/.test(u)) add("Col-R");
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
function formatCultivoCondensedForCopy(chunkText, _studyDateLine) {
  var lines = [];
  var chunkLines = String(chunkText || "").trim().split(/\n/).map(function(l) {
    return l.trim();
  }).filter(Boolean);
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
function findCultivoGermenRuns(lineasTexto) {
  var runs = [];
  for (var i = 0; i < lineasTexto.length; i++) {
    var L = lineasTexto[i].replace(/\r/g, "").replace(/\*+$/g, "").trim();
    if (!/^MICROORGANISMO(\s|$)/i.test(L)) continue;
    var germen = "";
    var nameEnd = i;
    for (var k = i + 1; k < Math.min(i + 14, lineasTexto.length); k++) {
      var cand = lineasTexto[k].replace(/\r/g, "").replace(/\*/g, "").trim();
      if (!cand) continue;
      if (/^COMENTARIO/i.test(cand)) break;
      if (/^MICROORGANISMO/i.test(cand)) break;
      if (/^ANTIBIOGRAMA/i.test(cand)) break;
      if (/^CUENTA/i.test(cand)) break;
      if (!/MALDI|IDENTIF|ESPECTROMETRIA|ESPECTRO/i.test(cand)) {
        germen = cand.toUpperCase();
        nameEnd = k;
        break;
      }
    }
    if (!germen) continue;
    var end = lineasTexto.length;
    for (var m = i + 1; m < lineasTexto.length; m++) {
      var Lm = lineasTexto[m].replace(/\r/g, "").replace(/\*+$/g, "").trim();
      if (/^MICROORGANISMO(\s|$)/i.test(Lm) && m > nameEnd) {
        end = m;
        break;
      }
      if (/^IDENTIFICACION\s+POR\s+ESPECTROMETRIA/i.test(Lm)) {
        end = m;
        break;
      }
    }
    runs.push({ germen, i0: i, i1: end });
    i = end - 1;
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
  var mC = fragBeforeAb.match(/([<>]=?\s?\d+(\.\d+)?\s*[A-Z%\/]*)/i);
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
function classifyAtbInterp(itRaw) {
  var u = String(itRaw || "").trim().toUpperCase().replace(/\s+/g, " ");
  if (u === "S" || u === "POS" || u === "SENSIBLE" || u === "SUSCEPTIBLE") return "s";
  if (u === "I" || u === "IND" || u.indexOf("INDETER") !== -1 || u.indexOf("INTERMED") !== -1) {
    return "i";
  }
  return "r";
}
function extractMicSortKey(micRaw) {
  var t2 = String(micRaw || "").trim().replace(/\s+/g, " ").replace(/,/g, ".").replace(/\u2264/g, "<=").replace(/\u2265/g, ">=");
  if (!t2) return NaN;
  var m = t2.match(/(?:<=|>=|<|>|=)?\s*(\d+(?:\.\d+)?)/);
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
    var g2 = String(run.germen || "").replace(/\s+/g, " ").trim().toUpperCase();
    if (!g2) return false;
    if (g2 === q || q === g2) return true;
    if (q.indexOf(g2) !== -1 || g2.indexOf(q) !== -1) return true;
    var qTok = q.split(/\s+/).filter(Boolean)[0] || "";
    var gTok = g2.split(/\s+/).filter(Boolean)[0] || "";
    if (qTok.length > 3 && gTok.length > 3 && (qTok === gTok || q.indexOf(gTok) === 0 || g2.indexOf(qTok) === 0)) return true;
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
function isParsedCultivoHeaderLine(t2) {
  var s = String(t2 || "").trim();
  if (!s) return false;
  if (/^CULTIVO\b/i.test(s)) return true;
  if (/^(UROCULTIVO|HEMOCULTIVO|FUNGICULTIVO)\b/i.test(s)) return true;
  if (/^TINCION\s+DE\s+GRAM/i.test(s)) return true;
  if (/^CATETER\b/i.test(s)) return true;
  if (/^BACILOSCOPIA\b/i.test(s)) return true;
  if (/^CULTIVO\s+DE\s+MICOBACTERIAS\b/i.test(s)) return true;
  if (/^(SECRECION|LIQUIDO|ASPIRADO|ABSCESO|BRONCOALVEOLAR)\b/i.test(s)) return true;
  return /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ()\s\/.-]*\s+\d{1,2}\/\d{1,2}(?:\/\d{2,4})?:\s+\S/i.test(s);
}
function parseCultivo_(textoBruto, tNorm) {
  var tUpper = tNorm.toUpperCase();
  if (tUpper.indexOf("HEMOCULTIVO") === -1 && tUpper.indexOf("CULTIVO") === -1 && tUpper.indexOf("MICROORGANISMO") === -1 && tUpper.indexOf("MYCOBACTERIAS") === -1 && tUpper.indexOf("BACILOSCOPIA") === -1) return "";
  var fechaC = "N/D";
  var mFecha = tNorm.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (mFecha) fechaC = mFecha[1].padStart(2, "0") + "/" + mFecha[2].padStart(2, "0");
  var lineasTexto = textoBruto.split("\n").map(function(l) {
    return l.replace(/\r/g, "");
  });
  var germenRuns = findCultivoGermenRuns(lineasTexto);
  var mycoOut = parseMycobacteriasStudies_(lineasTexto, fechaC);
  if (mycoOut && !germenRuns.length) return mycoOut;
  var sitio = buildCultivoTipoDisplay(detectTipoCultivoLine(lineasTexto), detectMuestraDesdeProducto(lineasTexto));
  var reportePreliminar = /REPORTE\s+PRELIMINAR/i.test(lineasTexto.join("\n"));
  function abreviarAb(n) {
    n = n.toUpperCase().trim();
    if (/PIPERACILINA|PIP\/TAZ/.test(n)) return "PIP/TAZO";
    if (/TRIMET|TMP\/SMX|TRIMET\/SULFA/.test(n)) return "TMP/SMX";
    if (/AMP\S*\/\s*SULB|AMPICILINA.*SULBACTAM|AMP\/SULB/.test(n)) return "AMP-SULB";
    if (/GENT\.?\s*SINERG|SINERG/.test(n)) return "GENT-SIN";
    if (/GENTAMICINA/.test(n)) return "GENT";
    if (/AMIKACINA/.test(n)) return "AMIK";
    if (/TOBRAMICINA/.test(n)) return "TOBRA";
    if (/TETRACICLINA/.test(n)) return "TETRA";
    if (/NITROFURANTOINA/.test(n)) return "NITRO";
    if (/CIPROFLOXACINA/.test(n)) return "CIPRO";
    if (/LEVOFLOXACINA/.test(n)) return "LVX";
    if (/MEROPENEM/.test(n)) return "MERO";
    if (/ERTAPENEM/.test(n)) return "ERTA";
    if (/IMIPENEM/.test(n)) return "IMI";
    if (/CEFTRIAXONA/.test(n)) return "CFTX";
    if (/CEFOTAXIMA/.test(n)) return "CTX";
    if (/CEFOXITINA/.test(n)) return "CFXN";
    if (/CEFAZOLINA/.test(n)) return "CFZ";
    if (/CEFEPIMA/.test(n)) return "FEP";
    if (/CEFTAZIDIM.*AVIBACT|AVIBACTAM/.test(n)) return "CAZ-AVI";
    if (/CEFTAZIDIM|CEFTAZIDIMA/.test(n)) return "CAZ";
    if (/DAPTOMICINA/.test(n)) return "DAPTO";
    if (/LINEZOLID/.test(n)) return "LINEZ";
    if (/VANCOMICINA/.test(n)) return "VANCO";
    if (/PENICILINA|BENZILPENICILINA/.test(n)) return "PEN";
    if (/AMPICILINA/.test(n) && !/SULB/.test(n)) return "AMP";
    if (/CLINDAMICINA/.test(n)) return "CLINDA";
    var base = n.replace(/\bSODICO\b|\bSODIUM\b|\bDISODICO\b/g, "").trim().split("(")[0].trim().split(/\s+/)[0];
    return base.length > 10 ? base.substring(0, 10) : base;
  }
  if (germenRuns.length) {
    var chunks = [];
    for (var ri = 0; ri < germenRuns.length; ri++) {
      var run = germenRuns[ri];
      var sliceLines = lineasTexto.slice(run.i0, run.i1);
      var subNorm = sliceLines.join("\n");
      var idxAbLoc = subNorm.toUpperCase().indexOf("ANTIBIOGRAMA");
      var head = sitio + " " + fechaC + ": " + run.germen;
      var headTags = [];
      if (reportePreliminar) headTags.push("Preliminar");
      var marcasRun = detectMarcasResistenciaCultivoSlice(sliceLines);
      marcasRun.forEach(function(m) {
        if (headTags.indexOf(m) === -1) headTags.push(m);
      });
      if (headTags.length) head += " \xB7 " + headTags.join(" \xB7 ");
      var chunk = head;
      if (idxAbLoc !== -1) {
        var lineasAb = subNorm.substring(idxAbLoc).split("\n").map(function(l) {
          return l.replace(/\r/g, "").replace(/\*/g, "").trim();
        });
        var sensCrudas = parseSensCrudasAntibiogramaSlice(lineasAb);
        var abCompact = compactarLineasAntibiograma(sensCrudas, abreviarAb);
        if (abCompact) chunk += "\n" + abCompact;
      }
      var cuentaRun = extractCuentaKassFromLineas(sliceLines);
      if (cuentaRun) chunk += "\nCuenta: " + cuentaRun;
      chunks.push(chunk);
    }
    return chunks.join("\n\n");
  } else {
    if (tNorm.toUpperCase().indexOf("BACILOSCOPIA") !== -1 && tNorm.toUpperCase().indexOf("POSITIVO") !== -1) {
      var mPos = tNorm.match(/BACILOSCOPIA[^\.\n]*POSITIVO[^\n\.]*/i);
      return "BACILOSCOPIA " + fechaC + ": " + (mPos ? mPos[0].trim() : "BACILOSCOPIA POSITIVA");
    }
    var estado = "NEGATIVO";
    var pEst = tUpper.indexOf("ESTADO");
    if (pEst !== -1) {
      var fEst = tNorm.substring(pEst + 17, pEst + 80).split("*")[1] || tNorm.substring(pEst + 17, pEst + 80);
      estado = fEst.split("MICRO")[0].split("PRODUCTO")[0].trim().toUpperCase();
    }
    return sitio + " " + fechaC + ": " + estado;
  }
}
var LAB_FECHA_MESES_ABBREV = { ene: "01", feb: "02", mar: "03", abr: "04", may: "05", jun: "06", jul: "07", ago: "08", sep: "09", oct: "10", nov: "11", dic: "12", jan: "01", apr: "04", aug: "08", dec: "12" };
function padFechaDMY(d, m, yStr) {
  var y = String(yStr);
  if (y.length === 2) y = "20" + y;
  return String(d).padStart(2, "0") + "/" + String(m).padStart(2, "0") + "/" + y;
}
function extractLabReportFechaDMY(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") return "";
  var t2 = textoBruto;
  var m = t2.match(/Fecha\s+Registro\s*:?\s*\r?\n?\s*([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/i);
  if (m) {
    var mon = LAB_FECHA_MESES_ABBREV[m[1].toLowerCase().slice(0, 3)];
    if (mon) return padFechaDMY(m[2], mon, m[3]);
  }
  var patronesNum = [
    /Fecha\s+(?:de\s+)?(?:Registro|resultado|Resultado|muestra|Muestra|emisi[oó]n|ingreso|extracci[oó]n)\s*:?\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i,
    /(?:Fecha|FECHA)\s+DEL\s+ESTUDIO\s*:?\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i,
    /Recepci[oó]n\s*(?:de\s*)?(?:muestra)?\s*:?\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i,
    /(?:Captura|Validaci[oó]n|Reporte)\s*:?\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i
  ];
  for (var i = 0; i < patronesNum.length; i++) {
    m = t2.match(patronesNum[i]);
    if (m) return padFechaDMY(m[1], m[2], m[3]);
  }
  var head = t2.slice(0, 3200);
  m = head.match(/\bFecha\s*:\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/i);
  if (m) return padFechaDMY(m[1], m[2], m[3]);
  return "";
}
function looksLikeSomeLabReport(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") return false;
  var t2 = textoBruto;
  if (!/Expediente\s*:/i.test(t2)) return false;
  if (!/Nombre\s*:/i.test(t2)) return false;
  return /Fecha\s+Registro/i.test(t2) || /HEMATOLOG[IÍ]A|QU[IÍ]MICA|BIOMETR[IÍ]A|GASOMETR[IÍ]A/i.test(t2);
}
function applyMeridiemHour(hh, meridiemRaw) {
  if (!meridiemRaw) return hh;
  var t2 = String(meridiemRaw).toLowerCase().replace(/\./g, "").replace(/\s+/g, "");
  var isPm = t2 === "pm" || t2 === "p" || t2.indexOf("pm") !== -1;
  var isAm = t2 === "am" || t2 === "a" || t2.indexOf("am") !== -1;
  if (isPm && !isAm) {
    if (hh < 12) return hh + 12;
    return hh;
  }
  if (isAm && !isPm) {
    if (hh === 12) return 0;
    return hh;
  }
  return hh;
}
function horaFromFechaRegistroMatch(m) {
  if (!m) return "";
  var hh = parseInt(m[1], 10);
  var mm = parseInt(m[2], 10);
  if (!isFinite(hh) || !isFinite(mm)) return "";
  hh = applyMeridiemHour(hh, m[4]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return "";
  return String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
}
function extractLabReportHora(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") return "";
  var head = textoBruto.slice(0, 4e3);
  var m = head.match(
    /Fecha\s+Registro\s*:?[\s\t]*[A-Za-z]{3}\s+\d{1,2}\s+\d{4}\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i
  );
  if (m) return horaFromFechaRegistroMatch(m);
  m = head.match(
    /Fecha\s+Registro\s*:?[\s\t]*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*((?:a|p)\.?\s*m\.?|AM|PM)?/i
  );
  if (m) return horaFromFechaRegistroMatch(m);
  return "";
}
function putTrendRef_(refs, sectionKey, fieldKey, data) {
  if (!data || data.min == null || data.max == null) return;
  var min = Number(data.min);
  var max = Number(data.max);
  if (!isFinite(min) || !isFinite(max) || max <= min) return;
  if (!refs[sectionKey]) refs[sectionKey] = {};
  refs[sectionKey][fieldKey] = [min, max];
}
function someReportBlocks_(textoBruto) {
  var tNorm = textoBruto.replace(/\s+/g, " ");
  var mGaso = tNorm.match(
    /GASOMETRIA.*?(?=BIOMETRIA|CITOLOGIA|QUIMICA|ELECTROLITOS|PFH|COAGULACION|CITOQUIMICO|$)/i
  );
  var bloqueGaso = mGaso ? mGaso[0] : "";
  var mLCR = textoBruto.match(/CITOQUIMICO\s+DE\s+LCR.*?(?=BACTERIOLOGIA|CUADERNILLO|$)/i) || textoBruto.match(/CITOQUIMICO\s+LIQ\.?\s+LCR.*?(?=BACTERIOLOGIA|CUADERNILLO|$)/i) || textoBruto.match(/CITOQUIMICO\s+LCR.*?(?=BACTERIOLOGIA|CUADERNILLO|$)/i);
  var bloqueLCR = mLCR ? mLCR[0] : "";
  var bloqueCitoLC = bloqueCitoquimicoLiquidosFull(textoBruto);
  var mEGO = tNorm.match(
    /(?:URIANALISIS|EXAMEN GENERAL DE ORINA|ANALISIS DE ORINA).*?(?=BACTERIOLOGIA|CULTIVO|COMENTARIO DE MUESTRA|$)/i
  );
  var bloqueEGO = mEGO ? mEGO[0] : "";
  var tSinLiqCorp = tNorm;
  if (bloqueCitoLC) {
    tSinLiqCorp = tNorm.replace(bloqueCitoLC.replace(/\r/g, "").replace(/\s+/g, " "), " ");
  }
  var textoQS = tSinLiqCorp.replace(bloqueGaso, " ").replace(bloqueEGO, " ").replace(bloqueLCR ? bloqueLCR.replace(/\s+/g, " ") : "", " ");
  var esSoloGaso = /GASOMETRIA/i.test(tNorm) && !/BIOMETRIA|QUIMICA|ELECTROLITOS|PFH|COAGULACION|CULTIVO/i.test(tNorm);
  return { tNorm, tSinLiqCorp, textoQS, bloqueGaso, esSoloGaso };
}
function buildRefsBySectionFromReport(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") return {};
  var blocks = someReportBlocks_(textoBruto);
  var tNorm = blocks.tSinLiqCorp;
  var textoQS = blocks.textoQS;
  var bloqueGaso = blocks.bloqueGaso;
  var refs = {};
  if (!blocks.esSoloGaso) {
    putTrendRef_(refs, "BH", "Hb", extraerConRango(["HGB", "HEMOGLOBINA TOTAL", "HEMOGLOBINA"], tNorm));
    putTrendRef_(refs, "BH", "Hto", extraerConRango(["HCT ", "HEMATOCRITO"], tNorm));
    putTrendRef_(refs, "BH", "VCM", extraerConRango(["MCV ", "VCM "], tNorm));
    putTrendRef_(refs, "BH", "HCM", extraerConRango(["MCH ", "HCM "], tNorm));
    putTrendRef_(refs, "BH", "CHCM", extraerConRango(["MCHC", "CHCM"], tNorm));
    putTrendRef_(refs, "BH", "RDW", extraerConRango(["RDW "], tNorm));
    putTrendRef_(refs, "BH", "Leu", extraerConRango(["WBC "], tNorm));
    putTrendRef_(refs, "BH", "Neu", extraerConRango(["NEU "], tNorm));
    putTrendRef_(refs, "BH", "Eos", extraerConRango(["EOS "], tNorm));
    putTrendRef_(refs, "BH", "Lin", extraerConRango(["LYM ", "LINFOCITOS"], tNorm));
    putTrendRef_(refs, "BH", "Mono", extraerConRango(["MONO "], tNorm));
    putTrendRef_(refs, "BH", "Baso", extraerConRango(["BASO "], tNorm));
    putTrendRef_(refs, "BH", "Plt", extraerConRango(["PLT "], tNorm));
    putTrendRef_(refs, "BH", "MPV", extraerConRango(["MPV ", "VPM "], tNorm));
    putTrendRef_(refs, "BH", "RBC", extraerConRango(["RBC ", "ERITROCITOS", "HEMATIES"], tNorm));
    putTrendRef_(refs, "BH", "Ret", extraerConRango(["RETICULOCITOS"], tNorm));
    putTrendRef_(refs, "BH", "TP", extraerConRango(["TIEMPO DE PROTROMBINA"], tNorm));
    putTrendRef_(refs, "BH", "TTP", extraerConRango(["TIEMPO DE TROMBOPLASTINA"], tNorm));
    putTrendRef_(refs, "BH", "INR", extraerConRango(["INR ", "INR"], tNorm));
    putTrendRef_(refs, "QS", "Glu", extraerConRangoSuero(["GLUCOSA EN SANGRE", "GLUCOSA EN", "GLUCOSA"], textoQS));
    putTrendRef_(refs, "QS", "Cr", extraerConRangoSuero(["CREATININA EN SANGRE", "CREATININA"], textoQS));
    putTrendRef_(refs, "QS", "BUN", extraerConRangoSuero(["NITROGENO DE LA UREA EN SANGRE", "NITROGENO DE LA UREA", "UREA"], textoQS));
    putTrendRef_(refs, "QS", "PCR", extraerConRangoSuero(["PROTEINA C REACTIVA", "PROTE\xCDNA C REACTIVA"], textoQS));
    putTrendRef_(refs, "QS", "PCT", extraerProcalcitonina_(textoQS));
    putTrendRef_(refs, "QS", "AU", extraerConRangoSuero(["ACIDO URICO EN SANGRE", "ACIDO URICO", "\xC1CIDO \xDARICO"], textoQS));
    putTrendRef_(refs, "QS", "TGL", extraerConRangoSuero(["TRIGLICERIDOS", "TRIGLIC\xC9RIDOS"], textoQS));
    putTrendRef_(refs, "QS", "COL", extraerConRangoSuero(["COLESTEROL"], textoQS));
    putTrendRef_(refs, "QS", "VSG", extraerConRangoSuero(["VSG ", "VELOCIDAD DE SEDIMENTACION"], textoQS));
    putTrendRef_(refs, "QS", "CPK", extraerConRangoSuero(["CPK CREATIN FOSFO QUINASA", "CPK "], textoQS));
    putTrendRef_(refs, "ESC", "Na", extraerConRangoSuero(["SODIO"], textoQS));
    putTrendRef_(refs, "ESC", "Cl", extraerConRangoSuero(["CLORO"], textoQS));
    putTrendRef_(refs, "ESC", "K", extraerConRangoSuero(["POTASIO"], textoQS));
    putTrendRef_(refs, "ESC", "Ca", extraerConRangoSuero(["CALCIO EN SUERO", "CALCIO"], textoQS));
    putTrendRef_(refs, "ESC", "F", extraerConRangoSuero(["FOSFORO EN SANGRE", "FOSFORO", "F\xD3SFORO"], textoQS));
    putTrendRef_(refs, "ESC", "Mg", extraerConRangoSuero(["MAGNESIO"], textoQS));
    putTrendRef_(refs, "PFHs", "Alb", extraerConRangoSuero(["ALBUMINA"], tNorm));
    putTrendRef_(refs, "PFHs", "AST", extraerConRango(["AST(ASPARTATO AMINOTRANSFERASA)", "AST "], tNorm));
    putTrendRef_(refs, "PFHs", "ALT", extraerConRango(["ALT ALANIN AMINO TRANSFERASA", "ALT "], tNorm));
    putTrendRef_(refs, "PFHs", "FA", extraerConRango(["ALP FOSFATASA ALCALINA", "FOSFATASA ALCALINA"], tNorm));
    putTrendRef_(refs, "PFHs", "BT", extraerConRango(["BILIRRUBINA TOTAL"], tNorm));
    putTrendRef_(refs, "PFHs", "BD", extraerConRango(["BILIRRUBINA DIRECTA"], tNorm));
    putTrendRef_(refs, "PFHs", "BI", extraerConRango(["BILIRRUBINA INDIRECTA"], tNorm));
    putTrendRef_(refs, "PFHs", "LDH", extraerConRango(["LDH DESHIDROGENASA LACTICA", "LDH "], tNorm));
    putTrendRef_(refs, "PFHs", "Amil", extraerConRango(["AMILASA SERICA", "AMILASA"], tNorm));
  }
  if (bloqueGaso) {
    putTrendRef_(refs, "GASES", "pH", extraerConRango(["PH "], bloqueGaso));
    putTrendRef_(refs, "GASES", "pCO2", extraerConRango(["PCO2"], bloqueGaso));
    putTrendRef_(refs, "GASES", "pO2", extraerConRango(["PO2 "], bloqueGaso));
    putTrendRef_(refs, "GASES", "Na", extraerConRango(["SODIO"], bloqueGaso));
    putTrendRef_(refs, "GASES", "K", extraerConRango(["POTASIO"], bloqueGaso));
    putTrendRef_(refs, "GASES", "GLU", extraerConRango(["GLUCOSA"], bloqueGaso));
    putTrendRef_(refs, "GASES", "Lactato", extraerConRango(["LACTATO"], bloqueGaso));
    putTrendRef_(refs, "GASES", "Bica", extraerConRango(["HCO3"], bloqueGaso));
    putTrendRef_(refs, "GASES", "Hto", extraerConRango(["HCT ", "HEMATOCRITO"], bloqueGaso));
    var iCaData = extraerConRango(["CA++ IONIZADO", "CALCIO IONIZADO", "CA IONIZADO"], bloqueGaso);
    putTrendRef_(refs, "GASES", "iCa", {
      valor: iCaData.valor,
      min: iCaData.min != null ? iCaData.min : 1.12,
      max: iCaData.max != null ? iCaData.max : 1.32
    });
  }
  return refs;
}
function procesarLabs(textoBruto) {
  var tNorm = textoBruto.replace(/\s+/g, " ");
  var mNombre = textoBruto.match(/Nombre:\s*([^\n\r]+)/i);
  var mExp = textoBruto.match(/Expediente:\s*([^\n\r]+)/i);
  var mSexo = textoBruto.match(/Sexo:\s*([^\n\r]+)/i);
  var mEdad = textoBruto.match(/Edad:\s*([^\n\r]+)/i);
  var fechaDm = extractLabReportFechaDMY(textoBruto);
  var horaLab = extractLabReportHora(textoBruto);
  var expRaw = mExp ? mExp[1].split(/\s+(?:Solicitud|Medico|Médico|Fecha|Sexo|Edad|Ubicaci)/i)[0].trim() : "";
  var edadRaw = mEdad ? (mEdad[1].match(/^\d+/) || [""])[0] : "";
  var edadUnidad = mEdad ? (mEdad[1].match(/\b(años|meses|dias|días|semanas)\b/i) || ["a\xF1os"])[0].toLowerCase() : "a\xF1os";
  if (edadUnidad === "dias" || edadUnidad === "d\xEDas") edadUnidad = "d\xEDas";
  var sexoRaw = "";
  if (mSexo) {
    var sm = mSexo[1].match(/^(MASCULINO|FEMENINO|HOMBRE|MUJER|MALE|FEMALE|M\b|F\b)/i);
    if (sm) {
      var sv = sm[1].toUpperCase();
      sexoRaw = sv === "MASCULINO" || sv === "HOMBRE" || sv === "MALE" || sv === "M" ? "M" : "F";
    }
  }
  var mUbic = textoBruto.match(/Ubicaci[oó]n:\s*([^\n\r]+)/i);
  var ubicacion = "";
  if (mUbic) {
    var uRaw = mUbic[1].trim();
    var uTok = uRaw.split(/\t+/).map(function(x) {
      return x.trim();
    }).filter(Boolean);
    ubicacion = (uTok[0] || uRaw.split(/\s+(?:Medico|Médico|Edad)\s*:/i)[0] || uRaw).trim();
  }
  var patient = { name: mNombre ? mNombre[1].split(/Fecha|Sexo|Edad/i)[0].trim() : "", expediente: expRaw, sexo: sexoRaw, edad: edadRaw ? edadRaw + " " + edadUnidad : "", fecha: fechaDm, hora: horaLab, ubicacion };
  var mGaso = tNorm.match(/GASOMETRIA.*?(?=BIOMETRIA|CITOLOGIA|QUIMICA|ELECTROLITOS|PFH|COAGULACION|CITOQUIMICO|$)/i);
  var bloqueGaso = mGaso ? mGaso[0] : "";
  var mLCR = textoBruto.match(/CITOQUIMICO\s+DE\s+LCR.*?(?=BACTERIOLOGIA|CUADERNILLO|$)/i) || textoBruto.match(/CITOQUIMICO\s+LIQ\.?\s+LCR.*?(?=BACTERIOLOGIA|CUADERNILLO|$)/i) || textoBruto.match(/CITOQUIMICO\s+LCR.*?(?=BACTERIOLOGIA|CUADERNILLO|$)/i);
  var bloqueLCR = mLCR ? mLCR[0] : "";
  var bloqueCitoLC = bloqueCitoquimicoLiquidosFull(textoBruto);
  var mEGO = tNorm.match(/(?:URIANALISIS|EXAMEN GENERAL DE ORINA|ANALISIS DE ORINA).*?(?=BACTERIOLOGIA|CULTIVO|COMENTARIO DE MUESTRA|$)/i);
  var bloqueEGO = mEGO ? mEGO[0] : "";
  var tSinLiqCorp = tNorm;
  if (bloqueCitoLC) tSinLiqCorp = tNorm.replace(bloqueCitoLC.replace(/\r/g, "").replace(/\s+/g, " "), " ");
  var textoQS = tSinLiqCorp.replace(bloqueGaso, " ").replace(bloqueEGO, " ").replace(bloqueLCR ? bloqueLCR.replace(/\s+/g, " ") : "", " ");
  var textoParaBh = tSinLiqCorp;
  if (bloqueEGO) textoParaBh = textoParaBh.replace(bloqueEGO, " ");
  var esSoloGaso = /GASOMETRIA/i.test(tNorm) && !/BIOMETRIA|QUIMICA|ELECTROLITOS|PFH|COAGULACION|CULTIVO/i.test(tNorm);
  var resLabs = [];
  var bhExtras = {};
  if (!esSoloGaso) {
    var bhRes = parseBH_(textoParaBh);
    if (bhRes && bhRes.visible) resLabs.push(bhRes.visible);
    if (bhRes && bhRes.extras) bhExtras = bhRes.extras;
    var qs = parseQS_(textoQS, {
      edad: edadRaw,
      edadUnidad,
      sexo: sexoRaw
    });
    if (qs) resLabs.push(qs);
    var esc2 = parseESC_(textoQS);
    if (esc2) resLabs.push(esc2);
    var pfh = parsePFH_(textoParaBh);
    if (pfh) resLabs.push(pfh);
    var pltCit = parsePlaquetasCitrato_(textoBruto, tNorm);
    if (pltCit) resLabs.push(pltCit);
  }
  var gaso = parseGaso_(bloqueGaso, textoQS);
  if (gaso) resLabs.push(gaso);
  var gasoInterp = isAbgAnalysisHidden() ? "" : buildGasoInterpretacion_(bloqueGaso, textoQS);
  if (gasoInterp) resLabs.push(gasoInterp);
  var pie = parsePIE_(tNorm);
  if (pie) resLabs.push(pie);
  var lcr = parsearLCR(textoBruto);
  if (lcr) resLabs.push(lcr);
  var liq = parsearCitoquimicoLiquidos(textoBruto);
  if (liq) resLabs.push(liq);
  var ascitisInterp = formatAscitisInterpretacionLine_(buildAscitisLabAlerts_(textoBruto));
  if (ascitisInterp) resLabs.push(ascitisInterp);
  var hec = parseFisicoquimicoHeces_(textoBruto);
  if (hec) resLabs.push(hec);
  var fro = parseFrotisSangre_(textoBruto);
  if (fro) fro.split("\n").forEach(function(line) {
    if (line) resLabs.push(line);
  });
  var ego = parseEGO_(textoBruto);
  if (ego) resLabs.push(ego);
  var cuant = parseCuantOrina_(textoBruto);
  if (cuant) resLabs.push(cuant);
  var cult = parseCultivo_(textoBruto, tNorm);
  if (cult) resLabs.push(cult);
  resLabs = dedupeSingletonSections_(resLabs);
  var refsBySection = buildRefsBySectionFromReport(textoBruto);
  return { patient, resLabs, bhExtras, refsBySection };
}
function escTxt(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function renderToken(tok) {
  if (!tok) return tok;
  if (tok.endsWith("*")) {
    var inner = escTxt(tok.slice(0, -1));
    return '<strong class="lab-value-altered" title="Fuera de rango de referencia">' + inner + '</strong><span class="lab-value-star" aria-hidden="true">*</span>';
  }
  return escTxt(tok);
}
function renderEntry(text) {
  text = normalizeGasometryInterpretationLine_(text);
  return text.split("\n").map(function(line, li) {
    var tabIdx = line.indexOf("	");
    if (tabIdx >= 0) {
      var label = line.substring(0, tabIdx);
      var rest = line.substring(tabIdx + 1);
      var lh = li === 0 ? '<span class="section-lbl">' + escTxt(label) + "</span>" : escTxt(label);
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

// public/js/features/diagrams-parse.mjs
function parsearSecciones(resLabs) {
  var secs = {};
  resLabs.forEach(function(linea) {
    var primera = linea.split("\n")[0].trim().replace("	", " ");
    var tokens = primera.split(" ");
    var key = tokens[0].replace(":", "");
    var vals = {};
    var i = 1;
    while (i < tokens.length) {
      var tok = tokens[i];
      if (!tok || tok === "-") {
        i++;
        continue;
      }
      var next = tokens[i + 1];
      if (next !== void 0 && !isNaN(parseFloat(next.replace("*", "")))) {
        vals[tok] = { val: next.replace("*", ""), ab: next.endsWith("*") };
        i += 2;
      } else {
        i++;
      }
    }
    secs[key] = vals;
  });
  return secs;
}
function g(secs, sec, key) {
  var s = secs[sec];
  if (!s) return null;
  var v = s[key];
  if (!v || v.val === "---") return null;
  return v;
}
function extractParsedValues(resLabs) {
  var secs = parsearSecciones(resLabs);
  function num(sec, key) {
    var v = g(secs, sec, key);
    return v ? parseFloat(v.val) : null;
  }
  return {
    Hb: num("BH", "Hb"),
    Hto: num("BH", "Hto"),
    Leu: num("BH", "Leu"),
    Plt: num("BH", "Plt"),
    Glu: num("QS", "Glu"),
    Cr: num("QS", "Cr"),
    eTFG: num("QS", "eTFG"),
    BUN: num("QS", "BUN"),
    PCR: num("QS", "PCR"),
    AU: num("QS", "AU"),
    TGL: num("QS", "TGL"),
    COL: num("QS", "COL"),
    Na: num("ESC", "Na"),
    K: num("ESC", "K"),
    Cl: num("ESC", "Cl"),
    HCO3: num("ESC", "HCO3"),
    Ca: num("ESC", "Ca"),
    AST: num("PFHs", "AST"),
    ALT: num("PFHs", "ALT"),
    FA: num("PFHs", "FA"),
    BT: num("PFHs", "BT")
  };
}
function buildParsedBySectionFromResLabs(resLabs, bhExtras) {
  var secs = parsearSecciones(resLabs || []);
  var out = {};
  Object.keys(secs).forEach(function(sec) {
    if (!tendEligibleSectionKey(sec)) return;
    var row = {};
    var tbl = secs[sec];
    Object.keys(tbl).forEach(function(k) {
      var cell = tbl[k];
      if (!cell || cell.val == null || cell.val === "---") return;
      var n = parseFloat(String(cell.val).replace(/\*/g, "").replace(",", "."));
      if (!isFinite(n)) return;
      row[k] = n;
    });
    if (Object.keys(row).length) out[sec] = row;
  });
  (resLabs || []).forEach(function(entry) {
    if (!entry || !/^BH/i.test(String(entry).split("\n")[0].trim())) return;
    var bhCells = parseBhTrendValuesFromResLab(entry);
    Object.keys(bhCells).forEach(function(k) {
      var cell = bhCells[k];
      if (!cell || cell.val == null || cell.val === "---") return;
      var n = parseFloat(String(cell.val).replace(/\*/g, "").replace(",", "."));
      if (!isFinite(n)) return;
      if (!out.BH) out.BH = {};
      if (out.BH[k] == null) out.BH[k] = n;
    });
  });
  if (bhExtras && typeof bhExtras === "object") {
    if (!out.BH) out.BH = {};
    Object.keys(bhExtras).forEach(function(k) {
      var n = parseFloat(String(bhExtras[k]).replace(/\*/g, "").replace(",", "."));
      if (isFinite(n) && out.BH[k] == null) out.BH[k] = n;
    });
  }
  return out;
}

// public/js/tour-demo-some-lab.mjs
var DEMO_SOME_LAB_REPORT = "Expediente:	0008421-7	Solicitud:	2605110244\nNombre:	DEMO P\xC9REZ JUAN	Fecha Registro:	Apr 11 2026 9:42AM\nSexo:	MASCULINO	Ubicaci\xF3n:	SERVICIO DEMO\nEdad:	67	Medico:	SERVICIO DEMO\n\nHEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\nEstudio		Resultado	Unidades	Valor de Referencia\nRBC		4.71	M/uL	4.04 - 6.13\nHGB		*	11.85	g/dL	12.20 - 18.10\nHCT		*	38.4	%	37.7 - 53.7\nMCV		*	82	fL	80 - 97\nMCH		B	26.1	pg	27.0 - 31.2\nMCHC		*	32.0	g/dL	29.9 - 34.2\nRDW		*	13.2	%	11.6 - 14.8\nWBC		*	6.12	K/uL	4.00 - 11.00\nNEU		*	3.88	K/uL	2.00 - 6.90\nNEU%		*	63.4	%	37.0 - 80.0\nLYM		*	1.05	K/uL	0.60 - 3.40\nLYM%		*	17.2	%	10.0 - 50.0\nMONO		*	0.71	K/uL	0.000 - 0.900\nMONO%		*	11.6	%	0.00 - 12.00\nEOS		*	0.11	K/uL	0.000 - 0.700\nEOS%		*	1.8	%	0.00 - 7.00\nBASO		*	0.12	K/uL	0.000 - 0.200\nBASO%		*	2.0	%	0.00 - 2.50\nPLT		*	248	K/uL	142.00 - 424.00\nMPV		B	7.2	fL	7.4 - 10.4\n\nQUIMICA CLINICA\nCOMENTARIO DE MUESTRA\nEstudio		Resultado	Unidades	Valor de Referencia\nCOMENTARIO DE LA MUESTRA		*	\nGLUCOSA EN SANGRE\nEstudio		Resultado	Unidades	Valor de Referencia\nGLUCOSA EN SANGRE		*	94	mg/dL	60 - 100\nNITROGENO DE LA UREA EN SANGRE\nEstudio		Resultado	Unidades	Valor de Referencia\nNITROGENO DE LA UREA EN SANGRE		A	22	mg/dL	7 - 20\nCREATININA EN SANGRE\nEstudio		Resultado	Unidades	Valor de Referencia\nCREATININA EN SANGRE		A	1.35	mg/dL	0.6 - 1.4\nACIDO URICO EN SANGRE\nEstudio		Resultado	Unidades	Valor de Referencia\nACIDO URICO EN SANGRE		A	7.4	mg/dL	4.8 - 8.7\nPROTEINAS TOTALES\nEstudio		Resultado	Unidades	Valor de Referencia\nPROTEINAS TOTALES		A	7.6	g/dL	6.1 - 7.9\nALBUMINA\nEstudio		Resultado	Unidades	Valor de Referencia\nALBUMINA		*	4.1	g/dL	3.2 - 5.5\nGLOBULINA SERICA\nEstudio		Resultado	Unidades	Valor de Referencia\nGLOBULINA SERICA		*	3.5	g/dL	\nRELACION A/G\nEstudio		Resultado	Unidades	Valor de Referencia\nRELACION A/G		*	1.17	\nAST(ASPARTATO AMINOTRANSFERASA)\nEstudio		Resultado	Unidades	Valor de Referencia\nAST(ASPARTATO AMINOTRANSFERASA)		*	19	UI/L	10 - 42\nALT ALANIN AMINO TRANSFERASA\nEstudio		Resultado	Unidades	Valor de Referencia\nALT ALANIN AMINO TRANSFERASA		*	14	UI/L	10 - 42\nALP FOSFATASA ALCALINA\nEstudio		Resultado	Unidades	Valor de Referencia\nALP FOSFATASA ALCALINA		A	118	UI/L	38 - 126\nBILIRRUBINA\nEstudio		Resultado	Unidades	Valor de Referencia\nBILIRRUBINA TOTAL		A	1.2	mg/dL	0.2 - 1.0\nBILIRRUBINA DIRECTA		A	0.5	mg/dL	0.0 - 0.2\nBILIRRUBINA INDIRECTA		A	0.7	mg/dL	0.2 - 0.8\nLDH DESHIDROGENASA LACTICA\nEstudio		Resultado	Unidades	Valor de Referencia\nLDH DESHIDROGENASA LACTICA		*	142	UI/L	91 - 180\nAMILASA SERICA\nEstudio		Resultado	Unidades	Valor de Referencia\nAMILASA		*	68	U/L	28 - 100\nCOLESTEROL\nEstudio		Resultado	Unidades	Valor de Referencia\nCOLESTEROL		B	142	mg/dL	130 - 200\nTRIGLICERIDOS\nEstudio		Resultado	Unidades	Valor de Referencia\nTRIGLICERIDOS		*	118	mg/dL	35 - 150\nCLORO\nEstudio		Resultado	Unidades	Valor de Referencia\nCLORO		*	102	mmol/L	101.0 - 110.0\nSODIO\nEstudio		Resultado	Unidades	Valor de Referencia\nSODIO		*	138	mmol/L	135.0 - 145.0\nPOTASIO\nEstudio		Resultado	Unidades	Valor de Referencia\nPOTASIO		*	3.9	mmol/L	3.6 - 5.0\nCALCIO\nEstudio		Resultado	Unidades	Valor de Referencia\nCALCIO EN SUERO		*	8.8	mg/dL	8.4 - 10.2\nFOSFORO EN SANGRE\nEstudio		Resultado	Unidades	Valor de Referencia\nFOSFORO		*	3.8	mg/dL	2.5 - 4.6\n";
var OLDER_DEMO_SOME_LAB_REPORT = "Expediente:	0008421-7	Solicitud:	2603050188\nNombre:	DEMO P\xC9REZ JUAN	Fecha Registro:	Mar 05 2026 7:18AM\nSexo:	MASCULINO	Ubicaci\xF3n:	SERVICIO DEMO\nEdad:	67	Medico:	SERVICIO DEMO\n\nHEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\nEstudio		Resultado	Unidades	Valor de Referencia\nRBC		4.55	M/uL	4.04 - 6.13\nHGB		*	10.20	g/dL	12.20 - 18.10\nHCT		*	35.8	%	37.7 - 53.7\nMCV		*	81	fL	80 - 97\nWBC		*	5.40	K/uL	4.00 - 11.00\nPLT		*	198	K/uL	142.00 - 424.00\n\nQUIMICA CLINICA\nGLUCOSA EN SANGRE\nEstudio		Resultado	Unidades	Valor de Referencia\nGLUCOSA EN SANGRE		*	108	mg/dL	60 - 100\nNITROGENO DE LA UREA EN SANGRE\nEstudio		Resultado	Unidades	Valor de Referencia\nNITROGENO DE LA UREA EN SANGRE		A	28	mg/dL	7 - 20\nCREATININA EN SANGRE\nEstudio		Resultado	Unidades	Valor de Referencia\nCREATININA EN SANGRE		A	1.55	mg/dL	0.6 - 1.4\nCOLESTEROL\nEstudio		Resultado	Unidades	Valor de Referencia\nCOLESTEROL		B	155	mg/dL	130 - 200\nTRIGLICERIDOS\nEstudio		Resultado	Unidades	Valor de Referencia\nTRIGLICERIDOS		*	132	mg/dL	35 - 150\nSODIO\nEstudio		Resultado	Unidades	Valor de Referencia\nSODIO		B	134	mmol/L	135.0 - 145.0\nPOTASIO\nEstudio		Resultado	Unidades	Valor de Referencia\nPOTASIO		*	3.5	mmol/L	3.6 - 5.0\n";
var DEMO_GARCIA_LAB_REPORT = "Expediente:	0007755-3	Solicitud:	2605110312\nNombre:	DEMO GARC\xCDA ANA	Fecha Registro:	Apr 11 2026 11:05AM\nSexo:	FEMENINO	Ubicaci\xF3n:	SERVICIO DEMO\nEdad:	54	Medico:	SERVICIO DEMO\n\nHEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\nEstudio		Resultado	Unidades	Valor de Referencia\nHGB		*	10.40	g/dL	12.20 - 18.10\nHCT		*	33.1	%	37.7 - 53.7\nWBC		*	8.20	K/uL	4.00 - 11.00\nPLT		*	210	K/uL	142.00 - 424.00\nQUIMICA SANGUINEA\nGLUCOSA\nEstudio		Resultado	Unidades	Valor de Referencia\nGLUCOSA		*	142	mg/dL	70 - 110\nCREATININA EN SANGRE\nEstudio		Resultado	Unidades	Valor de Referencia\nCREATININA EN SANGRE		A	0.92	mg/dL	0.6 - 1.4\n";
var DEMO_TOUR_LAB_PASTE = DEMO_SOME_LAB_REPORT + "\n\n" + OLDER_DEMO_SOME_LAB_REPORT;

// public/js/tour-pitch-cultivos-some.mjs
var PITCH_HEADER = "Expediente:	0008421-7	Solicitud:	2605000001\nNombre:	DEMO P\xC9REZ JUAN	Fecha Registro:	11/04/2026 08:00:00 a. m.\nSexo:	MASCULINO	Ubicaci\xF3n:	SERVICIO DEMO\nEdad:	67	Medico:	SERVICIO DEMO\n";
function hdr(fecha, solicitud) {
  return "Expediente:	0008421-7	Solicitud:	" + solicitud + "\nNombre:	DEMO P\xC9REZ JUAN	Fecha Registro:	" + fecha + "\nSexo:	MASCULINO	Ubicaci\xF3n:	SERVICIO DEMO\nEdad:	67	Medico:	SERVICIO DEMO\n";
}
var PITCH_CULTIVO_PERITONEAL_SOME = hdr("07/05/2026 02:04:18 p. m.", "2605071010") + "\nBACTERIOLOGIA\nLIQUIDO PERITONEAL\nPRODUCTO\n*\nEN FRASCO DE HEMOCULTIVO ANAEROBIO\nMICROORGANISMO\n*\nPseudomonas aeruginosa\nCUENTA\n*\n120,000 UFC/mL\nANTIBIOGRAMA\n*\nCEFTAZIDIMA\n>16	R\nCIPROFLOXACINA\n<=1	S\nCEFEPIMA\n>16	R\nIMIPENEM\n2	S\nLEVOFLOXACINA\n<=2	S\nMEROPENEM\n<=1	S\nPIP/TAZO\n>64	R\nTOBRAMICINA\n<=4	S\n";
var PITCH_CULTIVO_URO_SOME = hdr("05/05/2026 06:16:18 p. m.", "2605050805") + "\nBACTERIOLOGIA\nUROCULTIVO POR SONDA\nPRODUCTO\n*\nMICROORGANISMO\n*\nPseudomonas aeruginosa\nCOMENTARIO:\n*\nSE DETECTO CARBAPENEMASA. (METODO DE INACTIVACION DE DISCO)\nCUENTA DE KASS\n*\n50,000 UFC/mL\nANTIBIOGRAMA\n*\nAMIKACINA\n>32	R\nAZTREONAM\n>16	R\nCEFTAZIDIMA\n>16	R\nCIPROFLOXACINA\n>2	R\nCEFEPIMA\n>16	R\nCEFTAZIDIMA/AVIBACTAM\n>16	R\nIMIPENEM\n>4	R\nLEVOFLOXACINA\n>4	R\nMEROPENEM\n>8	R\nPIP/TAZO\n<=16	S\nTOBRAMICINA\n>8	R\n";
var PITCH_CULTIVO_ASPIRADO_1805_SOME = hdr("18/05/2026 04:58:48 p. m.", "2605181061") + "\nBACTERIOLOGIA\nASPIRADO TRAQUEAL\nPRODUCTO\n*\nTINCION DE GRAM\n*\nABUNDANTES COCOBACILOS GRAM NEGATIVO\nMICROORGANISMO\n*\nEscherichia coli\nCOMENTARIO:\n*\nAISLAMIENTO PRODUCTOR DE BETALACTAMASAS (BLEE)\nCUENTA\n*\n50,000 UFC/mL\nANTIBIOGRAMA\n*\nAMP/SULBACTAM\n>16/8	R\nAMIKACINA\n<=16	S\nAMPICILINA\n>16	R\nAZTREONAM\n>16	ESBL\nCEFTRIAXONA\n>32	ESBL\nCEFTAZIDIMA\n>16	ESBL\nCEFOTAXIMA\n>16	ESBL\nCEFOXITINA\n16	I\nCIPROFLOXACINA\n>2	R\nCEFEPIMA\n>16	R\nCEFTAZIDIMA/AVIBACTAM\n16	R\nERTAPENEM\n<=0.5	S\nGENTAMICINA\n>8	R\nIMIPENEM\n<=1	S\nLEVOFLOXACINA\n>4	R\nMEROPENEM\n<=1	S\nPIP/TAZO\n>64	R\nTRIMET/SULFA\n>2/38	R\nTETRACICLINA\n>8	R\nTOBRAMICINA\n>8	R\nMICROORGANISMO\n*\nAcinetobacter baumannii complex\nCUENTA\n*\n80,000 UFC/mL\nANTIBIOGRAMA\n*\nCOLISTINA\n<=2	I\nAMP/SULBACTAM\n>16/8	R\nAMIKACINA\n>32	R\nCEFTRIAXONA\n>32	R\nCEFTAZIDIMA\n>16	R\nCIPROFLOXACINA\n>2	R\nCEFEPIMA\n16	I\nGENTAMICINA\n>8	R\nIMIPENEM\n>4	R\nMEROPENEM\n>8	R\nTRIMET/SULFA\n>2/38	R\nTOBRAMICINA\n>8	R\n";
var PITCH_CULTIVO_ASPIRADO_2804_SOME = hdr("28/04/2026 01:45:42 p. m.", "2604280886") + "\nBACTERIOLOGIA\nASPIRADO TRAQUEAL\nPRODUCTO\n*\nMICROORGANISMO\n*\nEscherichia coli\nCOMENTARIO:\n*\nAISLAMIENTO PRODUCTOR DE BETALACTAMASAS (BLEE)\nCUENTA\n*\n100,000 UFC/mL\nANTIBIOGRAMA\n*\nAMP/SULBACTAM\n>16/8	R\nAMIKACINA\n<=16	S\nAMPICILINA\n>16	R\nCEFTRIAXONA\n>32	ESBL\nCEFOTAXIMA\n>16	ESBL\nCEFOXITINA\n<=8	S\nCIPROFLOXACINA\n>2	R\nCEFEPIMA\n>16	R\nCEFTAZIDIMA/AVIBACTAM\n<=8	S\nERTAPENEM\n<=0.5	S\nGENTAMICINA\n>8	R\nIMIPENEM\n<=1	S\nLEVOFLOXACINA\n>4	R\nMEROPENEM\n<=1	S\nPIP/TAZO\n64	I\nTRIMET/SULFA\n>2/38	R\nTETRACICLINA\n>8	R\nTOBRAMICINA\n>8	R\nMICROORGANISMO\n*\nStaphylococcus aureus\nCUENTA\n*\n20,000 UFC/mL\nANTIBIOGRAMA\n*\nCLINDAMICINA\n0.5	S\nSCREENING DE CEFOXITINA\n<=4	NEG\nERITROMICINA\n>4	R\nINDUCCION CLINDAMICINA\n<=4/0.5	NEG\nLINEZOLID\n<=2	S\nOXACILINA\n1	S\nPENICILINA\n>8	BLAC\nRIFAMPICINA\n<=1	S\nTRIMET/SULFA\n<=0.5/9.5	S\nTETRACICLINA\n>8	R\nVANCOMICINA\n1	S\nMICROORGANISMO\n*\nProteus mirabilis\nCOMENTARIO:\n*\nAISLAMIENTO PRODUCTOR DE BETALACTAMASAS (BLEE)\nCUENTA\n*\n100 UFC/mL\nANTIBIOGRAMA\n*\nAMP/SULBACTAM\n>16/8	R\nAMIKACINA\n<=16	S\nAMPICILINA\n>16	R\nCEFTRIAXONA\n>32	R\nCEFOTAXIMA\n>16	ESBL\nCEFOXITINA\n<=8	S\nCIPROFLOXACINA\n>2	R\nCEFEPIMA\n>16	R\nCEFTAZIDIMA/AVIBACTAM\n<=8	S\nERTAPENEM\n<=0.5	S\nGENTAMICINA\n<=4	S\nLEVOFLOXACINA\n>4	R\nMEROPENEM\n<=1	S\nPIP/TAZO\n<=16	S\nTRIMET/SULFA\n>2/38	R\nTETRACICLINA\n>8	R\nTOBRAMICINA\n>8	R\n";
var PITCH_CULTIVO_HEMO_SOME = PITCH_HEADER + "\nBACTERIOLOGIA\nHEMOCULTIVO\nPRODUCTO\n*\nPERIFERICO IZQUIERDO\nMICROORGANISMO\n*\nPseudomonas aeruginosa\nCOMENTARIO:\n*\nAISLAMIENTO PRODUCTOR DE BETALACTAMASAS (BLEE)\nCUENTA\n*\n2 colonias\nANTIBIOGRAMA\n*\nCEFTAZIDIMA\n>16	R\nCEFEPIMA\n16	I\nCIPROFLOXACINA\n<=1	S\nMEROPENEM\n<=1	S\nPIP/TAZO\n64	S\n";
var PITCH_CULTIVO_LAB_SPECS = [
  { id: "pitch-lab-cult-at-1805", fecha: "18/05/2026", report: PITCH_CULTIVO_ASPIRADO_1805_SOME },
  { id: "pitch-lab-cult-peritonitis", fecha: "07/05/2026", report: PITCH_CULTIVO_PERITONEAL_SOME },
  { id: "pitch-lab-cult-uro", fecha: "05/05/2026", report: PITCH_CULTIVO_URO_SOME },
  { id: "pitch-lab-cult-at-2804", fecha: "28/04/2026", report: PITCH_CULTIVO_ASPIRADO_2804_SOME },
  { id: "pitch-lab-cult-hemo", fecha: "11/04/2026", report: PITCH_CULTIVO_HEMO_SOME }
];

// public/js/listado-problemas-core.mjs
var SECCIONES = ["activos", "inactivos"];
function nuevoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function emptyListado(fecha, hora) {
  return {
    fecha: String(fecha || ""),
    hora: String(hora || ""),
    activos: [],
    inactivos: []
  };
}
function ensureSeccion(seccion) {
  if (!SECCIONES.includes(seccion)) {
    throw new Error("secci\xF3n inv\xE1lida: " + seccion);
  }
}
function addProblema(listado, seccion, datos) {
  ensureSeccion(seccion);
  const item = {
    id: nuevoId(),
    fecha: String(datos && datos.fecha || ""),
    descripcion: String(datos && datos.descripcion || "")
  };
  return Object.assign({}, listado, {
    [seccion]: (listado[seccion] || []).concat([item])
  });
}
function removeProblema(listado, seccion, id) {
  ensureSeccion(seccion);
  const arr = listado[seccion] || [];
  const filtered = arr.filter((p) => p.id !== id);
  if (filtered.length === arr.length) return listado;
  return Object.assign({}, listado, { [seccion]: filtered });
}

// public/js/tour-demo-listado-problemas.mjs
var TOUR_DEMO_PERITONITIS_BLOCK = "PERITONITIS ASOCIADA A DI\xC1LISIS PERITONEAL\nA) CL\xCDNICA: SOMNOLENCIA EXCESIVA DESDE 04/05/2026, N\xC1USEA DESDE 06/05/2026, V\xD3MITO (1 EPISODIO 06/05/2026), DOLOR ABDOMINAL LEVE 5/10 DESDE 06/05/2026, L\xCDQUIDO DE DI\xC1LISIS TURBIO CON FIBRINA DESDE 05/05/2026\nB) EXPLORACI\xD3N F\xCDSICA: ABDOMEN DISTENDIDO, DOLOR A LA PALPACI\xD3N SUPERFICIAL Y PROFUNDA DIFUSO CON PREDOMINIO EN HIPOGASTRIO Y FOSA IL\xCDACA DERECHA, SIGNO DE BLUMBERG POSITIVO, SITIO DE INSERCI\xD3N DE CAT\xC9TER SIN DATOS DE INFECCI\xD3N LOCAL\nC) PARACL\xCDNICA: L\xCDQUIDO PERITONEAL CON 4650 C\xC9LULAS, 94% POLIMORFONUCLEARES, GLUCOSA 300 MG/DL, LEUCOCITOSIS 18,000/UL, PCR 21 MG/L ELEVADA, CULTIVO PENDIENTE";
function buildTourDemoListadoProblemas(fecha, hora) {
  var l = emptyListado(fecha, hora);
  l = addProblema(l, "activos", {
    fecha: "06/05/2026",
    descripcion: TOUR_DEMO_PERITONITIS_BLOCK
  });
  l = addProblema(l, "activos", {
    fecha: "15/01/2024",
    descripcion: "DIABETES MELLITUS TIPO 2\nA) CL\xCDNICA: POLIURIA Y POLIDIPSIA DE 2 SEMANAS, GLUCOMETR\xCDAS CAPILARES 180\u2013220 MG/DL\nB) EXPLORACI\xD3N F\xCDSICA: PACIENTE ALERTA, MUCOSAS H\xDAMEDAS\nC) PARACL\xCDNICA: HBA1C 8.2%, GLUCOSA EN AYUNO 198 MG/DL"
  });
  l = addProblema(l, "inactivos", {
    fecha: "08/02/2026",
    descripcion: "NEUMON\xCDA ADQUIRIDA EN LA COMUNIDAD (RESUELTA)\nA) CUADRO FEBRIL Y TOS PRODUCTIVA HOSPITALIZADO EN FEBRERO/2026, ALTA CON MEJOR\xCDA CL\xCDNICA"
  });
  return l;
}

// public/js/receta-hu-core.mjs
var DEFAULT_RECETA_HU_CONSULT_SERVICES = [
  "Nefrolog\xEDa",
  "Oncolog\xEDa",
  "Cardiolog\xEDa",
  "Endocrinolog\xEDa",
  "Gastroenterolog\xEDa",
  "Neurolog\xEDa"
];
function normalizeRecetaHuConsultServices(list) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  const src = Array.isArray(list) && list.length ? list : DEFAULT_RECETA_HU_CONSULT_SERVICES;
  for (const item of src) {
    const s = String(item || "").trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out.length ? out : DEFAULT_RECETA_HU_CONSULT_SERVICES.slice();
}
function normalizeRecetaHuProximaCitaRow(row) {
  const src = row && typeof row === "object" ? row : {};
  const plazo = String(src.plazo != null ? src.plazo : "2 semanas").trim() || "2 semanas";
  const servicio = String(src.servicio != null ? src.servicio : "").trim();
  let texto = String(src.texto != null ? src.texto : "").trim();
  if (!texto && servicio) texto = buildProximaCitaText(plazo, servicio);
  return {
    plazo,
    servicio,
    texto,
    fecha: String(src.fecha != null ? src.fecha : "").trim()
  };
}
function migrateLegacyProximaCitas(src) {
  if (Array.isArray(src.proximasCitas) && src.proximasCitas.length) {
    return src.proximasCitas.map(normalizeRecetaHuProximaCitaRow).filter(function(row) {
      return row.texto || row.servicio || row.fecha;
    });
  }
  const legacyText = String(src.proximaCita != null ? src.proximaCita : "").trim();
  const legacyFecha = String(src.proximaCitaFecha != null ? src.proximaCitaFecha : "").trim();
  if (!legacyText && !legacyFecha) return [];
  return [
    normalizeRecetaHuProximaCitaRow({
      plazo: src.proximaPlazo,
      servicio: "",
      texto: legacyText,
      fecha: legacyFecha
    })
  ];
}
function formatProximasCitasForPdf(rows) {
  const items = (Array.isArray(rows) ? rows : []).map(normalizeRecetaHuProximaCitaRow).filter(function(row) {
    return row.texto || row.servicio || row.fecha;
  });
  const textLines = items.map(function(row) {
    return row.texto || buildProximaCitaText(row.plazo, row.servicio);
  }).filter(Boolean);
  const fechaLines = items.map(function(row) {
    return row.fecha;
  }).filter(Boolean);
  return {
    proximaCita: textLines.join("\n"),
    proximaCitaFecha: fechaLines.join("\n")
  };
}
function normalizeRecetaHuDraft(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const meds = Array.isArray(src.meds) ? src.meds : [];
  const labs = Array.isArray(src.labs) ? src.labs : [];
  return {
    fecha: String(src.fecha != null ? src.fecha : ""),
    meds: meds.map(function(row) {
      return {
        medicamento: String(row && row.medicamento != null ? row.medicamento : ""),
        presentacion: String(row && row.presentacion != null ? row.presentacion : ""),
        dosis: String(row && row.dosis != null ? row.dosis : "")
      };
    }).filter(function(row) {
      return row.medicamento.trim() || row.presentacion.trim() || row.dosis.trim();
    }),
    labs: labs.map(function(x) {
      return String(x || "");
    }),
    cuidados: String(src.cuidados != null ? src.cuidados : ""),
    proximasCitas: migrateLegacyProximaCitas(src),
    proximaPlazo: String(src.proximaPlazo != null ? src.proximaPlazo : "2 semanas")
  };
}
function formatRecetaHuFecha(d) {
  const dt = d instanceof Date ? d : /* @__PURE__ */ new Date();
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
function buildProximaCitaText(plazo, servicio) {
  const p = String(plazo || "").trim() || "2 semanas";
  const s = String(servicio || "").trim();
  if (!s) return "";
  return "Acudir en " + p + " a consulta de " + s;
}
function buildRecetaHuGeneratePayload(args) {
  const patient = args && args.patient || {};
  const draft = normalizeRecetaHuDraft(args && args.draft);
  const fecha = draft.fecha || formatRecetaHuFecha(/* @__PURE__ */ new Date());
  const proximaPdf = formatProximasCitasForPdf(draft.proximasCitas);
  return {
    patient: {
      nombre: String(patient.nombre || ""),
      registro: String(patient.registro || ""),
      servicio: String(patient.servicio || "")
    },
    fecha,
    meds: draft.meds.filter(function(row) {
      return row.medicamento.trim() || row.presentacion.trim() || row.dosis.trim();
    }),
    labs: draft.labs.map(function(x) {
      return String(x || "").trim();
    }).filter(Boolean),
    cuidados: draft.cuidados,
    proximasCitas: draft.proximasCitas,
    proximaCita: proximaPdf.proximaCita,
    proximaCitaFecha: proximaPdf.proximaCitaFecha,
    doctorName: String(args && args.doctorName ? args.doctorName : ""),
    cedulaProfesional: String(args && args.cedulaProfesional ? args.cedulaProfesional : "")
  };
}

// public/js/lab-history-cache.mjs
var TREND_SPARK_WINDOW = 5;
var TREND_CATALOG_WINDOW = 12;
var TREND_DETAIL_DOWNSAMPLE = 100;
var TREND_REFRESH_DEBOUNCE_MS = 80;
var _revisionByPatient = /* @__PURE__ */ Object.create(null);
var _trendSeriesIndexCache = { key: "", index: null };
function invalidateTrendSeriesIndexCache() {
  _trendSeriesIndexCache.key = "";
  _trendSeriesIndexCache.index = null;
}
function bumpLabHistoryRevision(patientId) {
  if (patientId == null || patientId === "") return;
  var k = String(patientId);
  _revisionByPatient[k] = (_revisionByPatient[k] || 0) + 1;
  invalidateTrendSeriesIndexCache();
}
function getLabHistoryRevision(patientId) {
  if (patientId == null || patientId === "") return 0;
  return _revisionByPatient[String(patientId)] || 0;
}
function getTrendRenderWindow(historyAsc, mode) {
  var hist = historyAsc || [];
  if (mode === "full") return hist.slice();
  var n = mode === "spark" ? TREND_SPARK_WINDOW : TREND_CATALOG_WINDOW;
  if (hist.length <= n) return hist.slice();
  return hist.slice(-n);
}
function trendCatalogSeriesKey(sectionKey, fieldKey) {
  return String(sectionKey) + "|" + String(fieldKey);
}
function buildTrendSeriesIndex(opts) {
  var catalogSpecs = opts.catalogSpecs || [];
  var historyFullDesc = opts.historyFullDesc || [];
  var windowHistoryAsc = opts.windowHistoryAsc || [];
  var tendRefForSeries = opts.tendRefForSeries;
  var windowDesc = windowHistoryAsc.slice().reverse();
  var out = /* @__PURE__ */ Object.create(null);
  for (var i = 0; i < catalogSpecs.length; i += 1) {
    var spec = catalogSpecs[i];
    var sk = spec.sectionKey;
    var fk = spec.fieldKey;
    var key = trendCatalogSeriesKey(sk, fk);
    var rawFull = historyFullDesc.filter(function(s) {
      return getSetTrendValueForSeries(s, sk, fk) != null;
    });
    var setsDescFull = dedupeTrendSetsForSeries(rawFull, sk, fk);
    var rawWindow = windowDesc.filter(function(s) {
      return getSetTrendValueForSeries(s, sk, fk) != null;
    });
    var setsDesc = dedupeTrendSetsForSeries(rawWindow, sk, fk);
    var latestSet = setsDescFull.length ? setsDescFull[0] : null;
    var latest = latestSet ? getSetTrendValueForSeries(latestSet, sk, fk) : null;
    var ref = tendRefForSeries(historyFullDesc, sk, fk, latestSet);
    var isAbnormal = ref && latest != null && (latest < ref[0] || latest > ref[1]);
    out[key] = {
      setsDesc,
      setsDescFull,
      latest,
      ref,
      isAbnormal: !!isAbnormal
    };
  }
  return out;
}
function buildTrendSeriesIndexCached(cacheKey, opts) {
  var key = String(cacheKey || "");
  if (key && _trendSeriesIndexCache.key === key && _trendSeriesIndexCache.index) {
    return _trendSeriesIndexCache.index;
  }
  var index = buildTrendSeriesIndex(opts);
  if (key) {
    _trendSeriesIndexCache.key = key;
    _trendSeriesIndexCache.index = index;
  }
  return index;
}

// public/js/tour-pitch-demo-todos.mjs
var PITCH_DEMO_PATIENT_ID = "demo-pitch";
var TODOS_LS_KEY = "rpc-todos";
function readTodosMap() {
  try {
    const raw = localStorage.getItem(TODOS_LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_e) {
    return {};
  }
}
function writeTodosMap(map) {
  try {
    localStorage.setItem(TODOS_LS_KEY, JSON.stringify(map || {}));
  } catch (_e) {
  }
}
function todoEntry(id, text, priority, completed) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return {
    id,
    text,
    priority,
    completed: !!completed,
    createdAt: now,
    updatedAt: now
  };
}
function buildPitchDemoTodosForPatient(patientId) {
  if (patientId !== PITCH_DEMO_PATIENT_ID) return [];
  return [
    todoEntry("pitch-todo-bh-qs", "BH y QS control ma\xF1ana (peritonitis / IRC)", "alta", false),
    todoEntry(
      "pitch-todo-atb",
      "Ajustar esquema ATB seg\xFAn antibiograma (Pseudomonas / E. coli)",
      "alta",
      false
    ),
    todoEntry(
      "pitch-todo-glu",
      "Repetir glucometr\xEDa si >180 mg/dL en pr\xF3ximo turno",
      "media",
      false
    ),
    todoEntry(
      "pitch-todo-infecto",
      "Interconsulta Infectolog\xEDa \u2014 documentar en nota",
      "media",
      false
    ),
    todoEntry("pitch-todo-io", "Balance h\xEDdrico estricto \u2014 registrar I/O en turno", "baja", false),
    todoEntry("pitch-todo-k-repo", "Reposici\xF3n K vo (valorar con QS)", "media", true)
  ];
}
function seedPitchDemoTodos() {
  const map = readTodosMap();
  map[PITCH_DEMO_PATIENT_ID] = buildPitchDemoTodosForPatient(PITCH_DEMO_PATIENT_ID);
  delete map["demo-pitch-2"];
  writeTodosMap(map);
}
function clearPitchDemoTodos() {
  const map = readTodosMap();
  let changed = false;
  for (const id of [PITCH_DEMO_PATIENT_ID, "demo-pitch-2"]) {
    if (map[id]) {
      delete map[id];
      changed = true;
    }
  }
  if (changed) writeTodosMap(map);
}

// public/js/tour-pitch-demo-seed.mjs
var PITCH_DEMO_PATIENT_ID2 = "demo-pitch";
var PITCH_DEMO_PATIENT_ID_LEGACY = "demo-pitch-2";
var PITCH_SANDBOX_SS_KEY = "rpc-pitch-tour-sandbox-v1";
var PITCH_TOUR_ACTIVE_SS_KEY = "rpc-pitch-tour-active";
var pitchPatientsBackup = null;
function readPitchSandboxBackup() {
  try {
    const raw = sessionStorage.getItem(PITCH_SANDBOX_SS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_e) {
    return null;
  }
}
function writePitchSandboxBackup(data) {
  try {
    sessionStorage.setItem(PITCH_SANDBOX_SS_KEY, JSON.stringify(data));
  } catch (_e) {
  }
}
function clearPitchSandboxBackup() {
  try {
    sessionStorage.removeItem(PITCH_SANDBOX_SS_KEY);
  } catch (_e) {
  }
}
function markPitchTourSessionActive(active) {
  try {
    if (active) sessionStorage.setItem(PITCH_TOUR_ACTIVE_SS_KEY, "1");
    else sessionStorage.removeItem(PITCH_TOUR_ACTIVE_SS_KEY);
  } catch (_e) {
  }
}
function capturePitchSandbox(currentPatients) {
  if (!pitchPatientsBackup) {
    pitchPatientsBackup = currentPatients.slice();
  }
  const existing = readPitchSandboxBackup();
  if (existing && Array.isArray(existing.patients) && existing.patients.length) return;
  writePitchSandboxBackup({
    patients: pitchPatientsBackup,
    scheduledProcedures: storage.getScheduledProcedures().slice(),
    capturedAt: Date.now()
  });
}
function restorePitchPatientsBackup() {
  if (pitchPatientsBackup && pitchPatientsBackup.length) {
    return pitchPatientsBackup.slice();
  }
  const sandbox = readPitchSandboxBackup();
  if (sandbox && Array.isArray(sandbox.patients) && sandbox.patients.length) {
    return sandbox.patients.slice();
  }
  return null;
}
function resolvePitchPersistPatients() {
  if (!pitchPatientIsolation) return void 0;
  const restored = restorePitchPatientsBackup();
  return restored && restored.length ? restored : void 0;
}
function tryRecoverPatientsFromPitchSandboxIfNeeded(state) {
  const { patients: patients2, setPatients: setPatients2, saveState: saveState2 } = state;
  const sandbox = readPitchSandboxBackup();
  if (!sandbox || !Array.isArray(sandbox.patients) || !sandbox.patients.length) return false;
  const onlyDemos = patients2.length > 0 && patients2.every(function(p) {
    return p && isPitchDemoPatientId(p.id);
  });
  const empty = patients2.length === 0;
  if (!onlyDemos && !empty) return false;
  setPatients2(sandbox.patients.slice());
  if (Array.isArray(sandbox.scheduledProcedures)) {
    storage.saveScheduledProcedures(sandbox.scheduledProcedures);
  }
  clearPitchSandboxBackup();
  markPitchTourSessionActive(false);
  setPitchPatientIsolation(false);
  pitchPatientsBackup = null;
  saveState2({ immediate: true });
  return true;
}
var pitchPatientIsolation = false;
function setPitchPatientIsolation(active) {
  pitchPatientIsolation = !!active;
}
function isPitchPatientIsolationActive() {
  return pitchPatientIsolation;
}
function isPitchDemoPatientId(patientId) {
  return patientId === PITCH_DEMO_PATIENT_ID2 || patientId === PITCH_DEMO_PATIENT_ID_LEGACY;
}
function filterPatientsForPitchTour(list) {
  if (!pitchPatientIsolation) return list;
  return (list || []).filter(function(p) {
    return p && p.id === PITCH_DEMO_PATIENT_ID2;
  });
}
function buildPitchLabHistoryEntry(spec) {
  const resLabs = procesarLabs(spec.report).resLabs;
  return {
    id: spec.id,
    fecha: spec.fecha,
    hora: "",
    resLabs,
    parsed: extractParsedValues(resLabs),
    sourceText: spec.report
  };
}
function buildPitchMonitoreoHistorial(ref) {
  const now = ref instanceof Date ? ref : /* @__PURE__ */ new Date();
  const dayMs = 24 * 60 * 60 * 1e3;
  const historial = [];
  function pushEntry(d, payload) {
    historial.push({
      id: "pitch-ea-" + historial.length,
      recordedAt: d.toISOString(),
      vitals: payload.vitals || {},
      glucometrias: payload.glucometrias || [],
      io: payload.io || {}
    });
  }
  function atDayOffset(dayOff, hour, minute, payload) {
    const d = new Date(now.getTime() - dayOff * dayMs);
    d.setHours(hour, minute, 0, 0);
    pushEntry(d, payload);
  }
  const win = getGlucometriaRegistroWindow(now);
  const gluTurns = [
    {
      hoursFromStart: 1,
      minute: 5,
      payload: {
        vitals: { tas: 126, tad: 76, fc: 90, fr: 19, temp: 36.9, sat: 95 },
        glucometrias: [
          { value: 138, time: "09:05" },
          { value: 142, time: "09:12" }
        ],
        io: { ing: 200, egr: 140 }
      }
    },
    {
      hoursFromStart: 4,
      minute: 10,
      payload: {
        vitals: { tas: 120, tad: 70, fc: 86, fr: 18, temp: 36.7, sat: 96 },
        glucometrias: [{ value: 152, time: "12:10" }],
        io: { ing: 240, egr: 170 }
      }
    },
    {
      hoursFromStart: 8,
      minute: 15,
      payload: {
        vitals: { tas: 118, tad: 72, fc: 84, fr: 18, temp: 36.6, sat: 96 },
        glucometrias: [
          { value: 176, time: "16:15" },
          { value: 168, time: "16:22" }
        ],
        io: { ing: 300, egr: 220 }
      }
    },
    {
      hoursFromStart: 12,
      minute: 20,
      payload: {
        vitals: { tas: 116, tad: 74, fc: 84, fr: 17, temp: 36.5, sat: 97 },
        glucometrias: [{ value: 188, time: "20:20" }],
        io: { ing: 120, egr: 100 }
      }
    },
    {
      hoursFromStart: 15,
      minute: 45,
      payload: {
        vitals: { tas: 124, tad: 76, fc: 90, fr: 19, temp: 37, sat: 95 },
        glucometrias: [
          { value: 198, time: "23:45" },
          { value: 192, time: "23:52" }
        ],
        io: { ing: 150, egr: 130 }
      }
    }
  ];
  for (let i = 0; i < gluTurns.length; i++) {
    const turn = gluTurns[i];
    const d = new Date(win.start.getTime() + turn.hoursFromStart * 60 * 60 * 1e3);
    d.setMinutes(turn.minute, 0, 0);
    if (d.getTime() > win.end.getTime()) continue;
    pushEntry(d, turn.payload);
  }
  pushEntry(new Date(win.end.getTime()), {
    vitals: { tas: 118, tad: 72, fc: 88, fr: 18, temp: 36.8, sat: 96 },
    glucometrias: [{ value: 155, time: "00:00" }],
    io: { ing: 180, egr: 120 }
  });
  atDayOffset(0, 10, 0, {
    vitals: { tas: 118, tad: 72, fc: 88, fr: 18, temp: 36.8, sat: 96 },
    io: { ing: 220, egr: 150 }
  });
  atDayOffset(0, 18, 0, {
    vitals: { tas: 120, tad: 70, fc: 84, fr: 17, temp: 36.6, sat: 97 },
    io: { ing: 200, egr: 160 }
  });
  atDayOffset(1, 6, 30, {
    vitals: { tas: 128, tad: 78, fc: 92, fr: 20, temp: 37, sat: 94 },
    io: { ing: 200, egr: 140 }
  });
  atDayOffset(1, 14, 30, {
    vitals: { tas: 120, tad: 70, fc: 86, fr: 18, temp: 36.7, sat: 96 },
    io: { ing: 300, egr: 220 }
  });
  atDayOffset(2, 7, 0, {
    vitals: { tas: 132, tad: 80, fc: 94, fr: 21, temp: 37.2, sat: 93 },
    io: { ing: 190, egr: 130 }
  });
  atDayOffset(2, 11, 0, {
    vitals: { tas: 130, tad: 78, fc: 92, fr: 20, temp: 37, sat: 94 },
    io: { ing: 210, egr: 150 }
  });
  atDayOffset(2, 15, 0, {
    vitals: { tas: 126, tad: 76, fc: 88, fr: 19, temp: 36.9, sat: 95 },
    io: { ing: 250, egr: 180 }
  });
  atDayOffset(2, 19, 0, {
    vitals: { tas: 128, tad: 78, fc: 90, fr: 20, temp: 37, sat: 94 },
    io: { ing: 160, egr: 120 }
  });
  return {
    estadoClinico: {
      four: "4 extremidades",
      esferas: "Sin datos nuevos",
      analgesia: "Paracetamol 1 g IV c/8h",
      abx: "Cefepime 1 g IV c/8h (d\xEDa 2)",
      antihta: "Losart\xE1n 50 mg VO",
      vasop: "No",
      soporte: "O2 nasal 2 L/min",
      tempContext: "Afebril en turno",
      dieta: "Dieta renal",
      kcalKg: "25",
      kcal: "1750",
      pesoRef: "70"
    },
    confirmado: { analgesia: true, abx: true, antihta: false, vasop: false },
    pendienteReceta: {
      four: "",
      esferas: "",
      analgesia: "",
      abx: "",
      antihta: "",
      vasop: "",
      soporte: "",
      tempContext: "",
      dieta: "",
      kcalKg: "",
      kcal: "",
      pesoRef: ""
    },
    historial,
    textoGuardado: {
      text: "Glucometr\xEDas seriadas c/6h: 128\u2013198 mg/dL en 48 h (ver gr\xE1fica y tabla en Estado Actual). Balance h\xEDdrico estricto; correlacionar con QS.",
      savedAt: now.toISOString()
    }
  };
}
function seedPitchDemo(state) {
  const {
    patients: patients2,
    notes: notes2,
    indicaciones: indicaciones2,
    labHistory: labHistory2,
    listadoProblemas: listadoProblemas2,
    medRecetaByPatient: medRecetaByPatient2,
    medNotaSelectionByPatient: medNotaSelectionByPatient2,
    recetaHuByPatient: recetaHuByPatient2,
    setPatients: setPatients2,
    saveState: saveState2,
    selectPatient,
    renderPatientList
  } = state;
  const today = /* @__PURE__ */ new Date();
  const fecha = String(today.getDate()).padStart(2, "0") + "/" + String(today.getMonth() + 1).padStart(2, "0") + "/" + today.getFullYear();
  const hora = String(today.getHours()).padStart(2, "0") + ":" + String(today.getMinutes()).padStart(2, "0");
  const demoPatient = {
    id: PITCH_DEMO_PATIENT_ID2,
    nombre: "DEMO P\xC9REZ",
    registro: "0008421-7",
    edad: "67 a\xF1os",
    sexo: "M",
    area: "SERVICIO DEMO",
    servicio: "SERVICIO DEMO",
    cuarto: "101",
    cama: "1",
    fromLab: false,
    isDemo: true,
    monitoreo: buildPitchMonitoreoHistorial(today)
  };
  notes2[PITCH_DEMO_PATIENT_ID2] = {
    fecha,
    hora,
    interrogatorio: "",
    evolucion: "Paciente masculino de 67 a\xF1os con peritonitis asociada a di\xE1lisis peritoneal en manejo antibi\xF3tico. Hemodin\xE1micamente estable, afebril en el turno. Contin\xFAa monitoreo de glucometr\xEDas y balance h\xEDdrico.",
    estudios: "Cultivos con aislamientos documentados; ver pesta\xF1a Cultivos.",
    diagnosticos: [
      "Peritonitis asociada a di\xE1lisis peritoneal",
      "DM2 descompensada",
      "IRC estadio 3",
      "HAS"
    ],
    tratamiento: ["Cefepime 1 g IV c/8h", "Paracetamol 1 g IV c/8h"],
    ta: "118/72",
    fr: "18",
    fc: "88",
    temp: "36.8",
    peso: "70",
    medico: "Dr. Demo",
    profesor: ""
  };
  indicaciones2[PITCH_DEMO_PATIENT_ID2] = {
    fecha,
    hora,
    medicos: "Dr. Demo \xB7 SERVICIO DEMO",
    dieta: "Dieta renal, restricci\xF3n de K y P",
    cuidados: "Signos vitales c/8h, glucometr\xEDa c/6h, balance h\xEDdrico estricto",
    estudios: "Control de BH y QS ma\xF1ana",
    medicamentos: "1. Cefepime 1 g IV c/8h\n2. Paracetamol 1 g IV c/8h PRN dolor\n3. Losart\xE1n 50 mg VO c/24h",
    interconsultas: "Nefrolog\xEDa de seguimiento",
    otros: []
  };
  try {
    labHistory2[PITCH_DEMO_PATIENT_ID2] = buildPitchLabHistoryEntries();
    bumpLabHistoryRevision(PITCH_DEMO_PATIENT_ID2);
  } catch (_e) {
    delete labHistory2[PITCH_DEMO_PATIENT_ID2];
  }
  listadoProblemas2[PITCH_DEMO_PATIENT_ID2] = buildTourDemoListadoProblemas(fecha, hora);
  medRecetaByPatient2[PITCH_DEMO_PATIENT_ID2] = {
    fechaActualizacion: fecha,
    items: [
      {
        id: "pitch-med-1",
        nombreRaw: "PARACETAMOL 1 G SOL INY (*)",
        viaRaw: "VIA INTRAVENOSA",
        dosisRaw: "1 G //",
        frecuenciaRaw: "CADA 8 HORAS",
        suspendido: false,
        diaTratamiento: null
      },
      {
        id: "pitch-med-2",
        nombreRaw: "CEFEPIME 1 G SOL INY (*)",
        viaRaw: "VIA INTRAVENOSA",
        dosisRaw: "1 G // *DIA# 2*",
        frecuenciaRaw: "CADA 8 HORAS",
        suspendido: false,
        diaTratamiento: 2
      }
    ]
  };
  medNotaSelectionByPatient2[PITCH_DEMO_PATIENT_ID2] = {
    "pitch-med-1": true,
    "pitch-med-2": true
  };
  recetaHuByPatient2[PITCH_DEMO_PATIENT_ID2] = normalizeRecetaHuDraft({
    fecha,
    meds: [
      {
        medicamento: "Cefepime",
        presentacion: "1 g IV",
        dosis: "1 g IV c/8h"
      },
      {
        medicamento: "Paracetamol",
        presentacion: "1 g IV",
        dosis: "1 g IV c/8h PRN"
      }
    ],
    labs: ["Biometr\xEDa hem\xE1tica", "Qu\xEDmica sangu\xEDnea", "Cultivos de control"],
    cuidados: "Signos vitales, glucometr\xEDa y balance h\xEDdrico",
    proximaCita: "Consulta de Nefrolog\xEDa en 2 semanas",
    proximaCitaFecha: fecha
  });
  const agendaDay = fecha;
  const existingAgenda = storage.getScheduledProcedures().filter(function(ev) {
    return ev.patientId !== PITCH_DEMO_PATIENT_ID2;
  });
  storage.saveScheduledProcedures(
    existingAgenda.concat([
      {
        id: "pitch-agenda-1",
        patientId: PITCH_DEMO_PATIENT_ID2,
        procedure: "Cat\xE9ter peritoneal \u2014 revisi\xF3n",
        location: "Quir\xF3fano menor",
        date: agendaDay,
        time: "10:30",
        notes: "Demo pitch"
      },
      {
        id: "pitch-agenda-2",
        patientId: PITCH_DEMO_PATIENT_ID2,
        procedure: "BH + QS control",
        location: "Laboratorio",
        date: agendaDay,
        time: "06:00",
        notes: "Demo pitch"
      }
    ])
  );
  capturePitchSandbox(patients2);
  setPitchPatientIsolation(true);
  setPatients2([demoPatient]);
  seedPitchDemoTodos();
  saveState2();
  renderPatientList();
  selectPatient(PITCH_DEMO_PATIENT_ID2);
  return { labPasteText: DEMO_TOUR_LAB_PASTE };
}
function clearPitchDemo(state) {
  const {
    patients: patients2,
    notes: notes2,
    indicaciones: indicaciones2,
    labHistory: labHistory2,
    listadoProblemas: listadoProblemas2,
    medRecetaByPatient: medRecetaByPatient2,
    medNotaSelectionByPatient: medNotaSelectionByPatient2,
    recetaHuByPatient: recetaHuByPatient2,
    setPatients: setPatients2,
    saveState: saveState2,
    renderPatientList,
    getActiveId,
    setActiveId
  } = state;
  setPitchPatientIsolation(false);
  let restoredPatients = restorePitchPatientsBackup();
  if (!restoredPatients || !restoredPatients.length) {
    const sandbox2 = readPitchSandboxBackup();
    if (sandbox2 && Array.isArray(sandbox2.patients) && sandbox2.patients.length) {
      restoredPatients = sandbox2.patients.slice();
    }
  }
  if (restoredPatients && restoredPatients.length) {
    setPatients2(restoredPatients);
  } else {
    const filtered = patients2.filter(function(p) {
      return p && p.id !== PITCH_DEMO_PATIENT_ID2 && p.id !== PITCH_DEMO_PATIENT_ID_LEGACY && !p.isDemo;
    });
    if (filtered.length) {
      setPatients2(filtered);
    } else {
      const sandbox2 = readPitchSandboxBackup();
      if (sandbox2 && Array.isArray(sandbox2.patients) && sandbox2.patients.length) {
        setPatients2(sandbox2.patients.slice());
      } else {
        setPatients2(filtered);
      }
    }
  }
  pitchPatientsBackup = null;
  const sandbox = readPitchSandboxBackup();
  if (sandbox && Array.isArray(sandbox.scheduledProcedures)) {
    storage.saveScheduledProcedures(sandbox.scheduledProcedures);
  }
  clearPitchSandboxBackup();
  markPitchTourSessionActive(false);
  delete notes2[PITCH_DEMO_PATIENT_ID2];
  delete notes2[PITCH_DEMO_PATIENT_ID_LEGACY];
  delete indicaciones2[PITCH_DEMO_PATIENT_ID2];
  delete indicaciones2[PITCH_DEMO_PATIENT_ID_LEGACY];
  delete labHistory2[PITCH_DEMO_PATIENT_ID2];
  delete labHistory2[PITCH_DEMO_PATIENT_ID_LEGACY];
  delete listadoProblemas2[PITCH_DEMO_PATIENT_ID2];
  delete medRecetaByPatient2[PITCH_DEMO_PATIENT_ID2];
  if (medNotaSelectionByPatient2[PITCH_DEMO_PATIENT_ID2]) {
    delete medNotaSelectionByPatient2[PITCH_DEMO_PATIENT_ID2];
  }
  delete recetaHuByPatient2[PITCH_DEMO_PATIENT_ID2];
  const agenda = storage.getScheduledProcedures().filter(function(ev) {
    return ev.patientId !== PITCH_DEMO_PATIENT_ID2;
  });
  storage.saveScheduledProcedures(agenda);
  clearPitchDemoTodos();
  if (getActiveId() === PITCH_DEMO_PATIENT_ID2 || getActiveId() === PITCH_DEMO_PATIENT_ID_LEGACY) {
    setActiveId(patients2.length ? patients2[0].id : null);
  }
  saveState2();
  renderPatientList();
}
function buildPitchLabHistoryEntries() {
  const trendSpecs = [
    { id: "pitch-lab-trend-1", fecha: "01/05/2026", report: OLDER_DEMO_SOME_LAB_REPORT },
    { id: "pitch-lab-trend-2", fecha: "04/05/2026", report: DEMO_SOME_LAB_REPORT },
    { id: "pitch-lab-trend-3", fecha: "06/05/2026", report: OLDER_DEMO_SOME_LAB_REPORT },
    { id: "pitch-lab-trend-4", fecha: "08/05/2026", report: DEMO_SOME_LAB_REPORT },
    { id: "pitch-lab-trend-5", fecha: "10/05/2026", report: OLDER_DEMO_SOME_LAB_REPORT }
  ];
  const out = trendSpecs.map(buildPitchLabHistoryEntry);
  PITCH_CULTIVO_LAB_SPECS.forEach(function(spec) {
    out.push(buildPitchLabHistoryEntry(spec));
  });
  return out;
}

// public/js/live-sync-room.mjs
function compareIso(a, b) {
  const x = String(a || "");
  const y = String(b || "");
  if (x > y) return 1;
  if (x < y) return -1;
  return 0;
}
function agendaEntityKey(id) {
  return "a:" + String(id || "");
}
function todoEntityKey(patientId, id) {
  return "t:" + String(patientId || "") + ":" + String(id || "");
}
function patientEntityKey(id, registro) {
  const reg = String(registro || "").trim();
  if (reg) return "reg:" + reg;
  return "id:" + String(id || "");
}
function isDemoPatientId(patientId) {
  return String(patientId || "").indexOf("demo-") === 0;
}
function versionFromSource(src, key) {
  if (!src || !src.entityVersions || src.entityVersions[key] == null) return null;
  return Number(src.entityVersions[key]);
}
function shouldAcceptEntry(cur, nextVersion, nextUpdatedAt) {
  if (!cur) return true;
  const curVer = cur.entityVersion;
  if (nextVersion != null && curVer != null) {
    if (nextVersion > curVer) return true;
    if (nextVersion < curVer) return false;
  }
  return compareIso(nextUpdatedAt, cur.updatedAt) >= 0;
}
function normalizeLiveSyncPatch(patch) {
  if (!patch || patch.type !== "livesync:patch") return null;
  if (patch.mutation && typeof patch.mutation === "object") {
    const m = patch.mutation;
    const data = m.data && typeof m.data === "object" ? m.data : {};
    const deleted = m.op === "delete" || data._deleted === true;
    return {
      type: "livesync:patch",
      entity: m.entityType,
      op: deleted ? "delete" : "upsert",
      id: m.entityId,
      patientId: m.patientId || data.patientId,
      registro: data.registro,
      body: data,
      entityVersion: m.version != null ? Number(m.version) : m.expectedVersion != null ? Number(m.expectedVersion) + 1 : null,
      updatedAt: String(data.updatedAt || patch.updatedAt || (/* @__PURE__ */ new Date()).toISOString())
    };
  }
  return patch;
}
function mergeLiveSyncBundles(sources) {
  const agenda = /* @__PURE__ */ new Map();
  const todos = /* @__PURE__ */ new Map();
  const patientDeletes = /* @__PURE__ */ new Map();
  const todoTouchedPatientIds = /* @__PURE__ */ new Set();
  function upsertAgenda(ev, deleted, entityVersion, updatedAt, src) {
    if (!ev || !ev.id || isDemoPatientId(ev.patientId)) return;
    const k = agendaEntityKey(ev.id);
    const ver = entityVersion != null ? entityVersion : versionFromSource(src, k) ?? (ev.version != null ? Number(ev.version) : null);
    const at = String(updatedAt || ev.updatedAt || ev.createdAt || "");
    const cur = agenda.get(k);
    if (shouldAcceptEntry(cur, ver, at)) {
      agenda.set(k, {
        kind: "agenda",
        item: deleted ? { id: ev.id } : { ...ev },
        updatedAt: at,
        entityVersion: ver,
        deleted: !!deleted
      });
    }
  }
  function upsertTodo(patientId, item, deleted, entityVersion, updatedAt, src) {
    if (!item || !item.id || isDemoPatientId(patientId)) return;
    const k = todoEntityKey(patientId, item.id);
    const ver = entityVersion != null ? entityVersion : versionFromSource(src, k) ?? (item.version != null ? Number(item.version) : null);
    const at = String(updatedAt || item.updatedAt || item.createdAt || "");
    const cur = todos.get(k);
    if (shouldAcceptEntry(cur, ver, at)) {
      todos.set(k, {
        kind: "todo",
        patientId: String(patientId),
        item: deleted ? { id: item.id } : { ...item },
        updatedAt: at,
        entityVersion: ver,
        deleted: !!deleted
      });
    }
  }
  function ingestSource(src) {
    if (!src) return;
    const list = Array.isArray(src.agenda) ? src.agenda : [];
    for (let i = 0; i < list.length; i += 1) {
      upsertAgenda(list[i], false, null, null, src);
    }
    const map = src.todos && typeof src.todos === "object" ? src.todos : {};
    for (const pid of Object.keys(map)) {
      if (isDemoPatientId(pid)) continue;
      const arr = Array.isArray(map[pid]) ? map[pid] : [];
      for (let j = 0; j < arr.length; j += 1) {
        upsertTodo(pid, arr[j], false, null, null, src);
      }
    }
  }
  function applyPatch(rawPatch) {
    const patch = normalizeLiveSyncPatch(rawPatch);
    if (!patch) return;
    const at = String(patch.updatedAt || "");
    const patchVer = patch.entityVersion != null ? Number(patch.entityVersion) : null;
    if (patch.entity === "agenda") {
      const k = agendaEntityKey(patch.id);
      if (patch.op === "delete") {
        const cur = agenda.get(k);
        if (shouldAcceptEntry(cur, patchVer, at)) {
          agenda.set(k, {
            kind: "agenda",
            item: { id: patch.id },
            updatedAt: at,
            entityVersion: patchVer,
            deleted: true
          });
        }
      } else {
        upsertAgenda(
          { ...patch.body || {}, id: patch.id, updatedAt: at },
          false,
          patchVer,
          at,
          null
        );
      }
      return;
    }
    if (patch.entity === "todo") {
      const pid = String(patch.patientId || "");
      if (pid) todoTouchedPatientIds.add(pid);
      if (patch.op === "delete") {
        const k = todoEntityKey(pid, patch.id);
        const cur = todos.get(k);
        if (shouldAcceptEntry(cur, patchVer, at)) {
          todos.set(k, {
            kind: "todo",
            patientId: pid,
            item: { id: patch.id },
            updatedAt: at,
            entityVersion: patchVer,
            deleted: true
          });
        }
      } else {
        upsertTodo(pid, { ...patch.body || {}, id: patch.id, updatedAt: at }, false, patchVer, at, null);
      }
      return;
    }
    if (patch.entity === "patient") {
      const k = patientEntityKey(patch.id, patch.registro);
      if (patch.op === "delete") {
        const cur = patientDeletes.get(k);
        if (shouldAcceptEntry(cur, patchVer, at)) {
          patientDeletes.set(k, {
            id: String(patch.id || ""),
            registro: String(patch.registro || "").trim(),
            updatedAt: at,
            entityVersion: patchVer,
            deleted: true
          });
        }
      }
    }
  }
  for (let s = 0; s < (sources || []).length; s += 1) {
    const src = sources[s];
    if (src && src.type === "livesync:patch") {
      applyPatch(src);
    } else {
      ingestSource(src);
    }
  }
  const agendaOut = [];
  for (const row of agenda.values()) {
    if (!row.deleted && row.item && row.item.id) agendaOut.push(row.item);
  }
  const todosOut = {};
  for (const row of todos.values()) {
    if (row.deleted) continue;
    if (!row.item || !row.item.id) continue;
    if (!todosOut[row.patientId]) todosOut[row.patientId] = [];
    todosOut[row.patientId].push(row.item);
  }
  const patientDeletesOut = [];
  for (const row of patientDeletes.values()) {
    if (row.deleted) patientDeletesOut.push(row);
  }
  return {
    agenda: agendaOut,
    todos: todosOut,
    todoTouchedPatientIds: Array.from(todoTouchedPatientIds),
    patientDeletes: patientDeletesOut
  };
}
function buildRoomSnapshotFromStorage(storageApi, patientIds) {
  const agenda = storageApi.getScheduledProcedures().filter((ev) => !isDemoPatientId(ev.patientId));
  const todos = {};
  const ids = Array.isArray(patientIds) ? patientIds : [];
  for (let i = 0; i < ids.length; i += 1) {
    const pid = ids[i];
    if (isDemoPatientId(pid)) continue;
    const list = storageApi.getTodos(pid);
    if (list.length) todos[pid] = list;
  }
  return {
    savedAt: (/* @__PURE__ */ new Date()).toISOString(),
    agenda,
    todos
  };
}
function nextRoomSnapshotGeneration(prev) {
  const n = Number(prev && prev.generation != null ? prev.generation : 0);
  return n + 1;
}
function isLiveSyncEnvelope(msg) {
  return !!(msg && typeof msg.type === "string" && msg.type.indexOf("livesync:") === 0);
}

// public/js/live-sync-membership.mjs
var MEMBERSHIP_KEY = "rpc-lan-room-membership";
var LAST_ROOM_KEY = "rpc-lan-last-room";
function getRoomMembership() {
  try {
    const raw = localStorage.getItem(MEMBERSHIP_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || !String(o.roomId || "").trim()) return null;
    return {
      roomId: String(o.roomId).trim(),
      label: String(o.label || o.roomId).trim(),
      joinedAt: String(o.joinedAt || "")
    };
  } catch (_e) {
    return null;
  }
}
function setRoomMembership({ roomId, label }) {
  const id = String(roomId || "").trim();
  if (!id) return;
  const payload = {
    roomId: id,
    label: String(label || id).trim(),
    joinedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  localStorage.setItem(MEMBERSHIP_KEY, JSON.stringify(payload));
  localStorage.setItem(LAST_ROOM_KEY, id);
}
function clearRoomMembership() {
  try {
    localStorage.removeItem(MEMBERSHIP_KEY);
    localStorage.removeItem(LAST_ROOM_KEY);
  } catch (_e) {
  }
}
function migrateLastRoomToMembership() {
  if (getRoomMembership()) return;
  try {
    const id = String(localStorage.getItem(LAST_ROOM_KEY) || "").trim();
    if (!id) return;
    setRoomMembership({ roomId: id, label: id });
  } catch (_e) {
  }
}

// public/js/livesync-patient-ids.mjs
function findPatientIdByRegistro(patients2, registro) {
  const r = String(registro || "").trim();
  if (!r || !Array.isArray(patients2)) return "";
  const row = patients2.find((p) => p && String(p.registro || "").trim() === r);
  return row && row.id ? String(row.id) : "";
}
function resolveLiveSyncLocalPatientId(remotePatientId, registro, patients2) {
  const byReg = findPatientIdByRegistro(patients2, registro);
  if (byReg) return byReg;
  const rid = String(remotePatientId || "").trim();
  if (!rid) return "";
  const byId = Array.isArray(patients2) ? patients2.find((p) => p && p.id === rid) : null;
  return byId && byId.id ? String(byId.id) : rid;
}
function buildLiveSyncPatientIdMap(entries, patients2, todosMap) {
  const map = {};
  const regByRemote = {};
  const list = Array.isArray(entries) ? entries : [];
  for (let i = 0; i < list.length; i += 1) {
    const entry = list[i];
    if (!entry || !entry.patient) continue;
    const remoteId = String(entry.patient.id || "").trim();
    if (!remoteId) continue;
    const reg = String(entry.patient.registro || "").trim();
    if (reg) regByRemote[remoteId] = reg;
    map[remoteId] = resolveLiveSyncLocalPatientId(remoteId, reg, patients2);
  }
  for (let p = 0; p < (patients2 || []).length; p += 1) {
    const row = patients2[p];
    if (!row || !row.id) continue;
    const localId = String(row.id);
    map[localId] = localId;
    const reg = String(row.registro || "").trim();
    if (!reg) continue;
    for (const remoteId of Object.keys(regByRemote)) {
      if (regByRemote[remoteId] === reg) map[remoteId] = localId;
    }
  }
  const todos = todosMap && typeof todosMap === "object" ? todosMap : {};
  for (const remotePid of Object.keys(todos)) {
    if (map[remotePid]) continue;
    map[remotePid] = resolveLiveSyncLocalPatientId(
      remotePid,
      regByRemote[remotePid] || "",
      patients2
    );
  }
  return map;
}
function mergeTodoListsById(existing, incoming) {
  const byId = {};
  (Array.isArray(existing) ? existing : []).forEach((t2) => {
    if (t2 && t2.id) byId[t2.id] = t2;
  });
  (Array.isArray(incoming) ? incoming : []).forEach((t2) => {
    if (!t2 || !t2.id) return;
    const cur = byId[t2.id];
    const at = String(t2.updatedAt || t2.createdAt || "");
    const curAt = cur ? String(cur.updatedAt || cur.createdAt || "") : "";
    if (!cur || at >= curAt) byId[t2.id] = t2;
  });
  return Object.keys(byId).map((k) => byId[k]);
}
function remapTodosPatientIds(todosMap, idMap) {
  const out = {};
  if (!todosMap || typeof todosMap !== "object") return out;
  for (const remotePid of Object.keys(todosMap)) {
    const localPid = idMap[remotePid] || remotePid;
    const arr = Array.isArray(todosMap[remotePid]) ? todosMap[remotePid] : [];
    if (!arr.length) continue;
    out[localPid] = out[localPid] ? mergeTodoListsById(out[localPid], arr) : arr.slice();
  }
  return out;
}
function attachTodosMapToPatientEntries(entries, todosMap) {
  if (!Array.isArray(entries)) return [];
  const byRemoteId = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    const id = entry?.patient?.id;
    if (id) byRemoteId.set(String(id), entry);
  }
  for (const remotePid of Object.keys(todosMap || {})) {
    const list = todosMap[remotePid];
    if (!Array.isArray(list) || !list.length) continue;
    const entry = byRemoteId.get(remotePid);
    if (!entry) continue;
    entry.todos = mergeTodoListsById(entry.todos, list);
  }
  return entries;
}
function remapAgendaPatientIds(agenda, idMap) {
  if (!Array.isArray(agenda)) return [];
  return agenda.map((ev) => {
    if (!ev || !ev.patientId) return ev;
    const pid = String(ev.patientId);
    const local = idMap[pid] || pid;
    if (local === pid) return ev;
    return { ...ev, patientId: local };
  });
}

// lib/historia-clinica/clinical-text.mjs
var SLUG_STRING_KEYS = /* @__PURE__ */ new Set([
  "id",
  "substanceId",
  "conditionId",
  "relativeId",
  "linkedFrom",
  "stage"
]);
var SKIP_STRING_KEYS = /* @__PURE__ */ new Set([
  "patientId",
  "createdAt",
  "updatedAt",
  "capturedAt",
  "setId",
  "source",
  "clientId",
  "fecha",
  "hora"
]);
function toClinicalHistoryText(value) {
  if (value == null) return "";
  return String(value).toUpperCase();
}
var PRESERVE_LITERAL = /* @__PURE__ */ new Set([
  "negado",
  "activo",
  "exfumador",
  "dia",
  "daily",
  "semana",
  "weekly",
  "fin",
  "weekend",
  "mes",
  "monthly",
  "si",
  "no"
]);
function shouldPreserveString(key, value, parentKey) {
  if (typeof value !== "string") return true;
  if (!value.trim()) return true;
  if (SKIP_STRING_KEYS.has(key)) return true;
  if (key === "conditions" || key === "checks" || parentKey === "conditions" || parentKey === "checks") {
    return true;
  }
  if (SLUG_STRING_KEYS.has(key) && /^[a-z][a-z0-9_]*$/i.test(value)) return true;
  if (key === "status" || key === "frequencyKind" || key === "portadorVih") {
    if (PRESERVE_LITERAL.has(value.trim().toLowerCase())) return true;
  }
  return false;
}
function applyClinicalHistoryUppercase(value, key, parentKey) {
  if (value == null) return value;
  if (typeof value === "string") {
    if (shouldPreserveString(key || "", value, parentKey)) return value;
    return toClinicalHistoryText(value);
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.map(function(item) {
      return applyClinicalHistoryUppercase(item, key, parentKey);
    });
  }
  if (typeof value === "object") {
    Object.keys(value).forEach(function(k) {
      value[k] = applyClinicalHistoryUppercase(value[k], k, key);
    });
    return value;
  }
  return value;
}
function shouldUppercaseHcInput(el) {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.dataset && el.dataset.hcNoUppercase != null) return false;
  const tag = el.tagName;
  if (tag === "SELECT") return false;
  if (tag === "TEXTAREA") return true;
  if (tag !== "INPUT") return false;
  const type = (el.getAttribute("type") || "text").toLowerCase();
  return type === "text" || type === "" || type === "search";
}
function applyUppercaseToHcInput(el) {
  if (!shouldUppercaseHcInput(el)) return;
  const next = toClinicalHistoryText(el.value);
  if (el.value === next) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  el.value = next;
  if (start != null && end != null) {
    try {
      el.setSelectionRange(start, end);
    } catch (_) {
    }
  }
}

// lib/drive-import/merge-eventualidades.mjs
function dedupeEventualidadKey(entry) {
  const day = String(entry.at || "").slice(0, 10);
  const prefix = toClinicalHistoryText(entry.text).trim().slice(0, 160);
  return day + "|" + prefix;
}
function filterNewEventualidades(existing, incoming) {
  const keys = /* @__PURE__ */ new Set();
  for (const e of existing || []) {
    keys.add(dedupeEventualidadKey(e));
  }
  const toAdd = [];
  let skipped = 0;
  for (const e of incoming || []) {
    const key = dedupeEventualidadKey(e);
    if (keys.has(key)) {
      skipped += 1;
      continue;
    }
    keys.add(key);
    toAdd.push({ at: String(e.at), text: String(e.text) });
  }
  return { toAdd, skipped };
}

// public/js/lan-patient-merge.mjs
function isDemoPatientId2(patientId) {
  return String(patientId || "").indexOf("demo-") === 0;
}
function entryMatchKey(entry) {
  const reg = String(entry?.patient?.registro || "").trim();
  if (reg) return "reg:" + reg;
  return "id:" + String(entry?.patient?.id || "");
}
function parseDateDMY(value) {
  const t2 = String(value || "").trim();
  const m = t2.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!m) return null;
  let y = parseInt(m[3], 10);
  if (y < 100) y += 2e3;
  const d = new Date(y, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
  return isNaN(d.getTime()) ? null : d;
}
function docTimestamp(fecha, hora) {
  const d = parseDateDMY(fecha);
  if (!d) return "";
  const hm = String(hora || "").trim().match(/^(\d{1,2}):(\d{2})/);
  if (hm) d.setHours(parseInt(hm[1], 10), parseInt(hm[2], 10), 0, 0);
  return d.toISOString();
}
function labSetTimestamp(set) {
  if (!set) return "";
  if (set.updatedAt) return String(set.updatedAt);
  const n = Number(set.id);
  if (!isNaN(n) && n > 1e11) return new Date(n).toISOString();
  return docTimestamp(set.fecha, set.hora);
}
function noteTimestamp(note) {
  if (!note || typeof note !== "object") return "";
  if (note.updatedAt) return String(note.updatedAt);
  return docTimestamp(note.fecha, note.hora);
}
function listadoTimestamp(lst) {
  if (!lst || typeof lst !== "object") return "";
  if (lst.updatedAt) return String(lst.updatedAt);
  return docTimestamp(lst.fecha, lst.hora);
}
function eventualidadesUpdatedAt(store) {
  if (!store || typeof store !== "object") return "";
  const s = store;
  let best = s.updatedAt ? String(s.updatedAt) : "";
  const entries = Array.isArray(s.entries) ? s.entries : [];
  for (let i = 0; i < entries.length; i += 1) {
    const row = entries[i];
    if (!row || typeof row !== "object") continue;
    const at = String(
      /** @type {{ at?: string, updatedAt?: string }} */
      row.at || /** @type {{ updatedAt?: string }} */
      row.updatedAt || ""
    );
    if (compareIso(at, best) > 0) best = at;
  }
  return best;
}
function mergeEventualidades(a, b) {
  const left = a && typeof a === "object" ? (
    /** @type {{ entries?: object[] }} */
    a
  ) : null;
  const right = b && typeof b === "object" ? (
    /** @type {{ entries?: object[] }} */
    b
  ) : null;
  if (!left && !right) return void 0;
  const leftEntries = left && Array.isArray(left.entries) ? left.entries : [];
  const rightEntries = right && Array.isArray(right.entries) ? right.entries : [];
  const byId = /* @__PURE__ */ new Map();
  for (const row of leftEntries) {
    if (!row || typeof row !== "object") continue;
    const id = String(
      /** @type {{ id?: string }} */
      row.id || ""
    ).trim();
    if (id) byId.set(id, { ...row });
  }
  for (const row of rightEntries) {
    if (!row || typeof row !== "object") continue;
    const id = String(
      /** @type {{ id?: string }} */
      row.id || ""
    ).trim();
    if (id) {
      const cur = byId.get(id);
      const at = String(
        /** @type {{ at?: string }} */
        row.at || ""
      );
      const curAt = cur ? String(
        /** @type {{ at?: string }} */
        cur.at || ""
      ) : "";
      if (!cur || compareIso(at, curAt) >= 0) byId.set(id, { ...row });
      continue;
    }
  }
  const { toAdd } = filterNewEventualidades(
    Array.from(byId.values()),
    rightEntries.filter((row) => !String(
      /** @type {{ id?: string }} */
      row.id || ""
    ).trim())
  );
  for (const row of toAdd) {
    byId.set("anon:" + dedupeEventualidadKey(row), { ...row });
  }
  const entries = Array.from(byId.values()).sort(function(x, y) {
    return compareIso(String(
      /** @type {{ at?: string }} */
      y.at || ""
    ), String(
      /** @type {{ at?: string }} */
      x.at || ""
    ));
  });
  return { entries };
}
function historiaClinicaUpdatedAt(hc) {
  if (!hc || typeof hc !== "object") return "";
  const row = hc;
  return row.data?.meta?.updatedAt ? String(row.data.meta.updatedAt) : "";
}
function mergeHistoriaClinica(a, b) {
  if (!a && !b) return void 0;
  if (!a) return structuredClone(
    /** @type {object} */
    b
  );
  if (!b) return structuredClone(
    /** @type {object} */
    a
  );
  const av = Number(
    /** @type {{ version?: number }} */
    a.version || 0
  );
  const bv = Number(
    /** @type {{ version?: number }} */
    b.version || 0
  );
  let winner = bv >= av ? b : a;
  if (av === bv) {
    const at = historiaClinicaUpdatedAt(a);
    const bt = historiaClinicaUpdatedAt(b);
    if (compareIso(bt, at) > 0) winner = b;
    else if (compareIso(at, bt) > 0) winner = a;
  }
  const out = {
    version: Number(
      /** @type {{ version?: number }} */
      winner.version || 0
    ),
    data: structuredClone(
      /** @type {{ data?: object }} */
      winner.data || {}
    )
  };
  return out;
}
function medRecetaTimestamp(med) {
  if (!med || typeof med !== "object") return "";
  if (med.updatedAt) return String(med.updatedAt);
  return docTimestamp(med.fecha, med.hora);
}
function monitoreoUpdatedAt(monitoreo) {
  if (!monitoreo || typeof monitoreo !== "object") return "";
  let best = "";
  const m = monitoreo;
  const tg = m.textoGuardado && typeof m.textoGuardado === "object" ? m.textoGuardado : null;
  if (tg != null && tg.savedAt != null && String(tg.savedAt).trim()) {
    const s = String(tg.savedAt);
    if (compareIso(s, best) > 0) best = s;
  }
  const hist = Array.isArray(m.historial) ? m.historial : [];
  for (let i = 0; i < hist.length; i += 1) {
    const row = hist[i];
    if (!row || typeof row !== "object") continue;
    const ra = (
      /** @type {any} */
      row.recordedAt != null ? String(
        /** @type {any} */
        row.recordedAt
      ) : ""
    );
    if (ra && compareIso(ra, best) > 0) best = ra;
  }
  return best;
}
function monitoreoHasLanPayload(monitoreo) {
  if (!monitoreo || typeof monitoreo !== "object") return false;
  const m = monitoreo;
  const hist = Array.isArray(m.historial) ? m.historial : [];
  if (hist.length > 0) return true;
  const tg = m.textoGuardado && typeof m.textoGuardado === "object" ? m.textoGuardado : null;
  if (!tg) return false;
  if (tg.savedAt != null && String(tg.savedAt).trim()) return true;
  if (String(tg.text || "").trim()) return true;
  return false;
}
function entryUpdatedAt(entry) {
  if (!entry) return "";
  const p = entry.patient || {};
  if (p.lanUpdatedAt) return String(p.lanUpdatedAt);
  const parts = [
    noteTimestamp(entry.note),
    noteTimestamp(entry.indicaciones),
    medRecetaTimestamp(entry.medReceta),
    listadoTimestamp(entry.listadoProblemas),
    monitoreoUpdatedAt(p.monitoreo),
    eventualidadesUpdatedAt(p.eventualidades),
    historiaClinicaUpdatedAt(p.historiaClinica)
  ];
  const labs = Array.isArray(entry.labHistory) ? entry.labHistory : [];
  for (let i = 0; i < labs.length; i += 1) {
    parts.push(labSetTimestamp(labs[i]));
  }
  let best = "";
  for (let j = 0; j < parts.length; j += 1) {
    if (compareIso(parts[j], best) > 0) best = parts[j];
  }
  return best;
}
function mergeLabHistorySets(a, b) {
  const map = /* @__PURE__ */ new Map();
  for (const s of a || []) {
    if (!s || !s.id) continue;
    map.set(String(s.id), { ...s });
  }
  for (const s of b || []) {
    if (!s || !s.id) continue;
    const id = String(s.id);
    const cur = map.get(id);
    if (!cur || compareIso(labSetTimestamp(s), labSetTimestamp(cur)) >= 0) {
      map.set(id, { ...s });
    }
  }
  return Array.from(map.values());
}
function mergeProblemaLists(aList, bList) {
  const map = /* @__PURE__ */ new Map();
  for (const arr of [aList, bList]) {
    for (const p of arr || []) {
      if (!p || !p.id) continue;
      const id = String(p.id);
      const cur = map.get(id);
      const at = String(p.updatedAt || p.fecha || "");
      const curAt = cur ? String(cur.updatedAt || cur.fecha || "") : "";
      if (!cur || compareIso(at, curAt) >= 0) map.set(id, { ...p });
    }
  }
  return Array.from(map.values());
}
function mergeListadoProblemas(a, b) {
  if (!a && !b) return null;
  if (!a) return b ? { ...b } : null;
  if (!b) return { ...a };
  const at = listadoTimestamp(a);
  const bt = listadoTimestamp(b);
  const base = compareIso(at, bt) >= 0 ? { ...a } : { ...b };
  const other = base === a ? b : a;
  return {
    ...base,
    activos: mergeProblemaLists(base.activos, other.activos),
    inactivos: mergeProblemaLists(base.inactivos, other.inactivos)
  };
}
function pickPatientFields(older, newer) {
  const fields = [
    "nombre",
    "edad",
    "sexo",
    "area",
    "servicio",
    "cuarto",
    "cama",
    "peso",
    "talla",
    "viaAcceso",
    "accesoFecha",
    "fiuxFecha",
    "fimiFecha",
    "registro",
    "fromLab"
  ];
  const out = { ...older };
  for (const f of fields) {
    const nv = newer[f];
    const ov = older[f];
    if (nv != null && String(nv).trim() !== "") out[f] = nv;
    else if (ov != null) out[f] = ov;
  }
  const at = String(older.lanUpdatedAt || "");
  const bt = String(newer.lanUpdatedAt || "");
  if (compareIso(bt, at) >= 0 && newer.lanUpdatedAt) out.lanUpdatedAt = newer.lanUpdatedAt;
  else if (older.lanUpdatedAt) out.lanUpdatedAt = older.lanUpdatedAt;
  out.id = older.id || newer.id;
  return out;
}
function mergePatientEntry(a, b) {
  if (!a || !a.patient) return b ? cloneEntry(b) : null;
  if (!b || !b.patient) return cloneEntry(a);
  const at = entryUpdatedAt(a);
  const bt = entryUpdatedAt(b);
  const first = compareIso(at, bt) >= 0 ? a : b;
  const second = first === a ? b : a;
  const patient = pickPatientFields(
    compareIso(entryUpdatedAt(second), entryUpdatedAt(first)) <= 0 ? second.patient : first.patient,
    compareIso(entryUpdatedAt(first), entryUpdatedAt(second)) >= 0 ? first.patient : second.patient
  );
  patient.id = first.patient.id || second.patient.id;
  const note = compareIso(noteTimestamp(a.note), noteTimestamp(b.note)) >= 0 ? { ...a.note || {} } : { ...b.note || {} };
  const indicaciones2 = compareIso(noteTimestamp(a.indicaciones), noteTimestamp(b.indicaciones)) >= 0 ? { ...a.indicaciones || {} } : { ...b.indicaciones || {} };
  const medReceta = compareIso(medRecetaTimestamp(a.medReceta), medRecetaTimestamp(b.medReceta)) >= 0 ? a.medReceta ? { ...a.medReceta } : null : b.medReceta ? { ...b.medReceta } : null;
  const monOlder = second.patient?.monitoreo;
  const monNewer = first.patient?.monitoreo;
  const payOlder = monitoreoHasLanPayload(monOlder);
  const payNewer = monitoreoHasLanPayload(monNewer);
  if (payOlder && payNewer) {
    patient.monitoreo = mergeMonitoreo(monOlder, monNewer);
  } else if (payNewer && monNewer) {
    patient.monitoreo = structuredClone(monNewer);
  } else if (payOlder && monOlder) {
    patient.monitoreo = structuredClone(monOlder);
  } else {
    delete patient.monitoreo;
  }
  const mergedEventualidades = mergeEventualidades(first.patient?.eventualidades, second.patient?.eventualidades);
  if (mergedEventualidades) patient.eventualidades = mergedEventualidades;
  const mergedHc = mergeHistoriaClinica(first.patient?.historiaClinica, second.patient?.historiaClinica);
  if (mergedHc) patient.historiaClinica = mergedHc;
  if (patient.id) bumpLabHistoryRevision(patient.id);
  return {
    patient,
    note,
    indicaciones: indicaciones2,
    labHistory: mergeLabHistorySets(a.labHistory, b.labHistory),
    medReceta,
    vpo: mergeVpoPayload(a.vpo, b.vpo),
    listadoProblemas: mergeListadoProblemas(a.listadoProblemas, b.listadoProblemas),
    todos: mergeTodoListsById(a.todos, b.todos)
  };
}
function mergeVpoPayload(a, b) {
  if (!a && !b) return null;
  if (!a) return b ? structuredClone(b) : null;
  if (!b) return structuredClone(a);
  try {
    return JSON.parse(JSON.stringify(b));
  } catch (_e) {
    return structuredClone(b);
  }
}
function cloneEntry(entry) {
  const patRaw = entry.patient || {};
  const patient = typeof patRaw === "object" && patRaw != null ? { ...patRaw } : (
    /** @type {any} */
    {}
  );
  const monSrc = patient.monitoreo;
  if (monSrc != null && typeof monSrc === "object") {
    patient.monitoreo = structuredClone(monSrc);
  }
  if (patient.historiaClinica != null && typeof patient.historiaClinica === "object") {
    patient.historiaClinica = structuredClone(patient.historiaClinica);
  }
  return {
    patient,
    note: { ...entry.note || {} },
    indicaciones: { ...entry.indicaciones || {} },
    labHistory: Array.isArray(entry.labHistory) ? entry.labHistory.map((s) => ({ ...s })) : [],
    medReceta: entry.medReceta ? { ...entry.medReceta } : null,
    vpo: entry.vpo ? structuredClone(entry.vpo) : null,
    listadoProblemas: entry.listadoProblemas ? { ...entry.listadoProblemas } : null,
    todos: Array.isArray(entry.todos) ? entry.todos.map((t2) => ({ ...t2 })) : []
  };
}
function mergeLanPatientEntrySources(sources) {
  const byKey = /* @__PURE__ */ new Map();
  for (let s = 0; s < (sources || []).length; s += 1) {
    const list = Array.isArray(sources[s].entries) ? sources[s].entries : [];
    for (let i = 0; i < list.length; i += 1) {
      const entry = list[i];
      if (!entry || !entry.patient || isDemoPatientId2(entry.patient.id)) continue;
      const k = entryMatchKey(entry);
      const cur = byKey.get(k);
      byKey.set(k, cur ? mergePatientEntry(cur, entry) : cloneEntry(entry));
    }
  }
  return Array.from(byKey.values());
}
function filterEntriesByPatientDeletes(entries, patientDeletes) {
  if (!patientDeletes || !patientDeletes.length) return entries || [];
  const delMap = /* @__PURE__ */ new Map();
  for (let i = 0; i < patientDeletes.length; i += 1) {
    const d = patientDeletes[i];
    if (!d || !d.deleted) continue;
    const reg = String(d.registro || "").trim();
    const k = reg ? "reg:" + reg : "id:" + String(d.id || "");
    delMap.set(k, d);
  }
  if (!delMap.size) return entries || [];
  return (entries || []).filter((entry) => {
    if (!entry || !entry.patient) return false;
    const del = delMap.get(entryMatchKey(entry));
    if (!del) return true;
    return compareIso(entryUpdatedAt(entry), del.updatedAt || "") > 0;
  });
}

// public/js/manejo-custom-protocols.mjs
var STORAGE_KEY = "rpc-manejo-custom-protocols";
var OVERRIDES_KEY = "rpc-manejo-protocol-overrides";
var overridesCache = null;
var customProtocolsCache = null;
function getProtocolOverridesMap() {
  if (overridesCache) return overridesCache;
  overridesCache = loadProtocolOverridesFromStorage();
  return overridesCache;
}
function safeParseArray(raw) {
  try {
    var parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
}
function loadCustomProtocols() {
  if (customProtocolsCache) return customProtocolsCache.slice();
  try {
    customProtocolsCache = safeParseArray(localStorage.getItem(STORAGE_KEY));
  } catch (_e2) {
    customProtocolsCache = [];
  }
  return customProtocolsCache.slice();
}
function saveCustomProtocols(entries) {
  customProtocolsCache = Array.isArray(entries) ? entries.slice() : [];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customProtocolsCache));
  } catch (_e3) {
  }
}
function addCustomProtocol(entry) {
  var list = loadCustomProtocols();
  var id = "custom-" + Date.now();
  list.push({
    id,
    category: entry.category || "otros",
    title: entry.title || "Protocolo personalizado",
    indicationText: entry.indicationText || "",
    calculatorId: null,
    copyTemplate: entry.copyTemplate || entry.indicationText || "",
    notes: entry.notes || [],
    linkedPathologyIds: entry.linkedPathologyIds || [],
    isCustom: true
  });
  saveCustomProtocols(list);
  return id;
}
function updateCustomProtocol(id, patch) {
  var list = loadCustomProtocols();
  var idx = list.findIndex(function(p) {
    return p.id === id;
  });
  if (idx < 0) return false;
  list[idx] = Object.assign({}, list[idx], patch, { id, isCustom: true });
  saveCustomProtocols(list);
  return true;
}
function deleteCustomProtocol(id) {
  var list = loadCustomProtocols().filter(function(p) {
    return p.id !== id;
  });
  saveCustomProtocols(list);
}
function safeParseObject(raw) {
  try {
    var parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_e4) {
    return {};
  }
}
function loadProtocolOverridesFromStorage() {
  try {
    return safeParseObject(localStorage.getItem(OVERRIDES_KEY));
  } catch (_e5) {
    return {};
  }
}
function loadProtocolOverrides() {
  var cached = getProtocolOverridesMap();
  return Object.assign({}, cached);
}
function saveProtocolOverride(id, patch) {
  if (!id) return;
  var all = getProtocolOverridesMap();
  all[id] = Object.assign({}, all[id] || {}, patch, { id });
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(all));
  } catch (_e6) {
  }
}
function removeProtocolOverride(id) {
  if (!id) return;
  var all = getProtocolOverridesMap();
  delete all[id];
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(all));
  } catch (_e7) {
  }
}
function applyEntryOverrides(entry) {
  if (!entry || entry.isCustom) return entry;
  var o = getProtocolOverridesMap()[entry.id];
  if (!o) return entry;
  return Object.assign({}, entry, o);
}
function hasProtocolOverride(id) {
  return !!getProtocolOverridesMap()[id];
}

// public/js/manejo-protocol-favorites.mjs
var FAV_KEY = "rpc-manejo-protocol-favorites";
var RECENT_KEY = "rpc-manejo-protocol-recent";
var favoritesCache = null;
function safeParseArray2(raw) {
  try {
    var parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
}
function getFavoritesSet() {
  if (favoritesCache) return favoritesCache;
  favoritesCache = new Set(loadProtoFavoritesFromStorage());
  return favoritesCache;
}
function loadProtoFavoritesFromStorage() {
  try {
    return safeParseArray2(localStorage.getItem(FAV_KEY));
  } catch (_e2) {
    return [];
  }
}
function loadProtoFavorites() {
  return Array.from(getFavoritesSet());
}
function saveProtoFavorites(ids) {
  favoritesCache = new Set(ids || []);
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(favoritesCache)));
  } catch (_e3) {
  }
}
function isProtoFavorite(id) {
  if (!id) return false;
  return getFavoritesSet().has(id);
}
function toggleProtoFavorite(id) {
  if (!id) return false;
  var set = getFavoritesSet();
  if (set.has(id)) {
    set.delete(id);
    saveProtoFavorites(Array.from(set));
    return false;
  }
  var list = [id].concat(Array.from(set));
  saveProtoFavorites(list);
  return true;
}
function loadProtoRecentIds() {
  try {
    return safeParseArray2(localStorage.getItem(RECENT_KEY));
  } catch (_e4) {
    return [];
  }
}

// public/js/manejo-room-data.mjs
var FAV_KEY2 = "rpc-manejo-protocol-favorites";
var RECENT_KEY2 = "rpc-manejo-protocol-recent";
var OVERRIDES_KEY2 = "rpc-manejo-protocol-overrides";
function cloneManejoBlock(block) {
  if (!block || typeof block !== "object") return null;
  return {
    customProtocols: Array.isArray(block.customProtocols) ? block.customProtocols.map((p) => ({ ...p })) : [],
    overrides: block.overrides && typeof block.overrides === "object" ? { ...block.overrides } : {},
    favorites: Array.isArray(block.favorites) ? block.favorites.slice() : [],
    recent: Array.isArray(block.recent) ? block.recent.slice() : [],
    updatedAt: String(block.updatedAt || "")
  };
}
function isLanManejoRoomSyncEnabled() {
  return !isManejoTabGloballyHidden();
}
function collectManejoRoomPayload() {
  if (!isLanManejoRoomSyncEnabled()) return null;
  return {
    customProtocols: loadCustomProtocols(),
    overrides: loadProtocolOverrides(),
    favorites: loadProtoFavorites(),
    recent: loadProtoRecentIds(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function protocolUpdatedAt(p) {
  return String(p && p.updatedAt || "");
}
function mergeProtocolLists(aList, bList) {
  const map = /* @__PURE__ */ new Map();
  for (const arr of [aList, bList]) {
    for (const p of arr || []) {
      if (!p || !p.id) continue;
      const id = String(p.id);
      const cur = map.get(id);
      if (!cur || compareIso(protocolUpdatedAt(p), protocolUpdatedAt(cur)) >= 0) {
        map.set(id, { ...p });
      }
    }
  }
  return Array.from(map.values());
}
function mergeOverrides(a, b) {
  const out = {};
  const keys = /* @__PURE__ */ new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) {
    const av = a && a[k];
    const bv = b && b[k];
    if (!av) {
      out[k] = bv ? { ...bv } : void 0;
      continue;
    }
    if (!bv) {
      out[k] = { ...av };
      continue;
    }
    const at = String(av.updatedAt || "");
    const bt = String(bv.updatedAt || "");
    out[k] = compareIso(bt, at) >= 0 ? { ...bv } : { ...av };
  }
  return out;
}
function mergeIdLists(aList, bList) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const arr of [aList, bList]) {
    for (const id of arr || []) {
      const s = String(id || "").trim();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}
function mergeManejoRoomData(a, b) {
  if (!a && !b) return null;
  if (!a) return cloneManejoBlock(b);
  if (!b) return cloneManejoBlock(a);
  const ca = cloneManejoBlock(a);
  const cb = cloneManejoBlock(b);
  const at = ca.updatedAt;
  const bt = cb.updatedAt;
  const newerFirst = compareIso(bt, at) >= 0;
  const first = newerFirst ? cb : ca;
  const second = newerFirst ? ca : cb;
  return {
    customProtocols: mergeProtocolLists(first.customProtocols, second.customProtocols),
    overrides: mergeOverrides(first.overrides, second.overrides),
    favorites: mergeIdLists(first.favorites, second.favorites),
    recent: mergeIdLists(first.recent, second.recent),
    updatedAt: compareIso(bt, at) >= 0 ? bt : at
  };
}
function applyManejoRoomDataToLocal(merged) {
  if (!isLanManejoRoomSyncEnabled()) return;
  if (!merged || typeof merged !== "object") return;
  if (Array.isArray(merged.customProtocols)) {
    saveCustomProtocols(merged.customProtocols);
  }
  if (merged.overrides && typeof merged.overrides === "object") {
    try {
      localStorage.setItem(OVERRIDES_KEY2, JSON.stringify(merged.overrides));
    } catch (_e) {
    }
  }
  if (Array.isArray(merged.favorites)) {
    try {
      localStorage.setItem(FAV_KEY2, JSON.stringify(merged.favorites));
    } catch (_e2) {
    }
  }
  if (Array.isArray(merged.recent)) {
    try {
      localStorage.setItem(RECENT_KEY2, JSON.stringify(merged.recent));
    } catch (_e3) {
    }
  }
}
function mergeManejoFromSources(sources) {
  if (!isLanManejoRoomSyncEnabled()) return null;
  let merged = null;
  for (let i = 0; i < (sources || []).length; i += 1) {
    const src = sources[i];
    const block = src && src.manejo;
    if (!block) continue;
    merged = mergeManejoRoomData(merged, block);
  }
  return merged;
}

// public/js/clinical-ops-bundle-merge.mjs
function indexBy(rows, key) {
  const map = /* @__PURE__ */ new Map();
  for (const row of rows || []) {
    if (row && row[key] != null) map.set(String(row[key]), row);
  }
  return map;
}
function pickLastWriteRow(localRow, incomingRow, tsField) {
  if (!localRow) return incomingRow || null;
  if (!incomingRow) return localRow;
  const a = String(localRow[tsField] || "");
  const b = String(incomingRow[tsField] || "");
  return b >= a ? incomingRow : localRow;
}
function mergeTeamsData(localRows, incomingRows) {
  const localById = indexBy(localRows, "team_id");
  const incomingById = indexBy(incomingRows, "team_id");
  const allIds = /* @__PURE__ */ new Set([...localById.keys(), ...incomingById.keys()]);
  const out = [];
  for (const teamId of allIds) {
    const winner = pickLastWriteRow(localById.get(teamId), incomingById.get(teamId), "created_at");
    if (winner) out.push({ ...winner });
  }
  return out;
}
function mergeTeamMembershipData(localRows, incomingRows) {
  const map = /* @__PURE__ */ new Map();
  for (const row of localRows || []) {
    if (!row?.team_id || !row?.user_id) continue;
    map.set(`${row.team_id}\0${row.user_id}`, { ...row });
  }
  for (const row of incomingRows || []) {
    if (!row?.team_id || !row?.user_id) continue;
    const key = `${row.team_id}\0${row.user_id}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...row });
      continue;
    }
    const fraction = row.sub_area_fraction != null && String(row.sub_area_fraction).trim() ? String(row.sub_area_fraction).trim() : prev.sub_area_fraction ?? null;
    map.set(key, { ...prev, ...row, sub_area_fraction: fraction });
  }
  return [...map.values()];
}
function mergeRotationCyclesData(localRows, incomingRows) {
  const byId = indexBy(localRows, "cycle_id");
  for (const row of incomingRows || []) {
    if (row && row.cycle_id) byId.set(String(row.cycle_id), { ...row });
  }
  return [...byId.values()];
}
function mergePatientTeamAssignmentsData(localRows, incomingRows) {
  const map = /* @__PURE__ */ new Map();
  for (const row of localRows || []) {
    if (!row?.patient_id || !row?.team_id) continue;
    map.set(`${row.patient_id}\0${row.team_id}`, { ...row });
  }
  for (const row of incomingRows || []) {
    if (!row?.patient_id || !row?.team_id) continue;
    const key = `${row.patient_id}\0${row.team_id}`;
    if (!map.has(key)) map.set(key, { ...row });
  }
  return [...map.values()];
}
function mergeTeamGuardiaTodayData(localRows, incomingRows) {
  const localByTeam = indexBy(localRows, "team_id");
  const incomingByTeam = indexBy(incomingRows, "team_id");
  const allTeams = /* @__PURE__ */ new Set([...localByTeam.keys(), ...incomingByTeam.keys()]);
  const out = [];
  for (const teamId of allTeams) {
    const winner = pickLastWriteRow(localByTeam.get(teamId), incomingByTeam.get(teamId), "declared_at");
    if (winner) out.push({ ...winner });
  }
  return out;
}
function mergeActiveGuardiasData(localRows, incomingRows) {
  const localByPatient = indexBy(localRows, "patient_id");
  const incomingByPatient = indexBy(incomingRows, "patient_id");
  const allPatients = /* @__PURE__ */ new Set([...localByPatient.keys(), ...incomingByPatient.keys()]);
  const out = [];
  for (const patientId of allPatients) {
    const winner = pickLastWriteRow(
      localByPatient.get(patientId),
      incomingByPatient.get(patientId),
      "assigned_at"
    );
    if (winner) out.push({ ...winner });
  }
  return out;
}
function normalizeUsername(raw) {
  return String(raw || "").trim().replace(/^@+/, "").toLowerCase();
}
function isValidUsernameFormat(raw) {
  return /^[a-z][a-z0-9_]{2,31}$/.test(normalizeUsername(raw));
}
function mergeClinicalUsersDeletedData(localIds, incomingIds) {
  const set = /* @__PURE__ */ new Set();
  for (const id of localIds || []) {
    const uid = String(id || "").trim();
    if (uid) set.add(uid);
  }
  for (const id of incomingIds || []) {
    const uid = String(id || "").trim();
    if (uid) set.add(uid);
  }
  return [...set];
}
function mergeClinicalUsersData(localRows, incomingRows) {
  const byUsername = /* @__PURE__ */ new Map();
  const byUserId = /* @__PURE__ */ new Map();
  for (const row of localRows || []) {
    if (!row?.user_id) continue;
    byUserId.set(String(row.user_id), { ...row });
    const handle = normalizeUsername(row.username);
    if (handle && isValidUsernameFormat(handle)) byUsername.set(handle, { ...row });
  }
  for (const row of incomingRows || []) {
    if (!row?.user_id) continue;
    const handle = normalizeUsername(row.username);
    if (!handle || !isValidUsernameFormat(handle)) continue;
    const uid = String(row.user_id);
    const existingByHandle = byUsername.get(handle);
    if (existingByHandle && existingByHandle.user_id !== uid) continue;
    const prev = byUserId.get(uid) || existingByHandle || null;
    const merged = prev ? {
      ...prev,
      username: handle,
      rank: row.rank ?? prev.rank,
      clinical_name: row.clinical_name ?? prev.clinical_name,
      sala: row.sala ?? prev.sala,
      is_program_admin: row.is_program_admin != null ? row.is_program_admin : prev.is_program_admin
    } : { ...row, username: handle };
    byUserId.set(uid, merged);
    byUsername.set(handle, merged);
  }
  return [...byUserId.values()];
}
function mergeClinicalOpsSnapshotsData(local, incoming) {
  if (!local) return incoming && typeof incoming === "object" ? { ...incoming } : null;
  if (!incoming || typeof incoming !== "object") return { ...local };
  const remoteNueva = incoming.rotationNuevaAt ? String(incoming.rotationNuevaAt) : "";
  const localNueva = local.rotationNuevaAt ? String(local.rotationNuevaAt) : "";
  if (remoteNueva && (!localNueva || remoteNueva > localNueva)) {
    const clinical_users_deleted2 = mergeClinicalUsersDeletedData(
      local.clinical_users_deleted || [],
      incoming.clinical_users_deleted || []
    );
    const deletedSet2 = new Set(clinical_users_deleted2);
    return {
      ...incoming,
      exportedAt: String(incoming.exportedAt || "") >= String(local.exportedAt || "") ? incoming.exportedAt : local.exportedAt,
      clinical_users_deleted: clinical_users_deleted2,
      clinical_users: mergeClinicalUsersData(
        local.clinical_users || [],
        incoming.clinical_users || []
      ).filter((row) => !deletedSet2.has(String(row?.user_id || "")))
    };
  }
  const exportedAt = String(incoming.exportedAt || "") >= String(local.exportedAt || "") ? incoming.exportedAt : local.exportedAt;
  const clinical_users_deleted = mergeClinicalUsersDeletedData(
    local.clinical_users_deleted || [],
    incoming.clinical_users_deleted || []
  );
  const deletedSet = new Set(clinical_users_deleted);
  return {
    version: Math.max(Number(local.version || 1), Number(incoming.version || 1)),
    exportedAt,
    rotationNuevaAt: localNueva || remoteNueva || null,
    rotation_cycles: mergeRotationCyclesData(
      local.rotation_cycles || [],
      incoming.rotation_cycles || []
    ),
    patient_team_assignment: mergePatientTeamAssignmentsData(
      local.patient_team_assignment || [],
      incoming.patient_team_assignment || []
    ),
    team_guardia_today: mergeTeamGuardiaTodayData(
      local.team_guardia_today || [],
      incoming.team_guardia_today || []
    ),
    teams: mergeTeamsData(local.teams || [], incoming.teams || []),
    team_membership: mergeTeamMembershipData(
      local.team_membership || [],
      incoming.team_membership || []
    ),
    active_guardias: mergeActiveGuardiasData(
      local.active_guardias || [],
      incoming.active_guardias || []
    ),
    clinical_users: mergeClinicalUsersData(
      local.clinical_users || [],
      incoming.clinical_users || []
    ).filter((row) => !deletedSet.has(String(row?.user_id || ""))),
    clinical_users_deleted
  };
}
function mergeClinicalOpsFromSourcesData(sources) {
  let merged = null;
  for (const src of sources || []) {
    const snap = src && src.clinicalOps;
    if (!snap || typeof snap !== "object") continue;
    merged = merged ? mergeClinicalOpsSnapshotsData(merged, snap) : { ...snap };
  }
  return merged;
}

// public/js/clinical-ops-lan.mjs
var cachedSnapshot = null;
function dbApi() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
function isClinicalOpsLanAvailable() {
  const api3 = dbApi();
  return !!(api3 && typeof api3.dbClinicalOpsExport === "function" && typeof api3.dbClinicalOpsMerge === "function");
}
async function refreshClinicalOpsSnapshotCache() {
  cachedSnapshot = await collectClinicalOpsForLanSync();
  return cachedSnapshot;
}
async function prepareClinicalOpsForLanSync() {
  if (!isClinicalOpsLanAvailable()) return null;
  return refreshClinicalOpsSnapshotCache();
}
function getCachedClinicalOpsSnapshot() {
  return cachedSnapshot;
}
async function collectClinicalOpsForLanSync() {
  const api3 = dbApi();
  if (!api3 || typeof api3.dbClinicalOpsExport !== "function") return null;
  const res = await api3.dbClinicalOpsExport();
  if (!res || res.ok === false) return null;
  return res.snapshot && typeof res.snapshot === "object" ? res.snapshot : null;
}
async function applyClinicalOpsLanSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return false;
  const api3 = dbApi();
  if (!api3 || typeof api3.dbClinicalOpsMerge !== "function") return false;
  const res = await api3.dbClinicalOpsMerge({ snapshot });
  return !!(res && res.ok !== false);
}
function mergeClinicalOpsFromSources(sources) {
  return mergeClinicalOpsFromSourcesData(sources);
}

// public/js/lan-merge-registry.mjs
var domainMergers = {
  agendaTodosPatients(sources) {
    return mergeLiveSyncBundles(sources);
  },
  patientEntries(sources) {
    return mergeLanPatientEntrySources(sources);
  },
  clinicalOps(sources) {
    return mergeClinicalOpsFromSources(sources);
  },
  manejo(sources) {
    return mergeManejoFromSources(sources);
  }
};
function mergeLiveSyncFullBundles(sources) {
  const list = Array.isArray(sources) ? sources : [];
  const base = domainMergers.agendaTodosPatients(list);
  let entries = domainMergers.patientEntries(list);
  entries = filterEntriesByPatientDeletes(entries, base.patientDeletes || []);
  base.entries = attachTodosMapToPatientEntries(entries, base.todos);
  if (isLanManejoRoomSyncEnabled()) {
    base.manejo = domainMergers.manejo(list);
  }
  base.clinicalOps = domainMergers.clinicalOps(list);
  return base;
}

// public/js/host-bundle-bases.mjs
var BASES_KEY = "rpc-lan-host-bundle-bases";
function readAll() {
  try {
    const raw = localStorage.getItem(BASES_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? o : {};
  } catch (_e) {
    return {};
  }
}
function writeAll(map) {
  localStorage.setItem(BASES_KEY, JSON.stringify(map));
}
function getHostBundleBases(roomId) {
  const rid = String(roomId || "").trim();
  if (!rid) return { revision: 0, entityVersions: {} };
  const row = readAll()[rid];
  if (!row || typeof row !== "object") return { revision: 0, entityVersions: {} };
  return {
    revision: Number(row.revision || 0),
    entityVersions: row.entityVersions && typeof row.entityVersions === "object" ? row.entityVersions : {}
  };
}
function setHostBundleBases(roomId, bundle) {
  const rid = String(roomId || "").trim();
  if (!rid || !bundle) return;
  const all = readAll();
  all[rid] = {
    revision: Number(bundle.revision || 0),
    entityVersions: bundle.entityVersions && typeof bundle.entityVersions === "object" ? bundle.entityVersions : {}
  };
  writeAll(all);
}
function collectKeysFromEnvelope(envelope) {
  const keys = /* @__PURE__ */ new Set();
  if (!envelope || typeof envelope !== "object") return keys;
  const agenda = Array.isArray(envelope.agenda) ? envelope.agenda : [];
  for (const ev of agenda) {
    if (ev && ev.id) keys.add(agendaEntityKey(ev.id));
  }
  const todos = envelope.todos && typeof envelope.todos === "object" ? envelope.todos : {};
  for (const pid of Object.keys(todos)) {
    const arr = Array.isArray(todos[pid]) ? todos[pid] : [];
    for (const t2 of arr) {
      if (t2 && t2.id) keys.add(todoEntityKey(pid, t2.id));
    }
  }
  if (envelope.manejo && typeof envelope.manejo === "object") keys.add("manejo");
  if (envelope.clinicalOps && typeof envelope.clinicalOps === "object") keys.add("clinicalOps");
  return keys;
}
function buildBaseEntityVersionsForEnvelope(envelope, serverEntityVersions) {
  const versions = serverEntityVersions || {};
  const baseEntityVersions = {};
  for (const key of collectKeysFromEnvelope(envelope)) {
    baseEntityVersions[key] = versions[key] != null ? Number(versions[key]) : 0;
  }
  return baseEntityVersions;
}
function hostBundlePutBodyFromEnvelope(roomId, envelope) {
  const bases = getHostBundleBases(roomId);
  return {
    baseRevision: bases.revision,
    baseEntityVersions: buildBaseEntityVersionsForEnvelope(envelope, bases.entityVersions),
    uploadedByClientId: envelope.clientId || "",
    agenda: envelope.agenda || [],
    todos: envelope.todos || {},
    entries: envelope.entries || [],
    manejo: envelope.manejo != null ? envelope.manejo : null,
    clinicalOps: envelope.clinicalOps != null ? envelope.clinicalOps : null
  };
}

// public/js/lan-sync-state.mjs
var RoomSyncPhase = Object.freeze({
  offline: "offline",
  configured: "configured",
  joining: "joining",
  catching_up: "catching_up",
  live: "live",
  degraded: "degraded"
});
var VALID_PHASES = new Set(Object.values(RoomSyncPhase));
var phaseByRoom = /* @__PURE__ */ new Map();
var listeners = /* @__PURE__ */ new Set();
function notify(roomId, phase, meta) {
  const detail = { roomId, phase, meta: meta ?? null };
  listeners.forEach(function(cb) {
    try {
      cb(detail);
    } catch (_e) {
    }
  });
}
function getRoomSyncPhase(roomId) {
  const id = roomId != null ? String(roomId).trim() : "";
  if (!id) return RoomSyncPhase.offline;
  const entry = phaseByRoom.get(id);
  return entry ? entry.phase : RoomSyncPhase.offline;
}
function setRoomSyncPhase(roomId, phase, meta) {
  const id = String(roomId || "").trim();
  const p = String(phase || "").trim();
  if (!id || !VALID_PHASES.has(p)) return;
  phaseByRoom.set(id, { phase: p, meta: meta ?? null });
  notify(id, p, meta);
}
function clearRoomSyncPhase(roomId) {
  const id = String(roomId || "").trim();
  if (!id || !phaseByRoom.has(id)) return;
  phaseByRoom.delete(id);
  notify(id, RoomSyncPhase.offline, null);
}

// public/js/lan-surrogate-host.mjs
var PEERS_KEY = "rpc-lan-live-peers";
var SURROGATE_KEY = "rpc-lan-surrogate-host";
var PRIMARY_HOST_KEY = "rpc-lan-primary-host-url";
var PEER_TTL_MS = 5 * 60 * 1e3;
function rememberPrimaryHostUrl(hostUrl) {
  const url = String(hostUrl || "").trim().replace(/\/+$/, "");
  if (!url) return;
  try {
    localStorage.setItem(PRIMARY_HOST_KEY, url);
  } catch (_e) {
  }
}
function getPrimaryHostUrl() {
  try {
    return String(localStorage.getItem(PRIMARY_HOST_KEY) || "").trim().replace(/\/+$/, "");
  } catch (_e) {
    return "";
  }
}
function readPeersRaw() {
  try {
    const raw = localStorage.getItem(PEERS_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? o : {};
  } catch (_e) {
    return {};
  }
}
function writePeersRaw(map) {
  try {
    localStorage.setItem(PEERS_KEY, JSON.stringify(map || {}));
  } catch (_e) {
  }
}
function pruneLivePeers(nowMs) {
  const now = nowMs != null ? nowMs : Date.now();
  const map = readPeersRaw();
  let changed = false;
  Object.keys(map).forEach((id) => {
    const row = map[id];
    if (!row || now - Number(row.seenAt || 0) > PEER_TTL_MS) {
      delete map[id];
      changed = true;
    }
  });
  if (changed) writePeersRaw(map);
  return map;
}
function recordLivePeer(clientId, meta) {
  const id = String(clientId || "").trim();
  const hostUrl = String(meta && meta.hostUrl ? meta.hostUrl : "").trim().replace(/\/+$/, "");
  if (!id || !hostUrl) return;
  const map = pruneLivePeers();
  map[id] = {
    hostUrl,
    canHost: !!(meta && meta.canHost),
    seenAt: Date.now(),
    clientId: id
  };
  writePeersRaw(map);
}
function listLivePeerHostUrls(excludeClientId) {
  const skip = String(excludeClientId || "").trim();
  const map = pruneLivePeers();
  const urls = [];
  const seen = /* @__PURE__ */ new Set();
  Object.keys(map).forEach((id) => {
    if (id === skip) return;
    const row = map[id];
    if (!row || !row.canHost || !row.hostUrl) return;
    if (seen.has(row.hostUrl)) return;
    seen.add(row.hostUrl);
    urls.push(row.hostUrl);
  });
  urls.sort();
  return urls;
}
function surrogateElectionDelayMs(clientId) {
  const s = String(clientId || "lc");
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = h * 31 + s.charCodeAt(i) >>> 0;
  return 400 + h % 2400;
}
async function pingLanHostUrl(hostUrl, teamCode) {
  const url = String(hostUrl || "").trim().replace(/\/+$/, "");
  if (!url) return false;
  const code = String(teamCode || "").trim();
  try {
    const r = await fetch(`${url}/api/lan/v1/ping`, {
      method: "GET",
      headers: { Authorization: `Bearer ${code}` }
    });
    return !!(r && r.ok);
  } catch (_e) {
    return false;
  }
}
function getSurrogateHostState() {
  try {
    const raw = localStorage.getItem(SURROGATE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || !String(o.formerHostUrl || "").trim()) return null;
    return {
      formerHostUrl: String(o.formerHostUrl).trim().replace(/\/+$/, ""),
      formerTeamCode: String(o.formerTeamCode || "").trim(),
      localHostUrl: String(o.localHostUrl || "").trim().replace(/\/+$/, ""),
      promotedAt: String(o.promotedAt || ""),
      roomId: String(o.roomId || "").trim()
    };
  } catch (_e) {
    return null;
  }
}
function setSurrogateHostState(state) {
  if (!state || !state.formerHostUrl) {
    clearSurrogateHostState();
    return;
  }
  try {
    localStorage.setItem(
      SURROGATE_KEY,
      JSON.stringify({
        formerHostUrl: String(state.formerHostUrl).trim().replace(/\/+$/, ""),
        formerTeamCode: String(state.formerTeamCode || "").trim(),
        localHostUrl: String(state.localHostUrl || "").trim().replace(/\/+$/, ""),
        promotedAt: state.promotedAt || (/* @__PURE__ */ new Date()).toISOString(),
        roomId: String(state.roomId || "").trim()
      })
    );
  } catch (_e) {
  }
}
function clearSurrogateHostState() {
  try {
    localStorage.removeItem(SURROGATE_KEY);
  } catch (_e) {
  }
}
function isSurrogateHostActive() {
  return !!getSurrogateHostState();
}

// public/js/lan-host-pin.mjs
var PINNED_HOST_KEY = "rpc-lan-pinned-host-url";
function getPinnedHostUrl() {
  try {
    return String(localStorage.getItem(PINNED_HOST_KEY) || "").trim().replace(/\/+$/, "");
  } catch (_e) {
    return "";
  }
}
function setPinnedHostUrl(hostUrl) {
  const url = String(hostUrl || "").trim().replace(/\/+$/, "");
  if (!url) {
    clearPinnedHostUrl();
    return;
  }
  try {
    localStorage.setItem(PINNED_HOST_KEY, url);
  } catch (_e) {
  }
}
function clearPinnedHostUrl() {
  try {
    localStorage.removeItem(PINNED_HOST_KEY);
  } catch (_e) {
  }
}

// public/js/live-sync-outbox.mjs
var OUTBOX_KEY = "rpc-lan-sync-outbox";
var MAX_ITEMS_PER_ROOM = 50;
var _ipcFallbackLogged = false;
function getApi() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
function readAll2() {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? o : {};
  } catch (_e) {
    return {};
  }
}
function writeAll2(map) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(map));
}
function enqueueLocal(roomId, item) {
  const rid = String(roomId || "").trim();
  if (!rid || !item || !item.payload) return;
  const all = readAll2();
  const list = Array.isArray(all[rid]) ? all[rid].slice() : [];
  const kind = item.kind === "patch" ? "patch" : item.kind === "clinical_ops" ? "clinical_ops" : "bundle";
  list.push({
    kind,
    payload: item.payload,
    enqueuedAt: item.enqueuedAt || (/* @__PURE__ */ new Date()).toISOString()
  });
  while (list.length > MAX_ITEMS_PER_ROOM) list.shift();
  all[rid] = list;
  writeAll2(all);
}
function drainLocal(roomId) {
  const rid = String(roomId || "").trim();
  if (!rid) return [];
  const all = readAll2();
  const list = Array.isArray(all[rid]) ? all[rid].slice() : [];
  delete all[rid];
  writeAll2(all);
  return list;
}
function sizeLocal(roomId) {
  const rid = String(roomId || "").trim();
  if (!rid) return 0;
  const all = readAll2();
  const list = all[rid];
  return Array.isArray(list) ? list.length : 0;
}
function logIpcFallbackOnce() {
  if (_ipcFallbackLogged) return;
  _ipcFallbackLogged = true;
  if (typeof console !== "undefined" && console.warn) {
    console.warn("[lan-outbox] DB IPC unavailable; using localStorage fallback");
  }
}
async function enqueueOutbox(roomId, item) {
  const api3 = getApi();
  if (api3?.dbLanOutboxEnqueue) {
    return api3.dbLanOutboxEnqueue({
      roomId,
      kind: item.kind,
      payload: item.payload
    });
  }
  logIpcFallbackOnce();
  enqueueLocal(roomId, item);
}
async function drainOutbox(roomId) {
  const api3 = getApi();
  if (api3?.dbLanOutboxDrain) {
    const res = await api3.dbLanOutboxDrain({ roomId });
    if (res?.ok && Array.isArray(res.items)) return res.items;
    return [];
  }
  logIpcFallbackOnce();
  return drainLocal(roomId);
}
async function outboxSize(roomId) {
  const api3 = getApi();
  if (api3?.dbLanOutboxCount) {
    const res = await api3.dbLanOutboxCount({ roomId });
    if (res?.ok && typeof res.count === "number") return res.count;
    return 0;
  }
  return sizeLocal(roomId);
}

// public/js/lan-sync-diagnostics.mjs
var MAX_ERRORS = 5;
var lastErrors = [];
function recordLanSyncError(entry) {
  const row = {
    at: (/* @__PURE__ */ new Date()).toISOString(),
    op: String(entry && entry.op != null ? entry.op : "unknown"),
    code: String(entry && entry.code != null ? entry.code : ""),
    message: String(entry && entry.message != null ? entry.message : "")
  };
  lastErrors.unshift(row);
  if (lastErrors.length > MAX_ERRORS) lastErrors.length = MAX_ERRORS;
}
function getLanSyncDiagnostics(deps2) {
  const d = deps2 && typeof deps2 === "object" ? deps2 : {};
  return {
    hostUrl: String(d.hostUrl || ""),
    pingAt: d.pingAt != null ? d.pingAt : null,
    pingStatus: d.pingStatus != null ? d.pingStatus : null,
    wsSync: !!d.wsSync,
    wsLive: !!d.wsLive,
    liveRoomId: String(d.liveRoomId || ""),
    roomId: String(d.roomId || ""),
    phase: String(d.phase || "offline"),
    bundleRevision: Number(d.bundleRevision || 0),
    outboxCount: Number(d.outboxCount || 0),
    pinnedHost: String(d.pinnedHost || ""),
    teamCodeAligned: d.teamCodeAligned == null ? null : !!d.teamCodeAligned,
    lastErrors: lastErrors.map(function(e) {
      return { at: e.at, op: e.op, code: e.code, message: e.message };
    })
  };
}
function redactLanSecrets(text) {
  return String(text || "").replace(/Bearer\s+[A-Za-z0-9._+/=-]+/gi, "Bearer ***").replace(/"teamCode"\s*:\s*"[^"]*"/gi, '"teamCode":"***"').replace(/teamCode[=:]\s*[A-Za-z0-9._+/=-]+/gi, "teamCode=***").replace(/"code"\s*:\s*"[A-Za-z0-9._+/=-]{8,}"/gi, '"code":"***"');
}
function formatDiagnosticsReport(diag) {
  const payload = diag && typeof diag === "object" ? diag : getLanSyncDiagnostics();
  return redactLanSecrets(JSON.stringify(payload, null, 2));
}

// public/js/lan-lww-toast.mjs
var DEBOUNCE_MS = 6e4;
var recentToasts = /* @__PURE__ */ new Map();
function toastKey(entityType, entityId) {
  return `${entityType}:${entityId || "*"}`;
}
function shouldShowLwwToast(entityType, entityId) {
  const key = toastKey(entityType, entityId);
  const now = Date.now();
  const last = recentToasts.get(key);
  if (last != null && now - last < DEBOUNCE_MS) {
    return false;
  }
  recentToasts.set(key, now);
  return true;
}
function lwwToastMessage(entityType) {
  const type = String(entityType || "").toLowerCase();
  if (type === "patient") {
    return "Paciente sincronizado; otro cambio en la sala pudo reemplazar cuarto/cama.";
  }
  if (type === "todo") {
    return "Pendiente sincronizado; se aplic\xF3 la versi\xF3n m\xE1s reciente.";
  }
  if (type === "bundle" || type === "sync-bundle") {
    return "Sala actualizada; algunos datos se fusionaron por fecha.";
  }
  return "Sala actualizada; algunos datos se fusionaron por fecha.";
}
function notifyLwwOverwrite(runtime6, { entityType, entityId, overwrittenKeys } = {}) {
  if (!runtime6 || typeof runtime6.showToast !== "function") return;
  if (!storage.getLanLwwOverwriteToast()) return;
  const type = String(entityType || "").toLowerCase();
  const keys = Array.isArray(overwrittenKeys) ? overwrittenKeys : [];
  const isBundle = type === "bundle" || type === "sync-bundle";
  if (keys.length === 0 && !isBundle) return;
  if (!shouldShowLwwToast(entityType, entityId)) return;
  runtime6.showToast(lwwToastMessage(entityType), "info");
}

// public/js/lan-sync-bundle-push.mjs
var _bundlePushPausedUntil = {};
function pauseBundlePushForRoom(roomId, ms) {
  var rid = String(roomId || "*").trim() || "*";
  var n = Math.max(1e3, Number(ms) || 3e4);
  _bundlePushPausedUntil[rid] = Date.now() + n;
  if (rid !== "*") _bundlePushPausedUntil["*"] = Date.now() + n;
}
function isBundlePushPaused(roomId) {
  var rid = String(roomId || "").trim();
  var until = Math.max(
    Number(_bundlePushPausedUntil[rid] || 0),
    Number(_bundlePushPausedUntil["*"] || 0)
  );
  return Date.now() < until;
}

// public/js/features/chrome.mjs
var runtime = {
  switchAppTab() {
  },
  renderPatientList() {
  },
  scrollActiveRondaCardIntoView() {
  },
  renderProcedureAgendaPanel() {
  },
  getActiveAppTab() {
    return "lab";
  },
  getActiveInner() {
    return "todo";
  },
  getActiveId() {
    return null;
  },
  setRoundOverviewMode() {
  },
  renderPaseBoard() {
  }
};
var _openedDetailFromPase = false;
function registerChromeRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(runtime, ctx);
}
var THEME_ICON_SUN = '<svg class="btn-header-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
var THEME_ICON_MOON = '<svg class="btn-header-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
var FONT_ZOOM_LS = "rpc-font-zoom";
var HIGH_CONTRAST_LS = "rpc-high-contrast";
var UI_DENSITY_LS = "rpc-ui-density";
var I18N_ES = {
  "settings.appearance": "Apariencia",
  "settings.themeGroup": "Tema de la aplicaci\xF3n",
  "settings.themeLight": "Claro",
  "settings.themeDark": "Oscuro",
  "settings.fontSize": "Tama\xF1o de texto",
  "settings.fontSizeHint": "Escala toda la interfaz (\xFAtil en pantallas peque\xF1as).",
  "settings.fontNormal": "Normal",
  "settings.fontLarge": "Grande",
  "settings.fontXLarge": "M\xE1s grande",
  "settings.uiDensity": "Modo de vista",
  "settings.uiDensityHint": "Normal: Laboratorio, Expediente, Medicamentos y Agenda en pesta\xF1as completas (vista Ronda centrada). Pase: resumen del paciente en una columna; pulsa un t\xEDtulo de secci\xF3n para abrir el detalle en Normal. \u2318P o Ctrl+P alterna.",
  "settings.densityNormal": "Normal",
  "settings.densityPase": "Pase",
  "settings.highContrast": "Alto contraste",
  "settings.highContrastHint": "Aumenta el contraste de texto y bordes para mejor legibilidad.",
  "settings.hcOff": "Desactivado",
  "settings.hcOn": "Activado",
  "settings.docsFolder": "Carpeta de documentos",
  "settings.docsFolderHint": "Los .docx generados se guardan aqu\xED (si no eliges carpeta, se usa Descargas).",
  "settings.backup": "Respaldo local",
  "settings.backupHint": "Exporta o restaura pacientes, notas e indicaciones (JSON).",
  "settings.application": "Aplicaci\xF3n",
  "settings.quickHelp": "Centro de ayuda \xB7 atajos y tours",
  "settings.version": "Versi\xF3n",
  "settings.checkUpdates": "Buscar actualizaciones\u2026",
  "settings.open": "Abrir ajustes",
  "settings.openTitle": "Ajustes",
  "settings.teamSyncAria": "Abrir conexi\xF3n LAN y LiveSync (salas)",
  "settings.teamSyncTitle": "Conexi\xF3n LAN (\u21C4): crear o unirse a sala en vivo, copiar invitaci\xF3n. C\xF3digo del servidor (avanzado): Ajustes \u2192 LAN \xB7 servidor en esta computadora. Paquete sync JSON: Ajustes \u2192 Respaldos, sync y recuperaci\xF3n.",
  "theme.toggle": "Cambiar tema claro u oscuro",
  "theme.toggleTitle": "Cambiar tema",
  "appTab.lab": "Laboratorio",
  "appTab.nota": "Expediente",
  "appTab.med": "Medicamentos",
  "appTab.agenda": "Agenda",
  "roundMode.hint": "Ronda: paciente siguiente / anterior",
  "roundMode.seenTitle": "Visto en ronda (se reinicia cada d\xEDa)",
  "roundMode.sectionNota": "Nota e indicaciones",
  "roundMode.sectionLabs": "Laboratorio reciente",
  "roundMode.sectionTodos": "Pendientes"
};
function t(key) {
  if (I18N_ES && Object.prototype.hasOwnProperty.call(I18N_ES, key)) return I18N_ES[key];
  return key;
}
function applyI18n() {
  const htmlEl = document.documentElement;
  if (htmlEl && htmlEl.getAttribute("lang") !== "es") htmlEl.setAttribute("lang", "es");
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const val = t(key);
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      if (el.type === "button" || el.type === "submit" || el.type === "reset") el.value = val;
      else el.setAttribute("placeholder", val);
    } else {
      el.textContent = val;
    }
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria-label");
    if (key) el.setAttribute("aria-label", t(key));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (key) el.setAttribute("title", t(key));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) el.setAttribute("placeholder", t(key));
  });
}
function syncThemeSettingsButtons() {
  const isDark = document.documentElement.classList.contains("dark");
  const lightBtn = document.getElementById("settings-theme-light");
  const darkBtn = document.getElementById("settings-theme-dark");
  if (lightBtn) lightBtn.classList.toggle("active", !isDark);
  if (darkBtn) darkBtn.classList.toggle("active", isDark);
}
function syncThemeToggleIcon() {
  const themeBtn = document.getElementById("theme-toggle");
  if (!themeBtn) return;
  const isDark = document.documentElement.classList.contains("dark");
  themeBtn.innerHTML = isDark ? THEME_ICON_MOON : THEME_ICON_SUN;
}
function setThemeMode(mode) {
  const isDark = mode === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  localStorage.setItem("theme", isDark ? "dark" : "light");
  syncThemeToggleIcon();
  syncThemeSettingsButtons();
}
function applyFontZoom() {
  let p = parseInt(localStorage.getItem(FONT_ZOOM_LS) || "100", 10);
  if (!Number.isFinite(p)) p = 100;
  if (p < 90) p = 90;
  if (p > 140) p = 140;
  document.documentElement.style.zoom = String(p / 100);
}
function syncFontZoomButtons() {
  let p = parseInt(localStorage.getItem(FONT_ZOOM_LS) || "100", 10);
  if (p !== 100 && p !== 110 && p !== 125) p = 100;
  ["100", "110", "125"].forEach((v) => {
    const btn = document.getElementById("settings-font-" + v);
    if (btn) btn.classList.toggle("active", p === parseInt(v, 10));
  });
}
function setFontZoom(pct) {
  localStorage.setItem(FONT_ZOOM_LS, String(pct));
  applyFontZoom();
  syncFontZoomButtons();
}
function toggleTheme() {
  setThemeMode(document.documentElement.classList.contains("dark") ? "light" : "dark");
}
function isHighContrast() {
  return localStorage.getItem(HIGH_CONTRAST_LS) === "1";
}
function applyHighContrast() {
  document.documentElement.classList.toggle("high-contrast", isHighContrast());
}
function syncHighContrastButtons() {
  const on = isHighContrast();
  const onBtn = document.getElementById("settings-hc-on");
  const offBtn = document.getElementById("settings-hc-off");
  if (onBtn) {
    onBtn.classList.toggle("active", on);
    onBtn.setAttribute("aria-pressed", on ? "true" : "false");
  }
  if (offBtn) {
    offBtn.classList.toggle("active", !on);
    offBtn.setAttribute("aria-pressed", !on ? "true" : "false");
  }
}
function setHighContrast(on) {
  localStorage.setItem(HIGH_CONTRAST_LS, on ? "1" : "0");
  applyHighContrast();
  syncHighContrastButtons();
}
function toggleHighContrast() {
  setHighContrast(!isHighContrast());
}
function getUiDensity() {
  const raw = localStorage.getItem(UI_DENSITY_LS);
  if (raw === "guardia") return "guardia";
  if (raw === "pase" || raw === "compact") return "pase";
  if (raw === "normal" || raw === "comfortable") return "normal";
  return "normal";
}
function isPaseMode() {
  return getUiDensity() === "pase";
}
function isGuardiaMode() {
  return getUiDensity() === "guardia";
}
function markOpenedDetailFromPaseBoard() {
  _openedDetailFromPase = true;
  syncPaseReturnHeaderBtn();
  syncPaseModeHeaderChip();
}
function clearPaseDetailEscape() {
  _openedDetailFromPase = false;
  syncPaseReturnHeaderBtn();
  syncPaseModeHeaderChip();
}
function paseSectionLabelFromContext() {
  var tab = runtime.getActiveAppTab();
  if (tab === "lab") return "Laboratorio";
  if (tab === "med") return "Medicamentos";
  if (tab === "agenda") return "Agenda";
  if (tab === "nota") {
    var inner = runtime.getActiveInner() || "todo";
    if (inner === "notas") return "Nota";
    if (inner === "indica") return "Indicaciones";
    if (inner === "tend") return "Tendencias";
    if (inner === "cult") return "Cultivos";
    if (inner === "listado") return "Listado";
    if (inner === "datos") return "Datos";
    if (inner === "todo") return "Pendientes";
    if (inner === "manejo") return "Manejo";
    if (inner === "recetaHu") return "Receta HU";
  }
  return "Expediente";
}
function syncPaseModeHeaderChip() {
  var chip = document.getElementById("header-pase-mode-chip");
  if (!chip) return;
  chip.style.display = isPaseMode() ? "inline-flex" : "none";
}
function syncGuardiaModeHeaderChip() {
  var chip = document.getElementById("header-guardia-mode-chip");
  if (!chip) return;
  chip.style.display = "inline-flex";
  chip.classList.toggle("header-guardia-mode-chip--active", isGuardiaMode());
  chip.setAttribute("aria-pressed", isGuardiaMode() ? "true" : "false");
  var label = chip.querySelector(".header-guardia-mode-label");
  if (label) label.textContent = "Vista guardia";
}
function toggleGuardiaMode() {
  if (isGuardiaMode()) {
    setUiDensity("normal");
    return;
  }
  clearPaseDetailEscape();
  setUiDensity("guardia");
}
function exitGuardiaModeFromHeader() {
  if (isGuardiaMode()) setUiDensity("normal");
}
function exitPaseModeFromHeader() {
  if (getUiDensity() !== "pase") return;
  clearPaseDetailEscape();
  setUiDensity("normal");
}
function syncPaseReturnHeaderBtn() {
  var show = _openedDetailFromPase && getUiDensity() === "normal";
  var crumb = document.getElementById("header-pase-breadcrumb");
  var section = document.getElementById("header-pase-breadcrumb-section");
  var btn = document.getElementById("btn-header-return-pase");
  if (crumb) crumb.style.display = show ? "inline-flex" : "none";
  if (section && show) section.textContent = paseSectionLabelFromContext();
  if (btn) btn.style.display = "none";
  syncPaseModeHeaderChip();
}
function returnToPaseBoardFromDetail() {
  if (!_openedDetailFromPase) return;
  clearPaseDetailEscape();
  setUiDensity("pase");
  runtime.setRoundOverviewMode(true);
  runtime.switchAppTab("nota");
  if (typeof runtime.renderPaseBoard === "function") runtime.renderPaseBoard();
}
function applyUiDensity() {
  const density = getUiDensity();
  document.documentElement.classList.toggle("ui-density-normal", density === "normal");
  document.documentElement.classList.toggle("ui-density-guardia", density === "guardia");
  const rondaHint = document.getElementById("sidebar-ronda-hint");
  if (rondaHint) {
    rondaHint.setAttribute("aria-hidden", density !== "normal" ? "false" : "true");
  }
  if (isPaseMode()) runtime.setRoundOverviewMode(true);
  var paseRoot = document.getElementById("appcontent-pase");
  if (isPaseMode() && paseRoot) {
    paseRoot.style.display = "flex";
    paseRoot.style.flexDirection = "column";
    paseRoot.style.flex = "1";
    paseRoot.style.minHeight = "0";
    paseRoot.style.overflow = "hidden";
    paseRoot.setAttribute("aria-hidden", "false");
  } else if (paseRoot) {
    paseRoot.style.display = "none";
    paseRoot.setAttribute("aria-hidden", "true");
  }
  var guardiaRoot = document.getElementById("appcontent-guardia");
  if (guardiaRoot && !isGuardiaMode()) {
    guardiaRoot.style.display = "none";
    guardiaRoot.setAttribute("aria-hidden", "true");
  }
  runtime.switchAppTab(runtime.getActiveAppTab());
  syncPaseReturnHeaderBtn();
  syncPaseModeHeaderChip();
  syncGuardiaModeHeaderChip();
  if (typeof runtime.renderGuardiaBoard === "function" && isGuardiaMode()) {
    runtime.renderGuardiaBoard();
  }
  if (typeof runtime.syncLabOutputChrome === "function") runtime.syncLabOutputChrome();
}
function syncUiDensityButtons() {
  const d = getUiDensity();
  const normalBtn = document.getElementById("settings-density-normal");
  const paseBtn = document.getElementById("settings-density-pase");
  if (normalBtn) {
    normalBtn.classList.toggle("active", d === "normal");
    normalBtn.setAttribute("aria-pressed", d === "normal" ? "true" : "false");
  }
  if (paseBtn) {
    paseBtn.classList.toggle("active", d === "pase");
    paseBtn.setAttribute("aria-pressed", d === "pase" ? "true" : "false");
  }
}
function setUiDensity(mode) {
  let m = mode === "guardia" ? "guardia" : mode === "pase" || mode === "compact" ? "pase" : "normal";
  if (mode === "comfortable") m = "normal";
  if (m === "pase" || m === "guardia") clearPaseDetailEscape();
  localStorage.setItem(UI_DENSITY_LS, m);
  applyUiDensity();
  syncUiDensityButtons();
  runtime.renderPatientList();
  if (runtime.getActiveId()) {
    requestAnimationFrame(() => runtime.scrollActiveRondaCardIntoView());
  }
  if (runtime.getActiveAppTab() === "agenda") runtime.renderProcedureAgendaPanel();
  if (isGuardiaMode() && typeof runtime.renderGuardiaBoard === "function") {
    runtime.renderGuardiaBoard();
  }
}
function getProcedureAgendaRowPx() {
  return getUiDensity() === "normal" ? 50 : 42;
}
function initChromeAppearance() {
  if (localStorage.getItem("theme") === "dark") {
    document.documentElement.classList.add("dark");
  }
  syncThemeToggleIcon();
  applyHighContrast();
  applyUiDensity();
  applyI18n();
  applyFontZoom();
  syncThemeSettingsButtons();
  syncFontZoomButtons();
  syncHighContrastButtons();
  syncUiDensityButtons();
}
function launchConfetti() {
  var colors = ["#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#fb7185"];
  for (var i = 0; i < 40; i++) {
    (function(idx) {
      setTimeout(function() {
        var el = document.createElement("div");
        el.className = "confetti-piece";
        el.style.left = Math.random() * 100 + "vw";
        el.style.top = "-10px";
        el.style.background = colors[Math.floor(Math.random() * colors.length)];
        el.style.animationDelay = Math.random() * 0.5 + "s";
        el.style.transform = "rotate(" + Math.random() * 360 + "deg)";
        document.body.appendChild(el);
        setTimeout(function() {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 3500);
      }, idx * 40);
    })(i);
  }
}
var windowHandlers = {
  toggleTheme,
  setThemeMode,
  setFontZoom,
  setUiDensity,
  setHighContrast,
  toggleHighContrast,
  returnToPaseBoardFromDetail,
  exitPaseModeFromHeader,
  toggleGuardiaMode,
  exitGuardiaModeFromHeader,
  t
};

// public/js/features/crypto-signer.mjs
function api() {
  return typeof window !== "undefined" ? window.electronAPI : null;
}
async function signClinicalChange(params) {
  const electron = api();
  if (!electron || typeof electron.dbSignClinicalChange !== "function") {
    throw new Error("Clinical signing unavailable in this environment");
  }
  const res = await electron.dbSignClinicalChange(params);
  if (!res || res.ok === false) {
    throw new Error(res?.error || "SIGN_FAILED");
  }
  return res.signed;
}
async function verifyIncomingPeerChange(transactionBody, signatureHex, publicPemKey) {
  const electron = api();
  if (!electron || typeof electron.dbVerifyClinicalChange !== "function") {
    return false;
  }
  const res = await electron.dbVerifyClinicalChange({
    transactionBody,
    signature: signatureHex,
    publicKeyPem: publicPemKey
  });
  return !!(res && res.ok && res.valid);
}

// public/js/guardia-mode-sync.mjs
function setGuardiaMode(active, opts = {}) {
  clinicalSessionContext.guardiaMode = !!active;
  syncGuardiaModeUI(opts);
}
function syncGuardiaModeUI(opts = {}) {
  const active = !!clinicalSessionContext.guardiaMode;
  if (typeof document !== "undefined") {
    const hubCheck = document.getElementById("lan-hub-guardia-toggle");
    if (hubCheck) hubCheck.checked = active;
    const boardBtn = document.getElementById("btn-guardia-mode-toggle");
    if (boardBtn) {
      boardBtn.setAttribute("aria-pressed", String(active));
      boardBtn.classList.toggle("is-active", active);
      const label = boardBtn.querySelector(".guardia-mode-label");
      if (label) label.textContent = active ? "Solo mis entregas" : "Censo completo";
    }
  }
  if (opts.rerenderBoard) {
    const render = opts.renderGuardiaBoard;
    if (typeof render === "function") {
      render(opts.settings);
      return;
    }
    if (typeof globalThis.renderGuardiaBoard === "function") {
      let settings = opts.settings;
      if (!settings) {
        try {
          settings = JSON.parse(localStorage.getItem("rpc-settings") || "{}");
        } catch (_e) {
          settings = {};
        }
      }
      globalThis.renderGuardiaBoard(settings);
    }
  }
}
function toggleGuardiaMode2(opts = {}) {
  setGuardiaMode(!clinicalSessionContext.guardiaMode, { ...opts, rerenderBoard: true });
}

// public/js/vpo-dx-inference.mjs
function normalizePlusSeparators(text) {
  return String(text || "").replace(/[\uFF0B\u2795]/g, "+").replace(/\s+\+\s+/g, " + ");
}
function parseDiagnosticosText(text) {
  var raw = normalizePlusSeparators(String(text || "").trim());
  if (!raw) return [];
  var parts = /\+/.test(raw) ? raw.split(/\s*\+\s*/) : raw.split(/\r?\n/);
  return parts.map(function(p) {
    return String(p || "").trim().replace(/^\d+\.\s*/, "").toUpperCase();
  }).filter(Boolean);
}
function formatDiagnosticosCopy(list) {
  return (list || []).map(function(d, i) {
    return i + 1 + ". " + String(d || "").trim();
  }).filter(function(line) {
    return line.length > 2;
  }).join("\n");
}
function normDx(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function anyDxMatch(list, re) {
  for (var i = 0; i < list.length; i++) {
    if (re.test(normDx(list[i]))) return true;
  }
  return false;
}
function inferRiskFromDiagnosticos(diagnosticosList) {
  var list = (diagnosticosList || []).filter(Boolean);
  var rcri = {
    cardiopatiaIsquemica: anyDxMatch(list, /isquemi|infarto agudo|iam\b|angina|coronari|cardiopatia isquemica/),
    insuficienciaCardiaca: anyDxMatch(
      list,
      /insuficiencia cardiaca|fevi reducida|icc\b|ic con|ic cronic|falla cardiaca|heart failure/
    ),
    evc: anyDxMatch(list, /\bevc\b|ait\b|acv\b|ictus|infarto cerebral|evento cerebrovascular/),
    dmInsulina: anyDxMatch(
      list,
      /dm tipo 1|diabetes mellitus tipo 1|insulinodepend|con insulina|dm con insulina|diabet.*insulin/
    )
  };
  var caprini = {
    imcMayor25: anyDxMatch(list, /obesidad|obeso|imc\s*>?\s*25|sobrepeso morbido/),
    insuficienciaVenosa: anyDxMatch(list, /varices|insuficiencia venosa|\bivc\b/),
    reposoMovilidadReducida: anyDxMatch(list, /reposo prolongado|inmovil|paraplej|tetraplej|movilidad reducida/),
    antecedenteEvc: anyDxMatch(
      list,
      /tromboembolia venosa|\btev\b|embolia pulmonar|trombosis venosa|tvpe\b/
    ),
    trombofilia: anyDxMatch(list, /trombofilia/),
    esteroideCronico: anyDxMatch(list, /esteroide cronico|corticoterapia cronica|prednisona cronica/),
    artritisInflamatoria: anyDxMatch(
      list,
      /artritis reumatoide|lupus|artritis inflamatoria|enfermedad inflamatoria/
    )
  };
  var ariscat = {
    infeccionRespiratoriaUltimoMes: anyDxMatch(
      list,
      /infeccion respiratoria|neumonia reciente|neumonia aguda|iras\b/
    )
  };
  var asaKey = "";
  if (anyDxMatch(list, /moribundo|shock refractario|falla multiorganica|paro cardiaco/)) {
    asaKey = "asa-v";
  } else if (anyDxMatch(
    list,
    /erc estadio 5|enfermedad renal cronica estadio 5|estadio v\b|dialisis peritoneal|hemodialisis|sepsis severa|insuficiencia respiratoria aguda|falla hepatica aguda/
  )) {
    asaKey = "asa-iv";
  } else if (anyDxMatch(
    list,
    /insuficiencia cardiaca|fevi reducida|cardiopatia isquemica|epoc gold|epoc severa|cirrosis|cancer activo|leucemia|linfoma|vih avanzado|diabetes mellitus tipo 2 complicada|peritonitis/
  )) {
    asaKey = "asa-iii";
  } else if (anyDxMatch(list, /diabetes mellitus|hipertension|hta\b|asma|epoc|hipotiroidismo|anemia cronica/)) {
    asaKey = "asa-ii";
  }
  return { rcri, caprini, ariscat, asaKey };
}
function applyDiagnosticosInference(state) {
  if (isVpoDxInferenceHidden()) return;
  var list = (state.diagnosticosList || []).filter(function(d) {
    return String(d || "").trim();
  });
  var inf = inferRiskFromDiagnosticos(list);
  if (!state.rcri) state.rcri = {};
  if (!state.caprini) state.caprini = {};
  if (!state.ariscat) state.ariscat = {};
  Object.keys(inf.rcri).forEach(function(k) {
    if (inf.rcri[k]) state.rcri[k] = true;
  });
  Object.keys(inf.caprini).forEach(function(k) {
    if (inf.caprini[k]) state.caprini[k] = true;
  });
  Object.keys(inf.ariscat).forEach(function(k) {
    if (inf.ariscat[k]) state.ariscat[k] = true;
  });
  state.diagnosticosText = formatDiagnosticosCopy(list);
  if (inf.asaKey && (!state.asaKey || state.asaFromDiagnosticos)) {
    state.asaKey = inf.asaKey;
    state.asaFromDiagnosticos = true;
  }
  if (!list.length) state.asaFromDiagnosticos = false;
}

// public/js/patient-date-fields.mjs
var ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
var DMY_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
function accesoFechaToDateInputValue(raw) {
  var s = String(raw == null ? "" : raw).trim();
  if (!s) return "";
  if (ISO_RE.test(s)) return s;
  var m = DMY_RE.exec(s);
  if (!m) return "";
  var d = m[1].padStart(2, "0");
  var mo = m[2].padStart(2, "0");
  var y = m[3];
  return y + "-" + mo + "-" + d;
}
function dateInputValueToAccesoFecha(isoValue) {
  var s = String(isoValue == null ? "" : isoValue).trim();
  return ISO_RE.test(s) ? s : "";
}
function formatAccesoFechaDisplay(raw) {
  var s = String(raw == null ? "" : raw).trim();
  if (!s) return "";
  var m = ISO_RE.exec(s);
  if (m) return m[3] + "/" + m[2] + "/" + m[1];
  return s;
}

// public/js/patient-accesos.mjs
var VIA_ACCESO_LABELS = {
  periferica: "EV perif\xE9rica",
  cvc: "CVC",
  picc: "PICC"
};
function viaAccesoLabel(via) {
  var key = String(via || "").trim();
  return VIA_ACCESO_LABELS[key] || key;
}
function ensurePatientAccesos(patient) {
  if (!patient) return;
  if (!Array.isArray(patient.accesosList)) {
    patient.accesosList = [];
    if (patient.viaAcceso || patient.accesoFecha) {
      patient.accesosList.push({
        via: String(patient.viaAcceso || "").trim(),
        fecha: String(patient.accesoFecha || "").trim()
      });
    }
  }
  patient.accesosList = patient.accesosList.map(function(a) {
    return {
      via: String(a && a.via != null ? a.via : "").trim(),
      fecha: String(a && a.fecha != null ? a.fecha : "").trim()
    };
  });
  if (!patient.accesosList.length) {
    patient.accesosList = [{ via: "", fecha: "" }];
  }
  syncLegacyAccesoFields(patient);
}
function syncLegacyAccesoFields(patient) {
  if (!patient) return;
  var list = (patient.accesosList || []).filter(function(a) {
    return String(a && a.via || "").trim();
  });
  var primary = list.find(function(a) {
    return a.via === "cvc";
  }) || list[0];
  if (primary) {
    patient.viaAcceso = primary.via;
    patient.accesoFecha = primary.fecha || "";
  } else {
    patient.viaAcceso = "";
    patient.accesoFecha = "";
  }
}
function formatAccesosForCenso(patient) {
  ensurePatientAccesos(patient);
  return (patient.accesosList || []).map(function(a) {
    var via = viaAccesoLabel(a.via);
    var fecha = formatAccesoFechaDisplay(a.fecha);
    if (!via && !fecha) return "";
    if (via && fecha) return via + " " + fecha;
    return via || fecha;
  }).filter(Boolean).join("\n");
}
function mergeAccesosPatientFields(target, source) {
  if (!target || !source) return;
  if (Array.isArray(source.accesosList) && source.accesosList.length) {
    target.accesosList = source.accesosList.map(function(a) {
      return {
        via: String(a && a.via != null ? a.via : "").trim(),
        fecha: String(a && a.fecha != null ? a.fecha : "").trim()
      };
    });
    ensurePatientAccesos(target);
    return;
  }
  if (source.viaAcceso || source.accesoFecha) {
    if (!Array.isArray(target.accesosList) || !target.accesosList.some(function(a) {
      return String(a && a.via || "").trim();
    })) {
      target.viaAcceso = source.viaAcceso || target.viaAcceso;
      target.accesoFecha = source.accesoFecha || target.accesoFecha;
      ensurePatientAccesos(target);
    }
  }
}

// public/js/patient-diagnosticos.mjs
function ensurePatientDiagnosticos(patient) {
  if (!patient) return;
  if (!Array.isArray(patient.diagnosticosList)) patient.diagnosticosList = [];
  if (!patient.diagnosticosList.length && patient.diagnosticosText) {
    patient.diagnosticosList = parseDiagnosticosText(String(patient.diagnosticosText));
  }
  if (!patient.diagnosticosList.length) patient.diagnosticosList = [""];
  var normalized = patient.diagnosticosList.map(function(d) {
    return String(d || "").trim().toUpperCase();
  });
  patient.diagnosticosList = normalized;
  var nonEmpty = normalized.filter(Boolean);
  patient.diagnosticosText = formatDiagnosticosCopy(nonEmpty);
}
var CENSO_MAX_DIAGNOSTICOS = 3;
function diagnosticosTextForCenso(list, options) {
  var max = options && options.max != null ? options.max : CENSO_MAX_DIAGNOSTICOS;
  return (list || []).map(function(d) {
    return String(d || "").trim().toUpperCase();
  }).filter(Boolean).slice(0, max).join(" + ");
}
function migratePatientDiagnosticosFromVpo(patient, vpoState) {
  if (!patient || !vpoState) return false;
  var has = (patient.diagnosticosList || []).some(function(d) {
    return String(d).trim();
  });
  if (has) return false;
  var from = (vpoState.diagnosticosList || []).filter(function(d) {
    return String(d).trim();
  });
  if (!from.length) return false;
  patient.diagnosticosList = from.map(function(d) {
    return String(d).trim().toUpperCase();
  }).concat([""]);
  ensurePatientDiagnosticos(patient);
  return true;
}
function applyPatientDiagnosticosList(patient, list) {
  patient.diagnosticosList = list;
  ensurePatientDiagnosticos(patient);
}
function preloadNoteDxFromPatient(note, patient) {
  if (!note || !patient) return false;
  var dx = note.diagnosticos || [];
  var empty = !dx.some(function(d) {
    return String(d).trim();
  });
  if (!empty) return false;
  ensurePatientDiagnosticos(patient);
  var from = (patient.diagnosticosList || []).filter(function(d) {
    return String(d).trim();
  });
  if (!from.length) return false;
  note.diagnosticos = from.slice();
  return true;
}
function mergeCensoPatientFields(target, source) {
  if (!target || !source) return;
  mergeAccesosPatientFields(target, source);
  if (source.censoMedsText) target.censoMedsText = source.censoMedsText;
  if (Array.isArray(source.diagnosticosList) && source.diagnosticosList.length) {
    target.diagnosticosList = source.diagnosticosList;
    if (source.diagnosticosText) target.diagnosticosText = source.diagnosticosText;
    else ensurePatientDiagnosticos(target);
  }
}
function pushDiagnosticosToPatient(patient, list) {
  if (!patient) return;
  var cleaned = (list || []).map(function(d) {
    return String(d || "").trim().toUpperCase();
  }).filter(Boolean);
  applyPatientDiagnosticosList(patient, cleaned.length ? cleaned.concat([""]) : [""]);
}

// lib/entrega/entrega-handoff-context.mjs
var CLINICAL_STATUS_OPTIONS = [
  { value: "", label: "\u2014 Seleccionar \u2014" },
  { value: "stable", label: "Estable" },
  { value: "unstable", label: "Inestable" },
  { value: "critical", label: "Cr\xEDtico / deterioro" },
  { value: "postop", label: "Postoperatorio inmediato" }
];
var VASOPRESSOR_AGENTS = [
  { value: "norepinefrina", label: "Norepinefrina", short: "Nore" },
  { value: "vasopresina", label: "Vasopresina", short: "Vasopresina" }
];
var VASOPRESSOR_UNIT_LABELS = {
  mcg_kg_min: "mcg/kg/min",
  mcg_min: "mcg/min",
  ui_min: "UI/min"
};
var VASOPRESSOR_INFUSION_DEFAULTS = {
  norepinefrina: { dose: "0.05", unit: "mcg_kg_min" },
  vasopresina: { dose: "0.03", unit: "ui_min" }
};
var AGENT_ALIASES = {
  norepinefrina: "norepinefrina",
  nore: "norepinefrina",
  vasopresina: "vasopresina"
};
function normalizeVasopressorAgent(agent) {
  const key = String(agent || "").trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (key.includes("vasopres")) return "vasopresina";
  if (key.includes("nore") || key.includes("levophed")) return "norepinefrina";
  return AGENT_ALIASES[key] || "";
}
function defaultVasopressorInfusion(agent) {
  const norm = normalizeVasopressorAgent(agent);
  return VASOPRESSOR_INFUSION_DEFAULTS[norm] || {
    dose: "",
    unit: "mcg_kg_min"
  };
}
function coerceVasopressorUnit(agent, unit) {
  const normAgent = normalizeVasopressorAgent(agent);
  if (normAgent === "vasopresina") return "ui_min";
  if (unit === "mcg_min" || unit === "mcg_kg_min") return unit;
  return "mcg_kg_min";
}
function parseVasopressorRate(rate) {
  const raw = String(rate || "").trim();
  if (!raw) return { dose: "", unit: "mcg_kg_min" };
  const ui = raw.match(/([\d.]+)\s*UI\s*\/\s*min/i);
  if (ui) return { dose: ui[1], unit: "ui_min" };
  const perKg = raw.match(/([\d.]+)\s*mcg\s*\/\s*kg\s*\/\s*min/i);
  if (perKg) return { dose: perKg[1], unit: "mcg_kg_min" };
  const perMin = raw.match(/([\d.]+)\s*mcg\s*\/\s*min/i);
  if (perMin) return { dose: perMin[1], unit: "mcg_min" };
  const num = raw.match(/([\d.]+)/);
  return { dose: num ? num[1] : "", unit: "mcg_kg_min" };
}
function formatVasopressorInfusion(vas) {
  const agent = normalizeVasopressorAgent(vas?.agent);
  const dose = String(vas?.dose || "").trim();
  const unit = coerceVasopressorUnit(agent, vas?.unit);
  if (!dose) return "";
  const agentLabel = VASOPRESSOR_AGENTS.find((a) => a.value === agent)?.short || VASOPRESSOR_AGENTS.find((a) => a.value === agent)?.label || "";
  const unitLabel = VASOPRESSOR_UNIT_LABELS[unit] || "";
  return [agentLabel, dose, unitLabel].filter(Boolean).join(" ");
}
function normalizeVasopressor(vas) {
  const active = !!(vas?.active || vas?.agent || vas?.dose || vas?.rate);
  let agent = normalizeVasopressorAgent(vas?.agent);
  let dose = String(vas?.dose || "").trim();
  let unit = coerceVasopressorUnit(agent, vas?.unit);
  if (!dose && vas?.rate) {
    const parsed = parseVasopressorRate(vas.rate);
    dose = parsed.dose;
    if (!vas?.unit) unit = parsed.unit;
  }
  if (active && agent && !dose) {
    const defaults = defaultVasopressorInfusion(agent);
    dose = defaults.dose;
    unit = defaults.unit;
  }
  if (active && !agent) {
    agent = "norepinefrina";
    const defaults = defaultVasopressorInfusion(agent);
    if (!dose) dose = defaults.dose;
    unit = defaults.unit;
  }
  unit = coerceVasopressorUnit(agent, unit);
  return {
    active,
    agent,
    dose,
    unit,
    rate: formatVasopressorInfusion({ agent, dose, unit })
  };
}
var VENTILATION_MODES = [
  { value: "", label: "\u2014 Sin especificar \u2014" },
  { value: "room_air", label: "Ambiente / c\xE1nula nasal" },
  { value: "hfnc", label: "Alto flujo (LAF)" },
  { value: "niv", label: "VMNI" },
  { value: "invasive", label: "VMI" },
  { value: "other", label: "Otro soporte" }
];
function defaultHandoffContext() {
  const vaso = normalizeVasopressor({ active: false, agent: "norepinefrina" });
  return {
    clinicalStatus: "",
    signedRefusal: false,
    show: false,
    vasopressor: vaso,
    ventilation: { active: false, mode: "", fio2: "", settings: "" },
    notes: ""
  };
}
function normalizeHandoffContext(raw, hints = {}) {
  const base = defaultHandoffContext();
  if (!raw || typeof raw !== "object") {
    if (hints.signedRefusal) base.signedRefusal = true;
    return base;
  }
  const vent = raw.ventilation && typeof raw.ventilation === "object" ? raw.ventilation : {};
  const status = String(raw.clinicalStatus || "");
  const allowed = new Set(CLINICAL_STATUS_OPTIONS.map((o) => o.value));
  return {
    clinicalStatus: allowed.has(status) ? status : "",
    signedRefusal: !!(raw.signedRefusal ?? hints.signedRefusal),
    show: !!(raw.show ?? raw.shock),
    vasopressor: normalizeVasopressor(raw.vasopressor),
    ventilation: {
      active: !!(vent.active || vent.mode || vent.fio2 || vent.settings),
      mode: String(vent.mode || "").trim(),
      fio2: String(vent.fio2 || "").trim(),
      settings: String(vent.settings || "").trim()
    },
    notes: String(raw.notes || "").trim()
  };
}
function handoffContextSummary(ctx) {
  const norm = normalizeHandoffContext(ctx);
  const parts = [];
  const statusLabel = CLINICAL_STATUS_OPTIONS.find((o) => o.value === norm.clinicalStatus)?.label;
  if (statusLabel && norm.clinicalStatus) parts.push(statusLabel);
  if (norm.signedRefusal) parts.push("Negativas firmadas");
  if (norm.show) parts.push("Show");
  if (norm.vasopressor.active) {
    const v = formatVasopressorInfusion(norm.vasopressor);
    parts.push(v ? `Vasopresor: ${v}` : "Vasopresor");
  }
  if (norm.ventilation.active) {
    const modeLabel = VENTILATION_MODES.find((m) => m.value === norm.ventilation.mode)?.label;
    const v = [modeLabel, norm.ventilation.fio2 && `FiO\u2082 ${norm.ventilation.fio2}`].filter(Boolean).join(" \xB7 ");
    parts.push(v || "Ventilaci\xF3n");
  }
  if (norm.notes) parts.push(norm.notes);
  return parts.length ? parts.join(" \xB7 ") : "Sin resumen cl\xEDnico";
}

// lib/entrega/entrega-vitals-plan.mjs
var STRUCTURED_DB = /* @__PURE__ */ new Set(["None", "1h", "2h", "4h", "Shift_Once"]);
var HOUR_PRESETS = [1, 2, 3, 4, 6, 8];
var VITALS_FREQ_HOUR_PRESETS = HOUR_PRESETS;
var VITALS_FREQ_SHIFT_OPTIONS = [1, 2, 3];
var VITALS_METRIC_KEYS = ["ta", "fc", "fr", "temp", "sat", "glu"];
var VITALS_METRIC_LABELS = {
  ta: "TA",
  fc: "FC",
  fr: "FR",
  temp: "Temp",
  sat: "Sat O\u2082",
  glu: "Glucometr\xEDa"
};
var DEFAULT_METRICS = Object.fromEntries(VITALS_METRIC_KEYS.map((k) => [k, true]));
function defaultFrequencySpec() {
  return { mode: "routine" };
}
function defaultVitalsPlan() {
  return { frequency: defaultFrequencySpec(), metrics: { ...DEFAULT_METRICS } };
}
function clampHours(n) {
  const h = Math.round(Number(n));
  if (!Number.isFinite(h)) return 2;
  return Math.min(24, Math.max(1, h));
}
function normalizeUntilTime(raw) {
  if (raw == null || raw === "") return null;
  const m = String(raw).trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return null;
  const hh = Math.min(23, Math.max(0, Number(m[1])));
  const mm = Math.min(59, Math.max(0, Number(m[2])));
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
function isVitalsFrequencyPaused(spec, now = /* @__PURE__ */ new Date()) {
  const norm = normalizeFrequencySpec(spec);
  if (!norm.untilTime) return false;
  const [hh, mm] = norm.untilTime.split(":").map(Number);
  const untilMins = hh * 60 + mm;
  const nowMins = now.getHours() * 60 + now.getMinutes();
  if (untilMins < 12 * 60 && nowMins >= 12 * 60) return false;
  return nowMins >= untilMins;
}
function clampShiftTimes(n) {
  const t2 = Math.round(Number(n));
  if (!Number.isFinite(t2)) return 1;
  return Math.min(3, Math.max(1, t2));
}
function normalizeFrequencySpec(raw) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = (
      /** @type {{ mode?: string, hours?: number, timesPerShift?: number, untilTime?: string|null }} */
      raw
    );
    const mode = String(o.mode || "routine");
    const untilTime = normalizeUntilTime(o.untilTime);
    if (mode === "interval") {
      return {
        mode: "interval",
        hours: clampHours(o.hours ?? 2),
        ...untilTime ? { untilTime } : {}
      };
    }
    if (mode === "shift") {
      return {
        mode: "shift",
        timesPerShift: clampShiftTimes(o.timesPerShift ?? 1),
        ...untilTime ? { untilTime } : {}
      };
    }
    return defaultFrequencySpec();
  }
  const t2 = String(raw ?? "").trim();
  if (!t2 || t2 === "None") return defaultFrequencySpec();
  if (t2 === "Shift_Once") return { mode: "shift", timesPerShift: 1 };
  if (STRUCTURED_DB.has(t2) && t2.endsWith("h")) {
    return { mode: "interval", hours: clampHours(Number(t2.replace("h", ""))) };
  }
  const lower = t2.toLowerCase();
  if (/turno|por\s+turno/i.test(lower)) {
    const m = lower.match(/(\d+)\s*[x×]/);
    return { mode: "shift", timesPerShift: clampShiftTimes(m ? Number(m[1]) : 1) };
  }
  const cada = lower.match(/cada\s*(\d+)\s*h|(\d+)\s*h|q\s*(\d+)\s*h|q(\d+)h/);
  if (cada) {
    const n = Number(cada[1] || cada[2] || cada[3] || cada[4]);
    return { mode: "interval", hours: clampHours(n) };
  }
  if (/rutina|evoluci[oó]n/i.test(lower)) return defaultFrequencySpec();
  return defaultFrequencySpec();
}
function frequencyIntervalMs(spec) {
  const norm = normalizeFrequencySpec(spec);
  if (norm.mode === "interval") return clampHours(norm.hours ?? 2) * 36e5;
  if (norm.mode === "shift") {
    const times = clampShiftTimes(norm.timesPerShift ?? 1);
    return Math.floor(8 * 36e5 / times);
  }
  return null;
}
function vitalsFrequencyForDb(spec) {
  const norm = normalizeFrequencySpec(spec);
  if (norm.mode === "routine") return "None";
  if (norm.mode === "shift") return "Shift_Once";
  const h = clampHours(norm.hours ?? 2);
  if (h === 1) return "1h";
  if (h === 2) return "2h";
  if (h === 4) return "4h";
  return "None";
}
function untilSuffix(untilTime) {
  return untilTime ? ` \xB7 hasta ${untilTime}` : "";
}
function frequencyDisplayLabel(spec) {
  const norm = normalizeFrequencySpec(spec);
  if (isVitalsFrequencyPaused(norm)) {
    return `Finalizado${norm.untilTime ? ` (${norm.untilTime})` : ""}`;
  }
  if (norm.mode === "routine") return "Rutina / seg\xFAn evoluci\xF3n";
  if (norm.mode === "interval") {
    return `Cada ${clampHours(norm.hours ?? 2)} h${untilSuffix(norm.untilTime)}`;
  }
  const times = clampShiftTimes(norm.timesPerShift ?? 1);
  const base = times === 1 ? "1\xD7 por turno" : `${times}\xD7 por turno`;
  return `${base}${untilSuffix(norm.untilTime)}`;
}
function normalizeVitalsPlan(plan) {
  const base = defaultVitalsPlan();
  if (!plan || typeof plan !== "object") return base;
  const p = (
    /** @type {{ frequency?: unknown, metrics?: Record<string, boolean> }} */
    plan
  );
  base.frequency = normalizeFrequencySpec(p.frequency);
  for (const key of VITALS_METRIC_KEYS) {
    if (p.metrics && typeof p.metrics[key] === "boolean") {
      base.metrics[key] = p.metrics[key];
    }
  }
  return base;
}
function vitalsPlanSummary(plan) {
  const norm = normalizeVitalsPlan(plan);
  const enabled = VITALS_METRIC_KEYS.filter((k) => norm.metrics[k]);
  if (!enabled.length) return "Sin signos solicitados";
  const freqLabel = norm.frequency.mode === "routine" ? "rutina / seg\xFAn evoluci\xF3n" : frequencyDisplayLabel(norm.frequency).toLowerCase();
  return `${enabled.map((k) => VITALS_METRIC_LABELS[k]).join(", ")} \xB7 ${freqLabel}`;
}

// lib/entrega/entrega-pendientes.mjs
var EMPTY = {
  version: 2,
  vitalsPlan: defaultVitalsPlan(),
  handoffContext: defaultHandoffContext(),
  items: []
};
function newItemId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function createProcedimientoItem(partial) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return {
    id: newItemId(),
    type: "procedimiento",
    kind: partial.kind === "imagen" ? "imagen" : "otro",
    label: String(partial.label || "").trim(),
    scheduledAt: partial.scheduledAt || null,
    comentado: !!partial.comentado,
    autorizado: !!partial.autorizado,
    agendado: !!partial.agendado,
    requires: {
      familiar: !!partial.requires?.familiar,
      consentimiento: !!partial.requires?.consentimiento,
      anestesia: !!partial.requires?.anestesia
    },
    lockedBase: !!partial.lockedBase,
    createdBy: partial.createdBy || null,
    updatedAt: now,
    completedAt: null,
    completedBy: null
  };
}
function normalizePendientesJson(raw) {
  if (raw == null || raw === "") {
    return {
      version: 2,
      vitalsPlan: defaultVitalsPlan(),
      handoffContext: defaultHandoffContext(),
      items: []
    };
  }
  let parsed;
  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return {
      version: 2,
      vitalsPlan: defaultVitalsPlan(),
      handoffContext: defaultHandoffContext(),
      items: []
    };
  }
  if (parsed && parsed.version === 2 && Array.isArray(parsed.items)) {
    return {
      version: 2,
      vitalsPlan: normalizeVitalsPlan(parsed.vitalsPlan),
      handoffContext: normalizeHandoffContext(parsed.handoffContext),
      items: parsed.items.filter(Boolean)
    };
  }
  if (Array.isArray(parsed)) {
    return {
      version: 2,
      vitalsPlan: defaultVitalsPlan(),
      handoffContext: defaultHandoffContext(),
      items: parsed.map((line) => String(line).trim()).filter(Boolean).map((text) => ({
        id: newItemId(),
        type: "legacy_text",
        text,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        completedAt: null
      }))
    };
  }
  return {
    version: 2,
    vitalsPlan: defaultVitalsPlan(),
    handoffContext: defaultHandoffContext(),
    items: []
  };
}
function serializePendientesJson(doc) {
  return JSON.stringify(normalizePendientesJson(doc));
}
function listActiveProcedimientos(doc) {
  return normalizePendientesJson(doc).items.filter(
    (it) => (it.type === "procedimiento" || it.type === "legacy_text") && !it.completedAt
  );
}
function pendingRequirementBadges(item) {
  const badges = [];
  if (item.requires?.consentimiento && !item.autorizado) badges.push("consentimiento");
  if (item.requires?.anestesia && !item.agendado) badges.push("anestesia");
  if (item.requires?.familiar && !item.comentado) badges.push("familiar");
  return badges;
}
function canDeletePendienteItem(item, actor) {
  if (actor.role === "diurno") return true;
  if (actor.role === "guardia") return !item.lockedBase;
  return false;
}

// lib/entrega/entrega-chip-markers.mjs
var ENTREGA_CHIP_MARKERS = [
  { id: "critico", label: "CR", title: "Paciente cr\xEDtico" },
  { id: "negativas", label: "NF", title: "Negativas firmadas" },
  { id: "show", label: "SH", title: "Show" }
];
function entregaChipMarkerIds(guardia) {
  const critical = !!(guardia?.is_critical === 1 || guardia?.is_critical === true);
  const handoff = normalizeHandoffContext(
    normalizePendientesJson(guardia?.pendientes_json).handoffContext
  );
  const ids = [];
  if (critical) ids.push("critico");
  if (handoff.signedRefusal) ids.push("negativas");
  if (handoff.show) ids.push("show");
  return ids;
}
function resolveEntregaChipMarkers(markerIds) {
  const set = new Set(markerIds);
  return ENTREGA_CHIP_MARKERS.filter((m) => set.has(m.id));
}
function escAttr(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
function buildEntregaMarkerSymbolsHtml(markerIds) {
  const markers = resolveEntregaChipMarkers(markerIds);
  if (!markers.length) return "";
  const chips = markers.map(
    (m) => `<span class="patient-chip-symbol patient-chip-symbol--${m.id}" title="${escAttr(m.title)}">${m.label}</span>`
  ).join("");
  return `<div class="patient-chip-symbols" role="group" aria-label="Marcadores de entrega">${chips}</div>`;
}

// lib/interno/vitals-banner.mjs
function calcVitalsBannerForSpec(last, frequencySpec) {
  const spec = normalizeFrequencySpec(frequencySpec);
  const label = frequencyDisplayLabel(spec);
  if (isVitalsFrequencyPaused(spec)) {
    return { str: label, cls: "nominal-gray" };
  }
  const ms = frequencyIntervalMs(spec);
  if (!ms) {
    return { str: label, cls: "nominal-gray" };
  }
  const due = new Date(last || Date.now()).getTime() + ms;
  const diff = due - Date.now();
  if (diff <= 0) return { str: "Signos vencidos", cls: "breached" };
  const mins = Math.floor(diff / 6e4);
  if (mins <= 15) {
    return { str: `Toca en: ${mins} min`, cls: "warning" };
  }
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return { str: `Toca en: ${h}h ${m}m`, cls: "nominal" };
}

// lib/interno/interno-board.mjs
function abbreviatePatientName(name) {
  const raw = String(name || "").trim().toUpperCase();
  if (!raw) return "\u2014";
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 12);
  const last = parts[0];
  const firstInitial = parts[parts.length - 1].charAt(0);
  return `${last} ${firstInitial}.`.slice(0, 18);
}

// public/js/features/unified-patient-grid-board.mjs
function escapeChipAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
function vitalsBannerForGuardia(meta) {
  const doc = normalizePendientesJson(meta?.pendientes_json);
  return calcVitalsBannerForSpec(
    meta?.last_vitals_check,
    doc.vitalsPlan?.frequency ?? meta?.vitals_frequency
  );
}
var R4_FOLLOWUP_PIN_LABEL = "Interconsultas \u2014 Seguimiento";
function filterR4FollowUpPinPatients(patients2) {
  return patients2.filter(
    (p) => p.interconsult_type === "Follow-up" && p.interconsult_status !== "Resolved"
  );
}
var UnifiedPatientGridBoard = class {
  /**
   * @param {string} domGridContainerId
   * @param {'GUARDIA'|'HANDOFF'} [appViewContext]
   */
  constructor(domGridContainerId, appViewContext = "GUARDIA") {
    this.container = typeof document !== "undefined" ? document.getElementById(domGridContainerId) : null;
    this.context = appViewContext;
    this.chipOpensEntrega = false;
    this.onChipClick = null;
  }
  /**
   * @param {'GUARDIA'|'HANDOFF'} appViewContext
   */
  setViewContext(appViewContext) {
    this.context = appViewContext === "HANDOFF" ? "HANDOFF" : "GUARDIA";
  }
  /**
   * @param {string} patientId
   */
  handleChipClick(patientId) {
    const id = String(patientId || "");
    if (!id) return;
    if (this.context === "HANDOFF" || this.chipOpensEntrega) {
      if (typeof this.onChipClick === "function") {
        this.onChipClick(id);
      }
      return;
    }
    const selectFn = (typeof window !== "undefined" && typeof window.selectPatient === "function" ? window.selectPatient : null) || (typeof globalThis.selectPatient === "function" ? globalThis.selectPatient : null);
    if (selectFn) selectFn(id);
  }
  /**
   * @param {Array<{ id: string, bed_label?: string, name?: string, service?: string, sub_area?: string, negativa_maniobras_firmada?: number, dxText?: string, pendingCount?: number, labsSnippet?: string, isCritical?: boolean, guardiaMeta?: object }>} patients
   * @param {Map<string, { is_critical?: number, last_vitals_check?: string, vitals_frequency?: string }>} guardiasMap
   * @param {string} [userRank]
   */
  drawCensusGrid(patients2, guardiasMap, userRank = "R1") {
    if (!this.container) return;
    this.container.innerHTML = "";
    this.container.classList.add("patient-chips-grid", "patient-chips-grid--guardia");
    if (userRank === "R4") {
      const followUpPatients = filterR4FollowUpPinPatients(patients2);
      const followUpIds = new Set(followUpPatients.map((p) => p.id));
      if (followUpPatients.length > 0) {
        this.appendDivider(R4_FOLLOWUP_PIN_LABEL);
        this.renderBatch(followUpPatients, guardiasMap);
      }
      const sectors = ["Sala A", "Sala B", "Eme", "Torre HU"];
      sectors.forEach((sector) => {
        const sectorPatients = patients2.filter(
          (p) => !followUpIds.has(p.id) && (p.service === sector || p.sub_area === sector)
        );
        if (sectorPatients.length > 0) {
          this.appendDivider(sector);
          this.renderBatch(sectorPatients, guardiasMap);
        }
      });
      return;
    }
    this.renderBatch(patients2, guardiasMap);
  }
  /**
   * @param {Array<{ id: string }>} patients
   * @param {Map<string, { is_critical?: number, last_vitals_check?: string, vitals_frequency?: string }>} guardiasMap
   */
  renderBatch(patients2, guardiasMap) {
    const sorted = [...patients2].sort(
      (a, b) => (guardiasMap.get(b.id)?.is_critical || b.isCritical ? 1 : 0) - (guardiasMap.get(a.id)?.is_critical || a.isCritical ? 1 : 0)
    );
    sorted.forEach((p) => {
      if (this.container) {
        this.container.appendChild(this.compileChip(p, guardiasMap.get(p.id)));
      }
    });
  }
  /** @param {string} label */
  appendDivider(label) {
    if (!this.container) return;
    const div = document.createElement("div");
    div.className = "r4-section-divider";
    div.textContent = label;
    this.container.appendChild(div);
  }
  /**
   * @param {{ id: string, bed_label?: string, name?: string, negativa_maniobras_firmada?: number, dxText?: string, pendingCount?: number, labsSnippet?: string, isCritical?: boolean, guardiaMeta?: { last_vitals_check?: string, vitals_frequency?: string, is_critical?: number } }} p
   * @param {{ is_critical?: number, last_vitals_check?: string, vitals_frequency?: string }|undefined} g
   */
  compileChip(p, g2) {
    const card = document.createElement("div");
    const meta = p.guardiaMeta || g2;
    const critical = !!(p.isCritical || meta?.is_critical);
    card.className = `patient-chip-card ${critical ? "priority-critical" : ""}`;
    card.setAttribute("data-patient-id", p.id);
    card.setAttribute("role", "button");
    card.tabIndex = 0;
    const dnr = p.negativa_maniobras_firmada ? '<span class="dnr-badge">DNR</span>' : "";
    const vitals = vitalsBannerForGuardia(meta);
    const alteredBadge = p.vitalsAltered ? '<span class="vitals-altered-badge" title="Signos alterados (interno)">Alterado</span>' : "";
    const bed = p.bed_label ? p.bed_label : "\u2014";
    const nameRaw = String(p.name || "").trim();
    const nameDisplay = nameRaw ? abbreviatePatientName(nameRaw) : "\u2014";
    const nameTitle = nameRaw ? escapeChipAttr(nameRaw) : "";
    const dx = String(p.dxText || "Sin diagn\xF3stico registrado");
    const pending = Number(p.pendingCount || 0);
    const pendingLabel = pending > 0 ? `<span class="patient-chip-tasks">${pending} pend.${pending === 1 ? "" : "s"}</span>` : "";
    const labs = String(p.labsSnippet || "\u2014");
    const markerIds = Array.isArray(p.entregaMarkers) ? p.entregaMarkers : entregaChipMarkerIds(meta);
    const markerSymbols = buildEntregaMarkerSymbolsHtml(markerIds);
    const vitalsTitle = escapeChipAttr(vitals.str);
    const criticalHint = critical ? '<span class="patient-chip-critical-hint" title="Paciente cr\xEDtico" aria-hidden="true"></span>' : "";
    card.innerHTML = `
      <div class="patient-chip-head">
        <span class="patient-chip-bed">Cama ${bed}</span>
        <div class="patient-chip-badges">${markerSymbols}${dnr}${criticalHint}</div>
      </div>
      <p class="patient-chip-name"${nameTitle ? ` title="${nameTitle}"` : ""}>${nameDisplay}</p>
      <p class="patient-chip-dx">${dx}</p>
      <div class="patient-chip-vitals vitals-banner ${vitals.cls}" title="${vitalsTitle}">
        <span class="patient-chip-vitals__text">${vitals.str}</span>${alteredBadge}
      </div>
      <div class="patient-chip-footer">
        ${pendingLabel}
        <span class="patient-chip-labs" title="${escapeChipAttr(labs)}">${labs}</span>
      </div>`;
    card.addEventListener("click", () => {
      this.handleChipClick(p.id);
    });
    card.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        this.handleChipClick(p.id);
      }
    });
    return card;
  }
};

// public/js/clinical-privileges.mjs
var CLINICAL_RANKS = /* @__PURE__ */ new Set(["R1", "R2", "R3", "R4"]);
function hasProgramAdminPrivileges(user) {
  if (!user) return false;
  if (user.is_program_admin === 1 || user.is_program_admin === true) return true;
  return String(user.rank || "") === "Admin";
}
function effectiveClinicalRank(user) {
  const rank = String(user?.rank || "R1");
  if (CLINICAL_RANKS.has(rank)) return rank;
  if (rank === "Admin") return "R1";
  return "R1";
}
function canConfigureRotation(user) {
  const rank = effectiveClinicalRank(user);
  if (rank === "R4") return true;
  return hasProgramAdminPrivileges(user);
}
function canManageInternoQr(user) {
  return canConfigureRotation(user);
}
function hasElevatedTeamPrivileges(user) {
  if (!user) return false;
  if (hasProgramAdminPrivileges(user)) return true;
  return effectiveClinicalRank(user) === "R4";
}
function canViewLanUserDirectory(user) {
  return hasElevatedTeamPrivileges(user);
}
function canManageTeamRoster(user) {
  return hasElevatedTeamPrivileges(user);
}
function canDeleteLanDirectoryUser(user) {
  return canManageTeamRoster(user);
}

// public/js/features/clinical-rotation.mjs
function toMillis(value) {
  if (value == null) return NaN;
  if (value instanceof Date) return value.getTime();
  return new Date(String(value)).getTime();
}
function isIncomingPreviewWindow(cycle, nowDate) {
  if (!cycle?.preview_start_at || !cycle?.effective_at) return false;
  const now = toMillis(nowDate);
  const start = toMillis(cycle.preview_start_at);
  const end = toMillis(cycle.effective_at);
  if (!Number.isFinite(now) || !Number.isFinite(start) || !Number.isFinite(end)) return false;
  return now >= start && now < end;
}
function isChartLockedForPatient(assignment, nowDate) {
  if (!assignment?.effective_at) return false;
  const now = toMillis(nowDate);
  const effective = toMillis(assignment.effective_at);
  if (!Number.isFinite(now) || !Number.isFinite(effective)) return false;
  return now < effective;
}
function formatEffectiveLabel(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso || "");
  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function toast(msg, type = "info") {
  if (typeof window !== "undefined" && typeof window.showToast === "function") {
    window.showToast(msg, type);
  }
}
function dbApi2() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
function canConfigureRotation2() {
  return canConfigureRotation(clinicalSessionContext.user);
}
function assignmentChipLabel(row) {
  const bed = String(row.bed_label || "").trim() || "\u2014";
  const dx = String(row.prognosis_classification || row.dxText || "").trim() || "Sin dx";
  return { bed, dx };
}
function renderIncomingStrip(assignments, opts = {}) {
  const host = document.getElementById("guardia-incoming-strip");
  if (!host) return;
  const rows = Array.isArray(assignments) ? assignments : [];
  if (!rows.length) {
    host.hidden = true;
    host.innerHTML = "";
    return;
  }
  const now = /* @__PURE__ */ new Date();
  const chips = rows.map((row) => {
    const id = String(row.patient_id || row.id || "");
    const { bed, dx } = assignmentChipLabel(row);
    const locked = isChartLockedForPatient(row, now);
    const effectiveLabel = formatEffectiveLabel(String(row.effective_at || ""));
    return `<button type="button" class="guardia-incoming-chip" data-patient-id="${escapeAttr(id)}" data-effective-at="${escapeAttr(String(row.effective_at || ""))}" aria-label="Paciente entrante ${escapeAttr(bed)}, ${escapeAttr(dx)}${locked ? ", bloqueado hasta vigencia" : ""}">
        <span class="guardia-incoming-chip-bed">${escapeHtml(bed)}</span>
        <span class="guardia-incoming-chip-dx">${escapeHtml(dx)}</span>
      </button>`;
  }).join("");
  host.hidden = false;
  host.innerHTML = `
    <details class="guardia-incoming-details" open>
      <summary class="guardia-incoming-summary">Incoming <span class="guardia-incoming-count">${rows.length}</span></summary>
      <p class="guardia-incoming-hint">Vista previa de entregas \u2014 el expediente se abre al llegar la fecha de vigencia.</p>
      <div class="guardia-incoming-chips" role="list">${chips}</div>
    </details>`;
  const onLockedClick = opts.onLockedClick;
  host.querySelectorAll(".guardia-incoming-chip").forEach((btn, idx) => {
    const row = rows[idx];
    if (!btn || !row) return;
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      if (isChartLockedForPatient(row, /* @__PURE__ */ new Date())) {
        if (typeof onLockedClick === "function") onLockedClick(row);
        else toast(`Disponible el ${formatEffectiveLabel(String(row.effective_at || ""))}`, "info");
        return;
      }
    });
  });
}
function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
function rotationModalEl() {
  return document.getElementById("guardia-rotation-config-backdrop");
}
function openRotationConfigModal() {
  if (!canConfigureRotation2()) {
    toast("Solo R4 o Admin pueden configurar la rotaci\xF3n.", "error");
    return;
  }
  const bd = rotationModalEl();
  if (!bd) return;
  bd.classList.add("open");
  bd.setAttribute("aria-hidden", "false");
  const monthEnd = document.getElementById("rotation-config-month-end");
  if (monthEnd) monthEnd.focus();
}
function closeRotationConfigModal() {
  const bd = rotationModalEl();
  if (!bd) return;
  bd.classList.remove("open");
  bd.setAttribute("aria-hidden", "true");
}
function wireRotationConfigFormOnce() {
  const form = document.getElementById("guardia-rotation-config-form");
  if (!form || form._rpcRotationConfigWired) return;
  form._rpcRotationConfigWired = true;
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!canConfigureRotation2()) {
      toast("Solo R4 o Admin pueden configurar la rotaci\xF3n.", "error");
      return;
    }
    const monthEndAt = String(document.getElementById("rotation-config-month-end")?.value || "").trim();
    const effectiveAt = String(document.getElementById("rotation-config-effective")?.value || "").trim();
    const previewDays = Number(document.getElementById("rotation-config-preview-days")?.value || 2);
    if (!monthEndAt || !effectiveAt) {
      toast("Indica fin de mes y fecha de vigencia.", "error");
      return;
    }
    const api3 = dbApi2();
    if (!api3 || typeof api3.dbRotationCycleUpsert !== "function") {
      toast("Base de datos no disponible.", "error");
      return;
    }
    const res = await api3.dbRotationCycleUpsert({
      monthEndAt,
      effectiveAt,
      previewDays,
      createdBy: clinicalSessionContext.user?.user_id
    });
    if (!res || res.ok === false) {
      toast(res?.error || "No se guard\xF3 la configuraci\xF3n.", "error");
      return;
    }
    closeRotationConfigModal();
    toast("Configuraci\xF3n de rotaci\xF3n guardada.", "success");
    document.dispatchEvent(new CustomEvent("rpc-guardia-rotation-changed"));
  });
}
async function confirmNuevaRotacion() {
  const ok = window.confirm(
    "\xBFIniciar nueva rotaci\xF3n?\n\n\u2022 Se archivan todos los equipos activos\n\u2022 Se limpian las guardias del d\xEDa\n\u2022 Los residentes deben volver a crear equipos\n\nEsta acci\xF3n no se puede deshacer."
  );
  if (!ok) return { ok: false, cancelled: true };
  const api3 = dbApi2();
  const nuevaFn = api3 && (api3.dbRotationNueva || api3.rotationNueva);
  if (typeof nuevaFn !== "function") {
    toast("Base de datos no disponible.", "error");
    return { ok: false };
  }
  const res = await nuevaFn.call(api3, { userId: clinicalSessionContext.user?.user_id });
  if (!res || res.ok === false) {
    toast(res?.error || "No se aplic\xF3 la nueva rotaci\xF3n.", "error");
    return { ok: false };
  }
  toast("Nueva rotaci\xF3n aplicada.", "success");
  document.dispatchEvent(new CustomEvent("rpc-guardia-rotation-changed"));
  return { ok: true };
}
var rotationControlsWired = false;
function syncRotationConfigButton() {
  const configBtn = document.getElementById("btn-guardia-rotation-config");
  if (!configBtn) return;
  const allowed = canConfigureRotation2();
  configBtn.disabled = !allowed;
  configBtn.title = allowed ? "" : "Solo R4 o Admin pueden configurar la rotaci\xF3n.";
  configBtn.classList.toggle("btn-med-secondary--muted", !allowed);
}
function wireGuardiaRotationControls() {
  if (rotationControlsWired) return;
  rotationControlsWired = true;
  wireRotationConfigFormOnce();
  syncRotationConfigButton();
  const configBtn = document.getElementById("btn-guardia-rotation-config");
  if (configBtn) configBtn.addEventListener("click", () => openRotationConfigModal());
  const bd = rotationModalEl();
  if (bd) {
    bd.addEventListener("click", (ev) => {
      if (ev.target === bd) closeRotationConfigModal();
    });
  }
  const cancelBtn = document.getElementById("btn-rotation-config-cancel");
  if (cancelBtn) cancelBtn.addEventListener("click", () => closeRotationConfigModal());
}
function wireNuevaRotacionControl(root = document) {
  const btn = root.querySelector("#btn-nueva-rotacion");
  if (!btn || btn._rpcNuevaRotacionWired) return;
  btn._rpcNuevaRotacionWired = true;
  btn.addEventListener("click", () => void confirmNuevaRotacion());
}
async function syncGuardiaIncomingStrip(settings) {
  void settings;
  wireGuardiaRotationControls();
  const host = document.getElementById("guardia-incoming-strip");
  if (!host) return;
  const cycle = await fetchActiveRotationCycleFromDb();
  if (!cycle || !isIncomingPreviewWindow(cycle, /* @__PURE__ */ new Date())) {
    host.hidden = true;
    host.innerHTML = "";
    return;
  }
  const assignments = await fetchIncomingAssignmentsFromDb();
  renderIncomingStrip(assignments, {
    onLockedClick: (row) => {
      toast(`Disponible el ${formatEffectiveLabel(String(row.effective_at || ""))}`, "info");
    }
  });
}

// public/js/clinical-username.mjs
var USERNAME_RE = /^[a-z][a-z0-9_]{2,31}$/;
function normalizeUsername2(raw) {
  return String(raw || "").trim().replace(/^@+/, "").toLowerCase();
}
function isValidUsernameFormat2(raw) {
  return USERNAME_RE.test(normalizeUsername2(raw));
}
function isLegacyMachineUsername(username, clientId) {
  const u = String(username || "");
  const c = String(clientId || "");
  if (!u) return true;
  if (c && u === c) return true;
  return /^lc_[a-z0-9_]+$/i.test(u);
}

// lib/admin-access-code.mjs
var ADMIN_ACCESS_CODE = "Msg170699";
function verifyAdminAccessCode(input) {
  return String(input ?? "").trim() === ADMIN_ACCESS_CODE;
}

// public/js/features/clinical-teams/shared.mjs
var CLINICAL_TEAM_SERVICES = [
  "Sala",
  "Interconsultas",
  "Eme",
  "Torre HU",
  "UX",
  "\xC1rea A/Pensionistas"
];
var CLINICAL_SALAS = ["Sala 1", "Sala 2", "Sala E"];
var BROWSE_SALA_LS = "clinical.browseSala";
var adminAccessGrantedThisSession = false;
var verifiedAdminAccessCode = null;
function isAdminAccessGrantedThisSession() {
  return adminAccessGrantedThisSession;
}
function markAdminAccessGrantedThisSession() {
  adminAccessGrantedThisSession = true;
}
function rememberAdminAccessCode(code) {
  adminAccessGrantedThisSession = true;
  verifiedAdminAccessCode = code;
}
function clearAdminAccessGrant() {
  adminAccessGrantedThisSession = false;
  verifiedAdminAccessCode = null;
}
function getVerifiedAdminAccessCode() {
  return verifiedAdminAccessCode;
}
var adminCodePromptResolve = null;
function adminCodeModalBackdropEl() {
  return document.getElementById("clinical-admin-code-backdrop");
}
function closeAdminCodeModal() {
  const bd = adminCodeModalBackdropEl();
  if (!bd) return;
  bd.classList.remove("open");
  bd.setAttribute("aria-hidden", "true");
}
function promptAdminAccessCode() {
  const bd = adminCodeModalBackdropEl();
  const input = document.getElementById("clinical-admin-code-input");
  const err = document.getElementById("clinical-admin-code-error");
  if (!bd || !(input instanceof HTMLInputElement)) return Promise.resolve(null);
  input.value = "";
  if (err) {
    err.hidden = true;
    err.textContent = "";
  }
  bd.classList.add("open");
  bd.setAttribute("aria-hidden", "false");
  input.focus();
  return new Promise((resolve) => {
    adminCodePromptResolve = resolve;
  });
}
function finishAdminCodePrompt(code) {
  closeAdminCodeModal();
  const resolve = adminCodePromptResolve;
  adminCodePromptResolve = null;
  resolve?.(code);
}
function submitAdminCodeModal() {
  const input = document.getElementById("clinical-admin-code-input");
  const err = document.getElementById("clinical-admin-code-error");
  const code = input instanceof HTMLInputElement ? input.value : "";
  if (!verifyAdminAccessCode(code)) {
    if (err) {
      err.textContent = "C\xF3digo incorrecto.";
      err.hidden = false;
    }
    if (input instanceof HTMLInputElement) input.focus();
    return;
  }
  finishAdminCodePrompt(String(code).trim());
}
function cancelAdminCodeModal() {
  finishAdminCodePrompt(null);
}
function wireAdminCodeModalControls() {
  const bd = adminCodeModalBackdropEl();
  if (bd && !bd._rpcAdminCodeBackdropWired) {
    bd._rpcAdminCodeBackdropWired = true;
    bd.addEventListener("click", (ev) => {
      if (ev.target === bd) cancelAdminCodeModal();
    });
  }
  const form = document.getElementById("clinical-admin-code-form");
  if (form && !form._rpcAdminCodeFormWired) {
    form._rpcAdminCodeFormWired = true;
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      submitAdminCodeModal();
    });
  }
  const cancelBtn = document.getElementById("btn-clinical-admin-code-cancel");
  if (cancelBtn && !cancelBtn._rpcAdminCodeCancelWired) {
    cancelBtn._rpcAdminCodeCancelWired = true;
    cancelBtn.addEventListener("click", () => cancelAdminCodeModal());
  }
  const closeBtn = document.getElementById("btn-clinical-admin-code-close");
  if (closeBtn && !closeBtn._rpcAdminCodeCloseWired) {
    closeBtn._rpcAdminCodeCloseWired = true;
    closeBtn.addEventListener("click", () => cancelAdminCodeModal());
  }
}
function dbApi3() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
function toast2(msg, type = "info") {
  if (typeof window !== "undefined" && typeof window.showToast === "function") {
    window.showToast(msg, type);
  }
}
function escapeHtml2(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr2(s) {
  return escapeHtml2(s).replace(/"/g, "&quot;");
}
function hintHtml(text) {
  return `<p class="clinical-teams-hint">${escapeHtml2(text)}</p>`;
}
function currentUserId() {
  return String(clinicalSessionContext.user?.user_id || "");
}
function filterJoinedTeams(teams, userOrUserId, usernameHint) {
  let uid = "";
  let handle = "";
  if (userOrUserId && typeof userOrUserId === "object") {
    uid = String(userOrUserId.user_id || "");
    handle = normalizeUsername2(userOrUserId.username || "");
  } else {
    uid = String(userOrUserId || "");
    handle = normalizeUsername2(usernameHint || "");
  }
  if (!uid && !handle) return [];
  return (teams || []).filter(
    (team) => (team.members || []).some((m) => {
      if (uid && String(m.user_id) === uid) return true;
      if (handle && normalizeUsername2(m.username || "") === handle) return true;
      return false;
    })
  );
}
function isUserTeamMember(team, user) {
  const uid = String(user?.user_id || "");
  const handle = normalizeUsername2(user?.username || "");
  return (team.members || []).some((m) => {
    if (uid && String(m.user_id) === uid) return true;
    if (handle && normalizeUsername2(m.username || "") === handle) return true;
    return false;
  });
}

// public/js/lan-join-link.mjs
var JOIN_TICKET_PATH_RE = /\/join\/(req_[a-f0-9]{12})\b/i;
var LIVE_SYNC_SALA_DEFS = [
  { id: "sala-1", label: "Sala 1", key: "Sala 1" },
  { id: "sala-2", label: "Sala 2", key: "Sala 2" },
  { id: "sala-e", label: "Sala E", key: "Sala E" }
];
function resolveLiveSyncRoomIdFromSala(salaOrRoom) {
  const raw = String(salaOrRoom || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (/^sala-[12e]$/i.test(lower)) return lower;
  const hit = LIVE_SYNC_SALA_DEFS.find(
    (d) => d.id === lower || d.key === raw || d.label === raw
  );
  return hit ? hit.id : "";
}
function liveSyncRoomLabel(roomId) {
  const id = String(roomId || "").trim();
  const hit = LIVE_SYNC_SALA_DEFS.find((d) => d.id === id);
  return hit ? hit.label : id;
}
function resolveLanJoinHostUrl(fromServer, pageOrigin) {
  try {
    const u = new URL(String(fromServer || "").trim());
    if (u.hostname && !/^(localhost|127\.0\.0\.1)$/i.test(u.hostname)) {
      return `${u.protocol}//${u.host}`;
    }
  } catch (_e) {
  }
  const origin = String(pageOrigin || "").trim();
  if (origin) {
    try {
      const o = new URL(origin);
      if (o.hostname && !/^(localhost|127\.0\.0\.1)$/i.test(o.hostname)) {
        return `${o.protocol}//${o.host}`;
      }
    } catch (_e2) {
    }
  }
  return "";
}
function buildLanJoinUrls(hostUrl, ticketId) {
  const base = String(hostUrl || "").trim().replace(/\/+$/, "");
  const id = encodeURIComponent(String(ticketId || "").trim());
  return {
    joinUrl: `${base}/join/${id}`,
    mobileUrl: `${base}/join/${id}`
  };
}
function parseLanJoinQuery(search, origin) {
  const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  const code = String(params.get("code") || params.get("token") || "").trim();
  const roomParam = String(params.get("room") || "").trim();
  const salaParam = String(params.get("sala") || "").trim();
  const roomId = resolveLiveSyncRoomIdFromSala(roomParam) || resolveLiveSyncRoomIdFromSala(salaParam) || roomParam;
  const hostParam = String(params.get("host") || "").trim().replace(/\/+$/, "");
  let hostUrl = resolveLanJoinHostUrl(hostParam, origin);
  if (!hostUrl && hostParam) hostUrl = hostParam;
  return { hostUrl, teamCode: code, roomId, sala: salaParam };
}
function hostFromUrl(u) {
  return `${u.protocol}//${u.host}`;
}
function emptyInviteParse() {
  return { hostUrl: "", teamCode: "", roomId: "", ticketId: "", legacyInvite: false };
}
function parseLanInviteInput(raw) {
  const text = String(raw || "").trim();
  if (!text) {
    return emptyInviteParse();
  }
  const urlMatch = text.match(/https?:\/\/[^\s<>"']+/i);
  if (urlMatch) {
    try {
      const u = new URL(urlMatch[0]);
      const hostUrl = hostFromUrl(u);
      const ticketM = u.pathname.match(JOIN_TICKET_PATH_RE);
      if (ticketM) {
        return { hostUrl, teamCode: "", roomId: "", ticketId: ticketM[1], legacyInvite: false };
      }
      const search = u.search || "";
      if (search.includes("code=") || search.includes("token=")) {
        const room = String(new URLSearchParams(search).get("room") || "").trim();
        return { hostUrl, teamCode: "", roomId: room, ticketId: "", legacyInvite: true };
      }
    } catch (_e) {
    }
  }
  const pathTicket = text.match(JOIN_TICKET_PATH_RE);
  if (pathTicket) {
    return { hostUrl: "", teamCode: "", roomId: "", ticketId: pathTicket[1], legacyInvite: false };
  }
  if (text.includes("code=") || text.includes("token=") || text.includes("room=")) {
    const q = text.includes("?") ? text.slice(text.indexOf("?")) : text.startsWith("?") ? text : `?${text}`;
    const parsed = parseLanJoinQuery(q, "");
    if (parsed.teamCode || parsed.roomId) {
      return {
        hostUrl: parsed.hostUrl,
        teamCode: "",
        roomId: parsed.roomId,
        ticketId: "",
        legacyInvite: true
      };
    }
  }
  return emptyInviteParse();
}

// public/js/clinical-profile-lan-sync.mjs
var LAN_USERNAME_REGISTER_REQUIRES_ROOM_MSG = "Sin sala \u21C4 activa el perfil queda solo en esta Mac hasta que te unas o vuelva la red.";
var LAN_PROFILE_PUSH_FAILED_MSG = "Perfil guardado en esta Mac, pero no se pudo publicar a la sala. Revisa conexi\xF3n \u21C4 e intenta Guardar perfil de nuevo.";
function isBenignLanPushSkipCode(code) {
  const c = String(code || "");
  return c === "NO_LAN" || c === "NO_ROOM" || c === "NO_CLINICAL_OPS" || c === "PITCH_DEMO";
}
function rememberLiveSyncRoomMembership(roomId, label) {
  const id = String(roomId || "").trim();
  if (!id) return false;
  setRoomMembership({
    roomId: id,
    label: String(label || "").trim() || liveSyncRoomLabel(id) || id,
    joinedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  return true;
}
function resolveRoomIdForUsernameRegister(opts = {}) {
  const explicit = String(opts.roomId || "").trim();
  if (explicit) return explicit;
  const fromSala = resolveLiveSyncRoomIdFromSala(opts.sala);
  if (fromSala) return fromSala;
  try {
    const mem = getRoomMembership();
    const fromMem = String(mem?.roomId || "").trim();
    if (fromMem) return fromMem;
  } catch (_e) {
  }
  if (typeof location !== "undefined") {
    const parsed = parseLanJoinQuery(location.search, location.origin);
    const fromUrl = String(parsed.roomId || "").trim();
    if (fromUrl) return fromUrl;
  }
  try {
    const settings = JSON.parse(localStorage.getItem("rpc-settings") || "{}");
    const fromSettings = resolveLiveSyncRoomIdFromSala(settings.clinicalSala);
    if (fromSettings) return fromSettings;
  } catch (_e2) {
  }
  return resolveLiveSyncRoomIdFromSala(clinicalSessionContext.user?.sala);
}
async function ensureLiveSyncRoomForUsernameRegister(opts = {}) {
  const lan = await import("/js/chunks/lan-sync-IACFT74Q.js");
  if (!lan.isLanSessionConfiguredForRest()) {
    return { roomId: "", lanConfigured: false };
  }
  let roomId = resolveRoomIdForUsernameRegister(opts);
  if (!roomId) {
    const active = String(lan.getActiveLiveSyncRoomId?.() || "").trim();
    if (active) roomId = active;
  }
  if (!roomId) {
    return { roomId: "", lanConfigured: true };
  }
  rememberLiveSyncRoomMembership(roomId);
  if (opts.joinLive !== false && typeof lan.joinLanRoom === "function") {
    try {
      lan.joinLanRoom(roomId, liveSyncRoomLabel(roomId));
    } catch (_e) {
    }
  }
  return { roomId, lanConfigured: true };
}
async function applyPendingLanInviteFromPage() {
  if (typeof window === "undefined") return;
  const parsed = parseLanJoinQuery(window.location.search, window.location.origin);
  const hostUrl = String(parsed.hostUrl || "").trim();
  const teamCode = String(parsed.teamCode || "").trim();
  if (!hostUrl || !teamCode) return;
  const lan = await import("/js/chunks/lan-sync-IACFT74Q.js");
  if (typeof lan.persistLanClientConfig === "function") {
    lan.persistLanClientConfig(hostUrl, teamCode);
  }
  const roomId = String(parsed.roomId || "").trim();
  if (roomId) {
    rememberLiveSyncRoomMembership(roomId);
  }
}
async function assertLanRoomForUsernameRegister(opts = {}) {
  const lan = await import("/js/chunks/lan-sync-IACFT74Q.js");
  const lanConfigured = !!lan.isLanSessionConfiguredForRest?.();
  await applyPendingLanInviteFromPage();
  const ensured = await ensureLiveSyncRoomForUsernameRegister({
    ...opts,
    joinLive: opts.joinLive === true
  });
  const roomId = String(lan.getActiveLiveSyncRoomId?.() || "").trim() || String(ensured.roomId || "").trim() || String(getRoomMembership()?.roomId || "").trim();
  return {
    allowed: true,
    lanConfigured,
    roomId: roomId || void 0,
    code: roomId ? void 0 : lanConfigured ? "NO_ROOM" : void 0
  };
}
async function flushClinicalProfileToLan(opts = {}) {
  const lan = await import("/js/chunks/lan-sync-IACFT74Q.js");
  return lan.pushClinicalOpsLanNow(opts);
}
function notifyLanProfilePushResult(lanPush, showToast) {
  if (!lanPush || lanPush.ok || typeof showToast !== "function") return;
  if (isBenignLanPushSkipCode(lanPush.code)) return;
  if (lanPush.channels && lanPush.channels.outbox) {
    showToast("Perfil guardado en esta Mac; se publicar\xE1 al reconectar.", "info");
  }
}

// public/js/clinical-team-invite.mjs
var INVITE_CODE_MIN_LEN = 6;
function teamInviteCode(teamId) {
  return String(teamId || "").replace(/-/g, "").slice(0, 8).toLowerCase();
}
function normalizeTeamInviteCode(raw) {
  return String(raw || "").trim().toLowerCase().replace(/[^a-f0-9-]/g, "").replace(/-/g, "");
}
function isLikelyLanBearerToken(raw) {
  const norm = normalizeTeamInviteCode(raw);
  return norm.length >= 32;
}
function parseClinicalTeamJoinQuery(search) {
  const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  const codeParam = String(params.get("code") || "").trim();
  if (codeParam && isLikelyLanBearerToken(codeParam)) {
    return { teamId: "", inviteCode: "" };
  }
  const joinCode = normalizeTeamInviteCode(
    params.get("joinCode") || params.get("teamCode") || params.get("code") || ""
  );
  if (joinCode.length >= INVITE_CODE_MIN_LEN) {
    return { teamId: "", inviteCode: joinCode };
  }
  const teamId = String(params.get("joinTeam") || params.get("clinicalTeam") || "").trim();
  return {
    teamId,
    inviteCode: teamId ? teamInviteCode(teamId) : ""
  };
}
function resolveTeamIdFromInviteCode(code, teams) {
  const norm = normalizeTeamInviteCode(code);
  if (norm.length < INVITE_CODE_MIN_LEN) return "";
  const fullUuid = norm.length >= 32 ? norm.slice(0, 32) : norm;
  const list = Array.isArray(teams) ? teams : [];
  const matches = list.filter((t2) => {
    const id = String(t2?.team_id || "").replace(/-/g, "").toLowerCase();
    return id === fullUuid || id.startsWith(norm);
  });
  if (matches.length === 1) return String(matches[0].team_id || "");
  return "";
}
function diagnoseInviteCodeFailure(code, teams) {
  const norm = normalizeTeamInviteCode(code);
  if (!norm) return { reason: "empty" };
  if (isLikelyLanBearerToken(norm)) return { reason: "lan_bearer" };
  if (norm.length < INVITE_CODE_MIN_LEN) return { reason: "too_short" };
  const fullUuid = norm.length >= 32 ? norm.slice(0, 32) : norm;
  const list = Array.isArray(teams) ? teams : [];
  const matches = list.filter((t2) => {
    const id = String(t2?.team_id || "").replace(/-/g, "").toLowerCase();
    return id === fullUuid || id.startsWith(norm);
  });
  if (matches.length > 1) return { reason: "ambiguous", matchCount: matches.length };
  if (matches.length === 1) return { reason: "ok", teamId: String(matches[0].team_id || "") };
  return { reason: "not_in_db" };
}
function inviteCodeFailureMessage(diag) {
  switch (diag?.reason) {
    case "lan_bearer":
      return "Ese valor es el c\xF3digo LAN de la sala (Wi\u2011Fi), no el c\xF3digo de equipo. En la invitaci\xF3n busca \xABC\xF3digo de equipo\xBB (8 caracteres, p. ej. 2017936e).";
    case "too_short":
      return "C\xF3digo demasiado corto. Copia los 8 caracteres del recuadro \xABC\xF3digo de equipo\xBB en Mi rotaci\xF3n.";
    case "ambiguous":
      return `Hay ${diag.matchCount || 2} equipos con ese prefijo en esta Mac. Pide al R2 el c\xF3digo completo o que te agregue desde el directorio LAN.`;
    case "not_in_db":
      return "Este equipo a\xFAn no est\xE1 en tu base. Con\xE9ctate a la misma sala \u21C4, abre Mi rotaci\xF3n de nuevo (sincroniza) y reintenta; o pide que te agreguen por @usuario.";
    case "empty":
      return "Escribe el c\xF3digo de equipo.";
    default:
      return "C\xF3digo no v\xE1lido o equipo no est\xE1 en esta base.";
  }
}
function resolveClinicalInviteLanHostUrl() {
  if (typeof window === "undefined") return "";
  try {
    const cfg = JSON.parse(localStorage.getItem("rpc-lan-config") || "{}");
    const host = String(cfg?.hostUrl || "").trim().replace(/\/+$/, "");
    if (!host) return "";
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)) return "";
    return host;
  } catch (_e) {
    return "";
  }
}
function isClinicalTeamJoinDesktopApp() {
  if (typeof window === "undefined") return false;
  return !!(window.electronAPI || window.rplusDb);
}
function buildClinicalTeamInviteMessage(team) {
  const name = String(team?.name || "Equipo").trim();
  const sala = String(team?.sala || "").trim();
  const code = teamInviteCode(team?.team_id);
  const lanHost = resolveClinicalInviteLanHostUrl();
  const lines = [
    `Invitaci\xF3n al equipo \xAB${name}\xBB${sala ? ` \xB7 ${sala}` : ""} en R+`,
    "",
    `C\xF3digo de equipo: ${code}`,
    "",
    "En la app R+ del Mac (no Safari):",
    "1. Abre Mi rotaci\xF3n",
    "2. \xABUnirte con c\xF3digo de equipo\xBB \u2192 pega el c\xF3digo",
    "3. Elige tu subciclo (R1) o letra (R2) y confirma",
    "",
    "El enlace web no une al equipo cl\xEDnico; Safari/iPad solo sirve para censo LAN."
  ];
  if (lanHost) {
    lines.push("", `Sala en vivo (opcional): ${lanHost}`);
  }
  return lines.join("\n");
}
var BROWSER_GATE_ID = "clinical-team-invite-browser-gate";
function mountClinicalTeamInviteBrowserGate(code) {
  if (typeof document === "undefined") return;
  const normalized = normalizeTeamInviteCode(code);
  if (!normalized || isClinicalTeamJoinDesktopApp()) return;
  if (document.getElementById(BROWSER_GATE_ID)) return;
  const wrap = document.createElement("div");
  wrap.id = BROWSER_GATE_ID;
  wrap.className = "clinical-team-invite-browser-gate";
  wrap.setAttribute("role", "alertdialog");
  wrap.setAttribute("aria-modal", "true");
  wrap.innerHTML = `
    <div class="clinical-team-invite-browser-gate-card">
      <h2>\xDAnete desde la app R+ en Mac</h2>
      <p>Los enlaces en Safari no agregan al equipo cl\xEDnico (solo la app de escritorio con tu base de datos).</p>
      <p class="clinical-team-invite-browser-gate-code">C\xF3digo: <strong>${normalized}</strong></p>
      <ol>
        <li>Abre la aplicaci\xF3n <strong>R+</strong> en tu Mac (no el navegador).</li>
        <li>Ve a <strong>Mi rotaci\xF3n</strong>.</li>
        <li>En <strong>Unirte con c\xF3digo de equipo</strong>, pega: <code>${normalized}</code></li>
      </ol>
      <button type="button" class="btn-save" id="clinical-team-invite-browser-gate-dismiss">Entendido</button>
    </div>`;
  document.body.appendChild(wrap);
  const btn = document.getElementById("clinical-team-invite-browser-gate-dismiss");
  if (btn) {
    btn.addEventListener("click", () => {
      wrap.remove();
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("joinTeam");
        url.searchParams.delete("joinCode");
        url.searchParams.delete("clinicalTeam");
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      } catch (_e) {
      }
    });
  }
}
function tryMountClinicalTeamInviteBrowserGate(search) {
  const parsed = parseClinicalTeamJoinQuery(search || (typeof location !== "undefined" ? location.search : ""));
  const code = parsed.inviteCode || (parsed.teamId ? teamInviteCode(parsed.teamId) : "");
  if (code) mountClinicalTeamInviteBrowserGate(code);
}

// public/js/mode-features.mjs
function isModeSala(settings) {
  if (!settings) return true;
  return (settings.appMode || "sala") === "sala";
}
function getDefaultServicio(settings) {
  if (!settings) return "";
  return String(settings.defaultServicio || "").trim();
}
function getDefaultCuarto(settings) {
  if (!settings) return "";
  return String(settings.defaultCuarto || "").trim();
}
function getDefaultCama(settings) {
  if (!settings) return "";
  return String(settings.defaultCama || "").trim();
}
function migrateToV3(settings) {
  if (!settings || settings._v3MigrationDone) return false;
  if (settings.appMode == null) settings.appMode = "sala";
  if (settings.defaultServicio == null) settings.defaultServicio = "";
  if (settings.defaultCuarto == null) settings.defaultCuarto = "";
  if (settings.defaultCama == null) settings.defaultCama = "";
  settings._v3MigrationDone = true;
  return true;
}

// public/js/features/soap-estado.mjs
var rt = {
  getActiveId() {
    return null;
  },
  showToast() {
  },
  getSettings() {
    return {};
  }
};
function registerSoapEstadoRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(rt, ctx);
}
function mergeSoapMedField(fieldId, fragment) {
  var el = document.getElementById(fieldId);
  if (!el || !fragment) return;
  var f = String(fragment).trim();
  if (!f) return;
  var cur = el.value.trim();
  el.value = cur ? cur + " | " + f : f;
}
function openSOAPModalDirect() {
  var bd = document.getElementById("soap-modal-backdrop");
  if (bd) bd.classList.add("open");
}
async function copyToClipboardSafe(text) {
  var t2 = text == null ? "" : String(text);
  if (typeof window !== "undefined" && window.electronAPI && typeof window.electronAPI.writeClipboardText === "function") {
    try {
      if (await window.electronAPI.writeClipboardText(t2)) return true;
    } catch (_eElectron) {
    }
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(t2);
      return true;
    }
  } catch (_e) {
  }
  try {
    var ta = document.createElement("textarea");
    ta.value = t2;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    var ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (_e) {
    return false;
  }
}
function openSOAPModal() {
  var activeId = rt.getActiveId();
  if (!activeId) {
    rt.showToast("Selecciona un paciente primero", "error");
    return;
  }
  var existing = notes[activeId] && notes[activeId].evolucion ? notes[activeId].evolucion.trim() : "";
  if (existing) {
    var backdrop = document.createElement("div");
    backdrop.className = "lab-conflict-backdrop";
    backdrop.id = "soap-confirm-backdrop";
    backdrop.innerHTML = `<div class="lab-conflict-modal"><h3>\xBFReemplazar evoluci\xF3n?</h3><p>La evoluci\xF3n ya tiene contenido. \xBFReemplazarlo con la plantilla?</p><div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;"><button onclick="document.getElementById('soap-confirm-backdrop').remove()" style="background:#F3F4F6;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;">Cancelar</button><button onclick="document.getElementById('soap-confirm-backdrop').remove();document.getElementById('soap-modal-backdrop').classList.add('open')" style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;">Reemplazar</button></div></div>`;
    document.body.appendChild(backdrop);
  } else {
    document.getElementById("soap-modal-backdrop").classList.add("open");
  }
}
function closeSOAPModal() {
  document.getElementById("soap-modal-backdrop").classList.remove("open");
  [
    "soap-s",
    "soap-four",
    "soap-esferas",
    "soap-analgesia",
    "soap-fr",
    "soap-sat",
    "soap-tas",
    "soap-tad",
    "soap-fc",
    "soap-antihta",
    "soap-vasop",
    "soap-temp",
    "soap-abx",
    "soap-dieta",
    "soap-kcalkg",
    "soap-kcal",
    "soap-peso",
    "soap-ing",
    "soap-egr",
    "soap-balance",
    "soap-glu1",
    "soap-glu2",
    "soap-glu3"
  ].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = "";
  });
  var sel = document.getElementById("soap-soporte");
  if (sel) sel.selectedIndex = 0;
  document.body.removeAttribute("data-estado-actual-mode");
  var title = document.getElementById("soap-modal-title-text");
  if (title) title.textContent = "Plantilla de Evoluci\xF3n";
}
function openEstadoActualModal() {
  var activeId = rt.getActiveId();
  if (!activeId) {
    rt.showToast("Selecciona un paciente primero", "error");
    return;
  }
  if (isModeSala(rt.getSettings())) {
    if (typeof rt.navigateToEstadoActualPanel === "function") {
      rt.navigateToEstadoActualPanel();
    }
    return;
  }
  document.body.setAttribute("data-estado-actual-mode", "true");
  var title = document.getElementById("soap-modal-title-text");
  if (title) title.textContent = "Estado Actual";
  var s = document.getElementById("soap-s");
  if (s) s.value = "";
  document.getElementById("soap-modal-backdrop").classList.add("open");
}
function estadoActualTextForCopy() {
  var s = document.getElementById("soap-s");
  if (s) s.value = "";
  return buildSOAPText().replace(/^\s*\n+/, "");
}
async function estadoActualOnlyCopy() {
  if (!rt.getActiveId()) return;
  if (isModeSala(rt.getSettings())) {
    var gCopy = typeof globalThis !== "undefined" ? globalThis : {};
    if (typeof gCopy.estadoActualCopiar === "function") {
      await gCopy.estadoActualCopiar();
      closeSOAPModal();
      return;
    }
  }
  var text = estadoActualTextForCopy();
  var ok = await copyToClipboardSafe(text);
  rt.showToast(ok ? "Estado Actual copiado al portapapeles \u2713" : "No se pudo copiar", ok ? "success" : "error");
  closeSOAPModal();
}
async function estadoActualSaveAndCopy() {
  var activeId = rt.getActiveId();
  if (!activeId) return;
  if (isModeSala(rt.getSettings())) {
    var gSave = typeof globalThis !== "undefined" ? globalThis : {};
    if (typeof gSave.estadoActualGuardarCopiar === "function") {
      await gSave.estadoActualGuardarCopiar();
      closeSOAPModal();
      return;
    }
  }
  var patient = patients.find(function(p) {
    return p.id === activeId;
  });
  if (!patient) return;
  var text = estadoActualTextForCopy();
  migratePatientMonitoreo(patient);
  ensureMonitoreo(patient);
  patient.monitoreo.textoGuardado = {
    text,
    savedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  saveState();
  renderEstadoActualBar();
  var ok = await copyToClipboardSafe(text);
  rt.showToast(
    ok ? "Estado Actual guardado y copiado \u2713" : "Guardado, pero no se pudo copiar",
    ok ? "success" : "error"
  );
  closeSOAPModal();
}
function renderEstadoActualBar() {
  var meta = document.getElementById("estado-actual-meta");
  if (!meta) return;
  var sala = isModeSala(rt.getSettings());
  var activeId = rt.getActiveId();
  if (!sala || !activeId) {
    meta.textContent = "";
    return;
  }
  var patient = patients.find(function(p) {
    return p.id === activeId;
  });
  if (patient) {
    migratePatientMonitoreo(patient);
  }
  var tg = patient && patient.monitoreo && patient.monitoreo.textoGuardado;
  if (tg && tg.savedAt) {
    var d = new Date(tg.savedAt);
    if (!isNaN(d.getTime())) {
      var label = String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear() + " \xB7 " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
      meta.textContent = "Guardado " + label;
      return;
    }
  }
  meta.textContent = "";
}
function updateSOAPBalance() {
  var ing = parseFloat(document.getElementById("soap-ing").value);
  var egr = parseFloat(document.getElementById("soap-egr").value);
  var bal = document.getElementById("soap-balance");
  if (!isNaN(ing) && !isNaN(egr)) {
    var diff = ing - egr;
    bal.value = (diff > 0 ? "+" : "") + diff;
  } else {
    bal.value = "";
  }
}
function buildSOAPText() {
  function g2(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }
  function val(v) {
    return v ? v.toUpperCase() : "___";
  }
  function num(v) {
    return v !== "" ? v : "___";
  }
  var soporteMap = {
    "Aire ambiente": "AL AIRE AMBIENTE",
    "Puntillas nasales": "POR PUNTILLAS NASALES",
    "Alto flujo": "POR ALTO FLUJO",
    "VM no invasiva": "CON VENTILACI\xD3N MEC\xC1NICA NO INVASIVA"
  };
  var soporte = soporteMap[g2("soap-soporte")] || "AL AIRE AMBIENTE";
  var ing = g2("soap-ing");
  var egr = g2("soap-egr");
  var balance = ing && egr ? (function() {
    var d = parseFloat(ing) - parseFloat(egr);
    return (d > 0 ? "+" : "") + d;
  })() : "___";
  var lines = [];
  var subj = g2("soap-s");
  if (subj) {
    lines.push("S: " + subj);
    lines.push("");
  }
  lines.push(
    "N: FOUR " + num(g2("soap-four")) + "/16 PUNTOS, SIN DATOS DE FOCALIZACI\xD3N, ORIENTADO EN " + num(g2("soap-esferas")) + " ESFERAS, ALERTA || ANALGESIA CON " + val(g2("soap-analgesia"))
  );
  lines.push(
    "V: FR " + num(g2("soap-fr")) + " RPM, SATO2 " + num(g2("soap-sat")) + "% " + soporte + " | SIN DATOS DE DIFICULTAD RESPIRATORIA || CAMPOS PULMONARES BIEN VENTILADOS"
  );
  lines.push(
    "HD: ESTABLE, TA " + num(g2("soap-tas")) + "/" + num(g2("soap-tad")) + " MMHG, FC " + num(g2("soap-fc")) + " LPM || ANTIHIPERTENSIVOS: " + val(g2("soap-antihta") || "NINGUNO") + " || VASOPRESORES: " + val(g2("soap-vasop") || "NINGUNO")
  );
  lines.push(
    "HI: AFEBRIL, TEMPERATURA " + num(g2("soap-temp")) + " \xB0C || ANTIBI\xD3TICOS: " + val(g2("soap-abx") || "NINGUNO")
  );
  lines.push(
    "NM: DIETA " + val(g2("soap-dieta")) + " CALCULADA A " + num(g2("soap-kcalkg")) + " KCAL/KG (" + num(g2("soap-kcal")) + " KCAL) PARA PESO DE " + num(g2("soap-peso")) + " KG || INGRESOS " + num(ing) + " CC, EGRESOS " + num(egr) + " CC, BALANCE " + balance + " CC || GLUCOMETR\xCDAS CAPILARES (" + num(g2("soap-glu1")) + ", " + num(g2("soap-glu2")) + ", " + num(g2("soap-glu3")) + " MG/DL)"
  );
  return lines.join("\n");
}
function insertSOAPText() {
  var activeId = rt.getActiveId();
  if (!activeId) {
    rt.showToast("Selecciona un paciente primero", "error");
    return;
  }
  var text = buildSOAPText();
  if (!notes[activeId]) notes[activeId] = {};
  notes[activeId].evolucion = text;
  saveState();
  var el = document.querySelector('#note-form textarea[oninput*="evolucion"]');
  if (el) el.value = text;
  closeSOAPModal();
  rt.showToast("Plantilla insertada \u2713", "success");
}
function renderEstadoActualButton() {
}
var windowHandlers2 = {
  closeSOAPModal,
  insertSOAPText,
  updateSOAPBalance,
  openSOAPModal,
  openEstadoActualModal,
  estadoActualOnlyCopy,
  estadoActualSaveAndCopy
};

// public/js/features/db-unlock.mjs
var unlockWaitResolve = null;
var lastMigrationProbe = null;
var lastNeedsConfirm = true;
var pendingUnlockCompletion = null;
function api2() {
  return typeof window !== "undefined" ? window.electronAPI : null;
}
function needsPassphraseConfirm(status, probe) {
  if (!status || typeof status !== "object") return true;
  if (status.dbFileExists && status.hasKdfSalt) return false;
  if (status.migrationPending && !status.dbFileExists) return true;
  if (probe && probe.needed && !status.dbFileExists) return true;
  if (status.dbFileExists === false) return true;
  return false;
}
function collectClinicalLsSnapshot() {
  var snapshot = {};
  if (typeof localStorage === "undefined") return snapshot;
  for (var i = 0; i < CLINICAL_LS_KEYS.length; i++) {
    var key = CLINICAL_LS_KEYS[i];
    if (!Object.prototype.hasOwnProperty.call(localStorage, key)) continue;
    var raw = localStorage.getItem(key);
    if (raw != null) snapshot[key] = raw;
  }
  return snapshot;
}
function clearMigratedLocalStorageKeys(keys) {
  if (!keys || !keys.length || typeof localStorage === "undefined") return;
  for (var i = 0; i < keys.length; i++) {
    try {
      localStorage.removeItem(keys[i]);
    } catch (_e) {
    }
  }
}
async function runMigrationProbe(electron) {
  if (!electron || typeof electron.dbMigrationProbe !== "function") {
    return { needed: false, hasHostJson: false };
  }
  var lsSnapshot = collectClinicalLsSnapshot();
  try {
    var res = await electron.dbMigrationProbe({ lsSnapshot });
    if (res && res.ok !== false) {
      return { needed: !!res.needed, hasHostJson: !!res.hasHostJson };
    }
  } catch (_e) {
  }
  return { needed: false, hasHostJson: false };
}
function migrationUiPending(status, probe) {
  return !!(status && status.migrationPending) || !!(probe && probe.needed);
}
function unlockErrorMessage(res, opts) {
  opts = opts || {};
  var code = res && res.code;
  if (code === "AUTH_RATE_LIMITED") {
    return "Demasiados intentos fallidos. Espera unos minutos e int\xE9ntalo de nuevo.";
  }
  if (code === "DB_UNLOCK_METADATA_MISSING") {
    return "Faltan metadatos de cifrado en el perfil local. Contacta soporte o restaura un respaldo.";
  }
  if (code === "DB_SETUP_RESET_FAILED") {
    return "No se pudo reiniciar la base cifrada anterior (archivo en uso). Cierra R+ por completo y vuelve a abrir.";
  }
  if (code === "DB_SETUP_FAILED" || opts.setup && code === "DB_UNLOCK_FAILED") {
    var setupDetail = res && (res.cause || res.error);
    return setupDetail ? "No se pudo crear la base cifrada: " + setupDetail : "No se pudo crear la base cifrada. Cierra R+, vuelve a abrir e intenta de nuevo.";
  }
  if (code === "DB_UNLOCK_FAILED") {
    var cause = res && (res.cause || res.error || "");
    if (/file is not a database|not a database/i.test(String(cause))) {
      return "C\xF3digo de recuperaci\xF3n incorrecto.";
    }
    return "C\xF3digo de recuperaci\xF3n incorrecto.";
  }
  if (code === "DB_RECOVERY_NOT_CONFIGURED") {
    return "La recuperaci\xF3n no est\xE1 disponible para esta base de datos.";
  }
  if (code === "DB_AUTO_UNLOCK_FAILED") {
    return "No se pudo abrir la base en este equipo. Usa tu c\xF3digo de recuperaci\xF3n si lo guardaste.";
  }
  if (code === "DB_NATIVE_ABI_MISMATCH" || code === "DB_NATIVE_BINDING_FAILED") {
    if (typeof window !== "undefined" && window.electronAPI) {
      var fromStatus = opts && opts.nativeError;
      if (fromStatus) return String(fromStatus);
      return "R+ no pudo cargar SQLCipher o el cifrado (argon2) en esta instalaci\xF3n. En Ajustes \u2192 Aplicaci\xF3n usa \xABRestaurar versi\xF3n estable\xBB o \xABAbrir instalador en GitHub\xBB.";
    }
    return "El m\xF3dulo SQLCipher no coincide con esta sesi\xF3n de R+ (suele pasar despu\xE9s de npm test). En la carpeta del proyecto ejecuta: npm run rebuild:db-native \u2014 cierra R+ por completo (Cmd+Q) y vuelve a abrir con npm start.";
  }
  if (code === "DB_SCHEMA_MIGRATION_FAILED") {
    var migDetail = res && (res.cause || res.error || "");
    return "No se pudo actualizar el esquema de la base cifrada" + (migDetail ? ": " + migDetail : ".") + " Si el problema contin\xFAa, exporta un respaldo .db y contacta soporte.";
  }
  var detail = res && (res.cause || res.error || res.message);
  if (detail && /NODE_MODULE_VERSION|was compiled against a different/i.test(String(detail))) {
    return "El m\xF3dulo SQLCipher no coincide con esta versi\xF3n de Electron. En la carpeta del proyecto ejecuta: npm run rebuild:db-native \u2014 luego cierra R+ por completo y vuelve a abrirlo.";
  }
  return detail || "No se pudo desbloquear la base de datos.";
}
function toggleDbUnlockSecretField(toggleBtn) {
  if (!toggleBtn) return;
  var controlId = toggleBtn.getAttribute("aria-controls");
  var input = controlId ? document.getElementById(controlId) : null;
  if (!input) return;
  var show = input.type === "password";
  input.type = show ? "text" : "password";
  toggleBtn.setAttribute("aria-pressed", show ? "true" : "false");
  toggleBtn.textContent = show ? "Ocultar" : "Mostrar";
  toggleBtn.setAttribute("aria-label", show ? "Ocultar contrase\xF1a" : "Mostrar contrase\xF1a");
}
function wireDbUnlockSecretToggles() {
  if (typeof document === "undefined") return;
  var toggles = document.querySelectorAll("[data-db-unlock-secret-toggle]");
  for (var i = 0; i < toggles.length; i += 1) {
    var btn = toggles[i];
    if (btn.dataset.dbUnlockSecretWired === "1") continue;
    btn.dataset.dbUnlockSecretWired = "1";
    btn.addEventListener("click", function(ev) {
      toggleDbUnlockSecretField(ev.currentTarget);
    });
  }
}
function resetDbUnlockSecretFields() {
  var ids = ["rpc-db-unlock-pass", "rpc-db-unlock-confirm"];
  for (var i = 0; i < ids.length; i += 1) {
    var input = document.getElementById(ids[i]);
    if (input) input.type = "password";
  }
  var toggles = document.querySelectorAll("[data-db-unlock-secret-toggle]");
  for (var j = 0; j < toggles.length; j += 1) {
    toggles[j].setAttribute("aria-pressed", "false");
    toggles[j].textContent = "Mostrar";
    toggles[j].setAttribute("aria-label", "Mostrar contrase\xF1a");
  }
  resetDbUnlockRecoveryMode();
}
function resetDbUnlockRecoveryMode() {
  var recoveryWrap = document.getElementById("rpc-db-unlock-recovery-wrap");
  var submitBtn = document.getElementById("rpc-db-unlock-submit");
  if (recoveryWrap) recoveryWrap.style.display = "none";
  if (submitBtn) submitBtn.setAttribute("onclick", "submitDbUnlockPassphrase()");
  var recCode = document.getElementById("rpc-db-unlock-recovery-code");
  if (recCode) recCode.value = "";
}
function setOverlayVisible(visible) {
  var overlay = document.getElementById("rpc-db-unlock-overlay");
  if (!overlay) return;
  overlay.style.display = visible ? "flex" : "none";
  overlay.setAttribute("aria-hidden", visible ? "false" : "true");
  if (visible) {
    document.body.classList.add("rpc-db-unlock-active");
    resetDbUnlockSecretFields();
    wireDbUnlockSecretToggles();
    var recCode = document.getElementById("rpc-db-unlock-recovery-code");
    if (recCode) {
      recCode.value = "";
      recCode.focus();
    }
  } else {
    document.body.classList.remove("rpc-db-unlock-active");
  }
}
function finishUnlockFlow(result) {
  pendingUnlockCompletion = result;
  if (result && result.recoveryCodeToShow) {
    showRecoveryCodeReveal(String(result.recoveryCodeToShow));
    return;
  }
  setOverlayVisible(false);
  if (unlockWaitResolve) {
    var done = unlockWaitResolve;
    unlockWaitResolve = null;
    done(result);
  }
  void applyClinicalDbUnlockCompletion();
}
function showRecoveryCodeReveal(code) {
  var reveal = document.getElementById("rpc-db-unlock-recovery-reveal");
  var codeEl = document.getElementById("rpc-db-unlock-recovery-reveal-code");
  var panelMain = document.getElementById("rpc-db-unlock-form-main");
  if (!reveal || !codeEl) {
    var fallback = pendingUnlockCompletion || { unlocked: true, status: {} };
    pendingUnlockCompletion = null;
    setOverlayVisible(false);
    if (unlockWaitResolve) {
      var doneMissing = unlockWaitResolve;
      unlockWaitResolve = null;
      doneMissing(fallback);
    }
    return;
  }
  codeEl.textContent = code;
  if (panelMain) panelMain.style.display = "none";
  reveal.style.display = "block";
}
function dismissRecoveryCodeReveal() {
  var reveal = document.getElementById("rpc-db-unlock-recovery-reveal");
  var panelMain = document.getElementById("rpc-db-unlock-form-main");
  if (reveal) reveal.style.display = "none";
  if (panelMain) panelMain.style.display = "";
  var result = pendingUnlockCompletion || { unlocked: true, status: {} };
  pendingUnlockCompletion = null;
  setOverlayVisible(false);
  if (unlockWaitResolve) {
    var done = unlockWaitResolve;
    unlockWaitResolve = null;
    done(result);
  }
  void applyClinicalDbUnlockCompletion();
}
function setUnlockError(msg) {
  var err = document.getElementById("rpc-db-unlock-error");
  if (!err) return;
  if (msg) {
    err.textContent = msg;
    err.style.display = "block";
  } else {
    err.textContent = "";
    err.style.display = "none";
  }
}
function configureUnlockForm(status, probe) {
  var needsConfirm = needsPassphraseConfirm(status, probe);
  lastNeedsConfirm = needsConfirm;
  var confirmWrap = document.getElementById("rpc-db-unlock-confirm-wrap");
  var confirmInput = document.getElementById("rpc-db-unlock-confirm");
  if (confirmWrap) confirmWrap.style.display = needsConfirm ? "" : "none";
  if (confirmInput) confirmInput.value = "";
  var title = document.getElementById("rpc-db-unlock-title");
  var hint = document.getElementById("rpc-db-unlock-hint");
  if (title) {
    title.textContent = needsConfirm ? "Protege tus datos cl\xEDnicos" : "Desbloquear base de datos";
  }
  if (hint) {
    if (migrationUiPending(status, probe)) {
      hint.textContent = "Hay datos locales por migrar a la base cifrada. Elige una contrase\xF1a maestra (m\xEDnimo 8 caracteres) y conf\xEDrmala.";
    } else if (needsConfirm) {
      hint.textContent = "Primera vez: crea una contrase\xF1a maestra para cifrar pacientes, notas y labs en este equipo (m\xEDnimo 8 caracteres). No es la contrase\xF1a de Mi Perfil.";
    } else {
      hint.textContent = "Ingresa la contrase\xF1a maestra que elegiste al activar la base cifrada. No es la contrase\xF1a de Mi Perfil ni el PIN de bloqueo por inactividad.";
    }
  }
  var passInput = document.getElementById("rpc-db-unlock-pass");
  var confirmInput = document.getElementById("rpc-db-unlock-confirm");
  if (passInput) {
    passInput.autocomplete = needsConfirm ? "new-password" : "current-password";
  }
  if (confirmInput) {
    confirmInput.autocomplete = "new-password";
  }
  var rate = document.getElementById("rpc-db-unlock-rate-limited");
  if (rate) rate.style.display = status && status.rateLimited ? "block" : "none";
  var submit = document.getElementById("rpc-db-unlock-submit");
  var nativeBlocked = !!(status && status.nativeReady === false);
  if (submit) {
    submit.disabled = !!(status && status.rateLimited) || nativeBlocked;
    submit.textContent = needsConfirm ? "Crear contrase\xF1a y continuar" : "Desbloquear";
  }
  var recoveryToggle = document.getElementById("rpc-db-unlock-recovery-toggle");
  if (recoveryToggle) recoveryToggle.style.display = needsConfirm || nativeBlocked ? "none" : "";
  if (nativeBlocked) {
    setUnlockError(
      status.nativeError || unlockErrorMessage({ code: "DB_NATIVE_ABI_MISMATCH" }, { nativeError: status.nativeError })
    );
    if (title) title.textContent = "Instalaci\xF3n incompleta";
    if (hint) {
      hint.textContent = "Esta copia de R+ no carg\xF3 los m\xF3dulos nativos necesarios. Restaura una versi\xF3n estable en Ajustes \u2192 Aplicaci\xF3n o descarga el instalador desde GitHub.";
    }
  } else {
    setUnlockError("");
  }
  wireDbUnlockSecretToggles();
  return nativeBlocked;
}
async function tryAutoUnlockDb(electron) {
  if (!electron || typeof electron.dbAutoUnlock !== "function") return null;
  var lsSnapshot = collectClinicalLsSnapshot();
  try {
    return await electron.dbAutoUnlock({ lsSnapshot });
  } catch (_e) {
    return null;
  }
}
function isSqlcipherNativeReady(status) {
  if (!status || status.nativeReady !== false) return true;
  var failures = status.nativeFailures;
  if (!Array.isArray(failures) || !failures.length) return false;
  return !failures.some(function(f) {
    return f && f.module === "sqlcipher";
  });
}
function waitForUnlockOverlay() {
  return new Promise(function(resolve) {
    unlockWaitResolve = resolve;
  });
}
async function presentDbUnlockGate(status) {
  var electron = api2();
  var probe = await runMigrationProbe(electron);
  lastMigrationProbe = probe;
  configureUnlockForm(status, probe);
  setOverlayVisible(true);
  var passInput = document.getElementById("rpc-db-unlock-pass");
  if (passInput) passInput.focus();
  return waitForUnlockOverlay();
}
async function applyClinicalDbUnlockCompletion() {
  if (!isDbMode() || typeof window === "undefined") return;
  try {
    var appState = await import("/js/chunks/app-state-4UJK2I2N.js");
    if (appState && typeof appState.bootHydrateFromDb === "function") {
      await appState.bootHydrateFromDb();
    }
  } catch (err) {
    console.warn("[R+] DB hydrate after unlock:", err && err.message);
  }
  try {
    var settingsMod = await import("/js/chunks/clinical-settings-ZPRCV2QA.js");
    var runtime6 = await import("/js/chunks/clinical-access-runtime-45QTI4PE.js");
    var settings = settingsMod.readRpcSettings();
    var clientId = settingsMod.resolveClinicalClientId(settings);
    if (runtime6 && typeof runtime6.initClinicalAccessRuntime === "function") {
      await runtime6.initClinicalAccessRuntime(settings, clientId);
    }
  } catch (err) {
    console.warn("[R+] Clinical runtime after unlock:", err && err.message);
  }
  try {
    var onboardingMain = await import("/js/chunks/clinical-onboarding-main-22IILHQV.js");
    if (onboardingMain && typeof onboardingMain.refreshMainClinicalOnboardingIfNeeded === "function") {
      await onboardingMain.refreshMainClinicalOnboardingIfNeeded();
    }
  } catch (_e) {
  }
}
function handleUnlockSuccess(res) {
  if (res && res.clearKeys && res.clearKeys.length) {
    clearMigratedLocalStorageKeys(res.clearKeys);
  }
  if (res && res.migrationWarning) {
    var warnMsg = "La base cifrada se cre\xF3, pero la migraci\xF3n de datos locales fall\xF3: " + res.migrationWarning;
    if (typeof window !== "undefined" && typeof window.showToast === "function") {
      window.showToast(warnMsg, "error");
    }
  }
  lastMigrationProbe = { needed: false, hasHostJson: false };
}
async function waitForDbUnlock() {
  if (!isDbMode()) return { unlocked: true };
  var electron = api2();
  if (!electron || typeof electron.dbStatus !== "function") {
    return { unlocked: true };
  }
  var status;
  try {
    status = await electron.dbStatus();
  } catch (_e) {
    return { unlocked: false };
  }
  if (!status || status.state === "unlocked") {
    return { unlocked: true, status: status || {} };
  }
  if (!isSqlcipherNativeReady(status)) {
    var nativeMsg = unlockErrorMessage(
      { code: "DB_NATIVE_ABI_MISMATCH" },
      { nativeError: status.nativeError }
    );
    if (typeof window !== "undefined" && typeof window.showToast === "function") {
      window.showToast(nativeMsg, "error");
    }
    return { unlocked: false, status };
  }
  var autoRes = await tryAutoUnlockDb(electron);
  if (autoRes && autoRes.ok !== false && autoRes.state === "unlocked") {
    handleUnlockSuccess(autoRes);
    return { unlocked: true, status: autoRes };
  }
  if (status.dbFileExists && status.hasKdfSalt) {
    var overlayResult = await presentDbUnlockGate(status);
    if (overlayResult && overlayResult.unlocked) {
      handleUnlockSuccess(overlayResult.status || {});
      return { unlocked: true, status: overlayResult.status || status };
    }
    return { unlocked: false, status: overlayResult?.status || autoRes || status };
  }
  var errMsg = autoRes && (autoRes.cause || autoRes.error || autoRes.message) || "No se pudo abrir la base de datos cl\xEDnica.";
  if (typeof window !== "undefined" && typeof window.showToast === "function") {
    window.showToast(errMsg, "error");
  }
  return { unlocked: false, status: autoRes || status };
}
function toggleRecoveryMode() {
  var recoveryWrap = document.getElementById("rpc-db-unlock-recovery-wrap");
  var toggleBtn = document.getElementById("rpc-db-unlock-recovery-toggle");
  var passEl = document.getElementById("rpc-db-unlock-pass");
  var confirmWrap = document.getElementById("rpc-db-unlock-confirm-wrap");
  var rememberLabel = document.querySelector(".rpc-db-unlock-remember");
  var rememberHint = document.querySelector(".settings-acc-hint--tight");
  var submitBtn = document.getElementById("rpc-db-unlock-submit");
  var isRecovery = recoveryWrap && recoveryWrap.style.display !== "none";
  if (isRecovery) {
    if (recoveryWrap) recoveryWrap.style.display = "none";
    if (toggleBtn) toggleBtn.style.display = "";
    if (passEl) {
      passEl.style.display = "";
      passEl.parentElement.style.display = "";
    }
    if (confirmWrap) confirmWrap.style.display = lastNeedsConfirm ? "" : "none";
    if (rememberLabel) rememberLabel.style.display = lastNeedsConfirm ? "" : "";
    if (rememberHint) rememberHint.style.display = lastNeedsConfirm ? "" : "";
    if (submitBtn) {
      submitBtn.textContent = lastNeedsConfirm ? "Crear contrase\xF1a y continuar" : "Desbloquear";
      submitBtn.setAttribute("onclick", "submitDbUnlockPassphrase()");
    }
  } else {
    if (recoveryWrap) recoveryWrap.style.display = "";
    if (toggleBtn) toggleBtn.style.display = "none";
    if (passEl) {
      passEl.style.display = "none";
      passEl.parentElement.style.display = "none";
    }
    if (confirmWrap) confirmWrap.style.display = "none";
    if (rememberLabel) rememberLabel.style.display = "none";
    if (rememberHint) rememberHint.style.display = "none";
    if (submitBtn) {
      submitBtn.textContent = "Recuperar acceso";
      submitBtn.setAttribute("onclick", "submitRecoveryCode()");
    }
    var recCode = document.getElementById("rpc-db-unlock-recovery-code");
    if (recCode) recCode.focus();
  }
  setUnlockError("");
}
async function submitRecoveryCode() {
  var electron = api2();
  if (!electron || typeof electron.dbUnlockRecovery !== "function") return;
  var codeEl = document.getElementById("rpc-db-unlock-recovery-code");
  var code = codeEl ? String(codeEl.value || "").trim() : "";
  if (!code) {
    setUnlockError("Ingresa el c\xF3digo de recuperaci\xF3n.");
    return;
  }
  setUnlockError("");
  var submitBtn = document.getElementById("rpc-db-unlock-submit");
  if (submitBtn) submitBtn.disabled = true;
  try {
    var res = await electron.dbUnlockRecovery({ code });
    if (!res || res.ok === false) {
      setUnlockError(unlockErrorMessage(res || {}, {}));
      if (submitBtn) submitBtn.disabled = false;
      try {
        var st2 = await electron.dbStatus();
        configureUnlockForm(st2, lastMigrationProbe);
      } catch (_e2) {
      }
      return;
    }
    finishUnlockFlow({ unlocked: true, status: res, recoveryCodeToShow: res.recoveryCodeToShow });
  } catch (err) {
    setUnlockError(err && err.message || "Error al recuperar.");
    if (submitBtn) submitBtn.disabled = false;
  }
}
async function submitDbUnlockPassphrase() {
  var electron = api2();
  if (!electron || typeof electron.dbUnlock !== "function") return;
  var passEl = document.getElementById("rpc-db-unlock-pass");
  var confirmEl = document.getElementById("rpc-db-unlock-confirm");
  var rememberEl = document.getElementById("rpc-db-unlock-remember");
  var passphrase = passEl ? String(passEl.value || "") : "";
  var remember = !!(rememberEl && rememberEl.checked);
  var status = { migrationPending: false, dbFileExists: true };
  try {
    status = await electron.dbStatus();
  } catch (_e) {
  }
  var probe = lastMigrationProbe;
  if (!probe) {
    probe = await runMigrationProbe(electron);
    lastMigrationProbe = probe;
  }
  var isSetup = needsPassphraseConfirm(status, probe);
  if (isSetup) {
    var confirm2 = confirmEl ? String(confirmEl.value || "") : "";
    if (passphrase.length < 8) {
      setUnlockError("La contrase\xF1a debe tener al menos 8 caracteres.");
      return;
    }
    if (!confirm2) {
      setUnlockError("Confirma la contrase\xF1a en el segundo campo.");
      return;
    }
    if (passphrase !== confirm2) {
      setUnlockError("La confirmaci\xF3n no coincide con la contrase\xF1a.");
      return;
    }
  } else if (!passphrase) {
    setUnlockError("Ingresa la contrase\xF1a maestra.");
    return;
  }
  setUnlockError("");
  var submitBtn = document.getElementById("rpc-db-unlock-submit");
  if (submitBtn) submitBtn.disabled = true;
  try {
    var unlockPayload = { passphrase, remember, setup: isSetup };
    if (probe && probe.needed) {
      unlockPayload.lsSnapshot = collectClinicalLsSnapshot();
    }
    var res = await electron.dbUnlock(unlockPayload);
    if (!res || res.ok === false) {
      setUnlockError(unlockErrorMessage(res || {}, { setup: isSetup }));
      if (submitBtn) submitBtn.disabled = !!(status && status.rateLimited);
      try {
        var st2 = await electron.dbStatus();
        configureUnlockForm(st2, lastMigrationProbe);
      } catch (_e2) {
      }
      return;
    }
    if (res.clearKeys && res.clearKeys.length) {
      clearMigratedLocalStorageKeys(res.clearKeys);
    }
    if (res.migrationWarning) {
      var warnMsg = "La base cifrada se cre\xF3, pero la migraci\xF3n de datos locales fall\xF3: " + res.migrationWarning;
      if (typeof window !== "undefined" && typeof window.showToast === "function") {
        window.showToast(warnMsg, "error");
      } else {
        setUnlockError(warnMsg);
        if (submitBtn) submitBtn.disabled = false;
        return;
      }
    }
    lastMigrationProbe = { needed: false, hasHostJson: false };
    finishUnlockFlow({ unlocked: true, status: res, recoveryCodeToShow: res.recoveryCodeToShow });
  } catch (err) {
    setUnlockError(err && err.message || "Error al desbloquear.");
    if (submitBtn) submitBtn.disabled = false;
  }
}
function syncDbSecuritySectionUi() {
  var section = document.getElementById("settings-accordion-db-security");
  if (!section) return;
  section.style.display = "none";
}
function setChangePassError(msg) {
  var err = document.getElementById("rpc-db-change-pass-error");
  if (!err) return;
  if (msg) {
    err.textContent = msg;
    err.style.display = "block";
  } else {
    err.textContent = "";
    err.style.display = "none";
  }
}
function changePassphraseErrorMessage(res) {
  var code = res && res.code;
  if (code === "DB_PASSPHRASE_MISMATCH") {
    return "La contrase\xF1a actual no es correcta.";
  }
  if (code === "DB_PASSPHRASE_TOO_SHORT") {
    return "La contrase\xF1a nueva debe tener al menos 8 caracteres.";
  }
  if (code === "DB_PASSPHRASE_INVALID") {
    return "Completa la contrase\xF1a actual y la nueva.";
  }
  if (code === "DB_LOCKED") {
    return "La base est\xE1 bloqueada. Desbloqu\xE9ala antes de cambiar la contrase\xF1a.";
  }
  return res && (res.cause || res.error || res.message) || "No se pudo cambiar la contrase\xF1a.";
}
function openChangeMasterPasswordModal() {
}
function closeChangeMasterPasswordModal() {
  var overlay = document.getElementById("rpc-db-change-pass-overlay");
  if (!overlay) return;
  overlay.style.display = "none";
  overlay.setAttribute("aria-hidden", "true");
  setChangePassError("");
}
async function submitChangeMasterPassword() {
  var electron = api2();
  if (!electron || typeof electron.dbChangePassphrase !== "function") return;
  var currentEl = document.getElementById("rpc-db-change-pass-current");
  var newEl = document.getElementById("rpc-db-change-pass-new");
  var confirmEl = document.getElementById("rpc-db-change-pass-confirm");
  var rememberEl = document.getElementById("rpc-db-change-pass-remember");
  var current = currentEl ? String(currentEl.value || "") : "";
  var next = newEl ? String(newEl.value || "") : "";
  var confirm2 = confirmEl ? String(confirmEl.value || "") : "";
  var remember = !!(rememberEl && rememberEl.checked);
  if (!current) {
    setChangePassError("Ingresa tu contrase\xF1a actual.");
    return;
  }
  if (next.length < 8) {
    setChangePassError("La contrase\xF1a nueva debe tener al menos 8 caracteres.");
    return;
  }
  if (!confirm2) {
    setChangePassError("Confirma la contrase\xF1a nueva.");
    return;
  }
  if (next !== confirm2) {
    setChangePassError("La confirmaci\xF3n no coincide con la contrase\xF1a nueva.");
    return;
  }
  if (current === next) {
    setChangePassError("La contrase\xF1a nueva debe ser distinta de la actual.");
    return;
  }
  setChangePassError("");
  var submitBtn = document.getElementById("rpc-db-change-pass-submit");
  if (submitBtn) submitBtn.disabled = true;
  try {
    var res = await electron.dbChangePassphrase({
      currentPassphrase: current,
      newPassphrase: next,
      remember
    });
    if (!res || res.ok === false) {
      setChangePassError(changePassphraseErrorMessage(res || {}));
      if (submitBtn) submitBtn.disabled = false;
      return;
    }
    closeChangeMasterPasswordModal();
    if (typeof window !== "undefined" && typeof window.showToast === "function") {
      window.showToast("Contrase\xF1a maestra actualizada", "success");
    }
  } catch (err) {
    setChangePassError(err && err.message || "No se pudo cambiar la contrase\xF1a.");
    if (submitBtn) submitBtn.disabled = false;
  }
}
var dbUnlockWindowHandlers = {
  dismissRecoveryCodeReveal,
  submitDbUnlockPassphrase,
  submitRecoveryCode,
  toggleRecoveryMode,
  openChangeMasterPasswordModal,
  closeChangeMasterPasswordModal,
  submitChangeMasterPassword
};

// public/js/features/clinical-panel-host.mjs
function escapeHtml3(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function getClinicalTeamsPanelHost() {
  const bd = document.getElementById("clinical-teams-backdrop");
  if (bd) {
    const scoped = bd.querySelector("#clinical-teams-panel-body");
    if (scoped) return scoped;
  }
  return document.getElementById("clinical-teams-panel-body");
}
function setClinicalTeamsPanelLoading() {
  const host = getClinicalTeamsPanelHost();
  if (host) {
    host.innerHTML = '<p class="clinical-teams-lead clinical-teams-loading">Cargando\u2026</p>';
  }
}
function setClinicalTeamsPanelError(message) {
  const host = getClinicalTeamsPanelHost();
  if (!host) return;
  host.innerHTML = `
    <p class="clinical-registration-error">${escapeHtml3(message)}</p>
    <p class="clinical-teams-lead">Cierra este di\xE1logo y vuelve a abrir <strong>Mi rotaci\xF3n</strong>. Si sigue vac\xEDo, reinicia R+ por completo (Cmd+Q).</p>`;
}
async function safeRenderClinicalTeamsPanel(renderFn) {
  const host = getClinicalTeamsPanelHost();
  if (!host) return;
  setClinicalTeamsPanelLoading();
  try {
    await renderFn(host);
  } catch (err) {
    console.error("[Mi rotaci\xF3n]", err);
    setClinicalTeamsPanelError(
      err instanceof Error ? err.message : "Error al cargar Mi rotaci\xF3n."
    );
  }
}
async function tryAutoOpenClinicalDb() {
  if (!isDbMode() || typeof window === "undefined") return false;
  const api3 = window.rplusDb || window.electronAPI;
  if (!api3 || typeof api3.dbAutoUnlock !== "function") return false;
  try {
    const res = await api3.dbAutoUnlock({ lsSnapshot: collectClinicalLsSnapshot() });
    return !!(res && res.ok !== false && res.state === "unlocked");
  } catch (_e) {
    return false;
  }
}
async function ensureClinicalPanelSession() {
  if (clinicalSessionContext.user?.user_id) return true;
  if (!isDbMode()) return false;
  const settings = readRpcSettings();
  const clientId = resolveClinicalClientId(settings);
  if (!clinicalSessionContext.user?.user_id) {
    await tryAutoOpenClinicalDb();
  }
  if (clinicalSessionContext.user?.user_id) return true;
  return bootstrapClinicalAccess(settings, clientId);
}

// public/js/features/clinical-teams/teams-guardia-bridge.mjs
async function publishClinicalTeamsToLan() {
  try {
    const mod = await import("/js/chunks/lan-sync-IACFT74Q.js");
    if (typeof mod.pushClinicalOpsLanNow === "function") {
      return mod.pushClinicalOpsLanNow();
    }
    if (typeof mod.scheduleLiveSyncPush === "function") mod.scheduleLiveSyncPush();
  } catch (_e) {
  }
  return { ok: false, code: "NO_LAN" };
}
function toastTeamLanPublishResult(lanPush, localOkMessage) {
  if (!lanPush) {
    toast2(localOkMessage, "success");
    return;
  }
  if (lanPush.ok && (lanPush.code === "QUEUED" || lanPush.channels && lanPush.channels.outbox)) {
    toast2(
      `${localOkMessage} Se publicar\xE1 a la sala cuando vuelva la red (cola \u21C4).`,
      "info"
    );
    return;
  }
  if (lanPush.ok) {
    if (lanPush.code === "CONFLICT_RESOLVED") {
      toast2(`${localOkMessage} Directorio alineado con el servidor.`, "success");
      return;
    }
    if (lanPush.channels && lanPush.channels.http) {
      toast2(`${localOkMessage} Publicado en sala \u21C4.`, "success");
      return;
    }
    toast2(localOkMessage, "success");
    return;
  }
  if (isBenignLanPushSkipCode(lanPush.code)) {
    toast2(`${localOkMessage} (solo en esta Mac hasta conectar sala \u21C4).`, "info");
    return;
  }
  toast2(LAN_PROFILE_PUSH_FAILED_MSG, "warn");
}
var LAN_CLINICAL_OPS_PULL_MIN_MS = 12e3;
var lanClinicalOpsPullLastAt = 0;
var lanClinicalOpsPullInFlight = null;
async function pullClinicalOpsFromLanRoom(options = {}) {
  const force = !!options.force;
  const now = Date.now();
  if (!force && now - lanClinicalOpsPullLastAt < LAN_CLINICAL_OPS_PULL_MIN_MS) {
    return false;
  }
  if (lanClinicalOpsPullInFlight) return lanClinicalOpsPullInFlight;
  lanClinicalOpsPullInFlight = (async () => {
    try {
      const lan = await import("/js/chunks/lan-sync-IACFT74Q.js");
      if (typeof lan.refreshLanClinicalDirectoryFromRoom !== "function") return false;
      return !!await lan.refreshLanClinicalDirectoryFromRoom({ timeoutMs: 8e3 });
    } catch (_e) {
      return false;
    } finally {
      lanClinicalOpsPullLastAt = Date.now();
      lanClinicalOpsPullInFlight = null;
    }
  })();
  return lanClinicalOpsPullInFlight;
}
async function resolveLocalUserIdByLanHandle(handle) {
  const api3 = dbApi3();
  if (!api3 || typeof api3.dbClinicalUserLookup !== "function") return "";
  const res = await api3.dbClinicalUserLookup({ username: handle });
  return res?.ok && res.user?.user_id ? String(res.user.user_id) : "";
}

// public/js/features/clinical-teams/teams-roster-lan.mjs
function lanUsersModalBackdropEl() {
  return document.getElementById("clinical-lan-users-backdrop");
}
function lanUsersModalBodyEl() {
  return document.getElementById("clinical-lan-users-panel-body");
}
var _lanUsersModalTeams = [];
function cycleLettersForAssign(team, userRank) {
  const service = String(team?.service || "Sala");
  const rank = String(userRank || "R1");
  const svcKey = service.trim().toLowerCase();
  if (svcKey.includes("sala") && rank === "R2") {
    return getCycleLettersForTeamCreate("Sala", "R2");
  }
  if (svcKey.includes("sala") && rank === "R1") {
    return [
      ...getCycleLettersForTeamCreate("Sala", "R1", 0),
      ...getCycleLettersForTeamCreate("Sala", "R1", 1)
    ];
  }
  return getCycleLettersForTeamCreate(service, rank);
}
function renderLanAssignTeamOptionsHtml(teams, selectedTeamId) {
  const list = Array.isArray(teams) ? teams : [];
  const selected = String(selectedTeamId || "").trim();
  if (!list.length) {
    return '<option value="">\u2014 Sin equipos \u2014</option>';
  }
  return '<option value="">\u2014 Equipo \u2014</option>' + list.map((team) => {
    const id = escapeAttr2(String(team.team_id || ""));
    const label = escapeHtml2(
      `${String(team.name || "Equipo").trim()} \xB7 ${String(team.sala || "").trim() || "Sala"}`
    );
    const members = Array.isArray(team.members) ? team.members.length : 0;
    const isSelected = selected && id === selected ? " selected" : "";
    return `<option value="${id}"${isSelected}>${label} (${members})</option>`;
  }).join("");
}
function resolveLanUserPlacement(userId, teams) {
  const uid = String(userId || "").trim();
  if (!uid) return null;
  for (const team of teams || []) {
    const member = (team.members || []).find((m) => String(m.user_id || "") === uid);
    if (!member) continue;
    return {
      teamId: String(team.team_id || ""),
      teamName: String(team.name || "Equipo").trim(),
      teamSala: String(team.sala || "").trim(),
      cycle: String(member.sub_area_fraction || "").trim(),
      rank: String(member.rank || "")
    };
  }
  return null;
}
function formatLanUserPlacementLabel(placement, userRank) {
  if (!placement?.teamId) return "Sin equipo asignado";
  const parts = [placement.teamName || "Equipo"];
  if (placement.teamSala) parts.push(placement.teamSala);
  if (placement.cycle) {
    parts.push(formatLanCycleOptionLabel(placement.cycle, userRank || placement.rank));
  }
  return parts.join(" \xB7 ");
}
var LAN_USER_RANK_ORDER = ["R1", "R2", "R3", "R4", "Admin"];
function groupLanUsersByRank(users) {
  const groups = new Map(LAN_USER_RANK_ORDER.map((rank) => [rank, []]));
  const other = [];
  for (const user of users) {
    const rank = String(user?.rank || "R1");
    if (groups.has(rank)) groups.get(rank).push(user);
    else other.push(user);
  }
  return { groups, other };
}
function formatLanCycleOptionLabel(letter, userRank) {
  const frac = String(letter || "").trim();
  if (!frac) return "\u2014 Ciclo \u2014";
  const rank = String(userRank || "R1");
  if (rank === "R2" || /^[A-F]$/i.test(frac)) return `Ciclo R2 \xB7 ${frac}`;
  if (rank === "R1" || /[12]$/i.test(frac)) return `Subciclo R1 \xB7 ${frac}`;
  return `Ciclo \xB7 ${frac}`;
}
function renderLanUserRowHtml(u, teamList, opts = {}) {
  const userId = escapeAttr2(String(u.user_id || ""));
  const rawUserId = String(u.user_id || "").trim();
  const canDelete = !!opts.canDelete && rawUserId && rawUserId !== String(opts.callerUserId || "").trim();
  const rawHandle = normalizeUsername2(u.username || "");
  const handleValid = isValidUsernameFormat2(rawHandle) && !u.lanDirectoryPending;
  const handleCell = handleValid ? `<span class="clinical-lan-users-handle">@${escapeHtml2(rawHandle)}</span>` : `<span class="clinical-lan-users-handle clinical-lan-users-handle--pending" title="Falta registrar @usuario en Mi rotaci\xF3n">sin @usuario</span>`;
  const name = escapeHtml2(String(u.clinical_name || "").trim() || "Sin nombre");
  const rankRaw = escapeAttr2(String(u.rank || "R1"));
  const salaLabel = escapeHtml2(String(u.sala || "").trim() || "\u2014");
  const placement = resolveLanUserPlacement(u.user_id, teamList);
  const placementLabel = escapeHtml2(formatLanUserPlacementLabel(placement, String(u.rank || "R1")));
  const teamOptions = renderLanAssignTeamOptionsHtml(teamList, placement?.teamId);
  const cycleOptions = placement?.cycle ? `<option value="${escapeAttr2(placement.cycle)}" selected>${escapeHtml2(formatLanCycleOptionLabel(placement.cycle, String(u.rank || "R1")))}</option>` : '<option value="">\u2014 Ciclo \u2014</option>';
  return `<tr class="clinical-lan-user-row" data-user-id="${userId}" data-user-rank="${rankRaw}" data-preferred-cycle="${escapeAttr2(placement?.cycle || "")}">
    <td class="clinical-lan-users-col-handle">
      ${handleCell}
    </td>
    <td class="clinical-lan-users-col-name">
      <span class="clinical-lan-users-name" title="${name}">${name}</span>
    </td>
    <td class="clinical-lan-users-col-placement">
      <span class="clinical-lan-users-placement" title="${placementLabel}">${placementLabel}</span>
    </td>
    <td class="clinical-lan-users-col-sala">${salaLabel}</td>
    <td class="clinical-lan-users-col-team">
      <label class="visually-hidden" for="clinical-lan-team-${userId}">Equipo</label>
      <select id="clinical-lan-team-${userId}" class="profile-input clinical-lan-assign-team">${teamOptions}</select>
    </td>
    <td class="clinical-lan-users-col-cycle">
      <label class="visually-hidden" for="clinical-lan-cycle-${userId}">Ciclo</label>
      <select id="clinical-lan-cycle-${userId}" class="profile-input clinical-lan-assign-cycle" ${placement?.teamId ? "" : "disabled"}>
        ${cycleOptions}
      </select>
    </td>
    <td class="clinical-lan-users-col-action">
      <div class="clinical-lan-users-action-row">
        <button type="button" class="btn-save clinical-lan-assign-btn" data-user-id="${userId}">Asignar</button>
        ${canDelete ? `<button type="button" class="btn-med-secondary clinical-lan-delete-user-btn" data-user-id="${userId}" data-user-label="${escapeAttr2(String(u.clinical_name || rawHandle || rawUserId))}" title="Quitar de la base cl\xEDnica en esta Mac y sincronizar en \u21C4">Eliminar</button>` : ""}
      </div>
    </td>
  </tr>`;
}
function renderLanUsersModalBodyHtml(users, teams, opts = {}) {
  const list = Array.isArray(users) ? users : [];
  const teamList = Array.isArray(teams) ? teams : [];
  const rowOpts = {
    canDelete: !!opts.canDelete,
    callerUserId: String(opts.callerUserId || "")
  };
  if (!list.length) {
    return `<p class="clinical-teams-empty">A\xFAn no hay otros usuarios en esta Mac. Pide a tus compa\xF1eros que guarden <strong>Mi rotaci\xF3n \u2192 Guardar perfil</strong> con su @usuario y que est\xE9n en la misma sala <strong>\u21C4</strong> (sincronizaci\xF3n en vivo).</p>`;
  }
  const { groups, other } = groupLanUsersByRank(list);
  const tableHead = `<thead><tr>
    <th scope="col">@usuario</th>
    <th scope="col">Nombre</th>
    <th scope="col">Ubicaci\xF3n actual</th>
    <th scope="col">Sala</th>
    <th scope="col">Asignar equipo</th>
    <th scope="col">Ciclo</th>
    <th scope="col"><span class="visually-hidden">Acci\xF3n</span></th>
  </tr></thead>`;
  const rankSections = LAN_USER_RANK_ORDER.map((rank) => {
    const usersInRank = groups.get(rank) || [];
    if (!usersInRank.length) return "";
    return `<details class="clinical-lan-rank-group" open>
      <summary class="clinical-lan-rank-group-summary">
        <span class="clinical-lan-rank-group-title">${escapeHtml2(rank)}</span>
        <span class="clinical-lan-rank-group-count">${usersInRank.length}</span>
      </summary>
      <div class="clinical-lan-users-table-wrap">
        <table class="clinical-lan-users-table clinical-lan-users-table--assign">
          ${tableHead}
          <tbody>${usersInRank.map((u) => renderLanUserRowHtml(u, teamList, rowOpts)).join("")}</tbody>
        </table>
      </div>
    </details>`;
  }).join("");
  const otherSection = other.length ? `<details class="clinical-lan-rank-group" open>
        <summary class="clinical-lan-rank-group-summary">
          <span class="clinical-lan-rank-group-title">Otros</span>
          <span class="clinical-lan-rank-group-count">${other.length}</span>
        </summary>
        <div class="clinical-lan-users-table-wrap">
          <table class="clinical-lan-users-table clinical-lan-users-table--assign">
            ${tableHead}
            <tbody>${other.map((u) => renderLanUserRowHtml(u, teamList, rowOpts)).join("")}</tbody>
          </table>
        </div>
      </details>` : "";
  const teamsHint = teamList.length ? "" : '<p class="clinical-teams-empty">Crea un equipo vac\xEDo en Mi rotaci\xF3n para poder asignar residentes.</p>';
  return `
    <p class="clinical-lan-users-modal-lead">${list.length} usuario${list.length === 1 ? "" : "s"} \xB7 <strong>todas las salas</strong> en esta Mac (no filtra por tu sala). Asigna a cualquier equipo activo.</p>
    ${teamsHint}
    <div class="clinical-lan-rank-groups">${rankSections}${otherSection}</div>`;
}
function syncLanAssignCycleSelect(teamSelect, preferredCycle = "") {
  if (!(teamSelect instanceof HTMLSelectElement)) return;
  const row = teamSelect.closest(".clinical-lan-user-row");
  const cycleSelect = row?.querySelector(".clinical-lan-assign-cycle");
  if (!(cycleSelect instanceof HTMLSelectElement)) return;
  const teamId = String(teamSelect.value || "").trim();
  if (!teamId) {
    cycleSelect.innerHTML = '<option value="">\u2014 Ciclo \u2014</option>';
    cycleSelect.disabled = true;
    return;
  }
  const team = _lanUsersModalTeams.find((t2) => String(t2.team_id) === teamId);
  const userId = String(row?.dataset.userId || "").trim();
  const userRank = String(row?.dataset.userRank || "R1");
  const letters = team ? cycleLettersForAssign(team, userRank) : [];
  const rowPreferred = String(preferredCycle || row?.dataset.preferredCycle || "").trim();
  let defaultCycle = team ? resolveMembershipCycleForUser(team, userId, userRank) : letters[0] || "A";
  if (rowPreferred && letters.includes(rowPreferred)) {
    defaultCycle = rowPreferred;
  }
  cycleSelect.innerHTML = letters.map((letter) => {
    const label = formatLanCycleOptionLabel(letter, userRank);
    return `<option value="${escapeAttr2(letter)}" ${letter === defaultCycle ? "selected" : ""}>${escapeHtml2(label)}</option>`;
  }).join("");
  cycleSelect.disabled = letters.length === 0;
  cycleSelect.value = defaultCycle;
}
function initLanUserRowAssignState(row) {
  const teamSelect = row.querySelector(".clinical-lan-assign-team");
  if (!(teamSelect instanceof HTMLSelectElement)) return;
  const preferred = String(row.dataset.preferredCycle || "").trim();
  syncLanAssignCycleSelect(teamSelect, preferred);
}
async function handleLanAssignUserToTeam(userId, teamId, subAreaFraction) {
  const api3 = dbApi3();
  if (!api3 || typeof api3.dbClinicalTeamsMemberAdd !== "function") {
    toast2("No se pudo asignar.", "error");
    return false;
  }
  const res = await api3.dbClinicalTeamsMemberAdd({
    teamId,
    userId,
    subAreaFraction
  });
  if (!res || res.ok === false) {
    toast2(res?.error || "No se asign\xF3 al equipo.", "error");
    return false;
  }
  return true;
}
async function handleLanDeleteDirectoryUserClick(btn) {
  const userId = String(btn.dataset.userId || "").trim();
  if (!userId) return;
  const label = String(btn.dataset.userLabel || "").trim() || userId;
  const api3 = dbApi3();
  if (!api3 || typeof api3.dbClinicalUserDelete !== "function") {
    toast2("Eliminar usuarios requiere R+ de escritorio con base cl\xEDnica desbloqueada.", "error");
    return;
  }
  const confirmed = window.confirm(
    `\xBFEliminar a \xAB${label}\xBB de la base cl\xEDnica en esta Mac?

Desaparecer\xE1 del directorio LAN. Las dem\xE1s R+ en la misma sala \u21C4 lo quitar\xE1n al sincronizar.`
  );
  if (!confirmed) return;
  btn.disabled = true;
  const res = await api3.dbClinicalUserDelete({
    targetUserId: userId,
    callerUserId: currentUserId()
  });
  btn.disabled = false;
  if (!res?.ok) {
    toast2(res?.error || "No se pudo eliminar el usuario.", "error");
    return;
  }
  toast2("Usuario eliminado de esta Mac.", "success");
  const { flushClinicalProfileToLan: flushClinicalProfileToLan2, isBenignLanPushSkipCode: isBenignLanPushSkipCode2 } = await import("/js/chunks/clinical-profile-lan-sync-FWPVILFH.js");
  const lanPush = await flushClinicalProfileToLan2();
  if (!lanPush.ok && !isBenignLanPushSkipCode2(lanPush.code)) {
    toast2(
      "Usuario eliminado aqu\xED, pero no se pudo publicar el cambio a la sala \u21C4. Revisa la conexi\xF3n.",
      "warning"
    );
  }
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
  await openLanUsersDirectoryModal();
}
async function handleLanAssignButtonClick(btn) {
  if (!(btn instanceof HTMLButtonElement)) return;
  const row = btn.closest(".clinical-lan-user-row");
  if (!row) return;
  const userId = String(btn.dataset.userId || row.dataset.userId || "").trim();
  const teamSelect = row.querySelector(".clinical-lan-assign-team");
  const cycleSelect = row.querySelector(".clinical-lan-assign-cycle");
  const teamId = teamSelect instanceof HTMLSelectElement ? String(teamSelect.value || "").trim() : "";
  let subAreaFraction = cycleSelect instanceof HTMLSelectElement ? String(cycleSelect.value || "").trim() : "";
  if (!userId || !teamId) {
    toast2("Elige un equipo.", "error");
    return;
  }
  const team = _lanUsersModalTeams.find((t2) => String(t2.team_id) === teamId);
  const userRank = String(row.dataset.userRank || "R1");
  if (!subAreaFraction && team) {
    subAreaFraction = resolveMembershipCycleForUser(team, userId, userRank);
  }
  if (!subAreaFraction) {
    toast2("Elige el ciclo del integrante.", "error");
    return;
  }
  const wasMember = Boolean(
    team?.members?.some((m) => String(m.user_id || "") === userId)
  );
  btn.disabled = true;
  const ok = await handleLanAssignUserToTeam(userId, teamId, subAreaFraction);
  btn.disabled = false;
  if (!ok) return;
  toast2(wasMember ? "Ciclo actualizado." : "Integrante asignado al equipo.", "success");
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
  await publishClinicalTeamsToLan();
  await fetchClinicalTeamsFromDb();
  await openLanUsersDirectoryModal();
}
async function loadLanUsersDirectoryIntoHost(host) {
  const api3 = dbApi3();
  if (!api3 || typeof api3.dbClinicalUsersList !== "function") {
    host.innerHTML = '<p class="clinical-teams-empty">Directorio solo en la app de escritorio R+ (base cl\xEDnica desbloqueada). En iPad/m\xF3vil usa el censo LAN; Mi rotaci\xF3n con directorio requiere Mac.</p>';
    return;
  }
  const callerUserId = currentUserId();
  const [usersRes, teamsRes] = await Promise.all([
    api3.dbClinicalUsersList({ callerUserId }),
    typeof api3.dbClinicalTeamsList === "function" ? api3.dbClinicalTeamsList() : Promise.resolve(null)
  ]);
  if (!usersRes?.ok) {
    host.innerHTML = `<p class="clinical-teams-empty">${escapeHtml2(usersRes?.error || "No se pudo cargar el directorio.")}</p>`;
    return;
  }
  _lanUsersModalTeams = teamsRes?.ok && Array.isArray(teamsRes.teams) ? teamsRes.teams : [];
  const sessionUser = clinicalSessionContext.user || {};
  host.innerHTML = renderLanUsersModalBodyHtml(usersRes.users, _lanUsersModalTeams, {
    canDelete: canDeleteLanDirectoryUser(sessionUser),
    callerUserId: currentUserId()
  });
  host.querySelectorAll(".clinical-lan-user-row").forEach((row) => initLanUserRowAssignState(row));
  const title = document.getElementById("clinical-lan-users-title");
  if (title) {
    const n = Array.isArray(usersRes.users) ? usersRes.users.length : 0;
    title.textContent = `Directorio de usuarios LAN (${n})`;
  }
}
function backgroundRefreshLanUsersDirectory() {
  void import("/js/chunks/lan-sync-IACFT74Q.js").then((lanMod) => {
    if (typeof lanMod.refreshLanClinicalDirectoryFromRoom !== "function") return false;
    return lanMod.refreshLanClinicalDirectoryFromRoom({ timeoutMs: 5e3 });
  }).then((refreshed) => {
    if (!refreshed) return;
    const host = lanUsersModalBodyEl();
    const bd = lanUsersModalBackdropEl();
    if (!host || !bd?.classList.contains("open")) return;
    return loadLanUsersDirectoryIntoHost(host);
  }).catch(() => {
  });
}
async function openLanUsersDirectoryModal() {
  const user = clinicalSessionContext.user || {};
  if (!canViewLanUserDirectory(user)) {
    toast2(
      "Solo R4, Admin o quien tenga privilegios de administraci\xF3n puede abrir el directorio LAN.",
      "warn"
    );
    return;
  }
  const bd = lanUsersModalBackdropEl();
  const host = lanUsersModalBodyEl();
  if (!bd || !host) {
    console.error("[Directorio LAN] Falta #clinical-lan-users-backdrop o #clinical-lan-users-panel-body");
    toast2(
      "No se pudo abrir el directorio (falta el di\xE1logo en la UI). Ejecuta npm run build:ui y reinicia R+.",
      "error"
    );
    return;
  }
  host.innerHTML = '<p class="clinical-teams-empty">Cargando directorio\u2026</p>';
  document.body.classList.add("clinical-lan-directory-open");
  bd.classList.add("open");
  bd.setAttribute("aria-hidden", "false");
  try {
    await loadLanUsersDirectoryIntoHost(host);
  } catch (err) {
    console.error("[Directorio LAN]", err);
    host.innerHTML = `<p class="clinical-teams-empty">${escapeHtml2(
      err instanceof Error ? err.message : "No se pudo cargar el directorio."
    )}</p>`;
  }
  backgroundRefreshLanUsersDirectory();
}
function closeLanUsersDirectoryModal() {
  const bd = lanUsersModalBackdropEl();
  if (!bd) return;
  bd.classList.remove("open");
  bd.setAttribute("aria-hidden", "true");
  document.body.classList.remove("clinical-lan-directory-open");
}
function wireLanUsersDirectoryControls() {
  if (typeof document !== "undefined" && !document._rpcLanUsersOpsSyncedWired) {
    document._rpcLanUsersOpsSyncedWired = true;
    document.addEventListener("rpc-clinical-ops-synced", () => {
      const bd2 = lanUsersModalBackdropEl();
      const host2 = lanUsersModalBodyEl();
      if (!bd2?.classList.contains("open") || !host2) return;
      void loadLanUsersDirectoryIntoHost(host2);
    });
  }
  const panelHost = getClinicalTeamsPanelHost();
  if (panelHost && !panelHost._rpcLanDirOpenDelegated) {
    panelHost._rpcLanDirOpenDelegated = true;
    panelHost.addEventListener("click", (ev) => {
      const openBtn2 = ev.target instanceof Element ? ev.target.closest("#btn-open-lan-users-directory, .clinical-teams-open-lan-users-btn") : null;
      if (!openBtn2) return;
      ev.preventDefault();
      void openLanUsersDirectoryModal();
    });
  }
  const openBtn = document.getElementById("btn-open-lan-users-directory");
  if (openBtn && !openBtn._rpcLanDirOpenWired) {
    openBtn._rpcLanDirOpenWired = true;
    openBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      void openLanUsersDirectoryModal();
    });
  }
  const bd = lanUsersModalBackdropEl();
  if (bd && !bd._rpcLanUsersBackdropWired) {
    bd._rpcLanUsersBackdropWired = true;
    bd.addEventListener("click", (ev) => {
      if (ev.target === bd) closeLanUsersDirectoryModal();
    });
  }
  const closeBtn = document.getElementById("btn-clinical-lan-users-close");
  if (closeBtn && !closeBtn._rpcLanUsersCloseWired) {
    closeBtn._rpcLanUsersCloseWired = true;
    closeBtn.addEventListener("click", () => closeLanUsersDirectoryModal());
  }
  const host = lanUsersModalBodyEl();
  if (host && !host._rpcLanUsersAssignWired) {
    host._rpcLanUsersAssignWired = true;
    host.addEventListener("change", (ev) => {
      const teamSelect = ev.target instanceof Element ? ev.target.closest(".clinical-lan-assign-team") : null;
      if (teamSelect) syncLanAssignCycleSelect(teamSelect);
    });
    host.addEventListener("click", (ev) => {
      const delBtn = ev.target instanceof Element ? ev.target.closest(".clinical-lan-delete-user-btn") : null;
      if (delBtn) {
        void handleLanDeleteDirectoryUserClick(delBtn);
        return;
      }
      const btn = ev.target instanceof Element ? ev.target.closest(".clinical-lan-assign-btn") : null;
      if (btn) void handleLanAssignButtonClick(btn);
    });
  }
}

// public/js/features/clinical-teams/teams-roster-render.mjs
function syncCreateTeamCycleField() {
  const service = String(document.getElementById("clinical-team-create-service")?.value || "Sala");
  const rank = effectiveClinicalRank(clinicalSessionContext.user);
  const r1Line = Number(document.getElementById("clinical-team-create-r1-line")?.value || 0);
  const meta = getCycleFieldMetaForTeamCreate(service, rank, r1Line === 1 ? 1 : 0);
  const label = document.getElementById("clinical-team-create-day-label");
  const hint = document.getElementById("clinical-team-create-day-hint");
  const daySelect = document.getElementById("clinical-team-create-day");
  const r1LineGroup = document.getElementById("clinical-team-r1-line-group");
  const svcKey = service.trim().toLowerCase();
  const showR1Line = rank === "R1" && svcKey.includes("sala");
  if (r1LineGroup) r1LineGroup.hidden = !showR1Line;
  if (label) label.textContent = meta.label;
  if (hint) hint.textContent = meta.hint;
  if (!daySelect) return;
  const prev = String(daySelect.value || "");
  const letters = getCycleLettersForTeamCreate(service, rank, r1Line === 1 ? 1 : 0);
  daySelect.innerHTML = letters.map((letter) => `<option value="${escapeAttr2(letter)}">${escapeHtml2(letter)}</option>`).join("");
  if (prev && letters.includes(prev)) daySelect.value = prev;
}
function renderCreateTeamForm() {
  const user = clinicalSessionContext.user || {};
  if (canManageTeamRoster(user)) {
    return renderCreateTeamFormElevated(user);
  }
  return renderCreateTeamFormStandard();
}
function renderCreateTeamFormElevated(user) {
  const homeSala = String(user?.sala || "").trim();
  return `
    <details class="clinical-teams-details" open>
      <summary>Crear equipo vac\xEDo</summary>
      <div class="clinical-teams-details-body">
        <form id="clinical-team-create-form" class="clinical-teams-create-form clinical-teams-create-form--elevated">
          <div class="field-group">
            <label for="clinical-team-create-name">Nombre del equipo</label>
            <input id="clinical-team-create-name" type="text" class="profile-input" placeholder="Equipo A \xB7 Dr. Guti\xE9rrez" required>
            ${hintHtml("Solo el nombre; sin integrantes todav\xEDa.")}
          </div>
          <div class="field-group">
            <label for="clinical-team-create-sala">Sala</label>
            <select id="clinical-team-create-sala" class="profile-input" required>
              <option value="">\u2014 Seleccionar sala \u2014</option>
              ${CLINICAL_SALAS.map(
    (s) => `<option value="${escapeAttr2(s)}" ${homeSala === s ? "selected" : ""}>${escapeHtml2(s)}</option>`
  ).join("")}
            </select>
          </div>
          <p class="clinical-teams-hint clinical-teams-create-elevated-hint">Asigna residentes despu\xE9s desde <strong>Directorio de usuarios LAN</strong>.</p>
          <div class="modal-actions clinical-teams-create-submit-wrap">
            <button type="submit" class="btn-save">Crear equipo vac\xEDo</button>
          </div>
        </form>
      </div>
    </details>`;
}
function renderCreateTeamFormStandard() {
  const serviceOptions = CLINICAL_TEAM_SERVICES.map(
    (svc) => `<option value="${escapeAttr2(svc)}">${escapeHtml2(svc)}</option>`
  ).join("");
  const rank = effectiveClinicalRank(clinicalSessionContext.user);
  const defaultService = CLINICAL_TEAM_SERVICES[0];
  const defaultLetters = getCycleLettersForTeamCreate(defaultService, rank, 0);
  const defaultMeta = getCycleFieldMetaForTeamCreate(defaultService, rank, 0);
  const letterOptions = defaultLetters.map((letter) => `<option value="${escapeAttr2(letter)}">${escapeHtml2(letter)}</option>`).join("");
  const svcKey = defaultService.trim().toLowerCase();
  const showR1Line = rank === "R1" && svcKey.includes("sala");
  return `
    <details class="clinical-teams-details">
      <summary>Crear nuevo equipo</summary>
      <div class="clinical-teams-details-body">
        <form id="clinical-team-create-form" class="clinical-teams-create-form">
          <div class="field-group" id="clinical-team-sala-group">
            <label for="clinical-team-create-sala">Sala</label>
            <select id="clinical-team-create-sala" class="profile-input">
              <option value="">\u2014 Seleccionar sala \u2014</option>
              ${CLINICAL_SALAS.map((s) => `<option value="${escapeAttr2(s)}">${escapeHtml2(s)}</option>`).join("")}
            </select>
          </div>
          <div class="field-group">
            <label for="clinical-team-create-name">Nombre del equipo (residente l\xEDder)</label>
            <input id="clinical-team-create-name" type="text" class="profile-input" placeholder="Dr. Guti\xE9rrez" required>
          </div>
          <div class="field-group">
            <label for="clinical-team-create-service">Servicio</label>
            <select id="clinical-team-create-service" class="profile-input" required>${serviceOptions}</select>
          </div>
          <div class="field-group" id="clinical-team-r1-line-group" ${showR1Line ? "" : "hidden"}>
            <label for="clinical-team-create-r1-line">L\xEDnea R1 en el equipo</label>
            <select id="clinical-team-create-r1-line" class="profile-input">
              <option value="0">Primera l\xEDnea \xB7 A1\u2013D1</option>
              <option value="1">Segunda l\xEDnea \xB7 A2\u2013D2</option>
            </select>
          </div>
          <div class="field-group">
            <label id="clinical-team-create-day-label" for="clinical-team-create-day">${escapeHtml2(defaultMeta.label)}</label>
            <select id="clinical-team-create-day" class="profile-input" required>${letterOptions}</select>
            <p id="clinical-team-create-day-hint" class="clinical-teams-hint">${escapeHtml2(defaultMeta.hint)}</p>
          </div>
          <div class="modal-actions" style="margin-top: 8px;">
            <button type="submit" class="btn-save">Crear equipo</button>
          </div>
        </form>
      </div>
    </details>`;
}
function renderTeamMetaLine(team) {
  const parts = [];
  const sala = String(team.sala || "").trim();
  const service = String(team.service || "").trim();
  if (sala) parts.push(sala);
  if (service && service.toLowerCase() !== "sala") parts.push(service);
  if (!parts.length) return "";
  return `<p class="clinical-teams-card-meta">${parts.map((p) => escapeHtml2(p)).join(" \xB7 ")}</p>`;
}
function renderCycleSelectForRank(team, rank, current, selectId) {
  const service = String(team.service || "Sala");
  const isSala = service.toLowerCase().includes("sala");
  const id = selectId || "clinical-cycle-select";
  const cur = String(current || "").trim();
  let letters = [];
  if (isSala && rank === "R2") {
    letters = getCycleLettersForTeamCreate("Sala", "R2");
  } else if (isSala && rank === "R1") {
    letters = [
      ...getCycleLettersForTeamCreate("Sala", "R1", 0),
      ...getCycleLettersForTeamCreate("Sala", "R1", 1)
    ];
  } else {
    letters = getCycleLettersForTeamCreate(service, rank);
  }
  const opts = letters.map(
    (l) => `<option value="${escapeAttr2(l)}" ${l === cur ? "selected" : ""}>${escapeHtml2(l)}</option>`
  ).join("");
  return `<select id="${escapeAttr2(id)}" class="profile-input clinical-teams-cycle-select" required>${opts}</select>`;
}
function renderAddMemberCycleSelect(team) {
  const teamId = String(team.team_id || "");
  const service = String(team.service || "Sala");
  const isSala = service.toLowerCase().includes("sala");
  const id = `clinical-add-cycle-${teamId}`;
  if (!isSala) {
    const letters = getCycleLettersForTeamCreate(service, "R2");
    return `<select id="${escapeAttr2(id)}" class="profile-input clinical-teams-add-member-cycle" required>
      ${letters.map((l) => `<option value="${escapeAttr2(l)}">${escapeHtml2(l)}</option>`).join("")}
    </select>`;
  }
  const r2 = getCycleLettersForTeamCreate("Sala", "R2");
  const r1a = getCycleLettersForTeamCreate("Sala", "R1", 0);
  const r1b = getCycleLettersForTeamCreate("Sala", "R1", 1);
  return `<select id="${escapeAttr2(id)}" class="profile-input clinical-teams-add-member-cycle" required>
    <optgroup label="R2 \xB7 A\u2013F">${r2.map((l) => `<option value="${escapeAttr2(l)}">${escapeHtml2(l)}</option>`).join("")}</optgroup>
    <optgroup label="R1 \xB7 primera l\xEDnea">${r1a.map((l) => `<option value="${escapeAttr2(l)}">${escapeHtml2(l)}</option>`).join("")}</optgroup>
    <optgroup label="R1 \xB7 segunda l\xEDnea">${r1b.map((l) => `<option value="${escapeAttr2(l)}">${escapeHtml2(l)}</option>`).join("")}</optgroup>
  </select>`;
}
function renderMemberRow(m) {
  const handle = escapeHtml2(m.username || m.user_id);
  const name = String(m.clinical_name || "").trim();
  const rank = escapeHtml2(effectiveClinicalRank({ rank: m.rank }));
  const displayName = name ? escapeHtml2(name) : handle;
  const cycle = formatMemberCycleLabel(m);
  const meta = name ? `@${handle} \xB7 ${rank}` : rank;
  const cycleHtml = cycle ? `<span class="clinical-teams-member-cycle">${escapeHtml2(cycle)}</span>` : "";
  return `<li class="clinical-teams-member-row">
    <span class="clinical-teams-member-row-name">${displayName}</span>
    <span class="clinical-teams-member-row-meta">${meta}${cycleHtml ? ` \xB7 ${cycleHtml}` : ""}</span>
  </li>`;
}
function renderMembersBlock(members, { compact = false } = {}) {
  const list = Array.isArray(members) ? members : [];
  const count = list.length;
  const rows = count ? list.map((m) => renderMemberRow(m)).join("") : '<li class="clinical-teams-empty clinical-teams-empty--inline">Sin integrantes</li>';
  const heading = count === 1 ? "Integrantes (1)" : `Integrantes (${count})`;
  return `
    <div class="clinical-teams-card-members${compact ? " clinical-teams-card-members--compact" : ""}">
      <h6 class="clinical-teams-members-heading">${heading}</h6>
      <ul class="clinical-teams-member-rows">${rows}</ul>
    </div>`;
}
function renderMyCycleEditBlock(team, user) {
  const teamId = String(team.team_id || "");
  const userId = String(user?.user_id || "");
  const handle = normalizeUsername2(user?.username || "");
  const members = Array.isArray(team.members) ? team.members : [];
  const me = members.find((m) => {
    if (userId && String(m.user_id) === userId) return true;
    if (handle && normalizeUsername2(m.username || "") === handle) return true;
    return false;
  });
  if (!me) return "";
  const rank = effectiveClinicalRank({ rank: me.rank });
  const current = String(me.sub_area_fraction || "").trim();
  const selectId = `clinical-my-cycle-${teamId}`;
  const hint = rank === "R2" ? "Tu letra A\u2013F en el ciclo de sala." : rank === "R1" ? "Tu subciclo (A1\u2013D1 o A2\u2013D2), independiente del resto del equipo." : "Letra de rotaci\xF3n para este servicio.";
  return `
    <div class="clinical-teams-my-cycle-box">
      <form class="clinical-teams-my-cycle-form" data-team-id="${escapeAttr2(teamId)}">
        <h6 class="clinical-teams-my-cycle-title">Mi ciclo en este equipo</h6>
        <p class="clinical-teams-hint">${escapeHtml2(hint)}</p>
        <div class="clinical-teams-my-cycle-row">
          <label class="visually-hidden" for="${escapeAttr2(selectId)}">Mi ciclo</label>
          ${renderCycleSelectForRank(team, rank, current, selectId)}
          <button type="submit" class="btn-save">Guardar</button>
        </div>
      </form>
    </div>`;
}
function renderLeaveTeamBox(team) {
  const teamId = escapeAttr2(String(team.team_id || ""));
  const teamName = escapeAttr2(String(team.name || "este equipo"));
  return `
    <div class="clinical-teams-leave-box">
      <button type="button" class="btn-med-secondary clinical-teams-leave-btn" data-team-id="${teamId}" data-team-name="${teamName}">
        Salir del equipo
      </button>
    </div>`;
}
function renderTeamManageActionsHtml(team) {
  const teamId = escapeAttr2(String(team.team_id || ""));
  const teamNameAttr = escapeAttr2(String(team.name || "Equipo"));
  return `
    <div class="clinical-teams-manage-actions">
      <button type="button" class="btn-med-secondary clinical-teams-edit-btn" data-team-id="${teamId}">Editar</button>
      <button type="button" class="btn-med-secondary clinical-teams-delete-btn" data-team-id="${teamId}" data-team-name="${teamNameAttr}">Eliminar</button>
    </div>`;
}
function renderTeamEditPanelHtml(team) {
  const teamId = escapeAttr2(String(team.team_id || ""));
  const name = escapeHtml2(String(team.name || ""));
  const sala = String(team.sala || "").trim();
  return `
    <div class="clinical-teams-edit-panel" hidden data-team-id="${teamId}">
      <form class="clinical-teams-edit-form" data-team-id="${teamId}">
        <div class="field-group">
          <label for="clinical-edit-name-${teamId}">Nombre del equipo</label>
          <input id="clinical-edit-name-${teamId}" type="text" class="profile-input clinical-teams-edit-name" value="${name}" required>
        </div>
        <div class="field-group">
          <label for="clinical-edit-sala-${teamId}">Sala</label>
          <select id="clinical-edit-sala-${teamId}" class="profile-input clinical-teams-edit-sala" required>
            ${CLINICAL_SALAS.map(
    (s) => `<option value="${escapeAttr2(s)}" ${sala === s ? "selected" : ""}>${escapeHtml2(s)}</option>`
  ).join("")}
          </select>
        </div>
        <div class="clinical-teams-edit-form-actions">
          <button type="submit" class="btn-save">Guardar cambios</button>
          <button type="button" class="btn-med-secondary clinical-teams-edit-cancel">Cancelar</button>
        </div>
      </form>
    </div>`;
}
function renderTeamManageBlock(team) {
  const user = clinicalSessionContext.user || {};
  if (!canManageTeamRoster(user)) return { actionsHtml: "", editPanelHtml: "" };
  return {
    actionsHtml: renderTeamManageActionsHtml(team),
    editPanelHtml: renderTeamEditPanelHtml(team)
  };
}
function renderJoinedTeamCard(team) {
  const user = clinicalSessionContext.user || {};
  const teamId = String(team.team_id || "");
  const members = Array.isArray(team.members) ? team.members : [];
  const manage = renderTeamManageBlock(team);
  return `
    <article class="clinical-teams-card clinical-teams-card--mine" data-team-id="${escapeAttr2(teamId)}">
      <div class="clinical-teams-card-top${manage.actionsHtml ? " clinical-teams-card-top--directory" : ""}">
        <div class="clinical-teams-card-top-text">
          <p class="clinical-teams-card-eyebrow">Residente l\xEDder</p>
          <h5 class="clinical-teams-card-title">${escapeHtml2(team.name || "Equipo")}</h5>
          ${renderTeamMetaLine(team)}
        </div>
        ${manage.actionsHtml ? `<div class="clinical-teams-card-actions">${manage.actionsHtml}</div>` : ""}
      </div>
      ${manage.editPanelHtml}
      ${renderMembersBlock(members)}
      ${renderMyCycleEditBlock(team, user)}
      ${renderLeaveTeamBox(team)}
      <div class="clinical-teams-invite-box">
        <p class="clinical-teams-invite-code-line">C\xF3digo para invitar: <code class="clinical-teams-invite-code">${escapeHtml2(teamInviteCode(teamId))}</code></p>
        <div class="clinical-teams-invite-link-row">
          <button type="button" class="btn-med-secondary clinical-teams-copy-invite-btn" data-team-id="${escapeAttr2(teamId)}">Copiar invitaci\xF3n</button>
          <p class="clinical-teams-invite-hint">Incluye el c\xF3digo e instrucciones para <strong>Mi rotaci\xF3n</strong> en la app R+ del Mac (no Safari).</p>
        </div>
        <form class="clinical-teams-add-member-form" data-team-id="${escapeAttr2(teamId)}" data-team-service="${escapeAttr2(team.service || "")}">
          <p class="clinical-teams-add-member-label">Agregar integrante</p>
          <div class="clinical-teams-add-member-fields">
            <div class="field-group clinical-teams-add-member-user">
              <label for="clinical-add-member-${escapeAttr2(teamId)}">Usuario LAN</label>
              <input id="clinical-add-member-${escapeAttr2(teamId)}" type="text" class="profile-input clinical-teams-add-member-input" placeholder="sin @" required aria-describedby="clinical-add-hint-${escapeAttr2(teamId)}">
            </div>
            <div class="field-group clinical-teams-add-cycle-group">
              <label for="clinical-add-cycle-${escapeAttr2(teamId)}">Ciclo del integrante</label>
              ${renderAddMemberCycleSelect(team)}
            </div>
            <button type="submit" class="btn-save clinical-teams-btn-add">Agregar</button>
          </div>
          <p class="clinical-teams-invite-hint" id="clinical-add-hint-${escapeAttr2(teamId)}">Debe existir en Mi rotaci\xF3n (usuario LAN, sin @). Cada R1/R2 lleva su propio ciclo (D1, D2, A\u2013F).</p>
        </form>
      </div>
    </article>`;
}
function renderDirectoryTeamCard(team, opts = {}) {
  const teamId = String(team.team_id || "");
  const members = Array.isArray(team.members) ? team.members : [];
  const action = opts.actionHtml || "";
  const manage = opts.manageHtml || "";
  const editPanel = opts.editPanelHtml || "";
  const sideActions = [action, manage].filter(Boolean).join("");
  return `
    <article class="clinical-teams-card clinical-teams-card--directory" data-team-id="${escapeAttr2(teamId)}">
      <div class="clinical-teams-card-top clinical-teams-card-top--directory">
        <div class="clinical-teams-card-top-text">
          <p class="clinical-teams-card-eyebrow">Equipo en sala</p>
          <h5 class="clinical-teams-card-title">${escapeHtml2(team.name || "")}</h5>
          ${renderTeamMetaLine(team)}
        </div>
        ${sideActions ? `<div class="clinical-teams-card-actions">${sideActions}</div>` : ""}
      </div>
      ${editPanel}
      ${renderMembersBlock(members, { compact: true })}
    </article>`;
}
async function renderClinicalTeamsPanel(opts = {}) {
  const silent = !!opts.silent;
  const skipLanPull = !!opts.skipLanPull || silent;
  if (silent) {
    const host = getClinicalTeamsPanelHost();
    if (!host) return;
    try {
      await renderClinicalTeamsPanelInto(host, { skipLanPull });
    } catch (err) {
      console.error("[Mi rotaci\xF3n]", err);
      setClinicalTeamsPanelError(
        err instanceof Error ? err.message : "Error al cargar Mi rotaci\xF3n."
      );
    }
    return;
  }
  await safeRenderClinicalTeamsPanel(async (host) => {
    await renderClinicalTeamsPanelInto(host, { skipLanPull: false });
  });
}
async function tryReconcileTeamMemberships() {
  const userId = currentUserId();
  const user = clinicalSessionContext.user;
  if (!userId || !user) return false;
  let joined = filterJoinedTeams(clinicalSessionContext.teams, user);
  if (joined.length) return false;
  const api3 = dbApi3();
  if (!api3 || typeof api3.dbClinicalMembershipMigrate !== "function") return false;
  const settings = readRpcSettings();
  const fromUserId = String(settings.clinicalStaleDeviceUserId || "");
  if (!fromUserId || fromUserId === userId) return false;
  const res = await api3.dbClinicalMembershipMigrate({ fromUserId, toUserId: userId });
  if (!res?.ok) return false;
  await fetchClinicalTeamsFromDb();
  joined = filterJoinedTeams(clinicalSessionContext.teams, user);
  return joined.length > 0;
}
function resolveDisplayLanHandle(user, usernameForInput) {
  const saved = normalizeUsername2(user?.username || "");
  if (saved && isValidUsernameFormat2(saved)) return saved;
  const draft = normalizeUsername2(usernameForInput || "");
  if (draft && isValidUsernameFormat2(draft)) return draft;
  return "";
}
async function renderClinicalTeamsPanelInto(host, opts = {}) {
  const userId = currentUserId();
  if (!userId) {
    host.innerHTML = '<p class="clinical-teams-lead">Activa la sesi\xF3n cl\xEDnica para gestionar equipos.</p>';
    return;
  }
  if (!opts.skipLanPull) {
    await pullClinicalOpsFromLanRoom();
  }
  await fetchClinicalTeamsFromDb();
  await tryReconcileTeamMemberships();
  const user = clinicalSessionContext.user || {};
  const joined = filterJoinedTeams(clinicalSessionContext.teams, user);
  let clientId = "";
  let settings = {};
  try {
    settings = JSON.parse(localStorage.getItem("rpc-settings") || "{}");
    clientId = String(settings.clientId || "");
  } catch (_e) {
  }
  const rawUsername = String(user.username || "");
  const legacyUsername = isLegacyMachineUsername(rawUsername, clientId);
  const usernameForInput = legacyUsername ? String(settings.clinicalUsername || "").trim() : rawUsername;
  const displayHandle = resolveDisplayLanHandle(user, usernameForInput);
  const savedHandle = normalizeUsername2(user.username || "");
  const handleHint = displayHandle ? `<p class="clinical-teams-lead clinical-teams-handle-hint">Tu usuario LAN: <strong>@${escapeHtml2(displayHandle)}</strong> \u2014 comp\xE1rtelo para que te agreguen a un equipo.${savedHandle !== displayHandle ? " Pulsa <strong>Guardar perfil</strong> para registrarlo en la red." : ""}</p>` : "";
  const joinedHtml = joined.length ? joined.map((team) => renderJoinedTeamCard(team)).join("") : `<p class="clinical-teams-empty clinical-teams-empty--section">A\xFAn no perteneces a ning\xFAn equipo. ${displayHandle ? "Pide que te agreguen con tu @usuario o " : ""}explora equipos en tu sala abajo.</p>`;
  const rank = effectiveClinicalRank(user);
  const programAdmin = hasProgramAdminPrivileges(user);
  const elevated = hasElevatedTeamPrivileges(user);
  const canViewLanUsers = canViewLanUserDirectory(user);
  const sala = String(user.sala || "").trim();
  const clinicalName = escapeHtml2(user.clinical_name || "");
  const legacyBanner = legacyUsername ? '<p class="clinical-teams-legacy-banner">Registra tu usuario LAN (obligatorio). Sin esto no apareces en equipos ni entregas.</p>' : "";
  const lanDirectoryNote = canViewLanUsers ? "" : `<p class="clinical-teams-lan-directory-note">El directorio completo de usuarios LAN lo abren <strong>R4</strong>, <strong>Admin</strong> o quien tenga <strong>privilegios de administraci\xF3n</strong>. Al registrar <strong>@usuario</strong> debes tener la sala <strong>\u21C4</strong> activa (o haberte unido con invitaci\xF3n); R+ publica tu perfil al guardar.</p>`;
  const profileHandleBanner = displayHandle ? `<p class="clinical-teams-profile-handle">Visible en la red como <strong>@${escapeHtml2(displayHandle)}</strong></p>` : "";
  const profileSection = `
    <div class="clinical-teams-profile-panel clinical-teams-rank-section">
      <h5 class="clinical-teams-subsection-title">Mi perfil y rango</h5>
      ${legacyBanner}
      ${profileHandleBanner}
      ${lanDirectoryNote}
      <form id="clinical-profile-form" class="clinical-teams-create-form">
        <div class="field-group">
          <label for="clinical-profile-username">Usuario LAN *</label>
          <input id="clinical-profile-username" type="text" class="profile-input"
            value="${escapeAttr2(usernameForInput)}"
            placeholder="mgarcia" autocomplete="username"
            pattern="[a-z][a-z0-9_]{2,31}" required>
          ${hintHtml("Min\xFAsculas, 3\u201332 caracteres. Tus compa\xF1eros lo usan para agregarte a equipos.")}
        </div>
        <div class="field-group">
          <label for="clinical-profile-name">Nombre en guardia</label>
          <input id="clinical-profile-name" type="text" class="profile-input" value="${clinicalName}" required>
        </div>
        <div class="field-group">
          <label for="clinical-profile-rank">Rango cl\xEDnico</label>
          <select id="clinical-profile-rank" class="profile-input">
            ${["R1", "R2", "R3", "R4"].map(
    (r) => `<option value="${r}" ${r === rank ? "selected" : ""}>${r}</option>`
  ).join("")}
          </select>
          ${hintHtml("Equipos, entregas y alcance cl\xEDnico.")}
        </div>
        <div class="field-group">
          <label class="clinical-teams-guardia-label">
            <input type="checkbox" id="clinical-profile-admin" ${programAdmin ? "checked" : ""}>
            <span>Privilegios de administraci\xF3n</span>
          </label>
          ${hintHtml("Requiere tu c\xF3digo al activar. Acceso total al programa: rotaci\xF3n, censo global y directorio LAN.")}
        </div>
        <div class="field-group">
          <label for="clinical-profile-sala">${programAdmin ? "Mi sala (rango cl\xEDnico)" : "Sala"}</label>
          <select id="clinical-profile-sala" class="profile-input" required>
            <option value="">\u2014 Seleccionar \u2014</option>
            ${CLINICAL_SALAS.map(
    (s) => `<option value="${escapeAttr2(s)}" ${sala === s ? "selected" : ""}>${escapeHtml2(s)}</option>`
  ).join("")}
          </select>
          ${programAdmin ? hintHtml("Tu equipo y entregas usan esta sala; abajo puedes explorar otras.") : ""}
        </div>
        <div class="modal-actions clinical-teams-profile-save">
          <button type="submit" class="btn-save">Guardar perfil</button>
        </div>
      </form>
    </div>`;
  const browseSala = resolveBrowseSala(elevated, sala);
  const joinCodeSection = renderJoinWithCodeSectionHtml();
  const lanUsersEntry = renderLanUsersDirectoryEntryHtml(user);
  const directorySection = await renderDirectorySectionHtml({
    userId,
    elevated,
    browseSala,
    homeSala: sala
  });
  host.innerHTML = `
    ${handleHint}
    <section class="clinical-teams-section clinical-teams-section--joined">
      <div class="clinical-teams-section-intro">
        <h4 class="clinical-teams-section-title">Mis equipos</h4>
        <p class="clinical-teams-section-desc">Equipos donde ya eres integrante.</p>
      </div>
      <div class="clinical-teams-list">${joinedHtml}</div>
    </section>
    ${directorySection}
    ${lanUsersEntry}
    ${joinCodeSection}
    <section class="clinical-teams-section clinical-teams-section--more">
      <div class="clinical-teams-section-intro">
        <h4 class="clinical-teams-section-title">Configuraci\xF3n</h4>
        <p class="clinical-teams-section-desc">Perfil cl\xEDnico y equipos nuevos.</p>
      </div>
      ${profileSection}
      ${renderCreateTeamForm()}
      <details class="clinical-teams-advanced-rotation">
        <summary class="clinical-teams-advanced-rotation-summary">Zona avanzada \xB7 rotaci\xF3n del programa</summary>
        <div class="clinical-teams-advanced-rotation-body">
          <p class="clinical-teams-advanced-rotation-hint">Solo al cerrar un ciclo de rotaci\xF3n en el hospital. Archiva equipos, memberships y guardias del d\xEDa; los residentes deben volver a crear equipos.</p>
          <button type="button" id="btn-nueva-rotacion" class="btn-med-secondary clinical-teams-nueva-rotacion-btn">Iniciar nueva rotaci\xF3n\u2026</button>
        </div>
      </details>
    </section>`;
  wireClinicalTeamsPanelInteractions();
  wireLanUsersDirectoryControls();
  wireNuevaRotacionControl(host);
  wireJoinButtons();
  wireCopyInviteButtons();
  wireBrowseSalaControl(elevated);
}
function renderJoinWithCodeSectionHtml() {
  return `
    <section class="clinical-teams-section clinical-teams-section--join-code">
      <div class="clinical-teams-section-intro">
        <h4 class="clinical-teams-section-title">Unirte con c\xF3digo de equipo</h4>
        <p class="clinical-teams-section-desc">Pega el c\xF3digo que te envi\xF3 tu R2 (8 caracteres). \xDAsalo en la app R+ del Mac, no en Safari.</p>
      </div>
      <form id="clinical-team-join-code-form" class="clinical-teams-join-code-form">
        <div class="clinical-teams-invite-row clinical-teams-join-code-code-row">
          <label class="visually-hidden" for="clinical-team-join-code-input">C\xF3digo de equipo</label>
          <input id="clinical-team-join-code-input" type="text" class="profile-input" placeholder="ej. 2017936e" maxlength="36" autocomplete="off" required>
        </div>
        <div class="field-group clinical-teams-add-cycle-group">
          <label for="clinical-team-join-code-cycle">Tu ciclo al unirte</label>
          ${renderCycleSelectForRank({ service: "Sala", team_id: "join" }, effectiveClinicalRank(clinicalSessionContext.user), "", "clinical-team-join-code-cycle")}
        </div>
        <div class="clinical-teams-join-submit-wrap">
          <button type="submit" class="btn-save">Unirme</button>
        </div>
      </form>
    </section>`;
}
function resolveBrowseSala(elevated, homeSala) {
  if (!elevated) return homeSala;
  try {
    const stored = localStorage.getItem(BROWSE_SALA_LS);
    if (stored === "__all__") return "__all__";
    if (stored && CLINICAL_SALAS.includes(stored)) return stored;
  } catch (_e) {
  }
  if (!homeSala) return "__all__";
  return homeSala;
}
async function renderDirectorySectionHtml(opts) {
  const { userId, elevated, browseSala, homeSala } = opts;
  const api3 = dbApi3();
  if (!api3 || typeof api3.dbClinicalTeamsListBySala !== "function") return "";
  const listOpts = elevated && browseSala === "__all__" ? { sala: "", forUserId: userId, allSalas: true } : { sala: browseSala || homeSala, forUserId: userId };
  const res = await api3.dbClinicalTeamsListBySala(listOpts);
  let directory = res?.ok && Array.isArray(res.teams) ? res.teams : [];
  directory = directory.filter((t2) => !t2.isMember);
  const browseControl = elevated ? `<label class="clinical-teams-browse-label" for="clinical-browse-sala">Sala</label>
        <select id="clinical-browse-sala" class="profile-input clinical-teams-browse-select" aria-label="Explorar equipos por sala">
          ${CLINICAL_SALAS.map(
    (s) => `<option value="${escapeAttr2(s)}" ${browseSala === s ? "selected" : ""}>${escapeHtml2(s)}</option>`
  ).join("")}
          <option value="__all__" ${browseSala === "__all__" ? "selected" : ""}>Todas las salas</option>
        </select>` : "";
  const sectionTitle = elevated ? browseSala === "__all__" ? "Explorar \xB7 todas las salas" : `Explorar \xB7 ${escapeHtml2(browseSala)}` : `Otros equipos \xB7 ${escapeHtml2(browseSala || homeSala)}`;
  const headRow = browseControl ? `<div class="clinical-teams-section-head-row">
        <div class="clinical-teams-section-intro">
          <h4 class="clinical-teams-section-title">${sectionTitle}</h4>
          <p class="clinical-teams-section-desc">Equipos de la sala a los que puedes unirte.</p>
        </div>
        ${browseControl}
      </div>` : `<div class="clinical-teams-section-intro">
        <h4 class="clinical-teams-section-title">${sectionTitle}</h4>
        <p class="clinical-teams-section-desc">Equipos de la sala a los que puedes unirte.</p>
      </div>`;
  if (!directory.length) {
    const label = browseSala === "__all__" ? "ninguna sala" : escapeHtml2(String(browseSala || homeSala));
    const emptyMsg = elevated ? `No hay otros equipos en ${label}. Los tuyos aparecen arriba.` : `No hay otros equipos disponibles en ${label}.`;
    return `<section class="clinical-teams-section clinical-teams-section--directory">
      ${headRow}
      <p class="clinical-teams-empty">${emptyMsg}</p>
    </section>`;
  }
  const cards = directory.map((team) => {
    const teamId = String(team.team_id || "");
    let action = "";
    if (team.joinEligible) {
      action = `<button type="button" class="btn-med-secondary clinical-teams-join-btn" data-team-id="${escapeAttr2(teamId)}">Unirme</button>`;
    } else if (team.joinReason) {
      action = `<span class="clinical-teams-join-hint">${escapeHtml2(team.joinReason)}</span>`;
    }
    const manage = elevated ? renderTeamManageBlock(team) : { actionsHtml: "", editPanelHtml: "" };
    return renderDirectoryTeamCard(team, {
      actionHtml: action,
      manageHtml: manage.actionsHtml,
      editPanelHtml: manage.editPanelHtml
    });
  }).join("");
  return `
    <section class="clinical-teams-section clinical-teams-section--directory">
      ${headRow}
      <div class="clinical-teams-list">${cards}</div>
    </section>`;
}

// public/js/features/clinical-teams/teams-roster.mjs
function teamsModalEl() {
  return document.getElementById("clinical-teams-backdrop");
}
function isClinicalTeamsPanelOpen() {
  const bd = teamsModalEl();
  return !!(bd && bd.classList.contains("open"));
}
async function refreshTeamsUiAfterChange() {
  await fetchClinicalTeamsFromDb();
  import("/js/chunks/clinical-rotation-entry-V3JYBX6J.js").then((m) => m.syncClinicalRotationEntryChrome());
  if (isClinicalTeamsPanelOpen()) {
    await renderClinicalTeamsPanel({ silent: true, skipLanPull: true });
  }
}
async function openClinicalTeamsPanel() {
  wireClinicalTeamsModalChrome();
  const bd = teamsModalEl();
  if (!bd) return;
  bd.classList.add("open");
  bd.setAttribute("aria-hidden", "false");
  document.body.classList.add("clinical-teams-modal-open");
  const sessionOk = await ensureClinicalPanelSession();
  if (!sessionOk) {
    setClinicalTeamsPanelError(
      "Activa la sesi\xF3n cl\xEDnica (desbloquea la base de datos) para usar Mi rotaci\xF3n."
    );
    return;
  }
  try {
    const { needsClinicalOnboarding } = await import("/js/chunks/clinical-onboarding-GKANG3AX.js");
    if (needsClinicalOnboarding()) {
      closeClinicalTeamsPanel();
      const { openMiRotacion } = await import("/js/chunks/clinical-rotation-entry-V3JYBX6J.js");
      await openMiRotacion();
      return;
    }
    await renderClinicalTeamsPanel();
    const nameInput = document.getElementById("clinical-team-create-name");
    if (nameInput) nameInput.focus();
  } catch (err) {
    console.error("[Mi rotaci\xF3n]", err);
    setClinicalTeamsPanelError(
      err instanceof Error ? err.message : "No se pudo abrir Mi rotaci\xF3n."
    );
  }
}
function closeClinicalTeamsPanel() {
  const bd = teamsModalEl();
  if (!bd) return;
  bd.classList.remove("open");
  bd.setAttribute("aria-hidden", "true");
  document.body.classList.remove("clinical-teams-modal-open");
}
function wireBrowseSalaControl(elevated) {
  if (!elevated) return;
  const select = document.getElementById("clinical-browse-sala");
  if (!select || select._rpcBrowseWired) return;
  select._rpcBrowseWired = true;
  select.addEventListener("change", () => {
    try {
      localStorage.setItem(BROWSE_SALA_LS, String(select.value || ""));
    } catch (_e) {
    }
    void renderClinicalTeamsPanel({ silent: true });
  });
}
function closeTeamEditPanels(exceptPanel) {
  document.querySelectorAll(".clinical-teams-edit-panel").forEach((panel) => {
    if (exceptPanel && panel === exceptPanel) return;
    panel.hidden = true;
  });
}
function teamManageDelegationRoot() {
  return document.getElementById("clinical-teams-panel-body") || teamsModalEl()?.querySelector(".clinical-teams-modal") || null;
}
function wireTeamManageModalDelegation() {
  const root = teamManageDelegationRoot();
  if (!root || root._rpcTeamManageDelegated) return;
  root._rpcTeamManageDelegated = true;
  root.addEventListener("click", (ev) => {
    const target = ev.target instanceof Element ? ev.target : null;
    if (!target) return;
    const leaveBtn = target.closest(".clinical-teams-leave-btn");
    if (leaveBtn instanceof HTMLButtonElement) {
      void handleLeaveTeamClick(leaveBtn);
      return;
    }
    if (!canManageTeamRoster(clinicalSessionContext.user)) return;
    const editBtn = target.closest(".clinical-teams-edit-btn");
    if (editBtn) {
      const card = editBtn.closest(".clinical-teams-card");
      const panel = card?.querySelector(".clinical-teams-edit-panel");
      if (panel instanceof HTMLElement) {
        closeTeamEditPanels(panel);
        panel.hidden = !panel.hidden;
      }
      return;
    }
    const cancelBtn = target.closest(".clinical-teams-edit-cancel");
    if (cancelBtn) {
      const panel = cancelBtn.closest(".clinical-teams-edit-panel");
      if (panel instanceof HTMLElement) panel.hidden = true;
      return;
    }
    const deleteBtn = target.closest(".clinical-teams-delete-btn");
    if (deleteBtn instanceof HTMLButtonElement) {
      void handleDeleteTeamClick(deleteBtn);
    }
  });
}
async function handleLeaveTeamClick(btn) {
  const teamId = String(btn.dataset.teamId || "").trim();
  const teamName = String(btn.dataset.teamName || "este equipo").trim();
  const userId = currentUserId();
  if (!teamId || !userId) return;
  const ok = window.confirm(
    `\xBFSalir del equipo \xAB${teamName}\xBB?

Dejar\xE1s de ver los pacientes asignados a ese equipo en Mi rotaci\xF3n.`
  );
  if (!ok) return;
  const api3 = dbApi3();
  if (!api3 || typeof api3.dbClinicalTeamsMemberRemove !== "function") {
    toast2("No se pudo salir del equipo.", "error");
    return;
  }
  btn.disabled = true;
  const res = await api3.dbClinicalTeamsMemberRemove({ teamId, userId });
  btn.disabled = false;
  if (!res || res.ok === false) {
    toast2(res?.error || "No se pudo salir del equipo.", "error");
    return;
  }
  toast2("Saliste del equipo.", "success");
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
  await publishClinicalTeamsToLan();
  await refreshTeamsUiAfterChange();
}
async function handleDeleteTeamClick(btn) {
  const teamId = String(btn.dataset.teamId || "").trim();
  const teamName = String(btn.dataset.teamName || "este equipo").trim();
  if (!teamId) return;
  const ok = window.confirm(
    `\xBFEliminar el equipo \xAB${teamName}\xBB?

Se quitar\xE1n sus integrantes. Esta acci\xF3n no se puede deshacer.`
  );
  if (!ok) return;
  const userId = currentUserId();
  const api3 = dbApi3();
  if (!userId || !api3 || typeof api3.dbClinicalTeamsArchive !== "function") {
    toast2("No se pudo eliminar el equipo.", "error");
    return;
  }
  btn.disabled = true;
  const res = await api3.dbClinicalTeamsArchive({ teamId, callerUserId: userId });
  btn.disabled = false;
  if (!res || res.ok === false) {
    toast2(res?.error || "No se elimin\xF3 el equipo.", "error");
    return;
  }
  toast2("Equipo eliminado.", "success");
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
  await publishClinicalTeamsToLan();
}
async function handleEditTeamSubmit(ev, form) {
  ev.preventDefault();
  const teamId = String(form.dataset.teamId || "").trim();
  const nameInput = form.querySelector(".clinical-teams-edit-name");
  const salaSelect = form.querySelector(".clinical-teams-edit-sala");
  const name = nameInput instanceof HTMLInputElement ? String(nameInput.value || "").trim() : "";
  const sala = salaSelect instanceof HTMLSelectElement ? String(salaSelect.value || "").trim() : "";
  if (!teamId || !name || !sala) {
    toast2("Indica nombre y sala.", "error");
    return;
  }
  const userId = currentUserId();
  const api3 = dbApi3();
  if (!userId || !api3 || typeof api3.dbClinicalTeamsUpdate !== "function") {
    toast2("No se pudo guardar el equipo.", "error");
    return;
  }
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;
  const res = await api3.dbClinicalTeamsUpdate({
    teamId,
    name,
    sala,
    callerUserId: userId
  });
  if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
  if (!res || res.ok === false) {
    toast2(res?.error || "No se guard\xF3 el equipo.", "error");
    return;
  }
  toast2("Equipo actualizado.", "success");
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
  await publishClinicalTeamsToLan();
}
async function handleProfileFormSubmit(ev) {
  ev.preventDefault();
  const username = normalizeUsername2(
    String(document.getElementById("clinical-profile-username")?.value || "")
  );
  let rank = String(document.getElementById("clinical-profile-rank")?.value || "R1");
  const sala = String(document.getElementById("clinical-profile-sala")?.value || "");
  const clinicalName = String(document.getElementById("clinical-profile-name")?.value || "").trim();
  const adminCb = document.getElementById("clinical-profile-admin");
  const wantsProgramAdmin = adminCb instanceof HTMLInputElement ? adminCb.checked : false;
  const wasProgramAdmin = hasProgramAdminPrivileges(clinicalSessionContext.user);
  let isProgramAdmin;
  let adminAccessCode = null;
  if (wantsProgramAdmin !== wasProgramAdmin) {
    isProgramAdmin = wantsProgramAdmin;
    if (wantsProgramAdmin) {
      if (!isAdminAccessGrantedThisSession()) {
        const code = await promptAdminAccessCode();
        if (!code || !verifyAdminAccessCode(code)) {
          if (adminCb instanceof HTMLInputElement) adminCb.checked = wasProgramAdmin;
          if (code != null) toast2("C\xF3digo incorrecto.", "error");
          return;
        }
        rememberAdminAccessCode(code);
      }
      adminAccessCode = getVerifiedAdminAccessCode();
    }
  }
  if (!isValidUsernameFormat2(username)) {
    toast2("Usuario inv\xE1lido. Usa 3\u201332 caracteres en min\xFAsculas: letras, n\xFAmeros y _.", "error");
    return;
  }
  if (!clinicalName) {
    toast2("Escribe tu nombre en guardia.", "error");
    return;
  }
  const userId = currentUserId();
  const api3 = dbApi3();
  if (!userId || !api3) {
    toast2("Sesi\xF3n cl\xEDnica no disponible. Desbloquea la base de datos.", "error");
    return;
  }
  const currentUsername = normalizeUsername2(clinicalSessionContext.user?.username || "");
  const usernameWillChange = username !== currentUsername;
  if (usernameWillChange) {
    const { assertLanRoomForUsernameRegister: assertLanRoomForUsernameRegister2 } = await import("/js/chunks/clinical-profile-lan-sync-FWPVILFH.js");
    await assertLanRoomForUsernameRegister2({ sala });
    if (currentUsername && !isLegacyMachineUsername(currentUsername, clientIdFromSettings())) {
      const ok2 = window.confirm(
        `\xBFCambiar tu usuario de @${currentUsername} a @${username}? Los equipos ver\xE1n el nuevo nombre.`
      );
      if (!ok2) return;
    }
    if (typeof api3.dbClinicalUsernameClaim !== "function") {
      toast2("No se pudo guardar el usuario LAN.", "error");
      return;
    }
    const claimRes = await api3.dbClinicalUsernameClaim({ userId, username });
    if (!claimRes?.ok) {
      const errMsg = String(claimRes?.error || "");
      if (/ya está en uso/i.test(errMsg)) {
        let settings = {};
        try {
          settings = JSON.parse(localStorage.getItem("rpc-settings") || "{}");
        } catch (_e) {
        }
        const resume = window.confirm(
          `El usuario @${username} ya existe.

\xBFRecuperar tu cuenta en este dispositivo?`
        );
        if (!resume) {
          toast2(errMsg, "error");
          return;
        }
        const resumeRes = await resumeClinicalIdentityByUsername(
          username,
          settings,
          clientIdFromSettings()
        );
        if (!resumeRes.ok) {
          toast2(resumeRes.error || errMsg, "error");
          return;
        }
      } else {
        toast2(errMsg || "No se pudo guardar el usuario.", "error");
        return;
      }
    }
    if (clinicalSessionContext.user) {
      clinicalSessionContext.user.username = username;
    }
  }
  const ok = await persistProfileFromPanel({
    rank,
    sala,
    clinicalName,
    isProgramAdmin,
    username,
    adminAccessCode
  });
  if (!ok) return;
  await refreshClinicalUserProfile();
  const msg = wantsProgramAdmin && (isProgramAdmin === true || wasProgramAdmin) ? "Perfil guardado. Privilegios de administraci\xF3n activos." : "Perfil guardado.";
  const { flushClinicalProfileToLan: flushClinicalProfileToLan2, LAN_PROFILE_PUSH_FAILED_MSG: LAN_PROFILE_PUSH_FAILED_MSG2, isBenignLanPushSkipCode: isBenignLanPushSkipCode2 } = await import("/js/chunks/clinical-profile-lan-sync-FWPVILFH.js");
  const lanPush = await flushClinicalProfileToLan2();
  if (!lanPush.ok && !isBenignLanPushSkipCode2(lanPush.code)) {
    toast2(LAN_PROFILE_PUSH_FAILED_MSG2, "warning");
  } else if (usernameWillChange && lanPush.ok) {
    toast2(`${msg} @usuario publicado en la sala \u21C4.`, "success");
  } else {
    toast2(msg, "success");
  }
  syncRotationConfigButton();
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
  void import("/js/chunks/lan-sync-IACFT74Q.js").then((mod) => {
    if (typeof mod.scheduleLiveSyncPush === "function") mod.scheduleLiveSyncPush();
  }).catch(() => {
  });
  void import("/js/chunks/patients-VCSD75UQ.js").then((m) => m.renderPatientList()).catch(() => {
  });
}
function clientIdFromSettings() {
  try {
    return String(JSON.parse(localStorage.getItem("rpc-settings") || "{}").clientId || "");
  } catch (_e) {
    return "";
  }
}
function wireJoinButtons() {
  document.querySelectorAll(".clinical-teams-join-btn").forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement) || btn._rpcJoinWired) return;
    btn._rpcJoinWired = true;
    btn.addEventListener("click", async () => {
      const teamId = String(btn.dataset.teamId || "");
      const userId = currentUserId();
      const api3 = dbApi3();
      if (!api3 || typeof api3.dbClinicalTeamsJoin !== "function") {
        toast2("No se pudo unir al equipo.", "error");
        return;
      }
      const team = (clinicalSessionContext.teams || []).find(
        (t2) => String(t2.team_id) === teamId
      );
      const rank = effectiveClinicalRank(clinicalSessionContext.user);
      const cycle = inferMembershipCycleForJoin(team || {}, rank);
      const res = await api3.dbClinicalTeamsJoin({
        teamId,
        userId,
        subAreaFraction: cycle
      });
      if (!res || res.ok === false) {
        toast2(res?.error || "No se pudo unir al equipo.", "error");
        return;
      }
      toast2("Te uniste al equipo.", "success");
      document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
      void publishClinicalTeamsToLan();
    });
  });
}
function wireCopyInviteButtons() {
  document.querySelectorAll(".clinical-teams-copy-invite-btn").forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement) || btn._rpcInviteWired) return;
    btn._rpcInviteWired = true;
    btn.addEventListener("click", () => {
      const teamId = String(btn.dataset.teamId || "");
      const team = (clinicalSessionContext.teams || []).find(
        (t2) => String(t2.team_id) === teamId
      );
      if (!team) {
        toast2("Equipo no encontrado.", "error");
        return;
      }
      const text = buildClinicalTeamInviteMessage(team);
      void copyToClipboardSafe(text).then((ok) => {
        toast2(
          ok ? "Invitaci\xF3n copiada. P\xE9gala en WhatsApp o correo." : "No se pudo copiar.",
          ok ? "success" : "error"
        );
      });
    });
  });
}
async function persistProfileFromPanel({
  rank,
  sala,
  clinicalName,
  isProgramAdmin,
  username,
  adminAccessCode
}) {
  const userId = currentUserId();
  const api3 = dbApi3();
  if (!userId || !api3 || typeof api3.dbClinicalProfileUpsert !== "function") {
    toast2("Base de datos no disponible.", "error");
    return false;
  }
  const res = await api3.dbClinicalProfileUpsert({
    userId,
    clinicalName: clinicalName || clinicalSessionContext.user?.clinical_name || "",
    rank: rank || effectiveClinicalRank(clinicalSessionContext.user),
    sala: sala ?? clinicalSessionContext.user?.sala ?? null,
    isProgramAdmin,
    adminAccessCode: adminAccessCode ?? void 0
  });
  if (!res || res.ok === false) {
    toast2(res?.error || "No se guard\xF3 el perfil.", "error");
    return false;
  }
  let settings = {};
  try {
    settings = JSON.parse(localStorage.getItem("rpc-settings") || "{}");
  } catch (_e) {
  }
  persistClinicalUserBinding({
    userId,
    username: username || settings.clinicalUsername,
    displayName: clinicalName || settings.clinicalDisplayName,
    rank: rank || settings.clinicalRank,
    sala: sala ?? settings.clinicalSala,
    isProgramAdmin
  });
  if (clinicalSessionContext.user) {
    const savedRank = String(res.profile?.rank || rank || "");
    clinicalSessionContext.user.rank = savedRank === "Admin" ? "R1" : savedRank || clinicalSessionContext.user.rank;
    if (sala != null) clinicalSessionContext.user.sala = sala;
    if (clinicalName) clinicalSessionContext.user.clinical_name = clinicalName;
    if (res.profile?.username) clinicalSessionContext.user.username = res.profile.username;
    if (isProgramAdmin !== void 0) {
      clinicalSessionContext.user.is_program_admin = isProgramAdmin ? 1 : 0;
    } else if (res.profile?.is_program_admin != null) {
      clinicalSessionContext.user.is_program_admin = res.profile.is_program_admin === 1 ? 1 : 0;
    }
    if (String(res.profile?.rank || "") === "Admin") {
      clinicalSessionContext.user.is_program_admin = 1;
    }
  }
  return true;
}
function syncSalaFieldVisibility() {
  const salaSelect = document.getElementById("clinical-team-create-sala");
  const userSala = String(clinicalSessionContext.user?.sala || "").trim();
  if (salaSelect && userSala && !String(salaSelect.value || "").trim()) {
    salaSelect.value = userSala;
  }
}
function wireClinicalTeamsPanelInteractions() {
  syncSalaFieldVisibility();
  wireAdminCheckboxGate();
  const serviceSelect = document.getElementById("clinical-team-create-service");
  if (serviceSelect && !serviceSelect._rpcServiceWired) {
    serviceSelect._rpcServiceWired = true;
    serviceSelect.addEventListener("change", () => {
      syncCreateTeamCycleField();
      syncSalaFieldVisibility();
    });
  }
  const r1LineSelect = document.getElementById("clinical-team-create-r1-line");
  if (r1LineSelect && !r1LineSelect._rpcR1LineWired) {
    r1LineSelect._rpcR1LineWired = true;
    r1LineSelect.addEventListener("change", () => syncCreateTeamCycleField());
  }
}
function wireAdminCheckboxGate() {
  const cb = document.getElementById("clinical-profile-admin");
  if (!(cb instanceof HTMLInputElement) || cb._rpcAdminGateWired) return;
  cb._rpcAdminGateWired = true;
  const hadAdminOnLoad = cb.checked || hasProgramAdminPrivileges(clinicalSessionContext.user);
  if (hadAdminOnLoad) {
    markAdminAccessGrantedThisSession();
  }
  cb.addEventListener("click", (ev) => {
    if (cb.checked) {
      clearAdminAccessGrant();
      return;
    }
    if (isAdminAccessGrantedThisSession()) return;
    ev.preventDefault();
    void promptAdminAccessCode().then((code) => {
      if (code && verifyAdminAccessCode(code)) {
        cb.checked = true;
        rememberAdminAccessCode(code);
        return;
      }
      cb.checked = false;
      if (code != null) toast2("C\xF3digo incorrecto.", "error");
    });
  });
}
async function handleCreateTeamSubmit(ev) {
  ev.preventDefault();
  const api3 = dbApi3();
  if (!api3 || typeof api3.dbClinicalTeamsCreate !== "function") {
    toast2("Base de datos no disponible.", "error");
    return;
  }
  const name = String(document.getElementById("clinical-team-create-name")?.value || "").trim();
  const userId = currentUserId();
  const elevated = canManageTeamRoster(clinicalSessionContext.user);
  if (!name) {
    toast2("Indica el nombre del equipo.", "error");
    return;
  }
  let sala = String(document.getElementById("clinical-team-create-sala")?.value || "").trim();
  if (!sala) {
    sala = String(clinicalSessionContext.user?.sala || "").trim();
  }
  if (!sala) {
    toast2("Selecciona la sala del equipo.", "error");
    return;
  }
  if (elevated) {
    const res2 = await api3.dbClinicalTeamsCreate({
      name,
      service: "Sala",
      onCallDayIndex: 0,
      sala,
      teamLeaderName: name,
      createdBy: userId
    });
    if (!res2 || res2.ok === false) {
      toast2(res2?.error || "No se cre\xF3 el equipo.", "error");
      return;
    }
    document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
    const lanPush2 = await publishClinicalTeamsToLan();
    toastTeamLanPublishResult(
      lanPush2,
      "Equipo vac\xEDo creado. Asigna integrantes desde el directorio LAN."
    );
    return;
  }
  const service = String(document.getElementById("clinical-team-create-service")?.value || "").trim();
  const cycleLetter = String(document.getElementById("clinical-team-create-day")?.value || "A").trim();
  if (!service) {
    toast2("Indica nombre y servicio.", "error");
    return;
  }
  const res = await api3.dbClinicalTeamsCreate({
    name,
    service,
    subAreaFraction: cycleLetter,
    onCallDayIndex: 0,
    sala,
    teamLeaderName: name,
    createdBy: userId
  });
  if (!res || res.ok === false) {
    toast2(res?.error || "No se cre\xF3 el equipo.", "error");
    return;
  }
  const teamId = String(res.team?.team_id || "");
  if (teamId && typeof api3.dbClinicalTeamsMemberAdd === "function") {
    const addRes = await api3.dbClinicalTeamsMemberAdd({
      teamId,
      userId,
      subAreaFraction: cycleLetter
    });
    if (!addRes || addRes.ok === false) {
      toast2(addRes?.error || "Equipo creado pero no se pudo unir autom\xE1ticamente.", "error");
    }
  }
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
  const lanPush = await publishClinicalTeamsToLan();
  toastTeamLanPublishResult(lanPush, "Equipo creado.");
}
async function handleAddMemberSubmit(ev, form) {
  ev.preventDefault();
  const teamId = String(form.dataset.teamId || "");
  const usernameInput = form.querySelector(".clinical-teams-add-member-input");
  const username = usernameInput instanceof HTMLInputElement ? String(usernameInput.value || "").trim() : "";
  if (!teamId || !username) {
    toast2("Escribe el username del residente.", "error");
    return;
  }
  const api3 = dbApi3();
  if (!api3 || typeof api3.dbClinicalTeamsMemberAdd !== "function") {
    toast2("Base de datos no disponible.", "error");
    return;
  }
  const handle = normalizeUsername2(username);
  if (!isValidUsernameFormat2(handle)) {
    toast2("Usuario inv\xE1lido. Usa 3\u201332 caracteres: letras min\xFAsculas, n\xFAmeros y _ (sin @).", "error");
    return;
  }
  let partnerUserId = await resolveLocalUserIdByLanHandle(handle);
  if (!partnerUserId) {
    await pullClinicalOpsFromLanRoom({ force: true });
    await fetchClinicalTeamsFromDb();
    partnerUserId = await resolveLocalUserIdByLanHandle(handle);
  }
  if (!partnerUserId) {
    toast2(
      `No encontramos a @${handle} en esta Mac. En su R+: Mi rotaci\xF3n \u2192 @usuario \u2192 Guardar perfil (con la misma sala \u21C4). Luego abre Directorio LAN aqu\xED o reintenta.`,
      "error"
    );
    return;
  }
  const cycleEl = form.querySelector(".clinical-teams-add-member-cycle");
  const subAreaFraction = cycleEl instanceof HTMLSelectElement ? String(cycleEl.value || "").trim() : "";
  if (!subAreaFraction) {
    toast2("Elige el ciclo del integrante.", "error");
    return;
  }
  const res = await api3.dbClinicalTeamsMemberAdd({
    teamId,
    userId: partnerUserId,
    subAreaFraction
  });
  if (!res || res.ok === false) {
    toast2(res?.error || "No se agreg\xF3 el miembro.", "error");
    return;
  }
  toast2("Miembro agregado.", "success");
  if (usernameInput instanceof HTMLInputElement) usernameInput.value = "";
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
  await publishClinicalTeamsToLan();
  await refreshTeamsUiAfterChange();
}
async function handleMyCycleSubmit(ev, form) {
  ev.preventDefault();
  const teamId = String(form.dataset.teamId || "");
  const userId = currentUserId();
  const select = form.querySelector(".clinical-teams-cycle-select");
  const subAreaFraction = select instanceof HTMLSelectElement ? String(select.value || "").trim() : "";
  if (!teamId || !userId || !subAreaFraction) {
    toast2("Elige tu ciclo.", "error");
    return;
  }
  const api3 = dbApi3();
  if (!api3 || typeof api3.dbClinicalTeamsMemberAdd !== "function") {
    toast2("Base de datos no disponible.", "error");
    return;
  }
  const res = await api3.dbClinicalTeamsMemberAdd({
    teamId,
    userId,
    subAreaFraction
  });
  if (!res || res.ok === false) {
    toast2(res?.error || "No se guard\xF3 el ciclo.", "error");
    return;
  }
  toast2("Ciclo actualizado.", "success");
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
  await publishClinicalTeamsToLan();
  await refreshTeamsUiAfterChange();
}

// public/js/features/clinical-teams/teams-invite.mjs
async function resolveTeamIdForInviteInput(codeOrId) {
  const raw = String(codeOrId || "").trim();
  if (!raw) return "";
  await fetchClinicalTeamsFromDb();
  let teamId = raw.includes("-") && raw.length > 20 ? raw : "";
  if (!teamId) {
    teamId = resolveTeamIdFromInviteCode(raw, clinicalSessionContext.teams || []);
  }
  if (!teamId) {
    try {
      const lan = await import("/js/chunks/lan-sync-IACFT74Q.js");
      if (typeof lan.refreshLanClinicalDirectoryFromRoom === "function") {
        await lan.refreshLanClinicalDirectoryFromRoom({ timeoutMs: 8e3 });
        await fetchClinicalTeamsFromDb();
        teamId = resolveTeamIdFromInviteCode(raw, clinicalSessionContext.teams || []);
      }
    } catch (_eLan) {
    }
  }
  const api3 = dbApi3();
  if (!teamId && api3 && typeof api3.dbClinicalTeamResolveCode === "function") {
    const res = await api3.dbClinicalTeamResolveCode({ code: normalizeTeamInviteCode(raw) });
    if (res?.ok && res.team?.team_id) {
      teamId = String(res.team.team_id);
      await fetchClinicalTeamsFromDb();
    }
  }
  return teamId;
}
async function joinTeamById(teamId, subAreaFraction) {
  const userId = currentUserId();
  if (!userId || !teamId) return false;
  await fetchClinicalTeamsFromDb();
  const team = (clinicalSessionContext.teams || []).find(
    (t2) => String(t2.team_id) === teamId
  );
  if (!team) {
    toast2("Equipo no encontrado en esta base de datos.", "error");
    return false;
  }
  if (filterJoinedTeams(clinicalSessionContext.teams, clinicalSessionContext.user).some(
    (t2) => String(t2.team_id) === teamId
  )) {
    toast2("Ya perteneces a este equipo.", "info");
    const { openClinicalTeamsPanel: openClinicalTeamsPanel2 } = await import("/js/chunks/teams-roster-26ZU5YZD.js");
    await openClinicalTeamsPanel2();
    return true;
  }
  const api3 = dbApi3();
  if (!api3 || typeof api3.dbClinicalTeamsJoin !== "function") {
    toast2("Base de datos no disponible.", "error");
    return false;
  }
  const rank = effectiveClinicalRank(clinicalSessionContext.user);
  const cycle = subAreaFraction || inferMembershipCycleForJoin(team, rank);
  const res = await api3.dbClinicalTeamsJoin({ teamId, userId, subAreaFraction: cycle });
  if (!res?.ok) {
    toast2(res?.error || "No se pudo unir al equipo.", "error");
    return false;
  }
  toast2(`Te uniste al equipo ${team.name || ""} (ciclo ${cycle}).`, "success");
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
  await publishClinicalTeamsToLan();
  const { refreshTeamsUiAfterChange: refreshTeamsUiAfterChange2 } = await import("/js/chunks/teams-roster-26ZU5YZD.js");
  await refreshTeamsUiAfterChange2();
  return true;
}
async function handleJoinWithCodeSubmit(ev) {
  ev.preventDefault();
  const input = document.getElementById("clinical-team-join-code-input");
  const cycleEl = document.getElementById("clinical-team-join-code-cycle");
  const code = input instanceof HTMLInputElement ? input.value : "";
  const subAreaFraction = cycleEl instanceof HTMLSelectElement ? String(cycleEl.value || "").trim() : "";
  const teamId = await resolveTeamIdForInviteInput(code);
  if (!teamId) {
    await fetchClinicalTeamsFromDb();
    const diag = diagnoseInviteCodeFailure(code, clinicalSessionContext.teams || []);
    toast2(inviteCodeFailureMessage(diag), "error");
    return;
  }
  await joinTeamById(teamId, subAreaFraction);
}
function clearClinicalTeamJoinQueryParams() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("joinTeam");
    url.searchParams.delete("joinCode");
    url.searchParams.delete("clinicalTeam");
    url.searchParams.delete("teamCode");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  } catch (_e) {
  }
}
async function consumeClinicalTeamJoinFromUrl() {
  if (typeof window === "undefined" || !isClinicalTeamJoinDesktopApp()) {
    tryMountClinicalTeamInviteBrowserGate();
    return;
  }
  const parsed = parseClinicalTeamJoinQuery(window.location.search);
  if (!parsed.teamId && !parsed.inviteCode) return;
  const sessionOk = await ensureClinicalPanelSession();
  if (!sessionOk) return;
  const { openClinicalTeamsPanel: openClinicalTeamsPanel2 } = await import("/js/chunks/teams-roster-26ZU5YZD.js");
  await openClinicalTeamsPanel2();
  const input = document.getElementById("clinical-team-join-code-input");
  if (input instanceof HTMLInputElement && parsed.inviteCode) {
    input.value = parsed.inviteCode;
  }
  const teamId = parsed.teamId || await resolveTeamIdForInviteInput(parsed.inviteCode);
  if (!teamId) {
    toast2("Pega el c\xF3digo en Mi rotaci\xF3n y pulsa Unirme.", "info");
    clearClinicalTeamJoinQueryParams();
    return;
  }
  const cycleEl = document.getElementById("clinical-team-join-code-cycle");
  const subAreaFraction = cycleEl instanceof HTMLSelectElement ? String(cycleEl.value || "").trim() : "";
  await joinTeamById(teamId, subAreaFraction);
  clearClinicalTeamJoinQueryParams();
}

// public/js/features/clinical-teams/index.mjs
var teamsControlsWired = false;
function wireClinicalTeamsModalChrome2() {
  const bd = teamsModalEl();
  if (bd) {
    if (!bd._rpcTeamsBackdropClick) {
      bd._rpcTeamsBackdropClick = true;
      bd.addEventListener("click", (ev) => {
        if (ev.target === bd) closeClinicalTeamsPanel();
      });
    }
    if (!bd._rpcTeamsSubmitDelegated) {
      bd._rpcTeamsSubmitDelegated = true;
      bd.addEventListener("submit", (ev) => {
        const form = ev.target;
        if (!(form instanceof HTMLFormElement)) return;
        if (form.id === "clinical-profile-form") {
          ev.preventDefault();
          void handleProfileFormSubmit(ev);
        } else if (form.id === "clinical-team-create-form") {
          ev.preventDefault();
          void handleCreateTeamSubmit(ev);
        } else if (form.classList.contains("clinical-teams-add-member-form")) {
          ev.preventDefault();
          void handleAddMemberSubmit(ev, form);
        } else if (form.classList.contains("clinical-teams-my-cycle-form")) {
          ev.preventDefault();
          void handleMyCycleSubmit(ev, form);
        } else if (form.id === "clinical-team-join-code-form") {
          ev.preventDefault();
          void handleJoinWithCodeSubmit(ev);
        } else if (form.classList.contains("clinical-teams-edit-form")) {
          ev.preventDefault();
          void handleEditTeamSubmit(ev, form);
        }
      });
    }
  }
  const closeBtn = document.getElementById("btn-clinical-teams-close");
  if (closeBtn && !closeBtn._rpcCloseWired) {
    closeBtn._rpcCloseWired = true;
    closeBtn.addEventListener("click", () => closeClinicalTeamsPanel());
  }
  if (!document._rpcClinicalTeamsEscapeWired) {
    document._rpcClinicalTeamsEscapeWired = true;
    document.addEventListener("keydown", (ev) => {
      if (ev.key !== "Escape") return;
      const lanBd = lanUsersModalBackdropEl();
      if (lanBd?.classList.contains("open")) {
        closeLanUsersDirectoryModal();
        return;
      }
      const adminBd = adminCodeModalBackdropEl();
      if (adminBd?.classList.contains("open")) {
        cancelAdminCodeModal();
        return;
      }
      const teamsBd = teamsModalEl();
      if (teamsBd?.classList.contains("open")) closeClinicalTeamsPanel();
    });
  }
  wireLanUsersDirectoryControls();
  wireAdminCodeModalControls();
  wireTeamManageModalDelegation();
}
function wireClinicalTeamsControls() {
  wireClinicalTeamsModalChrome2();
  if (teamsControlsWired) return;
  teamsControlsWired = true;
  import("/js/chunks/clinical-rotation-entry-V3JYBX6J.js").then((mod) => {
    mod.wireClinicalRotationEntryControls();
    mod.syncClinicalRotationEntryChrome();
  });
  const openBtn = document.getElementById("btn-guardia-mi-rotacion");
  if (openBtn && !openBtn._rpcTeamsOpenWired) {
    openBtn._rpcTeamsOpenWired = true;
    openBtn.addEventListener("click", () => void openClinicalTeamsPanel());
  }
  if (!document._rpcClinicalTeamsChangedWired) {
    document._rpcClinicalTeamsChangedWired = true;
    document.addEventListener("rpc-clinical-teams-changed", () => {
      void refreshTeamsUiAfterChange();
    });
  }
  if (!document._rpcClinicalOpsSyncedTeamsWired) {
    document._rpcClinicalOpsSyncedTeamsWired = true;
    let opsSyncedTeamsRefreshTimer = null;
    document.addEventListener("rpc-clinical-ops-synced", () => {
      if (opsSyncedTeamsRefreshTimer) clearTimeout(opsSyncedTeamsRefreshTimer);
      opsSyncedTeamsRefreshTimer = setTimeout(() => {
        opsSyncedTeamsRefreshTimer = null;
        void refreshTeamsUiAfterChange();
        const lanBd = lanUsersModalBackdropEl();
        const host = lanUsersModalBodyEl();
        if (lanBd?.classList.contains("open") && host) void loadLanUsersDirectoryIntoHost(host);
      }, 300);
    });
  }
}

// public/js/lan-client.mjs
function parseWsPayload(s) {
  try {
    return JSON.parse(String(s));
  } catch {
    return null;
  }
}
function safeCloseWebSocket(ws) {
  if (!ws) return;
  try {
    const state = ws.readyState;
    if (state === WebSocket.CONNECTING) {
      ws.onopen = () => {
        try {
          ws.close();
        } catch (_e) {
        }
      };
      return;
    }
    if (state === WebSocket.OPEN) {
      ws.close();
    }
  } catch (_e) {
  }
}
function syncConnectBackoffMs(attempt) {
  return Math.min(3e4, 500 * Math.pow(2, Math.min(Math.max(0, attempt), 6)));
}
var LanClient = class extends EventTarget {
  constructor() {
    super();
    this._syncWs = null;
    this._liveWs = null;
    this._liveRoomId = null;
    this._cfg = null;
    this._syncConnected = false;
    this._liveConnected = false;
    this._syncConnectAttempt = 0;
    this._syncLastConnectAt = 0;
  }
  /** Compat: canal sync (presencia / pacientes). */
  get connected() {
    return this._syncConnected;
  }
  get liveConnected() {
    return this._liveConnected;
  }
  get liveRoomId() {
    return this._liveRoomId;
  }
  /** true si el canal live de esta sala está conectando o abierto (evita reconexiones que lo cortan). */
  isLiveChannelBusy(roomId) {
    const want = String(roomId || "").trim();
    const have = String(this._liveRoomId || "").trim();
    const ws = this._liveWs;
    if (!ws) return false;
    const rs = ws.readyState;
    if (rs !== WebSocket.CONNECTING && rs !== WebSocket.OPEN) return false;
    return !want || want === have;
  }
  /** Canal sync en CONNECTING/OPEN — evita abrir otro socket mientras uno está activo. */
  isSyncChannelBusy() {
    const ws = this._syncWs;
    if (!ws) return false;
    const rs = ws.readyState;
    return rs === WebSocket.CONNECTING || rs === WebSocket.OPEN;
  }
  _isSyncConnectThrottled() {
    if (!this._syncLastConnectAt) return false;
    return Date.now() - this._syncLastConnectAt < syncConnectBackoffMs(this._syncConnectAttempt);
  }
  configure(cfg) {
    this._cfg = cfg;
  }
  baseUrl() {
    const c = this._cfg;
    if (!c || !c.hostUrl) return "";
    return String(c.hostUrl).replace(/\/$/, "");
  }
  _bearerToken() {
    const fromCfg = this._cfg ? String(this._cfg.teamCode ?? "").trim() : "";
    if (fromCfg) return fromCfg;
    try {
      return String(localStorage.getItem("rplus.lan.bearer") || "").trim();
    } catch (_e) {
      return "";
    }
  }
  async fetch(path, opts = {}) {
    const url = `${this.baseUrl()}${path}`;
    const token = this._bearerToken();
    const headers = {
      ...opts.headers || {},
      Authorization: `Bearer ${token}`
    };
    return fetch(url, { ...opts, headers });
  }
  /** WebSocket de presencia / notificaciones LAN; no es el relay `live:*` de salas. */
  connectSyncChannel() {
    if (!this.baseUrl() || !this._bearerToken()) return;
    if (this.isSyncChannelBusy()) return;
    if (this._isSyncConnectThrottled()) return;
    this._syncLastConnectAt = Date.now();
    this._openChannelWs("sync", "_syncWs", "sync");
  }
  connectLiveChannel(roomId) {
    const id = String(roomId || "").trim();
    if (!id) return;
    if (this.isLiveChannelBusy(id)) return;
    this._liveRoomId = id;
    const ch = `live:${encodeURIComponent(id)}`;
    this._openChannelWs(ch, "_liveWs", "live");
  }
  disconnectLiveChannel() {
    if (this._liveWs) {
      safeCloseWebSocket(this._liveWs);
      this._liveWs = null;
    }
    this._liveConnected = false;
    this._liveRoomId = null;
  }
  disconnect() {
    this.disconnectLiveChannel();
    if (this._syncWs) {
      safeCloseWebSocket(this._syncWs);
      this._syncWs = null;
    }
    this._syncConnected = false;
    this._syncConnectAttempt = 0;
    this._syncLastConnectAt = 0;
  }
  sendLive(obj) {
    if (!this._liveWs || this._liveWs.readyState !== 1) return false;
    try {
      this._liveWs.send(JSON.stringify(obj));
      return true;
    } catch (_e) {
      return false;
    }
  }
  _openChannelWs(channel, prop, kind) {
    const prev = this[prop];
    if (prev) {
      safeCloseWebSocket(prev);
    }
    const base = this.baseUrl().replace(/^http/, "ws");
    const u = `${base}/api/lan/v1/ws?channel=${encodeURIComponent(channel)}`;
    const ws = new WebSocket(u);
    this[prop] = ws;
    const token = this._bearerToken();
    ws.onopen = () => {
      if (this[prop] !== ws) return;
      try {
        ws.send(JSON.stringify({ type: "auth", token }));
      } catch (_e) {
      }
      if (kind === "sync") {
        this._syncConnectAttempt = 0;
        this._syncConnected = true;
        this.dispatchEvent(new CustomEvent("lan-status", { detail: { connected: true, channel: "sync" } }));
      } else {
        this._liveConnected = true;
        this.dispatchEvent(
          new CustomEvent("lan-live-status", { detail: { connected: true, roomId: this._liveRoomId } })
        );
      }
    };
    ws.onerror = () => {
      if (this[prop] !== ws) return;
      if (kind === "sync") {
        this._syncConnectAttempt += 1;
      }
    };
    ws.onclose = () => {
      if (this[prop] !== ws) return;
      if (kind === "sync") {
        if (!this._syncConnected) {
          this._syncConnectAttempt += 1;
        }
        this._syncConnected = false;
        if (this[prop] === ws) {
          this[prop] = null;
        }
        this.dispatchEvent(new CustomEvent("lan-status", { detail: { connected: false, channel: "sync" } }));
      } else {
        this._liveConnected = false;
        this.dispatchEvent(
          new CustomEvent("lan-live-status", { detail: { connected: false, roomId: this._liveRoomId } })
        );
      }
    };
    ws.onmessage = (ev) => {
      if (this[prop] !== ws) return;
      const data = parseWsPayload(ev.data);
      if (!data) return;
      if (kind === "sync") {
        this.dispatchEvent(new CustomEvent("lan-patch", { detail: data }));
      } else {
        this._dispatchLivePayload(data);
      }
    };
  }
  _dispatchLivePayload(data) {
    if (!data) return;
    if (data.type === "livesync:conflict") {
      this.dispatchEvent(new CustomEvent("lan-conflict", { detail: data }));
      return;
    }
    if (data.type === "livesync:applied") {
      this.dispatchEvent(new CustomEvent("lan-applied", { detail: data }));
      return;
    }
    this.dispatchEvent(new CustomEvent("lan-live", { detail: data }));
  }
};

// public/js/features/lan/runtime.mjs
var lanClient = new LanClient();
var activeLiveSyncRoomId = "";
var activeLiveSyncRoomLabel = "";
var liveSyncPushTimer = null;
var liveSyncRevisionReconcileTimer = null;
var liveSyncOutboxFlushTimer = null;
var LIVE_SYNC_PUSH_DEBOUNCE_MS = 900;
var LIVE_SYNC_OUTBOX_FLUSH_MS = 6e4;
function getActiveLiveSyncRoomId() {
  return activeLiveSyncRoomId;
}
function setActiveLiveSyncRoom(roomId, label) {
  activeLiveSyncRoomId = String(roomId || "").trim();
  if (label !== void 0) {
    activeLiveSyncRoomLabel = String(label || "").trim();
  }
}
function clearActiveLiveSyncRoom() {
  activeLiveSyncRoomId = "";
  activeLiveSyncRoomLabel = "";
}
function getLiveSyncPushTimer() {
  return liveSyncPushTimer;
}
function setLiveSyncPushTimer(timer) {
  liveSyncPushTimer = timer;
}
function getLiveSyncRevisionReconcileTimer() {
  return liveSyncRevisionReconcileTimer;
}
function setLiveSyncRevisionReconcileTimer(timer) {
  liveSyncRevisionReconcileTimer = timer;
}
function getLiveSyncOutboxFlushTimer() {
  return liveSyncOutboxFlushTimer;
}
function setLiveSyncOutboxFlushTimer(timer) {
  liveSyncOutboxFlushTimer = timer;
}
function getLanClientId2() {
  try {
    var id = localStorage.getItem("rpc-lan-client-id");
    if (id && String(id).trim()) return String(id).trim();
    var gen = "lc_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("rpc-lan-client-id", gen);
    return gen;
  } catch (_e) {
    return "lc_anon";
  }
}

// public/js/versioned-mutation.mjs
function createMutationBuilder(entityType, entityId) {
  let base = null;
  const working = {};
  const changedKeys = /* @__PURE__ */ new Set();
  return {
    captureBase(snapshot) {
      base = structuredClone(snapshot);
      Object.assign(working, structuredClone(snapshot));
      return this;
    },
    set(key, value) {
      changedKeys.add(key);
      working[key] = value;
      return this;
    },
    build(extra = {}) {
      return {
        entityType,
        entityId,
        expectedVersion: Number(base?.version ?? 0),
        baseData: base,
        changedKeys: [...changedKeys],
        data: { ...working },
        ...extra
      };
    }
  };
}
function wrapLiveSyncPatch(roomId, clientId, mutation) {
  return { type: "livesync:patch", roomId, clientId, mutation };
}

// public/js/draft-conflict-store.mjs
var DB_NAME = "rplus-clinical";
var STORE = "draft-conflicts";
var DB_VERSION = 1;
function memoryStore() {
  return __test._memory;
}
function openDraftDb() {
  const idb = globalThis.indexedDB;
  if (!idb) {
    return Promise.reject(new Error("indexedDB_unavailable"));
  }
  return new Promise((resolve, reject) => {
    const req = idb.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: "id" });
        os.createIndex("savedAt", "savedAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbGetAll() {
  const db = await openDraftDb();
  const rows = await new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror = () => rej(req.error);
    tx.onerror = () => rej(tx.error);
  });
  db.close();
  return rows;
}
async function idbDelete(id) {
  const db = await openDraftDb();
  await new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  db.close();
}
function sortBySavedAtDesc(rows) {
  return rows.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
}
async function listDraftConflicts() {
  const mem = memoryStore();
  if (mem) {
    return sortBySavedAtDesc([...mem.values()]);
  }
  return sortBySavedAtDesc(await idbGetAll());
}
async function countDraftConflicts() {
  const mem = memoryStore();
  if (mem) return mem.size;
  const db = await openDraftDb();
  const n = await new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => res(Number(req.result || 0));
    req.onerror = () => rej(req.error);
    tx.onerror = () => rej(tx.error);
  });
  db.close();
  return n;
}
async function deleteDraftConflict(id) {
  if (!id) return;
  const mem = memoryStore();
  if (mem) {
    mem.delete(id);
    return;
  }
  await idbDelete(id);
}
async function clearAllDraftConflicts() {
  const mem = memoryStore();
  if (mem) {
    const n2 = mem.size;
    mem.clear();
    return n2;
  }
  const n = await countDraftConflicts();
  if (!n) return 0;
  const db = await openDraftDb();
  await new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  db.close();
  return n;
}
var __test = {
  _memory: null,
  useMemoryBackend(enabled = true) {
    __test._memory = enabled ? /* @__PURE__ */ new Map() : null;
  },
  resetMemory() {
    __test._memory?.clear();
  }
};

// public/js/lan-conflict-silent-match.mjs
var INTERNAL_DIFF_KEYS = /* @__PURE__ */ new Set([
  "id",
  "patientId",
  "updatedAt",
  "version",
  "expectedVersion",
  "_deleted",
  "entityType",
  "entityId",
  "roomId",
  "clientId",
  "audit"
]);
var FIELD_LABELS = {
  identificacion: "Identificaci\xF3n",
  motivoConsulta: "Motivo de consulta",
  apnp: "Antecedentes no patol\xF3gicos",
  app: "Antecedentes patol\xF3gicos",
  ahf: "Antecedentes heredofamiliares",
  genero: "G\xE9nero",
  sexual: "Salud sexual",
  padecimientoActual: "Padecimiento actual",
  datosNegados: "Datos negados",
  ipas: "IPAS",
  signosVitalesIngreso: "Signos vitales de ingreso",
  labsAtAdmission: "Labs de ingreso",
  labAnchor: "Ancla de laboratorio",
  meta: "Metadatos",
  labLookbackHours: "Ventana de labs (h)",
  eventualidades: "Eventualidades",
  nombre: "Nombre",
  cuarto: "Cuarto",
  cama: "Cama",
  sexo: "Sexo",
  edad: "Edad",
  agenda: "Agenda",
  todos: "Pendientes",
  text: "Descripci\xF3n",
  completed: "Completado",
  priority: "Prioridad",
  createdAt: "Fecha de creaci\xF3n",
  updatedAt: "\xDAltima actualizaci\xF3n",
  _deleted: "Eliminado",
  entries: "Entradas",
  manejo: "Manejo"
};
function valuesEqual(a, b) {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (typeof a === "object" || typeof b === "object") {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch (_e) {
      return false;
    }
  }
  return false;
}
var HC_STRUCTURED_KEYS = /* @__PURE__ */ new Set(["ahf", "app", "apnp", "ipas", "genero", "identificacion", "signosVitalesIngreso"]);
function trimCollapse(text, maxLen) {
  const max = maxLen == null ? 140 : maxLen;
  const t2 = String(text || "").replace(/\s+/g, " ").trim();
  if (!t2) return "";
  if (t2.length <= max) return t2;
  return t2.slice(0, Math.max(0, max - 1)) + "\u2026";
}
function summarizeEntryRow(entry) {
  if (!entry || typeof entry !== "object") return "";
  const bits = [];
  if (entry.descripcionDetallada) bits.push(trimCollapse(entry.descripcionDetallada, 90));
  if (entry.diagnosis) bits.push("dx: " + trimCollapse(entry.diagnosis, 50));
  if (entry.treatment) bits.push("tto: " + trimCollapse(entry.treatment, 50));
  if (entry.description) bits.push(trimCollapse(entry.description, 60));
  if (entry.medication) bits.push(trimCollapse(entry.medication, 40));
  if (entry.relativeId && !bits.length) bits.push("familiar " + String(entry.relativeId));
  return bits.join(" \xB7 ");
}
function summarizeIpasBlock(ipas) {
  if (!ipas || typeof ipas !== "object") return "";
  const lines = [];
  for (const block of Object.values(ipas)) {
    if (!block || typeof block !== "object") continue;
    const desc = trimCollapse(block.descripcion, 72);
    const checks = Array.isArray(block.checks) ? block.checks.length : 0;
    if (desc && desc.toLowerCase() !== "interrogado y negado") {
      lines.push(desc);
    } else if (checks > 0) {
      lines.push(checks + " hallazgo" + (checks === 1 ? "" : "s"));
    }
    if (lines.length >= 2) break;
  }
  if (!lines.length) return "interrogado y negado";
  return lines.join(" \xB7 ");
}
function formatFieldLabel(key) {
  const k = String(key || "").trim();
  if (!k) return "";
  if (FIELD_LABELS[k]) return FIELD_LABELS[k];
  return k.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim().replace(/^\w/, (c) => c.toUpperCase());
}
function summarizeConflictFieldValue(fieldKey, value) {
  const key = String(fieldKey || "").trim();
  if (value === null || value === void 0) return "\u2014";
  if (typeof value === "boolean") return value ? "S\xED" : "No";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      try {
        return new Date(value).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
      } catch (_e) {
        return trimCollapse(value) || "\u2014";
      }
    }
    const t2 = trimCollapse(value);
    return t2 || "\u2014";
  }
  if (Array.isArray(value)) {
    if (!value.length) return "vac\xEDo";
    const previews = value.slice(0, 2).map((item) => typeof item === "object" ? summarizeEntryRow(item) : trimCollapse(item, 60)).filter(Boolean);
    const tail = value.length > 2 ? " (+" + (value.length - 2) + " m\xE1s)" : "";
    return (previews.length ? previews.join("; ") : value.length + " elemento" + (value.length === 1 ? "" : "s")) + tail;
  }
  if (typeof value !== "object") return String(value);
  if (key === "ipas") return summarizeIpasBlock(value) || "\u2014";
  const parts = [];
  const desc = value.descripcionDetallada || value.descripcion;
  if (desc && String(desc).trim()) parts.push(trimCollapse(desc, 110));
  const entries = value.entries;
  if (Array.isArray(entries) && entries.length) {
    const rowText = entries.slice(0, 3).map(summarizeEntryRow).filter(Boolean).join("; ");
    if (rowText) parts.push(rowText);
    if (entries.length > 3) parts.push("+" + (entries.length - 3) + " registro" + (entries.length - 3 === 1 ? "" : "s"));
  }
  const condCount = Array.isArray(value.conditions) ? value.conditions.length : 0;
  if (condCount && !entries?.length) {
    parts.push(condCount + " condici\xF3n" + (condCount === 1 ? "" : "es"));
  }
  for (const habitKey of ["tabaquismo", "alcoholismo", "toxicomanias", "dieta", "tatuajes", "deportesPasatiemposMascotas"]) {
    if (value[habitKey] && String(value[habitKey]).trim()) {
      parts.push(trimCollapse(value[habitKey], 55));
    }
  }
  if (value.medicamentosActuales && String(value.medicamentosActuales).trim()) {
    parts.push("Meds: " + trimCollapse(value.medicamentosActuales, 70));
  }
  if (value.hospitalizacionesPrevias && String(value.hospitalizacionesPrevias).trim()) {
    parts.push("Hosp. prev.: " + trimCollapse(value.hospitalizacionesPrevias, 60));
  }
  if (key === "genero") {
    for (const gKey of ["menarquia", "gestas", "partos", "cesareas", "abortos", "notas", "ultimaMenstruacion"]) {
      if (value[gKey] != null && String(value[gKey]).trim()) {
        parts.push(formatFieldLabel(gKey) + ": " + trimCollapse(value[gKey], 40));
      }
    }
  }
  if (key === "identificacion" && typeof value === "object") {
    const idBits = ["lugarNacimiento", "residencia", "ocupacionActual", "dx", "cama"].map((k) => value[k] ? formatFieldLabel(k) + ": " + trimCollapse(value[k], 35) : "").filter(Boolean);
    if (idBits.length) parts.push(idBits.slice(0, 3).join(" \xB7 "));
  }
  if (parts.length) return parts.join(" \xB7 ");
  if (HC_STRUCTURED_KEYS.has(key)) return "bloque sin texto legible";
  try {
    const raw = JSON.stringify(value);
    return raw.length > 120 ? trimCollapse(raw, 117) : raw;
  } catch (_e2) {
    return "\u2014";
  }
}
function isInternalNoiseKey(key, localData, serverData) {
  if (!INTERNAL_DIFF_KEYS.has(key)) return false;
  const serverVal = serverData?.[key];
  if (serverVal === void 0 || serverVal === null) return true;
  return valuesEqual(localData?.[key], serverVal);
}
function keysThatDiffer(localData, serverData) {
  const keys = /* @__PURE__ */ new Set([...Object.keys(localData || {}), ...Object.keys(serverData || {})]);
  keys.delete("_deleted");
  return [...keys].filter((key) => !isInternalNoiseKey(key, localData, serverData)).filter((key) => !valuesEqual(localData?.[key], serverData?.[key])).sort((a, b) => a.localeCompare(b));
}
function pickDiffKeys(conflictingKeys, localData, serverData) {
  const raw = Array.isArray(conflictingKeys) ? conflictingKeys.filter(Boolean) : [];
  const onlyStar = raw.length === 1 && raw[0] === "*";
  if (raw.length && !onlyStar) {
    return raw.filter((key) => !isInternalNoiseKey(key, localData, serverData)).sort((a, b) => a.localeCompare(b));
  }
  return keysThatDiffer(localData, serverData).filter((key) => {
    if (!INTERNAL_DIFF_KEYS.has(key)) return true;
    return !valuesEqual(localData?.[key], serverData?.[key]);
  });
}
function conflictSnapshotsMatchForAutoResolve({ conflictingKeys, localData, serverData }) {
  const keys = pickDiffKeys(conflictingKeys, localData, serverData);
  if (!keys.length) return false;
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    const localVal = summarizeConflictFieldValue(key, localData?.[key]);
    const serverVal = summarizeConflictFieldValue(key, serverData?.[key]);
    if (localVal !== serverVal || localVal === "\u2014") return false;
  }
  return true;
}

// public/js/features/lan/transport.mjs
var LAN_MIGRATION_NOTICE_KEY = "rplus.lan.migrationNoticeShown";
var _lastLanPairing = null;
var transportDeps = null;
function registerLanSyncTransportDeps(deps2) {
  transportDeps = deps2 && typeof deps2 === "object" ? deps2 : null;
}
function deps() {
  if (!transportDeps) throw new Error("lan-sync-transport: registerLanSyncTransportDeps() not called");
  return transportDeps;
}
function runtime2() {
  return deps().runtime || { showToast() {
  } };
}
function esc(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function isLanSessionConfiguredForRest() {
  try {
    var c = typeof storage.getLanConfig === "function" ? storage.getLanConfig() : null;
    return !!(c && String(c.hostUrl || "").trim());
  } catch (_e) {
    return false;
  }
}
function trimStoredLanBearer(code) {
  return String(code || "").trim();
}
function persistLanClientConfig(hostUrl, teamCode) {
  var url = String(hostUrl || "").trim().replace(/\/+$/, "");
  var code = trimStoredLanBearer(teamCode);
  if (!url || !code) return false;
  var prev = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
  var prevUrl = String(prev.hostUrl || "").trim().replace(/\/+$/, "");
  var prevCode = trimStoredLanBearer(prev.teamCode);
  var changed = prevUrl !== url || prevCode !== code;
  storage.saveLanConfig({ hostUrl: url, teamCode: code });
  lanClient.configure({ hostUrl: url, teamCode: code });
  if (isLanRemoteJoinMode()) rememberPrimaryHostUrl(url);
  if (changed) {
    try {
      lanClient.disconnect();
      lanClient.connectSyncChannel();
    } catch (_e) {
    }
  }
  return changed;
}
async function ensureLanClientTeamCodeAligned() {
  var cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
  var hostUrl = String(cfg.hostUrl || "").trim().replace(/\/+$/, "");
  var uiRole = typeof storage.getLanUiRole === "function" ? storage.getLanUiRole() : "client";
  if (uiRole === "host" && window.electronAPI && typeof window.electronAPI.getLanEffectiveTeamCode === "function") {
    return !!await syncLanSavedTeamCodeWithEffectiveHostCode();
  }
  if (!hostUrl) return false;
  return persistLanClientConfig(hostUrl, cfg.teamCode);
}
async function lanFetchAuthed(path, opts) {
  await ensureLanClientTeamCodeAligned();
  var resp = await lanClient.fetch(path, opts);
  if (resp.status !== 401) return resp;
  if (window.electronAPI && typeof window.electronAPI.getLanEffectiveTeamCode === "function") {
    await syncLanSavedTeamCodeWithEffectiveHostCode();
  }
  return lanClient.fetch(path, opts);
}
async function resolveHostBearerToken() {
  var cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
  var fromCfg = trimStoredLanBearer(cfg.teamCode);
  if (fromCfg.length >= 32) return fromCfg;
  if (window.electronAPI && typeof window.electronAPI.getLanEffectiveTeamCode === "function") {
    try {
      var info = await window.electronAPI.getLanEffectiveTeamCode();
      if (info && info.ok && info.code) return String(info.code).trim();
    } catch (_e) {
    }
  }
  return "";
}
async function mintLanPairingTicket() {
  await ensureLanClientTeamCodeAligned();
  var bearer = await resolveHostBearerToken();
  if (!bearer) {
    var err = new Error("no_host_bearer");
    err.code = "no_host_bearer";
    throw err;
  }
  var resp = await lanFetchAuthed("/api/lan/v1/auth/tickets", { method: "POST" });
  if (!resp.ok) {
    var errHttp = new Error("ticket_mint_failed");
    errHttp.status = resp.status;
    throw errHttp;
  }
  var body = await resp.json();
  var ticketId = String(body.ticketId || "");
  var shareHost = await resolveLanShareBaseUrl();
  _lastLanPairing = {
    ticketId,
    pin: String(body.pin || ""),
    joinUrl: shareHost && ticketId ? buildShareJoinUrl(shareHost, ticketId) : String(body.joinUrl || ""),
    expiresAt: body.expiresAt
  };
  return _lastLanPairing;
}
function showLanMigrationNoticeModal() {
  if (typeof document === "undefined") return;
  if (document.getElementById("lan-migration-notice-backdrop")) return;
  var backdrop = document.createElement("div");
  backdrop.id = "lan-migration-notice-backdrop";
  backdrop.className = "modal-backdrop open";
  backdrop.style.zIndex = "10050";
  backdrop.innerHTML = '<div class="lab-conflict-modal" style="max-width:420px;"><h3>Seguridad de red del equipo</h3><p>El c\xF3digo LAN d\xE9bil (<code>1234</code> u otro antiguo) se sustituy\xF3 por un token seguro en esta Mac anfitriona. Tus pacientes y salas LAN se conservaron.</p><p style="font-size:12px;color:var(--text-muted);">Quienes se unan deben usar un <strong>enlace o PIN nuevo</strong> que generes aqu\xED (\u21C4). Los enlaces viejos con <code>?code=</code> ya no funcionan.</p><div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;"><button type="button" id="lan-migration-notice-ok" style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;">Entendido</button></div></div>';
  document.body.appendChild(backdrop);
  var ok = backdrop.querySelector("#lan-migration-notice-ok");
  if (ok) {
    ok.onclick = function() {
      backdrop.remove();
    };
  }
  backdrop.addEventListener("click", function(ev) {
    if (ev.target === backdrop) backdrop.remove();
  });
}
async function maybeShowLanMigrationNotice2() {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (sessionStorage.getItem(LAN_MIGRATION_NOTICE_KEY)) return;
  } catch (_e) {
  }
  if (!isLanSessionConfiguredForRest()) return;
  var resp;
  try {
    resp = await lanFetchAuthed("/api/lan/v1/host-status");
  } catch (_eNet) {
    return;
  }
  if (!resp || !resp.ok) return;
  var data;
  try {
    data = await resp.json();
  } catch (_eJson) {
    return;
  }
  if (!data || !data.requiresMigrationNotice) return;
  try {
    sessionStorage.setItem(LAN_MIGRATION_NOTICE_KEY, "1");
  } catch (_eSet) {
  }
  showLanMigrationNoticeModal();
}
async function persistGuestBearerFromExchange(data) {
  if (!data || !data.persist || data.storageTarget !== "userData") return;
  if (!window.electronAPI || typeof window.electronAPI.lanGuestWriteBearer !== "function") return;
  var token = trimStoredLanBearer(data.token);
  if (!token) return;
  try {
    await window.electronAPI.lanGuestWriteBearer({ token });
  } catch (_e) {
  }
}
async function exchangeLanJoinFromInvite(hostUrl, ticketId, roomId) {
  var base = String(hostUrl || "").trim().replace(/\/+$/, "");
  var tid = String(ticketId || "").trim();
  if (!base || !tid) {
    runtime2().showToast("Falta la direcci\xF3n del servidor o el ticket de invitaci\xF3n.", "error");
    return;
  }
  var res;
  try {
    res = await fetch(base + "/api/lan/v1/auth/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket: tid })
    });
  } catch (_e) {
    runtime2().showToast("Error de red al unirse. Revisa Wi\u2011Fi y que R+ siga abierto en el anfitri\xF3n.", "error");
    return;
  }
  if (!res.ok) {
    runtime2().showToast(
      "Este enlace o PIN ya no es v\xE1lido. Pide al anfitri\xF3n un nuevo enlace o PIN.",
      "error"
    );
    return;
  }
  var data;
  try {
    data = await res.json();
  } catch (_eJson) {
    runtime2().showToast("Respuesta inv\xE1lida del servidor.", "error");
    return;
  }
  await persistGuestBearerFromExchange(data);
  configureLanFromMobileJoin(String(data.hostUrl || base), data.token, roomId);
}
async function syncLanSavedTeamCodeWithEffectiveHostCode() {
  if (!window.electronAPI || typeof window.electronAPI.getLanEffectiveTeamCode !== "function") {
    return false;
  }
  var info;
  try {
    info = await window.electronAPI.getLanEffectiveTeamCode();
  } catch (_e) {
    return false;
  }
  if (!info || !info.ok || !info.code) return false;
  var cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
  var hostUrl = String(cfg.hostUrl || "").trim().replace(/\/+$/, "");
  if (!hostUrl && window.electronAPI && typeof window.electronAPI.getLanCandidateBaseUrl === "function") {
    try {
      hostUrl = String(await window.electronAPI.getLanCandidateBaseUrl() || "").trim().replace(/\/+$/, "");
    } catch (_eUrl) {
    }
  }
  persistLanClientConfig(hostUrl || String(cfg.hostUrl || "").trim().replace(/\/+$/, ""), info.code);
  return true;
}
function isLanElectronDesktop() {
  return !!(typeof window !== "undefined" && window.electronAPI && typeof window.electronAPI.getLanCandidateBaseUrl === "function");
}
function isLanRemoteJoinMode() {
  return typeof storage.getLanUiRole === "function" && storage.getLanUiRole() === "client";
}
function isLocalLoopbackLanUrl(url) {
  try {
    const u = new URL(String(url || "").trim());
    return /^(localhost|127\.0\.0\.1)$/i.test(u.hostname);
  } catch (_e) {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(String(url || "").trim());
  }
}
async function resolveLanShareBaseUrl() {
  if (isLanElectronDesktop() && window.electronAPI && typeof window.electronAPI.getLanCandidateBaseUrl === "function") {
    try {
      var fromElectron = String(await window.electronAPI.getLanCandidateBaseUrl() || "").trim().replace(/\/+$/, "");
      if (fromElectron && !isLocalLoopbackLanUrl(fromElectron)) return fromElectron;
    } catch (_e) {
    }
  }
  var el = document.getElementById("lan-input-host-url");
  var fromInput = el && String(el.value || "").trim().replace(/\/+$/, "");
  if (fromInput && !isLocalLoopbackLanUrl(fromInput)) return fromInput;
  var cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
  var fromCfg = String(cfg.hostUrl || "").trim().replace(/\/+$/, "");
  if (fromCfg && !isLocalLoopbackLanUrl(fromCfg)) return fromCfg;
  return "";
}
function buildShareJoinUrl(hostUrl, ticketId) {
  return buildLanJoinUrls(hostUrl, ticketId).joinUrl;
}
async function resolveLanHostUrlAuto() {
  var shareUrl = await resolveLanShareBaseUrl();
  if (shareUrl) return shareUrl;
  var cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
  var fromCfg = String(cfg.hostUrl || "").trim().replace(/\/+$/, "");
  if (fromCfg) return fromCfg;
  if (!isLanElectronDesktop()) return "";
  return "http://127.0.0.1:3738";
}
function migrateLanElectronStaleClientRole() {
  if (!isLanElectronDesktop() || !isLanRemoteJoinMode()) return;
  var cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() : null;
  if (cfg && String(cfg.hostUrl || "").trim()) return;
  if (typeof storage.saveLanUiRole === "function") storage.saveLanUiRole("host");
}
async function ensureLanElectronHostReady(opts) {
  opts = opts || {};
  migrateLanElectronStaleClientRole();
  if (!isLanElectronDesktop()) return false;
  if (opts.forceLocal) {
    if (typeof storage.saveLanUiRole === "function") storage.saveLanUiRole("host");
  } else if (isLanRemoteJoinMode()) {
    return false;
  }
  await syncLanSavedTeamCodeWithEffectiveHostCode();
  var cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
  var url = opts.forceLocal ? "" : String(cfg.hostUrl || "").trim().replace(/\/+$/, "");
  var autoUrl = await resolveLanHostUrlAuto();
  var bearer = await resolveHostBearerToken();
  if (!bearer) return false;
  if (url) {
    var isLocalUrl = autoUrl && url === autoUrl || isLocalLoopbackLanUrl(url);
    if (!isLocalUrl) {
      var reachable = await pingLanHostUrl(url, cfg.teamCode || bearer);
      if (!reachable) url = "";
    }
  }
  if (!url) url = autoUrl || "http://127.0.0.1:3738";
  var shareUrl = await resolveLanShareBaseUrl();
  if (shareUrl && isLocalLoopbackLanUrl(url)) url = shareUrl;
  persistLanClientConfig(url, bearer);
  try {
    lanClient.connectSyncChannel();
  } catch (_e) {
  }
  return true;
}
async function promoteThisMacToLanHost(opts) {
  opts = opts || {};
  if (!isLanElectronDesktop()) {
    runtime2().showToast("Solo disponible en la app de escritorio.", "info");
    return false;
  }
  var wasRemoteClient = isLanRemoteJoinMode();
  if (typeof storage.saveLanUiRole === "function") storage.saveLanUiRole("host");
  storage.saveLanConfig(null);
  lanClient.disconnect();
  if (wasRemoteClient) {
    clearActiveLiveSyncRoom();
    clearRoomMembership();
  }
  var ok = await ensureLanElectronHostReady({ forceLocal: true });
  deps().renderLanPanel();
  if (ok && !opts.skipToast) {
    runtime2().showToast("Esta Mac ahora es el servidor del turno.", "success");
  }
  if (!ok) {
    runtime2().showToast("No se pudo activar el servidor local. Reinicia R+ e int\xE9ntalo de nuevo.", "error");
  }
  return ok;
}
async function initLanHostPlugAndPlay() {
  if (!isLanElectronDesktop() || isLanRemoteJoinMode()) return;
  await ensureLanElectronHostReady();
}
async function resolveLanTeamCodeForShare() {
  var cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
  var uiRole = typeof storage.getLanUiRole === "function" ? storage.getLanUiRole() : "client";
  if (uiRole === "host") {
    var hostBearer = await resolveHostBearerToken();
    if (hostBearer) return hostBearer;
  }
  var teamInput = document.getElementById("lan-input-team-code");
  var fromInput = teamInput && teamInput.value != null ? String(teamInput.value).trim() : "";
  if (fromInput) return fromInput;
  return trimStoredLanBearer(cfg.teamCode);
}
function getLanTeamCodeFromConfig() {
  var cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
  return trimStoredLanBearer(cfg.teamCode);
}
function applyLanHostUrlSwitch(hostUrl, teamCode, opts) {
  opts = opts || {};
  var url = String(hostUrl || "").trim().replace(/\/+$/, "");
  var code = trimStoredLanBearer(teamCode);
  if (!url) return false;
  if (!opts.skipRememberPrimary && isLanRemoteJoinMode()) rememberPrimaryHostUrl(url);
  persistLanClientConfig(url, code);
  try {
    if (!lanClient.connected) lanClient.connectSyncChannel();
  } catch (_e) {
  }
  return true;
}
function maybeApplyLanHostUrlSwitch(hostUrl, teamCode, opts) {
  opts = opts || {};
  var url = String(hostUrl || "").trim().replace(/\/+$/, "");
  if (!url) return false;
  var cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
  var currentUrl = String(cfg.hostUrl || "").trim().replace(/\/+$/, "");
  var pinned = getPinnedHostUrl();
  if (url === currentUrl) return applyLanHostUrlSwitch(url, teamCode, opts);
  if (opts.blockSwitch) return false;
  if (pinned) {
    if (url === pinned) return applyLanHostUrlSwitch(url, teamCode, opts);
    runtime2().showToast("Anfitri\xF3n fijado: " + pinned + ".", "info");
    return false;
  }
  if (opts.requireConfirm) {
    var msg = opts.confirmMessage || "\xBFCambiar al anfitri\xF3n " + url + "?";
    if (typeof confirm === "function" && !confirm(msg)) return false;
  }
  return applyLanHostUrlSwitch(url, teamCode, opts);
}
function formatLanTicketExpiryLabel(expiresAt) {
  var raw = String(expiresAt || "").trim();
  if (!raw) return "";
  var d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  } catch (_e) {
    return d.toISOString().slice(11, 16);
  }
}
function lanTicketExpirySoon(expiresAt) {
  var raw = String(expiresAt || "").trim();
  if (!raw) return false;
  var d = new Date(raw);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() - Date.now() < 6e4;
}
async function ensureLanPairingForShare(opts) {
  opts = opts || {};
  var hostUrl = await resolveLanHostUrlForShare();
  if (!hostUrl) {
    var errUrl = new Error("no_host_url");
    errUrl.code = "no_host_url";
    throw errUrl;
  }
  if (opts.forceNew || !_lastLanPairing || !_lastLanPairing.ticketId) {
    await mintLanPairingTicket();
  }
  if (!_lastLanPairing || !_lastLanPairing.ticketId) {
    var errTicket = new Error("no_ticket");
    errTicket.code = "no_ticket";
    throw errTicket;
  }
  return { hostUrl, pairing: _lastLanPairing };
}
function configureLanFromMobileJoin(hostUrl, teamCode, roomId) {
  var resolvedHost = resolveLanJoinHostUrl(hostUrl, typeof location !== "undefined" ? location.origin : "") || String(hostUrl || "").trim().replace(/\/+$/, "");
  var cfg = { hostUrl: resolvedHost, teamCode: String(teamCode || "").trim() };
  if (!cfg.teamCode) return;
  if (isLanElectronDesktop() && typeof storage.saveLanUiRole === "function") {
    storage.saveLanUiRole("client");
  }
  storage.saveLanConfig(cfg);
  rememberPrimaryHostUrl(cfg.hostUrl);
  lanClient.configure(cfg);
  try {
    lanClient.connectSyncChannel();
  } catch (_e) {
  }
  lanClient.fetch("/api/lan/v1/ping").then(function(r) {
    if (!r || !r.ok) {
      runtime2().showToast(
        "No se pudo conectar al servidor. Revisa Wi\u2011Fi y que R+ est\xE9 abierto en el anfitri\xF3n.",
        "error"
      );
      deps().renderLanPanel();
      setTimeout(function() {
        if (typeof deps().openConnectionDropdown === "function") deps().openConnectionDropdown();
      }, 400);
      return;
    }
    void maybeShowLanMigrationNotice2();
    var rid = deps().resolveAutoJoinRoomId(roomId);
    if (rid) {
      deps().joinLanRoom(rid, liveSyncRoomLabel(rid));
      runtime2().showToast(
        "Sincronizando pacientes de " + liveSyncRoomLabel(rid) + "\u2026",
        "success"
      );
      return;
    }
    runtime2().showToast(
      "Conectado al servidor, pero el enlace no trae sala. Pide un enlace nuevo desde \u21C4 en la Mac.",
      "warn"
    );
    deps().renderLanPanel();
    setTimeout(function() {
      if (typeof deps().openConnectionDropdown === "function") deps().openConnectionDropdown();
    }, 500);
  }).catch(function() {
    runtime2().showToast("Error de red al conectar con el anfitri\xF3n", "error");
    deps().renderLanPanel();
  });
}
async function resolveLanHostUrlForShare() {
  return resolveLanShareBaseUrl();
}
function updateLanPairingDisplay(root) {
  if (!root) return;
  var box = root.querySelector("#lan-pairing-display");
  if (!box) return;
  if (!_lastLanPairing || !_lastLanPairing.ticketId) {
    box.hidden = true;
    box.textContent = "";
    return;
  }
  box.hidden = false;
  var p = _lastLanPairing;
  var joinLine = p.joinUrl ? '<div><strong>Enlace:</strong> <code style="word-break:break-all;">' + esc(p.joinUrl) + "</code></div>" : "";
  var expiryLabel = formatLanTicketExpiryLabel(p.expiresAt);
  var expirySoon = lanTicketExpirySoon(p.expiresAt);
  var expiryLine = expiryLabel ? '<p class="lan-pairing-expiry' + (expirySoon ? " lan-pairing-expiry--soon" : "") + '" style="margin:8px 0 0;font-size:12px;">V\xE1lido hasta <strong>' + esc(expiryLabel) + "</strong></p>" : "";
  box.innerHTML = '<p style="margin:0 0 6px;font-size:12px;color:var(--text-muted);">Comparte el PIN o el enlace (un solo uso por ticket):</p><div><strong>PIN:</strong> <code>' + esc(p.pin) + "</code></div><div><strong>Ticket:</strong> <code>" + esc(p.ticketId) + "</code></div>" + joinLine + expiryLine;
}
async function mintLanPairingFromUi() {
  try {
    await mintLanPairingTicket();
    var root = document.getElementById("lan-connection-panel-root");
    updateLanPairingDisplay(root);
    runtime2().showToast("Enlace y PIN generados. Comp\xE1rtelos con el equipo.", "success");
  } catch (e) {
    if (e && e.code === "no_host_bearer") {
      runtime2().showToast(
        "No hay token seguro del servidor en esta Mac. Reinicia R+ como anfitri\xF3n o revisa lan-team-code.txt.",
        "error"
      );
      return;
    }
    if (e && e.status === 401) {
      runtime2().showToast("No autorizado para generar invitaci\xF3n. Revisa el token del anfitri\xF3n.", "error");
      return;
    }
    runtime2().showToast("No se pudo generar enlace / PIN. Intenta de nuevo.", "error");
  }
}
function initLanClientFromStorage() {
  var cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() : null;
  if (!cfg || !String(cfg.hostUrl || "").trim()) return;
  persistLanClientConfig(cfg.hostUrl, cfg.teamCode);
  try {
    lanClient.connectSyncChannel();
  } catch (_e) {
  }
  setTimeout(function() {
    var d = deps();
    var mem = getRoomMembership();
    if (mem && mem.roomId && typeof d.bootLanRoomMembership === "function") {
      d.bootLanRoomMembership();
      return;
    }
    if (typeof d.resolveAutoJoinRoomId !== "function" || typeof d.joinLanRoom !== "function") return;
    var autoRoomId = d.resolveAutoJoinRoomId("");
    if (!autoRoomId) return;
    void d.joinLanRoom(autoRoomId, liveSyncRoomLabel(autoRoomId));
  }, 500);
}

// public/js/features/lan-hub-guardia-mode.mjs
function appendLanHubGuardiaModeCard(root, opts = {}) {
  const modoCard = document.createElement("div");
  modoCard.className = "lan-connect-card lan-hub-modo-card";
  const modoLabel = document.createElement("label");
  modoLabel.className = "lan-hub-modo-label";
  modoLabel.setAttribute("for", "lan-hub-guardia-toggle");
  const modoCheck = document.createElement("input");
  modoCheck.type = "checkbox";
  modoCheck.id = "lan-hub-guardia-toggle";
  modoCheck.className = "lan-hub-guardia-check";
  modoCheck.checked = !!clinicalSessionContext.guardiaMode;
  modoCheck.onchange = function() {
    setGuardiaMode(modoCheck.checked, { rerenderBoard: true });
    if (typeof opts.onModeChange === "function") opts.onModeChange();
  };
  modoLabel.appendChild(modoCheck);
  modoLabel.appendChild(document.createTextNode(" Modo Guardia"));
  modoCard.appendChild(modoLabel);
  root.appendChild(modoCard);
}

// public/js/features/lan-hub-panel-shell.mjs
function appendLanHubStatusCard(root, opts) {
  const statusCard = document.createElement("div");
  statusCard.className = "lan-connect-card lan-hub-status-card";
  const connected = !!opts.connected;
  statusCard.innerHTML = '<div class="lan-hub-status-line">' + (connected ? '<span class="lan-hub-status-dot lan-hub-status-dot--online"></span> Conectado a la red del hospital' : '<span class="lan-hub-status-dot lan-hub-status-dot--offline"></span> Sin red \u2014 buscando\u2026') + "</div>";
  if (!connected && opts.isElectronDesktop) {
    const becomeHostBtn = document.createElement("button");
    becomeHostBtn.type = "button";
    becomeHostBtn.className = "btn-lan-primary";
    becomeHostBtn.style.marginTop = "8px";
    becomeHostBtn.style.width = "100%";
    becomeHostBtn.textContent = "Convertirse en host";
    becomeHostBtn.onclick = function() {
      if (typeof opts.onBecomeHost === "function") opts.onBecomeHost();
    };
    statusCard.appendChild(becomeHostBtn);
  }
  root.appendChild(statusCard);
}
function appendLanHubRoomsCard(root, opts) {
  const roomsCard = document.createElement("div");
  roomsCard.className = "lan-connect-card lan-rooms-panel";
  roomsCard.innerHTML = '<div class="lan-connect-card-title">Salas de guardia</div>';
  const defs = opts.visibleSalaDefs || [];
  if (defs.length) {
    const list = document.createElement("ul");
    list.style.listStyle = "none";
    list.style.padding = "0";
    list.style.margin = "0";
    defs.forEach(function(d) {
      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.gap = "8px";
      li.style.alignItems = "center";
      li.style.marginBottom = "8px";
      const name = document.createElement("span");
      name.style.flex = "1";
      name.style.fontSize = "13px";
      name.textContent = d.label;
      const joinBtn = document.createElement("button");
      joinBtn.type = "button";
      joinBtn.className = "btn-lan-secondary";
      joinBtn.style.flex = "0 0 auto";
      const inRoom = opts.activeRoomId === d.id;
      joinBtn.textContent = inRoom ? "En sala" : "Unirse";
      joinBtn.disabled = inRoom;
      joinBtn.setAttribute("data-lan-action", "join-room");
      joinBtn.setAttribute("data-room-id", d.id);
      joinBtn.setAttribute("data-room-label", d.label);
      li.appendChild(name);
      li.appendChild(joinBtn);
      list.appendChild(li);
    });
    roomsCard.appendChild(list);
  }
  root.appendChild(roomsCard);
}

// node_modules/qrcode-generator/dist/qrcode.mjs
var qrcode = function(typeNumber, errorCorrectionLevel) {
  const PAD0 = 236;
  const PAD1 = 17;
  let _typeNumber = typeNumber;
  const _errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
  let _modules = null;
  let _moduleCount = 0;
  let _dataCache = null;
  const _dataList = [];
  const _this = {};
  const makeImpl = function(test, maskPattern) {
    _moduleCount = _typeNumber * 4 + 17;
    _modules = (function(moduleCount) {
      const modules = new Array(moduleCount);
      for (let row = 0; row < moduleCount; row += 1) {
        modules[row] = new Array(moduleCount);
        for (let col = 0; col < moduleCount; col += 1) {
          modules[row][col] = null;
        }
      }
      return modules;
    })(_moduleCount);
    setupPositionProbePattern(0, 0);
    setupPositionProbePattern(_moduleCount - 7, 0);
    setupPositionProbePattern(0, _moduleCount - 7);
    setupPositionAdjustPattern();
    setupTimingPattern();
    setupTypeInfo(test, maskPattern);
    if (_typeNumber >= 7) {
      setupTypeNumber(test);
    }
    if (_dataCache == null) {
      _dataCache = createData(_typeNumber, _errorCorrectionLevel, _dataList);
    }
    mapData(_dataCache, maskPattern);
  };
  const setupPositionProbePattern = function(row, col) {
    for (let r = -1; r <= 7; r += 1) {
      if (row + r <= -1 || _moduleCount <= row + r) continue;
      for (let c = -1; c <= 7; c += 1) {
        if (col + c <= -1 || _moduleCount <= col + c) continue;
        if (0 <= r && r <= 6 && (c == 0 || c == 6) || 0 <= c && c <= 6 && (r == 0 || r == 6) || 2 <= r && r <= 4 && 2 <= c && c <= 4) {
          _modules[row + r][col + c] = true;
        } else {
          _modules[row + r][col + c] = false;
        }
      }
    }
  };
  const getBestMaskPattern = function() {
    let minLostPoint = 0;
    let pattern = 0;
    for (let i = 0; i < 8; i += 1) {
      makeImpl(true, i);
      const lostPoint = QRUtil.getLostPoint(_this);
      if (i == 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint;
        pattern = i;
      }
    }
    return pattern;
  };
  const setupTimingPattern = function() {
    for (let r = 8; r < _moduleCount - 8; r += 1) {
      if (_modules[r][6] != null) {
        continue;
      }
      _modules[r][6] = r % 2 == 0;
    }
    for (let c = 8; c < _moduleCount - 8; c += 1) {
      if (_modules[6][c] != null) {
        continue;
      }
      _modules[6][c] = c % 2 == 0;
    }
  };
  const setupPositionAdjustPattern = function() {
    const pos = QRUtil.getPatternPosition(_typeNumber);
    for (let i = 0; i < pos.length; i += 1) {
      for (let j = 0; j < pos.length; j += 1) {
        const row = pos[i];
        const col = pos[j];
        if (_modules[row][col] != null) {
          continue;
        }
        for (let r = -2; r <= 2; r += 1) {
          for (let c = -2; c <= 2; c += 1) {
            if (r == -2 || r == 2 || c == -2 || c == 2 || r == 0 && c == 0) {
              _modules[row + r][col + c] = true;
            } else {
              _modules[row + r][col + c] = false;
            }
          }
        }
      }
    }
  };
  const setupTypeNumber = function(test) {
    const bits = QRUtil.getBCHTypeNumber(_typeNumber);
    for (let i = 0; i < 18; i += 1) {
      const mod = !test && (bits >> i & 1) == 1;
      _modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
    }
    for (let i = 0; i < 18; i += 1) {
      const mod = !test && (bits >> i & 1) == 1;
      _modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
    }
  };
  const setupTypeInfo = function(test, maskPattern) {
    const data = _errorCorrectionLevel << 3 | maskPattern;
    const bits = QRUtil.getBCHTypeInfo(data);
    for (let i = 0; i < 15; i += 1) {
      const mod = !test && (bits >> i & 1) == 1;
      if (i < 6) {
        _modules[i][8] = mod;
      } else if (i < 8) {
        _modules[i + 1][8] = mod;
      } else {
        _modules[_moduleCount - 15 + i][8] = mod;
      }
    }
    for (let i = 0; i < 15; i += 1) {
      const mod = !test && (bits >> i & 1) == 1;
      if (i < 8) {
        _modules[8][_moduleCount - i - 1] = mod;
      } else if (i < 9) {
        _modules[8][15 - i - 1 + 1] = mod;
      } else {
        _modules[8][15 - i - 1] = mod;
      }
    }
    _modules[_moduleCount - 8][8] = !test;
  };
  const mapData = function(data, maskPattern) {
    let inc = -1;
    let row = _moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;
    const maskFunc = QRUtil.getMaskFunction(maskPattern);
    for (let col = _moduleCount - 1; col > 0; col -= 2) {
      if (col == 6) col -= 1;
      while (true) {
        for (let c = 0; c < 2; c += 1) {
          if (_modules[row][col - c] == null) {
            let dark = false;
            if (byteIndex < data.length) {
              dark = (data[byteIndex] >>> bitIndex & 1) == 1;
            }
            const mask = maskFunc(row, col - c);
            if (mask) {
              dark = !dark;
            }
            _modules[row][col - c] = dark;
            bitIndex -= 1;
            if (bitIndex == -1) {
              byteIndex += 1;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || _moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  };
  const createBytes = function(buffer, rsBlocks) {
    let offset = 0;
    let maxDcCount = 0;
    let maxEcCount = 0;
    const dcdata = new Array(rsBlocks.length);
    const ecdata = new Array(rsBlocks.length);
    for (let r = 0; r < rsBlocks.length; r += 1) {
      const dcCount = rsBlocks[r].dataCount;
      const ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);
      dcdata[r] = new Array(dcCount);
      for (let i = 0; i < dcdata[r].length; i += 1) {
        dcdata[r][i] = 255 & buffer.getBuffer()[i + offset];
      }
      offset += dcCount;
      const rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
      const rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);
      const modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array(rsPoly.getLength() - 1);
      for (let i = 0; i < ecdata[r].length; i += 1) {
        const modIndex = i + modPoly.getLength() - ecdata[r].length;
        ecdata[r][i] = modIndex >= 0 ? modPoly.getAt(modIndex) : 0;
      }
    }
    let totalCodeCount = 0;
    for (let i = 0; i < rsBlocks.length; i += 1) {
      totalCodeCount += rsBlocks[i].totalCount;
    }
    const data = new Array(totalCodeCount);
    let index = 0;
    for (let i = 0; i < maxDcCount; i += 1) {
      for (let r = 0; r < rsBlocks.length; r += 1) {
        if (i < dcdata[r].length) {
          data[index] = dcdata[r][i];
          index += 1;
        }
      }
    }
    for (let i = 0; i < maxEcCount; i += 1) {
      for (let r = 0; r < rsBlocks.length; r += 1) {
        if (i < ecdata[r].length) {
          data[index] = ecdata[r][i];
          index += 1;
        }
      }
    }
    return data;
  };
  const createData = function(typeNumber2, errorCorrectionLevel2, dataList) {
    const rsBlocks = QRRSBlock.getRSBlocks(typeNumber2, errorCorrectionLevel2);
    const buffer = qrBitBuffer();
    for (let i = 0; i < dataList.length; i += 1) {
      const data = dataList[i];
      buffer.put(data.getMode(), 4);
      buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber2));
      data.write(buffer);
    }
    let totalDataCount = 0;
    for (let i = 0; i < rsBlocks.length; i += 1) {
      totalDataCount += rsBlocks[i].dataCount;
    }
    if (buffer.getLengthInBits() > totalDataCount * 8) {
      throw "code length overflow. (" + buffer.getLengthInBits() + ">" + totalDataCount * 8 + ")";
    }
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
      buffer.put(0, 4);
    }
    while (buffer.getLengthInBits() % 8 != 0) {
      buffer.putBit(false);
    }
    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break;
      }
      buffer.put(PAD0, 8);
      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break;
      }
      buffer.put(PAD1, 8);
    }
    return createBytes(buffer, rsBlocks);
  };
  _this.addData = function(data, mode) {
    mode = mode || "Byte";
    let newData = null;
    switch (mode) {
      case "Numeric":
        newData = qrNumber(data);
        break;
      case "Alphanumeric":
        newData = qrAlphaNum(data);
        break;
      case "Byte":
        newData = qr8BitByte(data);
        break;
      case "Kanji":
        newData = qrKanji(data);
        break;
      default:
        throw "mode:" + mode;
    }
    _dataList.push(newData);
    _dataCache = null;
  };
  _this.isDark = function(row, col) {
    if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
      throw row + "," + col;
    }
    return _modules[row][col];
  };
  _this.getModuleCount = function() {
    return _moduleCount;
  };
  _this.make = function() {
    if (_typeNumber < 1) {
      let typeNumber2 = 1;
      for (; typeNumber2 < 40; typeNumber2++) {
        const rsBlocks = QRRSBlock.getRSBlocks(typeNumber2, _errorCorrectionLevel);
        const buffer = qrBitBuffer();
        for (let i = 0; i < _dataList.length; i++) {
          const data = _dataList[i];
          buffer.put(data.getMode(), 4);
          buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber2));
          data.write(buffer);
        }
        let totalDataCount = 0;
        for (let i = 0; i < rsBlocks.length; i++) {
          totalDataCount += rsBlocks[i].dataCount;
        }
        if (buffer.getLengthInBits() <= totalDataCount * 8) {
          break;
        }
      }
      _typeNumber = typeNumber2;
    }
    makeImpl(false, getBestMaskPattern());
  };
  _this.createTableTag = function(cellSize, margin) {
    cellSize = cellSize || 2;
    margin = typeof margin == "undefined" ? cellSize * 4 : margin;
    let qrHtml = "";
    qrHtml += '<table style="';
    qrHtml += " border-width: 0px; border-style: none;";
    qrHtml += " border-collapse: collapse;";
    qrHtml += " padding: 0px; margin: " + margin + "px;";
    qrHtml += '">';
    qrHtml += "<tbody>";
    for (let r = 0; r < _this.getModuleCount(); r += 1) {
      qrHtml += "<tr>";
      for (let c = 0; c < _this.getModuleCount(); c += 1) {
        qrHtml += '<td style="';
        qrHtml += " border-width: 0px; border-style: none;";
        qrHtml += " border-collapse: collapse;";
        qrHtml += " padding: 0px; margin: 0px;";
        qrHtml += " width: " + cellSize + "px;";
        qrHtml += " height: " + cellSize + "px;";
        qrHtml += " background-color: ";
        qrHtml += _this.isDark(r, c) ? "#000000" : "#ffffff";
        qrHtml += ";";
        qrHtml += '"/>';
      }
      qrHtml += "</tr>";
    }
    qrHtml += "</tbody>";
    qrHtml += "</table>";
    return qrHtml;
  };
  _this.createSvgTag = function(cellSize, margin, alt, title) {
    let opts = {};
    if (typeof arguments[0] == "object") {
      opts = arguments[0];
      cellSize = opts.cellSize;
      margin = opts.margin;
      alt = opts.alt;
      title = opts.title;
    }
    cellSize = cellSize || 2;
    margin = typeof margin == "undefined" ? cellSize * 4 : margin;
    alt = typeof alt === "string" ? { text: alt } : alt || {};
    alt.text = alt.text || null;
    alt.id = alt.text ? alt.id || "qrcode-description" : null;
    title = typeof title === "string" ? { text: title } : title || {};
    title.text = title.text || null;
    title.id = title.text ? title.id || "qrcode-title" : null;
    const size = _this.getModuleCount() * cellSize + margin * 2;
    let c, mc, r, mr, qrSvg = "", rect;
    rect = "l" + cellSize + ",0 0," + cellSize + " -" + cellSize + ",0 0,-" + cellSize + "z ";
    qrSvg += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"';
    qrSvg += !opts.scalable ? ' width="' + size + 'px" height="' + size + 'px"' : "";
    qrSvg += ' viewBox="0 0 ' + size + " " + size + '" ';
    qrSvg += ' preserveAspectRatio="xMinYMin meet"';
    qrSvg += title.text || alt.text ? ' role="img" aria-labelledby="' + escapeXml([title.id, alt.id].join(" ").trim()) + '"' : "";
    qrSvg += ">";
    qrSvg += title.text ? '<title id="' + escapeXml(title.id) + '">' + escapeXml(title.text) + "</title>" : "";
    qrSvg += alt.text ? '<description id="' + escapeXml(alt.id) + '">' + escapeXml(alt.text) + "</description>" : "";
    qrSvg += '<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>';
    qrSvg += '<path d="';
    for (r = 0; r < _this.getModuleCount(); r += 1) {
      mr = r * cellSize + margin;
      for (c = 0; c < _this.getModuleCount(); c += 1) {
        if (_this.isDark(r, c)) {
          mc = c * cellSize + margin;
          qrSvg += "M" + mc + "," + mr + rect;
        }
      }
    }
    qrSvg += '" stroke="transparent" fill="black"/>';
    qrSvg += "</svg>";
    return qrSvg;
  };
  _this.createDataURL = function(cellSize, margin) {
    cellSize = cellSize || 2;
    margin = typeof margin == "undefined" ? cellSize * 4 : margin;
    const size = _this.getModuleCount() * cellSize + margin * 2;
    const min = margin;
    const max = size - margin;
    return createDataURL(size, size, function(x, y) {
      if (min <= x && x < max && min <= y && y < max) {
        const c = Math.floor((x - min) / cellSize);
        const r = Math.floor((y - min) / cellSize);
        return _this.isDark(r, c) ? 0 : 1;
      } else {
        return 1;
      }
    });
  };
  _this.createImgTag = function(cellSize, margin, alt) {
    cellSize = cellSize || 2;
    margin = typeof margin == "undefined" ? cellSize * 4 : margin;
    const size = _this.getModuleCount() * cellSize + margin * 2;
    let img = "";
    img += "<img";
    img += ' src="';
    img += _this.createDataURL(cellSize, margin);
    img += '"';
    img += ' width="';
    img += size;
    img += '"';
    img += ' height="';
    img += size;
    img += '"';
    if (alt) {
      img += ' alt="';
      img += escapeXml(alt);
      img += '"';
    }
    img += "/>";
    return img;
  };
  const escapeXml = function(s) {
    let escaped = "";
    for (let i = 0; i < s.length; i += 1) {
      const c = s.charAt(i);
      switch (c) {
        case "<":
          escaped += "&lt;";
          break;
        case ">":
          escaped += "&gt;";
          break;
        case "&":
          escaped += "&amp;";
          break;
        case '"':
          escaped += "&quot;";
          break;
        default:
          escaped += c;
          break;
      }
    }
    return escaped;
  };
  const _createHalfASCII = function(margin) {
    const cellSize = 1;
    margin = typeof margin == "undefined" ? cellSize * 2 : margin;
    const size = _this.getModuleCount() * cellSize + margin * 2;
    const min = margin;
    const max = size - margin;
    let y, x, r1, r2, p;
    const blocks = {
      "\u2588\u2588": "\u2588",
      "\u2588 ": "\u2580",
      " \u2588": "\u2584",
      "  ": " "
    };
    const blocksLastLineNoMargin = {
      "\u2588\u2588": "\u2580",
      "\u2588 ": "\u2580",
      " \u2588": " ",
      "  ": " "
    };
    let ascii = "";
    for (y = 0; y < size; y += 2) {
      r1 = Math.floor((y - min) / cellSize);
      r2 = Math.floor((y + 1 - min) / cellSize);
      for (x = 0; x < size; x += 1) {
        p = "\u2588";
        if (min <= x && x < max && min <= y && y < max && _this.isDark(r1, Math.floor((x - min) / cellSize))) {
          p = " ";
        }
        if (min <= x && x < max && min <= y + 1 && y + 1 < max && _this.isDark(r2, Math.floor((x - min) / cellSize))) {
          p += " ";
        } else {
          p += "\u2588";
        }
        ascii += margin < 1 && y + 1 >= max ? blocksLastLineNoMargin[p] : blocks[p];
      }
      ascii += "\n";
    }
    if (size % 2 && margin > 0) {
      return ascii.substring(0, ascii.length - size - 1) + Array(size + 1).join("\u2580");
    }
    return ascii.substring(0, ascii.length - 1);
  };
  _this.createASCII = function(cellSize, margin) {
    cellSize = cellSize || 1;
    if (cellSize < 2) {
      return _createHalfASCII(margin);
    }
    cellSize -= 1;
    margin = typeof margin == "undefined" ? cellSize * 2 : margin;
    const size = _this.getModuleCount() * cellSize + margin * 2;
    const min = margin;
    const max = size - margin;
    let y, x, r, p;
    const white = Array(cellSize + 1).join("\u2588\u2588");
    const black = Array(cellSize + 1).join("  ");
    let ascii = "";
    let line = "";
    for (y = 0; y < size; y += 1) {
      r = Math.floor((y - min) / cellSize);
      line = "";
      for (x = 0; x < size; x += 1) {
        p = 1;
        if (min <= x && x < max && min <= y && y < max && _this.isDark(r, Math.floor((x - min) / cellSize))) {
          p = 0;
        }
        line += p ? white : black;
      }
      for (r = 0; r < cellSize; r += 1) {
        ascii += line + "\n";
      }
    }
    return ascii.substring(0, ascii.length - 1);
  };
  _this.renderTo2dContext = function(context, cellSize) {
    cellSize = cellSize || 2;
    const length = _this.getModuleCount();
    for (let row = 0; row < length; row++) {
      for (let col = 0; col < length; col++) {
        context.fillStyle = _this.isDark(row, col) ? "black" : "white";
        context.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }
  };
  return _this;
};
qrcode.stringToBytes = function(s) {
  const bytes = [];
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    bytes.push(c & 255);
  }
  return bytes;
};
qrcode.createStringToBytes = function(unicodeData, numChars) {
  const unicodeMap = (function() {
    const bin = base64DecodeInputStream(unicodeData);
    const read = function() {
      const b = bin.read();
      if (b == -1) throw "eof";
      return b;
    };
    let count = 0;
    const unicodeMap2 = {};
    while (true) {
      const b0 = bin.read();
      if (b0 == -1) break;
      const b1 = read();
      const b2 = read();
      const b3 = read();
      const k = String.fromCharCode(b0 << 8 | b1);
      const v = b2 << 8 | b3;
      unicodeMap2[k] = v;
      count += 1;
    }
    if (count != numChars) {
      throw count + " != " + numChars;
    }
    return unicodeMap2;
  })();
  const unknownChar = "?".charCodeAt(0);
  return function(s) {
    const bytes = [];
    for (let i = 0; i < s.length; i += 1) {
      const c = s.charCodeAt(i);
      if (c < 128) {
        bytes.push(c);
      } else {
        const b = unicodeMap[s.charAt(i)];
        if (typeof b == "number") {
          if ((b & 255) == b) {
            bytes.push(b);
          } else {
            bytes.push(b >>> 8);
            bytes.push(b & 255);
          }
        } else {
          bytes.push(unknownChar);
        }
      }
    }
    return bytes;
  };
};
var QRMode = {
  MODE_NUMBER: 1 << 0,
  MODE_ALPHA_NUM: 1 << 1,
  MODE_8BIT_BYTE: 1 << 2,
  MODE_KANJI: 1 << 3
};
var QRErrorCorrectionLevel = {
  L: 1,
  M: 0,
  Q: 3,
  H: 2
};
var QRMaskPattern = {
  PATTERN000: 0,
  PATTERN001: 1,
  PATTERN010: 2,
  PATTERN011: 3,
  PATTERN100: 4,
  PATTERN101: 5,
  PATTERN110: 6,
  PATTERN111: 7
};
var QRUtil = (function() {
  const PATTERN_POSITION_TABLE = [
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50],
    [6, 30, 54],
    [6, 32, 58],
    [6, 34, 62],
    [6, 26, 46, 66],
    [6, 26, 48, 70],
    [6, 26, 50, 74],
    [6, 30, 54, 78],
    [6, 30, 56, 82],
    [6, 30, 58, 86],
    [6, 34, 62, 90],
    [6, 28, 50, 72, 94],
    [6, 26, 50, 74, 98],
    [6, 30, 54, 78, 102],
    [6, 28, 54, 80, 106],
    [6, 32, 58, 84, 110],
    [6, 30, 58, 86, 114],
    [6, 34, 62, 90, 118],
    [6, 26, 50, 74, 98, 122],
    [6, 30, 54, 78, 102, 126],
    [6, 26, 52, 78, 104, 130],
    [6, 30, 56, 82, 108, 134],
    [6, 34, 60, 86, 112, 138],
    [6, 30, 58, 86, 114, 142],
    [6, 34, 62, 90, 118, 146],
    [6, 30, 54, 78, 102, 126, 150],
    [6, 24, 50, 76, 102, 128, 154],
    [6, 28, 54, 80, 106, 132, 158],
    [6, 32, 58, 84, 110, 136, 162],
    [6, 26, 54, 82, 110, 138, 166],
    [6, 30, 58, 86, 114, 142, 170]
  ];
  const G15 = 1 << 10 | 1 << 8 | 1 << 5 | 1 << 4 | 1 << 2 | 1 << 1 | 1 << 0;
  const G18 = 1 << 12 | 1 << 11 | 1 << 10 | 1 << 9 | 1 << 8 | 1 << 5 | 1 << 2 | 1 << 0;
  const G15_MASK = 1 << 14 | 1 << 12 | 1 << 10 | 1 << 4 | 1 << 1;
  const _this = {};
  const getBCHDigit = function(data) {
    let digit = 0;
    while (data != 0) {
      digit += 1;
      data >>>= 1;
    }
    return digit;
  };
  _this.getBCHTypeInfo = function(data) {
    let d = data << 10;
    while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
      d ^= G15 << getBCHDigit(d) - getBCHDigit(G15);
    }
    return (data << 10 | d) ^ G15_MASK;
  };
  _this.getBCHTypeNumber = function(data) {
    let d = data << 12;
    while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
      d ^= G18 << getBCHDigit(d) - getBCHDigit(G18);
    }
    return data << 12 | d;
  };
  _this.getPatternPosition = function(typeNumber) {
    return PATTERN_POSITION_TABLE[typeNumber - 1];
  };
  _this.getMaskFunction = function(maskPattern) {
    switch (maskPattern) {
      case QRMaskPattern.PATTERN000:
        return function(i, j) {
          return (i + j) % 2 == 0;
        };
      case QRMaskPattern.PATTERN001:
        return function(i, j) {
          return i % 2 == 0;
        };
      case QRMaskPattern.PATTERN010:
        return function(i, j) {
          return j % 3 == 0;
        };
      case QRMaskPattern.PATTERN011:
        return function(i, j) {
          return (i + j) % 3 == 0;
        };
      case QRMaskPattern.PATTERN100:
        return function(i, j) {
          return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;
        };
      case QRMaskPattern.PATTERN101:
        return function(i, j) {
          return i * j % 2 + i * j % 3 == 0;
        };
      case QRMaskPattern.PATTERN110:
        return function(i, j) {
          return (i * j % 2 + i * j % 3) % 2 == 0;
        };
      case QRMaskPattern.PATTERN111:
        return function(i, j) {
          return (i * j % 3 + (i + j) % 2) % 2 == 0;
        };
      default:
        throw "bad maskPattern:" + maskPattern;
    }
  };
  _this.getErrorCorrectPolynomial = function(errorCorrectLength) {
    let a = qrPolynomial([1], 0);
    for (let i = 0; i < errorCorrectLength; i += 1) {
      a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0));
    }
    return a;
  };
  _this.getLengthInBits = function(mode, type) {
    if (1 <= type && type < 10) {
      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 10;
        case QRMode.MODE_ALPHA_NUM:
          return 9;
        case QRMode.MODE_8BIT_BYTE:
          return 8;
        case QRMode.MODE_KANJI:
          return 8;
        default:
          throw "mode:" + mode;
      }
    } else if (type < 27) {
      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 12;
        case QRMode.MODE_ALPHA_NUM:
          return 11;
        case QRMode.MODE_8BIT_BYTE:
          return 16;
        case QRMode.MODE_KANJI:
          return 10;
        default:
          throw "mode:" + mode;
      }
    } else if (type < 41) {
      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 14;
        case QRMode.MODE_ALPHA_NUM:
          return 13;
        case QRMode.MODE_8BIT_BYTE:
          return 16;
        case QRMode.MODE_KANJI:
          return 12;
        default:
          throw "mode:" + mode;
      }
    } else {
      throw "type:" + type;
    }
  };
  _this.getLostPoint = function(qrcode2) {
    const moduleCount = qrcode2.getModuleCount();
    let lostPoint = 0;
    for (let row = 0; row < moduleCount; row += 1) {
      for (let col = 0; col < moduleCount; col += 1) {
        let sameCount = 0;
        const dark = qrcode2.isDark(row, col);
        for (let r = -1; r <= 1; r += 1) {
          if (row + r < 0 || moduleCount <= row + r) {
            continue;
          }
          for (let c = -1; c <= 1; c += 1) {
            if (col + c < 0 || moduleCount <= col + c) {
              continue;
            }
            if (r == 0 && c == 0) {
              continue;
            }
            if (dark == qrcode2.isDark(row + r, col + c)) {
              sameCount += 1;
            }
          }
        }
        if (sameCount > 5) {
          lostPoint += 3 + sameCount - 5;
        }
      }
    }
    ;
    for (let row = 0; row < moduleCount - 1; row += 1) {
      for (let col = 0; col < moduleCount - 1; col += 1) {
        let count = 0;
        if (qrcode2.isDark(row, col)) count += 1;
        if (qrcode2.isDark(row + 1, col)) count += 1;
        if (qrcode2.isDark(row, col + 1)) count += 1;
        if (qrcode2.isDark(row + 1, col + 1)) count += 1;
        if (count == 0 || count == 4) {
          lostPoint += 3;
        }
      }
    }
    for (let row = 0; row < moduleCount; row += 1) {
      for (let col = 0; col < moduleCount - 6; col += 1) {
        if (qrcode2.isDark(row, col) && !qrcode2.isDark(row, col + 1) && qrcode2.isDark(row, col + 2) && qrcode2.isDark(row, col + 3) && qrcode2.isDark(row, col + 4) && !qrcode2.isDark(row, col + 5) && qrcode2.isDark(row, col + 6)) {
          lostPoint += 40;
        }
      }
    }
    for (let col = 0; col < moduleCount; col += 1) {
      for (let row = 0; row < moduleCount - 6; row += 1) {
        if (qrcode2.isDark(row, col) && !qrcode2.isDark(row + 1, col) && qrcode2.isDark(row + 2, col) && qrcode2.isDark(row + 3, col) && qrcode2.isDark(row + 4, col) && !qrcode2.isDark(row + 5, col) && qrcode2.isDark(row + 6, col)) {
          lostPoint += 40;
        }
      }
    }
    let darkCount = 0;
    for (let col = 0; col < moduleCount; col += 1) {
      for (let row = 0; row < moduleCount; row += 1) {
        if (qrcode2.isDark(row, col)) {
          darkCount += 1;
        }
      }
    }
    const ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
    lostPoint += ratio * 10;
    return lostPoint;
  };
  return _this;
})();
var QRMath = (function() {
  const EXP_TABLE = new Array(256);
  const LOG_TABLE = new Array(256);
  for (let i = 0; i < 8; i += 1) {
    EXP_TABLE[i] = 1 << i;
  }
  for (let i = 8; i < 256; i += 1) {
    EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
  }
  for (let i = 0; i < 255; i += 1) {
    LOG_TABLE[EXP_TABLE[i]] = i;
  }
  const _this = {};
  _this.glog = function(n) {
    if (n < 1) {
      throw "glog(" + n + ")";
    }
    return LOG_TABLE[n];
  };
  _this.gexp = function(n) {
    while (n < 0) {
      n += 255;
    }
    while (n >= 256) {
      n -= 255;
    }
    return EXP_TABLE[n];
  };
  return _this;
})();
var qrPolynomial = function(num, shift) {
  if (typeof num.length == "undefined") {
    throw num.length + "/" + shift;
  }
  const _num = (function() {
    let offset = 0;
    while (offset < num.length && num[offset] == 0) {
      offset += 1;
    }
    const _num2 = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i += 1) {
      _num2[i] = num[i + offset];
    }
    return _num2;
  })();
  const _this = {};
  _this.getAt = function(index) {
    return _num[index];
  };
  _this.getLength = function() {
    return _num.length;
  };
  _this.multiply = function(e) {
    const num2 = new Array(_this.getLength() + e.getLength() - 1);
    for (let i = 0; i < _this.getLength(); i += 1) {
      for (let j = 0; j < e.getLength(); j += 1) {
        num2[i + j] ^= QRMath.gexp(QRMath.glog(_this.getAt(i)) + QRMath.glog(e.getAt(j)));
      }
    }
    return qrPolynomial(num2, 0);
  };
  _this.mod = function(e) {
    if (_this.getLength() - e.getLength() < 0) {
      return _this;
    }
    const ratio = QRMath.glog(_this.getAt(0)) - QRMath.glog(e.getAt(0));
    const num2 = new Array(_this.getLength());
    for (let i = 0; i < _this.getLength(); i += 1) {
      num2[i] = _this.getAt(i);
    }
    for (let i = 0; i < e.getLength(); i += 1) {
      num2[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i)) + ratio);
    }
    return qrPolynomial(num2, 0).mod(e);
  };
  return _this;
};
var QRRSBlock = (function() {
  const RS_BLOCK_TABLE = [
    // L
    // M
    // Q
    // H
    // 1
    [1, 26, 19],
    [1, 26, 16],
    [1, 26, 13],
    [1, 26, 9],
    // 2
    [1, 44, 34],
    [1, 44, 28],
    [1, 44, 22],
    [1, 44, 16],
    // 3
    [1, 70, 55],
    [1, 70, 44],
    [2, 35, 17],
    [2, 35, 13],
    // 4
    [1, 100, 80],
    [2, 50, 32],
    [2, 50, 24],
    [4, 25, 9],
    // 5
    [1, 134, 108],
    [2, 67, 43],
    [2, 33, 15, 2, 34, 16],
    [2, 33, 11, 2, 34, 12],
    // 6
    [2, 86, 68],
    [4, 43, 27],
    [4, 43, 19],
    [4, 43, 15],
    // 7
    [2, 98, 78],
    [4, 49, 31],
    [2, 32, 14, 4, 33, 15],
    [4, 39, 13, 1, 40, 14],
    // 8
    [2, 121, 97],
    [2, 60, 38, 2, 61, 39],
    [4, 40, 18, 2, 41, 19],
    [4, 40, 14, 2, 41, 15],
    // 9
    [2, 146, 116],
    [3, 58, 36, 2, 59, 37],
    [4, 36, 16, 4, 37, 17],
    [4, 36, 12, 4, 37, 13],
    // 10
    [2, 86, 68, 2, 87, 69],
    [4, 69, 43, 1, 70, 44],
    [6, 43, 19, 2, 44, 20],
    [6, 43, 15, 2, 44, 16],
    // 11
    [4, 101, 81],
    [1, 80, 50, 4, 81, 51],
    [4, 50, 22, 4, 51, 23],
    [3, 36, 12, 8, 37, 13],
    // 12
    [2, 116, 92, 2, 117, 93],
    [6, 58, 36, 2, 59, 37],
    [4, 46, 20, 6, 47, 21],
    [7, 42, 14, 4, 43, 15],
    // 13
    [4, 133, 107],
    [8, 59, 37, 1, 60, 38],
    [8, 44, 20, 4, 45, 21],
    [12, 33, 11, 4, 34, 12],
    // 14
    [3, 145, 115, 1, 146, 116],
    [4, 64, 40, 5, 65, 41],
    [11, 36, 16, 5, 37, 17],
    [11, 36, 12, 5, 37, 13],
    // 15
    [5, 109, 87, 1, 110, 88],
    [5, 65, 41, 5, 66, 42],
    [5, 54, 24, 7, 55, 25],
    [11, 36, 12, 7, 37, 13],
    // 16
    [5, 122, 98, 1, 123, 99],
    [7, 73, 45, 3, 74, 46],
    [15, 43, 19, 2, 44, 20],
    [3, 45, 15, 13, 46, 16],
    // 17
    [1, 135, 107, 5, 136, 108],
    [10, 74, 46, 1, 75, 47],
    [1, 50, 22, 15, 51, 23],
    [2, 42, 14, 17, 43, 15],
    // 18
    [5, 150, 120, 1, 151, 121],
    [9, 69, 43, 4, 70, 44],
    [17, 50, 22, 1, 51, 23],
    [2, 42, 14, 19, 43, 15],
    // 19
    [3, 141, 113, 4, 142, 114],
    [3, 70, 44, 11, 71, 45],
    [17, 47, 21, 4, 48, 22],
    [9, 39, 13, 16, 40, 14],
    // 20
    [3, 135, 107, 5, 136, 108],
    [3, 67, 41, 13, 68, 42],
    [15, 54, 24, 5, 55, 25],
    [15, 43, 15, 10, 44, 16],
    // 21
    [4, 144, 116, 4, 145, 117],
    [17, 68, 42],
    [17, 50, 22, 6, 51, 23],
    [19, 46, 16, 6, 47, 17],
    // 22
    [2, 139, 111, 7, 140, 112],
    [17, 74, 46],
    [7, 54, 24, 16, 55, 25],
    [34, 37, 13],
    // 23
    [4, 151, 121, 5, 152, 122],
    [4, 75, 47, 14, 76, 48],
    [11, 54, 24, 14, 55, 25],
    [16, 45, 15, 14, 46, 16],
    // 24
    [6, 147, 117, 4, 148, 118],
    [6, 73, 45, 14, 74, 46],
    [11, 54, 24, 16, 55, 25],
    [30, 46, 16, 2, 47, 17],
    // 25
    [8, 132, 106, 4, 133, 107],
    [8, 75, 47, 13, 76, 48],
    [7, 54, 24, 22, 55, 25],
    [22, 45, 15, 13, 46, 16],
    // 26
    [10, 142, 114, 2, 143, 115],
    [19, 74, 46, 4, 75, 47],
    [28, 50, 22, 6, 51, 23],
    [33, 46, 16, 4, 47, 17],
    // 27
    [8, 152, 122, 4, 153, 123],
    [22, 73, 45, 3, 74, 46],
    [8, 53, 23, 26, 54, 24],
    [12, 45, 15, 28, 46, 16],
    // 28
    [3, 147, 117, 10, 148, 118],
    [3, 73, 45, 23, 74, 46],
    [4, 54, 24, 31, 55, 25],
    [11, 45, 15, 31, 46, 16],
    // 29
    [7, 146, 116, 7, 147, 117],
    [21, 73, 45, 7, 74, 46],
    [1, 53, 23, 37, 54, 24],
    [19, 45, 15, 26, 46, 16],
    // 30
    [5, 145, 115, 10, 146, 116],
    [19, 75, 47, 10, 76, 48],
    [15, 54, 24, 25, 55, 25],
    [23, 45, 15, 25, 46, 16],
    // 31
    [13, 145, 115, 3, 146, 116],
    [2, 74, 46, 29, 75, 47],
    [42, 54, 24, 1, 55, 25],
    [23, 45, 15, 28, 46, 16],
    // 32
    [17, 145, 115],
    [10, 74, 46, 23, 75, 47],
    [10, 54, 24, 35, 55, 25],
    [19, 45, 15, 35, 46, 16],
    // 33
    [17, 145, 115, 1, 146, 116],
    [14, 74, 46, 21, 75, 47],
    [29, 54, 24, 19, 55, 25],
    [11, 45, 15, 46, 46, 16],
    // 34
    [13, 145, 115, 6, 146, 116],
    [14, 74, 46, 23, 75, 47],
    [44, 54, 24, 7, 55, 25],
    [59, 46, 16, 1, 47, 17],
    // 35
    [12, 151, 121, 7, 152, 122],
    [12, 75, 47, 26, 76, 48],
    [39, 54, 24, 14, 55, 25],
    [22, 45, 15, 41, 46, 16],
    // 36
    [6, 151, 121, 14, 152, 122],
    [6, 75, 47, 34, 76, 48],
    [46, 54, 24, 10, 55, 25],
    [2, 45, 15, 64, 46, 16],
    // 37
    [17, 152, 122, 4, 153, 123],
    [29, 74, 46, 14, 75, 47],
    [49, 54, 24, 10, 55, 25],
    [24, 45, 15, 46, 46, 16],
    // 38
    [4, 152, 122, 18, 153, 123],
    [13, 74, 46, 32, 75, 47],
    [48, 54, 24, 14, 55, 25],
    [42, 45, 15, 32, 46, 16],
    // 39
    [20, 147, 117, 4, 148, 118],
    [40, 75, 47, 7, 76, 48],
    [43, 54, 24, 22, 55, 25],
    [10, 45, 15, 67, 46, 16],
    // 40
    [19, 148, 118, 6, 149, 119],
    [18, 75, 47, 31, 76, 48],
    [34, 54, 24, 34, 55, 25],
    [20, 45, 15, 61, 46, 16]
  ];
  const qrRSBlock = function(totalCount, dataCount) {
    const _this2 = {};
    _this2.totalCount = totalCount;
    _this2.dataCount = dataCount;
    return _this2;
  };
  const _this = {};
  const getRsBlockTable = function(typeNumber, errorCorrectionLevel) {
    switch (errorCorrectionLevel) {
      case QRErrorCorrectionLevel.L:
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case QRErrorCorrectionLevel.M:
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case QRErrorCorrectionLevel.Q:
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case QRErrorCorrectionLevel.H:
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default:
        return void 0;
    }
  };
  _this.getRSBlocks = function(typeNumber, errorCorrectionLevel) {
    const rsBlock = getRsBlockTable(typeNumber, errorCorrectionLevel);
    if (typeof rsBlock == "undefined") {
      throw "bad rs block @ typeNumber:" + typeNumber + "/errorCorrectionLevel:" + errorCorrectionLevel;
    }
    const length = rsBlock.length / 3;
    const list = [];
    for (let i = 0; i < length; i += 1) {
      const count = rsBlock[i * 3 + 0];
      const totalCount = rsBlock[i * 3 + 1];
      const dataCount = rsBlock[i * 3 + 2];
      for (let j = 0; j < count; j += 1) {
        list.push(qrRSBlock(totalCount, dataCount));
      }
    }
    return list;
  };
  return _this;
})();
var qrBitBuffer = function() {
  const _buffer = [];
  let _length = 0;
  const _this = {};
  _this.getBuffer = function() {
    return _buffer;
  };
  _this.getAt = function(index) {
    const bufIndex = Math.floor(index / 8);
    return (_buffer[bufIndex] >>> 7 - index % 8 & 1) == 1;
  };
  _this.put = function(num, length) {
    for (let i = 0; i < length; i += 1) {
      _this.putBit((num >>> length - i - 1 & 1) == 1);
    }
  };
  _this.getLengthInBits = function() {
    return _length;
  };
  _this.putBit = function(bit) {
    const bufIndex = Math.floor(_length / 8);
    if (_buffer.length <= bufIndex) {
      _buffer.push(0);
    }
    if (bit) {
      _buffer[bufIndex] |= 128 >>> _length % 8;
    }
    _length += 1;
  };
  return _this;
};
var qrNumber = function(data) {
  const _mode = QRMode.MODE_NUMBER;
  const _data = data;
  const _this = {};
  _this.getMode = function() {
    return _mode;
  };
  _this.getLength = function(buffer) {
    return _data.length;
  };
  _this.write = function(buffer) {
    const data2 = _data;
    let i = 0;
    while (i + 2 < data2.length) {
      buffer.put(strToNum(data2.substring(i, i + 3)), 10);
      i += 3;
    }
    if (i < data2.length) {
      if (data2.length - i == 1) {
        buffer.put(strToNum(data2.substring(i, i + 1)), 4);
      } else if (data2.length - i == 2) {
        buffer.put(strToNum(data2.substring(i, i + 2)), 7);
      }
    }
  };
  const strToNum = function(s) {
    let num = 0;
    for (let i = 0; i < s.length; i += 1) {
      num = num * 10 + chatToNum(s.charAt(i));
    }
    return num;
  };
  const chatToNum = function(c) {
    if ("0" <= c && c <= "9") {
      return c.charCodeAt(0) - "0".charCodeAt(0);
    }
    throw "illegal char :" + c;
  };
  return _this;
};
var qrAlphaNum = function(data) {
  const _mode = QRMode.MODE_ALPHA_NUM;
  const _data = data;
  const _this = {};
  _this.getMode = function() {
    return _mode;
  };
  _this.getLength = function(buffer) {
    return _data.length;
  };
  _this.write = function(buffer) {
    const s = _data;
    let i = 0;
    while (i + 1 < s.length) {
      buffer.put(
        getCode(s.charAt(i)) * 45 + getCode(s.charAt(i + 1)),
        11
      );
      i += 2;
    }
    if (i < s.length) {
      buffer.put(getCode(s.charAt(i)), 6);
    }
  };
  const getCode = function(c) {
    if ("0" <= c && c <= "9") {
      return c.charCodeAt(0) - "0".charCodeAt(0);
    } else if ("A" <= c && c <= "Z") {
      return c.charCodeAt(0) - "A".charCodeAt(0) + 10;
    } else {
      switch (c) {
        case " ":
          return 36;
        case "$":
          return 37;
        case "%":
          return 38;
        case "*":
          return 39;
        case "+":
          return 40;
        case "-":
          return 41;
        case ".":
          return 42;
        case "/":
          return 43;
        case ":":
          return 44;
        default:
          throw "illegal char :" + c;
      }
    }
  };
  return _this;
};
var qr8BitByte = function(data) {
  const _mode = QRMode.MODE_8BIT_BYTE;
  const _data = data;
  const _bytes = qrcode.stringToBytes(data);
  const _this = {};
  _this.getMode = function() {
    return _mode;
  };
  _this.getLength = function(buffer) {
    return _bytes.length;
  };
  _this.write = function(buffer) {
    for (let i = 0; i < _bytes.length; i += 1) {
      buffer.put(_bytes[i], 8);
    }
  };
  return _this;
};
var qrKanji = function(data) {
  const _mode = QRMode.MODE_KANJI;
  const _data = data;
  const stringToBytes2 = qrcode.stringToBytes;
  !(function(c, code) {
    const test = stringToBytes2(c);
    if (test.length != 2 || (test[0] << 8 | test[1]) != code) {
      throw "sjis not supported.";
    }
  })("\u53CB", 38726);
  const _bytes = stringToBytes2(data);
  const _this = {};
  _this.getMode = function() {
    return _mode;
  };
  _this.getLength = function(buffer) {
    return ~~(_bytes.length / 2);
  };
  _this.write = function(buffer) {
    const data2 = _bytes;
    let i = 0;
    while (i + 1 < data2.length) {
      let c = (255 & data2[i]) << 8 | 255 & data2[i + 1];
      if (33088 <= c && c <= 40956) {
        c -= 33088;
      } else if (57408 <= c && c <= 60351) {
        c -= 49472;
      } else {
        throw "illegal char at " + (i + 1) + "/" + c;
      }
      c = (c >>> 8 & 255) * 192 + (c & 255);
      buffer.put(c, 13);
      i += 2;
    }
    if (i < data2.length) {
      throw "illegal char at " + (i + 1);
    }
  };
  return _this;
};
var byteArrayOutputStream = function() {
  const _bytes = [];
  const _this = {};
  _this.writeByte = function(b) {
    _bytes.push(b & 255);
  };
  _this.writeShort = function(i) {
    _this.writeByte(i);
    _this.writeByte(i >>> 8);
  };
  _this.writeBytes = function(b, off, len) {
    off = off || 0;
    len = len || b.length;
    for (let i = 0; i < len; i += 1) {
      _this.writeByte(b[i + off]);
    }
  };
  _this.writeString = function(s) {
    for (let i = 0; i < s.length; i += 1) {
      _this.writeByte(s.charCodeAt(i));
    }
  };
  _this.toByteArray = function() {
    return _bytes;
  };
  _this.toString = function() {
    let s = "";
    s += "[";
    for (let i = 0; i < _bytes.length; i += 1) {
      if (i > 0) {
        s += ",";
      }
      s += _bytes[i];
    }
    s += "]";
    return s;
  };
  return _this;
};
var base64EncodeOutputStream = function() {
  let _buffer = 0;
  let _buflen = 0;
  let _length = 0;
  let _base64 = "";
  const _this = {};
  const writeEncoded = function(b) {
    _base64 += String.fromCharCode(encode(b & 63));
  };
  const encode = function(n) {
    if (n < 0) {
      throw "n:" + n;
    } else if (n < 26) {
      return 65 + n;
    } else if (n < 52) {
      return 97 + (n - 26);
    } else if (n < 62) {
      return 48 + (n - 52);
    } else if (n == 62) {
      return 43;
    } else if (n == 63) {
      return 47;
    } else {
      throw "n:" + n;
    }
  };
  _this.writeByte = function(n) {
    _buffer = _buffer << 8 | n & 255;
    _buflen += 8;
    _length += 1;
    while (_buflen >= 6) {
      writeEncoded(_buffer >>> _buflen - 6);
      _buflen -= 6;
    }
  };
  _this.flush = function() {
    if (_buflen > 0) {
      writeEncoded(_buffer << 6 - _buflen);
      _buffer = 0;
      _buflen = 0;
    }
    if (_length % 3 != 0) {
      const padlen = 3 - _length % 3;
      for (let i = 0; i < padlen; i += 1) {
        _base64 += "=";
      }
    }
  };
  _this.toString = function() {
    return _base64;
  };
  return _this;
};
var base64DecodeInputStream = function(str) {
  const _str = str;
  let _pos = 0;
  let _buffer = 0;
  let _buflen = 0;
  const _this = {};
  _this.read = function() {
    while (_buflen < 8) {
      if (_pos >= _str.length) {
        if (_buflen == 0) {
          return -1;
        }
        throw "unexpected end of file./" + _buflen;
      }
      const c = _str.charAt(_pos);
      _pos += 1;
      if (c == "=") {
        _buflen = 0;
        return -1;
      } else if (c.match(/^\s$/)) {
        continue;
      }
      _buffer = _buffer << 6 | decode(c.charCodeAt(0));
      _buflen += 6;
    }
    const n = _buffer >>> _buflen - 8 & 255;
    _buflen -= 8;
    return n;
  };
  const decode = function(c) {
    if (65 <= c && c <= 90) {
      return c - 65;
    } else if (97 <= c && c <= 122) {
      return c - 97 + 26;
    } else if (48 <= c && c <= 57) {
      return c - 48 + 52;
    } else if (c == 43) {
      return 62;
    } else if (c == 47) {
      return 63;
    } else {
      throw "c:" + c;
    }
  };
  return _this;
};
var gifImage = function(width, height) {
  const _width = width;
  const _height = height;
  const _data = new Array(width * height);
  const _this = {};
  _this.setPixel = function(x, y, pixel) {
    _data[y * _width + x] = pixel;
  };
  _this.write = function(out) {
    out.writeString("GIF87a");
    out.writeShort(_width);
    out.writeShort(_height);
    out.writeByte(128);
    out.writeByte(0);
    out.writeByte(0);
    out.writeByte(0);
    out.writeByte(0);
    out.writeByte(0);
    out.writeByte(255);
    out.writeByte(255);
    out.writeByte(255);
    out.writeString(",");
    out.writeShort(0);
    out.writeShort(0);
    out.writeShort(_width);
    out.writeShort(_height);
    out.writeByte(0);
    const lzwMinCodeSize = 2;
    const raster = getLZWRaster(lzwMinCodeSize);
    out.writeByte(lzwMinCodeSize);
    let offset = 0;
    while (raster.length - offset > 255) {
      out.writeByte(255);
      out.writeBytes(raster, offset, 255);
      offset += 255;
    }
    out.writeByte(raster.length - offset);
    out.writeBytes(raster, offset, raster.length - offset);
    out.writeByte(0);
    out.writeString(";");
  };
  const bitOutputStream = function(out) {
    const _out = out;
    let _bitLength = 0;
    let _bitBuffer = 0;
    const _this2 = {};
    _this2.write = function(data, length) {
      if (data >>> length != 0) {
        throw "length over";
      }
      while (_bitLength + length >= 8) {
        _out.writeByte(255 & (data << _bitLength | _bitBuffer));
        length -= 8 - _bitLength;
        data >>>= 8 - _bitLength;
        _bitBuffer = 0;
        _bitLength = 0;
      }
      _bitBuffer = data << _bitLength | _bitBuffer;
      _bitLength = _bitLength + length;
    };
    _this2.flush = function() {
      if (_bitLength > 0) {
        _out.writeByte(_bitBuffer);
      }
    };
    return _this2;
  };
  const getLZWRaster = function(lzwMinCodeSize) {
    const clearCode = 1 << lzwMinCodeSize;
    const endCode = (1 << lzwMinCodeSize) + 1;
    let bitLength = lzwMinCodeSize + 1;
    const table = lzwTable();
    for (let i = 0; i < clearCode; i += 1) {
      table.add(String.fromCharCode(i));
    }
    table.add(String.fromCharCode(clearCode));
    table.add(String.fromCharCode(endCode));
    const byteOut = byteArrayOutputStream();
    const bitOut = bitOutputStream(byteOut);
    bitOut.write(clearCode, bitLength);
    let dataIndex = 0;
    let s = String.fromCharCode(_data[dataIndex]);
    dataIndex += 1;
    while (dataIndex < _data.length) {
      const c = String.fromCharCode(_data[dataIndex]);
      dataIndex += 1;
      if (table.contains(s + c)) {
        s = s + c;
      } else {
        bitOut.write(table.indexOf(s), bitLength);
        if (table.size() < 4095) {
          if (table.size() == 1 << bitLength) {
            bitLength += 1;
          }
          table.add(s + c);
        }
        s = c;
      }
    }
    bitOut.write(table.indexOf(s), bitLength);
    bitOut.write(endCode, bitLength);
    bitOut.flush();
    return byteOut.toByteArray();
  };
  const lzwTable = function() {
    const _map = {};
    let _size = 0;
    const _this2 = {};
    _this2.add = function(key) {
      if (_this2.contains(key)) {
        throw "dup key:" + key;
      }
      _map[key] = _size;
      _size += 1;
    };
    _this2.size = function() {
      return _size;
    };
    _this2.indexOf = function(key) {
      return _map[key];
    };
    _this2.contains = function(key) {
      return typeof _map[key] != "undefined";
    };
    return _this2;
  };
  return _this;
};
var createDataURL = function(width, height, getPixel) {
  const gif = gifImage(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      gif.setPixel(x, y, getPixel(x, y));
    }
  }
  const b = byteArrayOutputStream();
  gif.write(b);
  const base64 = base64EncodeOutputStream();
  const bytes = b.toByteArray();
  for (let i = 0; i < bytes.length; i += 1) {
    base64.writeByte(bytes[i]);
  }
  base64.flush();
  return "data:image/gif;base64," + base64;
};
var qrcode_default = qrcode;
var stringToBytes = qrcode.stringToBytes;

// public/js/interno-qr-render.mjs
function drawInternoQrCanvas(canvas, text, opts = {}) {
  const cellPx = opts.cellPx ?? 4;
  const margin = opts.margin ?? 16;
  const qr = qrcode_default(0, "M");
  qr.addData(String(text || ""));
  qr.make();
  const n = qr.getModuleCount();
  const size = n * cellPx + margin * 2;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_context");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#000000";
  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) {
      if (!qr.isDark(row, col)) continue;
      ctx.fillRect(margin + col * cellPx, margin + row * cellPx, cellPx, cellPx);
    }
  }
  return canvas;
}
async function copyInternoQrImage(url, showToast) {
  const toast5 = typeof showToast === "function" ? showToast : (msg, kind) => {
    if (typeof window.showToast === "function") window.showToast(msg, kind);
  };
  try {
    const canvas = document.createElement("canvas");
    drawInternoQrCanvas(canvas, url);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error("blob_failed")), "image/png");
    });
    if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast5("QR copiado \u2014 p\xE9galo en WhatsApp o imprime", "success");
      return;
    }
    const dataUrl = canvas.toDataURL("image/png");
    await navigator.clipboard.writeText(dataUrl);
    toast5("QR copiado como imagen (data URL)", "info");
  } catch (_e) {
    toast5("No se pudo copiar el QR", "error");
  }
}

// public/js/features/interno-qr-panel.mjs
var SALA_DEFS = [
  { key: "Sala 1", slug: "sala-1" },
  { key: "Sala 2", slug: "sala-2" },
  { key: "Sala E", slug: "sala-e" }
];
function dbApi4() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
function normalizeHostBase(hostBase) {
  const base = String(hostBase || "").trim().replace(/\/+$/, "");
  if (base) return base;
  return "http://127.0.0.1:3738";
}
function internoUrl(sala, slug, token, hostBase) {
  const host = normalizeHostBase(hostBase);
  return `${host}/interno/${slug}?t=${encodeURIComponent(token)}&sala=${encodeURIComponent(sala)}`;
}
function isLocalOnlyHost(base) {
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/i.test(String(base || "").trim());
}
async function resolveHostBase(fallback) {
  if (typeof window !== "undefined" && window.electronAPI?.getLanCandidateBaseUrl) {
    try {
      const u = String(await window.electronAPI.getLanCandidateBaseUrl() || "").trim().replace(/\/+$/, "");
      if (u && !isLocalOnlyHost(u)) return u;
    } catch (_e) {
    }
  }
  const fb = normalizeHostBase(fallback);
  if (!isLocalOnlyHost(fb)) return fb;
  return fb;
}
async function appendInternoQrPanel(root, opts = {}) {
  const api3 = dbApi4();
  const userId = String(opts.userId || "");
  if (!api3 || !userId || typeof api3.dbInternoAccessList !== "function") return;
  const details = document.createElement("details");
  details.className = "lan-connect-card lan-hub-interno-details";
  const summary = document.createElement("summary");
  summary.className = "lan-hub-interno-summary";
  summary.innerHTML = '<span class="lan-connect-card-title">QR Internos (MIP)</span><span class="lan-connect-card-hint lan-hub-interno-summary-hint">Celulares pregrado \xB7 config. \xFAnica</span>';
  details.appendChild(summary);
  const body = document.createElement("div");
  body.className = "lan-hub-interno-body";
  body.hidden = true;
  details.appendChild(body);
  root.appendChild(details);
  const showToast = typeof opts.showToast === "function" ? opts.showToast : () => {
  };
  let hostBase = normalizeHostBase(opts.hostBaseUrl);
  let loaded = false;
  async function ensureLoaded() {
    if (loaded) return;
    loaded = true;
    body.hidden = false;
    await renderPanel(body);
  }
  details.addEventListener("toggle", () => {
    if (details.open) void ensureLoaded();
  });
  async function loadRows() {
    const res = await api3.dbInternoAccessList({ userId });
    if (!res || !res.ok) return null;
    return Array.isArray(res.rows) ? res.rows : [];
  }
  async function renderPanel(card) {
    hostBase = await resolveHostBase(opts.hostBaseUrl || hostBase);
    card.querySelectorAll(".interno-sala-block, .lan-connect-card-hint, .interno-qr-lan-warn").forEach((el) => el.remove());
    if (isLocalOnlyHost(hostBase)) {
      const warn = document.createElement("div");
      warn.className = "interno-qr-lan-warn lan-connect-card-hint";
      warn.style.cssText = "margin:0 0 10px;padding:8px 10px;border-radius:8px;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;";
      warn.innerHTML = "<strong>Sin IP de red local.</strong> Conecta la Mac a Wi\u2011Fi/Ethernet y pulsa \xABActualizar IP\xBB. El celular no puede usar 127.0.0.1.";
      card.appendChild(warn);
      const refreshBtn = document.createElement("button");
      refreshBtn.type = "button";
      refreshBtn.className = "btn-lan-secondary";
      refreshBtn.style.cssText = "font-size:12px;margin-bottom:8px;";
      refreshBtn.textContent = "Actualizar IP";
      refreshBtn.onclick = () => {
        opts.hostBaseUrl = "";
        void renderPanel(card);
      };
      card.appendChild(refreshBtn);
    } else {
      const ok = document.createElement("p");
      ok.className = "lan-connect-card-hint interno-qr-lan-warn";
      ok.textContent = `Host LAN: ${hostBase}`;
      card.appendChild(ok);
    }
    const rows = await loadRows();
    if (rows === null) {
      card.innerHTML = '<p class="lan-connect-card-hint">No se pudo cargar acceso interno.</p>';
      return;
    }
    const bySala = new Map(rows.map((r) => [String(r.sala), r]));
    for (const def of SALA_DEFS) {
      const row = bySala.get(def.key) || {};
      const active = row.is_active === 1;
      const token = String(row.access_token || "");
      const url = token ? internoUrl(def.key, def.slug, token, hostBase) : "";
      const block = document.createElement("div");
      block.className = "interno-sala-block";
      block.style.marginTop = "12px";
      block.style.paddingTop = "12px";
      block.style.borderTop = "1px solid var(--border, rgba(128,128,128,0.25))";
      block.innerHTML = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <strong>${def.key}</strong>
        <span class="lan-connect-card-hint" style="margin:0">${active ? "Activo" : "Inactivo"}</span>
      </div>`;
      if (url) {
        const link = document.createElement("p");
        link.className = "lan-connect-card-hint";
        link.style.wordBreak = "break-all";
        link.style.fontSize = "11px";
        link.textContent = url;
        block.appendChild(link);
      }
      const btnRow = document.createElement("div");
      btnRow.style.display = "flex";
      btnRow.style.flexWrap = "wrap";
      btnRow.style.gap = "6px";
      btnRow.style.marginTop = "6px";
      const mkBtn = (label, fn) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "btn-lan-secondary";
        b.style.fontSize = "12px";
        b.textContent = label;
        b.onclick = () => void fn();
        return b;
      };
      btnRow.appendChild(
        mkBtn(active ? "Desactivar" : "Activar", async () => {
          const r = await api3.dbInternoAccessSetActive({
            userId,
            sala: def.key,
            active: !active
          });
          if (r?.ok) {
            showToast(active ? "Acceso interno desactivado" : "Acceso interno activado", "success");
            await renderPanel(body);
          } else {
            showToast(r?.error || "Error", "error");
          }
        })
      );
      btnRow.appendChild(
        mkBtn("Regenerar token", async () => {
          if (!confirm(`\xBFRegenerar QR de ${def.key}? El enlace anterior dejar\xE1 de funcionar.`)) return;
          const r = await api3.dbInternoAccessRotate({ userId, sala: def.key });
          if (r?.ok) {
            showToast("Token regenerado \u2014 copia el QR de nuevo", "success");
            await renderPanel(body);
          } else {
            showToast(r?.error || "Error", "error");
          }
        })
      );
      if (url) {
        btnRow.appendChild(
          mkBtn("Copiar enlace", async () => {
            if (isLocalOnlyHost(hostBase)) {
              showToast("Primero obt\xE9n la IP LAN (Actualizar IP)", "error");
              return;
            }
            try {
              await navigator.clipboard.writeText(url);
              showToast("Enlace copiado", "success");
            } catch (_e) {
              showToast("No se pudo copiar", "error");
            }
          })
        );
        btnRow.appendChild(
          mkBtn("Copiar QR", () => {
            if (isLocalOnlyHost(hostBase)) {
              showToast("Primero obt\xE9n la IP LAN (Actualizar IP)", "error");
              return;
            }
            void copyInternoQrImage(url, showToast);
          })
        );
      }
      block.appendChild(btnRow);
      card.appendChild(block);
    }
  }
}

// public/js/features/lan/panel.mjs
var LAN_KNOWN_ROOMS_LS = "rpc-lan-known-rooms";
var LAN_HOST_CODE_HINT_SEEN_KEY = "rpc-lan-host-code-hint-seen";
var _lanPanelRenderGen = 0;
var _lanPanelRenderChain = Promise.resolve();
var _lanPanelDelegationWired = false;
var _lanScanTimer = null;
var LAN_SCAN_INTERVAL_MS = 5e3;
var _lanLastPingAt = null;
var _lanLastPingStatus = 0;
var LAN_DISCONNECT_BANNER_MSG = "Sin conexi\xF3n al host LAN. LiveSync (salas y relay) puede estar limitado hasta reconectar.";
var _lanLastConnected = true;
var panelRuntime = null;
function registerLanSyncPanelRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  panelRuntime = Object.assign(panelRuntime || {}, ctx);
}
function runtime3() {
  return panelRuntime || {
    showToast() {
    },
    isMobileWeb() {
      return false;
    },
    renderPatientList() {
    },
    closeSettingsDropdown() {
    },
    appendLanConflictDraftsSection: null
  };
}
function readLanKnownRooms() {
  try {
    var raw = localStorage.getItem(LAN_KNOWN_ROOMS_LS);
    var arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter(function(x) {
      return x && x.id;
    }) : [];
  } catch (_e) {
    return [];
  }
}
function writeLanKnownRooms(arr) {
  try {
    localStorage.setItem(LAN_KNOWN_ROOMS_LS, JSON.stringify(arr.slice(0, 12)));
  } catch (_e) {
  }
}
function forgetLanRoomSession(roomId) {
  var id = String(roomId || "").trim();
  if (!id) return;
  writeLanKnownRooms(readLanKnownRooms().filter(function(r) {
    return r.id !== id;
  }));
  try {
    if (String(localStorage.getItem("rpc-lan-last-room") || "").trim() === id) {
      localStorage.removeItem("rpc-lan-last-room");
    }
  } catch (_e) {
  }
}
function rememberLanRoomJoined(roomId, displayName) {
  var id = String(roomId || "").trim();
  if (!id) return;
  var label = String(displayName || "").trim() || id.slice(0, 14);
  var next = [{ id, label, joinedAt: Date.now() }];
  readLanKnownRooms().forEach(function(r) {
    if (r.id !== id) next.push(r);
  });
  writeLanKnownRooms(next);
}
var LAN_DISCONNECT_BANNER_MSG = "Sin conexi\xF3n al host LAN. LiveSync (salas y relay) puede estar limitado hasta reconectar.";
var _lanLastConnected = true;
function readLanHideDisconnectBanner() {
  return typeof storage.getLanHideDisconnectBanner === "function" && storage.getLanHideDisconnectBanner();
}
function updateLanConnectionBanner(connected) {
  _lanLastConnected = !!connected;
  var el = document.getElementById("lan-connection-banner");
  if (!el) return;
  var textEl = document.getElementById("lan-connection-banner-text");
  if (connected || readLanHideDisconnectBanner()) {
    el.hidden = true;
    return;
  }
  if (textEl) textEl.textContent = LAN_DISCONNECT_BANNER_MSG;
  el.hidden = false;
}
function syncLanDisconnectBannerPrefUi() {
  var cb = document.getElementById("lan-hide-disconnect-banner");
  if (cb) cb.checked = readLanHideDisconnectBanner();
}
function readLanLwwOverwriteToast() {
  return typeof storage.getLanLwwOverwriteToast === "function" && storage.getLanLwwOverwriteToast();
}
function syncLanLwwOverwriteToastPrefUi() {
  var cb = document.getElementById("settings-lan-lww-toast");
  if (cb) cb.checked = readLanLwwOverwriteToast();
}
function setLanLwwOverwriteToastFromUi(enabled) {
  if (typeof storage.setLanLwwOverwriteToast === "function") {
    storage.setLanLwwOverwriteToast(!!enabled);
  }
}
var _lanLwwToastPrefWired = false;
function wireLanLwwToastPref() {
  if (_lanLwwToastPrefWired) return;
  var cb = document.getElementById("settings-lan-lww-toast");
  if (!cb) return;
  _lanLwwToastPrefWired = true;
  cb.addEventListener("change", function() {
    setLanLwwOverwriteToastFromUi(cb.checked);
  });
}
function dismissLanDisconnectBanner() {
  if (typeof storage.saveLanHideDisconnectBanner === "function") {
    storage.saveLanHideDisconnectBanner(true);
  }
  updateLanConnectionBanner(_lanLastConnected);
  syncLanDisconnectBannerPrefUi();
}
function setLanHideDisconnectBannerFromUi(hide) {
  if (typeof storage.saveLanHideDisconnectBanner === "function") {
    storage.saveLanHideDisconnectBanner(!!hide);
  }
  updateLanConnectionBanner(_lanLastConnected);
}
lanClient.addEventListener("lan-status", function(ev) {
  updateLanConnectionBanner(!!(ev.detail && ev.detail.connected));
});
lanClient.addEventListener("lan-patch", function() {
  syncLiveSyncStatusChrome();
});
function patchLanPanelJoinButtons() {
  if (typeof document === "undefined") return;
  var root = document.getElementById("lan-connection-panel-root");
  if (!root) return;
  root.querySelectorAll('[data-lan-action="join-room"], [data-lan-action="join-known"]').forEach(function(btn) {
    var rid = btn.getAttribute("data-room-id") || "";
    var inRoom = String(activeLiveSyncRoomId || "") === String(rid);
    btn.textContent = inRoom ? "En sala" : "Unirse";
    btn.disabled = inRoom;
  });
}
function wireClinicalOpsLanSyncEvents() {
  if (typeof document === "undefined") return;
  if (!document._rpcClinicalOpsSyncedLanWired) {
    document._rpcClinicalOpsSyncedLanWired = true;
    document.addEventListener("rpc-clinical-ops-synced", function() {
      void refreshClinicalSessionTeams().then(function() {
        renderLanPanel2();
      });
    });
  }
  if (!document._rpcClinicalTeamsChangedLanWired) {
    document._rpcClinicalTeamsChangedLanWired = true;
    document.addEventListener("rpc-clinical-teams-changed", function() {
      void import("/js/chunks/push-CWU3G6AI.js").then(function(m) {
        if (typeof m.pushClinicalOpsLanNow === "function") return m.pushClinicalOpsLanNow();
      }).catch(function() {
      });
      scheduleLiveSyncPush();
    });
  }
}
var _lanPanelDelegationWired = false;
function wireLanPanelDelegation() {
  if (_lanPanelDelegationWired) return;
  if (typeof document === "undefined") return;
  var root = document.getElementById("lan-connection-panel-root");
  if (!root) return;
  _lanPanelDelegationWired = true;
  wireClinicalOpsLanSyncEvents();
  root.addEventListener("click", function(ev) {
    var btn = (
      /** @type {HTMLElement | null} */
      ev.target && ev.target.closest ? ev.target.closest("[data-lan-action]") : null
    );
    if (!btn || !root.contains(btn) || /** @type {HTMLButtonElement} */
    btn.disabled) return;
    var action = btn.getAttribute("data-lan-action") || "";
    if (!action) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (action === "join-room" || action === "join-known") {
      joinLanRoom(btn.getAttribute("data-room-id"), btn.getAttribute("data-room-label"));
    } else if (action === "forget-known") {
      forgetLanRoomSession(btn.getAttribute("data-room-id"));
      renderLanPanel2();
    } else if (action === "delete-room") {
      deleteLanRoom(btn.getAttribute("data-room-id"));
    } else if (action === "join-invite") {
      if (isLanElectronDesktop() && typeof storage.saveLanUiRole === "function") {
        storage.saveLanUiRole("client");
      }
      joinLanFromInviteUi();
    } else if (action === "host-activate") {
      saveLanSettingsFromUi({ copyInviteAfter: true });
    } else if (action === "mint-pairing") {
      void mintLanPairingFromUi();
    }
  });
}
function appendLanMobileJoinSection(root) {
  if (!root || !runtime3().isMobileWeb()) return;
  var card = document.createElement("div");
  card.className = "lan-connect-card lan-mobile-join-card";
  card.innerHTML = '<div class="lan-connect-card-title">Unirte a la guardia</div><p class="lan-connect-card-hint">Pega el <strong>enlace para iPad</strong> que gener\xF3 quien tiene R+ en la Mac (\u21C4 \u2192 Copiar enlace). Al abrirlo se conecta y bajan tus pacientes de la sala.</p>';
  var inputInvite = document.createElement("textarea");
  inputInvite.className = "profile-input";
  inputInvite.id = "lan-input-invite-link";
  inputInvite.rows = 2;
  inputInvite.autocomplete = "off";
  inputInvite.placeholder = "http://192.168.x.x:3738/join/req_\u2026";
  card.appendChild(inputInvite);
  var row = document.createElement("div");
  row.className = "lan-connect-actions-row";
  row.style.marginTop = "8px";
  var btnJoin = document.createElement("button");
  btnJoin.type = "button";
  btnJoin.className = "btn-lan-primary";
  btnJoin.style.flex = "1";
  btnJoin.textContent = "Conectar";
  btnJoin.setAttribute("data-lan-action", "join-invite");
  row.appendChild(btnJoin);
  card.appendChild(row);
  root.insertBefore(card, root.firstChild);
}
function lanPanelRenderStale(gen) {
  return gen !== _lanPanelRenderGen;
}
function renderLanPanel2() {
  _lanPanelRenderChain = _lanPanelRenderChain.catch(function() {
  }).then(function() {
    return renderLanPanelOnce();
  });
  return _lanPanelRenderChain;
}
function getClinicalSettings() {
  try {
    return JSON.parse(localStorage.getItem("rpc-settings") || "{}");
  } catch (_e) {
    return {};
  }
}
function getClinicalRank() {
  var s = getClinicalSettings();
  return String(s.clinicalRank || "").trim();
}
function getUserSala() {
  var s = getClinicalSettings();
  return String(s.clinicalSala || "").trim();
}
function isClinicalRegistered() {
  var s = getClinicalSettings();
  return s.clinicalRegistered === true;
}
function isLanHostActive() {
  return !!lanClient.connected;
}
function lanHostUrl() {
  return lanClient.baseUrl() || "";
}
function maybeAppendInternoQrPanel(root) {
  if (!isLanElectronDesktop() || !isLanHostActive()) return;
  if (!canManageInternoQr(clinicalSessionContext.user)) return;
  void resolveLanHostUrlAuto().then(function(hostBaseUrl) {
    void appendInternoQrPanel(root, {
      hostBaseUrl,
      userId: getClinicalUserUserId(),
      showToast: runtime3().showToast
    });
  });
}
function getClinicalUserUserId() {
  try {
    var user = typeof clinicalSessionContext !== "undefined" ? clinicalSessionContext.user : null;
    return user ? String(user.user_id || "") : "";
  } catch (_e) {
    return "";
  }
}
async function renderLanPanelOnce() {
  var gen = ++_lanPanelRenderGen;
  var root = document.getElementById("lan-connection-panel-root");
  if (!root) return;
  await ensureLanElectronHostReady();
  if (lanPanelRenderStale(gen)) return;
  root.innerHTML = "";
  var registered = isClinicalRegistered();
  var userSala = getUserSala();
  var rank = getClinicalRank();
  var clinicalUserId = getClinicalUserUserId();
  if (!registered && !clinicalUserId) {
    var unregCard = document.createElement("div");
    unregCard.className = "lan-connect-card";
    unregCard.innerHTML = '<p class="lan-connect-card-hint">Desbloquea la base de datos y completa <strong>Configura tu rotaci\xF3n</strong> para acceder a la red del hospital.</p>';
    root.appendChild(unregCard);
    return;
  }
  if (!registered && clinicalUserId) {
    var preRegCard = document.createElement("div");
    preRegCard.className = "lan-connect-card";
    preRegCard.innerHTML = '<p class="lan-connect-card-hint">Opcional: activa la red del turno y pulsa <strong>Unirse</strong> en tu sala para sincronizar con el equipo. Puedes registrar <strong>@usuario</strong> sin \u21C4 si no hay red.</p>';
    root.appendChild(preRegCard);
  }
  if (registered && !userSala && !hasElevatedTeamPrivileges(clinicalSessionContext.user)) {
    var noSalaCard = document.createElement("div");
    noSalaCard.className = "lan-connect-card";
    noSalaCard.innerHTML = '<p class="lan-connect-card-hint">No tienes una Sala asignada. Contacta a un R4 o Admin.</p>';
    root.appendChild(noSalaCard);
    return;
  }
  var isElevated = hasElevatedTeamPrivileges(clinicalSessionContext.user);
  var connected = isLanHostActive();
  appendLanHubStatusCard(root, {
    connected,
    isElectronDesktop: isLanElectronDesktop(),
    onBecomeHost: function() {
      void promoteThisMacToLanHost();
    }
  });
  if (runtime3().isMobileWeb() && !connected) {
    appendLanMobileJoinSection(root);
  }
  var salaDefs = [
    { id: "sala-1", label: "Sala 1", key: "Sala 1" },
    { id: "sala-2", label: "Sala 2", key: "Sala 2" },
    { id: "sala-e", label: "Sala E", key: "Sala E" }
  ];
  var visibleSalaDefs;
  if (isElevated) {
    visibleSalaDefs = salaDefs;
  } else if (userSala) {
    visibleSalaDefs = salaDefs.filter(function(d) {
      return d.key === userSala;
    });
    if (!visibleSalaDefs.length) visibleSalaDefs = salaDefs;
  } else if (!registered && clinicalUserId) {
    visibleSalaDefs = salaDefs;
  } else {
    visibleSalaDefs = [];
  }
  appendLanHubRoomsCard(root, {
    visibleSalaDefs,
    activeRoomId: activeLiveSyncRoomId
  });
  if (rank === "R1") {
    buildR1Section(root);
  } else if (rank === "R2") {
    buildR2Section(root);
  } else if (isElevated) {
    buildR4Section(root);
  }
  appendLanHostPinSection(root);
  var appendConflictDrafts = runtime3().appendLanConflictDraftsSection;
  if (typeof appendConflictDrafts === "function") {
    void appendConflictDrafts(root);
  }
  void appendLanSyncDiagnosticsSection(root);
  maybeAppendInternoQrPanel(root);
}
function appendLanHostPinSection(root) {
  if (!root || !isLanElectronDesktop() || isLanRemoteJoinMode()) return;
  var hostUrl = lanHostUrl();
  if (!hostUrl) return;
  var wrap = document.createElement("div");
  wrap.className = "lan-connect-card lan-host-pin-card";
  var label = document.createElement("label");
  label.className = "lan-host-pin-label";
  label.setAttribute("for", "lan-pin-host-checkbox");
  var cb = document.createElement("input");
  cb.type = "checkbox";
  cb.id = "lan-pin-host-checkbox";
  var pinned = getPinnedHostUrl();
  cb.checked = !!pinned && pinned === hostUrl.replace(/\/+$/, "");
  cb.onchange = function() {
    if (cb.checked) {
      setPinnedHostUrl(hostUrl);
      runtime3().showToast("Anfitri\xF3n fijado para el turno: " + hostUrl, "success");
    } else {
      clearPinnedHostUrl();
      runtime3().showToast("Anfitri\xF3n ya no est\xE1 fijado; la red puede sugerir otro servidor.", "info");
    }
    void renderLanPanel2();
  };
  label.appendChild(cb);
  label.appendChild(document.createTextNode(" Fijar anfitri\xF3n del turno"));
  wrap.appendChild(label);
  if (pinned && pinned !== hostUrl.replace(/\/+$/, "")) {
    var hint = document.createElement("p");
    hint.className = "lan-connect-card-hint";
    hint.style.marginTop = "6px";
    hint.textContent = "Fijado: " + pinned + " (distinto del servidor actual).";
    wrap.appendChild(hint);
  }
  root.appendChild(wrap);
}
async function buildLanSyncDiagnosticsDeps() {
  var roomId = String(activeLiveSyncRoomId || "").trim();
  var bases = roomId ? getHostBundleBases(roomId) : { revision: 0 };
  var outCount = 0;
  if (roomId) {
    try {
      outCount = await outboxSize(roomId);
    } catch (_e) {
    }
  }
  var aligned = false;
  try {
    aligned = !!await ensureLanClientTeamCodeAligned();
  } catch (_e2) {
  }
  return {
    hostUrl: lanHostUrl(),
    pingAt: _lanLastPingAt,
    pingStatus: _lanLastPingStatus,
    wsSync: !!lanClient.connected,
    wsLive: !!lanClient.liveConnected,
    liveRoomId: String(lanClient.liveRoomId || ""),
    roomId,
    phase: getRoomSyncPhase(roomId),
    bundleRevision: Number(bases.revision || 0),
    outboxCount: outCount,
    pinnedHost: getPinnedHostUrl(),
    teamCodeAligned: aligned
  };
}
async function appendLanSyncDiagnosticsSection(root) {
  if (!root) return;
  var deps2 = await buildLanSyncDiagnosticsDeps();
  var diag = getLanSyncDiagnostics(deps2);
  var existing = root.querySelector(".lan-sync-diagnostics-panel");
  if (existing) existing.remove();
  var details = document.createElement("details");
  details.className = "lan-connect-card lan-sync-diagnostics-panel";
  var sum = document.createElement("summary");
  sum.textContent = "Estado de sincronizaci\xF3n";
  sum.style.cursor = "pointer";
  sum.style.fontWeight = "600";
  details.appendChild(sum);
  var pre = document.createElement("pre");
  pre.className = "lan-sync-diagnostics-pre";
  pre.style.fontSize = "11px";
  pre.style.whiteSpace = "pre-wrap";
  pre.style.marginTop = "8px";
  pre.style.maxHeight = "200px";
  pre.style.overflow = "auto";
  pre.textContent = formatDiagnosticsReport(diag);
  details.appendChild(pre);
  var copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "btn-lan-secondary";
  copyBtn.style.marginTop = "8px";
  copyBtn.style.width = "100%";
  copyBtn.textContent = "Copiar informe";
  copyBtn.onclick = function() {
    var report = formatDiagnosticsReport(getLanSyncDiagnostics(deps2));
    void copyToClipboardSafe(report).then(function(ok) {
      runtime3().showToast(
        ok ? "Informe copiado (c\xF3digos redactados)." : "No se pudo copiar el informe.",
        ok ? "success" : "error"
      );
    });
  };
  details.appendChild(copyBtn);
  var retryBtn = document.createElement("button");
  retryBtn.type = "button";
  retryBtn.className = "btn-lan-secondary";
  retryBtn.style.marginTop = "6px";
  retryBtn.style.width = "100%";
  retryBtn.textContent = "Reintentar cola de sincronizaci\xF3n";
  retryBtn.onclick = function() {
    var rid = String(activeLiveSyncRoomId || "").trim() || String(getRoomMembership() && getRoomMembership().roomId || "").trim();
    if (!rid) {
      runtime3().showToast("No hay sala activa para reintentar.", "warn");
      return;
    }
    void flushLiveSyncOutbox(rid).then(function() {
      runtime3().showToast("Cola reintentada. Revisa el informe abajo.", "info");
      void renderLanPanel2();
    });
  };
  details.appendChild(retryBtn);
  root.appendChild(details);
}
function buildR1Section(root) {
  var userSala = getUserSala();
  var card = document.createElement("div");
  card.className = "lan-connect-card lan-hub-team-card";
  card.innerHTML = '<div class="lan-connect-card-title">Mi equipo</div>';
  var user = clinicalSessionContext.user || {};
  var joined = filterJoinedTeams(clinicalSessionContext.teams || [], user);
  var myTeam = joined[0] || null;
  if (myTeam) {
    var teamName = document.createElement("p");
    teamName.className = "lan-hub-team-name";
    teamName.textContent = "Mi equipo: " + (myTeam.name || "Sin nombre");
    card.appendChild(teamName);
  } else {
    var noTeam = document.createElement("p");
    noTeam.className = "lan-connect-card-hint";
    noTeam.innerHTML = 'Sin equipo \u2014 <button type="button" class="lan-hub-link-btn" id="lan-hub-join-team">Unirse a un equipo</button>';
    card.appendChild(noTeam);
  }
  root.appendChild(card);
  var joinTeamBtn = card.querySelector("#lan-hub-join-team");
  if (joinTeamBtn) {
    joinTeamBtn.onclick = function() {
      var availCard = document.getElementById("lan-hub-available-teams");
      if (availCard) {
        availCard.remove();
        return;
      }
      var avail = document.createElement("div");
      avail.id = "lan-hub-available-teams";
      avail.className = "lan-connect-card";
      avail.innerHTML = '<div class="lan-connect-card-title">Equipos disponibles</div>';
      buildAvailableTeamsSection(avail, userSala);
      card.parentNode.insertBefore(avail, card.nextSibling);
    };
  }
  appendLanHubGuardiaModeCard(root);
  if (isLanElectronDesktop() && isLanHostActive()) {
    var mobileCard = document.createElement("div");
    mobileCard.className = "lan-connect-card lan-hub-mobile-card";
    mobileCard.innerHTML = '<div class="lan-connect-card-title">Enlace m\xF3vil</div>';
    var mobileBtn = document.createElement("button");
    mobileBtn.type = "button";
    mobileBtn.className = "btn-lan-primary";
    mobileBtn.style.width = "100%";
    mobileBtn.textContent = "Copiar enlace para iPad";
    mobileBtn.onclick = function() {
      void generateMobilePairingLink().then(function(url) {
        if (url) {
          copyToClipboardSafe(url);
          runtime3().showToast("Enlace m\xF3vil copiado. P\xE9galo en Safari en el iPad.", "success");
        }
      });
    };
    mobileCard.appendChild(mobileBtn);
    root.appendChild(mobileCard);
  }
}
function buildR2Section(root) {
  buildR1Section(root);
  var user = clinicalSessionContext.user || {};
  var myTeam = filterJoinedTeams(clinicalSessionContext.teams || [], user)[0] || null;
  if (!myTeam) return;
  var entregaCard = document.createElement("div");
  entregaCard.className = "lan-connect-card lan-hub-entrega-card";
  entregaCard.innerHTML = '<div class="lan-connect-card-title">Solicitar entrega</div>';
  var guardiasForTeam = (clinicalSessionContext.guardias || []).filter(function(g2) {
    return g2 && String(g2.source_team_id) === String(myTeam.team_id);
  });
  if (!guardiasForTeam.length) {
    var emptyHint = document.createElement("p");
    emptyHint.className = "lan-connect-card-hint";
    emptyHint.textContent = "No hay pacientes entregados por tu equipo.";
    entregaCard.appendChild(emptyHint);
  } else {
    var entregaList = document.createElement("ul");
    entregaList.style.listStyle = "none";
    entregaList.style.padding = "0";
    entregaList.style.margin = "0";
    guardiasForTeam.forEach(function(g2) {
      var li = document.createElement("li");
      li.style.marginBottom = "6px";
      li.style.fontSize = "12px";
      li.textContent = "Paciente " + String(g2.patient_id || "").slice(0, 8) + "\u2026 \u2014 " + (g2.covering_user_id || "");
      entregaList.appendChild(li);
    });
    entregaCard.appendChild(entregaList);
  }
  root.appendChild(entregaCard);
}
async function openR4TeamCreationModal() {
  try {
    var mod = await import("/js/chunks/clinical-teams-X4GVPBCN.js");
    if (typeof mod.openClinicalTeamsPanel === "function") {
      mod.openClinicalTeamsPanel();
    } else {
      runtime3().showToast("Panel de equipos no disponible.", "error");
    }
  } catch (_e) {
    runtime3().showToast("Panel de equipos no disponible.", "error");
  }
}
async function handleFinalizarRotacion() {
  var api3 = typeof window !== "undefined" ? window.rplusDb || window.electronAPI : null;
  if (!api3 || typeof api3.dbRotationNueva !== "function") {
    runtime3().showToast("Operaci\xF3n no disponible.", "error");
    return;
  }
  var user = typeof clinicalSessionContext !== "undefined" ? clinicalSessionContext.user : null;
  var userId = user ? String(user.user_id || "") : "";
  var res = await api3.dbRotationNueva({ userId });
  if (res && res.ok) {
    runtime3().showToast("Rotaci\xF3n finalizada. Crea nuevos equipos para el siguiente mes.", "success");
    document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
    renderLanPanel2();
  } else {
    runtime3().showToast(res && res.error || "No se pudo finalizar la rotaci\xF3n.", "error");
  }
}
function buildR4Section(root) {
  var teamCard = document.createElement("div");
  teamCard.className = "lan-connect-card lan-hub-team-create-card";
  teamCard.innerHTML = '<div class="lan-connect-card-title">Crear equipos del mes</div>';
  var btnCreate = document.createElement("button");
  btnCreate.type = "button";
  btnCreate.className = "btn-lan-primary";
  btnCreate.style.width = "100%";
  btnCreate.textContent = "Crear equipos del mes";
  btnCreate.onclick = function() {
    openR4TeamCreationModal();
  };
  teamCard.appendChild(btnCreate);
  root.appendChild(teamCard);
  var censusCard = document.createElement("div");
  censusCard.className = "lan-connect-card lan-hub-census-card";
  censusCard.innerHTML = '<div class="lan-connect-card-title">Censo global</div>';
  var teams = clinicalSessionContext.teams || [];
  var allPatients = patients || [];
  var salas = ["Sala 1", "Sala 2", "Sala E"];
  salas.forEach(function(salaName) {
    var salaTeams = teams.filter(function(t2) {
      return teamSalaKey(t2) === salaName;
    });
    var salaPatientCount = allPatients.filter(function(p) {
      return p && String(p.sala || "") === salaName;
    }).length;
    var row = document.createElement("p");
    row.className = "lan-connect-card-hint";
    row.style.marginBottom = "4px";
    row.textContent = salaName + ": " + salaTeams.length + " equipos \xB7 " + salaPatientCount + " pacientes";
    censusCard.appendChild(row);
  });
  var viewBtn = document.createElement("button");
  viewBtn.type = "button";
  viewBtn.className = "btn-lan-secondary";
  viewBtn.style.width = "100%";
  viewBtn.style.marginTop = "8px";
  viewBtn.textContent = "Ver censo en lista de pacientes";
  viewBtn.onclick = function() {
    try {
      localStorage.setItem("clinical.browseSala", "__all__");
      localStorage.setItem("clinical.censusFilterSala", "__all__");
    } catch (_e) {
    }
    document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
    if (typeof runtime3().renderPatientList === "function") runtime3().renderPatientList();
    runtime3().showToast("Censo global \u2014 usa los filtros en la lista de pacientes.", "info");
  };
  censusCard.appendChild(viewBtn);
  root.appendChild(censusCard);
  if (isLanElectronDesktop() && isLanHostActive()) {
    var mobileCard = document.createElement("div");
    mobileCard.className = "lan-connect-card lan-hub-mobile-card";
    mobileCard.innerHTML = '<div class="lan-connect-card-title">Enlace m\xF3vil</div>';
    var mobileBtn = document.createElement("button");
    mobileBtn.type = "button";
    mobileBtn.className = "btn-lan-primary";
    mobileBtn.style.width = "100%";
    mobileBtn.textContent = "Copiar enlace para iPad";
    mobileBtn.onclick = function() {
      void generateMobilePairingLink().then(function(url) {
        if (url) {
          copyToClipboardSafe(url);
          runtime3().showToast("Enlace m\xF3vil copiado. P\xE9galo en Safari en el iPad.", "success");
        }
      });
    };
    mobileCard.appendChild(mobileBtn);
    root.appendChild(mobileCard);
  }
  var rotCard = document.createElement("div");
  rotCard.className = "lan-connect-card lan-hub-rotation-card";
  rotCard.innerHTML = '<div class="lan-connect-card-title">Rotaci\xF3n</div>';
  var btnFinalizar = document.createElement("button");
  btnFinalizar.type = "button";
  btnFinalizar.className = "btn-lan-secondary";
  btnFinalizar.style.width = "100%";
  btnFinalizar.style.color = "var(--danger)";
  btnFinalizar.textContent = "Finalizar rotaci\xF3n (archivar equipos)";
  btnFinalizar.onclick = function() {
    void handleFinalizarRotacion();
  };
  rotCard.appendChild(btnFinalizar);
  root.appendChild(rotCard);
}
function teamSalaKey(team) {
  return String(team && team.sala || "").trim();
}
function buildAvailableTeamsSection(root, userSala) {
  var teams = clinicalSessionContext.teams || [];
  var user = clinicalSessionContext.user || {};
  var salaKey = String(userSala || "").trim();
  var alreadyInIds = filterJoinedTeams(teams, user).map(function(t2) {
    return String(t2.team_id);
  });
  var available = teams.filter(function(t2) {
    return teamSalaKey(t2) === salaKey && !t2.archived_at && alreadyInIds.indexOf(String(t2.team_id)) === -1;
  });
  if (!available.length) {
    var empty = document.createElement("p");
    empty.className = "lan-connect-card-hint";
    empty.textContent = "No hay equipos disponibles en tu Sala.";
    root.appendChild(empty);
    return;
  }
  var list = document.createElement("ul");
  list.style.listStyle = "none";
  list.style.padding = "0";
  list.style.margin = "0";
  available.forEach(function(t2) {
    var li = document.createElement("li");
    li.style.display = "flex";
    li.style.gap = "8px";
    li.style.alignItems = "center";
    li.style.marginBottom = "6px";
    var info = document.createElement("span");
    info.style.flex = "1";
    info.style.fontSize = "12px";
    var cycle = t2.sub_area_fraction ? String(t2.sub_area_fraction) : "";
    info.textContent = (t2.name || "Equipo") + " \xB7 " + (t2.service || "") + (cycle ? " \xB7 ciclo " + cycle : "");
    var joinBtn = document.createElement("button");
    joinBtn.type = "button";
    joinBtn.className = "btn-lan-secondary";
    joinBtn.style.flex = "0 0 auto";
    joinBtn.textContent = "Unirse";
    joinBtn.onclick = function() {
      void joinClinicalTeam(String(t2.team_id));
    };
    li.appendChild(info);
    li.appendChild(joinBtn);
    list.appendChild(li);
  });
  root.appendChild(list);
}
async function joinClinicalTeam(teamId) {
  var api3 = typeof window !== "undefined" ? window.rplusDb || window.electronAPI : null;
  if (!api3 || typeof api3.dbClinicalTeamsMemberAdd !== "function") {
    runtime3().showToast("Base de datos no disponible.", "error");
    return;
  }
  var userId = getClinicalUserUserId();
  if (!userId) {
    runtime3().showToast("No hay sesi\xF3n cl\xEDnica activa.", "error");
    return;
  }
  var addRes = await api3.dbClinicalTeamsMemberAdd({ teamId, userId });
  if (!addRes || addRes.ok === false) {
    runtime3().showToast(addRes?.error || "No se pudo unir al equipo.", "error");
    return;
  }
  var rank = getClinicalRank();
  if (rank === "R2" && api3 && typeof api3.dbClinicalTeamsPromoteLeader === "function") {
    var promoteRes = await api3.dbClinicalTeamsPromoteLeader({ teamId, userId });
    if (!promoteRes || promoteRes.ok === false) {
      runtime3().showToast("Unido al equipo pero no se pudo asignar como l\xEDder.", "warn");
    }
  }
  runtime3().showToast("Unido al equipo.", "success");
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
  await refreshClinicalSessionTeams();
  renderLanPanel2();
}
async function refreshClinicalSessionTeams() {
  var api3 = typeof window !== "undefined" ? window.rplusDb || window.electronAPI : null;
  if (!api3) return;
  if (typeof api3.dbClinicalScopeContext === "function") {
    var userId = getClinicalUserUserId();
    var res = await api3.dbClinicalScopeContext({ userId });
    if (res && res.ok && Array.isArray(res.context?.teams)) {
      clinicalSessionContext.teams = res.context.teams;
      if (res.context && typeof res.context === "object") {
        clinicalSessionContext.scopeContext = res.context;
      }
      return;
    }
  }
  if (typeof api3.dbClinicalTeamsList === "function") {
    var listRes = await api3.dbClinicalTeamsList();
    if (listRes && listRes.ok && Array.isArray(listRes.teams)) {
      clinicalSessionContext.teams = listRes.teams;
    }
  }
}
function resolveMobilePairingRoomId() {
  var rid = String(activeLiveSyncRoomId || "").trim();
  if (rid) return rid;
  var mem = getRoomMembership();
  if (mem && mem.roomId) return String(mem.roomId).trim();
  try {
    var s = JSON.parse(localStorage.getItem("rpc-settings") || "{}");
    return resolveLiveSyncRoomIdFromSala(s.clinicalSala);
  } catch (_e) {
    return "";
  }
}
function appendMobileLanJoinHintParams(url) {
  var s = {};
  try {
    s = JSON.parse(localStorage.getItem("rpc-settings") || "{}");
  } catch (_e) {
  }
  try {
    var u = new URL(url);
    if (s.clinicalDisplayName) u.searchParams.set("name", s.clinicalDisplayName);
    if (s.clinicalRank) u.searchParams.set("rank", s.clinicalRank);
    if (s.clinicalSala) u.searchParams.set("sala", s.clinicalSala);
    var roomId = resolveMobilePairingRoomId();
    if (roomId) u.searchParams.set("room", roomId);
    return u.toString();
  } catch (_eUrl) {
    return url;
  }
}
function classifyAutoJoinSource() {
  if (typeof location !== "undefined") {
    var parsedUrl = parseLanJoinQuery(location.search, location.origin);
    if (String(parsedUrl.roomId || "").trim()) return "url";
  }
  var mem = getRoomMembership();
  if (mem && mem.roomId) return "membership";
  try {
    var s = JSON.parse(localStorage.getItem("rpc-settings") || "{}");
    if (resolveLiveSyncRoomIdFromSala(s.clinicalSala)) return "settings_sala";
  } catch (_e) {
    return "none";
  }
  return "none";
}
function resolveAutoJoinRoomId(explicitRoomId) {
  var rid = String(explicitRoomId || "").trim();
  if (rid) return rid;
  if (typeof location !== "undefined") {
    var parsed = parseLanJoinQuery(location.search, location.origin);
    rid = String(parsed.roomId || "").trim();
    if (rid) return rid;
  }
  var mem = getRoomMembership();
  if (mem && mem.roomId) return String(mem.roomId).trim();
  try {
    var s = JSON.parse(localStorage.getItem("rpc-settings") || "{}");
    return resolveLiveSyncRoomIdFromSala(s.clinicalSala);
  } catch (_e) {
    return "";
  }
}
function lanAutoJoinConfirmedSessionKey(roomId) {
  return "rpc-lan-auto-join-confirmed-" + String(roomId || "").trim();
}
function hasLanAutoJoinConfirmed(roomId) {
  try {
    return sessionStorage.getItem(lanAutoJoinConfirmedSessionKey(roomId)) === "1";
  } catch (_e) {
    return false;
  }
}
function setLanAutoJoinConfirmed(roomId) {
  try {
    sessionStorage.setItem(lanAutoJoinConfirmedSessionKey(roomId), "1");
  } catch (_e) {
  }
}
async function generateMobilePairingLink() {
  var hostUrl = await resolveLanShareBaseUrl();
  if (!hostUrl) {
    runtime3().showToast(
      "No detectamos la IP de esta Mac en la red. Revisa Wi\u2011Fi y vuelve a copiar el enlace.",
      "error"
    );
    return "";
  }
  try {
    var share = await ensureLanPairingForShare({ forceNew: true });
    return appendMobileLanJoinHintParams(
      buildShareJoinUrl(share.hostUrl, share.pairing.ticketId)
    );
  } catch (_ticket) {
  }
  if (!hostUrl || isLocalLoopbackLanUrl(hostUrl)) return "";
  var teamCode = getLanTeamCodeFromConfig();
  if (!teamCode) return "";
  var params = new URLSearchParams();
  params.set("host", hostUrl.replace(/\/+$/, ""));
  params.set("code", teamCode);
  var roomId = resolveMobilePairingRoomId();
  if (roomId) params.set("room", roomId);
  return appendMobileLanJoinHintParams(hostUrl + "/?" + params.toString());
}
function startLanAutoDiscovery() {
  if (_lanScanTimer) return;
  _lanScanTimer = setInterval(function() {
    void scanLanHosts();
  }, LAN_SCAN_INTERVAL_MS);
  void scanLanHosts();
}
async function scanLanHosts() {
  if (!isLanElectronDesktop()) return;
  if (isLanRemoteJoinMode()) return;
  var teamCode = getLanTeamCodeFromConfig();
  if (!teamCode) return;
  try {
    var clientId = typeof getLanClientId === "function" ? getLanClientId() : "";
    var peers = typeof listLivePeerHostUrls === "function" ? listLivePeerHostUrls(clientId) : [];
    var currentRank = getClinicalRank();
    for (var i = 0; i < peers.length; i += 1) {
      var peerUrl = peers[i];
      if (!peerUrl) continue;
      var alive = typeof pingLanHostUrl === "function" ? await pingLanHostUrl(peerUrl, teamCode) : false;
      if (!alive) continue;
      try {
        var resp = await fetch(peerUrl + "/api/lan/v1/host-rank", {
          headers: { "Authorization": "Bearer " + teamCode },
          signal: AbortSignal.timeout(3e3)
        });
        if (resp.ok) {
          var data = await resp.json();
          var peerRank = String(data.rank || "").trim();
          if (shouldSupersede(peerRank, currentRank)) {
            if (isLanElectronDesktop() && typeof maybeApplyLanHostUrlSwitch === "function") {
              var pinnedScan = getPinnedHostUrl();
              if (pinnedScan) {
                runtime3().showToast(
                  "Anfitri\xF3n fijado: " + pinnedScan + ". No se cambi\xF3 a " + peerUrl + " (" + peerRank + ").",
                  "info"
                );
                continue;
              }
              var supersedeMsg = "Un host de mayor rango (" + peerRank + ") est\xE1 en " + peerUrl + ". \xBFConectar como cliente?";
              if (maybeApplyLanHostUrlSwitch(peerUrl, teamCode, {
                skipRememberPrimary: true,
                requireConfirm: true,
                confirmMessage: supersedeMsg
              })) {
                runtime3().showToast("Conectado al anfitri\xF3n de mayor rango (" + peerRank + ").", "info");
                renderLanPanel2();
                return;
              }
            }
          }
        }
      } catch (_peerErr) {
      }
    }
  } catch (_scanErr) {
  }
}
function shouldSupersede(peerRank, myRank) {
  var priority = { Admin: 5, R4: 4, R3: 3, R2: 2, R1: 1 };
  return (priority[peerRank] || 0) > (priority[myRank] || 0);
}
async function saveLanHostTeamCodeFromUi() {
  if (!window.electronAPI || typeof window.electronAPI.writeLanHostTeamCode !== "function") {
    runtime3().showToast("Solo disponible en la app Electron", "error");
    return;
  }
  var input = document.getElementById("settings-lan-host-team-code-input");
  var plain = input && input.value;
  var res;
  try {
    res = await window.electronAPI.writeLanHostTeamCode(plain);
  } catch (e) {
    runtime3().showToast(e && e.message ? e.message : "Error al guardar", "error");
    return;
  }
  if (res && res.ok) {
    var plainTrim = String(plain || "").trim();
    if (!plainTrim) {
      runtime3().showToast("Escribe un token de al menos 32 caracteres.", "error");
      return;
    }
    var cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
    var hostUrl = String(cfg.hostUrl || "").trim().replace(/\/+$/, "");
    if (hostUrl && plainTrim) {
      storage.saveLanConfig({ hostUrl, teamCode: plainTrim });
      lanClient.configure({ hostUrl, teamCode: plainTrim });
      try {
        lanClient.disconnect();
        lanClient.connectSyncChannel();
      } catch (_e) {
      }
    }
    runtime3().showToast("Guardado. Reinicia R+ para que el proceso del servidor relea el archivo.", "success");
  } else {
    runtime3().showToast(res && res.error ? res.error : "Error al guardar", "error");
  }
}
async function resetLanSquadHostStateFromUi() {
  if (!window.electronAPI || typeof window.electronAPI.resetLanSquadHostState !== "function") {
    runtime3().showToast("Solo disponible en la app de escritorio.", "error");
    return;
  }
  if (!confirm(
    "Se borrar\xE1 el archivo lan-squad-host-state.json en esta computadora (salas, pacientes del host LAN y la cach\xE9 clinicalOps del bundle). Los equipos, directorio y guardias en la base cl\xEDnica SQLCipher no se borran. \xBFSeguir?"
  )) {
    return;
  }
  var res;
  try {
    res = await window.electronAPI.resetLanSquadHostState();
  } catch (e) {
    runtime3().showToast(e && e.message ? e.message : "Error al restablecer", "error");
    return;
  }
  if (res && res.ok) {
    var synced = await syncLanSavedTeamCodeWithEffectiveHostCode();
    runtime3().showToast(
      synced ? "Estado LAN del host borrado. El \xABC\xF3digo del equipo\xBB guardado en esta R+ qued\xF3 alineado con archivo / variable de entorno / valor por defecto del servidor." : "Estado LAN del host borrado. Si sigues con error 401, escribe en \xABC\xF3digo del equipo\xBB el mismo texto que el servidor (o reinicia R+ tras cambiar el archivo).",
      "success"
    );
    renderLanPanel2();
  } else {
    runtime3().showToast(res && res.error ? res.error : "No se pudo borrar el archivo.", "error");
  }
}
async function copyLanInviteLinkFromUi(opts) {
  opts = opts || {};
  var silent = !!opts.silent;
  var share;
  try {
    share = await ensureLanPairingForShare({ forceNew: true });
  } catch (e) {
    if (!silent) {
      if (e && e.code === "no_host_url") {
        runtime3().showToast(
          "Falta la direcci\xF3n del servidor (o no pudimos detectar la IP en esta computadora).",
          "error"
        );
      } else {
        runtime3().showToast("Genera primero un enlace / PIN o revisa el token del anfitri\xF3n.", "error");
      }
    }
    return false;
  }
  var link = buildShareJoinUrl(share.hostUrl, share.pairing.ticketId);
  var copied = await copyToClipboardSafe(link);
  if (copied) {
    var root = document.getElementById("lan-connection-panel-root");
    updateLanPairingDisplay(root);
    if (!silent) {
      var pinHint = share.pairing.pin ? " PIN: " + share.pairing.pin + "." : "";
      var inviteExpiry = formatLanTicketExpiryLabel(share.pairing.expiresAt);
      runtime3().showToast(
        "Enlace de invitaci\xF3n copiado." + pinHint + (inviteExpiry ? " V\xE1lido hasta " + inviteExpiry + "." : ""),
        "success"
      );
    }
    return true;
  }
  if (!silent) runtime3().showToast("No se pudo copiar al portapapeles.", "error");
  return false;
}
function joinLanFromInviteUi() {
  var input = document.getElementById("lan-input-invite-link");
  var raw = String(input && input.value ? input.value : "").trim();
  if (!raw) {
    runtime3().showToast("Pega el enlace de invitaci\xF3n que te envi\xF3 el anfitri\xF3n.", "error");
    return;
  }
  var parsed = parseLanInviteInput(raw);
  if (parsed.legacyInvite) {
    runtime3().showToast(
      "Este enlace ya no es v\xE1lido. Pide al anfitri\xF3n un nuevo enlace o PIN.",
      "error"
    );
    return;
  }
  var ticketId = String(parsed.ticketId || "").trim();
  if (ticketId) {
    var hostUrl = String(parsed.hostUrl || "").trim().replace(/\/+$/, "");
    if (!hostUrl) {
      var cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
      hostUrl = String(cfg.hostUrl || "").trim().replace(/\/+$/, "");
    }
    if (!hostUrl) {
      runtime3().showToast(
        "Pega el enlace completo (http://\u2026/join/req_\u2026) con la direcci\xF3n del anfitri\xF3n.",
        "error"
      );
      return;
    }
    void exchangeLanJoinFromInvite(hostUrl, ticketId, parsed.roomId);
    return;
  }
  runtime3().showToast(
    "No reconocimos un enlace v\xE1lido. Pide al anfitri\xF3n un enlace /join/req_\u2026 o el PIN actual.",
    "error"
  );
}
async function saveLanSettingsFromUi(opts) {
  opts = opts || {};
  var copyInviteAfter = !!opts.copyInviteAfter;
  var uiRole = typeof storage.getLanUiRole === "function" ? storage.getLanUiRole() : "client";
  var hostInput = document.getElementById("lan-input-host-url");
  if (hostInput && !String(hostInput.value || "").trim()) {
    var autoHost = await resolveLanHostUrlForShare();
    if (autoHost) hostInput.value = autoHost;
  }
  var hostUrl = String(hostInput && hostInput.value ? hostInput.value : "").trim().replace(/\/+$/, "");
  var teamCode = "";
  if (uiRole === "host") {
    teamCode = String(await resolveHostBearerToken()).trim();
  } else {
    teamCode = String(await resolveLanTeamCodeForShare()).trim();
  }
  if (!hostUrl || !teamCode) {
    runtime3().showToast(
      !hostUrl ? uiRole === "host" ? "No pudimos detectar la IP. Escribe la direcci\xF3n http://\u2026 que ver\xE1n las otras R+." : "Escribe la direcci\xF3n del servidor que te dio el anfitri\xF3n." : uiRole === "host" ? "No hay token seguro del servidor en esta Mac. Reinicia R+ como anfitri\xF3n." : "\xDAnete con el enlace o PIN que te dio quien abri\xF3 la sala.",
      "error"
    );
    return;
  }
  var cfg = { hostUrl: hostUrl.replace(/\/+$/, ""), teamCode };
  storage.saveLanConfig(cfg);
  lanClient.configure(cfg);
  lanClient.disconnect();
  try {
    lanClient.connectSyncChannel();
  } catch (_e) {
  }
  var pingOk = false;
  var pingStatus = 0;
  try {
    var r = await lanClient.fetch("/api/lan/v1/ping");
    pingStatus = r && r.status ? r.status : 0;
    pingOk = !!(r && r.ok);
    _lanLastPingAt = (/* @__PURE__ */ new Date()).toISOString();
    _lanLastPingStatus = pingStatus;
  } catch (pingErr) {
    _lanLastPingAt = (/* @__PURE__ */ new Date()).toISOString();
    _lanLastPingStatus = 0;
    recordLanSyncError({
      op: "ping",
      code: "NETWORK",
      message: pingErr && pingErr.message ? pingErr.message : "ping failed"
    });
  }
  var copiedOk = false;
  if (copyInviteAfter && pingStatus !== 401) {
    copiedOk = await copyLanInviteLinkFromUi({ silent: true });
  }
  if (pingStatus === 401) {
    recordLanSyncError({ op: "ping", code: "401", message: "team code rejected" });
  }
  if (pingOk) {
    var autoRoomId = resolveAutoJoinRoomId("");
    if (autoRoomId) {
      var joinSource = classifyAutoJoinSource();
      var needsConfirm = joinSource === "settings_sala" && !hasLanAutoJoinConfirmed(autoRoomId);
      if (needsConfirm) {
        var salaLabel = liveSyncRoomLabel(autoRoomId);
        if (typeof confirm !== "function" || !confirm("\xBFUnirte a " + salaLabel + "?")) {
          renderLanPanel2();
          return;
        }
        setLanAutoJoinConfirmed(autoRoomId);
      }
      joinLanRoom(autoRoomId, liveSyncRoomLabel(autoRoomId));
    }
    void import("/js/chunks/historia-clinica-lan-sync-5EJLNX2X.js").then(function(m) {
      return m.scheduleFlushAllPendingHistoriaClinicaLanSync();
    });
    void maybeShowLanMigrationNotice();
    if (copyInviteAfter) {
      runtime3().showToast(
        copiedOk ? "Anfitri\xF3n listo. La invitaci\xF3n ya est\xE1 en el portapapeles; comp\xE1rtela por WhatsApp o correo." : "Anfitri\xF3n listo, pero no se pudo copiar solo. Pulsa \xABGenerar enlace / PIN\xBB o \xABCopiar enlace de invitaci\xF3n\xBB.",
        copiedOk ? "success" : "error"
      );
    } else {
      runtime3().showToast("Listo: ya iniciaste sesi\xF3n en la sala del equipo.", "success");
    }
  } else if (pingStatus === 401) {
    runtime3().showToast("El c\xF3digo no coincide con el del servidor. Pide el c\xF3digo correcto a quien tiene la computadora anfitriona.", "error");
  } else {
    if (copyInviteAfter && copiedOk) {
      runtime3().showToast(
        "Invitaci\xF3n copiada al portapapeles. Aun as\xED no hubo respuesta del servidor: revisa el Wi\u2011Fi o que R+ siga abierto en el anfitri\xF3n.",
        "error"
      );
    } else {
      runtime3().showToast(
        "Guardamos los datos, pero no hubo respuesta del servidor. Revisa la direcci\xF3n y que ambas computadoras est\xE9n en el mismo Wi\u2011Fi.",
        "error"
      );
    }
  }
  renderLanPanel2();
}
async function createLanRoomFromUi() {
  if (!isLanSessionConfiguredForRest()) {
    runtime3().showToast("Falta la direcci\xF3n LAN. Configura la conexi\xF3n en \u21C4 y vuelve a intentar.", "error");
    return;
  }
  await ensureLanClientTeamCodeAligned();
  var input = document.getElementById("lan-input-room-name");
  var displayName = String(input && input.value ? input.value : "").trim();
  if (!displayName) {
    runtime3().showToast("Escribe un nombre de sala", "error");
    return;
  }
  var resp;
  try {
    resp = await lanFetchAuthed("/api/lan/v1/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName })
    });
  } catch (_e) {
    runtime3().showToast("No se pudo crear la sala", "error");
    return;
  }
  if (!resp.ok) {
    if (resp.status === 401) {
      runtime3().showToast(
        "El c\xF3digo del equipo no coincide con el servidor. Igual\xE1lo al conectar y en lan-team-code.txt; reinicia R+ en el anfitri\xF3n si cambiaste el archivo.",
        "error"
      );
    } else {
      runtime3().showToast("No se pudo crear la sala", "error");
    }
    return;
  }
  var created;
  try {
    created = await resp.json();
  } catch (_eJson) {
    created = null;
  }
  var newRoom = created && created.room;
  if (newRoom && newRoom.id) {
    joinLanRoom(newRoom.id, newRoom.displayName || displayName);
  }
  if (input) input.value = "";
  runtime3().showToast(
    newRoom && newRoom.id ? "Sala creada y conectada" : "Sala creada \u2014 pulsa Unirse",
    "success"
  );
  renderLanPanel2();
}
async function deleteLanRoom(roomId) {
  if (!isLanSessionConfiguredForRest()) {
    runtime3().showToast("Falta configuraci\xF3n LAN para eliminar salas.", "error");
    return;
  }
  await ensureLanClientTeamCodeAligned();
  var id = String(roomId || "").trim();
  if (!id) return;
  if (activeLiveSyncRoomId === id) {
    leaveLiveSyncRoom({ silentLeave: true });
  }
  var resp;
  try {
    resp = await lanFetchAuthed("/api/lan/v1/rooms/" + encodeURIComponent(id), { method: "DELETE" });
  } catch (_e) {
    runtime3().showToast("No se pudo eliminar la sala", "error");
    return;
  }
  if (!resp.ok) {
    if (resp.status === 401) {
      runtime3().showToast("El c\xF3digo del equipo no coincide con el servidor; no se pudo eliminar la sala.", "error");
    } else {
      runtime3().showToast("No se pudo eliminar la sala", "error");
    }
    return;
  }
  runtime3().showToast("Sala eliminada", "success");
  renderLanPanel2();
}
function syncLanHostFirstTimeHintUi() {
  var hint = document.getElementById("lan-host-first-time-hint");
  if (hint) hint.style.display = "none";
}
function dismissLanHostFirstTimeHint() {
  try {
    localStorage.setItem(LAN_HOST_CODE_HINT_SEEN_KEY, "1");
  } catch (_e) {
  }
  syncLanHostFirstTimeHintUi();
}
function syncSettingsLanHostDiskSection() {
  var acc = document.getElementById("settings-accordion-lan-host-disk");
  if (!acc) return;
  var desktop = isLanElectronDesktop();
  acc.style.display = desktop && !isLanRemoteJoinMode() ? "" : "none";
  if (desktop && !isLanRemoteJoinMode()) {
    syncLanHostTeamCodeSettingsInput();
    syncLanHostFirstTimeHintUi();
    if (!acc.dataset.lanHostToggleBound) {
      acc.dataset.lanHostToggleBound = "1";
      acc.addEventListener("toggle", function() {
        if (acc.open) {
          syncLanHostTeamCodeSettingsInput();
          syncLanHostFirstTimeHintUi();
        }
      });
    }
  }
}
async function syncLanHostTeamCodeSettingsInput() {
  var input = document.getElementById("settings-lan-host-team-code-input");
  if (!input) return;
  var code = await resolveHostBearerToken();
  if (!String(input.value || "").trim() && code) input.value = code;
}
function closeConnectionDropdown() {
  var dd = document.getElementById("connection-dropdown");
  var bg = document.getElementById("connection-dropdown-backdrop");
  if (dd) dd.classList.remove("open");
  if (bg) bg.classList.remove("open");
  var syncBtn = document.getElementById("btn-header-team-sync");
  if (syncBtn) syncBtn.setAttribute("aria-expanded", "false");
}
function openConnectionDropdown() {
  runtime3().closeSettingsDropdown();
  var dd = document.getElementById("connection-dropdown");
  var bg = document.getElementById("connection-dropdown-backdrop");
  if (!dd) return;
  dd.classList.add("open");
  if (bg) bg.classList.add("open");
  var syncBtn = document.getElementById("btn-header-team-sync");
  if (syncBtn) syncBtn.setAttribute("aria-expanded", "true");
  wireLanPanelDelegation();
  wireLanLwwToastPref();
  syncLanLwwOverwriteToastPrefUi();
  renderLanPanel2();
}
function toggleConnectionDropdown(ev) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  var dd = document.getElementById("connection-dropdown");
  if (!dd) return;
  if (dd.classList.contains("open")) closeConnectionDropdown();
  else openConnectionDropdown();
}
function openTeamSyncFromHeader() {
  openConnectionDropdown();
}

// public/js/features/lan/orchestrator.mjs
function scheduleTierALanServerWarm() {
  if (!isLanElectronDesktop()) return;
  if (typeof window === "undefined" || !window.electronAPI?.ensureLanServerReady) return;
  var uiRole = typeof storage.getLanUiRole === "function" ? storage.getLanUiRole() : "";
  if (uiRole === "host" || uiRole === "client") {
    void window.electronAPI.ensureLanServerReady();
    return;
  }
  if (typeof storage.getLanConfig === "function" && storage.getLanConfig()) {
    void window.electronAPI.ensureLanServerReady();
    return;
  }
  if (getSurrogateHostState()) {
    void window.electronAPI.ensureLanServerReady();
    return;
  }
  if (getActiveLiveSyncRoomId()) {
    void window.electronAPI.ensureLanServerReady();
  }
}
var runtime4 = {
  showToast() {
  },
  renderPatientList() {
  },
  renderNoteForm() {
  },
  renderLabHistoryPanel() {
  },
  getActiveId() {
    return null;
  },
  setActiveId() {
  },
  getActiveAppTab() {
    return "lab";
  },
  selectPatient() {
  },
  isMobileWeb() {
    return false;
  },
  renderProcedureAgendaPanel() {
  },
  refreshAllTodoUIs() {
  },
  syncWorkContextChrome() {
  },
  findPatientByRegistro() {
    return null;
  },
  ensureUniquePatientName(x) {
    return x;
  },
  applyImportEntry() {
    return "";
  },
  syncSettingsLanHostDiskSection() {
  },
  buildPatientEntry() {
    return null;
  },
  closeSettingsDropdown() {
  }
};
function registerLanRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(runtime4, ctx);
  void initLanHostPlugAndPlay();
}
var LIVE_SYNC_ENTITIES_LS = "rpc-lan-live-entities";
function readLiveSyncEntityMap() {
  try {
    var raw = localStorage.getItem(LIVE_SYNC_ENTITIES_LS);
    var parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_e) {
    return {};
  }
}
function liveSyncEntityStoreKey(entityType, entityId, patientId) {
  if (entityType === "todo") return "todo:" + String(patientId || "") + ":" + String(entityId || "");
  if (entityType === "agenda") return "agenda:" + String(entityId || "");
  if (entityType === "patient") return "patient:" + String(entityId || "");
  return String(entityType || "") + ":" + String(entityId || "");
}
function getLiveSyncEntityBase(entityType, entityId, patientId) {
  var map = readLiveSyncEntityMap();
  return map[liveSyncEntityStoreKey(entityType, entityId, patientId)] || null;
}
function rememberLiveSyncEntity(entityType, entityId, patientId, version, data) {
  var map = readLiveSyncEntityMap();
  var row = Object.assign({}, data || {}, { version: Number(version || 1) });
  map[liveSyncEntityStoreKey(entityType, entityId, patientId)] = row;
  try {
    localStorage.setItem(LIVE_SYNC_ENTITIES_LS, JSON.stringify(map));
  } catch (_e) {
  }
}
function syncHostBundleEntityFromApplied(msg) {
  var rid = String(msg && msg.roomId || activeLiveSyncRoomId || "").trim();
  if (!rid || !msg || msg.version == null) return;
  var bases = getHostBundleBases(rid);
  var key = null;
  if (msg.entityType === "agenda") key = agendaEntityKey(msg.entityId);
  else if (msg.entityType === "todo" && msg.patientId) {
    key = todoEntityKey(msg.patientId, msg.entityId);
  } else if (msg.entityType === "patient") {
    var reg = msg.data && msg.data.registro;
    key = patientEntityKey(msg.entityId, reg);
  }
  if (!key) return;
  var entityVersions = Object.assign({}, bases.entityVersions || {});
  entityVersions[key] = Number(msg.version);
  setHostBundleBases(rid, {
    revision: bases.revision,
    entityVersions
  });
}
function stampTodosWithEntityVersions(todosMap, entityVersions) {
  var versions = entityVersions && typeof entityVersions === "object" ? entityVersions : {};
  var out = {};
  Object.keys(todosMap || {}).forEach(function(pid) {
    out[pid] = (todosMap[pid] || []).map(function(t2) {
      if (!t2 || !t2.id) return t2;
      var key = liveSyncEntityStoreKey("todo", t2.id, pid);
      if (versions[key] == null) return t2;
      return Object.assign({}, t2, { version: Number(versions[key]) });
    });
  });
  return out;
}
function rememberTodosFromMap(todosMap) {
  Object.keys(todosMap || {}).forEach(function(pid) {
    (todosMap[pid] || []).forEach(function(t2) {
      if (!t2 || !t2.id) return;
      var ver = Number(t2.version || 0);
      if (!ver) return;
      rememberLiveSyncEntity("todo", t2.id, pid, ver, t2);
    });
  });
}
function buildLiveSyncMutationFromDesired(entityType, entityId, desired, extra) {
  extra = extra || {};
  var patientId = extra.patientId;
  var cached = getLiveSyncEntityBase(entityType, entityId, patientId);
  var base = cached ? Object.assign({}, cached) : { id: entityId, version: Number(desired && desired.version != null ? desired.version : 0) };
  if (entityType === "todo" && patientId && !base.patientId) base.patientId = patientId;
  var builder = createMutationBuilder(entityType, entityId).captureBase(base);
  var hasChange = false;
  Object.keys(desired || {}).forEach(function(key) {
    if (key === "version") return;
    if (desired[key] !== base[key]) {
      builder.set(key, desired[key]);
      hasChange = true;
    }
  });
  if (!hasChange && desired) {
    Object.keys(desired).forEach(function(key) {
      if (key === "version") return;
      builder.set(key, desired[key]);
    });
  }
  return builder.build(extra);
}
function sendLiveSyncMutation(mutation) {
  if (!activeLiveSyncRoomId || !mutation) return;
  var rid = String(activeLiveSyncRoomId || "").trim();
  var envelope = wrapLiveSyncPatch(rid, getLanClientId2(), mutation);
  function transmit() {
    if (!lanClient.liveConnected) return false;
    void guardAndSignLiveSyncMutation(mutation, envelope).then(function() {
      lanClient.sendLive(envelope);
    }).catch(function(err) {
      if (err && err.code === "CLINICAL_ACCESS_DENIED") {
        runtime4.showToast(String(err.message || "Acceso cl\xEDnico denegado"), "error");
      }
    });
    return true;
  }
  if (transmit()) return;
  try {
    lanClient.connectLiveChannel(rid);
  } catch (_eConn) {
  }
  void import("/js/chunks/room-CYVNYDX5.js").then(function(mod) {
    if (typeof mod.waitForLiveChannelOpen !== "function") return;
    return mod.waitForLiveChannelOpen(rid, 4500);
  }).then(function() {
    transmit();
  });
}
function isRoomBundleConflictDraft(draft) {
  return !!(draft && (draft.scope || draft.localBundle || draft.entityType === "roomBundle"));
}
async function clearConflictDraft(draftId) {
  if (!draftId) return;
  try {
    await deleteDraftConflict(draftId);
  } catch (_e) {
  }
  void renderLanPanel2();
}
async function discardDraftsForConflictEntity(payload) {
  if (!payload || !payload.entityType || !payload.entityId) return;
  var drafts = [];
  try {
    drafts = await listDraftConflicts();
  } catch (_eList) {
    return;
  }
  var roomId = payload.roomId || null;
  for (var i = 0; i < drafts.length; i += 1) {
    var d = drafts[i];
    if (!d || !d.id || isRoomBundleConflictDraft(d)) continue;
    if (d.entityType !== payload.entityType || String(d.entityId) !== String(payload.entityId)) continue;
    if (roomId != null && d.roomId != null && String(d.roomId) !== String(roomId)) continue;
    try {
      await deleteDraftConflict(d.id);
    } catch (_eDel) {
    }
  }
}
function acceptServerBundleConflict(opts) {
  opts = opts || {};
  var rid = String(opts.roomId || "").trim();
  var bundle = opts.serverBundle;
  if (!rid || !bundle || typeof bundle !== "object") return false;
  setHostBundleBases(rid, bundle);
  if (bundle.clinicalOps && isClinicalOpsLanAvailable()) {
    void applyClinicalOpsLanSnapshot(bundle.clinicalOps).then(function(ok) {
      if (ok) {
        void refreshClinicalOpsSnapshotCache();
        document.dispatchEvent(new CustomEvent("rpc-clinical-ops-synced"));
      }
    });
  }
  applyRoomSyncPhaseAfterReconcile(rid);
  return true;
}
function acceptServerClinicalOpsConflict(roomId, snapshot, revision) {
  var rid = String(roomId || "").trim();
  if (!rid) return Promise.resolve(false);
  if (revision != null) {
    var bases = getHostBundleBases(rid) || { entityVersions: {} };
    setHostBundleBases(rid, {
      revision: Number(revision),
      entityVersions: bases.entityVersions || {}
    });
  }
  if (snapshot && isClinicalOpsLanAvailable()) {
    return applyClinicalOpsLanSnapshot(snapshot).then(function(ok) {
      if (ok) {
        void refreshClinicalOpsSnapshotCache();
        document.dispatchEvent(new CustomEvent("rpc-clinical-ops-synced"));
      }
      applyRoomSyncPhaseAfterReconcile(rid);
      return !!ok;
    });
  }
  applyRoomSyncPhaseAfterReconcile(rid);
  return Promise.resolve(revision != null);
}
async function applyConflictUseServer(payload) {
  var server = payload && payload.serverSnapshot;
  if (server && server.data) {
    if (payload.entityType === "historiaClinica" && payload.patientId) {
      var hcRow = patients.find(function(p) {
        return p && String(p.id) === String(payload.patientId);
      });
      if (hcRow) {
        var mod = await import("/js/chunks/historia-clinica-lan-sync-5EJLNX2X.js");
        mod.applyServerHistoriaClinicaToPatient(hcRow, server.version, server.data);
      }
    } else {
      applyLiveSyncApplied({
        roomId: payload.roomId || activeLiveSyncRoomId,
        entityType: payload.entityType,
        entityId: payload.entityId,
        patientId: payload.patientId,
        version: server.version,
        data: server.data
      });
    }
  }
  if (payload.draftId) {
    await clearConflictDraft(payload.draftId);
  }
}
function clearHistoriaPendingAfterConflict(payload) {
  if (!payload || payload.entityType !== "historiaClinica" || !payload.patientId) return;
  var row = patients.find(function(p) {
    return p && String(p.id) === String(payload.patientId);
  });
  if (!row || !row.historiaClinica) return;
  delete row.historiaClinica.pendingLanSync;
  delete row.historiaClinica.lanSyncPending;
  saveState();
}
function mergeConflictSnapshotData(snap) {
  if (!snap) return {};
  var base = snap.baseData && typeof snap.baseData === "object" ? snap.baseData : {};
  var patch = snap.data && typeof snap.data === "object" ? snap.data : {};
  return Object.assign({}, base, patch);
}
function conflictDataForViewer(payload) {
  var local = mergeConflictSnapshotData(payload && payload.localSnapshot);
  var server = payload && payload.serverSnapshot && payload.serverSnapshot.data ? Object.assign({}, payload.serverSnapshot.data) : {};
  if (payload && payload.entityType === "todo" && (!server.text || server.completed == null)) {
    var cached = getLiveSyncEntityBase("todo", payload.entityId, payload.patientId);
    if (cached) server = Object.assign({}, cached, server);
  }
  return { localData: local, serverData: server };
}
function shouldAutoResolveTodoConflict(payload) {
  if (!payload || payload.entityType !== "todo") return false;
  if (payload.localSnapshot && payload.localSnapshot.op === "delete") return true;
  var local = mergeConflictSnapshotData(payload.localSnapshot);
  var server = payload.serverSnapshot && payload.serverSnapshot.data;
  return !!(local.completed || server && server.completed);
}
function tryAutoResolveTodoConflict(payload) {
  var server = payload.serverSnapshot;
  if (!server || server.version == null || !payload.patientId) return false;
  var local = mergeConflictSnapshotData(payload.localSnapshot);
  var merged = Object.assign({}, server.data || {}, local, {
    id: payload.entityId,
    version: server.version
  });
  if (payload.localSnapshot && payload.localSnapshot.op === "delete") {
    rememberLiveSyncEntity(
      "todo",
      payload.entityId,
      payload.patientId,
      server.version,
      Object.assign({}, server.data || {}, { id: payload.entityId })
    );
    emitLiveSyncTodoDelete(payload.patientId, {
      id: payload.entityId,
      version: server.version
    });
    return true;
  }
  if (local.completed) {
    merged.completed = true;
    emitLiveSyncTodoUpsert(payload.patientId, merged);
    return true;
  }
  return false;
}
async function appendLanConflictDraftsSection(root) {
  if (!root) return;
  var draftCount = 0;
  try {
    draftCount = await countDraftConflicts();
  } catch (_eList) {
    draftCount = 0;
  }
  if (!draftCount) return;
  var prev = root.querySelector("#lan-conflict-drafts-card");
  if (prev) prev.remove();
  var card = document.createElement("div");
  card.id = "lan-conflict-drafts-card";
  card.className = "lan-connect-card";
  var title = document.createElement("div");
  title.className = "lan-connect-card-title";
  title.textContent = "Conflictos antiguos";
  card.appendChild(title);
  var hint = document.createElement("p");
  hint.className = "lan-connect-card-hint";
  hint.textContent = draftCount + " borrador(es) de conflictos anteriores. La sala ya resuelve cambios concurrentes autom\xE1ticamente.";
  card.appendChild(hint);
  var bulkRow = document.createElement("div");
  bulkRow.className = "lan-connect-actions-row";
  bulkRow.style.marginTop = "4px";
  var bulkBtn = document.createElement("button");
  bulkBtn.type = "button";
  bulkBtn.className = "btn-lan-primary";
  bulkBtn.style.flex = "1";
  bulkBtn.textContent = "Descartar todos";
  bulkBtn.onclick = function() {
    if (typeof confirm === "function" && !confirm("\xBFDescartar los " + draftCount + " borradores de conflicto antiguos?")) {
      return;
    }
    bulkBtn.disabled = true;
    bulkBtn.textContent = "Descartando\u2026";
    void clearAllDraftConflicts().then(function(cleared) {
      runtime4.showToast(
        cleared ? "Se descartaron " + cleared + " conflictos antiguos." : "No hab\xEDa borradores que descartar.",
        cleared ? "success" : "info"
      );
    }).catch(function() {
      runtime4.showToast("No se pudieron descartar los borradores.", "error");
    }).finally(function() {
      bulkBtn.disabled = false;
      bulkBtn.textContent = "Descartar todos";
      void renderLanPanel2();
    });
  };
  bulkRow.appendChild(bulkBtn);
  card.appendChild(bulkRow);
  root.appendChild(card);
}
async function applyLwwConflictLocally(payload) {
  if (!payload) return;
  if (shouldAutoResolveTodoConflict(payload) && tryAutoResolveTodoConflict(payload)) {
    await discardDraftsForConflictEntity(payload);
    clearHistoriaPendingAfterConflict(payload);
    var localDelete = payload.localSnapshot && payload.localSnapshot.op === "delete";
    if (!localDelete) {
      runtime4.showToast("Pendiente alineado con la sala", "info");
    }
    return;
  }
  var viewerData = conflictDataForViewer(payload);
  var silentMatch = conflictSnapshotsMatchForAutoResolve({
    conflictingKeys: payload.conflictingKeys,
    localData: viewerData.localData,
    serverData: viewerData.serverData
  });
  await applyConflictUseServer(payload);
  await discardDraftsForConflictEntity(payload);
  clearHistoriaPendingAfterConflict(payload);
  var server = payload.serverSnapshot;
  if (server && server.version != null) {
    syncHostBundleEntityFromApplied({
      roomId: payload.roomId || activeLiveSyncRoomId,
      entityType: payload.entityType,
      entityId: payload.entityId,
      patientId: payload.patientId,
      version: server.version,
      data: server.data
    });
  }
  if (!silentMatch && payload.lwwApplied) {
    notifyLwwOverwrite(runtime4, {
      entityType: payload.entityType,
      entityId: payload.entityId,
      overwrittenKeys: payload.overwrittenKeys || payload.conflictingKeys || []
    });
  }
}
async function handleSyncConflict(payload, options) {
  options = options || {};
  await applyLwwConflictLocally(payload);
  void renderLanPanel2();
}
function wsConflictDetailToPayload(detail) {
  return {
    transport: "ws",
    entityType: detail.entityType,
    entityId: detail.entityId,
    roomId: detail.roomId,
    patientId: detail.patientId,
    lwwApplied: detail.lwwApplied === true,
    overwrittenKeys: detail.overwrittenKeys || detail.conflictingKeys || [],
    conflictingKeys: detail.conflictingKeys || [],
    localSnapshot: {
      expectedVersion: detail.client && detail.client.version != null ? detail.client.version : detail.expectedVersion,
      data: detail.client && detail.client.data,
      baseData: getLiveSyncEntityBase(detail.entityType, detail.entityId, detail.patientId) || void 0,
      op: detail.client && detail.client.op
    },
    serverSnapshot: {
      version: detail.server && detail.server.version,
      data: detail.server && detail.server.data
    }
  };
}
async function lanFetchHostPatientRow(patientId) {
  var pid = String(patientId || "").trim();
  if (!pid || !isLanSessionConfiguredForRest()) return null;
  var resp = await lanFetchAuthed("/api/lan/v1/patients");
  if (!resp.ok) return null;
  var body = {};
  try {
    body = await resp.json();
  } catch (_e) {
  }
  var list = Array.isArray(body.patients) ? body.patients : [];
  return list.find(function(row) {
    return row && String(row.id) === pid;
  }) || null;
}
async function lanPushPatientVersioned(patientId, mutation) {
  var pid = String(patientId || "").trim();
  if (!pid || !mutation) return { ok: false, error: "invalid_args" };
  var resp = await lanFetchAuthed("/api/lan/v1/patients/" + encodeURIComponent(pid), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mutation)
  });
  if (!resp.ok) {
    return { ok: false, status: resp.status };
  }
  var out = {};
  try {
    out = await resp.json();
  } catch (_eOut) {
  }
  if (out && out.version != null && out.data) {
    rememberLiveSyncEntity("patient", pid, null, out.version, out.data);
    syncHostBundleEntityFromApplied({
      roomId: activeLiveSyncRoomId,
      entityType: "patient",
      entityId: pid,
      version: out.version,
      data: out.data
    });
  }
  if (out && out.lwwApplied) {
    notifyLwwOverwrite(runtime4, {
      entityType: "patient",
      entityId: pid,
      overwrittenKeys: out.overwrittenKeys || []
    });
  }
  return { ok: true, body: out, version: out.version, data: out.data };
}
async function lanPushHistoriaClinica(patientId, mutation) {
  var pid = String(patientId || "").trim();
  if (!pid || !mutation) return { ok: false, error: "invalid_args" };
  var resp = await lanFetchAuthed(
    "/api/lan/v1/patients/" + encodeURIComponent(pid) + "/historia-clinica",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mutation)
    }
  );
  if (!resp.ok) {
    return { ok: false, status: resp.status };
  }
  var out = {};
  try {
    out = await resp.json();
  } catch (_eOut) {
  }
  if (out && out.lwwApplied) {
    notifyLwwOverwrite(runtime4, {
      entityType: "historiaClinica",
      entityId: pid,
      overwrittenKeys: out.overwrittenKeys || []
    });
  }
  return { ok: true, version: out.version, data: out.data, body: out };
}
async function lanSyncPatientArchivedFlag(patient) {
  if (!patient || !patient.id || !isLanSessionConfiguredForRest()) {
    return { ok: false, error: "not_configured" };
  }
  var resp = await lanFetchAuthed("/api/lan/v1/patients");
  if (!resp.ok) return { ok: false, status: resp.status };
  var body = {};
  try {
    body = await resp.json();
  } catch (_e) {
  }
  var list = Array.isArray(body.patients) ? body.patients : [];
  var hostRow = list.find(function(row) {
    return row && String(row.id) === String(patient.id);
  });
  if (!hostRow) return { ok: false, error: "patient_not_on_host" };
  var mutation = {
    expectedVersion: Number(hostRow.version || 1),
    changedKeys: ["archived"],
    baseData: hostRow,
    data: Object.assign({}, hostRow, { archived: !!patient.archived })
  };
  return lanPushPatientVersioned(patient.id, mutation);
}
async function lanFetchHistoriaClinica(patientId, roomId) {
  var pid = String(patientId || "").trim();
  var rid = String(roomId || "").trim();
  if (!pid || !rid || !isLanSessionConfiguredForRest()) {
    return { ok: false, error: "not_configured" };
  }
  var resp = await lanFetchAuthed(
    "/api/lan/v1/patients/" + encodeURIComponent(pid) + "/historia-clinica?roomId=" + encodeURIComponent(rid)
  );
  if (resp.status === 404) return { ok: true, missing: true };
  if (!resp.ok) return { ok: false, status: resp.status };
  var body = await resp.json();
  return { ok: true, version: body.version, data: body.data };
}
function collectPatientIdsForLiveSync() {
  return patients.filter(function(p) {
    return p && p.id && String(p.id).indexOf("demo-") !== 0;
  }).map(function(p) {
    return String(p.id);
  });
}
function collectTodosMapForLiveSync() {
  var out = {};
  collectPatientIdsForLiveSync().forEach(function(pid) {
    var list = storage.getTodos(pid);
    if (list.length) out[pid] = list;
  });
  return out;
}
function collectPatientEntriesForLanSync() {
  var out = [];
  patients.forEach(function(p) {
    if (!p || !p.id || String(p.id).indexOf("demo-") === 0) return;
    var entry = runtime4.buildPatientEntry(p.id);
    if (entry) out.push(entry);
  });
  return out;
}
function buildLiveSyncLocalMergeSource() {
  return {
    agenda: storage.getScheduledProcedures(),
    todos: collectTodosMapForLiveSync(),
    entries: collectPatientEntriesForLanSync(),
    clinicalOps: getCachedClinicalOpsSnapshot()
  };
}
function touchPatientLanUpdatedAt(patientId) {
  var p = patients.find(function(x) {
    return x && x.id === patientId;
  });
  if (p) p.lanUpdatedAt = (/* @__PURE__ */ new Date()).toISOString();
}
function saveEntryTodosOnLocalPatient(localPatientId, entry) {
  if (!localPatientId || !entry) return;
  var incoming = Array.isArray(entry.todos) ? entry.todos : [];
  if (!incoming.length) return;
  storage.saveTodos(
    localPatientId,
    filterTodosRespectingDismissals(
      localPatientId,
      mergeTodoListsById(storage.getTodos(localPatientId), incoming)
    )
  );
}
function applyLanPatientEntries(entries) {
  if (!entries || !entries.length) return { added: 0, updated: 0 };
  var added = 0;
  var updated = 0;
  for (var i = 0; i < entries.length; i += 1) {
    var entry = entries[i];
    if (!entry || !entry.patient) continue;
    var reg = String(entry.patient.registro || "").trim();
    var existing = reg ? runtime4.findPatientByRegistro(reg) : null;
    if (!existing && entry.patient.id) {
      existing = patients.find(function(p) {
        return p && p.id === entry.patient.id;
      });
    }
    if (existing) {
      existing.nombre = entry.patient.nombre || existing.nombre;
      existing.edad = entry.patient.edad || existing.edad;
      existing.sexo = entry.patient.sexo || existing.sexo;
      existing.area = entry.patient.area || existing.area;
      existing.servicio = entry.patient.servicio || existing.servicio;
      existing.cuarto = entry.patient.cuarto || existing.cuarto;
      existing.cama = entry.patient.cama || existing.cama;
      existing.peso = entry.patient.peso || existing.peso;
      existing.talla = entry.patient.talla || existing.talla;
      existing.viaAcceso = entry.patient.viaAcceso || existing.viaAcceso;
      mergeCensoPatientFields(existing, entry.patient);
      existing.registro = entry.patient.registro || existing.registro;
      if (entry.patient.fromLab) existing.fromLab = true;
      if (entry.patient.eventualidades && typeof entry.patient.eventualidades === "object") {
        existing.eventualidades = mergeEventualidades(
          existing.eventualidades,
          entry.patient.eventualidades
        ) || entry.patient.eventualidades;
      }
      if (entry.patient.historiaClinica && typeof entry.patient.historiaClinica === "object") {
        const mergedHc = mergeHistoriaClinica(
          existing.historiaClinica,
          entry.patient.historiaClinica
        );
        if (mergedHc) existing.historiaClinica = mergedHc;
      }
      notes[existing.id] = entry.note || {};
      indicaciones[existing.id] = entry.indicaciones || {};
      labHistory[existing.id] = Array.isArray(entry.labHistory) ? entry.labHistory : [];
      if (entry.medReceta) medRecetaByPatient[existing.id] = entry.medReceta;
      else delete medRecetaByPatient[existing.id];
      if (entry.medPharmProfile) medPharmProfileByPatient[existing.id] = entry.medPharmProfile;
      else delete medPharmProfileByPatient[existing.id];
      if (entry.vpo) vpoByPatient[existing.id] = entry.vpo;
      else delete vpoByPatient[existing.id];
      if (entry.listadoProblemas) listadoProblemas[existing.id] = entry.listadoProblemas;
      mergePatientMonitoreoFromImported(existing, entry.patient);
      saveEntryTodosOnLocalPatient(existing.id, entry);
      updated += 1;
    } else {
      var remoteId = String(entry.patient.id || "").trim();
      var idTaken = remoteId && patients.some(function(p) {
        return p && p.id === remoteId;
      });
      var newId;
      if (remoteId && !idTaken) {
        var newPat = {
          id: remoteId,
          nombre: runtime4.ensureUniquePatientName(entry.patient.nombre || "PACIENTE SIN NOMBRE"),
          area: entry.patient.area || "",
          servicio: entry.patient.servicio || "",
          cuarto: entry.patient.cuarto || "",
          cama: entry.patient.cama || "",
          peso: entry.patient.peso || "",
          talla: entry.patient.talla || "",
          viaAcceso: entry.patient.viaAcceso || "",
          edad: entry.patient.edad || "",
          sexo: entry.patient.sexo || "F",
          registro: entry.patient.registro || "",
          fromLab: !!entry.patient.fromLab
        };
        mergePatientMonitoreoFromImported(newPat, entry.patient);
        mergeCensoPatientFields(newPat, entry.patient);
        if (entry.patient.eventualidades && typeof entry.patient.eventualidades === "object") {
          newPat.eventualidades = entry.patient.eventualidades;
        }
        if (entry.patient.historiaClinica && typeof entry.patient.historiaClinica === "object") {
          newPat.historiaClinica = structuredClone(entry.patient.historiaClinica);
        }
        patients.unshift(newPat);
        notes[remoteId] = entry.note || {};
        indicaciones[remoteId] = entry.indicaciones || {};
        labHistory[remoteId] = Array.isArray(entry.labHistory) ? entry.labHistory : [];
        if (entry.medReceta) medRecetaByPatient[remoteId] = entry.medReceta;
        if (entry.medPharmProfile) medPharmProfileByPatient[remoteId] = entry.medPharmProfile;
        if (entry.vpo) vpoByPatient[remoteId] = entry.vpo;
        newId = remoteId;
      } else {
        newId = runtime4.applyImportEntry(entry, "duplicate", null);
      }
      if (entry.listadoProblemas && newId) listadoProblemas[newId] = entry.listadoProblemas;
      saveEntryTodosOnLocalPatient(newId, entry);
      added += 1;
    }
  }
  if (added || updated) {
    saveState({ immediate: true });
    runtime4.renderPatientList();
    if (runtime4.getActiveId()) {
      try {
        runtime4.renderNoteForm();
      } catch (_e) {
      }
      try {
        runtime4.renderLabHistoryPanel();
      } catch (_e2) {
      }
    }
  }
  return { added, updated };
}
function removePatientLocally(patientId) {
  var pid = String(patientId || "").trim();
  if (!pid || pid.indexOf("demo-") === 0) return false;
  if (!patients.some(function(p) {
    return p && p.id === pid;
  })) {
    return false;
  }
  setPatients(patients.filter(function(p) {
    return p.id !== pid;
  }));
  delete notes[pid];
  delete indicaciones[pid];
  if (labHistory && labHistory[pid]) delete labHistory[pid];
  if (medRecetaByPatient && medRecetaByPatient[pid]) delete medRecetaByPatient[pid];
  if (medPharmProfileByPatient && medPharmProfileByPatient[pid]) delete medPharmProfileByPatient[pid];
  if (typeof vpoByPatient !== "undefined" && vpoByPatient && vpoByPatient[pid]) delete vpoByPatient[pid];
  if (recetaHuByPatient && recetaHuByPatient[pid]) delete recetaHuByPatient[pid];
  if (medNotaSelectionByPatient && medNotaSelectionByPatient[pid]) delete medNotaSelectionByPatient[pid];
  if (listadoProblemas && listadoProblemas[pid]) delete listadoProblemas[pid];
  try {
    var rawTodosMap = localStorage.getItem("rpc-todos");
    if (rawTodosMap) {
      var todosMap = JSON.parse(rawTodosMap);
      if (todosMap && typeof todosMap === "object" && todosMap[pid]) {
        delete todosMap[pid];
        localStorage.setItem("rpc-todos", JSON.stringify(todosMap));
      }
    }
  } catch (_e) {
  }
  try {
    if (storage.removeScheduledProceduresForPatient) storage.removeScheduledProceduresForPatient(pid);
  } catch (_eAg) {
  }
  if (runtime4.getActiveId() === pid) runtime4.setActiveId(patients.length ? patients[0].id : null);
  return true;
}
function applyLiveSyncPatientDeletes(deletes, idMap) {
  if (!deletes || !deletes.length) return false;
  var changed = false;
  for (var i = 0; i < deletes.length; i += 1) {
    var d = deletes[i];
    if (!d || !d.deleted) continue;
    var remoteId = String(d.id || "").trim();
    var localId = remoteId && idMap && idMap[remoteId] ? idMap[remoteId] : remoteId;
    if (localId && removePatientLocally(localId)) {
      changed = true;
      continue;
    }
    var reg = String(d.registro || "").trim();
    if (reg) {
      var existing = runtime4.findPatientByRegistro(reg);
      if (existing && removePatientLocally(existing.id)) changed = true;
    }
  }
  return changed;
}
function applyLiveSyncMerged(merged) {
  if (!merged) return;
  if (isPitchPatientIsolationActive()) return;
  var entries = merged.entries || [];
  if (entries.length) {
    applyLanPatientEntries(entries);
  }
  var idMap = buildLiveSyncPatientIdMap(entries, patients, merged.todos || {});
  var patientRemoved = applyLiveSyncPatientDeletes(merged.patientDeletes || [], idMap);
  storage.saveScheduledProcedures(remapAgendaPatientIds(merged.agenda || [], idMap));
  var todosMap = remapTodosPatientIds(merged.todos || {}, idMap);
  if (activeLiveSyncRoomId) {
    var entityVersions = getHostBundleBases(activeLiveSyncRoomId).entityVersions;
    todosMap = stampTodosWithEntityVersions(todosMap, entityVersions);
    rememberTodosFromMap(todosMap);
  }
  var saveTodoPids = /* @__PURE__ */ Object.create(null);
  Object.keys(todosMap).forEach(function(pid) {
    saveTodoPids[pid] = true;
  });
  (merged.todoTouchedPatientIds || []).forEach(function(pid) {
    var mapped = idMap[pid] || pid;
    if (mapped) saveTodoPids[mapped] = true;
  });
  Object.keys(saveTodoPids).forEach(function(pid) {
    var todoList = todosMap[pid] || [];
    storage.saveTodos(pid, filterTodosRespectingDismissals(pid, todoList));
  });
  if (patientRemoved) {
    runtime4.renderPatientList();
    if (runtime4.getActiveId()) runtime4.selectPatient(runtime4.getActiveId());
    else {
      var pv = document.getElementById("patient-view");
      var es = document.getElementById("empty-state");
      if (pv) pv.style.display = "none";
      if (es) es.style.display = "flex";
      runtime4.syncWorkContextChrome();
    }
  }
  if (runtime4.getActiveAppTab() === "agenda" || runtime4.isMobileWeb()) {
    runtime4.renderProcedureAgendaPanel();
  }
  runtime4.refreshAllTodoUIs();
  if (runtime4.getActiveId()) {
    try {
      runtime4.renderNoteForm();
    } catch (_eNote) {
    }
    try {
      runtime4.renderLabHistoryPanel();
    } catch (_eLab) {
    }
  }
  if (merged.manejo && isLanManejoRoomSyncEnabled()) {
    applyManejoRoomDataToLocal(merged.manejo);
  }
  if (merged.clinicalOps && isClinicalOpsLanAvailable()) {
    void applyClinicalOpsLanSnapshot(merged.clinicalOps).then(function(ok) {
      if (ok) {
        void refreshClinicalOpsSnapshotCache();
        void refreshClinicalSessionTeams().then(function() {
          document.dispatchEvent(new CustomEvent("rpc-clinical-ops-synced"));
        });
      } else {
        runtime4.showToast(
          "No se pudieron sincronizar equipos ni usuarios LAN. Desbloquea la sesi\xF3n cl\xEDnica e intenta de nuevo.",
          "warn"
        );
      }
    });
  }
  migrateLocalPatientsClinicalSala();
}
function applyLiveSyncApplied(msg) {
  if (!msg || isPitchPatientIsolationActive()) return;
  if (msg.roomId && activeLiveSyncRoomId && msg.roomId !== activeLiveSyncRoomId) return;
  var entityType = msg.entityType;
  var entityId = String(msg.entityId || "").trim();
  var patientId = msg.patientId;
  var version = Number(msg.version || 1);
  var entityData = msg.data || {};
  if (!entityType || !entityId) return;
  rememberLiveSyncEntity(entityType, entityId, patientId, version, entityData);
  if (entityType === "agenda") {
    var agenda = storage.getScheduledProcedures();
    if (entityData._deleted) {
      agenda = agenda.filter(function(ev) {
        return ev && ev.id !== entityId;
      });
    } else {
      var agendaFound = false;
      agenda = agenda.map(function(ev) {
        if (ev && ev.id === entityId) {
          agendaFound = true;
          return Object.assign({}, ev, entityData, { id: entityId, version });
        }
        return ev;
      });
      if (!agendaFound) {
        agenda.push(Object.assign({}, entityData, { id: entityId, version }));
      }
    }
    storage.saveScheduledProcedures(agenda);
    if (runtime4.getActiveAppTab() === "agenda" || runtime4.isMobileWeb()) {
      runtime4.renderProcedureAgendaPanel();
    }
  } else if (entityType === "todo" && patientId) {
    var pid = String(patientId);
    if (pid.indexOf("demo-") !== 0) {
      var todos = storage.getTodos(pid);
      if (entityData._deleted) {
        todos = todos.filter(function(t2) {
          return t2 && t2.id !== entityId;
        });
      } else {
        var todoFound = false;
        todos = todos.map(function(t2) {
          if (t2 && t2.id === entityId) {
            todoFound = true;
            return Object.assign({}, t2, entityData, { id: entityId, version });
          }
          return t2;
        });
        if (!todoFound) {
          todos.push(Object.assign({}, entityData, { id: entityId, version }));
        }
      }
      storage.saveTodos(pid, filterTodosRespectingDismissals(pid, todos));
    }
    runtime4.refreshAllTodoUIs();
  } else if (entityType === "patient") {
    var row = patients.find(function(p) {
      return p && p.id === entityId;
    });
    if (row && !entityData._deleted) {
      Object.assign(row, entityData, { version });
      saveState({ immediate: true });
      runtime4.renderPatientList();
      if (runtime4.getActiveId() === entityId) {
        try {
          runtime4.renderNoteForm();
        } catch (_eNote) {
        }
        try {
          runtime4.renderLabHistoryPanel();
        } catch (_eLab) {
        }
      }
    }
  }
  syncHostBundleEntityFromApplied(msg);
  if (msg.lwwApplied) {
    notifyLwwOverwrite(runtime4, {
      entityType: msg.entityType,
      entityId: msg.entityId,
      overwrittenKeys: msg.overwrittenKeys || []
    });
  } else if (msg.autoMerged) {
    runtime4.showToast("Cambios fusionados autom\xE1ticamente con el servidor.", "success");
  }
}
function emitLiveSyncAgendaUpsert(eventObj) {
  if (!eventObj || !eventObj.id) return;
  var mutation = buildLiveSyncMutationFromDesired("agenda", eventObj.id, eventObj, {
    roomId: activeLiveSyncRoomId,
    op: "upsert"
  });
  sendLiveSyncMutation(mutation);
}
function emitLiveSyncAgendaDelete(id, updatedAt) {
  var eid = String(id || "").trim();
  if (!eid) return;
  var base = getLiveSyncEntityBase("agenda", eid, null) || { id: eid, version: 0, updatedAt };
  var mutation = createMutationBuilder("agenda", eid).captureBase(base).build({ roomId: activeLiveSyncRoomId, op: "delete" });
  sendLiveSyncMutation(mutation);
}
function emitLiveSyncTodoUpsert(patientId, todo) {
  if (!todo) return;
  if (String(patientId || "").indexOf("demo-") === 0) return;
  var mutation = buildLiveSyncMutationFromDesired("todo", todo.id, todo, {
    roomId: activeLiveSyncRoomId,
    patientId,
    op: "upsert"
  });
  sendLiveSyncMutation(mutation);
}
function emitLiveSyncTodoDelete(patientId, todoRef, updatedAt) {
  var todo = todoRef && typeof todoRef === "object" ? todoRef : null;
  var eid = todo ? String(todo.id || "").trim() : String(todoRef || "").trim();
  if (!eid) return;
  var cached = getLiveSyncEntityBase("todo", eid, patientId);
  var base = cached ? Object.assign({}, cached) : Object.assign({}, todo || { id: eid, updatedAt }, { id: eid, patientId });
  if (todo && todo.version != null && (cached == null || cached.version == null)) {
    base.version = Number(todo.version);
  }
  if (base.version == null) base.version = Number(todo && todo.version != null ? todo.version : 0);
  var mutation = createMutationBuilder("todo", eid).captureBase(base).build({ roomId: activeLiveSyncRoomId, patientId, op: "delete" });
  sendLiveSyncMutation(mutation);
}
function emitLiveSyncPatientDelete(patient) {
  if (!patient) return;
  if (String(patient.id || "").indexOf("demo-") === 0) return;
  var mutation = buildLiveSyncMutationFromDesired(
    "patient",
    patient.id,
    { id: patient.id, registro: patient.registro || "" },
    { roomId: activeLiveSyncRoomId, op: "delete" }
  );
  sendLiveSyncMutation(mutation);
}
registerLanSyncTransportDeps({
  get runtime() {
    return runtime4;
  },
  renderLanPanel: renderLanPanel2,
  joinLanRoom,
  resolveAutoJoinRoomId,
  openConnectionDropdown,
  bootLanRoomMembership
});
registerLanSyncPanelRuntime(
  Object.assign(runtime4, {
    appendLanConflictDraftsSection
  })
);
registerLanSyncRoomBridge({
  runtime: runtime4,
  renderLanPanel: renderLanPanel2,
  patchLanPanelJoinButtons,
  rememberLanRoomJoined,
  initLanClientFromStorage,
  applyLiveSyncMerged,
  applyLiveSyncApplied,
  buildLiveSyncLocalMergeSource,
  collectPatientEntriesForLanSync,
  collectPatientIdsForLiveSync,
  collectTodosMapForLiveSync,
  maybeRevertSurrogateToPrimary
});
registerLanSyncPushBridge({
  isLanSessionConfiguredForRest,
  buildLiveSyncBundleEnvelope,
  saveLocalRoomSnapshot,
  buildLiveSyncLocalMergeSource,
  applyLiveSyncMerged,
  applyRoomSyncPhaseAfterReconcile,
  fetchAndApplyClinicalOpsFromHost,
  syncLiveSyncStatusChrome,
  acceptServerBundleConflict,
  acceptServerClinicalOpsConflict,
  renderLanPanel: renderLanPanel2,
  showToast: function(msg, type) {
    runtime4.showToast(msg, type);
  }
});
registerLanSyncRoomWireHandlers();
lanClient.addEventListener("lan-applied", function(ev) {
  applyLiveSyncApplied(ev.detail);
});
lanClient.addEventListener("lan-conflict", function(ev) {
  if (!ev.detail) return;
  var payload = wsConflictDetailToPayload(ev.detail);
  if (!payload.lwwApplied && payload.serverSnapshot && payload.serverSnapshot.data) {
    payload.lwwApplied = true;
  }
  void handleSyncConflict(payload);
});
lanClient.addEventListener("lan-patch", function() {
  syncLiveSyncStatusChrome();
});
if (typeof document !== "undefined") {
  initLanClientFromStorage();
  wireClinicalOpsLanSyncEvents();
  wireLanPanelDelegation();
}
if (typeof document !== "undefined" && isLanElectronDesktop()) {
  scheduleTierALanServerWarm();
  startLanAutoDiscovery();
}
function registerLanSaveHooks(deps2) {
  var post = deps2 && typeof deps2.scheduleLabHistoryPostSaveMaintenance === "function" ? deps2.scheduleLabHistoryPostSaveMaintenance : function() {
  };
  setSaveStateHooks({
    before() {
      var aid = runtime4.getActiveId();
      if (activeLiveSyncRoomId && aid) touchPatientLanUpdatedAt(aid);
    },
    after() {
      post();
      scheduleLiveSyncPush();
    }
  });
}
var windowHandlers3 = {
  toggleConnectionDropdown,
  closeConnectionDropdown,
  openConnectionDropdown,
  openTeamSyncFromHeader,
  saveLanSettingsFromUi,
  saveLanHostTeamCodeFromUi,
  resetLanSquadHostStateFromUi,
  dismissLanHostFirstTimeHint,
  dismissLanDisconnectBanner,
  setLanHideDisconnectBannerFromUi,
  joinLanRoom,
  joinLanFromInviteUi,
  createLanRoomFromUi,
  deleteLanRoom,
  copyLanInviteLinkFromUi
};

// public/js/features/entrega-modal-ui.mjs
var BADGE_LABELS = {
  consentimiento: "Consent",
  anestesia: "Anest",
  familiar: "Familiar"
};
var draftItems = [];
var draftActor = null;
var templateCatalog = { user: [], team: [] };
var draftSourceTeamId = "";
var draftVitalsPlan = defaultVitalsPlan();
var draftHandoffContext = defaultHandoffContext();
var uiWired = false;
var handoffUiWired = false;
function dbApi5() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
function toast3(msg, type = "info") {
  if (typeof window !== "undefined" && typeof window.showToast === "function") {
    window.showToast(msg, type);
  }
}
function formatHHmm(scheduledAt) {
  if (!scheduledAt) return "";
  const d = new Date(scheduledAt);
  if (!Number.isNaN(d.getTime())) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  const m = String(scheduledAt).match(/(\d{1,2}:\d{2})/);
  return m ? m[1] : "";
}
function scheduledAtFromTimeInput(hhmm) {
  const t2 = String(hhmm || "").trim();
  if (!t2) return null;
  const [h, m] = t2.split(":").map((x) => parseInt(x, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const d = /* @__PURE__ */ new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}
function defaultProcedureTimeHHmm() {
  const d = /* @__PURE__ */ new Date();
  let mins = Math.ceil(d.getMinutes() / 5) * 5;
  if (mins >= 60) {
    d.setHours(d.getHours() + 1);
    mins = 0;
  }
  d.setMinutes(mins, 0, 0);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function parseTimeParts(hhmm) {
  const t2 = formatHHmm(hhmm) || String(hhmm || "").trim();
  if (!t2 || !/^\d{1,2}:\d{1,2}$/.test(t2)) return { hour: "", minute: "" };
  const [hour, minute] = t2.split(":");
  return {
    hour: String(hour).padStart(2, "0"),
    minute: String(minute).padStart(2, "0")
  };
}
function buildHourSelectOptions(selected, opts = {}) {
  const allowBlank = opts.allowBlank !== false;
  let html = allowBlank ? '<option value="">\u2014</option>' : "";
  for (let h = 0; h < 24; h += 1) {
    const v = String(h).padStart(2, "0");
    html += `<option value="${v}"${v === selected ? " selected" : ""}>${v}</option>`;
  }
  return html;
}
function buildMinuteSelectOptions(selected, opts = {}) {
  const allowBlank = opts.allowBlank !== false;
  let html = allowBlank ? '<option value="">\u2014</option>' : "";
  const stepSet = /* @__PURE__ */ new Set();
  for (let m = 0; m < 60; m += 5) {
    const v = String(m).padStart(2, "0");
    stepSet.add(v);
    html += `<option value="${v}"${v === selected ? " selected" : ""}>${v}</option>`;
  }
  if (selected && !stepSet.has(selected)) {
    html += `<option value="${selected}" selected>${selected}</option>`;
  }
  return html;
}
function buildTimeSelectMarkup(hhmm, opts = {}) {
  const resolved = hhmm || (opts.allowBlank === false ? defaultProcedureTimeHHmm() : "");
  const { hour, minute } = parseTimeParts(resolved);
  const hourName = opts.hourName || "entrega-proc-hour";
  const minuteName = opts.minuteName || "entrega-proc-minute";
  const ariaLabel = opts.ariaLabel || "Hora programada";
  const selectOpts = { allowBlank: opts.allowBlank !== false };
  const disabled = opts.disabled ? " disabled" : "";
  const wrapClass = [opts.picker ? "entrega-time-picker" : "entrega-time-combo", opts.wrapperClass].filter(Boolean).join(" ");
  const wrapId = opts.wrapperId ? ` id="${opts.wrapperId}"` : "";
  return `<div class="${wrapClass}"${wrapId} role="group" aria-label="${escapeHtml4(ariaLabel)}">
    <div class="entrega-time-picker__part">
      <span class="entrega-time-picker__hint">H</span>
      <select name="${hourName}" class="profile-input entrega-time-select" aria-label="Hora"${disabled}>${buildHourSelectOptions(hour, selectOpts)}</select>
    </div>
    <span class="entrega-time-sep" aria-hidden="true">:</span>
    <div class="entrega-time-picker__part">
      <span class="entrega-time-picker__hint">M</span>
      <select name="${minuteName}" class="profile-input entrega-time-select" aria-label="Minutos"${disabled}>${buildMinuteSelectOptions(minute, selectOpts)}</select>
    </div>
  </div>`;
}
function readTimeFromForm(formEl) {
  const hour = String(formEl.querySelector('[name="entrega-proc-hour"]')?.value || "").trim();
  const minute = String(formEl.querySelector('[name="entrega-proc-minute"]')?.value || "").trim();
  if (!hour && !minute) return "";
  if (hour && minute) return `${hour}:${minute}`;
  if (hour) return `${hour}:00`;
  return `00:${minute}`;
}
function resolveEntregaActorRole(currentUser, existingGuardia) {
  const userId = String(currentUser?.user_id || currentUser?.userId || "");
  const coveringUserId = String(existingGuardia?.covering_user_id || "");
  const hasGuardia = !!(existingGuardia?.guardia_id || existingGuardia?.guardiaId);
  const isCoveringReceiver = hasGuardia && coveringUserId !== "" && coveringUserId === userId;
  return {
    role: isCoveringReceiver ? "guardia" : "diurno",
    userId,
    rank: String(currentUser?.rank || "")
  };
}
function getEntregaDraftItems() {
  return draftItems.slice();
}
function resetEntregaModalUi() {
  draftItems = [];
  draftActor = null;
  templateCatalog = { user: [], team: [] };
  draftSourceTeamId = "";
  draftVitalsPlan = defaultVitalsPlan();
  draftHandoffContext = defaultHandoffContext();
  const handoffPanel = document.getElementById("entrega-handoff-panel");
  if (handoffPanel) handoffPanel.innerHTML = "";
  const handoffSummary = document.getElementById("entrega-handoff-summary");
  if (handoffSummary) handoffSummary.textContent = "";
  const list = document.getElementById("entrega-proc-list");
  const formWrap = document.getElementById("entrega-proc-form");
  if (list) list.innerHTML = "";
  if (formWrap) {
    formWrap.innerHTML = "";
    formWrap.classList.add("hidden");
    formWrap.setAttribute("aria-hidden", "true");
  }
}
function escapeHtml4(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function renderBadgeChips(item) {
  const badges = pendingRequirementBadges(item);
  if (!badges.length) return "";
  return badges.map(
    (b) => `<span class="entrega-proc-chip entrega-proc-chip--req">${escapeHtml4(BADGE_LABELS[b] || b)}</span>`
  ).join("");
}
function renderStatusChips(item) {
  const chips = [];
  if (item.comentado) chips.push('<span class="entrega-proc-chip">Comentado</span>');
  if (item.autorizado) chips.push('<span class="entrega-proc-chip">Autorizado</span>');
  if (item.agendado) chips.push('<span class="entrega-proc-chip">Agendado</span>');
  if (item.lockedBase) chips.push('<span class="entrega-proc-chip entrega-proc-chip--lock">Base</span>');
  return chips.join("");
}
function renderProcList() {
  const list = document.getElementById("entrega-proc-list");
  if (!list || !draftActor) return;
  if (!draftItems.length) {
    list.innerHTML = '<li class="entrega-proc-empty">Sin procedimientos. Usa + Agregar.</li>';
    return;
  }
  list.innerHTML = draftItems.map((item) => {
    if (item.type === "legacy_text") {
      const canDel2 = canDeletePendienteItem(item, draftActor);
      return `<li class="entrega-proc-card entrega-proc-card--legacy" data-item-id="${escapeHtml4(item.id)}">
          <div class="entrega-proc-card-main">
            <span class="entrega-proc-label">${escapeHtml4(item.text || "")}</span>
            <span class="entrega-proc-meta">Texto legado</span>
          </div>
          ${canDel2 ? `<button type="button" class="btn-med-secondary entrega-proc-delete" data-action="delete">Eliminar</button>` : ""}
        </li>`;
    }
    if (item.type !== "procedimiento") return "";
    const time = formatHHmm(item.scheduledAt);
    const canDel = canDeletePendienteItem(item, draftActor);
    const kindLabel = item.kind === "imagen" ? "Imagen" : "Otro";
    const flagRow = `
        <div class="entrega-proc-flags">
          <label><input type="checkbox" data-flag="comentado" ${item.comentado ? "checked" : ""}> Comentado</label>
          <label><input type="checkbox" data-flag="autorizado" ${item.autorizado ? "checked" : ""}> Autorizado</label>
          <label><input type="checkbox" data-flag="agendado" ${item.agendado ? "checked" : ""}> Agendado</label>
        </div>`;
    return `<li class="entrega-proc-card" data-item-id="${escapeHtml4(item.id)}">
        <div class="entrega-proc-card-main">
          <div class="entrega-proc-title-row">
            <span class="entrega-proc-label">${escapeHtml4(item.label)}</span>
            ${time ? `<span class="entrega-proc-time">${escapeHtml4(time)}</span>` : ""}
            <span class="entrega-proc-kind">${escapeHtml4(kindLabel)}</span>
          </div>
          <div class="entrega-proc-chips">${renderStatusChips(item)}${renderBadgeChips(item)}</div>
          ${flagRow}
        </div>
        ${canDel ? `<button type="button" class="btn-med-secondary entrega-proc-delete" data-action="delete">Eliminar</button>` : ""}
      </li>`;
  }).join("");
}
function updateItemFlags(itemId, flag, checked) {
  draftItems = draftItems.map((it) => {
    if (it.id !== itemId || it.type !== "procedimiento") return it;
    return {
      ...it,
      [flag]: !!checked,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  });
  renderProcList();
}
function deleteItem(itemId) {
  const item = draftItems.find((it) => it.id === itemId);
  if (!item || !draftActor || !canDeletePendienteItem(item, draftActor)) {
    toast3("No puedes eliminar este procedimiento.", "error");
    return;
  }
  draftItems = draftItems.filter((it) => it.id !== itemId);
  renderProcList();
}
function readFormFields(formEl) {
  const kindRaw = formEl.querySelector('[name="entrega-proc-kind"]')?.value;
  const kind = kindRaw === "otro" ? "otro" : "imagen";
  const label = String(formEl.querySelector('[name="entrega-proc-label"]')?.value || "").trim();
  const time = readTimeFromForm(formEl);
  return {
    kind,
    label,
    scheduledAt: scheduledAtFromTimeInput(time),
    comentado: !!formEl.querySelector('[name="entrega-proc-comentado"]')?.checked,
    autorizado: !!formEl.querySelector('[name="entrega-proc-autorizado"]')?.checked,
    agendado: !!formEl.querySelector('[name="entrega-proc-agendado"]')?.checked,
    requires: {
      familiar: !!formEl.querySelector('[name="entrega-req-familiar"]')?.checked,
      consentimiento: !!formEl.querySelector('[name="entrega-req-consentimiento"]')?.checked,
      anestesia: !!formEl.querySelector('[name="entrega-req-anestesia"]')?.checked
    }
  };
}
function checkPill(name, label, checked, extraClass = "", inputId = "") {
  const cls = ["entrega-check-pill", extraClass].filter(Boolean).join(" ");
  const idAttr = inputId ? ` id="${escapeHtml4(inputId)}"` : "";
  return `<label class="${cls}">
    <input type="checkbox" name="${name}"${idAttr} ${checked ? "checked" : ""}>
    <span>${escapeHtml4(label)}</span>
  </label>`;
}
function updateHandoffSummaryLine() {
  const text = handoffContextSummary(draftHandoffContext);
  const summary = document.getElementById("entrega-handoff-summary");
  const collapsed = document.getElementById("entrega-handoff-summary-collapsed");
  const display = text === "Sin resumen cl\xEDnico" ? "" : text;
  if (summary) summary.textContent = display;
  if (collapsed) collapsed.textContent = display;
}
function syncHandoffSupportCards(host) {
  const vasoOn = !!host.querySelector('[name="entrega-vaso-active"]')?.checked;
  const ventOn = !!host.querySelector('[name="entrega-vent-active"]')?.checked;
  host.querySelector('[data-handoff-card="vasopressor"]')?.classList.toggle("is-active", vasoOn);
  host.querySelector('[data-handoff-card="ventilation"]')?.classList.toggle("is-active", ventOn);
  host.querySelector('[data-handoff-detail="vasopressor"]')?.classList.toggle("is-hidden", !vasoOn);
  host.querySelector('[data-handoff-detail="ventilation"]')?.classList.toggle("is-hidden", !ventOn);
}
function readVasoUnitFromDom(host) {
  const agent = normalizeVasopressorAgent(
    host.querySelector("#entrega-vaso-agent")?.value || ""
  );
  if (agent === "vasopresina") return "ui_min";
  const selected = host.querySelector("[data-vaso-unit].is-selected");
  const unit = selected?.getAttribute("data-vaso-unit");
  if (unit === "mcg_min" || unit === "mcg_kg_min") return unit;
  return "mcg_kg_min";
}
function syncVasoUnitUi(host, unit) {
  const agent = normalizeVasopressorAgent(
    host.querySelector("#entrega-vaso-agent")?.value || ""
  );
  const coerced = coerceVasopressorUnit(agent, unit);
  const chipsRow = host.querySelector("[data-vaso-unit-chips]");
  const fixedRow = host.querySelector("[data-vaso-unit-fixed]");
  const isVaso = agent === "vasopresina";
  chipsRow?.classList.toggle("is-hidden", isVaso);
  fixedRow?.classList.toggle("is-hidden", !isVaso);
  host.querySelectorAll("[data-vaso-unit]").forEach((btn) => {
    const u = btn.getAttribute("data-vaso-unit");
    btn.classList.toggle("is-selected", !isVaso && u === coerced);
  });
}
function applyVasoAgentDefaults(host, opts = {}) {
  const agent = normalizeVasopressorAgent(
    host.querySelector("#entrega-vaso-agent")?.value || "norepinefrina"
  );
  const doseInp = host.querySelector("#entrega-vaso-dose");
  const defaults = defaultVasopressorInfusion(agent);
  if (opts.applyDefaults || !String(doseInp?.value || "").trim()) {
    if (doseInp) doseInp.value = defaults.dose;
  }
  syncVasoUnitUi(host, defaults.unit);
}
function buildVasoDoseMarkup(vas) {
  const agent = normalizeVasopressorAgent(vas.agent) || "norepinefrina";
  const unit = coerceVasopressorUnit(agent, vas.unit);
  const dose = String(vas.dose || defaultVasopressorInfusion(agent).dose);
  const agentOpts = VASOPRESSOR_AGENTS.map(
    (a) => `<option value="${escapeHtml4(a.value)}"${a.value === agent ? " selected" : ""}>${escapeHtml4(a.label)}</option>`
  ).join("");
  const unitChips = ["mcg_kg_min", "mcg_min"].map((u) => {
    const label = VASOPRESSOR_UNIT_LABELS[u];
    return `<button type="button" class="entrega-freq-chip entrega-vaso-unit-pill${unit === u && agent !== "vasopresina" ? " is-selected" : ""}" data-vaso-unit="${u}">${escapeHtml4(label)}</button>`;
  }).join("");
  const isVaso = agent === "vasopresina";
  return `
    <div class="entrega-vaso-dose">
      <div class="field-group">
        <label for="entrega-vaso-agent">Agente</label>
        <select id="entrega-vaso-agent" class="profile-input">${agentOpts}</select>
      </div>
      <div class="field-group entrega-vaso-dose-row">
        <label for="entrega-vaso-dose">Infusi\xF3n</label>
        <div class="entrega-vaso-dose-input-wrap">
          <input id="entrega-vaso-dose" class="profile-input entrega-vaso-dose-input" type="number"
            inputmode="decimal" step="0.01" min="0" placeholder="${escapeHtml4(
    VASOPRESSOR_INFUSION_DEFAULTS[agent]?.dose || "0.05"
  )}" value="${escapeHtml4(dose)}">
          <div class="entrega-vaso-unit-inline" role="group" aria-label="Unidad de infusi\xF3n">
            <div class="entrega-vaso-unit-chips${isVaso ? " is-hidden" : ""}" data-vaso-unit-chips>${unitChips}</div>
            <span class="entrega-vaso-unit-pill-fixed${isVaso ? "" : " is-hidden"}" data-vaso-unit-fixed>${escapeHtml4(VASOPRESSOR_UNIT_LABELS.ui_min)}</span>
          </div>
        </div>
      </div>
    </div>`;
}
function syncHandoffDraftFromDom(host) {
  const status = String(host.querySelector("#entrega-clinical-status")?.value || "");
  draftHandoffContext = normalizeHandoffContext({
    clinicalStatus: status,
    signedRefusal: !!host.querySelector("#entrega-signed-refusal")?.checked,
    show: !!host.querySelector("#entrega-show")?.checked,
    vasopressor: {
      active: !!host.querySelector('[name="entrega-vaso-active"]')?.checked,
      agent: normalizeVasopressorAgent(host.querySelector("#entrega-vaso-agent")?.value || ""),
      dose: String(host.querySelector("#entrega-vaso-dose")?.value || "").trim(),
      unit: readVasoUnitFromDom(host)
    },
    ventilation: {
      active: !!host.querySelector('[name="entrega-vent-active"]')?.checked,
      mode: String(host.querySelector("#entrega-vent-mode")?.value || "").trim(),
      fio2: String(host.querySelector("#entrega-vent-fio2")?.value || "").trim(),
      settings: String(host.querySelector("#entrega-vent-settings")?.value || "").trim()
    },
    notes: String(host.querySelector("#entrega-handoff-notes")?.value || "").trim()
  });
  syncHandoffSupportCards(host);
  updateHandoffSummaryLine();
}
function buildHandoffPanelMarkup(ctx, isCritical) {
  const norm = normalizeHandoffContext(ctx);
  const statusOpts = CLINICAL_STATUS_OPTIONS.map(
    (o) => `<option value="${escapeHtml4(o.value)}"${o.value === norm.clinicalStatus ? " selected" : ""}>${escapeHtml4(o.label)}</option>`
  ).join("");
  const ventModes = VENTILATION_MODES.map(
    (m) => `<option value="${escapeHtml4(m.value)}"${m.value === norm.ventilation.mode ? " selected" : ""}>${escapeHtml4(m.label)}</option>`
  ).join("");
  return `
    <div class="entrega-handoff-context-grid">
      <div class="field-group">
        <label for="entrega-clinical-status">Estado general</label>
        <select id="entrega-clinical-status" class="profile-input">${statusOpts}</select>
      </div>
      <div class="entrega-handoff-flags">
        <div class="entrega-check-section">
          <span class="entrega-check-section__label">Marcadores</span>
          <div class="entrega-check-pills">
            ${checkPill("entrega-critical", "Paciente cr\xEDtico", isCritical, "entrega-check-pill--alert", "entrega-critical")}
            ${checkPill("entrega-signed-refusal", "Negativas firmadas", norm.signedRefusal, "entrega-check-pill--alert", "entrega-signed-refusal")}
            ${checkPill("entrega-show", "Show", norm.show, "entrega-check-pill--alert", "entrega-show")}
          </div>
        </div>
      </div>
    </div>
    <div class="entrega-handoff-support">
      <div class="entrega-handoff-support-card${norm.vasopressor.active ? " is-active" : ""}" data-handoff-card="vasopressor">
        <div class="entrega-handoff-support-card__head">
          ${checkPill("entrega-vaso-active", "Vasopresor", norm.vasopressor.active)}
        </div>
        <div class="entrega-handoff-support-detail${norm.vasopressor.active ? "" : " is-hidden"}" data-handoff-detail="vasopressor">
          ${buildVasoDoseMarkup(norm.vasopressor)}
        </div>
      </div>
      <div class="entrega-handoff-support-card${norm.ventilation.active ? " is-active" : ""}" data-handoff-card="ventilation">
        <div class="entrega-handoff-support-card__head">
          ${checkPill("entrega-vent-active", "Ventilaci\xF3n / soporte resp.", norm.ventilation.active)}
        </div>
        <div class="entrega-handoff-support-detail${norm.ventilation.active ? "" : " is-hidden"}" data-handoff-detail="ventilation">
          <div class="field-group">
            <label for="entrega-vent-mode">Modalidad</label>
            <select id="entrega-vent-mode" class="profile-input">${ventModes}</select>
          </div>
          <div class="field-group">
            <label for="entrega-vent-fio2">FiO\u2082 / flujo</label>
            <input id="entrega-vent-fio2" class="profile-input" type="text" placeholder="ej. 40% \xB7 50 L/min" value="${escapeHtml4(norm.ventilation.fio2)}">
          </div>
          <div class="field-group">
            <label for="entrega-vent-settings">Par\xE1metros</label>
            <input id="entrega-vent-settings" class="profile-input" type="text" placeholder="PEEP, VT, presiones\u2026" value="${escapeHtml4(norm.ventilation.settings)}">
          </div>
        </div>
      </div>
    </div>
    <div class="field-group entrega-handoff-notes">
      <label for="entrega-handoff-notes">Notas breves de entrega</label>
      <input id="entrega-handoff-notes" class="profile-input" type="text" maxlength="240" placeholder="Antecedentes relevantes para la guardia\u2026" value="${escapeHtml4(norm.notes)}">
    </div>`;
}
function wireHandoffPanelOnce() {
  if (handoffUiWired) return;
  const host = document.getElementById("entrega-handoff-panel");
  if (!host) return;
  handoffUiWired = true;
  host.addEventListener("change", (ev) => {
    if (ev.target?.id === "entrega-vaso-agent") {
      applyVasoAgentDefaults(host, { applyDefaults: true });
    }
    if (ev.target?.name === "entrega-vaso-active" && ev.target.checked) {
      applyVasoAgentDefaults(host, { applyDefaults: true });
    }
    syncHandoffDraftFromDom(host);
  });
  host.addEventListener("input", () => syncHandoffDraftFromDom(host));
  host.addEventListener("click", (ev) => {
    const unitBtn = ev.target.closest("[data-vaso-unit]");
    if (!unitBtn || unitBtn.classList.contains("is-hidden")) return;
    host.querySelectorAll("[data-vaso-unit]").forEach((btn) => {
      btn.classList.toggle("is-selected", btn === unitBtn);
    });
    syncVasoUnitUi(host, unitBtn.getAttribute("data-vaso-unit") || "mcg_kg_min");
    syncHandoffDraftFromDom(host);
  });
}
function mountEntregaHandoffPanel(handoffContext, opts = {}) {
  wireHandoffPanelOnce();
  const host = document.getElementById("entrega-handoff-panel");
  if (!host) return;
  draftHandoffContext = normalizeHandoffContext(handoffContext, {
    signedRefusal: !!opts.signedRefusal
  });
  host.innerHTML = buildHandoffPanelMarkup(draftHandoffContext, !!opts.isCritical);
  syncHandoffSupportCards(host);
  applyVasoAgentDefaults(host);
  updateHandoffSummaryLine();
}
function readEntregaHandoffContext() {
  const host = document.getElementById("entrega-handoff-panel");
  if (host?.innerHTML) syncHandoffDraftFromDom(host);
  return normalizeHandoffContext(draftHandoffContext);
}
function readEntregaCriticalFromHandoff() {
  const host = document.getElementById("entrega-handoff-panel");
  if (!host) return false;
  const input = host.querySelector("#entrega-critical");
  return input instanceof HTMLInputElement ? input.checked : false;
}
function buildAddFormMarkup(prefill = null) {
  const p = prefill || {};
  const timeVal = p.scheduledAt ? formatHHmm(p.scheduledAt) : "";
  const kindIsOtro = p.kind === "otro";
  return `
    <div class="entrega-inline-form" role="group" aria-label="Agregar procedimiento">
      <div class="entrega-inline-form__head">
        <h4 class="entrega-inline-form__title">Nuevo procedimiento</h4>
        <button type="button" class="entrega-inline-form__close" data-action="cancel-form" aria-label="Cerrar">\xD7</button>
      </div>
      <div class="entrega-inline-form__grid">
        <div class="field-group">
          <label for="entrega-proc-kind">Tipo</label>
          <select id="entrega-proc-kind" name="entrega-proc-kind" class="profile-input">
            <option value="imagen" ${kindIsOtro ? "" : "selected"}>Imagen</option>
            <option value="otro" ${kindIsOtro ? "selected" : ""}>Otro</option>
          </select>
        </div>
        <div class="field-group entrega-inline-form__label-wide">
          <label for="entrega-proc-label">Descripci\xF3n</label>
          <input id="entrega-proc-label" name="entrega-proc-label" class="profile-input" type="text" required placeholder="Ej. TAC t\xF3rax, endoscopia\u2026" value="${escapeHtml4(p.label || "")}">
        </div>
        <div class="field-group entrega-inline-form__time">
          <span class="entrega-field-label-block">Hora</span>
          ${buildTimeSelectMarkup(timeVal, { allowBlank: false, picker: true })}
        </div>
      </div>
      <div class="entrega-check-section">
        <span class="entrega-check-section__label">Estado</span>
        <div class="entrega-check-pills">
          ${checkPill("entrega-proc-comentado", "Comentado", p.comentado)}
          ${checkPill("entrega-proc-autorizado", "Autorizado", p.autorizado)}
          ${checkPill("entrega-proc-agendado", "Agendado", p.agendado)}
        </div>
      </div>
      <div class="entrega-check-section">
        <span class="entrega-check-section__label">Requiere</span>
        <div class="entrega-check-pills">
          ${checkPill("entrega-req-familiar", "Familiar", p.requires?.familiar)}
          ${checkPill("entrega-req-consentimiento", "Consentimiento", p.requires?.consentimiento)}
          ${checkPill("entrega-req-anestesia", "Anestesia", p.requires?.anestesia)}
        </div>
      </div>
      <div class="entrega-inline-form__foot">
        <button type="button" class="entrega-foot-muted" data-action="save-template">Guardar plantilla</button>
        <div class="entrega-inline-form__foot-actions">
          <button type="button" class="btn-cancel" data-action="cancel-form">Cancelar</button>
          <button type="button" class="btn-save" data-action="add-item">A\xF1adir</button>
        </div>
      </div>
    </div>`;
}
function showAddForm(prefill = null) {
  const wrap = document.getElementById("entrega-proc-form");
  if (!wrap) return;
  wrap.innerHTML = buildAddFormMarkup(prefill);
  wrap.classList.remove("hidden");
  wrap.setAttribute("aria-hidden", "false");
  wrap.querySelector('[name="entrega-proc-label"]')?.focus();
}
function hideAddForm() {
  const wrap = document.getElementById("entrega-proc-form");
  if (!wrap) return;
  wrap.innerHTML = "";
  wrap.classList.add("hidden");
  wrap.setAttribute("aria-hidden", "true");
}
function payloadFromFormFields(fields) {
  return {
    kind: fields.kind,
    label: fields.label,
    requires: fields.requires,
    comentado: fields.comentado,
    autorizado: fields.autorizado,
    agendado: fields.agendado
  };
}
async function saveTemplateFromForm(formEl) {
  const fields = readFormFields(formEl);
  if (!fields.label) {
    toast3("Indica la etiqueta del procedimiento.", "error");
    return;
  }
  const name = typeof window.prompt === "function" ? window.prompt("Nombre de la plantilla:") : "";
  if (!name || !String(name).trim()) return;
  const scope = typeof window.confirm === "function" && window.confirm("\xBFGuardar como plantilla del equipo? (Cancelar = solo para ti)") ? "team" : "user";
  const api3 = dbApi5();
  const userId = String(clinicalSessionContext.user?.user_id || "");
  const payload = payloadFromFormFields(fields);
  try {
    if (scope === "team") {
      const teamId = draftSourceTeamId;
      if (!teamId) {
        toast3("Selecciona equipo de origen para plantilla de equipo.", "error");
        return;
      }
      if (!api3?.dbEntregaTemplateSaveTeam) throw new Error("Plantillas no disponibles");
      await api3.dbEntregaTemplateSaveTeam({
        teamId,
        createdBy: userId,
        name: String(name).trim(),
        payload
      });
    } else {
      if (!api3?.dbEntregaTemplateSaveUser) throw new Error("Plantillas no disponibles");
      await api3.dbEntregaTemplateSaveUser({
        userId,
        name: String(name).trim(),
        payload
      });
    }
    toast3("Plantilla guardada.", "success");
    await refreshTemplateCatalog(userId);
  } catch (err) {
    toast3(err?.message || "No se guard\xF3 la plantilla", "error");
  }
}
async function refreshTemplateCatalog(userId) {
  const api3 = dbApi5();
  if (!api3?.dbEntregaTemplateList) {
    templateCatalog = { user: [], team: [] };
    return;
  }
  const teamIds = draftSourceTeamId ? [draftSourceTeamId] : [];
  const res = await api3.dbEntregaTemplateList({ userId, teamIds });
  if (!res?.ok) {
    templateCatalog = { user: [], team: [] };
    return;
  }
  const pack = res.templates && typeof res.templates === "object" && !Array.isArray(res.templates) ? res.templates : res;
  templateCatalog = {
    user: Array.isArray(pack?.user) ? pack.user : [],
    team: Array.isArray(pack?.team) ? pack.team : []
  };
}
function showTemplatePicker() {
  const all = [
    ...templateCatalog.user.map((t2) => ({ ...t2, scopeLabel: "Mis plantillas" })),
    ...templateCatalog.team.map((t2) => ({ ...t2, scopeLabel: "Del equipo" }))
  ];
  if (!all.length) {
    toast3("No hay plantillas guardadas.", "info");
    return;
  }
  const wrap = document.getElementById("entrega-proc-form");
  if (!wrap) return;
  const options = all.map(
    (t2, i) => `<option value="${i}">[${escapeHtml4(t2.scopeLabel)}] ${escapeHtml4(t2.name)}</option>`
  ).join("");
  wrap.innerHTML = `
    <div class="entrega-inline-form entrega-inline-form--picker" role="group" aria-label="Aplicar plantilla">
      <div class="entrega-inline-form__head">
        <h4 class="entrega-inline-form__title">Plantillas</h4>
        <button type="button" class="entrega-inline-form__close" data-action="cancel-form" aria-label="Cerrar">\xD7</button>
      </div>
      <div class="field-group">
        <label for="entrega-template-pick">Elegir plantilla</label>
        <select id="entrega-template-pick" class="profile-input">${options}</select>
      </div>
      <div class="entrega-inline-form__foot">
        <div class="entrega-inline-form__foot-actions entrega-inline-form__foot-actions--end">
          <button type="button" class="btn-cancel" data-action="cancel-form">Cancelar</button>
          <button type="button" class="btn-save" data-action="apply-template">Continuar</button>
        </div>
      </div>
    </div>`;
  wrap.classList.remove("hidden");
  wrap.setAttribute("aria-hidden", "false");
  wrap.querySelector('[data-action="apply-template"]')?.addEventListener("click", () => {
    const idx = parseInt(wrap.querySelector("#entrega-template-pick")?.value || "0", 10);
    const picked = all[idx];
    if (!picked?.payload) return;
    const prefill = {
      ...picked.payload,
      scheduledAt: null
    };
    showAddForm(prefill);
  });
}
function addItemFromForm(formEl) {
  if (!draftActor) {
    toast3("No se pudo agregar el procedimiento. Cierra y vuelve a abrir la entrega.", "error");
    return;
  }
  const fields = readFormFields(formEl);
  if (!fields.label) {
    toast3("Indica la etiqueta del procedimiento.", "error");
    return;
  }
  const item = createProcedimientoItem({
    ...fields,
    lockedBase: draftActor.role === "diurno",
    createdBy: draftActor.userId ? { userId: draftActor.userId, rank: draftActor.rank || "" } : null
  });
  draftItems.push(item);
  hideAddForm();
  renderProcList();
}
function wireProcUiOnce() {
  if (uiWired) return;
  const root = document.getElementById("entrega-modal-backdrop");
  if (!root) return;
  uiWired = true;
  root.addEventListener("click", (ev) => {
    if (ev.target.closest("#btn-entrega-add-proc")) {
      ev.preventDefault();
      showAddForm();
      return;
    }
    if (ev.target.closest("#btn-entrega-apply-template")) {
      ev.preventDefault();
      showTemplatePicker();
    }
  });
  root.addEventListener("click", (ev) => {
    const delBtn = ev.target.closest('#entrega-proc-list [data-action="delete"]');
    if (!delBtn) return;
    const card = delBtn.closest("[data-item-id]");
    const id = card?.getAttribute("data-item-id");
    if (id) deleteItem(id);
  });
  root.addEventListener("change", (ev) => {
    const input = ev.target;
    if (!(input instanceof HTMLInputElement) || !input.dataset.flag) return;
    if (!input.closest("#entrega-proc-list")) return;
    const card = input.closest("[data-item-id]");
    const id = card?.getAttribute("data-item-id");
    if (id) updateItemFlags(id, input.dataset.flag, input.checked);
  });
  root.addEventListener("click", (ev) => {
    const btn = ev.target.closest("#entrega-proc-form [data-action]");
    if (!btn) return;
    const formWrap = document.getElementById("entrega-proc-form");
    if (!formWrap) return;
    const action = btn.getAttribute("data-action");
    const inner = formWrap.querySelector(".entrega-inline-form");
    if (action === "cancel-form") {
      hideAddForm();
      return;
    }
    if (!inner) return;
    if (action === "add-item") addItemFromForm(inner);
    if (action === "save-template") void saveTemplateFromForm(inner);
  });
  const teamSelect = document.getElementById("entrega-source-team");
  if (teamSelect && !teamSelect._rpcEntregaTeamWired) {
    teamSelect._rpcEntregaTeamWired = true;
    teamSelect.addEventListener("change", (ev) => {
      draftSourceTeamId = String(ev.target?.value || "");
      const userId = String(clinicalSessionContext.user?.user_id || "");
      refreshTemplateCatalog(userId).catch(() => {
      });
    });
  }
}
function updateVitalsSummary() {
  const summary = document.getElementById("entrega-vitals-summary");
  if (summary) summary.textContent = vitalsPlanSummary(draftVitalsPlan);
}
function mergeIntervalFrequency(patch) {
  const cur = normalizeFrequencySpec(draftVitalsPlan.frequency);
  const base = cur.mode === "interval" ? cur : { mode: "interval", hours: 2 };
  return normalizeFrequencySpec({ ...base, mode: "interval", ...patch });
}
function buildVitalsUntilTimeMarkup(hhmm, scope) {
  const enabled = !!hhmm;
  return `
    <div class="entrega-freq-until">
      <label class="entrega-check-pill entrega-freq-until-toggle">
        <input type="checkbox" data-vitals-until-enable${enabled ? " checked" : ""}>
        <span>Detener a las</span>
      </label>
      ${buildTimeSelectMarkup(hhmm || "07:00", {
    hourName: `entrega-vitals-until-hour-${scope}`,
    minuteName: `entrega-vitals-until-minute-${scope}`,
    ariaLabel: "Hora de fin",
    allowBlank: false,
    picker: true,
    wrapperClass: `entrega-freq-until-time entrega-time-picker--compact${enabled ? "" : " is-disabled"}`,
    disabled: !enabled
  })}
    </div>`;
}
function activeVitalsFreqPanel(host) {
  return host.querySelector("#entrega-freq-interval-panel:not(.is-hidden)") || host.querySelector("#entrega-freq-shift-panel:not(.is-hidden)");
}
function readVitalsUntilTimeFromHost(host) {
  const panel = activeVitalsFreqPanel(host);
  if (!panel) return null;
  if (!panel.querySelector("[data-vitals-until-enable]")?.checked) return null;
  const hour = String(
    panel.querySelector('[name^="entrega-vitals-until-hour"]')?.value || ""
  ).trim();
  const minute = String(
    panel.querySelector('[name^="entrega-vitals-until-minute"]')?.value || ""
  ).trim();
  if (!hour || !minute) return null;
  return normalizeUntilTime(`${hour}:${minute}`);
}
function wireVitalsUntilPanel(host, panel) {
  if (!panel) return;
  const untilEnable = panel.querySelector("[data-vitals-until-enable]");
  const untilTimeWrap = panel.querySelector(".entrega-freq-until-time");
  const setUntilEnabled = (on) => {
    untilTimeWrap?.classList.toggle("is-disabled", !on);
    untilTimeWrap?.querySelectorAll("select").forEach((sel) => {
      sel.disabled = !on;
    });
    if (on) {
      const hSel = panel.querySelector('[name^="entrega-vitals-until-hour"]');
      const mSel = panel.querySelector('[name^="entrega-vitals-until-minute"]');
      if (hSel && !hSel.value) hSel.value = "07";
      if (mSel && !mSel.value) mSel.value = "00";
    }
    syncFrequencyDraftFromDom(host);
  };
  untilEnable?.addEventListener("change", () => setUntilEnabled(!!untilEnable.checked));
  untilTimeWrap?.querySelectorAll("select").forEach((sel) => {
    sel.addEventListener("change", () => syncFrequencyDraftFromDom(host));
  });
}
function readFrequencyFromDom(host) {
  const mode = String(
    host.querySelector('input[name="entrega-freq-mode"]:checked')?.value || "routine"
  );
  const untilTime = readVitalsUntilTimeFromHost(host);
  if (mode === "interval") {
    const hours = Number(host.querySelector("#entrega-vitals-hours")?.value || 2);
    return normalizeFrequencySpec({
      mode: "interval",
      hours,
      untilTime
    });
  }
  if (mode === "shift") {
    const chip = host.querySelector("[data-freq-shift].is-selected");
    const times = Number(chip?.getAttribute("data-freq-shift") || 1);
    return normalizeFrequencySpec({
      mode: "shift",
      timesPerShift: times,
      untilTime
    });
  }
  return { mode: "routine" };
}
function syncFrequencyDraftFromDom(host) {
  draftVitalsPlan = normalizeVitalsPlan({
    ...draftVitalsPlan,
    frequency: readFrequencyFromDom(host)
  });
  updateVitalsSummary();
}
function syncVitalsFreqUi(host) {
  const freq = normalizeFrequencySpec(draftVitalsPlan.frequency);
  const mode = freq.mode;
  host.querySelectorAll('input[name="entrega-freq-mode"]').forEach((input) => {
    if (input instanceof HTMLInputElement) input.checked = input.value === mode;
  });
  host.querySelector("#entrega-freq-interval-panel")?.classList.toggle("is-hidden", mode !== "interval");
  host.querySelector("#entrega-freq-shift-panel")?.classList.toggle("is-hidden", mode !== "shift");
  const slot = host.querySelector(".entrega-vitals-freq-detail-slot");
  slot?.setAttribute("aria-hidden", mode === "routine" ? "true" : "false");
  if (mode === "interval") {
    const hours = freq.mode === "interval" ? freq.hours ?? 2 : 2;
    const hoursInp = host.querySelector("#entrega-vitals-hours");
    if (hoursInp instanceof HTMLInputElement) hoursInp.value = String(hours);
    host.querySelectorAll("[data-freq-hours]").forEach((chip) => {
      chip.classList.toggle(
        "is-selected",
        Number(chip.getAttribute("data-freq-hours")) === hours
      );
    });
  }
  if (mode === "shift") {
    const times = freq.mode === "shift" ? freq.timesPerShift ?? 1 : 1;
    host.querySelectorAll("[data-freq-shift]").forEach((chip) => {
      chip.classList.toggle(
        "is-selected",
        Number(chip.getAttribute("data-freq-shift")) === times
      );
    });
  }
  updateVitalsSummary();
}
function renderVitalsPanel() {
  const host = document.getElementById("entrega-vitals-panel");
  if (!host) return;
  const plan = normalizeVitalsPlan(draftVitalsPlan);
  draftVitalsPlan = plan;
  const freq = plan.frequency;
  const metricChecks = VITALS_METRIC_KEYS.map(
    (key) => `<label class="entrega-check-pill"><input type="checkbox" data-vital-metric="${key}" ${plan.metrics[key] ? "checked" : ""}><span>${escapeHtml4(VITALS_METRIC_LABELS[key])}</span></label>`
  ).join("");
  const modeLabels = { routine: "Rutina", interval: "Intervalo", shift: "Por turno" };
  const modePills = ["routine", "interval", "shift"].map(
    (mode) => `<label class="entrega-check-pill entrega-freq-mode-pill">
          <input type="radio" name="entrega-freq-mode" value="${mode}" ${freq.mode === mode ? "checked" : ""}>
          <span>${modeLabels[mode]}</span>
        </label>`
  ).join("");
  const hourChips = VITALS_FREQ_HOUR_PRESETS.map(
    (h) => `<button type="button" class="entrega-freq-chip${freq.mode === "interval" && freq.hours === h ? " is-selected" : ""}" data-freq-hours="${h}">${h} h</button>`
  ).join("");
  const shiftChips = VITALS_FREQ_SHIFT_OPTIONS.map(
    (t2) => `<button type="button" class="entrega-freq-chip${freq.mode === "shift" && freq.timesPerShift === t2 ? " is-selected" : ""}" data-freq-shift="${t2}">${t2}\xD7</button>`
  ).join("");
  const hoursVal = freq.mode === "interval" ? freq.hours ?? 2 : 2;
  const untilInterval = buildVitalsUntilTimeMarkup(
    freq.mode === "interval" ? freq.untilTime : null,
    "interval"
  );
  const untilShift = buildVitalsUntilTimeMarkup(
    freq.mode === "shift" ? freq.untilTime : null,
    "shift"
  );
  host.innerHTML = `
    <div class="entrega-vitals-form">
      <div class="entrega-vitals-form__scroll">
        <section class="entrega-vitals-section" aria-labelledby="entrega-vitals-metrics-label">
          <h5 class="entrega-vitals-section__title" id="entrega-vitals-metrics-label">Par\xE1metros</h5>
          <div
            class="entrega-check-pills entrega-vitals-metrics"
            role="group"
            aria-labelledby="entrega-vitals-metrics-label"
          >${metricChecks}</div>
        </section>
        <section class="entrega-vitals-section" aria-labelledby="entrega-vitals-freq-label">
          <h5 class="entrega-vitals-section__title" id="entrega-vitals-freq-label">Frecuencia</h5>
          <div class="entrega-vitals-freq" role="group" aria-labelledby="entrega-vitals-freq-label">
            <div class="entrega-freq-segment entrega-check-pills entrega-freq-modes" role="radiogroup" aria-label="Modo de frecuencia">
              ${modePills}
            </div>
            <div class="entrega-vitals-freq-detail-slot" aria-hidden="${freq.mode === "routine"}">
              <div class="entrega-freq-panel${freq.mode === "interval" ? "" : " is-hidden"}" id="entrega-freq-interval-panel">
                <div class="entrega-freq-detail-card">
                  <div class="entrega-freq-detail__row">
                    <span class="entrega-freq-detail__row-label">Atajos</span>
                    <div class="entrega-freq-chips" role="group" aria-label="Atajos cada N horas">${hourChips}</div>
                  </div>
                  <div class="entrega-freq-detail__row-split">
                    <div class="entrega-freq-detail__cell">
                      <span class="entrega-freq-detail__cell-label">Cada</span>
                      <div class="entrega-freq-stepper" role="group" aria-label="Intervalo en horas">
                        <button type="button" class="entrega-freq-step" data-hours-dec aria-label="Menos horas">\u2212</button>
                        <input
                          type="number"
                          id="entrega-vitals-hours"
                          class="entrega-freq-hours-input"
                          min="1"
                          max="24"
                          step="1"
                          inputmode="numeric"
                          value="${hoursVal}"
                          aria-label="Cada cu\xE1ntas horas"
                        >
                        <button type="button" class="entrega-freq-step" data-hours-inc aria-label="M\xE1s horas">+</button>
                      </div>
                      <span class="entrega-freq-interval-suffix">horas</span>
                    </div>
                    <div class="entrega-freq-detail__cell entrega-freq-detail__cell--until">
                      ${untilInterval}
                    </div>
                  </div>
                </div>
              </div>
              <div class="entrega-freq-panel${freq.mode === "shift" ? "" : " is-hidden"}" id="entrega-freq-shift-panel">
                <div class="entrega-freq-detail-card">
                  <div class="entrega-freq-detail__row">
                    <span class="entrega-freq-detail__row-label">Veces</span>
                    <div class="entrega-freq-chips" role="group" aria-label="Veces por turno">${shiftChips}</div>
                  </div>
                  <div class="entrega-freq-detail__row">
                    <span class="entrega-freq-detail__row-label">Fin</span>
                    <div class="entrega-freq-detail__cell entrega-freq-detail__cell--until">
                      ${untilShift}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <p class="entrega-vitals-summary" id="entrega-vitals-summary" role="status">${escapeHtml4(vitalsPlanSummary(plan))}</p>
    </div>`;
  host.querySelectorAll("[data-vital-metric]").forEach((input) => {
    input.addEventListener("change", () => {
      const key = input.getAttribute("data-vital-metric");
      if (!key) return;
      draftVitalsPlan = normalizeVitalsPlan({
        ...draftVitalsPlan,
        metrics: {
          ...draftVitalsPlan.metrics,
          [key]: input.checked
        }
      });
      updateVitalsSummary();
    });
  });
  host.querySelectorAll('input[name="entrega-freq-mode"]').forEach((input) => {
    input.addEventListener("change", () => {
      const mode = String(input.value || "routine");
      if (mode === "interval") {
        draftVitalsPlan = normalizeVitalsPlan({
          ...draftVitalsPlan,
          frequency: mergeIntervalFrequency({ hours: 2 })
        });
      } else if (mode === "shift") {
        const cur = normalizeFrequencySpec(draftVitalsPlan.frequency);
        draftVitalsPlan = normalizeVitalsPlan({
          ...draftVitalsPlan,
          frequency: normalizeFrequencySpec({
            mode: "shift",
            timesPerShift: 1,
            untilTime: cur.untilTime
          })
        });
      } else {
        draftVitalsPlan = normalizeVitalsPlan({
          ...draftVitalsPlan,
          frequency: { mode: "routine" }
        });
      }
      syncVitalsFreqUi(host);
    });
  });
  host.querySelectorAll("[data-freq-hours]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const hours = Number(btn.getAttribute("data-freq-hours") || 2);
      draftVitalsPlan = normalizeVitalsPlan({
        ...draftVitalsPlan,
        frequency: mergeIntervalFrequency({ hours })
      });
      syncVitalsFreqUi(host);
    });
  });
  host.querySelectorAll("[data-freq-shift]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const timesPerShift = Number(btn.getAttribute("data-freq-shift") || 1);
      const cur = normalizeFrequencySpec(draftVitalsPlan.frequency);
      draftVitalsPlan = normalizeVitalsPlan({
        ...draftVitalsPlan,
        frequency: normalizeFrequencySpec({
          mode: "shift",
          timesPerShift,
          untilTime: cur.untilTime
        })
      });
      syncVitalsFreqUi(host);
    });
  });
  wireVitalsUntilPanel(host, host.querySelector("#entrega-freq-interval-panel"));
  wireVitalsUntilPanel(host, host.querySelector("#entrega-freq-shift-panel"));
  const hoursInp = host.querySelector("#entrega-vitals-hours");
  const bumpHours = (delta) => {
    const cur = Number(hoursInp?.value || 2);
    const next = Math.min(24, Math.max(1, cur + delta));
    if (hoursInp) hoursInp.value = String(next);
    draftVitalsPlan = normalizeVitalsPlan({
      ...draftVitalsPlan,
      frequency: mergeIntervalFrequency({ hours: next })
    });
    host.querySelectorAll("[data-freq-hours]").forEach((chip) => {
      chip.classList.toggle(
        "is-selected",
        Number(chip.getAttribute("data-freq-hours")) === next
      );
    });
    updateVitalsSummary();
  };
  host.querySelector("[data-hours-dec]")?.addEventListener("click", () => bumpHours(-1));
  host.querySelector("[data-hours-inc]")?.addEventListener("click", () => bumpHours(1));
  hoursInp?.addEventListener("change", () => syncFrequencyDraftFromDom(host));
  hoursInp?.addEventListener("input", () => syncFrequencyDraftFromDom(host));
}
function readEntregaVitalsPlan() {
  const host = document.getElementById("entrega-vitals-panel");
  if (!host) return normalizeVitalsPlan(draftVitalsPlan);
  const metrics = { ...draftVitalsPlan.metrics };
  host.querySelectorAll("[data-vital-metric]").forEach((input) => {
    const key = input.getAttribute("data-vital-metric");
    if (key) metrics[key] = !!input.checked;
  });
  return normalizeVitalsPlan({ frequency: readFrequencyFromDom(host), metrics });
}
function mountEntregaVitalsPanel(opts = {}) {
  if (opts.vitalsPlan) {
    draftVitalsPlan = normalizeVitalsPlan(opts.vitalsPlan);
  } else if (opts.vitalsFrequency) {
    draftVitalsPlan = normalizeVitalsPlan({
      ...defaultVitalsPlan(),
      frequency: normalizeFrequencySpec(opts.vitalsFrequency)
    });
  } else {
    draftVitalsPlan = defaultVitalsPlan();
  }
  renderVitalsPanel();
}
async function mountEntregaPendientesUi(opts) {
  wireProcUiOnce();
  draftActor = opts.actor;
  draftSourceTeamId = String(opts.sourceTeamId || "");
  const doc = normalizePendientesJson(opts.pendientesJson || "");
  draftItems = doc.items.slice();
  mountEntregaHandoffPanel(doc.handoffContext, {
    isCritical: !!opts.isCritical,
    signedRefusal: !!opts.signedRefusal
  });
  mountEntregaVitalsPanel({
    vitalsPlan: doc.vitalsPlan,
    vitalsFrequency: opts.vitalsFrequency
  });
  hideAddForm();
  renderProcList();
  const userId = String(clinicalSessionContext.user?.user_id || "");
  await refreshTemplateCatalog(userId);
}

// public/js/features/clinical-entrega.mjs
function resolveEntregaActorRole2(currentUser, existingGuardia) {
  return resolveEntregaActorRole(currentUser, existingGuardia);
}
var GUARDIA_GRID_MODE_KEY = "guardia.gridMode";
var ENTREGA_PHASE_KEY = "guardia.entregaPhase";
function normalizeUsers(users) {
  return (users || []).map((u) => ({
    user_id: String(u.user_id || u.userId || ""),
    username: String(u.username || ""),
    rank: String(u.rank || ""),
    clinical_name: String(u.clinical_name || "")
  })).filter((u) => u.user_id);
}
function userOptionLabel(u) {
  const handle = String(u.username || u.user_id || "");
  const name = String(u.clinical_name || "").trim();
  const rank = String(u.rank || "");
  return name ? `${handle} \xB7 ${name} (${rank})` : `${handle} (${rank})`;
}
function uniqueByUserId(list) {
  const seen = /* @__PURE__ */ new Set();
  return list.filter((u) => {
    if (seen.has(u.user_id)) return false;
    seen.add(u.user_id);
    return true;
  });
}
function ensureEntregaTargetUser(targetList, users, userId, fallbackLabel = "") {
  const id = String(userId || "").trim();
  if (!id || targetList.some((u) => u.user_id === id)) return targetList;
  const match = normalizeUsers(users).find((u) => u.user_id === id);
  if (match) return [match, ...targetList];
  return [
    {
      user_id: id,
      username: fallbackLabel || "Residente de guardia",
      rank: "R1",
      clinical_name: ""
    },
    ...targetList
  ];
}
function collectEntregaScopeUsers(scopeContext, teams, sessionUser = null) {
  const parts = [];
  if (Array.isArray(scopeContext?.users)) parts.push(...scopeContext.users);
  for (const team of teams || []) {
    for (const m of team.members || []) {
      if (!m?.user_id) continue;
      parts.push({
        user_id: m.user_id,
        username: m.username,
        rank: m.rank,
        clinical_name: m.clinical_name
      });
    }
  }
  if (sessionUser?.user_id) parts.push(sessionUser);
  return uniqueByUserId(normalizeUsers(parts));
}
function listEntregaTargets(rank, teams, users, salaDeficit, opts = {}) {
  const currentUserId2 = String(opts.currentUserId || "");
  const now = opts.now ? new Date(String(opts.now)) : /* @__PURE__ */ new Date();
  const all = normalizeUsers(users);
  const teamList = Array.isArray(teams) ? teams : [];
  const rankNorm = String(rank || "R1");
  const joinedTeams = currentUserId2 ? getJoinedTeams(teamList, currentUserId2) : [];
  if (rankNorm === "R3") {
    const suggestedIds = /* @__PURE__ */ new Set();
    teamList.forEach((team) => {
      if (!isOnCallToday(team, "R3", now)) return;
      (team.members || []).forEach((m) => {
        if (m?.user_id) suggestedIds.add(String(m.user_id));
      });
    });
    const targets = all.filter((u) => suggestedIds.has(u.user_id));
    return {
      flow: "r3_suggest",
      targets: targets.length ? uniqueByUserId(targets) : all
    };
  }
  if (rankNorm === "R2") {
    const r2GuardiaOnCall = salaOnCallR2(teamList, now);
    const r2GuardiaIds = new Set(r2GuardiaOnCall.map((r) => r.user_id));
    const r2GuardiaUsers = all.filter((u) => r2GuardiaIds.has(u.user_id));
    const r4s = all.filter((u) => u.rank === "R4");
    const targets = uniqueByUserId([...r2GuardiaUsers, ...r4s]);
    return { flow: "r2_handoff", targets: targets.length ? targets : all };
  }
  if (rankNorm === "R1") {
    let userSala = "";
    for (const t2 of joinedTeams) {
      const sala = String(t2.sala || "").trim();
      if (sala) {
        userSala = sala;
        break;
      }
    }
    const onCallIds = new Set(
      (userSala ? salaOnCallR1(teamList, userSala, now) : []).map((r) => String(r.user_id))
    );
    const onCallTargets = all.filter((u) => u.rank === "R1" && onCallIds.has(u.user_id));
    const joinedIds = new Set(joinedTeams.map((t2) => String(t2.team_id)));
    const fractions = new Set(
      joinedTeams.map((t2) => String(t2.sub_area_fraction || "").trim()).filter(Boolean)
    );
    const peerTargets = all.filter((u) => {
      if (u.rank !== "R1") return false;
      return teamList.some((team) => {
        const member = (team.members || []).some((m) => String(m.user_id) === u.user_id);
        if (!member) return false;
        if (joinedIds.has(String(team.team_id))) return true;
        const frac = String(team.sub_area_fraction || "").trim();
        return frac && fractions.has(frac);
      });
    });
    const targets = uniqueByUserId([...onCallTargets, ...peerTargets]);
    return { flow: "r1", targets: targets.length ? targets : all };
  }
  return { flow: "generic", targets: all };
}
function dbApi6() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
function toast4(msg, type = "info") {
  if (typeof window !== "undefined" && typeof window.showToast === "function") {
    window.showToast(msg, type);
  }
}
function resolveEntregaPatientRow(patientId) {
  const id = String(patientId || "");
  if (!id) return null;
  return (patients || []).find((p) => String(p.id) === id) || (clinicalSessionContext.scopeContext?.patients || []).find(
    (p) => String(p.id || p.patient_id) === id
  ) || null;
}
function entregaModalEl() {
  return document.getElementById("entrega-modal-backdrop");
}
function resolveDefaultSourceTeamId() {
  const userId = String(clinicalSessionContext.user?.user_id || "");
  const teams = clinicalSessionContext.teams || [];
  const joined = getJoinedTeams(teams, userId);
  if (joined[0]?.team_id) return String(joined[0].team_id);
  if (teams[0]?.team_id) return String(teams[0].team_id);
  return "";
}
async function submitEntregaAssignment(payload) {
  const api3 = dbApi6();
  if (!api3 || typeof api3.dbGuardiaUpsert !== "function") {
    throw new Error("Base cl\xEDnica no disponible");
  }
  const patientId = String(payload.patientId || "");
  const deltaData = {
    coveringUserId: payload.coveringUserId,
    sourceTeamId: payload.sourceTeamId,
    isCritical: !!payload.isCritical,
    pendientesJson: payload.pendientesJson || "[]",
    vitalsFrequency: payload.vitalsFrequency || "None"
  };
  await signOutgoingLiveSyncMutation(
    { patientId, entityId: patientId, data: deltaData, op: "entrega.assign" },
    "entrega.assign"
  );
  const res = await api3.dbGuardiaUpsert({
    patientId,
    coveringUserId: payload.coveringUserId,
    sourceTeamId: payload.sourceTeamId,
    guardiaId: payload.guardiaId,
    isCritical: payload.isCritical ? 1 : 0,
    pendientesJson: payload.pendientesJson || "[]",
    vitalsFrequency: payload.vitalsFrequency || "None"
  });
  if (!res || res.ok === false) {
    throw new Error(res?.error || "No se guard\xF3 la entrega");
  }
  return res.guardia;
}
var entregaFormWired = false;
function wireEntregaFormOnce() {
  if (entregaFormWired) return;
  entregaFormWired = true;
  const form = document.getElementById("entrega-form");
  const cancelBtn = document.getElementById("btn-entrega-cancel");
  const bd = entregaModalEl();
  if (cancelBtn) cancelBtn.addEventListener("click", () => closeEntregaModal());
  if (bd) {
    bd.addEventListener("click", (ev) => {
      if (ev.target === bd) closeEntregaModal();
    });
  }
  if (!form) return;
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const patientId = String(form.dataset.patientId || "");
    const guardiaId = form.dataset.guardiaId ? String(form.dataset.guardiaId) : void 0;
    const phaseCovering = getEntregaPhaseCoveringUserId();
    const existingGuardia = guardiaId ? clinicalSessionContext.guardias.find((g2) => String(g2.guardia_id) === guardiaId) : clinicalSessionContext.guardiasMap.get(patientId);
    const coveringUserId = String(
      document.getElementById("entrega-covering-user")?.value || phaseCovering || existingGuardia?.covering_user_id || ""
    );
    const sourceTeamId = String(document.getElementById("entrega-source-team")?.value || "") || resolveDefaultSourceTeamId();
    const isCritical = readEntregaCriticalFromHandoff();
    const vitalsPlan = readEntregaVitalsPlan();
    const vitalsFrequency = vitalsFrequencyForDb(vitalsPlan.frequency);
    const handoffContext = readEntregaHandoffContext();
    if (!patientId || !coveringUserId || !sourceTeamId) {
      toast4("Selecciona R1 de guardia y equipo de origen.", "error");
      return;
    }
    const pendientesJson = serializePendientesJson({
      version: 2,
      vitalsPlan,
      handoffContext,
      items: getEntregaDraftItems()
    });
    try {
      await submitEntregaAssignment({
        patientId,
        guardiaId,
        coveringUserId,
        sourceTeamId,
        isCritical,
        pendientesJson,
        vitalsFrequency
      });
      toast4("Entrega registrada.", "success");
      const onConfirm = form._entregaOnConfirm;
      closeEntregaModal();
      await refreshGuardiaCensusFromDb(null);
      scheduleLiveSyncPush();
      if (typeof onConfirm === "function") onConfirm();
    } catch (err) {
      toast4(err?.message || "Error al registrar entrega", "error");
    }
  });
}
function openEntregaModal(opts) {
  wireEntregaFormOnce();
  const bd = entregaModalEl();
  const form = document.getElementById("entrega-form");
  if (!bd || !form) return;
  const patientId = String(opts?.patientId || "");
  const guardiaId = opts?.guardiaId ? String(opts.guardiaId) : "";
  const existing = guardiaId ? clinicalSessionContext.guardias.find((g2) => String(g2.guardia_id) === guardiaId) : clinicalSessionContext.guardiasMap.get(patientId);
  form.dataset.patientId = patientId;
  if (guardiaId) form.dataset.guardiaId = guardiaId;
  else delete form.dataset.guardiaId;
  form._entregaOnConfirm = typeof opts?.onConfirm === "function" ? opts.onConfirm : null;
  const ctx = clinicalSessionContext.scopeContext || {};
  const teams = clinicalSessionContext.teams || ctx.teams || [];
  const users = collectEntregaScopeUsers(ctx, teams, clinicalSessionContext.user);
  const salaGuardiaToday = Array.isArray(ctx.salaGuardiaToday) ? ctx.salaGuardiaToday : [];
  const userId = String(clinicalSessionContext.user?.user_id || "");
  const rank = effectiveClinicalRank(clinicalSessionContext.user);
  const salaDeficit = computeSalaAbcdefDeficitWrite(
    salaGuardiaToday,
    teams,
    userId,
    /* @__PURE__ */ new Date()
  );
  const { targets, flow } = listEntregaTargets(rank, teams, users, salaDeficit, {
    currentUserId: userId
  });
  const select = document.getElementById("entrega-covering-user");
  const teamSelect = document.getElementById("entrega-source-team");
  const hint = document.getElementById("entrega-flow-hint");
  if (select) {
    const phase = getEntregaPhase();
    const phaseCovering = getEntregaPhaseCoveringUserId();
    let preferred = existing?.covering_user_id ? String(existing.covering_user_id) : phaseCovering || "";
    if (!existing && clinicalSessionContext.guardiaMode && !phase?.active) {
      const sala = resolveUserSalaForEntrega(teams, userId);
      const selfCovering = sala ? resolveR1GuardiaCovering(teams, users, sala) : null;
      if (selfCovering?.coveringUserId === userId) {
        preferred = userId;
      }
    }
    let targetList = [...targets];
    for (const id of [preferred, phaseCovering]) {
      targetList = ensureEntregaTargetUser(
        targetList,
        users,
        id,
        phase?.coveringLabel || ""
      );
    }
    if (!preferred && targetList[0]?.user_id) preferred = targetList[0].user_id;
    select.innerHTML = targetList.map((u) => `<option value="${u.user_id}">${userOptionLabel(u)}</option>`).join("");
    if (preferred) select.value = preferred;
    if (phase?.active && phaseCovering) {
      select.disabled = true;
      select.removeAttribute("required");
      const coverHint = document.getElementById("entrega-covering-hint");
      if (coverHint) {
        coverHint.textContent = `Entrega activa \u2192 ${phase.coveringLabel || "R1 de guardia"}. Este paciente se entregar\xE1 a esa persona.`;
      }
    } else {
      select.disabled = false;
      select.setAttribute("required", "");
      const coverHint = document.getElementById("entrega-covering-hint");
      if (coverHint) {
        coverHint.textContent = "Residente de guardia que asumir\xE1 la cobertura nocturna de este paciente.";
      }
    }
  }
  if (teamSelect) {
    const joined = getJoinedTeams(teams, userId);
    const teamOptions = (joined.length ? joined : teams).filter((t2) => t2?.team_id);
    teamSelect.innerHTML = teamOptions.map((t2) => `<option value="${t2.team_id}">${t2.name} \xB7 ${t2.service}</option>`).join("");
    const src = existing?.source_team_id || resolveDefaultSourceTeamId();
    if (src) teamSelect.value = src;
  }
  if (hint) {
    const flowLabels = {
      r2: "R2: mismo servicio, R4, o cubridores Sala en d\xE9ficit.",
      r2_handoff: "R2: selecciona R4 de Sala y R2 de guardia (dos entregas separadas).",
      r3_suggest: "R3: sugeridos por d\xEDa de guardia del equipo (confirma).",
      generic: "Cualquier usuario registrado."
    };
    if (flow === "r1") {
      hint.textContent = "";
      hint.hidden = true;
    } else {
      hint.textContent = flowLabels[flow] || flowLabels.generic;
      hint.hidden = false;
    }
  }
  const actor = resolveEntregaActorRole2(clinicalSessionContext.user, existing);
  const srcTeam = existing?.source_team_id || resolveDefaultSourceTeamId();
  const patientRow = resolveEntregaPatientRow(patientId);
  void mountEntregaPendientesUi({
    actor,
    pendientesJson: existing?.pendientes_json,
    sourceTeamId: srcTeam,
    vitalsFrequency: existing?.vitals_frequency,
    isCritical: !!existing?.is_critical,
    signedRefusal: !!Number(patientRow?.negativa_maniobras_firmada)
  });
  const title = document.getElementById("entrega-modal-title");
  if (title) {
    if (guardiaId || existing?.guardia_id) {
      title.textContent = actor.role === "guardia" ? "Pendientes de guardia" : "Actualizar entrega";
    } else if (clinicalSessionContext.guardiaMode) {
      title.textContent = "Entrega / pendientes";
    } else {
      title.textContent = "Nueva entrega";
    }
  }
  bd.classList.add("open");
  bd.setAttribute("aria-hidden", "false");
  select?.focus();
}
function closeEntregaModal() {
  const bd = entregaModalEl();
  if (!bd) return;
  bd.classList.remove("open");
  bd.setAttribute("aria-hidden", "true");
  resetEntregaModalUi();
  const form = document.getElementById("entrega-form");
  if (form) form._entregaOnConfirm = null;
}
function resolveR1GuardiaCovering(teams, users, sala, now = /* @__PURE__ */ new Date()) {
  const salaNorm = String(sala || "").trim();
  if (!salaNorm) return null;
  const onCall = salaOnCallR1(teams, salaNorm, now);
  if (!onCall.length) return null;
  const pick = onCall[0];
  const u = normalizeUsers(users).find((x) => x.user_id === String(pick.user_id));
  return {
    coveringUserId: String(pick.user_id),
    teamId: String(pick.team_id || ""),
    sala: salaNorm,
    coveringLabel: u ? userOptionLabel(u) : String(pick.user_id)
  };
}
function resolveUserSalaForEntrega(teams, userId) {
  const fromProfile = String(clinicalSessionContext.user?.sala || "").trim();
  if (fromProfile) return fromProfile;
  const joined = getJoinedTeams(teams || [], userId);
  for (const t2 of joined) {
    const sala = String(t2.sala || "").trim();
    if (sala) return sala;
  }
  return "";
}
function getEntregaPhase() {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(ENTREGA_PHASE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (o && o.active) return o;
  } catch {
  }
  return null;
}
function isEntregaPhaseActive() {
  return !!getEntregaPhase()?.active;
}
function getEntregaPhaseCoveringUserId() {
  return String(getEntregaPhase()?.coveringUserId || "");
}
function startEntregaPhase(covering) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(GUARDIA_GRID_MODE_KEY);
    localStorage.setItem(
      ENTREGA_PHASE_KEY,
      JSON.stringify({
        active: true,
        coveringUserId: String(covering.coveringUserId || ""),
        sala: String(covering.sala || ""),
        coveringLabel: String(covering.coveringLabel || ""),
        teamId: String(covering.teamId || ""),
        startedAt: (/* @__PURE__ */ new Date()).toISOString()
      })
    );
  } catch {
  }
}
function endEntregaPhase() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(ENTREGA_PHASE_KEY);
    localStorage.removeItem(GUARDIA_GRID_MODE_KEY);
  } catch {
  }
}
function toggleEntregaPhase(opts = {}) {
  if (isEntregaPhaseActive()) {
    endEntregaPhase();
    toast4("Fase de entrega finalizada.", "info");
    opts.renderGuardiaBoard?.(opts.settings);
    return { active: false };
  }
  const ctx = clinicalSessionContext.scopeContext || {};
  const teams = clinicalSessionContext.teams || ctx.teams || [];
  const users = collectEntregaScopeUsers(ctx, teams, clinicalSessionContext.user);
  const userId = String(clinicalSessionContext.user?.user_id || "");
  const sala = resolveUserSalaForEntrega(teams, userId);
  if (!sala) {
    toast4("Indica tu Sala en el perfil cl\xEDnico o \xFAnete a un equipo de Sala.", "error");
    return { active: false };
  }
  const covering = resolveR1GuardiaCovering(teams, users, sala);
  if (!covering) {
    toast4(`No hay R1 de guardia en ${sala} hoy. Revisa \xABGuardia\xBB en Mi rotaci\xF3n.`, "error");
    return { active: false };
  }
  startEntregaPhase(covering);
  toast4(
    `Entrega activa \u2192 ${covering.coveringLabel}. Toca cada paciente para entregar.`,
    "success"
  );
  opts.renderGuardiaBoard?.(opts.settings);
  return { active: true, covering };
}
function loadGuardiaGridViewContext() {
  if (isEntregaPhaseActive()) return "HANDOFF";
  try {
    const mode = String(localStorage.getItem(GUARDIA_GRID_MODE_KEY) || "censo").toLowerCase();
    if (mode === "entrega") return "HANDOFF";
  } catch {
  }
  return "GUARDIA";
}

// public/js/features/guardia-board.mjs
var gridBoard = null;
var gridModeControlsWired = false;
var appShellInstalled = false;
function installGuardiaAppShell() {
  if (appShellInstalled || typeof window === "undefined") return;
  appShellInstalled = true;
  window.appShell = window.appShell || {};
  window.appShell.openEntregaModal = openEntregaModal;
}
function syncEntregaPhaseChrome() {
  const btn = document.getElementById("btn-guardia-entrega-phase");
  const status = document.getElementById("guardia-entrega-phase-status");
  const phase = getEntregaPhase();
  const active = !!phase?.active;
  if (btn) {
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
    btn.textContent = active ? "Salir de entrega" : "Entrega";
    btn.title = active ? "Terminar fase de entrega y volver al censo" : "Iniciar entrega al R1 de guardia de tu sala";
  }
  if (status) {
    if (active && phase?.coveringLabel) {
      status.hidden = false;
      status.textContent = `Entregando a ${phase.coveringLabel} \xB7 toca un paciente en el censo`;
    } else {
      status.hidden = true;
      status.textContent = "";
    }
  }
}
function wireGuardiaEntregaPhaseButton(settings) {
  if (gridModeControlsWired) return;
  gridModeControlsWired = true;
  const btn = document.getElementById("btn-guardia-entrega-phase");
  if (!btn) return;
  syncEntregaPhaseChrome();
  btn.addEventListener("click", () => {
    toggleEntregaPhase({
      settings,
      renderGuardiaBoard
    });
    syncEntregaPhaseChrome();
  });
}
function pendingTodoCount(pid) {
  return storage.getTodos(pid).filter((t2) => !t2.completed).length;
}
function labsSnippetForPatient(pid) {
  const history = storage.getLabHistory();
  const rows = Array.isArray(history[pid]) ? history[pid] : [];
  if (!rows.length) return "\u2014";
  const last = rows[rows.length - 1];
  const text = String(last?.text || last?.raw || "").replace(/\s+/g, " ").trim();
  if (!text) return "\u2014";
  const line = text.split("\n").find((l) => /★|crit|alter|↑|↓/i.test(l)) || text.split("\n")[0] || text;
  return line.slice(0, 48);
}
function lastMedicionHasAlterations(p) {
  const hist = p?.monitoreo?.historial;
  if (!Array.isArray(hist) || !hist.length) return false;
  const last = hist[hist.length - 1];
  const alt = last && typeof last === "object" ? (
    /** @type {any} */
    last.alteredAt
  ) : null;
  return !!(alt && typeof alt === "object" && Object.keys(alt).length > 0);
}
function enrichPatientForGuardiaCard(p, guardiasMap) {
  const base = mapPatientForGuardiaGrid(p);
  const g2 = guardiasMap.get(base.id);
  const dxList = Array.isArray(p.diagnosticosList) ? p.diagnosticosList : [];
  const dxText = diagnosticosTextForCenso(dxList, { max: 2 }) || String(p.diagnosticosText || p.motivo || "").trim() || "Sin diagn\xF3stico registrado";
  const openTodos = pendingTodoCount(base.id);
  const pendingCount = g2?.pendientes_json ? listActiveProcedimientos(normalizePendientesJson(g2.pendientes_json)).length : 0;
  const vitalsAltered = lastMedicionHasAlterations(p);
  const isCritical = !!(g2?.is_critical || vitalsAltered || openTodos > 0 && storage.getTodos(base.id).some((t2) => !t2.completed && t2.priority === "alta"));
  const entregaMarkers = g2 ? entregaChipMarkerIds(g2) : [];
  return {
    ...base,
    dxText: dxText.toUpperCase(),
    pendingCount,
    labsSnippet: labsSnippetForPatient(base.id),
    isCritical,
    vitalsAltered,
    entregaMarkers,
    guardiaMeta: g2
  };
}
function computeGuardiaSummary(censusPatients, guardiasMap) {
  let critical = 0;
  let pending = 0;
  censusPatients.forEach((p) => {
    if (p.isCritical || guardiasMap.get(p.id)?.is_critical) critical += 1;
    pending += p.pendingCount || 0;
  });
  return { critical, pending };
}
function renderGuardiaSummaryTiles(summary) {
  const host = document.getElementById("guardia-summary");
  if (!host) return;
  const alertIcon = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
  const listIcon = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>';
  host.innerHTML = `
    <div class="guardia-summary-tile guardia-summary-tile--critical">
      <div>
        <div class="guardia-summary-label">Pacientes cr\xEDticos</div>
        <div class="guardia-summary-value guardia-summary-value--critical">${summary.critical}</div>
      </div>
      <span class="guardia-summary-icon">${alertIcon}</span>
    </div>
    <div class="guardia-summary-tile">
      <div>
        <div class="guardia-summary-label">Pendientes totales</div>
        <div class="guardia-summary-value">${summary.pending}</div>
      </div>
      <span class="guardia-summary-icon">${listIcon}</span>
    </div>`;
}
function wireGuardiaModeToggle(settings) {
  const btn = document.getElementById("btn-guardia-mode-toggle");
  if (!btn || btn._rpcGuardiaModeWired) return;
  btn._rpcGuardiaModeWired = true;
  syncGuardiaModeUI();
  btn.addEventListener("click", () => {
    toggleGuardiaMode2({
      settings,
      renderGuardiaBoard
    });
  });
}
function renderGuardiaBoard(settings) {
  if (!isGuardiaMode()) return;
  installGuardiaAppShell();
  const root = document.getElementById("appcontent-guardia");
  if (!root || root.getAttribute("aria-hidden") === "true") return;
  const guardiasMap = clinicalSessionContext.guardiasMap.size ? clinicalSessionContext.guardiasMap : buildGuardiasMap(clinicalSessionContext.guardias);
  let censusPatients = patients.filter((p) => p && p.id && !p.isDemo && !p.archived).map((p) => enrichPatientForGuardiaCard(p, guardiasMap));
  const gridViewContext = loadGuardiaGridViewContext();
  wireGuardiaEntregaPhaseButton(settings);
  syncEntregaPhaseChrome();
  wireGuardiaModeToggle(settings);
  syncRotationConfigButton();
  clinicalSessionContext.scopeContext = {
    teams: clinicalSessionContext.teams || [],
    guardias: clinicalSessionContext.guardias || [],
    assignments: clinicalSessionContext.assignments || [],
    salaGuardiaToday: clinicalSessionContext.salaGuardiaToday || [],
    guardiaMode: clinicalSessionContext.guardiaMode,
    now: /* @__PURE__ */ new Date(),
    users: Array.isArray(clinicalSessionContext.scopeContext?.users) ? clinicalSessionContext.scopeContext.users : [],
    cycle: clinicalSessionContext.scopeContext?.cycle ?? null
  };
  if (!clinicalSessionContext.guardiaMode && gridViewContext === "GUARDIA") {
    clinicalSessionContext.scopeContext = clinicalSessionContext.scopeContext || {};
    censusPatients = censusPatients.filter((p) => {
      const scope = evaluateClinicalScope(
        clinicalSessionContext.user,
        { id: p.id, service: p.service, sala: p.sala },
        clinicalSessionContext.guardiasMap.get(p.id) || null,
        clinicalSessionContext.scopeContext
      );
      return scope.readable;
    });
  }
  const summary = computeGuardiaSummary(censusPatients, guardiasMap);
  renderGuardiaSummaryTiles(summary);
  void syncGuardiaIncomingStrip(settings);
  wireClinicalTeamsControls();
  if (!gridBoard) {
    gridBoard = new UnifiedPatientGridBoard("guardia-census-grid", gridViewContext);
  } else {
    gridBoard.setViewContext(gridViewContext);
  }
  gridBoard.chipOpensEntrega = !!clinicalSessionContext.guardiaMode;
  gridBoard.onChipClick = (patientId) => {
    const guardia = guardiasMap.get(patientId);
    openEntregaModal({
      patientId,
      guardiaId: guardia?.guardia_id,
      onConfirm: () => {
        void refreshGuardiaCensusFromDb(settings);
      }
    });
  };
  const rank = clinicalSessionContext.user?.rank || resolveClinicalRank(settings);
  gridBoard.drawCensusGrid(censusPatients, guardiasMap, rank);
}
function syncGuardiaModeButtonVisibility() {
  const show = isDbMode();
  const btn = document.getElementById("header-guardia-mode-chip");
  if (btn) btn.style.display = show ? "inline-flex" : "none";
}

// public/js/features/session-manager.mjs
var FREQ_MS = {
  "1h": 36e5,
  "2h": 72e5,
  "4h": 4 * 36e5,
  Shift_Once: 8 * 36e5
};
function vitalsIntervalMs(freq) {
  return FREQ_MS[freq] ?? 4 * 36e5;
}
function vitalsFrequencyNotifyLabel(freq) {
  if (!freq || freq === "None") return "signos vitales";
  return frequencyDisplayLabel(normalizeFrequencySpec(freq));
}
function resolvePatientLabelForNotify(row, resolveLabel) {
  const id = String(row?.patient_id || "");
  const resolved = typeof resolveLabel === "function" ? String(resolveLabel(id, row) || "").trim() : "";
  return resolved || id;
}
var BackgroundVitalsMonitorLoop = class {
  /**
   * @param {{ all: (sql: string, params?: unknown[]) => Promise<Array<{ patient_id: string, last_vitals_check: string, vitals_frequency: string }>> }} db
   * @param {string} userId
   * @param {{ notify?: (title: string, body: string) => void, intervalMs?: number, resolvePatientLabel?: (patientId: string, row: object) => string }} [opts]
   */
  constructor(db, userId, opts = {}) {
    this.db = db;
    this.userId = userId;
    this.resolvePatientLabel = opts.resolvePatientLabel;
    this.notify = opts.notify || ((title, body) => {
      if (typeof Notification !== "undefined") {
        new Notification(title, { body });
      }
    });
    this.intervalMs = opts.intervalMs ?? 6e4;
    this._timer = null;
  }
  start() {
    if (this._timer) return;
    this._timer = setInterval(() => this.scan(), this.intervalMs);
  }
  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
  async scan() {
    const rows = await this.db.all(
      "SELECT patient_id, last_vitals_check, vitals_frequency FROM active_guardias WHERE covering_user_id = ? AND status = 'Active'",
      [this.userId]
    );
    rows.forEach((r) => {
      const freq = r.vitals_frequency;
      if (!freq || freq === "None") return;
      const ms = vitalsIntervalMs(freq);
      const due = new Date(r.last_vitals_check).getTime() + ms;
      const diff = due - Date.now();
      const who = resolvePatientLabelForNotify(r, this.resolvePatientLabel);
      const freqLabel = vitalsFrequencyNotifyLabel(freq);
      if (diff <= 0) {
        this.notify(
          "CRITICAL: Overdue",
          `${who}: control de signos (${freqLabel}) vencido.`
        );
      } else if (diff <= 15 * 6e4) {
        this.notify(
          "Warning: Check Soon",
          `${who}: ventana (${freqLabel}) cierra en 15 min.`
        );
      }
    });
  }
};
var ClientSessionInactivityLocker = class {
  /**
   * @param {number} [mins]
   * @param {string} [overlayId]
   */
  constructor(mins = 10, overlayId) {
    this.timeout = mins * 6e4;
    this.el = typeof document !== "undefined" && overlayId ? document.getElementById(overlayId) : null;
    this.handle = null;
    this.ctx = null;
    this._listeners = [];
  }
  /** @param {{ decryptedPrivateKeyPem?: string|null }} ctx */
  start(ctx) {
    this.ctx = ctx;
    if (typeof window === "undefined") return;
    ["mousemove", "keydown", "click"].forEach((event) => {
      const fn = () => this.reset();
      window.addEventListener(event, fn);
      this._listeners.push({ event, fn });
    });
    this.reset();
  }
  stop() {
    if (typeof window !== "undefined") {
      this._listeners.forEach(({ event, fn }) => window.removeEventListener(event, fn));
    }
    this._listeners = [];
    if (this.handle) {
      clearTimeout(this.handle);
      this.handle = null;
    }
  }
  reset() {
    if (this.handle) clearTimeout(this.handle);
    this.handle = setTimeout(() => {
      if (this.ctx) this.ctx.decryptedPrivateKeyPem = null;
      if (this.el) this.el.classList.add("active-lock-view-overlay");
    }, this.timeout);
  }
};

// public/js/clinical-access-runtime.mjs
var clinicalSessionContext = {
  user: null,
  guardias: [],
  guardiasMap: /* @__PURE__ */ new Map(),
  teams: [],
  scopeContext: null,
  guardiaMode: false,
  decryptedPrivateKeyPem: null,
  lastBlockHashByPatient: /* @__PURE__ */ new Map()
};
var vitalsLoop = null;
var sessionLocker = null;
function electronApi() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
function resolveClinicalRank(settings, clientId) {
  void clientId;
  const rank = settings && settings.clinicalRank ? String(settings.clinicalRank) : "R1";
  const allowed = /* @__PURE__ */ new Set(["R1", "R2", "R3", "R4", "Admin"]);
  return allowed.has(rank) ? rank : "R1";
}
function mapPatientForGuardiaGrid(p) {
  const cuarto = p.cuarto != null ? String(p.cuarto) : "";
  const cama = p.cama != null ? String(p.cama) : "";
  return {
    id: String(p.id),
    bed_label: [cuarto, cama].filter(Boolean).join("-"),
    name: String(p.nombre || ""),
    service: String(p.servicio || p.area || ""),
    sub_area: String(p.area || ""),
    negativa_maniobras_firmada: Number(p.negativa_maniobras_firmada || 0),
    interconsult_type: String(p.interconsult_type || "None"),
    interconsult_status: String(p.interconsult_status || "Pending")
  };
}
function buildGuardiasMap(guardias) {
  const map = /* @__PURE__ */ new Map();
  (guardias || []).forEach((g2) => {
    if (g2 && g2.patient_id) map.set(String(g2.patient_id), g2);
  });
  return map;
}
async function applyBootstrapResult(res) {
  const api3 = electronApi();
  clinicalSessionContext.user = {
    user_id: res.user.userId,
    username: res.user.username,
    rank: res.user.rank,
    is_program_admin: res.user.isProgramAdmin ? 1 : 0,
    public_key: res.user.publicKeyPem
  };
  if (api3 && typeof api3.dbClinicalProfileGet === "function") {
    try {
      const profileRes = await api3.dbClinicalProfileGet({ userId: res.user.userId });
      const profile = profileRes?.profile;
      if (profile && clinicalSessionContext.user) {
        const profileRank = String(profile.rank || "");
        clinicalSessionContext.user.rank = profileRank === "Admin" ? "R1" : profileRank || clinicalSessionContext.user.rank;
        clinicalSessionContext.user.sala = profile.sala ?? null;
        clinicalSessionContext.user.clinical_name = profile.clinical_name ?? null;
        clinicalSessionContext.user.is_program_admin = profile.is_program_admin === 1 || profileRank === "Admin" ? 1 : 0;
      }
    } catch (_e) {
    }
  }
  clinicalSessionContext.decryptedPrivateKeyPem = res.user.privateKeyPem || null;
  clinicalSessionContext.guardias = Array.isArray(res.guardias) ? res.guardias : [];
  clinicalSessionContext.guardiasMap = buildGuardiasMap(clinicalSessionContext.guardias);
  const settings = readRpcSettings();
  const clientId = String(settings.clientId || "");
  const patch = {
    userId: res.user.userId,
    username: res.user.username
  };
  if (isLegacyMachineUsername(res.user.username, clientId)) {
    patch.staleDeviceUserId = res.user.userId;
  }
  persistClinicalUserBinding(patch);
  await refreshClinicalUserProfile();
  await fetchClinicalTeamsFromDb();
  await fetchClinicalScopeContextFromDb();
  if (typeof document !== "undefined") {
    void import("/js/chunks/clinical-profile-lan-sync-FWPVILFH.js").then((mod) => mod.flushClinicalProfileToLan()).catch(() => {
    });
  }
  migrateLocalPatientsClinicalSala();
}
function migrateLocalPatientsClinicalSala() {
  const user = clinicalSessionContext.user;
  const settings = readRpcSettings();
  const sala = String(user?.sala || "").trim() || String(settings.clinicalSala || "").trim();
  if (!sala) return 0;
  const actor = user ? { ...user, sala } : { sala };
  const migrated = migratePatientsClinicalSala(patients, actor);
  if (migrated > 0) {
    void saveState({ immediate: true });
    if (typeof document !== "undefined") {
      void import("/js/chunks/patients-VCSD75UQ.js").then((mod) => mod.renderPatientList()).catch(() => {
      });
    }
  }
  return migrated;
}
async function bootstrapClinicalAccess(settings, clientId) {
  if (!isDbMode()) return false;
  const api3 = electronApi();
  if (!api3 || typeof api3.dbClinicalAccessBootstrap !== "function") return false;
  const stored = settings || readRpcSettings();
  const res = await api3.dbClinicalAccessBootstrap({
    clientId,
    rank: resolveClinicalRank(stored, clientId),
    preferredUserId: String(stored.clinicalUserId || ""),
    preferredUsername: String(stored.clinicalUsername || "")
  });
  if (!res || res.ok === false) return false;
  await applyBootstrapResult(res);
  return true;
}
async function resumeClinicalIdentityByUsername(username, settings, clientId) {
  void clientId;
  if (!isDbMode()) return { ok: false, error: "Base de datos no activa." };
  const api3 = electronApi();
  const handle = normalizeUsername2(username);
  if (!api3) {
    return { ok: false, error: "Sesi\xF3n cl\xEDnica no disponible." };
  }
  if (typeof api3.dbClinicalIdentityResume === "function") {
    const previousUserId = String(clinicalSessionContext.user?.user_id || "");
    const staleFromSettings = String(stored.clinicalStaleDeviceUserId || "");
    const fromUserId = previousUserId && previousUserId !== String(stored.clinicalUserId || "") ? previousUserId : staleFromSettings || previousUserId;
    const res2 = await api3.dbClinicalIdentityResume({
      username: handle,
      fromUserId
    });
    if (!res2 || res2.ok === false) {
      return { ok: false, error: res2?.error || "No se pudo recuperar la cuenta." };
    }
    await applyBootstrapResult(res2);
    persistClinicalUserBinding({
      userId: res2.user.userId,
      username: res2.user.username
    });
    if (Number(res2.membershipMoved) > 0) {
      await fetchClinicalTeamsFromDb();
    }
    return { ok: true, userId: res2.user.userId, membershipMoved: res2.membershipMoved };
  }
  if (typeof api3.dbClinicalAccessBootstrap !== "function") {
    return { ok: false, error: "Sesi\xF3n cl\xEDnica no disponible." };
  }
  const stored = settings || readRpcSettings();
  const res = await api3.dbClinicalAccessBootstrap({
    clientId: String(stored.clientId || ""),
    rank: resolveClinicalRank(stored, String(stored.clientId || "")),
    preferredUsername: handle,
    preferredUserId: ""
  });
  if (!res || res.ok === false) {
    return { ok: false, error: res?.error || "No se pudo recuperar la cuenta." };
  }
  if (normalizeUsername2(res.user.username) !== handle) {
    return {
      ok: false,
      error: "No encontramos ese usuario en esta base de datos."
    };
  }
  await applyBootstrapResult(res);
  return { ok: true, userId: res.user.userId };
}
async function refreshClinicalUserProfile() {
  const api3 = electronApi();
  const userId = String(clinicalSessionContext.user?.user_id || "");
  if (!api3 || !userId || typeof api3.dbClinicalProfileGet !== "function") return;
  try {
    const res = await api3.dbClinicalProfileGet({ userId });
    const profile = res?.profile;
    if (!profile || !clinicalSessionContext.user) return;
    clinicalSessionContext.user.username = profile.username ?? clinicalSessionContext.user.username;
    clinicalSessionContext.user.rank = profile.rank ?? clinicalSessionContext.user.rank;
    clinicalSessionContext.user.sala = profile.sala ?? null;
    clinicalSessionContext.user.clinical_name = profile.clinical_name ?? null;
    clinicalSessionContext.user.is_program_admin = profile.is_program_admin === 1 ? 1 : 0;
  } catch (_e) {
  }
  migrateLocalPatientsClinicalSala();
}
function wireClinicalOpsSyncRefresh() {
  if (typeof document === "undefined" || document._rpcClinicalOpsSyncedRefreshWired) return;
  document._rpcClinicalOpsSyncedRefreshWired = true;
  document.addEventListener("rpc-clinical-ops-synced", () => {
    void (async () => {
      await fetchClinicalTeamsFromDb();
      await fetchClinicalScopeContextFromDb();
    })();
  });
}
async function initClinicalAccessRuntime(settings, clientId) {
  const ok = await bootstrapClinicalAccess(settings, clientId);
  if (!ok) return;
  wireClinicalOpsSyncRefresh();
  if (vitalsLoop) vitalsLoop.stop();
  vitalsLoop = new BackgroundVitalsMonitorLoop(
    {
      all: async (sql, params) => {
        const api3 = electronApi();
        if (!api3 || typeof api3.dbGuardiaCensus !== "function") return [];
        const census = await api3.dbGuardiaCensus({ userId: clinicalSessionContext.user?.user_id });
        if (!census || census.ok === false) return [];
        return Array.isArray(census.guardias) ? census.guardias : [];
      }
    },
    String(clinicalSessionContext.user?.user_id || clientId),
    {
      resolvePatientLabel: (patientId) => {
        const p = patients.find((row) => String(row.id) === String(patientId));
        if (!p) return "";
        const name = String(p.nombre || "").trim();
        const bed = [p.cuarto, p.cama].filter(Boolean).join("-");
        if (name && bed) return `${name} (${bed})`;
        return name || bed || "";
      }
    }
  );
  vitalsLoop.start();
  if (sessionLocker) sessionLocker.stop();
  sessionLocker = new ClientSessionInactivityLocker(10, "rpc-clinical-session-lock");
  sessionLocker.start(clinicalSessionContext);
  syncGuardiaCensusPanelVisibility(settings);
  if (isGuardiaMode()) renderGuardiaBoard(settings);
}
function stopClinicalAccessRuntime() {
  if (vitalsLoop) {
    vitalsLoop.stop();
    vitalsLoop = null;
  }
  if (sessionLocker) {
    sessionLocker.stop();
    sessionLocker = null;
  }
  clinicalSessionContext.user = null;
  clinicalSessionContext.guardias = [];
  clinicalSessionContext.guardiasMap = /* @__PURE__ */ new Map();
  clinicalSessionContext.teams = [];
  clinicalSessionContext.scopeContext = null;
  clinicalSessionContext.decryptedPrivateKeyPem = null;
}
function syncGuardiaCensusPanelVisibility(_settings) {
  const legacyPanel = document.getElementById("guardia-census-panel");
  if (legacyPanel) legacyPanel.hidden = true;
}
async function refreshGuardiaCensusFromDb(settings) {
  if (!isDbMode() || !clinicalSessionContext.user) return;
  const api3 = electronApi();
  if (!api3 || typeof api3.dbGuardiaCensus !== "function") return;
  const res = await api3.dbGuardiaCensus({ userId: clinicalSessionContext.user.user_id });
  if (!res || res.ok === false) return;
  clinicalSessionContext.guardias = Array.isArray(res.guardias) ? res.guardias : [];
  clinicalSessionContext.guardiasMap = buildGuardiasMap(clinicalSessionContext.guardias);
  await fetchClinicalTeamsFromDb();
  await fetchClinicalScopeContextFromDb();
  await renderGuardiaCensusGrid(settings);
}
async function renderGuardiaCensusGrid(settings) {
  if (isGuardiaMode()) renderGuardiaBoard(settings);
}
function assertClinicalWriteAllowed(patientId, settings) {
  const patient = patients.find((p) => String(p.id) === String(patientId)) || (patientId ? { id: patientId } : null);
  const guardia = patientId ? clinicalSessionContext.guardiasMap.get(String(patientId)) : null;
  const scope = evaluateClinicalScope(
    clinicalSessionContext.user,
    patient,
    guardia,
    getClinicalScopeContextForEvaluate()
  );
  if (!scope.writable) {
    const err = new Error(scope.reasoning || "Clinical write denied");
    err.code = "CLINICAL_ACCESS_DENIED";
    throw err;
  }
  return scope;
}
async function signOutgoingLiveSyncMutation(mutation, actionType) {
  const user = clinicalSessionContext.user;
  const privateKey = clinicalSessionContext.decryptedPrivateKeyPem;
  if (!user || !privateKey || !mutation) return null;
  const patientId = String(mutation.patientId || mutation.entityId || "");
  if (!patientId) return null;
  const deltaData = mutation.data || mutation.changedKeys || mutation;
  const lastBlockHash = clinicalSessionContext.lastBlockHashByPatient.get(patientId) || "genesis";
  const signed = await signClinicalChange({
    userId: user.user_id,
    privateKeyPem: privateKey,
    patientId,
    actionType: actionType || mutation.entityType || "clinical.mutation",
    deltaData,
    lastBlockHash
  });
  clinicalSessionContext.lastBlockHashByPatient.set(patientId, signed.blockHash);
  return signed;
}
async function verifyIncomingClinicalLedger(clinicalLedger, publicKeyPem) {
  if (!clinicalLedger || !publicKeyPem) return false;
  return verifyIncomingPeerChange(
    clinicalLedger.transactionBody,
    clinicalLedger.signature,
    publicKeyPem
  );
}
async function guardAndSignLiveSyncMutation(mutation, envelope) {
  const patientId = mutation?.patientId || mutation?.entityId;
  if (patientId) assertClinicalWriteAllowed(String(patientId));
  const signed = await signOutgoingLiveSyncMutation(mutation, mutation?.op || mutation?.entityType);
  if (signed && envelope && typeof envelope === "object") {
    envelope.clinicalLedger = signed;
  }
  return signed;
}
function getClinicalUser() {
  return clinicalSessionContext.user;
}
function getClinicalScopeContextForEvaluate() {
  const cached = clinicalSessionContext.scopeContext;
  if (cached && typeof cached === "object") {
    return {
      teams: Array.isArray(cached.teams) ? cached.teams : clinicalSessionContext.teams,
      guardias: Array.isArray(cached.guardias) ? cached.guardias : clinicalSessionContext.guardias,
      cycle: cached.cycle ?? null,
      assignments: Array.isArray(cached.assignments) ? cached.assignments : [],
      salaGuardiaToday: Array.isArray(cached.salaGuardiaToday) ? cached.salaGuardiaToday : [],
      now: cached.now || (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  return {
    teams: clinicalSessionContext.teams,
    guardias: clinicalSessionContext.guardias,
    cycle: null,
    assignments: [],
    salaGuardiaToday: [],
    now: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function fetchClinicalScopeContextFromDb() {
  const api3 = electronApi();
  const userId = clinicalSessionContext.user?.user_id;
  if (!api3 || typeof api3.dbClinicalScopeContext !== "function" || !userId) {
    clinicalSessionContext.scopeContext = null;
    return null;
  }
  const res = await api3.dbClinicalScopeContext({ userId });
  if (!res || res.ok === false) {
    clinicalSessionContext.scopeContext = null;
    return null;
  }
  clinicalSessionContext.scopeContext = res.context ?? null;
  if (Array.isArray(res.context?.teams)) {
    clinicalSessionContext.teams = res.context.teams;
  }
  return clinicalSessionContext.scopeContext;
}
async function fetchClinicalTeamsFromDb() {
  const api3 = electronApi();
  if (!api3 || typeof api3.dbClinicalTeamsList !== "function") {
    clinicalSessionContext.teams = [];
    return [];
  }
  const res = await api3.dbClinicalTeamsList();
  if (!res || res.ok === false) {
    clinicalSessionContext.teams = [];
    return [];
  }
  const teams = Array.isArray(res.teams) ? res.teams : [];
  clinicalSessionContext.teams = teams;
  return teams;
}
async function fetchActiveRotationCycleFromDb() {
  const api3 = electronApi();
  if (!api3 || typeof api3.dbRotationCycleGet !== "function") return null;
  const res = await api3.dbRotationCycleGet();
  if (!res || res.ok === false) return null;
  return res.cycle ?? null;
}
async function fetchIncomingAssignmentsFromDb() {
  const api3 = electronApi();
  if (!api3 || typeof api3.dbRotationIncomingAssignments !== "function") return [];
  const res = await api3.dbRotationIncomingAssignments();
  if (!res || res.ok === false) return [];
  return Array.isArray(res.assignments) ? res.assignments : [];
}
function unlockClinicalSessionOverlay() {
  const overlay = document.getElementById("rpc-clinical-session-lock");
  if (overlay) overlay.classList.remove("active-lock-view-overlay");
}
async function resumeClinicalSession(settings, clientId) {
  await bootstrapClinicalAccess(settings, clientId);
  unlockClinicalSessionOverlay();
  if (sessionLocker) {
    sessionLocker.stop();
    sessionLocker = new ClientSessionInactivityLocker(10, "rpc-clinical-session-lock");
    sessionLocker.start(clinicalSessionContext);
  }
}

// public/js/features/lan/push.mjs
var BUNDLE_PUSH_HANDLED = "handled";
var CLINICAL_OPS_HANDLED = "handled";
var pushBridge = null;
function registerLanSyncPushBridge(deps2) {
  pushBridge = deps2 && typeof deps2 === "object" ? deps2 : null;
}
function bridge() {
  if (!pushBridge) {
    throw new Error("lan-sync-push: registerLanSyncPushBridge() not called");
  }
  return pushBridge;
}
function ensureEffectiveLiveSyncRoomId() {
  var roomId = String(activeLiveSyncRoomId || "").trim();
  if (roomId) return roomId;
  var mem = getRoomMembership();
  if (!mem || !mem.roomId) return "";
  roomId = String(mem.roomId).trim();
  setActiveLiveSyncRoom(roomId, mem.label || roomId);
  return roomId;
}
function liveSyncBundleHasPayload(bundle) {
  if (!bundle) return false;
  if (Array.isArray(bundle.entries) && bundle.entries.length > 0) return true;
  if (Array.isArray(bundle.agenda) && bundle.agenda.length > 0) return true;
  var todos = bundle.todos;
  if (!todos || typeof todos !== "object") return false;
  var keys = Object.keys(todos);
  for (var i = 0; i < keys.length; i += 1) {
    if (Array.isArray(todos[keys[i]]) && todos[keys[i]].length > 0) return true;
  }
  var manejo = bundle.manejo;
  if (isLanManejoRoomSyncEnabled() && manejo && typeof manejo === "object") {
    if (Array.isArray(manejo.customProtocols) && manejo.customProtocols.length > 0) return true;
    if (manejo.overrides && Object.keys(manejo.overrides).length > 0) return true;
    if (Array.isArray(manejo.favorites) && manejo.favorites.length > 0) return true;
  }
  var clinicalOps = bundle.clinicalOps;
  if (clinicalOps && typeof clinicalOps === "object") {
    if (Array.isArray(clinicalOps.rotation_cycles) && clinicalOps.rotation_cycles.length > 0 || Array.isArray(clinicalOps.patient_team_assignment) && clinicalOps.patient_team_assignment.length > 0 || Array.isArray(clinicalOps.team_guardia_today) && clinicalOps.team_guardia_today.length > 0 || Array.isArray(clinicalOps.active_guardias) && clinicalOps.active_guardias.length > 0 || Array.isArray(clinicalOps.teams) && clinicalOps.teams.length > 0 || Array.isArray(clinicalOps.team_membership) && clinicalOps.team_membership.length > 0 || Array.isArray(clinicalOps.clinical_users) && clinicalOps.clinical_users.length > 0) {
      return true;
    }
  }
  return false;
}
function hostBundleBodyFromEnvelope(envelope, roomId) {
  var body = hostBundlePutBodyFromEnvelope(roomId, envelope);
  body.uploadedByClientId = envelope.clientId || getLanClientId2();
  return body;
}
function lwwToastRuntime(b) {
  return { showToast: typeof b.showToast === "function" ? b.showToast : void 0 };
}
function notifyBundleLwwOverwrite(b, roomId, lwwAppliedKeys) {
  var keys = Array.isArray(lwwAppliedKeys) ? lwwAppliedKeys : [];
  if (!keys.length) return;
  notifyLwwOverwrite(lwwToastRuntime(b), {
    entityType: "bundle",
    entityId: roomId,
    overwrittenKeys: keys
  });
}
function applyServerBundleLwwLocally(rid, b, serverBundle, lwwAppliedKeys) {
  if (!serverBundle) return false;
  setHostBundleBases(rid, serverBundle);
  emitLiveSyncRevisionHint(rid, serverBundle.revision);
  if (typeof b.acceptServerBundleConflict === "function") {
    b.acceptServerBundleConflict({
      roomId: rid,
      serverBundle,
      conflicts: []
    });
  }
  notifyBundleLwwOverwrite(b, rid, lwwAppliedKeys);
  return true;
}
function finishBundle409Locally(rid, b, opts) {
  opts = opts || {};
  pauseBundlePushForRoom(rid, 45e3);
  scheduleReconcileFromRevisionHint(rid);
  if (typeof b.applyRoomSyncPhaseAfterReconcile === "function") {
    b.applyRoomSyncPhaseAfterReconcile(rid);
  }
  if (typeof b.syncLiveSyncStatusChrome === "function") {
    b.syncLiveSyncStatusChrome();
  }
  return BUNDLE_PUSH_HANDLED;
}
function resolveClinicalOps409(rid, b, body) {
  var opsBody = body && typeof body === "object" ? body : {};
  if (opsBody.revision != null) {
    var prevBases = getHostBundleBases(rid) || {};
    setHostBundleBases(rid, {
      revision: opsBody.revision,
      entityVersions: prevBases.entityVersions || {}
    });
    emitLiveSyncRevisionHint(rid, opsBody.revision);
  }
  var acceptP = Promise.resolve();
  if (typeof b.acceptServerClinicalOpsConflict === "function") {
    acceptP = Promise.resolve(
      b.acceptServerClinicalOpsConflict(rid, opsBody.snapshot, opsBody.revision)
    );
  }
  var lwwKeys = Array.isArray(opsBody.lwwAppliedKeys) ? opsBody.lwwAppliedKeys : [];
  if (lwwKeys.length) {
    notifyLwwOverwrite(lwwToastRuntime(b), {
      entityType: "clinicalOps",
      entityId: rid,
      overwrittenKeys: lwwKeys
    });
  }
  pauseBundlePushForRoom(rid, 45e3);
  if (typeof b.syncLiveSyncStatusChrome === "function") {
    b.syncLiveSyncStatusChrome();
  }
  return acceptP.then(function() {
    return CLINICAL_OPS_HANDLED;
  });
}
function applyClinicalOpsPutSuccess(rid, b, body, prevBases) {
  if (body && body.revision != null) {
    var prev = prevBases || getHostBundleBases(rid) || {};
    setHostBundleBases(rid, {
      revision: body.revision,
      entityVersions: prev.entityVersions || {}
    });
    emitLiveSyncRevisionHint(rid, body.revision);
  }
  var lwwKeys = Array.isArray(body && body.lwwAppliedKeys) ? body.lwwAppliedKeys : [];
  if (lwwKeys.length) {
    notifyLwwOverwrite(lwwToastRuntime(b), {
      entityType: "clinicalOps",
      entityId: rid,
      overwrittenKeys: lwwKeys
    });
  }
  return true;
}
function ensureClinicalOpsPushRevision(roomId) {
  var rid = String(roomId || "").trim();
  if (!rid) return Promise.resolve();
  var b = bridge();
  if (typeof b.isLanSessionConfiguredForRest !== "function" || !b.isLanSessionConfiguredForRest()) {
    return Promise.resolve();
  }
  var bases = getHostBundleBases(rid) || {};
  var localRev = Number(bases.revision || 0);
  return lanClient.fetch("/api/lan/v1/rooms/" + encodeURIComponent(rid) + "/clinical-ops").then(function(resp) {
    if (!resp || !resp.ok) return;
    return resp.json().then(function(body) {
      var serverRev = Number(body && body.revision != null ? body.revision : 0);
      if (localRev === serverRev) return;
      if (typeof b.acceptServerClinicalOpsConflict === "function") {
        return b.acceptServerClinicalOpsConflict(rid, body.snapshot, serverRev);
      }
      setHostBundleBases(rid, {
        revision: serverRev,
        entityVersions: bases.entityVersions || {}
      });
    });
  }).catch(function() {
  });
}
function putClinicalOpsSnapshotToHost(roomId, snapshot, clientId) {
  var rid = String(roomId || "").trim();
  var snap = snapshot && typeof snapshot === "object" ? snapshot : null;
  if (!rid || !snap) return Promise.resolve(false);
  var b = bridge();
  if (typeof b.isLanSessionConfiguredForRest !== "function" || !b.isLanSessionConfiguredForRest()) {
    return Promise.resolve(false);
  }
  function doPut() {
    return ensureClinicalOpsPushRevision(rid).then(function() {
      var bases = getHostBundleBases(rid);
      return lanClient.fetch("/api/lan/v1/rooms/" + encodeURIComponent(rid) + "/clinical-ops", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snapshot: snap,
          baseRevision: bases && bases.revision != null ? bases.revision : 0,
          clientId: clientId || getLanClientId2()
        })
      }).then(function(resp) {
        if (!resp) return false;
        if (resp.status === 409) {
          return resp.json().catch(function() {
            return {};
          }).then(function(conflictBody) {
            return resolveClinicalOps409(rid, b, conflictBody).then(function() {
              return prepareClinicalOpsForLanSync().then(function() {
                var fresh = getCachedClinicalOpsSnapshot() || snap;
                return ensureClinicalOpsPushRevision(rid).then(function() {
                  var basesRetry = getHostBundleBases(rid);
                  return lanClient.fetch(
                    "/api/lan/v1/rooms/" + encodeURIComponent(rid) + "/clinical-ops",
                    {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        snapshot: fresh,
                        baseRevision: basesRetry && basesRetry.revision != null ? basesRetry.revision : 0,
                        clientId: clientId || getLanClientId2()
                      })
                    }
                  ).then(function(retryResp) {
                    if (!retryResp) return false;
                    if (retryResp.status === 409) {
                      return retryResp.json().catch(function() {
                        return {};
                      }).then(function(body2) {
                        return resolveClinicalOps409(rid, b, body2);
                      });
                    }
                    if (!retryResp.ok) return false;
                    return retryResp.json().then(function(body) {
                      return applyClinicalOpsPutSuccess(rid, b, body, basesRetry);
                    });
                  });
                });
              });
            });
          });
        }
        if (!resp.ok) return false;
        return resp.json().then(function(body) {
          return applyClinicalOpsPutSuccess(rid, b, body, bases);
        });
      }).catch(function() {
        return false;
      });
    });
  }
  return doPut();
}
function pushClinicalOpsPayloadToHost(roomId, payload) {
  var rid = String(roomId || "").trim();
  var snap = payload && payload.snapshot;
  if (!rid || !snap) return Promise.resolve(false);
  return putClinicalOpsSnapshotToHost(rid, snap, payload.clientId || getLanClientId2());
}
function pushRoomSyncBundleToHost(roomId, envelope) {
  var b = bridge();
  if (typeof b.isLanSessionConfiguredForRest !== "function" || !b.isLanSessionConfiguredForRest()) {
    return Promise.resolve(false);
  }
  var rid = String(roomId || "").trim();
  if (!rid || !envelope || !liveSyncBundleHasPayload(envelope)) return Promise.resolve(false);
  if (isBundlePushPaused(rid)) return Promise.resolve("paused");
  return lanClient.fetch("/api/lan/v1/rooms/" + encodeURIComponent(rid) + "/sync-bundle", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bundle: hostBundleBodyFromEnvelope(envelope, rid)
    })
  }).then(function(resp) {
    if (!resp) return false;
    if (resp.status === 409) {
      return resp.json().then(function(body) {
        var serverBundle = body && body.bundle ? body.bundle : null;
        var lwwKeys = body && Array.isArray(body.lwwAppliedKeys) ? body.lwwAppliedKeys : ["*"];
        if (!serverBundle) {
          enqueueOutbox(rid, { kind: "bundle", payload: envelope });
          return finishBundle409Locally(rid, b, {});
        }
        applyServerBundleLwwLocally(rid, b, serverBundle, lwwKeys);
        return finishBundle409Locally(rid, b, {});
      });
    }
    if (resp.ok) {
      return resp.json().then(function(body) {
        if (body && body.bundle) {
          setHostBundleBases(rid, body.bundle);
          emitLiveSyncRevisionHint(rid, body.bundle.revision);
        }
        notifyBundleLwwOverwrite(
          b,
          rid,
          body && Array.isArray(body.lwwAppliedKeys) ? body.lwwAppliedKeys : []
        );
        return true;
      });
    }
    recordLanSyncError({
      op: "sync-bundle",
      code: String(resp.status || "HTTP"),
      message: "PUT sync-bundle rechazado"
    });
    return false;
  }).catch(function(err) {
    recordLanSyncError({
      op: "sync-bundle",
      code: "NETWORK",
      message: err && err.message ? err.message : "PUT sync-bundle fall\xF3"
    });
    return false;
  });
}
function flushLiveSyncOutbox(roomId) {
  var b = bridge();
  var rid = String(roomId || "").trim();
  if (!rid || typeof b.isLanSessionConfiguredForRest !== "function" || !b.isLanSessionConfiguredForRest()) {
    return Promise.resolve();
  }
  return drainOutbox(rid).then(function(items) {
    if (!items || !items.length) return;
    var sorted = items.slice().sort(function(a, b2) {
      var score = function(k) {
        if (k === "clinical_ops") return 0;
        if (k === "bundle") return 1;
        return 2;
      };
      return score(a && a.kind) - score(b2 && b2.kind);
    });
    function pushLiveSyncPatchOutbox(envelope) {
      if (!envelope || !envelope.mutation) return Promise.resolve(false);
      function trySend() {
        if (!lanClient.liveConnected) return Promise.resolve(false);
        return guardAndSignLiveSyncMutation(envelope.mutation, envelope).then(function() {
          lanClient.sendLive(envelope);
          return true;
        }).catch(function() {
          return false;
        });
      }
      return trySend().then(function(sent) {
        if (sent) return true;
        try {
          lanClient.connectLiveChannel(rid);
        } catch (_eConn) {
        }
        return import("/js/chunks/room-CYVNYDX5.js").then(function(mod) {
          if (typeof mod.waitForLiveChannelOpen !== "function") return false;
          return mod.waitForLiveChannelOpen(rid, 4e3).then(function() {
            return trySend();
          });
        });
      });
    }
    function pushOutboxItem(item) {
      if (!item || !item.payload) return Promise.resolve(true);
      if (item.kind === "clinical_ops") {
        return pushClinicalOpsPayloadToHost(rid, item.payload);
      }
      if (item.kind === "bundle") {
        return pushRoomSyncBundleToHost(rid, item.payload);
      }
      if (item.kind === "patch") {
        return pushLiveSyncPatchOutbox(item.payload);
      }
      return Promise.resolve(true);
    }
    function outboxItemSucceeded(result) {
      return result === true || result === BUNDLE_PUSH_HANDLED || result === CLINICAL_OPS_HANDLED;
    }
    function reenqueueSlice(slice) {
      var chain = Promise.resolve();
      slice.forEach(function(it) {
        chain = chain.then(function() {
          return enqueueOutbox(rid, { kind: it.kind, payload: it.payload });
        });
      });
      return chain;
    }
    function drainFromIndex(index) {
      if (index >= sorted.length) return Promise.resolve();
      var item = sorted[index];
      return pushOutboxItem(item).then(function(result) {
        if (result === "paused") {
          return reenqueueSlice(sorted.slice(index));
        }
        if (!outboxItemSucceeded(result)) {
          return reenqueueSlice(sorted.slice(index));
        }
        return drainFromIndex(index + 1);
      });
    }
    return drainFromIndex(0);
  });
}
function scheduleLiveSyncOutboxFlush() {
  if (getLiveSyncOutboxFlushTimer()) return;
  setLiveSyncOutboxFlushTimer(
    setInterval(function() {
      var m = getRoomMembership();
      if (!m || !m.roomId) return;
      flushLiveSyncOutbox(m.roomId);
    }, LIVE_SYNC_OUTBOX_FLUSH_MS)
  );
}
function liveSyncRoomIdIsRelevant(roomId) {
  var rid = String(roomId || "").trim();
  if (!rid) return false;
  if (rid === String(activeLiveSyncRoomId || "").trim()) return true;
  try {
    var mem = getRoomMembership();
    return !!(mem && String(mem.roomId || "").trim() === rid);
  } catch (_e) {
    return false;
  }
}
function scheduleReconcileFromRevisionHint(roomId) {
  var rid = String(roomId || "").trim();
  if (!rid || !liveSyncRoomIdIsRelevant(rid)) return;
  if (!activeLiveSyncRoomId) ensureEffectiveLiveSyncRoomId();
  var prev = getLiveSyncRevisionReconcileTimer();
  if (prev) clearTimeout(prev);
  setLiveSyncRevisionReconcileTimer(
    setTimeout(function() {
      setLiveSyncRevisionReconcileTimer(null);
      void reconcileLiveSyncRoom(rid);
    }, 500)
  );
}
function emitLiveSyncRevisionHint(roomId, revision) {
  var rid = String(roomId || "").trim();
  if (!rid) return;
  if (!lanClient.liveConnected) {
    try {
      lanClient.connectLiveChannel(rid);
    } catch (_eConn) {
    }
  }
  if (!lanClient.liveConnected) return;
  try {
    lanClient.sendLive({
      type: "livesync:revision",
      roomId: String(roomId || "").trim(),
      revision: Number(revision || 0),
      clientId: getLanClientId2()
    });
  } catch (_e) {
  }
}
function scheduleLiveSyncPush() {
  var roomId = ensureEffectiveLiveSyncRoomId();
  if (!roomId) return;
  if (isBundlePushPaused(roomId)) return;
  if (isPitchPatientIsolationActive()) return;
  var prev = getLiveSyncPushTimer();
  if (prev) clearTimeout(prev);
  setLiveSyncPushTimer(
    setTimeout(function() {
      setLiveSyncPushTimer(null);
      var roomId2 = ensureEffectiveLiveSyncRoomId();
      if (!roomId2) return;
      void (async function() {
        var b = bridge();
        var bundle = await b.buildLiveSyncBundleEnvelope(roomId2);
        b.saveLocalRoomSnapshot(roomId2);
        if (!b.isLanSessionConfiguredForRest()) return;
        var pushResult = await pushRoomSyncBundleToHost(roomId2, bundle);
        if (pushResult !== true && pushResult !== BUNDLE_PUSH_HANDLED && !isBundlePushPaused(roomId2)) {
          void enqueueOutbox(roomId2, { kind: "bundle", payload: bundle });
        }
      })();
    }, LIVE_SYNC_PUSH_DEBOUNCE_MS)
  );
}
function sendLiveBundleIfOpen(roomId, envelope) {
  var rid = String(roomId || "").trim();
  if (!rid || !envelope) return false;
  var ws = lanClient._liveWs;
  if (!lanClient.liveConnected || String(lanClient.liveRoomId || "").trim() !== rid) return false;
  if (!ws || ws.readyState !== 1) return false;
  try {
    return lanClient.sendLive(envelope) === true;
  } catch (_e) {
    return false;
  }
}
function lanPushResult(ok, code, channels) {
  return { ok: !!ok, code: code || void 0, channels: channels || {} };
}
var clinicalOpsLanPushInFlight = null;
async function pushClinicalOpsLanNow(opts) {
  if (clinicalOpsLanPushInFlight) return clinicalOpsLanPushInFlight;
  clinicalOpsLanPushInFlight = pushClinicalOpsLanNowBody(opts).finally(function() {
    clinicalOpsLanPushInFlight = null;
  });
  return clinicalOpsLanPushInFlight;
}
async function pushClinicalOpsLanNowBody(opts) {
  if (isPitchPatientIsolationActive()) return lanPushResult(false, "PITCH_DEMO");
  if (!isClinicalOpsLanAvailable()) return lanPushResult(false, "NO_CLINICAL_OPS");
  await prepareClinicalOpsForLanSync();
  var snap = getCachedClinicalOpsSnapshot();
  if (!snap) return lanPushResult(false, "NO_SNAPSHOT");
  var roomId = ensureEffectiveLiveSyncRoomId();
  if (!roomId) {
    return lanPushResult(false, "NO_ROOM");
  }
  var b = bridge();
  if (!b.isLanSessionConfiguredForRest()) {
    return lanPushResult(false, "NO_LAN");
  }
  try {
    if (!lanClient.connected) lanClient.connectSyncChannel();
  } catch (_e) {
  }
  var envelope = await b.buildLiveSyncBundleEnvelope(roomId);
  envelope.clinicalOps = snap;
  var bases = getHostBundleBases(roomId);
  var putResult = false;
  try {
    putResult = await putClinicalOpsSnapshotToHost(roomId, snap, getLanClientId2());
  } catch (_opsErr) {
    putResult = false;
  }
  var okHttp = putResult === true;
  var conflictHandled = putResult === CLINICAL_OPS_HANDLED;
  var pushedLive = sendLiveBundleIfOpen(roomId, envelope);
  b.saveLocalRoomSnapshot(roomId);
  if (typeof b.syncLiveSyncStatusChrome === "function") b.syncLiveSyncStatusChrome();
  if (okHttp || pushedLive) {
    return lanPushResult(true, void 0, { http: !!okHttp, live: pushedLive });
  }
  if (conflictHandled) {
    return lanPushResult(true, "CONFLICT_RESOLVED", { http: true });
  }
  await enqueueOutbox(roomId, {
    kind: "clinical_ops",
    payload: {
      snapshot: snap,
      baseRevision: bases && bases.revision != null ? bases.revision : 0,
      clientId: getLanClientId2()
    }
  });
  return lanPushResult(true, "QUEUED", { outbox: true });
}
async function reconcileLiveSyncRoom(roomId) {
  var b = bridge();
  var rid = String(roomId || ensureEffectiveLiveSyncRoomId() || "").trim();
  if (!rid) return false;
  if (!activeLiveSyncRoomId) ensureEffectiveLiveSyncRoomId();
  if (String(activeLiveSyncRoomId || "").trim() === rid) {
    setRoomSyncPhase(rid, RoomSyncPhase.catching_up);
    if (typeof b.syncLiveSyncStatusChrome === "function") b.syncLiveSyncStatusChrome();
  }
  try {
    if (isClinicalOpsLanAvailable()) {
      await prepareClinicalOpsForLanSync();
    }
    var sources = [];
    var local = storage.getLanRoomSnapshot(rid);
    if (local) sources.push(local);
    sources.push(b.buildLiveSyncLocalMergeSource());
    try {
      const syncPath = "/api/lan/v1/rooms/" + encodeURIComponent(rid) + "/sync-bundle";
      const ac = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timer = ac && setTimeout(() => {
        ac.abort();
      }, 5e3);
      var resp = await lanClient.fetch(syncPath, ac ? { signal: ac.signal } : {});
      if (timer) clearTimeout(timer);
      if (resp.ok) {
        var j = await resp.json();
        if (j && j.bundle) {
          setHostBundleBases(rid, j.bundle);
          sources.push(j.bundle);
        }
      }
    } catch (_eBundle) {
    }
    try {
      if (isClinicalOpsLanAvailable() && typeof b.fetchAndApplyClinicalOpsFromHost === "function") {
        await b.fetchAndApplyClinicalOpsFromHost(rid);
      }
    } catch (_eOps) {
    }
    if (sources.length) {
      b.applyLiveSyncMerged(mergeLiveSyncFullBundles(sources));
    }
    return flushLiveSyncOutbox(rid);
  } finally {
    if (typeof b.applyRoomSyncPhaseAfterReconcile === "function") {
      b.applyRoomSyncPhaseAfterReconcile(rid);
    }
    if (typeof b.syncLiveSyncStatusChrome === "function") b.syncLiveSyncStatusChrome();
  }
}

// public/js/features/lan/room.mjs
var roomBridge = null;
function registerLanSyncRoomBridge(deps2) {
  roomBridge = deps2 && typeof deps2 === "object" ? deps2 : null;
}
function bridge2() {
  if (!roomBridge) throw new Error("lan-sync-room: registerLanSyncRoomBridge() not called");
  return roomBridge;
}
function runtime5() {
  return bridge2().runtime || { showToast() {
  } };
}
var _liveSyncReconnectTimer = null;
var _liveSyncReconnectAttempt = 0;
var _surrogateFailoverTimer = null;
var _liveSyncSessionResyncDone = false;
async function resolveSelfLanAdvertiseHostUrl() {
  if (!isLanElectronDesktop() || isLanRemoteJoinMode()) return "";
  var cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
  var fromCfg = String(cfg.hostUrl || "").trim().replace(/\/+$/, "");
  if (fromCfg) return fromCfg;
  return resolveLanHostUrlAuto();
}
function buildLiveSyncHelloPayload(roomId) {
  var rid = String(roomId || "").trim();
  var prev = storage.getLanRoomSnapshot(rid);
  var payload = {
    type: "livesync:hello",
    roomId: rid,
    clientId: getLanClientId2(),
    snapshotAt: prev && prev.savedAt ? prev.savedAt : null,
    generation: prev && prev.generation != null ? prev.generation : 0,
    canHost: isLanElectronDesktop(),
    isSurrogate: isSurrogateHostActive()
  };
  return payload;
}
async function enrichLiveSyncHelloPayload(payload) {
  if (!payload || !payload.canHost) return payload;
  var url = await resolveSelfLanAdvertiseHostUrl();
  if (url) payload.hostUrl = url;
  return payload;
}
function stopSurrogateFailoverTimer() {
  if (_surrogateFailoverTimer) {
    clearTimeout(_surrogateFailoverTimer);
    _surrogateFailoverTimer = null;
  }
}
function scheduleSurrogateFailoverCheck() {
  if (!activeLiveSyncRoomId || !getRoomMembership()) return;
  stopSurrogateFailoverTimer();
  _surrogateFailoverTimer = setTimeout(function() {
    _surrogateFailoverTimer = null;
    void runSurrogateFailoverCheck();
  }, 1200);
}
async function tryReconnectLanToHostUrl(hostUrl, teamCode) {
  var targetUrl = String(hostUrl || "").trim().replace(/\/+$/, "");
  var cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
  var currentUrl = String(cfg.hostUrl || "").trim().replace(/\/+$/, "");
  var pinned = getPinnedHostUrl();
  var switchOpts = { skipRememberPrimary: true };
  if (targetUrl && targetUrl !== currentUrl) {
    if (pinned) {
      if (targetUrl !== pinned) {
        var pinMsg = "Se detect\xF3 otro anfitri\xF3n (" + targetUrl + "). Tienes fijado " + pinned + ". \xBFCambiar de todos modos?";
        if (typeof confirm !== "function" || !confirm(pinMsg)) return false;
      }
    } else if (typeof confirm === "function") {
      if (!confirm(
        "\xBFReconectar al anfitri\xF3n " + targetUrl + "?"
      )) {
        return false;
      }
    }
  }
  if (!applyLanHostUrlSwitch(hostUrl, teamCode, switchOpts)) return false;
  var ok = await pingLanHostUrl(hostUrl, teamCode);
  if (!ok) return false;
  var rid = activeLiveSyncRoomId;
  if (rid) {
    try {
      lanClient.connectLiveChannel(rid);
    } catch (_e) {
    }
    await syncLiveSyncAfterRoomJoin(rid);
    startLiveSyncReconnectLoop();
  }
  syncLiveSyncStatusChrome();
  bridge2().patchLanPanelJoinButtons();
  return true;
}
async function promoteSelfToSurrogateHost() {
  if (typeof window !== "undefined" && window.electronAPI?.ensureLanServerReady) {
    await window.electronAPI.ensureLanServerReady();
  }
  if (!isLanElectronDesktop() || !isLanRemoteJoinMode()) return false;
  if (!activeLiveSyncRoomId) return false;
  if (isSurrogateHostActive()) return false;
  var cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
  var formerUrl = String(cfg.hostUrl || "").trim().replace(/\/+$/, "");
  var formerCode = getLanTeamCodeFromConfig();
  var localUrl = await resolveLanHostUrlAuto();
  if (!localUrl) return false;
  if (formerUrl && await pingLanHostUrl(formerUrl, formerCode)) return false;
  setSurrogateHostState({
    formerHostUrl: formerUrl || getPrimaryHostUrl(),
    formerTeamCode: formerCode,
    localHostUrl: localUrl,
    roomId: activeLiveSyncRoomId,
    promotedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  applyLanHostUrlSwitch(localUrl, formerCode, { skipRememberPrimary: true });
  var bundle = await buildLiveSyncBundleEnvelope(activeLiveSyncRoomId);
  await pushRoomSyncBundleToHost(activeLiveSyncRoomId, bundle);
  try {
    if (!lanClient.connected) lanClient.connectSyncChannel();
    lanClient.connectLiveChannel(activeLiveSyncRoomId);
  } catch (_e) {
  }
  await syncLiveSyncAfterRoomJoin(activeLiveSyncRoomId);
  startLiveSyncReconnectLoop();
  var handoff = await enrichLiveSyncHelloPayload(buildLiveSyncHelloPayload(activeLiveSyncRoomId));
  handoff.type = "livesync:host-handoff";
  handoff.newHostUrl = localUrl;
  handoff.reason = "surrogate-promoted";
  try {
    lanClient.sendLive(handoff);
  } catch (_e2) {
  }
  runtime5().showToast(
    "El anfitri\xF3n se desconect\xF3: esta Mac asume el servidor hasta que vuelva. Comparte de nuevo la invitaci\xF3n si alguien no reconecta solo.",
    "success"
  );
  bridge2().renderLanPanel();
  return true;
}
async function maybeRevertSurrogateToPrimary() {
  var st = getSurrogateHostState();
  if (!st || !st.formerHostUrl) return false;
  var code = st.formerTeamCode || getLanTeamCodeFromConfig();
  if (!await pingLanHostUrl(st.formerHostUrl, code)) return false;
  if (activeLiveSyncRoomId) {
    var bundle = await buildLiveSyncBundleEnvelope(activeLiveSyncRoomId);
    var prevUrl = lanClient.baseUrl();
    applyLanHostUrlSwitch(st.formerHostUrl, code, { skipRememberPrimary: true });
    await pushRoomSyncBundleToHost(activeLiveSyncRoomId, bundle);
    if (!await pingLanHostUrl(st.formerHostUrl, code)) {
      applyLanHostUrlSwitch(prevUrl, code, { skipRememberPrimary: true });
      return false;
    }
  }
  clearSurrogateHostState();
  applyLanHostUrlSwitch(st.formerHostUrl, code, { skipRememberPrimary: false });
  if (activeLiveSyncRoomId) {
    try {
      lanClient.connectLiveChannel(activeLiveSyncRoomId);
    } catch (_e) {
    }
    await syncLiveSyncAfterRoomJoin(activeLiveSyncRoomId);
  }
  runtime5().showToast("El anfitri\xF3n original volvi\xF3: esta Mac dej\xF3 de ser servidor temporal.", "success");
  bridge2().renderLanPanel();
  return true;
}
async function runSurrogateFailoverCheck() {
  if (!activeLiveSyncRoomId || !getRoomMembership()) return;
  if (lanClient.connected && lanClient.liveConnected) return;
  var teamCode = getLanTeamCodeFromConfig();
  var cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
  var currentUrl = String(cfg.hostUrl || "").trim().replace(/\/+$/, "");
  if (currentUrl && await pingLanHostUrl(currentUrl, teamCode)) {
    try {
      if (!lanClient.connected) lanClient.connectSyncChannel();
      if (activeLiveSyncRoomId) lanClient.connectLiveChannel(activeLiveSyncRoomId);
    } catch (_pingOk) {
    }
    if (isSurrogateHostActive()) void maybeRevertSurrogateToPrimary();
    return;
  }
  if (isSurrogateHostActive()) {
    if (await maybeRevertSurrogateToPrimary()) return;
  }
  var targets = [];
  var primary = getPrimaryHostUrl();
  if (primary && primary !== currentUrl) targets.push(primary);
  listLivePeerHostUrls(getLanClientId2()).forEach(function(u) {
    if (u && targets.indexOf(u) === -1 && u !== currentUrl) targets.push(u);
  });
  for (var i = 0; i < targets.length; i += 1) {
    if (await tryReconnectLanToHostUrl(targets[i], teamCode)) {
      if (targets[i] !== primary) {
        runtime5().showToast("Reconectado al nuevo anfitri\xF3n de la sala.", "success");
      } else if (!isSurrogateHostActive()) {
        runtime5().showToast("Anfitri\xF3n original de vuelta.", "success");
      }
      return;
    }
  }
  if (!isLanElectronDesktop() || !isLanRemoteJoinMode()) return;
  await new Promise(function(r) {
    setTimeout(r, surrogateElectionDelayMs(getLanClientId2()));
  });
  if (lanClient.connected && lanClient.liveConnected) return;
  if (primary && await pingLanHostUrl(primary, teamCode)) {
    await tryReconnectLanToHostUrl(primary, teamCode);
    return;
  }
  for (var j = 0; j < targets.length; j += 1) {
    if (await pingLanHostUrl(targets[j], teamCode)) {
      await tryReconnectLanToHostUrl(targets[j], teamCode);
      return;
    }
  }
  await promoteSelfToSurrogateHost();
}
function saveLocalRoomSnapshot(roomId) {
  var rid = String(roomId || "").trim();
  if (!rid) return;
  var snap = buildRoomSnapshotFromStorage(storage, bridge2().collectPatientIdsForLiveSync());
  var prev = storage.getLanRoomSnapshot(rid);
  var entries = bridge2().collectPatientEntriesForLanSync();
  storage.saveLanRoomSnapshot(rid, {
    savedAt: snap.savedAt,
    generation: nextRoomSnapshotGeneration(prev),
    agenda: snap.agenda,
    todos: snap.todos,
    entries,
    ...isLanManejoRoomSyncEnabled() ? { manejo: collectManejoRoomPayload() } : {},
    clinicalOps: getCachedClinicalOpsSnapshot()
  });
}
async function buildLiveSyncBundleEnvelope(roomId) {
  if (isClinicalOpsLanAvailable()) {
    await prepareClinicalOpsForLanSync();
  }
  var rid = String(roomId || "").trim();
  var snap = buildRoomSnapshotFromStorage(storage, bridge2().collectPatientIdsForLiveSync());
  var prev = storage.getLanRoomSnapshot(rid);
  var entries = bridge2().collectPatientEntriesForLanSync();
  return {
    type: "livesync:bundle",
    roomId: rid,
    clientId: getLanClientId2(),
    savedAt: snap.savedAt,
    generation: nextRoomSnapshotGeneration(prev),
    agenda: snap.agenda,
    todos: snap.todos,
    entries,
    ...isLanManejoRoomSyncEnabled() ? { manejo: collectManejoRoomPayload() } : {},
    clinicalOps: getCachedClinicalOpsSnapshot()
  };
}
function waitForLiveChannelOpen(roomId, timeoutMs) {
  var rid = String(roomId || "").trim();
  var ms = Math.max(500, Number(timeoutMs) || 5e3);
  if (!rid) return Promise.resolve(false);
  if (lanClient.liveConnected && String(lanClient.liveRoomId || "").trim() === rid) {
    var ws = lanClient._liveWs;
    if (ws && ws.readyState === 1) return Promise.resolve(true);
  }
  return new Promise(function(resolve) {
    var settled = false;
    function finish(ok) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      lanClient.removeEventListener("lan-live-status", onStatus);
      resolve(!!ok);
    }
    function onStatus(ev) {
      if (!ev || !ev.detail || !ev.detail.connected) return;
      if (String(ev.detail.roomId || "").trim() !== rid) return;
      finish(true);
    }
    var timer = setTimeout(function() {
      finish(false);
    }, ms);
    lanClient.addEventListener("lan-live-status", onStatus);
  });
}
function applyRoomSyncPhaseAfterReconcile(roomId) {
  var rid = String(roomId || "").trim();
  if (!rid) return;
  var active = String(activeLiveSyncRoomId || "").trim();
  if (!active) {
    var mem = getRoomMembership();
    if (mem && String(mem.roomId || "").trim() === rid) {
      setActiveLiveSyncRoom(rid, mem.label || rid);
      active = rid;
    }
  }
  if (active && active !== rid) return;
  var liveRid = String(lanClient.liveRoomId || "").trim();
  if (lanClient.liveConnected && (liveRid === rid || !liveRid)) {
    setRoomSyncPhase(rid, RoomSyncPhase.live);
  } else if (getRoomMembership() && String(getRoomMembership().roomId || "").trim() === rid) {
    setRoomSyncPhase(rid, RoomSyncPhase.degraded);
  } else if (isLanSessionConfiguredForRest()) {
    setRoomSyncPhase(rid, RoomSyncPhase.configured);
  } else {
    setRoomSyncPhase(rid, RoomSyncPhase.offline);
  }
}
function syncLiveSyncStatusChrome() {
  var el = document.getElementById("lan-livesync-status");
  if (!el) return;
  if (!activeLiveSyncRoomId) {
    el.style.display = "none";
    el.textContent = "";
    return;
  }
  el.style.display = "block";
  var label = activeLiveSyncRoomLabel || activeLiveSyncRoomId;
  var prefix = "Sala: " + label + " \xB7 ";
  var phase = getRoomSyncPhase(activeLiveSyncRoomId);
  if (phase === RoomSyncPhase.live) {
    el.textContent = prefix + "sincronizando pacientes, equipos, labs, agenda y pendientes";
  } else if (phase === RoomSyncPhase.catching_up) {
    el.textContent = prefix + "sincronizando\u2026";
  } else if (phase === RoomSyncPhase.joining) {
    el.textContent = prefix + "conectando\u2026";
  } else if (phase === RoomSyncPhase.degraded) {
    el.textContent = prefix + "reconectando\u2026";
  } else {
    el.textContent = prefix + "solo local (sin sync en vivo)";
  }
}
function stopLiveSyncReconnectLoop() {
  if (_liveSyncReconnectTimer) {
    clearTimeout(_liveSyncReconnectTimer);
    _liveSyncReconnectTimer = null;
  }
}
function startLiveSyncReconnectLoop() {
  stopLiveSyncReconnectLoop();
  var m = getRoomMembership();
  if (!m || !m.roomId) return;
  function tick() {
    var mem = getRoomMembership();
    if (!mem || !mem.roomId) {
      stopLiveSyncReconnectLoop();
      return;
    }
    if (!activeLiveSyncRoomId) {
      setActiveLiveSyncRoom(mem.roomId, mem.label);
    }
    if (lanClient.liveConnected && String(lanClient.liveRoomId || "") === mem.roomId) {
      _liveSyncReconnectAttempt = 0;
      if (!_liveSyncSessionResyncDone) {
        _liveSyncSessionResyncDone = true;
        void syncLiveSyncAfterRoomJoin(mem.roomId).then(function() {
          return flushLiveSyncOutbox(mem.roomId);
        });
      }
      syncLiveSyncStatusChrome();
      scheduleReconnect();
      return;
    }
    if (typeof lanClient.isLiveChannelBusy === "function" && lanClient.isLiveChannelBusy(mem.roomId)) {
      syncLiveSyncStatusChrome();
      scheduleReconnect();
      return;
    }
    if (isLanSessionConfiguredForRest()) {
      try {
        if (!lanClient.connected) lanClient.connectSyncChannel();
        lanClient.connectLiveChannel(mem.roomId);
        syncLiveSyncAfterRoomJoin(mem.roomId);
      } catch (_e) {
      }
    }
    _liveSyncReconnectAttempt += 1;
    if (_liveSyncReconnectAttempt >= 3) scheduleSurrogateFailoverCheck();
    syncLiveSyncStatusChrome();
    scheduleReconnect();
  }
  function scheduleReconnect() {
    var delay = Math.min(3e4, 1e3 * Math.pow(2, Math.min(_liveSyncReconnectAttempt, 5)));
    _liveSyncReconnectTimer = setTimeout(tick, delay);
  }
  tick();
}
function bootLanRoomMembership() {
  migrateLastRoomToMembership();
  var m = getRoomMembership();
  if (!m || !m.roomId || !isLanSessionConfiguredForRest()) return;
  setActiveLiveSyncRoom(m.roomId, m.label);
  setRoomSyncPhase(m.roomId, RoomSyncPhase.catching_up);
  scheduleLiveSyncOutboxFlush();
  void (async function() {
    try {
      if (!lanClient.connected) lanClient.connectSyncChannel();
      lanClient.connectLiveChannel(m.roomId);
    } catch (_e) {
    }
    await waitForLiveChannelOpen(m.roomId, 5e3);
    await syncLiveSyncAfterRoomJoin(m.roomId);
    await flushLiveSyncOutbox(m.roomId);
    if (!getRoomMembership()) return;
    _liveSyncSessionResyncDone = true;
    startLiveSyncReconnectLoop();
    syncLiveSyncStatusChrome();
  })();
}
function onLiveSyncWireMessage(data) {
  if (!data || !isLiveSyncEnvelope(data)) return;
  if (data.roomId && activeLiveSyncRoomId && data.roomId !== activeLiveSyncRoomId) return;
  var myId = getLanClientId2();
  if (data.type === "livesync:hello" || data.type === "livesync:host-handoff") {
    if (data.clientId !== myId) {
      recordLivePeer(data.clientId, {
        hostUrl: data.newHostUrl || data.hostUrl,
        canHost: !!data.canHost
      });
      if (data.type === "livesync:host-handoff" && data.newHostUrl) {
        var newUrl = String(data.newHostUrl || "").trim().replace(/\/+$/, "");
        var cfgNow = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
        var curUrl = String(cfgNow.hostUrl || "").trim().replace(/\/+$/, "");
        if (newUrl && newUrl !== curUrl && isLanRemoteJoinMode()) {
          void tryReconnectLanToHostUrl(newUrl, getLanTeamCodeFromConfig());
        }
      }
    }
    if (data.type === "livesync:hello" && data.clientId !== myId && activeLiveSyncRoomId) {
      void (async function() {
        try {
          lanClient.sendLive(await buildLiveSyncBundleEnvelope(activeLiveSyncRoomId));
        } catch (_eHelloBundle) {
        }
      })();
    }
    return;
  }
  if (data.type === "livesync:leave" && data.bundle && data.clientId !== myId) {
    bridge2().applyLiveSyncMerged(
      mergeLiveSyncFullBundles([bridge2().buildLiveSyncLocalMergeSource(), data.bundle])
    );
    return;
  }
  if (data.type === "livesync:revision" && data.clientId !== myId) {
    scheduleReconcileFromRevisionHint(data.roomId);
    return;
  }
  if (data.clientId === myId && data.type !== "livesync:hello") return;
  if (data.type === "livesync:bundle") {
    var mergedBundle = mergeLiveSyncFullBundles([bridge2().buildLiveSyncLocalMergeSource(), data]);
    bridge2().applyLiveSyncMerged(mergedBundle);
    return;
  }
  if (data.type === "livesync:applied") {
    bridge2().applyLiveSyncApplied(data);
    return;
  }
}
async function fetchAndApplyClinicalOpsFromHost(roomId) {
  const rid = String(roomId || "").trim();
  if (!rid || !isClinicalOpsLanAvailable() || !isLanSessionConfiguredForRest()) {
    return false;
  }
  try {
    if (!lanClient.connected) lanClient.connectSyncChannel();
    const resp = await lanClient.fetch(
      "/api/lan/v1/rooms/" + encodeURIComponent(rid) + "/clinical-ops"
    );
    if (!resp || !resp.ok) return false;
    const body = await resp.json();
    if (body && body.revision != null) {
      const prev = getHostBundleBases(rid) || {};
      setHostBundleBases(rid, {
        revision: Number(body.revision),
        entityVersions: prev.entityVersions || {}
      });
    }
    if (!body || !body.snapshot || typeof body.snapshot !== "object") return false;
    const ok = await applyClinicalOpsLanSnapshot(body.snapshot);
    if (!ok) return false;
    await refreshClinicalOpsSnapshotCache();
    if (typeof document !== "undefined") {
      document.dispatchEvent(new CustomEvent("rpc-clinical-ops-synced"));
    }
    return true;
  } catch (_e) {
    return false;
  }
}
async function refreshLanClinicalDirectoryFromRoom(options = {}) {
  const roomId = ensureEffectiveLiveSyncRoomId();
  if (!roomId || !isClinicalOpsLanAvailable() || !isLanSessionConfiguredForRest()) {
    return false;
  }
  const timeoutMs = Math.max(1e3, Number(options.timeoutMs) || 5e3);
  try {
    if (!lanClient.connected) {
      try {
        lanClient.connectSyncChannel();
      } catch (_e) {
      }
    }
    const applied = await Promise.race([
      fetchAndApplyClinicalOpsFromHost(roomId),
      new Promise((resolve) => {
        setTimeout(() => resolve(false), timeoutMs);
      })
    ]);
    if (applied) return true;
    await Promise.race([
      reconcileLiveSyncRoom(roomId),
      new Promise((resolve) => {
        setTimeout(resolve, timeoutMs);
      })
    ]);
    return false;
  } catch (_e) {
    return false;
  }
}
function syncLiveSyncAfterRoomJoin(roomId) {
  var rid = String(roomId || "").trim();
  if (!rid) return Promise.resolve();
  return reconcileLiveSyncRoom(rid).then(function() {
    if (activeLiveSyncRoomId !== rid) return;
    return fetchAndApplyClinicalOpsFromHost(rid);
  }).then(function() {
    if (activeLiveSyncRoomId !== rid) return;
    applyRoomSyncPhaseAfterReconcile(rid);
    scheduleLiveSyncPush();
    if (lanClient.liveConnected) {
      void enrichLiveSyncHelloPayload(buildLiveSyncHelloPayload(rid)).then(function(hello) {
        if (activeLiveSyncRoomId !== rid) return;
        try {
          lanClient.sendLive(hello);
        } catch (_hello) {
        }
      });
    }
    syncLiveSyncStatusChrome();
    runtime5().renderProcedureAgendaPanel();
    runtime5().refreshAllTodoUIs();
    runtime5().renderPatientList();
    void import("/js/chunks/historia-clinica-lan-sync-5EJLNX2X.js").then(function(m) {
      return m.scheduleFlushAllPendingHistoriaClinicaLanSync();
    });
  });
}
function leaveLiveSyncRoom(opts) {
  opts = opts || {};
  var roomId = activeLiveSyncRoomId;
  if (roomId) {
    void (async function() {
      var bundle = await buildLiveSyncBundleEnvelope(roomId);
      if (!opts.silentLeave) {
        lanClient.sendLive({
          type: "livesync:leave",
          roomId,
          clientId: getLanClientId2(),
          bundle
        });
      }
      saveLocalRoomSnapshot(roomId);
      if (liveSyncBundleHasPayload(bundle)) {
        pushRoomSyncBundleToHost(roomId, bundle);
      }
    })();
  }
  clearActiveLiveSyncRoom();
  if (roomId) clearRoomSyncPhase(roomId);
  clearRoomMembership();
  _liveSyncSessionResyncDone = false;
  stopLiveSyncReconnectLoop();
  lanClient.disconnectLiveChannel();
  syncLiveSyncStatusChrome();
  bridge2().patchLanPanelJoinButtons();
  if (typeof renderLanPanel === "function") bridge2().renderLanPanel();
}
async function joinLanRoom(roomId, displayName) {
  var id = String(roomId || "").trim();
  if (!id) {
    runtime5().showToast("No se pudo identificar la sala. Vuelve a abrir \u21C4 e int\xE9ntalo.", "error");
    return;
  }
  if (!isLanSessionConfiguredForRest()) {
    runtime5().showToast(
      "Primero conecta al servidor del equipo (Activar sala en vivo o pega el enlace de invitaci\xF3n).",
      "error"
    );
    return;
  }
  if (!lanClient.baseUrl()) {
    try {
      bridge2().initLanClientFromStorage();
    } catch (_boot) {
    }
  }
  if (!lanClient.baseUrl()) {
    runtime5().showToast("Falta la direcci\xF3n del servidor LAN. Config\xFArala en \u21C4 antes de unirte.", "error");
    return;
  }
  if (activeLiveSyncRoomId === id && String(lanClient.liveRoomId || "") === id && lanClient.liveConnected) {
    setRoomSyncPhase(id, RoomSyncPhase.joining);
    syncLiveSyncAfterRoomJoin(id);
    _liveSyncSessionResyncDone = true;
    syncLiveSyncStatusChrome();
    bridge2().patchLanPanelJoinButtons();
    runtime5().showToast("Ya est\xE1s en esta sala", "success");
    return;
  }
  if (activeLiveSyncRoomId && activeLiveSyncRoomId !== id) {
    leaveLiveSyncRoom({ silentLeave: false });
  }
  setActiveLiveSyncRoom(id, displayName != null ? String(displayName) : id);
  setRoomSyncPhase(id, RoomSyncPhase.joining);
  syncLiveSyncStatusChrome();
  try {
    if (!lanClient.connected) {
      try {
        lanClient.connectSyncChannel();
      } catch (_sync) {
      }
    }
    lanClient.connectLiveChannel(id);
    setRoomMembership({ roomId: id, label: activeLiveSyncRoomLabel });
    bridge2().rememberLanRoomJoined(id, activeLiveSyncRoomLabel);
    scheduleLiveSyncOutboxFlush();
    startLiveSyncReconnectLoop();
  } catch (_e) {
    clearActiveLiveSyncRoom();
    clearRoomSyncPhase(id);
    runtime5().showToast("No se pudo activar relay de sala", "error");
    return;
  }
  runtime5().showToast("Sala: sincronizando expediente, agenda y pendientes", "success");
  syncLiveSyncStatusChrome();
  bridge2().patchLanPanelJoinButtons();
  await waitForLiveChannelOpen(id, 5e3);
  await syncLiveSyncAfterRoomJoin(id);
  applyRoomSyncPhaseAfterReconcile(id);
  _liveSyncSessionResyncDone = true;
  syncLiveSyncStatusChrome();
}
function registerLanSyncRoomWireHandlers() {
  lanClient.addEventListener("lan-live", function(ev) {
    onLiveSyncWireMessage(ev.detail);
  });
  lanClient.addEventListener("lan-live-status", function(ev) {
    if (!ev.detail) return;
    if (ev.detail.connected && activeLiveSyncRoomId) {
      syncLiveSyncAfterRoomJoin(activeLiveSyncRoomId);
      flushLiveSyncOutbox(activeLiveSyncRoomId);
      void import("/js/chunks/historia-clinica-lan-sync-5EJLNX2X.js").then(function(m) {
        return m.scheduleFlushAllPendingHistoriaClinicaLanSync();
      });
      void maybeRevertSurrogateToPrimary();
    } else if (!ev.detail.connected && activeLiveSyncRoomId) {
      setRoomSyncPhase(activeLiveSyncRoomId, RoomSyncPhase.degraded);
      saveLocalRoomSnapshot(activeLiveSyncRoomId);
      startLiveSyncReconnectLoop();
      if (!lanClient.connected) scheduleSurrogateFailoverCheck();
    }
    syncLiveSyncStatusChrome();
  });
  lanClient.addEventListener("lan-status", function(ev) {
    if (!ev.detail || ev.detail.connected) return;
    if (activeLiveSyncRoomId && getRoomMembership()) scheduleSurrogateFailoverCheck();
  });
}

export {
  registerChromeRuntime,
  t,
  syncFontZoomButtons,
  syncHighContrastButtons,
  getUiDensity,
  isPaseMode,
  isGuardiaMode,
  markOpenedDetailFromPaseBoard,
  toggleGuardiaMode,
  syncPaseReturnHeaderBtn,
  syncUiDensityButtons,
  setUiDensity,
  getProcedureAgendaRowPx,
  initChromeAppearance,
  launchConfetti,
  windowHandlers,
  parseDiagnosticosText,
  formatDiagnosticosCopy,
  applyDiagnosticosInference,
  accesoFechaToDateInputValue,
  dateInputValueToAccesoFecha,
  formatAccesoFechaDisplay,
  ensurePatientAccesos,
  syncLegacyAccesoFields,
  formatAccesosForCenso,
  ensurePatientDiagnosticos,
  diagnosticosTextForCenso,
  migratePatientDiagnosticosFromVpo,
  applyPatientDiagnosticosList,
  preloadNoteDxFromPatient,
  mergeCensoPatientFields,
  pushDiagnosticosToPatient,
  hasElevatedTeamPrivileges,
  normalizeUsername2 as normalizeUsername,
  isValidUsernameFormat2 as isValidUsernameFormat,
  isLegacyMachineUsername,
  CLINICAL_TEAM_SERVICES,
  CLINICAL_SALAS,
  filterJoinedTeams,
  isUserTeamMember,
  parseLanJoinQuery,
  sortTrendSpecsBySomeOrder,
  bhTrendDisplayTitle,
  formatBhExtrasDisplayLine,
  ageYearsFromLabDemographics,
  computeEgfrCkdEpi2021Creatinine,
  reprocessLabResultLines_,
  computeAnionGapValue_,
  isAscitisInterpretacionResLabChunk,
  resLabsHasAsciticFluid_,
  refreshAscitisInterpretacionInResLabs_,
  formatCultivoCondensedForCopy,
  parseCuentaFromCultivoChunkLines,
  buildAtbRisSummaryHtml,
  extractSensCrudasForGermFromSource,
  isParsedCultivoHeaderLine,
  parseCultivo_,
  looksLikeSomeLabReport,
  extractLabReportHora,
  buildRefsBySectionFromReport,
  procesarLabs,
  escTxt,
  renderEntry,
  parsearSecciones,
  extractParsedValues,
  buildParsedBySectionFromResLabs,
  DEMO_SOME_LAB_REPORT,
  OLDER_DEMO_SOME_LAB_REPORT,
  DEMO_GARCIA_LAB_REPORT,
  emptyListado,
  addProblema,
  removeProblema,
  buildTourDemoListadoProblemas,
  normalizeRecetaHuConsultServices,
  normalizeRecetaHuDraft,
  formatRecetaHuFecha,
  buildProximaCitaText,
  buildRecetaHuGeneratePayload,
  TREND_SPARK_WINDOW,
  TREND_DETAIL_DOWNSAMPLE,
  TREND_REFRESH_DEBOUNCE_MS,
  bumpLabHistoryRevision,
  getLabHistoryRevision,
  getTrendRenderWindow,
  trendCatalogSeriesKey,
  buildTrendSeriesIndexCached,
  markPitchTourSessionActive,
  resolvePitchPersistPatients,
  tryRecoverPatientsFromPitchSandboxIfNeeded,
  setPitchPatientIsolation,
  isPitchPatientIsolationActive,
  filterPatientsForPitchTour,
  seedPitchDemo,
  clearPitchDemo,
  getActiveLiveSyncRoomId,
  loadCustomProtocols,
  addCustomProtocol,
  updateCustomProtocol,
  deleteCustomProtocol,
  saveProtocolOverride,
  removeProtocolOverride,
  applyEntryOverrides,
  hasProtocolOverride,
  loadProtoFavorites,
  isProtoFavorite,
  toggleProtoFavorite,
  loadProtoRecentIds,
  toClinicalHistoryText,
  applyClinicalHistoryUppercase,
  shouldUppercaseHcInput,
  applyUppercaseToHcInput,
  filterNewEventualidades,
  createMutationBuilder,
  isLanSessionConfiguredForRest,
  persistLanClientConfig,
  configureLanFromMobileJoin,
  registerLanSyncRoomBridge,
  resolveSelfLanAdvertiseHostUrl,
  buildLiveSyncHelloPayload,
  enrichLiveSyncHelloPayload,
  stopSurrogateFailoverTimer,
  scheduleSurrogateFailoverCheck,
  tryReconnectLanToHostUrl,
  promoteSelfToSurrogateHost,
  maybeRevertSurrogateToPrimary,
  runSurrogateFailoverCheck,
  saveLocalRoomSnapshot,
  buildLiveSyncBundleEnvelope,
  waitForLiveChannelOpen,
  applyRoomSyncPhaseAfterReconcile,
  syncLiveSyncStatusChrome,
  stopLiveSyncReconnectLoop,
  startLiveSyncReconnectLoop,
  bootLanRoomMembership,
  onLiveSyncWireMessage,
  fetchAndApplyClinicalOpsFromHost,
  refreshLanClinicalDirectoryFromRoom,
  syncLiveSyncAfterRoomJoin,
  leaveLiveSyncRoom,
  joinLanRoom,
  registerLanSyncRoomWireHandlers,
  registerLanSyncPushBridge,
  ensureEffectiveLiveSyncRoomId,
  liveSyncBundleHasPayload,
  hostBundleBodyFromEnvelope,
  pushRoomSyncBundleToHost,
  flushLiveSyncOutbox,
  scheduleLiveSyncOutboxFlush,
  scheduleReconcileFromRevisionHint,
  emitLiveSyncRevisionHint,
  scheduleLiveSyncPush,
  sendLiveBundleIfOpen,
  lanPushResult,
  pushClinicalOpsLanNow,
  reconcileLiveSyncRoom,
  isModeSala,
  getDefaultServicio,
  getDefaultCuarto,
  getDefaultCama,
  migrateToV3,
  registerSoapEstadoRuntime,
  mergeSoapMedField,
  openSOAPModalDirect,
  copyToClipboardSafe,
  closeSOAPModal,
  renderEstadoActualBar,
  renderEstadoActualButton,
  windowHandlers2,
  renderLanPanel2 as renderLanPanel,
  syncSettingsLanHostDiskSection,
  syncLanHostTeamCodeSettingsInput,
  closeConnectionDropdown,
  openConnectionDropdown,
  registerLanRuntime,
  acceptServerBundleConflict,
  acceptServerClinicalOpsConflict,
  appendLanConflictDraftsSection,
  lanFetchHostPatientRow,
  lanPushPatientVersioned,
  lanPushHistoriaClinica,
  lanSyncPatientArchivedFlag,
  lanFetchHistoriaClinica,
  touchPatientLanUpdatedAt,
  removePatientLocally,
  emitLiveSyncAgendaUpsert,
  emitLiveSyncAgendaDelete,
  emitLiveSyncTodoUpsert,
  emitLiveSyncTodoDelete,
  emitLiveSyncPatientDelete,
  registerLanSaveHooks,
  windowHandlers3,
  LAN_USERNAME_REGISTER_REQUIRES_ROOM_MSG,
  LAN_PROFILE_PUSH_FAILED_MSG,
  isBenignLanPushSkipCode,
  rememberLiveSyncRoomMembership,
  resolveRoomIdForUsernameRegister,
  ensureLiveSyncRoomForUsernameRegister,
  applyPendingLanInviteFromPage,
  assertLanRoomForUsernameRegister,
  flushClinicalProfileToLan,
  notifyLanProfilePushResult,
  tryMountClinicalTeamInviteBrowserGate,
  safeRenderClinicalTeamsPanel,
  ensureClinicalPanelSession,
  openLanUsersDirectoryModal,
  closeLanUsersDirectoryModal,
  renderCreateTeamForm,
  renderClinicalTeamsPanel,
  teamsModalEl,
  refreshTeamsUiAfterChange,
  openClinicalTeamsPanel,
  closeClinicalTeamsPanel,
  wireBrowseSalaControl,
  wireTeamManageModalDelegation,
  handleEditTeamSubmit,
  handleProfileFormSubmit,
  wireJoinButtons,
  wireCopyInviteButtons,
  wireClinicalTeamsPanelInteractions,
  handleCreateTeamSubmit,
  handleAddMemberSubmit,
  handleMyCycleSubmit,
  consumeClinicalTeamJoinFromUrl,
  wireClinicalTeamsModalChrome2 as wireClinicalTeamsModalChrome,
  wireClinicalTeamsControls,
  openEntregaModal,
  renderGuardiaBoard,
  syncGuardiaModeButtonVisibility,
  clinicalSessionContext,
  resolveClinicalRank,
  mapPatientForGuardiaGrid,
  buildGuardiasMap,
  migrateLocalPatientsClinicalSala,
  bootstrapClinicalAccess,
  resumeClinicalIdentityByUsername,
  refreshClinicalUserProfile,
  wireClinicalOpsSyncRefresh,
  initClinicalAccessRuntime,
  stopClinicalAccessRuntime,
  syncGuardiaCensusPanelVisibility,
  refreshGuardiaCensusFromDb,
  renderGuardiaCensusGrid,
  assertClinicalWriteAllowed,
  signOutgoingLiveSyncMutation,
  verifyIncomingClinicalLedger,
  guardAndSignLiveSyncMutation,
  getClinicalUser,
  getClinicalScopeContextForEvaluate,
  fetchClinicalScopeContextFromDb,
  fetchClinicalTeamsFromDb,
  fetchActiveRotationCycleFromDb,
  fetchIncomingAssignmentsFromDb,
  unlockClinicalSessionOverlay,
  resumeClinicalSession,
  waitForDbUnlock,
  syncDbSecuritySectionUi,
  dbUnlockWindowHandlers
};
//# sourceMappingURL=/js/chunks/chunk-TBI3UFFL.js.map
