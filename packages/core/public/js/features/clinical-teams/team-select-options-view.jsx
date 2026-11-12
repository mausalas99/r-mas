/**
 * <option>s of a clinical team <select> (patient registration, patient card).
 * Preact: same options the string builder buildTeamSelectOptions wrote.
 */
import { render } from 'preact';
import { teamSelectGroups, teamSelectLabel } from './team-select-options.mjs';

/** @param {{ teams: object[], selectedTeamId?: string, groupBySala?: boolean, placeholder?: string }} p */
export function TeamSelectOptions({ teams, selectedTeamId, groupBySala, placeholder }) {
  const picked = String(selectedTeamId || '');
  const option = (team) => {
    const id = String(team?.team_id || '');
    return <option value={id} selected={!!id && id === picked}>{teamSelectLabel(team)}</option>;
  };
  return (
    <>
      {placeholder ? <option value="">{placeholder}</option> : null}
      {teamSelectGroups(teams, groupBySala).map(({ label, teams: group }) =>
        label === null ? group.map(option) : <optgroup label={label}>{group.map(option)}</optgroup>)}
    </>
  );
}

/** Fill `select` with team options (placeholder first when given). */
export function drawTeamSelectOptions(select, props) {
  render(null, select);
  render(<TeamSelectOptions {...props} />, select);
}
