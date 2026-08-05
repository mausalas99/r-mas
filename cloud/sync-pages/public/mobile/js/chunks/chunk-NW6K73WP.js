import {
  showRecoveryCodeModal
} from "/mobile/js/chunks/chunk-NCZWUFAX.js";
import {
  isMobileWeb
} from "/mobile/js/chunks/chunk-WOP35WT6.js";
import {
  esc
} from "/mobile/js/chunks/chunk-NIMNG7BY.js";
import {
  isCloudSyncActive
} from "/mobile/js/chunks/chunk-6VYBWSQE.js";
import {
  isWebClinicalClient
} from "/mobile/js/chunks/chunk-LMOJUVZ4.js";

// public/js/clinical-privileges.mjs
function shouldEnforceTeamPatientMirror() {
  return isMobileWeb() || isWebClinicalClient();
}
function shouldUseCloudTeamPatientMirror(user) {
  if (shouldEnforceTeamPatientMirror()) return false;
  if (shouldUseElevatedPatientCensus(user)) return false;
  return isCloudSyncActive();
}
function shouldFilterPatientsByJoinedTeam(user) {
  if (shouldEnforceTeamPatientMirror()) return true;
  return shouldUseCloudTeamPatientMirror(user);
}
var CLINICAL_RANKS = /* @__PURE__ */ new Set(["R1", "R2", "R3", "R4"]);
function hasProgramAdminPrivileges(user) {
  if (!user) return false;
  if (user.is_program_admin === 1 || user.is_program_admin === true) return true;
  return String(user.rank || "") === "Admin";
}
function effectiveClinicalRank(user) {
  const rank = String(user?.rank || "R1");
  if (CLINICAL_RANKS.has(rank)) return rank;
  if (rank === "Admin") return "R1";
  return "R1";
}
function canConfigureRotation(user) {
  const rank = effectiveClinicalRank(user);
  if (rank === "R4") return true;
  return hasProgramAdminPrivileges(user);
}
function canManageInternoQr(user) {
  return canConfigureRotation(user);
}
function hasElevatedTeamPrivileges(user) {
  if (!user) return false;
  if (hasProgramAdminPrivileges(user)) return true;
  return effectiveClinicalRank(user) === "R4";
}
function shouldUseElevatedPatientCensus(user) {
  if (!hasElevatedTeamPrivileges(user)) return false;
  if (shouldEnforceTeamPatientMirror()) return false;
  return true;
}
function shouldShowClinicalCensusFilters(user) {
  if (!user?.user_id) return false;
  if (shouldUseElevatedPatientCensus(user)) return true;
  return shouldFilterPatientsByJoinedTeam(user);
}
function canViewLanUserDirectory(user) {
  return hasElevatedTeamPrivileges(user);
}
function canManageTeamRoster(user) {
  return hasElevatedTeamPrivileges(user);
}
function canDeleteLanDirectoryUser(user) {
  return canManageTeamRoster(user);
}

// public/js/features/cloud-sync/panel-admin-helpers.mjs
var sessionAdminKey = "";
function getSessionAdminKey() {
  return sessionAdminKey;
}
function setSessionAdminKey(key) {
  sessionAdminKey = String(key || "").trim();
}
var ROLE_LABELS = {
  member: "Miembro",
  admin: "Admin",
  program_admin: "Admin programa"
};
function fmtRole(role) {
  return ROLE_LABELS[role] || role || "\u2014";
}
function confirmAction(message) {
  return window.confirm(message);
}
function adminTableHtml(rows, cols) {
  if (!rows.length) {
    return '<p class="cloud-sync-hint">Sin registros.</p>';
  }
  const head = cols.map((c) => "<th>" + esc(c.label) + "</th>").join("");
  const body = rows.map((row) => {
    const tds = cols.map((c) => "<td>" + (c.cell ? c.cell(row) : esc(String(row[c.key] ?? ""))) + "</td>").join("");
    return "<tr>" + tds + "</tr>";
  }).join("");
  return '<div class="cloud-sync-admin-table-wrap"><table class="cloud-sync-admin-table"><thead><tr>' + head + "</tr></thead><tbody>" + body + "</tbody></table></div>";
}

