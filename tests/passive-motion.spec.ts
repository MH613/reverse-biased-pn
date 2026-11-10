import { test, expect } from "@playwright/test";
import { project } from "../src/components/isometric";
import { sourcePorts } from "../src/components/VoltageSource";

test("continuous graph sweep keeps physical values fixed and honors pause and reduced motion", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore the junction", exact: true })
    .click();
  await page.getByRole("button", { name: "Skip to end of animation" }).click();
  const panel = page.locator(".lesson-dashboard");
  const before = await panel.getAttribute("data-width");
  const trace = await page
    .locator('[data-profile="field"] .profile-line')
    .getAttribute("d");
  const scan = page.locator(".graph-sweep .scope-sweep").first();
  const at = () => scan.evaluate((el) => getComputedStyle(el).transform);
  const first = await at();
  await expect.poll(at).not.toBe(first);
  const timing = await scan.evaluate((el) =>
    el.getAnimations()[0].effect!.getTiming(),
  );
  expect(timing.iterations).toBe(Infinity);
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  const paused = await at();
  await page.waitForTimeout(180);
  expect(await at()).toBe(paused);
  expect(await panel.getAttribute("data-width")).toBe(before);
  expect(
    await page
      .locator('[data-profile="field"] .profile-line')
      .getAttribute("d"),
  ).toBe(trace);
  await page
    .getByRole("button", { name: "Play animation", exact: true })
    .click();
  await expect.poll(at).not.toBe(paused);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".graph-sweep")).toHaveCount(0);
});

test("stage 2 and 4 wires draw from supply to junction, replay, and settle immediately with reduced motion", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore the junction", exact: true })
    .click();
  const offset = () =>
    page
      .locator(".circuit-wire")
      .first()
      .evaluate((el) => Number(el.getAttribute("stroke-dashoffset")));
  for (const previous of [0, 2]) {
    await page.locator(".stage-track button").nth(previous).click();
    await page
      .getByRole("button", { name: "Skip to end of animation" })
      .click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect.poll(offset).toBeGreaterThan(0.1);
    for (const [i, port] of [sourcePorts.p, sourcePorts.n].entries()) {
      const point = await page
        .locator(".circuit-wire")
        .nth(i)
        .evaluate((el) => {
          const a = (el as SVGPathElement).getPointAtLength(0);
          return [a.x, a.y];
        });
      const target = project(...port);
      expect(point[0]).toBeCloseTo(target[0], 4);
      expect(point[1]).toBeCloseTo(target[1], 4);
    }
    const start = await offset();
    await expect.poll(offset).toBeLessThan(start);
    await expect.poll(offset).toBe(0);
    await page.getByRole("button", { name: "Replay stage animation" }).click();
    await expect.poll(offset).toBeGreaterThan(0.1);
    await page
      .getByRole("button", { name: "Skip to end of animation" })
      .click();
    await expect.poll(offset).toBe(0);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator(".stage-track button").nth(0).click();
  await page.locator(".stage-track button").nth(1).click();
  expect(await offset()).toBe(0);
});

test("graded expressions keep title-size semibold terms at wide and mobile widths", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [width, height] of [
    [1536, 680],
    [1920, 1080],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page
      .getByRole("button", { name: "Explore the junction", exact: true })
      .click();
    await page.locator(".stage-track button").nth(3).click();
    const styles = await page.evaluate(() => {
      const heading = getComputedStyle(document.querySelector("h1")!),
        equation = getComputedStyle(document.querySelector(".full-equations")!),
        fraction = getComputedStyle(document.querySelector(".math-fraction")!);
      return {
        heading: heading.fontSize,
        equation: equation.fontSize,
        fraction: fraction.fontSize,
        weight: equation.fontWeight,
      };
    });
    expect(styles.equation).toBe(styles.heading);
    expect(styles.fraction).toBe(styles.heading);
    expect(Number(styles.weight)).toBeGreaterThanOrEqual(600);
  }
});
