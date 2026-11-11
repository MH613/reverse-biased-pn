# Junction

An interactive field guide to PN junctions. The presentation explains reverse bias through synchronized isometric geometry, charge, field, and energy profiles. An imported circuit laboratory and reading page preserve a teammate’s original exercise.

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

Graph cards have square corners, a light gray background, dark muted purple traces, fixed physical axes, and optional equilibrium overlays. Stage 3 mechanism schematics retain their dark background. Junctions use subdued red for P-type regions and holes, and blue for N-type regions and electrons, while equipment and page chrome stay neutral. A subtle continuous oscilloscope sweep highlights the existing traces without changing physical values; pause freezes it, and reduced motion removes it. Wires draw from the voltage source to the junction when entering stages 2 and 4, with replay and skip support. Equilibrium profiles use a closer spatial range (±0.3 µm) and field range (0 to −4 MV/m); bias profiles retain fixed 0–10 V comparison scales. Full width and peak-field equations use 76% of the section title size in semibold Inter typography with stacked fractions, radicals, and variable tooltips. At widths of 1440 px and above, regardless of viewport height, the presentation uses text / junction / stacked graph columns. The graded charge graph sits beneath the text, and breakdown uses four quadrants with horizontal Zener tunneling with a longer electron trajectory and a moving dashed guide beneath it, both fading at the ends, and a repeated 1 → 2 → 4 → 8 impact-ionization sequence. Variables in displayed expressions expose definitions on hover, focus, or tap; Model & sources contains assumptions, parameter choices, and textbook page references without derivations. The presentation uses its own equal-doping/graded models; the imported laboratory uses the teammate’s separate model.

Navigate with the arrow keys, on-screen controls, deliberate desktop wheel gestures, or horizontal mobile swipes. Space pauses animation, replay restarts its reveal, and skip completes the reveal. Voltage changes are intentional slider interactions, rather than an automatic voltage sweep. Fullscreen uses the browser API. Mobile and short displays scroll to keep charts readable; desktop/projector layouts fit the viewport. Reduced motion removes camera travel, particle animation, and graph reveals. Laboratory sessions persist when returning to the presentation.

## Laboratory and reading page

The **Laboratory** button now opens the teammate's original **04 · The question** and **05 · Measure it** from the user-supplied `pn-junction-main.zip`. Choose a guess, bring the ammeter, and put it in series using the copied Wire tool or **Wire it for me**. Supply, ammeter, current plot, and breakdown behavior remain the teammate's original simulation, including the 0–120 V supply and 1 mA current limit. Navigation is restricted to these two slides; opening the lab starts at the question.

**Read as a page** opens the complete original reading page: seven sections, interactive junction figures, equations, quiz, guided bench, and open lab. Its original typography, colors, content, and internal navigation are preserved. Both imported views run in independent documents so their CSS and JavaScript cannot alter the main presentation's appearance. Our header stays available: Laboratory left, Overview / The explanation centered, and Read as a page right. Narrow screens put the centered controls on a second row.

The original page and laboratory use a different parameter set and additional current-generation / breakdown models. They are deliberately not merged into the presentation's physics or restyled to match it. The original reading-page home link returns to our overview. Opening a different header view unloads the imported document and its renderers.

`npm run prepare:teammate` copies pinned Three.js, KaTeX, QR code, IBM Plex Sans and IBM Plex Mono dependencies from `node_modules` to the ignored `public/teammate/vendor/` folder. It runs automatically before development and production builds. The core imported views therefore load their renderers, equations and fonts locally. Supporting AR pages/assets and their original camera-driven links are retained; hardware AR is separate from the imported laboratory.

See [import provenance and integration boundaries](docs/teammate-import.md). The previous lab implementation remains in `src/lab/` for reference; the public Laboratory entry now uses the copied app.

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
