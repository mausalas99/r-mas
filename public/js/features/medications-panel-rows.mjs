import {
  mergeDietaItems,
  formatMedicationSoapShort,
  classifyMedicationSoapCategory,
  effectiveDiaTratamiento,
  SOAP_DESTINATION_KEYS,
  SOAP_DESTINATION_LABELS,
} from "../med-receta-core.mjs";
import { safeAttrJsString } from "./lab-panel.mjs";
import { esc, isMedNotaSelected } from "./medications-utils.mjs";

export function buildMedDietHtml(dietas) {
  if (!dietas || !dietas.length) return "";
  var mergedDiet = mergeDietaItems(dietas);
  return (
    '<div class="med-receta-diet-card" style="margin-bottom:12px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2, rgba(0,0,0,.02));">' +
    '<div style="font-weight:600;font-size:12px;margin-bottom:6px;">Dieta detectada</div>' +
    '<div>' +
    esc(mergedDiet.descripcion || "—") +
    "</div>" +
    (mergedDiet.kcal != null
      ? '<div style="font-size:12px;color:var(--text-muted);margin-top:4px;">' +
        esc(String(mergedDiet.kcal)) +
        " kcal</div>"
      : "") +
    (mergedDiet.proteinG != null
      ? '<div style="font-size:12px;color:var(--text-muted);">' +
        esc(String(mergedDiet.proteinG)) +
        " g proteína</div>"
      : "") +
    "</div>"
  );
}

function buildMedRecetaDestCell(it, sid) {
  var autoCat = classifyMedicationSoapCategory(it.nombreRaw, it.dosisRaw);
  if (autoCat !== "otros") return "";
  var opts =
    '<option value="">Elegir destino…</option>' +
    SOAP_DESTINATION_KEYS.map(function (k) {
      var sel = it.soapCatOverride === k ? " selected" : "";
      return (
        '<option value="' +
        esc(k) +
        '"' +
        sel +
        ">" +
        esc(SOAP_DESTINATION_LABELS[k] || k) +
        "</option>"
      );
    }).join("");
  return (
    '<select class="med-receta-dest" title="Destino en Estado Actual / SOAP"' +
    " onchange=\"setMedRecetaSoapCategory('" +
    safeAttrJsString(sid) +
    "', this.value)\"" +
    ">" +
    opts +
    "</select>"
  );
}

function buildMedRecetaRowHtml(activeId, it, fechaActualizacion) {
  var sid = String(it.id || "");
  var diaOpts = fechaActualizacion ? { fechaActualizacion: fechaActualizacion } : undefined;
  var listLabel = formatMedicationSoapShort(it, diaOpts);
  if (it.diaTratamiento != null) listLabel = listLabel.replace(/\s+DIA\s+\d+\s*$/i, "");
  var label = esc(listLabel.slice(0, 160));
  var chk = it.suspendido ? " checked" : "";
  var paraNota = isMedNotaSelected(activeId, sid) ? " checked" : "";
  var autoCat = classifyMedicationSoapCategory(it.nombreRaw, it.dosisRaw);
  var destCell = buildMedRecetaDestCell(it, sid);
  var diaDisplay =
    it.diaTratamiento != null ? effectiveDiaTratamiento(it.diaTratamiento, fechaActualizacion) : null;
  var diaCell =
    diaDisplay != null
      ? '<span class="med-receta-dia">Día ' + esc(String(diaDisplay)) + "</span>"
      : "";
  return (
    '<div class="med-receta-row' +
    (autoCat === "otros" && paraNota && !it.soapCatOverride ? " med-receta-row--needs-dest" : "") +
    '" data-med-item-id="' +
    esc(sid) +
    '">' +
    '<div class="med-receta-checkcell">' +
    '<input type="checkbox"' +
    chk +
    ' title="Excluir del texto de egreso"' +
    " onchange=\"toggleMedRecetaSuspendido('" +
    safeAttrJsString(sid) +
    "', this.checked)\"" +
    "/>" +
    "</div>" +
    '<div class="med-receta-checkcell">' +
    '<input type="checkbox" data-med-soap-chk="1"' +
    paraNota +
    ' title="Incluir en Tratamiento y campos SOAP (Analgesia / ABX / AntiHTA)"' +
    " onchange=\"toggleMedRecetaParaNota('" +
    safeAttrJsString(sid) +
    "', this.checked)\"" +
    "/>" +
    "</div>" +
    '<div class="med-receta-name">' +
    label +
    "</div>" +
    '<div class="med-receta-destcell">' +
    destCell +
    "</div>" +
    '<div class="med-receta-diacell">' +
    diaCell +
    "</div>" +
    "</div>"
  );
}

export function buildMedRecetaListHtml(activeId, block) {
  var items = block.items || [];
  var rows = items.map(function (it) {
    return buildMedRecetaRowHtml(activeId, it, block.fechaActualizacion);
  });
  if (!rows.length) return "";
  return (
    '<div class="med-receta-wrap">' +
    '<div class="med-receta-head">' +
    '<span title="Excluir del texto de egreso">Excl.</span>' +
    '<span title="Incluir en Estado Actual / SOAP">SOAP</span>' +
    "<span>Medicamento</span>" +
    '<span title="Destino manual para «Otros»">Destino</span>' +
    '<span title="Día de tratamiento (DIA#)">Día</span>' +
    "</div>" +
    rows.join("") +
    "</div>"
  );
}
