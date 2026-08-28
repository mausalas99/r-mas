import {
  openServicePickerModal
} from "/mobile/js/chunks/chunk-VLZVEJ7M.js";
import {
  settingsRef
} from "/mobile/js/chunks/chunk-Y7GW6JFZ.js";
import {
  getConsultInfo,
  openAddModal,
  patientCardIdFromEvent,
  renderConsultBandHtml,
  renderPatientCardHtml,
  setConsultInfo,
  shouldHandleTouchPointerUp
} from "/mobile/js/chunks/chunk-EHKTMIQM.js";
import {
  patientsVisibleInSidebar
} from "/mobile/js/chunks/chunk-BCFWY6CK.js";
import {
  patientsBridge
} from "/mobile/js/chunks/chunk-IUWKNPSX.js";
import {
  activePatientTeamId,
  assignPatientToTeamClinical,
  assignableTeamsForUser,
  getClinicalScopeContextForEvaluate,
  resolvePatientCensusTeamId,
  shouldGroupAssignableTeamsBySala
} from "/mobile/js/chunks/chunk-6J2G5HNR.js";
import {
  isGuardiaMode
} from "/mobile/js/chunks/chunk-RYZNIILX.js";
import {
  isModeSala
} from "/mobile/js/chunks/chunk-BURG7PNJ.js";
import {
  scheduleCloudSyncPush
} from "/mobile/js/chunks/chunk-WJVW5GRE.js";
import {
  getPatients,
  persistClinicalState,
  setPatients,
  setPersistPatientsResolver
} from "/mobile/js/chunks/chunk-2LHILGVA.js";
import {
  escHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import {
  showToast
} from "/mobile/js/chunks/chunk-IVEQE6G4.js";
import {
  isOnCallToday,
  normalizeServiceKey,
  toMillis
} from "/mobile/js/chunks/chunk-K5SBVD6P.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-A7GKLJFV.js";

// lib/clinical-scope/interconsulta-demo-seed.mjs
var FOLLOW_UPS = [
  { name: "Rosa Delgado", servicio: "Traumatolog\xEDa", edad: "72 a\xF1os", sexo: "F", cuarto: "301", cama: "01" },
  { name: "Ignacio Vera", servicio: "Cirug\xEDa general", edad: "65 a\xF1os", sexo: "M", cuarto: "302", cama: "02" },
  { name: "Marta Solis", servicio: "Ginecolog\xEDa", edad: "58 a\xF1os", sexo: "F", cuarto: "304", cama: "01" },
  { name: "Emilio Rangel", servicio: "Torre HU", edad: "61 a\xF1os", sexo: "M", cuarto: "305", cama: "02" },
  { name: "Beatriz Nu\xF1ez", servicio: "Neurocirug\xEDa", edad: "77 a\xF1os", sexo: "F", cuarto: "307", cama: "01" },
  { name: "Carlos Pe\xF1a", servicio: "Traumatolog\xEDa", edad: "54 a\xF1os", sexo: "M", cuarto: "308", cama: "02" },
  { name: "Diana Rios", servicio: "Cirug\xEDa general", edad: "81 a\xF1os", sexo: "F", cuarto: "310", cama: "01" },
  { name: "Felipe Cano", servicio: "Ginecolog\xEDa", edad: "49 a\xF1os", sexo: "M", cuarto: "311", cama: "02" }
];
var VPOS = [
  { name: "Sofia Aguilar", servicio: "Cirug\xEDa general", edad: "45 a\xF1os", sexo: "F", cuarto: "201", cama: "01" },
  { name: "Ramon Torres", servicio: "Traumatolog\xEDa", edad: "38 a\xF1os", sexo: "M", cuarto: "203", cama: "02" }
];
var NEW_ICS = [
  { name: "Lucia Mendoza", servicio: "Torre HU", edad: "29 a\xF1os", sexo: "F", cuarto: "URG", cama: "05" },
  { name: "Hector Salinas", servicio: "Ginecolog\xEDa", edad: "33 a\xF1os", sexo: "M", cuarto: "206", cama: "01" }
];
function isoAtOffsetDays(now, offsetDays) {
  const base = now instanceof Date ? new Date(now.getTime()) : new Date(String(now));
  base.setDate(base.getDate() + offsetDays);
  return base.toISOString();
}
function basePatient(id, def, teamId, overrides) {
  return Object.assign(
    {
      id,
      nombre: def.name,
      registro: "DEMO-" + id,
      edad: def.edad,
      sexo: def.sexo,
      isDemo: true,
      censusTeamId: teamId,
      cuarto: def.cuarto,
      cama: def.cama,
      servicio: def.servicio,
      interconsult_status: "Active"
    },
    overrides
  );
}
function buildInterconsultaDemoPatients(roles, now) {
  const nowDate = now instanceof Date ? now : new Date(String(now || Date.now()));
  const guardiaId = roles && roles.guardia ? String(roles.guardia.team_id) : "";
  const activoIds = (roles && roles.activo || []).map((t) => String(t.team_id));
  const teamCycle = [guardiaId, activoIds[0] || guardiaId, activoIds[1] || activoIds[0] || guardiaId, ""];
  const followUps = FOLLOW_UPS.map(
    (def, i) => basePatient("ic-demo-fu-" + (i + 1), def, teamCycle[i % teamCycle.length], {
      interconsult_type: "Follow-up",
      created_at: isoAtOffsetDays(nowDate, -3 - i),
      consultInfo: {
        requestingService: def.servicio,
        reason: "Seguimiento de interconsulta previa",
        followUpStatus: "en_curso"
      }
    })
  );
  const vpos = VPOS.map(
    (def, i) => basePatient("ic-demo-vpo-" + (i + 1), def, guardiaId, {
      interconsult_type: "Ephemeral_VPO",
      created_at: isoAtOffsetDays(nowDate, 0),
      consultInfo: {
        requestingService: def.servicio,
        reason: "Valoraci\xF3n preoperatoria",
        followUpStatus: "pendiente"
      }
    })
  );
  const newIcs = NEW_ICS.map(
    (def, i) => basePatient("ic-demo-new-" + (i + 1), def, guardiaId, {
      interconsult_type: "Follow-up",
      created_at: isoAtOffsetDays(nowDate, 0),
      consultInfo: {
        requestingService: def.servicio,
        reason: "Nueva interconsulta",
        followUpStatus: "pendiente"
      }
    })
  );
  return followUps.concat(vpos, newIcs);
}
function buildInterconsultaDemoTeams() {
  return [
    { team_id: "ic-demo-team-a", name: "Equipo Demo A", service: "Interconsultas", sub_area_fraction: "A" },
    { team_id: "ic-demo-team-b", name: "Equipo Demo B", service: "Interconsultas", sub_area_fraction: "B" },
    { team_id: "ic-demo-team-c", name: "Equipo Demo C", service: "Interconsultas", sub_area_fraction: "C" },
    { team_id: "ic-demo-team-d", name: "Equipo Demo D", service: "Interconsultas", sub_area_fraction: "D" }
  ];
}
function isInterconsultaDemoTeamId(teamId) {
  return String(teamId || "").startsWith("ic-demo-team-");
}
function buildInterconsultaDemoAssignments(patients, now) {
  const nowDate = now instanceof Date ? now : new Date(String(now || Date.now()));
  const effectiveAt = new Date(nowDate.getTime() - 24 * 60 * 60 * 1e3).toISOString();
  return (patients || []).filter((p) => p && p.censusTeamId).map((p) => ({
    patient_id: p.id,
    team_id: p.censusTeamId,
    effective_at: effectiveAt,
    created_at: effectiveAt
  }));
}

// lib/clinical-scope/interconsulta-team-roles.mjs
var RANK = "R1";
function yesterday(now) {
  const d = now instanceof Date ? now : new Date(String(now));
  const y = new Date(d.getTime());
  y.setDate(y.getDate() - 1);
  return y;
}
function getInterconsultaTeamRoles(teams, now) {
  const icTeams = (teams || []).filter((t) => normalizeServiceKey(t?.service).includes("interconsult"));
  const guardia = icTeams.find((t) => isOnCallToday(t, RANK, now)) || null;
  const postguardia = icTeams.find((t) => isOnCallToday(t, RANK, yesterday(now))) || null;
  const activo = icTeams.filter((t) => t !== guardia && t !== postguardia);
  return { guardia, postguardia, activo };
}

// public/js/features/interconsulta-demo-state.mjs
var demoActive = false;
function isInterconsultaDemoActive() {
  return demoActive;
}
function setInterconsultaDemoActive(value) {
  demoActive = !!value;
}

// lib/clinical-scope/interconsulta-board-buckets.mjs
function readConsultInfo(patient) {
  const info = patient && patient.consultInfo;
  if (!info || typeof info !== "object") return { followUpStatus: "" };
  return { followUpStatus: String(info.followUpStatus || "") };
}
function isCreatedToday(patient, now) {
  const created = toMillis(patient && patient.created_at);
  if (Number.isNaN(created)) return false;
  const ref = now instanceof Date ? now : /* @__PURE__ */ new Date();
  const createdDate = new Date(created);
  return createdDate.getFullYear() === ref.getFullYear() && createdDate.getMonth() === ref.getMonth() && createdDate.getDate() === ref.getDate();
}
function classifyInterconsultaBoardBucket(patient, opts) {
  const { isGuardiaTeam = false, now } = opts || {};
  if (!patient) return "pendientes";
  if (String(patient.interconsult_status || "") === "Resolved") return "archivado";
  if (String(patient.interconsult_type || "") === "Under") return "under";
  if (isGuardiaTeam) {
    if (String(patient.interconsult_type || "") === "Ephemeral_VPO") return "preop";
    const { followUpStatus } = readConsultInfo(patient);
    if (followUpStatus === "pendiente" && isCreatedToday(patient, now)) return "preop";
  }
  return "pendientes";
}

// public/js/features/interconsulta-team-board.mjs
var BUCKET_LABELS = {
  preop: "Preop / Nuevas hoy",
  pendientes: "Pendientes",
  under: "Under"
};
function teamLabel(team) {
  return String(team?.name || team?.service || "Equipo").trim() || "Equipo";
}
function groupByBucket(patients, isGuardiaTeam, now) {
  const groups = { preop: [], pendientes: [], under: [], archivado: [] };
  for (const p of patients || []) {
    const bucket = classifyInterconsultaBoardBucket(p, { isGuardiaTeam, now });
    (groups[bucket] || groups.pendientes).push(p);
  }
  return groups;
}
function renderCardGroupHtml(label, patients, accent) {
  return '<div class="ic-board-bucket' + (accent ? " ic-board-bucket--accent" : "") + '"><div class="r4-section-divider">' + escHtml(label) + " (" + patients.length + ')</div><div class="patient-chips-grid">' + patients.map(renderPatientCardHtml).join("") + "</div></div>";
}
function renderBucketSectionHtml(bucketKey, patients, highlight) {
  return renderCardGroupHtml(BUCKET_LABELS[bucketKey], patients, highlight);
}
function renderActiveLaneBodyHtml(patients, bucketKeys, isGuardiaTeam, now) {
  const groups = groupByBucket(patients, isGuardiaTeam, now);
  return bucketKeys.map((key) => renderBucketSectionHtml(key, groups[key], key === "preop")).join("");
}
function laneBodyAttr(dropTeamId) {
  return dropTeamId == null ? "" : ' data-drop-team-id="' + escHtml(String(dropTeamId)) + '"';
}
function renderGuardiaLaneHtml(team, patients, now) {
  const body = team ? renderActiveLaneBodyHtml(patients, ["preop", "pendientes", "under"], true, now) : '<p class="ic-board-empty">Sin equipo de guardia hoy.</p>';
  return '<section class="ic-board-lane ic-board-lane--guardia" data-role="guardia"><div class="ic-board-lane__head"><h3 class="ic-board-lane__title">' + escHtml(teamLabel(team)) + ' \u2014 Guardia</h3></div><div class="ic-board-lane__body"' + laneBodyAttr(team && team.team_id) + ">" + body + "</div></section>";
}
function laneSlots(roles) {
  const activo = roles.activo || [];
  return { activo: [activo[0] || null, activo[1] || null], overflow: activo.slice(2) };
}
function renderActivoLaneHtml(team, patients, now, slotIndex) {
  const title = team ? teamLabel(team) : "Activo " + (slotIndex + 1);
  const body = team ? renderActiveLaneBodyHtml(patients, ["pendientes", "under"], false, now) : '<p class="ic-board-empty">Sin equipo asignado.</p>';
  return '<section class="ic-board-lane ic-board-lane--activo" data-role="activo"><div class="ic-board-lane__head"><h3 class="ic-board-lane__title">' + escHtml(title) + '</h3></div><div class="ic-board-lane__body"' + laneBodyAttr(team && team.team_id) + ">" + body + "</div></section>";
}
function renderOtrosLaneHtml(groups) {
  const hasOverflowTeam = groups.some((g) => g.label !== "Sin equipo");
  const title = hasOverflowTeam ? "Otros equipos" : "Sin equipo";
  const body = groups.map((g) => renderCardGroupHtml(g.label, g.patients, false)).join("");
  return '<section class="ic-board-lane ic-board-lane--unassigned" data-role="sin-equipo"><div class="ic-board-lane__head"><h3 class="ic-board-lane__title">' + escHtml(title) + '</h3></div><div class="ic-board-lane__body" data-drop-team-id="">' + body + "</div></section>";
}
function renderPostguardiaLaneHtml(team, patients, now) {
  const body = team ? renderActiveLaneBodyHtml(patients, ["pendientes", "under"], false, now) : '<p class="ic-board-empty">Sin equipo.</p>';
  return '<section class="ic-board-lane ic-board-lane--postguardia" data-role="postguardia"><div class="ic-board-lane__head"><h3 class="ic-board-lane__title">' + escHtml(teamLabel(team)) + ' \u2014 Post-guardia</h3><p class="ic-board-empty">No presencial hoy \u2014 pacientes repartidos al resto del equipo.</p></div><div class="ic-board-lane__body"' + laneBodyAttr(team && team.team_id) + ">" + body + "</div></section>";
}
function renderInterconsultaTeamBoardHtml(patients, teams, now = /* @__PURE__ */ new Date(), opts = {}) {
  const { filterGuardiaOnly = false, hidePostguardia = false } = opts || {};
  const roles = getInterconsultaTeamRoles(teams, now);
  const byTeam = /* @__PURE__ */ new Map();
  for (const p of patients || []) {
    const teamId = String(p?.censusTeamId || "");
    if (!teamId) continue;
    if (!byTeam.has(teamId)) byTeam.set(teamId, []);
    byTeam.get(teamId).push(p);
  }
  const patientsFor = (team) => team ? byTeam.get(String(team.team_id || "")) || [] : [];
  const slots = laneSlots(roles);
  const knownTeamIds = new Set(
    [roles.guardia, roles.postguardia, ...slots.activo, ...slots.overflow].filter(Boolean).map((t) => String(t.team_id || ""))
  );
  if (filterGuardiaOnly) {
    const body = roles.guardia ? renderActiveLaneBodyHtml(patientsFor(roles.guardia), ["preop"], true, now) : '<p class="ic-board-empty">Sin equipo de guardia hoy.</p>';
    return '<div class="ic-team-board ic-team-board--filtered"><section class="ic-board-lane ic-board-lane--guardia" data-role="guardia"><h3 class="ic-board-lane__title">' + escHtml(teamLabel(roles.guardia)) + " \u2014 Guardia</h3>" + body + "</section></div>";
  }
  const lanes = [
    renderGuardiaLaneHtml(roles.guardia, patientsFor(roles.guardia), now),
    renderActivoLaneHtml(slots.activo[0], patientsFor(slots.activo[0]), now, 0),
    renderActivoLaneHtml(slots.activo[1], patientsFor(slots.activo[1]), now, 1)
  ];
  if (!hidePostguardia) {
    lanes.push(renderPostguardiaLaneHtml(roles.postguardia, patientsFor(roles.postguardia), now));
  }
  const otrosGroups = slots.overflow.map((team) => ({ label: teamLabel(team), patients: patientsFor(team) })).filter((g) => g.patients.length);
  const unassignedPatients = (patients || []).filter((p) => {
    const teamId = String(p?.censusTeamId || "");
    return !teamId || !knownTeamIds.has(teamId);
  });
  if (unassignedPatients.length) {
    otrosGroups.push({ label: "Sin equipo", patients: unassignedPatients });
  }
  if (otrosGroups.length) {
    lanes.push(renderOtrosLaneHtml(otrosGroups));
  }
  return '<div class="ic-team-board">' + lanes.join("") + "</div>";
}
function mountInterconsultaTeamBoard(container, patients, teams, opts = {}) {
  if (!container) return;
  const now = opts.now || /* @__PURE__ */ new Date();
  container.innerHTML = renderInterconsultaTeamBoardHtml(patients, teams, now, {
    filterGuardiaOnly: opts.filterGuardiaOnly,
    hidePostguardia: opts.hidePostguardia
  });
  wireTeamBoardDragAndDrop(container, opts);
}
function wireTeamBoardDragAndDrop(container, opts) {
  for (const card of container.querySelectorAll(".patient-card[data-patient-id]")) {
    card.draggable = true;
  }
  container.addEventListener("dragstart", (ev) => {
    const card = ev.target.closest && ev.target.closest(".patient-card[data-patient-id]");
    if (!card) return;
    ev.dataTransfer.effectAllowed = "move";
    ev.dataTransfer.setData("text/plain", card.getAttribute("data-patient-id") || "");
    card.classList.add("ic-board-card--dragging");
  });
  container.addEventListener("dragend", (ev) => {
    const card = ev.target.closest && ev.target.closest(".patient-card[data-patient-id]");
    if (card) card.classList.remove("ic-board-card--dragging");
  });
  container.addEventListener("dragover", (ev) => {
    const body = ev.target.closest && ev.target.closest(".ic-board-lane__body[data-drop-team-id]");
    if (!body) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
    body.classList.add("ic-board-lane__body--drop-over");
  });
  container.addEventListener("dragleave", (ev) => {
    const body = ev.target.closest && ev.target.closest(".ic-board-lane__body[data-drop-team-id]");
    if (body && !body.contains(ev.relatedTarget)) body.classList.remove("ic-board-lane__body--drop-over");
  });
  container.addEventListener("drop", async (ev) => {
    const body = ev.target.closest && ev.target.closest(".ic-board-lane__body[data-drop-team-id]");
    if (!body) return;
    ev.preventDefault();
    body.classList.remove("ic-board-lane__body--drop-over");
    const patientId = ev.dataTransfer.getData("text/plain");
    const teamId = body.getAttribute("data-drop-team-id") || "";
    if (!patientId || typeof opts.assignTeam !== "function") return;
    const result = await opts.assignTeam(patientId, teamId);
    if (typeof opts.onAssignTeam === "function") opts.onAssignTeam(result);
  });
}

// public/js/features/interconsulta-mode-chrome.mjs
var rt = {
  getActiveId() {
    return null;
  },
  renderPatientList() {
  },
  showToast() {
  }
};
function registerInterconsultaChromeRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt, ctx);
}
function isInterconsultaModeActive() {
  return !isModeSala(settingsRef()) && !isGuardiaMode();
}
var _guardiaOnlyFilter = false;
function isInterconsultaGuardiaOnlyFilterActive() {
  return _guardiaOnlyFilter;
}
function syncGuardiaOnlyFilterButton(container) {
  var btn = container && container.querySelector("[data-wb-ic-guardia-filter]");
  if (!btn) return;
  btn.setAttribute("aria-pressed", _guardiaOnlyFilter ? "true" : "false");
  btn.classList.toggle("wb-btn-toggle--on", _guardiaOnlyFilter);
}
var _hidePostguardia = false;
function isInterconsultaPostguardiaHidden() {
  return _hidePostguardia;
}
function syncPostguardiaFilterButton(container) {
  var btn = container && container.querySelector("[data-wb-ic-hide-postguardia]");
  if (!btn) return;
  btn.setAttribute("aria-pressed", _hidePostguardia ? "true" : "false");
  btn.classList.toggle("wb-btn-toggle--on", _hidePostguardia);
}
var _icView = "board";
var _wasInterconsultaActive = false;
var _icArchivedCollapsed = true;
function isIcPatientViewOpen() {
  return _icView === "patient";
}
function syncBackButtonVisibility(container) {
  var root = container || document.getElementById("interconsulta-mode-frame");
  var btn = root && root.querySelector("[data-wb-ic-back]");
  if (btn) btn.hidden = !isIcPatientViewOpen();
}
function buildInterconsultaBarHtml() {
  return '<div class="wb-ic-bar"><div class="wb-ic-bar-name"><button type="button" class="wb-btn wb-btn-secondary wb-ic-back-btn" data-wb-ic-back hidden title="Volver al tablero de equipos">\u2190 Tablero</button><span class="wb-mode-frame-name">Interconsulta</span></div><div class="wb-ic-bar-mid"></div><div class="wb-ic-bar-actions"><button type="button" class="wb-btn wb-btn-secondary wb-btn-toggle" data-wb-ic-guardia-filter aria-pressed="false" title="Mostrar solo Preop / Nuevas hoy del equipo de guardia">Solo guardia de hoy</button><button type="button" class="wb-btn wb-btn-secondary wb-btn-toggle" data-wb-ic-hide-postguardia aria-pressed="false" title="Oculta la calle de post-guardia del tablero (no cambia los datos)">Ocultar post-guardia</button><details class="wb-menu" data-wb-ic-menu><summary class="wb-btn wb-btn-secondary" aria-haspopup="menu" title="M\xE1s acciones">\u22EF</summary><div class="wb-menu-panel" role="menu"><button type="button" class="wb-menu-item" role="menuitem" data-wb-ic-generar-nota>' + escHtml("Generar nota (.docx)") + '</button></div></details><button type="button" class="wb-btn wb-btn-secondary wb-btn-shortcut" data-wb-shortcut>\u2318/</button><button type="button" class="wb-btn wb-btn-primary" data-wb-ic-primary>Actualizar pacientes</button></div></div>';
}
function mountInterconsultaBar(container, opts) {
  if (!container) return void 0;
  container.innerHTML = buildInterconsultaBarHtml();
  var o = opts || {};
  var guardiaFilterBtn = container.querySelector("[data-wb-ic-guardia-filter]");
  if (guardiaFilterBtn) {
    syncGuardiaOnlyFilterButton(container);
    guardiaFilterBtn.addEventListener("click", function() {
      _guardiaOnlyFilter = !_guardiaOnlyFilter;
      syncGuardiaOnlyFilterButton(container);
      renderInterconsultaBoardView();
    });
  }
  var hidePostguardiaBtn = container.querySelector("[data-wb-ic-hide-postguardia]");
  if (hidePostguardiaBtn) {
    syncPostguardiaFilterButton(container);
    hidePostguardiaBtn.addEventListener("click", function() {
      _hidePostguardia = !_hidePostguardia;
      syncPostguardiaFilterButton(container);
      renderInterconsultaBoardView();
    });
  }
  var backBtn = container.querySelector("[data-wb-ic-back]");
  if (backBtn) {
    syncBackButtonVisibility(container);
    backBtn.addEventListener("click", function() {
      if (typeof o.onBack === "function") o.onBack();
      showInterconsultaBoardView();
    });
  }
  var menu = container.querySelector("[data-wb-ic-menu]");
  var generarBtn = container.querySelector("[data-wb-ic-generar-nota]");
  if (generarBtn) {
    generarBtn.addEventListener("click", function() {
      if (menu) menu.open = false;
      if (typeof o.onGenerarNota === "function") o.onGenerarNota();
    });
  }
  if (menu) {
    document.addEventListener("click", function(ev) {
      if (menu.open && !menu.contains(ev.target)) menu.open = false;
    });
  }
  var shortcutBtn = container.querySelector("[data-wb-shortcut]");
  if (shortcutBtn && typeof o.onShortcut === "function") {
    shortcutBtn.addEventListener("click", o.onShortcut);
  }
  var primaryBtn = container.querySelector("[data-wb-ic-primary]");
  if (primaryBtn && typeof o.onPrimary === "function") {
    primaryBtn.addEventListener("click", o.onPrimary);
  }
  return container;
}
function activeInterconsultaPatient() {
  var id = rt.getActiveId();
  if (!id) return null;
  return getPatients().find(function(p) {
    return String(p.id) === String(id);
  }) || null;
}
function interconsultaAssignableTeams() {
  if (isInterconsultaDemoActive()) {
    return (clinicalSessionContext.teams || []).filter((t) => isInterconsultaDemoTeamId(t && t.team_id));
  }
  return assignableTeamsForUser(clinicalSessionContext.user).filter(
    (t) => normalizeServiceKey(t && t.service).includes("interconsult")
  );
}
function consultBandTeamCtx(patient) {
  return {
    teams: interconsultaAssignableTeams(),
    currentTeamId: activePatientTeamId(patient.id),
    groupBySala: shouldGroupAssignableTeamsBySala(clinicalSessionContext.user)
  };
}
function consultBandHost() {
  return document.querySelector("#patient-dashboard-mount .idrow .id-name-row");
}
function removeConsultBandRow() {
  var row = document.querySelector(".ic-consult-band");
  if (row) row.remove();
}
function renderConsultBandForActivePatient() {
  var host = consultBandHost();
  var patient = activeInterconsultaPatient();
  if (!host || !patient) {
    removeConsultBandRow();
    return;
  }
  var html = renderConsultBandHtml(getConsultInfo(patient), consultBandTeamCtx(patient));
  var existing = host.querySelector(".ic-consult-band");
  if (existing) {
    existing.outerHTML = html;
  } else {
    host.insertAdjacentHTML("beforeend", html);
  }
  ensureConsultBandDelegation(host.querySelector(".ic-consult-band"));
}
function removeBackToBoardRow() {
  var row = document.querySelector("[data-ic-back-to-board]");
  if (row) row.remove();
}
function renderBackToBoardButton() {
  var dash = document.querySelector("#patient-dashboard-mount .dash");
  var patient = activeInterconsultaPatient();
  if (!dash || !patient) {
    removeBackToBoardRow();
    return;
  }
  if (dash.querySelector("[data-ic-back-to-board]")) return;
  dash.insertAdjacentHTML(
    "afterbegin",
    '<button type="button" class="wb-btn wb-btn-secondary wb-ic-back-btn" data-ic-back-to-board title="Volver al tablero de equipos">\u2190 Tablero</button>'
  );
  dash.querySelector("[data-ic-back-to-board]").addEventListener("click", function() {
    showInterconsultaBoardView();
  });
}
function handleConsultBandChange(ev) {
  if (ev.target.hasAttribute && ev.target.hasAttribute("data-consult-team-select")) {
    handleConsultTeamChange(ev);
    return;
  }
  var field = ev.target.getAttribute && ev.target.getAttribute("data-consult-field");
  if (!field) return;
  var patient = activeInterconsultaPatient();
  if (!patient) return;
  var patch = {};
  patch[field] = ev.target.value;
  setConsultInfo(patient, patch);
  patient.lanUpdatedAt = (/* @__PURE__ */ new Date()).toISOString();
  persistClinicalState();
  scheduleCloudSyncPush();
  if (field === "followUpStatus") renderConsultBandForActivePatient();
}
function assignDemoPatientTeamLocally(patient, teamId) {
  var scope = clinicalSessionContext.scopeContext;
  var now = scope && scope.now || (/* @__PURE__ */ new Date()).toISOString();
  recordInterconsultaDemoPatientAssignment(patient.id, teamId, now);
}
function assignInterconsultaPatientTeam(patient, teamId) {
  if (patient.isDemo) {
    assignDemoPatientTeamLocally(patient, teamId);
    return Promise.resolve({ ok: true });
  }
  return assignPatientToTeamClinical(patient.id, teamId);
}
function handleConsultTeamChange(ev) {
  var patient = activeInterconsultaPatient();
  if (!patient) return;
  var teamId = String(ev.target.value || "");
  assignInterconsultaPatientTeam(patient, teamId).then(function(res) {
    if (res && res.ok) {
      renderConsultBandForActivePatient();
      renderInterconsultaBoardView();
      if (typeof rt.showToast === "function") rt.showToast("Equipo actualizado", "success");
    } else if (typeof rt.showToast === "function") {
      rt.showToast("No se pudo cambiar el equipo", "error");
    }
  });
}
function assignInterconsultaTeamViaBoardDrop(patientId, teamId) {
  var patient = getPatients().find(function(p) {
    return p && String(p.id) === String(patientId);
  });
  if (!patient) return Promise.resolve({ ok: false });
  return assignInterconsultaPatientTeam(patient, teamId).then(function(res) {
    if (res && res.ok) {
      if (typeof rt.showToast === "function") rt.showToast("Equipo actualizado", "success");
    } else if (typeof rt.showToast === "function") {
      rt.showToast("No se pudo cambiar el equipo", "error");
    }
    return res;
  });
}
function handleConsultBandClick(ev) {
  var trigger = ev.target.closest && ev.target.closest("[data-ic-req-trigger]");
  if (!trigger) return;
  var patient = activeInterconsultaPatient();
  if (!patient) return;
  openServicePickerModal({
    current: getConsultInfo(patient).requestingService,
    trigger,
    onSelect: function(name) {
      setConsultInfo(patient, { requestingService: name });
      patient.servicio = name;
      patient.lanUpdatedAt = (/* @__PURE__ */ new Date()).toISOString();
      persistClinicalState();
      scheduleCloudSyncPush();
      renderConsultBandForActivePatient();
      if (typeof rt.renderPatientList === "function") rt.renderPatientList();
    }
  });
}
function ensureConsultBandDelegation(bandMount) {
  if (bandMount.dataset.icBandWired) return;
  bandMount.dataset.icBandWired = "1";
  bandMount.addEventListener("change", handleConsultBandChange);
  bandMount.addEventListener("click", handleConsultBandClick);
}
function refreshPatients() {
  if (typeof rt.renderPatientList === "function") rt.renderPatientList();
  renderInterconsultaBoardView();
  if (typeof rt.showToast === "function") rt.showToast("Pacientes actualizados", "success");
}
function icArchivedToggleHtml(collapsed, count) {
  return '<button type="button" class="patient-list-section-toggle" data-ic-archived-toggle aria-expanded="' + (!collapsed ? "true" : "false") + '">Archivados <span>(' + count + ")</span> <span>" + (collapsed ? "\u25B6" : "\u25BC") + "</span></button>";
}
function renderIcArchivedSectionHtml(archivedPatients) {
  if (!archivedPatients.length) return "";
  var parts = [icArchivedToggleHtml(_icArchivedCollapsed, archivedPatients.length)];
  if (!_icArchivedCollapsed) {
    parts.push('<div class="patient-sort-zone" data-ic-archived-zone>');
    parts.push(archivedPatients.map(renderPatientCardHtml).join(""));
    parts.push("</div>");
  }
  return parts.join("");
}
function icBoardMount() {
  return document.getElementById("ic-board-mount");
}
function selectPatientFromIcBoardEvent(ev) {
  var pid = patientCardIdFromEvent(ev);
  if (!pid) return;
  patientsBridge.selectPatient(pid);
  showInterconsultaPatientView();
}
function ensureIcBoardClickDelegation(mount) {
  if (!mount || mount.dataset.icBoardWired) return;
  mount.dataset.icBoardWired = "1";
  mount.addEventListener("click", function(ev) {
    if (ev.target.closest("[data-ic-archived-toggle]")) {
      _icArchivedCollapsed = !_icArchivedCollapsed;
      renderInterconsultaBoardView();
      return;
    }
    selectPatientFromIcBoardEvent(ev);
  });
  mount.addEventListener("pointerup", function(ev) {
    if (!shouldHandleTouchPointerUp(ev)) return;
    selectPatientFromIcBoardEvent(ev);
  });
}
function renderInterconsultaBoardView() {
  var mount = icBoardMount();
  if (!mount || !isInterconsultaModeActive()) return;
  ensureIcBoardClickDelegation(mount);
  ensureInterconsultaDemoInScope();
  var ctx = getClinicalScopeContextForEvaluate() || {};
  var teams = ctx.teams || [];
  var assignments = ctx.assignments || [];
  var now = ctx.now || (/* @__PURE__ */ new Date()).toISOString();
  var demoOnly = isInterconsultaDemoActive();
  if (demoOnly) teams = teams.filter((t) => isInterconsultaDemoTeamId(t && t.team_id));
  var visible = demoOnly ? getPatients().filter((p) => !!p.isDemo) : patientsVisibleInSidebar();
  var archived = visible.filter(function(p) {
    return !!p.archived || p.interconsult_status === "Resolved";
  });
  var active = visible.filter(function(p) {
    return !p.archived && p.interconsult_status !== "Resolved";
  }).map(function(p) {
    return Object.assign({}, p, {
      censusTeamId: resolvePatientCensusTeamId(p, teams, assignments, now)
    });
  });
  mount.innerHTML = '<div class="ic-board-header"><button type="button" class="wb-btn wb-btn-secondary" data-ic-board-add>+ Agregar</button><button type="button" class="wb-btn wb-btn-primary" data-ic-board-refresh>Actualizar pacientes</button></div><div id="ic-team-board-mount"></div><div id="ic-archived-mount"></div>';
  mount.querySelector("[data-ic-board-refresh]").addEventListener("click", refreshPatients);
  mount.querySelector("[data-ic-board-add]").addEventListener("click", openAddModal);
  mountInterconsultaTeamBoard(mount.querySelector("#ic-team-board-mount"), active, teams, {
    now,
    filterGuardiaOnly: isInterconsultaGuardiaOnlyFilterActive(),
    hidePostguardia: isInterconsultaPostguardiaHidden(),
    assignTeam: assignInterconsultaTeamViaBoardDrop,
    onAssignTeam: function() {
      renderInterconsultaBoardView();
    }
  });
  mount.querySelector("#ic-archived-mount").innerHTML = renderIcArchivedSectionHtml(archived);
}
function forceHideResumenPanels() {
  var emptyState = document.getElementById("empty-state");
  var patientView = document.getElementById("patient-view");
  if (emptyState) emptyState.style.display = "none";
  if (patientView) patientView.style.display = "none";
}
function syncIcViewVisibility() {
  var boardMount = icBoardMount();
  var onBoard = _icView === "board";
  if (boardMount) boardMount.hidden = !onBoard;
  if (onBoard) forceHideResumenPanels();
  document.documentElement.classList.toggle(
    "ic-board-view-open",
    onBoard && isInterconsultaModeActive()
  );
  var barMount = document.getElementById("interconsulta-mode-frame");
  syncBackButtonVisibility(barMount);
  if (!onBoard && isInterconsultaModeActive()) {
    renderConsultBandForActivePatient();
    renderBackToBoardButton();
  } else {
    removeConsultBandRow();
    removeBackToBoardRow();
  }
}
function showInterconsultaBoardView() {
  _icView = "board";
  renderInterconsultaBoardView();
  syncIcViewVisibility();
}
function showInterconsultaPatientView() {
  _icView = "patient";
  syncIcViewVisibility();
}
var _icEscHandlerWired = false;
function ensureIcEscHandler() {
  if (_icEscHandlerWired) return;
  _icEscHandlerWired = true;
  document.addEventListener("keydown", function(ev) {
    if (ev.key !== "Escape") return;
    if (!isInterconsultaModeActive() || !isIcPatientViewOpen()) return;
    showInterconsultaBoardView();
  });
}
function syncInterconsultaModeChrome() {
  var barMount = document.getElementById("interconsulta-mode-frame");
  var boardMount = icBoardMount();
  var active = isInterconsultaModeActive();
  if (barMount) barMount.hidden = true;
  document.documentElement.classList.toggle("ic-board-mode", active);
  if (!active) {
    document.documentElement.classList.remove("ic-board-view-open");
    if (boardMount) boardMount.hidden = true;
    removeConsultBandRow();
    removeBackToBoardRow();
    if (_wasInterconsultaActive) {
      var emptyState = document.getElementById("empty-state");
      var patientView = document.getElementById("patient-view");
      var hasActivePatient = rt.getActiveId() != null;
      if (emptyState) emptyState.style.display = hasActivePatient ? "none" : "flex";
      if (patientView) patientView.style.display = hasActivePatient ? "flex" : "none";
    }
    _wasInterconsultaActive = false;
    return;
  }
  if (barMount && !barMount.dataset.wbIcMounted) {
    mountInterconsultaBar(barMount, {
      onPrimary: refreshPatients,
      onGenerarNota: function() {
        if (typeof window !== "undefined" && typeof window.generateWord === "function") {
          window.generateWord();
        }
      }
    });
    barMount.dataset.wbIcMounted = "1";
  }
  ensureIcEscHandler();
  if (!_wasInterconsultaActive) {
    _wasInterconsultaActive = true;
    _icView = "board";
  }
  renderInterconsultaBoardView();
  syncIcViewVisibility();
}

