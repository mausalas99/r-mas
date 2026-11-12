/**
 * Paciente Resumen glance (Preact). Root class patient-dash. Same DOM, classes and data-* hooks the
 * string builders in dashboard-html.mjs wrote; dashboard-mount.mjs keeps the model, the click wiring
 * and the fit watcher, and calls drawDashboard.
 */
import { render } from 'preact';

/**
 * Helpers the view calls, passed in by dashboard-mount.mjs (setDashboardDeps). They live in modules the boot
 * bundle already holds; importing them here would split them into extra boot chunks now that this view loads lazily.
 */
let D = {};
export function setDashboardDeps(deps) { D = deps; }

function numText(value) {
  if (value == null || value === '') return '';
  var n = Number(value);
  if (Number.isFinite(n)) return String(n);
  return String(value).trim();
}

function readingsFromModel(model) {
  var snap = model && model.vitals;
  if (!snap || typeof snap !== 'object') return { vitals: {}, glucometrias: [], io: {} };
  return {
    vitals: snap.vitals && typeof snap.vitals === 'object' ? snap.vitals : {},
    glucometrias: Array.isArray(snap.glucometrias) ? snap.glucometrias : [],
    io: snap.io && typeof snap.io === 'object' ? snap.io : {},
  };
}

function lastGlu(glucometrias) {
  if (!glucometrias.length) return '';
  var last = glucometrias[glucometrias.length - 1];
  if (last == null) return '';
  if (typeof last === 'object') return numText(last.value);
  return numText(last);
}

function ioBalance(io) {
  var ing = Number(io.ing);
  var egr = Number(io.egr);
  if (!Number.isFinite(ing) && !Number.isFinite(egr)) return '';
  var a = Number.isFinite(ing) ? ing : 0;
  var b = Number.isFinite(egr) ? egr : 0;
  var delta = a - b;
  return (delta > 0 ? '+' : '') + String(delta);
}

/** Pieces joined by « · » (text nodes between them). */
function joinDot(parts) {
  var out = [];
  parts.forEach(function (p, i) {
    if (i) out.push(' · ');
    out.push(p);
  });
  return out;
}

function VitalCell({ label, value, hi, range, quickKey }) {
  var rangeEl = range ? <span class="vital-range">{range}</span> : null;
  if (quickKey) {
    // Quick input (nav redesign): always shown, even empty. Saved by dashboard-mount on change.
    return (
      <label class={'vital vital-quick' + (hi ? ' hi' : '')}>
        <small>{label}</small>
        <input class="vital-input" data-vital-quick={quickKey} value={value} placeholder="—" inputmode="decimal" autocomplete="off" aria-label={label} />
        {rangeEl}
      </label>
    );
  }
  if (!value) return null;
  return (
    <div class={'vital' + (hi ? ' hi' : '')}>
      <small>{label}</small>
      <b>{value}</b>
      {rangeEl}
    </div>
  );
}

/**
 * 8.4.3 board A1: lowest–highest reading of the last 24 h (counted back from
 * the newest reading), shown under the value. Fewer than 2 readings → none.
 */
function range24h(series) {
  var list = Array.isArray(series) ? series : [];
  var at = function (r) {
    var t = Date.parse(r && r.recordedAt);
    return Number.isFinite(t) ? t : NaN;
  };
  var newest = list.reduce(function (max, r) {
    var t = at(r);
    return t > max ? t : max;
  }, -Infinity);
  var values = list
    .filter(function (r) {
      return at(r) >= newest - 86400000 && Number.isFinite(Number(r.value));
    })
    .map(function (r) {
      return Number(r.value);
    });
  if (values.length < 2) return '';
  var lo = Math.min.apply(null, values);
  var hi = Math.max.apply(null, values);
  return lo === hi ? '' : lo + '–' + hi;
}

function vitalAlteredFlags(v, gluLast, glu) {
  return [
    D.isVitalAltered('tas', v.tas) || D.isVitalAltered('tad', v.tad),
    D.isVitalAltered('fc', v.fc),
    D.isVitalAltered('fr', v.fr),
    D.isVitalAltered('temp', v.temp),
    D.isVitalAltered('sat', v.sat),
    D.isGlucometriaMarkedAltered(gluLast && typeof gluLast === 'object' ? gluLast : { value: glu }),
  ];
}

