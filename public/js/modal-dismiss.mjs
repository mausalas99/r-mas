/**
 * Cierre unificado de ventanas modales: Escape y clic en el fondo (backdrop).
 * Las capas se evalúan en orden de registro (la primera abierta gana = la más arriba).
 */

export function bindBackdropDismiss(backdropEl, requestClose, panelSelector) {
  if (!backdropEl || backdropEl.dataset.rpcBackdropDismiss === '2') return;
  backdropEl.dataset.rpcBackdropDismiss = '2';
  var selector = panelSelector || '.modal, [role="dialog"]';
  backdropEl.addEventListener('click', function (ev) {
    var panel = backdropEl.querySelector(selector);
    if (panel && panel.contains(ev.target)) return;
    requestClose();
  });
}

export function createModalDismissRegistry() {
  /** @type {Array<{ isOpen: () => boolean, close: () => void, confirmClose?: () => boolean, backdropEl?: () => (HTMLElement|null) }>} */
  var layers = [];

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
    if (ev.key !== 'Escape' && ev.key !== 'Esc') return;
    closeTopmost(ev);
  }

  function init() {
    document.addEventListener('keydown', onKeydown, true);
    layers.forEach(function (layer) {
      if (!layer.backdropEl) return;
      var el = layer.backdropEl();
      if (!el) return;
      bindBackdropDismiss(el, function () {
        tryCloseLayer(layer, null);
      }, layer.panelSelector);
    });
  }

  return { register, init, closeTopmost, bindBackdropDismiss };
}
