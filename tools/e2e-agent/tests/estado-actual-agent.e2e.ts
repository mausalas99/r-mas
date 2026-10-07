import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
// @ts-expect-error plain .mjs fixture of synthetic labs
import { DEMO_TOUR_LAB_PASTE } from '../../../packages/core/public/js/tour-demo-some-lab.mjs';

test('Estado actual: agent opens it and reads pasted vitals', async ({ browser, agent }) => {
  await browser.goto('app://rplus/index.html');
  await agent.act('choose "Solo este equipo", press "Entrar a R+", and close any help sheet that opens');
  await agent.act('open the Laboratorio area and open the paste box if it is hidden');
  await browser.locator('#lab-input').fill(DEMO_TOUR_LAB_PASTE);
  await agent.act('press Procesar (one patient is added to the census automatically); close any toasts');
  await agent.act('switch to Interconsulta mode, open the Paciente area, open patient DEMO PÉREZ JUAN, and open the "Estado actual" section');
  await agent.assert('the Estado actual panel is open and shows vital-sign fields');
  await agent.act(
    'in the Estado actual paste box, paste this text and read the preview: "T°: 37.2 °C 08:15\\nFC 80\\nTA 120/80\\nSATURACION: 95 %"',
  );
  await agent.assert('the preview shows TEMP 37.2, TA 120/80 and SATURACION 95%');
});