function vitalsAtLabel(vitalsAt) {
  if (!vitalsAt) return '';
  var d = new Date(vitalsAt);
  if (Number.isNaN(d.getTime())) return '';
  return 'toma ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function taLabel(v) {
  var tas = numText(v.tas);
  var tad = numText(v.tad);
  return tas || tad ? (tas || '—') + '/' + (tad || '—') : '';
}

function hasCoreVitalsData(v, ta, glu) {
  return !!(ta || numText(v.fc) || numText(v.fr) || numText(v.temp) || numText(v.sat) || glu);
}

function VitalsCard({ model }) {
  var r = readingsFromModel(model);
  var v = r.vitals;
  var ta = taLabel(v);
  var gluList = r.glucometrias;
  var gluLast = gluList.length ? gluList[gluList.length - 1] : null;
  var glu = lastGlu(gluList);
  var io = ioBalance(r.io);
  var flags = vitalAlteredFlags(v, gluLast, glu);
  var s = (model && model.vitals && model.vitals.vitalSeries) || {};
  var hasCoreVitals = hasCoreVitalsData(v, ta, glu);
  var alteredCount = flags.filter(Boolean).length;
  var atLabel = vitalsAtLabel(model && model.vitalsAt);
  var metaParts = [];
  if (atLabel) metaParts.push(atLabel);
  if (hasCoreVitals && alteredCount) metaParts.push(<span class="vitals-alert-count">{alteredCount} fuera de rango</span>);
  return (
    <div class={'card vitals-card' + (hasCoreVitals ? '' : ' vitals-card--empty')}>
      <div class="card-h">
        <span>Signos vitales</span>
        {metaParts.length ? <span class="card-h-meta">{joinDot(metaParts)}</span> : null}
        <button type="button" class="wb-btn wb-btn-secondary vitals-full-btn" data-dash-action="registro-completo">Registro completo</button>
      </div>
      <div class="card-b"><div class="vitals">
        <VitalCell label="T/A" value={ta} hi={flags[0]} range={range24h(s.tas)} quickKey="ta" />
        <VitalCell label="FC" value={numText(v.fc)} hi={flags[1]} range={range24h(s.fc)} quickKey="fc" />
        <VitalCell label="FR" value={numText(v.fr)} hi={flags[2]} range={range24h(s.fr)} quickKey="fr" />
        <VitalCell label="Temp" value={numText(v.temp)} hi={flags[3]} range={range24h(s.temp)} quickKey="temp" />
        <VitalCell label="SatO₂ %" value={numText(v.sat)} hi={flags[4]} range={range24h(s.sat)} quickKey="sat" />
        <VitalCell label="Glu" value={glu} hi={flags[5]} />
        <VitalCell label="I/O" value={io} hi={false} />
      </div></div>
    </div>
  );
}

function CtxPill({ label, value }) {
  return <span class="ctx-pill"><small>{label}</small>{value ? ' ' + value : ''}</span>;
}

/**
 * One slim row above vitals: care plan (soporte, dieta, bomba → Estado actual)
 * and lines/tubes with their day count (→ Datos). Nothing to show → no row.
 */
function ContextRow({ model }) {
  var kpis = (model.ea && model.ea.kpis) || [];
  var accesos = Array.isArray(model.accesos) ? model.accesos : [];
  if (!kpis.length && !accesos.length) return null;
  return (
    <div class="dash-context">
      {kpis.length ? (
        <button type="button" class="ctx-group" data-dash-action="estadoActual">
          {kpis.map((k) => (k.label === 'Bomba' && !k.value ? <CtxPill label="Bomba de insulina" value="" /> : <CtxPill label={k.label} value={k.value} />))}
        </button>
      ) : null}
      {accesos.length ? (
        <button type="button" class="ctx-group" data-dash-action="datos">
          {accesos.map((a) => <CtxPill label={a.label} value={a.dia ? 'día ' + a.dia : ''} />)}
        </button>
      ) : null}
    </div>
  );
}

