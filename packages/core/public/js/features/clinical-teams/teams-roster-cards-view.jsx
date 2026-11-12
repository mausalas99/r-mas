/**
 * Mi rotación team cards: «Estás en» card, directory card, the directory section and the LAN hint.
 * Preact: same DOM, classes, ids and data-* hooks the string builders in teams-roster-team-cards.mjs
 * and teams-roster-directory.mjs made. Those files build the props (they read the session, the
 * clock and localStorage); these components only draw.
 */

/** One text with optional bold bits: `['a ', { strong: 'b' }, ' c']`. */
export function Segs({ segs }) {
  return (segs || []).map((s) => (typeof s === 'string' ? s : <strong>{s.strong}</strong>));
}

/** @param {{ collapseKey: string, open: boolean, className?: string, summary: any, children?: any }} p */
export function Collapsible({ collapseKey, open, className, summary, children }) {
  return (
    <details class={'clinical-teams-collapse' + (className ? ` ${className}` : '')} data-collapse-key={collapseKey} open={open}>
      <summary class="clinical-teams-collapse-summary">{summary}</summary>
      <div class="clinical-teams-collapse-body">{children}</div>
    </details>
  );
}

function MetaLine({ parts }) {
  return parts && parts.length ? <p class="clinical-teams-card-meta">{parts.join(' · ')}</p> : null;
}

function PatientLine({ label }) {
  return label ? <p class="clinical-teams-card-meta clinical-teams-card-patients">{label}</p> : null;
}

/** @param {{ selectId: string, letters: string[], current?: string }} p */
export function CycleSelectForRank({ selectId, letters, current }) {
  return (
    <select id={selectId} class="profile-input clinical-teams-cycle-select" required>
      {letters.map((l) => <option value={l} selected={l === current}>{l}</option>)}
    </select>
  );
}

/** @param {{ rows: object[], count: number, compact: boolean }} p */
export function MembersBlock({ rows, count, compact }) {
  return (
    <div class={'clinical-teams-card-members' + (compact ? ' clinical-teams-card-members--compact' : '')}>
      <h6 class="clinical-teams-members-heading">{count === 1 ? 'Integrantes (1)' : `Integrantes (${count})`}</h6>
      <ul class="clinical-teams-member-rows">
        {count ? rows.map((r) => (
          <li class="clinical-teams-member-row">
            <span class="clinical-teams-member-row-line"><span class="clinical-teams-member-row-meta">{r.rank}</span>{' '}<span class="clinical-teams-member-row-name">{r.displayName}</span>{r.cycle ? <>{' · '}<span class="clinical-teams-member-cycle">{r.cycle}</span></> : null}</span>
            {r.canRemove ? (
              <button type="button" class="wb-btn wb-btn-danger-outline clinical-teams-member-remove-btn" data-user-id={r.userId} data-team-id={r.teamId} data-user-label={r.label} title="Quitar del equipo y de la base clínica">Quitar</button>
            ) : null}
          </li>
        )) : <li class="clinical-teams-empty clinical-teams-empty--inline">Sin integrantes</li>}
      </ul>
    </div>
  );
}

function MyCycleBlock({ teamId, hint, selectId, letters, current, open }) {
  return (
    <Collapsible collapseKey={`card.${teamId}.cycle2`} open={open} className="clinical-teams-collapse--card-block clinical-teams-my-cycle-box"
      summary={<span class="clinical-teams-my-cycle-title">Mi ciclo en este equipo</span>}>
      <form class="clinical-teams-my-cycle-form" data-team-id={teamId}>
        <p class="clinical-teams-hint">{hint}</p>
        <div class="clinical-teams-my-cycle-row">
          <label class="visually-hidden" for={selectId}>Mi ciclo</label>
          <CycleSelectForRank selectId={selectId} letters={letters} current={current} />
          <button type="submit" class="wb-btn wb-btn-primary wb-btn-lg">Guardar</button>
        </div>
      </form>
    </Collapsible>
  );
}

