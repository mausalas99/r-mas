/**
 * «Equipo nuevo» card of the Mi rotación grid: create-team and join-by-code dialogs.
 * Preact: same ids, classes and hooks the string builders in teams-roster-create.mjs made;
 * the .mjs reads the session and passes props, this view is pure.
 */
const Hint = ({ children }) => <p class="clinical-teams-hint">{children}</p>;

const Options = ({ values, selected }) =>
  values.map((v) => <option value={v} selected={v === selected}>{v}</option>);

/** @param {{ show: boolean }} p show = canViewUserDirectory(user) */
export function DirectoryUsersTopButton({ show }) {
  if (!show) return null;
  return <button type="button" class="wb-btn wb-btn-secondary clinical-teams-open-lan-users-btn" id="btn-open-lan-users-directory">Directorio LAN</button>;
}

const FormActions = ({ submit }) => (
  <div class="modal-actions clinical-teams-create-submit-wrap">
    <button type="submit" class="wb-btn wb-btn-primary wb-btn-lg">{submit}</button>
    <button type="button" class="wb-btn wb-btn-secondary clinical-teams-create-cancel">Cancelar</button>
  </div>
);

/** @param {{ homeSala: string, salas: string[] }} p */
export function CreateTeamFormElevated({ homeSala, salas }) {
  return (
    <form id="clinical-team-create-form" class="clinical-teams-create-form clinical-teams-create-form--elevated">
      <div class="field-group">
        <label for="clinical-team-create-name">Nombre del equipo</label>
        <input id="clinical-team-create-name" type="text" class="profile-input" placeholder="Equipo A · Dr. Gutiérrez" required />
        <Hint>Solo el nombre; sin integrantes todavía.</Hint>
      </div>
      <div class="field-group">
        <label for="clinical-team-create-sala">Sala</label>
        <select id="clinical-team-create-sala" class="profile-input" required>
          <option value="">— Seleccionar sala —</option>
          <Options values={salas} selected={homeSala} />
        </select>
      </div>
      <p class="clinical-teams-hint clinical-teams-create-elevated-hint">Asigna residentes después desde <strong>Directorio de usuarios LAN</strong>.</p>
      <FormActions submit="Crear equipo vacío" />
    </form>
  );
}

/**
 * @param {{ userSala: string, salas: string[], services: string[], defaultService: string,
 *   letters: string[], meta: { label: string, hint: string }, showR1Line: boolean, compositionParts: string[] }} p
 */
export function CreateTeamFormStandard({ userSala, salas, services, defaultService, letters, meta, showR1Line, compositionParts }) {
  const hidden = showR1Line ? {} : { hidden: true, style: 'display:none' };
  return (
    <form id="clinical-team-create-form" class="clinical-teams-create-form">
      <div class="field-group" id="clinical-team-sala-group">
        <label for="clinical-team-create-sala">Sala</label>
        <select id="clinical-team-create-sala" class="profile-input">
          <option value="">— Seleccionar sala —</option>
          <Options values={salas} selected={userSala} />
        </select>
      </div>
      <div class="field-group">
        <label for="clinical-team-create-name">Nombre del equipo (residente líder)</label>
        <input id="clinical-team-create-name" type="text" class="profile-input" placeholder="Dr. Gutiérrez" required />
      </div>
      <div class="field-group" id="clinical-team-r1-line-group" {...hidden}>
        <label for="clinical-team-create-r1-line">Línea R1 en el equipo</label>
        <select id="clinical-team-create-r1-line" class="profile-input">
          <option value="0">Primera línea · A1–D1</option>
          <option value="1">Segunda línea · A2–D2</option>
        </select>
      </div>
      <div class="clinical-teams-create-service-row">
        <div class="field-group">
          <label for="clinical-team-create-service">Servicio</label>
          <select id="clinical-team-create-service" class="profile-input" required>
            <Options values={services} selected={defaultService} />
          </select>
        </div>
        <div class="field-group">
          <label id="clinical-team-create-day-label" for="clinical-team-create-day">{meta.label}</label>
          <select id="clinical-team-create-day" class="profile-input" required>
            <Options values={letters} selected="" />
          </select>
        </div>
      </div>
      <p id="clinical-team-create-day-hint" class="clinical-teams-hint clinical-teams-create-cycle-hint">{meta.hint}</p>
      <div id="clinical-team-composition-hint">
        <CompositionHint parts={compositionParts} />
      </div>
      <FormActions submit="Crear equipo" />
    </form>
  );
}

