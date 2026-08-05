// public/js/features/patients-html.mjs
function escTxtSafe(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export {
  escTxtSafe
};
//# sourceMappingURL=/js/chunks/chunk-KZBMNVUA.js.map
