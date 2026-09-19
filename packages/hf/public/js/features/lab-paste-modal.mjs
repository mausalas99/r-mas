// "Pegar SOME / Procesar" modal — Laboratorio card header.
// Replaces the old inline <details> disclosure with a real modal so the
// paste textarea only takes screen space while the user is actively
// pasting. The textarea (#lab-input) and its action buttons keep the same
// ids/onclick wiring as before; this module only shows/hides the backdrop.

var BACKDROP_ID = 'lab-paste-modal-backdrop';

function backdropEl() {
  return document.getElementById(BACKDROP_ID);
}

export function openLabPasteModal() {
  var backdrop = backdropEl();
  if (!backdrop) return;
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
  var ta = document.getElementById('lab-input');
  if (ta && typeof ta.focus === 'function') {
    setTimeout(function () {
      ta.focus();
    }, 0);
  }
}

export function closeLabPasteModal() {
  var backdrop = backdropEl();
  if (!backdrop) return;
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
}

export function isLabPasteModalOpen() {
  var backdrop = backdropEl();
  return !!(backdrop && backdrop.classList.contains('open'));
}

export const windowHandlers = {
  openLabPasteModal,
  closeLabPasteModal,
};
