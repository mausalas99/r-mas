/** Guardia tour step copy and HTML helpers (R+ Cloud / Nube). */
import { stepRequiresUserAction } from '../../tour-targets.mjs';
import { getSettingsHelpRuntime } from './runtime.mjs';

const rt = getSettingsHelpRuntime();

export const MOBILE_SCOPE_COPY =
  'La app móvil (iPad/Safari) muestra tablero de guardia y expediente esencial; no incluye Ajustes, exportaciones Word ni todas las pestañas de escritorio.';

export const LIVESYNC_BTN_COPY =
  '<strong>R+ Cloud</strong> (icono <strong>⇄</strong> / Wi‑Fi junto a Ajustes)';

function getClinicalRankForTour() {
  try {
    const st = rt.getSettings();
    return String(st?.clinicalRank || 'R1').trim().toUpperCase();
  } catch {
    return 'R1';
  }
}

const GV7_HELP_ARTICLE = {
  gv7_guardia_chip: 'modo-guardia',
  gv7_guardia_tab: 'modo-guardia',
  gv7_guardia_scope: 'modo-guardia',
  gv7_trust_strip: 'modo-guardia',
  gv7_guardia_toggle: 'modo-guardia',
  gv7_guardia_exit: 'modo-guardia',
  gv7_censo_r1: 'modo-guardia',
  gv7_censo_r4: 'modo-guardia',
  gv7_censo_sync: 'modo-guardia',
  gv7_entrega_phase: 'modo-entrega',
  gv7_entrega_patient: 'modo-entrega',
  gv7_entrega_roster: 'modo-entrega',
  gv7_entrega_pendientes: 'modo-entrega',
  gv7_fin_turno: 'modo-entrega',
  gv7_lan_wifi: 'nube-conexion-turno',
  gv7_lan_directorio: 'nube-conexion-turno',
  gv7_lan_rotacion: 'rotacion-equipos',
  gv7_rotacion_rejoin: 'rotacion-equipos',
  gv7_inherit_patients: 'rotacion-equipos',
  gv7_mobile_link: 'nube-conexion-turno',
  gv7_mobile_scope: 'nube-conexion-turno',
  gv7_mobile_vs_sala: 'nube-conexion-turno',
};

const GV7_ACTION_HINT = {
  gv7_guardia_toggle:
    '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Pulsa el botón resaltado; aparece <strong>Siguiente</strong> al activar el filtro.</p>',
  gv7_lan_wifi:
    '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Pulsa el icono <strong>⇄</strong> de Conexión / R+ Cloud para continuar.</p>',
  gv7_mobile_link:
    '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">El tutorial abre <strong>iPad / R+ Móvil</strong> en Conexión. Copia el enlace o escanea el QR.</p>',
};

function buildGv7CensoR1Copy(rank) {
  if (rank === 'R4') {
    return (
      '<p style="margin:0;line-height:1.5;">Como <strong>R4</strong>, el censo lateral puede mostrar toda la sala. ' +
      'En el siguiente paso verás la grilla agrupada por equipo.</p>'
    );
  }
  if (rank === 'R1') {
    return (
      '<p style="margin:0;line-height:1.5;">Como <strong>R1</strong>, el censo lateral lista pacientes de <strong>tu equipo</strong>. ' +
      'En guardia, <strong>Censo: solo entregados</strong> puede acotar aún más.</p>'
    );

  }
  return (
    '<p style="margin:0;line-height:1.5;">Según tu rango (<strong>' +
    escapeTourHtml(rank) +
    '</strong>), el censo lateral muestra tu equipo o un subconjunto de la sala.</p>'
  );
}

function buildGv7CensoR4Copy(rank) {
  if (rank === 'R4') {
    return (
      '<p style="margin:0;line-height:1.5;">En la grilla de guardia, los <strong>divisores por equipo</strong> organizan el censo de la sala. Los <strong>Filtros censo</strong> (arriba) acotan por sala.</p>'
    );
  }
  return (
    '<p style="margin:0;line-height:1.5;">En rangos <strong>R1–R3</strong> la grilla se acota a tu equipo. ' +
    'Los divisores por equipo en la grilla son propios de <strong>R4</strong>.</p>'
  );
}

