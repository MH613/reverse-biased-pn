# Junction

An interactive field guide to PN junctions. The presentation explains reverse bias through synchronized isometric geometry, charge, field, and energy profiles. An interactive circuit laboratory provides a separate quantitative abrupt-junction experiment.

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

**Effect of Reverse Bias on the Depletion Width and Electric-Field Profile of a PN Junction** follows four stages:

1. **Equilibrium:** equally doped abrupt junction, fixed ionic charge, and signed electric-field profiles under the depletion approximation.
2. **Applying bias:** reverse voltage (0–10 V) synchronizes isometric depletion boundaries, space charge, electric field, energy bands, and measurements. A 0.40 V forward-bias comparison shows the opposite trend without modeling injected current.
3. **Breakdown:** schematic avalanche multiplication and Zener band-to-band tunneling. These mechanism views do not calculate breakdown voltage or current.
4. **Graded doping:** symmetric linearly graded junction with charge, field, and electrostatic-potential graphs, plus its own reverse-voltage control.

Graph cards use fixed physical axes and optional equilibrium overlays. Variables in displayed expressions expose definitions on hover, focus, or tap; Model & sources contains assumptions, parameter choices, and textbook page references without derivations. The presentation uses its own equal-doping/graded models; the laboratory retains its asymmetric abrupt junction.

Navigate with the arrow keys, on-screen controls, deliberate desktop wheel gestures, or horizontal mobile swipes. Space pauses animation, replay restarts its reveal, and skip completes the reveal. Voltage changes are intentional slider interactions, rather than an automatic voltage sweep. Fullscreen uses the browser API. Mobile and short displays scroll to keep charts readable; desktop/projector layouts fit the viewport. Reduced motion removes camera travel, particle animation, and graph reveals. Laboratory sessions persist when returning to the presentation.

## Laboratory

Open **Laboratory** from any presentation stage. The lab uses the same monochrome SVG models and isometric projection as the presentation.

- **Move (V):** drag equipment to rearrange it. It follows the pointer without a drag spring; a translucent ghost previews the nearest valid 40-unit grid position. Release to settle into place. Swept contact checks prevent equipment overlap even during fast dragging; movement slides along an obstructing instrument. Select an instrument and use arrow keys to move it by one grid cell.
- **Wire (W):** choose a terminal, then a terminal on another instrument. A live dashed preview follows the pointer. Escape cancels. Select a wire and use Delete/Backspace or the Delete wire button to disconnect it. Electrical terminals are also keyboard accessible.
- **Inspect (I):** select a device to see its function and properties. The PN module opens an enlarged semiconductor cross-section.
- Drag empty grid to pan. Scroll to zoom around the cursor, or use the camera buttons and Fit workspace. Keyboard +/− zooms and 0 fits the workspace. Instrument movement and terminal coordinates account for camera zoom and pan.
- Toggle optional connection hints. Reset circuit clears connections and voltage, restores the original equipment layout, and refits the camera. The layout changes during a brief workspace fade; reduced motion restores it directly. Mode changes and Escape release active pointer capture safely. Returning to the presentation and reopening the lab retains the session; refreshing the page starts a new one.

A suggested reverse-bias loop is **Supply + → Ammeter IN → Ammeter OUT → Junction N → Junction P → Supply −**, where the ammeter and junction provide their own internal links. The ammeter may be in either leg, but must be in series. Circuit validation follows the actual terminal graph, checks polarity, and diagnoses missing connections, branches, supply shorts, and a bypassed ammeter. Moving equipment never changes this graph. Supply adjustment (0–10 V) unlocks only for a valid reverse-bias circuit and resets to zero when it becomes invalid.

The lab now computes the actual depletion solution and ideal reverse diffusion current. Once wired correctly, use the voltage control to explore 0–10 V. The source, ammeter, isometric depletion boundaries, two scientific graphs, flat cross-section, and subtle conventional-current pulses share one applied-voltage state. The voltage control stays available while scrolling the scientific panel. Disconnecting immediately returns every view to equilibrium and disables voltage.

The field graph has a toggleable equilibrium reference. The width graph covers the full 0–10 V range. Both use fixed, labeled physical axes. The ammeter’s sign follows its IN/OUT orientation; ideal leakage saturates near 1.225 fA and is exactly zero at zero bias.

See [the physical model, fixed parameters, units, assumptions, and numerical reference table](docs/physics.md). No breakdown, displacement-current or transient drift–diffusion behavior is invented. The final integration pass verifies all four stages, retained lab sessions, complete reset, keyboard focus containment, responsive composition, and model agreement at 0, 2, 5 and 10 V.

See [the final QA report and known limits](docs/qa.md), and [the Phase 4 motion audit and profiling observations](docs/motion.md) for routing, animation, performance and reduced-motion details.

## Architecture and scientific scope

- `src/state/presentation.ts`: presentation context and four scientific stage definitions.
- `src/presentation/LessonPanel.tsx`: synchronized scientific cards, band diagrams, breakdown illustrations, accessible variable definitions, and source information.
- `src/physics/lesson.ts`: symmetric abrupt and graded presentation electrostatics in SI units, including the graded equilibrium solve.
- `src/components/Junction.tsx`: reusable axonometric SVG geometry, lattice, contacts, moving carriers, exposed ions, field arrows, wires, and DC source.
- `src/components/isometric.ts`: shared world projection for the junction, grid, instrument, and straight wire routes.
- `src/components/VoltageSource.tsx`: DC source drawn on the same isometric axes as the junction.
- `src/main.tsx`: presentation shell, persistent scene camera, spring transitions, playback, navigation, and retained laboratory session.
- `src/hooks/usePresentationMotion.ts`: one animation clock and continuous depletion-width interpolation.
- `src/lab/circuit.ts`: geometry-independent terminal graph and validation.
- `src/lab/geometry.ts`: grid placement, collision checks, terminal locations, and continuous wire routing.
- `src/lab/routing.ts`: obstacle-aware multi-wire planning with terminal clearance and stable route reuse.
- `src/lab/useWireRoutes.ts`: orthogonal route interpolation with live terminal anchors.
- `src/lab/Laboratory.tsx`: lab interactions, camera, instrument depth order, session state, and controls. Artwork and grid are memoized; pointer updates are coalesced per animation frame.
- `src/physics/model.ts`: pure SI silicon physics and unit conversions.
- `src/physics/useJunctionSimulation.ts`: one interpolated applied voltage and coherent derived snapshot.
- `src/physics/ScientificPanel.tsx`: stable SVG field/width graphs and a physical cross-section.
- `src/style.css`: visual tokens, responsive composition, typography, focus states, and reduced-motion styling.

The equipment and lattice marks are schematic. Quantitative spatial axes, depletion boundaries, numerical measurements and graph profiles follow the documented SI model. Carrier motion and breakdown illustrations are schematic; they are not transient transport or breakdown solvers.

## GitHub Pages deployment

The repository includes `.github/workflows/deploy.yml`, which builds and deploys on pushes to `main`, or manually from the Actions tab. In GitHub, select **Settings → Pages → Build and deployment → Source → GitHub Actions** once. The intended public URL is https://mh613.github.io/reverse-biased-pn/.

Production builds use `/reverse-biased-pn/` as Vite's base path, including bundled assets and the favicon. Development and its tests remain at `/`. After `npm run build`, `npm run preview` serves the production site at `http://localhost:4173/reverse-biased-pn/`.

If the first workflow runs before Pages is enabled, enable it and then use **Actions → Deploy to GitHub Pages → Run workflow** with branch `main`.
