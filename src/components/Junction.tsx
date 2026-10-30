import { useState } from "react";
import { usePresentation } from "../state/presentation";
const project = (x: number, y: number, z = 60): [number, number] => [
  190 + x * 0.96 + y * 0.7,
  265 + x * 0.27 - y * 0.5 - z,
];
const points = (coords: number[][]) =>
  coords
    .map(([x, y, z]) => project(x, y, z))
    .map((p) => p.join(","))
    .join(" ");
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
}: {
  showIons: boolean;
  showCarriers: boolean;
  selected: string | null;
  onSelect: (v: string | null) => void;
}) {
  const { stage, time, progress, voltage, bias } = usePresentation();
  const [hovered, setHovered] = useState<string | null>(null);
  const { width } = usePresentation();
  const left = 240 - width / 2,
    right = 240 + width / 2;
  const connected = stage >= 2;
  const connection = stage === 2 ? Math.min(1, progress * 3) : 1;
  const active = selected || hovered;
  const terminalP = project(-18, 85, 45),
    terminalN = project(498, 85, 45);
  return (
    <svg
      className="junction-illustration"
      viewBox="0 0 940 600"
      role="img"
      aria-label="Isometric PN semiconductor junction: P type on the left, N type on the right, with a central depletion region. Electric field points from N to P."
    >
      <defs>
        <pattern
          id="hatch"
          width="5"
          height="5"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(25)"
        >
          <line x1="0" y1="0" x2="0" y2="5" stroke="#c9ceca" strokeWidth=".6" />
        </pattern>
        <pattern
          id="fine-dots"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1" cy="1" r=".55" fill="#b9bfba" />
        </pattern>
        <marker
          id="field-arrow"
          markerWidth="7"
          markerHeight="7"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path
            d="M0,0 L6,3 L0,6"
            fill="none"
            stroke="#658b82"
            strokeWidth="1.1"
          />
        </marker>
        <marker
          id="small-arrow"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6" fill="none" stroke="#7b817b" />
        </marker>
      </defs>
      <g
        className="drafting-ground"
        stroke="#e5e8e1"
        strokeWidth=".7"
        fill="none"
      >
        {[-120, -40, 40, 120, 200, 280, 360, 440, 520, 600].map((x) => (
          <path
            key={x}
            d={`M${project(x, -120, -40)} L${project(x, 310, -40)}`}
          />
        ))}
        {[-100, -20, 60, 140, 220, 300].map((y) => (
          <path
            key={y}
            d={`M${project(-100, y, -40)} L${project(590, y, -40)}`}
          />
        ))}
      </g>
      <g
        className="substrate"
        stroke="#929a91"
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
          fill="#e8ebe4"
        />
        <polygon
          points={points([
            [506, -18, -12],
            [506, 188, -12],
            [506, 188, -25],
            [506, -18, -25],
          ])}
          fill="#f1f2ed"
        />
        <polygon
          points={points([
            [-26, -18, -12],
            [506, -18, -12],
            [506, 188, -12],
            [-26, 188, -12],
          ])}
          fill="#f4f5ef"
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
            fill="#e2e5de"
          />
        ))}
        <polygon
          points={points([
            [0, 0, 60],
            [480, 0, 60],
            [480, 0, 0],
            [0, 0, 0],
          ])}
          fill="#eef0e9"
        />
        <polygon
          points={points([
            [0, 0, 60],
            [480, 0, 60],
            [480, 0, 0],
            [0, 0, 0],
          ])}
          fill="url(#hatch)"
        />
        <polygon
          points={points([
            [480, 0, 60],
            [480, 170, 60],
            [480, 170, 0],
            [480, 0, 0],
          ])}
          fill="#e6ebe5"
        />
        <polygon points={surface(0, 240)} fill="#f8f6f0" />
        <polygon points={surface(240, 480)} fill="#edf3ee" />
        <polygon points={surface(left, right)} fill="#e0e7dc" stroke="none" />
        <polygon
          points={points([
            [left, 0, 60],
            [right, 0, 60],
            [right, 0, 0],
            [left, 0, 0],
          ])}
          fill="#dfe4d8"
          stroke="none"
          opacity=".85"
        />
        <polygon
          points={surface(left, right)}
          fill="url(#fine-dots)"
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
            stroke="#8b9a84"
            strokeDasharray="4 4"
          />
        ))}
        <polygon points={surface(0, 480)} fill="none" stroke="#626d61" />
        {[0, 480].map((x) => (
          <g key={x}>
            <polygon points={surface(x - 7, x + 7, 62)} fill="#d8dcd5" />
            <polygon
              points={points([
                [x - 7, 0, 62],
                [x + 7, 0, 62],
                [x + 7, 0, 20],
                [x - 7, 0, 20],
              ])}
              fill="url(#hatch)"
            />
            {Array.from({ length: 15 }, (_, i) => (
              <path
                key={i}
                d={`M${project(x - 7, i * 12, 63)} L${project(x + 7, i * 12, 63)}`}
                stroke="#adb4aa"
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
          const exposed = x > left && x < right;
          const exposure = Math.max(
            0,
            Math.min(1, (width / 2 - Math.abs(x - 240)) / 14 + 0.5),
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
                fill={exposed ? "#f8f9f5" : "none"}
                stroke="#7d8779"
                strokeWidth=".8"
              />
              <path
                d={x < 240 ? "M-2.2,0 H2.2" : "M-2.2,0 H2.2 M0,-2.2 V2.2"}
                stroke="#667361"
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
          let dx = Math.sin(time * 0.55 + phase) * 5,
            dy = Math.cos(time * 0.45 + phase) * 3;
          let cx = x;
          if (stage > 0)
            cx = isP
              ? Math.min(x, left - 13 - (i % 3) * 3)
              : Math.max(x, right + 13 + (i % 3) * 3);
          const p = project(cx + dx, y + dy, 64);
          const hole = minority ? !isP : isP;
          return (
            <g
              key={i}
              opacity={
                active && active !== (hole ? "holes" : "electrons")
                  ? 0.18
                  : minority
                    ? 0.65
                    : 1
              }
              className="layer-fade"
            >
              <circle
                cx={p[0]}
                cy={p[1]}
                r={minority ? 3.5 : 4.7}
                fill={hole ? "#faf7f1" : "#608f82"}
                stroke={hole ? "#cb806c" : "#547f74"}
                strokeWidth="1.4"
              />
              {hole && (
                <path
                  d={`M${p[0] - 1.6},${p[1]} h3.2 M${p[0]},${p[1] - 1.6} v3.2`}
                  stroke="#cb806c"
                  strokeWidth=".8"
                />
              )}
            </g>
          );
        })}
      </g>
      {stage === 1 && (
        <g opacity={Math.max(0, 1 - progress * 1.6)}>
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
                  fill="#faf7f1"
                  stroke="#cb806c"
                />
                <circle cx={q[0]} cy={q[1]} r="4" fill="#608f82" />
              </g>
            );
          })}
        </g>
      )}
      <g
        opacity={stage > 0 ? Math.min(1, progress * 2) : 0}
        stroke="#658b82"
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
              markerEnd="url(#field-arrow)"
              strokeDasharray="3 4"
              strokeDashoffset={-time * 6}
            />
          );
        })}
      </g>
      <g
        className="figure-labels"
        fill="#5f685e"
        fontSize="11"
        fontFamily="monospace"
      >
        <path
          d="M238 174 L208 128 H140"
          fill="none"
          stroke="#9da497"
          strokeWidth=".8"
        />
        <circle cx="238" cy="174" r="2" fill="#9da497" />
        <text x="140" y="113" fontSize="13" fill="#b16c58">
          P-TYPE
        </text>
        <text
          x="140"
          y="130"
          transform="translate(0,17)"
          fontSize="9"
          letterSpacing="1"
        >
          HOLE-RICH
        </text>
        <path
          d="M662 202 L732 158 H800"
          fill="none"
          stroke="#9da497"
          strokeWidth=".8"
        />
        <circle cx="662" cy="202" r="2" fill="#9da497" />
        <text x="739" y="141" fontSize="13" fill="#557c70">
          N-TYPE
        </text>
        <text
          x="739"
          y="158"
          transform="translate(0,17)"
          fontSize="9"
          letterSpacing="1"
        >
          ELECTRON-RICH
        </text>
        <text
          x="307"
          y="311"
          transform="rotate(15.7 307 311)"
          fontSize="8"
          letterSpacing="2"
        >
          Si / MONOCRYSTALLINE
        </text>
        <path
          d={`M${project(left, 176, 65)} l0,-18 M${project(right, 176, 65)} l0,-18 M${project(left, 176, 78)} L${project(right, 176, 78)}`}
          fill="none"
          stroke="#89947f"
          strokeWidth=".8"
        />
        <text
          x={project(240, 176, 100)[0]}
          y={project(240, 176, 100)[1]}
          textAnchor="middle"
          fontSize="9"
          letterSpacing="1.2"
        >
          {stage === 0 ? "THE JUNCTION" : "DEPLETION REGION"}
        </text>
      </g>
      <g
        opacity={connected ? connection : 0}
        className="layer-fade"
        strokeLinejoin="round"
      >
        <g
          fill="none"
          strokeWidth="1.7"
          strokeDasharray="1000"
          strokeDashoffset={1000 * (1 - connection)}
        >
          <path
            d={`M${terminalP} C140,310 110,415 230,448 S495,478 628,485`}
            stroke="#b77f6e"
          />
          <path
            d={`M${terminalN} C825,259 873,360 829,429 S748,466 714,496`}
            stroke="#6f8e80"
          />
        </g>
        <g transform="translate(589 411)" stroke="#6a7266" strokeWidth=".9">
          <path d="M0,30 88,0 179,34 91,65 Z" fill="#fafbf7" />
          <path d="M0,30 91,65 91,117 0,82 Z" fill="#f0f2eb" />
          <path d="M91,65 179,34 179,87 91,117 Z" fill="#e6ebe1" />
          <path d="M12,38 72,61 72,87 12,64Z" fill="#e0e8dc" />
          <text
            x="20"
            y="55"
            transform="rotate(21 20 55)"
            fontSize="13"
            fill="#4c6757"
            stroke="none"
            fontFamily="monospace"
          >
            {bias === "forward" && stage === 2
              ? "+0.4"
              : `−${stage === 3 ? voltage.toFixed(1) : "2.0"}`}{" "}
            V
          </text>
          <ellipse
            cx="111"
            cy="82"
            rx="10"
            ry="12"
            transform="rotate(18 111 82)"
            fill="#f7f8f3"
          />
          <path d="M111,81 l4,-7" />
          <ellipse cx="39" cy="78" rx="4" ry="3" fill="#b77f6e" />
          <ellipse cx="125" cy="88" rx="4" ry="3" fill="#6f8e80" />
          <text x="23" y="78" stroke="none" fontSize="9">
            {bias === "forward" && stage === 2 ? "+" : "−"}
          </text>
          <text x="136" y="87" stroke="none" fontSize="9">
            {bias === "forward" && stage === 2 ? "−" : "+"}
          </text>
          <text
            x="22"
            y="28"
            transform="rotate(-19 22 28)"
            fontSize="8"
            stroke="none"
            letterSpacing="1.3"
            fill="#747d6d"
          >
            DC / PRECISION SOURCE
          </text>
          {[0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              d={`M${145 + i * 4},${56 - i * 1.5} v16`}
              stroke="#acb5a4"
            />
          ))}
        </g>
      </g>
      <g className="svg-hit-regions" fill="transparent" stroke="none">
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
      <g fill="#9ba294" fontFamily="monospace" fontSize="8" letterSpacing="1.5">
        <text x="98" y="535">
          FIG. 0{stage + 1}
        </text>
        <path d="M98,545 h45" stroke="#9ba294" strokeWidth=".7" />
        <text x="98" y="563">
          AXONOMETRIC VIEW
        </text>
        <text x="98" y="577">
          SCHEMATIC · NOT TO SCALE
        </text>
      </g>
    </svg>
  );
}
