import { test, expect } from "@playwright/test";

test("overview keeps title, junction and discovery controls vertically separated at every display size", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [844, 390],
    [1024, 768],
    [1366, 768],
    [1440, 900],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("h1")).toContainText("Effect of Reverse Bias");
    const bounds = await page.evaluate(() => {
      const rect = (selector: string) => {
        const r = document.querySelector(selector)!.getBoundingClientRect();
        return {
          top: r.top,
          bottom: r.bottom,
          left: r.left,
          right: r.right,
          height: r.height,
        };
      };
      return {
        copy: rect(".intro-copy"),
        junction: rect(".substrate"),
        controls: rect(".begin-position"),
        footer: rect(".footer"),
      };
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
