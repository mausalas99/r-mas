import {
  decrementPendingJobs,
  downloadTextPayload,
  formatDateSlug,
  generateIndicaciones,
  generateListado,
  generateWord,
  guardMobileDocExport,
  incrementPendingJobs,
  normalizeQuickOutputFormat
} from "/mobile/js/chunks/chunk-AHPMOEZZ.js";
import "/mobile/js/chunks/chunk-XKT4MCFM.js";
import "/mobile/js/chunks/chunk-YVSFHJPU.js";
import "/mobile/js/chunks/chunk-4DQVQVZW.js";
import "/mobile/js/chunks/chunk-UCLZORRW.js";
import "/mobile/js/chunks/chunk-H7HPBMWH.js";
import "/mobile/js/chunks/chunk-2ZXFDPTM.js";
import "/mobile/js/chunks/chunk-F3XP3RDZ.js";
import "/mobile/js/chunks/chunk-36OM7STI.js";
import "/mobile/js/chunks/chunk-RGW4I6Z6.js";
import "/mobile/js/chunks/chunk-6KV6OYKI.js";
import "/mobile/js/chunks/chunk-2JKGABV2.js";
import "/mobile/js/chunks/chunk-MVTHEUBE.js";
import "/mobile/js/chunks/chunk-2RS4OG65.js";
import "/mobile/js/chunks/chunk-WSJX2ILZ.js";
import "/mobile/js/chunks/chunk-WMYXHSAE.js";
import "/mobile/js/chunks/chunk-RARSRFYU.js";
import "/mobile/js/chunks/chunk-5QPKU4WX.js";
import "/mobile/js/chunks/chunk-SLEQU5CJ.js";
import "/mobile/js/chunks/chunk-CNQU7XB3.js";
import "/mobile/js/chunks/chunk-OXN2ZL25.js";
import "/mobile/js/chunks/chunk-WOI2MHQW.js";
import "/mobile/js/chunks/chunk-NMO3BDA4.js";
import "/mobile/js/chunks/chunk-ZKUQGQZX.js";
import "/mobile/js/chunks/chunk-VHAGBDAV.js";
import "/mobile/js/chunks/chunk-FGKC3QPA.js";
import "/mobile/js/chunks/chunk-AIC37VNN.js";
import "/mobile/js/chunks/chunk-W5HGKDOD.js";
import "/mobile/js/chunks/chunk-H22VI5GA.js";
import "/mobile/js/chunks/chunk-CULVJM5A.js";
import "/mobile/js/chunks/chunk-O7LRWY7C.js";
import "/mobile/js/chunks/chunk-CE75LS7G.js";
import "/mobile/js/chunks/chunk-YLVR4STO.js";
import "/mobile/js/chunks/chunk-MRCCGBKF.js";
import "/mobile/js/chunks/chunk-OXMUDSQA.js";
import "/mobile/js/chunks/chunk-3ETJLEUF.js";
import "/mobile/js/chunks/chunk-ZQ44CCKF.js";
import "/mobile/js/chunks/chunk-UX725VAF.js";
import "/mobile/js/chunks/chunk-VL5J4B3E.js";
import "/mobile/js/chunks/chunk-Q2YIMSEE.js";
import "/mobile/js/chunks/chunk-FHDPZLZP.js";
import "/mobile/js/chunks/chunk-N74FWNUD.js";
import "/mobile/js/chunks/chunk-PAAJVTB4.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-WD3AJTQB.js";
import "/mobile/js/chunks/chunk-T5EKEMCK.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-M75YYGQZ.js";
import "/mobile/js/chunks/chunk-SFXEUBWR.js";
import "/mobile/js/chunks/chunk-56R66ES7.js";
import "/mobile/js/chunks/chunk-3NNHG3MC.js";
import "/mobile/js/chunks/chunk-PD77VH7Y.js";
import {
  isModeSala
} from "/mobile/js/chunks/chunk-BURG7PNJ.js";
import {
  indicaciones,
  listadoProblemas,
  notes,
  patients
} from "/mobile/js/chunks/chunk-TWV6UAYK.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import {
  escHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-ZQE77EGT.js";
