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

The overview opens on a close-up junction. Start the explanation to zoom out into four stages. Navigate with left/right arrows, on-screen controls, or a deliberate wheel gesture on desktop. Horizontal swipes work on mobile; vertical scrolling remains native. Camera movement uses damped springs and keeps one SVG junction mounted when returning to the overview or moving between stages.

Each stage presents a heading and one short theory paragraph. The design is entirely grayscale, with locally bundled Inter typography. Open circles with plus signs represent holes, filled circles with minus signs represent electrons, and faint signed lattice circles represent fixed ions. Select P/N material for a short, dismissible explanation. Compare forward/reverse bias in stage 3 and adjust reverse voltage in stage 4. The voltage source shares the junction’s isometric axes; its wires follow the ground grid with straight segments. There are no field graphs.

Space pauses and resumes the physics animation. Replay restarts the current stage; skip settles its timeline at the end. The fullscreen control uses the browser's Fullscreen API. The laboratory button opens an informational dialog only.

Desktop and projector layouts fit the viewport. Short or narrow displays can scroll to preserve readable content. Reduced-motion preferences remove camera travel and carrier oscillation and shorten text fades.

## Architecture and scientific scope

- `src/state/presentation.ts`: shared typed presentation state, stage definitions, and a normalized depletion-width selector. This is the boundary for the future physics engine and laboratory state.
- `src/components/Junction.tsx`: reusable axonometric SVG geometry, lattice, contacts, moving carriers, exposed ions, field arrows, wires, and DC source.
- `src/components/isometric.ts`: shared world projection for the junction, grid, instrument, and straight wire routes.
- `src/components/VoltageSource.tsx`: DC source drawn on the same isometric axes as the junction.
- `src/main.tsx`: presentation shell, persistent scene camera, spring transitions, playback, navigation, and future-lab entry point.
- `src/hooks/usePresentationMotion.ts`: one animation clock and continuous depletion-width interpolation.
- `src/style.css`: visual tokens, responsive composition, typography, focus states, and reduced-motion styling.

The diagrams are conceptual and not to scale. The normalized width follows `W ∝ sqrt(Vbi + Vr)` with an illustrative built-in potential of 0.7 V. No calibrated carrier dynamics, current solver, breakdown model, or circuit simulation is included in Phase 1. Fixed acceptor ions are negative on P; donor ions are positive on N. The internal field arrows point N to P. At equilibrium, electron diffusion is N to P and electron drift is P to N; hole motion is opposite.
