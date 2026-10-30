import { test, expect, type Page } from "@playwright/test";
import {
  unproject,
  isValidPlacement,
  type Positions,
} from "../src/lab/geometry";
import { routeConflicts } from "../src/lab/routing";
async function open(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Laboratory", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Circuit laboratory" }),
  ).toBeVisible();
  await page.waitForTimeout(300);
}
async function layout(page: Page) {
  const values = await page.locator("[data-instrument]").evaluateAll((els) =>
    els.map(
      (el) =>
        [
          el.getAttribute("data-instrument")!,
          el
            .getAttribute("transform")!
            .match(/-?\d+(?:\.\d+)?/g)!
            .map(Number),
        ] as const,
    ),
  );
  return Object.fromEntries(
    values.map(([id, n]) => [id, unproject(n[0], n[1])]),
  ) as Positions;
}
test("mode changes cancel pointer capture, snapping completes, and terminals have readable hover feedback", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await open(page);
  const hit = page.locator('[data-instrument="supply"] .instrument-hit'),
    b = (await hit.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 - 50, b.y + b.height / 2 + 15, {
    steps: 8,
  });
  await expect(page.locator(".placement-ghost")).toBeVisible();
  await page.keyboard.press("w");
  await page.waitForTimeout(260);
  const frozen = await layout(page);
  await page.mouse.move(600, 600, { steps: 5 });
  await page.mouse.up();
  expect(await layout(page)).toEqual(frozen);
  await expect(page.locator(".lab-canvas")).not.toHaveClass(/is-dragging/);
  await page.getByRole("button", { name: "Supply +", exact: true }).hover();
  await expect(page.locator(".lab-terminal-tooltip")).toHaveText("Supply +");
  await page.getByRole("button", { name: "Supply +", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".pending-wire")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Back to explanation", exact: true })
    .click();
  await expect(page.locator(".lab-shell")).toHaveCount(0);
  await expect(page.locator(".lab-button")).toBeFocused();
});
test("rendered wires occupy separate orthogonal paths and physics remains correct after a rearrangement", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await open(page);
  await page.getByRole("button", { name: "Wire", exact: true }).click();
  for (const [a, b] of [
    ["Supply +", "Ammeter IN"],
    ["Ammeter OUT", "Junction N"],
    ["Junction P", "Supply −"],
  ]) {
    await page.getByRole("button", { name: a, exact: true }).click();
    await page.getByRole("button", { name: b, exact: true }).click();
  }
  await page.getByRole("slider", { name: "Supply voltage" }).fill("5");
  await expect(page.locator(".science-panel")).toHaveAttribute(
    "data-applied-voltage",
    "5",
  );
  await page.getByRole("button", { name: "Move", exact: true }).click();
  const hit = page.locator('[data-instrument="junction"] .instrument-hit'),
    b = (await hit.boundingBox())!,
    zoom = await page
      .locator(".lab-camera")
      .evaluate((el) => (el as SVGGraphicsElement).getScreenCTM()!.a);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    b.x + b.width / 2 + (0.96 * 160 - 0.7 * 160) * zoom,
    b.y + b.height / 2 + (0.27 * 160 + 0.5 * 160) * zoom,
    { steps: 16 },
  );
  const during = await layout(page);
  for (const id of Object.keys(during) as (keyof Positions)[])
    expect(isValidPlacement(id, during[id], during)).toBe(true);
  await page.mouse.up();
  await page.waitForTimeout(700);
  const paths = await page.locator(".wire-visible").evaluateAll((nodes) =>
    nodes.map((el) =>
      el
        .getAttribute("d")!
        .match(/-?\d+(?:\.\d+)?/g)!
        .map(Number),
    ),
  );
  const routes = paths.map((v) =>
    Array.from(
      { length: v.length / 2 },
      (_, i) => [v[i * 2], v[i * 2 + 1]] as const,
    )
      .slice(2, -2)
      .map(([x, y]) => {
        const p = unproject(x, y);
        return [p.x, p.y] as const;
      }),
  );
  for (let i = 0; i < routes.length; i++)
    for (let j = i + 1; j < routes.length; j++)
      expect(routeConflicts(routes[i], routes[j])).toEqual([]);
  await expect(page.locator(".science-panel")).toHaveAttribute(
    "data-applied-voltage",
    "5",
  );
  await expect(
    page.locator('[data-instrument="ammeter"] .source-readout'),
  ).toHaveText("1.225 fA");
});
test("reduced-motion preference retains direct placement, instant zoom, and live physics", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 960 });
  await open(page);
  const before = await page.locator(".lab-camera").getAttribute("transform");
  await page.keyboard.press("+");
  await page.waitForTimeout(30);
  expect(await page.locator(".lab-camera").getAttribute("transform")).not.toBe(
    before,
  );
  await page.keyboard.press("w");
  for (const [a, b] of [
    ["Supply +", "Ammeter IN"],
    ["Ammeter OUT", "Junction N"],
    ["Junction P", "Supply −"],
  ]) {
    await page.getByRole("button", { name: a, exact: true }).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: b, exact: true }).focus();
    await page.keyboard.press("Enter");
  }
  await page.getByRole("slider", { name: "Supply voltage" }).fill("10");
  await expect(page.locator(".science-panel")).toHaveAttribute(
    "data-applied-voltage",
    "10",
  );
  await expect(page.locator(".lab-current-pulse").first()).not.toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("slider", { name: "Supply voltage" }).fill("2");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".science-panel")).toHaveAttribute(
    "data-applied-voltage",
    "2",
  );
});
