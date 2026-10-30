import { test, expect } from "@playwright/test";
import {
  planRoutes,
  routeConflicts,
  routeControls,
  displayedRoute,
} from "../src/lab/routing";
import {
  initialPositions,
  isValidPlacement,
  moveWithCollisions,
  type Positions,
} from "../src/lab/geometry";
import { suggestedConnections } from "../src/lab/circuit";
const requests = suggestedConnections.map((w, i) => ({ ...w, id: String(i) }));
test("routes the series loop without overlapping wire segments in distinct equipment layouts", () => {
  for (const positions of [
    initialPositions,
    {
      supply: { x: -480, y: 160 },
      junction: { x: 320, y: 160 },
      ammeter: { x: -80, y: -320 },
    },
    {
      supply: { x: -240, y: 280 },
      ammeter: { x: -240, y: 0 },
      junction: { x: -240, y: -280 },
    },
    {
      supply: { x: -280, y: -80 },
      ammeter: { x: 0, y: -80 },
      junction: { x: 0, y: 160 },
    },
  ] as Positions[]) {
    const plans = planRoutes(requests, positions);
    const routes = Object.values(plans);
    for (let i = 0; i < routes.length; i++) {
      expect(routes[i].points.length).toBeLessThan(30);
      for (let j = i + 1; j < routes.length; j++)
        expect(
          routeConflicts(routes[i].points, routes[j].points),
          JSON.stringify({ positions, plans }),
        ).toEqual([]);
      const visible = displayedRoute(
        routes[i],
        routeControls(routes[i]),
        positions,
      );
      for (let k = 1; k < visible.ground.length; k++) {
        const a = visible.ground[k - 1],
          b = visible.ground[k];
        expect(
          Math.min(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])),
        ).toBeLessThan(0.000001);
      }
    }
  }
});
test("fast pointer motion stops at equipment instead of tunnelling through it", () => {
  const p = structuredClone(initialPositions);
  const result = moveWithCollisions("ammeter", p.ammeter, { x: -600, y: 0 }, p);
  expect(isValidPlacement("ammeter", result, p)).toBe(true);
  expect(Math.hypot(result.x + 600, result.y)).toBeGreaterThan(20);
});

test("cached routes remain separated as terminals move, rather than retaining an obstructing old corridor", () => {
  let positions = structuredClone(initialPositions),
    cache = planRoutes(requests, positions);
  for (let i = 1; i <= 20; i++) {
    positions = {
      ...initialPositions,
      junction: { x: 160 + i * 8, y: 120 - i * 8 },
    };
    cache = planRoutes(requests, positions, cache);
    const routes = Object.values(cache);
    for (let a = 0; a < routes.length; a++)
      for (let b = a + 1; b < routes.length; b++)
        expect(routeConflicts(routes[a].points, routes[b].points)).toEqual([]);
  }
});
