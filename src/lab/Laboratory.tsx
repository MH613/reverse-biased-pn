import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useIsPresent,
  useReducedMotion,
} from "motion/react";
import {
  ArrowLeft,
  MousePointer2,
  Cable,
  ScanSearch,
  Plus,
  Minus,
  RotateCcw,
  Maximize,
  X,
  Trash2,
  Check,
  Lightbulb,
} from "lucide-react";
import { Junction } from "../components/Junction";
import { VoltageSource } from "../components/VoltageSource";
import { project, points } from "../components/isometric";
import {
  PresentationContext,
  type PresentationState,
} from "../state/presentation";
import {
  type Connection,
  type InstrumentId,
  type TerminalId,
  owner,
  terminalNames,
  terminals,
  suggestedConnections,
  sameConnection,
} from "./circuit";
import {
  type Position,
  type Positions,
  instruments,
  initialPositions,
  terminalPoint,
  footprint,
  nearestPlacement,
  isValidPlacement,
  unproject,
  moveWithCollisions,
} from "./geometry";
import "./laboratory.css";
import { useWireRoutes } from "./useWireRoutes";
import { motionTiming, easeOut } from "../motion";
import { SimulationContext, useSimulation } from "../physics/SimulationContext";
import { useJunctionSimulation } from "../physics/useJunctionSimulation";
import { ScientificPanel } from "../physics/ScientificPanel";
import {
  formatCurrent,
  EQUILIBRIUM,
  widthToIllustration,
} from "../physics/model";
export interface LabSession {
  positions: Positions;
  connections: Connection[];
  voltage: number;
}
export const createLabSession = (): LabSession => ({
  positions: structuredClone(initialPositions),
  connections: [],
  voltage: 0,
});
type Mode = "move" | "wire" | "inspect";
interface Camera {
  x: number;
  y: number;
  zoom: number;
}
type Gesture =
  | { kind: "move"; id: InstrumentId; offset: Position; start: Position }
  | { kind: "pan"; client: Position; camera: Camera };
const frozen: PresentationState = {
  stage: 1,
  time: 0,
  progress: 1,
  voltage: 0,
  bias: "reverse",
  playing: false,
  reducedMotion: true,
  width: widthToIllustration(EQUILIBRIUM.widthM),
  pFraction: 2 / 3,
};
const noop = () => {};
const ids = Object.keys(instruments) as InstrumentId[];
const relative = (x: number, y: number, z = 0) =>
  `${0.96 * x + 0.7 * y},${0.27 * x - 0.5 * y - z}`;
