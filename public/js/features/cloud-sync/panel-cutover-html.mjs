import { esc } from '../../dom-escape.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { filterSnapshotPatients } from './cutover-claim.mjs';
import { isCloudSala, normalizeCloudSala } from './sala-allowlist.mjs';
import { getCloudSyncUrl } from './settings.mjs';

export function cutoverShellHtml(step, body) {
  return (
    '<div class="cloud-sync-cutover-card">' +
    '<header class="cloud-sync-cutover-head">' +
    '<p class="cloud-sync-cutover-kicker">Actualización 7.9</p>' +
    '<h2 id="cloud-sync-cutover-title" class="cloud-sync-cutover-title">Migración de usuarios y pacientes</h2>' +
    '<p class="cloud-sync-cutover-sub">Paso ' +
    esc(String(step + 1)) +
    ' de 6</p></header>' +
    '<div class="cloud-sync-cutover-body">' +
    body +
    '</div></div>'
  );
}

export function introHtml(snapshot) {
  const nUsers = (snapshot.users || []).length;
  const nPatients = (snapshot.patients || []).length;
  const nTeams = (snapshot.teams || []).length;
  return (
    '<p class="cloud-sync-cutover-lead">Con 7.9 se reinician las cuentas clínicas en este equipo. ' +
    '<strong>No se borran pacientes ni labs</strong>.</p>' +
    '<ul class="cloud-sync-cutover-stats">' +
    '<li><strong>' +
    esc(String(nUsers)) +
    '</strong> usuarios anteriores</li>' +
    '<li><strong>' +
    esc(String(nTeams)) +
    '</strong> equipos</li>' +
    '<li><strong>' +
    esc(String(nPatients)) +
    '</strong> pacientes a reclamar</li></ul>' +
    '<p class="cloud-sync-hint">Elige tu @usuario anterior (o crea uno nuevo), recupera tu equipo y reclama tus pacientes. ' +
    'En Sala / Torre HU también conectarás Nube.</p>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--primary" data-cutover-action="next">Continuar</button>'
  );
}

export function identityHtml(snapshot, chosenUser) {
  const users = snapshot.users || [];
  const list =
    users.length === 0
      ? '<p class="cloud-sync-hint">No había usuarios guardados. Crea uno nuevo abajo.</p>'
      : '<ul class="cloud-sync-cutover-list">' +
        users
          .map((u) => {
            const un = esc(u.username);
            return (
              '<li><button type="button" class="cloud-sync-cutover-pick" data-cutover-pick-user="' +
              un +
              '">' +
              '<span class="cloud-sync-cutover-pick-user">@' +
              un +
              '</span>' +
              '<span class="cloud-sync-cutover-pick-meta">' +
              esc(u.displayName || '—') +
              ' · ' +
              esc(u.rank || '') +
              ' · ' +
              esc(u.sala || '') +
              '</span></button></li>'
            );
          })
          .join('') +
        '</ul>';

  return (
    '<p class="cloud-sync-cutover-lead">Elige tu usuario anterior o crea uno nuevo.</p>' +
    list +
    '<div class="cloud-sync-cutover-form">' +
    '<label>Usuario (@usuario)<input class="profile-input" data-cutover-user value="' +
    esc(chosenUser?.username || '') +
    '" autocomplete="username" /></label>' +
    '<label>Nombre en guardia<input class="profile-input" data-cutover-display value="' +
    esc(chosenUser?.displayName || '') +
    '" /></label>' +
    '<label>Rango<input class="profile-input" data-cutover-rank value="' +
    esc(chosenUser?.rank || 'R1') +
    '" /></label>' +
    '<label>Sala<input class="profile-input" data-cutover-sala value="' +
    esc(chosenUser?.sala || '') +
    '" placeholder="Sala 1, Torre HU…" /></label>' +
    '</div>' +
    '<div class="cloud-sync-cutover-actions">' +
    '<button type="button" class="cloud-sync-btn" data-cutover-action="back">Atrás</button>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--primary" data-cutover-action="identity-next">Continuar</button>' +
    '</div>'
  );
}

