# Teammate application import

Source: `pn-junction-main.zip`, uploaded by the user. The upstream attribution in its reading page is retained. Original files are under `public/teammate/`.

## Preserved content

- `guide/index.html`, articles with `data-scene="4"` and `data-scene="5"`: “04 · The question” and “05 · Measure it”. The original numbering, text, vote, ammeter prompt and measurement content are preserved.
- `guide/page.html`: the entire original body, including all seven sections, interactive controls, quizzes and internal links.
- Guide stylesheets and drawing, physics, bench, lab and reading-page modules are unchanged. SHA-256 checks in `teammate-source.json` and browser tests verify this against the uploaded archive.
- The original companion XR assets and pages are included to preserve links from the reader. AR camera/hardware behavior is outside the lab integration tests.

## Integration-only adaptations

- HTML resource URLs point to locally generated vendor assets instead of CDNs. Exact library versions are pinned in `package-lock.json`; IBM Plex fonts retain their original families, weights and styles. Dependency licenses are copied into the vendor output.
- The presentation controller recognizes `?embedded=lab&scene=5`. In that mode it starts at original scene index 4, clamps navigation to indices 4–5, hides unrelated navigation dots and disables the previous/next controls at the boundaries. The standalone copied presentation retains its original navigation.
- `guide/css/embed.css` hides the duplicated presentation brand and reading link because the host header supplies navigation. Its scientific color legend remains. On narrow embedded screens, the original question and bench are stacked and scrollable so the controls remain reachable; desktop slide styling is unchanged.
- `ImportedView` frames each view independently, at a base-relative URL that works on GitHub Pages. Only the active imported document is mounted. The copied reader's home link returns to the host overview; external links open separately. No physics code is shared or reconciled with our original presentation.

## Build and verification

`npm run prepare:teammate` generates ignored vendor files before `dev` and `build`. Imported sources and necessary images/models are tracked; generated library bundles are not.

Browser coverage includes the question/ammeter/measurement flow, manual jack wiring, automatic wiring, current recording, breakdown and current limiting, clearing the circuit, navigation boundaries, the full reader's figures/math/quiz/open lab, host navigation alignment, mobile access, and exact source-body/module hashes. Software WebGL is enabled for the browser tests.
