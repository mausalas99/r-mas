import {
  formatMedicationSoapShort,
  classifyMedicationSoapCategory,
  effectiveDiaTratamiento,
  SOAP_DESTINATION_LABELS,
  SOAP_DESTINATION_KEYS,
  soapDestinationSelectOptionsHtml,
  isPrnMedicationItem,
  shouldIncludeMedicationInSoap,
  soapDestinationUiValue,
  isNutritionMedicationItem,
  listDietCandidates,
  buildDietProposalText,
  classifyApoyoKind,
  apoyoKindLabel,
} from "../med-receta-core.mjs";
import { insulinPumpAlgorithmForMedicationItem, insulinPumpMedLabelHtml } from "../insulin-pump-some-detect.mjs";
import { skipRecetaItemForInsulinPumpCarrier } from "../insulin-pump-receta-display.mjs";
import {
  INSULIN_RESCATE_GROUP_ID,
  insulinRescateMedLabelHtml,
  isInsulinRescateGroupSoapSelected,
  isInsulinRescateGroupSuspended,
  isInsulinRescateMedicationItem,
  insulinRescateItemsFromList,
} from "../insulin-rescate-display.mjs";
import {
  INSULIN_PRANDIAL_GROUP_ID,
  insulinPrandialMedLabelHtml,
  isInsulinPrandialGroupSoapSelected,
  isInsulinPrandialGroupSuspended,
  isInsulinPrandialMedicationItem,
  insulinPrandialItemsFromList,
} from "../insulin-prandial-display.mjs";
import {
  POTASSIUM_REPOS_GROUP_ID,
  isPotassiumReposCarrierMedicationItem,
  isPotassiumReposGroupSoapSelected,
  isPotassiumReposGroupSuspended,
  isPotassiumReposMedicationItem,
  potassiumReposGroupMedLabelHtml,
  potassiumReposItemsFromList,
} from "../potassium-repos-display.mjs";
import {
  STANFORD_SOLUTION_GROUP_ID,
  isStanfordSolutionGroupSoapSelected,
  isStanfordSolutionGroupSuspended,
  isStanfordSolutionMedicationItem,
  stanfordSolutionGroupMedLabelHtml,
  stanfordSolutionItemsFromList,
} from "../stanford-solution-display.mjs";
import { esc, isMedNotaSelected } from "./medications-utils.mjs";
import { escAttr } from "../dom-escape.mjs";

/**
 * Diet chip text for the Manejo header (Manejo-B): one diet → "desc · kcal · g prot.",
 * several → "N dietas" (the title lists them; Estado Actual still picks one).
 * @returns {{ text: string, title: string }}
 */
export function buildMedDietChip(dietas) {
  var candidates = dietas && dietas.length ? listDietCandidates(dietas) : [];
  if (!candidates.length) return { text: "", title: "" };
  if (candidates.length === 1) {
    var d = candidates[0];
    var parts = [d.descripcion || "—"];
    if (d.kcal != null) parts.push(d.kcal + " kcal");
    if (d.proteinG != null) parts.push(d.proteinG + " g proteína");
    return { text: parts.join(" · "), title: "Dieta detectada" };
  }
  return {
    text: candidates.length + " dietas",
    title:
      candidates
        .map(function (opt) {
          return opt.label || buildDietProposalText(opt);
        })
        .join("\n") + "\nElige cuál aplicar en Estado Actual.",
  };
}

var UPPER_DOSE_TOKENS = { iv: 1, vo: 1, sc: 1, im: 1, sl: 1, sng: 1, ui: 1, prn: 1, nph: 1, in: 0 };

/**
 * Splits a SOAP-short label ("CEFTRIAXONA 1G IV C/24H") into a sentence-case
 * name and a lower-case dose ("Ceftriaxona", "1 g IV c/24 h"). The dose starts
 * at the first word (after the first) that begins with a digit.
 */
