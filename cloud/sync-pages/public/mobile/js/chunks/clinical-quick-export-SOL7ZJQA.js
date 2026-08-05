import {
  decrementPendingJobs,
  generateIndicaciones,
  generateListado,
  generateWord,
  guardMobileDocExport,
  incrementPendingJobs,
  normalizeQuickOutputFormat
} from "/mobile/js/chunks/chunk-4SIVR4SA.js";
import "/mobile/js/chunks/chunk-BKJ6JOGZ.js";
import "/mobile/js/chunks/chunk-DPCWCVTP.js";
import "/mobile/js/chunks/chunk-SCSVSR4P.js";
import "/mobile/js/chunks/chunk-TTFM7EP4.js";
import "/mobile/js/chunks/chunk-OOMYDHTA.js";
import "/mobile/js/chunks/chunk-55V5O62J.js";
import "/mobile/js/chunks/chunk-NHHUSR52.js";
import "/mobile/js/chunks/chunk-YEWIPCRL.js";
import "/mobile/js/chunks/chunk-2TSPDBVD.js";
import "/mobile/js/chunks/chunk-PKYRHIWH.js";
import "/mobile/js/chunks/chunk-6DPIGF5S.js";
import "/mobile/js/chunks/chunk-OSPRJYRJ.js";
import "/mobile/js/chunks/chunk-7PDTCWFA.js";
import "/mobile/js/chunks/chunk-GUZBLPYB.js";
import "/mobile/js/chunks/chunk-YQNA53YU.js";
import "/mobile/js/chunks/chunk-RAQX5OVN.js";
import "/mobile/js/chunks/chunk-3QVHQ4QK.js";
import "/mobile/js/chunks/chunk-CV62ZWIZ.js";
import "/mobile/js/chunks/chunk-HEEVLY4I.js";
import "/mobile/js/chunks/chunk-7R6RY2VN.js";
import "/mobile/js/chunks/chunk-UMBBYMHN.js";
import "/mobile/js/chunks/chunk-KZBMNVUA.js";
import "/mobile/js/chunks/chunk-CA3QXIB4.js";
import "/mobile/js/chunks/chunk-5ULB7V7I.js";
import "/mobile/js/chunks/chunk-6IT4VYWH.js";
import "/mobile/js/chunks/chunk-WMJDFKKN.js";
import "/mobile/js/chunks/chunk-J7SG2LGN.js";
import "/mobile/js/chunks/chunk-RXNYNYIW.js";
import {
  downloadTextPayload,
  formatDateSlug
} from "/mobile/js/chunks/chunk-OJH7L2CJ.js";
import "/mobile/js/chunks/chunk-YREK4H2V.js";
import "/mobile/js/chunks/chunk-HVHVRFSH.js";
import "/mobile/js/chunks/chunk-6RH7YMAM.js";
import "/mobile/js/chunks/chunk-K7TUQM3L.js";
import "/mobile/js/chunks/chunk-NW6K73WP.js";
import "/mobile/js/chunks/chunk-KW6FOZVD.js";
import "/mobile/js/chunks/chunk-F55OGCCZ.js";
import "/mobile/js/chunks/chunk-NCZWUFAX.js";
import "/mobile/js/chunks/chunk-C6TP3H7V.js";
import {
  isModeSala
} from "/mobile/js/chunks/chunk-AUDHCP7J.js";
import "/mobile/js/chunks/chunk-OJF7SMWI.js";
import "/mobile/js/chunks/chunk-LE7F4H7F.js";
import "/mobile/js/chunks/chunk-FHXLE36S.js";
import "/mobile/js/chunks/chunk-VN3HHLWO.js";
import "/mobile/js/chunks/chunk-GHZK4QF3.js";
import "/mobile/js/chunks/chunk-GJUAH75C.js";
import "/mobile/js/chunks/chunk-WOP35WT6.js";
import "/mobile/js/chunks/chunk-JDDA5EVO.js";
import "/mobile/js/chunks/chunk-IP6FUZQW.js";
import "/mobile/js/chunks/chunk-ALW2M5BA.js";
import "/mobile/js/chunks/chunk-XYU7ZICQ.js";
import "/mobile/js/chunks/chunk-MBEH6ZUQ.js";
import "/mobile/js/chunks/chunk-LYZOIXV3.js";
import {
  indicaciones,
  listadoProblemas,
  notes,
  patients
} from "/mobile/js/chunks/chunk-JZ2SPQIK.js";
import "/mobile/js/chunks/chunk-KHHZMCJO.js";
import {
  escHtml
} from "/mobile/js/chunks/chunk-NIMNG7BY.js";
import "/mobile/js/chunks/chunk-H45VYIPQ.js";
import "/mobile/js/chunks/chunk-4GV7J2JY.js";
import "/mobile/js/chunks/chunk-A56TUI2P.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-IAZG4W3U.js";
import "/mobile/js/chunks/chunk-I4VH6GH2.js";
import "/mobile/js/chunks/chunk-5TQC2RCD.js";
import "/mobile/js/chunks/chunk-76D6GOCM.js";
import "/mobile/js/chunks/chunk-TY4AHNM4.js";
import "/mobile/js/chunks/chunk-YAGCGSLT.js";
import "/mobile/js/chunks/chunk-WONKP6NU.js";
import "/mobile/js/chunks/chunk-3ADS2QIW.js";
import "/mobile/js/chunks/chunk-VTSC3E5H.js";
import "/mobile/js/chunks/chunk-LSPMPOB5.js";
import "/mobile/js/chunks/chunk-AOKU4GNB.js";
import "/mobile/js/chunks/chunk-CYJ7ZDIE.js";
import "/mobile/js/chunks/chunk-WVOQEB7T.js";
import "/mobile/js/chunks/chunk-S4JF4KS2.js";
import "/mobile/js/chunks/chunk-XO7Z5S3R.js";
import "/mobile/js/chunks/chunk-GWKS66VB.js";
import "/mobile/js/chunks/chunk-3566DTDN.js";
import "/mobile/js/chunks/chunk-WZAOH7W5.js";
import "/mobile/js/chunks/chunk-6VYBWSQE.js";
import "/mobile/js/chunks/chunk-BRT2MMPP.js";
import "/mobile/js/chunks/chunk-HMTHREEE.js";
import "/mobile/js/chunks/chunk-CRJYUJ23.js";
import "/mobile/js/chunks/chunk-7I2DYQ7W.js";
import "/mobile/js/chunks/chunk-OEEP3MSI.js";
import "/mobile/js/chunks/chunk-LMOJUVZ4.js";

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
//# sourceMappingURL=/js/chunks/clinical-quick-export-SOL7ZJQA.js.map
