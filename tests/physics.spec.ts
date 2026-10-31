import { test, expect } from "@playwright/test";
import {
  solveJunction,
  fieldMagnitudeVM,
  BUILT_IN_VOLTAGE_V,
  SATURATION_CURRENT_A,
  SILICON,
  EPSILON_S,
} from "../src/physics/model";
import { traceCurrent } from "../src/lab/circuit";

test("agrees with independently calculated silicon reference points at 0, 2, 5 and 10 V", () => {
  expect(BUILT_IN_VOLTAGE_V).toBeCloseTo(0.7322363927517848, 13);
  expect(SATURATION_CURRENT_A / 1e-15).toBeCloseTo(1.225365612614968, 12);
  for (const [v, w, xp, xn, e] of [
    [
      0, 0.3768759127059578, 0.25125060847063857, 0.12562530423531926,
      38.85822192744287,
    ],
    [
      2, 0.7280008094182024, 0.4853338729454683, 0.24266693647273416,
      75.06135590523067,
    ],
    [
      5, 1.0544713205758476, 0.7029808803838983, 0.3514904401919492,
      108.72247126875688,
    ],
    [
      10, 1.4428388954613034, 0.9618925969742024, 0.4809462984871011,
      148.76555416563653,
    ],
  ]) {
    const s = solveJunction(v);
    expect(s.widthM * 1e6).toBeCloseTo(w, 12);
    expect(s.xpM * 1e6).toBeCloseTo(xp, 12);
    expect(s.xnM * 1e6).toBeCloseTo(xn, 12);
    expect(s.peakFieldVM / 1e5).toBeCloseTo(e, 10);
    expect(s.widthM / (s.xpM + s.xnM)).toBeCloseTo(1, 13);
    expect(
      (SILICON.acceptorDensityM3 * s.xpM) / (SILICON.donorDensityM3 * s.xnM),
    ).toBeCloseTo(1, 13);
    expect((0.5 * s.widthM * s.peakFieldVM) / s.potentialV).toBeCloseTo(1, 13);
    expect(fieldMagnitudeVM(-s.xpM, s)).toBeCloseTo(0, 6);
    expect(fieldMagnitudeVM(s.xnM, s)).toBeCloseTo(0, 6);
    expect(fieldMagnitudeVM(0, s) / s.peakFieldVM).toBeCloseTo(1, 13);
    expect(fieldMagnitudeVM(-s.xpM / 2, s) / s.peakFieldVM).toBeCloseTo(
      0.5,
      13,
    );
    expect(fieldMagnitudeVM(s.xnM / 2, s) / s.peakFieldVM).toBeCloseTo(0.5, 13);
    expect(fieldMagnitudeVM(-s.xpM * 1.01, s)).toBe(0);
    expect(fieldMagnitudeVM(s.xnM * 1.01, s)).toBe(0);
  }
  expect(solveJunction(0).terminalCurrentA).toBe(0);
});
test("is monotonic, charge neutral and safely pre-breakdown throughout 0–10 V, with saturated reverse current", () => {
  let previous = solveJunction(0);
  for (let i = 1; i <= 1000; i++) {
    const s = solveJunction(i / 100);
    expect(s.widthM).toBeGreaterThan(previous.widthM);
    expect(s.peakFieldVM).toBeGreaterThan(previous.peakFieldVM);
    expect(s.terminalCurrentA).toBeLessThanOrEqual(0);
    expect(Math.abs(s.terminalCurrentA)).toBeLessThanOrEqual(
      SATURATION_CURRENT_A * 1.00000001,
    );
    previous = s;
  }
  expect(
    Math.abs(
      solveJunction(0.5).terminalCurrentA / solveJunction(10).terminalCurrentA -
        1,
    ),
  ).toBeLessThan(1e-8);
  expect(solveJunction(10).peakFieldVM).toBeLessThan(
    SILICON.indicativeCriticalFieldVM / 2,
  );
  expect(solveJunction(-2).reverseVoltageV).toBe(0);
  expect(solveJunction(20).reverseVoltageV).toBe(10);
  // Both sides have their own Poisson slope, not a symmetric approximation.
  const s = solveJunction(5),
    dp =
      (fieldMagnitudeVM(-s.xpM * 0.25, s) -
        fieldMagnitudeVM(-s.xpM * 0.75, s)) /
      (s.xpM * 0.5);
  expect(
    dp / ((SILICON.q * SILICON.acceptorDensityM3) / EPSILON_S),
  ).toBeCloseTo(1, 12);
});
test("current tracing accounts for wire and ammeter orientation", () => {
  const trace = traceCurrent([
    { id: "a", from: "ammeter:out", to: "supply:positive" },
    { id: "b", from: "ammeter:in", to: "junction:n" },
    { id: "c", from: "junction:p", to: "supply:negative" },
  ]);
  expect(trace.meterSign).toBe(-1);
  expect(trace.directions).toEqual({ a: -1, b: 1, c: 1 });
});