// public/js/update-helpers.mjs
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return kb >= 10 ? `${Math.round(kb)} KB` : `${kb.toFixed(1)} KB`;
  }
  const mb = bytes / (1024 * 1024);
  if (mb >= 100) return `${Math.round(mb)} MB`;
  if (mb >= 10) return `${mb.toFixed(1)} MB`;
  return `${mb.toFixed(2)} MB`;
}
function formatSpeed(bytesPerSecond) {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return "\u2014";
  return `${formatBytes(bytesPerSecond)}/s`;
}
function formatProgressLine(p) {
  const t = formatBytes(p.transferred || 0);
  const tot = formatBytes(p.total || 0);
  const sp = formatSpeed(p.bytesPerSecond);
  return `Descargando ${t} / ${tot} \xB7 ${sp}`;
}
var UPDATER_MSG_MAX = 420;
function sanitizeUpdaterUserMessage(raw, fallback) {
  const fb = typeof fallback === "string" && fallback.trim() ? fallback.trim() : "No se pudo completar la actualizaci\xF3n. Prueba de nuevo o instala desde GitHub.";
  let s = raw == null ? "" : String(raw);
  if (!s.trim()) return fb;
  s = s.replace(/<\s*script[\s\S]*?<\/\s*script>/gi, " ").replace(/<\s*style[\s\S]*?<\/\s*style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
  const looksLikeDump = s.length > UPDATER_MSG_MAX || /release notes|github\.com\/.*\/releases|npm run build:|workers\.dev\/mobile/i.test(s) || /<!doctype|<html\b|<body\b|<div\b/i.test(String(raw || ""));
  if (looksLikeDump) {
    const head = s.slice(0, 180).trim();
    const short = head && !/^(R\+|7\.\d|Hybrid|Fecha:)/i.test(head) ? head.replace(/\s+\S*$/, "") + "\u2026" : "";
    if (short && short.length >= 24 && !/github\.com|npm run|workers\.dev/i.test(short)) {
      return short + " Usa \xABAbrir instalador en GitHub\xBB si el reintento falla.";
    }
    return fb;
  }
  if (s.length > UPDATER_MSG_MAX) {
    return s.slice(0, UPDATER_MSG_MAX - 1).replace(/\s+\S*$/, "") + "\u2026";
  }
  return s;
}

// public/js/features/cloud-sync/room-label.mjs
function formatCloudRoomLabel(room) {
  const sala = String(room?.sala || "").trim() || "Sala";
  const codePart = nonEmpty(room?.code);
  const parts = [sala].concat(nonEmpty(room?.turnKey)).concat(codePart.length ? codePart : nonEmpty(room?.id)).concat(extraName(sala, room?.name));
  return appendMemberCount(parts.filter(Boolean).join(" \xB7 "), room?.memberCount);
}
function nonEmpty(value) {
  const s = String(value || "").trim();
  return s ? [s] : [];
}
function extraName(sala, name) {
  const s = String(name || "").trim();
  if (!s || s.toLowerCase() === sala.toLowerCase()) return [];
  return [s];
}
function appendMemberCount(label, members) {
  if (members == null || !Number.isFinite(Number(members))) return label;
  const n = Number(members);
  return label + " \xB7 " + n + (n === 1 ? " miembro" : " miembros");
}

// public/js/features/cloud-sync/panel-admin-html.mjs
var ADMIN_TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "salas", label: "Salas" },
  { id: "usuarios", label: "Usuarios" },
  { id: "mutaciones", label: "Mutaciones" },
  { id: "peligro", label: "Peligro", danger: true }
];
function buildAdminShellHtml(showBootstrap = true) {
  const tabs = ADMIN_TABS.map((t, i) => {
    const active = i === 0;
    return '<button type="button" class="cloud-sync-tab cloud-sync-admin-tab' + (t.danger ? " cloud-sync-admin-tab--danger" : "") + (active ? " is-active" : "") + '" role="tab" data-admin-tab="' + esc(t.id) + '" aria-selected="' + (active ? "true" : "false") + '">' + esc(t.label) + "</button>";
  }).join("");
  const panels = ADMIN_TABS.map((t, i) => {
    const active = i === 0;
    const loading = t.id === "resumen" || t.id === "salas" ? adminSkeletonHtml() : "";
    return '<div class="cloud-sync-admin-panel" role="tabpanel" data-admin-section="' + esc(t.id) + '" data-admin-' + esc(t.id) + (active ? "" : " hidden") + ">" + loading + "</div>";
  }).join("");
  return '<div class="cloud-sync-admin-shell">' + (showBootstrap ? bootstrapHtml() : "") + '<div class="cloud-sync-tabs cloud-sync-admin-tabs" role="tablist" aria-label="Secciones de administraci\xF3n">' + tabs + '</div><div class="cloud-sync-admin-panels">' + panels + "</div></div>";
}
function bootstrapHtml() {
  return '<div class="cloud-sync-admin-bootstrap" data-admin-bootstrap><p class="cloud-sync-hint">Clave de administraci\xF3n (solo esta sesi\xF3n) para promover tu cuenta.</p><div class="cloud-sync-field"><label for="cloud-sync-admin-key">Clave de sesi\xF3n</label><input id="cloud-sync-admin-key" type="password" class="profile-input" data-admin-key-input autocomplete="off" spellcheck="false" placeholder="Clave de sesi\xF3n" /></div><div class="cloud-sync-admin-bootstrap-actions"><button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-action="save-key">Guardar clave</button><button type="button" class="cloud-sync-btn cloud-sync-btn--primary" data-admin-action="promote-self">Promover a admin</button></div></div>';
}
function adminSkeletonHtml() {
  return '<div class="cloud-sync-admin-skeleton" aria-busy="true" aria-label="Cargando"><span class="cloud-sync-admin-skeleton-bar"></span><span class="cloud-sync-admin-skeleton-bar"></span><span class="cloud-sync-admin-skeleton-bar cloud-sync-admin-skeleton-bar--short"></span></div>';
}
function resumenHtml(data) {
  const c = data.counts || {};
  const m = data.meters || {};
  const storage = Number(c.storageBytes ?? m.storageBytes ?? 0);
  const soft = Number(m.storageSoftBytes ?? 0);
  const hard = Number(m.storageHardBytes ?? 0);
  const storageMeta = [
    soft ? "soft " + formatBytes(soft) : "",
    hard ? "tope " + formatBytes(hard) : ""
  ].filter(Boolean).join(" \xB7 ");
  return '<div class="cloud-sync-admin-panel-head"><button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="refresh-resumen">Actualizar</button></div><dl class="cloud-sync-admin-stats"><div class="cloud-sync-admin-stat"><dt>Usuarios</dt><dd>' + esc(String(c.users ?? 0)) + '</dd></div><div class="cloud-sync-admin-stat"><dt>Salas</dt><dd>' + esc(String(c.rooms ?? 0)) + '</dd></div><div class="cloud-sync-admin-stat"><dt>Miembros</dt><dd>' + esc(String(c.members ?? 0)) + '</dd></div><div class="cloud-sync-admin-stat"><dt>M\xE1x. por sala</dt><dd>' + esc(String(m.maxMembersPerRoom ?? "\u2014")) + ' miembros</dd></div><div class="cloud-sync-admin-stat cloud-sync-admin-stats__wide"><dt>Almacenamiento</dt><dd><span class="cloud-sync-admin-stat-value">' + esc(formatBytes(storage)) + "</span>" + (storageMeta ? '<span class="cloud-sync-admin-stat-meta">' + esc(storageMeta) + "</span>" : "") + "</dd></div></dl>";
}
function salasTableHtml(rooms) {
  const cols = [
    { label: "Sala", key: "sala" },
    { label: "Mes", cell: (row) => esc(String(row.turnKey || "\u2014")) },
    { label: "C\xF3digo", key: "code" },
    { label: "Rev.", key: "revision" },
    { label: "Miembros", key: "memberCount" },
    {
      label: "Almacenamiento",
      cell: (row) => esc(formatBytes(Number(row.storageBytes) || 0))
    },
    {
      label: "Acciones",
      cell: (row) => '<div class="cloud-sync-admin-row-actions"><button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="room-detail" data-room-id="' + esc(String(row.id)) + '">Ver detalle</button><button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="rotate-code" data-room-id="' + esc(String(row.id)) + '">Rotar c\xF3digo</button><button type="button" class="cloud-sync-btn cloud-sync-btn--danger cloud-sync-btn--compact" data-admin-action="purge-room" data-room-id="' + esc(String(row.id)) + '" data-room-code="' + esc(String(row.code || "")) + '">Purgar</button></div>'
    }
  ];
  return '<div class="cloud-sync-admin-panel-head"><button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="refresh-salas">Actualizar</button></div><p class="cloud-sync-hint cloud-sync-admin-salas-hint">Cada sala de guardia (Sala 1, Sala 2, Sala E, Torre HU) tiene su propio espacio por mes (YYYY-MM).</p>' + adminTableHtml(rooms, cols);
}
function roomDetailHostHtml() {
  return '<div class="cloud-sync-admin-room-detail" data-admin-room-detail></div>';
}
function roomDetailHtml(data) {
  const room = data.room || {};
  const members = data.members || [];
  const memberRows = members.map((m) => ({
    username: "@" + (m.username || ""),
    displayName: m.displayName || "",
    role: fmtRole(m.role),
    joinedAt: m.joinedAt || ""
  }));
  return '<p class="cloud-sync-room-title">' + esc(formatCloudRoomLabel(room)) + '</p><dl class="cloud-sync-room-meta"><div><dt>ID</dt><dd>' + esc(String(room.id)) + "</dd></div><div><dt>Mes</dt><dd>" + esc(String(room.turnKey || "\u2014")) + "</dd></div><div><dt>Revisi\xF3n</dt><dd>" + esc(String(room.revision ?? 0)) + "</dd></div><div><dt>Storage</dt><dd>" + esc(formatBytes(Number(room.storageBytes) || 0)) + '</dd></div></dl><p class="cloud-sync-hint">Miembros (' + esc(String(members.length)) + ")</p>" + adminTableHtml(memberRows, [
    { label: "Usuario", key: "username" },
    { label: "Nombre", key: "displayName" },
    { label: "Rol", key: "role" },
    { label: "Unido", key: "joinedAt" }
  ]) + '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-action="close-room-detail">Cerrar detalle</button>';
}
function usuariosShellHtml() {
  return '<div class="cloud-sync-admin-toolbar"><input type="search" class="profile-input" data-admin-user-search placeholder="Buscar @usuario o nombre" /><button type="button" class="cloud-sync-btn" data-admin-action="search-users">Buscar</button></div><div data-admin-users-list><p class="cloud-sync-hint">Busc\xE1 usuarios o dej\xE1 vac\xEDo para los \xFAltimos 50.</p></div>';
}
function userActionsHtml(user) {
  const id = esc(String(user.id));
  const handle = esc(String(user.username || ""));
  return '<div class="cloud-sync-admin-row-actions"><button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="revoke-sessions" data-user-id="' + id + '" data-user-handle="' + handle + '">Revocar sesiones</button><select class="profile-input cloud-sync-admin-role-select" data-admin-promote-role data-user-id="' + id + '"><option value="admin">Admin</option><option value="program_admin">Admin programa</option><option value="member">Miembro</option></select><button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="promote-user" data-user-id="' + id + '" data-user-handle="' + handle + '">Cambiar rol</button><button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="reset-password" data-user-id="' + id + '" data-user-handle="' + handle + '">Restablecer contrase\xF1a</button><button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="disable-user" data-user-id="' + id + '" data-user-handle="' + handle + '">Deshabilitar</button><button type="button" class="cloud-sync-btn cloud-sync-btn--danger cloud-sync-btn--compact" data-admin-action="delete-user" data-user-id="' + id + '" data-user-handle="' + handle + '">Eliminar</button></div>';
}
function mutacionesShellHtml() {
  return '<div class="cloud-sync-admin-toolbar"><label class="cloud-sync-admin-toolbar-label">Sala</label><select class="profile-input" data-admin-mutations-room><option value="">\u2014 Elige una sala \u2014</option></select><button type="button" class="cloud-sync-btn" data-admin-action="load-mutations">Cargar</button></div><div data-admin-mutations-list></div>';
}
function mutationsRoomOptionsHtml(rooms) {
  return '<option value="">\u2014 Elige una sala \u2014</option>' + rooms.map(
    (r) => '<option value="' + esc(String(r.id)) + '">' + esc(formatCloudRoomLabel(r)) + "</option>"
  ).join("");
}
function mutationsListHtml(mutations) {
  const cols = [
    { label: "Rev.", key: "revision" },
    { label: "Actor", key: "actorId" },
    { label: "Cliente", key: "clientMutationId" },
    {
      label: "Ops (truncado)",
      cell: (m) => {
        const txt = String(m.opsJson || "");
        const suffix = m.opsJsonTruncated ? "\u2026" : "";
        return '<code class="cloud-sync-admin-ops">' + esc(txt) + esc(suffix) + "</code>";
      }
    },
    { label: "Fecha", key: "createdAt" }
  ];
  return adminTableHtml(mutations, cols);
}
function peligroHtml() {
  return '<div class="cloud-sync-admin-danger"><p class="cloud-sync-hint">Solo afecta datos en la nube del piloto (D1). Lo local en cada Mac no se borra.</p><section class="cloud-sync-admin-danger-card"><h5 class="cloud-sync-admin-danger-title">Purgar sala</h5><p class="cloud-sync-hint">Elimina miembros, mutaciones, estado y la sala.</p><div class="cloud-sync-admin-toolbar"><label class="cloud-sync-admin-toolbar-label" for="cloud-admin-peligro-room">Sala</label><select id="cloud-admin-peligro-room" class="profile-input" data-admin-peligro-room><option value="">\u2014 Elige una sala \u2014</option></select><button type="button" class="cloud-sync-btn cloud-sync-btn--danger" data-admin-action="purge-room-selected">Purgar</button></div></section><section class="cloud-sync-admin-danger-card"><h5 class="cloud-sync-admin-danger-title">Usuarios</h5><p class="cloud-sync-hint">Revocar sesiones, deshabilitar o borrar cuentas.</p><button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-tab="usuarios">Ir a Usuarios</button></section></div>';
}
function adminErrorHtml(message) {
  return '<p class="cloud-sync-admin-error">' + esc(message) + "</p>";
}

