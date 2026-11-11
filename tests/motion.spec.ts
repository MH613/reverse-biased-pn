import { test, expect } from "@playwright/test";
import { openImportedLab } from "./imported-helpers";

test("copied bench accepts physical jack-to-jack wiring and inspect interactions", async ({
  page,
}) => {
  const f = await openImportedLab(page);
  await f.getByRole("button", { name: "A tiny one", exact: true }).click();
  await f
    .getByRole("button", { name: "Bring the ammeter", exact: true })
    .click();
  await f.getByRole("button", { name: "Next", exact: true }).click();
  await f.getByRole("button", { name: "Clear cables", exact: true }).click();
  // Zoom out with the original camera control so every jack is visible.
  await f.locator(".bench").hover();
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(350);
  for (const [a, b] of [
    ["supply:+", "ammeter:in"],
    ["ammeter:out", "diode:n"],
    ["diode:p", "supply:-"],
  ]) {
    for (const id of [a, b]) {
      const point = await f
        .locator("body")
        .evaluate(
          (_, id) => (window as any).__present.lab.bench.jackScreen(id),
          id,
        );
      // Coordinates from the teammate renderer are relative to its iframe viewport.
      const box = await page.locator("iframe").boundingBox();
      await page.mouse.click(box!.x + point.x, box!.y + point.y);
    }
  }
  await expect(f.locator('[data-r="supply"]')).toBeEnabled();
  await expect(f.locator('[data-r="i"]')).not.toHaveText("—");
  await f.locator('[data-tool="inspect"]').click();
  const point = await f
    .locator("body")
    .evaluate(() => (window as any).__present.lab.bench.partScreen("supply"));
  const box = await page.locator("iframe").boundingBox();
  await page.mouse.click(box!.x + point.x, box!.y + point.y);
  await expect(f.locator('[data-r="inspect"]')).toContainText("DC supply");
});
