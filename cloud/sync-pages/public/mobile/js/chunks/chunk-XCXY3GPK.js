// public/js/modal-dismiss.mjs
function isRpcOverlayVisible(el) {
  if (!el || !el.isConnected) return false;
  var cs = window.getComputedStyle(el);
  if (cs.display === "none" || cs.visibility === "hidden") return false;
  var op = parseFloat(cs.opacity);
  if (!Number.isNaN(op) && op <= 0) return false;
  return true;
}
function getOverlayZIndex(el) {
  if (!el || !isRpcOverlayVisible(el)) return -1;
  var z = parseInt(window.getComputedStyle(el).zIndex, 10);
  return Number.isNaN(z) ? 0 : z;
}
function bindBackdropDismiss(backdropEl, requestClose, panelSelector) {
  if (!backdropEl || backdropEl.dataset.rpcBackdropDismiss === "2") return;
  backdropEl.dataset.rpcBackdropDismiss = "2";
  var selector = panelSelector || '.modal, [role="dialog"]';
  backdropEl.addEventListener("click", function(ev) {
    var panel = backdropEl.querySelector(selector);
    if (panel && panel.contains(ev.target)) return;
    requestClose();
  });
}
function createModalDismissRegistry() {
  var layers = [];
  var globalWired = false;
  function register(layer) {
    layers.push(layer);
  }
  function tryCloseLayer(layer, ev) {
    if (!layer.isOpen()) return false;
    if (layer.confirmClose && layer.confirmClose() === false) return true;
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    layer.close();
    return true;
  }
  function closeTopmost(ev) {
    for (var i = layers.length - 1; i >= 0; i--) {
      if (tryCloseLayer(layers[i], ev)) return true;
    }
    return false;
  }
  function onKeydown(ev) {
    if (ev.key !== "Escape" && ev.key !== "Esc") return;
    closeTopmost(ev);
  }
  function init() {
    if (globalWired) return;
    globalWired = true;
    document.addEventListener("keydown", onKeydown, true);
    layers.forEach(function(layer) {
      if (!layer.backdropEl) return;
      var el = layer.backdropEl();
      if (!el) return;
      bindBackdropDismiss(el, function() {
        tryCloseLayer(layer, null);
      }, layer.panelSelector);
    });
  }
  return { register, init, closeTopmost, bindBackdropDismiss };
}

export {
  isRpcOverlayVisible,
  getOverlayZIndex,
  bindBackdropDismiss,
  createModalDismissRegistry
};
//# sourceMappingURL=/js/chunks/chunk-XCXY3GPK.js.map
