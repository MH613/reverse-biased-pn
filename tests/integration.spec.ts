import { test, expect, type Page } from '@playwright/test';
import { solveJunction } from '../src/physics/model';
import { initialPositions, unproject } from '../src/lab/geometry';

async function connect(page: Page) {
  await page.getByRole('button', { name: 'Wire', exact: true }).click();
  for (const [a, b] of [['Supply +', 'Ammeter IN'], ['Ammeter OUT', 'Junction N'], ['Junction P', 'Supply −']]) {
    for (const name of [a, b]) {
      await page.getByRole('button', { name, exact: true }).focus();
      await page.keyboard.press('Enter');
    }
  }
}

test('overview keeps title, junction and discovery controls vertically separated at every display size', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [width, height] of [[320, 568], [390, 844], [844, 390], [1024, 768], [1366, 768], [1440, 900], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('h1')).toHaveText('The PN junction.');
    const bounds = await page.evaluate(() => {
      const rect = (selector: string) => {
        const r = document.querySelector(selector)!.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height };
      };
      return { copy: rect('.intro-copy'), junction: rect('.substrate'), controls: rect('.begin-position'), footer: rect('.footer') };
    });
    expect(bounds.copy.bottom + 8).toBeLessThan(bounds.junction.top);
    expect(bounds.junction.bottom + 16).toBeLessThan(bounds.controls.top);
    expect(bounds.controls.bottom).toBeLessThan(bounds.footer.top);
    expect(bounds.junction.height).toBeGreaterThan(100);
    expect(bounds.junction.left).toBeGreaterThan(0);
    expect(bounds.junction.right).toBeLessThan(width);
    expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);
  }
});

test('lab opens from every stage, contains keyboard focus, and restores the presentation and live circuit', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore the junction', exact: true }).click();
  for (let i = 0; i < 4; i++) {
    await page.locator('.stage-track button').nth(i).click();
    const title = ['Two sides.', 'An invisible', 'Change the voltage.', 'A wider gap.'][i];
    await expect(page.locator('h1')).toContainText(title);
    if (i === 2) await page.getByRole('button', { name: 'Forward bias', exact: true }).click();
    await page.getByRole('button', { name: 'Laboratory', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    if (i === 0) { await connect(page); await page.getByRole('slider', { name: 'Supply voltage' }).fill('2'); }
    await expect(page.locator('.science-panel')).toHaveAttribute('data-applied-voltage', '2');
    await expect(page.locator('[data-instrument="supply"] .source-readout')).toHaveText('2.00 V');
    const controls = dialog.locator('a[href],button:not(:disabled),input:not(:disabled),summary,[tabindex="0"]').filter({ visible: true });
    await controls.last().focus(); await page.keyboard.press('Tab');
    await expect(controls.first()).toBeFocused();
    await page.keyboard.press('Shift+Tab'); await expect(controls.last()).toBeFocused();
    await page.getByRole('button', { name: 'Back to explanation', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('h1')).toContainText(title);
    await expect(page.locator('.lab-button')).toBeFocused();
    if (i === 2) await expect(page.getByRole('button', { name: 'Forward bias', exact: true })).toHaveAttribute('aria-pressed', 'true');
  }
});

test('rapid voltage requests remain coherent and reset restores equipment, wiring, and equilibrium', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Laboratory', exact: true }).click();
  await connect(page);
  const slider = page.getByRole('slider', { name: 'Supply voltage' });
  await slider.evaluate(async (input) => {
    const control = input as HTMLInputElement;
    for (const v of [10, 2, 8, 0, 5, 10, 2, 5]) {
      control.value = String(v); control.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(requestAnimationFrame);
    }
  });
  await expect(page.locator('.science-panel')).toHaveAttribute('data-applied-voltage', '5');
  expect(Number(await page.locator('.science-panel').getAttribute('data-width-m'))).toBe(solveJunction(5).widthM);
  await page.getByRole('button', { name: 'Move', exact: true }).click();
  await page.getByRole('button', { name: 'Select PN junction', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(260);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await page.getByRole('button', { name: 'Reset circuit', exact: true }).click();
  await expect(page.locator('.lab-wire')).toHaveCount(0);
  await expect(slider).toBeDisabled();
  await expect(page.locator('.science-panel')).toHaveAttribute('data-applied-voltage', '0');
  await expect(page.locator('.lab-shell')).not.toHaveClass(/is-resetting/);
  const layout = await page.locator('[data-instrument]').evaluateAll((els) => els.map(el => ({ id: el.getAttribute('data-instrument')!, values: el.getAttribute('transform')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number) })));
  for (const { id, values } of layout) {
    const p = unproject(values[0], values[1]);
    expect(p.x).toBeCloseTo(initialPositions[id as keyof typeof initialPositions].x, 8);
    expect(p.y).toBeCloseTo(initialPositions[id as keyof typeof initialPositions].y, 8);
  }
  expect(Number(await page.locator('.science-panel').getAttribute('data-width-m'))).toBe(solveJunction(0).widthM);
  await page.getByRole('button', { name: 'Back to explanation', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Laboratory', exact: true }).click();
  await expect(page.locator('.lab-wire')).toHaveCount(0);
  await expect(slider).toBeDisabled();
});
