import { project, wirePath, type WorldPoint } from "../components/isometric";
import { owner, type InstrumentId, type TerminalId } from "./circuit";
export interface Position {
  x: number;
  y: number;
}
export type Positions = Record<InstrumentId, Position>;
export const STEP = 40;
export const EQUIPMENT_CLEARANCE = 32;
export const instruments: Record<
  InstrumentId,
  {
    name: string;
    width: number;
    depth: number;
    scale: number;
    origin: WorldPoint;
    description: string;
  }
> = {
  supply: {
    name: "DC bench supply",
    width: 200,
    depth: 120,
    scale: 1,
    origin: [360, -260, -4],
    description:
      "Sets the circuit’s DC voltage. Its positive and negative terminals define the applied polarity.",
  },
  junction: {
    name: "PN junction",
    width: 240,
    depth: 120,
    scale: 0.45,
    origin: [-26, -18, -25],
    description:
      "P-type and N-type silicon meet at a depletion region. Connect N toward positive and P toward negative for reverse bias.",
  },
  ammeter: {
    name: "Digital ammeter",
    width: 200,
    depth: 120,
    scale: 1,
    origin: [360, -260, -4],
    description:
      "Measures conventional current entering IN and leaving OUT. The ideal reverse current is very small; reversing the meter leads changes its sign.",
  },
};
export const initialPositions: Positions = {
  supply: { x: -360, y: -80 },
  junction: { x: 160, y: 120 },
  ammeter: { x: 0, y: -240 },
};
export const localPorts: Record<TerminalId, WorldPoint> = {
  "supply:negative": [387, -260, 10],
  "supply:positive": [507, -260, 10],
  "junction:p": [0, 0, 36],
  "junction:n": [480, 0, 36],
  "ammeter:in": [387, -260, 10],
  "ammeter:out": [507, -260, 10],
};
export function terminalPoint(
  terminal: TerminalId,
  positions: Positions,
): WorldPoint {
  const id = owner(terminal),
    info = instruments[id],
    p = localPorts[terminal];
  return [
    positions[id].x + (p[0] - info.origin[0]) * info.scale,
    positions[id].y + (p[1] - info.origin[1]) * info.scale,
    (p[2] - info.origin[2]) * info.scale,
  ];
}
export function unproject(screenX: number, screenY: number): Position {
  const x = screenX - 190,
    y = screenY - 265,
    det = 0.96 * -0.5 - 0.7 * 0.27;
  return { x: (-0.5 * x - 0.7 * y) / det, y: (0.96 * y - 0.27 * x) / det };
}
export function footprint(position: Position, id: InstrumentId, pad = 0) {
  const { width, depth } = instruments[id];
  const { x, y } = position;
  return [
    [x - pad, y - pad, 0],
    [x + width + pad, y - pad, 0],
    [x + width + pad, y + depth + pad, 0],
    [x - pad, y + depth + pad, 0],
  ] as WorldPoint[];
}
export function isValidPlacement(
  id: InstrumentId,
  p: Position,
  positions: Positions,
) {
  const a = instruments[id];
  if (p.x < -960 || p.y < -960 || p.x + a.width > 960 || p.y + a.depth > 960)
    return false;
  return (Object.keys(instruments) as InstrumentId[]).every((other) => {
    if (other === id) return true;
    const q = positions[other],
      b = instruments[other];
    return (
      p.x + a.width + EQUIPMENT_CLEARANCE <= q.x + 1e-6 ||
      q.x + b.width + EQUIPMENT_CLEARANCE <= p.x + 1e-6 ||
      p.y + a.depth + EQUIPMENT_CLEARANCE <= q.y + 1e-6 ||
      q.y + b.depth + EQUIPMENT_CLEARANCE <= p.y + 1e-6
    );
  });
}
export function nearestPlacement(
  id: InstrumentId,
  p: Position,
  positions: Positions,
): Position {
  const base = {
    x: Math.round(p.x / STEP) * STEP,
    y: Math.round(p.y / STEP) * STEP,
  };
  if (isValidPlacement(id, base, positions)) {
    const reached = moveWithCollisions(id, p, base, positions);
    if (Math.hypot(reached.x - base.x, reached.y - base.y) < 0.001) return base;
  }
  let best: Position | undefined,
    bestDistance = Infinity;
  for (let radius = 1; radius <= 16; radius++) {
    for (let dx = -radius; dx <= radius; dx++)
      for (let dy = -radius; dy <= radius; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const q = { x: base.x + dx * STEP, y: base.y + dy * STEP },
          distance = Math.hypot(q.x - p.x, q.y - p.y);
        if (distance >= bestDistance || !isValidPlacement(id, q, positions))
          continue;
        const reached = moveWithCollisions(id, p, q, positions);
        if (Math.hypot(reached.x - q.x, reached.y - q.y) < 0.001) {
          best = q;
          bestDistance = distance;
        }
      }
    if (
      (radius + 1) * STEP -
        Math.max(Math.abs(base.x - p.x), Math.abs(base.y - p.y)) >=
      bestDistance
    )
      break;
  }
  return best ?? positions[id];
}
// Kept for a draft wire only; completed wires use the shared obstacle-aware router.
export function routeWire(
  a: TerminalId,
  b: TerminalId,
  positions: Positions,
  index = 0,
) {
  const p = terminalPoint(a, positions),
    q = terminalPoint(b, positions),
    py = positions[owner(a)].y - 20,
    qy = positions[owner(b)].y - 20;
  const lane = Math.min(py, qy) - 40 - index * 16;
  return wirePath([
    p,
    [p[0], py, p[2]],
    [p[0], py, 0],
    [p[0], lane, 0],
    [q[0], lane, 0],
    [q[0], qy, 0],
    [q[0], qy, q[2]],
    q,
  ]);
}
export const projected = (p: WorldPoint) => project(...p);

