import { medRecetaByPatient } from "../app-state.mjs";
import { effectiveSoapCategory, classifyMedicationSoapCategory } from "../med-receta-core.mjs";
import { isModeSala } from "../mode-features.mjs";
import { medInstructionFragmentForSoap } from "./estado-actual-meds.mjs";
import { rt } from "./medications-runtime-state.mjs";
import { esc, getMedNotaSelMap } from "./medications-utils.mjs";

function groupSoapPreviewItems(soapItems) {
  var groups = {
    analgesia: [],
    antihta: [],
    diuretico: [],
    antitromboticos: [],
    abx: [],
    vasop: [],
    nm: [],
    otros: [],
  };
  soapItems.forEach(function (it) {
    var cat = effectiveSoapCategory(it, classifyMedicationSoapCategory);
    if (cat === "otros") groups.otros.push(it);
    else if (groups[cat]) groups[cat].push(it);
    else groups.otros.push(it);
  });
  return groups;
}

function chipsForSoapItems(arr) {
  return arr
    .map(function (it) {
      var frag = medInstructionFragmentForSoap(it);
      return (
        '<span class="med-soap-preview-chip" title="' +
        esc((it.nombreRaw || "").slice(0, 220)) +
        '">' +
        esc(frag) +
        "</span>"
      );
    })
    .join("");
}

function soapPreviewSection(cat, title, groups) {
  if (!groups[cat].length) return "";
  return (
    '<div class="med-soap-preview-sec med-soap-preview-sec--' +
    cat +
    '">' +
    '<div class="med-soap-preview-sec-title">' +
    esc(title) +
    "</div>" +
    '<div class="med-soap-preview-chips">' +
    chipsForSoapItems(groups[cat]) +
    "</div></div>"
  );
}

function buildSoapPreviewHtml(soapItems) {
  if (!soapItems.length) {
    return '<p class="med-soap-preview-empty">Marcá <strong>SOAP</strong> en el listado para ver aquí cómo se repartirán en la plantilla.</p>';
  }
  var groups = groupSoapPreviewItems(soapItems);
  return (
    '<div class="med-soap-preview">' +
    soapPreviewSection("analgesia", "Analgésicos / antieméticos", groups) +
    soapPreviewSection("antihta", "Antihipertensivos", groups) +
    soapPreviewSection("diuretico", "Diuréticos", groups) +
    soapPreviewSection("antitromboticos", "Antitrombóticos", groups) +
    soapPreviewSection("abx", "Antibióticos / antifúngicos", groups) +
    soapPreviewSection("vasop", "Vasopresores / inotrópicos", groups) +
    soapPreviewSection("nm", "NM (insulina, tiroides, etc.)", groups) +
    soapPreviewSection("otros", "Otros — elegí destino en el listado", groups) +
    "</div>"
  );
}

export function renderMedNotaFooter() {
  var foot = document.getElementById("med-nota-footer");
  if (!foot) return;
  foot.hidden = false;

  var activeId = rt.getActiveId();
  var block = activeId ? medRecetaByPatient[activeId] : null;
  var sel = activeId ? getMedNotaSelMap(activeId) : {};
  var soapItems =
    block && block.items
      ? block.items.filter(function (it) {
          return sel[it.id] && !it.suspendido;
        })
      : [];

  var previewHtml = buildSoapPreviewHtml(soapItems);
  var soapBtnLabel = isModeSala(rt.getSettings()) ? "Enviar a Estado Actual" : "Abrir plantilla SOAP";

  foot.innerHTML =
    '<div class="med-nota-toolbar">' +
    '<p class="med-nota-hint">Los medicamentos con <strong>SOAP</strong> activo se clasifican por nombre; los marcados como <strong>Otros</strong> requieren elegir destino en la columna <strong>Destino</strong>.</p>' +
    previewHtml +
    '<div class="med-nota-actions">' +
    '<button type="button" class="btn-generate" onclick="mediAnadirATratamiento()">Añadir a Tratamiento</button>' +
    '<button type="button" class="btn-med-secondary" onclick="mediLlevarASOAP()">' +
    soapBtnLabel +
    '</button>' +
    '<button type="button" class="btn-med-secondary" onclick="limpiarManejoActual()">Limpiar</button>' +
    "</div>" +
    "</div>";
}

export function hideMedNotaFooter() {
  var foot = document.getElementById("med-nota-footer");
  if (foot) {
    foot.hidden = true;
    foot.innerHTML = "";
  }
}
