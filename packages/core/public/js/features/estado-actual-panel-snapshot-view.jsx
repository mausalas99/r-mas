/** Estado actual snapshot strip + historial list (Preact). Loaded lazily from estado-actual-panel-render.mjs. */
import { liveHistorial } from './estado-actual-data-model.mjs';
import { formatEvacForText, formatIoBalanceDisplay } from './estado-actual-io.mjs';
import { isGlucometriaMarkedAltered } from './estado-actual-ranges.mjs';
import { displayBalance, displayValue } from './estado-actual-panel-format.mjs';
import {
  buildHistorialRowParts,
  formatHistorialWhen,
  formatSnapshotEgresos,
  formatSnapshotIngresos,
  hasIoTurnoEvents,
  renderSnapshotGluZoneTitle,
  snapshotInsulinPumpAlgLabel,
  snapshotVitalRowsOpts,
  todayDayMonth,
  vitalsHeadStamp,
} from './estado-actual-panel-snapshot-html.mjs';

function VitalRow({ r, headStamp, today }) {
  const cls =
    'ea-snapshot-row' + (r.altered ? ' ea-snapshot-row--altered' : '') + (r.hasHistory ? ' ea-snapshot-row--interactive' : '');
  const keyArgs = JSON.stringify([String(r.vitalKey)]);
  const interact = r.hasHistory
    ? {
        role: 'button',
        tabindex: '0',
        'data-ea-vital-history': r.vitalKey,
        'data-onclick': 'openEaVitalHistoryModal',
        'data-onclick-args': keyArgs,
        'data-onkeydown': 'openEaVitalHistoryModal',
        'data-onkeydown-args': keyArgs,
        'data-onkeydown-keys': 'Enter,Space',
        'data-onkeydown-prevent': '',
        title: 'Ver historial del turno',
      }
    : {};
  // Today's date on every vital is noise: only an older reading shows its date.
  // The date shared by most rows sits beside the title; a row shows only a different one.
  const showStamp = r.stamp && r.stamp !== today && r.stamp !== headStamp;
  return (
    <div class={cls} {...interact}>
      <span class="ea-snapshot-row-label">{r.label}</span>
      <span class="ea-snapshot-row-reading">
        <span class="ea-snapshot-row-value">{r.value}</span>
        {r.unit ? <span class="ea-snapshot-row-unit">{r.unit}</span> : null}
      </span>
      {showStamp ? (
        <span class="ea-snapshot-row-stamp">{r.stamp}</span>
      ) : (
        <span class="ea-snapshot-row-stamp ea-snapshot-row-stamp--empty" aria-hidden="true"></span>
      )}
    </div>
  );
}

function BombaChip({ b }) {
  const hasUnits = b.units != null && b.units !== '' && Number(b.units) !== 0;
  return (
    <span class="ea-snapshot-glu-chip ea-snapshot-glu-chip--bomba">
      {displayValue(b.value)}
      {' MG/DL'}
      {hasUnits ? [' ', <span class="ea-snapshot-glu-units">({displayValue(b.units)} U)</span>] : null}
      {b.time ? [' ', <span class="ea-snapshot-glu-time">{b.time}</span>] : null}
    </span>
  );
}

function GluChip({ g }) {
  const rescue = g.rescueUnits != null && g.rescueUnits !== '' && Number(g.rescueUnits) !== 0;
  const post = g.postRescueValue != null && g.postRescueValue !== '';
  return (
    <span class={'ea-snapshot-glu-chip' + (isGlucometriaMarkedAltered(g) ? ' ea-snapshot-glu-chip--altered' : '')}>
      {displayValue(g.value)}
      {' MG/DL'}
      {rescue ? [' ', <span class="ea-snapshot-glu-rescue">({displayValue(g.rescueUnits)} U rescate)</span>] : null}
      {post ? [' ', <span class="ea-snapshot-glu-post">→ {displayValue(g.postRescueValue)} MG/DL</span>] : null}
      {g.time ? [' ', <span class="ea-snapshot-glu-time">{g.time}</span>] : null}
    </span>
  );
}

function GluBody({ snapshot }) {
  const alg = snapshotInsulinPumpAlgLabel(snapshot);
  const badge = alg ? <span class="ea-snapshot-glu-alg-badge ea-muted">{alg}</span> : null;
  if (snapshot.bombaInsulina && snapshot.bombaInsulina.length) {
    return (
      <>
        {badge}
        {snapshot.bombaInsulina.map((b) => <BombaChip b={b} />)}
      </>
    );
  }
  if (badge) return badge;
  if (snapshot.glucometrias && snapshot.glucometrias.length) {
    return <>{snapshot.glucometrias.map((g) => <GluChip g={g} />)}</>;
  }
  return <span class="ea-muted">—</span>;
}

