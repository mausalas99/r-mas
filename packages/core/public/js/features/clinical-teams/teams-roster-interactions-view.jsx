/**
 * Mi perfil «Equipo» section (sala filter + team pills). Preact: same DOM, classes and data-* hooks the
 * template in teams-roster-interactions.mjs made. That file keeps the filter state, the join rule
 * (`disabled`, `title`, `pressed` come in ready) and the delegated change/click handlers on the host.
 */
import { render } from 'preact';

/**
 * @param {{ current: string, options: { value: string, label: string, selected: boolean }[],
 *   teams: { id: string, name: string, pressed: boolean, disabled: boolean, title: string }[] }} p
 */
export function PerfilEquipo({ current, options, teams }) {
  return (
    <section class="settings-perfil-sala settings-perfil-equipo">
      <div class="settings-perfil-equipo-head">
        <span class="settings-perfil-sala-title">Equipo</span>
        <span class="settings-perfil-sala-current">{current}</span>
        <label class="settings-perfil-equipo-pick"><span>Ver equipos de</span>
          <select class="profile-input" data-perfil-equipo-select="">
            {options.map((o) => <option value={o.value} selected={o.selected}>{o.label}</option>)}
          </select>
        </label>
      </div>
      {teams.length ? (
        <div class="settings-perfil-equipo-grid" role="group" aria-label="Equipo">
          {teams.map((t) => (
            <button type="button" class="settings-perfil-chip settings-perfil-chip--team" data-perfil-equipo-team={t.id}
              aria-pressed={String(t.pressed)} disabled={t.disabled} title={t.title || undefined}>{t.name}</button>
          ))}
        </div>
      ) : <p class="settings-acc-hint settings-acc-hint--tight">Sin equipos en esta sala.</p>}
      <div class="settings-perfil-chips">
        <button type="button" class="settings-perfil-chip settings-perfil-chip--add" data-perfil-equipo-open="">+ Crear equipo</button>
        <button type="button" class="settings-perfil-chip settings-perfil-chip--add" data-perfil-equipo-open="">Tengo un código</button>
      </div>
    </section>
  );
}

/** Repaint `host` with the section; `props` null empties it. The select loses focus on a redraw, as before. */
export function drawPerfilEquipo(host, props) {
  render(null, host);
  host.replaceChildren();
  if (props) render(<PerfilEquipo {...props} />, host);
}
