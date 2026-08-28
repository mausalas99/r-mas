import {
  STACKED_BACKDROP_CLASS,
  showRecoveryCodeModal
} from "/mobile/js/chunks/chunk-YR5I2T5V.js";
import {
  rewrapRoomDekForNewCode
} from "/mobile/js/chunks/chunk-PVAHDYTI.js";
import {
  formatBytes
} from "/mobile/js/chunks/chunk-AIC37VNN.js";
import {
  showConfirmDialog
} from "/mobile/js/chunks/chunk-CBI7THZ4.js";
import {
  CLINICAL_SALAS,
  clinicalUserActivityHistoryEntries,
  clinicalUserActivityTier,
  effectiveClinicalRank,
  formatClinicalUserActivityBadge,
  formatClinicalUserActivityHistory,
  formatClinicalUserLastActivity,
  formatCycleOptionLabel,
  hasProgramAdminPrivileges,
  publishClinicalTeamsAfterChange,
  resolveUserPlacement
} from "/mobile/js/chunks/chunk-6J2G5HNR.js";
import {
  normalizeUsername
} from "/mobile/js/chunks/chunk-7TJEM4JY.js";
import {
  esc,
  escAttr
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import {
  clinicalServiceForSala,
  getCycleLetterOptionsForRank,
  resolveMembershipCycleForUser
} from "/mobile/js/chunks/chunk-K5SBVD6P.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-A7GKLJFV.js";

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
  return showConfirmDialog({
    id: "cloud-sync-admin-confirm",
    title: "Confirmar acci\xF3n",
    question: message,
    confirmLabel: "Continuar",
    cancelLabel: "Cancelar"
  });
}
function adminTableHtml(rows, cols, opts = {}) {
  if (!rows.length) {
    return opts.emptyHtml || '<p class="cloud-sync-hint">Sin registros.</p>';
  }
  const head = cols.map((c) => "<th>" + esc(c.label) + "</th>").join("");
  const body = rows.map((row) => {
    const tds = cols.map((c) => "<td>" + (c.cell ? c.cell(row) : esc(String(row[c.key] ?? ""))) + "</td>").join("");
    return "<tr>" + tds + "</tr>";
  }).join("");
  return '<div class="cloud-sync-admin-table-wrap"><table class="cloud-sync-admin-table"><thead><tr>' + head + "</tr></thead><tbody>" + body + "</tbody></table></div>";
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
  // Equipos + cuentas Nube (antes pestaña Usuarios) en un solo panel.
  { id: "equipos", label: "Usuarios" },
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
function userActionsHtml(user) {
  const id = esc(String(user.id));
  const handle = esc(String(user.username || ""));
  return '<details class="cloud-sync-admin-equipos-nube"><summary class="cloud-sync-admin-equipos-nube-summary">Nube</summary><div class="cloud-sync-admin-row-actions cloud-sync-admin-row-actions--compact"><button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="revoke-sessions" data-user-id="' + id + '" data-user-handle="' + handle + '">Revocar</button><select class="profile-input cloud-sync-admin-role-select" data-admin-promote-role data-user-id="' + id + '" title="Rol Nube" aria-label="Rol Nube"><option value="admin">Admin</option><option value="program_admin">Admin programa</option><option value="member" selected>Miembro</option></select><button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="promote-user" data-user-id="' + id + '" data-user-handle="' + handle + '">Rol</button><button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="disable-user" data-user-id="' + id + '" data-user-handle="' + handle + '">Deshabilitar</button><button type="button" class="cloud-sync-btn cloud-sync-btn--danger cloud-sync-btn--compact" data-admin-action="delete-user" data-user-id="' + id + '" data-user-handle="' + handle + '">Eliminar Nube</button></div></details>';
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
    { label: "#Ops", key: "opCount" },
    {
      label: "Tama\xF1o",
      cell: (m) => {
        const total = Number(m.totalBytes);
        const maxB = Number(m.maxOpBytes);
        if (!Number.isFinite(total) && !Number.isFinite(maxB)) return "\u2014";
        const parts = [];
        if (Number.isFinite(total)) parts.push(String(Math.round(total / 1024)) + " KB");
        if (Number.isFinite(maxB)) parts.push("max " + String(Math.round(maxB / 1024)) + " KB");
        return esc(parts.join(" \xB7 "));
      }
    },
    {
      label: "Path max",
      cell: (m) => esc(String(m.maxOpPath || "\u2014"))
    },
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
  return '<div class="cloud-sync-admin-danger"><p class="cloud-sync-hint">Solo afecta datos en la nube del piloto (D1). Lo local en cada Mac no se borra.</p><section class="cloud-sync-admin-danger-card"><h5 class="cloud-sync-admin-danger-title">Purgar sala</h5><p class="cloud-sync-hint">Elimina miembros, mutaciones, estado y la sala.</p><div class="cloud-sync-admin-toolbar"><label class="cloud-sync-admin-toolbar-label" for="cloud-admin-peligro-room">Sala</label><select id="cloud-admin-peligro-room" class="profile-input" data-admin-peligro-room><option value="">\u2014 Elige una sala \u2014</option></select><button type="button" class="cloud-sync-btn cloud-sync-btn--danger" data-admin-action="purge-room-selected">Purgar</button></div></section><section class="cloud-sync-admin-danger-card"><h5 class="cloud-sync-admin-danger-title">Usuarios</h5><p class="cloud-sync-hint">Revocar sesiones, deshabilitar o borrar cuentas (pesta\xF1a Usuarios).</p><button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-tab="equipos">Ir a Usuarios</button></section></div>';
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
  return '<div class="' + STACKED_BACKDROP_CLASS + '" data-admin-prompt-modal><div class="lab-conflict-modal cloud-sync-admin-prompt-modal" role="dialog" aria-modal="true"><h3 style="margin:0 0 10px;">' + esc(opts.title) + '</h3><p style="font-size:13px;line-height:1.45;margin:0 0 14px;color:var(--text-muted);white-space:pre-wrap;">' + esc(opts.message) + '</p><input type="' + esc(opts.inputType) + '" class="profile-input" data-admin-prompt-input autocomplete="off" spellcheck="false" placeholder="' + esc(opts.placeholder) + '" style="width:100%;margin:0 0 16px;" /><div style="display:flex;justify-content:flex-end;gap:8px;"><button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-prompt-cancel>Cancelar</button><button type="button" class="cloud-sync-btn" data-admin-prompt-ok>' + esc(opts.confirmLabel) + "</button></div></div></div>";
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

// public/js/features/cloud-sync/panel-admin-equipos-history-modal.mjs
function equiposActivityHistoryListHtml(history, maxPoints = 999) {
  const { entries, more } = clinicalUserActivityHistoryEntries(history, maxPoints);
  if (!entries.length) {
    return '<p class="cloud-sync-equipos-history-empty">Sin actividad registrada.</p>';
  }
  const items = entries.map((ev) => {
    const timeHtml = ev.atLabel ? '<time class="cloud-sync-admin-equipos-history-at" datetime="' + esc(ev.at) + '">' + esc(ev.atLabel) + "</time>" : "";
    return '<li class="cloud-sync-admin-equipos-history-item"><span class="cloud-sync-admin-equipos-history-source">' + esc(ev.source) + "</span>" + timeHtml + "</li>";
  }).join("");
  const moreHtml = more ? '<li class="cloud-sync-admin-equipos-history-more">+' + more + " m\xE1s en el servidor</li>" : "";
  return '<ul class="cloud-sync-admin-equipos-history-list cloud-sync-equipos-history-modal-list">' + items + moreHtml + "</ul>";
}
function equiposActivityHistoryModalMarkup(opts) {
  const handle = String(opts?.handle || "").trim();
  const displayName = String(opts?.displayName || "").trim();
  const subtitle = displayName ? "@" + handle + " \xB7 " + displayName : "@" + handle;
  return '<div class="' + STACKED_BACKDROP_CLASS + '" data-equipos-activity-history-modal><div class="lab-conflict-modal cloud-sync-equipos-history-modal material-glass ui-overlay-dialog" role="dialog" aria-modal="true" aria-labelledby="equipos-activity-history-title"><div class="cloud-sync-equipos-history-modal-head"><h3 id="equipos-activity-history-title">Historial de actividad</h3><p class="cloud-sync-equipos-history-modal-sub">' + esc(subtitle) + "</p></div>" + equiposActivityHistoryListHtml(opts?.history) + '<div class="cloud-sync-equipos-history-modal-foot"><button type="button" class="cloud-sync-btn" data-equipos-history-close>Cerrar</button></div></div></div>';
}
function showEquiposActivityHistoryModal(opts) {
  const host = document.createElement("div");
  host.innerHTML = equiposActivityHistoryModalMarkup(opts);
  const overlay = host.firstElementChild;
  if (!(overlay instanceof HTMLElement)) return;
  document.body.appendChild(overlay);
  wireEquiposActivityHistoryModal(overlay);
}
function wireEquiposActivityHistoryModal(overlay) {
  function close() {
    overlay.remove();
    document.removeEventListener("keydown", onKeydown);
  }
  function onKeydown(ev) {
    if (ev.key === "Escape") {
      ev.preventDefault();
      close();
    }
  }
  overlay.querySelector("[data-equipos-history-close]")?.addEventListener("click", close);
  overlay.addEventListener("click", function(ev) {
    if (ev.target === overlay) close();
  });
  document.addEventListener("keydown", onKeydown);
}
function equiposRowHistoryButtonHtml(handle, displayName, history) {
  const list = Array.isArray(history) ? history : [];
  const { total } = clinicalUserActivityHistoryEntries(list, 1);
  if (!total) return "";
  return '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact cloud-sync-admin-equipos-history-btn" data-admin-action="equipos-activity-history" data-equipos-handle="' + escAttr(handle) + '" data-equipos-display="' + escAttr(displayName) + '" data-equipos-history="' + escAttr(JSON.stringify(list)) + '">Historial<span class="cloud-sync-admin-equipos-history-count">' + total + "</span></button>";
}
function openEquiposActivityHistoryFromButton(btn) {
  const historyRaw = btn.getAttribute("data-equipos-history");
  let history = [];
  if (historyRaw) {
    try {
      const parsed = JSON.parse(historyRaw);
      if (Array.isArray(parsed)) history = parsed;
    } catch {
      history = [];
    }
  }
  showEquiposActivityHistoryModal({
    handle: btn.getAttribute("data-equipos-handle") || "",
    displayName: btn.getAttribute("data-equipos-display") || "",
    history
  });
  return true;
}

// public/js/features/cloud-sync/panel-admin-equipos-html-fields.mjs
var CLINICAL_RANK_OPTIONS = ["R1", "R2", "R3", "R4", "Admin"];
function rankSelectOptionsHtml(selectedRank) {
  const selected = String(selectedRank || "R1");
  return CLINICAL_RANK_OPTIONS.map((rank) => {
    const sel = rank === selected ? " selected" : "";
    return '<option value="' + esc(rank) + '"' + sel + ">" + esc(rank) + "</option>";
  }).join("");
}
function userSalaSelectOptionsHtml(selectedSala) {
  const selected = String(selectedSala || "").trim();
  const blank = selected ? "" : " selected";
  return '<option value=""' + blank + ">\u2014 Elegir \u2014</option>" + CLINICAL_SALAS.map((sala) => {
    const sel = sala === selected ? " selected" : "";
    return '<option value="' + esc(sala) + '"' + sel + ">" + esc(sala) + "</option>";
  }).join("");
}
function teamsForAssignOptions(all, selected, sala) {
  let list = sala ? all.filter((t) => String(t?.sala || "").trim() === sala) : all.slice();
  if (!sala || !selected) return list;
  const selectedTeam = all.find((t) => String(t?.team_id || "") === selected);
  if (selectedTeam && !list.some((t) => String(t?.team_id || "") === selected)) {
    return [selectedTeam, ...list];
  }
  return list;
}
function groupTeamsBySala(list) {
  const bySala = /* @__PURE__ */ new Map();
  for (const team of list) {
    const teamSala = String(team?.sala || "").trim() || "Sin sala";
    if (!bySala.has(teamSala)) bySala.set(teamSala, []);
    bySala.get(teamSala).push(team);
  }
  return bySala;
}
function renderTeamOptgroupHtml(sala, rows, selected) {
  const sorted = rows.slice().sort((a, b) => {
    const ca = String(a.sub_area_fraction || "").localeCompare(String(b.sub_area_fraction || ""), "es");
    if (ca) return ca;
    return String(a.name || "").localeCompare(String(b.name || ""), "es");
  });
  const opts = sorted.map((team) => {
    const id = esc(String(team.team_id || ""));
    const cycle = String(team.sub_area_fraction || "").trim();
    const label = esc(String(team.name || "Equipo").trim()) + (cycle ? " \xB7 " + esc(cycle) : "") + " (" + (Array.isArray(team.members) ? team.members.length : 0) + ")";
    const isSelected = selected && id === selected ? " selected" : "";
    return '<option value="' + id + '"' + isSelected + ">" + label + "</option>";
  }).join("");
  return '<optgroup label="' + esc(sala) + '">' + opts + "</optgroup>";
}
function renderEquiposAssignTeamOptionsHtml(teams, selectedTeamId, salaFilter) {
  const all = Array.isArray(teams) ? teams : [];
  const selected = String(selectedTeamId || "").trim();
  const sala = String(salaFilter || "").trim();
  const list = teamsForAssignOptions(all, selected, sala);
  if (!list.length) {
    return sala ? '<option value="">Sin equipos en esta sala</option>' : '<option value="">Sin equipos</option>';
  }
  const bySala = groupTeamsBySala(list);
  const salaOrder = [
    ...CLINICAL_SALAS.filter((s) => bySala.has(s)),
    ...[...bySala.keys()].filter((s) => !CLINICAL_SALAS.includes(s)).sort((a, b) => a.localeCompare(b, "es"))
  ];
  const groups = salaOrder.map((salaKey) => renderTeamOptgroupHtml(salaKey, bySala.get(salaKey) || [], selected)).join("");
  return '<option value="">Sin asignar</option>' + groups;
}
function cycleOptionsForTeam(team, userId, userRank, selectedCycle) {
  if (!team) return '<option value="">Ciclo</option>';
  const service = String(team.service || "Sala");
  const rank = String(userRank || "R1");
  const letters = getCycleLetterOptionsForRank(service, rank);
  const defaultCycle = resolveMembershipCycleForUser(team, userId, rank);
  const selected = String(selectedCycle || "").trim() || defaultCycle;
  if (!letters.length) return '<option value="">Ciclo</option>';
  return letters.map((letter) => {
    const label = formatCycleOptionLabel(letter, rank);
    const sel = letter === selected ? " selected" : "";
    return '<option value="' + esc(letter) + '"' + sel + ">" + esc(label) + "</option>";
  }).join("");
}

// public/js/features/cloud-sync/panel-admin-equipos-row-html.mjs
function equiposRowActivityParts(row) {
  const activityIso = String(row.last_activity_at || "");
  const activityTier = clinicalUserActivityTier(activityIso);
  const activityHas = activityTier === "unknown" ? "none" : "has";
  const activityBadgeText = formatClinicalUserActivityBadge(activityIso);
  const historyText = formatClinicalUserActivityHistory(row.activity_history);
  return { activityIso, activityTier, activityHas, activityBadgeText, historyText };
}
function equiposRowActivityBadgeHtml(parts) {
  const activityTitle = esc(
    [formatClinicalUserLastActivity(parts.activityIso), parts.historyText].filter(Boolean).join(" | ")
  );
  return '<span class="cloud-sync-admin-equipos-activity cloud-sync-admin-equipos-activity--' + esc(parts.activityTier) + '" title="' + activityTitle + '">' + esc(parts.activityBadgeText) + "</span>";
}
function equiposRowHistoryLineHtml(handle, displayName, history) {
  return equiposRowHistoryButtonHtml(handle, displayName, history);
}
function equiposRowPendingBadgeHtml(row) {
  if (!row.hasLocalProfile) {
    return '<span class="cloud-sync-admin-badge cloud-sync-admin-equipos-pending" title="Se crear\xE1 perfil cl\xEDnico al asignar">Nuevo</span>';
  }
  if (row.clinicalOnly) {
    return '<span class="cloud-sync-admin-badge" title="Solo en base cl\xEDnica (sin cuenta Nube)">Solo cl\xEDnico</span>';
  }
  return "";
}
function equiposRowSearchHaystack(row, parts, placement) {
  return esc(
    [
      row.username,
      row.clinical_name,
      row.rank,
      row.sala,
      placement?.teamName,
      parts.activityBadgeText,
      parts.historyText,
      parts.activityHas === "has" ? "con actividad" : "sin actividad",
      row.clinicalOnly ? "clinico test" : ""
    ].map((p) => String(p || "").trim()).filter(Boolean).join(" ").toLowerCase()
  );
}
function equiposRowPurgeBtnHtml(userId, cloudId, handle) {
  if (!userId && !cloudId) return "";
  const title = cloudId && !userId ? "Eliminar cuenta Nube (sin perfil cl\xEDnico local)" : "Quitar del equipo / base cl\xEDnica" + (cloudId ? " y cuenta Nube" : "");
  return '<button type="button" class="cloud-sync-btn cloud-sync-btn--danger cloud-sync-btn--compact cloud-sync-admin-equipos-quit" data-admin-action="purge-equipo-user" data-user-id="' + esc(userId) + '" data-cloud-id="' + esc(cloudId) + '" data-cloud-username="' + esc(handle) + '" title="' + title + '">Quitar</button>';
}
function equiposRowResetPasswordBtnHtml(cloudId, handle) {
  if (!cloudId) return "";
  return '<button type="button" class="cloud-sync-btn cloud-sync-btn--compact cloud-sync-admin-equipos-reset" data-admin-action="reset-password" data-user-id="' + esc(cloudId) + '" data-user-handle="' + esc(handle) + '" title="Definir contrase\xF1a temporal de Nube">Restablecer clave</button>';
}
function equiposRowActionBtnsHtml(resetPasswordBtn, purgeBtn) {
  if (!resetPasswordBtn && !purgeBtn) return "";
  return '<div class="cloud-sync-admin-equipos-row-btns" role="group" aria-label="Acciones">' + resetPasswordBtn + purgeBtn + "</div>";
}
function equiposRowAssignFieldsHtml(row, userRank, placement, teams) {
  const teamOptions = renderEquiposAssignTeamOptionsHtml(
    teams,
    placement?.teamId,
    String(row.sala || "").trim()
  );
  const team = placement?.teamId ? teams.find((t) => String(t.team_id) === String(placement.teamId)) : null;
  const cycleOptions = cycleOptionsForTeam(team, String(row.user_id || "").trim(), userRank, placement?.cycle);
  return '<div class="cloud-sync-admin-equipos-assign"><label class="cloud-sync-admin-equipos-field"><span class="cloud-sync-admin-equipos-field-label">Sala</span><select class="profile-input cloud-sync-admin-equipos-user-sala" aria-label="Sala">' + userSalaSelectOptionsHtml(String(row.sala || "")) + '</select></label><label class="cloud-sync-admin-equipos-field cloud-sync-admin-equipos-field--rank"><span class="cloud-sync-admin-equipos-field-label">Rango</span><select class="profile-input cloud-sync-admin-equipos-rank" aria-label="Rango">' + rankSelectOptionsHtml(userRank) + '</select></label><label class="cloud-sync-admin-equipos-field cloud-sync-admin-equipos-field--team"><span class="cloud-sync-admin-equipos-field-label">Equipo</span><select class="profile-input cloud-sync-admin-equipos-team" aria-label="Equipo">' + teamOptions + '</select></label><label class="cloud-sync-admin-equipos-field"><span class="cloud-sync-admin-equipos-field-label">Ciclo</span><select class="profile-input cloud-sync-admin-equipos-cycle" aria-label="Ciclo"' + (placement?.teamId ? "" : " disabled") + ">" + cycleOptions + "</select></label></div>";
}
function equiposRowPlacementLabelHtml(placement, userRank) {
  if (!placement?.teamId) {
    return '<span class="cloud-sync-admin-equipos-unassigned">Sin equipo</span>';
  }
  return esc(
    [placement.teamName, placement.cycle ? formatCycleOptionLabel(placement.cycle, userRank) : ""].filter(Boolean).join(" \xB7 ")
  );
}
function equiposRowArticleOpenHtml(row, userId, userRank, handle, placement, activity) {
  const cloudId = String(row.cloudId || "").trim();
  return '<article class="cloud-sync-admin-equipos-row" data-user-id="' + esc(userId) + '" data-cloud-id="' + esc(cloudId) + '" data-cloud-username="' + esc(handle) + '" data-cloud-display="' + esc(String(row.clinical_name || "")) + '" data-user-rank="' + esc(userRank) + '" data-sala="' + esc(String(row.sala || "")) + '" data-has-team="' + (placement?.teamId ? "1" : "0") + '" data-activity="' + esc(activity.activityHas) + '" data-search="' + equiposRowSearchHaystack(row, activity, placement) + '">';
}
function equiposRowMainSectionHtml(handle, name, row, activity, placementLabel) {
  return '<div class="cloud-sync-admin-equipos-row-main"><label class="cloud-sync-admin-equipos-check-label" title="Incluir en Guardar seleccionados"><input type="checkbox" class="cloud-sync-admin-equipos-check" data-admin-equipos-select /></label><span class="cloud-sync-admin-equipos-handle">@' + esc(handle) + "</span> " + equiposRowActivityBadgeHtml(activity) + " " + equiposRowPendingBadgeHtml(row) + '<span class="cloud-sync-admin-equipos-name">' + name + '</span><span class="cloud-sync-admin-equipos-placement">' + placementLabel + "</span>" + equiposRowHistoryLineHtml(handle, String(row.clinical_name || "").trim(), row.activity_history) + "</div>";
}
function equiposRowNubeWrapHtml(cloudId, handle) {
  if (!cloudId) return "";
  const nubeActions = userActionsHtml({ id: cloudId, username: handle });
  return '<div class="cloud-sync-admin-equipos-nube-wrap">' + nubeActions + "</div>";
}
function renderEquiposUserRow(row, teams) {
  const userId = String(row.user_id || "").trim();
  const userRank = String(row.rank || "R1");
  const handle = normalizeUsername(row.username || "");
  const name = esc(String(row.clinical_name || "").trim() || "Sin nombre");
  const placement = userId ? resolveUserPlacement(userId, teams) : null;
  const activity = equiposRowActivityParts(row);
  const cloudId = String(row.cloudId || "").trim();
  const resetPasswordBtn = equiposRowResetPasswordBtnHtml(cloudId, handle);
  const purgeBtn = equiposRowPurgeBtnHtml(userId, cloudId, handle);
  return equiposRowArticleOpenHtml(row, userId, userRank, handle, placement, activity) + equiposRowMainSectionHtml(
    handle,
    name,
    row,
    activity,
    equiposRowPlacementLabelHtml(placement, userRank)
  ) + equiposRowAssignFieldsHtml(row, userRank, placement, teams) + equiposRowActionBtnsHtml(resetPasswordBtn, purgeBtn) + equiposRowNubeWrapHtml(cloudId, handle) + "</article>";
}

// public/js/features/cloud-sync/panel-admin-equipos-html.mjs
function equiposShellHtml() {
  return '<div class="cloud-sync-admin-panel-head"><button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="refresh-equipos">Actualizar</button><button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="seed-agosto-2026-equipos" title="Censo agosto 2026">Equipos ago 2026</button></div><p class="cloud-sync-hint cloud-sync-admin-equipos-hint">Usuarios cl\xEDnicos + cuenta Nube. Marca \u2192 Sala / rango / equipo / ciclo \u2192 <strong>Guardar</strong> o <strong>Quitar seleccionados</strong>. En filas con Nube usa <strong>Restablecer clave</strong>; abre <strong>Nube</strong> para rol y sesiones. Los filtros no quitan las marcas.</p><div class="cloud-sync-admin-toolbar cloud-sync-admin-equipos-toolbar"><input type="search" class="profile-input" data-admin-equipos-search placeholder="Buscar @usuario o nombre" /><label class="cloud-sync-admin-toolbar-label" for="cloud-admin-equipos-sala">Sala</label><select id="cloud-admin-equipos-sala" class="profile-input" data-admin-equipos-sala><option value="">Todas</option></select><label class="cloud-sync-admin-toolbar-label" for="cloud-admin-equipos-activity">Uso</label><select id="cloud-admin-equipos-activity" class="profile-input" data-admin-equipos-activity><option value="all" selected>Todos</option><option value="has">Con \xFAltima actividad</option><option value="none">Sin \xFAltima actividad</option></select><label class="cloud-sync-admin-toolbar-label" for="cloud-admin-equipos-team-status">Equipo</label><select id="cloud-admin-equipos-team-status" class="profile-input" data-admin-equipos-team-status><option value="all" selected>Todos</option><option value="unassigned">Sin equipo</option><option value="assigned">Con equipo</option></select></div><p class="cloud-sync-hint cloud-sync-admin-equipos-summary" data-admin-equipos-summary title="Usuarios = filas de esta lista (perfil cl\xEDnico + cuenta Nube). Cuentas Nube = @usuarios \xFAnicos. Membres\xEDas = inscripciones en salas de sync (un usuario en varias salas cuenta varias veces).">Cargando resumen\u2026</p><div class="cloud-sync-admin-equipos-bulk"><label class="cloud-sync-admin-equipos-select-all-label"><input type="checkbox" class="cloud-sync-admin-equipos-check" data-admin-equipos-select-all /> Seleccionar visibles</label><button type="button" class="cloud-sync-btn cloud-sync-btn--primary cloud-sync-btn--compact" data-admin-action="save-equipos-bulk">Guardar seleccionados</button><button type="button" class="cloud-sync-btn cloud-sync-btn--danger cloud-sync-btn--compact" data-admin-action="purge-equipos-bulk" title="Elimina cuentas Nube y/o perfiles cl\xEDnicos de los marcados">Quitar seleccionados</button></div><div data-admin-equipos-list><p class="cloud-sync-hint">Cargando usuarios y equipos\u2026</p></div>';
}
function equiposSalaOptionsHtml(salas) {
  const opts = (salas || []).map((s) => '<option value="' + esc(String(s)) + '">' + esc(String(s)) + "</option>").join("");
  return '<option value="">Todas las salas</option>' + opts;
}
function equiposListHtml(rows, teams) {
  if (!rows.length) {
    return '<p class="cloud-sync-hint">No hay usuarios Nube ni perfiles cl\xEDnicos locales para asignar.</p>';
  }
  const cards = rows.map((row) => renderEquiposUserRow(row, teams)).join("");
  return '<div class="cloud-sync-admin-equipos-list">' + cards + "</div>";
}

// public/js/features/cloud-sync/panel-admin-equipos-merge.mjs
function equiposActivityFields(clinical) {
  return {
    last_activity_at: clinical?.last_activity_at ? String(clinical.last_activity_at) : "",
    created_at: clinical?.created_at ? String(clinical.created_at) : "",
    activity_history: Array.isArray(clinical?.activity_history) ? clinical.activity_history : []
  };
}
function equiposClinicalFields(clinical, displayNameFallback) {
  return {
    clinical_name: String(clinical?.clinical_name || displayNameFallback || "").trim(),
    rank: String(clinical?.rank || "R1"),
    sala: String(clinical?.sala || "").trim(),
    ...equiposActivityFields(clinical)
  };
}
function clinicalByUsername(clinicalUsers) {
  const map = /* @__PURE__ */ new Map();
  for (const u of clinicalUsers || []) {
    const h = normalizeUsername(u?.username || "");
    if (h) map.set(h, u);
  }
  return map;
}
function buildEquiposRowFromCloud(cloud, clinical) {
  const handle = normalizeUsername(cloud.username || "");
  return {
    user_id: clinical?.user_id ? String(clinical.user_id) : "",
    username: handle,
    ...equiposClinicalFields(clinical, cloud.display_name),
    cloudId: String(cloud.id || ""),
    hasLocalProfile: Boolean(clinical?.user_id),
    clinicalOnly: false
  };
}
function buildEquiposRowFromClinicalOnly(clinical) {
  const handle = normalizeUsername(clinical?.username || "");
  return {
    user_id: String(clinical?.user_id || "").trim(),
    username: handle,
    ...equiposClinicalFields(clinical, ""),
    cloudId: "",
    hasLocalProfile: true,
    clinicalOnly: true
  };
}
function collectCloudEquiposRows(cloudUsers, byHandle, seen) {
  const rows = [];
  for (const cloud of cloudUsers || []) {
    if (!cloud || cloud.disabled) continue;
    const handle = normalizeUsername(cloud.username || "");
    if (!handle || seen.has(handle)) continue;
    seen.add(handle);
    rows.push(buildEquiposRowFromCloud(cloud, byHandle.get(handle)));
  }
  return rows;
}
function collectClinicalOnlyEquiposRows(clinicalUsers, seen) {
  const rows = [];
  for (const clinical of clinicalUsers || []) {
    const handle = normalizeUsername(clinical?.username || "");
    if (!handle || seen.has(handle)) continue;
    if (!String(clinical?.user_id || "").trim()) continue;
    seen.add(handle);
    rows.push(buildEquiposRowFromClinicalOnly(clinical));
  }
  return rows;
}
function mergeCloudUsersForEquipos(cloudUsers, clinicalUsers) {
  const byHandle = clinicalByUsername(clinicalUsers);
  const seen = /* @__PURE__ */ new Set();
  const rows = [
    ...collectCloudEquiposRows(cloudUsers, byHandle, seen),
    ...collectClinicalOnlyEquiposRows(clinicalUsers, seen)
  ];
  return rows.sort((a, b) => a.username.localeCompare(b.username, "es"));
}

// public/js/features/cloud-sync/panel-admin-equipos-filters.mjs
function rowSalaForFilter(row) {
  const sel = row.querySelector(".cloud-sync-admin-equipos-user-sala");
  if (sel instanceof HTMLSelectElement) return String(sel.value || "").trim();
  return String(row.getAttribute("data-sala") || "").trim();
}
function matchesEquiposSearch(hay, term) {
  return !term || hay.includes(term);
}
function matchesEquiposSala(rowSala, salaFilter) {
  if (!salaFilter) return true;
  return rowSala === salaFilter;
}
function matchesEquiposActivity(activityFlag, activity) {
  if (activity === "all") return true;
  if (activity === "has" || activity === "active") return activityFlag === "has";
  if (activity === "none" || activity === "inactive") return activityFlag !== "has";
  return true;
}
function matchesEquiposTeamStatus(hasTeam, teamStatus) {
  if (teamStatus === "all") return true;
  if (teamStatus === "unassigned") return !hasTeam;
  if (teamStatus === "assigned") return hasTeam;
  return true;
}
function rowMatchesEquiposFilters(row, opts) {
  const term = String(opts.q || "").trim().toLowerCase().replace(/^@+/, "");
  const salaFilter = String(opts.sala || "").trim();
  const activity = String(opts.activity || "all").trim() || "all";
  const teamStatus = String(opts.teamStatus || "all").trim() || "all";
  const hay = String(row.getAttribute("data-search") || "");
  const rowSala = rowSalaForFilter(row);
  const activityFlag = String(row.getAttribute("data-activity") || "none");
  const hasTeam = String(row.getAttribute("data-has-team") || "0") === "1";
  return matchesEquiposSearch(hay, term) && matchesEquiposSala(rowSala, salaFilter) && matchesEquiposActivity(activityFlag, activity) && matchesEquiposTeamStatus(hasTeam, teamStatus);
}
function applyEquiposClientFilters(host, opts = {}) {
  host.querySelectorAll(".cloud-sync-admin-equipos-row").forEach((row) => {
    if (!(row instanceof HTMLElement)) return;
    row.hidden = !rowMatchesEquiposFilters(row, opts);
  });
}

// public/js/features/cloud-sync/panel-admin-equipos-sort.mjs
function equiposAssignmentRank(userId, teams) {
  return userId && resolveUserPlacement(userId, teams) ? 1 : 0;
}
function equiposActivityRank(iso) {
  const ts = Date.parse(String(iso || "")) || 0;
  return { ts, has: ts > 0 ? 1 : 0 };
}
function compareEquiposRowsForAdmin(a, b, teams) {
  const assignDelta = equiposAssignmentRank(String(a.user_id || ""), teams) - equiposAssignmentRank(String(b.user_id || ""), teams);
  if (assignDelta) return assignDelta;
  const aAct = equiposActivityRank(a.last_activity_at);
  const bAct = equiposActivityRank(b.last_activity_at);
  if (aAct.has !== bAct.has) return aAct.has - bAct.has;
  if (aAct.ts !== bAct.ts) return bAct.ts - aAct.ts;
  return String(a.username || "").localeCompare(String(b.username || ""), "es");
}
function sortEquiposRowsForAdmin(rows, teams) {
  return (rows || []).slice().sort((a, b) => compareEquiposRowsForAdmin(a, b, teams));
}

// public/js/features/cloud-sync/panel-admin-equipos-summary.mjs
function equiposFilterSummaryText(opts = {}) {
  const visible = Number(opts.visible ?? 0);
  const total = Number(opts.total ?? 0);
  const salaFilter = String(opts.salaFilter || "").trim();
  const cloudUsers = opts.overview?.counts?.users;
  const cloudMembers = opts.overview?.counts?.members;
  const rooms = Array.isArray(opts.rooms) ? opts.rooms : [];
  const parts = [`Mostrando ${visible} de ${total} usuarios`];
  if (cloudUsers != null) {
    parts.push(`${cloudUsers} cuentas Nube`);
  }
  if (salaFilter) {
    const salaMembers = rooms.filter((room) => String(room.sala || "").trim() === salaFilter).reduce((sum, room) => sum + Number(room.memberCount || 0), 0);
    parts.push(`${salaMembers} membres\xEDas Nube en ${salaFilter}`);
  } else if (cloudMembers != null) {
    parts.push(`${cloudMembers} membres\xEDas Nube en salas`);
  }
  return parts.join(" \xB7 ");
}
function paintEquiposFilterSummary(root, opts) {
  const el = root.querySelector("[data-admin-equipos-summary]");
  if (!(el instanceof HTMLElement)) return;
  el.textContent = equiposFilterSummaryText(opts);
}
function countVisibleEquiposRows(host) {
  const rows = [...host.querySelectorAll(".cloud-sync-admin-equipos-row")].filter(
    (row) => row instanceof HTMLElement
  );
  return {
    visible: rows.filter((row) => !row.hidden).length,
    total: rows.length
  };
}

// public/js/features/cloud-sync/panel-admin-equipos-data.mjs
var equiposAdminMeta = { overview: null, rooms: [] };
function dbApi() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
function paintEquiposSalaSelect(root, teams) {
  const sel = root.querySelector("[data-admin-equipos-sala]");
  if (!(sel instanceof HTMLSelectElement)) return;
  const prev = sel.value;
  const fromTeams = [
    ...new Set((teams || []).map((t) => String(t.sala || "").trim()).filter(Boolean))
  ];
  const extras = fromTeams.filter((s) => !CLINICAL_SALAS.includes(s)).sort((a, b) => a.localeCompare(b, "es"));
  sel.innerHTML = equiposSalaOptionsHtml([...CLINICAL_SALAS, ...extras]);
  if (prev) sel.value = prev;
}
function applyEquiposFiltersFromToolbar(root) {
  const list = root.querySelector("[data-admin-equipos-list]");
  if (!list) return;
  const search = root.querySelector("[data-admin-equipos-search]");
  const salaSel = root.querySelector("[data-admin-equipos-sala]");
  const activitySel = root.querySelector("[data-admin-equipos-activity]");
  const teamSel = root.querySelector("[data-admin-equipos-team-status]");
  const sala = salaSel instanceof HTMLSelectElement ? salaSel.value : "";
  applyEquiposClientFilters(list, {
    q: search instanceof HTMLInputElement ? search.value : "",
    sala,
    activity: activitySel instanceof HTMLSelectElement ? activitySel.value : "all",
    teamStatus: teamSel instanceof HTMLSelectElement ? teamSel.value : "all"
  });
  const counts = countVisibleEquiposRows(list);
  paintEquiposFilterSummary(root, {
    ...counts,
    overview: equiposAdminMeta.overview,
    salaFilter: sala,
    rooms: equiposAdminMeta.rooms
  });
}
async function fetchEquiposAdminPayload(api, getApi) {
  const callerUserId = String(clinicalSessionContext.user?.user_id || "");
  const clinicalPromise = typeof api.dbClinicalUsersList === "function" ? api.dbClinicalUsersList({ callerUserId }) : Promise.resolve({ ok: true, users: [] });
  const [cloudRes, teamsRes, clinicalRes, overviewRes, roomsRes] = await Promise.all([
    getApi().adminUsers(""),
    api.dbClinicalTeamsList(),
    clinicalPromise,
    getApi().adminOverview().catch(() => null),
    getApi().adminRooms().catch(() => ({ rooms: [] }))
  ]);
  return {
    teams: teamsRes?.ok && Array.isArray(teamsRes.teams) ? teamsRes.teams : [],
    clinicalUsers: clinicalRes?.ok && Array.isArray(clinicalRes.users) ? clinicalRes.users : [],
    cloudUsers: cloudRes?.users || [],
    overview: overviewRes,
    rooms: roomsRes?.rooms || []
  };
}
function renderEquiposAdminList(root, payload) {
  equiposAdminMeta = {
    overview: payload.overview || null,
    rooms: Array.isArray(payload.rooms) ? payload.rooms : []
  };
  const rows = sortEquiposRowsForAdmin(
    mergeCloudUsersForEquipos(payload.cloudUsers, payload.clinicalUsers),
    payload.teams
  );
  paintEquiposSalaSelect(root, payload.teams);
  const list = root.querySelector("[data-admin-equipos-list]");
  if (!list) return rows;
  list.innerHTML = equiposListHtml(rows, payload.teams);
  applyEquiposFiltersFromToolbar(root);
  return rows;
}
async function loadAdminEquipos(root, getApi) {
  const list = root.querySelector("[data-admin-equipos-list]");
  if (!list) return;
  list.innerHTML = '<p class="cloud-sync-hint">Cargando\u2026</p>';
  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsList !== "function") {
    list.innerHTML = adminErrorHtml(
      "Asignar equipos requiere R+ de escritorio con base cl\xEDnica desbloqueada."
    );
    return;
  }
  try {
    const payload = await fetchEquiposAdminPayload(api, getApi);
    const rows = renderEquiposAdminList(root, payload);
    root.dispatchEvent(
      new CustomEvent("cloud-admin-equipos-loaded", {
        bubbles: true,
        detail: { teams: payload.teams, rows }
      })
    );
  } catch (err) {
    list.innerHTML = adminErrorHtml(
      err?.data?.message || err?.message || "No se pudieron cargar usuarios y equipos."
    );
  }
}

// public/js/features/cloud-sync/panel-admin-clinical-purge.mjs
function dbApi2() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
async function notifyTeamsAfterPurge() {
  try {
    await publishClinicalTeamsAfterChange({
      sala: clinicalSessionContext.user?.sala
    });
  } catch {
  }
}
function dispatchPurgeTeamsChanged() {
  if (typeof document === "undefined") return;
  document.dispatchEvent(
    new CustomEvent("rpc-clinical-teams-changed", {
      detail: { source: "cloud-admin-delete", sala: clinicalSessionContext.user?.sala }
    })
  );
}
async function purgeClinicalUserMatchingCloudHandle(handle) {
  const normalized = normalizeUsername(handle);
  if (!normalized) return { ok: false, reason: "no_handle" };
  const api = dbApi2();
  if (!api || typeof api.dbClinicalUserLookup !== "function" || typeof api.dbClinicalUserDelete !== "function") {
    return { ok: false, reason: "no_db" };
  }
  const looked = await api.dbClinicalUserLookup({ username: normalized });
  const targetUserId = String(looked?.user?.user_id || "").trim();
  if (!targetUserId) return { ok: false, reason: "not_local" };
  const callerUserId = String(clinicalSessionContext.user?.user_id || "");
  const res = await api.dbClinicalUserDelete({ targetUserId, callerUserId });
  if (!res?.ok) {
    return { ok: false, reason: String(res?.error || "delete_failed"), targetUserId };
  }
  await notifyTeamsAfterPurge();
  dispatchPurgeTeamsChanged();
  return { ok: true, targetUserId };
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
    "search-users": () => void loadAdminEquipos(deps.root, deps.getApi),
    "refresh-equipos": () => void deps.equiposPanel?.refresh(),
    "seed-agosto-2026-equipos": () => void deps.equiposPanel?.seedAgosto2026?.(),
    "save-equipos-bulk": () => void deps.equiposPanel?.handleBulkSave?.(),
    "purge-equipos-bulk": () => void deps.equiposPanel?.handleBulkPurge?.(),
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
function dispatchEquiposUserAction(action, btn, deps) {
  const equiposMap = {
    "assign-equipo": () => void deps.equiposPanel?.handleAssign(btn),
    "save-equipo-rank": () => void deps.equiposPanel?.handleSaveRank(btn),
    "purge-equipo-user": () => void deps.equiposPanel?.handlePurge(btn),
    "equipos-activity-history": () => openEquiposActivityHistoryFromButton(btn)
  };
  if (!action || !(action in equiposMap)) return false;
  equiposMap[action]();
  return true;
}
function dispatchUserAction(action, btn, deps) {
  if (dispatchEquiposUserAction(action, btn, deps)) return;
  const userId = btn.getAttribute("data-user-id");
  const handle = btn.getAttribute("data-user-handle") || "";
  const userMap = {
    "revoke-sessions": () => userId && void handleRevokeSessions(deps, userId, handle),
    "promote-user": () => userId && void handlePromoteUser(deps, userId, handle, btn),
    "reset-password": () => userId && void handleResetPassword(deps, userId, handle),
    "disable-user": () => userId && void handleDisableUser(deps, userId, handle),
    "delete-user": () => userId && void handleDeleteUser(deps, userId, handle)
  };
  if (action && action in userMap) userMap[action]();
}
async function handlePromoteSelf(deps) {
  try {
    const me = await deps.getApi().me();
    const userId = me?.user?.id;
    if (!userId) {
      deps.toast("Inicia sesi\xF3n en la nube primero.", "error");
      return;
    }
    if (!await confirmAction("\xBFPromover tu cuenta a admin en la nube?")) return;
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
  if (!await confirmAction("\xBFRotar el c\xF3digo de esta sala? Quienes tengan el c\xF3digo anterior no podr\xE1n unirse.")) return;
  try {
    const data = await deps.getApi().adminRotateCode(roomId);
    if (data.code) await rewrapRoomDekForNewCode(deps.getApi(), roomId, data.code);
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
  if (!await confirmAction("\xBFRevocar todas las sesiones de @" + handle + "?")) return;
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
  if (!await confirmAction("\xBFCambiar rol de @" + handle + " a " + fmtRole(role) + "?")) return;
  try {
    await deps.getApi().adminPromote(userId, role);
    deps.toast("Rol actualizado.", "success");
    void loadAdminEquipos(deps.root, deps.getApi);
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
  const rotateRecovery = await confirmAction(
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
  if (!await confirmAction("\xBFDeshabilitar @" + handle + " y revocar sus sesiones?")) return;
  try {
    await deps.getApi().adminDisable(userId);
    deps.toast("Usuario deshabilitado.", "success");
    void loadAdminEquipos(deps.root, deps.getApi);
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || "No se pudo deshabilitar.", "error");
  }
}
async function handleDeleteUser(deps, userId, handle) {
  if (!await confirmAction(
    "\xBFEliminar a @" + handle + " de la nube?\n\nTambi\xE9n se quitar\xE1 de los equipos cl\xEDnicos en esta Mac y se publicar\xE1 el cambio a la sala.\n\nSi es due\xF1o de una sala con otros miembros, el due\xF1o pasa a otro. Si queda sola, se purga esa sala."
  )) {
    return;
  }
  try {
    await deps.getApi().adminDeleteUser(userId);
    const purged = await purgeClinicalUserMatchingCloudHandle(handle);
    if (purged.ok) {
      deps.toast("Usuario eliminado de la nube y de los equipos cl\xEDnicos.", "success");
    } else if (purged.reason === "not_local") {
      deps.toast(
        "Usuario eliminado de la nube. No hab\xEDa perfil cl\xEDnico local con ese @usuario.",
        "info"
      );
    } else if (purged.reason === "no_db") {
      deps.toast(
        "Usuario eliminado de la nube. Abre R+ de escritorio para quitarlo tambi\xE9n de los equipos.",
        "warn"
      );
    } else {
      deps.toast(
        "Usuario eliminado de la nube, pero no se pudo quitar del equipo local: " + String(purged.reason || "error"),
        "warn"
      );
    }
    void loadAdminResumen(deps.root, deps.getApi);
    void loadAdminEquipos(deps.root, deps.getApi);
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || "No se pudo eliminar.", "error");
  }
}

// lib/clinical-rotation/agosto-2026-teams.mjs
var AGOSTO_2026_TEAMS = Object.freeze([
  { sala: "Sala 1", cycle: "A", name: "Dr. Adri\xE1n" },
  { sala: "Sala 1", cycle: "B", name: "Dra. Fernanda" },
  { sala: "Sala 1", cycle: "C", name: "Dra. Katiria" },
  { sala: "Sala 1", cycle: "D", name: "Dr. Ricardo" },
  { sala: "Sala 2", cycle: "A", name: "Dr. Christian" },
  { sala: "Sala 2", cycle: "B", name: "Dr. Ignacio" },
  { sala: "Sala 2", cycle: "C", name: "Dra. Leslie" },
  { sala: "Sala 2", cycle: "D", name: "Dra. Mariana" },
  { sala: "Sala E", cycle: "A", name: "Dr. Eduardo" },
  { sala: "Sala E", cycle: "B", name: "Dr. Oscar" },
  { sala: "Sala E", cycle: "C", name: "Dr. Jin" },
  { sala: "Sala E", cycle: "D", name: "Dra. Marisol" },
  { sala: "Torre HU", cycle: "A", name: "Dr. Diego" },
  { sala: "Torre HU", cycle: "B", name: "Dra. M\xF3nica" },
  { sala: "Torre HU", cycle: "C", name: "Dr. Juan" },
  { sala: "Torre HU", cycle: "D", name: "Dra. Valeria" },
  { sala: "Interconsultas", cycle: "A", name: "Dra. Astrid/Arturo" },
  { sala: "Interconsultas", cycle: "B", name: "Dr. Axel/Daniela" },
  { sala: "Interconsultas", cycle: "C", name: "Dra. Ale/Eliana" },
  { sala: "Interconsultas", cycle: "D", name: "Dra. Valeria" },
  { sala: "UX", cycle: "A", name: "Dra. Laura" },
  { sala: "UX", cycle: "B", name: "Dra. Karla" },
  { sala: "UX", cycle: "C", name: "Dr. Edder" },
  { sala: "UX", cycle: "D", name: "Dr. Felipe" },
  { sala: "Eme", cycle: "A", name: "Dr. Manuel" },
  { sala: "Eme", cycle: "B", name: "Dra. Alondra" },
  { sala: "Eme", cycle: "C", name: "Dr. Martin" },
  { sala: "Eme", cycle: "D", name: "Dra. Nely" },
  { sala: "\xC1rea A/Pensionistas", cycle: "A", name: "Dra. Katia" },
  { sala: "\xC1rea A/Pensionistas", cycle: "B", name: "Dra. Elide" },
  { sala: "\xC1rea A/Pensionistas", cycle: "C", name: "Dr. \xC1ngel" },
  { sala: "\xC1rea A/Pensionistas", cycle: "D", name: "Dra. Paulina" }
]);
function agostoTeamCreatePayload(spec, createdBy) {
  const sala = String(spec.sala || "").trim();
  return {
    name: String(spec.name || "").trim(),
    service: clinicalServiceForSala(sala) || "Sala",
    subAreaFraction: String(spec.cycle || "").trim().toUpperCase(),
    onCallDayIndex: 0,
    sala,
    teamLeaderName: String(spec.name || "").trim(),
    createdBy: createdBy ? String(createdBy) : void 0
  };
}
function planAgosto2026TeamSeed(existingTeams, catalog = AGOSTO_2026_TEAMS) {
  const active = (existingTeams || []).filter((t) => t && !t.archived_at);
  const create = [];
  const rename = [];
  const skip = [];
  for (const spec of catalog) {
    const sala = String(spec.sala || "").trim();
    const name = String(spec.name || "").trim();
    const cycle = String(spec.cycle || "").trim().toUpperCase();
    const byName = active.find(
      (t) => String(t.sala || "").trim() === sala && String(t.name || "").trim() === name
    );
    if (byName) {
      skip.push({ action: "skip", spec, teamId: String(byName.team_id || "") });
      continue;
    }
    const byCycle = active.find(
      (t) => String(t.sala || "").trim() === sala && String(t.sub_area_fraction || "").trim().toUpperCase() === cycle
    );
    if (byCycle) {
      rename.push({
        action: "rename",
        teamId: String(byCycle.team_id || ""),
        spec,
        fromName: String(byCycle.name || "").trim()
      });
      continue;
    }
    create.push({ action: "create", spec });
  }
  return { create, rename, skip };
}

// public/js/features/cloud-sync/panel-admin-equipos-seed.mjs
function dbApi3() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
async function applyAgosto2026Renames(api, renamePlan, createdBy, salas) {
  let renamed = 0;
  for (const item of renamePlan) {
    if (!item.teamId || typeof api.dbClinicalTeamsUpdate !== "function") continue;
    const res = await api.dbClinicalTeamsUpdate({
      teamId: item.teamId,
      name: item.spec.name,
      callerUserId: createdBy
    });
    if (res?.ok === false) {
      return { ok: false, error: res?.error || "No se pudo renombrar " + item.fromName };
    }
    renamed += 1;
    salas.add(item.spec.sala);
  }
  return { ok: true, renamed };
}
async function applyAgosto2026Creates(api, createPlan, createdBy, salas) {
  let created = 0;
  for (const item of createPlan) {
    const payload = agostoTeamCreatePayload(item.spec, createdBy);
    const res = await api.dbClinicalTeamsCreate(payload);
    if (!res || res.ok === false) {
      return { ok: false, error: res?.error || "No se pudo crear " + payload.name };
    }
    created += 1;
    salas.add(item.spec.sala);
  }
  return { ok: true, created };
}
async function handleSeedAgosto2026Equipos(root, getApi, toast) {
  const api = dbApi3();
  if (!api || typeof api.dbClinicalTeamsCreate !== "function") {
    toast("Requiere R+ de escritorio con base cl\xEDnica desbloqueada.", "error");
    return;
  }
  const listRes = await api.dbClinicalTeamsList();
  const existing = listRes?.ok && Array.isArray(listRes.teams) ? listRes.teams : [];
  const plan = planAgosto2026TeamSeed(existing, AGOSTO_2026_TEAMS);
  const pending = plan.create.length + plan.rename.length;
  if (!pending) {
    toast("Los 32 equipos de agosto 2026 ya est\xE1n en la base.", "info");
    return;
  }
  const ok = await confirmAction(
    "Crear equipos agosto 2026\n\nSe crear\xE1n " + plan.create.length + " equipos y se renombrar\xE1n " + plan.rename.length + " (mismo ciclo). Saltados: " + plan.skip.length + ".\n\nSin UCIA / POSQX / Infecto. \xBFContinuar?"
  );
  if (!ok) return;
  const createdBy = String(clinicalSessionContext.user?.user_id || "");
  const salas = /* @__PURE__ */ new Set();
  const renameResult = await applyAgosto2026Renames(api, plan.rename, createdBy, salas);
  if (!renameResult.ok) {
    toast(renameResult.error || "No se pudo renombrar.", "error");
    return;
  }
  const createResult = await applyAgosto2026Creates(api, plan.create, createdBy, salas);
  if (!createResult.ok) {
    toast(createResult.error || "No se pudo crear.", "error");
    return;
  }
  for (const sala of salas) {
    await publishClinicalTeamsAfterChange({ sala });
  }
  toast(
    "Agosto 2026: " + createResult.created + " creados, " + renameResult.renamed + " renombrados, " + plan.skip.length + " ya ok.",
    "success"
  );
  void loadAdminEquipos(root, getApi);
}

// public/js/features/cloud-sync/panel-admin-equipos-persist-core.mjs
async function persistClinicalAdminProfile(api, draft) {
  const callerUserId = String(clinicalSessionContext.user?.user_id || "");
  const profileRes = await api.dbClinicalUserAdminProfile({
    callerUserId,
    username: String(draft.username || "").trim(),
    displayName: draft.displayName,
    rank: draft.rank,
    sala: draft.sala || void 0
  });
  if (!profileRes?.ok || !profileRes?.user?.user_id) {
    return { ok: false, error: profileRes?.error || "No se pudo guardar el perfil cl\xEDnico." };
  }
  return { ok: true, userId: String(profileRes.user.user_id) };
}
async function provisionClinicalCloudUser(api, draft) {
  const callerUserId = String(clinicalSessionContext.user?.user_id || "");
  const prov = await api.dbClinicalUserProvisionCloud({
    callerUserId,
    username: String(draft.username || "").trim(),
    displayName: draft.displayName,
    rank: draft.rank
  });
  if (!prov?.ok || !prov?.user?.user_id) {
    return { ok: false, error: prov?.error || "No se pudo crear el perfil cl\xEDnico." };
  }
  return { ok: true, userId: String(prov.user.user_id) };
}
async function resolveClinicalProfileUserId(api, draft) {
  if (typeof api.dbClinicalUserAdminProfile === "function") {
    return persistClinicalAdminProfile(api, draft);
  }
  const existingId = String(draft.userId || "").trim();
  if (existingId) return { ok: true, userId: existingId };
  if (typeof api.dbClinicalUserProvisionCloud !== "function") {
    return { ok: false, error: "No se pudo guardar el perfil cl\xEDnico." };
  }
  return provisionClinicalCloudUser(api, draft);
}
async function assignDraftToTeam(api, draft, resolvedUserId) {
  if (!draft.teamId) {
    return { ok: true, assigned: false, warnings: [] };
  }
  if (!draft.subAreaFraction) {
    return { ok: false, error: "Elige el ciclo de @" + draft.username + "." };
  }
  if (typeof api.dbClinicalTeamsMemberAdd !== "function") {
    return { ok: false, error: "No se pudo asignar (base cl\xEDnica no disponible)." };
  }
  const res = await api.dbClinicalTeamsMemberAdd({
    teamId: draft.teamId,
    userId: resolvedUserId,
    username: resolvedUserId ? void 0 : draft.username,
    subAreaFraction: draft.subAreaFraction,
    exclusive: true
  });
  if (!res || res.ok === false) {
    return { ok: false, error: res?.error || "No se asign\xF3 a @" + draft.username + "." };
  }
  return {
    ok: true,
    assigned: true,
    movedFrom: Number(res.movedFrom || 0),
    warnings: Array.isArray(res.warnings) ? res.warnings : []
  };
}

// public/js/features/cloud-sync/panel-admin-equipos-row-persist.mjs
function equiposDbApi() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
function isSelectLike(el) {
  return !!el && typeof el === "object" && "value" in el && typeof /** @type {{ selectedIndex?: unknown }} */
  el.selectedIndex === "number";
}
function selectValue(el) {
  if (!isSelectLike(el)) return "";
  return String(
    /** @type {{ value?: unknown }} */
    el.value || ""
  ).trim();
}
function readEquiposRowRank(row) {
  const rankSel = row?.querySelector?.(".cloud-sync-admin-equipos-rank");
  const fromSelect = selectValue(rankSel);
  if (fromSelect) return fromSelect;
  return String(row?.getAttribute?.("data-user-rank") || "R1").trim() || "R1";
}
function readEquiposRowSala(row) {
  const fromSelect = selectValue(row?.querySelector?.(".cloud-sync-admin-equipos-user-sala"));
  if (fromSelect) return fromSelect;
  return String(row?.getAttribute?.("data-sala") || "").trim();
}
function readEquiposRowDraft(row, teams) {
  const username = String(
    row.getAttribute("data-cloud-username") || row.getAttribute("data-username") || ""
  ).trim();
  const displayName = String(row.getAttribute("data-cloud-display") || "").trim();
  const userId = String(row.getAttribute("data-user-id") || "").trim();
  const sala = readEquiposRowSala(row);
  const rank = readEquiposRowRank(row);
  const teamId = selectValue(row.querySelector(".cloud-sync-admin-equipos-team"));
  let subAreaFraction = selectValue(row.querySelector(".cloud-sync-admin-equipos-cycle"));
  const team = (teams || []).find((t) => String(t.team_id) === teamId) || null;
  if (!subAreaFraction && team) {
    subAreaFraction = resolveMembershipCycleForUser(team, userId, rank);
  }
  return { username, displayName, userId, sala, rank, teamId, subAreaFraction, team, row };
}
async function persistEquiposRowDraft(api, draft) {
  if (!api) return { ok: false, error: "Base cl\xEDnica no disponible." };
  if (!String(draft.username || "").trim()) return { ok: false, error: "Usuario inv\xE1lido." };
  const profile = await resolveClinicalProfileUserId(api, draft);
  if (!profile.ok) return { ok: false, error: profile.error };
  const assign = await assignDraftToTeam(api, draft, profile.userId);
  if (!assign.ok) return { ok: false, error: assign.error };
  return {
    ok: true,
    resolvedUserId: profile.userId,
    assigned: assign.assigned,
    movedFrom: assign.movedFrom,
    warnings: assign.warnings
  };
}

// public/js/features/cloud-sync/panel-admin-equipos-purge.mjs
async function deleteCloudEquiposUser(getApi, cloudId) {
  await getApi().adminDeleteUser(cloudId);
}
async function deleteLocalEquiposUser(userId, callerUserId, cloudDeleted) {
  const api = equiposDbApi();
  if (!api || typeof api.dbClinicalUserDelete !== "function") {
    return {
      ok: cloudDeleted,
      cloudDeleted,
      error: cloudDeleted ? "no_db_after_cloud" : "no_db"
    };
  }
  const res = await api.dbClinicalUserDelete({ targetUserId: userId, callerUserId });
  if (!res?.ok) {
    return {
      ok: cloudDeleted,
      cloudDeleted,
      error: String(res?.error || "delete_failed")
    };
  }
  return { ok: true, cloudDeleted, localDeleted: true };
}
function isSelfPurgeTarget(userId, cloudId, callerUserId) {
  return Boolean(callerUserId && userId && userId === callerUserId);
}
async function purgeEquiposRowTarget(target, getApi, callerUserId) {
  const userId = String(target?.userId || "").trim();
  const cloudId = String(target?.cloudId || "").trim();
  const handle = String(target?.handle || "").trim();
  if (!userId && !cloudId) return { ok: false, skipped: true, error: "empty" };
  if (isSelfPurgeTarget(userId, cloudId, callerUserId)) {
    return { ok: false, skipped: true, error: "self" };
  }
  const cloudDeleted = Boolean(cloudId);
  if (cloudId) await deleteCloudEquiposUser(getApi, cloudId);
  if (userId) return deleteLocalEquiposUser(userId, callerUserId, cloudDeleted);
  if (cloudId && handle) await purgeClinicalUserMatchingCloudHandle(handle);
  return { ok: true, cloudDeleted, localDeleted: false };
}

// public/js/features/cloud-sync/panel-admin-equipos-bulk.mjs
function rowCheckbox(row) {
  return row.querySelector("[data-admin-equipos-select]");
}
function isChecked(el) {
  return !!(el && typeof el === "object" && /** @type {{ checked?: unknown }} */
  el.checked === true);
}
function setBulkButtonDisabled(btn, disabled) {
  if (btn && typeof btn === "object" && "disabled" in btn) {
    btn.disabled = disabled;
  }
}
function listVisibleEquiposRows(root) {
  const list = root.querySelector("[data-admin-equipos-list]");
  if (!list) return [];
  return [...list.querySelectorAll(".cloud-sync-admin-equipos-row")].filter(
    (row) => row instanceof HTMLElement && !row.hidden
  );
}
function listSelectedEquiposRows(root) {
  const list = root.querySelector("[data-admin-equipos-list]");
  if (!list) return [];
  return [...list.querySelectorAll(".cloud-sync-admin-equipos-row")].filter(
    (row) => row instanceof HTMLElement && isChecked(rowCheckbox(row))
  );
}
function setSelectAllVisibleEquipos(root, checked) {
  for (const row of listVisibleEquiposRows(root)) {
    const cb = rowCheckbox(row);
    if (cb && typeof cb === "object" && "checked" in cb) {
      cb.checked = checked;
    }
  }
  const master = root.querySelector("[data-admin-equipos-select-all]");
  if (master && typeof master === "object" && "checked" in master) {
    master.checked = checked;
  }
}
function validateBulkSaveDrafts(drafts) {
  const withTeam = drafts.filter((d) => d.teamId);
  const missingCycle = withTeam.filter((d) => !d.subAreaFraction);
  if (!missingCycle.length) return { ok: true };
  return { ok: false, error: "Falta el ciclo en " + missingCycle.length + " seleccionado(s)." };
}
async function persistBulkEquiposDrafts(drafts, api) {
  let saved = 0;
  let assigned = 0;
  const warnings = [];
  for (const draft of drafts) {
    const res = await persistEquiposRowDraft(api, draft);
    if (!res.ok) return { ok: false, error: res.error || "Error al guardar." };
    if (draft.row && res.resolvedUserId) {
      draft.row.setAttribute("data-user-id", res.resolvedUserId);
      draft.row.setAttribute("data-user-rank", draft.rank);
    }
    saved += 1;
    if (res.assigned) assigned += 1;
    if (res.warnings?.[0]) warnings.push(String(res.warnings[0]));
  }
  return { ok: true, saved, assigned, warnings };
}
async function handleCloudEquiposBulkSave(root, teams, getApi, toast) {
  const selected = listSelectedEquiposRows(root);
  if (!selected.length) {
    toast("Marca uno o m\xE1s usuarios y elige equipo/ciclo; luego Guardar seleccionados.", "info");
    return;
  }
  const api = equiposDbApi();
  if (!api) {
    toast("Requiere R+ de escritorio con base cl\xEDnica desbloqueada.", "error");
    return;
  }
  const drafts = selected.map((row) => readEquiposRowDraft(row, teams));
  const validation = validateBulkSaveDrafts(drafts);
  if (!validation.ok) {
    toast(validation.error || "Error al guardar.", "error");
    return;
  }
  const btn = root.querySelector('[data-admin-action="save-equipos-bulk"]');
  setBulkButtonDisabled(btn, true);
  try {
    const result = await persistBulkEquiposDrafts(drafts, api);
    if (!result.ok) {
      toast(result.error || "Error al guardar.", "error");
      return;
    }
    for (const warning of result.warnings || []) toast(warning, "warn");
    const changedSalas = [...new Set(drafts.map((d) => d.sala).filter(Boolean))];
    try {
      if (changedSalas.length) {
        for (const sala of changedSalas) await publishClinicalTeamsAfterChange({ sala });
      } else {
        await publishClinicalTeamsAfterChange();
      }
    } catch {
    }
    document.dispatchEvent(
      new CustomEvent("rpc-clinical-teams-changed", {
        detail: { source: "admin-equipos-bulk", sala: changedSalas[0] }
      })
    );
    toast(
      "Guardado: " + result.saved + " usuario(s)" + (result.assigned ? ", " + result.assigned + " asignado(s) a equipo" : "") + ".",
      "success"
    );
    await loadAdminEquipos(root, getApi);
  } catch (err) {
    toast(err?.message || "No se pudo guardar en masa.", "error");
  } finally {
    setBulkButtonDisabled(btn, false);
  }
}
function readEquiposRowPurgeTarget(row) {
  return {
    userId: String(row?.getAttribute?.("data-user-id") || "").trim(),
    cloudId: String(row?.getAttribute?.("data-cloud-id") || "").trim(),
    handle: String(row?.getAttribute?.("data-cloud-username") || "").trim()
  };
}
function equiposBulkPurgeConfirmMessage(count, stats) {
  const n = Math.max(0, Number(count) || 0);
  const cloud = Math.max(0, Number(stats?.cloud) || 0);
  const local = Math.max(0, Number(stats?.local) || 0);
  return "\xBFQuitar " + n + " usuario(s) seleccionado(s)?\n\n" + (cloud ? cloud + " con cuenta Nube. " : "") + (local ? local + " con perfil cl\xEDnico. " : "") + "\nSe eliminan de la nube (si aplica) y de la base cl\xEDnica local. No puedes eliminarte a ti mismo.";
}
function filterActionablePurgeTargets(targets, callerUserId) {
  return targets.filter((t) => !(callerUserId && t.userId && t.userId === callerUserId));
}
async function runBulkEquiposPurge(actionable, getApi, callerUserId) {
  let removed = 0;
  let failed = 0;
  let skippedSelf = 0;
  for (const target of actionable) {
    try {
      const res = await purgeEquiposRowTarget(target, getApi, callerUserId);
      if (res.skipped && res.error === "self") {
        skippedSelf += 1;
        continue;
      }
      if (res.ok) removed += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }
  return { removed, failed, skippedSelf };
}
function toastBulkPurgeSummary(removed, failed, skippedSelf, toast) {
  const parts = ["Quitados: " + removed];
  if (failed) parts.push("fallaron: " + failed);
  if (skippedSelf) parts.push("omitidos (cuenta actual): " + skippedSelf);
  toast(parts.join(" \xB7 ") + ".", removed ? "success" : "error");
}
async function finalizeBulkEquiposPurge(root, getApi, removed) {
  if (!removed) {
    await loadAdminEquipos(root, getApi);
    return;
  }
  try {
    await publishClinicalTeamsAfterChange({ sala: clinicalSessionContext.user?.sala });
  } catch {
  }
  document.dispatchEvent(
    new CustomEvent("rpc-clinical-teams-changed", {
      detail: { source: "admin-equipos-bulk-purge" }
    })
  );
  await loadAdminEquipos(root, getApi);
}
async function handleCloudEquiposBulkPurge(root, getApi, toast) {
  const selected = listSelectedEquiposRows(root);
  const targets = selected.map((row) => readEquiposRowPurgeTarget(row)).filter((t) => t.userId || t.cloudId);
  if (!targets.length) {
    toast("Marca uno o m\xE1s usuarios y usa Quitar seleccionados.", "info");
    return;
  }
  const callerUserId = String(clinicalSessionContext.user?.user_id || "");
  const actionable = filterActionablePurgeTargets(targets, callerUserId);
  if (!actionable.length) {
    toast("No puedes eliminarte a ti mismo.", "error");
    return;
  }
  const stats = {
    cloud: actionable.filter((t) => t.cloudId).length,
    local: actionable.filter((t) => t.userId).length
  };
  if (!await confirmAction(equiposBulkPurgeConfirmMessage(actionable.length, stats))) return;
  const btn = root.querySelector('[data-admin-action="purge-equipos-bulk"]');
  setBulkButtonDisabled(btn, true);
  try {
    const { removed, failed, skippedSelf } = await runBulkEquiposPurge(
      actionable,
      getApi,
      callerUserId
    );
    await finalizeBulkEquiposPurge(root, getApi, removed);
    toastBulkPurgeSummary(removed, failed, skippedSelf, toast);
  } catch (err) {
    toast(err?.data?.message || err?.message || "No se pudo quitar en masa.", "error");
  } finally {
    setBulkButtonDisabled(btn, false);
  }
}

// public/js/features/cloud-sync/panel-admin-equipos-wiring.mjs
function closestSelect(target, selector) {
  const el = target?.closest(selector);
  return el instanceof HTMLSelectElement ? el : null;
}
function closestTeamSelect(target) {
  return closestSelect(target, ".cloud-sync-admin-equipos-team");
}
function handleToolbarSalaChange(target, ctx) {
  if (!closestSelect(target, "[data-admin-equipos-sala]")) return false;
  ctx.applyFilters();
  ctx.syncAllTeams();
  return true;
}
function handleToolbarFilterChange(target, ctx) {
  if (!closestSelect(target, "[data-admin-equipos-activity], [data-admin-equipos-team-status]")) {
    return false;
  }
  ctx.applyFilters();
  return true;
}
function handleUserSalaChange(target, ctx) {
  const userSalaSel = closestSelect(target, ".cloud-sync-admin-equipos-user-sala");
  if (!userSalaSel) return false;
  const row = userSalaSel.closest(".cloud-sync-admin-equipos-row");
  if (!(row instanceof HTMLElement)) return true;
  row.setAttribute("data-sala", ctx.readRowSala(row));
  ctx.syncTeamRow(row);
  ctx.applyFilters();
  return true;
}
function handleRankChange(target, ctx) {
  const rankSel = closestSelect(target, ".cloud-sync-admin-equipos-rank");
  if (!rankSel) return false;
  const row = rankSel.closest(".cloud-sync-admin-equipos-row");
  if (row instanceof HTMLElement) row.setAttribute("data-user-rank", ctx.readRowRank(row));
  const teamSelect = row?.querySelector(".cloud-sync-admin-equipos-team");
  if (teamSelect instanceof HTMLSelectElement) ctx.syncCycle(teamSelect);
  return true;
}
function handleEquiposPanelChange(ev, ctx) {
  const target = ev.target instanceof Element ? ev.target : null;
  const teamSel = closestTeamSelect(target);
  if (teamSel) {
    ctx.syncCycle(teamSel);
    return;
  }
  if (handleToolbarSalaChange(target, ctx)) return;
  if (handleToolbarFilterChange(target, ctx)) return;
  if (handleUserSalaChange(target, ctx)) return;
  if (handleRankChange(target, ctx)) return;
  const selectAll = target?.closest("[data-admin-equipos-select-all]");
  if (selectAll instanceof HTMLInputElement) {
    setSelectAllVisibleEquipos(ctx.root, selectAll.checked);
  }
}
function handleEquiposPanelLoaded(root, ctx) {
  const list = root.querySelector("[data-admin-equipos-list]");
  list?.querySelectorAll(".cloud-sync-admin-equipos-row").forEach((row) => {
    if (row instanceof HTMLElement) ctx.initRow(row);
  });
  const master = root.querySelector("[data-admin-equipos-select-all]");
  if (master instanceof HTMLInputElement) master.checked = false;
}

// public/js/features/cloud-sync/panel-admin-equipos-actions.mjs
function resolveEquiposTeamSalaScope(row, root) {
  const rowSala = readEquiposRowSala(row);
  if (rowSala) return rowSala;
  const toolbar = root?.querySelector?.("[data-admin-equipos-sala]");
  if (toolbar instanceof HTMLSelectElement) return String(toolbar.value || "").trim();
  return "";
}
function syncCloudEquiposCycleSelect(teamSelect, teams, preferredCycle = "") {
  const row = teamSelect.closest(".cloud-sync-admin-equipos-row");
  const cycleSelect = row?.querySelector(".cloud-sync-admin-equipos-cycle");
  if (!(cycleSelect instanceof HTMLSelectElement)) return;
  const teamId = String(teamSelect.value || "").trim();
  if (!teamId) {
    cycleSelect.innerHTML = '<option value="">\u2014</option>';
    cycleSelect.disabled = true;
    return;
  }
  const team = (teams || []).find((t) => String(t.team_id) === teamId);
  const userId = String(row?.getAttribute("data-user-id") || "").trim();
  const userRank = readEquiposRowRank(row);
  const rowPreferred = String(preferredCycle || "").trim();
  cycleSelect.innerHTML = cycleOptionsForTeam(team, userId, userRank, rowPreferred);
  cycleSelect.disabled = false;
  if (team) {
    const service = String(team.service || "Sala");
    const letters = getCycleLetterOptionsForRank(service, userRank);
    let defaultCycle = resolveMembershipCycleForUser(team, userId, userRank);
    if (rowPreferred && letters.includes(rowPreferred)) defaultCycle = rowPreferred;
    cycleSelect.value = defaultCycle;
  }
}
function syncCloudEquiposTeamSelect(row, teams, root) {
  const teamSelect = row.querySelector(".cloud-sync-admin-equipos-team");
  if (!(teamSelect instanceof HTMLSelectElement)) return;
  const prev = String(teamSelect.value || "").trim();
  const sala = resolveEquiposTeamSalaScope(row, root);
  teamSelect.innerHTML = renderEquiposAssignTeamOptionsHtml(teams, prev, sala);
  const values = new Set([...teamSelect.options].map((o) => o.value).filter(Boolean));
  teamSelect.value = prev && values.has(prev) ? prev : "";
  syncCloudEquiposCycleSelect(teamSelect, teams);
}
function syncAllCloudEquiposTeamSelects(root, teams) {
  root.querySelectorAll(".cloud-sync-admin-equipos-row").forEach((row) => {
    if (row instanceof HTMLElement) syncCloudEquiposTeamSelect(row, teams, root);
  });
}
function initCloudEquiposRow(row, teams, root) {
  syncCloudEquiposTeamSelect(row, teams, root);
}
function validateEquiposAssignDraft(draft) {
  if (!draft.username || !draft.teamId) return "Elige un equipo.";
  if (!draft.subAreaFraction) return "Elige el ciclo del integrante.";
  return "";
}
async function handleCloudEquiposSaveRank(root, btn, teams, getApi, toast) {
  const row = btn.closest(".cloud-sync-admin-equipos-row");
  if (!row) return;
  const draft = readEquiposRowDraft(row, teams);
  draft.teamId = "";
  draft.subAreaFraction = "";
  draft.team = null;
  const api = equiposDbApi();
  if (!api || typeof api.dbClinicalUserAdminProfile !== "function") {
    toast("No se pudo guardar el rango (base cl\xEDnica no disponible).", "error");
    return;
  }
  btn.disabled = true;
  try {
    const res = await persistEquiposRowDraft(api, draft);
    if (!res.ok) {
      toast(res.error || "No se guard\xF3 el rango.", "error");
      return;
    }
    if (res.resolvedUserId) {
      row.setAttribute("data-user-id", res.resolvedUserId);
      row.setAttribute("data-user-rank", draft.rank);
    }
    const teamSelect = row.querySelector(".cloud-sync-admin-equipos-team");
    if (teamSelect instanceof HTMLSelectElement) {
      syncCloudEquiposCycleSelect(teamSelect, teams);
    }
    row.setAttribute("data-sala", draft.sala || "");
    toast(
      "Perfil actualizado" + (draft.sala ? " \xB7 " + draft.sala : "") + " \xB7 " + draft.rank + ".",
      "success"
    );
    document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
    await loadAdminEquipos(root, getApi);
  } catch (err) {
    toast(err?.message || "No se pudo guardar el perfil.", "error");
  } finally {
    btn.disabled = false;
  }
}
async function finishEquiposAssign(root, getApi, toast, wasMember) {
  toast(wasMember ? "Ciclo actualizado." : "Integrante asignado al equipo.", "success");
  try {
    await publishClinicalTeamsAfterChange();
  } catch {
  }
  document.dispatchEvent(
    new CustomEvent("rpc-clinical-teams-changed", {
      detail: { source: "admin-equipos-assign" }
    })
  );
  await loadAdminEquipos(root, getApi);
}
async function handleCloudEquiposAssign(root, btn, teams, getApi, toast) {
  const row = btn.closest(".cloud-sync-admin-equipos-row");
  if (!row) return;
  const draft = readEquiposRowDraft(row, teams);
  const validationError = validateEquiposAssignDraft(draft);
  if (validationError) {
    toast(validationError, "error");
    return;
  }
  const api = equiposDbApi();
  if (!api) {
    toast("No se pudo asignar (base cl\xEDnica no disponible).", "error");
    return;
  }
  const wasMember = Boolean(
    draft.team?.members?.some((m) => String(m.user_id || "") === draft.userId)
  );
  btn.disabled = true;
  try {
    const res = await persistEquiposRowDraft(api, draft);
    if (!res.ok) {
      toast(res.error || "No se asign\xF3 al equipo.", "error");
      return;
    }
    if (res.resolvedUserId) row.setAttribute("data-user-id", res.resolvedUserId);
    if (res.warnings?.[0]) toast(String(res.warnings[0]), "warn");
    await finishEquiposAssign(root, getApi, toast, wasMember);
  } catch (err) {
    toast(err?.message || "No se pudo asignar.", "error");
  } finally {
    btn.disabled = false;
  }
}
function equiposPurgeConfirmMessage(handle, flags) {
  const at = "@" + String(handle || "").trim();
  if (flags.hasCloud && !flags.hasLocal) {
    return "\xBFEliminar a " + at + " de la nube?\n\nEs una cuenta Nube sin perfil cl\xEDnico local (p. ej. @local_\u2026). Desaparece del listado Equipos.";
  }
  if (flags.hasCloud && flags.hasLocal) {
    return "\xBFQuitar a " + at + " de la nube y de la base cl\xEDnica en esta Mac?\n\nSe elimina la cuenta Nube y el perfil cl\xEDnico / equipo.";
  }
  return "\xBFQuitar a " + at + " del equipo y de la base cl\xEDnica en esta Mac?\n\nSe publicar\xE1 a la sala Nube (clinicalOps). No hay cuenta Nube vinculada.";
}
function equiposPurgeSuccessMessage(res, hasCloud, hasLocal) {
  if (hasCloud && hasLocal) return "Usuario eliminado de la nube y de la base cl\xEDnica.";
  if (hasCloud) return "Cuenta Nube eliminada.";
  return "Usuario quitado del equipo y de la base cl\xEDnica.";
}
function toastEquiposPurgeFailure(res, toast) {
  if (res.error === "no_db" || res.error === "no_db_after_cloud") {
    toast(
      res.cloudDeleted ? "Cuenta Nube eliminada. Abre R+ de escritorio para quitar el perfil cl\xEDnico local." : "Quitar requiere R+ de escritorio con base cl\xEDnica desbloqueada.",
      res.cloudDeleted ? "warn" : "error"
    );
    return;
  }
  toast(
    res.cloudDeleted ? "Cuenta Nube eliminada, pero no se pudo quitar el perfil cl\xEDnico: " + String(res.error || "error") : res.error || "No se pudo quitar el usuario.",
    res.cloudDeleted ? "warn" : "error"
  );
}
async function finishEquiposPurgeSuccess(root, getApi, flags, res, toast) {
  if (res.localDeleted) {
    try {
      await publishClinicalTeamsAfterChange({ sala: clinicalSessionContext.user?.sala });
    } catch {
    }
  }
  document.dispatchEvent(
    new CustomEvent("rpc-clinical-teams-changed", {
      detail: { source: "admin-equipos-purge" }
    })
  );
  toast(equiposPurgeSuccessMessage(res, flags.hasCloud, flags.hasLocal), "success");
  await loadAdminEquipos(root, getApi);
}
function readEquiposPurgeBtnTarget(btn) {
  return {
    userId: String(btn.getAttribute("data-user-id") || "").trim(),
    cloudId: String(btn.getAttribute("data-cloud-id") || "").trim(),
    handle: String(btn.getAttribute("data-cloud-username") || "").trim()
  };
}
async function executeEquiposPurge(root, getApi, callerUserId, target, flags, toast) {
  const res = await purgeEquiposRowTarget(target, getApi, callerUserId);
  if (!res.ok) {
    toastEquiposPurgeFailure(res, toast);
    if (res.cloudDeleted) await loadAdminEquipos(root, getApi);
    return;
  }
  await finishEquiposPurgeSuccess(root, getApi, flags, res, toast);
}
async function handleCloudEquiposPurgeUser(root, btn, getApi, toast) {
  const target = readEquiposPurgeBtnTarget(btn);
  if (!target.userId && !target.cloudId) {
    toast("No hay cuenta Nube ni perfil cl\xEDnico para quitar.", "error");
    return;
  }
  const callerUserId = String(clinicalSessionContext.user?.user_id || "");
  if (callerUserId && target.userId && target.userId === callerUserId) {
    toast("No puedes eliminarte a ti mismo.", "error");
    return;
  }
  const flags = { hasCloud: Boolean(target.cloudId), hasLocal: Boolean(target.userId) };
  if (!await confirmAction(equiposPurgeConfirmMessage(target.handle, flags))) return;
  btn.disabled = true;
  try {
    await executeEquiposPurge(root, getApi, callerUserId, target, flags, toast);
  } catch (err) {
    toast(err?.data?.message || err?.message || "No se pudo quitar.", "error");
  } finally {
    btn.disabled = false;
  }
}
function wireCloudEquiposPanel(root, deps) {
  let teamsCache = [];
  const panelCtx = {
    get root() {
      return root;
    },
    get teamsCache() {
      return teamsCache;
    },
    applyFilters: () => applyEquiposFiltersFromToolbar(root),
    syncCycle: (teamSelect) => syncCloudEquiposCycleSelect(teamSelect, teamsCache),
    syncTeamRow: (row) => syncCloudEquiposTeamSelect(row, teamsCache, root),
    syncAllTeams: () => syncAllCloudEquiposTeamSelects(root, teamsCache),
    readRowSala: (row) => readEquiposRowSala(row),
    readRowRank: (row) => readEquiposRowRank(row),
    initRow: (row) => initCloudEquiposRow(row, teamsCache, root)
  };
  root.addEventListener("cloud-admin-equipos-loaded", function(ev) {
    const detail = ev.detail || {};
    teamsCache = Array.isArray(detail.teams) ? detail.teams : [];
    handleEquiposPanelLoaded(root, panelCtx);
  });
  root.addEventListener("change", (ev) => handleEquiposPanelChange(ev, panelCtx));
  root.addEventListener("input", function(ev) {
    const search = ev.target instanceof Element ? ev.target.closest("[data-admin-equipos-search]") : null;
    if (search instanceof HTMLInputElement) applyEquiposFiltersFromToolbar(root);
  });
  return {
    handleAssign(btn) {
      return handleCloudEquiposAssign(root, btn, teamsCache, deps.getApi, deps.toast);
    },
    handleSaveRank(btn) {
      return handleCloudEquiposSaveRank(root, btn, teamsCache, deps.getApi, deps.toast);
    },
    handlePurge(btn) {
      return handleCloudEquiposPurgeUser(root, btn, deps.getApi, deps.toast);
    },
    handleBulkSave() {
      return handleCloudEquiposBulkSave(root, teamsCache, deps.getApi, deps.toast);
    },
    handleBulkPurge() {
      return handleCloudEquiposBulkPurge(root, deps.getApi, deps.toast);
    },
    seedAgosto2026() {
      return handleSeedAgosto2026Equipos(root, deps.getApi, deps.toast);
    },
    refresh() {
      return loadAdminEquipos(root, deps.getApi);
    }
  };
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
  const raw = String(tabId || "resumen").trim() || "resumen";
  const next = raw === "usuarios" ? "equipos" : raw;
  root.querySelectorAll("[data-admin-tab]").forEach(function(btn) {
    const active = btn.getAttribute("data-admin-tab") === next;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
  root.querySelectorAll("[data-admin-section]").forEach(function(panel) {
    panel.hidden = panel.getAttribute("data-admin-section") !== next;
  });
}
function mountAdminPanelSections(root) {
  const peligroEl = root.querySelector("[data-admin-peligro]");
  if (peligroEl) peligroEl.innerHTML = peligroHtml();
  const mutEl = root.querySelector("[data-admin-mutaciones]");
  if (mutEl) mutEl.innerHTML = mutacionesShellHtml();
  const equiposEl = root.querySelector("[data-admin-equipos]");
  if (equiposEl) equiposEl.innerHTML = equiposShellHtml();
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
  if (keyInput instanceof HTMLInputElement && savedKey) keyInput.value = savedKey;
  mountAdminPanelSections(root);
  const equiposPanel = wireCloudEquiposPanel(root, { getApi: deps.getApi, toast });
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
    equiposPanel,
    get openRoomDetailId() {
      return openRoomDetailId;
    },
    setOpenRoomDetailId(id) {
      openRoomDetailId = id;
    },
    updateMutacionesRoomSelect: updateRoomSelects
  };
  root.addEventListener("click", function(ev) {
    const tabBtn = ev.target instanceof Element ? ev.target.closest("[data-admin-tab]") : null;
    if (tabBtn) {
      const tabId = tabBtn.getAttribute("data-admin-tab");
      if (tabId) {
        selectAdminTab(root, tabId);
        const resolved = tabId === "usuarios" ? "equipos" : tabId;
        if (resolved === "equipos") void equiposPanel.refresh();
      }
      return;
    }
    createAdminClickHandler(clickDeps)(ev);
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
  getSessionAdminKey,
  setSessionAdminKey,
  canAccessCloudAdmin,
  mountCloudAdminPanel
};
//# sourceMappingURL=/js/chunks/chunk-R7EIFRHC.js.map
