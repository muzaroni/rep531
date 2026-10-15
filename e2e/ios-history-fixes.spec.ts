import { test, expect } from './fixtures';
import { openSettingsGroup } from './settings-navigation';

test('mobile safe-area clearance and Settings animation work without internal rules', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('bbb-overview-active-cycle', 'true'));
  await page.reload();
  await page.addStyleTag({ content: ':root { --safe-area-bottom: 34px; }' });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const card = (await page.getByRole('region', { name: 'Active cycle', exact: true }).boundingBox())!;
  const nav = (await page.getByRole('navigation', { name: 'Main navigation' }).boundingBox())!;
  expect(card.y + card.height).toBeLessThanOrEqual(nav.y - 8);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openSettingsGroup(page, 'appearance');
  const trigger = page.getByRole('button', { name: 'Program & schedule', exact: true });
  const region = page.locator('.settings-group[data-section="program"] .settings-group-content');
  await expect(region).toHaveCSS('height', '0px');
  await trigger.click();
  const sample = await region.evaluate(async element => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const start = element.getBoundingClientRect().height;
    const duration = getComputedStyle(element).transitionDuration;
    const running = element.getAnimations().length;
    await new Promise(resolve => setTimeout(resolve, 260));
    return { start, end: element.getBoundingClientRect().height, duration, running };
  });
  expect(sample.duration).toContain('0.2s');
  expect(sample.running).toBeGreaterThan(0);
  expect(sample.start).toBeLessThan(sample.end);
  for (const section of ['appearance','maxes','program','plates','timers','data','install']) {
    await openSettingsGroup(page, section);
    const borders = await page.locator('.settings-group[data-state="open"] .toggle-row, .settings-group[data-state="open"] .order-row, .settings-group[data-state="open"] .settings-advanced, .settings-group[data-state="open"] .data-delete-section').evaluateAll(elements => elements.map(element => getComputedStyle(element).borderTopWidth));
    expect(borders.every(value => value === '0px')).toBe(true);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openSettingsGroup(page, 'appearance');
  await expect(page.locator('.settings-group[data-section="appearance"] .settings-group-content')).toHaveCSS('transition-duration', '0s');
});

test('history accessory corrections are isolated until saved and retain the completed session', async ({ page }) => {
  await page.goto('./');
  const click = (name: string) => page.getByRole('button', { name, exact: true }).click();
  await click('History'); await click('Add past workout'); await click('Create past workout');
  await page.getByLabel('Complete accessory set 1', { exact: true }).check();
  await click('Mark main & BBB complete'); await click('Save past workout');
  await page.locator('.history-row').first().click();
  await expect(page.getByRole('button', { name: 'Add accessory', exact: true })).toHaveCount(0);
  await click('Edit workout');
  await click('Remove set from Hanging leg raise');
  await click('Add accessory');
  await page.getByLabel('Search accessories').fill('Lat pulldown');
  await click('Add Lat pulldown'); await click('Done');
  await click('Cancel edits');
  await expect(page.getByRole('heading', { name: 'Lat pulldown', exact: true })).toHaveCount(0);
  await click('Edit workout');
  await click('Add accessory'); await page.getByLabel('Search accessories').fill('Lat pulldown');
  await click('Add Lat pulldown'); await click('Done');
  await click('Remove set from Hanging leg raise');
  await click('Add set to Lat pulldown');
  await page.getByLabel('accessory set 5 weight', { exact: true }).fill('40');
  await click('Save changes');
  await expect(page.getByRole('heading', { name: 'Lat pulldown', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Rest timer controls' })).toHaveCount(0);
  await page.reload(); await click('History'); await page.locator('.history-row').first().click();
  await expect(page.getByRole('heading', { name: 'Lat pulldown', exact: true })).toBeVisible();
  await expect(page.getByLabel('accessory set 5 weight', { exact: true })).toHaveValue('40');
  await click('Overview'); await click('Start workout');
  await expect(page.getByRole('heading', { name: 'Lat pulldown', exact: true })).toHaveCount(0);
});
