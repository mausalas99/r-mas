import {
  openInterconsultModal
} from "/mobile/js/chunks/chunk-VLZVEJ7M.js";
import {
  parseMedFieldItems
} from "/mobile/js/chunks/chunk-CT2YJYKC.js";
import {
  hueForService,
  serviceById,
  toggleInterconsultId
} from "/mobile/js/chunks/chunk-RSNFY6IK.js";
import {
  openPatientDatosModal
} from "/mobile/js/chunks/chunk-GXFOOQYK.js";
import {
  buildLabsGlanceForDay
} from "/mobile/js/chunks/chunk-G75IBCW4.js";
import {
  isGlucometriaMarkedAltered,
  isVitalAltered
} from "/mobile/js/chunks/chunk-7TIZPCQQ.js";
import {
  getLabHistory,
  getMedRecetaByPatient,
  getPatients,
  persistClinicalState,
  resolveEventualidadEntryText,
  scheduleAfterPaintThenIdle,
  sortEntriesDesc
} from "/mobile/js/chunks/chunk-FBUYMHQK.js";
import {
  isTodoOverdue
} from "/mobile/js/chunks/chunk-2SJQGKPU.js";
import {
  storage
} from "/mobile/js/chunks/chunk-YUYECAQZ.js";
import {
  MED_FIELD_KEYS,
  TREND_REFRESH_DEBOUNCE_MS,
  bucketsFromRecetaItems,
  classifyMedicationSoapCategory,
  deriveSnapshot,
  onLabHistoryRevision,
  resolveEaAbxFechaActualizacion,
  rewriteAbxDisplayText
} from "/mobile/js/chunks/chunk-ZSD6QMCL.js";
import {
  escAttr,
  escHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";

// public/js/features/patient-dashboard/ea-glance-model.mjs
var SOAP_ZONES = [
  {
    letter: "N",
    subtitle: "Neuro",
    keys: ["analgesia", "antiemeticos", "sedacion", "antiepilepticos", "antiparkinsonianos", "antidotos"]
  },
  { letter: "V", subtitle: "V\xEDa a\xE9rea", keys: ["viaAerea"] },
  {
    letter: "HD",
    subtitle: "Hemo",
    keys: [
      "vasop",
      "antihta",
      "antitromboticos",
      "anticoagulacion",
      "antiarritmicos",
      "diureticos",
      "diuretico",
      "estatinas"
    ]
  },
  { letter: "HI", subtitle: "Infeccioso", keys: ["abx", "transfusiones"] },
  { letter: "NM", subtitle: "Soporte", keys: ["nm"] }
];
var SOAP_COL_LETTERS = [
  ["N", "V"],
  ["HD"],
  ["HI", "NM"]
];
var KEEP_CAPS_RE = /^(ASA|AAS|NPH|NPT|NM|UTI|ORL|VO|IV|IM|SC|BH|QS|LCR|KCL)$/i;
function hasText(value) {
  return value != null && String(value).trim() !== "";
}
function buildSoporteValue(soporte, soporteLitros) {
  const base = String(soporte).trim();
  if (hasText(soporteLitros)) {
    return `${base} ${String(soporteLitros).trim()} L`;
  }
  return base;
}
var DOSE_CUT_RE = /\s+\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?\s*(?:MCG|MG|G|ML|UI|U|MEQ)(?:\/H)?\b/i;
var VIA_CUT_RE = /\s+\b(?:VO|IV|IM|SC|SL|NEB|INH|EV|C\/\d|CADA|DIA|DÍA|EN CASO|PRN|SOS)\b/i;
var FORM_WORD = "(?:SOLUCI[O\xD3]N(?:ES)?|SUSPENSI[O\xD3]N(?:ES)?|TABLETAS?|COMPRIMIDOS?|C[A\xC1]PSULAS?|AMPOLLETAS?|INYECTABLE|SOBRES?)";
var GLUED_COUNT_FORM_RE = new RegExp("\\s+\\d+(?:[.,]\\d+)?" + FORM_WORD + "\\b.*$", "i");
var COUNT_FORM_RE = new RegExp("\\s+\\d+(?:[.,]\\d+)?\\s+" + FORM_WORD + "\\b.*$", "i");
var FORM_CUT_RE = new RegExp("\\s+" + FORM_WORD + "\\b.*$", "i");
var PARTICLE_RE = /^(de|del|la|el|los|las|en|y|o|u|a)$/i;
function prettyMedWord(word) {
  if (!word) return "";
  if (PARTICLE_RE.test(word)) return word.toLowerCase();
  if (KEEP_CAPS_RE.test(word)) return word.toUpperCase();
  if (/[a-z]/.test(word) && /[A-Z]/.test(word) && word.length > 3) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}
function prettyPhrase(raw) {
  return String(raw || "").split(/([-\s/]+)/).map((tok) => /^[-\s/]+$/.test(tok) ? tok : prettyMedWord(tok)).join("").replace(/\s+/g, " ").trim();
}
function aliasHypertonicNacl(raw) {
  const s = String(raw || "");
  if (!/cloruro\s+de\s+sodio|\bnacl\b/i.test(s)) return "";
  if (!/hipert|17\s*[.,]?\s*7\s*%/i.test(s)) return "";
  return "Hiperton";
}
function glanceMedName(raw) {
  let s = String(raw || "").replace(/\s+\/\/.*$/, "").trim();
  if (!s) return "";
  const nacl = aliasHypertonicNacl(s);
  if (nacl) return nacl;
  if (s.includes(":")) s = s.slice(0, s.indexOf(":")).trim() || s;
  const doseAt = s.search(DOSE_CUT_RE);
  if (doseAt > 0) s = s.slice(0, doseAt);
  const viaAt = s.search(VIA_CUT_RE);
  if (viaAt > 0) s = s.slice(0, viaAt);
  s = s.replace(GLUED_COUNT_FORM_RE, "").trim() || s;
  s = s.replace(COUNT_FORM_RE, "").trim() || s;
  s = s.replace(FORM_CUT_RE, "").trim() || s;
  return prettyPhrase(s);
}
function glanceMedItem(raw) {
  const name = glanceMedName(raw);
  if (!name) return null;
  return { name, token: "", emphasis: false };
}
function dedupeItems(items) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  (items || []).forEach((item) => {
    if (!item || !item.name) return;
    const key = item.name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(item);
  });
  return out;
}
var BASAL_INSULIN_RE = /\b(glargina|lantus|toujeo|degludec|tresiba|detemir|levemir|nph|basal)\b/i;
var RAPIDA_INSULIN_RE = /\b(r[aá]pida|lispro|aspart|glulisina|regular|preprandial|novorapid|humalog|apidra|fiasp)\b/i;
function summarizeNmItems(rawLines) {
  const basal = [];
  const rapida = [];
  const rest = [];
  (rawLines || []).forEach((raw) => {
    const item = glanceMedItem(raw);
    if (!item) return;
    if (BASAL_INSULIN_RE.test(raw) || BASAL_INSULIN_RE.test(item.name)) basal.push({ raw, item });
    else if (RAPIDA_INSULIN_RE.test(raw) || RAPIDA_INSULIN_RE.test(item.name)) rapida.push({ raw, item });
    else rest.push(item);
  });
  if (!basal.length || !rapida.length) {
    return dedupeItems([...basal.map((b) => b.item), ...rapida.map((r) => r.item), ...rest]);
  }
  return [{ name: "Plan Basal Bolo", token: "", emphasis: false }, ...dedupeItems(rest)];
}
function itemsFromRawList(rawList, isNm) {
  const raw = (Array.isArray(rawList) ? rawList : []).map((line) => String(line)).filter(hasText);
  if (isNm) return summarizeNmItems(raw);
  return dedupeItems(raw.map(glanceMedItem));
}
function buildSoapZones(soap) {
  if (!soap || typeof soap !== "object") return [];
  const zones = [];
  SOAP_ZONES.forEach((def) => {
    const raw = [];
    def.keys.forEach((key) => {
      const list = soap[key];
      if (Array.isArray(list)) raw.push(...list);
    });
    const items = itemsFromRawList(raw, def.letter === "NM");
    if (!items.length) return;
    zones.push({ letter: def.letter, subtitle: def.subtitle, items });
  });
  return zones;
}
function packSoapCols(zones) {
  const byLetter = /* @__PURE__ */ Object.create(null);
  (zones || []).forEach((zone) => {
    if (zone && zone.letter) byLetter[zone.letter] = zone;
  });
  return SOAP_COL_LETTERS.map((letters) => letters.map((letter) => byLetter[letter]).filter(Boolean)).filter(
    (col) => col.length
  );
}
function buildEaGlance(input) {
  const kpis = [];
  const {
    soporte,
    soporteLitros,
    dieta,
    bombaOn,
    bombaRate,
    pafi,
    soap
  } = input ?? {};
  if (hasText(soporte)) {
    kpis.push({ label: "Soporte", value: buildSoporteValue(soporte, soporteLitros) });
  }
  if (typeof pafi === "number" && Number.isFinite(pafi)) {
    kpis.push({ label: "PaFi", value: String(pafi) });
  }
  if (hasText(dieta)) {
    kpis.push({ label: "Dieta", value: prettyPhrase(String(dieta).trim()) });
  }
  if (bombaOn === true) {
    kpis.push({
      label: "Bomba",
      value: hasText(bombaRate) ? String(bombaRate).trim() : ""
    });
  }
  return { kpis, soap: buildSoapZones(soap) };
}

