import { classifyMedicationSoapCategory, SOAP_DESTINATION_KEYS } from "../med-receta-core.mjs";
import { getMedRecetaByPatient, persistClinicalState } from "../app-state.mjs";
import { scheduleCloudSyncPush } from "./cloud-sync/mutate-bridge.mjs";
import { resolveGlobalFn } from "./resolve-global-fn.mjs";
import { invalidateEaPanelCache } from "./estado-actual-panel.mjs";
import { rt, bustMedPanelCache } from "./medications-runtime-state.mjs";
import { insulinRescateItemsFromList, INSULIN_RESCATE_GROUP_ID } from "../insulin-rescate-display.mjs";
import { insulinPrandialItemsFromList, INSULIN_PRANDIAL_GROUP_ID } from "../insulin-prandial-display.mjs";
import { potassiumReposItemsFromList, POTASSIUM_REPOS_GROUP_ID } from "../potassium-repos-display.mjs";
import { stanfordSolutionItemsFromList, STANFORD_SOLUTION_GROUP_ID } from "../stanford-solution-display.mjs";
import { getMedNotaSelMap } from "./medications-utils.mjs";
import { patchMedRecetaRowSoapUi } from "./medications-panel-cache.mjs";
import { renderMedRecetaPanel } from "./medications-panel-render.mjs";
import { renderMedNotaFooter } from "./medications-soap-footer.mjs";

export function switchInnerTab(tab, opts) {
  var fn = resolveGlobalFn("switchInnerTab");
  if (fn) fn(tab, opts);
}

export function invalidateInnerTabRenderCache(tab) {
  var fn = resolveGlobalFn("invalidateInnerTabRenderCache");
  if (fn) fn(tab);
}

export function toggleMedRecetaSuspendido(itemId, suspended) {
  var activeId = rt.getActiveId();
  if (!activeId || !getMedRecetaByPatient()[activeId] || !getMedRecetaByPatient()[activeId].items) return;
  var it = getMedRecetaByPatient()[activeId].items.find(function (x) {
    return String(x.id) === String(itemId);
  });
  if (!it) return;
  it.suspendido = !!suspended;
  persistClinicalState();
  scheduleCloudSyncPush();
  invalidateEaPanelCache();
  invalidateInnerTabRenderCache("estadoActual");
  renderMedRecetaPanel();
}

export function toggleMedRecetaParaNota(itemId, selected) {
  var activeId = rt.getActiveId();
  if (!activeId) return;
  var sid = String(itemId || "");
  var m = getMedNotaSelMap(activeId);
  if (selected) m[sid] = true;
  else delete m[sid];
  bustMedPanelCache();
  if (!patchMedRecetaRowSoapUi(sid)) renderMedRecetaPanel();
  else renderMedNotaFooter();
}

function toggleInsulinRescateGroupSelection(activeId, selected) {
  var block = getMedRecetaByPatient()[activeId];
  var items = block && Array.isArray(block.items) ? block.items : [];
  var m = getMedNotaSelMap(activeId);
  insulinRescateItemsFromList(items).forEach(function (it) {
    var id = String(it.id || "");
    if (!id) return;
    if (selected) m[id] = true;
    else delete m[id];
  });
}

function toggleInsulinPrandialGroupSelection(activeId, selected) {
  var block = getMedRecetaByPatient()[activeId];
  var items = block && Array.isArray(block.items) ? block.items : [];
  var m = getMedNotaSelMap(activeId);
  insulinPrandialItemsFromList(items).forEach(function (it) {
    var id = String(it.id || "");
    if (!id) return;
    if (selected) m[id] = true;
    else delete m[id];
  });
}

export function toggleMedRecetaInsulinRescateParaNota(selected) {
  var activeId = rt.getActiveId();
  if (!activeId) return;
  toggleInsulinRescateGroupSelection(activeId, selected);
  bustMedPanelCache();
  if (!patchMedRecetaRowSoapUi(INSULIN_RESCATE_GROUP_ID)) renderMedRecetaPanel();
  else renderMedNotaFooter();
}

export function toggleMedRecetaInsulinRescateSuspendido(suspended) {
  var activeId = rt.getActiveId();
  if (!activeId || !getMedRecetaByPatient()[activeId] || !getMedRecetaByPatient()[activeId].items) return;
  insulinRescateItemsFromList(getMedRecetaByPatient()[activeId].items).forEach(function (it) {
    it.suspendido = !!suspended;
  });
  persistClinicalState();
  scheduleCloudSyncPush();
  invalidateEaPanelCache();
  invalidateInnerTabRenderCache("estadoActual");
  renderMedRecetaPanel();
}

