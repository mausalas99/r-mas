/**
 * Censo export dialog, Preact. Same markup censo-export.mjs used to write as a string.
 * Static: censo-export.mjs fills the date labels and reads the switches by id.
 */
import { render } from 'preact';

function SwitchRow({ id, label, hint }) {
  const sw = (
    <label class="rpc-switch">
      <input type="checkbox" id={id} class="rpc-switch-input" role="switch" aria-labelledby={`${id}-lbl`} />
      <span class="rpc-switch-track" aria-hidden="true"><span class="rpc-switch-thumb"></span></span>
    </label>
  );
  return hint ? (
    <div class="lab-pref-row">
      <div class="lab-pref-row-copy">
        <span class="lab-pref-row-label" id={`${id}-lbl`}>{label}</span>
        <span class="lab-pref-row-hint">{hint}</span>
      </div>
      {sw}
    </div>
  ) : (
    <div class="lab-pref-row">
      <span class="lab-pref-row-label" id={`${id}-lbl`}>{label}</span>
      {sw}
    </div>
  );
}

export function CensoExportModal() {
  return (
    <div class="modal-backdrop" id="censo-export-modal" aria-hidden="true">
      <div class="modal lab-display-prefs-modal censo-export-dialog" role="dialog" aria-modal="true" aria-labelledby="censo-export-title">
        <h3 id="censo-export-title" class="modal-title">Censo</h3>
        <p class="censo-export-date"><span id="censo-export-fecha-label"></span> · <span id="censo-export-mes-label"></span></p>
        <div class="lab-display-prefs-fields censo-export-options">
          <SwitchRow id="censo-export-archived" label="Incluir archivados" />
          <SwitchRow id="censo-export-pancenso" label="Pancenso" hint="Todos los equipos de la rotación." />
          <SwitchRow id="censo-export-diagramas" label="Labs como diagramas" />
          <SwitchRow id="censo-export-tres-dias" label="Labs 3 días" />
          <SwitchRow id="censo-export-bh-ext" label="BH extendida" />
        </div>
        <p class="censo-export-note">En la vista previa eliges columnas, editas celdas y generas el PDF.</p>
        <div class="modal-actions">
          <button type="button" class="wb-btn wb-btn-secondary" id="censo-export-cancel">Cancelar</button>
          <button type="button" class="wb-btn wb-btn-primary wb-btn-lg" id="censo-export-preview">Vista previa</button>
        </div>
      </div>
    </div>
  );
}

/** The backdrop element, ready to append to the body. */
export function buildCensoModalElement() {
  const host = document.createElement('div');
  render(<CensoExportModal />, host);
  return host.firstElementChild;
}
