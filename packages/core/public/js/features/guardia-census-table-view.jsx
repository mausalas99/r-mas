/**
 * Modo Guardia census table (header + filter chips + team groups + cards). Preact: same DOM, ids,
 * classes and data-* hooks the string builder in guardia-census-table.mjs made. It draws a plain
 * model (buildGuardiaCensusModel); the data rules, the card-height fit and the row-enter / exit
 * animation stay in guardia-census-table.mjs. Every draw unmounts first, so the DOM is rebuilt from
 * scratch like the old `innerHTML` swap (ghost rows and the fit's inline styles live in that DOM).
 */
import { render } from 'preact';

function Card({ card, onRowClick }) {
  const open = () => onRowClick(card.id);
  const rowProps =
    typeof onRowClick === 'function'
      ? {
          onClick: open,
          onKeyDown: (ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
              ev.preventDefault();
              open();
            }
          },
        }
      : {};
  return (
    <div class={card.classes.join(' ')} data-wb-row-id={card.id} role="button" tabindex="0" {...rowProps}>
      <div class="gct-card__row">
        <span class="gct-cell-bed">{card.bed}</span>
        <span class="gct-cell-name" title={card.name} aria-label={card.name}>{card.shortName}</span>
        <span class="gct-card__marks">
          {card.entregaMarkers.length > 0 && (
            <div class="patient-chip-symbols" role="group" aria-label="Marcadores de entrega">
              {card.entregaMarkers.map((m) => (
                <span class={'patient-chip-symbol patient-chip-symbol--' + m.id} title={m.title}>{m.label}</span>
              ))}
            </div>
          )}
          {card.critical && <span class="patient-chip-critical-hint" title="Paciente crítico">Crítico</span>}
          {card.staleLabs && (
            <span
              class="gct-chip gct-chip--stale-labs"
              title="Sin laboratorios en 7 días: posible alta"
              aria-label="Sin laboratorios en 7 días: posible alta"
            >⏳</span>
          )}
          {card.badges.map((b) => (
            <span class={b.risk ? 'gct-chip gct-chip--risk' : 'gct-chip'} title={b.title} aria-label={b.title}>{b.icon}</span>
          ))}
        </span>
      </div>
      <div class="gct-task-row">
        <span class="gct-task" title={card.task === null ? undefined : card.task}>{card.task === null ? '' : card.task}</span>
        {card.morePend > 0 && (
          <span class="gct-task-more" title={card.morePend + ' pendientes más'}>{'+' + card.morePend}</span>
        )}
      </div>
    </div>
  );
}

function Group({ group, onRowClick }) {
  return (
    <details class="gct-team-group" data-group-key={group.key} open={group.open}>
      <summary class="gct-divider">{group.label + ' · ' + group.count}</summary>
      <div class="gct-grid">
        {group.cards.map((card) => <Card card={card} onRowClick={onRowClick} />)}
      </div>
    </details>
  );
}

export function GuardiaCensusTable({ model, onChip, onRowClick }) {
  return (
    <div class="wb-table-card guardia-census-table">
      <div class="wb-table-card-header">
        <span class="wb-table-card-title">{model.title}</span>
        <div class="wb-table-card-actions">
          <button type="button" class="wb-btn wb-btn-secondary" id="guardia-btn-cambiar-sala">Cambiar</button>
          <div class="wb-chips">
            {model.chips.map((chip) => {
              const active = chip.id === model.activeFilter;
              return (
                <button
                  type="button"
                  class={active ? 'wb-chip wb-chip--active' : 'wb-chip'}
                  data-wb-chip-id={chip.id}
                  aria-pressed={String(active)}
                  onClick={() => onChip(chip.id)}
                >{chip.label}</button>
              );
            })}
          </div>
        </div>
      </div>
      <div class="wb-table-body">
        {model.groups.map((group) => <Group group={group} onRowClick={onRowClick} />)}
      </div>
      {model.summary && <div class="wb-table-summary">{model.summary}</div>}
    </div>
  );
}

/** Draw into `host`, replacing whatever was there (same effect as the old `host.innerHTML = html`). */
export function drawGuardiaCensusTable(host, props) {
  render(null, host);
  host.textContent = '';
  render(<GuardiaCensusTable {...props} />, host);
}
