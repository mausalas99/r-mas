import {
  formatMedicationSoapShort,
  classifyMedicationSoapCategory,
  effectiveDiaTratamiento,
  SOAP_DESTINATION_LABELS,
  soapDestinationSelectOptionsHtml,
  shouldIncludeMedicationInSoap,
  soapDestinationUiValue,
  isNutritionMedicationItem,
  listDietCandidates,
  buildDietProposalText,
  classifyApoyoKind,
  apoyoKindLabel,
} from "../med-receta-core.mjs";
import { safeAttrJsString } from "./lab-panel.mjs";
import { insulinPumpAlgorithmForMedicationItem, insulinPumpMedLabelHtml } from "../insulin-pump-some-detect.mjs";
import { skipRecetaItemForInsulinPumpCarrier } from "../insulin-pump-receta-display.mjs";
import {
  INSULIN_RESCATE_GROUP_ID,
  insulinRescateMedLabelHtml,
  isInsulinRescateGroupSoapSelected,
  isInsulinRescateGroupSuspended,
  isInsulinRescateMedicationItem,
} from "../insulin-rescate-display.mjs";
import {
  INSULIN_PRANDIAL_GROUP_ID,
  insulinPrandialMedLabelHtml,
  isInsulinPrandialGroupSoapSelected,
  isInsulinPrandialGroupSuspended,
  isInsulinPrandialMedicationItem,
} from "../insulin-prandial-display.mjs";
import {
  POTASSIUM_REPOS_GROUP_ID,
  isPotassiumReposCarrierMedicationItem,
  isPotassiumReposGroupSoapSelected,
  isPotassiumReposGroupSuspended,
  isPotassiumReposMedicationItem,
  potassiumReposGroupMedLabelHtml,
} from "../potassium-repos-display.mjs";
import { esc, isMedNotaSelected } from "./medications-utils.mjs";