const Grid = memo(function Grid() {
  return (
    <g className="lab-grid" stroke="#e7e7e7" strokeWidth=".7" fill="none">
      {Array.from({ length: 61 }, (_, i) => -1200 + i * 40).map((v) => (
        <g key={v}>
          <path d={`M${project(v, -1200, 0)} L${project(v, 1200, 0)}`} />
          <path d={`M${project(-1200, v, 0)} L${project(1200, v, 0)}`} />
        </g>
      ))}
    </g>
  );
});
const Artwork = memo(function Artwork({ id }: { id: InstrumentId }) {
  const simulation = useSimulation()!;
  const info = instruments[id],
    origin = project(...info.origin),
    s = info.scale;
  return (
    <g
      className="lab-artwork"
      aria-hidden="true"
      transform={`translate(${-origin[0] * s} ${-origin[1] * s}) scale(${s})`}
    >
      <PresentationContext.Provider value={frozen}>
        {id === "junction" ? (
          <Junction
            showCarriers
            showIons
            selected={null}
            onSelect={noop}
            showCircuit={false}
            showGrid={false}
            interactive={false}
            embedded
          />
        ) : (
          <VoltageSource
            kind={id === "ammeter" ? "ammeter" : "supply"}
            reading={
              id === "ammeter"
                ? formatCurrent(simulation.ammeterCurrentA)
                : `${simulation.solution.reverseVoltageV.toFixed(2)} V`
            }
          />
        )}
      </PresentationContext.Provider>
    </g>
  );
});
export function Laboratory({
  onClose,
  initial,
  onSessionChange,
}: {
  onClose: () => void;
  initial: LabSession;
  onSessionChange: (session: LabSession) => void;
}) {
  const isPresent = useIsPresent();
  const reducedMotion = useReducedMotion();
  const presenceRef = useRef(isPresent),
    reducedRef = useRef(reducedMotion);
  presenceRef.current = isPresent;
  reducedRef.current = reducedMotion;
  const [panning, setPanning] = useState(false),
    [resetting, setResetting] = useState(false),
    [hoveredTerminal, setHoveredTerminal] = useState<TerminalId | null>(null);
  const [positions, setPositions] = useState<Positions>(initial.positions),
    [connections, setConnections] = useState<Connection[]>(initial.connections),
    [voltage, setVoltage] = useState(initial.voltage);
  const [mode, setMode] = useState<Mode>("move"),
    [selected, setSelected] = useState<InstrumentId | null>(null),
    [selectedWire, setSelectedWire] = useState<string | null>(null),
    [draft, setDraft] = useState<TerminalId | null>(null),
    [pointer, setPointer] = useState<Position | null>(null);
  const [hints, setHints] = useState(true),
    [notice, setNotice] = useState(""),
    [ghost, setGhost] = useState<{
      id: InstrumentId;
      position: Position;
      blocked: boolean;
    } | null>(null),
    [dragging, setDragging] = useState(false);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 0.8 });
  const svg = useRef<SVGSVGElement>(null),
    canvas = useRef<HTMLDivElement>(null),
    gesture = useRef<Gesture | null>(null),
    positionsRef = useRef(positions),
    draftRef = useRef(draft),
    connectionsRef = useRef(connections),
    cameraRef = useRef(camera),
    settleFrame = useRef(0),
    cameraFrame = useRef(0),
    pointerFrame = useRef(0),
    latestMove = useRef<Position | null>(null),
    cameraTarget = useRef(camera),
    bounds = useRef({ left: 0, top: 0, width: 1000, height: 700 }),
    serial = useRef(0),
    activePointer = useRef<number | null>(null),
    settlers = useRef(
      new Map<InstrumentId, { from: Position; to: Position; start: number }>(),
    ),
    resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const simulation = useJunctionSimulation(voltage, connections, isPresent);
  const circuit = simulation.circuit;
  const hintRequests = useMemo(
    () =>
      hints && !circuit.valid
        ? suggestedConnections
            .map((w, i) => ({ ...w, id: `hint-${i}` }))
            .filter(
              (w) => !connections.some((c) => sameConnection(c, w.from, w.to)),
            )
        : [],
    [hints, circuit.valid, connections],
  );
  const routeRequests = useMemo(
    () => [...connections, ...hintRequests],
    [connections, hintRequests],
  );
  const wirePaths = useWireRoutes(routeRequests, positions, isPresent);
  positionsRef.current = positions;
  draftRef.current = draft;
  connectionsRef.current = connections;
  cameraRef.current = camera;
  useEffect(
    () => onSessionChange({ positions, connections, voltage }),
    [positions, connections, voltage, onSessionChange],
  );
  useEffect(() => {
    if (!circuit.valid) setVoltage(0);
  }, [circuit.valid]);
  const fit = useCallback((immediate = false, includeRoutes = true) => {
    const b = bounds.current,
      p = positionsRef.current;
    const corners = ids.flatMap((id) =>
      footprint(p[id], id).flatMap((v) => [
        project(...v),
        project(v[0], v[1], 60),
      ]),
    );
    if (includeRoutes) {
      svg.current
        ?.querySelectorAll<SVGPathElement>(".wire-visible,.connection-hint")
        .forEach((path) => {
          const r = path.getBBox();
          corners.push([r.x, r.y], [r.x + r.width, r.y + r.height]);
        });
    }
    const xs = corners.map((v) => v[0]),
      ys = corners.map((v) => v[1]),
      minX = Math.min(...xs),
      maxX = Math.max(...xs),
      minY = Math.min(...ys),
      maxY = Math.max(...ys);
    const mobile = b.width < 760,
      availableW = b.width - (mobile ? 36 : 480),
      availableH = b.height - (mobile ? 330 : 160);
    const zoom = Math.max(
      0.25,
      Math.min(1.6, availableW / (maxX - minX), availableH / (maxY - minY)),
    );
    const next = {
      x:
        (mobile ? b.width / 2 : (b.width - 390) / 2) -
        ((minX + maxX) / 2) * zoom,
      y:
        (mobile ? b.height * 0.36 : b.height * 0.48) -
        ((minY + maxY) / 2) * zoom,
      zoom,
    };
    if (immediate) {
      cameraRef.current = next;
      cameraTarget.current = next;
      setCamera(next);
      syncDraftPointer();
    } else animateCamera(next);
  }, []);
  useEffect(() => {
    const measure = () => {
      if (!canvas.current) return;
      const r = canvas.current.getBoundingClientRect();
      bounds.current = {
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
      };
      fit(true);
    };
    const observer = new ResizeObserver(measure);
    if (canvas.current) observer.observe(canvas.current);
    measure();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(settleFrame.current);
      cancelAnimationFrame(cameraFrame.current);
      cancelAnimationFrame(pointerFrame.current);
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, [fit]);
  function syncDraftPointer() {
    const client = latestMove.current;
    if (!draftRef.current || !client) return;
    const c = cameraRef.current,
      b = bounds.current;
    setPointer(
      unproject(
        (client.x - b.left - c.x) / c.zoom,
        (client.y - b.top - c.y) / c.zoom,
      ),
    );
  }
  function animateCamera(target: Camera) {
    cameraTarget.current = target;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cancelAnimationFrame(cameraFrame.current);
      cameraFrame.current = 0;
      cameraRef.current = target;
      setCamera(target);
      syncDraftPointer();
      return;
    }
    if (cameraFrame.current) return;
    let previous = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - (previous || now - 16)) / 1000, 0.05);
      previous = now;
      const c = cameraRef.current,
        t = cameraTarget.current,
        k = reducedRef.current ? 1 : 1 - Math.exp(-dt * 16);
      const next = {
        x: c.x + (t.x - c.x) * k,
        y: c.y + (t.y - c.y) * k,
        zoom: c.zoom + (t.zoom - c.zoom) * k,
      };
      cameraRef.current = next;
      setCamera(next);
      syncDraftPointer();
      if (
        Math.abs(next.x - t.x) +
          Math.abs(next.y - t.y) +
          Math.abs(next.zoom - t.zoom) <
        0.01
      ) {
        cameraRef.current = t;
        setCamera(t);
        syncDraftPointer();
        cameraFrame.current = 0;
      } else cameraFrame.current = requestAnimationFrame(tick);
    };
    cameraFrame.current = requestAnimationFrame(tick);
  }
  const clientWorld = (client: Position) => {
    const c = cameraRef.current,
      b = bounds.current;
    return unproject(
      (client.x - b.left - c.x) / c.zoom,
      (client.y - b.top - c.y) / c.zoom,
    );
  };
  const settle = (id: InstrumentId, from: Position, to: Position) => {
    settlers.current.set(id, { from, to, start: 0 });
    if (settleFrame.current) return;
    const tick = (now: number) => {
      const next = { ...positionsRef.current };
      const completed: InstrumentId[] = [];
      for (const [item, s] of settlers.current) {
        s.start ||= now;
        const t = matchMedia("(prefers-reduced-motion: reduce)").matches
            ? 1
            : Math.min(1, (now - s.start) / 200),
          u = 8 * t,
          k = (1 - (1 + u) * Math.exp(-u)) / (1 - 9 * Math.exp(-8));
        const desired =
          t === 1
            ? s.to
            : {
                x: s.from.x + (s.to.x - s.from.x) * k,
                y: s.from.y + (s.to.y - s.from.y) * k,
              };
        next[item] = moveWithCollisions(item, next[item], desired, next);
        if (t === 1) {
          if (
            Math.hypot(next[item].x - s.to.x, next[item].y - s.to.y) > 0.001
          ) {
            const target = nearestPlacement(item, next[item], next);
            settlers.current.set(item, {
              from: next[item],
              to: target,
              start: now,
            });
          } else {
            settlers.current.delete(item);
            completed.push(item);
          }
        }
      }
      positionsRef.current = next;
      setPositions(next);
      if (completed.length)
        setGhost((g) => (g && completed.includes(g.id) ? null : g));
      settleFrame.current = settlers.current.size
        ? requestAnimationFrame(tick)
        : 0;
    };
    settleFrame.current = requestAnimationFrame(tick);
  };
  function abortGesture() {
    const g = gesture.current;
    gesture.current = null;
    if (g?.kind === "move") {
      const p = positionsRef.current[g.id];
      settle(g.id, p, nearestPlacement(g.id, p, positionsRef.current));
    }
    setDragging(false);
    setPanning(false);
    setHoveredTerminal(null);
    cancelAnimationFrame(pointerFrame.current);
    pointerFrame.current = 0;
    cancelAnimationFrame(cameraFrame.current);
    cameraFrame.current = 0;
    cameraTarget.current = cameraRef.current;
    const id = activePointer.current;
    activePointer.current = null;
    if (id !== null && svg.current?.hasPointerCapture(id))
      svg.current.releasePointerCapture(id);
  }
  const leaveLab = () => {
    let final = { ...positionsRef.current };
    for (const [id, s] of settlers.current) final[id] = s.to;
    if (gesture.current?.kind === "move") {
      const id = gesture.current.id;
      final[id] = nearestPlacement(id, final[id], final);
    }
    if (resetting) final = structuredClone(initialPositions);
    onSessionChange({ positions: final, connections, voltage });
    if (resetTimer.current) clearTimeout(resetTimer.current);
    gesture.current = null;
    activePointer.current = null;
    settlers.current.clear();
    cancelAnimationFrame(settleFrame.current);
    cancelAnimationFrame(cameraFrame.current);
    cancelAnimationFrame(pointerFrame.current);
    onClose();
  };
  useEffect(() => {
    const blur = () => abortGesture();
    window.addEventListener("blur", blur);
    return () => window.removeEventListener("blur", blur);
  }, []);
  const deleteWire = useCallback(() => {
    if (selectedWire) {
      setConnections((w) => w.filter((v) => v.id !== selectedWire));
      setSelectedWire(null);
      setNotice("Connection removed.");
    }
  }, [selectedWire]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!presenceRef.current) return;
      if ((e.target as HTMLElement).closest("input,textarea")) return;
      if (e.key === "Escape") {
        abortGesture();
        setDraft(null);
        setPointer(null);
        setSelectedWire(null);
        setSelected(null);
        setNotice("");
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteWire();
      }
      if (e.key.toLowerCase() === "v") setInteractionMode("move");
      if (e.key.toLowerCase() === "w") setInteractionMode("wire");
      if (e.key.toLowerCase() === "i") setInteractionMode("inspect");
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomBy(1.2);
      }
      if (e.key === "-") {
        e.preventDefault();
        zoomBy(1 / 1.2);
      }
      if (e.key === "0") {
        e.preventDefault();
        fit();
      }

      if (
        selected &&
        mode === "move" &&
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
      ) {
        e.preventDefault();
        if (gesture.current) return;
        const p =
            settlers.current.get(selected)?.to ??
            positionsRef.current[selected],
          next = {
            x:
              p.x +
              (e.key === "ArrowRight" ? 40 : e.key === "ArrowLeft" ? -40 : 0),
            y:
              p.y +
              (e.key === "ArrowUp" ? 40 : e.key === "ArrowDown" ? -40 : 0),
          };
        if (isValidPlacement(selected, next, positionsRef.current))
          settle(selected, positionsRef.current[selected], next);
        else setNotice("That grid position is occupied.");
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [deleteWire, selected, mode]);
  useEffect(() => {
    const wheel = (e: WheelEvent) => {
      if (!presenceRef.current) return;
      if (
        (e.target as HTMLElement).closest(
          ".lab-panel,.lab-toolbar,.lab-camera-controls,.wire-selection",
        )
      )
        return;
      e.preventDefault();
      if (gesture.current) return;
      latestMove.current = { x: e.clientX, y: e.clientY };
      const b = bounds.current,
        c = cameraTarget.current,
        px = e.clientX - b.left,
        py = e.clientY - b.top,
        zoom = Math.max(
          0.25,
          Math.min(2.4, c.zoom * Math.exp(-e.deltaY * 0.0015)),
        ),
        ratio = zoom / c.zoom;
      if (Math.abs(zoom - c.zoom) < 1e-8) return;
      animateCamera({
        x: px - (px - c.x) * ratio,
        y: py - (py - c.y) * ratio,
        zoom,
      });
    };
    const el = canvas.current;
    el?.addEventListener("wheel", wheel, { passive: false });
    return () => el?.removeEventListener("wheel", wheel);
  }, []);
  const startMove = (e: React.PointerEvent, id: InstrumentId) => {
    if (e.button !== 0 || activePointer.current !== null) return;
    e.stopPropagation();
    setSelected(id);
    setSelectedWire(null);
    if (mode !== "move") return;
    settlers.current.delete(id);
    cancelAnimationFrame(cameraFrame.current);
    cameraFrame.current = 0;
    cameraTarget.current = cameraRef.current;
    const world = clientWorld({ x: e.clientX, y: e.clientY }),
      p = positionsRef.current[id];
    gesture.current = {
      kind: "move",
      id,
      offset: { x: world.x - p.x, y: world.y - p.y },
      start: p,
    };
    setDragging(true);
    setGhost({ id, position: p, blocked: false });
    activePointer.current = e.pointerId;
    svg.current?.setPointerCapture(e.pointerId);
  };
  const processPointer = (client: Position) => {
    const g = gesture.current;
    if (g?.kind === "move") {
      const world = clientWorld(client),
        position = {
          x: Math.max(
            -960,
            Math.min(960 - instruments[g.id].width, world.x - g.offset.x),
          ),
          y: Math.max(
            -960,
            Math.min(960 - instruments[g.id].depth, world.y - g.offset.y),
          ),
        };
      const safe = moveWithCollisions(
        g.id,
        positionsRef.current[g.id],
        position,
        positionsRef.current,
      );
      const next = { ...positionsRef.current, [g.id]: safe };
      positionsRef.current = next;
      setPositions(next);
      const snapped = {
        x: Math.round(safe.x / 40) * 40,
        y: Math.round(safe.y / 40) * 40,
      };
      setGhost({
        id: g.id,
        position: nearestPlacement(g.id, safe, next),
        blocked:
          Math.hypot(safe.x - position.x, safe.y - position.y) > 0.01 ||
          !isValidPlacement(g.id, snapped, next),
      });
    } else if (g?.kind === "pan") {
      const next = {
        ...g.camera,
        x: g.camera.x + client.x - g.client.x,
        y: g.camera.y + client.y - g.client.y,
      };
      cameraRef.current = next;
      cameraTarget.current = next;
      setCamera(next);
      syncDraftPointer();
    } else if (draftRef.current) setPointer(clientWorld(client));
  };
  const pointerMove = (e: React.PointerEvent) => {
    if (activePointer.current !== null && activePointer.current !== e.pointerId)
      return;
    latestMove.current = { x: e.clientX, y: e.clientY };
    if (pointerFrame.current) return;
    pointerFrame.current = requestAnimationFrame(() => {
      pointerFrame.current = 0;
      if (latestMove.current) processPointer(latestMove.current);
    });
  };
  const finishPointer = (e: React.PointerEvent, cancelled = false) => {
    if (activePointer.current !== null && activePointer.current !== e.pointerId)
      return;
    cancelAnimationFrame(pointerFrame.current);
    pointerFrame.current = 0;
    if (gesture.current && !cancelled)
      processPointer({ x: e.clientX, y: e.clientY });
    const g = gesture.current;
    gesture.current = null;
    activePointer.current = null;
    setDragging(false);
    setPanning(false);
    if (g?.kind === "move") {
      const p = positionsRef.current[g.id];
      settle(g.id, p, nearestPlacement(g.id, p, positionsRef.current));
    }
    if (svg.current?.hasPointerCapture(e.pointerId))
      svg.current.releasePointerCapture(e.pointerId);
  };
  const connect = (terminal: TerminalId) => {
    setNotice("");
    setSelectedWire(null);
    if (!draft) {
      setDraft(terminal);
      const p = terminalPoint(terminal, positionsRef.current);
      setPointer({ x: p[0], y: p[1] - 20 });
      return;
    }
    if (draft === terminal) {
      setDraft(null);
      setPointer(null);
      return;
    }
    if (owner(draft) === owner(terminal)) {
      setNotice("Choose a terminal on another instrument.");
      return;
    }
    const duplicate = connections.find((w) =>
      sameConnection(w, draft, terminal),
    );
    if (duplicate) {
      setSelectedWire(duplicate.id);
      setNotice("These terminals are already connected.");
      setDraft(null);
      setPointer(null);
      return;
    }
    const wire = {
      id: `wire-${Date.now()}-${serial.current++}`,
      from: draft,
      to: terminal,
      lane:
        Array.from({ length: connections.length + 1 }, (_, i) => i).find(
          (i) => !connections.some((w) => (w.lane ?? 0) === i),
        ) ?? 0,
    };
    setConnections((w) => [...w, wire]);
    setDraft(null);
    setPointer(null);
  };
  const setInteractionMode = (next: Mode) => {
    abortGesture();
    setMode(next);
    setDraft(null);
    setPointer(null);
    setSelectedWire(null);
    setNotice("");
  };
  const zoomBy = (ratio: number) => {
    const b = bounds.current,
      c = cameraTarget.current,
      px = b.width * (b.width < 760 ? 0.5 : 0.4),
      py = b.height * 0.45,
      zoom = Math.max(0.25, Math.min(2.4, c.zoom * ratio));
    if (Math.abs(zoom - c.zoom) < 1e-8) return;
    animateCamera({
      zoom,
      x: px - ((px - c.x) * zoom) / c.zoom,
      y: py - ((py - c.y) * zoom) / c.zoom,
    });
  };
  const drawn = ids.slice().sort((a, b) => {
    const pa = positions[a],
      pb = positions[b];
    return (
      project(
        pa.x + instruments[a].width / 2,
        pa.y + instruments[a].depth / 2,
        0,
      )[1] -
      project(
        pb.x + instruments[b].width / 2,
        pb.y + instruments[b].depth / 2,
        0,
      )[1]
    );
  });
  const pendingPath = () => {
    if (!draft || !pointer) return "";
    const a = terminalPoint(draft, positions),
      out = positions[owner(draft)].y - 24;
    return `M${project(...a)} L${project(a[0], out, a[2])} L${project(a[0], out, 0)} L${project(pointer.x, out, 0)} L${project(pointer.x, pointer.y, 0)}`;
  };
  return (
    <SimulationContext.Provider value={simulation}>
      <motion.section
        data-leaving={!isPresent}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: reducedMotion ? 0.12 : motionTiming.view,
          ease: easeOut,
        }}
        style={{ pointerEvents: isPresent ? undefined : "none" }}
        className={`lab-shell ${resetting ? "is-resetting" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Circuit laboratory"
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const controls = [
            ...e.currentTarget.querySelectorAll<HTMLElement>(
              'a[href],button:not(:disabled),input:not(:disabled),summary,[tabindex="0"]',
            ),
          ].filter(
            (el) => el.getClientRects().length && !el.closest('[aria-hidden="true"]'),
          );
          const first = controls[0],
            last = controls[controls.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }}
      >
        <header className="lab-header">
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              leaveLab();
            }}
          >
            junction.
          </a>
          <span>Circuit laboratory</span>
          <button className="lab-return" onClick={leaveLab} autoFocus>
            <ArrowLeft size={14} /> Back to explanation
          </button>
        </header>
        <div className="lab-workspace" ref={canvas}>
          <svg
            ref={svg}
            className={`lab-canvas mode-${mode} ${dragging ? "is-dragging" : ""} ${panning ? "is-panning" : ""}`}
            aria-label="Isometric circuit building workspace"
            onPointerMove={pointerMove}
            onPointerUp={(e) => finishPointer(e)}
            onPointerCancel={(e) => finishPointer(e, true)}
            onLostPointerCapture={(e) => {
              if (activePointer.current === e.pointerId) abortGesture();
            }}
            onPointerDown={(e) => {
              if (
                (e.button !== 0 && e.button !== 1) ||
                activePointer.current !== null
              )
                return;
              setPanning(true);
              setHoveredTerminal(null);
              cancelAnimationFrame(cameraFrame.current);
              cameraFrame.current = 0;
              cameraTarget.current = cameraRef.current;
              setSelected(null);
              setSelectedWire(null);
              gesture.current = {
                kind: "pan",
                client: { x: e.clientX, y: e.clientY },
                camera: cameraRef.current,
              };
              activePointer.current = e.pointerId;
              svg.current?.setPointerCapture(e.pointerId);
            }}
          >
            <defs>
              <pattern
                id="blocked-placement"
                width="7"
                height="7"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(30)"
              >
                <path d="M0,0 V7" stroke="#777" strokeWidth="1" />
              </pattern>
            </defs>
            <g
              className="lab-camera"
              transform={`translate(${camera.x} ${camera.y}) scale(${camera.zoom})`}
            >
              <Grid />
              {hintRequests.map((w) => (
                <path
                  key={w.id}
                  className="connection-hint"
                  d={wirePaths[w.id]}
                  fill="none"
                  stroke="#c6c6c6"
                  strokeDasharray="4 6"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
              ))}
              {connections.map((wire, i) => (
                <g
                  key={wire.id}
                  className={
                    selectedWire === wire.id ? "lab-wire selected" : "lab-wire"
                  }
                  data-wire-id={wire.id}
                >
                  <motion.path
                    className="wire-casing"
                    d={wirePaths[wire.id]}
                    fill="none"
                    stroke="#fff"
                    strokeWidth={Math.min(3.8, 2 + camera.zoom * 0.8)}
                    vectorEffect="non-scaling-stroke"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: motionTiming.view }}
                  />
                  <motion.path
                    className="wire-visible"
                    d={wirePaths[wire.id]}
                    fill="none"
                    stroke={selectedWire === wire.id ? "#111" : "#666"}
                    strokeWidth={selectedWire === wire.id ? 1.7 : 1.2}
                    vectorEffect="non-scaling-stroke"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: motionTiming.view }}
                  />
                  {simulation.loopCurrentA > 0 && isPresent && (
                    <path
                      className={`lab-current-pulse ${simulation.wireDirections[wire.id] === -1 ? "reverse" : ""}`}
                      d={wirePaths[wire.id]}
                      pathLength="100"
                    />
                  )}
                  <path
                    className="wire-hit"
                    d={wirePaths[wire.id]}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={14 / camera.zoom}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setSelectedWire(wire.id);
                      setSelected(null);
                      setDraft(null);
                      setPointer(null);
                      setNotice("");
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Select wire from ${terminalNames[wire.from]} to ${terminalNames[wire.to]}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        setSelectedWire(wire.id);
                      }
                    }}
                  />
                </g>
              ))}
              {draft && pointer && (
                <path
                  className="pending-wire"
                  d={pendingPath()}
                  fill="none"
                  stroke="#555"
                  strokeWidth="1.4"
                  strokeDasharray="5 4"
                  pointerEvents="none"
                />
              )}
              {ghost && (
                <g className="placement-ghost" pointerEvents="none">
                  <g
                    opacity=".14"
                    transform={`translate(${project(ghost.position.x, ghost.position.y, 0)})`}
                  >
                    <Artwork id={ghost.id} />
                  </g>
                  <polygon
                    points={points(footprint(ghost.position, ghost.id, 2))}
                    fill={
                      ghost.blocked ? "url(#blocked-placement)" : "#00000007"
                    }
                    fillOpacity={ghost.blocked ? 0.12 : 1}
                    stroke="#666"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                </g>
              )}
              {drawn.map((id) => {
                const info = instruments[id],
                  p = project(positions[id].x, positions[id].y, 0),
                  h = id === "junction" ? 40 : 60;
                const hit = [
                  [0, 0, 0],
                  [info.width, 0, 0],
                  [info.width, info.depth, 0],
                  [info.width, info.depth, h],
                  [0, info.depth, h],
                  [0, 0, h],
                ]
                  .map(([x, y, z]) => relative(x, y, z))
                  .join(" ");
                return (
                  <g
                    key={id}
                    data-instrument={id}
                    className={`lab-instrument ${selected === id ? "is-selected" : ""}`}
                    transform={`translate(${p})`}
                    onPointerDown={(e) => startMove(e, id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelected(id);
                        setSelectedWire(null);
                      }
                    }}
                  >
                    <polygon
                      className="instrument-hit"
                      points={hit}
                      fill="transparent"
                      tabIndex={0}
                      role="button"
                      aria-label={`Select ${info.name}`}
                    />
                    {selected === id && (
                      <polygon
                        className="instrument-selection"
                        points={footprint({ x: 0, y: 0 }, id, 6)
                          .map(([x, y, z]) => relative(x, y, z))
                          .join(" ")}
                        fill="#00000003"
                        stroke="#999"
                        strokeWidth="1"
                        strokeDasharray="3 4"
                        pointerEvents="none"
                      />
                    )}
                    <Artwork id={id} />
                  </g>
                );
              })}
              {drawn.map((id) => {
                return (
                  <g className="instrument-terminals" key={id}>
                    {terminals
                      .filter((t) => owner(t) === id)
                      .map((t) => {
                        const q = terminalPoint(t, positions),
                          c = project(...q),
                          cx = c[0],
                          cy = c[1],
                          wired = connections.some(
                            (w) => w.from === t || w.to === t,
                          );
                        return (
                          <g key={t} className="instrument-terminal">
                            <circle
                              className="terminal-halo"
                              cx={cx}
                              cy={cy}
                              r={Math.max(10 / camera.zoom, 7)}
                              fill="none"
                              stroke="#777"
                              strokeWidth=".8"
                              vectorEffect="non-scaling-stroke"
                              pointerEvents="none"
                            />
                            <circle
                              className={`terminal ${draft === t ? "pending" : ""}`}
                              data-terminal={t}
                              cx={cx}
                              cy={cy}
                              r={
                                mode === "wire"
                                  ? Math.max(4 / camera.zoom, 5)
                                  : Math.max(2 / camera.zoom, 2.5)
                              }
                              fill={wired ? "#444" : "#fff"}
                              stroke={mode === "wire" ? "#333" : "#888"}
                              strokeWidth="1.2"
                              pointerEvents="none"
                            />
                            {id === "junction" && (
                              <text
                                x={cx + 9}
                                y={cy + 4}
                                fontSize="10"
                                fill="#666"
                                pointerEvents="none"
                              >
                                {t.endsWith(":p") ? "P" : "N"}
                              </text>
                            )}
                            {mode === "wire" && (
                              <circle
                                className="terminal-hit"
                                cx={cx}
                                cy={cy}
                                r={Math.max(13, 12 / camera.zoom)}
                                fill="transparent"
                                role="button"
                                tabIndex={0}
                                aria-label={terminalNames[t]}
                                onPointerEnter={() => setHoveredTerminal(t)}
                                onPointerLeave={() => setHoveredTerminal(null)}
                                onPointerDown={(e) => {
                                  e.stopPropagation();
                                  connect(t);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    connect(t);
                                  }
                                }}
                              >
                                <title>{terminalNames[t]}</title>
                              </circle>
                            )}
                          </g>
                        );
                      })}
                  </g>
                );
              })}
            </g>
          </svg>
          <div
            className="lab-toolbar"
            role="toolbar"
            aria-label="Laboratory interaction mode"
          >
            {(
              [
                { id: "move", icon: MousePointer2, label: "Move", key: "V" },
                { id: "wire", icon: Cable, label: "Wire", key: "W" },
                { id: "inspect", icon: ScanSearch, label: "Inspect", key: "I" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                aria-pressed={mode === item.id}
                onClick={() => setInteractionMode(item.id)}
                title={`${item.label} · ${item.key}`}
              >
                <item.icon size={17} strokeWidth={1.5} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <aside className="lab-panel" aria-label="Circuit controls">
            <div className="lab-panel-heading">
              <h1>
                {mode === "inspect" && selected
                  ? instruments[selected].name
                  : circuit.valid
                    ? "Reverse-bias junction."
                    : "Build a connection."}
              </h1>
              <span>{connections.length} / 3</span>
            </div>
            <AnimatePresence initial={false} mode="wait">
              {mode === "inspect" && selected && (
                <motion.div
                  key={selected}
                  className="inspection-reveal"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    duration: reducedMotion ? 0 : motionTiming.panel,
                    ease: easeOut,
                  }}
                  style={{ overflow: "hidden" }}
                >
                  <p>{instruments[selected].description}</p>
                  {selected === "junction" ? (
                    <div className="junction-detail">
                      <PresentationContext.Provider value={frozen}>
                        <Junction
                          showCarriers
                          showIons
                          selected={null}
                          onSelect={noop}
                          showCircuit={false}
                          showGrid={false}
                          interactive={false}
                        />
                      </PresentationContext.Provider>
                      <span>Semiconductor cross-section · schematic</span>
                    </div>
                  ) : (
                    <div className="lab-reading">
                      <span>
                        {selected === "supply" ? "Voltage setpoint" : "Current"}
                      </span>
                      <strong>
                        {selected === "supply"
                          ? `${simulation.solution.reverseVoltageV.toFixed(2)} V`
                          : formatCurrent(simulation.ammeterCurrentA)}
                      </strong>
                    </div>
                  )}
                  <div className="lab-property">
                    <span>Terminals</span>
                    <span>
                      {selected === "supply"
                        ? "+ / −"
                        : selected === "junction"
                          ? "P / N"
                          : "IN / OUT"}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {mode !== "inspect" && !circuit.valid && (
              <p>
                Place the instruments. Connect N to positive and P to negative,
                with the ammeter in series.
              </p>
            )}
            <div
              className={`circuit-feedback ${circuit.valid ? "ready" : ""}`}
              role="status"
            >
              <span className="circuit-indicator">
                {circuit.valid ? <Check size={13} /> : <span />}
              </span>
              <p>{circuit.message}</p>
            </div>
            <div className="lab-voltage">
              <div>
                <label htmlFor="lab-voltage">Supply voltage</label>
                <output htmlFor="lab-voltage">
                  {simulation.solution.reverseVoltageV.toFixed(2)}{" "}
                  <span>V</span>
                </output>
              </div>
              <input
                id="lab-voltage"
                type="range"
                min="0"
                max="10"
                step=".1"
                disabled={!circuit.valid}
                value={voltage}
                onInput={(e) => setVoltage(Number(e.currentTarget.value))}
                onChange={(e) => setVoltage(Number(e.currentTarget.value))}
              />
              <div className="range-ends">
                <span>0 V</span>
                <span>10 V</span>
              </div>
            </div>
            <div className="lab-voltage-status">
              <span>Applied bias</span>
              <span>
                {simulation.settling
                  ? `Setting ${voltage.toFixed(1)} V`
                  : "Settled"}
              </span>
            </div>
            <p className="lab-phase-note">
              {circuit.valid
                ? "Ideal pre-breakdown silicon model."
                : "Complete the reverse-bias circuit to apply voltage."}{" "}
              At zero bias, net terminal current is zero.
            </p>
            <div className="lab-panel-actions">
              <button aria-pressed={hints} onClick={() => setHints((v) => !v)}>
                <Lightbulb size={13} /> Hints {hints ? "on" : "off"}
              </button>
              <button
                onClick={() => {
                  abortGesture();
                  setResetting(true);
                  settlers.current.clear();
                  cancelAnimationFrame(settleFrame.current);
                  settleFrame.current = 0;
                  if (resetTimer.current) clearTimeout(resetTimer.current);
                  const restore = () => {
                    const original = structuredClone(initialPositions);
                    positionsRef.current = original;
                    setPositions(original);
                    setResetting(false);
                    fit(!!reducedRef.current, false);
                  };
                  if (reducedMotion) restore();
                  else resetTimer.current = setTimeout(restore, 120);
                  setConnections([]);
                  setVoltage(0);
                  setDraft(null);
                  setPointer(null);
                  setSelectedWire(null);
                  setSelected(null);
                  setNotice("Circuit reset. Original layout restored.");
                }}
              >
                <RotateCcw className="reset-icon" size={12} /> Reset circuit
              </button>
            </div>
            <ScientificPanel />
          </aside>
          {hoveredTerminal && mode === "wire" && (
            <div
              className="lab-terminal-tooltip"
              style={{
                left:
                  camera.x +
                  project(...terminalPoint(hoveredTerminal, positions))[0] *
                    camera.zoom,
                top:
                  camera.y +
                  project(...terminalPoint(hoveredTerminal, positions))[1] *
                    camera.zoom -
                  22,
              }}
            >
              {terminalNames[hoveredTerminal]}
            </div>
          )}
          {selectedWire && (
            <div className="wire-selection">
              <span>Connection selected</span>
              <button onClick={deleteWire}>
                <Trash2 size={13} /> Delete wire
              </button>
              <button
                onClick={() => setSelectedWire(null)}
                aria-label="Deselect wire"
              >
                <X size={13} />
              </button>
            </div>
          )}
          <div className="lab-camera-controls">
            <button
              onClick={() => zoomBy(1 / 1.2)}
              disabled={camera.zoom <= 0.25001}
              aria-label="Zoom out"
              title="Zoom out (−)"
            >
              <Minus size={15} />
            </button>
            <span>{Math.round(camera.zoom * 100)}%</span>
            <button
              onClick={() => zoomBy(1.2)}
              disabled={camera.zoom >= 2.39999}
              aria-label="Zoom in"
              title="Zoom in (+)"
            >
              <Plus size={15} />
            </button>
            <button
              onClick={() => fit()}
              aria-label="Fit workspace"
              title="Fit workspace (0)"
            >
              <Maximize size={14} />
            </button>
          </div>
          <div className="lab-help" aria-live="polite">
            {notice ||
              (ghost?.blocked
                ? "Equipment blocks this move. Release to settle on a free grid point."
                : draft
                  ? `From ${terminalNames[draft]}. Choose another terminal. Escape cancels.`
                  : mode === "move"
                    ? "Drag an instrument to move · drag the grid to pan · scroll to zoom"
                    : mode === "wire"
                      ? "Connect terminals · select a wire to remove it · Escape cancels"
                      : "Select an instrument to look closer · drag the grid to pan")}
          </div>
        </div>
      </motion.section>
    </SimulationContext.Provider>
  );
}