/** @param {{ parts: string[] }} p e.g. ['2 R1', '1 R2'] */
export function CompositionHint({ parts }) {
  if (!parts?.length) return null;
  return <p class="clinical-teams-hint clinical-teams-composition-hint">Composición: {parts.join(', ')}.</p>;
}

/** @param {{ letters: string[] }} p cycle letters for the joiner's rank */
export function JoinWithCodeForm({ letters }) {
  return (
    <>
      <p class="clinical-teams-hint clinical-teams-join-code-warn"><strong>No</strong> pegues aquí el enlace ⇄ de sala (<code>http://…/join/req_…</code>) — ese va en <strong>Wi‑Fi → Conexión guardia</strong>.</p>
      <form id="clinical-team-join-code-form" class="clinical-teams-join-code-form">
        <div class="field-group">
          <label for="clinical-team-join-code-input">Código de equipo</label>
          <input id="clinical-team-join-code-input" type="text" class="profile-input" placeholder="ej. 2017936e" maxlength="36" autocomplete="off" required />
        </div>
        <div class="field-group clinical-teams-add-cycle-group">
          <label for="clinical-team-join-code-cycle">Tu ciclo al unirte</label>
          <select id="clinical-team-join-code-cycle" class="profile-input clinical-teams-cycle-select" required>
            <Options values={letters} selected="" />
          </select>
        </div>
        <FormActions submit="Unirme" />
      </form>
    </>
  );
}

/**
 * @param {{ primary: boolean, elevated: boolean, showDirectory: boolean, form: object, joinLetters: string[] }} p
 *   form = props of CreateTeamFormElevated (elevated) or CreateTeamFormStandard
 */
export function NewTeamCard({ primary, elevated, showDirectory, form, joinLetters }) {
  const createLabel = elevated ? 'Crear equipo vacío' : 'Crear equipo';
  const lead = primary
    ? ['Equipo nuevo', 'Tú quedas como líder y se publica en tu sala.']
    : ['¿No ves tu equipo?', 'Crea uno o usa el código que te envió el líder de tu equipo.'];
  return (
    <article class="clinical-teams-card clinical-teams-card--new">
      <div class="clinical-teams-card-top-text">
        <h5 class="clinical-teams-card-title">{lead[0]}</h5>
        <p class="clinical-teams-card-meta">{lead[1]}</p>
      </div>
      <div class="clinical-teams-card-actions">
        <button type="button" id="btn-clinical-team-create-open" class={`wb-btn ${primary ? 'wb-btn-primary' : 'wb-btn-secondary'} clinical-teams-create-open-btn`}>{createLabel}</button>
        <button type="button" id="btn-clinical-team-join-code-open" class="wb-btn wb-btn-secondary">Tengo un código</button>
        <DirectoryUsersTopButton show={showDirectory} />
      </div>
      <dialog id="clinical-team-create-panel" class="clinical-teams-dialog" aria-labelledby="clinical-team-create-title">
        <h4 id="clinical-team-create-title" class="clinical-teams-dialog-title">{createLabel}</h4>
        {elevated ? <CreateTeamFormElevated {...form} /> : <CreateTeamFormStandard {...form} />}
      </dialog>
      <dialog id="clinical-team-join-code-dialog" class="clinical-teams-dialog" aria-labelledby="clinical-team-join-code-title">
        <h4 id="clinical-team-join-code-title" class="clinical-teams-dialog-title">Unirte con código</h4>
        <p class="clinical-teams-section-desc">Escribe el código de 8 caracteres que te envió el líder de tu equipo.</p>
        <JoinWithCodeForm letters={joinLetters} />
      </dialog>
    </article>
  );
}
