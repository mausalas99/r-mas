import {
  buildEstadoActualText
} from "/mobile/js/chunks/chunk-HU5IKSXZ.js";
import {
  formatPatientBedLabel,
  shortenPatientDisplayName
} from "/mobile/js/chunks/chunk-VORZBJRG.js";
import {
  admissionDateForPatient,
  buildModeFrameHtml
} from "/mobile/js/chunks/chunk-SEHESZ4A.js";
import "/mobile/js/chunks/chunk-G2QTTDSA.js";
import "/mobile/js/chunks/chunk-WEWTMUQK.js";
import "/mobile/js/chunks/chunk-77VTEV4X.js";
import "/mobile/js/chunks/chunk-RBUONLJQ.js";
import "/mobile/js/chunks/chunk-2GD37PRJ.js";
import "/mobile/js/chunks/chunk-5CRK7XGO.js";
import {
  buildLabsGlanceForDay
} from "/mobile/js/chunks/chunk-G75IBCW4.js";
import "/mobile/js/chunks/chunk-7TIZPCQQ.js";
import "/mobile/js/chunks/chunk-XS2CWLHC.js";
import "/mobile/js/chunks/chunk-WF6PJVIL.js";
import "/mobile/js/chunks/chunk-7XJNQXQX.js";
import "/mobile/js/chunks/chunk-US2NRS5S.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-4V75H66Y.js";
import "/mobile/js/chunks/chunk-P2TSIQM4.js";
import "/mobile/js/chunks/chunk-QLSLJE42.js";
import {
  showUndoToast
} from "/mobile/js/chunks/chunk-EASTAY6S.js";
import "/mobile/js/chunks/chunk-VH7DMNPL.js";
import "/mobile/js/chunks/chunk-LF5B36KU.js";
import "/mobile/js/chunks/chunk-7TJEM4JY.js";
import {
  getLabHistory,
  persistClinicalState
} from "/mobile/js/chunks/chunk-FBUYMHQK.js";
import "/mobile/js/chunks/chunk-2SJQGKPU.js";
import "/mobile/js/chunks/chunk-YUYECAQZ.js";
import "/mobile/js/chunks/chunk-FLCMQPNP.js";
import "/mobile/js/chunks/chunk-G6B5EEF6.js";
import "/mobile/js/chunks/chunk-6CYAI7OE.js";
import "/mobile/js/chunks/chunk-4ALI7FVW.js";
import {
  deriveSnapshot
} from "/mobile/js/chunks/chunk-ZSD6QMCL.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import {
  escAttr,
  escHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-WAILSXBQ.js";
import "/mobile/js/chunks/chunk-IVEQE6G4.js";
import "/mobile/js/chunks/chunk-UDWVBKE4.js";
import "/mobile/js/chunks/chunk-X2R3ZGWP.js";
import "/mobile/js/chunks/chunk-QFKCJNWT.js";
import "/mobile/js/chunks/chunk-K5SBVD6P.js";
import "/mobile/js/chunks/chunk-FSGBGJHB.js";
import "/mobile/js/chunks/chunk-7CF6AX3C.js";
import "/mobile/js/chunks/chunk-A7GKLJFV.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-FLGCYVFI.js";

