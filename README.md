# Junction

An interactive field guide to PN junctions. Phases 1 and 2 include the four presentation stages and an interactive isometric circuit-building laboratory. Detailed semiconductor simulation remains reserved for Phase 3.

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

Space pauses and resumes the physics animation. Replay restarts the current stage; skip settles its timeline at the end. The fullscreen control uses the browser's Fullscreen API. The laboratory button opens the circuit-building workspace.

Desktop and projector layouts fit the viewport. Short or narrow displays can scroll to preserve readable content. Reduced-motion preferences remove camera travel and carrier oscillation and shorten text fades.

## Laboratory

Open **Laboratory** from any presentation stage. The lab uses the same monochrome SVG models and isometric projection as the presentation.

- **Move (V):** drag equipment to rearrange it. It follows the pointer without a drag spring; a translucent ghost previews the nearest valid 40-unit grid position. Release to settle into place. Footprints cannot overlap at rest. Select an instrument and use arrow keys to move it by one grid cell.
- **Wire (W):** choose a terminal, then a terminal on another instrument. A live dashed preview follows the pointer. Escape cancels. Select a wire and use Delete/Backspace or the Delete wire button to disconnect it. Electrical terminals are also keyboard accessible.
- **Inspect (I):** select a device to see its function and properties. The PN module opens an enlarged semiconductor cross-section.
- Drag empty grid to pan. Scroll to zoom around the cursor, or use the camera buttons and Fit workspace. Instrument movement and terminal coordinates account for camera zoom and pan.
- Toggle optional connection hints. Reset circuit removes connections and the voltage setpoint while preserving instrument placement. Returning to the presentation and reopening the lab retains the session; refreshing the page starts a new one.

A suggested reverse-bias loop is **Supply + → Ammeter IN → Ammeter OUT → Junction N → Junction P → Supply −**, where the ammeter and junction provide their own internal links. The ammeter may be in either leg, but must be in series. Circuit validation follows the actual terminal graph, checks polarity, and diagnoses missing connections, branches, supply shorts, and a bypassed ammeter. Moving equipment never changes this graph. Supply adjustment (0–5 V) unlocks only for a valid reverse-bias circuit and resets to zero when it becomes invalid.

The lab deliberately shows **— A** rather than fabricating a current measurement. Voltage is a setpoint only. There are no simulated current pulses, voltage-driven carrier dynamics, or scientific graphs in Phase 2. The presentation retains its existing conceptual animations.

## Architecture and scientific scope

- `src/state/presentation.ts`: shared typed presentation state, stage definitions, and a normalized depletion-width selector. This is the boundary for the future physics engine and laboratory state.
- `src/components/Junction.tsx`: reusable axonometric SVG geometry, lattice, contacts, moving carriers, exposed ions, field arrows, wires, and DC source.
- `src/components/isometric.ts`: shared world projection for the junction, grid, instrument, and straight wire routes.
- `src/components/VoltageSource.tsx`: DC source drawn on the same isometric axes as the junction.
- `src/main.tsx`: presentation shell, persistent scene camera, spring transitions, playback, navigation, and future-lab entry point.
- `src/hooks/usePresentationMotion.ts`: one animation clock and continuous depletion-width interpolation.
- `src/lab/circuit.ts`: geometry-independent terminal graph and validation.
- `src/lab/geometry.ts`: grid placement, collision checks, terminal locations, and continuous wire routing.
- `src/lab/Laboratory.tsx`: lab interactions, camera, instrument depth order, session state, and controls. Artwork and grid are memoized; pointer updates are coalesced per animation frame.
- `src/style.css`: visual tokens, responsive composition, typography, focus states, and reduced-motion styling.

The diagrams are conceptual and not to scale. The normalized width follows `W ∝ sqrt(Vbi + Vr)` with an illustrative built-in potential of 0.7 V. No calibrated carrier dynamics, current solver, breakdown model, or circuit simulation is included in Phase 1. Fixed acceptor ions are negative on P; donor ions are positive on N. The internal field arrows point N to P. At equilibrium, electron diffusion is N to P and electron drift is P to N; hole motion is opposite.