// public/js/features/patient-dashboard/ea-glance-meds.mjs
function allActiveSelMap(items) {
  const map = {};
  (Array.isArray(items) ? items : []).forEach((it) => {
    if (it && it.id && !it.suspendido) map[it.id] = true;
  });
  return map;
}
function recetaBucketLines(recetaItems) {
  const items = Array.isArray(recetaItems) ? recetaItems : [];
  if (!items.length) return {};
  const joined = bucketsFromRecetaItems(
    items,
    allActiveSelMap(items),
    classifyMedicationSoapCategory
  );
  const out = {};
  for (const key of MED_FIELD_KEYS) {
    const list = parseMedFieldItems(joined[key]);
    if (list.length) out[key] = list;
  }
  return out;
}
function dedupeMedLines(lines) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  (lines || []).forEach((line) => {
    const name = glanceMedName(line);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) return;
    seen.add(key);
    out.push(line);
  });
  return out;
}
function advanceAbxLines(lines, fechaActualizacion, recetaItems, refDate) {
  const fecha = fechaActualizacion != null ? String(fechaActualizacion).trim() : "";
  if (!lines || !lines.length) return lines;
  return lines.map((line) => rewriteAbxDisplayText(line, fecha, recetaItems, refDate));
}
function collectEaGlanceSoap(input) {
  const ec = input && input.estadoClinico || {};
  const pend = input && input.pendienteReceta || {};
  const fromReceta = recetaBucketLines(input && input.recetaItems);
  const soap = {};
  MED_FIELD_KEYS.forEach((key) => {
    const lines = dedupeMedLines([
      ...parseMedFieldItems(ec[key]),
      ...parseMedFieldItems(pend[key]),
      ...fromReceta[key] || []
    ]);
    if (lines.length) soap[key] = lines;
  });
  if (soap.abx) {
    soap.abx = advanceAbxLines(
      soap.abx,
      input && input.fechaActualizacion,
      input && input.recetaItems,
      input && input.refDate
    );
  }
  return soap;
}

