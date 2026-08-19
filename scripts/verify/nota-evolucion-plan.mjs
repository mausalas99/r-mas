import { gotoNotaEvolucion, scrollNotaPlanIntoView } from './nota-evolucion.mjs';

export default async function (page) {
  await gotoNotaEvolucion(page);
  await scrollNotaPlanIntoView(page);
}
