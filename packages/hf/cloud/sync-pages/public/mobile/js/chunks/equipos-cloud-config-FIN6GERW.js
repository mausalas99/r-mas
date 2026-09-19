import {
  readRpcSettings
} from "/mobile/js/chunks/chunk-7TJEM4JY.js";
import "/mobile/js/chunks/chunk-WAILSXBQ.js";

// public/js/equipos-cloud-config.mjs
var URL_KEY = "rpc-equipos-cloud-url";
var ADMIN_KEY = "rpc-equipos-admin-key";
var EQUIPOS_CLOUD_DEFAULT_URL = "https://rmas-lista-de-espera.rmas-workersdev.workers.dev";
var EQUIPOS_CLOUD_BOOT_FLAG = "equipos-cloud-boot-v805";
var LEGACY_CLOUD_URL_PATTERNS = [
  /^https?:\/\/rplus-equipos\./i,
  /laboratoriazo-lic\.workers\.dev/i
];
function isEquiposWorkersDevUrl(url) {
  try {
    return /\.workers\.dev$/i.test(new URL(String(url || "").trim()).hostname);
  } catch {
    return false;
  }
}
function migrateLegacyEquiposCloudUrl(url) {
  const raw = String(url || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  const isLegacy = LEGACY_CLOUD_URL_PATTERNS.some((re) => re.test(raw));
  if (!isLegacy) return raw;
  return "";
}
function normalizeEquiposCloudUrl(url) {
  let u = migrateLegacyEquiposCloudUrl(String(url || "").trim()).replace(/\/+$/, "");
  if (!u) return "";
  if (/\.workers$/i.test(u) && !/\.workers\.dev$/i.test(u)) {
    u = `${u}.dev`;
  }
  return u;
}
function getEquiposCloudConfig() {
  const settings = readRpcSettings();
  const rawUrl = String(
    settings.equiposCloudUrl || localStorage.getItem(URL_KEY) || EQUIPOS_CLOUD_DEFAULT_URL
  ).trim().replace(/\/+$/, "");
  const url = normalizeEquiposCloudUrl(rawUrl) || EQUIPOS_CLOUD_DEFAULT_URL;
  if (url && url !== rawUrl) {
    setEquiposCloudConfig({ url, adminKey: void 0 });
  }
  const adminKey = String(
    settings.equiposAdminKey || localStorage.getItem(ADMIN_KEY) || ""
  ).trim();
  return { enabled: true, url, adminKey };
}
function runEquiposCloudBootIfNeeded({ storage = localStorage, now = Date.now } = {}) {
  if (storage.getItem(EQUIPOS_CLOUD_BOOT_FLAG)) return { didRun: false };
  const settings = readRpcSettings();
  const rawUrl = String(settings.equiposCloudUrl || storage.getItem(URL_KEY) || "").trim();
  if (!rawUrl) {
    setEquiposCloudConfig({ url: EQUIPOS_CLOUD_DEFAULT_URL });
  }
  storage.setItem(EQUIPOS_CLOUD_BOOT_FLAG, String(now()));
  return { didRun: true };
}
function setEquiposCloudConfig(cfg) {
  const settings = readRpcSettings();
  if (cfg.url !== void 0) {
    const u = normalizeEquiposCloudUrl(String(cfg.url || "").trim());
    if (u) {
      settings.equiposCloudUrl = u;
      localStorage.setItem(URL_KEY, u);
    } else {
      delete settings.equiposCloudUrl;
      localStorage.removeItem(URL_KEY);
    }
  }
  if (cfg.adminKey !== void 0) {
    const k = String(cfg.adminKey || "").trim();
    if (k) {
      settings.equiposAdminKey = k;
      localStorage.setItem(ADMIN_KEY, k);
    } else {
      delete settings.equiposAdminKey;
      localStorage.removeItem(ADMIN_KEY);
    }
  }
  try {
    localStorage.setItem("rpc-settings", JSON.stringify(settings));
  } catch {
  }
}
function equiposCloudErrorMessage(code, fallback) {
  if (code === "admin_required") {
    return "Clave admin incorrecta o no configurada en el worker (wrangler secret put EQUIPOS_ADMIN_KEY).";
  }
  if (code === "admin_invalid") {
    return "Clave de administrador incorrecta. Debe ser exactamente EQUIPOS_ADMIN_KEY del worker desplegado en esta URL.";
  }
  if (code === "admin_not_configured") {
    return "El worker no tiene EQUIPOS_ADMIN_KEY. Ejecuta: wrangler secret put EQUIPOS_ADMIN_KEY";
  }
  if (code === "auth_required") {
    return "Genera el enlace y QR primero, o guarda la clave admin.";
  }
  return fallback;
}
async function equiposCloudFetch(path, opts = {}) {
  const cfg = getEquiposCloudConfig();
  if (!cfg.url) throw new Error("Equipos cloud no configurado.");
  const headers = { "Content-Type": "application/json" };
  const programToken = String(opts.programToken || "").trim();
  if (programToken) headers["X-Equipos-Token"] = programToken;
  if (opts.useAdminKey !== false && cfg.adminKey) {
    headers["X-Equipos-Admin-Key"] = cfg.adminKey;
  }
  let res;
  try {
    res = await fetch(`${cfg.url}/api/equipos/v1${path}`, {
      method: opts.method || "GET",
      headers,
      body: opts.body ? JSON.stringify(opts.body) : void 0
    });
  } catch {
    const hint = cfg.url.includes(".workers") && !cfg.url.includes(".workers.dev") ? "La URL debe terminar en .workers.dev" : "Revisa URL, red y que el worker est\xE9 desplegado (npm run deploy).";
    throw new Error(`No se pudo conectar al servicio cloud. ${hint}`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = data.error || "";
    const err = new Error(equiposCloudErrorMessage(code, data.message || "Error de red."));
    err.code = code;
    throw err;
  }
  return data;
}
function equiposCloudMobileUrl(_token) {
  const cfg = getEquiposCloudConfig();
  if (!cfg.url) return "";
  return cfg.url;
}
export {
  EQUIPOS_CLOUD_BOOT_FLAG,
  EQUIPOS_CLOUD_DEFAULT_URL,
  equiposCloudFetch,
  equiposCloudMobileUrl,
  getEquiposCloudConfig,
  isEquiposWorkersDevUrl,
  migrateLegacyEquiposCloudUrl,
  normalizeEquiposCloudUrl,
  runEquiposCloudBootIfNeeded,
  setEquiposCloudConfig
};
//# sourceMappingURL=/js/chunks/equipos-cloud-config-FIN6GERW.js.map
