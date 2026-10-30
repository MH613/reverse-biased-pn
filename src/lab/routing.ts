import { owner, type Connection, type TerminalId } from "./circuit";
import { instruments, terminalPoint, type Positions } from "./geometry";
import { wirePath, type WorldPoint } from "../components/isometric";
export type XY = readonly [number, number];
export interface GroundRoute {
  from: TerminalId;
  to: TerminalId;
  points: XY[];
}
export type RouteMap = Record<string, GroundRoute>;
interface Rect {
  left: number;
  right: number;
  bottom: number;
  top: number;
}
const EPS = 1e-6,
  GAP = 10;
const same = (a: XY, b: XY) =>
  Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) < EPS;
const obstacles = (p: Positions): Rect[] =>
  Object.entries(p).map(([id, v]) => ({
    left: v.x - GAP,
    right: v.x + instruments[id as keyof Positions].width + GAP,
    bottom: v.y - GAP,
    top: v.y + instruments[id as keyof Positions].depth + GAP,
  }));
export const groundPort = (id: TerminalId, p: Positions): XY => [
  terminalPoint(id, p)[0],
  p[owner(id)].y - 20,
];
function blocked(a: XY, b: XY, rects: Rect[]) {
  return rects.some((r) =>
    Math.abs(a[0] - b[0]) < EPS
      ? a[0] > r.left + EPS &&
        a[0] < r.right - EPS &&
        Math.max(a[1], b[1]) > r.bottom + EPS &&
        Math.min(a[1], b[1]) < r.top - EPS
      : a[1] > r.bottom + EPS &&
        a[1] < r.top - EPS &&
        Math.max(a[0], b[0]) > r.left + EPS &&
        Math.min(a[0], b[0]) < r.right - EPS,
  );
}
export function segmentConflict(
  a: XY,
  b: XY,
  c: XY,
  d: XY,
): "overlap" | "cross" | null {
  const av = Math.abs(a[0] - b[0]) < EPS,
    cv = Math.abs(c[0] - d[0]) < EPS;
  if (same(a, b) || same(c, d)) return null;
  if (av === cv) {
    const axis = av ? 1 : 0,
      constant = av ? 0 : 1;
    if (
      Math.abs(a[constant] - c[constant]) < EPS &&
      Math.min(Math.max(a[axis], b[axis]), Math.max(c[axis], d[axis])) -
        Math.max(Math.min(a[axis], b[axis]), Math.min(c[axis], d[axis])) >
        EPS
    )
      return "overlap";
    return null;
  }
  const v = av ? [a, b] : [c, d],
    h = av ? [c, d] : [a, b];
  return v[0][0] >= Math.min(h[0][0], h[1][0]) - EPS &&
    v[0][0] <= Math.max(h[0][0], h[1][0]) + EPS &&
    h[0][1] >= Math.min(v[0][1], v[1][1]) - EPS &&
    h[0][1] <= Math.max(v[0][1], v[1][1]) + EPS
    ? "cross"
    : null;
}
const edges = (p: XY[]) =>
  p
    .slice(1)
    .map((b, i) => [p[i], b] as const)
    .filter(([a, b]) => !same(a, b));