function InheritedPreview({ teamId, predecessorName, patients, open }) {
  const n = patients.length;
  return (
    <Collapsible collapseKey={`card.${teamId}.inherit-preview`} open={open} className="clinical-teams-collapse--card-block clinical-teams-inherit-preview-box"
      summary={<span class="clinical-teams-inherit-preview-summary">{n ? `Pacientes que heredarás de «${predecessorName}» (${n})` : `Pacientes que heredarás de «${predecessorName}»`}</span>}>
      {n ? (
        <ul class="clinical-teams-inherit-preview-list">{patients.map((p) => <li>{`${p.nombre} · ${p.registro}`}</li>)}</ul>
      ) : (
        <p class="clinical-teams-hint">{`Sin expedientes locales de «${predecessorName}» en este Mac todavía.`}</p>
      )}
    </Collapsible>
  );
}

function ManageActions({ teamId, teamName }) {
  return (
    <div class="clinical-teams-manage-actions">
      <button type="button" class="wb-btn wb-btn-secondary clinical-teams-edit-btn" data-team-id={teamId}>Editar</button>
      <button type="button" class="wb-btn wb-btn-danger-outline clinical-teams-delete-btn" data-team-id={teamId} data-team-name={teamName}>Eliminar</button>
    </div>
  );
}

const CYCLE_DAYS = { A: '1, 5, 9…', B: '2, 6, 10…', C: '3, 7, 11…', D: '4, 8, 12…' };

function EditPanel({ teamId, name, sala, salas, staged, cycleLetter, succeedsId, succeedsOptions }) {
  return (
    <div class="clinical-teams-edit-panel" hidden data-team-id={teamId}>
      <form class="clinical-teams-edit-form" data-team-id={teamId}>
        <div class="field-group">
          <label for={`clinical-edit-name-${teamId}`}>Nombre del equipo</label>
          <input id={`clinical-edit-name-${teamId}`} type="text" class="profile-input clinical-teams-edit-name" value={name} required />
        </div>
        <div class="field-group">
          <label for={`clinical-edit-sala-${teamId}`}>Sala</label>
          <select id={`clinical-edit-sala-${teamId}`} class="profile-input clinical-teams-edit-sala" required>
            {salas.map((s) => <option value={s} selected={sala === s}>{s}</option>)}
          </select>
        </div>
        <div class="field-group">
          <label for={`clinical-edit-rotation-${teamId}`}>Rotación</label>
          <select id={`clinical-edit-rotation-${teamId}`} class="profile-input clinical-teams-edit-rotation-active">
            <option value="1" selected={!staged}>Esta rotación (activo ahora)</option>
            <option value="0" selected={staged}>Próxima rotación (aún no activo)</option>
          </select>
          <p class="clinical-teams-hint">Se asigna solo al crear el equipo; cámbialo aquí si no corresponde.</p>
        </div>
        <div class="field-group">
          <label for={`clinical-edit-cycle-${teamId}`}>Ciclo de guardia</label>
          <select id={`clinical-edit-cycle-${teamId}`} class="profile-input clinical-teams-edit-cycle">
            <option value="">— Sin letra —</option>
            {['A', 'B', 'C', 'D'].map((l) => <option value={l} selected={cycleLetter === l}>{`${l} · días ${CYCLE_DAYS[l]} del mes`}</option>)}
          </select>
          <p class="clinical-teams-hint">A es el día 1 del mes, B el 2, C el 3, D el 4. Luego se repite.</p>
        </div>
        {staged ? (
          <div class="field-group">
            <label for={`clinical-edit-succeeds-${teamId}`}>Hereda pacientes de</label>
            <select id={`clinical-edit-succeeds-${teamId}`} class="profile-input clinical-teams-edit-succeeds">
              <option value="">— Ninguno —</option>
              {succeedsOptions.map((t) => <option value={t.id} selected={succeedsId === t.id}>{t.name}</option>)}
            </select>
            <p class="clinical-teams-hint">Al iniciar la nueva rotación, sus pacientes pasan aquí automáticamente.</p>
          </div>
        ) : null}
        <div class="clinical-teams-edit-form-actions">
          <button type="submit" class="wb-btn wb-btn-primary wb-btn-lg">Guardar cambios</button>
          <button type="button" class="wb-btn wb-btn-secondary clinical-teams-edit-cancel">Cancelar</button>
        </div>
      </form>
    </div>
  );
}