export function toggleMedRecetaInsulinPrandialParaNota(selected) {
  var activeId = rt.getActiveId();
  if (!activeId) return;
  toggleInsulinPrandialGroupSelection(activeId, selected);
  bustMedPanelCache();
  if (!patchMedRecetaRowSoapUi(INSULIN_PRANDIAL_GROUP_ID)) renderMedRecetaPanel();
  else renderMedNotaFooter();
}

export function toggleMedRecetaInsulinPrandialSuspendido(suspended) {
  var activeId = rt.getActiveId();
  if (!activeId || !getMedRecetaByPatient()[activeId] || !getMedRecetaByPatient()[activeId].items) return;
  insulinPrandialItemsFromList(getMedRecetaByPatient()[activeId].items).forEach(function (it) {
    it.suspendido = !!suspended;
  });
  persistClinicalState();
  scheduleCloudSyncPush();
  invalidateEaPanelCache();
  invalidateInnerTabRenderCache("estadoActual");
  renderMedRecetaPanel();
}

function togglePotassiumReposGroupSelection(activeId, selected) {
  var block = getMedRecetaByPatient()[activeId];
  var items = block && Array.isArray(block.items) ? block.items : [];
  var m = getMedNotaSelMap(activeId);
  potassiumReposItemsFromList(items).forEach(function (it) {
    var id = String(it.id || "");
    if (!id) return;
    if (selected) m[id] = true;
    else delete m[id];
  });
}

export function toggleMedRecetaPotassiumReposParaNota(selected) {
  var activeId = rt.getActiveId();
  if (!activeId) return;
  togglePotassiumReposGroupSelection(activeId, selected);
  bustMedPanelCache();
  if (!patchMedRecetaRowSoapUi(POTASSIUM_REPOS_GROUP_ID)) renderMedRecetaPanel();
  else renderMedNotaFooter();
}

export function toggleMedRecetaPotassiumReposSuspendido(suspended) {
  var activeId = rt.getActiveId();
  if (!activeId || !getMedRecetaByPatient()[activeId] || !getMedRecetaByPatient()[activeId].items) return;
  potassiumReposItemsFromList(getMedRecetaByPatient()[activeId].items).forEach(function (it) {
    it.suspendido = !!suspended;
  });
  persistClinicalState();
  scheduleCloudSyncPush();
  invalidateEaPanelCache();
  invalidateInnerTabRenderCache("estadoActual");
  renderMedRecetaPanel();
}

function toggleStanfordSolutionGroupSelection(activeId, selected) {
  var block = getMedRecetaByPatient()[activeId];
  var items = block && Array.isArray(block.items) ? block.items : [];
  var m = getMedNotaSelMap(activeId);
  stanfordSolutionItemsFromList(items).forEach(function (it) {
    var id = String(it.id || "");
    if (!id) return;
    if (selected) m[id] = true;
    else delete m[id];
  });
}

export function toggleMedRecetaStanfordSolutionParaNota(selected) {
  var activeId = rt.getActiveId();
  if (!activeId) return;
  toggleStanfordSolutionGroupSelection(activeId, selected);
  bustMedPanelCache();
  if (!patchMedRecetaRowSoapUi(STANFORD_SOLUTION_GROUP_ID)) renderMedRecetaPanel();
  else renderMedNotaFooter();
}

export function toggleMedRecetaStanfordSolutionSuspendido(suspended) {
  var activeId = rt.getActiveId();
  if (!activeId || !getMedRecetaByPatient()[activeId] || !getMedRecetaByPatient()[activeId].items) return;
  stanfordSolutionItemsFromList(getMedRecetaByPatient()[activeId].items).forEach(function (it) {
    it.suspendido = !!suspended;
  });
  persistClinicalState();
  scheduleCloudSyncPush();
  invalidateEaPanelCache();
  invalidateInnerTabRenderCache("estadoActual");
  renderMedRecetaPanel();
}

export function setMedRecetaSoapCategory(itemId, category) {
  var activeId = rt.getActiveId();
  if (!activeId || !getMedRecetaByPatient()[activeId] || !getMedRecetaByPatient()[activeId].items) return;
  var it = getMedRecetaByPatient()[activeId].items.find(function (x) {
    return String(x.id) === String(itemId);
  });
  if (!it) return;
  var cat = String(category || "").trim();
  var autoCat = classifyMedicationSoapCategory(it.nombreRaw, it.dosisRaw);
  if (!cat || SOAP_DESTINATION_KEYS.indexOf(cat) < 0 || cat === autoCat) delete it.soapCatOverride;
  else it.soapCatOverride = cat;
  persistClinicalState();
  scheduleCloudSyncPush();
  invalidateEaPanelCache();
  invalidateInnerTabRenderCache("estadoActual");
  bustMedPanelCache();
  if (!patchMedRecetaRowSoapUi(itemId)) renderMedRecetaPanel();
  else renderMedNotaFooter();
}
