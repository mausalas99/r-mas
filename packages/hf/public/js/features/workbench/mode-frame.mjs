/**
 * Workbench kit — mode frame (band 1: identity/action bar).
 * README "Layout de la ventana (patrón compartido)" band 1: mode name uppercase +
 * mono context + tertiary metadata on the left; 1-2 secondary buttons + the `⌘/`
 * shortcut + exactly ONE teal primary button on the right.
 */
import { escHtml, escAttr } from '../../dom-escape.mjs';

/**
 * @typedef {{ label: string, onClick?: () => void, title?: string }} ModeFrameAction
 */

/**
 * @param {{
 *   modeName: string,
 *   context?: string,
 *   metadata?: string,
 *   secondaryActions?: ModeFrameAction[],
 *   shortcutLabel?: string,
 *   showShortcut?: boolean,
 *   primaryAction: ModeFrameAction,
 *   onContextClick?: () => void,
 * }} opts
 * @returns {string}
 */
export function buildModeFrameHtml(opts) {
  const {
    modeName = '',
    context = '',
    metadata = '',
    secondaryActions = [],
    shortcutLabel = '⌘/',
    showShortcut = true,
    primaryAction,
    onContextClick,
  } = opts || {};

  if (!primaryAction || !primaryAction.label) {
    throw new Error('wb-mode-frame: exactly one primary action is required');
  }
  if (secondaryActions.length > 2) {
    throw new Error('wb-mode-frame: at most two secondary actions are allowed');
  }

  const secondaryHtml = secondaryActions
    .map(
      (a, i) =>
        `<button type="button" class="wb-btn wb-btn-secondary" data-wb-secondary="${i}"` +
        (a.title ? ` title="${escAttr(a.title)}"` : '') +
        `>${escHtml(a.label)}</button>`
    )
    .join('');

  const contextClickable = !!onContextClick;
  const contextHtml = context
    ? `<span class="wb-mode-frame-context${contextClickable ? ' wb-mode-frame-context--clickable' : ''}"` +
      (contextClickable ? ' data-wb-context role="button" tabindex="0"' : '') +
      `>${escHtml(context)}</span>`
    : '';

  return (
    '<div class="wb-mode-frame">' +
    '<div class="wb-mode-frame-left">' +
    `<span class="wb-mode-frame-name">${escHtml(modeName)}</span>` +
    contextHtml +
    (metadata ? `<span class="wb-mode-frame-meta">${escHtml(metadata)}</span>` : '') +
    '</div>' +
    '<div class="wb-mode-frame-actions">' +
    secondaryHtml +
    (showShortcut
      ? `<button type="button" class="wb-btn wb-btn-secondary wb-btn-shortcut" data-wb-shortcut>${escHtml(shortcutLabel)}</button>`
      : '') +
    `<button type="button" class="wb-btn wb-btn-primary" data-wb-primary>${escHtml(primaryAction.label)}</button>` +
    '</div>' +
    '</div>'
  );
}

/**
 * @param {HTMLElement|null|undefined} container
 * @param {Parameters<typeof buildModeFrameHtml>[0] & { onShortcut?: () => void }} opts
 * @returns {HTMLElement|undefined}
 */
export function mountModeFrame(container, opts) {
  if (!container) return undefined;
  container.innerHTML = buildModeFrameHtml(opts);
  const { secondaryActions = [], primaryAction, onShortcut, onContextClick } = opts || {};

  container.querySelectorAll('[data-wb-secondary]').forEach((btn) => {
    const idx = Number(btn.getAttribute('data-wb-secondary'));
    const action = secondaryActions[idx];
    if (action && typeof action.onClick === 'function') {
      btn.addEventListener('click', action.onClick);
    }
  });

  const shortcutBtn = container.querySelector('[data-wb-shortcut]');
  if (shortcutBtn && typeof onShortcut === 'function') {
    shortcutBtn.addEventListener('click', onShortcut);
  }

  const contextEl = container.querySelector('[data-wb-context]');
  if (contextEl && typeof onContextClick === 'function') {
    contextEl.addEventListener('click', (ev) => onContextClick(ev.currentTarget));
    contextEl.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        onContextClick(ev.currentTarget);
      }
    });
  }

  const primaryBtn = container.querySelector('[data-wb-primary]');
  if (primaryBtn && primaryAction && typeof primaryAction.onClick === 'function') {
    primaryBtn.addEventListener('click', primaryAction.onClick);
  }

  return container;
}
