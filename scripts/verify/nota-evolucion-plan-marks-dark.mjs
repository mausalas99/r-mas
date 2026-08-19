import { gotoNotaEvolucion, scrollNotaPlanIntoView } from './nota-evolucion.mjs';

export default async function (page) {
  await gotoNotaEvolucion(page);
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
  await page.evaluate(() => {
    const cycle = (times, zoneId) => {
      for (let i = 0; i < times; i++) {
        document.querySelector(`[data-ne-plan-zone="${zoneId}"] [data-ne-plan-cycle]`)?.click();
      }
    };
    cycle(1, 'HD');
    cycle(2, 'HI');
    cycle(3, 'NM');
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    if (typeof window.toggleTheme === 'function') window.toggleTheme();
  });
  await page.waitForTimeout(400);
  await scrollNotaPlanIntoView(page);
}