// public/js/features/nota-evolucion/nota-evolucion-html.mjs
var PLAN_MARKS = ["nuevo", "sin cambio", "pendiente", "suspende"];
function nextPlanMark(mark) {
  const i = PLAN_MARKS.indexOf(mark);
  return PLAN_MARKS[(i + 1 + PLAN_MARKS.length) % PLAN_MARKS.length] || PLAN_MARKS[0];
}
function buildPlanMarkHtml(mark) {
  const safe = PLAN_MARKS.includes(mark) ? mark : PLAN_MARKS[1];
  const cls = safe.replace(/\s+/g, "-");
  return `<span class="ne-plan-mark ne-plan-mark--${escAttr(cls)}">${escHtml(safe)}</span>`;
}
function buildObjetivoZoneHtml(zone) {
  const rows = zone.items.map(
    (item) => `<div class="ne-objetivo-item${item.altered ? " ne-objetivo-item--alert" : ""}">${escHtml(item.text)}</div>`
  ).join("");
  return `<div class="ne-objetivo-zone" data-ne-objetivo-zone="${escAttr(zone.id)}"><div class="ne-zone-label">${escHtml(zone.id)} <span class="ne-zone-label-full">${escHtml(zone.label)}</span></div><div class="ne-objetivo-zone-content"><div class="ne-objetivo-zone-body">${rows}</div><textarea class="ne-objetivo-narrative" rows="2" placeholder="Narrativa de ${escAttr(zone.label)}\u2026" data-ne-objetivo-narrative="${escAttr(zone.id)}">${escHtml(zone.narrative || "")}</textarea></div></div>`;
}
function buildObjetivoSectionHtml(objetivo) {
  const zones = objetivo && objetivo.zones || [];
  const body = zones.length ? zones.map(buildObjetivoZoneHtml).join("") : '<div class="ne-empty-hint">Sin signos vitales ni laboratorio de hoy para derivar.</div>';
  return `<div class="soap-section ne-section-o"><div class="soap-section-header">O \xB7 Objetivo <span class="ne-section-hint">(signos/labs derivados \xB7 narrativa editable)</span></div><div class="soap-section-body"><div class="ne-objetivo-zones">${body}</div></div></div>`;
}
function buildPlanZoneHtml(zone) {
  const rows = zone.items.map(
    (item) => `<div class="ne-plan-row" data-ne-plan-item="${escAttr(item.id)}"><input type="text" class="ne-plan-row-text" data-ne-plan-edit="${escAttr(item.id)}" value="${escAttr(item.text)}" aria-label="Editar indicaci\xF3n"><button type="button" class="ne-plan-row-mark-btn" data-ne-plan-cycle="${escAttr(item.id)}" title="Cambiar marca">` + buildPlanMarkHtml(item.mark) + `</button><button type="button" class="ne-plan-row-remove" data-ne-plan-remove="${escAttr(item.id)}" aria-label="Quitar">\xD7</button></div>`
  ).join("");
  return `<div class="ne-plan-zone" data-ne-plan-zone="${escAttr(zone.id)}"><div class="ne-zone-label">${escHtml(zone.id)} <span class="ne-zone-label-full">${escHtml(zone.label)}</span></div><div class="ne-plan-zone-body">${rows}</div><div class="ne-plan-add-row"><input type="text" class="ne-plan-add-input" data-ne-plan-add="${escAttr(zone.id)}" placeholder="Agregar indicaci\xF3n\u2026"></div></div>`;
}
function buildPlanSectionHtml(planZones) {
  const zones = Array.isArray(planZones) ? planZones : [];
  return `<div class="soap-section ne-section-p"><div class="soap-section-header">P \xB7 Plan</div><div class="soap-section-body"><div class="ne-plan-zones">${zones.map(buildPlanZoneHtml).join("")}</div></div></div>`;
}
function buildInsertarPanelHtml(insertables) {
  const items = Array.isArray(insertables) ? insertables : [];
  const body = items.length ? items.map(
    (item) => '<div class="ne-insertar-item" data-ne-insertar-row="' + escAttr(item.id) + `"><div class="ne-insertar-item-text"><span class="ne-insertar-item-title">${escHtml(item.title)}</span>` + (item.subtitle ? `<span class="ne-insertar-item-subtitle">${escHtml(item.subtitle)}</span>` : "") + `</div><button type="button" class="ne-insertar-action" data-ne-insertar-item="${escAttr(item.id)}">Insertar</button></div>`
  ).join("") : '<div class="ne-empty-hint">Nada pendiente de insertar.</div>';
  return `<div class="soap-section ne-aside-panel ne-aside-panel--insertar"><div class="soap-section-header ne-aside-panel-header"><span class="ne-aside-panel-title">Sin insertar \xB7 ${items.length}</span>` + (items.length ? '<button type="button" class="ne-aside-panel-action" data-ne-insertar-all>Insertar todo</button>' : "") + `</div><div class="ne-aside-panel-body">${body}</div></div>`;
}
function buildCambiosPanelHtml(cambios) {
  const items = Array.isArray(cambios) ? cambios : [];
  const body = items.length ? items.map((item) => `<div class="ne-cambios-item">${escHtml(item.text)}</div>`).join("") : '<div class="ne-empty-hint">Sin cambios registrados desde ayer.</div>';
  return `<div class="soap-section ne-aside-panel ne-aside-panel--cambios"><div class="soap-section-header ne-aside-panel-header"><span class="ne-aside-panel-title">Cambi\xF3 desde ayer</span></div><div class="ne-aside-panel-body">${body}</div></div>`;
}
function buildNotaHeaderHtml(header) {
  const h = header || {};
  return buildModeFrameHtml({
    modeName: "Nota de evoluci\xF3n",
    context: h.context || "",
    metadata: h.metadata || "",
    secondaryActions: [
      { label: "Copiar nota de ayer", title: "Copiar nota de ayer" },
      { label: "Vista de impresi\xF3n", title: "Vista de impresi\xF3n" }
    ],
    // Mockup #9a (L795-812) has 3 plain buttons and no ⌘/ badge; this screen
    // has nothing today for that shortcut to open, so it is suppressed
    // rather than shipped as dead chrome (see mode-frame.mjs's `showShortcut`).
    showShortcut: false,
    primaryAction: { label: "Firmar y cerrar" }
  });
}
function buildNotaEvolucionHtml(note) {
  const n = note || {};
  const headerHtml = buildNotaHeaderHtml(n.header || {});
  const main = `<div class="soap-section ne-section-s" style="flex-shrink:0;"><div class="soap-section-header">S \xB7 Subjetivo</div><div class="soap-section-body"><textarea id="ne-subjetivo" rows="2" placeholder="Refiere / niega\u2026" data-ne-subjetivo>${escHtml(n.subjetivo || "")}</textarea></div></div>` + buildObjetivoSectionHtml(n.objetivo || { zones: [] }) + `<div class="soap-section ne-section-a"><div class="soap-section-header">A \xB7 An\xE1lisis</div><div class="soap-section-body"><textarea id="ne-analisis" class="ne-analisis-textarea" rows="10" placeholder="Juicio cl\xEDnico, integraci\xF3n diagn\xF3stica, riesgo\u2026" data-ne-analisis>${escHtml(n.analisis || "")}</textarea></div></div>` + buildPlanSectionHtml(n.plan || []);
  const aside = buildInsertarPanelHtml(n.insertables || []) + buildCambiosPanelHtml(n.cambios || []);
  return '<div class="ne-modal-body">' + headerHtml + `<div class="ne-layout"><div class="ne-layout-main">${main}</div><div class="ne-layout-aside">${aside}</div></div></div>`;
}

