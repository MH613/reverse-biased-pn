# Junction

An interactive field guide to PN junctions. Phase 1 includes four presentation stages; the circuit-building laboratory is intentionally reserved for later phases.

## Develop

Use Node.js 22 or newer. From the repository root:

```sh
npm ci
npm run dev
```

Vite listens on port 5173. Use the existing checkout in cloud tasks; no extra worktree is needed.

```sh
npm run build
npm run preview
npm test
```

Browser tests use Chromium at `/usr/bin/chromium` and automatically start Vite when necessary. Fonts are bundled locally, and the app requires no API keys or backend.

## Presentation

Navigate with the left/right arrows, stage indicators, or chapter buttons. Space pauses and resumes motion. Replay restarts the current stage; skip settles its animation at the end. The fullscreen control uses the browser's Fullscreen API. Inspect P/N materials or legend entries, toggle illustration layers, compare bias polarities in stage 3, and adjust reverse voltage in stage 4. The laboratory button opens an informational dialog only.

Desktop layouts fit the viewport at standard presentation sizes. Mobile layouts scroll to preserve readable content. System reduced-motion preferences suppress carrier oscillation and decorative transitions.

## Architecture and scientific scope

- `src/state/presentation.ts`: shared typed presentation state, stage definitions, and a normalized depletion-width selector. This is the boundary for the future physics engine and laboratory state.
- `src/components/Junction.tsx`: reusable axonometric SVG geometry, lattice, contacts, moving carriers, exposed ions, field arrows, wires, and DC source.
- `src/components/FieldProfile.tsx`: synchronized SVG field-magnitude diagram.
- `src/main.tsx`: presentation shell, one requestAnimationFrame clock, continuous depletion-width interpolation, playback, navigation, and future-lab entry point.
- `src/style.css`: visual tokens, responsive composition, typography, focus states, and reduced-motion styling.

The diagrams are conceptual and not to scale. The symmetric triangular field profile assumes an abrupt junction with equal doping on both sides. The normalized width follows `W ∝ sqrt(Vbi + Vr)` with an illustrative built-in potential of 0.7 V. No calibrated carrier dynamics, current solver, breakdown model, or circuit simulation is included in Phase 1. Fixed acceptor ions are negative on P; donor ions are positive on N. The internal field points N to P; its magnitude is plotted as a positive triangle. At equilibrium, electron diffusion is N to P and electron drift is P to N; hole motion is opposite.