function IcAssigned({ ids }) {
  return (
    <>
      {(Array.isArray(ids) ? ids : []).map((id) => {
        var svc = D.serviceById(id);
        if (!svc) return null;
        return <button type="button" class="svc" style={'--h:' + D.hueForService(svc)} data-dash-action="ic-toggle" data-ic-id={svc.id}>{svc.name}</button>;
      })}
      <button type="button" class="svc-add" data-dash-action="ic-add">+ Agregar</button>
    </>
  );
}

function Identity({ model }) {
  var idn = (model && model.identity) || {};
  var dx = Array.isArray(idn.diagnosticos) ? idn.diagnosticos : [];
  return (
    <div class="idrow"><div>
      <div class="id-name-row">
        <button type="button" class="dash-back-cards" data-sv-home="" aria-label="Volver a todas las camas" title="Volver a todas las camas (Esc)">‹ Camas</button>
        <h1><button class="dash-name" type="button" data-dash-action="datos">{idn.nombre || 'Paciente'}</button></h1>
      </div>
      <div class="chips" id="ic-assigned">
        {dx.map((d) => <span class="chip" title={d}>{d}</span>)}
        <IcAssigned ids={idn.interconsultServiceIds} />
      </div></div>
      <div class="id-actions">
        <button type="button" class="wb-btn wb-btn-primary" data-dash-action="actualizar-labs">Actualizar labs</button>
      </div>
    </div>
  );
}

var TREND_ARROW = { up: ['is-up', '↑'], down: ['is-down', '↓'], flat: ['is-flat', '→'] };

function TrendArrow({ trend }) {
  var t = TREND_ARROW[trend];
  return t ? <span class={'draw-trend ' + t[0]}>{t[1]}</span> : null;
}

function DrawCell({ chip }) {
  var value = String((chip && chip.value) || '').replace(/\*$/, '');
  return (
    <div class="draw-cell" data-fit-item="">
      <span class="draw-label">{String((chip && chip.label) || '')}</span>
      <span class="draw-value abn">{value}</span>
      {chip && chip.prev ? <span class="draw-delta">antes {String(chip.prev)} <TrendArrow trend={chip.trend} /></span> : <span class="draw-delta"></span>}
    </div>
  );
}

function envioChipCount(envio) {
  return (envio.groups || []).reduce(function (n, g) {
    return n + (g.chips ? g.chips.length : 0);
  }, 0);
}

/**
 * Orders altered-lab chips for display: worsening values (trend 'down', a
 * drop since the prior reading) rank first, worst drop first. Everything
 * else (up/flat/no prior reading) falls back to CLINICAL_PRIORITY_LABELS.
 * Ties keep their original (stable) order within each group.
 */
function sortDrawChips(chips) {
  var indexed = chips.map(function (chip, i) {
    return { chip: chip, i: i };
  });
  indexed.sort(function (a, b) {
    var aDown = a.chip && a.chip.trend === 'down';
    var bDown = b.chip && b.chip.trend === 'down';
    if (aDown && bDown) {
      var aMag = Math.abs(parseFloat(String(a.chip.delta).replace(/^[+-]/, ''))) || 0;
      var bMag = Math.abs(parseFloat(String(b.chip.delta).replace(/^[+-]/, ''))) || 0;
      if (aMag !== bMag) return bMag - aMag;
      return a.i - b.i;
    }
    if (aDown !== bDown) return aDown ? -1 : 1;
    var aRank = D.clinicalPriorityRank(a.chip && a.chip.label);
    var bRank = D.clinicalPriorityRank(b.chip && b.chip.label);
    if (aRank !== bRank) return aRank - bRank;
    return a.i - b.i;
  });
  return indexed.map(function (entry) {
    return entry.chip;
  });
}

function Draw({ envio, showHead }) {
  var all = (envio.groups || []).reduce(function (acc, g) {
    return acc.concat(g.chips || []);
  }, []);
  return (
    <button class={'draw' + (envio.wide ? ' is-wide' : '')} type="button" data-dash-action="labs-envio" data-lab-set-id={String(envio.id || '')}>
      {showHead && envio.hora ? <div class="draw-head"><span class="draw-head-label">Corte {envio.hora}</span></div> : null}
      <div class="draw-grid" data-fit-zone="" data-fit-one-row="">
        {sortDrawChips(all).map((chip) => <DrawCell chip={chip} />)}
        <span class="draw-cell draw-more" data-fit-more="" data-fit-base="0" data-fit-idle="" hidden></span>
      </div>
    </button>
  );
}

