import { test, expect } from "@playwright/test";

test("close-up overview flows into four working presentation stages", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("h1")).toContainText("A small junction.");
  await expect(
    page.locator(".topic-tags,.phase-tag,.observations,.legend-panel"),
  ).toHaveCount(0);
  const scene = await page.locator(".scene-camera").elementHandle();
  const camera = () =>
    page
      .locator(".scene-camera")
      .evaluate((el) => getComputedStyle(el).transform);
  const closeup = await camera();
  await page
    .getByRole("button", { name: "Explore the junction", exact: true })
    .click();
  await expect(page.locator("h1")).toContainText("Two sides.");
  await page.waitForTimeout(110);
  const between = await camera();
  await page.waitForTimeout(1400);
  const settled = await camera();
  expect(between).not.toBe(closeup);
  expect(between).not.toBe(settled);
  expect(await scene!.evaluate((el) => el.isConnected)).toBe(true);
  await page.getByRole("button", { name: "Inspect P-type holes" }).click();
  await expect(page.locator(".inspection")).toContainText(
    "mobile positive charges",
  );
  await page.getByRole("button", { name: "Close material detail" }).click();
  await page.getByRole("button", { name: "Pause animation" }).click();
  const carriers = () =>
    page
      .locator(".junction-illustration")
      .evaluate((el) =>
        [...el.querySelectorAll("circle")].map((c) => [
          c.getAttribute("cx"),
          c.getAttribute("cy"),
        ]),
      );
  const paused = await carriers();
  await page.waitForTimeout(180);
  expect(await carriers()).toEqual(paused);
  await page.getByRole("button", { name: "Play animation" }).click();
  await page.waitForTimeout(180);
  expect(await carriers()).not.toEqual(paused);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("h1")).toContainText("An invisible");
  await expect(page.locator(".field-profile,.field-position")).toHaveCount(0);
  await page.getByRole("button", { name: "Skip to end of animation" }).click();
  await page.waitForTimeout(150);
  expect(
    await page
      .locator(".stage-track .current .track-fill")
      .getAttribute("style"),
  ).toContain("100%");
  await page.getByRole("button", { name: "Replay stage animation" }).click();
  await page.waitForTimeout(100);
  expect(
    await page
      .locator(".stage-track .current .track-fill")
      .getAttribute("style"),
  ).not.toContain("100%");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator("h1")).toContainText("Change the voltage.");
  await page.getByRole("button", { name: "Forward bias", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Forward bias", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Reverse bias", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Reverse bias", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator("h1")).toContainText("A wider gap.");
  await page.getByRole("slider").fill("0");
  await page.waitForTimeout(1400);
  const profile = page.locator(".depletion-surface");
  const narrow = await profile.getAttribute("points");
  await page.getByRole("slider").fill("5");
  await page.waitForTimeout(1400);
  await expect(page.locator("output")).toHaveText("5.0 V");
  expect(await profile.getAttribute("points")).not.toBe(narrow);
  await expect(page.locator(".source-readout")).toContainText("5.0 V");
  const aligned = await page
    .locator(".junction-illustration")
    .evaluate((svg) => {
      const vectors = [...svg.querySelectorAll(".drafting-ground path")].map(
        (path) => {
          const p = path as SVGPathElement,
            a = p.getPointAtLength(0),
            b = p.getPointAtLength(p.getTotalLength());
          return { x: b.x - a.x, y: b.y - a.y };
        },
      );
      const edges = (coords: number[]) =>
        coords
          .slice(2)
          .filter((_, i) => i % 2 === 0)
          .map((_, i) => ({
            x: coords[(i + 1) * 2] - coords[i * 2],
            y: coords[(i + 1) * 2 + 1] - coords[i * 2 + 1],
          }));
      const parallelToGrid = (d: { x: number; y: number }) =>
        vectors.some(
          (v) =>
            Math.abs(d.x * v.y - d.y * v.x) /
              (Math.hypot(d.x, d.y) * Math.hypot(v.x, v.y)) <
            0.0001,
        );
      const routes = [...svg.querySelectorAll(".circuit-wire")];
      const straight = routes.every((path) => {
        const d = path.getAttribute("d")!;
        return (
          !/[CQSA]/i.test(d) &&
          edges(d.match(/-?\d+(?:\.\d+)?/g)!.map(Number)).every(
            (v) => Math.abs(v.x) < 0.0001 || parallelToGrid(v),
          )
        );
      });
      const top = svg
        .querySelector(".source-top")!
        .getAttribute("points")!
        .match(/-?\d+(?:\.\d+)?/g)!
        .map(Number);
      const connected = routes.every((p, i) => {
        const path = p as SVGPathElement,
          end = path.getPointAtLength(path.getTotalLength());
        const port = svg.querySelector(
          i === 0 ? ".source-port-p" : ".source-port-n",
        ) as SVGCircleElement;
        const matrix = port
          .parentElement!.getAttribute("transform")!
          .match(/-?\d*\.?\d+/g)!
          .map(Number);
        const x = Number(port.getAttribute("cx")),
          y = Number(port.getAttribute("cy"));
        return (
          Math.hypot(
            end.x - (matrix[0] * x + matrix[2] * y + matrix[4]),
            end.y - (matrix[1] * x + matrix[3] * y + matrix[5]),
          ) < 0.01
        );
      });
      return straight && connected && edges(top).every(parallelToGrid);
    });
  expect(aligned).toBe(true);
  await page.getByRole("button", { name: "Laboratory", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Back to explanation", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Enter full screen" }).click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await page.getByRole("button", { name: "Exit full screen" }).click();
  await page.getByRole("button", { name: "Back to overview" }).click();
  await expect(page.locator("h1")).toContainText("A small junction.");
  expect(await scene!.evaluate((el) => el.isConnected)).toBe(true);
  expect(errors).toEqual([]);
});

