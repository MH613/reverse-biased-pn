import { usePresentation } from "../state/presentation";
import { points, project, type WorldPoint } from "./isometric";
// A translated cuboid in the same world axes as the semiconductor.
export const sourcePorts = {
  p: [387, -260, 10] as WorldPoint,
  n: [507, -260, 10] as WorldPoint,
};
export function VoltageSource({
  reading,
  kind = "supply",
}: { reading?: string; kind?: "supply" | "ammeter" } = {}) {
  const { stage, voltage, bias } = usePresentation();
  const forward = stage === 2 && bias === "forward";
  const [x, y] = project(360, -260, 56);
  return (
    <g
      className="voltage-source"
      stroke="#777777"
      strokeWidth=".9"
      strokeLinejoin="round"
      aria-label={
        kind === "ammeter"
          ? "Isometric digital ammeter"
          : "Isometric DC voltage source"
      }
    >
      <polygon
        className="source-top"
        points={points([
          [360, -260, 56],
          [540, -260, 56],
          [540, -150, 56],
          [360, -150, 56],
        ])}
        fill="#fafafa"
      />
      <polygon
        points={points([
          [540, -260, 56],
          [540, -150, 56],
          [540, -150, -4],
          [540, -260, -4],
        ])}
        fill="#eeeeee"
      />
      <polygon
        points={points([
          [360, -260, 56],
          [540, -260, 56],
          [540, -260, -4],
          [360, -260, -4],
        ])}
        fill="#f6f6f6"
      />
      {Array.from({ length: 6 }, (_, i) => (
        <path
          key={i}
          d={`M${project(540, -245 + i * 13, 35)} L${project(540, -245 + i * 13, 8)}`}
          stroke="#bbbbbb"
          strokeWidth=".7"
        />
      ))}
      {[
        [371, -248],
        [529, -248],
        [371, -162],
        [529, -162],
      ].map(([a, b], i) => (
        <ellipse
          key={i}
          cx={project(a, b, 56)[0]}
          cy={project(a, b, 56)[1]}
          rx="1.7"
          ry="1"
          fill="#bbbbbb"
          stroke="none"
        />
      ))}
      <g
        transform={`matrix(.96 .27 0 1 ${x} ${y})`}
        fontFamily="Inter, sans-serif"
      >
        <rect
          x="12"
          y="11"
          width="83"
          height="26"
          rx="1"
          fill="#eeeeee"
          stroke="#999999"
        />
        <text
          className="source-readout"
          x="20"
          y="29"
          fontSize="13"
          fill="#555555"
          stroke="none"
        >
          {reading ?? `${forward ? "+" : "−"}${voltage.toFixed(2)} V`}
        </text>
        <circle cx="133" cy="23" r="10" fill="#fafafa" />
        <path d="M133,23 l4,-6" />
        <circle
          className="source-port-p"
          cx="27"
          cy="46"
          r="3.2"
          fill="#777777"
        />
        <circle
          className="source-port-n"
          cx="147"
          cy="46"
          r="3.2"
          fill="#777777"
        />
        <text
          x="38"
          y="49"
          fontSize={kind === "ammeter" ? "6" : "10"}
          stroke="none"
          fill="#555555"
        >
          {kind === "ammeter" ? "IN" : forward ? "+" : "−"}
        </text>
        <text
          x="157"
          y="49"
          fontSize={kind === "ammeter" ? "6" : "10"}
          stroke="none"
          fill="#555555"
        >
          {kind === "ammeter" ? "OUT" : forward ? "−" : "+"}
        </text>
      </g>
    </g>
  );
}
