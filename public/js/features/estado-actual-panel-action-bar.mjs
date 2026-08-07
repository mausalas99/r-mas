import { isModeSala } from '../mode-features.mjs';

/**
 * Botones de la barra de acciones del panel Estado actual.
 * Sala: solo registro manual. Interconsulta: registro + enviar a nota.
 * @param {Record<string, unknown> | null | undefined} settings
 */
export function buildEaActionBarButtons(settings) {
  var html =
    '<button type="button" class="ea-btn" onclick="openEstadoActualRegistroModal()">Registro manual</button>';
  if (!isModeSala(settings)) {
    html +=
      '<button type="button" class="ea-btn ea-btn--success" onclick="estadoActualEnviarANota()">Enviar a nota</button>';
  }
  return html;
}
