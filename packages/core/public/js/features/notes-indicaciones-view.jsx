/**
 * «Nota de evolución» and «Indicaciones» forms. Preact (Phase 3): same DOM, classes and data-* hooks the
 * string builders in notes-indicaciones.mjs made. UI only: the .mjs keeps the data rules and the
 * data-oninput / data-onclick handlers (delegated by name). Typing never redraws: the forms redraw only
 * on add/remove/export, and each draw unmounts first so the DOM is rebuilt like the old `innerHTML` swap.
 */
import { render } from 'preact';

const jsonArgs = (...a) => JSON.stringify(a);
const HIDDEN = { style: 'visibility:hidden' };
const VITALS = [['ta', 'T.A.', 'mmHg'], ['fr', 'F.R.', 'rpm'], ['fc', 'F.C.', 'lpm'], ['temp', 'Temp', '°C'], ['peso', 'Peso', 'kg']];
const SECTIONS = [
  { key: 'dieta', label: 'Dieta', placeholder: 'Escriba la dieta (una indicación por línea si aplica)…', area: 'die' },
  { key: 'cuidados', label: 'Cuidados', placeholder: 'Signos vitales, balance, dispositivos, etc.…', area: 'cui' },
  { key: 'estudios', label: 'Estudios', placeholder: 'BH, QS, EGO, imágenes…', area: 'est' },
  { key: 'medicamentos', label: 'Medicamentos', placeholder: 'Fármaco, dosis, vía y horario…', area: 'med' },
  { key: 'interconsultas', label: 'Interconsultas', placeholder: 'Servicio y motivo de interconsulta…', area: 'int' },
];
const v = (x) => (x == null ? '' : String(x));

function PastDocsButton({ kind, count }) {
  return (
    <button
      type="button"
      class="wb-btn wb-btn-ghost"
      data-onclick="openPastDocs"
      data-onclick-args={jsonArgs(kind)}
      {...(count ? {} : { disabled: true, title: 'Se guarda una copia cada vez que imprimes o generas el documento' })}
    >{`Anteriores (${count})`}</button>
  );
}

function Field({ type = 'text', value, placeholder, handler, args, ...rest }) {
  return (
    <input type={type} value={v(value)} placeholder={placeholder} data-oninput={handler} data-oninput-args={args} data-oninput-pass="value" {...rest} />
  );
}

function Area({ value, placeholder, handler, args, rows }) {
  return (
    <textarea rows={rows} placeholder={placeholder} data-oninput={handler} data-oninput-args={args} data-oninput-pass="value">{v(value)}</textarea>
  );
}