export function routeConflicts(a: XY[], b: XY[]) {
  return edges(a)
    .flatMap(([p, q]) => edges(b).map(([r, s]) => segmentConflict(p, q, r, s)))
    .filter(Boolean);
}
const simplify = (p: XY[]) => {
  const out: XY[] = [];
  for (const point of p) {
    if (out.length && same(out[out.length - 1], point)) continue;
    while (out.length > 1) {
      const a = out[out.length - 2],
        b = out[out.length - 1];
      if (
        (Math.abs(a[0] - b[0]) < EPS && Math.abs(b[0] - point[0]) < EPS) ||
        (Math.abs(a[1] - b[1]) < EPS && Math.abs(b[1] - point[1]) < EPS)
      )
        out.pop();
      else break;
    }
    out.push(point);
  }
  return out;
};
class Heap {
  a: { id: number; score: number }[] = [];
  push(v: { id: number; score: number }) {
    let i = this.a.length;
    this.a.push(v);
    while (i) {
      const p = (i - 1) >> 1;
      if (this.a[p].score <= v.score) break;
      this.a[i] = this.a[p];
      i = p;
    }
    this.a[i] = v;
  }
  pop() {
    const top = this.a[0],
      last = this.a.pop()!;
    if (this.a.length) {
      let i = 0;
      while (i * 2 + 1 < this.a.length) {
        let c = i * 2 + 1;
        if (c + 1 < this.a.length && this.a[c + 1].score < this.a[c].score) c++;
        if (this.a[c].score >= last.score) break;
        this.a[i] = this.a[c];
        i = c;
      }
      this.a[i] = last;
    }
    return top;
  }
  get length() {
    return this.a.length;
  }
}
function search(
  start: XY,
  end: XY,
  rects: Rect[],
  reserved: XY[][],
  allPorts: XY[],
): XY[] {
  const xs = new Set<number>([start[0], end[0]]),
    ys = new Set<number>([start[1], end[1]]);
  for (const r of rects) {
    xs.add(r.left);
    xs.add(r.right);
    ys.add(r.bottom);
    ys.add(r.top);
  }
  for (const p of allPorts) {
    for (const d of [-14, 0, 14]) {
      xs.add(p[0] + d);
      ys.add(p[1] + d);
    }
  }
  // Outer lanes ensure a planar escape route even for crowded arrangements.
  const lowX = Math.min(...xs),
    highX = Math.max(...xs),
    lowY = Math.min(...ys),
    highY = Math.max(...ys);
  for (const d of [28, 56, 84]) {
    xs.add(lowX - d);
    xs.add(highX + d);
    ys.add(lowY - d);
    ys.add(highY + d);
  }
  const x = [...xs].sort((a, b) => a - b),
    y = [...ys].sort((a, b) => a - b),
    w = x.length,
    h = y.length;
  const node = (ix: number, iy: number) => iy * w + ix,
    point = (n: number): XY => [x[n % w], y[Math.floor(n / w)]];
  const begin = node(x.indexOf(start[0]), y.indexOf(start[1])),
    finish = node(x.indexOf(end[0]), y.indexOf(end[1]));
  const count = w * h * 3,
    dist = new Float64Array(count).fill(Infinity),
    parent = new Int32Array(count).fill(-1),
    closed = new Uint8Array(count),
    heap = new Heap();
  const root = begin * 3;
  dist[root] = 0;
  heap.push({ id: root, score: 0 });
  let goal = -1;
  const used = reserved.flatMap(edges);
  while (heap.length) {
    const current = heap.pop().id;
    if (closed[current]) continue;
    closed[current] = 1;
    const n = Math.floor(current / 3),
      dir = current % 3;
    if (n === finish) {
      goal = current;
      break;
    }
    const ix = n % w,
      iy = Math.floor(n / w),
      a = point(n);
    for (const [nx, ny, nd] of [
      [ix - 1, iy, 1],
      [ix + 1, iy, 1],
      [ix, iy - 1, 2],
      [ix, iy + 1, 2],
    ]) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const next = node(nx, ny),
        b = point(next);
      if (blocked(a, b, rects)) continue;
      let cost =
        Math.abs(a[0] - b[0]) +
        Math.abs(a[1] - b[1]) +
        (dir && dir !== nd ? 18 : 0);
      for (const p of allPorts) {
        if (same(p, start) || same(p, end)) continue;
        const on =
          Math.abs(a[0] - b[0]) < EPS
            ? Math.abs(p[0] - a[0]) < EPS &&
              p[1] >= Math.min(a[1], b[1]) - EPS &&
              p[1] <= Math.max(a[1], b[1]) + EPS
            : Math.abs(p[1] - a[1]) < EPS &&
              p[0] >= Math.min(a[0], b[0]) - EPS &&
              p[0] <= Math.max(a[0], b[0]) + EPS;
        if (on) cost += 100000;
      }
      for (const [c, d] of used) {
        const conflict = segmentConflict(a, b, c, d);
        if (conflict === "overlap") cost += 100000;
        else if (conflict === "cross") cost += 8000;
        else {
          const av = Math.abs(a[0] - b[0]) < EPS,
            cv = Math.abs(c[0] - d[0]) < EPS;
          if (av === cv) {
            const axis = av ? 1 : 0,
              gap = Math.abs(a[av ? 0 : 1] - c[av ? 0 : 1]);
            if (
              gap < 9 &&
              Math.min(Math.max(a[axis], b[axis]), Math.max(c[axis], d[axis])) >
                Math.max(Math.min(a[axis], b[axis]), Math.min(c[axis], d[axis]))
            )
              cost += 1000;
          }
        }
      }
      const key = next * 3 + nd,
        value = dist[current] + cost;
      if (value >= dist[key]) continue;
      dist[key] = value;
      parent[key] = current;
      heap.push({
        id: key,
        score: value + Math.abs(b[0] - end[0]) + Math.abs(b[1] - end[1]),
      });
    }
  }
  if (goal < 0) return [start, [start[0], lowY - 84], [end[0], lowY - 84], end];
  const path: XY[] = [];
  for (let k = goal; k >= 0; k = parent[k]) path.push(point(Math.floor(k / 3)));
  return simplify(path.reverse());
}
function elastic(previous: GroundRoute, a: XY, b: XY): XY[] {
  if (previous.points.length === 2)
    return Math.abs(previous.points[0][1] - previous.points[1][1]) < EPS
      ? [a, [b[0], a[1]], b]
      : [a, [a[0], b[1]], b];
  const p = previous.points.map((v) => [v[0], v[1]] as [number, number]);
  if (p.length < 2) return [a, b];
  const first = previous.points[0],
    last = previous.points[previous.points.length - 1];
  p[0] = [...a];
  p[p.length - 1] = [...b];
  if (Math.abs(previous.points[1][0] - first[0]) < EPS) p[1][0] = a[0];
  else p[1][1] = a[1];
  if (Math.abs(previous.points[p.length - 2][0] - last[0]) < EPS)
    p[p.length - 2][0] = b[0];
  else p[p.length - 2][1] = b[1];
  return simplify(p);
}
/** Deterministic obstacle-aware, multi-wire routing. Reuse clear routes to avoid topology chatter. */
export function planRoutes(
  requests: Pick<Connection, "id" | "from" | "to">[],
  positions: Positions,
  previous: RouteMap = {},
): RouteMap {
  const rects = obstacles(positions),
    ports = requests.flatMap((r) => [
      groundPort(r.from, positions),
      groundPort(r.to, positions),
    ]),
    result: RouteMap = {},
    reserved: XY[][] = [];
  for (const r of requests) {
    const a = groundPort(r.from, positions),
      b = groundPort(r.to, positions);
    let old =
      previous[r.id] ??
      Object.values(previous).find(
        (p) =>
          (p.from === r.from && p.to === r.to) ||
          (p.from === r.to && p.to === r.from),
      );
    if (old && old.from !== r.from)
      old = { from: r.from, to: r.to, points: old.points.slice().reverse() };
    let path = old ? elastic(old, a, b) : [];
    const foreignPort = ports.some(
      (port) =>
        !same(port, a) &&
        !same(port, b) &&
        edges(path).some(([p, q]) =>
          Math.abs(p[0] - q[0]) < EPS
            ? Math.abs(port[0] - p[0]) < EPS &&
              port[1] >= Math.min(p[1], q[1]) - EPS &&
              port[1] <= Math.max(p[1], q[1]) + EPS
            : Math.abs(port[1] - p[1]) < EPS &&
              port[0] >= Math.min(p[0], q[0]) - EPS &&
              port[0] <= Math.max(p[0], q[0]) + EPS,
        ),
    );
    const segments = edges(path),
      selfCross = segments.some(([p, q], i) =>
        segments.some(
          ([r, s], j) => j > i + 1 && segmentConflict(p, q, r, s) !== null,
        ),
      );
    const reusable =
      !foreignPort &&
      !selfCross &&
      path.length > 1 &&
      edges(path).every(([p, q]) => !blocked(p, q, rects)) &&
      reserved.every((other) => routeConflicts(path, other).length === 0);
    if (!reusable) path = search(a, b, rects, reserved, ports);
    result[r.id] = { from: r.from, to: r.to, points: path };
    reserved.push(path);
  }
  return result;
}
// Fixed alternating H/V slots let route changes interpolate without diagonal wires.
export const SLOTS = 32;
export function routeControls(route: GroundRoute): number[] {
  const p = route.points,
    values: number[] = [];
  let at = 0,
    current = p[0];
  for (let i = 1; i <= SLOTS; i++) {
    const horizontal = i % 2 === 1,
      next = p[at + 1];
    if (
      next &&
      ((horizontal && Math.abs(next[1] - current[1]) < EPS) ||
        (!horizontal && Math.abs(next[0] - current[0]) < EPS))
    ) {
      current = next;
      at++;
    }
    values.push(horizontal ? current[0] : current[1]);
  }
  return values;
}
export function displayedRoute(
  route: GroundRoute,
  controls: number[],
  positions: Positions,
): { path: string; ground: XY[] } {
  const a = terminalPoint(route.from, positions),
    b = terminalPoint(route.to, positions),
    start = groundPort(route.from, positions),
    end = groundPort(route.to, positions);
  const ground: XY[] = [start];
  for (let i = 1; i <= SLOTS; i++) {
    const before = ground[ground.length - 1];
    ground.push(
      i === SLOTS
        ? end
        : i % 2 === 1
          ? [i === SLOTS - 1 ? end[0] : controls[i - 1], before[1]]
          : [before[0], controls[i - 1]],
    );
  }
  const world: WorldPoint[] = [
    a,
    [a[0], start[1], a[2]],
    [...start, 0],
    ...ground.slice(1).map((p) => [p[0], p[1], 0] as WorldPoint),
    [b[0], end[1], b[2]],
    b,
  ];
  return { path: wirePath(world), ground };
}
