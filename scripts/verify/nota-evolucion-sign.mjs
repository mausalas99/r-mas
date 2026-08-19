import { gotoNotaEvolucion } from './nota-evolucion.mjs';

export default async function (page) {
  await gotoNotaEvolucion(page);
  await page.evaluate(() => {
    document.querySelector('#note-form [data-wb-primary]')?.click();
  });
  await page.waitForTimeout(600);
}