// public/js/features/interconsulta-demo-toggle.mjs
function ensureScopeContext() {
  if (!clinicalSessionContext.scopeContext || typeof clinicalSessionContext.scopeContext !== "object") {
    clinicalSessionContext.scopeContext = { teams: clinicalSessionContext.teams.slice(), assignments: [] };
  }
  if (!Array.isArray(clinicalSessionContext.scopeContext.teams)) clinicalSessionContext.scopeContext.teams = [];
  if (!Array.isArray(clinicalSessionContext.scopeContext.assignments)) clinicalSessionContext.scopeContext.assignments = [];
  return clinicalSessionContext.scopeContext;
}
var demoTeamsSeeded = null;
var demoAssignmentsSeeded = null;
function seedInterconsultaDemoOnMainApp(now) {
  const nowDate = now instanceof Date ? now : /* @__PURE__ */ new Date();
  const teams = buildInterconsultaDemoTeams();
  const roles = getInterconsultaTeamRoles(teams, nowDate.toISOString());
  const demoPatients = buildInterconsultaDemoPatients(roles, nowDate);
  const assignments = buildInterconsultaDemoAssignments(demoPatients, nowDate);
  demoTeamsSeeded = teams;
  demoAssignmentsSeeded = assignments;
  setPatients(getPatients().concat(demoPatients));
  setInterconsultaDemoActive(true);
  ensureInterconsultaDemoInScope();
  setPersistPatientsResolver(function() {
    return [];
  });
  return demoPatients.length;
}
function recordInterconsultaDemoPatientAssignment(patientId, teamId, nowIso) {
  if (!demoAssignmentsSeeded) return;
  demoAssignmentsSeeded = demoAssignmentsSeeded.filter((a) => String(a.patient_id) !== String(patientId));
  if (teamId) {
    demoAssignmentsSeeded = demoAssignmentsSeeded.concat([
      { patient_id: patientId, team_id: teamId, effective_at: nowIso, created_at: nowIso }
    ]);
  }
  ensureInterconsultaDemoInScope();
}
function ensureInterconsultaDemoInScope() {
  if (!isInterconsultaDemoActive() || !demoTeamsSeeded) return;
  const scope = ensureScopeContext();
  if (!scope.teams.some((t) => isInterconsultaDemoTeamId(t && t.team_id))) {
    scope.teams = scope.teams.concat(demoTeamsSeeded);
  }
  if (!clinicalSessionContext.teams.some((t) => isInterconsultaDemoTeamId(t && t.team_id))) {
    clinicalSessionContext.teams = clinicalSessionContext.teams.concat(demoTeamsSeeded);
  }
  const demoPatientIds = new Set(demoAssignmentsSeeded.map((a) => a.patient_id));
  scope.assignments = scope.assignments.filter((a) => !demoPatientIds.has(a && a.patient_id)).concat(demoAssignmentsSeeded);
}
function clearInterconsultaDemoFromMainApp() {
  setPatients(getPatients().filter((p) => !p.isDemo));
  clinicalSessionContext.teams = clinicalSessionContext.teams.filter((t) => !isInterconsultaDemoTeamId(t?.team_id));
  const scope = clinicalSessionContext.scopeContext;
  if (scope && typeof scope === "object") {
    if (Array.isArray(scope.teams)) scope.teams = scope.teams.filter((t) => !isInterconsultaDemoTeamId(t?.team_id));
    if (Array.isArray(scope.assignments))
      scope.assignments = scope.assignments.filter((a) => !isInterconsultaDemoTeamId(a?.team_id));
  }
  setPersistPatientsResolver(null);
  setInterconsultaDemoActive(false);
  demoTeamsSeeded = null;
  demoAssignmentsSeeded = null;
}
function toggleInterconsultaDemo() {
  if (isInterconsultaDemoActive()) {
    clearInterconsultaDemoFromMainApp();
    showToast("Demo de interconsultas: fuera del tablero", "info");
  } else {
    const count = seedInterconsultaDemoOnMainApp(/* @__PURE__ */ new Date());
    showToast("Demo de interconsultas: " + count + " pacientes en el tablero", "info");
  }
  persistClinicalState();
  renderInterconsultaBoardView();
}
function isInterconsultaDemoShortcut(e) {
  if (!e || !e.altKey || !e.shiftKey) return false;
  if (!(e.metaKey || e.ctrlKey)) return false;
  if (e.code === "KeyI") return true;
  return String(e.key || "").toLowerCase() === "i";
}
function initInterconsultaDemoShortcut() {
  if (initInterconsultaDemoShortcut._bound) return;
  initInterconsultaDemoShortcut._bound = true;
  if (typeof window !== "undefined") window.toggleInterconsultaDemo = toggleInterconsultaDemo;
  document.addEventListener(
    "keydown",
    function(e) {
      if (!isInterconsultaDemoShortcut(e)) return;
      const tag = e.target && e.target.tagName ? String(e.target.tagName).toUpperCase() : "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.target && e.target.isContentEditable) return;
      e.preventDefault();
      e.stopPropagation();
      toggleInterconsultaDemo();
    },
    true
  );
}
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initInterconsultaDemoShortcut);
  } else {
    initInterconsultaDemoShortcut();
  }
}

export {
  isInterconsultaDemoActive,
  seedInterconsultaDemoOnMainApp,
  recordInterconsultaDemoPatientAssignment,
  ensureInterconsultaDemoInScope,
  clearInterconsultaDemoFromMainApp,
  toggleInterconsultaDemo,
  isInterconsultaDemoShortcut,
  initInterconsultaDemoShortcut,
  registerInterconsultaChromeRuntime,
  isInterconsultaModeActive,
  isInterconsultaGuardiaOnlyFilterActive,
  isInterconsultaPostguardiaHidden,
  buildInterconsultaBarHtml,
  mountInterconsultaBar,
  renderConsultBandForActivePatient,
  renderInterconsultaBoardView,
  showInterconsultaBoardView,
  showInterconsultaPatientView,
  syncInterconsultaModeChrome
};
//# sourceMappingURL=/js/chunks/chunk-EQRCHEJB.js.map
