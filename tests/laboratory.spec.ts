import { test, expect, type Page } from "@playwright/test";
import {
  unproject,
  isValidPlacement,
  type Positions,
} from "../src/lab/geometry";
import type { InstrumentId } from "../src/lab/circuit";
async function openLab(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Laboratory", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Circuit laboratory" }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
async function connect(page: Page, from: string, to: string) {
  await page.getByRole("button", { name: from, exact: true }).click();
  await page.getByRole("button", { name: to, exact: true }).click();
}
async function layout(page: Page): Promise<Positions> {
  const entries = await page.locator("[data-instrument]").evaluateAll((els) =>
    els.map((el) => ({
      id: el.getAttribute("data-instrument")!,
      values: el
        .getAttribute("transform")!
        .match(/-?\d+(?:\.\d+)?/g)!
        .map(Number),
    })),
  );
  return Object.fromEntries(
    entries.map((v) => [v.id, unproject(v.values[0], v.values[1])]),
  ) as Positions;
}
async function dragWorld(page: Page, id: InstrumentId, dx: number, dy: number) {
  const el = page.locator(`[data-instrument="${id}"] .instrument-hit`),
    box = (await el.boundingBox())!;
  const zoom = await page
    .locator(".lab-camera")
    .evaluate((el) => (el as SVGGraphicsElement).getScreenCTM()!.a);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + (0.96 * dx + 0.7 * dy) * zoom,
    box.y + box.height / 2 + (0.27 * dx - 0.5 * dy) * zoom,
    { steps: 12 },
  );
  await page.mouse.up();
  await page.waitForTimeout(260);
}
test("wire, validate, inspect, disconnect, and retain the circuit across presentation visits", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 960 });
  await openLab(page);
  const voltage = page.getByRole("slider", { name: "Supply voltage" });
  await expect(voltage).toBeDisabled();
  await page.getByRole("button", { name: "Wire", exact: true }).click();
  await page.getByRole("button", { name: "Supply +", exact: true }).click();
  await page.mouse.move(500, 500);
  await expect(page.locator(".pending-wire")).toBeVisible();
  await page.mouse.wheel(0, 140);
  await page.waitForTimeout(350);
  const gap = await page.locator(".pending-wire").evaluate((el) => {
    const p = el as SVGPathElement,
      q = p.getPointAtLength(p.getTotalLength()),
      screen = new DOMPoint(q.x, q.y).matrixTransform(p.getScreenCTM()!);
    return Math.hypot(screen.x - 500, screen.y - 500);
  });
  expect(gap).toBeLessThan(0.5);
  await page.keyboard.press("Escape");
  await expect(page.locator(".pending-wire")).toHaveCount(0);
  await connect(page, "Supply +", "Ammeter IN");
  await connect(page, "Ammeter OUT", "Junction P");
  await connect(page, "Junction N", "Supply −");
  await expect(page.locator(".circuit-feedback")).toContainText(
    "forward biased",
  );
  await expect(voltage).toBeDisabled();
  await page
    .getByRole("button", { name: "Reset circuit", exact: true })
    .click();
  await connect(page, "Supply +", "Ammeter IN");
  await connect(page, "Ammeter OUT", "Junction N");
  await connect(page, "Junction P", "Supply −");
  await expect(page.locator(".circuit-feedback")).toContainText(
    "Reverse bias connected",
  );
  await expect(voltage).toBeEnabled();
  await voltage.fill("3.2");
  await expect(page.locator(".lab-voltage output")).toContainText("3.2");
  await expect(
    page.locator('[data-instrument="supply"] .source-readout'),
  ).toContainText("3.20 V");
  await expect(
    page.locator('[data-instrument="ammeter"] .source-readout'),
  ).toHaveText("1.225 fA");
  await page.getByRole("button", { name: "Move", exact: true }).click();
  await dragWorld(page, "supply", -40, 40);
  await expect(page.locator(".circuit-feedback")).toContainText(
    "Reverse bias connected",
  );
  await expect(page.locator(".lab-voltage output")).toContainText("3.2");
  const alignment = await page.locator(".lab-camera").evaluate((el) => {
    const wire = el.querySelector(".wire-visible") as SVGPathElement,
      p = wire.getPointAtLength(0),
      q = new DOMPoint(p.x, p.y).matrixTransform(wire.getScreenCTM()!);
    const port = el.querySelector(
        '[data-instrument="supply"] .source-port-n',
      ) as SVGCircleElement,
      r = new DOMPoint(
        Number(port.getAttribute("cx")),
        Number(port.getAttribute("cy")),
      ).matrixTransform(port.getScreenCTM()!);
    return Math.hypot(q.x - r.x, q.y - r.y);
  });
  expect(alignment).toBeLessThan(0.1);
  await page.getByRole("button", { name: "Inspect", exact: true }).click();
  await page
    .getByRole("button", { name: "Select PN junction", exact: true })
    .click();
  await expect(page.locator(".junction-detail")).toBeVisible();
  await page
    .getByRole("button", { name: "Back to explanation", exact: true })
    .click();
  await expect(page.locator(".lab-shell")).toHaveCount(0);
  await expect(page.locator("h1")).toContainText("The PN junction.");
  await page.getByRole("button", { name: "Laboratory", exact: true }).click();
  await expect(page.locator(".lab-wire")).toHaveCount(3);
  expect(
    Number(
      await page.locator(".science-panel").getAttribute("data-applied-voltage"),
    ),
  ).toBe(3.2);
  await expect(page.locator(".lab-voltage output")).toContainText("3.2");
  const hit = page.getByRole("button", {
    name: "Select wire from Supply + to Ammeter IN",
    exact: true,
  });
  const point = await hit.evaluate((el) => {
    const path = el as SVGPathElement;
    const p = path.getPointAtLength(path.getTotalLength() * 0.5);
    return new DOMPoint(p.x, p.y)
      .matrixTransform(path.getScreenCTM()!)
      .toJSON();
  });
  await page.mouse.click(point.x, point.y);
  await page.getByRole("button", { name: "Delete wire", exact: true }).click();
  await expect(page.locator(".lab-wire")).toHaveCount(2);
  await expect(voltage).toBeDisabled();
  await expect(page.locator(".lab-voltage output")).toContainText("0.0");
  expect(errors).toEqual([]);
});
test("movement tracks world coordinates at different zooms, snaps without overlap, and reroutes wires", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openLab(page);
  const before = await layout(page);
  await dragWorld(page, "junction", 80, 40);
  const after = await layout(page);
  expect(after.junction.x - before.junction.x).toBeCloseTo(80, 3);
  expect(after.junction.y - before.junction.y).toBeCloseTo(40, 3);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.waitForTimeout(500);
  const zoomedBefore = await layout(page);
  await dragWorld(page, "ammeter", 40, -80);
  const zoomedAfter = await layout(page);
  expect(zoomedAfter.ammeter.x - zoomedBefore.ammeter.x).toBeCloseTo(40, 3);
  expect(zoomedAfter.ammeter.y - zoomedBefore.ammeter.y).toBeCloseTo(-80, 3);
  const current = await layout(page);
  await dragWorld(
    page,
    "ammeter",
    current.supply.x - current.ammeter.x,
    current.supply.y - current.ammeter.y,
  );
  const safe = await layout(page);
  for (const id of Object.keys(safe) as InstrumentId[])
    expect(isValidPlacement(id, safe[id], safe)).toBe(true);
  await page
    .getByRole("button", { name: "Fit workspace", exact: true })
    .click();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "Wire", exact: true }).click();
  await connect(page, "Supply +", "Ammeter IN");
  const wire = page.locator(".wire-visible");
  const oldPath = await wire.getAttribute("d");
  await page.getByRole("button", { name: "Move", exact: true }).click();
  await dragWorld(page, "supply", -80, 40);
  expect(await wire.getAttribute("d")).not.toBe(oldPath);
  await expect(page.locator(".lab-wire")).toHaveCount(1);
  const oldCamera = await page.locator(".lab-camera").getAttribute("transform");
  await page.mouse.move(250, 700);
  await page.mouse.down();
  await page.mouse.move(330, 740, { steps: 8 });
  await page.mouse.up();
  expect(await page.locator(".lab-camera").getAttribute("transform")).not.toBe(
    oldCamera,
  );
});
test("mobile lab stays within viewport and supports keyboard terminal wiring", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLab(page);
  expect(await page.evaluate(() => document.body.scrollWidth)).toBe(390);
  await page.getByRole("button", { name: "Wire", exact: true }).click();
  for (const [from, to] of [
    ["Supply +", "Ammeter IN"],
    ["Ammeter OUT", "Junction N"],
    ["Junction P", "Supply −"],
  ]) {
    for (const name of [from, to]) {
      await page.getByRole("button", { name, exact: true }).focus();
      await page.keyboard.press("Enter");
    }
  }
  await expect(page.locator(".circuit-feedback")).toContainText(
    "Reverse bias connected",
  );
  await expect(
    page.getByRole("slider", { name: "Supply voltage" }),
  ).toBeEnabled();
});

