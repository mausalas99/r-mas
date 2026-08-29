import {
  activePatientTeamId,
  assignPatientToTeamClinical,
  fetchClinicalScopeContextFromDb,
  joinedTeamIdsForUser,
  toast
} from "/mobile/js/chunks/chunk-6P7TSNN6.js";
import "/mobile/js/chunks/chunk-JNMJGW22.js";
import "/mobile/js/chunks/chunk-WEWTMUQK.js";
import "/mobile/js/chunks/chunk-PJD3LECG.js";
import "/mobile/js/chunks/chunk-LN2N4VIO.js";
import "/mobile/js/chunks/chunk-2GD37PRJ.js";
import "/mobile/js/chunks/chunk-5CRK7XGO.js";
import "/mobile/js/chunks/chunk-4EH4XZVS.js";
import "/mobile/js/chunks/chunk-7TIZPCQQ.js";
import "/mobile/js/chunks/chunk-PLO52CII.js";
import "/mobile/js/chunks/chunk-WEOKZTSW.js";
import "/mobile/js/chunks/chunk-7XJNQXQX.js";
import "/mobile/js/chunks/chunk-US2NRS5S.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-VAFCBXBV.js";
import "/mobile/js/chunks/chunk-P2TSIQM4.js";
import "/mobile/js/chunks/chunk-QLSLJE42.js";
import "/mobile/js/chunks/chunk-EASTAY6S.js";
import "/mobile/js/chunks/chunk-B7NNRK4H.js";
import "/mobile/js/chunks/chunk-ZDAIWZ25.js";
import "/mobile/js/chunks/chunk-7TJEM4JY.js";
import {
  getPatients
} from "/mobile/js/chunks/chunk-MLLRKYO6.js";
import "/mobile/js/chunks/chunk-2SJQGKPU.js";
import "/mobile/js/chunks/chunk-EZ7GA6IL.js";
import "/mobile/js/chunks/chunk-FLCMQPNP.js";
import "/mobile/js/chunks/chunk-K4PQIQOH.js";
import "/mobile/js/chunks/chunk-BTIFFDH4.js";
import "/mobile/js/chunks/chunk-ZSD6QMCL.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import {
  escapeAttr,
  escapeHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-WAILSXBQ.js";
import "/mobile/js/chunks/chunk-G6B5EEF6.js";
import "/mobile/js/chunks/chunk-IVEQE6G4.js";
import "/mobile/js/chunks/chunk-UDWVBKE4.js";
import "/mobile/js/chunks/chunk-X2R3ZGWP.js";
import "/mobile/js/chunks/chunk-Y2YRXJMM.js";
import "/mobile/js/chunks/chunk-K5SBVD6P.js";
import "/mobile/js/chunks/chunk-FSGBGJHB.js";
import "/mobile/js/chunks/chunk-XV2TMACY.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-A7GKLJFV.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-FLGCYVFI.js";

// public/js/features/clinical-teams/teams-roster-bring-patients.mjs
function listBringableLocalPatients(teamId, localPatients = getPatients()) {
  const tid = String(teamId || "").trim();
  if (!tid) return [];
  const user = clinicalSessionContext.user;
  const myJoinedIds = joinedTeamIdsForUser(clinicalSessionContext.teams || [], user);
  myJoinedIds.add(tid);
  const rows = Array.isArray(localPatients) ? localPatients : [];
  return rows.filter((p) => {
    const pid = String(p?.id || "").trim();
    if (!pid) return false;
    const current = activePatientTeamId(pid);
    if (!current) return true;
    if (current === tid) return false;
    if (myJoinedIds.has(current)) return false;
    return true;
  });
}
async function assignBringablePatientsToTeam(patientIds, teamId, deps = {}) {
  const tid = String(teamId || "").trim();
  const assign = typeof deps.assign === "function" ? deps.assign : assignPatientToTeamClinical;
  let claimed = 0;
  const errors = [];
  if (!tid) return { claimed: 0, errors: ["Sin equipo"] };
  for (const rawId of patientIds || []) {
    const pid = String(rawId || "").trim();
    if (!pid) continue;
    try {
      const res = await assign(pid, tid);
      if (res && res.ok === false) errors.push(pid);
      else if (res === false) errors.push(pid);
      else claimed += 1;
    } catch (err) {
      errors.push(pid + ": " + (err?.message || "error"));
    }
  }
  return { claimed, errors };
}