export function buildMedDietHtml(dietas) {
  if (!dietas || !dietas.length) return "";
  var candidates = listDietCandidates(dietas);
  if (!candidates.length) return "";
  if (candidates.length === 1) {
    var mergedDiet = candidates[0];
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
  return (
    '<div class="med-receta-diet-card" style="margin-bottom:12px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2, rgba(0,0,0,.02));">' +
    '<div style="font-weight:600;font-size:12px;margin-bottom:6px;">Dietas detectadas (' +
    candidates.length +
    ")</div>" +
    candidates
      .map(function (opt) {
        return (
          '<div style="margin-top:6px;font-size:13px;">' +
          esc(opt.label || buildDietProposalText(opt)) +
          (opt.source === "medicamentos"
            ? ' <span style="font-size:11px;color:var(--text-muted);">(medicamentos)</span>'
            : "") +
          "</div>"
        );
      })
      .join("") +
    '<div style="font-size:11px;color:var(--text-muted);margin-top:8px;">Elige cuál aplicar en Estado Actual.</div>' +
    "</div>"
  );
}

function medRecetaDestPickerLabel(categoryKey) {
  return categoryKey ? SOAP_DESTINATION_LABELS[categoryKey] || categoryKey : "Elegir destino…";
}

function buildMedRecetaDestCell(it, sid, soapEligible) {
  if (!soapEligible) return "";
  var current = soapDestinationUiValue(it, classifyMedicationSoapCategory);
  var opts = soapDestinationSelectOptionsHtml(esc, { current: current });
  return (
    '<label class="med-receta-dest-picker">' +
    '<span class="med-receta-dest-label">' +
    esc(medRecetaDestPickerLabel(current)) +
    "</span>" +
    '<select class="med-receta-dest" title="Destino en Estado Actual / SOAP (corrige auto-clasificación)"' +
    " onchange=\"setMedRecetaSoapCategory('" +
    safeAttrJsString(sid) +
    "', this.value)\"" +
    ">" +
    opts +
    "</select>" +
    "</label>"
  );
}

function buildInsulinRescateGroupRowHtml(activeId, items) {
  var paraNota = isInsulinRescateGroupSoapSelected(activeId, items, isMedNotaSelected) ? " checked" : "";
  var chk = isInsulinRescateGroupSuspended(items, function (id) {
    var it = items.find(function (x) {
      return String(x.id) === String(id);
    });
    return !!(it && it.suspendido);
  })
    ? " checked"
    : "";
  return (
    '<div class="med-receta-row med-receta-row--insulin-rescate" data-med-item-id="' +
    esc(INSULIN_RESCATE_GROUP_ID) +
    '">' +
    '<div class="med-receta-checkcell">' +
    '<input type="checkbox"' +
    chk +
    ' title="Excluir rescates de insulina del texto de egreso"' +
    " onchange=\"toggleMedRecetaInsulinRescateSuspendido(this.checked)\"" +
    "/>" +
    "</div>" +
    '<div class="med-receta-checkcell">' +
    '<input type="checkbox" data-med-soap-chk="1"' +
    paraNota +
    ' title="Incluir rescates de insulina en Estado Actual / SOAP"' +
    " onchange=\"toggleMedRecetaInsulinRescateParaNota(this.checked)\"" +
    "/>" +
    "</div>" +
    '<div class="med-receta-name">' +
    insulinRescateMedLabelHtml(esc) +
    "</div>" +
    '<div class="med-receta-destcell"></div>' +
    '<div class="med-receta-diacell"></div>' +
    "</div>"
  );
}

function buildInsulinPrandialGroupRowHtml(activeId, items) {
  var paraNota = isInsulinPrandialGroupSoapSelected(activeId, items, isMedNotaSelected) ? " checked" : "";
  var chk = isInsulinPrandialGroupSuspended(items, function (id) {
    var it = items.find(function (x) {
      return String(x.id) === String(id);
    });
    return !!(it && it.suspendido);
  })
    ? " checked"
    : "";
  return (
    '<div class="med-receta-row med-receta-row--insulin-prandial" data-med-item-id="' +
    esc(INSULIN_PRANDIAL_GROUP_ID) +
    '">' +
    '<div class="med-receta-checkcell">' +
    '<input type="checkbox"' +
    chk +
    ' title="Excluir insulina preprandial del texto de egreso"' +
    " onchange=\"toggleMedRecetaInsulinPrandialSuspendido(this.checked)\"" +
    "/>" +
    "</div>" +
    '<div class="med-receta-checkcell">' +
    '<input type="checkbox" data-med-soap-chk="1"' +
    paraNota +
    ' title="Incluir insulina preprandial en Estado Actual / SOAP"' +
    " onchange=\"toggleMedRecetaInsulinPrandialParaNota(this.checked)\"" +
    "/>" +
    "</div>" +
    '<div class="med-receta-name">' +
    insulinPrandialMedLabelHtml(items, esc) +
    "</div>" +
    '<div class="med-receta-destcell"></div>' +
    '<div class="med-receta-diacell"></div>' +
    "</div>"
  );
}

function buildPotassiumReposGroupRowHtml(activeId, items) {
  var paraNota = isPotassiumReposGroupSoapSelected(activeId, items, isMedNotaSelected) ? " checked" : "";
  var chk = isPotassiumReposGroupSuspended(items, function (id) {
    var it = items.find(function (x) {
      return String(x.id) === String(id);
    });
    return !!(it && it.suspendido);
  })
    ? " checked"
    : "";
  return (
    '<div class="med-receta-row med-receta-row--potassium-repos" data-med-item-id="' +
    esc(POTASSIUM_REPOS_GROUP_ID) +
    '">' +
    '<div class="med-receta-checkcell">' +
    '<input type="checkbox"' +
    chk +
    ' title="Excluir reposición de potasio del texto de egreso"' +
    " onchange=\"toggleMedRecetaPotassiumReposSuspendido(this.checked)\"" +
    "/>" +
    "</div>" +
    '<div class="med-receta-checkcell">' +
    '<input type="checkbox" data-med-soap-chk="1"' +
    paraNota +
    ' title="Incluir reposición de potasio en Estado Actual / SOAP"' +
    " onchange=\"toggleMedRecetaPotassiumReposParaNota(this.checked)\"" +
    "/>" +
    "</div>" +
    '<div class="med-receta-name">' +
    potassiumReposGroupMedLabelHtml(items, esc) +
    "</div>" +
    '<div class="med-receta-destcell"></div>' +
    '<div class="med-receta-diacell"></div>' +
    "</div>"
  );
}

function buildMedRecetaRowHtml(activeId, it, fechaActualizacion, allItems) {
  var sid = String(it.id || "");
  var diaOpts = fechaActualizacion ? { fechaActualizacion: fechaActualizacion } : undefined;
  var pumpAlg = insulinPumpAlgorithmForMedicationItem(allItems || [], it);
  var label;
  if (pumpAlg != null) {
    label = insulinPumpMedLabelHtml(pumpAlg, esc);
  } else {
    var listLabel = formatMedicationSoapShort(it, diaOpts);
    if (it.diaTratamiento != null) listLabel = listLabel.replace(/\s+DIA\s+\d+\s*$/i, "");
    label = esc(listLabel.slice(0, 160));
  }
  var chk = it.suspendido ? " checked" : "";
  var soapEligible = shouldIncludeMedicationInSoap(it, classifyMedicationSoapCategory);
  var paraNota = soapEligible && isMedNotaSelected(activeId, sid) ? " checked" : "";
  var autoCat = classifyMedicationSoapCategory(it.nombreRaw, it.dosisRaw);
  var destCell = buildMedRecetaDestCell(it, sid, soapEligible);
  var soapCell = soapEligible
    ? '<div class="med-receta-checkcell">' +
      '<input type="checkbox" data-med-soap-chk="1"' +
      paraNota +
      ' title="Incluir en Tratamiento y campos SOAP (Analgesia / ABX / AntiHTA)"' +
      " onchange=\"toggleMedRecetaParaNota('" +
      safeAttrJsString(sid) +
      "', this.checked)\"" +
      "/>" +
      "</div>"
    : '<div class="med-receta-checkcell" title="PRN / rescate: no se documenta en SOAP (excepto analgesia)">' +
      '<span class="med-receta-soap-na" aria-hidden="true">—</span>' +
      "</div>";
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
    soapCell +
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
  var rows = [];
  var rescateShown = false;
  var prandialShown = false;
  var kReposShown = false;
  items.forEach(function (it) {
    if (isNutritionMedicationItem(it)) return;
    if (isInsulinRescateMedicationItem(it)) {
      if (!rescateShown) {
        rows.push(buildInsulinRescateGroupRowHtml(activeId, items));
        rescateShown = true;
      }
      return;
    }
    if (isInsulinPrandialMedicationItem(it)) {
      if (!prandialShown) {
        rows.push(buildInsulinPrandialGroupRowHtml(activeId, items));
        prandialShown = true;
      }
      return;
    }
    if (isPotassiumReposMedicationItem(it)) {
      if (!kReposShown) {
        rows.push(buildPotassiumReposGroupRowHtml(activeId, items));
        kReposShown = true;
      }
      return;
    }
    if (skipRecetaItemForInsulinPumpCarrier(it, items)) return;
    if (isPotassiumReposCarrierMedicationItem(it, items)) return;
    rows.push(buildMedRecetaRowHtml(activeId, it, block.fechaActualizacion, items));
  });
  if (!rows.length) return "";
  return (
    '<div class="med-receta-wrap">' +
    '<div class="med-receta-head">' +
    '<span title="Excluir del texto de egreso">Excl.</span>' +
    '<span title="Incluir en Estado Actual / SOAP">SOAP</span>' +
    "<span>Medicamento</span>" +
    '<span title="Destino SOAP / Estado Actual (editable)">Destino</span>' +
    '<span title="Día de tratamiento (DIA#)">Día</span>' +
    "</div>" +
    rows.join("") +
    "</div>"
  );
}

/**
 * Counts the Manejo turno rows split into real medications vs. apoyo (support) items
 * — e.g. oxygen therapy — so the header can show "Medicamentos del turno · N" plus
 * "más K apoyo(s) (O₂)" apart, instead of lumping apoyos into the medication count.
 * Mirrors the row-skip logic in buildMedRecetaListHtml (nutrition rows never shown here,
 * insulin rescate/prandial/potassium-repos groups count once each as a medication).
 * @param {unknown[]} items
 * @returns {{ medCount: number, apoyoCount: number, apoyoKinds: string[] }}
 */
export function countMedTurnoItems(items) {
  var list = Array.isArray(items) ? items : [];
  var medCount = 0;
  var apoyoCount = 0;
  var apoyoKindSeen = {};
  var apoyoKinds = [];
  var rescateShown = false;
  var prandialShown = false;
  var kReposShown = false;
  list.forEach(function (it) {
    if (isNutritionMedicationItem(it)) return;
    if (isInsulinRescateMedicationItem(it)) {
      if (!rescateShown) {
        medCount += 1;
        rescateShown = true;
      }
      return;
    }
    if (isInsulinPrandialMedicationItem(it)) {
      if (!prandialShown) {
        medCount += 1;
        prandialShown = true;
      }
      return;
    }
    if (isPotassiumReposMedicationItem(it)) {
      if (!kReposShown) {
        medCount += 1;
        kReposShown = true;
      }
      return;
    }
    if (skipRecetaItemForInsulinPumpCarrier(it, list)) return;
    if (isPotassiumReposCarrierMedicationItem(it, list)) return;
    var apoyoKind = classifyApoyoKind(it && it.nombreRaw);
    if (apoyoKind) {
      apoyoCount += 1;
      if (!apoyoKindSeen[apoyoKind]) {
        apoyoKindSeen[apoyoKind] = true;
        apoyoKinds.push(apoyoKind);
      }
      return;
    }
    medCount += 1;
  });
  return { medCount: medCount, apoyoCount: apoyoCount, apoyoKinds: apoyoKinds };
}

/**
 * Builds the "Medicamentos del turno · N" title and the secondary
 * "más K apoyo(s) (O₂)" text for the Manejo header, from the same counts.
 * @param {{ medCount: number, apoyoCount: number, apoyoKinds: string[] }} counts
 * @returns {{ title: string, secondary: string }}
 */
export function buildMedTurnoHeaderText(counts) {
  var medCount = counts && typeof counts.medCount === "number" ? counts.medCount : 0;
  var apoyoCount = counts && typeof counts.apoyoCount === "number" ? counts.apoyoCount : 0;
  var apoyoKinds = (counts && counts.apoyoKinds) || [];
  var title = "Medicamentos del turno · " + medCount;
  if (!apoyoCount) return { title: title, secondary: "" };
  var labels = apoyoKinds.map(apoyoKindLabel).filter(Boolean);
  var suffix = labels.length ? " (" + labels.join(", ") + ")" : "";
  var noun = apoyoCount === 1 ? "apoyo" : "apoyos";
  return { title: title, secondary: "más " + apoyoCount + " " + noun + suffix };
}