function getGuardiaV7StepBody(stepId) {
  const rank = getClinicalRankForTour();
  const bodies = {
    gv7_guardia_chip:
      '<p style="margin:0;line-height:1.5;">El botón <strong>Guardia</strong> en la barra superior abre el tablero de turno: censo, entrega y monitoreo. No bloquea el resto de R+.</p>',
    gv7_guardia_tab:
      '<p style="margin:0;line-height:1.5;">En <strong>Modo Guardia</strong> el centro muestra el panel de guardia: fases del turno, métricas y grilla de pacientes.</p>',
    gv7_guardia_scope:
      '<p style="margin:0;line-height:1.5;">La <strong>barra de contexto</strong> resume sala y fase del turno. Quién ves en el censo depende de tu rango — lo revisamos en el módulo <strong>Censo y alcance</strong>.</p>',
    gv7_trust_strip:
      '<p style="margin:0;line-height:1.5;">La franja <strong>Nube · sala · equipo</strong> confirma de un vistazo que estás sincronizado y en el equipo correcto. Si dice <strong>Sin Nube</strong>, abre ⇄ Conexión antes de confiar en el censo compartido.</p>',
    gv7_guardia_toggle:
      '<p style="margin:0;line-height:1.5;"><strong>Censo: solo entregados</strong> filtra la grilla a pacientes que te entregaron en este turno, sin cambiar el modo Entrega.</p>',
    gv7_guardia_exit:
      '<p style="margin:0;line-height:1.5;">Pulsa de nuevo <strong>Guardia</strong> para volver a la vista Normal (Paciente, Laboratorio, etc.).</p>',
    gv7_entrega_phase:
      '<p style="margin:0;line-height:1.5;">Pulsa <strong>Entrega</strong> en la barra del censo para abrir el listado de handoff por paciente antes del turno activo.</p>',
    gv7_entrega_patient:
      '<p style="margin:0;line-height:1.5;">En cada paciente, <strong>Entrega</strong> documenta handoff, equipo entrante y pendientes. La grilla resalta críticos y entrantes.</p>',
    gv7_entrega_roster:
      '<p style="margin:0;line-height:1.5;">El <strong>roster de entrega</strong> lista pacientes pendientes de documentar antes de pasar al turno activo.</p>',
    gv7_entrega_pendientes:
      '<p style="margin:0;line-height:1.5;"><strong>Pendientes de entrega</strong>: plantillas por servicio, handoff estructurado y seguimiento entre turnos.</p>',
    gv7_fin_turno:
      '<p style="margin:0;line-height:1.5;">Al <strong>finalizar turno</strong>, R+ agrupa pendientes abiertos por equipo de origen para enviar handoff diurno y liberar cobertura. No borra pendientes si cierras sin enviar.</p>',
    gv7_lan_wifi:
      '<p style="margin:0;line-height:1.5;">' +
      LIVESYNC_BTN_COPY +
      ': cuenta, sala y sincronización del turno por Nube (sin Mac anfitrión ni escaneo de red local).</p>',
    gv7_lan_directorio:
      '<p style="margin:0;line-height:1.5;">El <strong>directorio de usuarios</strong> en <strong>⇄ Conexión → Opciones → Equipo</strong> muestra quién está en la sala. Los cambios de equipos se sincronizan por R+ Cloud.</p>',
    gv7_lan_rotacion:
      '<p style="margin:0;line-height:1.5;"><strong>Equipo</strong> en ⇄ Conexión (<strong>Opciones → Equipo</strong>): @usuario, equipos persistentes, sala y entregas. Distinto del censo del sidebar.</p>',
    gv7_rotacion_rejoin:
      '<p style="margin:0;line-height:1.5;">Cada mes, R+ puede mostrar <strong>Nueva rotación</strong>: confirma tu sala y vuelve a unirte a tu equipo en <strong>⇄ → Opciones → Equipo</strong>. Los equipos anteriores se archivan; el censo se actualiza por Nube.</p>',
    gv7_inherit_patients:
      '<p style="margin:0;line-height:1.5;">Al unirte a un equipo nuevo, el asistente <strong>Heredar pacientes</strong> te deja traer casos de tu equipo anterior (misma sala/ciclo) sin reasignar uno por uno.</p>',
    gv7_mobile_link:
      '<p style="margin:0;line-height:1.5;">Copia el <strong>enlace o QR de R+ Móvil</strong> desde <strong>⇄ Conexión → Opciones → iPad / R+ Móvil</strong>. Ábrelo en Safari e inicia sesión con tu cuenta Nube.</p>',
    gv7_mobile_scope:
      '<p style="margin:0;line-height:1.5;">' + MOBILE_SCOPE_COPY + '</p>',
    gv7_mobile_vs_sala:
      '<p style="margin:0;line-height:1.5;">En R+ Cloud, <strong>iPad/móvil</strong> (sesión Nube) y el <strong>escritorio</strong> comparten la misma sala; el enlace o QR de ⇄ Conexión basta para unirse.</p>',
    gv7_censo_r1: buildGv7CensoR1Copy(rank),
    gv7_censo_r4: buildGv7CensoR4Copy(rank),
    gv7_censo_sync:
      '<p style="margin:0;line-height:1.5;">La sincronización por R+ Cloud es discreta: avisos en el encabezado; equipos y censo se actualizan en segundo plano. Si el censo está vacío, revisa la franja Nube/sala/equipo o abre <strong>⇄ → Opciones → Equipo</strong> tras rotar.</p>',
  };
  return bodies[stepId] || '<p style="margin:0;line-height:1.5;">Sigue el resaltado en pantalla.</p>';
}

export function getGuardiaV7StepHtml(stepId) {
  let base = getGuardiaV7StepBody(stepId);
  if (GV7_ACTION_HINT[stepId] && stepRequiresUserAction(stepId)) {
    base += GV7_ACTION_HINT[stepId];
  }
  const articleId = GV7_HELP_ARTICLE[stepId];
  if (!articleId) return base;
  return (
    base +
    '<p style="margin:10px 0 0;">' +
    '<button type="button" class="help-tour-btn" onclick="openQuickHelp(\'' +
    articleId +
    "')\">Más en ayuda</button></p>"
  );
}

export function escapeTourHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
