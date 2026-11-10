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

/** Fresh render each time (null first), like the old `innerHTML` swap. */
export function drawNoteForm(host, props) {
  render(null, host);
  render(<NoteForm {...props} />, host);
}
export function drawIndicaForm(host, props) {
  render(null, host);
  render(<IndicaForm {...props} />, host);
}
export { NoteForm, IndicaForm };