// public/js/features/patient-dashboard/dashboard-model.mjs
function resolveView(inner) {
  return inner === "todo" ? "pendientes" : "resumen";
}
function filterDiagnosticos(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => String(item).trim()).filter(Boolean).slice(0, 3);
}
function buildIdentity(patient) {
  return {
    nombre: patient?.nombre != null ? String(patient.nombre) : "",
    edad: patient?.edad != null ? String(patient.edad).trim() : "",
    sexo: patient?.sexo != null ? String(patient.sexo).trim() : "",
    cuarto: patient?.cuarto != null ? String(patient.cuarto).trim() : "",
    cama: patient?.cama != null ? String(patient.cama).trim() : "",
    diagnosticos: filterDiagnosticos(patient?.diagnosticosList),
    interconsultServiceIds: Array.isArray(patient?.interconsultServiceIds) ? patient.interconsultServiceIds : []
  };
}
function localTodayKey() {
  const d = /* @__PURE__ */ new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function lastItems(items, count) {
  if (!Array.isArray(items) || !items.length) return [];
  return items.slice(-count);
}
function firstItems(items, count) {
  if (!Array.isArray(items) || !items.length) return [];
  return items.slice(0, count);
}
function resolveVitalsSnapshot(monitoreo) {
  if (monitoreo == null || typeof monitoreo !== "object") return null;
  return deriveSnapshot(monitoreo);
}
function lastVitalsAt(monitoreo) {
  var hist = monitoreo && Array.isArray(monitoreo.historial) ? monitoreo.historial : [];
  var latest = "";
  for (var i = 0; i < hist.length; i++) {
    var at = hist[i] && typeof hist[i] === "object" ? hist[i].recordedAt : null;
    if (at != null && String(at) > latest) latest = String(at);
  }
  return latest || null;
}
function buildDashboardModel({
  patient,
  inner,
  labSets,
  eaInput,
  eventualidades,
  pendientes,
  todayKey,
  skipLabs
} = {}) {
  const p = patient ?? {};
  const labs = skipLabs ? { envios: [], pending: true, enRangoCount: 0 } : labSets ? buildLabsGlanceForDay({ todayKey: todayKey ?? localTodayKey(), orderedSets: labSets }) : { envios: [], enRangoCount: 0 };
  return {
    view: resolveView(inner),
    identity: buildIdentity(p),
    vitals: resolveVitalsSnapshot(p.monitoreo),
    vitalsAt: lastVitalsAt(p.monitoreo),
    labs,
    ea: eaInput ? buildEaGlance(eaInput) : { kpis: [], soap: [] },
    eventualidades: firstItems(eventualidades, 3),
    pendientes: lastItems(pendientes, 3)
  };
}

// public/js/features/patient-dashboard/dashboard-html.mjs
function numText(value) {
  if (value == null || value === "") return "";
  var n = Number(value);
  if (Number.isFinite(n)) return String(n);
  return String(value).trim();
}
function readingsFromModel(model) {
  var snap = model && model.vitals;
  if (!snap || typeof snap !== "object") return { vitals: {}, glucometrias: [], io: {} };
  return {
    vitals: snap.vitals && typeof snap.vitals === "object" ? snap.vitals : {},
    glucometrias: Array.isArray(snap.glucometrias) ? snap.glucometrias : [],
    io: snap.io && typeof snap.io === "object" ? snap.io : {}
  };
}
function lastGlu(glucometrias) {
  if (!glucometrias.length) return "";
  var last = glucometrias[glucometrias.length - 1];
  if (last == null) return "";
  if (typeof last === "object") return numText(last.value);
  return numText(last);
}
function ioBalance(io) {
  var ing = Number(io.ing);
  var egr = Number(io.egr);
  if (!Number.isFinite(ing) && !Number.isFinite(egr)) return "";
  var a = Number.isFinite(ing) ? ing : 0;
  var b = Number.isFinite(egr) ? egr : 0;
  var delta = a - b;
  return (delta > 0 ? "+" : "") + String(delta);
}
function vitalCell(label, value, hi) {
  if (!value) return "";
  return '<div class="vital' + (hi ? " hi" : "") + '"><small>' + escHtml(label) + "</small><b>" + escHtml(value) + "</b></div>";
}
function vitalAlteredFlags(v, gluLast, glu) {
  return [
    isVitalAltered("tas", v.tas) || isVitalAltered("tad", v.tad),
    isVitalAltered("fc", v.fc),
    isVitalAltered("fr", v.fr),
    isVitalAltered("temp", v.temp),
    isVitalAltered("sat", v.sat),
    isGlucometriaMarkedAltered(gluLast && typeof gluLast === "object" ? gluLast : { value: glu })
  ];
}
function buildVitalsCellsHtml(v, ta, glu, flags, io) {
  return vitalCell("T/A", ta, flags[0]) + vitalCell("FC", numText(v.fc), flags[1]) + vitalCell("FR", numText(v.fr), flags[2]) + vitalCell("Temp", numText(v.temp), flags[3]) + vitalCell("SatO\u2082", numText(v.sat) ? numText(v.sat) + "%" : "", flags[4]) + vitalCell("Glu", glu, flags[5]) + vitalCell("I/O", io, false);
}
function vitalsAtLabel(vitalsAt) {
  if (!vitalsAt) return "";
  var d = new Date(vitalsAt);
  if (Number.isNaN(d.getTime())) return "";
  return "toma " + d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}
function taLabel(v) {
  var tas = numText(v.tas);
  var tad = numText(v.tad);
  return tas || tad ? (tas || "\u2014") + "/" + (tad || "\u2014") : "";
}
function hasCoreVitalsData(v, ta, glu) {
  return !!(ta || numText(v.fc) || numText(v.fr) || numText(v.temp) || numText(v.sat) || glu);
}
function buildVitalsMetaHtml(atLabel, hasCoreVitals, alteredCount) {
  var metaParts = [];
  if (atLabel) metaParts.push(escHtml(atLabel));
  if (hasCoreVitals && alteredCount) {
    metaParts.push(
      '<span class="vitals-alert-count">' + alteredCount + " fuera de rango</span>"
    );
  }
  return metaParts.length ? '<span class="card-h-meta">' + metaParts.join(" \xB7 ") + "</span>" : "";
}
function renderVitalsHtml(model) {
  var r = readingsFromModel(model);
  var v = r.vitals;
  var ta = taLabel(v);
  var gluList = r.glucometrias;
  var gluLast = gluList.length ? gluList[gluList.length - 1] : null;
  var glu = lastGlu(gluList);
  var io = ioBalance(r.io);
  var flags = vitalAlteredFlags(v, gluLast, glu);
  var cells = buildVitalsCellsHtml(v, ta, glu, flags, io);
  var hasCoreVitals = hasCoreVitalsData(v, ta, glu);
  var emptyClass = hasCoreVitals ? "" : " vitals-card--empty";
  var alteredCount = flags.filter(Boolean).length;
  var atLabel = vitalsAtLabel(model && model.vitalsAt);
  var metaHtml = buildVitalsMetaHtml(atLabel, hasCoreVitals, alteredCount);
  return '<button class="card clickable vitals-card' + emptyClass + '" type="button" data-dash-action="estadoActual"><div class="card-h"><span>Signos vitales</span>' + metaHtml + '</div><div class="card-b"><div class="vitals">' + (cells || '<p class="meta">Sin signos vitales</p>') + "</div></div></button>";
}
function renderIcAssignedHtml(ids) {
  var chips = (Array.isArray(ids) ? ids : []).map(function(id) {
    var svc = serviceById(id);
    if (!svc) return "";
    return '<button type="button" class="svc" style="--h:' + hueForService(svc) + '" data-dash-action="ic-toggle" data-ic-id="' + escAttr(svc.id) + '">' + escHtml(svc.name) + "</button>";
  }).join("");
  return chips + '<button type="button" class="svc-add" data-dash-action="ic-add">+ Agregar</button>';
}
function renderIdentityHtml(model) {
  var idn = model && model.identity || {};
  var dx = Array.isArray(idn.diagnosticos) ? idn.diagnosticos : [];
  var dxHtml = dx.map(function(d) {
    return '<span class="chip">' + escHtml(d) + "</span>";
  }).join("");
  return '<div class="idrow"><div><div class="id-name-row"><h1><button class="dash-name" type="button" data-dash-action="datos">' + escHtml(idn.nombre || "Paciente") + '</button></h1></div><div class="chips" id="ic-assigned">' + dxHtml + renderIcAssignedHtml(idn.interconsultServiceIds) + '</div></div><button type="button" class="btn-med-secondary" data-dash-action="actualizar-labs">Actualizar labs</button></div>';
}
function trendArrowHtml(trend) {
  if (trend === "up") return '<span class="draw-trend is-up">&#8593;</span>';
  if (trend === "down") return '<span class="draw-trend is-down">&#8595;</span>';
  if (trend === "flat") return '<span class="draw-trend is-flat">&#8594;</span>';
  return "";
}
function renderDrawCellHtml(chip) {
  var value = String(chip && chip.value || "").replace(/\*$/, "");
  return '<div class="draw-cell"><span class="draw-label">' + escHtml(String(chip && chip.label || "")) + '</span><span class="draw-value abn">' + escHtml(value) + "</span>" + (chip && chip.delta ? '<span class="draw-delta">' + trendArrowHtml(chip.trend) + " " + escHtml(String(chip.delta)) + "</span>" : '<span class="draw-delta"></span>') + "</div>";
}
function envioChipCount(envio) {
  return (envio.groups || []).reduce(function(n, g) {
    return n + (g.chips ? g.chips.length : 0);
  }, 0);
}
var CLINICAL_PRIORITY_LABELS = [
  "lactato",
  "lac",
  "ph",
  "pco2",
  "po2",
  "bica",
  "bicarbonato",
  "hco3",
  "k",
  "potasio",
  "na",
  "sodio",
  "glu",
  "glucosa",
  "cr",
  "creatinina",
  "bun",
  "hb",
  "hemoglobina",
  "hto",
  "hematocrito",
  "plaquetas",
  "plt",
  "tp",
  "inr"
];
function clinicalPriorityRank(label) {
  var norm = String(label || "").trim().toLowerCase();
  var idx = CLINICAL_PRIORITY_LABELS.indexOf(norm);
  return idx === -1 ? CLINICAL_PRIORITY_LABELS.length : idx;
}
var MAX_DRAW_CELLS = 8;
function sortDrawChips(chips) {
  var indexed = chips.map(function(chip, i) {
    return { chip, i };
  });
  indexed.sort(function(a, b) {
    var aDown = a.chip && a.chip.trend === "down";
    var bDown = b.chip && b.chip.trend === "down";
    if (aDown && bDown) {
      var aMag = Math.abs(parseFloat(String(a.chip.delta).replace(/^[+-]/, ""))) || 0;
      var bMag = Math.abs(parseFloat(String(b.chip.delta).replace(/^[+-]/, ""))) || 0;
      if (aMag !== bMag) return bMag - aMag;
      return a.i - b.i;
    }
    if (aDown !== bDown) return aDown ? -1 : 1;
    var aRank = clinicalPriorityRank(a.chip && a.chip.label);
    var bRank = clinicalPriorityRank(b.chip && b.chip.label);
    if (aRank !== bRank) return aRank - bRank;
    return a.i - b.i;
  });
  return indexed.map(function(entry) {
    return entry.chip;
  });
}
function visibleDrawChips(envio) {
  var all = (envio.groups || []).reduce(function(acc, g) {
    return acc.concat(g.chips || []);
  }, []);
  return sortDrawChips(all).slice(0, MAX_DRAW_CELLS);
}
function renderDrawHtml(envio, totalAltered) {
  var visible = visibleDrawChips(envio);
  var cells = visible.map(renderDrawCellHtml).join("");
  var count = visible.length;
  return '<button class="draw' + (envio.wide ? " is-wide" : "") + '" type="button" data-dash-action="labs-envio" data-lab-set-id="' + escAttr(String(envio.id || "")) + '"><div class="draw-head"><span class="draw-head-label">LABS FUERA DE RANGO' + (totalAltered ? " &middot; " + count + " DE " + totalAltered : "") + "</span>" + (envio.hora ? '<span class="draw-head-caption">corte ' + escHtml(envio.hora) + " &middot; el resto en Laboratorio</span>" : "") + '</div><div class="draw-grid">' + cells + "</div></button>";
}
function dedupeChipsAcrossEnvios(visibleEnvios) {
  var seenLabels = {};
  var deduped = [];
  for (var i = visibleEnvios.length - 1; i >= 0; i -= 1) {
    var envio = visibleEnvios[i];
    var groups = (envio.groups || []).map(function(g) {
      var chips = (g.chips || []).filter(function(chip) {
        var norm = String(chip && chip.label || "").trim().toLowerCase();
        if (seenLabels[norm]) return false;
        seenLabels[norm] = true;
        return true;
      });
      return { tipo: g.tipo, chips };
    });
    deduped.unshift(Object.assign({}, envio, { groups }));
  }
  return deduped.filter(function(envio2) {
    return envioChipCount(envio2) > 0;
  });
}
function renderLabsHtml(model) {
  var labs = model && model.labs || {};
  var pending = !!labs.pending;
  var envios = Array.isArray(labs.envios) ? labs.envios : [];
  var visibleEnvios = dedupeChipsAcrossEnvios(envios.slice(-2));
  var totalAltered = envios.reduce(function(n, e) {
    return n + envioChipCount(e);
  }, 0);
  var enRango = Number(labs.enRangoCount) || 0;
  var enRangoHtml = !pending && enRango > 0 ? '<p class="labs-en-rango">' + enRango + " valores en rango</p>" : "";
  var body;
  if (pending) {
    body = "";
  } else if (visibleEnvios.length) {
    body = '<div class="day-draws">' + visibleEnvios.map(function(envio) {
      return renderDrawHtml(envio, totalAltered);
    }).join("") + "</div>" + enRangoHtml;
  } else if (enRango > 0) {
    body = enRangoHtml;
  } else {
    body = '<p class="empty-hint">Sin labs de hoy</p>';
  }
  return '<div class="card labs-card clickable" data-dash-labs data-dash-action="labs-full"><div class="card-h">Labs' + (visibleEnvios.length ? ": fuera de rango" : "") + '</div><div class="card-b">' + body + "</div></div>";
}
function medItemName(item) {
  if (item == null) return "";
  if (typeof item === "string") return item;
  return String(item.name || "");
}
function medItemToken(item) {
  if (!item || typeof item === "string") return "";
  return String(item.token || "");
}
function renderMedItemHtml(item) {
  var name = medItemName(item);
  if (!name) return "";
  var token = medItemToken(item);
  var emphasis = item && typeof item === "object" && item.emphasis;
  return '<div class="med"><span class="name">' + escHtml(name) + "</span>" + (token ? '<span class="meta' + (emphasis ? " is-key" : "") + '">' + escHtml(token) + "</span>" : "") + "</div>";
}
function renderSoapZoneHtml(zone, headingClass) {
  var meds = (zone.items || []).map(renderMedItemHtml).join("");
  var letter = String(zone.letter || "");
  return '<span class="' + (headingClass || "z") + '" data-soap="' + escAttr(letter) + '">' + escHtml(letter) + (zone.subtitle ? " <em>" + escHtml(zone.subtitle) + "</em>" : "") + "</span>" + meds;
}
function renderEaSoapHtml(soap) {
  return packSoapCols(soap || []).map(function(col) {
    return "<section>" + col.map(function(zone, i) {
      return renderSoapZoneHtml(zone, i === 0 ? "z" : "z2");
    }).join("") + "</section>";
  }).join("");
}
function renderMedsHtml(model) {
  var soap = model && model.ea && model.ea.soap;
  if (!soap || !soap.length) return "";
  return '<div class="bento meds-band"><button class="card clickable meds-card" type="button" data-dash-action="estadoActual"><div class="card-h">Medicamentos</div><div class="card-b"><div class="soap-pack">' + renderEaSoapHtml(soap) + "</div></div></button></div>";
}
function rowTime(item) {
  if (item == null) return "";
  if (typeof item === "string") return "";
  if (item.time) return String(item.time);
  if (item.dueDate) return "Vence";
  if (item.at) {
    var d = new Date(item.at);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    }
  }
  return "";
}
function rowText(item) {
  if (item == null) return "";
  if (typeof item === "string") return item;
  return String(item.text || "");
}
function renderRowsHtml(items, emptyText, markOverdue) {
  var list = Array.isArray(items) ? items : [];
  if (!list.length) {
    return '<p class="empty-hint">' + escHtml(emptyText || "Sin registros") + "</p>";
  }
  return '<ul class="rows">' + list.map(function(item) {
    var overdue = !!markOverdue && isTodoOverdue(item);
    var t = rowTime(item);
    return "<li" + (overdue ? ' class="is-overdue"' : "") + ">" + (overdue ? '<b class="due-tag">Vencido</b> ' : t ? "<time>" + escHtml(t) + "</time> " : "") + escHtml(rowText(item)) + "</li>";
  }).join("") + "</ul>";
}
function renderListCardHtml(title, action, items, emptyText, markOverdue) {
  return '<button class="card clickable" type="button" data-dash-action="' + escAttr(action) + '"><div class="card-h">' + escHtml(title) + '</div><div class="card-b">' + renderRowsHtml(items, emptyText, markOverdue) + "</div></button>";
}
function renderDashboardHtml(model) {
  var m = model || {};
  return '<div class="patient-dash dash">' + renderIdentityHtml(m) + '<div class="bento vitals-labs">' + renderVitalsHtml(m) + renderLabsHtml(m) + '</div><div class="bento rest">' + renderListCardHtml("Eventualidades", "eventualidades", m.eventualidades, "Sin eventualidades") + renderListCardHtml("Pendientes", "pendientes", m.pendientes, "Sin pendientes", true) + "</div>" + renderMedsHtml(m) + "</div>";
}

