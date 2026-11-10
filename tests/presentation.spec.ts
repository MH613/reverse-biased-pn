import { test, expect } from "@playwright/test";
import { solveLesson, LESSON_SCALE } from "../src/physics/lesson";
const titles = [
  "The equilibrium junction",
  "Reverse bias",
  "When reverse bias reaches its limit",
  "A linearly graded junction",
];

test("four-stage scientific narrative synchronizes graphs, geometry, bands and controls", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Effect of Reverse Bias");
  const scene = await page.locator(".scene-camera").elementHandle();
  await page
    .getByRole("button", { name: "Explore the junction", exact: true })
    .click();
  await expect(page.locator("h1")).toHaveText(titles[0]);
  await expect(page.locator("[data-profile]")).toHaveCount(2);
  await page.getByRole("button", { name: "Inspect P-type holes" }).click();
  await expect(page.locator(".inspection")).toContainText(
    "mobile positive charges",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator("h1")).toHaveText(titles[1]);
  const panel = page.locator(".lesson-dashboard");
  const charge = page.locator('[data-profile="charge"] .profile-line');
  const field = page.locator('[data-profile="field"] .profile-line');
  const bands = page.locator('[data-profile="bands"] .profile-line').first();
  for (const v of [0, 2, 5, 10]) {
    await page.getByRole("slider").fill(String(v));
    await expect
      .poll(async () => Number(await panel.getAttribute("data-voltage")))
      .toBe(v);
    const s = solveLesson("abrupt", v);
    expect(
      Number(await panel.getAttribute("data-width")) / s.widthM,
    ).toBeCloseTo(1, 10);
    expect(
      Number(await panel.getAttribute("data-field")) / s.peakFieldVM,
    ).toBeCloseTo(1, 10);
    await expect(page.locator("output")).toHaveText(`${v.toFixed(2)} V`);
    await expect(charge).toHaveAttribute("d", /.+/);
    await expect(field).toHaveAttribute("d", /.+/);
    await expect(bands).toHaveAttribute("d", /.+/);
    const points = (await page
      .locator(".depletion-surface")
      .getAttribute("points"))!
      .split(/[ ,]/)
      .map(Number);
    expect(points[2] - points[0]).toBeCloseTo(
      s.widthM * LESSON_SCALE * 0.96,
      6,
    );
  }
  // Every intermediate frame follows the physical equations, including rapid requests.
  await page.getByRole("slider").fill("2");
  const frames = await panel.evaluate(async (el) => {
    const frames: number[][] = [];
    for (let i = 0; i < 12; i++) {
      await new Promise(requestAnimationFrame);
      frames.push(
        ["data-voltage", "data-width", "data-field"].map((k) =>
          Number(el.getAttribute(k)),
        ),
      );
    }
    return frames;
  });
  expect(frames.some(([v]) => v > 2 && v < 10)).toBe(true);
  for (const [v, w, e] of frames) {
    const s = solveLesson("abrupt", v);
    expect(w / s.widthM).toBeCloseTo(1, 10);
    expect(e / s.peakFieldVM).toBeCloseTo(1, 10);
  }
  await page.getByRole("button", { name: "Forward bias", exact: true }).click();
  await expect
    .poll(async () => Number(await panel.getAttribute("data-voltage")))
    .toBe(-0.4);
  await expect(page.locator(".source-readout")).toHaveText("+0.40 V");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator("h1")).toHaveText(titles[2]);
  await page
    .getByRole("button", { name: "Zener tunneling", exact: true })
    .click();
  await expect(page.locator(".breakdown-card h2")).toHaveText(
    "Band-to-band tunneling",
  );
  await expect(page.locator(".junction-illustration")).toHaveClass(
    /breakdown-zener/,
  );
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator("h1")).toHaveText(titles[3]);
  await page.getByRole("slider").fill("5");
  await expect
    .poll(async () => Number(await panel.getAttribute("data-voltage")))
    .toBe(5);
  expect(
    Number(await panel.getAttribute("data-width")) /
      solveLesson("graded", 5).widthM,
  ).toBeCloseTo(1, 10);
  await expect(page.locator('[data-profile="potential"]')).toBeVisible();
  await page.getByLabel("Equilibrium reference", { exact: true }).check();
  await expect(page.locator(".profile-reference")).toHaveCount(3);
  await page.getByRole("button", { name: "Define a", exact: true }).focus();
  await expect(
    page.getByRole("tooltip").filter({ hasText: "Gradient of net doping" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Model & sources" }).click();
  await expect(page.getByLabel("Model assumptions and sources")).toContainText(
    "263–264",
  );
  await page.getByRole("button", { name: "Close model details" }).click();
  await page.getByRole("button", { name: "Back to overview" }).click();
  expect(await scene!.evaluate((el) => el.isConnected)).toBe(true);
  expect(errors).toEqual([]);
});

test("layouts retain neutral chrome, muted scientific accents, and reduced-motion support", async ({
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
    await page
      .getByRole("button", { name: "Explore the junction", exact: true })
      .click();
    for (let i = 0; i < 4; i++) {
      await page.locator(".stage-track button").nth(i).click();
      await expect(page.locator("h1")).toHaveText(titles[i]);
      expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);
      const bounds = await page.evaluate(() => {
        const r = (s: string) =>
          document.querySelector(s)!.getBoundingClientRect();
        const profiles = [
          ...document.querySelectorAll(".profile-card,.mechanism-note"),
        ].map((el) => el.getBoundingClientRect());
        return {
          copy: r(".lesson-copy"),
          graphs: r(".lesson-dashboard"),
          cards: profiles.map((r) => ({
            top: r.top,
            bottom: r.bottom,
            left: r.left,
            right: r.right,
          })),
          footer: r(".footer").top,
          body: document.body.scrollHeight,
        };
      });
      if (width < 1440)
        expect(bounds.copy.bottom).toBeLessThanOrEqual(bounds.graphs.top);
      for (const card of bounds.cards)
        expect(card.bottom).toBeLessThanOrEqual(bounds.footer);
      if (width >= 1920 && height >= 1080)
        expect(bounds.body).toBeLessThanOrEqual(height);
    }
  }
  const colors = await page.locator(".app-shell *").evaluateAll((els) =>
    els
      .filter(
        (el) =>
          !el.closest(
            ".junction-illustration,.profile-card,.avalanche-cascade",
          ),
      )
      .flatMap((el) => {
        const s = getComputedStyle(el);
        return [s.color, s.backgroundColor, s.fill, s.stroke];
      })
      .filter((c) => c.startsWith("rgb")),
  );
  const palette = await page.evaluate(() => {
    const channels = (value: string) =>
      value
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number);
    const p = document.querySelector('[data-region="p"]')!,
      n = document.querySelector('[data-region="n"]')!,
      trace = document.querySelector(".profile-line")!,
      card = document.querySelector(".profile-card")!;
    return {
      p: channels(getComputedStyle(p).fill),
      n: channels(getComputedStyle(n).fill),
      trace: channels(getComputedStyle(trace).stroke),
      radius: getComputedStyle(card).borderRadius,
    };
  });
  expect(palette.p[0]).toBeGreaterThan(palette.p[2]);
  expect(palette.n[2]).toBeGreaterThan(palette.n[0]);
  expect(palette.trace[0]).toBeGreaterThan(palette.trace[1]);
  expect(palette.trace[2]).toBeGreaterThan(palette.trace[0]);
  expect(palette.radius).toBe("0px");
  for (const c of colors) {
    const rgb = c
      .match(/[\d.]+/g)!
      .slice(0, 3)
      .map(Number);
    expect(rgb[0]).toBe(rgb[1]);
    expect(rgb[1]).toBe(rgb[2]);
  }
});
