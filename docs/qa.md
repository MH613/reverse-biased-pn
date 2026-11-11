# Current integration QA

The main four-stage React/TypeScript presentation keeps its existing visuals, physics, graph animation, navigation and reduced-motion behavior. The public Laboratory destination has been replaced by the teammate's question and measurement slides, and the reading page has been added with its recap/quiz section removed.

The imported content runs in separate documents with original styles and simulation modules. Unchanged source modules are checked using SHA-256 hashes in `teammate-source.json`; integration boundaries are documented in `teammate-import.md`.

The host header has Laboratory on the left, Overview / The explanation centered, and Read as a page on the right, without the old brand. Mobile navigation uses two rows. The embedded laboratory stacks its original content on narrow screens so its controls can be reached by scrolling.

Validation covers production compilation, presentation regression tests, question and ammeter interactions, manual and automatic wiring, current limiting, removed laboratory graph/recording tools and slide labels, keyboard/button continuation from the measurement slide to main stage 3, the reader's equations/figures/open lab and removed recap, and the GitHub Pages base path. Core vendor libraries and fonts are served locally from pinned dependencies. AR camera and hardware behavior is not part of the laboratory test scope.

Overview omits its eyebrow, subtitle and bottom bar; presentation stages retain their playback/replay/fullscreen controls.

The original `src/lab/` code and its pure geometry/circuit/model tests are retained as reference code; the public entry uses `public/teammate/guide/`.

Device-theme checks cover text and graph contrast, mobile widths, live light/dark changes, WebGL materials and display textures, and preservation of voltage, wiring and reader state. The imported guide uses a content-hashed directory so its HTML, CSS and modules update together after deployment.