export function teamHtml(snapshot, chosenUser, chosenTeam) {
  const username = chosenUser?.username || '';
  const teams = (snapshot.teams || []).filter((t) =>
    (t.memberUsernames || []).includes(username)
  );
  const list =
    teams.length === 0
      ? '<p class="cloud-sync-hint">No había equipos vinculados a este usuario. Puedes crear uno en Mi rotación después.</p>'
      : '<ul class="cloud-sync-cutover-list">' +
        teams
          .map((t) => {
            const id = esc(t.teamId);
            return (
              '<li><button type="button" class="cloud-sync-cutover-pick" data-cutover-pick-team="' +
              id +
              '">' +
              '<span class="cloud-sync-cutover-pick-user">' +
              esc(t.name) +
              '</span>' +
              '<span class="cloud-sync-cutover-pick-meta">' +
              esc(t.sala || '') +
              ' · ' +
              esc(String((t.memberUsernames || []).length)) +
              ' miembros</span></button></li>'
            );
          })
          .join('') +
        '</ul>';
  return (
    '<p class="cloud-sync-cutover-lead">Equipo a recuperar' +
    (chosenTeam ? ': <strong>' + esc(chosenTeam.name) + '</strong>' : '') +
    '</p>' +
    list +
    '<div class="cloud-sync-cutover-actions">' +
    '<button type="button" class="cloud-sync-btn" data-cutover-action="back">Atrás</button>' +
    '<button type="button" class="cloud-sync-btn" data-cutover-action="skip-team">Omitir equipo</button>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--primary" data-cutover-action="team-next">Continuar</button>' +
    '</div>'
  );
}

export function patientsHtml(snapshot, chosenUser, chosenTeam) {
  const list = filterSnapshotPatients(snapshot, {
    username: chosenUser?.username,
    teamId: chosenTeam?.teamId,
  });
  const rows =
    list.length === 0
      ? '<p class="cloud-sync-hint">No hay pacientes asociados en la captura. Puedes continuar.</p>'
      : '<ul class="cloud-sync-cutover-patients">' +
        list
          .map((p) => {
            return (
              '<li><label class="cloud-sync-cutover-check">' +
              '<input type="checkbox" data-cutover-patient="' +
              esc(p.id) +
              '" checked />' +
              '<span><strong>' +
              esc(p.nombre || 'Sin nombre') +
              '</strong> · ' +
              esc(p.registro || 's/reg') +
              '</span></label></li>'
            );
          })
          .join('') +
        '</ul>';
  return (
    '<p class="cloud-sync-cutover-lead">Reclama los pacientes de tu equipo / usuario.</p>' +
    rows +
    '<div class="cloud-sync-cutover-actions">' +
    '<button type="button" class="cloud-sync-btn" data-cutover-action="back">Atrás</button>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--primary" data-cutover-action="claim">Reclamar y continuar</button>' +
    '</div>'
  );
}

export function cloudHtml(chosenUser) {
  const sala = normalizeCloudSala(chosenUser?.sala || clinicalSessionContext.user?.sala || '');
  if (!isCloudSala(sala)) {
    return (
      '<p class="cloud-sync-cutover-lead">Tu sala (<strong>' +
      esc(sala || '—') +
      '</strong>) usa LAN. La migración local ya está lista.</p>' +
      '<div class="cloud-sync-cutover-actions">' +
      '<button type="button" class="cloud-sync-btn" data-cutover-action="back">Atrás</button>' +
      '<button type="button" class="cloud-sync-btn cloud-sync-btn--primary" data-cutover-action="finish-lan">Finalizar</button>' +
      '</div>'
    );
  }
  return (
    '<p class="cloud-sync-cutover-lead">Sala / Torre HU: conecta Nube y sincroniza el censo del turno.</p>' +
    '<div class="cloud-sync-cutover-form">' +
    '<label>Contraseña nube (mín. 10)<input type="password" class="profile-input" data-cutover-pass autocomplete="new-password" /></label>' +
    '<p class="cloud-sync-hint">URL: ' +
    esc(getCloudSyncUrl()) +
    '</p></div>' +
    '<div class="cloud-sync-cutover-actions">' +
    '<button type="button" class="cloud-sync-btn" data-cutover-action="back">Atrás</button>' +
    '<button type="button" class="cloud-sync-btn" data-cutover-action="cloud-login">Entrar</button>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--primary" data-cutover-action="cloud-register">Crear cuenta y sincronizar</button>' +
    '</div>' +
    '<p class="cloud-sync-hint" data-cutover-cloud-status></p>'
  );
}

export function doneHtml() {
  return (
    '<p class="cloud-sync-cutover-lead">Migración completa. Ya puedes trabajar con tu censo y equipo.</p>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--primary" data-cutover-action="close">Entrar a R+</button>'
  );
}

export function bodyForStep(step, ctx) {
  if (step === 0) return introHtml(ctx.snapshot);
  if (step === 1) return identityHtml(ctx.snapshot, ctx.chosenUser);
  if (step === 2) return teamHtml(ctx.snapshot, ctx.chosenUser, ctx.chosenTeam);
  if (step === 3) return patientsHtml(ctx.snapshot, ctx.chosenUser, ctx.chosenTeam);
  if (step === 4) return cloudHtml(ctx.chosenUser);
  return doneHtml();
}
