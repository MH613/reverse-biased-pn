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
export const stages = [
  {
    label: "The PN junction",
    eyebrow: "01 / THE BUILDING BLOCK",
    title: ["Two materials.", "One junction."],
    description:
      "A small boundary. An extraordinary effect. Discover what happens when two types of semiconductor meet.",
    insight: "It starts with an imbalance.",
    detail:
      "P-type silicon has an abundance of holes. N-type silicon has an abundance of electrons. At their boundary, a new kind of balance begins.",
  },
  {
    label: "An internal electric field",
    eyebrow: "02 / FINDING EQUILIBRIUM",
    title: ["A field forms.", "Balance follows."],
    description:
      "Carriers cross the junction and recombine, leaving behind a region of fixed, charged ions.",
    insight: "Diffusion creates its own opposition.",
    detail:
      "Exposed donor ions on the N side and acceptor ions on the P side create a field from N to P. The resulting drift balances diffusion at equilibrium.",
  },
  {
    label: "Introducing a bias",
    eyebrow: "03 / AN EXTERNAL INFLUENCE",
    title: ["A little voltage.", "A bigger barrier."],
    description:
      "Connect P to negative and N to positive. Reverse bias pulls majority carriers away from the junction.",
    insight: "Polarity changes everything.",
    detail:
      "Reverse bias reinforces the built-in field and widens the depletion region. Forward bias lowers the barrier, allowing majority carriers to cross more readily.",
  },
  {
    label: "The changing depletion region",
    eyebrow: "04 / MAKING THE CONNECTION",
    title: ["More reverse bias.", "More room between."],
    description:
      "Increase the reverse voltage. Watch the depletion region widen and the internal electric field grow.",
    insight: "The boundary is not fixed.",
    detail:
      "As carriers retreat, more fixed ions are exposed. The depletion width and peak field increase together—approximately with the square root of the total junction potential.",
  },
];