// public/js/features/clinical-teams/teams-roster-inherit-patients.mjs
function inheritTeamCatalog() {
  return [
    ...clinicalSessionContext.teams || [],
    ...clinicalSessionContext.scopeContext?.teams || [],
    ...clinicalSessionContext.scopeContext?.teams_archived || []
  ];
}
function resolveInheritSourceTeamMeta(teamId, catalog = inheritTeamCatalog()) {
  const tid = String(teamId || "").trim();
  if (!tid) {
    return { teamId: "", name: "Sin equipo", sala: "", cycle: "", archived: false };
  }
  const team = (catalog || []).find((t) => String(t?.team_id || "") === tid);
  if (!team) {
    return {
      teamId: tid,
      name: `Equipo anterior (${tid.slice(0, 8)}\u2026)`,
      sala: "",
      cycle: "",
      archived: true
    };
  }
  return {
    teamId: tid,
    name: String(team.name || team.service || "Equipo").trim() || "Equipo",
    sala: String(team.sala || "").trim(),
    cycle: String(team.sub_area_fraction || "").trim().toUpperCase(),
    archived: !!team.archived_at
  };
}
function preferredPreviousTeamId(targetTeam, catalog = inheritTeamCatalog()) {
  const sala = String(targetTeam?.sala || "").trim();
  const cycle = String(targetTeam?.sub_area_fraction || "").trim().toUpperCase();
  const selfId = String(targetTeam?.team_id || "").trim();
  if (!sala || !cycle) return "";
  const archived = (catalog || []).filter(
    (t) => t && t.archived_at && String(t.team_id || "") !== selfId && String(t.sala || "").trim() === sala && String(t.sub_area_fraction || "").trim().toUpperCase() === cycle
  );
  if (!archived.length) return "";
  archived.sort(
    (a, b) => String(b.archived_at || b.updated_at || "").localeCompare(String(a.archived_at || a.updated_at || ""))
  );
  return String(archived[0].team_id || "");
}
function groupBringablePatientsForInherit(targetTeamId, targetTeam, localPatients) {
  const tid = String(targetTeamId || "").trim();
  const list = listBringableLocalPatients(tid, localPatients);
  const catalog = inheritTeamCatalog();
  const preferredId = preferredPreviousTeamId(
    targetTeam || (catalog || []).find((t) => String(t?.team_id) === tid) || {},
    catalog
  );
  const groups = /* @__PURE__ */ new Map();
  for (const p of list) {
    const sourceId = activePatientTeamId(String(p.id)) || "";
    const meta = resolveInheritSourceTeamMeta(sourceId, catalog);
    const key = sourceId || "__none__";
    if (!groups.has(key)) {
      const preferred = !!(preferredId && sourceId === preferredId);
      const label = sourceId ? meta.archived ? `${meta.name} (mes anterior)` : meta.name : "Sin equipo asignado";
      groups.set(key, {
        sourceTeamId: sourceId,
        sourceLabel: label,
        preferred,
        patients: []
      });
    }
    groups.get(key).patients.push(p);
  }
  const rows = [...groups.values()];
  rows.sort((a, b) => {
    if (a.preferred !== b.preferred) return a.preferred ? -1 : 1;
    if (!!a.sourceTeamId !== !!b.sourceTeamId) return a.sourceTeamId ? -1 : 1;
    return a.sourceLabel.localeCompare(b.sourceLabel, "es");
  });
  return { groups: rows, preferredSourceTeamId: preferredId, total: list.length };
}
function patientCountBySource(grouped) {
  const countBySource = /* @__PURE__ */ new Map();
  for (const g of grouped?.groups || []) {
    countBySource.set(String(g.sourceTeamId || ""), (g.patients || []).length);
  }
  return countBySource;
}
function buildInheritSourceOption(id, meta, preferredId, patientCount, archived) {
  return {
    teamId: id,
    name: meta.name,
    sala: meta.sala,
    cycle: meta.cycle,
    preferred: id === preferredId,
    patientCount,
    archived
  };
}
function archivedTeamMatchesSala(team, sala, selfId) {
  const id = String(team.team_id || "").trim();
  if (!id || id === selfId) return false;
  const teamSala = String(team.sala || "").trim();
  if (sala && teamSala && teamSala !== sala) return false;
  return true;
}
function addArchivedInheritSourceOptions(options, catalog, sala, selfId, preferredId, countBySource) {
  for (const t of catalog || []) {
    if (!t?.archived_at) continue;
    if (!archivedTeamMatchesSala(t, sala, selfId)) continue;
    const id = String(t.team_id || "").trim();
    const meta = resolveInheritSourceTeamMeta(id, catalog);
    options.set(
      id,
      buildInheritSourceOption(id, meta, preferredId, countBySource.get(id) || 0, true)
    );
  }
}
function addGroupedInheritSourceOptions(options, grouped, catalog, preferredId) {
  for (const g of grouped?.groups || []) {
    const id = String(g.sourceTeamId || "").trim();
    if (!id || options.has(id)) continue;
    const meta = resolveInheritSourceTeamMeta(id, catalog);
    options.set(
      id,
      buildInheritSourceOption(id, meta, preferredId, (g.patients || []).length, !!meta.archived)
    );
  }
}
function sortInheritSourceOptions(rows) {
  rows.sort((a, b) => {
    if (a.preferred !== b.preferred) return a.preferred ? -1 : 1;
    if ((b.patientCount || 0) !== (a.patientCount || 0)) {
      return (b.patientCount || 0) - (a.patientCount || 0);
    }
    return a.name.localeCompare(b.name, "es");
  });
}
function listInheritSourceOptions(targetTeam, grouped, catalog = inheritTeamCatalog()) {
  const sala = String(targetTeam?.sala || "").trim();
  const selfId = String(targetTeam?.team_id || "").trim();
  const preferredId = String(grouped?.preferredSourceTeamId || "").trim();
  const countBySource = patientCountBySource(grouped);
  const options = /* @__PURE__ */ new Map();
  addArchivedInheritSourceOptions(options, catalog, sala, selfId, preferredId, countBySource);
  addGroupedInheritSourceOptions(options, grouped, catalog, preferredId);
  const rows = [...options.values()];
  sortInheritSourceOptions(rows);
  return {
    sources: rows,
    unassignedCount: countBySource.get("") || 0,
    preferredSourceTeamId: preferredId
  };
}
function patientsForInheritSource(grouped, sourceTeamId, opts = {}) {
  const groups = Array.isArray(grouped?.groups) ? grouped.groups : [];
  const key = String(sourceTeamId || "");
  if (key === "__all__") {
    return groups.flatMap((g) => g.patients || []);
  }
  const primary = groups.find((g) => String(g.sourceTeamId || "") === key);
  const list = [...primary?.patients || []];
  if (opts.includeUnassigned && key) {
    const none = groups.find((g) => !g.sourceTeamId);
    for (const p of none?.patients || []) list.push(p);
  }
  return list;
}

