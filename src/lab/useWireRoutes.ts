import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  displayedRoute,
  planRoutes,
  routeControls,
  type RouteMap,
} from "./routing";
import type { Connection } from "./circuit";
import type { Positions } from "./geometry";
export function useWireRoutes(
  requests: Pick<Connection, "id" | "from" | "to">[],
  positions: Positions,
  active = true,
) {
  const reducedMotion = useReducedMotion();
  const previous = useRef<RouteMap>({}),
    live = useRef<Record<string, number[]>>({}),
    frame = useRef(0),
    last = useRef(0);
  const plans = useMemo(() => {
    const next = planRoutes(requests, positions, previous.current);
    previous.current = next;
    return next;
  }, [requests, positions]);
  const goals = useMemo(
      () =>
        Object.fromEntries(
          Object.entries(plans).map(([id, p]) => [id, routeControls(p)]),
        ),
      [plans],
    ),
    goalsRef = useRef(goals);
  goalsRef.current = goals;
  for (const id in goals)
    if (!live.current[id]) live.current[id] = goals[id].slice();
  const [, paint] = useState(0);
  useEffect(() => {
    for (const id in live.current) if (!(id in goals)) delete live.current[id];
    if (!active) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      return;
    }
    const changed = Object.keys(goals).some((id) =>
      goals[id].some((v, i) => Math.abs(v - live.current[id][i]) > 0.02),
    );
    if (reducedMotion) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      if (!changed) return;
      live.current = structuredClone(goals);
      paint((n) => n + 1);
      return;
    }
    if (!changed) return;
    if (frame.current) return;
    last.current = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - (last.current || now - 16)) / 1000, 0.04);
      last.current = now;
      let moving = false;
      for (const id in goalsRef.current) {
        const target = goalsRef.current[id],
          value = live.current[id] ?? target.slice();
        for (let i = 0; i < value.length; i++) {
          const delta = target[i] - value[i];
          if (Math.abs(delta) > 0.02) {
            value[i] += delta * (1 - Math.exp(-dt * 28));
            moving = true;
          } else value[i] = target[i];
        }
        live.current[id] = value;
      }
      paint((n) => n + 1);
      frame.current = moving ? requestAnimationFrame(tick) : 0;
    };
    frame.current = requestAnimationFrame(tick);
  }, [goals, active, reducedMotion]);
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    },
    [],
  );
  return Object.fromEntries(
    Object.entries(plans).map(([id, p]) => [
      id,
      displayedRoute(p, live.current[id] ?? goals[id], positions).path,
    ]),
  );
}
