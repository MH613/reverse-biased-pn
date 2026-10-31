# Final integration and quality assurance

The application remains a frontend-only React/TypeScript exhibit with locally bundled Inter fonts, monochrome SVG engineering illustrations, four presentation stages, and an interactive circuit laboratory. No backend, external scientific API, WebGL context, or runtime font download is required.

## Final changes

- The overview reads **The PN junction.** It stacks the heading and short introduction, centered semiconductor, and discovery button/scroll cue vertically. Height-aware framing keeps equipment clear of text and controls. The same mounted SVG scales and translates into the explanation, retaining the existing spring camera and restrained chapter choreography.
- Reset circuit now restores the original equipment layout and fits the camera, as well as clearing connections, selection and voltage. Geometry changes behind a 120 ms workspace fade instead of sweeping equipment through one another. Electrical state returns to equilibrium immediately. Reduced motion restores the layout directly. Active gestures and settling frames are cancelled before reset, and a lab exit during reset retains the restored layout.
- The modal laboratory contains keyboard focus and restores focus to its entry button on exit. Its model/units disclosure remains in the tab sequence. Active presentation navigation is identified semantically and stage changes have a short screen-reader announcement. Secondary controls, graph axes and metadata use darker gray text for readability.
- Independent 2 V numerical fixtures and operating-point checks join the existing 0, 5 and 10 V cases. Integration regressions cover overview separation, lab access from all four stages, stage/bias restoration, retained connected bias, keyboard focus wrapping, rapid voltage requests, and full reset persistence.

## Architecture and physics review

SVG models use one axonometric projection, keeping source, ammeter, junction, ports, grid and axis-aligned wires consistent. Circuit topology is separate from equipment geometry: moving a device never rewires it. Obstacle-aware routes reserve space for other terminals and wires, reuse clear paths, and interpolate interior control points with terminal anchors updated directly. Collision-aware pointer motion tracks the cursor in world coordinates; grid settling and camera easing are separate from direct dragging.

A single applied-voltage scalar generates each immutable simulation snapshot. All quantitative widths, field values, current, graphs, instruments and depletion geometry derive from that snapshot. Only voltage is interpolated; derived quantities have no independent spring that could contradict the physics. Fixed graph axes and stable SVG nodes avoid rebuilding plots or changing scale during slider input. Memoized scientific panels avoid camera-only rerenders; idle animation loops stop. See [motion.md](motion.md) for the measured Phase 4 frame timings and their qualifications.

The model is a uniformly doped abrupt silicon junction at 300 K under the depletion approximation. NA = 10¹⁶ cm⁻³ and ND = 2 × 10¹⁶ cm⁻³ give Vbi = 0.732236392752 V and xp = 2 xn. Depletion widths and peak field follow the documented SI equations. Field vectors point N → P; the graph shows nonnegative magnitude, with unequal slopes set by the doping ratio. Its area equals Vbi + VR. The width curve follows a square root.

| Reverse voltage | Total width | P-side width | N-side width | Peak field | Net terminal current, P → N |
| --- | --- | --- | --- | --- | --- |
| 0 V | 0.376876 µm | 0.251251 µm | 0.125625 µm | 38.8582 kV/cm | exactly 0 |
| 2 V | 0.728001 µm | 0.485334 µm | 0.242667 µm | 75.0614 kV/cm | −1.22537 fA |
| 5 V | 1.054471 µm | 0.702981 µm | 0.351490 µm | 108.7225 kV/cm | −1.22537 fA |
| 10 V | 1.442839 µm | 0.961893 µm | 0.480946 µm | 148.7656 kV/cm | −1.22537 fA |

The tiny current is the ideal long-base diffusion contribution, with exact zero-bias cancellation and a near-constant reverse plateau. There is no invented avalanche rise in the allowed 0–10 V range. Current entering the ammeter's IN terminal is positive; reversing the meter reverses its sign. Invalid circuits have zero applied bias/current and equilibrium internal width/field. See [physics.md](physics.md) for all parameters, equations, unit conversions and exclusions.

## Verification

Final results: **production build passed; all 20 automated tests passed in approximately one minute; production-preview smoke passed with no JavaScript errors or failed resources.** `git diff --check` passed.

`npm run build` checks strict TypeScript and produces the production bundle. `npm test` runs 20 Playwright tests, including pure numerical/topology/routing checks and Chromium interactions:

- All four stages, pause/resume, replay, skip, reverse/forward contrast, stage-four voltage, persistent SVG camera, arrow/wheel navigation, fullscreen entry/exit, lab entry/return and restored focus.
- Actual terminal wiring via pointer and keyboard; forward-polarity rejection; open, short, branch and ammeter-bypass detection; both valid series-meter positions; disconnection and voltage locking; retained layout and live circuit on return.
- Pointer dragging at multiple zooms, panning, grid alignment, collision avoidance including swept fast motion, connected equipment movement, wire anchor alignment, separate axis-aligned routes across distinct layouts and cached rerouting.
- Dynamic reduced-motion preferences, cancellation of held pointer capture on mode changes, terminal hover feedback, rapid voltage reversals, full reset of layout/electrical state, and reset persistence after reopening.
- Independent 0/2/5/10 V references, 1,000-point monotonic sweep, charge neutrality, piecewise Poisson slopes, triangle area, current plateau and pre-breakdown field margin. Actual graph points, cross-section boundaries, isometric geometry and instrument text agree with the model, including sampled intermediate interpolation frames.
- Vertical overview separation at 320×568, 390×844, 844×390, 1024×768, 1366×768, 1440×900 and 1920×1080; desktop/projector viewport fit; mobile overflow checks; grayscale and locally bundled Inter.

A Chromium screenshot review covered all four stages and the connected 10 V laboratory, including the scrolled scientific panel, at 1440×960, 1024×768, 390×844 and 844×390. A production-preview smoke check exercises all stages, a connected 0/2/5/10 V circuit, reset and return. The automated browser runs collect JavaScript errors in the principal workflows.

## Remaining limits

- This is a quasistatic educational depletion model, not a full drift–diffusion, transient, thermal, avalanche or commercial diode simulation. Leakage mechanisms beyond ideal diffusion are excluded; real leakage may be much larger. Introductory carrier formation and sparse current pulses are explanatory, not calibrated particle trajectories or speeds. The brief forward-bias comparison does not model forward current.
- Equipment, lattice marks and terminals are schematic. Quantitative plotted coordinates, depletion geometry and measurements use the documented fixed physical scale.
- Arbitrarily crowded or electrically invalid wire layouts may still require crossings; thin white casings distinguish them. The router provides separated noncrossing paths for tested valid arrangements without promising every possible placement is planar.
- Lab sessions persist while navigating inside the application, not across browser refreshes. Very short displays scroll; small screens use a scrollable scientific panel and smaller equipment, with explicit zoom/fit controls.
- Browser automation and visual inspection used Chromium in the managed Linux environment. Other browser engines, physical touch devices, screen-reader speech output and every projector/GPU have not been tested. Headless timing observations are not a universal 60 FPS guarantee.
