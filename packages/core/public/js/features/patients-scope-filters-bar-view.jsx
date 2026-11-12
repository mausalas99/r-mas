/**
 * «Filtros censo» popover body (Sala / Equipo / Servicio) and the Equipo <select> options.
 * Preact: same DOM the string builders in patients-scope-filters-bar.mjs and
 * clinical-teams/team-select-options.mjs made. The bar keeps the filter rules, the select values
 * and every listener. Every draw unmounts and empties the host first, so the DOM is rebuilt from
 * scratch like the old `innerHTML` swap.
 */
import { render } from 'preact';

export function CensusFiltersBody({ showSala, salas }) {
  return (
    <div id="clinical-census-filters-body" class="clinical-census-filters-body">
      {showSala && (
        <label class="clinical-census-filter">
          <span>Sala</span>
          <select id="clinical-filter-sala" class="profile-input">
            <option value="__all__">Todas</option>
            {salas.map((s) => <option value={s}>{s}</option>)}
          </select>
        </label>
      )}
      <label class="clinical-census-filter">
        <span>Equipo</span>
        <select id="clinical-filter-team" class="profile-input">
          <option value="">Todos los equipos</option>
          <option value="__unassigned__">Sin equipo asignado</option>
        </select>
      </label>
      <label class="clinical-census-filter">
        <span>Servicio</span>
        <input type="search" id="clinical-filter-service" class="profile-input" placeholder="Filtrar…" autocomplete="off" />
      </label>
    </div>
  );
}

const Option = ({ o }) => <option value={o.value} selected={o.selected}>{o.label}</option>;

/** The team options of a teamSelectModel(...): flat, or one optgroup per sala. */
export function TeamOptions({ model }) {
  return model.options
    ? model.options.map((o) => <Option o={o} />)
    : model.groups.map((g) => <optgroup label={g.label}>{g.options.map((o) => <Option o={o} />)}</optgroup>);
}

/** `model` is teamSelectModel(...); `unassignedValue` adds the «Sin equipo asignado» entry. */
export function TeamSelectOptions({ model, unassignedValue }) {
  return (
    <>
      <option value="">Todos los equipos</option>
      {unassignedValue && <option value={unassignedValue}>Sin equipo asignado</option>}
      <TeamOptions model={model} />
    </>
  );
}

function redraw(host, vnode) {
  render(null, host);
  host.textContent = '';
  render(vnode, host);
}

export const drawCensusFiltersBody = (bar, showSala, salas) =>
  redraw(bar, <CensusFiltersBody showSala={showSala} salas={salas} />);

export const drawTeamSelectOptions = (select, model, unassignedValue) =>
  redraw(select, <TeamSelectOptions model={model} unassignedValue={unassignedValue} />);
