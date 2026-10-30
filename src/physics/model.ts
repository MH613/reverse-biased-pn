/** SI throughout: m, m^-3, F/m, C, V, K, s, A. See docs/physics.md. */
export const SILICON = Object.freeze({
  q: 1.602176634e-19,
  k: 1.380649e-23,
  epsilon0: 8.8541878128e-12,
  epsilonRelative: 11.7,
  temperatureK: 300,
  intrinsicDensityM3: 1e16,
  acceptorDensityM3: 1e22,
  donorDensityM3: 2e22,
  areaM2: 1e-8,
  electronDiffusivityM2S: 0.0035,
  holeDiffusivityM2S: 0.0012,
  electronLifetimeS: 1e-6,
  holeLifetimeS: 1e-6,
  maximumReverseVoltageV: 10,
  indicativeCriticalFieldVM: 3e7,
});
export const EPSILON_S = SILICON.epsilon0 * SILICON.epsilonRelative;
export const THERMAL_VOLTAGE_V = (SILICON.k * SILICON.temperatureK) / SILICON.q;
export const BUILT_IN_VOLTAGE_V =
  THERMAL_VOLTAGE_V *
  Math.log(
    (SILICON.acceptorDensityM3 * SILICON.donorDensityM3) /
      SILICON.intrinsicDensityM3 ** 2,
  );
export const DEPLETION_COEFFICIENT =
  ((2 * EPSILON_S) / SILICON.q) *
  (1 / SILICON.acceptorDensityM3 + 1 / SILICON.donorDensityM3);
export const SATURATION_CURRENT_A =
  SILICON.q *
  SILICON.areaM2 *
  SILICON.intrinsicDensityM3 ** 2 *
  (SILICON.holeDiffusivityM2S /
    (Math.sqrt(SILICON.holeDiffusivityM2S * SILICON.holeLifetimeS) *
      SILICON.donorDensityM3) +
    SILICON.electronDiffusivityM2S /
      (Math.sqrt(SILICON.electronDiffusivityM2S * SILICON.electronLifetimeS) *
        SILICON.acceptorDensityM3));
export interface JunctionSolution {
  reverseVoltageV: number;
  potentialV: number;
  widthM: number;
  xpM: number;
  xnM: number;
  peakFieldVM: number;
  terminalCurrentA: number;
}
export function solveJunction(reverseVoltageV: number): JunctionSolution {
  const vr = Number.isFinite(reverseVoltageV)
    ? Math.max(0, Math.min(10, reverseVoltageV))
    : 0;
  const potentialV = BUILT_IN_VOLTAGE_V + vr;
  const widthM = Math.sqrt(DEPLETION_COEFFICIENT * potentialV);
  const xpM =
    (widthM * SILICON.donorDensityM3) /
    (SILICON.acceptorDensityM3 + SILICON.donorDensityM3);
  return {
    reverseVoltageV: vr,
    potentialV,
    widthM,
    xpM,
    xnM: widthM - xpM,
    peakFieldVM: (2 * potentialV) / widthM,
    // P→N sign convention; expm1 makes zero-bias cancellation exact and stable.
    terminalCurrentA:
      vr === 0 ? 0 : SATURATION_CURRENT_A * Math.expm1(-vr / THERMAL_VOLTAGE_V),
  };
}
export function fieldMagnitudeVM(xM: number, s: JunctionSolution): number {
  if (xM < -s.xpM || xM > s.xnM) return 0;
  return xM <= 0
    ? ((SILICON.q * SILICON.acceptorDensityM3) / EPSILON_S) * (xM + s.xpM)
    : ((SILICON.q * SILICON.donorDensityM3) / EPSILON_S) * (s.xnM - xM);
}
export const EQUILIBRIUM = solveJunction(0);
export const MAXIMUM = solveJunction(10);
// One fixed spatial scale for all isometric operating points; never auto-rescale.
export const ILLUSTRATION_UNITS_PER_METRE = 300 / MAXIMUM.widthM;
export const widthToIllustration = (widthM: number) =>
  widthM * ILLUSTRATION_UNITS_PER_METRE;
export function formatCurrent(currentA: number): string {
  return Math.abs(currentA) < 0.0005e-15
    ? "0.000 fA"
    : `${(currentA * 1e15).toFixed(3)} fA`;
}
