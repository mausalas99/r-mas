import {
  canAccessCloudAdmin
} from "/mobile/js/chunks/chunk-YWNLHSLY.js";
import {
  CLOUD_OUTBOX_CHANGED_EVENT,
  copyToClipboardSafe,
  filterJoinedTeams,
  getSharedNubeOutbox,
  getSharedNubeRuntime,
  setClinicalTeamsEmbedHost
} from "/mobile/js/chunks/chunk-SUHVKV2B.js";
import {
  STACKED_BACKDROP_CLASS
} from "/mobile/js/chunks/chunk-YR5I2T5V.js";
import {
  isCloudMutateBridgeConfigured,
  pruneLabSidecarsFromOutbox
} from "/mobile/js/chunks/chunk-OGX35Y32.js";
import {
  CLOUD_SYNC_CLIENT_NOT_READY,
  formatCloudDiagnosticsReport,
  getCloudSyncDiagnostics,
  humanizeTechnicalSyncMessage,
  isCloudSyncNetworkErrorMessage,
  isToxicCloudOutboxEntry
} from "/mobile/js/chunks/chunk-EHHIMUZG.js";
import {
  patients
} from "/mobile/js/chunks/chunk-H66E52WF.js";
import {
  CLOUD_LAB_BACKFILL_MUTATION_ID,
  CLOUD_PUSH_WARN_BODY_BYTES
} from "/mobile/js/chunks/chunk-F52EEXUB.js";
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
} from "/mobile/js/chunks/chunk-TGGEFYRH.js";
import {
  normalizeUsername
} from "/mobile/js/chunks/chunk-LQTSNMET.js";
import {
  isCloudSyncActive
} from "/mobile/js/chunks/chunk-CAVI7UGR.js";
import {
  getCloudSyncRemember,
  getCloudSyncRoomSnapshot,
  getCloudSyncSettings
} from "/mobile/js/chunks/chunk-KLMIZH6A.js";