/** Swept AABB contact and sliding; never teleport through an obstacle between pointer events. */
export function moveWithCollisions(
  id: InstrumentId,
  from: Position,
  target: Position,
  positions: Positions,
): Position {
  const size = instruments[id];
  let p = { ...from },
    delta = {
      x: Math.max(-960, Math.min(960 - size.width, target.x)) - from.x,
      y: Math.max(-960, Math.min(960 - size.depth, target.y)) - from.y,
    };
  for (let pass = 0; pass < 3; pass++) {
    let earliest = 1,
      normal: "x" | "y" | null = null;
    for (const other of Object.keys(instruments) as InstrumentId[]) {
      if (other === id) continue;
      const q = positions[other],
        b = instruments[other];
      const low = {
          x: q.x - size.width - EQUIPMENT_CLEARANCE,
          y: q.y - size.depth - EQUIPMENT_CLEARANCE,
        },
        high = {
          x: q.x + b.width + EQUIPMENT_CLEARANCE,
          y: q.y + b.depth + EQUIPMENT_CLEARANCE,
        };
      const times = (axis: "x" | "y") =>
        Math.abs(delta[axis]) < 1e-9
          ? p[axis] > low[axis] + 1e-7 && p[axis] < high[axis] - 1e-7
            ? [-Infinity, Infinity]
            : [Infinity, -Infinity]
          : [
              (low[axis] - p[axis]) / delta[axis],
              (high[axis] - p[axis]) / delta[axis],
            ].sort((a, b) => a - b);
      const tx = times("x"),
        ty = times("y"),
        enter = Math.max(tx[0], ty[0]),
        exit = Math.min(tx[1], ty[1]);
      if (enter < exit && exit > 0 && enter >= -1e-7 && enter < earliest) {
        earliest = Math.max(0, enter);
        normal = tx[0] > ty[0] ? "x" : "y";
      }
    }
    p = { x: p.x + delta.x * earliest, y: p.y + delta.y * earliest };
    if (!normal) break;
    delta = { x: delta.x * (1 - earliest), y: delta.y * (1 - earliest) };
    delta[normal] = 0;
  }
  return p;
}
