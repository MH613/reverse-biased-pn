import * as THREE from 'three';

const media = matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set();
media.addEventListener('change', () => listeners.forEach((draw) => draw()));

// Map authored drawing inks, keeping the original palette intact in light mode.
const dark = new Map(Object.entries({
  ffffff: '22272f', 111111: 'e3e6eb', 999999: '95a1b2',
  e8e8e8: '404b5b', f3f3f3: '303946', f2f2f2: '151a21',
  f6d5da: '59333f', fdecef: '49333d', e8f0fc: '30445e',
  fbefd6: '544428', cccccc: '657186', d4d4d4: '707d90',
  d9485f: 'ed8e9e', '2f6fd6': '83b1f3', c98a12: 'e1b358',
  '13896f': '6dcdb2', '7a4cc2': 'bd9be9', e8590c: 'f3a474',
}));
export function themeColor(value) {
  const color = new THREE.Color(value);
  const key = color.getHexString();
  return media.matches ? `#${dark.get(key) ?? key}` : `#${key}`;
}
export function onThemeChange(draw) { listeners.add(draw); }

/** Repaint materials on first render, a device-theme change, or added equipment. */
export function themeScene(scene, renderer, { opaque = false } = {}) {
  const originals = new WeakMap(), vertices = new WeakMap(), objects = new WeakSet();
  let dirty = true;
  onThemeChange(() => { dirty = true; });
  return () => {
    if (!dirty) return;
    scene.traverse((object) => {
      if (!objects.has(object)) {
        objects.add(object);
        object.addEventListener('childadded', () => { dirty = true; });
      }
      for (const material of [object.material].flat().filter(Boolean)) {
        // Canvas textures draw their own themed labels and must retain white tint.
        if (!material.color || material.map || material.vertexColors) continue;
        if (!originals.has(material)) originals.set(material, material.color.getHex());
        material.color.set(themeColor(originals.get(material)));
      }
      const colors = object.geometry?.getAttribute('color');
      if (colors) {
        if (!vertices.has(colors)) vertices.set(colors, colors.clone());
        const original = vertices.get(colors), color = new THREE.Color();
        for (let i = 0; i < colors.count; i++) {
          color.fromBufferAttribute(original, i);
          color.set(themeColor(color));
          colors.setXYZ(i, color.r, color.g, color.b);
        }
        colors.needsUpdate = true;
      }
    });
    if (scene.fog) scene.fog.color.set(themeColor(0xffffff));
    if (opaque) renderer.setClearColor(themeColor(0xffffff));
    dirty = false;
  };
}
