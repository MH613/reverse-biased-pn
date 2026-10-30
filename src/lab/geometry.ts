import { project, wirePath, type WorldPoint } from "../components/isometric";
import { owner, type InstrumentId, type TerminalId } from "./circuit";
export interface Position {
  x: number;
  y: number;
}
export type Positions = Record<InstrumentId, Position>;
export const STEP = 40;
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
      p.x + a.width <= q.x + 1e-6 ||
      q.x + b.width <= p.x + 1e-6 ||
      p.y + a.depth <= q.y + 1e-6 ||
      q.y + b.depth <= p.y + 1e-6
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
  const candidates: Position[] = [];
  for (let dx = -16; dx <= 16; dx++)
    for (let dy = -16; dy <= 16; dy++)
      candidates.push({ x: base.x + dx * STEP, y: base.y + dy * STEP });
  candidates.sort(
    (a, b) =>
      Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
  );
  return (
    candidates.find((q) => isValidPlacement(id, q, positions)) ?? positions[id]
  );
}
// Fixed routing topology: continuous coordinates keep wires attached while dragging.
// A common front corridor stays outside all equipment footprints.
export function routeWire(
  a: TerminalId,
  b: TerminalId,
  positions: Positions,
  index = 0,
) {
  const p = terminalPoint(a, positions),
    q = terminalPoint(b, positions);
  const py = positions[owner(a)].y - 24,
    qy = positions[owner(b)].y - 24;
  const corridor =
    Math.min(...Object.values(positions).map((v) => v.y)) - 65 - index * 18;
  return wirePath([
    p,
    [p[0], py, p[2]],
    [p[0], py, 0],
    [p[0], corridor, 0],
    [q[0], corridor, 0],
    [q[0], qy, 0],
    [q[0], qy, q[2]],
    q,
  ]);
}
export const projected = (p: WorldPoint) => project(...p);