// lib/nota-evolucion/objetivo-derive.mjs
var VITAL_DEFS = {
  fr: { key: "fr", label: "FR", unit: "rpm" },
  sat: { key: "sat", label: "SatO2", unit: "%" },
  tas: { key: "tas", label: "TAS", unit: "mmHg" },
  tad: { key: "tad", label: "TAD", unit: "mmHg" },
  fc: { key: "fc", label: "FC", unit: "lpm" },
  temp: { key: "temp", label: "Temperatura", unit: "\xB0C" }
};
var VITAL_RANGES = {
  tas: { min: 90, max: 140 },
  tad: { min: 60, max: 90 },
  fc: { min: 60, max: 100 },
  fr: { min: 12, max: 20 },
  temp: { min: 36, max: 37.5 },
  sat: { min: 94, max: Infinity }
};
var OBJETIVO_ZONES = [
  { id: "N", label: "Neurol\xF3gico", vitalKeys: [] },
  { id: "V", label: "Ventilatorio", vitalKeys: ["fr", "sat"] },
  { id: "HD", label: "Hemodin\xE1mico", vitalKeys: ["tas", "tad", "fc"] },
  { id: "HI", label: "Infeccioso / T\xE9rmico", vitalKeys: ["temp"] },
  { id: "NM", label: "Nutricional / Metab\xF3lico", vitalKeys: [] }
];
var ZONE_LAB_KEYWORDS = {
  N: ["sodio", "na", "amonio"],
  V: ["po2", "pco2", "saturacion", "gasometria"],
  HD: ["hemoglobina", "hb", "hematocrito", "hto", "troponina", "bnp"],
  HI: ["leucocitos", "leucos", "pcr", "procalcitonina", "neutrofilos"],
  NM: ["glucosa", "glu", "potasio", "k", "creatinina", "cr", "bun", "urea"]
};
function toNumberOrNull(raw) {
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(String(raw).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function isVitalOutOfRange(key, raw) {
  const n = toNumberOrNull(raw);
  if (n == null) return false;
  const r = VITAL_RANGES[key];
  if (!r) return false;
  return n < r.min || n > r.max;
}
function isLabOutOfRange(lab) {
  if (!lab || typeof lab !== "object") return false;
  if (typeof lab.altered === "boolean") return lab.altered;
  const v = toNumberOrNull(lab.value);
  const min = toNumberOrNull(lab.min);
  const max = toNumberOrNull(lab.max);
  if (v == null || min == null || max == null) return false;
  return v < min || v > max;
}
function vitalItem(key, raw) {
  const n = toNumberOrNull(raw);
  if (n == null) return null;
  const def = VITAL_DEFS[key];
  if (!def) return null;
  return {
    text: `${def.label} ${n}${def.unit ? " " + def.unit : ""}`,
    altered: isVitalOutOfRange(key, raw)
  };
}
function labItemForZone(lab, keywords) {
  if (!lab || typeof lab !== "object") return null;
  const key = String(lab.key || lab.label || "").toLowerCase();
  if (!key || !keywords.some((kw) => key.includes(kw))) return null;
  const value = lab.value == null || lab.value === "" ? null : lab.value;
  if (value == null) return null;
  const label = String(lab.label || lab.key || "").trim();
  const unit = lab.unit ? " " + String(lab.unit) : "";
  return { text: `${label} ${value}${unit}`, altered: isLabOutOfRange(lab) };
}
function labItemsForZone(zoneId, labs) {
  const keywords = ZONE_LAB_KEYWORDS[zoneId] || [];
  if (!Array.isArray(labs) || !labs.length || !keywords.length) return [];
  const items = [];
  for (const lab of labs) {
    const item = labItemForZone(lab, keywords);
    if (item) items.push(item);
  }
  return items;
}
function deriveObjetivoZones(input) {
  const vitals = input && input.vitals && typeof input.vitals === "object" ? input.vitals : {};
  const labs = input && Array.isArray(input.labs) ? input.labs : [];
  const zones = [];
  let hasAnyData = false;
  for (const zoneDef of OBJETIVO_ZONES) {
    const items = [];
    for (const vKey of zoneDef.vitalKeys) {
      const item = vitalItem(vKey, vitals[vKey]);
      if (item) items.push(item);
    }
    items.push(...labItemsForZone(zoneDef.id, labs));
    if (items.length) hasAnyData = true;
    zones.push({ id: zoneDef.id, label: zoneDef.label, items });
  }
  return { zones, hasAnyData };
}
function buildObjetivoText(zones) {
  if (!Array.isArray(zones) || !zones.length) return "";
  return zones.filter((zone) => Array.isArray(zone.items) && zone.items.length).map((zone) => {
    const body = zone.items.map((item) => item.text + (item.altered ? "*" : "")).join(", ");
    return `${zone.id}: ${body}`;
  }).join("\n");
}
function buildObjetivoSnapshot(input, options) {
  const now = options && typeof options.now === "function" ? options.now : () => /* @__PURE__ */ new Date();
  const { zones } = deriveObjetivoZones(input);
  return {
    zones,
    text: buildObjetivoText(zones),
    confirmedAt: now().toISOString()
  };
}

// public/js/features/nota-evolucion/nota-evolucion-state.mjs
function emptyNotaEvolucion() {
  const planZones = {};
  for (const z of OBJETIVO_ZONES) planZones[z.id] = [];
  return {
    subjetivo: "",
    analisis: "",
    planZones,
    objetivo: null,
    objetivoNarrativas: {},
    lastSavedAt: null,
    signedAt: null
  };
}
function ensureNotaEvolucion(patient) {
  if (!patient || typeof patient !== "object") return null;
  const p = patient;
  if (!p.monitoreo || typeof p.monitoreo !== "object") p.monitoreo = {};
  if (!p.monitoreo.notaEvolucion || typeof p.monitoreo.notaEvolucion !== "object") {
    p.monitoreo.notaEvolucion = emptyNotaEvolucion();
  } else {
    const ne = p.monitoreo.notaEvolucion;
    if (typeof ne.subjetivo !== "string") ne.subjetivo = "";
    if (typeof ne.analisis !== "string") ne.analisis = "";
    if (!ne.planZones || typeof ne.planZones !== "object") ne.planZones = {};
    for (const z of OBJETIVO_ZONES) {
      if (!Array.isArray(ne.planZones[z.id])) ne.planZones[z.id] = [];
    }
    if (!ne.objetivoNarrativas || typeof ne.objetivoNarrativas !== "object") ne.objetivoNarrativas = {};
    if (typeof ne.lastSavedAt !== "string") ne.lastSavedAt = null;
    if (typeof ne.signedAt !== "string") ne.signedAt = null;
  }
  return p.monitoreo.notaEvolucion;
}
var planItemSeq = 0;
function nextPlanItemId() {
  planItemSeq += 1;
  return "ne-plan-" + Date.now().toString(36) + "-" + planItemSeq;
}
function addPlanItem(state, zoneId, text) {
  const t = String(text || "").trim();
  if (!t || !state || !state.planZones) return null;
  if (!Array.isArray(state.planZones[zoneId])) state.planZones[zoneId] = [];
  const item = { id: nextPlanItemId(), text: t, mark: "nuevo" };
  state.planZones[zoneId].push(item);
  return item;
}
function editPlanItemText(state, zoneId, itemId, text) {
  const list = state && state.planZones && state.planZones[zoneId];
  if (!Array.isArray(list)) return false;
  const item = list.find((it) => it.id === itemId);
  if (!item) return false;
  item.text = String(text == null ? "" : text);
  return true;
}
function removePlanItem(state, zoneId, itemId) {
  const list = state && state.planZones && state.planZones[zoneId];
  if (!Array.isArray(list)) return false;
  const idx = list.findIndex((it) => it.id === itemId);
  if (idx === -1) return false;
  list.splice(idx, 1);
  return true;
}
function cyclePlanItemMark(state, zoneId, itemId, nextMarkFn) {
  const list = state && state.planZones && state.planZones[zoneId];
  if (!Array.isArray(list)) return null;
  const item = list.find((it) => it.id === itemId);
  if (!item) return null;
  item.mark = nextMarkFn(item.mark);
  return item.mark;
}
function planZonesForRender(state) {
  const planZones = state && state.planZones || {};
  return OBJETIVO_ZONES.map((z) => ({
    id: z.id,
    label: z.label,
    items: Array.isArray(planZones[z.id]) ? planZones[z.id] : []
  }));
}
function localDayKey(d) {
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}
function todaysAlteredLabsForPatient(patientId) {
  if (!patientId) return [];
  const orderedSets = getLabHistory()[patientId] || [];
  const { envios } = buildLabsGlanceForDay({ todayKey: localDayKey(/* @__PURE__ */ new Date()), orderedSets });
  const labs = [];
  envios.forEach((envio) => {
    envio.groups.forEach((group) => {
      group.chips.forEach((chip) => {
        const raw = String(chip.value || "").trim();
        const altered = raw.endsWith("*");
        const value = altered ? raw.slice(0, -1) : raw;
        const label = String(chip.label || "").trim();
        if (!label || !value) return;
        labs.push({ key: label, label, value, altered });
      });
    });
  });
  return labs;
}
function objetivoInputFromPatient(patient) {
  const p = (
    /** @type {any} */
    patient
  );
  const mon = p && typeof p === "object" ? p.monitoreo : null;
  const snap = mon ? deriveSnapshot(mon) : { vitals: {} };
  const labs = todaysAlteredLabsForPatient(p && p.id);
  return { vitals: snap && snap.vitals || {}, labs };
}
function objetivoPreviewForPatient(patient) {
  const { zones } = deriveObjetivoZones(objetivoInputFromPatient(patient));
  return { zones };
}
function defaultObjetivoNarrativesForPatient(patient) {
  const empty = {};
  for (const z of OBJETIVO_ZONES) empty[z.id] = "";
  const p = (
    /** @type {any} */
    patient
  );
  if (!p || typeof p !== "object" || !p.monitoreo || typeof p.monitoreo !== "object") return empty;
  const mon = p.monitoreo;
  const ec = mon.estadoClinico && typeof mon.estadoClinico === "object" ? mon.estadoClinico : {};
  let text = "";
  try {
    text = String(buildEstadoActualText(ec, deriveSnapshot(mon), {}, { patientPeso: p.peso }) || "");
  } catch {
    return empty;
  }
  const lines = text.split("\n\n");
  const result = {};
  OBJETIVO_ZONES.forEach((z, i) => {
    const line = String(lines[i] || "");
    result[z.id] = line.replace(/^[A-Z]+:\s*/, "").trim();
  });
  return result;
}
function setObjetivoNarrative(state, zoneId, text) {
  if (!state) return;
  if (!state.objetivoNarrativas || typeof state.objetivoNarrativas !== "object") state.objetivoNarrativas = {};
  state.objetivoNarrativas[zoneId] = String(text || "");
}
function objetivoZonesForRender(state, patient) {
  const zones = state && state.signedAt && state.objetivo && Array.isArray(state.objetivo.zones) ? state.objetivo.zones : objetivoPreviewForPatient(patient).zones;
  const defaults = defaultObjetivoNarrativesForPatient(patient);
  const edited = state && state.objetivoNarrativas || {};
  return zones.map((z) => ({
    ...z,
    narrative: typeof edited[z.id] === "string" ? edited[z.id] : defaults[z.id] || ""
  }));
}
function confirmObjetivoForPatient(patient, options) {
  const state = ensureNotaEvolucion(patient);
  if (!state) return null;
  const input = objetivoInputFromPatient(patient);
  const snapshot = buildObjetivoSnapshot(input, options);
  state.objetivo = snapshot;
  return snapshot;
}
function dayOfStayForPatient(patient, options) {
  const iso = admissionDateForPatient(patient);
  if (!iso) return null;
  const now = new Date(options && typeof options.now === "function" ? options.now() : /* @__PURE__ */ new Date());
  const admitted = /* @__PURE__ */ new Date(`${iso}T00:00:00`);
  if (Number.isNaN(admitted.getTime())) return null;
  now.setHours(0, 0, 0, 0);
  const days = Math.floor((now.getTime() - admitted.getTime()) / 864e5);
  return Math.max(1, days + 1);
}
function signNoteForPatient(patient, options) {
  const state = ensureNotaEvolucion(patient);
  if (!state) return null;
  confirmObjetivoForPatient(patient, options);
  const now = options && typeof options.now === "function" ? options.now() : /* @__PURE__ */ new Date();
  state.signedAt = now.toISOString();
  return state;
}

// public/js/features/nota-evolucion/nota-evolucion-panel.mjs
var AUTOSAVE_DEBOUNCE_MS = 900;
var rt = {
  getActiveId() {
    return null;
  },
  getPatients() {
    return [];
  },
  showToast() {
  }
};
function registerNotaEvolucionRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(rt, ctx);
}
function activePatient() {
  const id = rt.getActiveId();
  if (!id) return null;
  return rt.getPatients().find((p) => p.id === id) || null;
}
var autosaveTimer = null;
function formatTimeHHMM(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function buildHeaderModel(patient, state) {
  const p = (
    /** @type {any} */
    patient
  );
  const nombre = shortenPatientDisplayName(String(p?.nombre || "")) || "Sin nombre";
  const bed = formatPatientBedLabel(p);
  const day = dayOfStayForPatient(p);
  const contextParts = [nombre, bed, day != null ? `d\xEDa ${day}` : ""].filter(Boolean);
  const signed = !!state.signedAt;
  const metadata = signed ? `firmada ${formatTimeHHMM(state.signedAt)}` : state.lastSavedAt ? `borrador \xB7 guardado ${formatTimeHHMM(state.lastSavedAt)}` : "borrador \xB7 sin guardar";
  return { context: contextParts.join(" \xB7 "), metadata, signed };
}
function buildRenderModel(patient) {
  const state = ensureNotaEvolucion(patient);
  const objetivo = { zones: objetivoZonesForRender(state, patient) };
  return {
    subjetivo: state.subjetivo,
    objetivo,
    analisis: state.analisis,
    plan: planZonesForRender(state),
    insertables: [],
    cambios: [],
    header: buildHeaderModel(patient, state)
  };
}
function render(mount) {
  const patient = activePatient();
  if (!patient) {
    mount.innerHTML = '<div class="ne-empty-hint">Selecciona un paciente primero.</div>';
    return;
  }
  mount.innerHTML = buildNotaEvolucionHtml(buildRenderModel(patient));
  wireEvents(mount, patient);
}
function wireEvents(mount, patient) {
  const sEl = (
    /** @type {HTMLTextAreaElement|null} */
    mount.querySelector("[data-ne-subjetivo]")
  );
  if (sEl) {
    sEl.addEventListener("input", () => scheduleSubjetivoAutosave(patient, sEl.value, mount));
  }
  const aEl = (
    /** @type {HTMLTextAreaElement|null} */
    mount.querySelector("[data-ne-analisis]")
  );
  if (aEl) {
    aEl.addEventListener("input", () => {
      const state = ensureNotaEvolucion(patient);
      state.analisis = aEl.value;
      persistNotaChange(state);
    });
  }
  wireHeaderActions(mount, patient);
  mount.querySelectorAll("[data-ne-objetivo-narrative]").forEach((el) => {
    el.addEventListener("input", () => {
      const zoneId = el.getAttribute("data-ne-objetivo-narrative");
      if (!zoneId) return;
      const state = ensureNotaEvolucion(patient);
      setObjetivoNarrative(
        state,
        zoneId,
        /** @type {HTMLTextAreaElement} */
        el.value
      );
      persistNotaChange(state);
    });
  });
  mount.querySelectorAll("[data-ne-plan-edit]").forEach((el) => {
    el.addEventListener("input", () => {
      const zoneEl = el.closest("[data-ne-plan-zone]");
      const zoneId = zoneEl && zoneEl.getAttribute("data-ne-plan-zone");
      const itemId = el.getAttribute("data-ne-plan-edit");
      if (!zoneId || !itemId) return;
      const state = ensureNotaEvolucion(patient);
      editPlanItemText(
        state,
        zoneId,
        itemId,
        /** @type {HTMLInputElement} */
        el.value
      );
      persistNotaChange(state);
    });
  });
  mount.querySelectorAll("[data-ne-plan-cycle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const zoneEl = btn.closest("[data-ne-plan-zone]");
      const zoneId = zoneEl && zoneEl.getAttribute("data-ne-plan-zone");
      const itemId = btn.getAttribute("data-ne-plan-cycle");
      if (!zoneId || !itemId) return;
      const state = ensureNotaEvolucion(patient);
      cyclePlanItemMark(state, zoneId, itemId, nextPlanMark);
      persistNotaChange(state);
      render(mount);
    });
  });
  mount.querySelectorAll("[data-ne-plan-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const zoneEl = btn.closest("[data-ne-plan-zone]");
      const zoneId = zoneEl && zoneEl.getAttribute("data-ne-plan-zone");
      const itemId = btn.getAttribute("data-ne-plan-remove");
      if (!zoneId || !itemId) return;
      const state = ensureNotaEvolucion(patient);
      removePlanItem(state, zoneId, itemId);
      persistNotaChange(state);
      render(mount);
    });
  });
  mount.querySelectorAll("[data-ne-plan-add]").forEach((input) => {
    input.addEventListener("keydown", (ev) => {
      if (ev.key !== "Enter") return;
      const zoneId = input.getAttribute("data-ne-plan-add");
      const value = (
        /** @type {HTMLInputElement} */
        input.value
      );
      if (!zoneId || !value.trim()) return;
      const state = ensureNotaEvolucion(patient);
      addPlanItem(state, zoneId, value);
      persistNotaChange(state);
      render(mount);
    });
  });
  mount.querySelectorAll("[data-ne-insertar-item]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest("[data-ne-insertar-row]");
      const text = row && row.querySelector(".ne-insertar-item-title");
      if (!text) return;
      appendToAnalisis(patient, text.textContent || "");
      render(mount);
    });
  });
  const insertAllBtn = mount.querySelector("[data-ne-insertar-all]");
  if (insertAllBtn) {
    insertAllBtn.addEventListener("click", () => {
      mount.querySelectorAll(".ne-insertar-item-title").forEach((el) => {
        appendToAnalisis(patient, el.textContent || "");
      });
      render(mount);
    });
  }
}
function persistNotaChange(state) {
  state.lastSavedAt = (/* @__PURE__ */ new Date()).toISOString();
  persistClinicalState();
}
function appendToAnalisis(patient, text) {
  const t = String(text || "").trim();
  if (!t) return;
  const state = ensureNotaEvolucion(patient);
  state.analisis = state.analisis ? `${state.analisis}
${t}` : t;
  persistNotaChange(state);
}
function wireHeaderActions(mount, patient) {
  const copyBtn = mount.querySelector('[data-wb-secondary="0"]');
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      rt.showToast("Sin nota de ayer registrada", "info");
    });
  }
  const printBtn = mount.querySelector('[data-wb-secondary="1"]');
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      if (typeof window !== "undefined" && typeof window.print === "function") window.print();
    });
  }
  const signBtn = mount.querySelector("[data-wb-primary]");
  if (signBtn) {
    signBtn.addEventListener("click", () => {
      signNoteForPatient(patient);
      persistClinicalState();
      rt.showToast("Nota firmada \u2713", "success");
      render(mount);
    });
  }
}
function scheduleSubjetivoAutosave(patient, nextText, mount) {
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    const state = ensureNotaEvolucion(patient);
    const previous = state.subjetivo;
    if (previous === nextText) return;
    state.subjetivo = nextText;
    persistNotaChange(state);
    showUndoToast({
      message: "Subjetivo guardado",
      undoLabel: "Deshacer",
      onUndo: () => {
        const s = ensureNotaEvolucion(patient);
        s.subjetivo = previous;
        persistNotaChange(s);
        const el = (
          /** @type {HTMLTextAreaElement|null} */
          mount.querySelector("[data-ne-subjetivo]")
        );
        if (el) el.value = previous;
      }
    });
  }, AUTOSAVE_DEBOUNCE_MS);
}
function mountNotaEvolucionPanel(mount) {
  if (!mount) return;
  render(mount);
}
function openNotaEvolucionPanel() {
  if (!rt.getActiveId()) {
    rt.showToast("Selecciona un paciente primero", "error");
    return;
  }
  if (typeof document === "undefined") return;
  const backdrop = document.getElementById("nota-evolucion-modal-backdrop");
  const mount = document.getElementById("nota-evolucion-mount");
  if (!backdrop || !mount) return;
  render(
    /** @type {HTMLElement} */
    mount
  );
  backdrop.classList.add("open");
}
function closeNotaEvolucionPanel() {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
  }
  if (typeof document === "undefined") return;
  const backdrop = document.getElementById("nota-evolucion-modal-backdrop");
  if (backdrop) backdrop.classList.remove("open");
}
var windowHandlers = {
  openNotaEvolucionPanel,
  closeNotaEvolucionPanel
};
export {
  buildRenderModel,
  closeNotaEvolucionPanel,
  mountNotaEvolucionPanel,
  openNotaEvolucionPanel,
  registerNotaEvolucionRuntime,
  windowHandlers
};
//# sourceMappingURL=/js/chunks/nota-evolucion-panel-OB27LDDK.js.map
