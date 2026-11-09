/**
 * «Mi perfil» window markup. Preact (Phase 2): same DOM, ids, classes and data-* hooks the static
 * index.html block had. Drawn once into #profile-modal at boot; profile-modal.mjs, profile-load/save
 * and the delegated data-on* handlers still own every value and listener (the inputs are not controlled).
 */
import { render } from 'preact';

const TEAM_ROWS = [
  ['settings-medico-profesor', 'Profesor'],
  ['settings-medico-r4', 'R4'],
  ['settings-medico-r2', 'R2'],
  ['settings-medico-r1a', 'R1'],
  ['settings-medico-r1b', 'R1 (2)'],
];

function Card({ id, mode, title, forId, desc, children, extra }) {
  return (
    <div class="settings-card" id={id} data-profile-mode={mode}>
      <div class="settings-card__copy">
        {forId
          ? <label class="settings-card__title" for={forId}>{title}</label>
          : <p class="settings-card__title" id="profile-mode-label">{title}</p>}
        {desc && <p class="settings-card__desc settings-acc-hint settings-acc-hint--tight">{desc}</p>}
        {extra}
      </div>
      {children}
    </div>
  );
}

const Action = ({ class: cls = '', children }) => <div class={('settings-card__action ' + cls).trim()}>{children}</div>;

export function ProfileModal() {
  return (
    <div class="modal profile-modal profile-modal--perfil wb-modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
      <header class="wb-modal-head">
        <h3 id="profile-modal-title" class="profile-modal-title wb-modal-title">Mi Perfil</h3>
        <button type="button" class="wb-btn wb-btn-ghost wb-btn-icon wb-modal-close" data-wb-close aria-label="Cerrar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
      </header>
      <div class="wb-modal-body">
        <div class="settings-perfil" id="profile-body">
          <div class="settings-perfil-form" data-perfil-autosave>
            <div class="settings-perfil-idcard">
              <div class="settings-perfil-id">
                <span class="settings-perfil-avatar" data-perfil-avatar aria-hidden="true">?</span>
                <div class="settings-perfil-id-text">
                  <p class="settings-perfil-name" data-perfil-name>—</p>
                  <p class="settings-perfil-meta" data-perfil-meta></p>
                </div>
                <span class="settings-perfil-saved" data-perfil-saved role="status" aria-live="polite">Se guarda solo</span>
                <button type="button" class="wb-btn wb-btn-ghost wb-btn-sm" data-onclick="closeSettingsDropdown" data-onclick-2="resetAndStartOnboarding">Ver tutorial de inicio</button>
              </div>
              <div class="settings-perfil-sala-host" data-perfil-sala-host></div>
            </div>
            <section class="profile-row" id="profile-nube-session" hidden>
              <div class="profile-row-head">
                <h4 class="profile-row-title">Cuenta Nube</h4>
                <p class="profile-hint">Tu sesión expiró. Tus cambios se guardan en este equipo, pero no se comparten con tu equipo.</p>
              </div>
              <div class="profile-row-body">
                <div class="profile-actions"><button type="button" class="wb-btn wb-btn-secondary wb-btn-sm" data-onclick="openNubeLogin">Entrar a Nube →</button></div>
              </div>
            </section>
            <div class="settings-perfil-hosts">
              <div class="settings-perfil-sala-host" data-perfil-equipo-host></div>
            </div>
            <div class="settings-perfil-col">
              <div data-perfil-clinical-host></div>
            </div>
            <div class="settings-perfil-col">
              <p class="settings-section-label">Modo de trabajo</p>
              <div class="settings-card-stack">
                <Card title="Cómo usas R+" desc="Sala: estado actual y listado. Interconsulta: nota e indicaciones.">
                  <Action>
                    <div class="settings-seg" role="radiogroup" aria-labelledby="profile-mode-label">
                      <label class="settings-seg-opt"><input type="radio" name="app-mode" value="sala" id="app-mode-sala" data-onchange="onAppModeChange" /><span>Sala</span></label>
                      <label class="settings-seg-opt"><input type="radio" name="app-mode" value="interconsulta" id="app-mode-inter" data-onchange="onAppModeChange" /><span>Interconsulta</span></label>
                    </div>
                  </Action>
                </Card>
                <Card id="profile-default-servicio-wrap" mode="sala" forId="settings-default-servicio" title="Servicio predeterminado" desc="Se llena solo al agregar pacientes."
                  extra={<p id="default-servicio-warning" class="settings-card__desc settings-acc-hint settings-acc-hint--tight profile-hint--warn" style="display:none;">Usa el nombre completo del servicio (evita abreviaturas de 1–3 letras).</p>}>
                  <Action>
                    <input class="profile-input" id="settings-default-servicio" type="text" placeholder="MEDICINA INTERNA" style="text-transform:uppercase;" data-onblur="onDefaultServicioBlur" />
                  </Action>
                </Card>
                <Card forId="profile-doctor-pick" title="Médico tratante" desc="Firma tus documentos. Elige de tu equipo en Nube.">
                  <Action class="settings-perfil-doctor">
                    <select class="profile-input profile-select" id="profile-doctor-pick" data-perfil-doctor-pick></select>
                    <input class="profile-input" id="profile-doctor" type="text" placeholder="Dr. Nombre Apellido" aria-label="Médico tratante (otro)" hidden />
                  </Action>
                </Card>
                <Card mode="interconsulta" forId="profile-profesor" title="Profesor en nota">
                  <Action><input class="profile-input" id="profile-profesor" type="text" placeholder="Dr. Nombre Apellido" /></Action>
                </Card>
                <Card mode="interconsulta" forId="profile-grado" title="Grado / servicio en nota">
                  <Action><input class="profile-input" id="profile-grado" type="text" placeholder="R3 · Medicina Interna" /></Action>
                </Card>
              </div>
            </div>
            <div class="settings-perfil-col" data-profile-mode="sala">
              <div class="settings-section-head">
                <p class="settings-section-label">Equipo en el censo</p>
                <button type="button" class="wb-btn wb-btn-ghost wb-btn-sm" data-perfil-fill-team>Llenar desde mi equipo</button>
              </div>
              <div class="settings-card-stack settings-perfil-team">
                {TEAM_ROWS.map(([id, label]) => (
                  <Card forId={id} title={label}>
                    <Action><input class="profile-input" id={id} type="text" placeholder="Nombre" data-onblur="onMedicoTemplateBlur" /></Action>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Draw the window into the empty #profile-modal backdrop. Call before loadSettings reads the ids. */
export function mountProfileModal() {
  const host = document.getElementById('profile-modal');
  if (host && !host.firstElementChild) render(<ProfileModal />, host);
}