export function splitMedLabel(label) {
  var words = String(label || "").trim().split(/\s+/).filter(Boolean);
  var cut = words.findIndex(function (w, i) {
    return i > 0 && /^\d/.test(w);
  });
  if (cut < 0) cut = words.length;
  var name = words.slice(0, cut).join(" ").toLowerCase();
  var dose = words
    .slice(cut)
    .join(" ")
    .toLowerCase()
    .replace(/(\d)(mg|mcg|g|ml|meq|ui|u|h|l)\b/g, "$1 $2")
    .replace(/\bmeq\b/g, "mEq")
    .replace(/\bml\b/g, "mL")
    .replace(/\b[a-z]+\b/g, function (w) {
      return UPPER_DOSE_TOKENS[w] ? w.toUpperCase() : w;
    });
  return { name: name.charAt(0).toUpperCase() + name.slice(1), dose: dose };
}

var NOTA_TITLE = "Incluir en Estado Actual (nota)";
var EXCL_TITLE = "Excluir de Estado actual y egreso";
var ICON_DEST =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg>';
var ICON_EXCL =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>';

function actionAttr(fn, args) {
  return ' data-onclick="' + fn + "\" data-onclick-args='" + escAttr(JSON.stringify(args)) + "'";
}

function notaChipHtml(fn, argsBeforeState, on) {
  return (
    '<button type="button" class="med-nota-chip' +
    (on ? " is-on" : "") +
    '" data-med-soap-chk="1" aria-pressed="' +
    (on ? "true" : "false") +
    '" title="' +
    NOTA_TITLE +
    '"' +
    actionAttr(fn, argsBeforeState.concat([!on])) +
    ">Nota</button>"
  );
}

function exclButtonsHtml(fn, argsBeforeState, excluded) {
  if (excluded) {
    return '<button type="button" class="wb-btn wb-btn-ghost wb-btn-sm med-restore-btn"' + actionAttr(fn, argsBeforeState.concat([false])) + ">Restaurar</button>";
  }
  return (
    '<button type="button" class="wb-btn wb-btn-ghost wb-btn-icon med-excl-btn" aria-label="' +
    EXCL_TITLE +
    '" title="' +
    EXCL_TITLE +
    '"' +
    actionAttr(fn, argsBeforeState.concat([true])) +
    ">" +
    ICON_EXCL +
    "</button>"
  );
}

/** «Cambiar destino»: an icon over the existing native destino select. */
function destPickerHtml(it, sid) {
  var current = soapDestinationUiValue(it, classifyMedicationSoapCategory);
  return (
    '<label class="med-receta-dest-picker wb-btn wb-btn-ghost wb-btn-icon" title="Cambiar destino">' +
    ICON_DEST +
    '<span class="visually-hidden med-receta-dest-label">' +
    esc(current ? SOAP_DESTINATION_LABELS[current] || current : "Elegir destino…") +
    "</span>" +
    '<select class="med-receta-dest" aria-label="Cambiar destino"' +
    ' data-onchange="setMedRecetaSoapCategory" data-onchange-args=\'' +
    escAttr(JSON.stringify([sid])) +
    "' data-onchange-pass=\"value\">" +
    soapDestinationSelectOptionsHtml(esc, { current: current }) +
    "</select></label>"
  );
}

function rowHtml(id, extraClass, nameHtml, actionsHtml) {
  return (
    '<div class="med-receta-row' +
    (extraClass ? " " + extraClass : "") +
    '" data-med-item-id="' +
    esc(id) +
    '"><div class="med-receta-name">' +
    nameHtml +
    '</div><div class="med-receta-actions">' +
    actionsHtml +
    "</div></div>"
  );
}

