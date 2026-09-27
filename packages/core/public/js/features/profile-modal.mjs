/**
 * Perfil — lives in Ajustes › Perfil (boards «Ajustes A» + «Mi perfil B»):
 * autosave, a live preview of how it prints, and Médico tratante picked
 * from the Nube team. «Mi perfil» entry points open Ajustes on this panel.
 */
import { isMobileWeb } from "../mobile-web.mjs";
import { loadSettings } from "./profile-load.mjs";
import { saveSettings } from "./profile-save.mjs";
import { clinicalSessionContext } from "../clinical-session-context.mjs";
import { filterJoinedTeams } from "./clinical-teams/shared.mjs";
import { readRpcSettings } from "../clinical-settings.mjs";

const PERFIL_PANEL = "settings-accordion-perfil";
const OTHER = "__otro__";
const RANK_ORDER = ["R4", "R3", "R2", "R1"];

export function openProfileModal() {
  if (isMobileWeb()) return;
  void import("./settings-help/settings-dropdown.mjs").then(function (m) {
    m.openSettingsPanel(PERFIL_PANEL);
  });
}

export function closeProfileModal() {
  void import("./settings-help/settings-dropdown.mjs").then(function (m) {
    var active = document.querySelector(".settings-panel.is-active");
    if (m.isSettingsDropdownOpen() && active && active.id === PERFIL_PANEL) m.closeSettingsDropdown();
  });
}

export function toggleProfileSection() {
  var active = document.querySelector(".settings-panel.is-active");
  var open = document.getElementById("settings-dropdown-backdrop")?.classList.contains("open");
  if (open && active && active.id === PERFIL_PANEL) closeProfileModal();
  else openProfileModal();
}

export function syncProfileSectionVisibility() {
  /* No-op desde 3.0 */
}

export function openProfileFromHeader(ev) {
  if (ev) ev.preventDefault();
  openProfileModal();
}

/** People on your Nube team(s), residents first by rank. @returns {Array<{ name: string, rank: string }>} */
export function perfilTeamPeople(teams, user) {
  var seen = new Set();
  var people = [];
  filterJoinedTeams(teams || [], user || {}).forEach(function (team) {
    (team.members || []).forEach(function (m) {
      var name = String(m.clinical_name || "").trim();
      if (!name || seen.has(name)) return;
      seen.add(name);
      people.push({ name: name, rank: String(m.rank || "").trim() });
    });
  });
  return people.sort(function (a, b) {
    var ra = RANK_ORDER.indexOf(a.rank);
    var rb = RANK_ORDER.indexOf(b.rank);
    return (ra < 0 ? 9 : ra) - (rb < 0 ? 9 : rb) || a.name.localeCompare(b.name, "es");
  });
}

/** <option>s for Médico tratante: the team, the saved name if it is not on it, and «Otro…». */
export function doctorOptionsHtml(people, current) {
  var esc = function (v) {
    return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  };
  var names = people.map(function (p) { return p.name; });
  var opts = people.map(function (p) {
    return '<option value="' + esc(p.name) + '">' + esc(p.name + (p.rank ? " · " + p.rank : "")) + "</option>";
  });
  if (current && names.indexOf(current) === -1) opts.unshift('<option value="' + esc(current) + '">' + esc(current) + "</option>");
  if (!opts.length) opts.push('<option value="">Sin equipo en Nube</option>');
  opts.push('<option value="' + OTHER + '">Otro…</option>');
  return opts.join("");
}

function syncDoctorPicker(root) {
  var pick = root.querySelector("[data-perfil-doctor-pick]");
  var input = document.getElementById("profile-doctor");
  if (!(pick instanceof HTMLSelectElement) || !(input instanceof HTMLInputElement)) return;
  var people = perfilTeamPeople(clinicalSessionContext.teams, clinicalSessionContext.user);
  pick.innerHTML = doctorOptionsHtml(people, input.value.trim());
  pick.value = input.value.trim() || (pick.options[0] ? pick.options[0].value : "");
  input.hidden = pick.value !== OTHER;
}

/** Fill empty R4 / R2 / R1 slots from the team (you can still type over them). */
function fillCensoTeamFromNube() {
  var people = perfilTeamPeople(clinicalSessionContext.teams, clinicalSessionContext.user);
  var byRank = function (r) { return people.filter(function (p) { return p.rank === r; }).map(function (p) { return p.name; }); };
  var r1 = byRank("R1");
  var picks = { r4: byRank("R4")[0], r2: byRank("R2")[0] || byRank("R3")[0], r1a: r1[0], r1b: r1[1] };
  var filled = 0;
  Object.keys(picks).forEach(function (k) {
    var el = document.getElementById("settings-medico-" + k);
    if (el && !el.value.trim() && picks[k]) {
      el.value = picks[k];
      filled += 1;
    }
  });
  return filled;
}

