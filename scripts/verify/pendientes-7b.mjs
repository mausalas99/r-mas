import { gotoPendientes, openNuevoPendienteModal } from './pendientes-10a.mjs';

export default async function (page) {
  await gotoPendientes(page);
  const opened = await openNuevoPendienteModal(page);
  console.log('modal opened', opened);
}
