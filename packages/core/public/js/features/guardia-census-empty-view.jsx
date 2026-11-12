/**
 * Modo Guardia census placeholders: the empty state, the sala picker and the loading scaffold.
 * Preact: same DOM the string builders in guardia-census-empty.mjs made. That file keeps the copy
 * rules and the host's grid classes. Every draw unmounts and empties the host first, so the DOM is
 * rebuilt from scratch like the old `innerHTML` swap.
 */
import { render } from 'preact';

const SKELETON_GROUP_SIZES = [4, 2, 3, 2];

export function GuardiaCensusEmpty({ copy, onShowAll }) {
  return (
    <div class="empty-state guardia-census-empty" role="status">
      <h3 class="empty-state-title">{copy.title}</h3>
      <p class="empty-state-lead">{copy.lead}</p>
      {copy.actionId && copy.actionLabel && (
        <div class="guardia-census-empty-actions">
          <button type="button" class="wb-btn wb-btn-primary" id={copy.actionId} onClick={onShowAll}>{copy.actionLabel}</button>
        </div>
      )}
    </div>
  );
}

export function GuardiaSalaPicker({ salas, selected, onStart }) {
  return (
    <div class="empty-state guardia-sala-picker" role="status">
      <h3 class="empty-state-title">Activar guardia</h3>
      <p class="empty-state-lead">
        Tu perfil no tiene sala. Elige la que cubres esta noche. Para no ver este paso, pon tu sala en Mi rotación.
      </p>
      <div class="guardia-sala-picker-field">
        <label for="guardia-sala-picker-select">Sala</label>
        <select id="guardia-sala-picker-select" class="profile-input">
          {salas.map((s) => <option value={String(s)} selected={String(s) === selected}>{String(s)}</option>)}
        </select>
      </div>
      <div class="empty-state-actions">
        <button type="button" class="wb-btn wb-btn-primary" id="guardia-sala-picker-start" onClick={onStart}>Empezar guardia</button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div class="gct-card gct-card--skeleton">
      <div class="gct-card__row"><span class="skel skel-bed" /><span class="skel skel-name" /></div>
      <div class="gct-task-row"><span class="skel skel-task" /></div>
    </div>
  );
}

export function GuardiaCensusLoading() {
  return (
    <div class="wb-table-card guardia-census-loading" role="status" aria-busy="true" aria-label="Cargando pacientes">
      <span class="visually-hidden">Cargando censo…</span>
      <div class="wb-table-card-header"><span class="skel skel-title" /></div>
      <div class="wb-table-body">
        {SKELETON_GROUP_SIZES.map((n) => (
          <div class="gct-team-group">
            <div class="gct-divider"><span class="skel skel-label" /></div>
            <div class="gct-grid">{Array.from({ length: n }, () => <SkeletonCard />)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function redraw(host, vnode) {
  render(null, host);
  host.textContent = '';
  render(vnode, host);
}

export const drawGuardiaCensusEmpty = (host, copy, onShowAll) =>
  redraw(host, <GuardiaCensusEmpty copy={copy} onShowAll={onShowAll} />);

/** `onStart(sala)` gets the trimmed select value; nothing happens when it is empty. */
export function drawGuardiaSalaPicker(host, salas, selected, onStart) {
  const start = typeof onStart === 'function'
    ? () => {
        const select = host.querySelector('#guardia-sala-picker-select');
        const sala = select ? String(select.value || '').trim() : '';
        if (sala) onStart(sala);
      }
    : undefined;
  redraw(host, <GuardiaSalaPicker salas={salas} selected={selected} onStart={start} />);
}

export const drawGuardiaCensusLoading = (host) => redraw(host, <GuardiaCensusLoading />);
