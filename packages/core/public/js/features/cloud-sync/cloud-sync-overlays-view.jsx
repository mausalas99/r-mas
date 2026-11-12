/**
 * Nube overlays and the header popover. Preact: same DOM, classes and data-* hooks the old HTML strings
 * had. UI only: the prompt, the fix guide and the activity history are wired (close, Escape, resolve) in
 * their own .mjs; the popover's buttons by data-nube-pop in cloud-sync-header-chrome.mjs. Lazy-loaded.
 */
import { render } from 'preact';
import { STACKED_BACKDROP_CLASS } from './stacked-overlay.mjs';

/**
 * Draw `vnode` into a detached div and hand back its root element (the modal's backdrop), or null.
 * The caller moves it into the body; nothing is re-rendered afterwards.
 */
export function drawDetached(vnode) {
  const host = document.createElement('div');
  render(vnode, host);
  const root = host.firstElementChild;
  return root instanceof HTMLElement ? root : null;
}

export const AdminPromptModal = ({ title, message, placeholder, confirmLabel, inputType }) => (
  <div class={STACKED_BACKDROP_CLASS} data-admin-prompt-modal="">
    <div class="lab-conflict-modal cloud-sync-admin-prompt-modal" role="dialog" aria-modal="true">
      <h3 style="margin:0 0 10px;">{title}</h3>
      <p style="font-size:13px;line-height:1.45;margin:0 0 14px;color:var(--text-muted);white-space:pre-wrap;">{message}</p>
      <input type={inputType} class="profile-input" data-admin-prompt-input="" autocomplete="off" spellcheck="false" placeholder={placeholder} style="width:100%;margin:0 0 16px;" />
      <div style="display:flex;justify-content:flex-end;gap:8px;">
        <button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-prompt-cancel="">Cancelar</button>
        <button type="button" class="cloud-sync-btn" data-admin-prompt-ok="">{confirmLabel}</button>
      </div>
    </div>
  </div>
);

export const CloudNubeFixModal = ({ guide }) => (
  <div class={STACKED_BACKDROP_CLASS} data-cloud-nube-fix-modal="">
    <div class="lab-conflict-modal cloud-nube-fix-modal material-glass ui-overlay-dialog" role="dialog" aria-modal="true" aria-labelledby="cloud-nube-fix-title">
      <h3 id="cloud-nube-fix-title" class="cloud-nube-fix-title">{guide.title}</h3>
      <p class="cloud-nube-fix-summary">{guide.summary}</p>
      <ol class="cloud-nube-fix-steps">
        {guide.steps.map((step) => <li class="cloud-nube-fix-step">{step}</li>)}
      </ol>
      <div class="cloud-nube-fix-actions">
        <button type="button" class="cloud-sync-btn" data-cloud-nube-fix-close="">Cerrar</button>
      </div>
    </div>
  </div>
);

/** `activity` is clinicalUserActivityHistoryEntries(history, 999), computed by the caller (that module is eager; importing it here would split it into its own startup chunk). */
function HistoryList({ activity }) {
  const { entries, more } = activity;
  if (!entries.length) return <p class="cloud-sync-equipos-history-empty">Sin actividad registrada.</p>;
  return (
    <ul class="cloud-sync-admin-equipos-history-list cloud-sync-equipos-history-modal-list">
      {entries.map((ev) => (
        <li class="cloud-sync-admin-equipos-history-item">
          <span class="cloud-sync-admin-equipos-history-source">{ev.source}</span>
          {ev.atLabel ? <time class="cloud-sync-admin-equipos-history-at" datetime={ev.at}>{ev.atLabel}</time> : null}
        </li>
      ))}
      {more ? <li class="cloud-sync-admin-equipos-history-more">+{more} más en el servidor</li> : null}
    </ul>
  );
}

export function EquiposHistoryModal({ opts }) {
  const handle = String(opts?.handle || '').trim();
  const displayName = String(opts?.displayName || '').trim();
  const subtitle = displayName ? '@' + handle + ' · ' + displayName : '@' + handle;
  return (
    <div class={STACKED_BACKDROP_CLASS} data-equipos-activity-history-modal="">
      <div class="lab-conflict-modal cloud-sync-equipos-history-modal material-glass ui-overlay-dialog" role="dialog" aria-modal="true" aria-labelledby="equipos-activity-history-title">
        <div class="cloud-sync-equipos-history-modal-head">
          <h3 id="equipos-activity-history-title">Historial de actividad</h3>
          <p class="cloud-sync-equipos-history-modal-sub">{subtitle}</p>
        </div>
        <HistoryList activity={opts.activity} />
        <div class="cloud-sync-equipos-history-modal-foot">
          <button type="button" class="cloud-sync-btn" data-equipos-history-close="">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

/** Each returns the modal's backdrop element (detached; the caller appends it to the body) or null. */
export const drawAdminPromptModal = (props) => drawDetached(<AdminPromptModal {...props} />);
export const drawCloudNubeFixModal = (guide) => drawDetached(<CloudNubeFixModal guide={guide} />);
export const drawEquiposHistoryModal = (opts) => drawDetached(<EquiposHistoryModal opts={opts} />);

const Stat = ({ label, value }) => <div class="nube-pop-stat"><span>{label}</span><b>{value}</b></div>;

/** The header Nube popover. `v` is what readPopoverState() returns, plus stateWords / modifier. */
export function NubePopover({ v }) {
  const now = v.now || Date.now();
  const when = v.formatWhen;
  const mod = v.modifier(v.status, 'ws');
  const room = v.room || {};
  const month = v.formatMonth(room.turnKey);
  const meta = [room.sala ? (month ? month.charAt(0).toUpperCase() + month.slice(1) : '') : 'Elige tu sala en Mi perfil']
    .concat(Number.isFinite(Number(room.memberCount)) ? [room.memberCount + ' miembros'] : [])
    .filter(Boolean)
    .join(' · ');
  return (
    <>
      <div class="nube-pop-head">
        <span class="nube-pop-dot" data-mod={mod} aria-hidden="true"></span>
        <span class="nube-pop-title">{v.stateWords(v.status)}</span>
        <span class="nube-pop-when">{v.lastPullAt ? when(v.lastPullAt, now) : ''}</span>
      </div>
      <div class="nube-pop-room">
        <span class="nube-pop-room-text">
          <b>{room.sala || 'Sin sala'}</b>
          {meta ? <span>{meta}</span> : null}
        </span>
        {room.code ? <code class="nube-pop-code" aria-label="Código de sala">{room.code}</code> : null}
      </div>
      <div class="nube-pop-stats">
        <Stat label="En espera" value={String(Number(v.pending) || 0)} />
        <Stat label="Envío" value={when(v.lastPushAt, now)} />
        <Stat label="Descarga" value={when(v.lastPullAt, now)} />
      </div>
      <div class="nube-pop-actions">
        <button type="button" class="cloud-sync-btn cloud-sync-btn--primary" data-nube-pop="sync">Sincronizar</button>
        <button type="button" class="cloud-sync-btn" data-nube-pop="open-panel">Abrir panel</button>
      </div>
    </>
  );
}

/** Draw the popover in place (Preact diffs, so a focused button keeps focus when nothing changed). */
export const drawNubePopover = (pop, v) => render(<NubePopover v={v} />, pop);