import "/mobile/js/chunks/chunk-WXZVVY5M.js";
import "/mobile/js/chunks/chunk-CO6ZSBF2.js";
import "/mobile/js/chunks/chunk-T4WWDITM.js";
import "/mobile/js/chunks/chunk-QWJHEGH4.js";
import "/mobile/js/chunks/chunk-7S6BFQ5R.js";
import "/mobile/js/chunks/chunk-J76D6PFX.js";
import "/mobile/js/chunks/chunk-WUQ6BLHZ.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-KLMIZH6A.js";
import "/mobile/js/chunks/chunk-GPBMQXYE.js";
import "/mobile/js/chunks/chunk-LQTSNMET.js";
import "/mobile/js/chunks/chunk-ARAHUBAM.js";
import "/mobile/js/chunks/chunk-NMJNQQZG.js";
import "/mobile/js/chunks/chunk-PIQOYX4G.js";
import "/mobile/js/chunks/chunk-FORXNEKH.js";

// public/js/quick-output.mjs
function listadoHasProblems(listado) {
  if (!listado || typeof listado !== "object") return false;
  const has = (arr) => Array.isArray(arr) && arr.some((p) => p && typeof p.descripcion === "string" && p.descripcion.trim().length > 0);
  return has(listado.activos) || has(listado.inactivos);
}
function resolveQuickOutputAction(opts) {
  const format = String(opts && opts.format || "docx").toLowerCase();
  if (format === "html") return { kind: "html" };
  if (format === "txt") return { kind: "txt" };
  const sala = opts && opts.appMode === "sala";
  if (sala) {
    if (listadoHasProblems(opts.listado)) return { kind: "listado" };
    return {
      kind: "listado_empty",
      message: "Agrega un problema al Listado para usar Salida r\xE1pida en Sala."
    };
  }
  if (opts && opts.activeInner === "indica") return { kind: "indicaciones" };
  return { kind: "nota" };
}