function NoteForm({ note, dxs, txs, pastCount }) {
  return (
    <div class="fit-screen">
      <div class="fit-head">
        <span class="fit-title">Nota de evolución</span>
        <label class="fit-inline">Fecha<Field value={note.fecha} handler="updateNote" args={jsonArgs('fecha')} placeholder="DD/MM/AAAA" /></label>
        <label class="fit-inline fit-inline--short">Hora<Field value={note.hora} handler="updateNote" args={jsonArgs('hora')} placeholder="HH:MM" /></label>
        <span class="fit-spacer"></span>
        <PastDocsButton kind="nota" count={pastCount} />
        <button type="button" class="wb-btn wb-btn-ghost" data-onclick="estadoActualEnviarANota" title="Llena Evolución y Signos vitales con el Estado actual">Traer de estado actual</button>
        <button type="button" class="wb-btn wb-btn-ghost rpc-doc-export" data-onclick="quickExportCurrentPatient" id="btn-quick-export-note">Salida rápida</button>
        <button type="button" class="wb-btn wb-btn-primary rpc-doc-export" data-onclick="previewNota" id="btn-gen">Generar nota</button>
      </div>
      <div class="fit-grid nota-fit-grid">
        <section class="fit-block" style="grid-area:s"><h4>Interrogatorio, exploración y estado mental</h4>
          <Area value={note.interrogatorio} placeholder="Refiere / niega…" handler="updateNote" args={jsonArgs('interrogatorio')} /></section>
        <section class="fit-block" style="grid-area:o"><h4>Evolución · N / V / HD / HI / NM</h4>
          <Area value={note.evolucion} placeholder="Estructura N / V / HD / HI / NM. Edita los formatos en Mi Perfil." handler="updateNote" args={jsonArgs('evolucion')} /></section>
        <section class="fit-block" style="grid-area:lab"><h4>Estudios auxiliares</h4>
          <Area value={note.estudios} placeholder="Fecha, luego un estudio por renglón" handler="updateNote" args={jsonArgs('estudios')} /></section>
        <section class="fit-block" style="grid-area:dx"><h4>Diagnósticos<button type="button" class="wb-btn wb-btn-ghost wb-btn-sm" data-onclick="syncNoteDxFromCenso" title="Traer los diagnósticos del censo a la nota">Desde censo</button></h4>
          <div class="fit-list list-rows" id="dx-list">
            {dxs.map((dx, i) => (
              <div class="list-row">
                <Field value={dx} placeholder={`Diagnóstico ${i + 1}`} handler="updateDx" args={`[${i}]`} style="text-transform:uppercase;" />
                <button class="btn-remove" data-onclick="removeDx" data-onclick-args={`[${i}]`} {...(dxs.length <= 1 ? HIDDEN : {})} aria-label="Eliminar">×</button>
              </div>
            ))}
            <button class="btn-add-row" data-onclick="addDx">+ Agregar diagnóstico</button>
          </div></section>
        <section class="fit-block" style="grid-area:tx"><h4>Tratamiento e indicaciones</h4>
          <div class="fit-list list-rows" id="tx-list">
            {txs.map((tx, i) => (
              <div class="list-row">
                <span class="list-num">{`${i + 1}.`}</span>
                <Field value={tx} placeholder="Indicación, dosis, vía y periodicidad" handler="updateTx" args={`[${i}]`} />
                <button class="btn-remove" data-onclick="removeTx" data-onclick-args={`[${i}]`} {...(txs.length <= 1 ? HIDDEN : {})} aria-label="Eliminar">×</button>
              </div>
            ))}
            <button class="btn-add-row" data-onclick="addTx">+ Agregar indicación</button>
          </div></section>
        <div class="fit-stack" style="grid-area:side">
          <section class="fit-block"><h4>Signos vitales</h4><div class="fit-vitals">
            {VITALS.map((s) => <label>{s[1]}<Field value={note[s[0]]} placeholder={s[2]} handler="updateNote" args={jsonArgs(s[0])} /></label>)}
          </div></section>
          <section class="fit-block"><h4>Firma</h4><div class="fit-pair">
            <label>Médico tratante<Field value={note.medico} placeholder="Nombre completo" handler="updateNote" args={jsonArgs('medico')} /></label>
            <label>Profesor responsable<Field value={note.profesor} placeholder="Nombre completo" handler="updateNote" args={jsonArgs('profesor')} /></label>
          </div></section>
        </div>
      </div>
    </div>
  );
}

function ExtraTemplates({ templates }) {
  const predBtn = <button type="button" class="wb-btn wb-btn-ghost" data-onclick="openIndicaFormatsFromProfile" title="Formatos en blanco. Plantillas guardadas: Ajustes → Plantillas.">Predeterminados…</button>;
  if (!templates.length) return predBtn;
  return (
    <div class="indica-extra-tmpl">
      {predBtn}
      <select id="indica-extra-tmpl-select" aria-label="Seleccionar plantilla guardada">
        <option value="">— Aplicar plantilla guardada —</option>
        {templates.map((t) => <option value={v(t.id)}>{t.label || '(sin nombre)'}</option>)}
      </select>
      <button type="button" class="wb-btn wb-btn-secondary" data-onclick="applyExtraTemplateFromIndica">Aplicar</button>
    </div>
  );
}

