// Serve the copied app's pinned dependencies locally, with their original fonts.
import { copyFile, mkdir, readFile, writeFile, cp, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve("node_modules"),
  out = path.resolve("public/teammate/vendor");
async function copy(src, dest) {
  await mkdir(path.dirname(dest), { recursive: true });
  await copyFile(src, dest);
}
const copied = new Set();
async function three(file) {
  if (copied.has(file)) return;
  copied.add(file);
  const src = path.join(root, "three", file),
    dest = path.join(out, "three", file);
  await copy(src, dest);
  const source = await readFile(src, "utf8");
  for (const match of source.matchAll(
    /(?:from\s*|import\s*)['"](\.[^'"]+\.js)['"]/g,
  ))
    await three(
      path.posix.normalize(path.posix.join(path.posix.dirname(file), match[1])),
    );
}
for (const file of [
  "build/three.module.js",
  "examples/jsm/controls/OrbitControls.js",
  "examples/jsm/environments/RoomEnvironment.js",
  "examples/jsm/postprocessing/EffectComposer.js",
  "examples/jsm/postprocessing/RenderPass.js",
  "examples/jsm/postprocessing/UnrealBloomPass.js",
  "examples/jsm/postprocessing/OutputPass.js",
])
  await three(file);
await copy(path.join(root, "three/LICENSE"), path.join(out, "three/LICENSE"));
for (const file of [
  "katex.min.js",
  "katex.min.css",
  "contrib/auto-render.min.js",
])
  await copy(
    path.join(root, "katex/dist", file),
    path.join(out, "katex", file),
  );
await cp(path.join(root, "katex/dist/fonts"), path.join(out, "katex/fonts"), {
  recursive: true,
});
await copy(path.join(root, "katex/LICENSE"), path.join(out, "katex/LICENSE"));
await copy(
  path.join(root, "qrcode-generator/qrcode.js"),
  path.join(out, "qrcode.js"),
);
await copy(
  path.join(root, "qrcode-generator/README.md"),
  path.join(out, "qrcode-LICENSE.txt"),
);
let fonts = "";
for (const [family, styles] of [
  ["ibm-plex-sans", ["400", "500", "600", "400-italic"]],
  ["ibm-plex-mono", ["400", "500"]],
]) {
  for (const style of styles) {
    const dir = path.join(root, "@fontsource", family);
    let css = await readFile(path.join(dir, `${style}.css`), "utf8");
    for (const match of css.matchAll(/url\((?:['"])?\.\/([^)'"\s]+)/g))
      await copy(path.join(dir, match[1]), path.join(out, family, match[1]));
    css = css.replaceAll("./files/", `./${family}/files/`);
    fonts += css + "\n";
  }
  await copy(
    path.join(root, "@fontsource", family, "LICENSE"),
    path.join(out, family, "LICENSE"),
  );
}
await writeFile(path.join(out, "plex.css"), fonts);
// Version the complete imported guide, including its CSS and module imports.
const guideHash = createHash("sha256");
async function hashGuide(dir) {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await hashGuide(file);
    else guideHash.update(file).update(await readFile(file));
  }
}
await hashGuide("public/teammate/guide");
const guideRevision = guideHash.digest("hex").slice(0, 12);
for (const entry of await readdir("public/teammate")) {
  if (/^guide-[a-f0-9]{12}$/.test(entry))
    await rm(path.join("public/teammate", entry), { recursive: true });
}
await cp("public/teammate/guide", `public/teammate/guide-${guideRevision}`, { recursive: true });
await writeFile(
  "src/imported/guideRevision.ts",
  `export const guideRevision = ${JSON.stringify(guideRevision)};\n`,
);
console.log("Prepared teammate renderer, equation fonts, and typefaces.");