/**
 * A patient can have more than one lab draw ("envio") the same day, and each
 * draw renders as its own stacked card. When the same analyte (chip label)
 * is altered in more than one of the visible draws, showing it twice is
 * redundant and pushes the page below the fold. Keep each repeated label
 * only in the most recent draw that has it, dropping it from earlier ones.
 * If an earlier draw ends up with zero chips after that, drop the draw
 * entirely so no empty card renders. Matching is case-insensitive/trimmed,
 * same normalization style as clinicalPriorityRank above.
 */
function dedupeChipsAcrossEnvios(visibleEnvios) {
  var seenLabels = {};
  var deduped = [];
  for (var i = visibleEnvios.length - 1; i >= 0; i -= 1) {
    var envio = visibleEnvios[i];
    var groups = (envio.groups || []).map(function (g) {
      var chips = (g.chips || []).filter(function (chip) {
        var norm = String((chip && chip.label) || '').trim().toLowerCase();
        if (seenLabels[norm]) return false;
        seenLabels[norm] = true;
        return true;
      });
      return { tipo: g.tipo, chips: chips };
    });
    deduped.unshift(Object.assign({}, envio, { groups: groups }));
  }
  return deduped.filter(function (envio) {
    return envioChipCount(envio) > 0;
  });
}

function AtbPop({ c }) {
  var groups = Array.isArray(c.atb) ? c.atb : [];
  if (!groups.length) return null;
  return (
    <span class="cult-pop" role="tooltip">
      <span class="cult-pop-h">{c.sitioFull || c.sitio}</span>
      {groups.map((g) => <span class="cult-pop-row"><b class={'atb-k is-' + String(g.k).toLowerCase()}>{g.k}</b>{g.drugs}</span>)}
    </span>
  );
}

/**
 * Newest positive cultures; «ATB pendiente» while the antibiograma is missing.
 * Hover / focus shows the antibiogram when there is one. Click → Cultivos.
 */
