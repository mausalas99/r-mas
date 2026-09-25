/**
 * Workbench kit — filter chips.
 * README: 999px radius chips. Active = white bg + border-strong; inactive =
 * ink-2 text, no border/fill. A teal-fill "active" variant is used for zone
 * chips elsewhere (12a "Tus zonas hoy") — pass `variant: 'teal'`.
 */
import { escHtml, escAttr } from '../../dom-escape.mjs';

/**
 * @typedef {{ id: string, label: string }} FilterChip
 */

/**
 * @param {FilterChip} chip
 * @param {string|null|undefined} activeId
 * @param {'default'|'teal'} variant
 */
export function buildFilterChipHtml(chip, activeId, variant) {
  const isActive = chip.id === activeId;
  const classes = ['wb-chip'];
  if (isActive) classes.push(variant === 'teal' ? 'wb-chip--active-teal' : 'wb-chip--active');
  return (
    `<button type="button" class="${classes.join(' ')}" data-wb-chip-id="${escAttr(chip.id)}" aria-pressed="${isActive}">` +
    `${escHtml(chip.label)}</button>`
  );
}

/**
 * @param {FilterChip[]} chips
 * @param {string|null|undefined} activeId
 * @param {{ variant?: 'default'|'teal' }} [opts]
 */
export function buildFilterChipsHtml(chips, activeId, opts = {}) {
  const variant = opts.variant === 'teal' ? 'teal' : 'default';
  return `<div class="wb-chips">${(chips || []).map((c) => buildFilterChipHtml(c, activeId, variant)).join('')}</div>`;
}

/**
 * @param {HTMLElement|null|undefined} container
 * @param {FilterChip[]} chips
 * @param {{ activeId?: string, variant?: 'default'|'teal', onChange?: (id: string) => void }} [opts]
 */
export function mountFilterChips(container, chips, opts = {}) {
  if (!container) return undefined;
  const state = { activeId: opts.activeId };

  function render() {
    container.innerHTML = buildFilterChipsHtml(chips, state.activeId, opts);
    container.querySelectorAll('[data-wb-chip-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-wb-chip-id');
        state.activeId = id;
        render();
        if (typeof opts.onChange === 'function') opts.onChange(id);
      });
    });
  }

  render();
  return container;
}
