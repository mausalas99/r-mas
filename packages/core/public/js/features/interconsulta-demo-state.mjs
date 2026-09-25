/**
 * Leaf module (no imports) so interconsulta-demo-toggle.mjs and
 * interconsulta-mode-chrome.mjs can share demo-active state without an
 * import cycle — same pattern as clinical-session-context.mjs.
 */
let demoActive = false;

export function isInterconsultaDemoActive() {
  return demoActive;
}

export function setInterconsultaDemoActive(value) {
  demoActive = !!value;
}