// public/js/features/cloud-sync/panel-admin-data.mjs
async function loadAdminResumen(root, getApi) {
  const el = root.querySelector("[data-admin-resumen]");
  if (!el) return;
  try {
    const data = await getApi().adminOverview();
    el.innerHTML = resumenHtml(data);
  } catch (err) {
    el.innerHTML = adminErrorHtml(err?.data?.message || err?.message || "No se pudo cargar el resumen.");
  }
}
async function loadAdminSalas(root, getApi, ctx) {
  const el = root.querySelector("[data-admin-salas]");
  if (!el) return;
  try {
    const data = await getApi().adminRooms();
    ctx.roomsCache.length = 0;
    ctx.roomsCache.push(...data.rooms || []);
    ctx.updateMutacionesRoomSelect();
    el.innerHTML = salasTableHtml(ctx.roomsCache) + (ctx.openRoomDetailId ? roomDetailHostHtml() : "");
    if (ctx.openRoomDetailId) await ctx.loadRoomDetail(ctx.openRoomDetailId);
  } catch (err) {
    el.innerHTML = adminErrorHtml(err?.data?.message || err?.message || "No se pudieron cargar las salas.");
  }
}
async function loadAdminRoomDetail(root, getApi, roomId) {
  const el = root.querySelector("[data-admin-room-detail]");
  if (!el) return;
  el.innerHTML = '<p class="cloud-sync-hint">Cargando detalle\u2026</p>';
  try {
    const data = await getApi().adminRoom(roomId);
    el.innerHTML = roomDetailHtml(data);
  } catch (err) {
    el.innerHTML = adminErrorHtml(err?.data?.message || err?.message || "No se pudo cargar el detalle.");
  }
}
async function loadAdminUsers(root, getApi) {
  const list = root.querySelector("[data-admin-users-list]");
  const search = root.querySelector("[data-admin-user-search]");
  if (!list) return;
  const q = search instanceof HTMLInputElement ? String(search.value || "").trim() : "";
  list.innerHTML = '<p class="cloud-sync-hint">Buscando\u2026</p>';
  try {
    const data = await getApi().adminUsers(q);
    const users = data.users || [];
    const cols = [
      { label: "Usuario", cell: (u) => "@" + String(u.username || "") },
      { label: "Nombre", key: "display_name" },
      { label: "Rol", cell: (u) => String(u.role || "") },
      {
        label: "Estado",
        cell: (u) => u.disabled ? '<span class="cloud-sync-admin-badge is-disabled">Deshabilitado</span>' : "Activo"
      },
      { label: "Acciones", cell: (u) => userActionsHtml(u) }
    ];
    list.innerHTML = adminTableHtml(users, cols);
  } catch (err) {
    list.innerHTML = adminErrorHtml(err?.data?.message || err?.message || "No se pudieron cargar usuarios.");
  }
}
async function loadAdminMutations(root, getApi, toast) {
  const sel = root.querySelector("[data-admin-mutations-room]");
  const list = root.querySelector("[data-admin-mutations-list]");
  if (!(sel instanceof HTMLSelectElement) || !list) return;
  const roomId = String(sel.value || "").trim();
  if (!roomId) {
    toast("Elige una sala.", "error");
    return;
  }
  list.innerHTML = '<p class="cloud-sync-hint">Cargando\u2026</p>';
  try {
    const data = await getApi().adminMutations(roomId, 50);
    const mutations = data.mutations || [];
    if (!mutations.length) {
      list.innerHTML = '<p class="cloud-sync-hint">Sin mutaciones en esta sala.</p>';
      return;
    }
    list.innerHTML = mutationsListHtml(mutations);
  } catch (err) {
    list.innerHTML = adminErrorHtml(err?.data?.message || err?.message || "No se pudieron cargar mutaciones.");
  }
}

