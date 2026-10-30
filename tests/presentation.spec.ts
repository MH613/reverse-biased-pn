import { test, expect } from "@playwright/test";
test("all stages, animation controls, polarity and shared field state work", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Two materials.",
  );
  await page.getByRole("button", { name: "Inspect P-type holes" }).click();
  await expect(
    page.getByRole("heading", { name: "A hole is an absence." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close carrier detail" }).click();
  await page.getByRole("button", { name: "Pause animation" }).click();
  const carrier = page
    .locator('.junction-illustration circle[fill="#608f82"]')
    .first();
  const before = await carrier.getAttribute("cx");
  await page.waitForTimeout(200);
  expect(await carrier.getAttribute("cx")).toBe(before);
  await page.getByRole("button", { name: "Play animation" }).click();
  await page.waitForTimeout(200);
  expect(await carrier.getAttribute("cx")).not.toBe(before);
  await page.locator("h1").click();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("h1")).toContainText("A field forms.");
  await page.getByRole("button", { name: "Skip to end of animation" }).click();
  await page.waitForTimeout(600);
  expect(
    await page.locator(".stage-track .current span").getAttribute("style"),
  ).toContain("100%");
  await page.getByRole("button", { name: "Replay stage animation" }).click();
  await page.waitForTimeout(100);
  expect(
    await page.locator(".stage-track .current span").getAttribute("style"),
  ).not.toContain("100%");
  await page.getByRole("button", { name: "Next chapter" }).click();
  await expect(page.locator("h1")).toContainText("A little voltage.");
  await page.getByRole("button", { name: "Forward bias", exact: true }).click();
  await expect(page.locator(".polarity")).toContainText("A lower barrier");
  await page.getByRole("button", { name: "Reverse bias", exact: true }).click();
  await expect(page.locator(".polarity")).toContainText("A wider barrier");
  await page.getByRole("button", { name: "Next chapter" }).click();
  const range = page.getByRole("slider");
  await range.fill("0");
  await page.waitForTimeout(1700);
  const profile = page.locator('.field-profile svg path[fill="#edf1e7"]');
  const narrow = await profile.getAttribute("d");
  await range.fill("5");
  await page.waitForTimeout(1700);
  expect(await profile.getAttribute("d")).not.toBe(narrow);
  await expect(page.locator("output")).toHaveText("5.0 V");
  await page.screenshot({ path: "/tmp/junction-stage4.png", fullPage: true });
  await page.getByRole("button", { name: "The laboratory" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Back to the beginning" }).click();
  await expect(page.locator("h1")).toContainText("Two materials.");
  await page.waitForTimeout(700);
  await page.screenshot({ path: "/tmp/junction-desktop.png", fullPage: true });
  expect(await page.evaluate(() => document.body.scrollWidth)).toBe(1440);
  expect(
    await page.evaluate(() => document.body.scrollHeight),
  ).toBeLessThanOrEqual(960);
  await page.getByRole("button", { name: "Enter full screen" }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.getByRole("button", { name: "Exit full screen" }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  expect(errors).toEqual([]);
});
test("mobile layout, reduced motion and navigation are usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.body.scrollWidth)).toBe(390);
  await page
    .getByRole("button", { name: "Stage 4: The changing depletion region" })
    .click();
  await expect(page.locator("h1")).toContainText("More reverse bias.");
  await page.getByRole("slider").fill("3");
  await expect(page.locator("output")).toHaveText("3.0 V");
  await page.screenshot({ path: "/tmp/junction-mobile.png", fullPage: true });
});

test("all stages fit desktop and projector viewports", async ({ page }) => {
  for (const [width, height] of [[1366,768],[1280,800],[1920,1080]]) {
    await page.setViewportSize({width,height});
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    for (let stage = 1; stage <= 4; stage++) {
      await page.locator(".stage-track button").nth(stage-1).click();
      await page.waitForTimeout(550);
      const sizes = await page.evaluate(() => {
        const copy = document.querySelector(".hero-copy")!.getBoundingClientRect();
        const observations = document.querySelector(".observations")!.getBoundingClientRect();
        return { width: document.body.scrollWidth, height: document.body.scrollHeight, copyBottom: copy.bottom, observationsTop: observations.top };
      });
      expect(sizes.width).toBe(width);
      expect(sizes.height).toBeLessThanOrEqual(height);
      expect(sizes.copyBottom).toBeLessThanOrEqual(sizes.observationsTop);
    }
  }
});
