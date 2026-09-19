/**
 * Botón "Subir foto de lab": abre el selector de archivo (main process),
 * corre OCR local (sin nube) y pasa las filas reconocidas a la revisión.
 */
import { rt } from './lab-panel-runtime-state.mjs';
import { parseOcrLabText } from '../labs-photo-parse.mjs';
import { openLabPhotoReviewModal } from './lab-photo-review-modal.mjs';

var CONFIDENCE_THRESHOLD = 40;

function getActiveId() {
  return typeof rt.getActiveId === 'function' ? rt.getActiveId() : null;
}

export async function openLabPhotoImport() {
  var patientId = getActiveId();
  if (!patientId) {
    rt.showToast('Selecciona un paciente para subir una foto de lab', 'error');
    return;
  }
  if (!window.electronAPI || typeof window.electronAPI.ocrLabPhoto !== 'function') {
    rt.showToast('Función solo disponible en la app de escritorio', 'warn');
    return;
  }

  rt.showToast('Leyendo imagen…', 'info');
  var result;
  try {
    result = await window.electronAPI.ocrLabPhoto();
  } catch (_err) {
    rt.showToast('No se pudo leer la imagen. Intenta de nuevo.', 'error');
    return;
  }

  if (!result || result.canceled) return;
  if (!result.ok) {
    rt.showToast(result.error || 'No se pudo leer la imagen. Intenta de nuevo.', 'error');
    return;
  }
  if (typeof result.confidence === 'number' && result.confidence < CONFIDENCE_THRESHOLD) {
    rt.showToast(
      'No se pudo leer la imagen con claridad. Intenta con una foto más nítida o mejor iluminada.',
      'error'
    );
    return;
  }

  var rows = parseOcrLabText(result.text);
  if (!rows.length) {
    rt.showToast('No se reconocieron estudios de laboratorio en la imagen.', 'error');
    return;
  }

  openLabPhotoReviewModal(rows, { fileName: result.fileName || '', rawText: result.text || '' });
}

export var windowHandlers = {
  openLabPhotoImport: openLabPhotoImport,
};