// public/js/features/cloud-sync/admin-prompt-modal.mjs
function showAdminPromptModal(opts) {
  const title = String(opts?.title || "Confirmar");
  const message = String(opts?.message || "");
  const placeholder = String(opts?.placeholder || "");
  const confirmLabel = String(opts?.confirmLabel || "Confirmar");
  const inputType = opts?.inputType === "password" ? "password" : "text";
  return new Promise(function(resolve) {
    const host = document.createElement("div");
    host.innerHTML = adminPromptModalMarkup({
      title,
      message,
      placeholder,
      confirmLabel,
      inputType
    });
    const overlay = host.firstElementChild;
    if (!(overlay instanceof HTMLElement)) {
      resolve(null);
      return;
    }
    document.body.appendChild(overlay);
    wireAdminPromptModal(overlay, resolve);
  });
}
function adminPromptModalMarkup(opts) {
  return '<div class="lab-conflict-backdrop" data-admin-prompt-modal><div class="lab-conflict-modal cloud-sync-admin-prompt-modal" role="dialog" aria-modal="true"><h3 style="margin:0 0 10px;">' + esc(opts.title) + '</h3><p style="font-size:13px;line-height:1.45;margin:0 0 14px;color:var(--text-muted);white-space:pre-wrap;">' + esc(opts.message) + '</p><input type="' + esc(opts.inputType) + '" class="profile-input" data-admin-prompt-input autocomplete="off" spellcheck="false" placeholder="' + esc(opts.placeholder) + '" style="width:100%;margin:0 0 16px;" /><div style="display:flex;justify-content:flex-end;gap:8px;"><button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-prompt-cancel>Cancelar</button><button type="button" class="cloud-sync-btn" data-admin-prompt-ok>' + esc(opts.confirmLabel) + "</button></div></div></div>";
}
function wireAdminPromptModal(overlay, resolve) {
  const input = overlay.querySelector("[data-admin-prompt-input]");
  const okBtn = overlay.querySelector("[data-admin-prompt-ok]");
  const cancelBtn = overlay.querySelector("[data-admin-prompt-cancel]");
  function finish(value) {
    overlay.remove();
    resolve(value);
  }
  cancelBtn?.addEventListener("click", function() {
    finish(null);
  });
  okBtn?.addEventListener("click", function() {
    const raw = input instanceof HTMLInputElement ? input.value : "";
    finish(String(raw).trim());
  });
  overlay.addEventListener("click", function(ev) {
    if (ev.target === overlay) finish(null);
  });
  if (input instanceof HTMLInputElement) {
    input.addEventListener("keydown", function(ev) {
      if (ev.key === "Enter") {
        ev.preventDefault();
        finish(String(input.value || "").trim());
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        finish(null);
      }
    });
    queueMicrotask(function() {
      input.focus();
    });
  }
}