function IoBody({ snapshot, balGlobal }) {
  const io = snapshot.io;
  return (
    <div class="ea-snapshot-io">
      <div>
        <span class="ea-snapshot-label">Ingresos</span>
        <span class="ea-snapshot-io-val">{formatSnapshotIngresos(io.ing)}</span>
      </div>
      <div class="ea-snapshot-io-egr">
        <span class="ea-snapshot-label">Egresos</span>
        <span class="ea-snapshot-io-val">{formatSnapshotEgresos(io)}</span>
      </div>
      {io.evac != null && io.evac !== '' ? (
        <div>
          <span class="ea-snapshot-label">Evacuaciones</span>
          <span class="ea-snapshot-io-val">{formatEvacForText(io.evac)}</span>
        </div>
      ) : null}
      <div
        class="ea-snapshot-row--interactive"
        role="button"
        tabindex="0"
        data-onclick="openEaTurnosBalanceModal"
        data-onkeydown="openEaTurnosBalanceModal"
        data-onkeydown-keys="Enter,Space"
        data-onkeydown-prevent=""
        title="Ver T1, T2 y T3 y eventos del turno"
      >
        <span class="ea-snapshot-label">
          Turno <span aria-hidden="true">›</span>
          {io.turnos && hasIoTurnoEvents(io.turnos) ? [' ', <span class="ea-turno-event-dot" aria-label="con eventos">●</span>] : null}
        </span>
        <span class="ea-snapshot-io-val">{formatIoBalanceDisplay(io.ing, io)}</span>
      </div>
      <div>
        <span class="ea-snapshot-label">Global</span>
        <span class="ea-snapshot-io-val">{displayBalance(balGlobal)}</span>
      </div>
    </div>
  );
}

/** One system card: small title, then its readings. */
function SysCard({ id, title, children }) {
  return (
    <div class={'ea-sys-card ea-sys-card--' + id}>
      <h4 class="ea-sys-title">{title}</h4>
      {children}
    </div>
  );
}

/**
 * @param {{ snapshot: object, balGlobal: number, now?: Date }} props
 * `now`: the clock for "today" (rows dated today show no date); defaults to the real time.
 */
export function EaSnapshotSection({ snapshot, balGlobal, now }) {
  const rows = snapshotVitalRowsOpts(snapshot);
  const headStamp = vitalsHeadStamp(rows);
  const today = todayDayMonth(now);
  const vitals = (keys) => (
    <div class="ea-snapshot-vitals">
      {rows.filter((r) => keys.indexOf(r.vitalKey) >= 0).map((r) => <VitalRow r={r} headStamp={headStamp} today={today} />)}
    </div>
  );
  return (
    <section class="ea-section ea-sys-grid ea-snapshot-strip" id="ea-snapshot">
      <SysCard id="hemo" title={['Hemodinámico', headStamp ? [' ', <span class="ea-snapshot-zone-stamp">{headStamp}</span>] : null]}>
        {vitals(['bp', 'fc'])}
      </SysCard>
      <SysCard id="resp-lectura" title="Respiratorio">{vitals(['fr', 'sat'])}</SysCard>
      <SysCard id="inf" title="Infeccioso">{vitals(['temp'])}</SysCard>
      <SysCard id="meta" title={renderSnapshotGluZoneTitle(snapshot)}>
        <div class="ea-snapshot-glu"><GluBody snapshot={snapshot} /></div>
      </SysCard>
      <SysCard id="renal" title="Renal y balance"><IoBody snapshot={snapshot} balGlobal={balGlobal} /></SysCard>
    </section>
  );
}

/** @param {{ historial: Array<{ id?: string, recordedAt?: string }>, now?: Date }} props */
export function EaHistorialSection({ historial, now }) {
  const recent = liveHistorial(historial)
    .sort((a, b) => String(b.recordedAt || '').localeCompare(String(a.recordedAt || '')))
    .slice(0, 8);
  if (!recent.length) {
    return (
      <details class="ea-section ea-card ea-historial" id="ea-historial">
        <summary class="ea-historial-summary">Historial reciente</summary>
        <p class="ea-muted ea-historial-empty">Sin mediciones registradas.</p>
      </details>
    );
  }
  return (
    <details class="ea-section ea-card ea-historial" id="ea-historial">
      <summary class="ea-historial-summary">
        Historial reciente<span class="ea-historial-count">{recent.length}</span>
      </summary>
      <ul class="ea-historial-list">
        {recent.map((row) => {
          const parts = buildHistorialRowParts(row);
          const idArgs = JSON.stringify([String(row.id || '')]);
          return (
            <li class="ea-historial-row">
              <div class="ea-historial-main">
                <span class="ea-historial-when">{formatHistorialWhen(row.recordedAt, now)}</span>
                <span class="ea-historial-summary">{parts.length ? parts.join(' · ') : 'Registro vacío'}</span>
              </div>
              <div class="ea-historial-actions">
                <button type="button" class="ea-btn ea-btn--ghost" data-onclick="editarEstadoActualMedicion" data-onclick-args={idArgs}>Editar</button>
                <button type="button" class="ea-btn ea-btn--ghost ea-btn--danger" data-onclick="eliminarEstadoActualMedicion" data-onclick-args={idArgs}>Eliminar</button>
              </div>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