// public/js/clinical-quick-export-helpers.mjs
function toLines(value) {
  if (Array.isArray(value)) {
    return value.map(function(v) {
      return String(v || "").trim();
    }).filter(Boolean);
  }
  return String(value || "").split("\n").map(function(v) {
    return v.trim();
  }).filter(Boolean);
}
function pushTextBlock(blocks, label, value) {
  blocks.push(label + ":");
  var lines = toLines(value);
  if (!lines.length) blocks.push("(sin contenido)");
  lines.forEach(function(l) {
    blocks.push("- " + l);
  });
}
function appendPatientHeader(blocks, patient) {
  blocks.push("R+ - SALIDA CLINICA");
  blocks.push("PACIENTE: " + (patient.nombre || ""));
  blocks.push("REGISTRO: " + (patient.registro || ""));
  blocks.push("SERVICIO: " + (patient.servicio || ""));
  blocks.push("CUARTO/CAMA: " + (patient.cuarto || "") + "/" + (patient.cama || ""));
  blocks.push("");
}
function appendNoteTextSection(blocks, note) {
  blocks.push("== NOTA DE EVOLUCION ==");
  blocks.push("FECHA/HORA: " + (note.fecha || "") + " " + (note.hora || ""));
  blocks.push("DIAGNOSTICOS:");
  toLines(note.diagnosticos || []).forEach(function(v, idx) {
    blocks.push(idx + 1 + ". " + v);
  });
  if (!toLines(note.diagnosticos || []).length) blocks.push("(sin contenido)");
  pushTextBlock(blocks, "INTERROGATORIO", note.interrogatorio);
  pushTextBlock(blocks, "EXPLORACION FISICA", note.exploracion);
  pushTextBlock(blocks, "ESTUDIOS", note.estudios);
  pushTextBlock(blocks, "ANALISIS", note.analisis);
  pushTextBlock(blocks, "PLAN", note.plan);
  blocks.push(
    "SIGNOS VITALES: TA " + (note.ta || "-") + " | FR " + (note.fr || "-") + " | FC " + (note.fc || "-") + " | TEMP " + (note.temp || "-") + " | PESO " + (note.peso || "-")
  );
  pushTextBlock(blocks, "TRATAMIENTO E INDICACIONES", note.tratamiento || []);
  blocks.push("MEDICO TRATANTE: " + (note.medico || ""));
  blocks.push("PROFESOR RESPONSABLE: " + (note.profesor || ""));
}
function appendIndicacionesTextSection(blocks, ind) {
  blocks.push("== INDICACIONES ==");
  blocks.push("FECHA/HORA: " + (ind.fecha || "") + " " + (ind.hora || ""));
  pushTextBlock(blocks, "MEDICOS", ind.medicos);
  pushTextBlock(blocks, "DIETA", ind.dieta);
  pushTextBlock(blocks, "CUIDADOS", ind.cuidados);
  pushTextBlock(blocks, "ESTUDIOS", ind.estudios);
  pushTextBlock(blocks, "MEDICAMENTOS", ind.medicamentos);
  pushTextBlock(blocks, "INTERCONSULTAS", ind.interconsultas);
  var otros = Array.isArray(ind.otros) ? ind.otros : [];
  if (otros.length) {
    blocks.push("OTROS:");
    otros.forEach(function(item, idx) {
      if (!item || typeof item !== "object") return;
      blocks.push(idx + 1 + ". " + (item.titulo || "Seccion sin titulo"));
      toLines(item.contenido || "").forEach(function(line) {
        blocks.push("   - " + line);
      });
    });
  }
}
function buildClinicalTextExport(bundle) {
  var patient = bundle.patient || {};
  var note = bundle.note || {};
  var ind = bundle.indicacion || {};
  var mode = bundle.mode || "both";
  var blocks = [];
  appendPatientHeader(blocks, patient);
  if (mode !== "indica") appendNoteTextSection(blocks, note);
  if (mode === "both") blocks.push("");
  if (mode !== "note") appendIndicacionesTextSection(blocks, ind);
  return blocks.join("\n");
}
function renderHtmlList(values) {
  var lines = toLines(values);
  if (!lines.length) return "<p><em>Sin contenido</em></p>";
  return "<ul>" + lines.map(function(line) {
    return "<li>" + escHtml(line) + "</li>";
  }).join("") + "</ul>";
}
function renderHtmlOtherSections(otros) {
  if (!otros.length) return "<p><em>Sin secciones adicionales</em></p>";
  return otros.filter(function(item) {
    return item && typeof item === "object";
  }).map(function(item) {
    return "<article><h4>" + escHtml(item.titulo || "Seccion sin titulo") + "</h4>" + renderHtmlList(item.contenido || "") + "</article>";
  }).join("");
}
function buildNoteHtmlSection(note) {
  return "<section><h2>Nota de evolucion</h2><p><strong>Fecha/Hora:</strong> " + escHtml(note.fecha || "") + " " + escHtml(note.hora || "") + "</p><h3>Diagnosticos</h3>" + renderHtmlList(note.diagnosticos || []) + "<h3>Interrogatorio</h3>" + renderHtmlList(note.interrogatorio) + "<h3>Exploracion fisica</h3>" + renderHtmlList(note.exploracion) + "<h3>Estudios</h3>" + renderHtmlList(note.estudios) + "<h3>Analisis</h3>" + renderHtmlList(note.analisis) + "<h3>Plan</h3>" + renderHtmlList(note.plan) + "<h3>Signos vitales</h3><p>TA " + escHtml(note.ta || "-") + " | FR " + escHtml(note.fr || "-") + " | FC " + escHtml(note.fc || "-") + " | TEMP " + escHtml(note.temp || "-") + " | PESO " + escHtml(note.peso || "-") + "</p><h3>Tratamiento e indicaciones medicas</h3>" + renderHtmlList(note.tratamiento || []) + "</section>";
}
function buildIndicaHtmlSection(ind) {
  return "<section><h2>Indicaciones</h2><p><strong>Fecha/Hora:</strong> " + escHtml(ind.fecha || "") + " " + escHtml(ind.hora || "") + "</p><h3>Medicos</h3>" + renderHtmlList(ind.medicos) + "<h3>Dieta</h3>" + renderHtmlList(ind.dieta) + "<h3>Cuidados</h3>" + renderHtmlList(ind.cuidados) + "<h3>Estudios</h3>" + renderHtmlList(ind.estudios) + "<h3>Medicamentos</h3>" + renderHtmlList(ind.medicamentos) + "<h3>Interconsultas</h3>" + renderHtmlList(ind.interconsultas) + "<h3>Otros</h3>" + renderHtmlOtherSections(Array.isArray(ind.otros) ? ind.otros : []) + "</section>";
}
function buildClinicalHtmlExport(bundle) {
  var patient = bundle.patient || {};
  var note = bundle.note || {};
  var ind = bundle.indicacion || {};
  var mode = bundle.mode || "both";
  var noteHtml = buildNoteHtmlSection(note);
  var indicaHtml = buildIndicaHtmlSection(ind);
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:;"><title>R+ salida clinica</title><style>body{font-family:Arial,sans-serif;line-height:1.45;margin:24px;color:#111}h1,h2{margin-bottom:8px}section{margin:20px 0;padding-top:8px;border-top:1px solid #ddd}h3{margin:14px 0 6px}ul{margin:0 0 8px 20px}p{margin:0 0 8px}</style></head><body><h1>R+ - Salida clinica</h1><p><strong>Paciente:</strong> ` + escHtml(patient.nombre || "") + " | <strong>Registro:</strong> " + escHtml(patient.registro || "") + "</p><p><strong>Servicio:</strong> " + escHtml(patient.servicio || "") + " | <strong>Cuarto/Cama:</strong> " + escHtml(patient.cuarto || "") + "/" + escHtml(patient.cama || "") + "</p>" + (mode !== "indica" ? noteHtml : "") + (mode !== "note" ? indicaHtml : "") + "</body></html>";
}

