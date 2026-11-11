import { addMedFieldItem, removeMedFieldItem, medRecetaSelectHtml } from './estado-actual-med-ui.mjs';

function handleMedRemoveClick(ev, target, grid, mount, ctx, monitoreo, refreshBlock) {
  const removeBtn = target.closest('[data-ea-med-remove]');
  if (!removeBtn) return false;
  ev.preventDefault();
  ev.stopPropagation();
  const rKey = removeBtn.getAttribute('data-ea-med-remove');
  const idx = Number(removeBtn.getAttribute('data-ea-med-idx'));
  if (rKey && Number.isFinite(idx)) {
    removeMedFieldItem(monitoreo, rKey, idx);
    ctx.persistClinicalState();
    ctx.syncTextarea();
    refreshBlock(mount, rKey, monitoreo);
  }
  return true;
}

function handleMedToggleClick(target, grid) {
  if (!target.closest('[data-ea-med-add-toggle]')) return false;
  const panel = grid.querySelector('[data-ea-med-add-panel]');
  if (!panel) return true;
  panel.hidden = !panel.hidden;
  const input = panel.querySelector('[data-ea-med-add-text]');
  if (!panel.hidden && input) /** @type {HTMLElement} */ (input).focus();
  return true;
}

function handleMedSaveClick(target, grid, mount, ctx, monitoreo, refreshBlock) {
  if (!target.closest('[data-ea-med-add-save]')) return false;
  const input = grid.querySelector('[data-ea-med-add-text]');
  const cat = grid.querySelector('[data-ea-med-add-cat]');
  const text = input ? String(input.value).trim() : '';
  const key = cat ? String(cat.value) : '';
  if (text && key) {
    addMedFieldItem(monitoreo, key, text, {
      activeId: ctx.getActiveId(),
      medRecetaByPatient: ctx.medRecetaByPatient,
      manual: true,
    });
    ctx.persistClinicalState();
    ctx.syncTextarea();
    refreshBlock(mount, key, monitoreo);
  }
  return true;
}

function handleMedFromRecetaClick(target, grid, ctx) {
  if (!target.closest('[data-ea-med-from-receta]')) return false;
  const cat = grid.querySelector('[data-ea-med-add-cat]');
  const slot = grid.querySelector('[data-ea-med-receta-slot]');
  if (cat && slot) slot.innerHTML = medRecetaSelectHtml(String(cat.value), ctx.getActiveId(), ctx.medRecetaByPatient);
  return true;
}

/**
 * @param {HTMLElement} grid
 * @param {HTMLElement} mount
 * @param {object} ctx
 * @param {(monitoreo: object) => object} liveMonitoreoFromCtx
 * @param {(mount: HTMLElement, key: string, monitoreo: object) => void} refreshBlock
 */
export function handleMedGridClick(ev, grid, mount, ctx, liveMonitoreoFromCtx, refreshBlock) {
  const target = /** @type {HTMLElement | null} */ (ev.target);
  if (!target || !grid.contains(target)) return false;
  const monitoreo = liveMonitoreoFromCtx(ctx);
  if (handleMedRemoveClick(ev, target, grid, mount, ctx, monitoreo, refreshBlock)) return true;
  if (handleMedToggleClick(target, grid)) return true;
  if (handleMedSaveClick(target, grid, mount, ctx, monitoreo, refreshBlock)) return true;
  if (handleMedFromRecetaClick(target, grid, ctx)) return true;
  return false;
}
