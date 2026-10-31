import { useId, useState } from "react";
import { usePresentation } from "../state/presentation";
import { useSimulation } from "../physics/SimulationContext";
import { ILLUSTRATION_UNITS_PER_METRE } from "../physics/model";
import { project, points, wirePath, type WorldPoint } from "./isometric";
import { VoltageSource, sourcePorts } from "./VoltageSource";
const surface = (left: number, right: number, z = 60) =>
  points([
    [left, 0, z],
    [right, 0, z],
    [right, 170, z],
    [left, 170, z],
  ]);
const atomGrid = Array.from({ length: 132 }, (_, i) => ({
  x: 18 + (i % 22) * 21,
  y: 14 + Math.floor(i / 22) * 28,
}));
const carriers = Array.from({ length: 38 }, (_, i) => ({
  x: 22 + (i % 10) * 47 + Math.sin(i * 3) * 9,
  y: 17 + Math.floor(i / 10) * 40,
  phase: i * 2.399,
}));
export function Junction({
  showIons,
  showCarriers,
  selected,
  onSelect,
  embedded = false,
  showCircuit = true,
  showGrid = true,
  interactive = true,
}: {
  embedded?: boolean;
  showCircuit?: boolean;
  showGrid?: boolean;
  interactive?: boolean;
  showIons: boolean;
  showCarriers: boolean;
  selected: string | null;
  onSelect: (v: string | null) => void;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const { stage, time, progress } = usePresentation();
  const [hovered, setHovered] = useState<string | null>(null);
  const presentation = usePresentation();
  const simulation = useSimulation();
  const physical = simulation?.solution;
  const width = physical
    ? physical.widthM * ILLUSTRATION_UNITS_PER_METRE
    : presentation.width;
  const fraction = physical
    ? physical.xpM / physical.widthM
    : (presentation.pFraction ?? 0.5);
  const left = 240 - width * fraction,
    right = 240 + width * (1 - fraction);
  const connected = stage >= 2;
  const connection = stage === 2 ? Math.min(1, progress * 3) : 1;
  const active = selected || hovered;
  const wireP: WorldPoint[] = [
    [0, 0, 36],
    [0, -35, 36],
    [0, -35, -40],
    [80, -35, -40],
    [80, -300, -40],
    [387, -300, -40],
    [387, -260, -40],
    sourcePorts.p,
  ];
  const wireN: WorldPoint[] = [
    [480, 0, 36],
    [540, 0, 36],
    [540, 0, -40],
    [570, 0, -40],
    [570, -280, -40],
    [507, -280, -40],
    [507, -260, -40],
    sourcePorts.n,
  ];
  const Container = embedded ? "g" : "svg";
  return (
    <Container
      className={`junction-illustration ${physical ? "has-physics" : ""}`}
      data-depletion-width-m={physical?.widthM}
      data-p-boundary-m={physical ? -physical.xpM : undefined}
      data-n-boundary-m={physical?.xnM}
      viewBox={embedded ? undefined : "0 0 940 600"}
      role="img"
      aria-label="Isometric PN semiconductor junction: P type on the left, N type on the right, with a central depletion region. Electric field points from N to P."
    >
      <defs>
        <pattern
          id={`hatch-${uid}`}
          width="5"
          height="5"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(25)"
        >
          <line x1="0" y1="0" x2="0" y2="5" stroke="#cdcdcd" strokeWidth=".6" />
        </pattern>
        <pattern
          id={`fine-dots-${uid}`}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1" cy="1" r=".55" fill="#bdbdbd" />
        </pattern>
        <marker
          id={`field-arrow-${uid}`}
          markerWidth="7"
          markerHeight="7"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path
            d="M0,0 L6,3 L0,6"
            fill="none"
            stroke="#828282"
            strokeWidth="1.1"
          />
        </marker>
        <marker
          id={`small-arrow-${uid}`}
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6" fill="none" stroke="#7f7f7f" />
        </marker>
      </defs>
      <g
        className="drafting-ground"
        style={{ display: showGrid ? undefined : "none" }}
        stroke="#e7e7e7"
        strokeWidth=".7"
        fill="none"
      >
        {[-120, -40, 40, 120, 200, 280, 360, 440, 520, 600].map((x) => (
          <path
            key={x}
            d={`M${project(x, -340, -40)} L${project(x, 310, -40)}`}
          />
        ))}
        {[-340, -260, -180, -100, -20, 60, 140, 220, 300].map((y) => (
          <path
            key={y}
            d={`M${project(-100, y, -40)} L${project(590, y, -40)}`}
          />
        ))}
      </g>
      <g
        className="substrate"
        stroke="#989898"
        strokeWidth=".9"
        strokeLinejoin="round"
      >
        <polygon
          points={points([
            [-26, -18, -12],
            [506, -18, -12],
            [506, -18, -25],
            [-26, -18, -25],
          ])}
          fill="#eaeaea"
        />
        <polygon
          points={points([
            [506, -18, -12],
            [506, 188, -12],
            [506, 188, -25],
            [506, -18, -25],
          ])}
          fill="#f1f1f1"
        />
        <polygon
          points={points([
            [-26, -18, -12],
            [506, -18, -12],
            [506, 188, -12],
            [-26, 188, -12],
          ])}
          fill="#f4f4f4"
        />
        {[
          [-14, -6],
          [494, -6],
          [-14, 176],
          [494, 176],
        ].map(([x, y], i) => (
          <ellipse
            key={i}
            cx={project(x, y, -12)[0]}
            cy={project(x, y, -12)[1]}
            rx="3.4"
            ry="1.9"
            fill="#e4e4e4"
          />
        ))}
        <polygon
          points={points([
            [0, 0, 60],
            [480, 0, 60],
            [480, 0, 0],
            [0, 0, 0],
          ])}
          fill="#efefef"
        />
        <polygon
          points={points([
            [0, 0, 60],
            [480, 0, 60],
            [480, 0, 0],
            [0, 0, 0],
          ])}
          fill={`url(#hatch-${uid})`}
        />
        <polygon
          points={points([
            [480, 0, 60],
            [480, 170, 60],
            [480, 170, 0],
            [480, 0, 0],
          ])}
          fill="#eaeaea"
        />
        <polygon points={surface(0, 240)} fill="#f6f6f6" />
        <polygon points={surface(240, 480)} fill="#f1f1f1" />
        <polygon
          className="depletion-surface"
          points={surface(left, right)}
          fill="#e5e5e5"
          stroke="none"
        />
        <polygon
          points={points([
            [left, 0, 60],
            [right, 0, 60],
            [right, 0, 0],
            [left, 0, 0],
          ])}
          fill="#e2e2e2"
          stroke="none"
          opacity=".85"
        />
        <polygon
          points={surface(left, right)}
          fill={`url(#fine-dots-${uid})`}
          stroke="none"
          opacity=".65"
        />
        <path
          d={`M${project(240, 170)} L${project(240, 0)} L${project(240, 0, 0)}`}
          fill="none"
          strokeDasharray="3 4"
          opacity=".55"
        />
        {[left, right].map((x, i) => (
          <path
            key={i}
            d={`M${project(x, 170)} L${project(x, 0)} L${project(x, 0, 0)}`}
            fill="none"
            stroke="#959595"
            strokeDasharray="4 4"
          />
        ))}
        <polygon points={surface(0, 480)} fill="none" stroke="#6a6a6a" />
        {[0, 480].map((x) => (
          <g key={x}>
            <polygon points={surface(x - 7, x + 7, 62)} fill="#dbdbdb" />
            <polygon
              points={points([
                [x - 7, 0, 62],
                [x + 7, 0, 62],
                [x + 7, 0, 20],
                [x - 7, 0, 20],
              ])}
              fill={`url(#hatch-${uid})`}
            />
            {Array.from({ length: 15 }, (_, i) => (
              <path
                key={i}
                d={`M${project(x - 7, i * 12, 63)} L${project(x + 7, i * 12, 63)}`}
                stroke="#b2b2b2"
                strokeWidth=".7"
              />
            ))}
          </g>
        ))}
      </g>
      <g
        opacity={showIons ? (active && active !== "ions" ? 0.35 : 1) : 0}
        className="layer-fade"
      >
        {atomGrid.map(({ x, y }, i) => {
          if (physical && x < 240 && ((i % 22) + Math.floor(i / 22)) % 2)
            return null;
          const exposed = x > left && x < right;
          const exposure = Math.max(
            0,
            Math.min(1, Math.min(x - left, right - x) / 14 + 0.5),
          );
          const p = project(x, y, 61);
          return (
            <g
              key={i}
              transform={`translate(${p})`}
              opacity={0.23 + 0.62 * exposure}
            >
              <circle
                r="5.2"
                fill={exposed ? "#f8f8f8" : "none"}
                stroke="#848484"
                strokeWidth=".8"
              />
              <path
                d={x < 240 ? "M-2.2,0 H2.2" : "M-2.2,0 H2.2 M0,-2.2 V2.2"}
                stroke="#6f6f6f"
                strokeWidth=".9"
              />
            </g>
          );
        })}
      </g>
      <g opacity={showCarriers ? 1 : 0} className="layer-fade">
        {carriers.map(({ x, y, phase }, i) => {
          const isP = x < 240;
          const minority = i === 10 || i === 29;

          let cx = x;
          if (stage > 0 && !physical) {
            const edge = isP
              ? left - 13 - (i % 3) * 3
              : right + 13 + (i % 3) * 3;
            cx =
              (x + edge + (isP ? -1 : 1) * Math.sqrt((x - edge) ** 2 + 9)) / 2;
          }
          const p = project(cx, y, 64);
          const hole = minority ? !isP : isP;
          const neutralOpacity = physical
            ? Math.max(0, Math.min(1, (isP ? left - x : x - right) / 12))
            : Math.max(
                0,
                Math.min(1, isP ? (left + 35 - x) / 35 : (x - right + 35) / 35),
              );
          return (
            <g
              key={i}
              opacity={
                neutralOpacity *
                (active && active !== (hole ? "holes" : "electrons")
                  ? 0.18
                  : minority
                    ? 0.65
                    : 1)
              }
              className="layer-fade"
            >
              <g
                className={physical ? undefined : "carrier-motion"}
                style={{
                  animationDelay: `-${phase * 1.2}s`,
                  animationDuration: `${7 + (i % 5) * 0.7}s`,
                  animationPlayState: presentation.playing
                    ? "running"
                    : "paused",
                }}
              >
                <circle
                  cx={p[0]}
                  cy={p[1]}
                  r={minority ? 3.5 : 4.7}
                  fill={hole ? "#ffffff" : "#333333"}
                  stroke="#333333"
                  strokeWidth="1.4"
                />
                {!hole && (
                  <path
                    d={`M${p[0] - 1.6},${p[1]} h3.2`}
                    stroke="#ffffff"
                    strokeWidth=".8"
                  />
                )}
                {hole && (
                  <path
                    d={`M${p[0] - 1.6},${p[1]} h3.2 M${p[0]},${p[1] - 1.6} v3.2`}
                    stroke="#8f8f8f"
                    strokeWidth=".8"
                  />
                )}
              </g>
            </g>
          );
        })}
      </g>
      {stage === 1 && (
        <g
          opacity={Math.min(1, progress * 16) * Math.max(0, 1 - progress * 1.6)}
        >
          {[0, 1, 2, 3].map((i) => {
            const t = Math.min(1, progress * 3.2),
              x = 195 + 90 * t,
              y = 25 + i * 40,
              p = project(x, y, 65),
              q = project(480 - x, y, 65);
            return (
              <g key={i} opacity={1 - Math.max(0, t - 0.65) / 0.35}>
                <circle
                  cx={p[0]}
                  cy={p[1]}
                  r="4.8"
                  fill="#f7f7f7"
                  stroke="#8f8f8f"
                />
                <circle cx={q[0]} cy={q[1]} r="4" fill="#848484" />
              </g>
            );
          })}
        </g>
      )}
      <g
        opacity={stage > 0 ? Math.min(1, progress * 2) : 0}
        stroke="#828282"
        strokeWidth="1.2"
        fill="none"
      >
        {[35, 85, 135].map((y, i) => {
          const a = project(right - 7, y, 83),
            b = project(left + 7, y, 83);
          return (
            <path
              key={i}
              d={`M${a} L${b}`}
              markerEnd={`url(#field-arrow-${uid})`}
              strokeDasharray="3 4"
            />
          );
        })}
      </g>
      <g
        className="figure-labels"
        fill="#555555"
        fontSize="12"
        fontFamily="Inter, sans-serif"
      >
        <text x={project(55, 185, 74)[0]} y={project(55, 185, 74)[1]}>
          P
        </text>
        <text x={project(430, 185, 74)[0]} y={project(430, 185, 74)[1]}>
          N
        </text>
        {stage > 0 && (
          <>
            <path
              d={`M${project(left, 176, 65)} l0,-18 M${project(right, 176, 65)} l0,-18 M${project(left, 176, 78)} L${project(right, 176, 78)}`}
              fill="none"
              stroke="#999999"
              strokeWidth=".8"
            />
            <text
              x={project((left + right) / 2, 176, 103)[0]}
              y={project((left + right) / 2, 176, 103)[1]}
              textAnchor="middle"
              fontSize="10"
            >
              Depletion region
            </text>
          </>
        )}
      </g>
      <g
        opacity={connected ? connection : 0}
        aria-hidden={!connected || !showCircuit}
        style={{ display: showCircuit ? undefined : "none" }}
        className="layer-fade"
        strokeLinejoin="round"
      >
        <g
          className="circuit-wires"
          fill="none"
          stroke="#888888"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="miter"
        >
          {[wireP, wireN].map((route, i) => (
            <path
              className="circuit-wire"
              key={i}
              d={wirePath(route)}
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset={1 - connection}
            />
          ))}
        </g>
        <VoltageSource />
      </g>
      <g
        className="svg-hit-regions"
        fill="transparent"
        stroke="none"
        style={{ display: interactive ? undefined : "none" }}
      >
        <polygon
          points={surface(0, left)}
          tabIndex={0}
          role="button"
          aria-label="Inspect P-type holes"
          onFocus={() => setHovered("holes")}
          onBlur={() => setHovered(null)}
          onMouseEnter={() => setHovered("holes")}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onSelect(selected === "holes" ? null : "holes")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(selected === "holes" ? null : "holes");
            }
          }}
        />
        <polygon
          points={surface(right, 480)}
          tabIndex={0}
          role="button"
          aria-label="Inspect N-type electrons"
          onFocus={() => setHovered("electrons")}
          onBlur={() => setHovered(null)}
          onMouseEnter={() => setHovered("electrons")}
          onMouseLeave={() => setHovered(null)}
          onClick={() =>
            onSelect(selected === "electrons" ? null : "electrons")
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(selected === "electrons" ? null : "electrons");
            }
          }}
        />
      </g>
    </Container>
  );
}
