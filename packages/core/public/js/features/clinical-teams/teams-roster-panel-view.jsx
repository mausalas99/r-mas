/**
 * Mi rotación panel body: banner, your teams, directory, «Otras opciones» (rotation, configuration).
 * Preact: same DOM, classes and ids the string builders in teams-roster-panel(-build).mjs made.
 * The panel code resolves the data and wires the events; these components are pure.
 */
import { render } from 'preact';
import { Collapsible, JoinedTeamCard, MemberHint, DirectorySection } from './teams-roster-cards-view.jsx';
import { NewTeamCard } from './teams-roster-create-view.jsx';

const Hint = ({ children }) => <p class="clinical-teams-hint">{children}</p>;

/** @param {{ directoryCount: number, sala?: string, elevated: boolean, rejoinPending: boolean }} p */
export function PickBanner({ directoryCount, sala, elevated, rejoinPending }) {
  if (directoryCount <= 0) return null;
  const where = <strong>{sala || 'tu sala'}</strong>;
  const count = <strong>{`${directoryCount} equipo${directoryCount === 1 ? '' : 's'}`}</strong>;
  if (elevated) {
    return (
      <div class="clinical-teams-pick-banner clinical-teams-pick-banner--elevated" role="status">
        {rejoinPending
          ? <>Nueva rotación: hay {count} ya publicados en {where}. Asigna residentes o crea equipos adicionales si hace falta.</>
          : <>Hay {count} en {where} listos para asignar residentes.</>}
      </div>
    );
  }
  // Plain case: the list's own description already says «pulsa Unirme».
  if (!rejoinPending) return null;
  return (
    <div class="clinical-teams-pick-banner" role="status">
      Nueva rotación: tu líder de equipo o R4 ya publicó {count} en {where}. Elige el tuyo abajo — no hace falta crear uno nuevo.
    </div>
  );
}

/** @param {{ open: boolean }} p R4/Admin only, collapsed by default. */
export function RotationAdminSection({ open }) {
  return (
    <section class="clinical-teams-section clinical-teams-section--rotation" aria-label="Cambiar de rotación">
      <Collapsible
        collapseKey="section.rotation"
        open={open}
        className="clinical-teams-collapse--section"
        summary={<>
          <h4 class="clinical-teams-section-title">Cambiar de rotación</h4>
          <p class="clinical-teams-section-desc">Mes nuevo o cambio de equipos del servicio.</p>
        </>}
      >
        <div class="clinical-teams-rotation-card">
          <p class="clinical-teams-section-desc">Archiva equipos activos y limpia guardias del día; los residentes vuelven a crear o unirse.</p>
          <div class="clinical-teams-advanced-rotation-actions">
            <button type="button" id="btn-nueva-rotacion" class="wb-btn wb-btn-secondary clinical-teams-nueva-rotacion-btn">Iniciar nueva rotación…</button>
            <button type="button" id="btn-rotation-config-open" class="wb-btn wb-btn-secondary">Calendario de vigencia…</button>
          </div>
        </div>
      </Collapsible>
    </section>
  );
}

/** «Mi perfil y rango» form of the legacy modal.
 * @param {{ legacyUsername: boolean, displayHandle: string, directoryNote: boolean, usernameForInput: string,
 *   clinicalName: string, rank: string, ranks: string[], programAdmin: boolean, sala: string, salas: string[] }} p */