function AddMemberCycle({ id, letters, groups }) {
  return (
    <select id={id} class="profile-input clinical-teams-add-member-cycle" required>
      {groups
        ? groups.map((g) => <optgroup label={g.label}>{g.letters.map((l) => <option value={l}>{l}</option>)}</optgroup>)
        : letters.map((l) => <option value={l}>{l}</option>)}
    </select>
  );
}

function InviteBox({ teamId, code, service, addCycle, open }) {
  return (
    <Collapsible collapseKey={`card.${teamId}.invite`} open={open} className="clinical-teams-collapse--card-block clinical-teams-invite-box"
      summary={<span class="clinical-teams-invite-summary">Invitar y agregar integrantes</span>}>
      <p class="clinical-teams-invite-code-line">Código para invitar: <code class="clinical-teams-invite-code">{code}</code></p>
      <div class="clinical-teams-invite-link-row">
        <button type="button" class="wb-btn wb-btn-secondary clinical-teams-copy-invite-btn" data-team-id={teamId}>Copiar invitación</button>
        <p class="clinical-teams-invite-hint">Incluye el código e instrucciones para <strong>Mi rotación</strong> en la app R+ del Mac (no Safari).</p>
      </div>
      <form class="clinical-teams-add-member-form" data-team-id={teamId} data-team-service={service}>
        <p class="clinical-teams-add-member-label">Agregar integrante</p>
        <div class="clinical-teams-add-member-fields">
          <div class="field-group clinical-teams-add-member-user">
            <label for={`clinical-add-member-${teamId}`}>@usuario</label>
            <input id={`clinical-add-member-${teamId}`} type="text" class="profile-input clinical-teams-add-member-input" placeholder="sin @" required aria-describedby={`clinical-add-hint-${teamId}`} />
          </div>
          <div class="field-group clinical-teams-add-cycle-group">
            <label for={`clinical-add-cycle-${teamId}`}>Ciclo del integrante</label>
            <AddMemberCycle {...addCycle} />
          </div>
          <button type="submit" class="wb-btn wb-btn-primary wb-btn-lg clinical-teams-btn-add">Agregar</button>
        </div>
        <p class="clinical-teams-invite-hint" id={`clinical-add-hint-${teamId}`}>Debe existir en Mi rotación (@usuario, sin @). Cada R1/R2 lleva su propio ciclo (D1, D2, A–F).</p>
      </form>
    </Collapsible>
  );
}

const CHECK = (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"></path></svg>
);

/**
 * @param {{ teamId: string, name: string, metaParts: string[], patientLabel: string, manage: object|null,
 *   preview: object|null, members: object|null, myCycle: object|null, inheritName: string|null,
 *   invite: object, leaveName: string }} p
 */
export function JoinedTeamCard({ teamId, name, metaParts, patientLabel, manage, preview, members, myCycle, inheritName, invite, leaveName }) {
  return (
    <article class="clinical-teams-card clinical-teams-card--mine" data-team-id={teamId}>
      <div class="clinical-teams-mine-hero">
        <span class="clinical-teams-mine-check">{CHECK}</span>
        <div class="clinical-teams-card-top-text">
          <p class="clinical-teams-card-eyebrow">Estás en</p>
          <h5 class="clinical-teams-card-title">{name}</h5>
          <MetaLine parts={metaParts} />
          <PatientLine label={patientLabel} />
        </div>
        <div class="clinical-teams-card-actions">
          <button type="button" class="wb-btn wb-btn-primary clinical-teams-copy-invite-btn" data-team-id={teamId}>Invitar</button>
          {manage ? <ManageActions teamId={teamId} teamName={manage.teamName} /> : null}
        </div>
      </div>
      {manage ? <EditPanel {...manage.edit} /> : null}
      {preview ? <InheritedPreview {...preview} /> : null}
      {members ? <MembersBlock {...members} /> : null}
      {myCycle ? <MyCycleBlock {...myCycle} /> : null}
      {inheritName != null ? (
        <div class="clinical-teams-inherit-box">
          <button type="button" class="wb-btn wb-btn-secondary clinical-teams-inherit-btn ui-pressable" data-team-id={teamId} data-team-name={inheritName} title="Traer pacientes del equipo del mes anterior">
            Heredar pacientes del mes anterior…
          </button>
        </div>
      ) : null}
      <InviteBox {...invite} />
      <div class="clinical-teams-leave-box">
        <button type="button" class="wb-btn wb-btn-secondary clinical-teams-leave-btn" data-team-id={teamId} data-team-name={leaveName}>
          Salir del equipo
        </button>
      </div>
    </article>
  );
}

