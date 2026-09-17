/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_839 = [
  {
    title: 'Manejo/estado actual ya no se borra en una sincronización parcial',
    body: 'Un payload de Nube sin el campo de manejo o estado actual de un paciente se trataba como si se hubiera vaciado a propósito — podía borrar el de todos los pacientes del censo de golpe. Corregido.',
  },
  {
    title: 'Ediciones del iPad ya llegan a la Mac',
    body: 'El equipo que no creó la sala nunca cargaba la llave de cifrado y aplicaba los datos entrantes en silencio como si vinieran vacíos. La pantalla de un paciente abierto también se actualiza sola cuando llegan datos nuevos de otro equipo.',
  },
  {
    title: 'Conexión en vivo más resistente',
    body: 'La conexión en vivo detecta y reconecta sola cuando queda "zombi" (común en redes celulares). Una edición ya no espera a que termine una descarga grande de laboratorios.',
  },
  {
    title: 'Pacientes recién admitidos ya no se pierden de la Nube',
    body: 'Si la asignación de equipo de un paciente llegaba en un ciclo de red distinto al del paciente mismo, la admisión podía descartarse de la sincronización para siempre. Ya no.',
  },
  {
    title: 'Asignar equipo reintenta si la Nube no responde',
    body: 'Antes, un timeout transitorio de la Nube al asignar un paciente a un equipo perdía esa asignación en silencio para siempre. Ahora reintenta una vez.',
  },
  {
    title: 'Arreglada la animación de Pendientes',
    body: 'Al agregar un pendiente, la fila ya no se armaba dos veces seguidas y borraba su propia animación de entrada. Completar uno ahora muestra un color de éxito breve.',
  },
  {
    title: 'Censo para imprimir entra en una hoja',
    body: 'La vista de impresión del censo ahora se ajusta para caber en una sola página en vez de cortarse en varias.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_839;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.3.9': RELEASE_NOTES_839,
};