function IndicaForm({ ind, templates, pastCount }) {
  const otros = ind.otros || [];
  return (
    <div class="fit-screen">
      <div class="fit-head">
        <span class="fit-title">Indicaciones</span>
        <label class="fit-inline">Fecha<Field value={ind.fecha} placeholder="DD/MM/AAAA" handler="updateIndica" args={jsonArgs('fecha')} /></label>
        <label class="fit-inline fit-inline--short">Hora<Field value={ind.hora} placeholder="HH:MM" handler="updateIndica" args={jsonArgs('hora')} /></label>
        <label class="fit-inline fit-inline--grow">Médicos<Area rows="3" value={ind.medicos} placeholder="Grado y nombre" handler="updateIndica" args={jsonArgs('medicos')} /></label>
        <ExtraTemplates templates={templates} />
        <PastDocsButton kind="indica" count={pastCount} />
        <button type="button" class="wb-btn wb-btn-secondary rpc-doc-export" data-onclick="quickExportCurrentPatient" id="btn-quick-export-indica">Salida rápida</button>
        <button type="button" class="wb-btn wb-btn-primary rpc-doc-export" data-onclick="previewIndicaciones" id="btn-gen-ind">Generar Indicaciones</button>
      </div>
      <div class="fit-grid indica-fit-grid">
        {SECTIONS.map((s) => (
          <section class="fit-block" style={`grid-area:${s.area}`}><h4>{s.label}</h4>
            <Area value={ind[s.key]} placeholder={s.placeholder} handler="updateIndica" args={jsonArgs(s.key)} /></section>
        ))}
        <section class="fit-block" style="grid-area:otr"><h4>Otros<button type="button" class="wb-btn wb-btn-ghost wb-btn-sm" data-onclick="addOtro">+ Agregar sección</button></h4>
          <div class="fit-list" id="otros-list">
            {otros.length
              ? otros.map((o, i) => (
                <div class="otros-item">
                  <button class="btn-remove-otro" data-onclick="removeOtro" data-onclick-args={`[${i}]`} aria-label="Quitar sección">×</button>
                  <Field value={o.titulo} placeholder="TÍTULO DE LA SECCIÓN" handler="updateOtro" args={jsonArgs(i, 'titulo')} />
                  <Area rows="2" value={o.contenido} placeholder="Indicaciones..." handler="updateOtro" args={jsonArgs(i, 'contenido')} />
                </div>
              ))
              : <p class="fit-empty">Sin secciones extra.</p>}
          </div></section>
      </div>
    </div>
  );
}

// ── Formatos por defecto (editor dentro de las pestañas Nota / Indicaciones) ──
const INDICA_DEFAULTS = [
  { key: 'dieta', label: 'Dieta', ph: 'Escriba la dieta…', from: 'defaultDieta' },
  { key: 'cuidados', label: 'Cuidados', ph: 'Signos vitales, balance…', from: 'defaultCuidados' },
  { key: 'medicamentos', label: 'Medicamentos', ph: 'Fármaco, dosis, vía…', from: 'defaultMedicamentos' },
  { key: 'estudios', label: 'Estudios', ph: 'BH, QS, EGO…', from: 'defaultIndicacionesEstudios' },
  { key: 'interconsultas', label: 'Interconsultas', ph: 'Servicio y motivo…', from: 'defaultIndicacionesInterconsultas' },
];

function EditorBanner({ title, subtitle }) {
  return (
    <div class="formats-defaults-editor-banner" role="status">
      <div class="formats-defaults-editor-banner-text"><strong>{title}</strong><p>{subtitle}</p></div>
      <div class="formats-defaults-editor-actions"><button type="button" class="wb-btn wb-btn-secondary wb-btn-lg" data-onclick="exitFormatsEditor">Volver al expediente</button></div>
    </div>
  );
}

function EditorFooter() {
  return (
    <div class="formats-defaults-editor-footer"><button type="button" class="wb-btn wb-btn-primary wb-btn-lg formats-defaults-save-btn" data-onclick="saveDefaultFormatsFromEditor">Guardar</button></div>
  );
}

