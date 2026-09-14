/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_836 = [
  {
    title: 'Nuevo — Internos vuelve, con código QR por sala',
    body:
      'El celular se conecta a la sala con un <strong>QR cifrado de extremo a extremo</strong> — el servidor nunca ve los datos del paciente.',
  },
  {
    title: 'Nuevo — Modo Guardia rediseñado',
    body:
      'Tarjetas por paciente, sala declarada al iniciar el turno, y marcadores de esfuerzo terapéutico, pronóstico de la noche y nota corta.',
  },
  {
    title: 'Mejorado — sincronización más resistente',
    body:
      'La Nube resiste mejor una reconexión tras una caída, y el chip de estado ahora muestra <strong>cuántos cambios faltan por enviar</strong>.',
  },
  {
    title: 'Arreglado — eliminar paciente en Red',
    body: 'Eliminar un paciente desde Administración → Red ya no se siente lento.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_836;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.3.6': RELEASE_NOTES_836,
};
