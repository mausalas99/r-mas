/**
 * Estado actual snapshot strip + historial list (Preact). Loaded lazily from estado-actual-panel-render.mjs.
 * Props only (built by estado-actual-panel-snapshot-html.mjs): no data imports, so the lazy chunk stays small.
 */
function VitalRow({ r }) {
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
  return (
    <div class={cls} {...interact}>
      <span class="ea-snapshot-row-label">{r.label}</span>
      <span class="ea-snapshot-row-reading">
        <span class="ea-snapshot-row-value">{r.value}</span>
        {r.unit ? <span class="ea-snapshot-row-unit">{r.unit}</span> : null}
      </span>
      {r.showStamp ? (
        <span class="ea-snapshot-row-stamp">{r.stamp}</span>
      ) : (
        <span class="ea-snapshot-row-stamp ea-snapshot-row-stamp--empty" aria-hidden="true"></span>
      )}
    </div>
  );
}

function BombaChip({ b }) {
  return (
    <span class="ea-snapshot-glu-chip ea-snapshot-glu-chip--bomba">
      {b.value}
      {' MG/DL'}
      {b.units ? [' ', <span class="ea-snapshot-glu-units">({b.units} U)</span>] : null}
      {b.time ? [' ', <span class="ea-snapshot-glu-time">{b.time}</span>] : null}
    </span>
  );
}

function GluChip({ g }) {
  return (
    <span class={'ea-snapshot-glu-chip' + (g.altered ? ' ea-snapshot-glu-chip--altered' : '')}>
      {g.value}
      {' MG/DL'}
      {g.rescue ? [' ', <span class="ea-snapshot-glu-rescue">({g.rescue} U rescate)</span>] : null}
      {g.post ? [' ', <span class="ea-snapshot-glu-post">→ {g.post} MG/DL</span>] : null}
      {g.time ? [' ', <span class="ea-snapshot-glu-time">{g.time}</span>] : null}
    </span>
  );
}

function GluBody({ p }) {
  const badge = p.gluAlg ? <span class="ea-snapshot-glu-alg-badge ea-muted">{p.gluAlg}</span> : null;
  if (p.bomba.length) {
    return (
      <>
        {badge}
        {p.bomba.map((b) => <BombaChip b={b} />)}
      </>
    );
  }
  if (badge) return badge;
  if (p.glu.length) return <>{p.glu.map((g) => <GluChip g={g} />)}</>;
  return <span class="ea-muted">—</span>;
}

function IoBody({ io }) {
  return (
    <div class="ea-snapshot-io">
      <div>
        <span class="ea-snapshot-label">Ingresos</span>
        <span class="ea-snapshot-io-val">{io.ing}</span>
      </div>
      <div class="ea-snapshot-io-egr">
        <span class="ea-snapshot-label">Egresos</span>
        <span class="ea-snapshot-io-val">{io.egr}</span>
      </div>
      {io.evac != null ? (
        <div>
          <span class="ea-snapshot-label">Evacuaciones</span>
          <span class="ea-snapshot-io-val">{io.evac}</span>
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
          {io.turnoEvents ? [' ', <span class="ea-turno-event-dot" aria-label="con eventos">●</span>] : null}
        </span>
        <span class="ea-snapshot-io-val">{io.turno}</span>
      </div>
      <div>
        <span class="ea-snapshot-label">Global</span>
        <span class="ea-snapshot-io-val">{io.global}</span>
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

/** @param {ReturnType<typeof import('./estado-actual-panel-snapshot-html.mjs').buildSnapshotViewProps>} p */
export function EaSnapshotSection(p) {
  const vitals = (keys) => (
    <div class="ea-snapshot-vitals">
      {p.vitals.filter((r) => keys.indexOf(r.vitalKey) >= 0).map((r) => <VitalRow r={r} />)}
    </div>
  );
  return (
    <section class="ea-section ea-sys-grid ea-snapshot-strip" id="ea-snapshot">
      <SysCard id="hemo" title={['Hemodinámico', p.headStamp ? [' ', <span class="ea-snapshot-zone-stamp">{p.headStamp}</span>] : null]}>
        {vitals(['bp', 'fc'])}
      </SysCard>
      <SysCard id="resp-lectura" title="Respiratorio">{vitals(['fr', 'sat'])}</SysCard>
      <SysCard id="inf" title="Infeccioso">{vitals(['temp'])}</SysCard>
      <SysCard id="meta" title={p.gluTitle}>
        <div class="ea-snapshot-glu"><GluBody p={p} /></div>
      </SysCard>
      <SysCard id="renal" title="Renal y balance"><IoBody io={p.io} /></SysCard>
    </section>
  );
}

/** @param {ReturnType<typeof import('./estado-actual-panel-snapshot-html.mjs').buildHistorialViewProps>} p */
export function EaHistorialSection({ rows }) {
  if (!rows.length) {
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
        Historial reciente<span class="ea-historial-count">{rows.length}</span>
      </summary>
      <ul class="ea-historial-list">
        {rows.map((row) => (
          <li class="ea-historial-row">
            <div class="ea-historial-main">
              <span class="ea-historial-when">{row.when}</span>
              <span class="ea-historial-summary">{row.summary}</span>
            </div>
            <div class="ea-historial-actions">
              <button type="button" class="ea-btn ea-btn--ghost" data-onclick="editarEstadoActualMedicion" data-onclick-args={row.idArgs}>Editar</button>
              <button type="button" class="ea-btn ea-btn--ghost ea-btn--danger" data-onclick="eliminarEstadoActualMedicion" data-onclick-args={row.idArgs}>Eliminar</button>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
