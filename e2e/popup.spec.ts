import { expect, test } from './fixtures';

test('popup renders the launcher', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(page.getByRole('heading', { name: 'BGG Uploader' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open BoardGameGeek' })).toBeVisible();
});