// public/js/clinical-quick-export.mjs
var quickExportRt = {
  getActiveId() {
    return null;
  },
  getActiveInner() {
    return "todo";
  },
  getSettings() {
    return {};
  },
  showToast() {
  }
};
function registerClinicalQuickExportRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(quickExportRt, ctx);
}
function slugFilePart(value, fallback) {
  var base = String(value || "").trim().toLowerCase();
  var slug = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return slug || fallback;
}
function getCurrentPatientClinicalData() {
  var patient = patients.find(function(p) {
    return p.id === quickExportRt.getActiveId();
  });
  if (!patient) return null;
  return {
    patient,
    note: notes[quickExportRt.getActiveId()] || {},
    indicacion: indicaciones[quickExportRt.getActiveId()] || {}
  };
}
function exportCurrentPatientAsText() {
  var bundle = getCurrentPatientClinicalData();
  if (!bundle) return;
  bundle.mode = quickExportRt.getActiveInner() === "indica" ? "indica" : "note";
  var fileName = "R-plus-" + slugFilePart(bundle.patient.nombre, "paciente") + "-clinico-" + formatDateSlug(/* @__PURE__ */ new Date()) + ".txt";
  incrementPendingJobs();
  try {
    downloadTextPayload(buildClinicalTextExport(bundle), fileName, "text/plain");
    quickExportRt.showToast("Salida .txt descargada", "success");
  } catch (e) {
    quickExportRt.showToast(
      "No se pudo exportar: " + (e && e.message ? e.message : "error"),
      "error"
    );
  } finally {
    decrementPendingJobs();
  }
}
function exportCurrentPatientAsHtml() {
  var bundle = getCurrentPatientClinicalData();
  if (!bundle) return;
  bundle.mode = quickExportRt.getActiveInner() === "indica" ? "indica" : "note";
  var fileName = "R-plus-" + slugFilePart(bundle.patient.nombre, "paciente") + "-clinico-" + formatDateSlug(/* @__PURE__ */ new Date()) + ".html";
  incrementPendingJobs();
  try {
    downloadTextPayload(buildClinicalHtmlExport(bundle), fileName, "text/html");
    quickExportRt.showToast("Salida .html descargada", "success");
  } catch (e) {
    quickExportRt.showToast(
      "No se pudo exportar: " + (e && e.message ? e.message : "error"),
      "error"
    );
  } finally {
    decrementPendingJobs();
  }
}
function quickExportCurrentPatient() {
  if (guardMobileDocExport()) return;
  if (!quickExportRt.getActiveId()) {
    quickExportRt.showToast("Selecciona un paciente primero", "error");
    return;
  }
  var format = normalizeQuickOutputFormat(quickExportRt.getSettings().quickOutputFormat);
  var action = resolveQuickOutputAction({
    format,
    appMode: isModeSala(quickExportRt.getSettings()) ? "sala" : "interconsulta",
    activeInner: quickExportRt.getActiveInner(),
    listado: listadoProblemas[quickExportRt.getActiveId()] || null
  });
  switch (action.kind) {
    case "html":
      exportCurrentPatientAsHtml();
      return;
    case "txt":
      exportCurrentPatientAsText();
      return;
    case "listado":
      generateListado();
      return;
    case "listado_empty":
      quickExportRt.showToast(action.message, "error");
      return;
    case "indicaciones":
      generateIndicaciones();
      return;
    case "nota":
    default:
      generateWord();
      return;
  }
}
export {
  buildClinicalHtmlExport,
  buildClinicalTextExport,
  escHtml,
  exportCurrentPatientAsHtml,
  exportCurrentPatientAsText,
  getCurrentPatientClinicalData,
  quickExportCurrentPatient,
  registerClinicalQuickExportRuntime,
  slugFilePart,
  toLines
};
//# sourceMappingURL=/js/chunks/clinical-quick-export-P6KVWK7V.js.map
