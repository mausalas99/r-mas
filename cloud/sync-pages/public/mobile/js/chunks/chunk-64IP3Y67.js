// public/js/dom-escape.mjs
function escHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function escAttr(s) {
  return escHtml(s).replace(/'/g, "&#39;");
}
function esc(s) {
  return escHtml(s);
}
function escapeHtml(s) {
  return escHtml(s);
}
function escapeAttr(s) {
  return escAttr(s);
}

export {
  escHtml,
  escAttr,
  esc,
  escapeHtml,
  escapeAttr
};
//# sourceMappingURL=/js/chunks/chunk-64IP3Y67.js.map
