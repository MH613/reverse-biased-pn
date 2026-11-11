import { test, expect } from "@playwright/test";
import { openImportedLab } from "./imported-helpers";

test("question → ammeter → measurement keeps the exercise without labels, graph or recording", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const f = await openImportedLab(page);
  await expect(f.locator(".card-s.on h2")).toHaveText("Is a current flowing?");
  await expect(f.locator("#prev")).toBeDisabled();
  await expect(f.locator("#dots li:visible")).toHaveCount(2);
  await f.getByRole("button", { name: "A tiny one", exact: true }).click();
  await expect(f.locator("#q-next")).toBeVisible();
  await f
    .getByRole("button", { name: "Bring the ammeter", exact: true })
    .click();
  await f.getByRole("button", { name: "Next", exact: true }).click();
  await expect(f.locator('.card-s[data-scene="5"]')).toHaveClass(/on/);
  await expect(f.locator('.card-s[data-scene="4"] .num, .card-s[data-scene="5"] .num')).toHaveCount(0);
  await expect(f.locator('[data-r="iv"], [data-r="record"]')).toHaveCount(0);
  await expect(f.getByRole("button", { name: "Continue to stage 3", exact: true })).toBeEnabled();
  await f.getByRole("button", { name: "Wire it for me", exact: true }).click();
  await f.locator('[data-r="supply"]').fill("40");
  await expect(f.locator('[data-r="i"]')).toHaveText("26.6 pA");
  await expect(f.locator("#m-text")).toContainText("You said a tiny one.");
  const state = await f.locator("body").evaluate(() => {
    const x = (window as any).__present;
    return {
      index: x.index,
      parts: x.lab.bench.hasPart("ammeter"),
      points: x.lab.state.points.length,
      wires: x.lab.state.wires.length,
      circuit: x.lab.state.circuit,
    };
  });
  expect(state.index).toBe(5);
  expect(state.parts).toBe(true);
  expect(state.points).toBe(0);
  expect(state.wires).toBe(3);
  expect(state.circuit.reverse).toBe(true);
  await f.locator("body").evaluate(() => (window as any).__present.go(8));
  await expect(f.locator('.card-s[data-scene="5"]')).toHaveClass(/on/);
  await f.locator("body").evaluate(() => (window as any).__present.go(0));
  await expect(f.locator('.card-s[data-scene="4"]')).toHaveClass(/on/);
  expect(errors).toEqual([]);
});

test("copied lab shows generation current, current-limited breakdown and reset wiring", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const f = await openImportedLab(page);
  await f.getByRole("button", { name: "No, none", exact: true }).click();
  await f
    .getByRole("button", { name: "Bring the ammeter", exact: true })
    .click();
  await f.getByRole("button", { name: "Next", exact: true }).click();
  await f.getByRole("button", { name: "Wire it for me", exact: true }).click();
  let current = 0;
  for (const v of [2, 10, 40]) {
    await f.locator('[data-r="supply"]').fill(String(v));
    const state = await f.locator("body").evaluate(() => {
      const { lab } = (window as any).__present;
      return { v: lab.state.setV, i: Math.abs(lab.state.op.total) };
    });
    expect(state.v).toBe(v);
    expect(state.i).toBeGreaterThan(current);
    current = state.i;
  }
  await f.locator('[data-r="supply"]').fill("120");
  await expect(f.locator("#m-title")).toHaveText("Breakdown.");
  const op = await f
    .locator("body")
    .evaluate(() => (window as any).__present.lab.state.op);
  expect(op.limited).toBe(true);
  expect(Math.abs(op.total)).toBeCloseTo(0.001, 8);
  await f.getByRole("button", { name: "Clear cables", exact: true }).click();
  await expect(f.locator('[data-r="supply"]')).toBeDisabled();
  await expect(f.locator('[data-r="record"]')).toHaveCount(0);
  await expect(f.locator('[data-r="i"]')).toHaveText("—");
});

test("narrow screens retain a centered host header and can reach the copied lab controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Laboratory", exact: true }).click();
  const f = page.frameLocator('iframe[title="Question and laboratory"]');
  await f.getByRole("button", { name: "A tiny one", exact: true }).click();
  await f
    .getByRole("button", { name: "Bring the ammeter", exact: true })
    .click();
  await f.getByRole("button", { name: "Next", exact: true }).click();
  await f.getByRole("button", { name: "Wire it for me", exact: true }).click();
  await f.locator('[data-r="supply"]').fill("20");
  await expect(f.locator('[data-r="set"]')).toHaveText("20.0 V");
  expect(await page.evaluate(() => document.body.scrollWidth)).toBe(390);
  expect(
    await f.locator("body").evaluate(() => document.body.scrollWidth),
  ).toBe(390);
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(page.locator("iframe")).toHaveCount(0);
});

test("the final lab slide continues to presentation stage 3 using either keyboard focus or its next button", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const method of ["iframe keyboard", "header keyboard", "next button"]) {
    const f = await openImportedLab(page);
    await f.getByRole("button", { name: "Next", exact: true }).click();
    if (method === "iframe keyboard") {
      await f.locator("body").click({ position: { x: 8, y: 8 } });
      await page.keyboard.press("ArrowRight");
    } else if (method === "header keyboard") {
      await page.getByRole("button", { name: "Laboratory", exact: true }).focus();
      await page.keyboard.press("ArrowRight");
    } else {
      await f.getByRole("button", { name: "Continue to stage 3", exact: true }).click();
    }
    await expect(page.locator("iframe")).toHaveCount(0);
    await expect(page.locator("main")).toHaveAttribute("data-stage", "2");
    await expect(page.locator("h1")).toHaveText("When reverse bias reaches its limit");
    await expect(page.getByRole("button", { name: "Replay stage animation" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Enter full screen" })).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("h1")).toHaveText("A linearly graded junction");
  }
});