// public/js/features/cloud-sync/cloud-nube-fix-guides.mjs
var FIX_GUIDES = {
  no_internet: {
    id: "no_internet",
    title: "Sin internet",
    summary: "R+ guarda los cambios en tu Mac hasta recuperar red.",
    steps: [
      "Revisa Wi\u2011Fi o cable en la Mac de guardia.",
      "Si usas VPN hospitalaria, confirma que est\xE1 conectada.",
      "Cuando vuelva la red, abre Diagn\xF3stico Nube y toca Forzar sync."
    ]
  },
  cloud_not_active: {
    id: "cloud_not_active",
    title: "Nube no activa",
    summary: "Esta guardia no est\xE1 usando sincronizaci\xF3n con Nube.",
    steps: [
      "Confirma en Mi rotaci\xF3n que la sala es una sala Nube (no solo local).",
      "Si acabas de cambiar de guardia, completa la configuraci\xF3n de rotaci\xF3n.",
      "Vuelve a Conexi\xF3n y verifica que el chip de Nube no diga offline."
    ]
  },
  no_session: {
    id: "no_session",
    title: "Sin sesi\xF3n en Nube",
    summary: "Hace falta iniciar sesi\xF3n para sincronizar con la sala.",
    steps: [
      "Ve a Conexi\xF3n \u2192 inicia sesi\xF3n con tu usuario Nube.",
      "Si no tienes cuenta, reg\xEDstrate o pide acceso al admin de la sala.",
      "Tras entrar, confirma que ves tu nombre y la sala en Conexi\xF3n."
    ]
  },
  no_room: {
    id: "no_room",
    title: "Sin sala configurada",
    summary: "R+ necesita saber en qu\xE9 sala de guardia sincronizar.",
    steps: [
      "Abre Conexi\xF3n y selecciona o crea la sala del turno.",
      "En Mi rotaci\xF3n, confirma equipo y sala asignados.",
      "Vuelve a Diagn\xF3stico Nube y revisa que la cadena muestre tu sala en verde."
    ]
  },
  bridge_not_configured: {
    id: "bridge_not_configured",
    title: "Sync local no enlazado",
    summary: "Los cambios cl\xEDnicos no est\xE1n llegando al motor de Nube.",
    steps: [
      "Cierra y vuelve a abrir R+ (o reinicia la app).",
      "Abre Conexi\xF3n y espera 10\u201315 s tras ver tu sala.",
      "Si persiste, cierra sesi\xF3n en Conexi\xF3n y vuelve a entrar."
    ]
  },
  sync_not_active: {
    id: "sync_not_active",
    title: "Sync no est\xE1 activo",
    summary: "Tienes sesi\xF3n y sala, pero el motor de sync no arranc\xF3.",
    steps: [
      "En Conexi\xF3n, confirma que ves la sala y el chip de estado de Nube.",
      "Vuelve aqu\xED y toca Forzar sync.",
      "Si sigue fallando: Conexi\xF3n \u2192 Cerrar sesi\xF3n \u2192 entra de nuevo.",
      "Como \xFAltimo recurso, reinicia R+ con la Mac conectada a red."
    ]
  },
  outbox_pending: {
    id: "outbox_pending",
    title: "Cambios pendientes en cola",
    summary: "Hay mutaciones locales que a\xFAn no llegaron al servidor.",
    steps: [
      "Confirma que hay internet y sesi\xF3n activa en Conexi\xF3n.",
      "Toca Reintentar cola en este panel.",
      "Si la cola es solo labs y ya est\xE1n en Nube, usa Descartar labs en cola.",
      "Si no baja el n\xFAmero de la cola, toca Forzar sync.",
      "Revisa las alertas de error: pueden bloquear el env\xEDo."
    ]
  },
  outbox_labs_stuck: {
    id: "outbox_labs_stuck",
    title: "Labs atorados en cola",
    summary: "Los laboratorios ya parseados no deber\xEDan re-subirse si Nube ya los tiene. Puedes vaciar solo labs sin tocar censo ni signos.",
    steps: [
      "Toca Forzar sync una vez (pull actualiza el \xEDndice de labs en servidor).",
      "Si la cola sigue con labs, toca Descartar labs en cola.",
      "Los labs siguen en tu Mac; solo se descarta el env\xEDo pendiente.",
      "Labs nuevos o re-parseados con cambios reales se volver\xE1n a encolar solos."
    ]
  },
  toxic_legacy_lab_backfill: {
    id: "toxic_legacy_lab_backfill",
    title: "Labs en un solo push (R+ antiguo)",
    summary: "Un cliente est\xE1 intentando enviar muchos labs en un solo lote (`cloud-lab-backfill`). Eso satura el servidor y bloquea la sala.",
    steps: [
      "Actualiza R+ en esta Mac (versi\xF3n 8.0.8+ con fix de labs por paciente).",
      "Reinicia R+ y abre Diagn\xF3stico Nube \u2192 Reintentar cola (divide el lote).",
      "Si otro Mac o iPad en la misma sala usa R+ viejo, actual\xEDzalo tambi\xE9n.",
      "Si los labs ya est\xE1n en Nube: Descartar labs en cola.",
      "Copia el informe t\xE9cnico si soporte debe revisar qui\xE9n empuja el lote."
    ]
  },
  toxic_outbox_chunk: {
    id: "toxic_outbox_chunk",
    title: "Lote demasiado grande en cola",
    summary: "Hay un push local que excede el tama\xF1o que el servidor acepta (~200 KB por lote).",
    steps: [
      "Revisa \xABLotes pesados en cola\xBB en este panel: anota el path m\xE1s grande.",
      "Toca Reintentar cola (R+ actual divide o recorta el lote).",
      "Si es solo labs y ya est\xE1n en Nube: Descartar labs en cola.",
      "Si el path es un lab con PDF o texto SOME crudo, re-parsea localmente sin re-subir el blob.",
      "Si la cola se vac\xEDa pero siguen 503, otro dispositivo en la sala puede estar empujando \u2014 actualiza todos los R+ de la guardia."
    ]
  },
  sync_error: {
    id: "sync_error",
    title: "Error de sincronizaci\xF3n",
    summary: "El \xFAltimo ciclo de sync report\xF3 un problema.",
    steps: [
      "Lee la alerta con el detalle del error (toca para ver pasos espec\xEDficos).",
      "Toca Forzar sync una vez.",
      "Si el error se repite, copia el informe t\xE9cnico y contacta soporte."
    ]
  },
  cloud_offline: {
    id: "cloud_offline",
    title: "Sin conexi\xF3n a Nube",
    summary: "No se puede contactar el servicio de sync en la nube.",
    steps: [
      "Revisa internet en la Mac.",
      "En Conexi\xF3n \u2192 Avanzado, confirma que la URL del servicio es correcta.",
      "Si el hospital bloquea workers.dev, avisa a soporte TI.",
      "Reintenta con Forzar sync cuando la red responda."
    ]
  },
  cycle_failed: {
    id: "cycle_failed",
    title: "Ciclo de sync fall\xF3",
    summary: "El intento autom\xE1tico de sincronizar no termin\xF3 bien.",
    steps: [
      "Toca Forzar sync en este panel.",
      "Si hay cola pendiente, usa tambi\xE9n Reintentar cola.",
      "Abre la alerta de error m\xE1s reciente para ver la causa."
    ]
  },
  ws_error: {
    id: "ws_error",
    title: "Error en canal en vivo",
    summary: "Las notificaciones instant\xE1neas fallaron; el sondeo HTTP puede seguir activo.",
    steps: [
      "Normal si la red es intermitente \u2014 espera 1\u20132 minutos.",
      "Toca Forzar sync para confirmar que pull/push responden.",
      "Si persiste, reinicia R+ o cierra sesi\xF3n y vuelve a entrar."
    ]
  },
  ws_close: {
    id: "ws_close",
    title: "Canal en vivo interrumpido",
    summary: "La conexi\xF3n WebSocket se cort\xF3; R+ reintenta y usa sondeo HTTP.",
    steps: [
      "No es grave si Cola est\xE1 vac\xEDa y Pull/Push dicen \xABahora\xBB o \xABhace X min\xBB.",
      "Evita cerrar R+ en segundo plano por largos periodos en guardia.",
      "Si el sync se detiene, toca Forzar sync."
    ]
  },
  sync_client_not_ready: {
    id: "sync_client_not_ready",
    title: "Cliente de Nube no listo",
    summary: "El enlace interno con el servidor de sync no se complet\xF3.",
    steps: [
      "Ve a Conexi\xF3n y confirma sala + equipo visibles.",
      "Espera 10 s y vuelve a Diagn\xF3stico Nube.",
      "Toca Forzar sync.",
      "Si persiste: Cerrar sesi\xF3n \u2192 volver a entrar \u2192 reiniciar R+ si hace falta."
    ]
  },
  revision_stale: {
    id: "revision_stale",
    title: "Revisi\xF3n desactualizada",
    summary: "Tu copia local qued\xF3 detr\xE1s de la sala; R+ deber\xEDa reintentar solo.",
    steps: [
      "Toca Forzar sync (hace pull y reintenta el env\xEDo).",
      "No edites el mismo paciente en dos Macs al mismo tiempo.",
      "Si se repite en bucle, cierra sesi\xF3n y vuelve a entrar."
    ]
  },
  push_failed: {
    id: "push_failed",
    title: "Env\xEDo a Nube fall\xF3",
    summary: "Un cambio local no se pudo subir al servidor.",
    steps: [
      "Toca Reintentar cola.",
      "Revisa internet y que la sesi\xF3n siga activa en Conexi\xF3n.",
      "Toca Forzar sync.",
      "Si hay c\xF3digo de error en la alerta, \xE1brela para m\xE1s detalle."
    ]
  },
  pull_failed: {
    id: "pull_failed",
    title: "Descarga desde Nube fall\xF3",
    summary: "No se pudieron traer cambios del servidor.",
    steps: [
      "Revisa internet y VPN.",
      "Toca Forzar sync.",
      "Confirma en Conexi\xF3n que la sala es la del turno actual."
    ]
  },
  invalid_token: {
    id: "invalid_token",
    title: "Sesi\xF3n expirada o inv\xE1lida",
    summary: "El token de Nube ya no es v\xE1lido.",
    steps: [
      "Conexi\xF3n \u2192 Cerrar sesi\xF3n.",
      "Vuelve a iniciar sesi\xF3n con tu usuario.",
      "Confirma sala y equipo; luego Forzar sync."
    ]
  },
  generic_sync_error: {
    id: "generic_sync_error",
    title: "Error de sincronizaci\xF3n",
    summary: "Ocurri\xF3 un error al sincronizar con Nube.",
    steps: [
      "Toca Forzar sync.",
      "Si hay cola, Reintentar cola.",
      "Cierra sesi\xF3n y vuelve a entrar si el error se repite.",
      "Copia el informe t\xE9cnico para soporte si sigue fallando."
    ]
  }
};
function getCloudNubeFixGuide(id) {
  const key = String(id || "").trim();
  return FIX_GUIDES[key] || null;
}
function resolveCloudErrorFixId(entry) {
  const code = String(entry?.code || "").trim();
  const explain = String(entry?.explain || entry?.message || "").toLowerCase();
  if (code === "revision_stale" || explain.includes("desactualizada")) return "revision_stale";
  if (code === "invalid_token" || code === "unauthorized" || code === "401" || code === "403") {
    return "invalid_token";
  }
  if (/enlace con nube|cliente nube|no está listo|no configurado/i.test(explain)) {
    return "sync_client_not_ready";
  }
  const op = String(entry?.op || "").toLowerCase();
  if (op.includes("env\xEDo") || entry?.op === "push") return "push_failed";
  if (op.includes("descarga") || entry?.op === "pull") return "pull_failed";
  if (entry?.op === "cycle") return "cycle_failed";
  return "generic_sync_error";
}
function cloudNubeFixModalMarkup(guide) {
  let stepsHtml = "";
  guide.steps.forEach(function(step) {
    stepsHtml += '<li class="cloud-nube-fix-step">' + esc(step) + "</li>";
  });
  return '<div class="' + STACKED_BACKDROP_CLASS + '" data-cloud-nube-fix-modal><div class="lab-conflict-modal cloud-nube-fix-modal material-glass ui-overlay-dialog" role="dialog" aria-modal="true" aria-labelledby="cloud-nube-fix-title"><h3 id="cloud-nube-fix-title" class="cloud-nube-fix-title">' + esc(guide.title) + '</h3><p class="cloud-nube-fix-summary">' + esc(guide.summary) + '</p><ol class="cloud-nube-fix-steps">' + stepsHtml + '</ol><div class="cloud-nube-fix-actions"><button type="button" class="cloud-sync-btn" data-cloud-nube-fix-close>Cerrar</button></div></div></div>';
}
function showCloudNubeFixModal(fixId) {
  const guide = getCloudNubeFixGuide(fixId) || getCloudNubeFixGuide("generic_sync_error");
  if (!guide) return;
  const host = document.createElement("div");
  host.innerHTML = cloudNubeFixModalMarkup(guide);
  const overlay = host.firstElementChild;
  if (!overlay || !(overlay instanceof HTMLElement)) return;
  function close() {
    overlay.remove();
  }
  overlay.addEventListener("click", function(ev) {
    if (ev.target === overlay) close();
  });
  const closeBtn = overlay.querySelector("[data-cloud-nube-fix-close]");
  if (closeBtn) closeBtn.addEventListener("click", close);
  document.body.appendChild(overlay);
  if (closeBtn && typeof closeBtn.focus === "function") closeBtn.focus();
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
  if (next !== "nube") {
    stopCloudSyncDiagnosticsLiveRefresh(
      section.querySelector("[data-cloud-nube-diagnostics-host]")
    );
  }
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

// public/js/features/cloud-sync/cloud-sync-diagnostics-human.mjs
var WS_CLOSE_EXPLAIN = {
  1e3: "Cierre normal del canal en vivo.",
  1001: "El servidor o la aplicaci\xF3n cerr\xF3 el canal en vivo.",
  1006: "La conexi\xF3n en vivo se cort\xF3 sin aviso (red intermitente, pesta\xF1a en segundo plano o el servidor cerr\xF3 el socket). Se reintenta autom\xE1ticamente.",
  1008: "El servidor rechaz\xF3 la conexi\xF3n en vivo (token, sala o permisos inv\xE1lidos).",
  1011: "Error interno del servidor en el canal en vivo.",
  1012: "El servidor reinici\xF3 el canal en vivo.",
  1013: "El servidor pide reintentar el canal en vivo m\xE1s tarde."
};
var ERROR_CODE_EXPLAIN = {
  revision_stale: "La revisi\xF3n local est\xE1 desactualizada. R+ har\xE1 pull y reintentar\xE1 el env\xEDo.",
  conflict: "Conflicto de versiones con la sala. Se reintenta tras actualizar.",
  quota_exceeded: "L\xEDmite de la sala alcanzado en el servidor.",
  invalid_credentials: "Usuario o contrase\xF1a incorrectos.",
  unauthorized: "Sesi\xF3n no autorizada. Vuelve a iniciar sesi\xF3n en Conexi\xF3n.",
  invalid_token: "Token de sesi\xF3n inv\xE1lido o expirado. Cierra sesi\xF3n y vuelve a entrar.",
  auth_required: "Se requiere iniciar sesi\xF3n en Nube.",
  forbidden: "No tienes permiso para esta acci\xF3n en la sala.",
  not_member: "Tu usuario no pertenece a esta sala.",
  not_found: "Sala o recurso no encontrado en el servidor.",
  payload_too_large: "El cambio es demasiado grande para enviar.",
  push_failed: "No se pudo enviar el censo u operaci\xF3n a Nube.",
  not_implemented: "Funci\xF3n no disponible en el servidor.",
  error: "Error gen\xE9rico del servidor.",
  401: "No autorizado (401). Vuelve a iniciar sesi\xF3n.",
  403: "Acceso denegado (403). Revisa sala y permisos.",
  404: "No encontrado (404). Revisa URL del servicio y sala.",
  409: "Conflicto de versi\xF3n (409). Se reintenta tras actualizar.",
  413: "Payload demasiado grande (413).",
  500: "Error del servidor (500). Reintenta en unos minutos.",
  502: "Servidor no disponible (502).",
  503: "Servidor saturado (503)."
};
var OP_LABELS = {
  push: "Env\xEDo a Nube",
  pull: "Descarga desde Nube",
  census: "Censo",
  cycle: "Ciclo de sync",
  unknown: "Operaci\xF3n"
};
var OUTBOX_KIND_LABELS = {
  signos: "signos",
  pendientes: "pendientes",
  censo: "censo",
  eventualidades: "eventualidades",
  agenda: "agenda",
  delete: "borrados",
  patient: "paciente",
  clinicalOps: "operaciones",
  labs: "labs",
  other: "otros"
};
function parseWsClose(raw) {
  const text = String(raw || "").trim();
  if (!text) return { code: 0, reason: "" };
  try {
    const o = JSON.parse(text);
    return {
      code: Number(o?.code) || 0,
      reason: String(o?.reason || "").trim()
    };
  } catch {
    return { code: 0, reason: text };
  }
}
function explainWsCloseCode(code, reason) {
  const n = Number(code) || 0;
  const base = WS_CLOSE_EXPLAIN[n] || `C\xF3digo de cierre WebSocket ${n}.`;
  const extra = String(reason || "").trim();
  if (!extra) return base;
  return base + " Motivo: " + extra + ".";
}
function explainCloudErrorCode(code, fallbackMessage) {
  const key = String(code || "").trim();
  const fallback = humanizeTechnicalSyncMessage(String(fallbackMessage || "").trim());
  if (key && ERROR_CODE_EXPLAIN[key]) return ERROR_CODE_EXPLAIN[key];
  if (fallback) return fallback;
  if (key) return "Error: " + key + ".";
  return "Error de sincronizaci\xF3n.";
}
function humanizeCloudSyncError(entry) {
  const op = OP_LABELS[String(entry?.op || "unknown")] || String(entry?.op || "Operaci\xF3n");
  const explain = explainCloudErrorCode(entry?.code, entry?.message);
  return { op, explain, rawMessage: String(entry?.message || "").trim() };
}
function cloudDiagTransportLabel(transport) {
  if (transport === "ws") return "En vivo (WebSocket)";
  if (transport === "offline") return "Sin conexi\xF3n";
  return "Sondeo HTTP";
}
function formatCloudDiagWhen(iso, nowMs) {
  const raw = String(iso || "").trim();
  if (!raw) return "\u2014";
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return raw;
  const now = Number(nowMs) || Date.now();
  const delta = Math.max(0, now - t);
  if (delta < 45e3) return "ahora";
  if (delta < 9e4) return "hace 1 min";
  const mins = Math.floor(delta / 6e4);
  if (mins < 60) return "hace " + mins + " min";
  const hours = Math.floor(mins / 60);
  if (hours < 48) return "hace " + hours + " h";
  try {
    return new Date(t).toLocaleString("es", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return raw;
  }
}
function formatRoomLabel(snapshot, roomId) {
  if (snapshot?.name) return String(snapshot.name);
  const sala = String(snapshot?.sala || "").trim();
  const turn = String(snapshot?.turnKey || "").trim();
  if (sala) return turn ? sala + " \xB7 " + turn : sala;
  const code = String(snapshot?.code || "").trim();
  if (code) return code;
  const id = String(roomId || "").trim();
  if (id.length > 12) return id.slice(0, 8) + "\u2026";
  return id || "Sin sala";
}
function formatOutboxKinds(byKind) {
  const rows = Object.entries(byKind || {}).filter(function(pair) {
    return Number(pair[1]) > 0;
  }).map(function(pair) {
    const label = OUTBOX_KIND_LABELS[pair[0]] || pair[0];
    return Number(pair[1]) + " " + label;
  });
  return rows.join(", ");
}
function formatCloudDiagBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return String(n) + " B";
  if (n < 1024 * 1024) return String(Math.round(n / 1024)) + " KB";
  return (n / (1024 * 1024)).toFixed(1) + " MB";
}
function formatToxicOutboxDetail(row) {
  const id = String(row.clientMutationId || "push");
  const total = formatCloudDiagBytes(row.totalBytes);
  let detail = "\xAB" + id + "\xBB: " + String(row.opCount || 0) + " ops, ~" + total + " total.";
  const maxPath = String(row.maxOpPath || "").trim();
  if (maxPath) {
    detail += " Mayor: " + maxPath + " (~" + formatCloudDiagBytes(row.maxOpBytes) + ").";
  }
  if (Number(row.totalBytes) > CLOUD_PUSH_WARN_BODY_BYTES) {
    detail += " L\xEDmite servidor ~" + formatCloudDiagBytes(CLOUD_PUSH_WARN_BODY_BYTES) + ".";
  }
  return detail;
}
function isSyncFailureActive(diag) {
  const status = String(diag.status || "unknown");
  return status === "error" || diag.lastCycleOk === false;
}
function isWsCloseStillActive(diag, transport, wsClose) {
  const code = Number(wsClose.code) || 0;
  if (!code || code === 1e3 || code === 1001) return false;
  if (transport === "ws") {
    return code === 1008 || code === 1011;
  }
  if (code === 1006) {
    return isSyncFailureActive(diag);
  }
  return true;
}
function isWsErrorStillActive(diag, transport) {
  if (!diag.lastWsError) return false;
  if (transport === "ws") return false;
  return isSyncFailureActive(diag) || transport === "offline" || diag.online === false;
}
function dedupeRecentErrors(rows) {
  const seen = /* @__PURE__ */ new Set();
  return rows.filter(function(row) {
    const key = row.op + "\0" + row.explain;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function buildCloudDiagnosticsHumanView(diag, nowMs) {
  const d = diag && typeof diag === "object" ? diag : {};
  const now = Number(nowMs) || Date.now();
  const status = String(d.status || "unknown");
  const transport = String(d.transport || "poll");
  const outboxCount = Number(d.outbox?.count || 0);
  const wsClose = parseWsClose(d.lastWsClose);
  const issues = [];
  const syncFailing = isSyncFailureActive(d);
  const recentErrors = syncFailing ? dedupeRecentErrors(
    (d.lastErrors || []).map(function(entry) {
      const human = humanizeCloudSyncError(entry);
      return {
        at: formatCloudDiagWhen(entry.at, now),
        op: human.op,
        explain: human.explain,
        code: String(entry.code || ""),
        fixId: resolveCloudErrorFixId({
          op: entry.op,
          code: entry.code,
          message: entry.message,
          explain: human.explain
        })
      };
    })
  ) : [];
  if (d.online === false) {
    issues.push({
      fixId: "no_internet",
      severity: "warn",
      title: "Sin internet",
      detail: "No hay conexi\xF3n de red. Los cambios se guardan localmente hasta recuperar red."
    });
  } else if (syncFailing && (recentErrors.some((row) => isCloudSyncNetworkErrorMessage(row.explain)) || isCloudSyncNetworkErrorMessage(d.detail))) {
    issues.push({
      fixId: "network_unreachable",
      severity: "error",
      title: "Sin contacto estable con Nube",
      detail: "El dispositivo reporta internet, pero las peticiones a Nube fallan (Failed to fetch). Revisa Wi\u2011Fi, VPN o firewall; recarga R+ y reintenta cuando la red sea estable.",
      hint: "El servidor de Nube puede estar bien; el problema suele ser la ruta de red del dispositivo."
    });
  }
  if (d.cloudActive === false) {
    issues.push({
      fixId: "cloud_not_active",
      severity: "info",
      title: "Nube no activa",
      detail: "La sincronizaci\xF3n con Nube est\xE1 desactivada para esta guardia."
    });
  }
  if (d.tokenPresent === false) {
    issues.push({
      fixId: "no_session",
      severity: "error",
      title: "Sin sesi\xF3n en Nube",
      detail: "Inicia sesi\xF3n en Conexi\xF3n para sincronizar."
    });
  }
  if (!String(d.roomId || "").trim()) {
    issues.push({
      fixId: "no_room",
      severity: "warn",
      title: "Sin sala configurada",
      detail: "Selecciona sala y equipo en Conexi\xF3n."
    });
  }
  if (d.bridgeConfigured === false) {
    issues.push({
      fixId: "bridge_not_configured",
      severity: "warn",
      title: "Sync local no enlazado",
      detail: "El runtime de Nube no est\xE1 conectado a los cambios cl\xEDnicos."
    });
  }
  if (d.tokenPresent && String(d.roomId || "").trim() && d.runtimeActive === false) {
    issues.push({
      fixId: "sync_not_active",
      severity: "error",
      title: "Sync no est\xE1 activo",
      detail: CLOUD_SYNC_CLIENT_NOT_READY,
      hint: "Tienes sesi\xF3n y sala, pero el motor de sync no arranc\xF3."
    });
  }
  if (outboxCount > 0) {
    const kinds = formatOutboxKinds(d.outbox?.byKind);
    issues.push({
      fixId: "outbox_pending",
      severity: "warn",
      title: outboxCount + " cambio" + (outboxCount !== 1 ? "s" : "") + " pendiente" + (outboxCount !== 1 ? "s" : ""),
      detail: kinds ? "En cola: " + kinds + ". Usa \xABReintentar cola Nube\xBB si no se env\xEDan." : "Hay mutaciones en cola. Usa \xABReintentar cola Nube\xBB si no se env\xEDan."
    });
  }
  const toxicRows = (Array.isArray(d.outbox?.entries) ? d.outbox.entries : []).filter(isToxicCloudOutboxEntry).sort(function(a, b) {
    return Number(b.totalBytes) - Number(a.totalBytes);
  });
  if (toxicRows.length > 0) {
    const worst = toxicRows[0];
    const legacyBackfill = String(worst.clientMutationId || "") === CLOUD_LAB_BACKFILL_MUTATION_ID && Number(worst.opCount) > 1;
    issues.push({
      fixId: legacyBackfill ? "toxic_legacy_lab_backfill" : "toxic_outbox_chunk",
      severity: "error",
      title: legacyBackfill ? "Labs en lote obsoleto (cliente antiguo)" : "Lote pesado bloqueando la cola",
      detail: formatToxicOutboxDetail(worst),
      hint: legacyBackfill ? "Actualiza R+ en esta Mac y en cualquier otra en la sala; luego \xABReintentar cola\xBB divide por paciente." : "\xABDescartar labs en cola\xBB si ya est\xE1n en Nube, o \xABReintentar cola\xBB tras actualizar R+."
    });
  }
  if (status === "error" && recentErrors.length === 0) {
    issues.push({
      fixId: "sync_error",
      severity: "error",
      title: "Error de sincronizaci\xF3n",
      detail: String(d.detail || "Revisa los \xFAltimos errores abajo.")
    });
  }
  if (status === "offline") {
    issues.push({
      fixId: "cloud_offline",
      severity: "warn",
      title: "Sin conexi\xF3n a Nube",
      detail: String(d.detail || "No se puede contactar el servicio de sync.")
    });
  }
  if (d.lastCycleOk === false && recentErrors.length === 0) {
    issues.push({
      fixId: "cycle_failed",
      severity: "error",
      title: "El \xFAltimo ciclo de sync fall\xF3",
      detail: "\xDAltimo intento: " + formatCloudDiagWhen(d.lastCycleAt, now) + "."
    });
  }
  if (isWsErrorStillActive(d, transport)) {
    issues.push({
      fixId: "ws_error",
      severity: "warn",
      title: "Error en canal en vivo",
      detail: String(d.lastWsError)
    });
  }
  if (isWsCloseStillActive(d, transport, wsClose)) {
    const abnormal = wsClose.code === 1006;
    const severity = wsClose.code === 1008 || wsClose.code === 1011 ? "error" : abnormal && transport === "poll" ? "info" : "warn";
    const hint = transport === "poll" ? "El sync sigue activo por sondeo HTTP cada pocos segundos." : "Se reintentar\xE1 la conexi\xF3n en vivo autom\xE1ticamente.";
    issues.push({
      fixId: "ws_close",
      severity,
      title: abnormal ? "Canal en vivo interrumpido" : "Canal en vivo cerrado",
      detail: explainWsCloseCode(wsClose.code, wsClose.reason),
      hint
    });
  }
  const facts = [
    { label: "Sincronizaci\xF3n", value: STATUS_LABELS[status] || status },
    { label: "Internet", value: d.online === false ? "Sin conexi\xF3n" : d.online ? "Conectado" : "\u2014" },
    {
      label: "Sesi\xF3n Nube",
      value: d.tokenPresent ? "Activa" : "Sin iniciar"
    },
    {
      label: "Sala",
      value: formatRoomLabel(d.roomSnapshot, String(d.roomId || ""))
    },
    {
      label: "Revisi\xF3n local",
      value: Number.isFinite(Number(d.revision)) ? String(d.revision) : "\u2014"
    },
    {
      label: "Canal activo",
      value: cloudDiagTransportLabel(transport)
    },
    {
      label: "Cola de cambios",
      value: outboxCount > 0 ? outboxCount + " pendiente" + (outboxCount !== 1 ? "s" : "") + (formatOutboxKinds(d.outbox?.byKind) ? " (" + formatOutboxKinds(d.outbox?.byKind) + ")" : "") : "Vac\xEDa"
    },
    { label: "\xDAltimo pull", value: formatCloudDiagWhen(d.lastPullAt, now) },
    { label: "\xDAltimo push", value: formatCloudDiagWhen(d.lastPushAt, now) },
    {
      label: "\xDAltima se\xF1al en vivo",
      value: d.lastWsSignalAt ? formatCloudDiagWhen(d.lastWsSignalAt, now) : "Sin se\xF1ales recientes"
    },
    {
      label: "Pacientes locales",
      value: Number.isFinite(Number(d.localPatientCount)) ? String(d.localPatientCount) : "\u2014"
    }
  ];
  const hasError = issues.some(function(item) {
    return item.severity === "error";
  }) || recentErrors.length > 0;
  const hasWarn = issues.some(function(item) {
    return item.severity === "warn";
  });
  let level = "ok";
  let headline = STATUS_LABELS.idle;
  let subline = "Los cambios locales coinciden con la sala en Nube.";
  if (status === "syncing") {
    level = "info";
    headline = STATUS_LABELS.syncing;
    subline = "Enviando o descargando cambios\u2026";
  } else if (hasError) {
    level = "error";
    headline = "Hay problemas de sincronizaci\xF3n";
    subline = "Revisa las alertas m\xE1s abajo.";
  } else if (hasWarn || status === "pending") {
    level = "warn";
    headline = status === "pending" ? STATUS_LABELS.pending : "Revisa la sincronizaci\xF3n";
    subline = issues.find(function(item) {
      return item.severity === "warn";
    })?.detail || "Hay avisos que conviene revisar.";
  } else if (status === "offline") {
    level = "warn";
    headline = STATUS_LABELS.offline;
    subline = "Sin contacto con el servicio de Nube.";
  } else if (status === "idle") {
    level = "ok";
    headline = STATUS_LABELS.idle;
    subline = transport === "ws" ? "Canal en vivo conectado; la cola est\xE1 vac\xEDa." : "Sync por sondeo HTTP; la cola est\xE1 vac\xEDa.";
  }
  const roomLabel = formatRoomLabel(d.roomSnapshot, String(d.roomId || ""));
  function activityTileStatus(iso) {
    if (!iso) return d.online === false ? "error" : "warn";
    const t = Date.parse(String(iso));
    if (!Number.isFinite(t)) return "warn";
    const delta = Math.max(0, now - t);
    if (delta < 12e4) return "ok";
    if (delta < 9e5) return "warn";
    return "warn";
  }
  let liveValue = "\u2014";
  let liveStatus = "neutral";
  let liveHint = "";
  if (transport === "offline" || d.online === false) {
    liveValue = "Sin conexi\xF3n";
    liveStatus = "error";
    liveHint = "Sin red";
  } else if (transport === "ws") {
    if (wsClose.code && wsClose.code !== 1e3 && wsClose.code !== 1001) {
      liveValue = "Reconectando";
      liveStatus = "warn";
      liveHint = "Canal en vivo";
    } else {
      liveValue = "En vivo";
      liveStatus = "ok";
      liveHint = "WebSocket activo";
    }
  } else {
    liveValue = "Sondeo HTTP";
    liveStatus = wsClose.code === 1006 ? "ok" : "ok";
    liveHint = wsClose.code === 1006 ? "En vivo en pausa" : "Activo";
  }
  const queueStatus = outboxCount > 0 ? status === "error" || recentErrors.length > 0 ? "error" : "warn" : "ok";
  let syncPipelineState = status === "error" ? "error" : status === "offline" ? "error" : status === "pending" ? "warn" : status === "syncing" ? "info" : "ok";
  let syncPipelineDetail = STATUS_LABELS[status] || status;
  if (recentErrors.length > 0 || d.lastCycleOk === false) {
    syncPipelineState = "error";
    syncPipelineDetail = recentErrors[0]?.explain || "Fall\xF3 el \xFAltimo ciclo de sync";
  } else if (status === "error") {
    syncPipelineDetail = humanizeTechnicalSyncMessage(String(d.detail || "")) || STATUS_LABELS.error;
  } else if (d.tokenPresent && String(d.roomId || "").trim() && d.runtimeActive === false) {
    syncPipelineState = "error";
    syncPipelineDetail = "Sync detenido";
  }
  if (/enlace con nube|cliente nube|no está listo|sync detenido/i.test(syncPipelineDetail)) {
    syncPipelineDetail = "Sin enlace activo";
  } else if (syncPipelineDetail.length > 32) {
    syncPipelineDetail = syncPipelineDetail.slice(0, 29) + "\u2026";
  }
  const displayStatusKey = recentErrors.length > 0 || status === "error" ? "error" : hasWarn || status === "pending" ? "pending" : status === "syncing" ? "syncing" : status === "offline" ? "offline" : "idle";
  const pipeline = [
    {
      label: "Internet",
      state: d.online === false ? "error" : d.online ? "ok" : "warn",
      detail: d.online === false ? "Sin conexi\xF3n" : d.online ? "Conectado" : "\u2014"
    },
    {
      label: "Sesi\xF3n",
      state: d.tokenPresent ? "ok" : "error",
      detail: d.tokenPresent ? "Activa" : "Sin iniciar"
    },
    {
      label: "Sala",
      state: String(d.roomId || "").trim() ? "ok" : "warn",
      detail: roomLabel
    },
    {
      label: "Sync",
      state: syncPipelineState,
      detail: syncPipelineDetail
    }
  ];
  const tiles = [
    {
      id: "queue",
      label: "Cola",
      value: String(outboxCount),
      status: queueStatus,
      hint: outboxCount > 0 ? "Pendientes" : "Vac\xEDa"
    },
    {
      id: "revision",
      label: "Revisi\xF3n",
      value: Number.isFinite(Number(d.revision)) ? String(d.revision) : "\u2014",
      status: "neutral",
      hint: "Local"
    },
    {
      id: "pull",
      label: "Pull",
      value: formatCloudDiagWhen(d.lastPullAt, now),
      status: activityTileStatus(d.lastPullAt),
      hint: "Descarga"
    },
    {
      id: "push",
      label: "Push",
      value: formatCloudDiagWhen(d.lastPushAt, now),
      status: activityTileStatus(d.lastPushAt),
      hint: "Env\xEDo"
    },
    {
      id: "live",
      label: "Canal",
      value: liveValue,
      status: liveStatus,
      hint: liveHint
    },
    {
      id: "patients",
      label: "Pacientes",
      value: Number.isFinite(Number(d.localPatientCount)) ? String(d.localPatientCount) : "\u2014",
      status: "neutral",
      hint: "Locales"
    }
  ];
  const outboxBreakdown = Object.entries(d.outbox?.byKind || {}).filter(function(pair) {
    return Number(pair[1]) > 0;
  }).map(function(pair) {
    const kind = pair[0];
    const count = Number(pair[1]) || 0;
    return {
      kind,
      label: OUTBOX_KIND_LABELS[kind] || kind,
      count,
      share: outboxCount > 0 ? Math.round(count / outboxCount * 100) : 0
    };
  }).sort(function(a, b) {
    return b.count - a.count;
  });
  return {
    verdict: { level, headline, subline },
    statusKey: status,
    displayStatusKey,
    roomLabel,
    facts,
    tiles,
    pipeline,
    outboxBreakdown,
    toxicOutbox: toxicRows.slice(0, 3).map(function(row) {
      return {
        clientMutationId: String(row.clientMutationId || ""),
        opCount: Number(row.opCount) || 0,
        totalBytes: Number(row.totalBytes) || 0,
        totalLabel: formatCloudDiagBytes(row.totalBytes),
        maxOpPath: row.maxOpPath || null,
        maxOpBytes: Number(row.maxOpBytes) || 0,
        maxOpLabel: formatCloudDiagBytes(row.maxOpBytes),
        detail: formatToxicOutboxDetail(row)
      };
    }),
    issues,
    recentErrors
  };
}

// public/js/features/cloud-sync/panel-cloud-diagnostics-html.mjs
function statusChipClass(displayStatusKey, verdictLevel) {
  const key = String(displayStatusKey || "");
  if (key === "error" || verdictLevel === "error") return "is-error";
  if (key === "syncing" || verdictLevel === "info") return "is-syncing";
  if (key === "pending" || key === "offline" || verdictLevel === "warn") return "is-pending";
  return "is-idle";
}
function renderClickableAlert(item) {
  const fixId = String(item.fixId || "generic_sync_error");
  let html = '<button type="button" class="cloud-sync-inset-row cloud-sync-inset-row--nav cloud-nube-dash-alert" data-cloud-diag-fix="' + esc(fixId) + '" data-severity="' + esc(String(item.severity || "warn")) + '"><span class="cloud-nube-dash-alert-body"><span class="cloud-nube-dash-alert-title">' + esc(String(item.title || "Problema")) + '</span><span class="cloud-nube-dash-alert-detail">' + esc(String(item.detail || "")) + "</span>";
  if (item.hint) {
    html += '<span class="cloud-nube-dash-alert-hint">' + esc(String(item.hint)) + "</span>";
  }
  html += '<span class="cloud-nube-dash-alert-cta">C\xF3mo arreglar</span></span><span class="cloud-sync-options-row-chevron" aria-hidden="true">\u203A</span></button>';
  return html;
}
function renderCloudNubeDashboardHtml(view) {
  const v = view && typeof view === "object" ? view : {};
  const verdict = v.verdict || { level: "ok", headline: "\u2014", subline: "" };
  const chipClass = statusChipClass(v.displayStatusKey || v.statusKey, verdict.level);
  let html = '<div class="cloud-nube-dashboard"><div class="cloud-sync-inset-group cloud-nube-dash-card"><div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-head"><div class="cloud-nube-dash-head-main"><span class="cloud-sync-status-chip cloud-nube-dash-chip ' + esc(chipClass) + '">' + esc(verdict.headline) + "</span>";
  if (v.roomLabel) {
    html += '<span class="cloud-nube-dash-room">' + esc(v.roomLabel) + "</span>";
  }
  html += "</div>";
  if (verdict.subline) {
    html += '<p class="cloud-nube-dash-subline">' + esc(verdict.subline) + "</p>";
  }
  html += "</div>";
  if (Array.isArray(v.tiles) && v.tiles.length > 0) {
    v.tiles.forEach(function(tile) {
      const dd = esc(tile.value) + (tile.hint ? '<span class="cloud-nube-dash-kv-muted"> \xB7 ' + esc(tile.hint) + "</span>" : "");
      html += '<div class="cloud-sync-inset-row cloud-sync-inset-row--kv cloud-nube-dash-kv" data-status="' + esc(tile.status) + '"><dt>' + esc(tile.label) + "</dt><dd>" + dd + "</dd></div>";
    });
  }
  if (Array.isArray(v.pipeline) && v.pipeline.length > 0) {
    html += '<div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-pipeline-wrap">';
    html += '<span class="cloud-nube-dash-pipeline-label">Conexi\xF3n</span>';
    html += '<div class="cloud-nube-dash-pipeline">';
    v.pipeline.forEach(function(step) {
      const pipeFix = step.label === "Sync" && (step.state === "error" || step.state === "warn") ? ' data-cloud-diag-pipe-fix="sync_not_active"' : "";
      html += '<span class="cloud-nube-dash-pipe" data-state="' + esc(step.state) + '"' + pipeFix + '><span class="cloud-nube-dash-pipe-dot" aria-hidden="true"></span><span class="cloud-nube-dash-pipe-text">' + esc(step.label) + "<small>" + esc(step.detail) + "</small></span></span>";
    });
    html += "</div></div>";
  }
  if (Array.isArray(v.outboxBreakdown) && v.outboxBreakdown.length > 0) {
    html += '<div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-outbox-head">Cola por tipo</div>';
    v.outboxBreakdown.forEach(function(row) {
      html += '<div class="cloud-sync-inset-row cloud-sync-inset-row--kv cloud-nube-dash-outbox-row"><dt>' + esc(row.label) + '</dt><dd><span class="cloud-nube-dash-outbox-track" aria-hidden="true"><span class="cloud-nube-dash-outbox-bar" style="width:' + String(row.share) + '%"></span></span> ' + esc(String(row.count)) + "</dd></div>";
    });
  }
  if (Array.isArray(v.toxicOutbox) && v.toxicOutbox.length > 0) {
    html += '<div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-toxic-head">Lotes pesados en cola</div>';
    v.toxicOutbox.forEach(function(row) {
      html += '<div class="cloud-sync-inset-row cloud-sync-inset-row--kv cloud-nube-dash-toxic-row" data-status="error"><dt>' + esc(String(row.clientMutationId || "push")) + "</dt><dd>" + esc(String(row.opCount || 0) + " ops \xB7 ~" + String(row.totalLabel || "") + (row.maxOpPath ? " \xB7 " + row.maxOpPath : "")) + "</dd></div>";
    });
  }
  html += "</div>";
  const hasAlerts = Array.isArray(v.issues) && v.issues.length > 0 || Array.isArray(v.recentErrors) && v.recentErrors.length > 0;
  if (hasAlerts) {
    html += '<div class="cloud-sync-inset-group cloud-nube-dash-card cloud-nube-dash-alerts-card">';
    html += '<div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-alerts-head">Problemas detectados</div>';
    if (Array.isArray(v.issues) && v.issues.length > 0) {
      v.issues.forEach(function(issue) {
        html += renderClickableAlert(issue);
      });
    }
    if (Array.isArray(v.recentErrors) && v.recentErrors.length > 0) {
      v.recentErrors.forEach(function(entry) {
        html += renderClickableAlert({
          fixId: entry.fixId,
          severity: "error",
          title: entry.op + " \xB7 " + entry.at,
          detail: entry.explain,
          hint: entry.code ? "C\xF3digo: " + entry.code : ""
        });
      });
    }
    html += "</div>";
  }
  html += '<div class="cloud-nube-dash-actions"><button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-cloud-diag-action="retry">Reintentar cola</button><button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-cloud-diag-action="sync">Forzar sync</button><button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-cloud-diag-action="prune-labs">Descartar labs en cola</button></div></div>';
  return html;
}

// public/js/features/cloud-sync/panel-cloud-diagnostics.mjs
function readCloudDiagnosticsRuntime() {
  const runtime = getSharedNubeRuntime();
  const outbox = getSharedNubeOutbox();
  return {
    status: runtime?.getStatus?.() || "idle",
    detail: runtime?.getDetail?.() || "",
    transport: runtime?.getTransportState?.() || "poll",
    runtimeActive: !!runtime,
    outboxEntries: outbox?.list?.() || []
  };
}
function readCloudDiagnosticsSettings() {
  const settings = getCloudSyncSettings();
  return {
    online: typeof navigator !== "undefined" ? navigator.onLine : null,
    bridgeConfigured: isCloudMutateBridgeConfigured(),
    cloudActive: isCloudSyncActive(),
    baseUrl: settings.baseUrl,
    tokenPresent: !!settings.token,
    roomId: settings.roomId,
    revision: settings.revision,
    roomSnapshot: getCloudSyncRoomSnapshot(),
    localPatientCount: Array.isArray(patients) ? patients.length : 0
  };
}
function buildCloudDiagnosticsDeps(deps) {
  return {
    ...readCloudDiagnosticsRuntime(),
    ...readCloudDiagnosticsSettings(),
    toast: typeof deps?.toast === "function" ? deps.toast : function() {
    }
  };
}
function updateDashboardPanel(host, view) {
  const panel = host.querySelector("[data-cloud-diag-dashboard]");
  if (!panel) return;
  panel.innerHTML = renderCloudNubeDashboardHtml(view);
}
function renderCloudDiagnosticsReport(host, deps) {
  const diagDeps = buildCloudDiagnosticsDeps(deps);
  const diag = getCloudSyncDiagnostics(diagDeps);
  const view = buildCloudDiagnosticsHumanView(diag);
  const report = formatCloudDiagnosticsReport(diag);
  const pre = host.querySelector(".cloud-sync-diagnostics-pre");
  if (pre) pre.textContent = report;
  updateDashboardPanel(host, view);
  return { diagDeps, diag, view, report };
}
function createDiagnosticsButton(label) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "cloud-sync-btn cloud-sync-btn--ghost";
  btn.style.width = "100%";
  btn.textContent = label;
  return btn;
}
function runDiagnosticsRetry(host, deps) {
  const runtime = getSharedNubeRuntime();
  if (!runtime) {
    deps?.toast?.("Runtime Nube inactivo. Reconecta en Conexi\xF3n.", "warn");
    return;
  }
  void runtime.flushOutbox().then(function() {
    return runtime.syncCycle();
  }).then(function() {
    deps?.toast?.("Cola Nube reintentada.", "info");
    refreshCloudSyncDiagnostics(host, deps);
  }).catch(function() {
    deps?.toast?.("Fall\xF3 el reintento. Revisa el dashboard.", "error");
    refreshCloudSyncDiagnostics(host, deps);
  });
}
function runDiagnosticsSync(host, deps) {
  const runtime = getSharedNubeRuntime();
  if (!runtime) {
    deps?.toast?.("Runtime Nube inactivo. Reconecta en Conexi\xF3n.", "warn");
    return;
  }
  void runtime.syncCycle().then(function() {
    deps?.toast?.("Ciclo Nube ejecutado.", "info");
    refreshCloudSyncDiagnostics(host, deps);
  });
}
function runDiagnosticsPruneLabs(host, deps) {
  const outbox = getSharedNubeOutbox();
  if (!outbox) {
    deps?.toast?.("Runtime Nube inactivo. Reconecta en Conexi\xF3n.", "warn");
    return;
  }
  const result = pruneLabSidecarsFromOutbox(outbox);
  const runtime = getSharedNubeRuntime();
  runtime?.refreshIdleStatus?.();
  if (result.removedOps > 0) {
    deps?.toast?.(
      "Se descartaron " + result.removedOps + " lab" + (result.removedOps !== 1 ? "s" : "") + " de la cola.",
      "info"
    );
  } else {
    deps?.toast?.("No hab\xEDa labs pendientes en la cola.", "info");
  }
  refreshCloudSyncDiagnostics(host, deps);
}
function wireDashboardActions(host, deps) {
  const panel = host.querySelector("[data-cloud-diag-dashboard]");
  if (!panel || panel.dataset.wired === "1") return;
  panel.dataset.wired = "1";
  panel.addEventListener("click", function(ev) {
    const target = ev.target;
    if (!target || typeof target.closest !== "function") return;
    const fixBtn = target.closest("[data-cloud-diag-fix]");
    if (fixBtn && panel.contains(fixBtn)) {
      const fixId = fixBtn.getAttribute("data-cloud-diag-fix");
      if (fixId) showCloudNubeFixModal(fixId);
      return;
    }
    const pipe = target.closest("[data-cloud-diag-pipe-fix]");
    if (pipe && panel.contains(pipe)) {
      const fixId = pipe.getAttribute("data-cloud-diag-pipe-fix");
      if (fixId) showCloudNubeFixModal(fixId);
      return;
    }
    const btn = target.closest("[data-cloud-diag-action]");
    if (!btn || !panel.contains(btn)) return;
    const action = btn.getAttribute("data-cloud-diag-action");
    if (action === "retry") runDiagnosticsRetry(host, deps);
    else if (action === "sync") runDiagnosticsSync(host, deps);
    else if (action === "prune-labs") runDiagnosticsPruneLabs(host, deps);
  });
}
function wireDiagnosticsLiveRefresh(host, deps) {
  if (!host || host.dataset.diagLiveWired === "1") return;
  host.dataset.diagLiveWired = "1";
  let debounceTimer = null;
  let pollTimer = null;
  function refreshIfMounted() {
    if (!host.isConnected || !host.querySelector(".cloud-sync-diagnostics")) return;
    refreshCloudSyncDiagnostics(host, deps);
  }
  function scheduleRefresh() {
    if (debounceTimer) return;
    debounceTimer = setTimeout(function() {
      debounceTimer = null;
      refreshIfMounted();
    }, 200);
  }
  document.addEventListener(CLOUD_OUTBOX_CHANGED_EVENT, scheduleRefresh);
  pollTimer = setInterval(refreshIfMounted, 1500);
  host._rpcDiagLiveCleanup = function() {
    document.removeEventListener(CLOUD_OUTBOX_CHANGED_EVENT, scheduleRefresh);
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = null;
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    delete host._rpcDiagLiveCleanup;
    delete host.dataset.diagLiveWired;
  };
}
function stopCloudSyncDiagnosticsLiveRefresh(host) {
  if (host && typeof host._rpcDiagLiveCleanup === "function") {
    host._rpcDiagLiveCleanup();
  }
}
function mountCloudSyncDiagnostics(host, deps) {
  if (!host) return;
  stopCloudSyncDiagnosticsLiveRefresh(host);
  host.textContent = "";
  const wrap = document.createElement("div");
  wrap.className = "cloud-sync-diagnostics";
  const dashboardPanel = document.createElement("div");
  dashboardPanel.className = "cloud-sync-diag-dashboard-host";
  dashboardPanel.setAttribute("data-cloud-diag-dashboard", "1");
  wrap.appendChild(dashboardPanel);
  const technical = document.createElement("details");
  technical.className = "cloud-sync-diag-technical";
  const technicalSummary = document.createElement("summary");
  technicalSummary.textContent = "Informe t\xE9cnico (soporte)";
  technical.appendChild(technicalSummary);
  const reportPre = document.createElement("pre");
  reportPre.className = "cloud-sync-diagnostics-pre lan-sync-diagnostics-pre";
  technical.appendChild(reportPre);
  wrap.appendChild(technical);
  const copyBtn = createDiagnosticsButton("Copiar informe t\xE9cnico");
  copyBtn.style.marginTop = "6px";
  copyBtn.onclick = function() {
    const built = renderCloudDiagnosticsReport(host, deps);
    void copyToClipboardSafe(built.report).then(function(ok) {
      deps?.toast?.(
        ok ? "Informe t\xE9cnico copiado (tokens redactados)." : "No se pudo copiar el informe.",
        ok ? "success" : "error"
      );
    });
  };
  wrap.appendChild(copyBtn);
  host.appendChild(wrap);
  wireDashboardActions(host, deps);
  wireDiagnosticsLiveRefresh(host, deps);
  renderCloudDiagnosticsReport(host, deps);
}
function refreshCloudSyncDiagnostics(host, deps) {
  if (!host) return;
  if (!host.querySelector(".cloud-sync-diagnostics")) {
    mountCloudSyncDiagnostics(host, deps);
    return;
  }
  wireDiagnosticsLiveRefresh(host, deps);
  renderCloudDiagnosticsReport(host, deps);
}

export {
  refreshCloudSyncDiagnostics,
  connectedViewsHtml,
  applyConexionView,
  wireCloudAuthTabs,
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
//# sourceMappingURL=/js/chunks/chunk-4BBBETP7.js.map
