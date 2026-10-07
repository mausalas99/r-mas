import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('agent gets through first-run in local-only mode', async ({ browser, agent, screen }) => {
  await browser.goto('app://rplus/index.html');
  await agent.act('choose the "Solo este equipo" option and press "Entrar a R+"');
  await expect(screen.getByText('Paciente').first()).toBeVisible();
});