/** Insulin rescate / prandial, potassium repos and Stanford rows: one row for many items. */
var GROUP_ROWS = [
  {
    id: INSULIN_RESCATE_GROUP_ID,
    cls: "med-receta-row--insulin-rescate",
    is: isInsulinRescateMedicationItem,
    first: insulinRescateItemsFromList,
    label: function () { return insulinRescateMedLabelHtml(esc); },
    sel: isInsulinRescateGroupSoapSelected,
    susp: isInsulinRescateGroupSuspended,
    notaFn: "toggleMedRecetaInsulinRescateParaNota",
    exclFn: "toggleMedRecetaInsulinRescateSuspendido",
  },
  {
    id: INSULIN_PRANDIAL_GROUP_ID,
    cls: "med-receta-row--insulin-prandial",
    is: isInsulinPrandialMedicationItem,
    first: insulinPrandialItemsFromList,
    label: function (items) { return insulinPrandialMedLabelHtml(items, esc); },
    sel: isInsulinPrandialGroupSoapSelected,
    susp: isInsulinPrandialGroupSuspended,
    notaFn: "toggleMedRecetaInsulinPrandialParaNota",
    exclFn: "toggleMedRecetaInsulinPrandialSuspendido",
  },
  {
    id: POTASSIUM_REPOS_GROUP_ID,
    cls: "med-receta-row--potassium-repos",
    is: isPotassiumReposMedicationItem,
    first: potassiumReposItemsFromList,
    label: function (items) { return potassiumReposGroupMedLabelHtml(items, esc); },
    sel: isPotassiumReposGroupSoapSelected,
    susp: isPotassiumReposGroupSuspended,
    notaFn: "toggleMedRecetaPotassiumReposParaNota",
    exclFn: "toggleMedRecetaPotassiumReposSuspendido",
    group: "repo",
  },
  {
    id: STANFORD_SOLUTION_GROUP_ID,
    cls: "med-receta-row--stanford-solution",
    is: isStanfordSolutionMedicationItem,
    first: stanfordSolutionItemsFromList,
    label: function (items) { return stanfordSolutionGroupMedLabelHtml(items, esc); },
    sel: isStanfordSolutionGroupSoapSelected,
    susp: isStanfordSolutionGroupSuspended,
    notaFn: "toggleMedRecetaStanfordSolutionParaNota",
    exclFn: "toggleMedRecetaStanfordSolutionSuspendido",
  },
];

function buildGroupRow(def, activeId, items) {
  var suspended = def.susp(items, function (id) {
    var it = items.find(function (x) {
      return String(x.id) === String(id);
    });
    return !!(it && it.suspendido);
  });
  var first = def.first(items)[0];
  var group = suspended ? "excl" : def.group || soapDestinationUiValue(first, classifyMedicationSoapCategory) || "nm";
  var actions = suspended
    ? exclButtonsHtml(def.exclFn, [], true)
    : notaChipHtml(def.notaFn, [], def.sel(activeId, items, isMedNotaSelected)) + exclButtonsHtml(def.exclFn, [], false);
  var label = def.label(items);
  // Plain (already escaped) labels get the same sentence case + dose split as single rows.
  var parts = /</.test(label) ? null : splitMedLabel(label);
  var nameHtml = parts
    ? '<span class="med-row-name">' + parts.name + "</span>" + (parts.dose ? '<div class="med-row-dose">' + parts.dose + "</div>" : "")
    : '<span class="med-row-name">' + label + "</span>";
  return { group: group, html: rowHtml(def.id, def.cls + (suspended ? " is-excluded" : ""), nameHtml, actions) };
}

/** Name cell: sentence-case name, Día chip, PRN tag, gray dose (pump rows keep their own label). */
function medRowNameHtml(it, sid, fechaActualizacion, allItems) {
  var pumpAlg = insulinPumpAlgorithmForMedicationItem(allItems || [], it);
  if (pumpAlg != null) return '<span class="med-row-name">' + insulinPumpMedLabelHtml(pumpAlg, esc) + "</span>";
  var diaOpts = fechaActualizacion ? { fechaActualizacion: fechaActualizacion } : undefined;
  var fullLabel = formatMedicationSoapShort(it, diaOpts);
  if (it.diaTratamiento != null) fullLabel = fullLabel.replace(/\s+DIA\s+\d+\s*$/i, "");
  var diaDisplay = it.diaTratamiento != null ? effectiveDiaTratamiento(it.diaTratamiento, fechaActualizacion) : null;
  var parts = splitMedLabel(fullLabel.slice(0, 160));
  return (
    '<span class="med-row-name" title="' + escAttr(fullLabel) + '">' + esc(parts.name) + "</span>" +
    (diaDisplay != null
      ? '<button type="button" class="med-receta-dia" title="Cambiar día de antibiótico"' +
        actionAttr("editMedRecetaAbxDia", [sid]) +
        ">Día " + esc(String(diaDisplay)) + "</button>"
      : "") +
    (isPrnMedicationItem(it) ? '<span class="med-prn-tag">PRN</span>' : "") +
    (parts.dose ? '<div class="med-row-dose">' + esc(parts.dose) + "</div>" : "")
  );
}

