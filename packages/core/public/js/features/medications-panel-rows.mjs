import {
  formatMedicationSoapShort,
  classifyMedicationSoapCategory,
  effectiveDiaTratamiento,
  SOAP_DESTINATION_LABELS,
  SOAP_DESTINATION_KEYS,
  isPrnMedicationItem,
  shouldIncludeMedicationInSoap,
  soapDestinationUiValue,
  isNutritionMedicationItem,
  listDietCandidates,
  buildDietProposalText,
  classifyApoyoKind,
  apoyoKindLabel,
} from "../med-receta-core.mjs";
import { insulinPumpAlgorithmForMedicationItem, formatInsulinPumpAlgorithmPill } from "../insulin-pump-some-detect.mjs";
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
import { isMedNotaSelected } from "./medications-utils.mjs";

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

/** Group labels are plain text (the view escapes them); the old builders took an HTML escaper. */
function rawText(x) {
  return String(x || "");
}

/** Action buttons as data: final click args (the state flips on click), nothing escaped. */
function notaAction(fn, argsBeforeState, on) {
  return { fn: fn, args: argsBeforeState.concat([!on]), on: on };
}

function exclAction(fn, argsBeforeState, excluded) {
  return { fn: fn, args: argsBeforeState.concat([!excluded]), excluded: excluded };
}

/** Insulin rescate / prandial, potassium repos and Stanford rows: one row for many items. */
var GROUP_ROWS = [
  {
    id: INSULIN_RESCATE_GROUP_ID,
    cls: "med-receta-row--insulin-rescate",
    is: isInsulinRescateMedicationItem,
    first: insulinRescateItemsFromList,
    label: function () { return insulinRescateMedLabelHtml(rawText); },
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
    label: function (items) { return insulinPrandialMedLabelHtml(items, rawText); },
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
    label: function (items) { return potassiumReposGroupMedLabelHtml(items, rawText); },
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
    label: function (items) { return stanfordSolutionGroupMedLabelHtml(items, rawText); },
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
  // Plain labels get the same sentence case + dose split as single rows.
  var parts = splitMedLabel(def.label(items));
  return {
    group: group,
    id: def.id,
    cls: def.cls + (suspended ? " is-excluded" : ""),
    name: { text: parts.name, dose: parts.dose },
    nota: suspended ? null : notaAction(def.notaFn, [], def.sel(activeId, items, isMedNotaSelected)),
    dest: null,
    excl: exclAction(def.exclFn, [], suspended),
  };
}

/** Name cell data: sentence-case name, Día chip, PRN tag, gray dose (pump rows keep their own label). */
function medRowName(it, sid, fechaActualizacion, allItems, now) {
  var pumpAlg = insulinPumpAlgorithmForMedicationItem(allItems || [], it);
  if (pumpAlg != null) return { pill: formatInsulinPumpAlgorithmPill(pumpAlg) };
  var diaOpts = { refDate: now };
  if (fechaActualizacion) diaOpts.fechaActualizacion = fechaActualizacion;
  var fullLabel = formatMedicationSoapShort(it, diaOpts);
  if (it.diaTratamiento != null) fullLabel = fullLabel.replace(/\s+DIA\s+\d+\s*$/i, "");
  var diaDisplay = it.diaTratamiento != null ? effectiveDiaTratamiento(it.diaTratamiento, fechaActualizacion, now) : null;
  var parts = splitMedLabel(fullLabel.slice(0, 160));
  return {
    text: parts.name,
    title: fullLabel,
    dia: diaDisplay,
    diaArgs: [sid],
    prn: isPrnMedicationItem(it),
    dose: parts.dose,
  };
}

function buildMedRow(activeId, it, fechaActualizacion, allItems, now) {
  var sid = String(it.id || "");
  var soapEligible = shouldIncludeMedicationInSoap(it, classifyMedicationSoapCategory);
  var dest = soapDestinationUiValue(it, classifyMedicationSoapCategory);
  var group = it.suspendido ? "excl" : !soapEligible ? "solo" : dest || "falta";
  var excluded = !!it.suspendido;
  return {
    group: group,
    id: sid,
    cls: excluded ? "is-excluded" : "",
    name: medRowName(it, sid, fechaActualizacion, allItems, now),
    nota: !excluded && soapEligible && dest ? notaAction("toggleMedRecetaParaNota", [sid], isMedNotaSelected(activeId, sid)) : null,
    dest: !excluded && soapEligible ? { sid: sid, current: dest } : null,
    excl: exclAction("toggleMedRecetaSuspendido", [sid], excluded),
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

export var MED_DENSE_MIN_ROWS = 16;

/**
 * Manejo-B list as data: rows grouped by destino, each group a card with an uppercase label + count.
 * `now` is the reference date for «Día N» (the caller passes it; no clock is read here).
 * @returns {{ dense: boolean, groups: { key: string, label: string, hint?: string, cls?: string, rows: object[] }[] } | null} null when nothing shows
 */
export function buildMedRecetaListModel(activeId, block, now) {
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
    rows.push(buildMedRow(activeId, it, block.fechaActualizacion, items, now));
  });
  if (!rows.length) return null;
  var groups = [];
  medGroupOrder().forEach(function (key) {
    var inGroup = rows.filter(function (r) {
      return r.group === key;
    });
    if (!inGroup.length) return;
    var meta = GROUP_META[key] || { label: SOAP_DESTINATION_LABELS[key] || key };
    groups.push({ key: key, label: meta.label, hint: meta.hint, cls: meta.cls, rows: inGroup });
  });
  // Long lists go dense (one-line rows, 3 columns) so they fit without scrolling.
  // ponytail: row-count threshold, not a measured fit; measure the viewport if 16 misfires.
  return { dense: rows.length >= MED_DENSE_MIN_ROWS, groups: groups };
}

/**
 * Counts the Manejo turno rows split into real medications vs. apoyo (support) items
 * — e.g. oxygen therapy — so the header can show "Medicamentos del turno · N" plus
 * "más K apoyo(s) (O₂)" apart, instead of lumping apoyos into the medication count.
 * Mirrors the row-skip logic in buildMedRecetaListModel (nutrition rows never shown here,
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
