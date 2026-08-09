import {
  canAccessCloudAdmin
} from "/mobile/js/chunks/chunk-PYARRANH.js";
import {
  filterJoinedTeams,
  setClinicalTeamsEmbedHost
} from "/mobile/js/chunks/chunk-JHCY7JRY.js";
import {
  esc
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import {
  CLINICAL_LAN_DISPLAY_NAME_HINT_HTML,
  CLINICAL_LAN_USERNAME_HINT_HTML,
  readRpcSettings
} from "/mobile/js/chunks/chunk-QY3EXE2C.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-QHIEC6QJ.js";
import {
  normalizeUsername
} from "/mobile/js/chunks/chunk-LQTSNMET.js";
import {
  getCloudSyncRemember
} from "/mobile/js/chunks/chunk-KLMIZH6A.js";

// public/js/features/cloud-sync/panel-steps-html.mjs
function readCloudRememberChecked() {
  try {
    return getCloudSyncRemember();
  } catch {
    return false;
  }
}
function advancedUrlFieldHtml(url) {
  return '<details class="cloud-sync-advanced"><summary>Avanzado</summary><div class="cloud-sync-field"><label for="cloud-sync-url">URL del servicio</label><input id="cloud-sync-url" type="url" class="profile-input" data-cloud-sync-url value="' + esc(url) + '" placeholder="https://\u2026workers.dev" /></div></details>';
}
function connectStepHtml(url) {
  return '<div class="cloud-sync-step" data-cloud-step="1"><div class="cloud-sync-step-head"><strong class="cloud-sync-step-title">1 \xB7 Conectar a Nube</strong><span class="cloud-sync-status-chip is-pending">Modo Nube \xB7 Sin sesi\xF3n</span></div><p class="cloud-sync-lead">Conecta para sincronizar el censo del turno. No hace falta host LAN.</p><div class="cloud-sync-tabs" role="tablist" aria-label="Cuenta Nube"><button type="button" class="cloud-sync-tab is-active" role="tab" aria-selected="true" data-cloud-tab="login">Entrar</button><button type="button" class="cloud-sync-tab" role="tab" aria-selected="false" data-cloud-tab="register">Crear</button><button type="button" class="cloud-sync-tab" role="tab" aria-selected="false" data-cloud-tab="recover">Recuperar</button></div><div class="cloud-sync-tab-panels"><div class="cloud-sync-tab-panel" data-cloud-tab-panel="login" role="tabpanel"><div class="cloud-sync-field"><label>Usuario (@usuario)</label><input type="text" class="profile-input" data-cloud-login-user autocomplete="username" placeholder="ej. drmendoza" spellcheck="false" /></div><div class="cloud-sync-field"><label>Contrase\xF1a</label><input type="password" class="profile-input" data-cloud-login-pass autocomplete="current-password" /></div><label class="cloud-sync-remember"><input type="checkbox" data-cloud-login-remember' + (readCloudRememberChecked() ? " checked" : "") + ' /> Recu\xE9rdame en este dispositivo</label><p class="cloud-sync-hint">Mantiene la sesi\xF3n Nube al reiniciar R+. No uses esto en una Mac compartida.</p><button type="button" class="cloud-sync-btn ui-pressable" data-cloud-action="login">Entrar</button></div><div class="cloud-sync-tab-panel" data-cloud-tab-panel="register" role="tabpanel" hidden><div class="cloud-sync-field"><label>Usuario (@usuario)</label><input type="text" class="profile-input" data-cloud-reg-user autocomplete="username" placeholder="ej. drmendoza" spellcheck="false" /><p class="cloud-sync-hint">' + CLINICAL_LAN_USERNAME_HINT_HTML + '</p></div><div class="cloud-sync-field"><label>Nombre en guardia</label><input type="text" class="profile-input" data-cloud-reg-display autocomplete="name" placeholder="ej. Dr. Mendoza" /><p class="cloud-sync-hint">' + CLINICAL_LAN_DISPLAY_NAME_HINT_HTML + '</p></div><div class="cloud-sync-field"><label>Contrase\xF1a</label><input type="password" class="profile-input" data-cloud-reg-pass autocomplete="new-password" /></div><button type="button" class="cloud-sync-btn ui-pressable" data-cloud-action="register">Crear cuenta</button></div><div class="cloud-sync-tab-panel" data-cloud-tab-panel="recover" role="tabpanel" hidden><div class="cloud-sync-field"><label>Usuario (@usuario)</label><input type="text" class="profile-input" data-cloud-recover-user autocomplete="username" placeholder="ej. drmendoza" spellcheck="false" /></div><div class="cloud-sync-field"><label>C\xF3digo de recuperaci\xF3n</label><input type="text" class="profile-input" data-cloud-recover-code autocomplete="off" placeholder="R+XXXX-XXXX-XXXX" spellcheck="false" /></div><div class="cloud-sync-field"><label>Nueva contrase\xF1a</label><input type="password" class="profile-input" data-cloud-recover-pass autocomplete="new-password" /></div><div class="cloud-sync-field"><label>Confirmar contrase\xF1a</label><input type="password" class="profile-input" data-cloud-recover-pass2 autocomplete="new-password" /></div><button type="button" class="cloud-sync-btn ui-pressable" data-cloud-action="recover">Recuperar cuenta</button></div></div>' + advancedUrlFieldHtml(url) + "</div>";
}
function wireCloudAuthTabs(section) {
  if (section.dataset.cloudTabsWired === "1") return;
  section.dataset.cloudTabsWired = "1";
  section.addEventListener("click", function(ev) {
    const btn = ev.target instanceof Element ? ev.target.closest("[data-cloud-tab]") : null;
    if (!btn || !section.contains(btn)) return;
    const tab = btn.getAttribute("data-cloud-tab");
    if (!tab) return;
    section.querySelectorAll("[data-cloud-tab]").forEach(function(b) {
      const active = b === btn;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });
    section.querySelectorAll("[data-cloud-tab-panel]").forEach(function(p) {
      p.hidden = p.getAttribute("data-cloud-tab-panel") !== tab;
    });
  });
}

// public/js/features/cloud-sync/panel-conexion-html.mjs
var STATUS_LABELS = {
  idle: "Nube al d\xEDa",
  syncing: "Sincronizando\u2026",
  pending: "Pendiente",
  offline: "Sin conexi\xF3n Nube",
  error: "Error"
};
function cloudSyncTransportLabel(transport) {
  if (transport === "ws") return "WS";
  if (transport === "offline") return "\u2014";
  return "Poll";
}
function formatCloudStatusChipLabel(status, transport) {
  const base = STATUS_LABELS[status] || status;
  if (status === "offline" || status === "error") return base;
  const mode = cloudSyncTransportLabel(transport || "poll");
  return base + " \xB7 " + mode;
}
function statusChipModifier(status) {
  if (status === "syncing") return "is-syncing";
  if (status === "error") return "is-error";
  if (status === "pending" || status === "offline") return "is-pending";
  return "is-idle";
}
function userHasJoinedTeam() {
  return filterJoinedTeams(clinicalSessionContext.teams, clinicalSessionContext.user).length > 0;
}
function authFormsHtml(url) {
  return connectStepHtml(url);
}
function nextStepHtml(getToken) {
  if (!getToken() || userHasJoinedTeam()) return "";
  return '<div class="cloud-sync-next-step"><p class="cloud-sync-next-step-lead">Siguiente paso</p><p class="cloud-sync-hint">Configura tu equipo en \u21C4 Conexi\xF3n \u2192 Opciones \u2192 Equipo.</p><button type="button" class="cloud-sync-btn cloud-sync-btn--primary" data-cloud-action="open-rotation">Ir a Equipo</button></div>';
}
function roomConnectedHtml(room, getRevision) {
  const code = String(room?.code || "").trim();
  const revision = room?.revision ?? getRevision();
  const turn = String(room?.turnKey || "").trim();
  return '<div class="cloud-sync-room cloud-sync-room--connected"><dl class="cloud-sync-inset-group" aria-label="Sala nube">' + (turn ? '<div class="cloud-sync-inset-row cloud-sync-inset-row--kv"><dt>Mes</dt><dd>' + esc(turn) + "</dd></div>" : "") + '<div class="cloud-sync-inset-row cloud-sync-inset-row--kv"><dt>C\xF3digo</dt><dd><code data-cloud-room-code>' + esc(code || "\u2014") + '</code></dd></div><div class="cloud-sync-inset-row cloud-sync-inset-row--kv"><dt>Revisi\xF3n</dt><dd><span data-cloud-room-revision>' + esc(String(revision)) + '</span></dd></div><button type="button" class="cloud-sync-inset-row cloud-sync-inset-row--action cloud-sync-inset-row--danger" data-cloud-action="leave-room">Salir de la sala</button></dl></div>';
}
function roomActionsHtml(normalizedSala) {
  return '<div class="cloud-sync-room cloud-sync-room--actions"><p class="cloud-sync-room-title">Unirse a una sala del turno</p><div class="cloud-sync-field"><label>Nombre de la sala (opcional)</label><input type="text" class="profile-input" data-cloud-room-name placeholder="Turno ' + esc(normalizedSala) + '" /></div><button type="button" class="cloud-sync-btn" data-cloud-action="create-room">Crear sala</button><div class="cloud-sync-field"><label>C\xF3digo de sala</label><input type="text" class="profile-input" data-cloud-join-code placeholder="ABC123" /></div><button type="button" class="cloud-sync-btn" data-cloud-action="join-room">Unirse con c\xF3digo</button></div>';
}
function advancedUrlFieldsHtml(url) {
  return '<div class="cloud-sync-field"><label for="cloud-sync-url-connected">URL del servicio</label><input id="cloud-sync-url-connected" type="url" class="profile-input" data-cloud-sync-url value="' + esc(url) + '" placeholder="https://\u2026workers.dev" /></div><button type="button" class="cloud-sync-btn" data-cloud-action="save-url">Guardar</button>';
}
function conexionShellHtml(normalizedSala, bodyHtml, status, detail = "") {
  const detailText = String(detail || "").trim();
  const showDetail = status === "error" && !!detailText;
  return '<header class="cloud-sync-conexion-head"><div class="cloud-sync-conexion-head-text"><h4 class="cloud-sync-conexion-title">Conexi\xF3n</h4><p class="cloud-sync-conexion-sub">' + esc(normalizedSala) + '</p></div><span class="cloud-sync-status-chip ' + statusChipModifier(status) + '" data-cloud-status-chip data-status="' + esc(status) + '">' + esc(STATUS_LABELS[status] || status) + '</span></header><p class="cloud-sync-status-detail" data-cloud-status-detail' + (showDetail ? "" : " hidden") + ">" + esc(detailText) + "</p>" + bodyHtml;
}
function equipoEmbedHostHtml() {
  return '<div class="cloud-sync-equipo-embed" data-cloud-equipo-host><div class="clinical-teams-panel-body clinical-teams-panel-body--embed"></div></div>';
}

// public/js/features/cloud-sync/panel-conexion-views.mjs
function resolveIdentity(cloudUser) {
  const settings = readRpcSettings();
  const handle = normalizeUsername(
    cloudUser?.username || clinicalSessionContext.user?.username || settings.clinicalUsername || ""
  );
  const display = cloudUser?.displayName || clinicalSessionContext.user?.clinical_name || settings.clinicalDisplayName || "";
  return { handle, display };
}
function viewBlock(id, title, body, opts) {
  const hidden = typeof opts === "boolean" ? opts : !opts || opts.hidden !== false;
  return '<div class="cloud-sync-view" data-cloud-view="' + esc(id) + '" data-cloud-view-title="' + esc(title) + '"' + (hidden ? " hidden" : "") + '><div class="cloud-sync-view-body">' + body + "</div></div>";
}
function optionsRow(title, meta, view) {
  return '<button type="button" class="cloud-sync-options-row" data-cloud-action="nav-view" data-cloud-view="' + esc(view) + '"><span class="cloud-sync-options-row-text"><span class="cloud-sync-options-row-title">' + esc(title) + '</span><span class="cloud-sync-options-row-meta">' + esc(meta) + '</span></span><span class="cloud-sync-options-row-chevron" aria-hidden="true">\u203A</span></button>';
}
function optionsGroup(label, rowsHtml) {
  if (!rowsHtml) return "";
  return '<section class="cloud-sync-options-group"><h5 class="cloud-sync-options-label">' + esc(label) + '</h5><div class="cloud-sync-options-card">' + rowsHtml + "</div></section>";
}
function statusIdentityHtml(cloudUser) {
  const { handle, display } = resolveIdentity(cloudUser);
  return '<div class="cloud-sync-inset-group cloud-sync-status-identity" aria-label="Cuenta"><div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-sync-inset-row--identity"><span class="cloud-sync-options-entry-text"><span class="cloud-sync-status-handle">@' + esc(handle || "\u2014") + "</span>" + (display ? '<span class="cloud-sync-status-display">' + esc(display) + "</span>" : "") + "</span></div></div>";
}
function cuentaBodyHtml(cloudUser) {
  const { handle, display } = resolveIdentity(cloudUser);
  return '<div class="cloud-sync-cuenta"><p class="cloud-sync-status-handle">@' + esc(handle || "\u2014") + "</p>" + (display ? '<p class="cloud-sync-status-display">' + esc(display) + "</p>" : "") + '<button type="button" class="cloud-sync-btn ui-pressable" data-cloud-action="regenerate-recovery">C\xF3digo de recuperaci\xF3n</button><button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-cloud-action="logout">Cerrar sesi\xF3n Nube</button></div>';
}
function connectedViewsHtml({
  cloudUser,
  roomHtml,
  equipoHtml,
  adminHtml = "",
  url,
  hasCloudSession = false
}) {
  const showAdmin = !!String(adminHtml || "").trim() || canAccessCloudAdmin(clinicalSessionContext.user, { hasCloudSession });
  const adminHost = showAdmin ? String(adminHtml || "").trim() || '<div class="cloud-sync-admin-host" data-cloud-admin-host></div>' : "";
  const statusBody = '<div class="cloud-sync-status-sheet">' + statusIdentityHtml(cloudUser) + roomHtml + '<button type="button" class="cloud-sync-options-entry" data-cloud-action="nav-options"><span class="cloud-sync-options-entry-text"><span class="cloud-sync-options-entry-title">Opciones</span><span class="cloud-sync-options-entry-meta">Equipo, cuenta y administraci\xF3n</span></span><span class="cloud-sync-options-row-chevron" aria-hidden="true">\u203A</span></button></div>';
  let guardiaRows = optionsRow("iPad / R+ M\xF3vil", "QR y enlace permanente", "mobile") + optionsRow("Equipo", "@usuario, equipos y sala", "equipo");
  let cuentaRows = optionsRow("Cuenta", "Recuperaci\xF3n y sesi\xF3n", "cuenta");
  if (showAdmin) {
    cuentaRows += optionsRow("Administraci\xF3n", "Usuarios, salas y clave admin", "admin");
  }
  const sistemaRows = optionsRow("Diagn\xF3stico Nube", "Dashboard de estado y alertas", "nube") + optionsRow("Avanzado", "URL del servicio", "advanced");
  const optionsBody = optionsGroup("Guardia", guardiaRows) + optionsGroup("Cuenta", cuentaRows) + optionsGroup("Sistema", sistemaRows);
  return '<div class="cloud-sync-views" data-cloud-views>' + viewBlock("status", "Conexi\xF3n", statusBody, false) + viewBlock("options", "Opciones", '<div class="cloud-sync-options-list">' + optionsBody + "</div>") + viewBlock("equipo", "Equipo", equipoHtml) + viewBlock(
    "mobile",
    "iPad / R+ M\xF3vil",
    '<div class="cloud-sync-mobile-invite-host" data-cloud-mobile-invite-host></div>'
  ) + viewBlock("cuenta", "Cuenta", cuentaBodyHtml(cloudUser)) + (showAdmin ? viewBlock("admin", "Administraci\xF3n", adminHost) : "") + viewBlock(
    "nube",
    "Diagn\xF3stico Nube",
    '<div class="cloud-sync-nube-diagnostics-host" data-cloud-nube-diagnostics-host></div>'
  ) + viewBlock("advanced", "Avanzado", advancedUrlFieldsHtml(url)) + "</div>";
}
function resolveConexionPanelRoot(from) {
  if (!from) return null;
  if (from.id === "lan-connection-panel-root") return from;
  const closest = typeof from.closest === "function" ? from.closest("#lan-connection-panel-root") : null;
  if (closest) return closest;
  if (from.querySelector?.(".lan-connection-stack")) return from;
  return from.parentElement;
}
function syncCloudSecondaryPanels(root, view) {
  const panel = resolveConexionPanelRoot(root);
  if (!panel) return;
  const stack = panel.querySelector(".lan-connection-stack");
  const showOps = view === "ops";
  const showLan = view === "lan";
  const showStack = showOps || showLan;
  if (stack) {
    stack.hidden = !showStack;
    stack.setAttribute("data-cloud-stack-view", showOps ? "ops" : showLan ? "lan" : "hidden");
    stack.querySelectorAll("[data-cloud-secondary]").forEach(function(el) {
      const kind = el.getAttribute("data-cloud-secondary");
      if (kind === "ops") el.hidden = !showOps;
      else if (kind === "lan") el.hidden = !showLan;
    });
  }
  const kids = panel.children || [];
  for (let i = 0; i < kids.length; i++) {
    const el = kids[i];
    const cls = String(el.className || "");
    if (cls.split(/\s+/).includes("lan-sync-diagnostics-panel")) {
      el.hidden = !showLan;
    }
  }
}
var CONEXION_MODAL_TITLES = {
  status: "Conexi\xF3n guardia",
  options: "Opciones",
  mobile: "iPad / R+ M\xF3vil",
  equipo: "Equipo",
  ops: "Operaciones",
  admin: "Administraci\xF3n",
  cuenta: "Cuenta",
  nube: "Diagn\xF3stico Nube",
  lan: "Diagn\xF3stico LAN",
  advanced: "Avanzado"
};
var CONEXION_MODAL_BACK_LABEL = {
  options: "Conexi\xF3n",
  mobile: "Opciones",
  equipo: "Opciones",
  ops: "Opciones",
  admin: "Opciones",
  cuenta: "Opciones",
  nube: "Opciones",
  lan: "Opciones",
  advanced: "Opciones"
};
function syncConexionModalChrome(view) {
  if (typeof document === "undefined") return;
  const modal = document.getElementById("connection-dropdown");
  if (!modal) return;
  const titleEl = document.getElementById("connection-dropdown-head-title") || modal.querySelector(".connection-dropdown-head-title");
  const backBtn = document.getElementById("btn-connection-dropdown-back");
  const backLabel = backBtn && backBtn.querySelector(".connection-dropdown-back-label");
  const icon = modal.querySelector(".connection-dropdown-head-icon");
  const isHome = view === "status";
  if (titleEl) {
    titleEl.textContent = CONEXION_MODAL_TITLES[view] || CONEXION_MODAL_TITLES.status;
  }
  if (backBtn) {
    backBtn.hidden = isHome;
    if (backLabel) {
      backLabel.textContent = CONEXION_MODAL_BACK_LABEL[view] || "Opciones";
    }
  }
  if (icon) icon.hidden = !isHome;
  modal.classList.toggle("connection-dropdown-modal--subview", !isHome);
  modal.classList.toggle("connection-dropdown-modal--equipo", view === "equipo");
}
function applyConexionView(section, view, hooks) {
  let next = String(view || "status").trim() || "status";
  if (next !== "status" && !section.querySelector('[data-cloud-view="' + next + '"]')) {
    next = "status";
  }
  section.dataset.cloudView = next;
  section.querySelectorAll("[data-cloud-view]").forEach(function(el) {
    el.hidden = el.getAttribute("data-cloud-view") !== next;
  });
  const head = section.querySelector(".cloud-sync-conexion-head");
  if (head && section.querySelector("[data-cloud-views]")) {
    head.hidden = next !== "status";
    if (next === "status" && typeof hooks?.onStatusHome === "function") {
      hooks.onStatusHome();
    }
  }
  syncConexionModalChrome(next);
  syncCloudSecondaryPanels(resolveConexionPanelRoot(section), next);
  if (next !== "equipo") setClinicalTeamsEmbedHost(null);
  if (next === "admin" && typeof hooks?.onAdmin === "function") {
    void hooks.onAdmin();
  }
  if (next === "mobile" && typeof hooks?.onMobile === "function") {
    void hooks.onMobile();
  }
  if (next === "nube" && typeof hooks?.onNube === "function") {
    void hooks.onNube();
  }
  if (next === "equipo" && typeof hooks?.onEquipo === "function") {
    void hooks.onEquipo();
  }
}

export {
  connectedViewsHtml,
  applyConexionView,
  wireCloudAuthTabs,
  STATUS_LABELS,
  formatCloudStatusChipLabel,
  statusChipModifier,
  userHasJoinedTeam,
  authFormsHtml,
  nextStepHtml,
  roomConnectedHtml,
  roomActionsHtml,
  conexionShellHtml,
  equipoEmbedHostHtml
};
//# sourceMappingURL=/js/chunks/chunk-TBUVYOE2.js.map
