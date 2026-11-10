import { test, expect } from "@playwright/test";
import {
  solveLesson,
  lessonCharge,
  lessonField,
  lessonPotential,
  GRADIENT,
  LESSON_INTRINSIC,
  GRADED_VBI,
} from "../src/physics/lesson";
import { EPSILON_S, THERMAL_VOLTAGE_V } from "../src/physics/model";

test("abrupt and graded profiles obey Poisson, neutrality, and their voltage scaling", () => {
  for (const kind of ["abrupt", "graded"] as const) {
    const eq = solveLesson(kind, 0);
    for (const v of [0, 2, 5, 10]) {
      const s = solveLesson(kind, v),
        dx = s.widthM / 2000;
      let charge = 0,
        drop = 0;
      for (let i = 0; i < 2000; i++) {
        const x = -s.half + (i + 0.5) * dx;
        charge += lessonCharge(x, s) * dx;
        drop -= lessonField(x, s) * dx;
      }
      expect(Math.abs(charge)).toBeLessThan(1e-15);
      expect(drop / s.potentialV).toBeCloseTo(1, 5);
      expect(lessonField(-s.half, s)).toBe(0);
      expect(lessonField(s.half, s)).toBe(0);
      expect(lessonPotential(-s.half, s)).toBe(0);
      expect(lessonPotential(s.half, s)).toBe(s.potentialV);
      expect(lessonPotential(0, s) / s.potentialV).toBeCloseTo(0.5, 12);
      expect(-lessonField(0, s) / s.peakFieldVM).toBeCloseTo(1, 12);
      expect(s.widthM / eq.widthM).toBeCloseTo(
        (s.potentialV / eq.potentialV) ** (kind === "abrupt" ? 0.5 : 1 / 3),
        12,
      );
      for (const f of [-0.7, -0.2, 0.2, 0.7]) {
        const x = f * s.half,
          h = s.half * 1e-5;
        const slope = (lessonField(x + h, s) - lessonField(x - h, s)) / (2 * h);
        expect(slope / (lessonCharge(x, s) / EPSILON_S)).toBeCloseTo(1, 8);
        expect(
          (lessonPotential(x + h, s) - lessonPotential(x - h, s)) /
            (2 * h) /
            -lessonField(x, s),
        ).toBeCloseTo(1, 8);
      }
    }
  }
  const g = solveLesson("graded", 0);
  expect(
    2 * THERMAL_VOLTAGE_V * Math.log((GRADIENT * g.half) / LESSON_INTRINSIC),
  ).toBeCloseTo(GRADED_VBI, 12);
  expect(solveLesson("abrupt", -0.4).widthM).toBeLessThan(
    solveLesson("abrupt", 0).widthM,
  );
});
