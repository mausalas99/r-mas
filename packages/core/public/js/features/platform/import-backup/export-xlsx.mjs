/** Excel export of all patient data, one sheet per table. For reading and analysis. */
import { persistClinicalState, getVpoByPatient } from '../../../app-state.mjs';
import { formatDateSlug, downloadBlob } from '../shared.mjs';
import { addAuditEntry } from '../audit.mjs';
import { getPlatformRuntime } from '../runtime.mjs';
import { buildFullBackupPayload } from './backup-payload.mjs';
import { buildPatientSheets } from './patient-tables.mjs';
import { buildWorkbook } from './xlsx-workbook.mjs';

const rt = getPlatformRuntime();

async function exportPatientDataXlsx() {
  await persistClinicalState({ immediate: true });
  const data = buildFullBackupPayload().data;
  data.vpoByPatient = getVpoByPatient();
  const sheets = buildPatientSheets(data);
  if (!sheets.length) {
    rt.showToast('No hay datos de pacientes para exportar.', 'error');
    return;
  }
  const bytes = await buildWorkbook(sheets);
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, 'rplus-' + formatDateSlug(new Date()) + '-pacientes.xlsx');
  addAuditEntry('xlsx-export', 'ok', sheets.length, sheets.map((s) => s.name).join(','));
  rt.showToast('Excel descargado (' + sheets.length + ' hojas)', 'success');
}

export { exportPatientDataXlsx };
