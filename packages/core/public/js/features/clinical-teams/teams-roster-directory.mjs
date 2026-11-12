/** Mi rotación — browse/directory section HTML. */
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import { canViewUserDirectory } from '../../clinical-privileges.mjs';
import { isCloudSala } from '../cloud-sync/sala-allowlist.mjs';
import { getCloudSyncToken } from '../cloud-sync/settings.mjs';
import { isCloudSyncActive } from '../cloud-sync/nube-sync-policy.mjs';
import { dbApi, CLINICAL_SALAS, BROWSE_SALA_LS } from './shared.mjs';
import { directoryTeamCardProps } from './teams-roster-team-cards.mjs';

/** Hint when ⇄ is live but roster still shows only you (not rotación nueva). Props for <MemberHint> or null. */
export async function resolveTeamMemberHintProps(joinedTeams) {
  const teams = Array.isArray(joinedTeams) ? joinedTeams : [];
  if (!teams.length) return null;
  const soloTeams = teams.every((team) => {
    const members = Array.isArray(team?.members) ? team.members : [];
    return members.length <= 1;
  });
  if (!soloTeams) return null;
  try {
    if (!isCloudSyncActive()) return null;
    const { getCloudSyncRoomId } = await import('../cloud-sync/settings.mjs');
    const roomId = String(getCloudSyncRoomId() || '').trim();
    if (!roomId) {
      return { segs: ['Abre ⇄ y conéctate a ', { strong: 'R+ Cloud' }, ' en la sala de guardia. Los residentes deben iniciar sesión Nube, unirse a la misma sala y registrar ', { strong: '@usuario' }, ' antes de que puedas asignarlos a un equipo.'] };
    }
    const canDir = canViewUserDirectory(clinicalSessionContext.user || {});
    if (canDir) {
      return { segs: ['Estás en sala Nube pero el directorio aún no lista a otros. Cada Mac debe entrar en ⇄ con R+ Cloud, misma sala y ', { strong: 'Guardar perfil' }, ' con @usuario; después aparecen aquí y tú los asignas al equipo (no al revés).'] };
    }
    return { segs: ['En ', { strong: 'Integrantes' }, ' verás compañeros cuando el admin te asigne a un equipo desde el directorio. Mientras tanto: ⇄ → misma sala Nube, @usuario guardado.'] };
  } catch {
    return null;
  }
}

export function resolveBrowseSala(elevated, homeSala) {
  if (!elevated) return homeSala;
  try {
    const stored = localStorage.getItem(BROWSE_SALA_LS);
    if (stored === '__all__') return '__all__';
    if (stored && CLINICAL_SALAS.includes(stored)) return stored;
  } catch (_e) { void _e; }
  if (!homeSala) return '__all__';
  return homeSala;
}

/** @returns {Array<string|{strong:string}>} */
function buildDirectoryEmptySegs(elevated, browseSala, homeSala) {
  const label = browseSala === '__all__' ? 'ninguna sala' : String(browseSala || homeSala);
  const userSala = String(clinicalSessionContext.user?.sala || homeSala || '').trim();
  if (isCloudSala(userSala) && !getCloudSyncToken()) {
    return [
      'Falta sesión Nube. Vuelve al paso anterior y guarda tu perfil con ',
      { strong: 'contraseña Nube' },
      ', o inicia sesión en ',
      { strong: '⇄ Conexión' },
      '.',
    ];
  }
  if (isCloudSala(userSala) && getCloudSyncToken() && !isCloudSyncActive()) {
    return [`Conecta la sala en `, { strong: '⇄ Conexión' }, ` para traer equipos de ${label}, o crea uno abajo.`];
  }
  if (elevated) {
    return [`No hay otros equipos en ${label}. Los tuyos aparecen arriba.`];
  }
  return [`No hay otros equipos disponibles en ${label}. Pide código al líder de tu equipo o espera asignación en Nube.`];
}

/** @param {boolean} elevated @param {string} browseSala @param {number} count */
function buildDirectorySectionTitle(elevated, browseSala, count = 0, mine = 0) {
  if (!elevated) return `${mine > 0 ? 'Otros equipos' : 'Equipos'} en ${browseSala}`;
  const countLabel = count > 0 ? `${count} equipo${count === 1 ? '' : 's'} · ` : '';
  if (browseSala === '__all__') {
    return count > 0 ? `${countLabel}Explorar · todas las salas` : 'Explorar · todas las salas';
  }
  return count > 0 ? `${countLabel}Explorar · ${browseSala}` : `Explorar · ${browseSala}`;
}

/** @param {boolean} elevated @param {number} count @param {number} [mine] own teams leading the list */
function buildDirectorySectionDescSegs(elevated, count, mine = 0) {
  // The empty message below the title already says what to do.
  if (count <= 0) return null;
  if (elevated) {
    return ['Equipos publicados en Nube — asigna residentes o únete si corresponde.'];
  }
  if (mine > 0) return ['Por si cambias de equipo.'];
  return ['Tu líder de equipo o R4 ya publicó estos equipos. Elige el tuyo y pulsa ', { strong: 'Unirme' }, '.'];
}

/**
 * Props for <DirectorySection>. `count` is how many teams the directory lists; `props` is null when
 * the DB bridge is missing.
 * @param {{ userId: string, elevated: boolean, browseSala: string, homeSala: string, mineCount?: number, now?: Date, trailingCard?: (count: number) => any }} opts
 * @returns {Promise<{ props: object|null, count: number }>}
 */
export async function directorySectionProps(opts) {
  const { userId, elevated, browseSala, homeSala, mineCount = 0, now = new Date(), trailingCard = () => null } = opts;
  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsListBySala !== 'function') {
    return { props: null, count: 0 };
  }

  const listOpts =
    elevated && browseSala === '__all__'
      ? { sala: '', forUserId: userId, allSalas: true }
      : { sala: browseSala || homeSala, forUserId: userId };

  const res = await api.dbClinicalTeamsListBySala(listOpts);
  const allSalaTeams = res?.ok && Array.isArray(res.teams) ? res.teams : [];
  const directory = allSalaTeams.filter((t) => !t.isMember);
  const salaLabel = browseSala || homeSala;

  return {
    props: {
      title: buildDirectorySectionTitle(elevated, salaLabel, directory.length, mineCount),
      descSegs: buildDirectorySectionDescSegs(elevated, directory.length, mineCount),
      salas: elevated ? CLINICAL_SALAS : null,
      browseSala,
      emptySegs: directory.length ? null : buildDirectoryEmptySegs(elevated, browseSala, homeSala),
      cards: directory.map((team) => directoryTeamCardProps(team, { elevated, siblingTeams: allSalaTeams }, now)),
      // The «¿No ves tu equipo?» card always closes the grid, so Crear and
      // código sit where you looked for your team.
      trailing: trailingCard(directory.length),
    },
    count: directory.length,
  };
}
