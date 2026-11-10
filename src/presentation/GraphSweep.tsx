import { useId } from "react";
import { usePresentation } from "../state/presentation";

/** Decorative illumination only; the physical profile and measurements stay fixed. */
export function GraphSweep({ paths }: { paths: string[] }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const { playing, reducedMotion } = usePresentation();
  if (reducedMotion) return null;
  const animation = {
    animationPlayState: playing ? "running" : "paused",
  } as const;
  return (
    <g className="graph-sweep" aria-hidden="true" pointerEvents="none">
      <defs>
        <linearGradient id={`${id}-fade`} x1="0" x2="1" y1="0" y2="0">
          <stop stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" />
        </linearGradient>
        <clipPath id={`${id}-plot`}>
          <rect x="44" y="24" width="308" height="134" />
        </clipPath>
        <mask
          id={`${id}-trace`}
          maskUnits="userSpaceOnUse"
          x="44"
          y="24"
          width="308"
          height="134"
        >
          <rect
            className="scope-sweep"
            x="0"
            y="24"
            width="48"
            height="134"
            fill={`url(#${id}-fade)`}
            style={animation}
          />
        </mask>
      </defs>
      <g clipPath={`url(#${id}-plot)`}>
        <g className="scope-sweep" style={animation}>
          <rect
            x="0"
            y="24"
            width="48"
            height="134"
            fill={`url(#${id}-fade)`}
            opacity=".035"
          />
          <path d="M48 24 V158" stroke="#fff" strokeWidth=".7" opacity=".1" />
        </g>
        <g
          mask={`url(#${id}-trace)`}
          fill="none"
          stroke="#fff"
          strokeWidth="2.7"
          opacity=".65"
        >
          {paths.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      </g>
    </g>
  );
}
