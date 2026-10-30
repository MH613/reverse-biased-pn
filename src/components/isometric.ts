// One world coordinate system for the junction, instruments, wires, and grid.
export type WorldPoint = readonly [number, number, number];
export const project = (x: number, y: number, z = 60): [number, number] => [
  190 + x * 0.96 + y * 0.7,
  265 + x * 0.27 - y * 0.5 - z,
];
export const points = (coords: readonly (readonly number[])[]) =>
  coords
    .map(([x, y, z]) => project(x, y, z))
    .map((p) => p.join(","))
    .join(" ");
export const wirePath = (coords: readonly WorldPoint[]) =>
  coords.map(([x, y, z], i) => `${i ? "L" : "M"}${project(x, y, z)}`).join(" ");
