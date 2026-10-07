import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('R+ shows the top bar', async ({ browser, screen }) => {
  await browser.goto('app://rplus/index.html');
  await expect(screen.getByText('R+').first()).toBeVisible();
});
