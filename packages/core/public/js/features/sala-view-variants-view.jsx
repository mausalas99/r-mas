/**
 * Modo Sala cards view, rail and sidebar toggle icon. Preact: same DOM, classes and data-* hooks the
 * string builders in sala-view-variants.mjs made. That file keeps the rules (which patients, tags,
 * hints, click wiring) and passes plain models; every draw unmounts first, so the DOM is rebuilt
 * from scratch like the old `innerHTML` swap.
 */
import { render } from 'preact';

const stroke = { fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round' };

export function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" {...stroke} stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8h14v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8z" /><path d="M10 12h4" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" {...stroke} stroke-linejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" />
    </svg>
  );
}

/** Corner button of a card: archive in Sala, «Restaurar» in Archivados. */
function CornerBtn({ id, archived, nombre }) {
  const name = nombre || 'paciente';
  return (
    <button type="button" class={archived ? 'sv-card-restore' : 'sv-card-archive'} title={archived ? 'Restaurar a sala' : 'Archivar paciente'}
      aria-label={(archived ? 'Restaurar ' : 'Archivar ') + name}
      data-onclick="togglePatientArchived" data-onclick-args={JSON.stringify([id])} data-onclick-pass="event">
      {archived ? <><RestoreIcon /><span>Restaurar</span></> : <ArchiveIcon />}
    </button>
  );
}

/** @param {{ card: { id: string, active: boolean, archived: boolean, bed: string, tags: { cls: string, text: string }[], name: string, rawName: string, dx: string[], ic: { name: string, hue: number | string }[] } }} p */
function Card({ card }) {
  return (
    <div class="sv-card-wrap">
      <button type="button" class={'sv-card' + (card.active ? ' is-active' : '') + (card.archived ? ' is-archived' : '')} data-sv-open={card.id}>
        <span class="sv-card-top">
          <span class="sv-bed">{card.bed}</span>
          {card.tags.map((t) => <span class={'sv-tag ' + t.cls}>{t.text}</span>)}
        </span>
        <span class="sv-name">{card.name}</span>
        <span class="sv-label">Diagnósticos</span>
        {card.dx.length
          ? <ul class="sv-dx">{card.dx.map((d) => <li>{d}</li>)}</ul>
          : <span class="sv-none">Sin diagnóstico</span>}
        <span class="sv-label">Interconsultas</span>
        {card.ic.length
          ? <span class="sv-ic">{card.ic.map((s) => <span class="svc" style={'--h:' + s.hue}>{s.name}</span>)}</span>
          : <span class="sv-none">Ninguna</span>}
      </button>
      {/* Hermano, no hijo: un botón dentro de otro botón no es HTML válido. */}
      <CornerBtn id={card.id} archived={card.archived} nombre={card.rawName} />
    </div>
  );
}

/** @param {{ model: { archView: boolean, archivedCount: number, listCount: number, shown: Parameters<typeof Card>[0]['card'][] } }} p */
export function SalaHome({ model }) {
  const { archView, archivedCount, listCount, shown } = model;
  return (
    <>
      <div class="sv-home-head">
        {archView
          ? <><button type="button" class="wb-btn wb-btn-secondary" data-sv-arch="">‹ Sala</button><strong>Archivados</strong><span>{archivedCount}</span></>
          : <><strong>Pacientes</strong><span>{listCount} en sala</span></>}
        <span class="sv-home-actions">
          {!archView && (
            <>
              {archivedCount > 0 && (
                <button type="button" class="wb-btn wb-btn-secondary" data-sv-arch=""><ArchiveIcon /> Archivados <span class="sv-count">{archivedCount}</span></button>
              )}
              <button type="button" class="wb-btn wb-btn-secondary" data-sv-view="bar">Barra lateral</button>
              <button type="button" class="wb-btn wb-btn-secondary" data-sv-labs="">Actualizar labs</button>
              <button type="button" class="wb-btn wb-btn-primary" data-onclick="openAddModal">+ Agregar</button>
            </>
          )}
        </span>
      </div>
      {shown.length
        ? <div class="sv-grid">{shown.map((c) => <Card card={c} />)}</div>
        : <p class="sv-none">Sin pacientes aún.</p>}
    </>
  );
}

/** @param {{ items: { id: string, name: string, label: string, active: boolean }[] }} p */
export function SalaRail({ items }) {
  return (
    <>
      <button type="button" class="sv-rail-home" data-sv-home="" aria-label="Ver todas las camas" title="Ver todas las camas (Esc)"><GridIcon /><span>Camas</span></button>
      {items.map((it) => (
        <button type="button" data-sv-open={it.id} title={it.name} {...(it.active ? { class: 'is-active', 'aria-current': 'true' } : {})}>{it.label}</button>
      ))}
    </>
  );
}

function redraw(host, vnode) {
  render(null, host);
  host.replaceChildren();
  render(vnode, host);
}

export const drawSalaHome = (host, model) => redraw(host, <SalaHome model={model} />);
export const drawSalaRail = (host, items) => redraw(host, <SalaRail items={items} />);
export const drawGridIcon = (btn) => redraw(btn, <GridIcon />);
