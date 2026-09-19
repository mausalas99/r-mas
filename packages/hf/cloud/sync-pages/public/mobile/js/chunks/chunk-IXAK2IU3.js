// public/js/features/patients-census-walk.mjs
function nextCensusPatientId(ids, currentId, delta) {
  var list = Array.isArray(ids) ? ids : [];
  if (!list.length) return null;
  var step = Number(delta);
  if (!step) return null;
  var cur = currentId != null ? String(currentId) : "";
  var idx = list.indexOf(cur);
  if (idx < 0) return list[step > 0 ? 0 : list.length - 1];
  var next = idx + step;
  if (next < 0) next = list.length - 1;
  if (next >= list.length) next = 0;
  return list[next];
}
function censusWalkDeltaForKey(key) {
  if (key === "ArrowDown") return 1;
  if (key === "ArrowUp") return -1;
  return 0;
}
function eventTargetElement(target) {
  if (!target) return null;
  return target.nodeType === 3 ? target.parentElement : target;
}
function isCensusWalkTypingContext(target) {
  if (!target) return false;
  if (target.isContentEditable) return true;
  var node = eventTargetElement(target);
  if (node && typeof node.closest === "function") {
    if (node.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) {
      return true;
    }
  }
  var tag = (target.tagName || "").toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
function isCensusWalkWidgetContext(target) {
  var node = eventTargetElement(target);
  if (!node || typeof node.closest !== "function") return false;
  return !!node.closest('[role="dialog"], [role="listbox"], [role="menu"], [role="tablist"]');
}
function isCensusWalkOverlayOpen(root) {
  var doc = root || (typeof document !== "undefined" ? document : null);
  if (!doc || typeof doc.querySelector !== "function") return false;
  if (doc.querySelector(".modal-backdrop.open")) return true;
  var cmdk = doc.querySelector(".cmdk-backdrop");
  return !!(cmdk && !cmdk.hidden);
}
function shouldHandleCensusWalkKeydown(e, opts) {
  if (!e) return false;
  if (e.isComposing) return false;
  if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return false;
  if (censusWalkDeltaForKey(e.key) === 0) return false;
  if (isCensusWalkTypingContext(e.target)) return false;
  if (isCensusWalkWidgetContext(e.target)) return false;
  if (opts && opts.focusMode) return false;
  if (isCensusWalkOverlayOpen(opts && opts.root)) return false;
  return true;
}
function handleCensusWalkKeydown(e, advanceFn, opts) {
  if (!shouldHandleCensusWalkKeydown(e, opts)) return false;
  var delta = censusWalkDeltaForKey(e.key);
  if (typeof e.preventDefault === "function") e.preventDefault();
  if (typeof advanceFn === "function") advanceFn(delta);
  return true;
}

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

export {
  emptyListado,
  addProblema,
  removeProblema,
  normalizeRecetaHuConsultServices,
  normalizeRecetaHuDraft,
  formatRecetaHuFecha,
  buildProximaCitaText,
  buildRecetaHuGeneratePayload,
  nextCensusPatientId,
  handleCensusWalkKeydown
};
//# sourceMappingURL=/js/chunks/chunk-IXAK2IU3.js.map