// public/js/features/cloud-sync/panel-admin-actions.mjs
function createAdminClickHandler(deps) {
  const ctx = {
    roomsCache: deps.roomsCache,
    get openRoomDetailId() {
      return deps.openRoomDetailId;
    },
    set openRoomDetailId(v) {
      deps.setOpenRoomDetailId(v);
    },
    updateMutacionesRoomSelect: deps.updateMutacionesRoomSelect,
    loadRoomDetail: (id) => loadAdminRoomDetail(deps.root, deps.getApi, id)
  };
  return function onAdminClick(ev) {
    const btn = ev.target instanceof Element ? ev.target.closest("[data-admin-action]") : null;
    if (!btn) return;
    const action = btn.getAttribute("data-admin-action");
    if (dispatchSimpleAction(action, deps)) return;
    dispatchRoomAction(action, btn, deps, ctx);
    dispatchUserAction(action, btn, deps);
  };
}
function dispatchSimpleAction(action, deps) {
  const map = {
    "save-key": () => {
      const input = deps.root.querySelector("[data-admin-key-input]");
      if (input instanceof HTMLInputElement) setSessionAdminKey(input.value);
      deps.toast("Clave guardada solo para esta sesi\xF3n.", "info");
    },
    "promote-self": () => void handlePromoteSelf(deps),
    "refresh-resumen": () => void loadAdminResumen(deps.root, deps.getApi),
    "refresh-salas": () => void loadAdminSalas(deps.root, deps.getApi, buildSalasCtx(deps)),
    "search-users": () => void loadAdminUsers(deps.root, deps.getApi),
    "load-mutations": () => void loadAdminMutations(deps.root, deps.getApi, deps.toast),
    "purge-room-selected": () => void handlePurgeRoomSelected(deps),
    "close-room-detail": () => {
      deps.setOpenRoomDetailId(null);
      void loadAdminSalas(deps.root, deps.getApi, buildSalasCtx(deps));
    }
  };
  if (!action || !(action in map)) return false;
  map[action]();
  return true;
}
function buildSalasCtx(deps) {
  return {
    roomsCache: deps.roomsCache,
    openRoomDetailId: deps.openRoomDetailId,
    updateMutacionesRoomSelect: deps.updateMutacionesRoomSelect,
    loadRoomDetail: (id) => loadAdminRoomDetail(deps.root, deps.getApi, id)
  };
}
function dispatchRoomAction(action, btn, deps, _ctx) {
  const roomId = btn.getAttribute("data-room-id");
  if (action === "room-detail" && roomId) {
    deps.setOpenRoomDetailId(roomId);
    void loadAdminSalas(deps.root, deps.getApi, buildSalasCtx(deps));
    return;
  }
  if (action === "rotate-code" && roomId) void handleRotateCode(deps, roomId);
  if (action === "purge-room" && roomId) {
    void handlePurgeRoom(deps, roomId, btn.getAttribute("data-room-code") || roomId);
  }
}
function dispatchUserAction(action, btn, deps) {
  const userId = btn.getAttribute("data-user-id");
  const handle = btn.getAttribute("data-user-handle") || "";
  if (action === "revoke-sessions" && userId) void handleRevokeSessions(deps, userId, handle);
  if (action === "promote-user" && userId) void handlePromoteUser(deps, userId, handle, btn);
  if (action === "reset-password" && userId) void handleResetPassword(deps, userId, handle);
  if (action === "disable-user" && userId) void handleDisableUser(deps, userId, handle);
  if (action === "delete-user" && userId) void handleDeleteUser(deps, userId, handle);
}
async function handlePromoteSelf(deps) {
  try {
    const me = await deps.getApi().me();
    const userId = me?.user?.id;
    if (!userId) {
      deps.toast("Inicia sesi\xF3n en la nube primero.", "error");
      return;
    }
    if (!confirmAction("\xBFPromover tu cuenta a admin en la nube?")) return;
    await deps.getApi().adminPromote(userId, "admin");
    deps.toast("Cuenta promovida a admin.", "success");
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || "No se pudo promover.", "error");
  }
}
function handlePurgeRoomSelected(deps) {
  const sel = deps.root.querySelector("[data-admin-peligro-room]");
  if (!(sel instanceof HTMLSelectElement) || !sel.value) {
    deps.toast("Elige una sala.", "error");
    return;
  }
  const roomId = sel.value;
  const room = (deps.roomsCache || []).find(function(r) {
    return r && r.id === roomId;
  });
  void handlePurgeRoom(deps, roomId, room && room.code || roomId);
}
async function handleRotateCode(deps, roomId) {
  if (!confirmAction("\xBFRotar el c\xF3digo de esta sala? Quienes tengan el c\xF3digo anterior no podr\xE1n unirse.")) return;
  try {
    const data = await deps.getApi().adminRotateCode(roomId);
    deps.toast("Nuevo c\xF3digo: " + (data.code || "\u2014"), "success");
    void loadAdminSalas(deps.root, deps.getApi, buildSalasCtx(deps));
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || "No se pudo rotar el c\xF3digo.", "error");
  }
}
async function handlePurgeRoom(deps, roomId, code) {
  const typed = await showAdminPromptModal({
    title: "Purgar sala",
    message: 'Esto elimina la sala "' + code + '" y todos sus datos en la nube.\n\nEscribe el c\xF3digo de sala para confirmar:',
    placeholder: code,
    confirmLabel: "Purgar"
  });
  if (typed === null || String(typed).trim().toUpperCase() !== String(code).trim().toUpperCase()) {
    if (typed !== null) deps.toast("Confirmaci\xF3n incorrecta; no se purg\xF3.", "error");
    return;
  }
  try {
    await deps.getApi().adminPurgeRoom(roomId);
    if (deps.openRoomDetailId === roomId) deps.setOpenRoomDetailId(null);
    deps.toast("Sala purgada.", "success");
    void loadAdminSalas(deps.root, deps.getApi, buildSalasCtx(deps));
    void loadAdminResumen(deps.root, deps.getApi);
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || "No se pudo purgar la sala.", "error");
  }
}
async function handleRevokeSessions(deps, userId, handle) {
  if (!confirmAction("\xBFRevocar todas las sesiones de @" + handle + "?")) return;
  try {
    const data = await deps.getApi().adminRevokeSessions(userId);
    deps.toast("Sesiones revocadas: " + String(data.revoked ?? 0), "success");
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || "No se pudieron revocar sesiones.", "error");
  }
}
async function handlePromoteUser(deps, userId, handle, btn) {
  const row = btn.closest(".cloud-sync-admin-row-actions");
  const sel = row?.querySelector("[data-admin-promote-role]");
  const role = sel instanceof HTMLSelectElement ? sel.value : "admin";
  if (!confirmAction("\xBFCambiar rol de @" + handle + " a " + fmtRole(role) + "?")) return;
  try {
    await deps.getApi().adminPromote(userId, role);
    deps.toast("Rol actualizado.", "success");
    void loadAdminUsers(deps.root, deps.getApi);
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || "No se pudo cambiar el rol.", "error");
  }
}
async function handleResetPassword(deps, userId, handle) {
  const temporaryPassword = await showAdminPromptModal({
    title: "Restablecer contrase\xF1a",
    message: "Contrase\xF1a temporal para @" + handle + " (m\xEDnimo 10 caracteres):",
    placeholder: "m\xEDnimo 10 caracteres",
    confirmLabel: "Restablecer",
    inputType: "password"
  });
  if (temporaryPassword === null) return;
  if (String(temporaryPassword).length < 10) {
    deps.toast("La contrase\xF1a debe tener al menos 10 caracteres.", "error");
    return;
  }
  const rotateRecovery = confirmAction(
    "\xBFRotar tambi\xE9n el c\xF3digo de recuperaci\xF3n? El anterior dejar\xE1 de funcionar."
  );
  try {
    const data = await deps.getApi().adminResetPassword(userId, {
      temporaryPassword,
      rotateRecovery
    });
    deps.toast("Contrase\xF1a restablecida.", "success");
    if (data?.recoveryCode) await showRecoveryCodeModal({ code: data.recoveryCode });
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || "No se pudo restablecer la contrase\xF1a.", "error");
  }
}
async function handleDisableUser(deps, userId, handle) {
  if (!confirmAction("\xBFDeshabilitar @" + handle + " y revocar sus sesiones?")) return;
  try {
    await deps.getApi().adminDisable(userId);
    deps.toast("Usuario deshabilitado.", "success");
    void loadAdminUsers(deps.root, deps.getApi);
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || "No se pudo deshabilitar.", "error");
  }
}
async function handleDeleteUser(deps, userId, handle) {
  if (!confirmAction(
    "\xBFEliminar a @" + handle + " de la nube?\n\nSi es due\xF1o de una sala con otros miembros, el due\xF1o pasa a otro. Si queda sola, se purga esa sala."
  )) {
    return;
  }
  try {
    await deps.getApi().adminDeleteUser(userId);
    deps.toast("Usuario eliminado.", "success");
    void loadAdminUsers(deps.root, deps.getApi);
    void loadAdminResumen(deps.root, deps.getApi);
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || "No se pudo eliminar.", "error");
  }
}

