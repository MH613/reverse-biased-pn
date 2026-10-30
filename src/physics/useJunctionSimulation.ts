import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { validateCircuit, traceCurrent, type Connection } from "../lab/circuit";
import { solveJunction } from "./model";
import type { SimulationSnapshot } from "./SimulationContext";
/** Interpolate only voltage, then derive an entire coherent physical snapshot. */
export function useJunctionSimulation(
  requested: number,
  connections: Connection[],
  enabled = true,
): SimulationSnapshot {
  const reducedMotion = useReducedMotion();
  const circuit = useMemo(() => validateCircuit(connections), [connections]);
  const target =
    circuit.valid && Number.isFinite(requested)
      ? Math.max(0, Math.min(10, requested))
      : 0;
  // Restoring an already connected lab restores its bias, not a fictitious power-up.
  const [rendered, setRendered] = useState(target),
    live = useRef(rendered);
  useEffect(() => {
    if (!enabled) return;
    if (!circuit.valid) {
      live.current = 0;
      setRendered(0);
      return;
    }
    if (reducedMotion) {
      live.current = target;
      setRendered(target);
      return;
    }
    let id: number,
      previous = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - (previous || now - 16)) / 1000, 0.05);
      previous = now;
      const next =
        live.current + (target - live.current) * (1 - Math.exp(-dt * 18));
      live.current = Math.abs(next - target) < 0.0001 ? target : next;
      setRendered(live.current);
      if (live.current !== target) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target, circuit.valid, enabled, reducedMotion]);
  return useMemo(() => {
    // An open circuit has no applied source voltage immediately, not a stale frame.
    const solution = solveJunction(circuit.valid ? rendered : 0),
      trace = circuit.valid
        ? traceCurrent(connections)
        : { directions: {}, meterSign: 1 };
    const loopCurrentA =
      circuit.valid && solution.terminalCurrentA !== 0
        ? -solution.terminalCurrentA
        : 0;
    return {
      circuit,
      connections,
      requestedVoltageV: target,
      solution,
      loopCurrentA,
      ammeterCurrentA: loopCurrentA === 0 ? 0 : loopCurrentA * trace.meterSign,
      wireDirections: trace.directions,
      settling: solution.reverseVoltageV !== target,
    };
  }, [circuit, connections, rendered, target]);
}