/**
 * @param {{ teamId: string, staged: boolean, name: string, metaParts: string[], patientLabel: string,
 *   preview: object|null, members: object|null, joinHint: string, canJoin: boolean, manage: object|null }} p
 */
export function DirectoryTeamCard({ teamId, staged, name, metaParts, patientLabel, preview, members, joinHint, canJoin, manage }) {
  return (
    <article class="clinical-teams-card clinical-teams-card--directory" data-team-id={teamId}>
      <div class="clinical-teams-card-top-text">
        {staged ? <p class="clinical-teams-card-eyebrow clinical-teams-card-eyebrow--staged">Próxima rotación · aún no activo</p> : null}
        <h5 class="clinical-teams-card-title">{name}</h5>
        <MetaLine parts={metaParts} />
        <PatientLine label={patientLabel} />
      </div>
      {preview ? <InheritedPreview {...preview} /> : null}
      {members ? <MembersBlock {...members} /> : null}
      {joinHint ? <p class="clinical-teams-card-join-reason">{joinHint}</p> : null}
      {manage ? <EditPanel {...manage.edit} /> : null}
      {canJoin || manage ? (
        <div class="clinical-teams-card-actions">
          {canJoin ? <button type="button" class="wb-btn wb-btn-secondary clinical-teams-join-btn" data-team-id={teamId}>Unirme</button> : null}
          {manage ? <ManageActions teamId={teamId} teamName={manage.teamName} /> : null}
        </div>
      ) : null}
    </article>
  );
}

/** LAN hint above the joined cards. @param {{ segs: Array<string|{strong:string}> }} p */
export function MemberHint({ segs }) {
  return <p class="clinical-teams-section-desc clinical-teams-lan-member-hint"><Segs segs={segs} /></p>;
}

/**
 * «Equipos en <sala>» section. `trailing` is the last card of the grid (create / join by code).
 * @param {{ title: string, descSegs: Array|null, salas: string[]|null, browseSala: string, emptySegs: Array|null,
 *   cards: object[], trailing?: any }} p
 */
export function DirectorySection({ title, descSegs, salas, browseSala, emptySegs, cards, trailing }) {
  return (
    <section class="clinical-teams-section clinical-teams-section--directory clinical-teams-section--directory-has-teams">
      <div class="clinical-teams-section-head">
        <div class="clinical-teams-section-intro">
          <h4 class="clinical-teams-section-title">{title}</h4>
          {descSegs ? <p class="clinical-teams-section-desc"><Segs segs={descSegs} /></p> : null}
        </div>
        {salas ? (
          <div class="clinical-teams-section-head-actions">
            <label class="clinical-teams-browse-label" for="clinical-browse-sala">Sala</label>
            <select id="clinical-browse-sala" class="profile-input clinical-teams-browse-select" aria-label="Explorar equipos por sala">
              {salas.map((s) => <option value={s} selected={browseSala === s}>{s}</option>)}
              <option value="__all__" selected={browseSala === '__all__'}>Todas las salas</option>
            </select>
          </div>
        ) : null}
      </div>
      {emptySegs ? <p class="clinical-teams-empty"><Segs segs={emptySegs} /></p> : null}
      <div class="clinical-teams-list clinical-teams-list--directory">
        {cards.map((c) => <DirectoryTeamCard {...c} />)}
        {trailing}
      </div>
    </section>
  );
}
