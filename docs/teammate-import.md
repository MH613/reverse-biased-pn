# Teammate application import

Source: `pn-junction-main.zip`, uploaded by the user. Upstream: https://github.com/obadawaleed44/pn-junction. The reading-page source/test-count footer is omitted at the user's request. Original files are under `public/teammate/`.

## Preserved content

- `guide/index.html`, articles with `data-scene="4"` and `data-scene="5"`: “04 · The question” and “05 · Measure it”. The vote, ammeter prompt and measurement content are preserved; the two slide number labels are removed.
- `guide/page.html`: the original reading page with the recap/quiz section and its table-of-contents link removed. The remaining Open lab section is renumbered 06; all remaining interactive controls and internal links are retained.
- Guide stylesheets and drawing, physics and bench modules are unchanged. Lab controls and the reader controller have the small adaptations documented below. SHA-256 checks in `teammate-source.json` and browser tests verify this against the uploaded archive.
- The original companion XR assets and pages are included to preserve links from the reader. AR camera/hardware behavior is outside the lab integration tests.

## Integration-only adaptations

- HTML resource URLs point to locally generated vendor assets instead of CDNs. Exact library versions are pinned in `package-lock.json`; IBM Plex fonts retain their original families, weights and styles. Dependency licenses are copied into the vendor output.
- The presentation controller recognizes `?embedded=lab&scene=5`. In that mode it starts at original scene index 4, exposes indices 4–5, hides unrelated navigation dots and disables Previous at the question. Advancing from measurement posts an origin-checked, source-checked message to the host, which opens main presentation stage 3. The right key, PageDown and Next button use the same transition; native input keys retain their slider behavior. The standalone copied presentation retains its original navigation.
- `guide/css/embed.css` hides the duplicated presentation brand and reading link because the host header supplies navigation. Its scientific color legend remains. On narrow embedded screens, the original question and bench are stacked and scrollable so the controls remain reachable; desktop slide styling is unchanged.
- Embedded labs pass `recording: false` to `createLab`, which omits the small I–V graph and Record point button, skips chart drawing, and changes the measurement hint. Reader benches retain their original chart and recording tools. The reader controller omits the removed quiz initialization.
- `ImportedView` frames each view independently, at a base-relative URL that works on GitHub Pages. The reader URL includes a content hash generated before dev/build so an earlier HTML copy cached by GitHub Pages cannot retain removed content. Only the active imported document is mounted. The copied reader's home link returns to the host overview; external links open separately. No physics code is shared or reconciled with our original presentation.

## Build and verification

`npm run prepare:teammate` generates ignored vendor files and `src/imported/readerRevision.ts` before `dev` and `build`. Imported sources and necessary images/models are tracked; generated library bundles are not.

Browser coverage includes the question/ammeter/measurement flow, manual jack wiring, automatic wiring, breakdown and current limiting, clearing the circuit, keyboard/button continuation to stage 3, the reader's remaining figures/math/open lab, host navigation alignment, simplified overview, mobile access, and hashes for unchanged original modules. The manifest also retains historical fingerprints of the original reader body, slide text, and adapted controllers. Software WebGL is enabled for the browser tests.
