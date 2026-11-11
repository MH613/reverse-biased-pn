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
