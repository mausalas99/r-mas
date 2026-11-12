/**
 * Diagnóstico Nube dashboard (board «Nube B · algo falla»): verdict hero + Internet → Sesión → Sala →
 * En vivo chain, outbox, steps, alerts and repair tools. Preact: same DOM, classes and data-* hooks the
 * old panel-cloud-diagnostics-html.mjs string builders wrote; clicks are wired there by data-cloud-diag-*.
 */
import { mount } from './panel-admin-view.jsx';

const HERO_ICON = {
  ok: <path d="m5 12 5 5 9-10" />,
  info: <><path d="M20 12a8 8 0 1 1-2.3-5.6" /><path d="M20 4v5h-5" /></>,
  warn: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />,
  error: <><circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><path d="M12 16.5h.01" /></>,
};

const CHAIN_ICON = {
  Internet: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  Sesión: <><circle cx="7.5" cy="15.5" r="4.5" /><path d="m10.7 12.3 9.3-9.3M17 6l3 3" /></>,
  Sala: <><path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16" /><path d="M2 21h20" /><path d="M14 12h.01" /></>,
  'En vivo': <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />,
};

export function PipelineChain({ steps }) {
  if (!Array.isArray(steps) || !steps.length) return null;
  return (
    <div class="cloud-sync-chain" data-cloud-chain="" aria-label="Estado de conexión">
      {steps.map((step, i) => [
        i > 0 ? (
          <span class={'cloud-sync-chain-link' + (step.state !== 'ok' || steps[i - 1].state !== 'ok' ? ' is-broken' : '') + (step.state === 'off' ? ' is-waiting' : '')}></span>
        ) : null,
        <div class="cloud-sync-chain-step" data-state={step.state}>
          <div class="cloud-sync-chain-bubble">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              {CHAIN_ICON[step.label] || CHAIN_ICON.Internet}
            </svg>
          </div>
          <div class="cloud-sync-chain-label">{step.label}</div>
          <div class="cloud-sync-chain-detail">{step.detail}</div>
        </div>,
      ])}
    </div>
  );
}

function Alert({ item }) {
  return (
    <button type="button" class="cloud-sync-inset-row cloud-sync-inset-row--nav cloud-nube-dash-alert" data-cloud-diag-fix={String(item.fixId || 'generic_sync_error')} data-severity={String(item.severity || 'warn')}>
      <span class="cloud-nube-dash-alert-body">
        <span class="cloud-nube-dash-alert-title">{String(item.title || 'Problema')}</span>
        <span class="cloud-nube-dash-alert-detail">{String(item.detail || '')}</span>
        {item.hint ? <span class="cloud-nube-dash-alert-hint">{String(item.hint)}</span> : null}
        <span class="cloud-nube-dash-alert-cta">Cómo arreglar</span>
      </span>
      <span class="cloud-sync-options-row-chevron" aria-hidden="true">›</span>
    </button>
  );
}