test("raised wire leads remain visibly above equipment and meet every physical port after the ammeter swap", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openLab(page);
  await page.getByRole("button", { name: "Wire", exact: true }).click();
  await page.getByRole("button", { name: "Supply +", exact: true }).click();
  await page.mouse.move(500, 650);
  await expect(page.locator(".pending-wire")).toBeVisible();
  const draftAttached = await page.locator(".pending-wire").evaluate((el) => {
    const lead = el as SVGPathElement,
      port = document.querySelector<SVGCircleElement>('.lab-artwork [data-instrument-port="supply:positive"]')!,
      first = lead.getPointAtLength(0),
      a = new DOMPoint(first.x, first.y).matrixTransform(lead.getScreenCTM()!),
      b = new DOMPoint(Number(port.getAttribute("cx")), Number(port.getAttribute("cy"))).matrixTransform(port.getScreenCTM()!),
      body = [...document.querySelectorAll(".lab-instrument")].at(-1)!;
    return Math.hypot(a.x - b.x, a.y - b.y) < 0.1 &&
      !!(body.compareDocumentPosition(lead) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(draftAttached).toBe(true);
  await page.keyboard.press("Escape");
  await connect(page, "Supply +", "Ammeter IN");
  await connect(page, "Ammeter OUT", "Junction N");
  await connect(page, "Junction P", "Supply −");
  await page.getByRole("slider", { name: "Supply voltage" }).fill("5");
  await expect(page.locator('[data-instrument="ammeter"] .source-readout')).toHaveText("1.225 fA");
  await expect(page.locator(".terminal-lead")).toHaveCount(6);
  await expect(page.locator('[data-instrument="ammeter"] text').filter({ hasText: /^OUT$/ })).toHaveAttribute('x', '38');
  await expect(page.locator('[data-instrument="ammeter"] text').filter({ hasText: /^IN$/ })).toHaveAttribute('x', '157');
  const check = async () => {
    const result = await page.evaluate(() => {
      const screen = (el: SVGGraphicsElement, x: number, y: number) => new DOMPoint(x, y).matrixTransform(el.getScreenCTM()!);
      const near = (a: DOMPoint, b: DOMPoint) => Math.hypot(a.x - b.x, a.y - b.y) < 0.1;
      const leads = [...document.querySelectorAll<SVGPathElement>(".terminal-lead")];
      const aligned = leads.every(lead => {
        const id = lead.dataset.leadTerminal!,
          port = document.querySelector<SVGCircleElement>(`.lab-artwork [data-instrument-port="${id}"]`),
          terminal = document.querySelector<SVGCircleElement>(`[data-terminal="${id}"]`)!,
          p = lead.getPointAtLength(0),
          q = screen(lead, p.x, p.y),
          t = screen(terminal, Number(terminal.getAttribute("cx")), Number(terminal.getAttribute("cy")));
        return near(q, t) && (!port || near(q, screen(port, Number(port.getAttribute("cx")), Number(port.getAttribute("cy")))));
      });
      const lastBody = [...document.querySelectorAll(".lab-instrument")].at(-1)!;
      const above = leads.every(lead => !!(lastBody.compareDocumentPosition(lead) & Node.DOCUMENT_POSITION_FOLLOWING));
      const meterIn = document.querySelector('[data-instrument-port="ammeter:in"]')!,
        meterOut = document.querySelector('[data-instrument-port="ammeter:out"]')!;
      return { aligned, above, inOnRight: Number(meterIn.getAttribute("cx")) > Number(meterOut.getAttribute("cx")) };
    });
    expect(result).toEqual({ aligned: true, above: true, inOnRight: true });
  };
  await check();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Move", exact: true }).click();
  await dragWorld(page, "ammeter", 40, -40);
  await check();
  await page.getByRole("button", { name: "Wire", exact: true }).click();
  await page.getByRole("button", { name: "Supply +", exact: true }).click();
  // Occupied ports are rejected, and the series circuit remains unchanged.
  await expect(page.locator(".lab-wire")).toHaveCount(3);
  await expect(page.locator('.science-panel')).toHaveAttribute('data-applied-voltage', '5');
});
