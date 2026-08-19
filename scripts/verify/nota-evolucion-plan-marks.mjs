import { gotoNotaEvolucion, scrollNotaPlanIntoView } from './nota-evolucion.mjs';

export default async function (page) {
  await gotoNotaEvolucion(page);
  await scrollNotaPlanIntoView(page);

  // Add one plan item per zone, then cycle a couple of them through their
  // marks, so all four mark styles (nuevo/sin cambio/pendiente/suspende)
  // are visible in one screenshot.
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('.ne-plan-add-input'));
    const texts = {
      N: 'Continuar vigilancia neurológica',
      V: 'Mantener O2 para SatO2 >= 92%',
      HD: 'Continuar antihipertensivo actual',
      HI: 'Continuar ceftriaxona, día 3 de 7',
      NM: 'KCl 20 mEq IV y control en 6 h',
    };
    inputs.forEach((input) => {
      const zone = input.getAttribute('data-ne-plan-add');
      const text = texts[zone];
      if (!text) return;
      input.value = text;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
  });
  await page.waitForTimeout(400);
  // Cycle the HD and HI items forward so their marks differ from "nuevo".
  await page.evaluate(() => {
    const cycle = (times, zoneId) => {
      for (let i = 0; i < times; i++) {
        const btn = document.querySelector(`[data-ne-plan-zone="${zoneId}"] [data-ne-plan-cycle]`);
        btn?.click();
      }
    };
    cycle(1, 'HD'); // nuevo -> sin cambio
    cycle(2, 'HI'); // nuevo -> sin cambio -> pendiente
    cycle(3, 'NM'); // nuevo -> sin cambio -> pendiente -> suspende
  });
  await page.waitForTimeout(400);
  await scrollNotaPlanIntoView(page);
}