test("all quantitative views and instruments agree, interpolate coherently, and reset on disconnect", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await page.getByRole("button", { name: "Laboratory", exact: true }).click();
  const slider = page.getByRole("slider", { name: "Supply voltage" }),
    panel = page.locator(".science-panel");
  await expect(slider).toBeDisabled();
  await expect(panel).toHaveAttribute("data-applied-voltage", "0");
  await page.getByRole("button", { name: "Wire", exact: true }).click();
  for (const [a, b] of [
    ["Supply +", "Ammeter IN"],
    ["Ammeter OUT", "Junction N"],
    ["Junction P", "Supply −"],
  ]) {
    await page.getByRole("button", { name: a, exact: true }).click();
    await page.getByRole("button", { name: b, exact: true }).click();
  }
  await expect(slider).toBeEnabled();
  await expect(slider).toHaveAttribute("max", "10");
  await expect(page.locator(".lab-current-pulse")).toHaveCount(0);
  const graphNode = await page
    .locator(".field-operating-profile")
    .elementHandle();
  const curve = await page.locator(".width-curve").getAttribute("d");
  for (const v of [0, 2, 5, 10]) {
    await slider.fill(String(v));
    await expect(panel).toHaveAttribute("data-applied-voltage", String(v));
    const s = solveJunction(v);
    const values = await panel.evaluate((el) => ({
      w: Number(el.getAttribute("data-width-m")),
      xp: Number(el.getAttribute("data-xp-m")),
      xn: Number(el.getAttribute("data-xn-m")),
      e: Number(el.getAttribute("data-peak-field-vm")),
      current: Number(el.getAttribute("data-current-a")),
    }));
    expect(values.w / s.widthM).toBeCloseTo(1, 12);
    expect(values.xp / s.xpM).toBeCloseTo(1, 12);
    expect(values.e / s.peakFieldVM).toBeCloseTo(1, 12);
    const peak = page.locator(".field-peak-marker"),
      marker = page.locator(".width-operating-point");
    expect(Number(await peak.getAttribute("cx"))).toBeCloseTo(
      42 + (1.2 / 1.8) * 278,
      10,
    );
    expect(Number(await peak.getAttribute("cy"))).toBeCloseTo(
      118 - (s.peakFieldVM / 1.8e7) * 92,
      10,
    );
    expect(Number(await marker.getAttribute("cx"))).toBeCloseTo(
      42 + (v / 10) * 278,
      10,
    );
    expect(Number(await marker.getAttribute("cy"))).toBeCloseTo(
      118 - (s.widthM / 1.6e-6) * 92,
      10,
    );
    expect(
      Number(
        await page
          .locator(".section-p-boundary")
          .getAttribute("data-position-m"),
      ) / -s.xpM,
    ).toBeCloseTo(1, 12);
    const iso = page.locator(".lab-artwork .junction-illustration");
    expect(
      Number(await iso.getAttribute("data-depletion-width-m")) / s.widthM,
    ).toBeCloseTo(1, 12);
    expect(
      Number(await iso.getAttribute("data-n-boundary-m")) / s.xnM,
    ).toBeCloseTo(1, 12);
    const pts = (await iso
        .locator(".depletion-surface")
        .getAttribute("points"))!
        .match(/-?\d+(?:\.\d+)?/g)!
        .map(Number),
      scale = 300 / solveJunction(10).widthM;
    expect(pts[0]).toBeCloseTo(190 + (240 - s.xpM * scale) * 0.96, 9);
    expect(pts[2]).toBeCloseTo(190 + (240 + s.xnM * scale) * 0.96, 9);
    await expect(
      page.locator('[data-instrument="supply"] .source-readout'),
    ).toHaveText(`${v.toFixed(2)} V`);
    await expect(
      page.locator('[data-instrument="ammeter"] .source-readout'),
    ).toHaveText(v === 0 ? "0.000 fA" : "1.225 fA");
    await expect(page.locator(".lab-current-pulse")).toHaveCount(
      v === 0 ? 0 : 3,
    );
    expect(await graphNode!.evaluate((el) => el.isConnected)).toBe(true);
    expect(await page.locator(".width-curve").getAttribute("d")).toBe(curve);
  }
  await page.getByLabel("Equilibrium", { exact: true }).uncheck();
  await expect(page.locator(".equilibrium-reference")).toHaveCount(0);
  await slider.fill("2");
  const snapshots = await page.evaluate(async () => {
    const out: { v: number; w: number; e: number; y: number }[] = [];
    for (let i = 0; i < 14; i++) {
      await new Promise(requestAnimationFrame);
      const p = document.querySelector(".science-panel")!;
      out.push({
        v: Number(p.getAttribute("data-applied-voltage")),
        w: Number(p.getAttribute("data-width-m")),
        e: Number(p.getAttribute("data-peak-field-vm")),
        y: Number(
          document.querySelector(".width-operating-point")!.getAttribute("cy"),
        ),
      });
    }
    return out;
  });
  expect(snapshots.some((p) => p.v > 2 && p.v < 10)).toBe(true);
  for (const p of snapshots) {
    const expected = solveJunction(p.v);
    expect(p.w / expected.widthM).toBeCloseTo(1, 11);
    expect(p.e / expected.peakFieldVM).toBeCloseTo(1, 11);
    expect(p.y).toBeCloseTo(118 - (expected.widthM / 1.6e-6) * 92, 9);
  }
  await page
    .getByRole("button", {
      name: "Select wire from Supply + to Ammeter IN",
      exact: true,
    })
    .focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Delete wire", exact: true }).click();
  await expect(slider).toBeDisabled();
  await expect(panel).toHaveAttribute("data-applied-voltage", "0");
  expect(
    Number(await panel.getAttribute("data-width-m")) / solveJunction(0).widthM,
  ).toBeCloseTo(1, 12);
  await expect(page.locator(".lab-current-pulse")).toHaveCount(0);
  await expect(
    page.locator('[data-instrument="ammeter"] .source-readout'),
  ).toHaveText("0.000 fA");
  expect(errors).toEqual([]);
});