// public/js/features/clinical-teams/teams-roster-inherit-patients-modal.mjs
var wired = false;
function backdropEl() {
  return document.getElementById("inherit-patients-backdrop");
}
function sessionState() {
  const bd = backdropEl();
  return bd?._rpcInheritState || null;
}
function setSessionState(next) {
  const bd = backdropEl();
  if (bd) bd._rpcInheritState = next;
}
function buildInheritStepDotsHtml(step) {
  const labels = ["Destino", "Origen", "Pacientes", "Confirmar"];
  return '<ol class="inherit-steps" aria-label="Pasos de herencia">' + labels.map((label, i) => {
    const cls = i === step ? "inherit-step inherit-step--current" : i < step ? "inherit-step inherit-step--done" : "inherit-step";
    return `<li class="${cls}"><span class="inherit-step-num">${i + 1}</span><span class="inherit-step-label">${escapeHtml(label)}</span></li>`;
  }).join("") + "</ol>";
}
function buildInheritStepDestinoHtml(model) {
  const name = String(model.targetName || "tu equipo").trim();
  const meta = [model.sala, model.cycle ? `ciclo ${model.cycle}` : ""].filter(Boolean).join(" \xB7 ");
  return buildInheritStepDotsHtml(0) + `<p class="inherit-patients-lead">Paso 1 \u2014 Tu equipo <strong>nuevo</strong> (destino de los pacientes).</p><div class="inherit-dest-card"><p class="inherit-dest-eyebrow">Te uniste a</p><p class="inherit-dest-name">${escapeHtml(name)}</p>` + (meta ? `<p class="inherit-dest-meta">${escapeHtml(meta)}</p>` : "") + `</div>`;
}
function buildInheritStepOrigenHtml(model) {
  const sources = Array.isArray(model.sources) ? model.sources : [];
  const selected = String(model.selectedSourceId ?? "");
  const sourceRows = sources.map((s) => {
    const id = String(s.teamId || "");
    const checked = id === selected ? " checked" : "";
    const badge = s.preferred ? '<span class="inherit-patients-badge">Sugerido \xB7 misma sala y ciclo</span>' : "";
    const count = s.patientCount > 0 ? `${s.patientCount} en este Mac` : "sin expedientes locales a\xFAn";
    const meta = [s.sala, s.cycle ? `ciclo ${s.cycle}` : "", count].filter(Boolean).join(" \xB7 ");
    return `<li><label class="inherit-source-pick"><input type="radio" name="inherit-source" data-inherit-source="${escapeAttr(id)}"${checked} /><span><strong>${escapeHtml(s.name)}</strong>` + badge + `<span class="inherit-patients-reg">${escapeHtml(meta)}</span></span></label></li>`;
  }).join("");
  const noneRow = `<li><label class="inherit-source-pick"><input type="radio" name="inherit-source" data-inherit-source=""${selected === "" ? " checked" : ""} /><span><strong>Solo sin equipo / otros</strong><span class="inherit-patients-reg">${model.unassignedCount || 0} paciente(s) locales sin equipo activo</span></span></label></li>`;
  const emptyHint = sources.length === 0 ? `<p class="profile-hint">No hay equipos archivados en esta sala. Usa la opci\xF3n de abajo.</p>` : "";
  return buildInheritStepDotsHtml(1) + `<p class="inherit-patients-lead">Paso 2 \u2014 \xBFQu\xE9 equipo del mes anterior te <strong>hereda</strong> pacientes hacia <strong>${escapeHtml(model.targetName)}</strong>?</p>` + emptyHint + `<ul class="inherit-source-list">${sourceRows}${noneRow}</ul>`;
}
function buildInheritStepPacientesHtml(model) {
  const patients = Array.isArray(model.patients) ? model.patients : [];
  const rows = patients.length === 0 ? `<p class="inherit-patients-lead">No hay pacientes locales de ese origen en este Mac. Puedes continuar o elegir otro equipo.</p>` : `<ul class="inherit-patients-list">` + patients.map((p) => {
    const id = String(p.id || "");
    return `<li><label class="inherit-patients-check"><input type="checkbox" data-inherit-patient="${escapeAttr(id)}" checked /><span><strong>${escapeHtml(String(p.nombre || "Sin nombre"))}</strong><span class="inherit-patients-reg">${escapeHtml(String(p.registro || "s/reg"))}</span></span></label></li>`;
  }).join("") + `</ul>`;
  const unassignedToggle = model.unassignedCount > 0 && model.sourceName ? `<label class="inherit-patients-check inherit-unassigned-toggle"><input type="checkbox" data-inherit-include-unassigned${model.includeUnassigned ? " checked" : ""} /><span>Incluir tambi\xE9n ${model.unassignedCount} sin equipo asignado</span></label>` : "";
  return buildInheritStepDotsHtml(2) + `<p class="inherit-patients-lead">Paso 3 \u2014 Pacientes de <strong>${escapeHtml(model.sourceName || "sin equipo")}</strong> \u2192 <strong>${escapeHtml(model.targetName)}</strong>.</p><div class="inherit-patients-toolbar"><button type="button" class="btn-med-secondary" data-inherit-select="all">Seleccionar todos</button><button type="button" class="btn-med-secondary" data-inherit-select="none">Ninguno</button></div>` + unassignedToggle + rows + `<p class="inherit-patients-count" data-inherit-count aria-live="polite"></p>`;
}
function buildInheritStepConfirmHtml(model) {
  const n = Number(model.selectedCount || 0);
  return buildInheritStepDotsHtml(3) + `<p class="inherit-patients-lead">Paso 4 \u2014 Confirma el movimiento.</p><div class="inherit-confirm-card"><p><span class="inherit-confirm-label">Desde</span> <strong>${escapeHtml(model.sourceName || "Sin equipo")}</strong></p><p class="inherit-confirm-arrow" aria-hidden="true">\u2193</p><p><span class="inherit-confirm-label">Hacia</span> <strong>${escapeHtml(model.targetName)}</strong></p><p class="inherit-confirm-count">${n === 1 ? "1 paciente" : `${n} pacientes`}</p></div>`;
}
function buildInheritPatientsModalBodyHtml(model) {
  return buildInheritStepPacientesHtml({
    targetName: model.targetName,
    sourceName: model.groups?.[0]?.sourceLabel || "origen",
    patients: model.groups?.flatMap((g) => g.patients || []) || [],
    includeUnassigned: false,
    unassignedCount: 0
  });
}
function selectedPatientIds() {
  const bd = backdropEl();
  if (!bd) return [];
  return [...bd.querySelectorAll("input[data-inherit-patient]:checked")].map((el) => String(el.getAttribute("data-inherit-patient") || "")).filter(Boolean);
}
function selectedPatientCountLabel(n) {
  if (n === 0) return "Ning\xFAn paciente seleccionado.";
  if (n === 1) return "1 paciente listo para heredar.";
  return `${n} pacientes listos para heredar.`;
}
function inheritConfirmButtonLabel(n) {
  if (n === 1) return "Heredar 1 paciente";
  return `Heredar ${n} pacientes`;
}
function syncFooterStep0(next) {
  next.disabled = false;
  next.textContent = "Continuar \xB7 elegir origen";
}
function syncFooterStep1(next) {
  next.disabled = false;
  next.textContent = "Continuar \xB7 pacientes";
}
function syncFooterStep2(next) {
  const n = selectedPatientIds().length;
  const count = document.querySelector("[data-inherit-count]");
  if (count) count.textContent = selectedPatientCountLabel(n);
  next.disabled = n === 0;
  next.textContent = n === 0 ? "Elegir pacientes" : "Continuar \xB7 confirmar";
}
function syncFooterStep3(next, state) {
  const n = selectedPatientIds().length || state?.selectedIds?.length || 0;
  next.disabled = n === 0;
  next.textContent = inheritConfirmButtonLabel(n);
}
function syncFooterForStep() {
  const state = sessionState();
  const back = document.getElementById("inherit-patients-back");
  const cancel = document.getElementById("inherit-patients-cancel");
  const next = document.getElementById("inherit-patients-confirm");
  if (!(next instanceof HTMLButtonElement)) return;
  const step = state?.step ?? 0;
  if (back) back.hidden = step === 0;
  if (cancel) cancel.textContent = step === 0 ? "M\xE1s tarde" : "Cancelar";
  if (step === 0) return syncFooterStep0(next);
  if (step === 1) return syncFooterStep1(next);
  if (step === 2) return syncFooterStep2(next);
  syncFooterStep3(next, state);
}
function sourceNameForState(state) {
  if (!state) return "Sin equipo";
  if (!state.sourceTeamId) return "Sin equipo / otros";
  const opt = (state.sourceOptions || []).find((s) => s.teamId === state.sourceTeamId);
  return opt?.name || "Equipo anterior";
}
function renderCurrentStep() {
  const state = sessionState();
  const body = document.getElementById("inherit-patients-body");
  const title = document.getElementById("inherit-patients-title");
  if (!state || !body) return;
  if (title) {
    title.textContent = state.step === 0 ? "Heredar pacientes \xB7 destino" : state.step === 1 ? "Heredar pacientes \xB7 origen" : state.step === 2 ? "Heredar pacientes \xB7 lista" : "Heredar pacientes \xB7 confirmar";
  }
  if (state.step === 0) {
    body.innerHTML = buildInheritStepDestinoHtml({
      targetName: state.targetName,
      sala: state.targetSala,
      cycle: state.targetCycle
    });
  } else if (state.step === 1) {
    body.innerHTML = buildInheritStepOrigenHtml({
      targetName: state.targetName,
      sources: state.sourceOptions,
      unassignedCount: state.unassignedCount,
      selectedSourceId: state.sourceTeamId
    });
  } else if (state.step === 2) {
    const patients = patientsForInheritSource(state.grouped, state.sourceTeamId, {
      includeUnassigned: !!state.includeUnassigned
    });
    body.innerHTML = buildInheritStepPacientesHtml({
      targetName: state.targetName,
      sourceName: sourceNameForState(state),
      patients,
      includeUnassigned: !!state.includeUnassigned,
      unassignedCount: state.unassignedCount
    });
  } else {
    body.innerHTML = buildInheritStepConfirmHtml({
      targetName: state.targetName,
      sourceName: sourceNameForState(state),
      selectedCount: (state.selectedIds || []).length
    });
  }
  syncFooterForStep();
}
function closeInheritPatientsModal() {
  const bd = backdropEl();
  if (!bd) return;
  bd.classList.remove("open");
  bd.setAttribute("aria-hidden", "true");
  bd._rpcInheritTarget = null;
  bd._rpcInheritState = null;
}
function resolveInheritTargetTeam(tid, teamName) {
  return (clinicalSessionContext.teams || []).find((t) => String(t?.team_id) === tid) || {
    team_id: tid,
    name: teamName
  };
}
function buildInheritSessionState(tid, targetTeam, targetName, grouped, sourcePick) {
  const preferred = sourcePick.preferredSourceTeamId || sourcePick.sources[0]?.teamId || "";
  return {
    step: 0,
    targetTeamId: tid,
    targetName,
    targetSala: String(targetTeam.sala || "").trim(),
    targetCycle: String(targetTeam.sub_area_fraction || "").trim().toUpperCase(),
    grouped,
    sourceOptions: sourcePick.sources,
    unassignedCount: sourcePick.unassignedCount,
    sourceTeamId: preferred,
    includeUnassigned: false,
    selectedIds: []
  };
}
function showInheritPatientsModal(bd, state, tid, targetName) {
  setSessionState(state);
  bd._rpcInheritTarget = { teamId: tid, teamName: targetName };
  bd.classList.add("open");
  bd.setAttribute("aria-hidden", "false");
  renderCurrentStep();
}
async function openInheritPatientsModal(opts) {
  const tid = String(opts?.teamId || "").trim();
  if (!tid || typeof document === "undefined") return { offered: false };
  const bd = backdropEl();
  const body = document.getElementById("inherit-patients-body");
  if (!bd || !body) return { offered: false };
  try {
    await fetchClinicalScopeContextFromDb();
  } catch {
  }
  const targetTeam = resolveInheritTargetTeam(tid, opts.teamName);
  const targetName = String(opts.teamName || targetTeam.name || "tu equipo").trim();
  const grouped = groupBringablePatientsForInherit(tid, targetTeam);
  if (!grouped.total) return { offered: false };
  const sourcePick = listInheritSourceOptions(targetTeam, grouped);
  const state = buildInheritSessionState(tid, targetTeam, targetName, grouped, sourcePick);
  showInheritPatientsModal(bd, state, tid, targetName);
  return new Promise((resolve) => {
    bd._rpcInheritResolve = resolve;
  });
}
async function confirmInherit() {
  const bd = backdropEl();
  const state = sessionState();
  const resolve = bd?._rpcInheritResolve;
  if (!state?.targetTeamId) return;
  const ids = state.selectedIds?.length ? state.selectedIds : selectedPatientIds();
  if (!ids.length) return;
  const btn = document.getElementById("inherit-patients-confirm");
  if (btn instanceof HTMLButtonElement) {
    btn.disabled = true;
    btn.textContent = "Heredando\u2026";
  }
  const { claimed, errors } = await assignBringablePatientsToTeam(ids, state.targetTeamId);
  closeInheritPatientsModal();
  if (claimed > 0) {
    toast(
      claimed === 1 ? `1 paciente heredado a \xAB${state.targetName}\xBB.` : `${claimed} pacientes heredados a \xAB${state.targetName}\xBB.`,
      "success"
    );
  }
  if (errors?.length) {
    toast(`No se pudieron heredar ${errors.length} paciente(s).`, "warn");
  }
  if (typeof resolve === "function") resolve({ offered: true, claimed, errors });
  if (bd) bd._rpcInheritResolve = null;
}
function skipInherit() {
  const bd = backdropEl();
  const resolve = bd?._rpcInheritResolve;
  closeInheritPatientsModal();
  if (typeof resolve === "function") resolve({ offered: true, claimed: 0, skipped: true });
  if (bd) bd._rpcInheritResolve = null;
}
function goNext() {
  const state = sessionState();
  if (!state) return;
  if (state.step === 0) {
    state.step = 1;
    setSessionState(state);
    renderCurrentStep();
    return;
  }
  if (state.step === 1) {
    const picked = document.querySelector('input[name="inherit-source"]:checked');
    state.sourceTeamId = picked ? String(picked.getAttribute("data-inherit-source") || "") : "";
    state.step = 2;
    setSessionState(state);
    renderCurrentStep();
    return;
  }
  if (state.step === 2) {
    state.selectedIds = selectedPatientIds();
    if (!state.selectedIds.length) return;
    state.step = 3;
    setSessionState(state);
    renderCurrentStep();
    return;
  }
  void confirmInherit();
}
function goBack() {
  const state = sessionState();
  if (!state || state.step === 0) return;
  if (state.step === 2) state.selectedIds = selectedPatientIds();
  state.step -= 1;
  setSessionState(state);
  renderCurrentStep();
}
function wireInheritPatientsModal() {
  if (wired || typeof document === "undefined") return;
  wired = true;
  const bd = backdropEl();
  if (!bd) return;
  bd.addEventListener("click", (ev) => {
    if (ev.target === bd) skipInherit();
    const t = ev.target instanceof Element ? ev.target : null;
    if (!t) return;
    if (t.closest('[data-inherit-select="all"]')) {
      bd.querySelectorAll("input[data-inherit-patient]").forEach((el) => {
        if (el instanceof HTMLInputElement) el.checked = true;
      });
      syncFooterForStep();
    }
    if (t.closest('[data-inherit-select="none"]')) {
      bd.querySelectorAll("input[data-inherit-patient]").forEach((el) => {
        if (el instanceof HTMLInputElement) el.checked = false;
      });
      syncFooterForStep();
    }
  });
  bd.addEventListener("change", (ev) => {
    const el = ev.target;
    if (!(el instanceof HTMLInputElement)) return;
    const state = sessionState();
    if (!state) return;
    if (el.hasAttribute("data-inherit-patient")) {
      syncFooterForStep();
      return;
    }
    if (el.hasAttribute("data-inherit-include-unassigned")) {
      state.includeUnassigned = el.checked;
      setSessionState(state);
      renderCurrentStep();
      return;
    }
    if (el.name === "inherit-source") {
      state.sourceTeamId = String(el.getAttribute("data-inherit-source") || "");
      setSessionState(state);
    }
  });
  document.getElementById("inherit-patients-cancel")?.addEventListener("click", () => skipInherit());
  document.getElementById("inherit-patients-back")?.addEventListener("click", () => goBack());
  document.getElementById("inherit-patients-confirm")?.addEventListener("click", () => goNext());
}
export {
  buildInheritPatientsModalBodyHtml,
  buildInheritStepConfirmHtml,
  buildInheritStepDestinoHtml,
  buildInheritStepDotsHtml,
  buildInheritStepOrigenHtml,
  buildInheritStepPacientesHtml,
  closeInheritPatientsModal,
  openInheritPatientsModal,
  wireInheritPatientsModal
};
//# sourceMappingURL=/js/chunks/teams-roster-inherit-patients-modal-S4LEO44U.js.map
