/**
 * Learn Hub body drawing (overview, resume button, two tracks of module cards, help link). Preact: same
 * DOM, classes and data-learn-* hooks the string builders in settings-help/learn-hub.mjs made. The
 * progress rules, the click delegation and the open/close code stay in that module; it builds the model.
 * Every draw unmounts first, so the DOM is rebuilt from scratch like the old `innerHTML` swap.
 */
import { render } from 'preact';

function Chevron() {
  return (
    <svg class="learn-hub-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
  );
}

function statusLabel({ completed, inProgress, stepInChapter, chapterSteps }) {
  if (completed) return 'Completado';
  if (inProgress && stepInChapter > 0) return `En curso · paso ${stepInChapter} de ${chapterSteps}`;
  if (inProgress) return 'En curso';
  return 'Pendiente';
}

/** Pending shows no pill: the empty state is the default, not news. */
function Pill({ completed, inProgress, stepInChapter, chapterSteps }) {
  if (completed) return <span class="learn-hub-pill learn-hub-pill--done">Hecho</span>;
  if (!inProgress) return null;
  return <span class="learn-hub-pill learn-hub-pill--live">{stepInChapter > 0 ? `Paso ${stepInChapter} de ${chapterSteps}` : 'En curso'}</span>;
}

function ModuleRow(r) {
  const { chapterId, label, branch, completed, inProgress, stepInChapter, chapterSteps, active, moduleIndex = null, allowReset = false } = r;
  const mins = Math.max(1, Math.round(Math.max(1, Number(chapterSteps) || 1) * 0.75));
  const cardCls = ['learn-hub-module-card', active ? 'is-active' : '', completed ? 'is-complete' : '', inProgress ? 'is-in-progress' : '']
    .filter(Boolean).join(' ');
  return (
    <div class={cardCls}>
      <div class="learn-hub-module-row">
        <button type="button" class="learn-hub-module-hit" data-learn-chapter={chapterId} data-learn-branch={branch}
          title={`${label} — ${statusLabel(r)}`}>
          <span class="learn-hub-module-mark" aria-hidden="true">{completed ? '✓' : moduleIndex != null ? String(moduleIndex) : ''}</span>
          <span class="learn-hub-module-main">
            <span class="learn-hub-module-title">{label}</span>
            {chapterSteps > 0 ? <span class="learn-hub-module-meta">{`${chapterSteps} pasos · ~${mins} min`}</span> : null}
          </span>
          <Pill {...r} />
          <Chevron />
        </button>
        {completed && allowReset ? (
          <button type="button" class="learn-hub-module-reset" data-learn-reset={chapterId} data-learn-reset-branch={branch}
            title="Resetear progreso" aria-label={`Resetear ${label}`}>
            <span class="learn-hub-module-reset-icon" aria-hidden="true">↺</span>
          </button>
        ) : null}
      </div>
      {inProgress && !completed && chapterSteps > 0
        ? <progress class="learn-hub-bar learn-hub-bar--card" max={chapterSteps} value={stepInChapter} aria-hidden="true"></progress>
        : null}
    </div>
  );
}

function Track({ title, open, done, total, lead, children }) {
  return (
    <details class="learn-hub-track" open={open}>
      <summary class="learn-hub-track-title">
        <span class="learn-hub-track-name">{title}</span>
        <span class="learn-hub-track-count">{`${done} de ${total}`}</span>
        <progress class="learn-hub-bar learn-hub-bar--track" max={total} value={done} aria-hidden="true"></progress>
        <span class="learn-hub-track-toggle" aria-hidden="true"><Chevron /></span>
      </summary>
      <div class="learn-hub-track-body">
        <p class="learn-hub-section-lead">{lead}</p>
        {children}
      </div>
    </details>
  );
}

function QuickRouteCard({ quick }) {
  return (
    <div class="learn-hub-module-card learn-hub-module-card--cta">
      <button type="button" class="learn-hub-module-hit" data-learn-chapter={quick.chapterId} data-learn-branch="quick-route"
        title="Ruta rápida — mapa, alta, labs y turno">
        <span class="learn-hub-module-mark" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>
        </span>
        <span class="learn-hub-module-main">
          <span class="learn-hub-module-kicker">Recomendado para empezar</span>
          <span class="learn-hub-module-title">{quick.label}</span>
          <span class="learn-hub-module-meta">{`${quick.stepCount} pasos · ~5 min`}</span>
        </span>
        <Chevron />
      </button>
    </div>
  );
}

/**
 * @param {{ overview: {done:number,total:number}, resume: ({title:string,meta:string}|null), quick: object,
 *   novedades: {open:boolean,done:number,total:number,rows:object[]},
 *   fundamentos: {open:boolean,done:number,total:number,groups:{heading:string,rows:object[]}[]} }} props
 */
export function LearnHubBody({ overview, resume, quick, novedades, fundamentos }) {
  const { done, total } = overview;
  const label = done === 0 ? 'Elige un módulo para empezar.' : done >= total ? '¡Completaste todos los módulos!' : 'Sigue a tu ritmo.';
  return (
    <>
      <div class="learn-hub-overview">
        <div class="learn-hub-overview-top">
          <span class="learn-hub-overview-count"><strong>{done}</strong>{` de ${total} módulos`}</span>
          <span class="learn-hub-overview-label">{label}</span>
        </div>
        <progress class="learn-hub-bar" max={total} value={done} aria-label={`Progreso: ${done} de ${total} módulos`}></progress>
      </div>
      {resume ? (
        <button type="button" class="learn-hub-resume" id="learn-hub-btn-continue">
          <span class="learn-hub-resume-text">
            <span class="learn-hub-resume-kicker">Seguir donde quedaste</span>
            <span class="learn-hub-resume-title">{resume.title}</span>
            {resume.meta ? <span class="learn-hub-resume-meta">{resume.meta}</span> : null}
          </span>
          <span class="learn-hub-resume-go">Continuar<Chevron /></span>
        </button>
      ) : null}
      <Track title="Guardia y R+ Cloud" open={novedades.open} done={novedades.done} total={novedades.total}
        lead="Módulos cortos. Haz cualquiera, en cualquier orden.">
        <div class="learn-hub-module-list">
          <QuickRouteCard quick={quick} />
          {novedades.rows.map((r) => <ModuleRow {...r} />)}
        </div>
      </Track>
      <Track title="Fundamentos" open={fundamentos.open} done={fundamentos.done} total={fundamentos.total}
        lead="La base de R+: Paciente, Laboratorio y Manejo. Elige Sala o Interconsulta según tu rol.">
        {fundamentos.groups.map((g) => (
          <>
            <p class="learn-hub-group-label">{g.heading}</p>
            <div class="learn-hub-module-list">{g.rows.map((r) => <ModuleRow {...r} />)}</div>
          </>
        ))}
      </Track>
      <button type="button" class="learn-hub-help-link" id="learn-hub-btn-help">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <span>Buscar en el centro de ayuda</span>
      </button>
    </>
  );
}

export function drawLearnHubBody(host, model) {
  render(null, host);
  host.textContent = '';
  render(<LearnHubBody {...model} />, host);
}
