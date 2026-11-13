/**
 * Listado de problemas form markup. Preact: same DOM, classes and data-* hooks the string builders in
 * expediente-listado.mjs made. That file still owns the data, autosave, Sortable and the click/input
 * handlers (data-onclick / data-oninput delegation), and runs its after-draw steps (date pickers,
 * textarea growth, drag) on the fresh DOM. Every draw replaces the host's contents, so those steps never
 * meet nodes Preact is tracking.
 */
import { render } from 'preact';

// Same blanks as the old esc(): null, undefined and 0 print as nothing.
const s = (v) => String(v || '');
const args = (list) => JSON.stringify(list);

function Row({ seccion, p, idx }) {
  const id = String(p.id);
  return (
    <div class="listado-row" data-id={s(p.id)} data-seccion={seccion}>
      <div class="listado-num listado-drag-handle" title="Arrastra para reordenar" aria-label="Arrastrar para reordenar">{String(idx + 1)}</div>
      <input type="date" class="rpc-date-input" value={s(p.fecha)} data-oninput="updateProblemaField" data-oninput-args={args([seccion, id, 'fecha'])} data-oninput-pass="value" aria-label="Fecha del problema" />
      <textarea rows="1" placeholder="Descripción del problema" data-oninput="updateProblemaField" data-oninput-args={args([seccion, id, 'descripcion'])} data-oninput-pass="value" aria-label="Descripción">{s(p.descripcion)}</textarea>
      <button class="btn-remove-listado" data-onclick="removeProblemaUI" data-onclick-args={args([seccion, id])} aria-label="Quitar problema" title="Quitar">×</button>
    </div>
  );
}

function Seccion({ seccion, label, lst }) {
  const arr = lst[seccion] || [];
  return (
    <div class="listado-group" data-seccion-group={seccion}>
      <div class="listado-group-title">{label + ' (' + arr.length + ')'}</div>
      <div class="listado-group-body listado-sort-zone" data-seccion-rows={seccion}>
        {arr.length
          ? arr.map((p, i) => <Row seccion={seccion} p={p} idx={i} />)
          : <div class="listado-empty">{'Sin problemas ' + label.toLocaleLowerCase('es') + '.'}</div>}
      </div>
      <button type="button" class="listado-add-row listado-link" data-onclick="addProblemaUI" data-onclick-args={args([seccion])}>{'+ Agregar problema ' + label.toLocaleLowerCase('es').replace(/s$/, '')}</button>
    </div>
  );
}

function MedicoField({ k, label, full, medicos }) {
  return (
    <label class={'listado-field-group' + (full ? ' listado-field-group--full' : '')}>{label}
      <input type="text" class="listado-input" value={s(medicos[k])} data-oninput="updateListadoMedico" data-oninput-args={args([k])} data-oninput-pass="value" />
    </label>
  );
}

function MedicosCard({ medicos }) {
  return (
    <div class="listado-meta">
      <div class="listado-meta-title">Médicos (firma)</div>
      <div class="listado-meta-hint">Pre-llena desde Mi Perfil</div>
      <div class="listado-medicos-grid">
        <MedicoField k="profesor" label="Profesor" full medicos={medicos} />
        <MedicoField k="r4" label="R4" medicos={medicos} />
        <MedicoField k="r2" label="R2" medicos={medicos} />
        <MedicoField k="r1a" label="R1 (1)" medicos={medicos} />
        <MedicoField k="r1b" label="R1 (2)" medicos={medicos} />
      </div>
    </div>
  );
}

/**
 * @param {{ patient: object, lst: object, medicos: object, hideAiPrompt: boolean }} props
 *   medicos — already merged with the profile template; hideAiPrompt — the profile preference.
 */
export function ListadoForm({ patient, lst, medicos, hideAiPrompt }) {
  const patientLine = [
    patient.nombre,
    patient.registro ? ('Reg. ' + patient.registro) : '',
    [patient.edad, patient.sexo].filter(Boolean).join('/'),
    (patient.cuarto || patient.cama) ? ('Cto ' + [patient.cuarto, patient.cama].filter(Boolean).join('-')) : '',
  ].filter(Boolean).map(s).join(' · ');
  return (
    <div class="listado-layout">
      <div class="listado-main">
        <Seccion seccion="activos" label="Activos" lst={lst} />
        <Seccion seccion="inactivos" label="Inactivos" lst={lst} />
      </div>
      <div class="listado-side">
        <div class="listado-patient-line">{patientLine}</div>
        <div class="listado-meta">
          <div class="listado-meta-title">Fecha y hora</div>
          <div class="listado-meta-grid-2">
            <input type="text" class="listado-input" value={s(lst.fecha)} placeholder="DD/MM/AAAA" data-oninput="updateListadoMeta" data-oninput-args='["fecha"]' data-oninput-pass="value" aria-label="Fecha del listado" />
            <input type="text" class="listado-input" value={s(lst.hora)} placeholder="HH:MM" data-oninput="updateListadoMeta" data-oninput-args='["hora"]' data-oninput-pass="value" aria-label="Hora del listado" />
          </div>
        </div>
        <MedicosCard medicos={medicos} />
        <div class="listado-actions">
          <button type="button" class="listado-link rpc-doc-export" data-onclick="quickExportCurrentPatient" id="btn-quick-export-listado">Salida rápida</button>
          {!hideAiPrompt && <button type="button" class="listado-link" data-onclick="copyListadoProblemasAiPrompt" title="Copia el prompt para usar en un chat de IA">Copiar prompt IA</button>}
          <button type="button" class="wb-btn wb-btn-primary wb-btn-block rpc-doc-export" data-onclick="previewListado" id="btn-gen-listado">Generar Listado</button>
        </div>
      </div>
    </div>
  );
}

/** Replace the host's contents with the form, or empty it when `props` is null. */
export function drawListadoForm(host, props) {
  render(null, host);
  host.textContent = '';
  if (props) render(<ListadoForm {...props} />, host);
}