// public/js/features/cloud-sync/panel-admin.mjs
function canAccessCloudAdmin(user, opts = {}) {
  if (opts.hasCloudSession) return true;
  if (!user) return false;
  return hasProgramAdminPrivileges(user) || effectiveClinicalRank(user) === "R4";
}
function shouldShowAdminBootstrap() {
  return !getSessionAdminKey();
}
function selectAdminTab(root, tabId) {
  const next = String(tabId || "resumen").trim() || "resumen";
  root.querySelectorAll("[data-admin-tab]").forEach(function(btn) {
    const active = btn.getAttribute("data-admin-tab") === next;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
  root.querySelectorAll("[data-admin-section]").forEach(function(panel) {
    panel.hidden = panel.getAttribute("data-admin-section") !== next;
  });
}
function mountCloudAdminPanel(host, deps) {
  const toast = deps.toast || function() {
  };
  const roomsCache = [];
  let openRoomDetailId = null;
  const root = document.createElement("div");
  root.className = "cloud-sync-admin";
  root.innerHTML = buildAdminShellHtml(shouldShowAdminBootstrap());
  host.appendChild(root);
  const keyInput = root.querySelector("[data-admin-key-input]");
  const savedKey = getSessionAdminKey();
  if (keyInput instanceof HTMLInputElement && savedKey) {
    keyInput.value = savedKey;
  }
  const peligroEl = root.querySelector("[data-admin-peligro]");
  if (peligroEl) peligroEl.innerHTML = peligroHtml();
  const mutEl = root.querySelector("[data-admin-mutaciones]");
  if (mutEl) mutEl.innerHTML = mutacionesShellHtml();
  const usersEl = root.querySelector("[data-admin-usuarios]");
  if (usersEl) usersEl.innerHTML = usuariosShellHtml();
  function updateRoomSelects() {
    const prevMut = (() => {
      const sel = root.querySelector("[data-admin-mutations-room]");
      return sel instanceof HTMLSelectElement ? sel.value : "";
    })();
    const prevPel = (() => {
      const sel = root.querySelector("[data-admin-peligro-room]");
      return sel instanceof HTMLSelectElement ? sel.value : "";
    })();
    const opts = mutationsRoomOptionsHtml(roomsCache);
    root.querySelectorAll("[data-admin-mutations-room], [data-admin-peligro-room]").forEach(function(el) {
      if (!(el instanceof HTMLSelectElement)) return;
      const keep = el.hasAttribute("data-admin-mutations-room") ? prevMut : prevPel;
      el.innerHTML = opts;
      if (keep) el.value = keep;
    });
  }
  const clickDeps = {
    root,
    getApi: deps.getApi,
    toast,
    roomsCache,
    get openRoomDetailId() {
      return openRoomDetailId;
    },
    setOpenRoomDetailId(id) {
      openRoomDetailId = id;
    },
    updateMutacionesRoomSelect: updateRoomSelects
  };
  const onAdminAction = createAdminClickHandler(clickDeps);
  root.addEventListener("click", function(ev) {
    const tabBtn = ev.target instanceof Element ? ev.target.closest("[data-admin-tab]") : null;
    if (tabBtn) {
      const tabId = tabBtn.getAttribute("data-admin-tab");
      if (tabId) selectAdminTab(root, tabId);
      return;
    }
    onAdminAction(ev);
  });
  const salasCtx = {
    roomsCache,
    get openRoomDetailId() {
      return openRoomDetailId;
    },
    updateMutacionesRoomSelect: updateRoomSelects,
    loadRoomDetail: () => Promise.resolve()
  };
  selectAdminTab(root, "resumen");
  void loadAdminResumen(root, deps.getApi);
  void loadAdminSalas(root, deps.getApi, salasCtx);
  return {
    root,
    refresh() {
      void loadAdminResumen(root, deps.getApi);
      void loadAdminSalas(root, deps.getApi, salasCtx);
    }
  };
}

export {
  shouldEnforceTeamPatientMirror,
  shouldFilterPatientsByJoinedTeam,
  hasProgramAdminPrivileges,
  effectiveClinicalRank,
  canConfigureRotation,
  canManageInternoQr,
  hasElevatedTeamPrivileges,
  shouldUseElevatedPatientCensus,
  shouldShowClinicalCensusFilters,
  canViewLanUserDirectory,
  canManageTeamRoster,
  canDeleteLanDirectoryUser,
  formatProgressLine,
  sanitizeUpdaterUserMessage,
  getSessionAdminKey,
  setSessionAdminKey,
  canAccessCloudAdmin,
  mountCloudAdminPanel
};
//# sourceMappingURL=/js/chunks/chunk-NW6K73WP.js.map
