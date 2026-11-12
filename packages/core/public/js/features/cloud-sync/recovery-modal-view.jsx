/**
 * Recovery code reveal overlay. Preact: same DOM, classes, inline styles and data-* hooks the old HTML string
 * had. UI only: copy, the confirm checkbox, Continuar, focus trap and focus restore are wired in
 * recovery-modal.mjs by those hooks.
 */
import { render } from 'preact';
import { STACKED_BACKDROP_CLASS } from './stacked-overlay.mjs';

export const DEFAULT_TITLE = 'Código de recuperación';

export function RecoveryModal({ code, title }) {
  return (
    <div class={STACKED_BACKDROP_CLASS} data-recovery-code-modal="">
      <div class="lab-conflict-modal cloud-sync-recovery-modal material-glass ui-overlay-dialog" role="dialog" aria-modal="true">
        <h3 style="margin:0 0 10px;">{title || DEFAULT_TITLE}</h3>
        <p style="font-size:13px;line-height:1.45;margin:0 0 14px;color:var(--text-muted);">Guarda este código de recuperación. No lo volveremos a mostrar.</p>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 14px;">
          <code data-recovery-code="" style="font-family:ui-monospace,monospace;font-size:15px;letter-spacing:0.04em;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface);flex:1;min-width:0;word-break:break-all;">{code}</code>
          <button type="button" data-recovery-copy="" class="cloud-sync-btn cloud-sync-btn--ghost" style="flex-shrink:0;">Copiar</button>
        </div>
        <label style="display:flex;gap:8px;align-items:flex-start;font-size:13px;line-height:1.4;cursor:pointer;margin:0 0 16px;">
          <input type="checkbox" data-recovery-confirm="" style="margin-top:3px;flex-shrink:0;" />
          <span>Lo guardé en un lugar seguro</span>
        </label>
        <div style="display:flex;justify-content:flex-end;">
          <button type="button" data-recovery-continue="" class="cloud-sync-btn" disabled>Continuar</button>
        </div>
      </div>
    </div>
  );
}

/** Draw the overlay into a detached host; the caller moves `host.firstElementChild` into the page. */
export const drawRecoveryModal = (host, code, title) => render(<RecoveryModal code={code} title={title} />, host);
/** Unmount it (this also takes the overlay out of the page, wherever it was moved to). */
export const eraseRecoveryModal = (host) => render(null, host);