// public/js/features/patient-dashboard/dashboard-mount.mjs
function syncInterconsultaModeChrome() {
  import("/mobile/js/chunks/interconsulta-mode-chrome-UZYTOZA5.js").then(function(mod) {
    mod.syncInterconsultaModeChrome();
  });
}
var rt = {
  getActiveId() {
    return null;
  },
  getActiveInner() {
    return "resumen";
  },
  getActiveAppTab() {
    return "nota";
  },
  switchAppTab() {
  },
  switchInnerTab() {
  },
  navigateToEstadoActualPanel() {
  },
  persistClinicalState,
  openLabRepoBatchModal() {
  },
  loadLabHistorySetIntoOutput() {
  },
  setLabHistorySelectedSetId() {
  }
};
function registerPatientDashboardRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt, ctx);
  wireDashboardLabRefresh();
}
function activePatient() {
  var id = rt.getActiveId();
  if (!id) return null;
  return getPatients().find(function(p) {
    return String(p.id) === String(id);
  }) || null;
}
function buildEaInputFromPatient(patient, opts) {
  opts = opts && typeof opts === "object" ? opts : {};
  var mon = patient && patient.monitoreo || {};
  var ec = mon.estadoClinico && typeof mon.estadoClinico === "object" ? mon.estadoClinico : {};
  var recetaMap = opts.medRecetaByPatient || getMedRecetaByPatient();
  var receta = patient && patient.id ? recetaMap[patient.id] : null;
  var soap = collectEaGlanceSoap({
    estadoClinico: ec,
    pendienteReceta: mon.pendienteReceta,
    recetaItems: receta && receta.items,
    fechaActualizacion: resolveEaAbxFechaActualizacion(patient && patient.id, recetaMap, mon),
    refDate: opts.refDate
  });
  var bombaOn = !!(Array.isArray(mon.historial) && mon.historial.some(function(row) {
    return row && Array.isArray(row.bombaInsulina) && row.bombaInsulina.length;
  }));
  return {
    soporte: ec.soporte,
    soporteLitros: ec.soporteLitros,
    dieta: ec.dieta,
    bombaOn,
    soap
  };
}
function collectEventualidades(patient) {
  var entries = patient && patient.eventualidades && patient.eventualidades.entries;
  return sortEntriesDesc(entries).map(function(e) {
    return {
      at: e && e.at,
      text: resolveEventualidadEntryText(e && e.text, e && e.kind)
    };
  });
}
function collectPendientes(patientId) {
  if (!patientId) return [];
  return (storage.getTodos(patientId) || []).filter(function(t) {
    return t && !t.completed && String(t.text || "").trim();
  });
}
function collectDashboardModel(inner, opts) {
  var patient = activePatient() || {};
  var pid = patient.id;
  var skipLabs = !!(opts && opts.skipLabs);
  return buildDashboardModel({
    patient,
    inner: inner || rt.getActiveInner(),
    labSets: skipLabs ? null : pid ? getLabHistory()[pid] || [] : [],
    eaInput: buildEaInputFromPatient(patient),
    eventualidades: collectEventualidades(patient),
    pendientes: collectPendientes(pid),
    skipLabs
  });
}
function syncPacienteCompositeVisibility(inner) {
  var onResumen = inner === "resumen";
  var onTodo = inner === "todo";
  var dash = document.getElementById("patient-dashboard-mount");
  var pend = document.querySelector("#itab-content-paciente .exp-pendientes-mount");
  var head = document.getElementById("exp-pendientes-header");
  if (dash) dash.hidden = !onResumen;
  if (pend) pend.hidden = !onTodo;
  if (head) head.hidden = !onTodo;
}
function persistIcToggle(id) {
  var patient = activePatient();
  if (!patient) return [];
  var cur = Array.isArray(patient.interconsultServiceIds) ? patient.interconsultServiceIds : [];
  var next = toggleInterconsultId(cur, id);
  patient.interconsultServiceIds = next;
  if (typeof rt.persistClinicalState === "function") rt.persistClinicalState();
  else persistClinicalState();
  renderPatientDashboard();
  return next;
}
function openLabs(setId) {
  if (typeof rt.switchAppTab === "function") rt.switchAppTab("lab");
  var pid = rt.getActiveId();
  if (setId && typeof rt.setLabHistorySelectedSetId === "function" && pid) {
    rt.setLabHistorySelectedSetId(pid, setId);
  }
  if (setId && typeof rt.loadLabHistorySetIntoOutput === "function") {
    rt.loadLabHistorySetIntoOutput(setId, { silent: true });
  }
}
function openLabsRepoModal() {
  if (typeof rt.openLabRepoBatchModal === "function") rt.openLabRepoBatchModal();
  else if (typeof window.openLabRepoBatchModal === "function") window.openLabRepoBatchModal();
}
function switchDashInner(tab) {
  if (tab === "estadoActual" && typeof rt.navigateToEstadoActualPanel === "function") {
    rt.navigateToEstadoActualPanel();
    return;
  }
  if (typeof rt.switchInnerTab === "function") rt.switchInnerTab(tab);
}
function handleDashboardAction(action, el) {
  if (action === "datos") {
    openPatientDatosModal();
    return;
  }
  if (action === "actualizar-labs") {
    openLabsRepoModal();
    return;
  }
  if (action === "ic-add") {
    var p = activePatient();
    openInterconsultModal({
      assignedIds: p && p.interconsultServiceIds || [],
      onToggle: persistIcToggle,
      trigger: el
    });
    return;
  }
  if (action === "ic-toggle") {
    persistIcToggle(el.getAttribute("data-ic-id"));
    return;
  }
  if (action === "labs-envio" || action === "labs-full") {
    openLabs(el.getAttribute("data-lab-set-id"));
    return;
  }
  if (action === "estadoActual") switchDashInner("estadoActual");
  else if (action === "eventualidades") switchDashInner("eventualidades");
  else if (action === "pendientes") switchDashInner("todo");
}
var dashWiredHosts = /* @__PURE__ */ new Set();
var dashBackWired = false;
var dashLabWired = false;
var dashLabTimer = null;
var dashPainting = false;
function shouldRefreshDashboardForLabs(appTab, inner) {
  if (appTab && appTab !== "nota") return false;
  return inner === "resumen";
}
function paintDashboardFromLabRevision(patientId) {
  if (dashPainting) return;
  if (String(patientId || "") !== String(rt.getActiveId() || "")) return;
  var appTab = typeof rt.getActiveAppTab === "function" ? rt.getActiveAppTab() : "nota";
  var inner = rt.getActiveInner() || "resumen";
  if (!shouldRefreshDashboardForLabs(appTab, inner)) return;
  dashPainting = true;
  try {
    renderPatientDashboard(null, { settle: false });
  } finally {
    dashPainting = false;
  }
}
function scheduleDashboardLabRefresh(patientId) {
  if (String(patientId || "") !== String(rt.getActiveId() || "")) return;
  if (dashLabTimer) clearTimeout(dashLabTimer);
  dashLabTimer = setTimeout(function() {
    dashLabTimer = null;
    paintDashboardFromLabRevision(patientId);
  }, TREND_REFRESH_DEBOUNCE_MS);
}
function wireDashboardLabRefresh() {
  if (dashLabWired) return;
  dashLabWired = true;
  onLabHistoryRevision(scheduleDashboardLabRefresh);
}
function wireDashboardHost(mount) {
  if (!mount || dashWiredHosts.has(mount)) return;
  dashWiredHosts.add(mount);
  mount.addEventListener("click", function(ev) {
    var t = ev.target;
    if (!t || typeof t.closest !== "function") return;
    var btn = t.closest("[data-dash-action]");
    if (!btn || !mount.contains(btn)) return;
    handleDashboardAction(btn.getAttribute("data-dash-action"), btn);
  });
}
function wireDashboardOnce() {
  wireDashboardLabRefresh();
  wireDashboardHost(document.getElementById("patient-dashboard-mount"));
  if (dashBackWired) return;
  dashBackWired = true;
  var back = document.getElementById("btn-volver-al-resumen");
  if (back) {
    back.addEventListener("click", function() {
      if (typeof rt.switchInnerTab === "function") rt.switchInnerTab("resumen");
    });
  }
}
function dashboardHostIsPaintable(el, wrapEl) {
  if (!el) return false;
  if (el.hidden) return false;
  if (wrapEl && (wrapEl.hidden || wrapEl.style && wrapEl.style.display === "none")) {
    return false;
  }
  return true;
}
function resolveDashboardPaintTargets(opts) {
  opts = opts || {};
  if (opts.hostEl) return [opts.hostEl];
  var inner = opts.inner || "resumen";
  var targets = [];
  if (opts.classic && inner === "resumen" && dashboardHostIsPaintable(opts.classic, opts.classicWrap)) {
    targets.push(opts.classic);
  }
  return targets;
}
function localTodayKey2() {
  var d = /* @__PURE__ */ new Date();
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}
function fillDashboardLabs(targets, pid) {
  if (String(rt.getActiveId() || "") !== String(pid || "")) return;
  var html = renderLabsHtml({
    labs: pid ? buildLabsGlanceForDay({
      todayKey: localTodayKey2(),
      orderedSets: getLabHistory()[pid] || []
    }) : { envios: [] }
  });
  targets.forEach(function(mount) {
    if (!mount || !mount.isConnected) return;
    var slot = mount.querySelector("[data-dash-labs]");
    if (slot) slot.outerHTML = html;
  });
}
function renderPatientDashboard(hostEl, opts) {
  opts = opts || {};
  wireDashboardOnce();
  var inner = rt.getActiveInner() || "resumen";
  syncPacienteCompositeVisibility(inner);
  var targets = resolveDashboardPaintTargets({
    hostEl: hostEl || null,
    classic: document.getElementById("patient-dashboard-mount"),
    classicWrap: document.getElementById("patient-expediente-classic"),
    inner
  });
  if (!targets.length) return;
  var deferLabs = !!opts.deferLabs;
  var pid = rt.getActiveId();
  var html = renderDashboardHtml(collectDashboardModel(inner, { skipLabs: deferLabs }));
  targets.forEach(function(mount) {
    wireDashboardHost(mount);
    mount.innerHTML = html;
  });
  syncInterconsultaModeChrome();
  if (!deferLabs) return;
  scheduleAfterPaintThenIdle(function() {
    fillDashboardLabs(targets, pid);
  });
}
var windowHandlers = {
  renderPatientDashboard
};

export {
  registerPatientDashboardRuntime,
  buildEaInputFromPatient,
  syncPacienteCompositeVisibility,
  persistIcToggle,
  shouldRefreshDashboardForLabs,
  dashboardHostIsPaintable,
  resolveDashboardPaintTargets,
  renderPatientDashboard,
  windowHandlers
};
//# sourceMappingURL=/js/chunks/chunk-UXSQMVIE.js.map