function ToxicOutbox({ rows }) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return (
    <>
      <div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-toxic-head">Lotes pesados en cola</div>
      <dl class="cloud-nube-dash-kv-list">
        {rows.map((row) => (
          <div class="cloud-sync-inset-row cloud-sync-inset-row--kv cloud-nube-dash-toxic-row" data-status="error">
            <dt>{String(row.clientMutationId || 'push')}</dt>
            <dd>{String(row.opCount || 0) + ' ops · ~' + String(row.totalLabel || '') + (row.maxOpPath ? ' · ' + row.maxOpPath : '')}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function Alerts({ issues, recentErrors }) {
  const hasIssues = Array.isArray(issues) && issues.length > 0;
  const hasErrors = Array.isArray(recentErrors) && recentErrors.length > 0;
  if (!hasIssues && !hasErrors) return null;
  return (
    <div class="cloud-sync-inset-group cloud-nube-dash-card cloud-nube-dash-alerts-card">
      <div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-alerts-head">Problemas detectados</div>
      {hasIssues ? issues.map((issue) => <Alert item={issue} />) : null}
      {hasErrors ? recentErrors.map((e) => (
        <Alert item={{ fixId: e.fixId, severity: 'error', title: e.op + ' · ' + e.at, detail: e.explain, hint: e.code ? 'Código: ' + e.code : '' }} />
      )) : null}
    </div>
  );
}

function Hero({ verdict, chain }) {
  const level = HERO_ICON[verdict.level] ? verdict.level : 'ok';
  const ok = level === 'ok' || level === 'info';
  return (
    <div class="cloud-nube-dash-hero" data-level={level}>
      <div class="cloud-sync-hero">
        <div class="cloud-sync-hero-icon" data-state={level}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{HERO_ICON[level]}</svg>
        </div>
        <div class="cloud-sync-hero-text">
          <p class="cloud-sync-hero-title">{verdict.headline}</p>
          {verdict.subline ? <p class="cloud-sync-hero-sub">{verdict.subline}</p> : null}
        </div>
        <button type="button" class="cloud-sync-btn cloud-sync-btn--primary cloud-sync-hero-sync" data-cloud-diag-action={ok ? 'sync' : 'retry'}>{ok ? 'Sincronizar ahora' : 'Reintentar ahora'}</button>
      </div>
      <PipelineChain steps={chain} />
    </div>
  );
}

const capitalize = (kind) => {
  const s = String(kind || '');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

function Waiting({ v }) {
  const count = Number(v.outboxCount) || 0;
  const rows = v.outboxBreakdown || [];
  const foot = count
    ? v.oldestWait ? 'El más antiguo espera desde ' + v.oldestWait + '.' : ''
    : 'Todo lo que cambiaste ya está en Nube.';
  return (
    <div class="cloud-sync-inset-group cloud-nube-dash-card cloud-nube-dash-waiting">
      <div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-card-head">
        <span class="cloud-nube-dash-label">En espera de envío</span>
        <span class="cloud-nube-dash-count">{count ? count + (count === 1 ? ' cambio' : ' cambios') : 'Nada'}</span>
      </div>
      {rows.length ? (
        <dl class="cloud-nube-dash-kv-list">
          {rows.map((row) => (
            <div class="cloud-sync-inset-row cloud-sync-inset-row--kv cloud-nube-dash-outbox-row">
              <dt>{capitalize(row.label)}</dt>
              <dd>{String(row.count)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <ToxicOutbox rows={v.toxicOutbox} />
      {foot ? <div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-foot">{foot}</div> : null}
    </div>
  );
}

const Step = ({ n, title, body, children }) => (
  <div class="cloud-nube-dash-step">
    <span class="cloud-nube-dash-step-num" aria-hidden="true">{n}</span>
    <span class="cloud-nube-dash-step-text"><b>{title}</b><span>{body}</span></span>
    {children}
  </div>
);

function Steps({ verdict }) {
  if (verdict.level === 'ok' || verdict.level === 'info') return null;
  return (
    <div class="cloud-sync-inset-group cloud-nube-dash-card cloud-nube-dash-steps">
      <div class="cloud-nube-dash-label">Qué puedes hacer</div>
      <Step n={1} title="Espera un momento" body="Casi siempre vuelve solo en menos de un minuto." />
      <Step n={2} title="Pulsa Reintentar ahora" body="Envía lo que está en espera y vuelve a descargar." />
      <Step n={3} title="¿Sigue así en 5 min?" body="Copia el informe y mándalo a soporte.">
        <button type="button" class="cloud-sync-btn" data-cloud-diag-action="copy-report">Copiar informe</button>
      </Step>
    </div>
  );
}

const ToolRow = ({ action, title, body, label, danger }) => (
  <div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-tool">
    <span class="cloud-sync-options-entry-text">
      <span class="cloud-nube-dash-tool-title">{title}</span>
      <span class="cloud-sync-status-display">{body}</span>
    </span>
    <button type="button" class={'cloud-sync-btn' + (danger ? ' cloud-sync-btn--danger' : '')} data-cloud-diag-action={action}>{label}</button>
  </div>
);

function Tools({ v }) {
  const labs = Number(v.labsQueued) || 0;
  return (
    <div class="cloud-sync-inset-group cloud-nube-dash-card cloud-nube-dash-tools">
      <div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-card-head">
        <span class="cloud-nube-dash-label">Herramientas de reparación</span>
      </div>
      <ToolRow action="sync" title="Forzar sync" body="Descarga y envía todo otra vez." label="Forzar" />
      <ToolRow action="repair-team-salas" title="Reenviar censo a salas de equipo" body="Úsalo si un compañero no ve a un paciente." label="Reenviar" />
      {labs ? (
        <ToolRow action="prune-labs" title="Descartar labs en espera" body={'Borra ' + labs + (labs === 1 ? ' lab' : ' labs') + ' sin enviar. No se puede deshacer.'} label="Descartar…" danger />
      ) : null}
      <div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-tech">{v.techLine || ''}</div>
    </div>
  );
}

export function NubeDashboard({ view }) {
  const v = view && typeof view === 'object' ? view : {};
  const verdict = v.verdict || { level: 'ok', headline: '—', subline: '' };
  return (
    <div class="cloud-nube-dashboard" data-level={verdict.level}>
      <Hero verdict={verdict} chain={v.chain || []} />
      <Waiting v={v} />
      <Steps verdict={verdict} />
      <Alerts issues={v.issues} recentErrors={v.recentErrors} />
      <Tools v={v} />
    </div>
  );
}

export const drawNubeDashboard = (panel, view) => mount(panel, <NubeDashboard view={view} />);
