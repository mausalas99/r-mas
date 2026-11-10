/**
 * Ajustes → «Documentos» section body. Preact (Phase 3): same DOM, ids, classes and data-* hooks the static
 * partial had. Every control is UNCONTROLLED: profile-load-fields.mjs fills the folder label and the quick format,
 * profile-prefs.mjs fills the two toggles, profile-load-fields/profile-save read the Censo fields by id,
 * profile-modal.mjs saves on `change` bubbling to the <details>, censo-export.mjs shows/hides the export row
 * through its inline style, profile-load-sync.mjs hides the `data-profile-mode` block. So it is drawn once at boot
 * and never re-rendered. settings-dropdown.mjs still turns the <details> into a panel.
 */
import { render } from 'preact';
import { Button } from '../ui-kit/kit.jsx';

const HINT = 'settings-card__desc settings-acc-hint settings-acc-hint--tight';

function ToggleCard({ title, desc, id, onchange }) {
  return (
    <div class="settings-card settings-card--toggle">
      <div class="settings-card__copy">
        <p class="settings-card__title">{title}</p>
        <p class={HINT}>{desc}</p>
      </div>
      <label class="settings-card__action settings-card__toggle-label" for={id}>
        <input type="checkbox" class="settings-card__toggle" id={id} aria-label={title} data-onchange={onchange} data-onchange-pass="checked" />
      </label>
    </div>
  );
}

export function SettingsDocuments() {
  return (
    <>
      <div class="settings-card-stack">
        <div class="settings-card">
          <div class="settings-card__copy">
            <p class="settings-card__title">Carpeta de salida</p>
            <p class="settings-card__desc settings-acc-path" id="settings-output-dir" title="">Descargas (predeterminado)</p>
          </div>
          <div class="settings-card__action"><Button class="wb-btn-secondary wb-btn-sm" data-onclick="chooseOutputDir">Cambiar…</Button></div>
        </div>
        <div class="settings-card">
          <div class="settings-card__copy">
            <p class="settings-card__title">Salida rápida</p>
            <p class={HINT}>Formato al exportar la nota o indicaciones al instante.</p>
          </div>
          <div class="settings-card__action">
            <select id="settings-quick-output-format" class="settings-acc-select settings-acc-select--compact" data-onchange="saveQuickOutputFormat" data-onchange-pass="value" aria-label="Salida rápida"><option value="docx">DOCX</option><option value="html">HTML</option><option value="txt">Texto</option></select>
          </div>
        </div>
        <ToggleCard title="Ocultar «Copiar prompt IA»" desc="Quita el botón del listado de problemas." id="settings-hide-listado-ai-prompt" onchange="setHideListadoProblemasAiPrompt" />
        <ToggleCard title="Calculadora VPO" desc="Calcula las escalas de riesgo preoperatorio con los datos del paciente." id="settings-vpo-calculator" onchange="setVpoCalculator" />
      </div>
      <div data-profile-mode="sala">
        <p class="settings-section-label">Censo PDF</p>
        <div class="settings-card-stack">
          <div class="settings-card">
            <div class="settings-card__copy"><label class="settings-card__title" for="profile-censo-sala">Sala en el título</label></div>
            <div class="settings-card__action">
              <select class="profile-input profile-select" id="profile-censo-sala">
                <option value="">—</option><option value="1">Sala 1</option><option value="2">Sala 2</option><option value="E">Sala E</option><option value="torre">Torre HU</option>
              </select>
            </div>
          </div>
          <div class="settings-card">
            <div class="settings-card__copy">
              <label class="settings-card__title" for="profile-censo-fimi-label">Etiqueta de ingreso</label>
              <p class={HINT}>Va bajo el título del PDF. FIUX es fijo.</p>
            </div>
            <div class="settings-card__action"><input class="profile-input" id="profile-censo-fimi-label" type="text" placeholder="FIMI" maxlength="24" /></div>
          </div>
          <div class="settings-card" id="btn-export-censo-settings-row" style="display:none;">
            <div class="settings-card__copy">
              <p class="settings-card__title">Exportar censo</p>
              <p class={HINT}><span id="btn-export-censo-settings-hint">Todos los pacientes activos. Incluye pancenso.</span></p>
            </div>
            <div class="settings-card__action">
              <Button class="wb-btn-secondary wb-btn-sm" id="btn-export-censo-settings" data-onclick="closeSettingsDropdown" data-onclick-2="exportCensoPdfFromHelp">Exportar PDF…</Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** Draw the section into the empty #settings-documents-body. Call before settings-dropdown.mjs builds the panels. */
export function mountSettingsDocuments() {
  const host = document.getElementById('settings-documents-body');
  if (host && !host.firstElementChild) render(<SettingsDocuments />, host);
}