function NoteDefaultsEditor({ st }) {
  return (
    <div class="formats-defaults-editor">
      <EditorBanner title="Formatos por defecto · Nota de evolución" subtitle="Misma vista que en el expediente. Estos textos se copian a pacientes nuevos o a secciones vacías." />
      <div class="card"><div class="card-header card-header--tone-green card-header-row"><span>Evolución y actualización del cuadro clínico</span></div>
        <div class="card-body"><div class="field-group">
          <textarea id="fmt-default-nota-evolucion" rows="7" placeholder={'N: [Neurológico]\nV: [Ventilatorio]…'} data-oninput="updateDefaultFormatField" data-oninput-args={jsonArgs('notaEvolucion')} data-oninput-pass="value">{v(st.defaultNotaEvolucion)}</textarea>
        </div></div></div>
      <div class="card"><div class="card-header card-header--tone-indigo"><span>Resultados de estudios auxiliares</span></div>
        <div class="card-body"><div class="field-group">
          <textarea id="fmt-default-nota-estudios" rows="9" placeholder={'FECHA (DD/MM/AA)\nQS\nBH…'} data-oninput="updateDefaultFormatField" data-oninput-args={jsonArgs('notaEstudios')} data-oninput-pass="value">{v(st.defaultNotaEstudios)}</textarea>
        </div></div></div>
      <EditorFooter />
    </div>
  );
}

function IndicaDefaultsEditor({ st }) {
  return (
    <div class="formats-defaults-editor">
      <EditorBanner title="Formatos por defecto · Indicaciones" subtitle="Misma vista que en el expediente. Se aplican al abrir indicaciones vacías de un paciente nuevo." />
      {INDICA_DEFAULTS.map((s) => (
        <div class="indica-section formats-defaults-indica-section">
          <div class="indica-section-header">{s.label}</div>
          <div class="indica-section-body">
            <textarea id={`fmt-default-ind-${s.key}`} rows="3" placeholder={s.ph} data-oninput="updateDefaultFormatField" data-oninput-args={jsonArgs(s.key)} data-oninput-pass="value">{v(st[s.from])}</textarea>
          </div>
        </div>
      ))}
      <EditorFooter />
    </div>
  );
}

// ── Copias anteriores (modal) ──
const PAST_FIELDS = {
  nota: [['interrogatorio', 'Interrogatorio, exploración y estado mental'], ['evolucion', 'Evolución'], ['vitales', 'Signos vitales'], ['estudios', 'Estudios auxiliares'], ['diagnosticos', 'Diagnósticos'], ['tratamiento', 'Tratamiento e indicaciones'], ['medico', 'Médico tratante'], ['profesor', 'Profesor responsable']],
  indica: [['medicos', 'Médicos'], ['dieta', 'Dieta'], ['cuidados', 'Cuidados'], ['estudios', 'Estudios'], ['medicamentos', 'Medicamentos'], ['interconsultas', 'Interconsultas'], ['otros', 'Otros']],
};
const PAST_VITALS = [['ta', 'T.A.'], ['fr', 'F.R.'], ['fc', 'F.C.'], ['temp', 'Temp'], ['peso', 'Peso']];

function pastFieldText(kind, key, snap) {
  if (kind === 'nota' && key === 'vitales') {
    return PAST_VITALS.filter((x) => String(snap[x[0]] || '').trim()).map((x) => x[1] + ' ' + snap[x[0]]).join(' · ');
  }
  const val = snap[key];
  if (key === 'otros') return (val || []).map((o) => [o.titulo, o.contenido].filter(Boolean).join(': ')).join('\n');
  if (Array.isArray(val)) return val.filter((x) => String(x).trim()).map((x, i) => (i + 1) + '. ' + x).join('\n');
  return String(val || '').trim();
}

function PastDocsModal({ kind }) {
  return (
    <div class="soap-modal wb-modal past-docs-modal" role="dialog" aria-modal="true" aria-labelledby="past-docs-title">
      <header class="wb-modal-head"><h3 class="wb-modal-title" id="past-docs-title">{kind === 'nota' ? 'Notas de evolución anteriores' : 'Indicaciones anteriores'}</h3>
        <button type="button" class="wb-btn wb-btn-ghost wb-btn-icon wb-modal-close" data-past-close aria-label="Cerrar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button></header>
      <div class="past-docs-layout"><nav class="past-docs-list"></nav><div class="past-docs-view wb-modal-body"></div></div>
    </div>
  );
}

