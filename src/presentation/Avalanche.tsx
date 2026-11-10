import { useEffect, useRef } from "react";
import { usePresentation } from "../state/presentation";
type Point = [number, number];
type Flight = {
  from: Point;
  to: Point;
  start: number;
  end: number;
  generation: number;
  hole?: boolean;
};
// Three impact generations. Each incoming conduction electron liberates a bound
// electron, leaving two outgoing conduction electrons and one hole.
function cascade() {
  const flights: Flight[] = [];
  const targets: { point: Point; time: number }[] = [];
  function branch(
    from: Point,
    start: number,
    generation: number,
    targetY = from[1],
  ) {
    const end = 0.25 + generation * 0.23;
    const to: Point = [end, targetY];
    flights.push({ from, to, start, end, generation });
    if (generation === 3) return;
    targets.push({ point: to, time: end });
    flights.push({
      from: to,
      to: [0.02, to[1]],
      start: end,
      end: 0.98,
      generation,
      hole: true,
    });
    const spread = 0.15 / 2 ** generation;
    for (const direction of [-1, 1])
      branch(to, end, generation + 1, to[1] + direction * spread);
  }
  branch([0.02, 0.5], 0.02, 0);
  return { flights, targets };
}
const cascadeData = cascade();
function Carrier({
  flight,
  map,
}: {
  flight: Flight;
  map: (p: Point) => Point;
}) {
  const { playing, reducedMotion } = usePresentation();
  const ref = useRef<SVGCircleElement>(null);
  const animation = useRef<Animation | null>(null);
  const [x, y] = map(flight.from),
    [tx, ty] = map(flight.to);
  useEffect(() => {
    if (reducedMotion || !ref.current) return;
    const move = `translate(${tx - x}px, ${ty - y}px)`;
    const start = flight.start,
      end = flight.end;
    const a = ref.current.animate(
      [
        { offset: 0, transform: "translate(0,0)", opacity: 0 },
        { offset: start, transform: "translate(0,0)", opacity: 0 },
        { offset: start + 0.006, transform: "translate(0,0)", opacity: 1 },
        { offset: end - 0.006, transform: move, opacity: 1 },
        { offset: end, transform: move, opacity: 0 },
        { offset: 1, transform: move, opacity: 0 },
      ],
      { duration: 6000, iterations: Infinity, easing: "linear" },
    );
    animation.current = a;
    if (!playing) a.pause();
    return () => {
      a.cancel();
      animation.current = null;
    };
  }, [x, y, tx, ty, flight, reducedMotion]);
  useEffect(() => {
    if (playing) animation.current?.play();
    else animation.current?.pause();
  }, [playing]);
  return (
    <circle
      ref={ref}
      className={flight.hole ? "avalanche-hole" : "avalanche-electron"}
      data-generation={flight.generation}
      cx={reducedMotion ? (x + tx) / 2 : x}
      cy={reducedMotion ? (y + ty) / 2 : y}
      r={flight.hole ? 3.5 : 4}
      fill={flight.hole ? "#fff" : "var(--n-ink)"}
      stroke={flight.hole ? "var(--p-ink)" : "var(--n-surface)"}
      strokeWidth="1"
      opacity={reducedMotion ? 0.8 : 0}
    />
  );
}
export function Avalanche({ map }: { map: (p: Point) => Point }) {
  return (
    <g
      className="avalanche-cascade"
      aria-label="Impact ionization: one incoming electron produces two conduction electrons and a hole; the process repeats."
    >
      {cascadeData.targets.map(({ point }, i) => {
        const [x, y] = map(point);
        return (
          <g key={i} className="ionization-target">
            <circle
              cx={x}
              cy={y}
              r="7"
              fill="none"
              stroke="#999"
              strokeWidth=".6"
              strokeDasharray="2 3"
            />
            <circle cx={x} cy={y} r="1.8" fill="#aaa" />
          </g>
        );
      })}
      {cascadeData.flights.map((flight, i) => (
        <Carrier key={i} flight={flight} map={map} />
      ))}
    </g>
  );
}
