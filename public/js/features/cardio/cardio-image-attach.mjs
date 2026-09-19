/**
 * Shared "attach an image" widget for Rx tórax / POCUS / EKG, mounted
 * inside Eventualidades and Consulta IC (same widget, both wizards). Images
 * live in the `cardio_images` table (schema v26), not the patient's
 * cardio JSON — `lib/db/cardio-images-db.mjs`, reached via
 * `window.electronAPI.cardioImage*` (`lib/db/ipc-handlers-register-cardio-images.mjs`).
 *
 * Markup is a placeholder `[data-hf-cardio-images]` block emitted inline by
 * the wizard's HTML builder; `wireCardioImageAttach` finds it after the
 * wizard's own `mount.innerHTML` render and fills it in asynchronously
 * (IPC round trip), re-rendering only this block on add/delete — not the
 * whole wizard step.
 */
import { escAttr } from '../../dom-escape.mjs';
import { formatImageUsage } from '../../../../lib/cardio/cardio-images.mjs';

var KIND_LABELS = { rxTorax: 'Rx tórax', pocus: 'POCUS', ekg: 'EKG' };

/** @param {{kind: 'rxTorax'|'pocus'|'ekg'}} opts */
export function cardioImageAttachHtml(opts) {
  var kind = opts.kind;
  return (
    '<div class="hf-cardio-images" data-hf-cardio-images="' + escAttr(kind) + '">' +
    '<div class="hf-cardio-images-strip" data-hf-cardio-images-strip>' +
    '<span class="ea-muted">Cargando imágenes…</span>' +
    '</div>' +
    '</div>'
  );
}

function stripHtml(images, locked) {
  var thumbs = images
    .map(function (img) {
      return (
        '<span class="hf-cardio-image-thumb">' +
        '<img src="data:' + escAttr(img.mimeType) + ';base64,' + img.base64 + '" alt="">' +
        (locked
          ? ''
          : '<button type="button" class="hf-cardio-image-remove" data-hf-cardio-image-remove="' +
            escAttr(img.imageId) +
            '" title="Eliminar">×</button>') +
        '</span>'
      );
    })
    .join('');
  var addBtn = locked
    ? ''
    : '<button type="button" class="ea-btn" data-hf-cardio-image-add>+ Agregar imagen</button>';
  return thumbs + addBtn;
}

/**
 * @param {HTMLElement} mount — the wizard's own mount (root), not the widget div
 * @param {{patientId: string, visitModule: string, visitDate: string, locked: boolean}} ctx
 */
export function wireCardioImageAttach(mount, ctx) {
  mount.querySelectorAll('[data-hf-cardio-images]').forEach(function (widget) {
    var kind = widget.getAttribute('data-hf-cardio-images');
    loadAndRender(widget, kind, ctx);
  });
}

async function loadAndRender(widget, kind, ctx) {
  var strip = widget.querySelector('[data-hf-cardio-images-strip]');
  if (!strip || !window.electronAPI || typeof window.electronAPI.cardioImageListVisit !== 'function') {
    if (strip) strip.innerHTML = '<span class="ea-muted">No disponible</span>';
    return;
  }
  var res = await window.electronAPI.cardioImageListVisit({
    patientId: ctx.patientId,
    visitModule: ctx.visitModule,
    visitDate: ctx.visitDate,
  });
  var images = (res && res.ok && Array.isArray(res.images) ? res.images : []).filter(function (img) {
    return img.kind === kind;
  });
  strip.innerHTML = stripHtml(images, ctx.locked);
  wireStripButtons(strip, kind, ctx);
}

function wireStripButtons(strip, kind, ctx) {
  var addBtn = strip.querySelector('[data-hf-cardio-image-add]');
  if (addBtn) {
    addBtn.addEventListener('click', async function () {
      if (!window.electronAPI || typeof window.electronAPI.cardioImageAttach !== 'function') return;
      addBtn.disabled = true;
      var res = await window.electronAPI.cardioImageAttach({
        patientId: ctx.patientId,
        visitModule: ctx.visitModule,
        visitDate: ctx.visitDate,
        kind: kind,
      });
      addBtn.disabled = false;
      if (!res || !res.ok) {
        if (res && !res.canceled) window.alert((res && res.error) || 'No se pudo guardar la imagen.');
        return;
      }
      loadAndRender(strip.closest('[data-hf-cardio-images]'), kind, ctx);
    });
  }
  strip.querySelectorAll('[data-hf-cardio-image-remove]').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      var imageId = btn.getAttribute('data-hf-cardio-image-remove');
      if (!imageId) return;
      if (!window.confirm('¿Eliminar esta imagen?')) return;
      await window.electronAPI.cardioImageDelete({ imageId: imageId });
      loadAndRender(strip.closest('[data-hf-cardio-images]'), kind, ctx);
    });
  });
}

export var formatCardioImageUsage = formatImageUsage;
export var CARDIO_IMAGE_KIND_LABELS = KIND_LABELS;
