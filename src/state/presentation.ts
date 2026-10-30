import { createContext, useContext } from "react";
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
// Normalized, qualitative depletion approximation. A quantitative simulator can
// replace this selector without changing the presentation or illustration API.
export function depletionWidth(
  stage: number,
  progress: number,
  voltage: number,
  bias: BiasMode,
) {
  if (stage === 0) return 30;
  if (stage === 1) return 30 + 68 * Math.min(1, progress / 0.7);
  if (stage === 2)
    return bias === "reverse" ? 98 + 46 * progress : 98 - 55 * progress;
  return 98 * Math.sqrt(1 + voltage / 0.7);
}
export const chapters = [
  {
    title: "Two sides.\nOne junction.",
    theory:
      "P-type silicon has mostly holes. N-type silicon has mostly electrons. Where they meet, mobile charges begin to cross the boundary.",
    label: "The PN junction",
  },
  {
    title: "An invisible\nfield takes shape.",
    theory:
      "Electrons and holes diffuse and recombine, exposing fixed ions. Their field points from N to P. At equilibrium, drift balances diffusion.",
    label: "The internal field",
  },
  {
    title: "Change the voltage.\nChange the balance.",
    theory:
      "Connect P to negative and N to positive. Reverse bias draws majority carriers away, widening the barrier. Forward bias does the opposite.",
    label: "Introducing a bias",
  },
  {
    title: "A wider gap.\nA stronger field.",
    theory:
      "Increase reverse bias to expose more fixed ions. The depletion region widens and the peak electric field rises with it.",
    label: "The depletion region",
  },
];
