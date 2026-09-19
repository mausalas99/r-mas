// public/js/lab-set-date.mjs
function formatDMYDate(d) {
  if (!d || isNaN(d.getTime())) return "";
  return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
}
function inferFechaLabSetFromId(set) {
  if (!set || set.fecha === "Anterior") return "";
  var id = String(set.id || "");
  if (!/^\d{10,}$/.test(id)) return "";
  var ms = parseInt(id, 10);
  if (id.length === 10) ms *= 1e3;
  return formatDMYDate(new Date(ms));
}

export {
  formatDMYDate,
  inferFechaLabSetFromId
};
//# sourceMappingURL=/js/chunks/chunk-US2NRS5S.js.map
