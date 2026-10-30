# Phase 4 motion and interaction audit

The visual identity and Phase 3 SI physics model are preserved. This phase changes interaction mechanics, routing and rendering work. It does not add a new physics model or implement Phase 5.

## Wire routing

The former router sent every connection to a common front corridor. Coincident vertical runs and repeated crossings were an inherent consequence, not a placement mistake.

`src/lab/routing.ts` now builds an orthogonal visibility grid from equipment boundaries, electrical terminal exits and outside clearance lanes. A direction-aware A* search balances path length and bends, strongly penalizes overlapping runs/crossings, and reserves space for terminals needed by subsequent connections. Each wire is routed against the earlier routes. Logical connections still depend exclusively on terminal identities.

Clear existing paths are reused instead of recalculating a new shortest topology on every pointer event. If an instrument blocks a path, another terminal would be covered, or wires conflict, it is replanned. This hysteresis avoids route chatter near equal-length alternatives. There are arrangements with fully separate paths; arbitrary crowded or branched circuits may still need crossings. A restrained white casing distinguishes wires at projected crossings without implying an electrical junction.

Route changes use fixed alternating horizontal/vertical control slots. Only the interior controls are interpolated; leads and endpoints use the current instrument positions on every render. Interpolated edges stay aligned to the isometric axes. Current pulses, visible strokes, casings and hit targets use exactly the same path. Stable route identity and bounded caches prevent resets or growth after deleting/recreating connections.

## Input and placement

- Pointer movement is coalesced once per animation frame. The object is not spring-delayed during free dragging.
- Cursor conversion uses cached workspace bounds and the current camera; the scene entrance uses opacity only, avoiding a temporary transformed parent that would invalidate those coordinates.
- Swept AABB contact checks with clearance prevent fast pointer events from tunnelling through another instrument. Motion slides along the contacted face. A blocked move is identified in the help line and placement ghost.
- Snapping uses a normalized critically damped response over 200 ms, without overshoot. Separate instruments can finish their settling animations independently. A newly obstructed settle finds a safe grid target rather than clipping through equipment.
- Free placement takes a fast nearest-cell path. Nearby blocked cells are searched in bounded rings, not by sorting over a thousand positions on every pointer frame.
- Pointer IDs, capture release, pointer cancellation, Escape, mode changes and window blur are handled explicitly. Closing the lab finalizes valid snapped session positions and cancels its animation work.
- Pan remains direct. Zoom uses non-overshooting exponential interpolation anchored at the cursor, with no extra work at the zoom limit. Fit workspace includes the actual routed wires.

## Choreography and feedback

Shared timing tokens live in `src/motion.ts`: 150 ms feedback, 200 ms snap settling, 220 ms panels and 280 ms view/line entrances. Presentation camera transforms retain their restrained spring motion and the same persistent junction geometry.

Entering/leaving the laboratory crossfades the existing presentation and workspace. The presentation remains mounted, but inert and paused while covered. Body scrolling is locked during the lab, and keyboard focus is restored after the exit commit. Information panels reveal/collapse, terminal hover halos and screen-space labels remain legible across zoom levels, and reset has a short acknowledgement. Connection validity and physical measurements update immediately, independently of these optical effects.

Presentation carrier trajectories run natively in CSS, with deterministic phases and small continuous closed paths. Boundary contact uses a smooth min/max instead of a hard velocity kink. Recombination glyphs fade in progressively. Field arrows are static direction indicators rather than moving dashes that could be mistaken for current. In the quantitative lab, carrier exposure follows the depletion solution; no arbitrary particle transport is added to the depletion approximation.

## Physics and reduced motion

Only the Phase 3 applied-voltage scalar is interpolated. Widths, field, current, graphs and instruments remain derived from the same snapshot. No independent graph or boundary spring was added. Disconnecting/resetting still returns the authoritative state immediately to equilibrium; the acknowledgement animation does not invent a discharge transient.

Reduced motion removes carrier movement/current pulses and uses immediate placement, route and physics updates. Camera operations settle immediately and panel travel is removed; short non-spatial fades remain. Preference changes are observed during physics and route interpolation. Closing an animated view cancels its running input/route/camera work and pauses the hidden presentation.

## Rendering and measurements

The scientific panel, instrument artwork and grid are memoized. Moving or panning does not rebuild scientific graphs or instrument geometry. Presentation React animation work stops once its timeline and voltage settle; native carrier motion can continue without an idle React loop. Animation frame IDs, listeners, timers and deleted route-control entries are cleaned up.

A local headless Chromium development-server sample at 1440 × 960, with a connected 5 V circuit and 80 incremental pointer moves, recorded 266 frame intervals: median **16.7 ms**, 95th percentile **16.7 ms**, with **5 intervals above 25 ms**. These are observations from this execution environment, not a frame-rate guarantee on other hardware. A temporary React commit-hook probe counted **zero idle commits over 600 ms** in both the settled presentation and settled laboratory. Current pulses/native carrier motion remained functional.

Regression coverage includes separate wire routes in multiple equipment layouts, cached routing during rearrangement, rendered orthogonal paths, swept collision handling, cancellation while a pointer is held, focus restoration, reduced motion, multi-zoom placement, endpoint alignment, numerical physics agreement and all presentation stages.
