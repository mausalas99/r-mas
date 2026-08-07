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

export {
  formatBytes,
  formatProgressLine,
  sanitizeUpdaterUserMessage
};
//# sourceMappingURL=/js/chunks/chunk-AIC37VNN.js.map