function initialsOf(name) {
  var words = String(name || "").replace(/^(dra?|dr)\.?\s+/i, "").split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return (words[0].charAt(0) + (words.length > 1 ? words[words.length - 1].charAt(0) : "")).toUpperCase();
}

function val(id) {
  var el = document.getElementById(id);
  return el ? String(el.value || "").trim() : "";
}

/** Identity card + «Así sale en tus documentos», from what the form holds right now. */
export function renderPerfilPreview(root) {
  var doctor = val("profile-doctor");
  var user = clinicalSessionContext.user || {};
  var st = readRpcSettings();
  var name = doctor || String(user.clinical_name || "").trim() || "Tu nombre";
  var setText = function (sel, text) {
    var el = root.querySelector(sel);
    if (el) el.textContent = text;
  };
  setText("[data-perfil-avatar]", initialsOf(name));
  setText("[data-perfil-name]", name);
  setText("[data-perfil-meta]", [user.username ? "@" + user.username : "", user.sala || st.clinicalSala || ""].filter(Boolean).join(" · "));
  var salaSel = document.getElementById("profile-censo-sala");
  var salaText = salaSel && salaSel.selectedIndex > 0 ? salaSel.options[salaSel.selectedIndex].text : "";
  setText("[data-prev-censo-title]", "Censo de guardia" + (salaText ? " · " + salaText : ""));
  var today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  setText("[data-prev-censo-sub]", [val("profile-censo-fimi-label"), val("settings-default-servicio") || "Sin servicio", today].filter(Boolean).join(" · "));
  setText("[data-prev-firma]", doctor || "—");
  var medicos = [["Prof.", "profesor"], ["R4", "r4"], ["R2", "r2"], ["R1", "r1a"]]
    .map(function (pair) {
      var v = val("settings-medico-" + pair[1]);
      if (pair[1] === "r1a" && val("settings-medico-r1b")) v = [v, val("settings-medico-r1b")].filter(Boolean).join(", ");
      return v ? pair[0] + " " + v : "";
    })
    .filter(Boolean)
    .join(" · ");
  setText("[data-prev-medicos]", medicos || "—");
}

var autosaveTimer = null;

/** Save silently a moment after the last change; the chip says «Guardado». */
function scheduleAutosave(root) {
  var chip = root.querySelector("[data-perfil-saved]");
  if (chip) chip.textContent = "Guardando…";
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(function () {
    autosaveTimer = null;
    saveSettings({ silent: true });
    if (chip) chip.textContent = "Guardado";
  }, 500);
}

function onPerfilInput(root, ev) {
  var t = ev.target;
  if (!(t instanceof Element)) return;
  if (t.matches("[data-perfil-doctor-pick]")) {
    var input = document.getElementById("profile-doctor");
    if (input) {
      input.hidden = t.value !== OTHER;
      if (t.value !== OTHER) input.value = t.value;
      else input.focus();
    }
  }
  renderPerfilPreview(root);
  if (t.matches("input[type=text], select") && !t.matches('[name="app-mode"]')) scheduleAutosave(root);
}

/** Wire Ajustes › Perfil once, then refresh it every time it shows. */
export function initPerfilPanel() {
  var root = document.getElementById("profile-body");
  if (!root) return;
  loadSettings();
  if (!root.dataset.perfilWired) {
    root.dataset.perfilWired = "1";
    root.addEventListener("input", function (ev) { onPerfilInput(root, ev); });
    root.addEventListener("change", function (ev) { onPerfilInput(root, ev); });
    root.querySelector("[data-perfil-fill-team]")?.addEventListener("click", function () {
      if (fillCensoTeamFromNube()) scheduleAutosave(root);
      renderPerfilPreview(root);
    });
    // Censo PDF fields sit in Documentos but save with the profile.
    var docs = document.getElementById("settings-accordion-documents");
    docs?.addEventListener("change", function (ev) {
      if (ev.target instanceof Element && ev.target.closest("#profile-censo-sala, #profile-censo-fimi-label")) {
        saveSettings({ silent: true });
      }
    });
  }
  syncDoctorPicker(root);
  renderPerfilPreview(root);
  var chip = root.querySelector("[data-perfil-saved]");
  if (chip) chip.textContent = "Se guarda solo";
}
