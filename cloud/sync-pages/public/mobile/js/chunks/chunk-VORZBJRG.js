import {
  escHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";

// public/js/patient-sidebar-card.mjs
function escSidebarHtml(s) {
  return escHtml(s);
}
function shortenPatientDisplayName(fullName) {
  const name = String(fullName || "").trim();
  if (!name || name.includes(",")) return name;
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return name;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}
function formatPatientBedParts(p) {
  const cuarto = String(p?.cuarto || "").trim();
  const cama = String(p?.cama || "").trim();
  return { cuarto, cama };
}
function formatPatientBedLabel(p) {
  const { cuarto, cama } = formatPatientBedParts(p);
  if (!cuarto && !cama) return "";
  if (cuarto && cama) return `${cuarto}\xB7${cama}`;
  return cuarto || cama;
}
function formatPatientBedMetaHtml(p) {
  const { cuarto, cama } = formatPatientBedParts(p);
  const parts = [];
  if (cuarto) parts.push(`<span>Cto. ${escSidebarHtml(cuarto)}</span>`);
  if (cama) parts.push(`<span>Cama ${escSidebarHtml(cama)}</span>`);
  return parts;
}
function renderPatientSidebarBodyHtml(p, opts) {
  opts = opts || {};
  const showServicio = opts.showServicio !== false;
  const nombreRaw = String(p?.nombre || "").trim();
  const nombreDisplay = shortenPatientDisplayName(nombreRaw) || "Sin nombre";
  const registro = String(p?.registro || "").trim();
  const servicio = showServicio ? String(p?.servicio || "").trim() : "";
  const nameTitleParts = [nombreRaw !== nombreDisplay ? nombreRaw : "", registro, servicio].filter(Boolean);
  const nameTitleAttr = nameTitleParts.length ? ` title="${escSidebarHtml(nameTitleParts.join(" \xB7 "))}"` : "";
  const metaParts = formatPatientBedMetaHtml(p);
  if (servicio) {
    metaParts.push(`<span class="patient-card-svc">${escSidebarHtml(servicio)}</span>`);
  }
  const metaHtml = metaParts.length ? `<div class="p-meta">${metaParts.join("")}</div>` : "";
  const bodyClass = opts.roundRow ? "patient-card-body patient-card-body--round" : "patient-card-body";
  return `<div class="${bodyClass}"><div class="p-name"${nameTitleAttr}>${escSidebarHtml(nombreDisplay)}</div>` + metaHtml + `</div>`;
}

export {
  shortenPatientDisplayName,
  formatPatientBedLabel,
  renderPatientSidebarBodyHtml
};
//# sourceMappingURL=/js/chunks/chunk-VORZBJRG.js.map
