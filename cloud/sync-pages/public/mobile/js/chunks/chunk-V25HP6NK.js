// public/js/features/cloud-mobile/origin.mjs
function isCloudMobileClient() {
  if (typeof globalThis !== "undefined" && globalThis.__RPC_CLOUD_MOBILE__) return true;
  if (typeof document !== "undefined") {
    if (document.documentElement?.dataset?.cloudMobile === "1") return true;
    if (document.documentElement?.classList?.contains("rpc-cloud-mobile")) return true;
  }
  if (typeof location !== "undefined") {
    const path = String(location.pathname || "");
    if (/^\/mobile(\/|$)/i.test(path)) return true;
  }
  return false;
}

// lib/lab-mobile-history-window.mjs
var MOBILE_LAB_HISTORY_DAYS = 3;
var DAY_MS = 24 * 60 * 60 * 1e3;
var TEND_MESES_MAP = {
  ene: "01",
  feb: "02",
  mar: "03",
  abr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  ago: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dic: "12",
  jan: "01",
  apr: "04",
  aug: "08",
  dec: "12"
};
function startOfLocalDayMs(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
function mobileLabHistoryCutoffMs(now, days) {
  const ref = now instanceof Date ? now : /* @__PURE__ */ new Date();
  const n = Math.max(1, Math.floor(Number(days) || MOBILE_LAB_HISTORY_DAYS));
  return startOfLocalDayMs(ref) - (n - 1) * DAY_MS;
}
function applyHoraToMs(ms, horaStr) {
  if (!horaStr) return ms;
  const hm = String(horaStr).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!hm) return ms;
  return ms + (parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10)) * 60 * 1e3;
}
function parseLabSetFechaToMs(fechaStr, horaStr) {
  if (!fechaStr) return null;
  const t = String(fechaStr).trim();
  if (!t || t === "Anterior") return null;
  const mEn = t.match(/([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/i);
  if (mEn) {
    const monStr = TEND_MESES_MAP[mEn[1].toLowerCase().slice(0, 3)];
    if (monStr) {
      const mo = parseInt(monStr, 10) - 1;
      const ms = new Date(parseInt(mEn[3], 10), mo, parseInt(mEn[2], 10)).getTime();
      return applyHoraToMs(ms, horaStr);
    }
  }
  const mIso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (mIso) {
    const ms = new Date(parseInt(mIso[1], 10), parseInt(mIso[2], 10) - 1, parseInt(mIso[3], 10)).getTime();
    return applyHoraToMs(ms, horaStr);
  }
  const mNum = t.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (mNum) {
    let y = mNum[3] ? parseInt(mNum[3], 10) : (/* @__PURE__ */ new Date()).getFullYear();
    if (y < 100) y += 2e3;
    const ms = new Date(y, parseInt(mNum[2], 10) - 1, parseInt(mNum[1], 10)).getTime();
    return applyHoraToMs(ms, horaStr);
  }
  return null;
}
function inferLabSetMsFromId(set) {
  if (!set || typeof set !== "object") return null;
  const row = (
    /** @type {{ id?: unknown }} */
    set
  );
  const id = String(row.id || "").trim();
  const head = id.match(/^(\d{10,13})/);
  if (!head) return null;
  let ms = parseInt(head[1], 10);
  if (head[1].length === 10) ms *= 1e3;
  return Number.isFinite(ms) ? ms : null;
}
function resolveLabSetMs(set) {
  if (!set || typeof set !== "object") return null;
  const row = (
    /** @type {{ fecha?: unknown, hora?: unknown, id?: unknown, updatedAt?: unknown }} */
    set
  );
  if (row.fecha === "Anterior" || row.id === "migrated-anterior") return null;
  const fecha = String(row.fecha || "").trim();
  let ms = parseLabSetFechaToMs(fecha, row.hora);
  if (ms != null) return ms;
  ms = inferLabSetMsFromId(row);
  if (ms != null) return ms;
  const updatedAt = String(row.updatedAt || "").trim();
  if (updatedAt) {
    const parsed = Date.parse(updatedAt);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}
function isLabSetWithinMobileHistoryWindow(set, now, days) {
  if (!set || typeof set !== "object") return false;
  const row = (
    /** @type {{ fecha?: unknown, id?: unknown }} */
    set
  );
  if (row.fecha === "Anterior" || row.id === "migrated-anterior") return false;
  const ms = resolveLabSetMs(set);
  if (ms == null) return true;
  const ref = now instanceof Date ? now : /* @__PURE__ */ new Date();
  const windowDays = days != null ? days : MOBILE_LAB_HISTORY_DAYS;
  return ms >= mobileLabHistoryCutoffMs(ref, windowDays);
}
function filterLabHistorySetsForMobileReference(sets, opts) {
  const list = Array.isArray(sets) ? sets : [];
  const now = opts && opts.now instanceof Date ? opts.now : /* @__PURE__ */ new Date();
  const days = opts && opts.days != null ? opts.days : MOBILE_LAB_HISTORY_DAYS;
  return list.filter(function(set) {
    return isLabSetWithinMobileHistoryWindow(set, now, days);
  });
}
function filterLabSidecarMapForMobileReference(sidecarMap, opts) {
  if (!sidecarMap || typeof sidecarMap !== "object") return {};
  const out = {};
  Object.keys(sidecarMap).forEach(function(setId) {
    const set = sidecarMap[setId];
    if (isLabSetWithinMobileHistoryWindow(set, opts && opts.now, opts && opts.days)) {
      out[setId] = set;
    }
  });
  return out;
}

export {
  isCloudMobileClient,
  MOBILE_LAB_HISTORY_DAYS,
  mobileLabHistoryCutoffMs,
  parseLabSetFechaToMs,
  inferLabSetMsFromId,
  resolveLabSetMs,
  isLabSetWithinMobileHistoryWindow,
  filterLabHistorySetsForMobileReference,
  filterLabSidecarMapForMobileReference
};
//# sourceMappingURL=/js/chunks/chunk-V25HP6NK.js.map
