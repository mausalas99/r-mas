/**
 * Cierre unificado de ventanas modales: Escape y clic en el fondo (backdrop).
 * Las capas se evalúan en orden de registro (la primera abierta gana = la más arriba).
 */

export function bindBackdropDismiss(backdropEl, requestClose) {
  if (!backdropEl || backdropEl.dataset.rpcBackdropDismiss === '1') return;
  backdropEl.dataset.rpcBackdropDismiss = '1';
  backdropEl.addEventListener('click', function (ev) {
    if (ev.target !== backdropEl) return;
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
    for (var i = 0; i < layers.length; i++) {
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
      });
    });
  }

  return { register, init, closeTopmost, bindBackdropDismiss };
}
