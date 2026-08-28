import {
  escHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";

// public/js/ui-approval-card.mjs
function wrapApprovalInConflictModal(innerHtml) {
  return '<div class="lab-conflict-modal ui-approval-modal">' + innerHtml + "</div>";
}
function wrapConfirmInConflictModal(innerHtml) {
  return '<div class="lab-conflict-modal material-glass ui-overlay-dialog ui-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="ui-confirm-title">' + innerHtml + "</div>";
}
function buildConfirmCardHtml(opts) {
  opts = opts || {};
  var title = String(opts.title || "").trim();
  var lead = String(opts.question || "").trim();
  if (!title && lead) {
    title = lead;
    lead = "";
  }
  var items = Array.isArray(opts.items) ? opts.items.filter(Boolean) : [];
  var itemsHtml = items.length ? '<ul class="ui-confirm-list">' + items.map(function(item) {
    return "<li>" + escHtml(item) + "</li>";
  }).join("") + "</ul>" : "";
  var leadHtml = lead ? '<p class="ui-confirm-lead" id="ui-confirm-lead">' + escHtml(lead) + "</p>" : "";
  return '<div class="ui-confirm ui-approval-card ui-approval-card--confirm"><h3 class="ui-confirm-title" id="ui-confirm-title">' + escHtml(title) + "</h3>" + leadHtml + itemsHtml + '<div class="ui-confirm-actions"><button type="button" class="ui-confirm-btn ui-confirm-btn--ghost ui-pressable" data-approval-cancel>' + escHtml(opts.cancelLabel || "Cancelar") + '</button><button type="button" class="ui-confirm-btn ui-confirm-btn--danger ui-pressable" data-approval-confirm>' + escHtml(opts.confirmLabel || "Eliminar") + "</button></div></div>";
}
function showConfirmDialog(opts) {
  return new Promise(function(resolve) {
    if (typeof document === "undefined") {
      resolve(false);
      return;
    }
    var backdrop = document.createElement("div");
    backdrop.className = "lab-conflict-backdrop";
    if (opts && opts.id) backdrop.id = String(opts.id);
    backdrop.innerHTML = wrapConfirmInConflictModal(buildConfirmCardHtml(opts));
    var done = false;
    function finish(ok) {
      if (done) return;
      done = true;
      document.removeEventListener("keydown", onKey);
      backdrop.remove();
      resolve(ok);
    }
    function onKey(ev) {
      if (ev.key === "Escape") {
        ev.preventDefault();
        finish(false);
      }
    }
    var confirmBtn = backdrop.querySelector("[data-approval-confirm]");
    var cancelBtn = backdrop.querySelector("[data-approval-cancel]");
    if (confirmBtn) confirmBtn.addEventListener("click", function() {
      finish(true);
    });
    if (cancelBtn) cancelBtn.addEventListener("click", function() {
      finish(false);
    });
    backdrop.addEventListener("click", function(ev) {
      if (ev.target === backdrop) finish(false);
    });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(backdrop);
    if (cancelBtn && typeof cancelBtn.focus === "function") cancelBtn.focus();
  });
}

export {
  wrapApprovalInConflictModal,
  showConfirmDialog
};
//# sourceMappingURL=/js/chunks/chunk-CBI7THZ4.js.map