/** Actions: «Nota» (only with a destino), «Cambiar destino», ⊘ Excluir / Restaurar. */
function medRowActionsHtml(activeId, it, sid, soapEligible, dest) {
  if (it.suspendido) return exclButtonsHtml("toggleMedRecetaSuspendido", [sid], true);
  return (
    (soapEligible && dest ? notaChipHtml("toggleMedRecetaParaNota", [sid], isMedNotaSelected(activeId, sid)) : "") +
    (soapEligible ? destPickerHtml(it, sid) : "") +
    exclButtonsHtml("toggleMedRecetaSuspendido", [sid], false)
  );
}

function buildMedRow(activeId, it, fechaActualizacion, allItems) {
  var sid = String(it.id || "");
  var soapEligible = shouldIncludeMedicationInSoap(it, classifyMedicationSoapCategory);
  var dest = soapDestinationUiValue(it, classifyMedicationSoapCategory);
  var group = it.suspendido ? "excl" : !soapEligible ? "solo" : dest || "falta";
  return {
    group: group,
    html: rowHtml(
      sid,
      it.suspendido ? "is-excluded" : "",
      medRowNameHtml(it, sid, fechaActualizacion, allItems),
      medRowActionsHtml(activeId, it, sid, soapEligible, dest)
    ),
  };
}

var GROUP_META = {
  falta: { label: "Falta destino", hint: "no sale en la nota hasta que elijas uno", cls: "med-group--warn" },
  repo: { label: "Reposiciones", hint: "texto fijo" },
  solo: { label: "Solo egreso", hint: "PRN y apoyo · no van a la nota" },
  excl: { label: "Excluidos", hint: "no salen en Estado actual ni en egreso", cls: "med-group--muted" },
};

/** Group order: Falta destino, each SOAP destino in picker order, Reposiciones, Solo egreso, Excluidos. */
export function medGroupOrder() {
  return ["falta"].concat(SOAP_DESTINATION_KEYS, ["repo", "solo", "excl"]);
}

/** Manejo-B: rows grouped by destino, each group a card with an uppercase label + count. */
export function buildMedRecetaListHtml(activeId, block) {
  var items = block.items || [];
  var rows = [];
  var shownGroupRows = {};
  items.forEach(function (it) {
    if (isNutritionMedicationItem(it)) return;
    var def = GROUP_ROWS.find(function (g) {
      return g.is(it);
    });
    if (def) {
      if (!shownGroupRows[def.id]) {
        shownGroupRows[def.id] = true;
        rows.push(buildGroupRow(def, activeId, items));
      }
      return;
    }
    if (skipRecetaItemForInsulinPumpCarrier(it, items)) return;
    if (isPotassiumReposCarrierMedicationItem(it, items)) return;
    rows.push(buildMedRow(activeId, it, block.fechaActualizacion, items));
  });
  if (!rows.length) return "";
  var html = medGroupOrder()
    .map(function (key) {
      var inGroup = rows.filter(function (r) {
        return r.group === key;
      });
      if (!inGroup.length) return "";
      var meta = GROUP_META[key] || { label: SOAP_DESTINATION_LABELS[key] || key };
      return (
        '<section class="med-group' + (meta.cls ? " " + meta.cls : "") + '" data-med-group="' + esc(key) + '">' +
        '<div class="med-group-head"><span class="med-group-label">' + esc(meta.label) + " · " + inGroup.length + "</span>" +
        (meta.hint ? '<span class="med-group-hint">' + esc(meta.hint) + "</span>" : "") +
        '</div><div class="med-group-card">' +
        inGroup.map(function (r) { return r.html; }).join("") +
        "</div></section>"
      );
    })
    .join("");
  return '<div class="med-receta-wrap med-groups">' + html + "</div>";
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
  var stanfordShown = false;
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
    if (isStanfordSolutionMedicationItem(it)) {
      if (!stanfordShown) {
        medCount += 1;
        stanfordShown = true;
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