export function ProfileSection(p) {
  return (
    <div class="clinical-teams-profile-panel clinical-teams-rank-section">
      <h5 class="clinical-teams-subsection-title">Mi perfil y rango</h5>
      {p.legacyUsername ? <p class="clinical-teams-legacy-banner">Registra tu @usuario (obligatorio). Sin esto no apareces en equipos ni entregas.</p> : null}
      {p.displayHandle ? <p class="clinical-teams-profile-handle">Visible en R+ Cloud como <strong>@{p.displayHandle}</strong></p> : null}
      {p.directoryNote ? <p class="clinical-teams-lan-directory-note">El directorio completo de usuarios lo abren <strong>R4</strong>, <strong>Admin</strong> o quien tenga <strong>privilegios de administración</strong>. Al registrar <strong>@usuario</strong> conéctate a <strong>R+ Cloud</strong> en ⇄; R+ publica tu perfil al guardar.</p> : null}
      <form id="clinical-profile-form" class="clinical-teams-create-form" noValidate>
        <div class="field-group">
          <label for="clinical-profile-username">Usuario (@usuario) *</label>
          <input id="clinical-profile-username" type="text" class="profile-input" value={p.usernameForInput}
            placeholder="ej. drmendoza" autocomplete="off" spellcheck="false"
            pattern="[a-z][a-z0-9_]{2,31}" required />
          <Hint>@usuario: minúsculas, sin espacios — p. ej. drmendoza. No es tu nombre en guardia.</Hint>
        </div>
        <div class="field-group">
          <label for="clinical-profile-name">Nombre en guardia</label>
          <input id="clinical-profile-name" type="text" class="profile-input" value={p.clinicalName} required />
        </div>
        <div class="field-group">
          <label for="clinical-profile-rank">Rango clínico</label>
          <select id="clinical-profile-rank" class="profile-input">
            {p.ranks.map((r) => <option value={r} selected={r === p.rank}>{r}</option>)}
          </select>
          <Hint>Equipos, entregas y alcance clínico.</Hint>
        </div>
        <div class="field-group">
          <label class="clinical-teams-guardia-label">
            <input type="checkbox" id="clinical-profile-admin" checked={p.programAdmin} />
            <span>Privilegios de administración</span>
          </label>
          <Hint>Requiere tu código al activar. Acceso total al programa: rotación, censo global y directorio de usuarios.</Hint>
          {p.programAdmin ? <button type="button" class="wb-btn wb-btn-secondary" id="btn-clinical-admin-code-change">Cambiar código de administración</button> : null}
        </div>
        <div class="field-group">
          <label for="clinical-profile-sala">{p.programAdmin ? 'Mi sala (rango clínico)' : 'Sala'}</label>
          <select id="clinical-profile-sala" class="profile-input" required>
            <option value="">— Seleccionar —</option>
            {p.salas.map((s) => <option value={s} selected={p.sala === s}>{s}</option>)}
          </select>
          {p.programAdmin ? <Hint>Tu equipo y entregas usan esta sala; abajo puedes explorar otras.</Hint> : null}
        </div>
      </form>
    </div>
  );
}

/** @param {{ open: boolean, profile: object }} p */
export function ConfigSection({ open, profile }) {
  return (
    <section class="clinical-teams-section clinical-teams-section--more">
      <Collapsible
        collapseKey="section.config"
        open={open}
        className="clinical-teams-collapse--section"
        summary={<>
          <h4 class="clinical-teams-section-title">Configuración</h4>
          <p class="clinical-teams-section-desc">Perfil clínico y rango.</p>
        </>}
      >
        <ProfileSection {...profile} />
      </Collapsible>
    </section>
  );
}

/** @param {{ message: string }} p */
export function PanelNotice({ message }) {
  return <p class="clinical-teams-lead">{message}</p>;
}

/**
 * Whole panel body. Fixed order so the screen never reshuffles between visits: your team (status card),
 * the sala's teams ending in «¿No ves tu equipo?», rare options.
 * Slots take vnodes (null when absent): banner, mine, directory, rotation, config.
 */
export function PanelBody({ pickTeamLayout, banner, mine, directory, rotation, config }) {
  return (
    <>
      {pickTeamLayout ? banner : null}
      {mine}
      {directory}
      {rotation || config ? (
        <section class="clinical-teams-other" aria-labelledby="clinical-teams-other-label">
          <h4 id="clinical-teams-other-label" class="clinical-teams-group-label">Otras opciones</h4>
          <div class="clinical-teams-other-list">
            {rotation}
            {config}
          </div>
        </section>
      ) : null}
    </>
  );
}

/**
 * The panel from resolved data (the panel code reads state, this only draws).
 * @param {{ pickTeamLayout: boolean, banner: object|null, mine: { hint: object|null, cards: object[] }|null,
 *   directory: (object & { trailing: object })|null, rotation: { open: boolean }|null,
 *   config: { open: boolean, profile: object }|null }} d
 */
export function TeamsPanel({ pickTeamLayout, banner, mine, directory, rotation, config }) {
  return (
    <PanelBody
      pickTeamLayout={pickTeamLayout}
      banner={banner ? <PickBanner {...banner} /> : null}
      mine={mine ? (
        <section class="clinical-teams-mine">
          {mine.hint ? <MemberHint {...mine.hint} /> : null}
          {mine.cards.map((c) => <JoinedTeamCard {...c} />)}
        </section>
      ) : null}
      directory={directory ? <DirectorySection {...directory} trailing={<NewTeamCard {...directory.trailing} />} /> : null}
      rotation={rotation ? <RotationAdminSection {...rotation} /> : null}
      config={config ? <ConfigSection {...config} /> : null}
    />
  );
}

/** Replace the panel host content (also drops a previous Preact tree). */
export function drawPanel(host, vnode) {
  render(null, host);
  host.replaceChildren();
  render(vnode, host);
}

export const drawTeamsPanel = (host, data) => drawPanel(host, <TeamsPanel {...data} />);
export const drawPanelNotice = (host, message) => drawPanel(host, <PanelNotice message={message} />);
