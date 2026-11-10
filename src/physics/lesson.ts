/** Presentation models, SI units. Source: supplied chapter 7, pp. 242–264. */
import { EPSILON_S, SILICON, THERMAL_VOLTAGE_V } from "./model";
export type JunctionKind = "abrupt" | "graded";
export const LESSON_DENSITY = 1e22; // 10^16 cm^-3 on each side
export const LESSON_INTRINSIC = 1.5e16; // 1.5 × 10^10 cm^-3, 300 K
export const GRADIENT = 1e28; // 10^20 cm^-4
export const ABRUPT_VBI =
  2 * THERMAL_VOLTAGE_V * Math.log(LESSON_DENSITY / LESSON_INTRINSIC);
// Physical, nondegenerate root of textbook Eqs. 7.67 and 7.70 at equilibrium.
let lo = 1e-7,
  hi = 1e-5;
for (let i = 0; i < 100; i++) {
  const x = (lo + hi) / 2;
  const drop = (2 * SILICON.q * GRADIENT * x ** 3) / (3 * EPSILON_S);
  const barrier =
    2 * THERMAL_VOLTAGE_V * Math.log((GRADIENT * x) / LESSON_INTRINSIC);
  if (drop < barrier) lo = x;
  else hi = x;
}
export const GRADED_VBI =
  (2 * SILICON.q * GRADIENT * ((lo + hi) / 2) ** 3) / (3 * EPSILON_S);
export function solveLesson(kind: JunctionKind, reverseVoltageV: number) {
  const v = Number.isFinite(reverseVoltageV)
    ? Math.max(-0.4, Math.min(10, reverseVoltageV))
    : 0;
  const builtInV = kind === "graded" ? GRADED_VBI : ABRUPT_VBI;
  const potentialV = builtInV + v;
  const widthM =
    kind === "graded"
      ? Math.cbrt((12 * EPSILON_S * potentialV) / (SILICON.q * GRADIENT))
      : Math.sqrt((4 * EPSILON_S * potentialV) / (SILICON.q * LESSON_DENSITY));
  const half = widthM / 2;
  const peakFieldVM =
    kind === "graded"
      ? (SILICON.q * GRADIENT * half ** 2) / (2 * EPSILON_S)
      : (SILICON.q * LESSON_DENSITY * half) / EPSILON_S;
  return {
    kind,
    reverseVoltageV: v,
    builtInV,
    potentialV,
    widthM,
    half,
    peakFieldVM,
  };
}
export type LessonSolution = ReturnType<typeof solveLesson>;
export function lessonCharge(x: number, s: LessonSolution) {
  if (Math.abs(x) > s.half) return 0;
  return s.kind === "graded"
    ? SILICON.q * GRADIENT * x
    : (x < 0 ? -1 : 1) * SILICON.q * LESSON_DENSITY;
}
export function lessonField(x: number, s: LessonSolution) {
  if (Math.abs(x) >= s.half) return 0;
  return s.kind === "graded"
    ? (SILICON.q * GRADIENT * (x * x - s.half * s.half)) / (2 * EPSILON_S)
    : -s.peakFieldVM * (1 - Math.abs(x) / s.half);
}
export function lessonPotential(x: number, s: LessonSolution) {
  if (x <= -s.half) return 0;
  if (x >= s.half) return s.potentialV;
  if (s.kind === "graded")
    return (
      ((SILICON.q * GRADIENT) / (2 * EPSILON_S)) *
      (s.half ** 2 * x - x ** 3 / 3 + (2 * s.half ** 3) / 3)
    );
  const c = (SILICON.q * LESSON_DENSITY) / (2 * EPSILON_S);
  return x <= 0 ? c * (x + s.half) ** 2 : s.potentialV - c * (s.half - x) ** 2;
}
// One shared fixed metre-to-artwork mapping, including both junction types.
export const LESSON_SCALE =
  300 /
  Math.max(solveLesson("abrupt", 10).widthM, solveLesson("graded", 10).widthM);