function Cultivos({ labs }) {
  var list = Array.isArray(labs.cultivos) ? labs.cultivos : [];
  if (!list.length) return null;
  var more = (Number(labs.cultivosTotal) || 0) - list.length;
  return (
    <div class="cultivos">
      <div class="cultivos-h">
        <span>Cultivos</span>
        {labs.cultivosSinRevisar > 0 ? <button type="button" class="card-h-count cult-pending-chip" data-dash-action="cultivos">{labs.cultivosSinRevisar} sin revisar</button> : null}
        {more > 0 ? <button type="button" class="card-h-count" data-dash-action="cultivos">+{more} más</button> : null}
      </div>
      <div class="cult-grid">
        {list.map((c) => {
          var fecha = String(c.fecha || '').replace(/\/\d{4}$/, '');
          return (
            <button type="button" class={'cult' + (c.atbPendiente ? ' is-pending' : '')} data-dash-action="cultivos">
              <span class="cult-row"><b class="cult-sitio">{c.sitio}</b><span class="cult-date">{fecha + (c.preliminar ? ' · prelim.' : '')}</span></span>
              <span class="cult-row"><i class="cult-org">{c.organismo}</i>{c.atbPendiente ? <em>ATB pendiente</em> : null}</span>
              <AtbPop c={c} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LabsHeader({ visibleEnvios, enRango, prevFecha }) {
  if (!visibleEnvios.length) return <div class="card-h">Labs</div>;
  var meta = [];
  if (visibleEnvios.length === 1 && visibleEnvios[0].hora) meta.push('corte ' + visibleEnvios[0].hora);
  if (enRango > 0) meta.push(enRango + ' en rango');
  if (prevFecha) meta.push('vs ' + String(prevFecha).replace(/\/\d{4}$/, ''));
  return (
    <div class="card-h">
      <span>Labs: fuera de rango</span>
      {meta.length ? <span class="card-h-meta">{joinDot(meta)}</span> : null}
    </div>
  );
}

/** Keyed by pending vs loaded so the deferred-labs repaint swaps a fresh node. */
export function LabsCard({ model }) {
  var labs = (model && model.labs) || {};
  var pending = !!labs.pending;
  var envios = Array.isArray(labs.envios) ? labs.envios : [];
  var visibleEnvios = dedupeChipsAcrossEnvios(envios.slice(-2));
  var single = visibleEnvios.length === 1;
  var enRango = Number(labs.enRangoCount) || 0;
  var body;
  if (pending) {
    body = null;
  } else if (visibleEnvios.length) {
    body = <div class="day-draws">{visibleEnvios.map((envio) => <Draw envio={envio} showHead={!single} />)}</div>;
  } else if (enRango > 0) {
    body = <p class="labs-en-rango">{enRango} valores en rango</p>;
  } else {
    body = <p class="empty-hint">Sin labs de hoy{labs.lastFecha ? ' · últimos: ' + labs.lastFecha : ''}</p>;
  }
  return (
    <div class="card labs-card clickable" data-dash-labs="" data-dash-action="labs-full" key={pending ? 'pending' : 'loaded'}>
      <LabsHeader visibleEnvios={pending ? [] : visibleEnvios} enRango={enRango} prevFecha={labs.prevFecha} />
      <div class="card-b" data-fit="">{body}</div>
    </div>
  );
}

function MedItem({ item }) {
  var name = item == null ? '' : typeof item === 'string' ? item : String(item.name || '');
  if (!name) return null;
  var token = !item || typeof item === 'string' ? '' : String(item.token || '');
  var emphasis = item && typeof item === 'object' && item.emphasis;
  return (
    <div class="med" data-fit-item="">
      <span class="name">{name}</span>
      {token ? <span class={'meta' + (emphasis ? ' is-key' : '')}>{token}</span> : null}
    </div>
  );
}

/** All meds render; dashboard-fit.mjs hides the rows that do not fit and fills «+N más». */
function SoapZone({ zone }) {
  var letter = String(zone.letter || '');
  return (
    <div class="soap-zone" data-fit-zone="">
      <span class="z" data-soap={letter}>
        {letter}
        {zone.subtitle ? <>{' '}<em>{zone.subtitle}</em></> : null}
        <small class="zone-more" data-fit-more="" hidden></small>
      </span>
      {(zone.items || []).map((item) => <MedItem item={item} />)}
    </div>
  );
}

function MedsBand({ model }) {
  var soap = model && model.ea && model.ea.soap;
  if (!soap || !soap.length) return null;
  return (
    <div class="bento meds-band">
      <button class="card clickable meds-card" type="button" data-dash-action="estadoActual">
        <div class="card-h">Medicamentos</div>
        <div class="card-b" data-fit=""><div class="soap-pack" data-fit-cols="3,4">
          {/* Clinical zone order from packSoapCols, flattened: CSS columns balance the layout. */}
          {D.packSoapCols(soap).flat().map((zone) => <SoapZone zone={zone} />)}
        </div></div>
      </button>
    </div>
  );
}

function rowTime(item) {
  if (item == null) return '';
  if (typeof item === 'string') return '';
  if (item.time) return String(item.time);
  if (item.dueDate) return 'Vence';
  if (item.at) {
    var d = new Date(item.at);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    }
  }
  return '';
}

function rowText(item) {
  if (item == null) return '';
  if (typeof item === 'string') return item;
  return String(item.text || '');
}

function Rows({ list, markOverdue, fromStart, now }) {
  return (
    <ul class="rows" data-fit-zone="" data-fit-from-start={fromStart ? '' : undefined}>
      {list.map((item) => {
        var overdue = !!markOverdue && D.isTodoOverdue(item, now);
        var t = rowTime(item);
        return (
          <li data-fit-item="" class={overdue ? 'is-overdue' : undefined}>
            {overdue ? <><b class="due-tag">Vencido</b>{' '}</> : t ? <><time>{t}</time>{' '}</> : null}
            {rowText(item)}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Empty list → no card, the others take its space. The header shows the total;
 * when rows are cut (model cap or dashboard-fit.mjs) it shows «+N más».
 * Pendientes keep the newest rows, so they cut from the start.
 */
function ListCard({ title, action, items, total, markOverdue, now }) {
  var list = Array.isArray(items) ? items : [];
  if (!list.length) return null;
  var base = Math.max(0, (Number(total) || 0) - list.length);
  return (
    <button class="card clickable" type="button" data-dash-action={action}>
      <div class="card-h"><span>{title}</span><span class="card-h-count" data-fit-more="" data-fit-base={base} data-fit-idle={list.length}>{base > 0 ? '+' + base + ' más' : String(list.length)}</span></div>
      <div class="card-b" data-fit=""><Rows list={list} markOverdue={markOverdue} fromStart={markOverdue} now={now} /></div>
    </button>
  );
}

/** Board D3: today's glucometries as bars (last 5), no click target. */
function GlucoseCard({ model }) {
  var list = readingsFromModel(model).glucometrias.slice(-5);
  if (!list.length) return null;
  return (
    <div class="card glu-card"><div class="card-h"><span>Glucosa de hoy</span></div>
      <div class="card-b"><div class="glu-bars">
        {list.map((g) => {
          var obj = g && typeof g === 'object' ? g : { value: g };
          var n = Number(obj.value);
          var h = Number.isFinite(n) ? Math.max(12, Math.min(52, Math.round(n / 4))) : 12;
          return (
            <div class={'glu-bar' + (D.isGlucometriaMarkedAltered(obj) ? ' hi' : '')}>
              <i style={'height:' + h + 'px'}></i><b>{numText(obj.value) || '—'}</b><small>{String(obj.time || '')}</small>
            </div>
          );
        })}
      </div></div>
    </div>
  );
}

/** Board D3: ingresos, egresos and balance, own card. Nothing recorded → no card. */
function BalanceCard({ model }) {
  var io = readingsFromModel(model).io;
  var ing = numText(io.ing);
  var egr = numText(io.egr);
  if (!ing && !egr) return null;
  return (
    <div class="card bal-card"><div class="card-h"><span>Balance hídrico</span></div>
      <div class="card-b"><div class="bal-tiles">
        <div><small>Ingresos</small><b>{ing || '—'}</b></div>
        <div><small>Egresos</small><b>{egr || '—'}</b></div>
        <div class="is-total"><small>Balance</small><b>{ioBalance(io) || '—'}</b></div>
      </div></div>
    </div>
  );
}

/**
 * @param {{ model: ReturnType<import('./dashboard-model.mjs').buildDashboardModel>, now?: Date | number }} p
 */
export function DashboardView({ model, now }) {
  var m = model || {};
  var labs = m.labs || {};
  // 8.4.3 (board A1): no Eventualidades card; Medicamentos then Pendientes, both full width.
  var lists = ListCard({ title: 'Pendientes', action: 'pendientes', items: m.pendientes, total: m.pendientesTotal, markOverdue: true, now: now });
  var showCult = !labs.pending && Array.isArray(labs.cultivos) && labs.cultivos.length > 0;
  var cult = showCult ? <div class="card cultivos-card"><div class="card-b"><Cultivos labs={labs} /></div></div> : null;
  var meds = MedsBand({ model: m });
  var glu = GlucoseCard({ model: m });
  var bal = BalanceCard({ model: m });
  var rest = lists || cult;
  return (
    <div class="patient-dash dash">
      <Identity model={m} />
      <ContextRow model={m} />
      <div class="bento vitals-labs">
        <VitalsCard model={m} />
        <LabsCard model={m} />
      </div>
      {glu || bal ? <div class="bento metab">{glu}{bal}</div> : null}
      {meds || rest ? (
        <div class="dash-bottom">
          {meds}
          {rest ? <div class={'bento rest' + (lists && cult ? ' rest-2' : '')}>{lists}{cult}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Paint the glance into `mount`. `keep` diffs against what is already there (the deferred-labs
 * repaint, so typed vitals survive); otherwise the host is cleared first so dashboard-fit's
 * direct DOM edits never leak into the next paint.
 */
export function drawDashboard(mount, model, keep) {
  if (!keep) {
    render(null, mount);
    mount.textContent = '';
  }
  render(<DashboardView model={model} />, mount);
}
