/**
 * Ajustes → «Respaldos» section body. Preact (Phase 3): same DOM, ids, classes and data-* hooks the static
 * partial had. UI only: every action stays in its owner, wired by `data-onclick` / `data-onchange`.
 * Every control is UNCONTROLLED and drawn once at boot; other modules fill the status text/icon
 * (`syncSettingsStatusCards`), un-hide `#settings-preimport-restore-wrap` and `[data-settings-db-only]`,
 * set the auto-backup selects and enable `#btn-undo-op`.
 * settings-dropdown.mjs still turns the <details> into a panel.
 */
import { render } from 'preact';
import { Button } from '../ui-kit/kit.jsx';

const HINT = 'settings-card__desc settings-acc-hint settings-acc-hint--tight';

function Card({ title, desc, children }) {
  return (
    <div class="settings-card">
      <div class="settings-card__copy">
        <p class="settings-card__title">{title}</p>
        {desc && <p class={HINT}>{desc}</p>}
      </div>
      <div class="settings-card__action">{children}</div>
    </div>
  );
}

const Act = ({ fn, label = 'Exportar…', ...rest }) => (
  <Button class="wb-btn-secondary wb-btn-sm" data-onclick={fn} {...rest}>{label}</Button>
);

const Stack = ({ children }) => <div class="settings-card-stack">{children}</div>;
const Label = ({ children }) => <p class="settings-section-label">{children}</p>;

const SAFE = 'Sin cifrar. Solo en medios seguros.';

export function SettingsBackups() {
  return (
    <>
      <div class="settings-status-card" data-settings-backup-status="">
        <span class="settings-status-icon" data-state="ok" aria-hidden="true"></span>
        <div class="settings-status-text">
          <p class="settings-status-title" data-settings-backup-title="">Respaldos</p>
          <p class="settings-status-sub" data-settings-backup-sub=""></p>
        </div>
        <Button primary class="wb-btn-sm" data-onclick="runAutoBackupNow">Respaldar ahora</Button>
      </div>
      <div id="settings-preimport-restore-wrap" class="settings-preimport-box" style="display:none;">
        <p class="settings-preimport-label">Copia automática antes de importar todo</p>
        <p class="settings-preimport-meta" id="settings-preimport-meta">—</p>
        <Button class="wb-btn-secondary wb-btn-sm" data-onclick="restorePreimportBackupPrompt">Restaurar esa copia…</Button>
      </div>
      <Label>Exportar</Label>
      <Stack>
        <Card title="Todo" desc="Pacientes, notas e indicaciones."><Act fn="exportDataBackup" /></Card>
        <Card title="Paciente actual"><Act fn="exportActivePatientBackup" /></Card>
        <Card title="Varios pacientes" desc="Eliges del censo.">
          <Act fn="closeSettingsDropdown" data-onclick-2="openExportPatientsModal" label="Elegir…" />
        </Card>
        <Card title="Por rango"><Act fn="exportRangeBackupPrompt" /></Card>
      </Stack>
      <Label>Importar</Label>
      <Stack>
        <Card title="Copia completa" desc="Antes se guarda una copia."><Act fn="triggerImportBackup" label="Importar…" /></Card>
        <Card title="Un paciente"><Act fn="triggerImportActivePatientBackup" label="Importar…" /></Card>
        <Card title="Por rango"><Act fn="triggerImportRangeBackup" label="Importar…" /></Card>
      </Stack>
      <Label>Auto-respaldo</Label>
      <Stack>
        <Card title="Frecuencia">
          <select id="auto-backup-frequency" class="settings-acc-select settings-acc-select--compact" data-onchange="updateAutoBackupSettingsFromUi" aria-label="Frecuencia">
            <option value="off">Desactivado</option>
            <option value="daily">Diario</option>
            <option value="weekly">Semanal</option>
          </select>
        </Card>
        <Card title="Retención">
          <select id="auto-backup-retention" class="settings-acc-select settings-acc-select--compact" data-onchange="updateAutoBackupSettingsFromUi" aria-label="Retención">
            <option value="3">3 archivos</option>
            <option value="7">7 archivos</option>
            <option value="14">14 archivos</option>
          </select>
        </Card>
        <Card title="Deshacer última operación" desc="Usa una copia en memoria del momento previo.">
          <Button class="wb-btn-secondary wb-btn-sm" id="btn-undo-op" data-onclick="undoLastOperation" disabled title="Revierte la última operación destructiva (eliminar paciente o importar).">Deshacer</Button>
        </Card>
      </Stack>
      <div data-settings-db-only="" hidden>
        <Label>Copias de la base</Label>
        <Stack>
          <Card title="Copia de la base (.db)" desc={SAFE}><Act fn="exportClinicalDbBackupDb" /></Card>
          <Card title="Copia en texto (JSON)" desc={SAFE}><Act fn="exportClinicalDbBackupJson" /></Card>
        </Stack>
      </div>
      <details class="settings-tools">
        <summary>
          <span class="settings-card__title">Herramientas</span>
          <span class="settings-acc-hint settings-acc-hint--tight">Duplicados de labs, recuperar censo, bitácora, paquete sync, catálogo</span>
        </summary>
        <Stack>
          <Card title="Duplicados en historial de labs" desc="Busca entradas repetidas en todos los pacientes y conserva la más antigua.">
            <Act fn="openLabHistoryDedupeReview" data-onclick-args='["all"]' label="Revisar…" />
          </Card>
          <Card title="Recuperar censo desde base" desc="Lee pacientes guardados aunque la lista esté vacía."><Act fn="exportRecoverCensusRangeJson" /></Card>
          <Card title="Bitácora"><Act fn="exportAuditLog" label="Exportar" /></Card>
          <Card title="Paquete sync" desc="JSON entre equipos, con passphrase opcional.">
            <Act fn="exportSyncBundlePrompt" /> <Act fn="triggerImportSyncBundle" label="Importar…" />
          </Card>
          <Card title="Catálogo de medicamentos" desc="Acentos y palabras clave de SOAP y del perfil farmacoterapéutico. Sin datos de pacientes.">
            <Act fn="exportMedCatalogBundle" /> <Act fn="triggerImportMedCatalog" label="Importar…" />
          </Card>
        </Stack>
      </details>
    </>
  );
}

/** Draw the section into the empty #settings-backups-body. Call before settings-dropdown.mjs builds the panels. */
export function mountSettingsBackups() {
  const host = document.getElementById('settings-backups-body');
  if (host && !host.firstElementChild) render(<SettingsBackups />, host);
}
