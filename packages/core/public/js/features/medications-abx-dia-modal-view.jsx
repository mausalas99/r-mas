/** Antibiotic "día de hoy" prompt (title, message, one numeric row per antibiotic, Cancelar / Guardar). Preact; same markup the string builder made. Lazy-loaded by medications-abx-dia-modal.mjs. */
import { render } from 'preact';
import { STACKED_BACKDROP_CLASS } from './cloud-sync/stacked-overlay.mjs';

export function AbxDiaModal({ title, message, rows }) {
  return (
    <div class={STACKED_BACKDROP_CLASS} data-abx-dia-modal="">
      <div class="lab-conflict-modal" role="dialog" aria-modal="true" aria-labelledby="abx-dia-title">
        <h3 id="abx-dia-title" style="margin:0 0 10px;">{title}</h3>
        <p style="font-size:13px;line-height:1.45;margin:0 0 14px;color:var(--text-muted);">{message}</p>
        {rows.map((r) => (
          <label style="display:flex;align-items:center;gap:10px;margin:0 0 10px;font-size:13px;">
            <span style="flex:1;">{r.label}</span>
            {'Día '}
            <input type="number" min="1" step="1" class="profile-input" style="width:72px;" data-abx-dia-id={r.id} value={String(r.dia)} aria-label={'Día de ' + r.label} />
          </label>
        ))}
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
          <button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-abx-dia-cancel="">Cancelar</button>
          <button type="button" class="cloud-sync-btn" data-abx-dia-ok="">Guardar</button>
        </div>
      </div>
    </div>
  );
}

export function drawAbxDia(host, opts) {
  render(<AbxDiaModal {...opts} />, host);
}