function PastNav({ list, cur }) {
  return list.map((a, n) => {
    const when = a.fecha || new Date(a.guardada).toLocaleDateString('es-MX');
    return (
      <button type="button" class={n === cur ? 'past-docs-item active' : 'past-docs-item'} data-past-idx={String(n)}>{when}{a.hora ? [' ', <span>{a.hora}</span>] : null}</button>
    );
  });
}

function PastShow({ kind, snap }) {
  const rows = PAST_FIELDS[kind].map((f) => [f, pastFieldText(kind, f[0], snap)]).filter((r) => r[1]);
  return (
    <>
      <div class="past-doc-actions"><button type="button" class="wb-btn wb-btn-secondary" data-past-edit>Editar</button><button type="button" class="wb-btn wb-btn-ghost" data-past-del>Eliminar</button></div>
      {rows.length
        ? rows.map((r) => <div class="past-doc-field"><h4>{r[0][1]}</h4><p>{r[1]}</p></div>)
        : <p class="fit-empty">Copia vacía.</p>}
    </>
  );
}

function PastEditField({ kind, f, snap }) {
  const key = f[0];
  if (kind === 'nota' && key === 'vitales') {
    return (
      <div class="past-doc-field"><h4>{f[1]}</h4><div class="past-doc-vitals">
        {PAST_VITALS.map((x) => <label>{x[1]}<input type="text" data-past-f={x[0]} value={v(snap[x[0]])} /></label>)}
      </div></div>
    );
  }
  if (key === 'otros') {
    return (
      <div class="past-doc-field"><h4>{f[1]}</h4>
        {(snap.otros || []).map((o, i) => [
          <input type="text" data-past-otro-t={String(i)} aria-label="Título" value={v(o.titulo)} placeholder="Título" />,
          <textarea data-past-otro-c={String(i)} aria-label={`${f[1]} ${i + 1}`}>{v(o.contenido)}</textarea>,
        ])}
      </div>
    );
  }
  const val = snap[key];
  return <div class="past-doc-field"><h4>{f[1]}</h4><textarea data-past-f={key} aria-label={f[1]}>{Array.isArray(val) ? val.join('\n') : v(val)}</textarea></div>;
}

function PastEdit({ kind, snap }) {
  return (
    <>
      <div class="past-doc-actions"><button type="button" class="wb-btn wb-btn-primary" data-past-save>Guardar cambios</button><button type="button" class="wb-btn wb-btn-ghost" data-past-cancel>Cancelar</button></div>
      {PAST_FIELDS[kind].map((f) => <PastEditField kind={kind} f={f} snap={snap} />)}
    </>
  );
}

/** Fresh render each time (null first), like the old `innerHTML` swap. */
const fresh = (host, node) => { render(null, host); render(node, host); };
export const drawNoteDefaultsEditor = (host, st) => fresh(host, <NoteDefaultsEditor st={st} />);
export const drawIndicaDefaultsEditor = (host, st) => fresh(host, <IndicaDefaultsEditor st={st} />);
export const drawPastDocsModal = (host, kind) => fresh(host, <PastDocsModal kind={kind} />);
export const drawPastNav = (host, list, cur) => fresh(host, <PastNav list={list} cur={cur} />);
export const drawPastView = (host, kind, snap, editing) => fresh(host, editing ? <PastEdit kind={kind} snap={snap} /> : <PastShow kind={kind} snap={snap} />);

export function drawNoteForm(host, props) {
  render(null, host);
  render(<NoteForm {...props} />, host);
}
export function drawIndicaForm(host, props) {
  render(null, host);
  render(<IndicaForm {...props} />, host);
}
export { NoteForm, IndicaForm, NoteDefaultsEditor, IndicaDefaultsEditor, PastDocsModal, PastNav, PastShow, PastEdit };