test("wheel navigation is deliberate and the presentation stays monochrome", async ({
  page,
}) => {
  await page.goto("/");
  await page.mouse.wheel(0, 140);
  await expect(page.locator("h1")).toContainText("Two sides.");
  await page.mouse.wheel(0, 140);
  await page.waitForTimeout(250);
  await expect(page.locator("h1")).toContainText("Two sides.");
  await page.waitForTimeout(1200);
  await page.mouse.wheel(0, 140);
  await expect(page.locator("h1")).toContainText("An invisible");
  const colors = await page.evaluate(() =>
    [...document.querySelectorAll(".app-shell *")]
      .flatMap((el) => {
        const s = getComputedStyle(el);
        return [s.color, s.backgroundColor, s.fill, s.stroke];
      })
      .filter((c) => c.startsWith("rgb")),
  );
  for (const color of colors) {
    const channels = color
      .match(/[\d.]+/g)!
      .slice(0, 3)
      .map(Number);
    expect(channels[0]).toBe(channels[1]);
    expect(channels[1]).toBe(channels[2]);
  }
  expect(
    await page.locator("h1").evaluate((el) => getComputedStyle(el).fontFamily),
  ).toContain("Inter");
});

test("mobile, reduced motion, and desktop/projector layouts", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [width, height] of [
    [390, 844],
    [1366, 768],
    [1440, 900],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const verify = async () => {
      expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);
      expect(
        await page.evaluate(() => document.body.scrollHeight),
      ).toBeLessThanOrEqual(height);
    };
    await verify();
    await page
      .getByRole("button", { name: "Explore the junction", exact: true })
      .click();
    for (let i = 0; i < 4; i++) {
      await page.locator(".stage-track button").nth(i).click();
      await expect(page.locator("h1")).toContainText(
        ["Two sides.", "An invisible", "Change the voltage.", "A wider gap."][
          i
        ],
      );
      await verify();
      const collision = await page.evaluate(() => {
        const copy = document
            .querySelector(".chapter-copy")!
            .getBoundingClientRect(),
          footer = document.querySelector(".footer")!.getBoundingClientRect();
        return copy.bottom > footer.top;
      });
      expect(collision).toBe(false);
    }
    await page.getByRole("slider").fill("3");
    await expect(page.locator("output")).toHaveText("3.0 V");
  }
});
