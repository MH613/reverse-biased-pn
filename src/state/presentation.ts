import { createContext, useContext } from "react";
import { solveLesson, LESSON_SCALE } from "../physics/lesson";
export type BiasMode = "reverse" | "forward";
export interface PresentationState {
  stage: number;
  time: number;
  progress: number;
  voltage: number;
  bias: BiasMode;
  playing: boolean;
  reducedMotion: boolean;
  width: number;
  pFraction?: number;
  lesson?: boolean;
  breakdown?: "avalanche" | "zener";
}
export const PresentationContext = createContext<PresentationState>({
  stage: 0,
  time: 0,
  progress: 0,
  voltage: 0,
  bias: "reverse",
  playing: true,
  reducedMotion: false,
  width: 30,
});
export const usePresentation = () => useContext(PresentationContext);
// Presentation width follows the same solution used by every graph.
export function depletionWidth(
  stage: number,
  _progress: number,
  voltage: number,
  bias: BiasMode,
) {
  return (
    solveLesson(
      stage === 3 ? "graded" : "abrupt",
      stage === 1 && bias === "forward" ? -voltage : voltage,
    ).widthM * LESSON_SCALE
  );
}
export const chapters = [
  {
    title: "The equilibrium junction",
    label: "Equilibrium",
    theory:
      "Fixed ions create an internal field—even at zero applied voltage. Equal doping gives equal depletion widths on the P and N sides. Outside depletion, the ideal model sets the field to zero.",
  },
  {
    title: "Reverse bias: wider, stronger",
    label: "Applying bias",
    theory:
      "Reverse bias increases the potential barrier. More fixed ions are exposed as depletion widens, increasing the peak field. The ion density stays constant; the charged region becomes wider.",
  },
  {
    title: "When reverse bias reaches its limit",
    label: "Breakdown",
    theory:
      "At breakdown, reverse current rises sharply. Avalanche multiplies carriers through impact ionization; Zener breakdown allows electrons to tunnel across a narrow barrier in a heavily doped junction.",
  },
  {
    title: "A linearly graded junction",
    label: "Graded doping",
    theory:
      "Here, net doping changes linearly across the junction. Charge density is linear, the electric field is quadratic, and potential is cubic within depletion. Reverse bias still widens the region and increases the peak field.",
  },
];
