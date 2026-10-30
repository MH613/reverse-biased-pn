import { usePresentation } from "../state/presentation";
export function FieldProfile() {
  const { stage, voltage } = usePresentation();
  const { width } = usePresentation();
  const half = width * 0.48,
    height = stage === 0 ? 12 : width * 0.31;
  return (
    <div className="field-profile">
      <div className="panel-heading">
        <span>Electric field</span>
      </div>
      <svg
        viewBox="0 0 360 132"
        role="img"
        aria-label={`Conceptual triangular electric-field magnitude profile. ${stage === 3 ? `Reverse bias ${voltage.toFixed(1)} volts.` : ""} Field direction is N to P.`}
      >
        <defs>
          <pattern
            id="profile-hatch"
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(30)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="5"
              stroke="#9c9c9c"
              strokeWidth=".5"
            />
          </pattern>
        </defs>
        <path
          d="M20,105 H340 M36,113 V12"
          stroke="#c2c2c2"
          fill="none"
          strokeWidth=".8"
        />
        <path
          d="M32,17 36,12 40,17 M335,101 340,105 335,109"
          fill="none"
          stroke="#c2c2c2"
          strokeWidth=".8"
        />
        <path
          d="M180,19 V108"
          stroke="#cfcfcf"
          strokeDasharray="3 4"
          strokeWidth=".8"
        />
        <path
          d={`M${180 - half},105 L180,${105 - height} L${180 + half},105 Z`}
          fill="#efefef"
          stroke="#858585"
          strokeWidth="1.4"
        />
        <path
          d={`M${180 - half},105 L180,${105 - height} L${180 + half},105 Z`}
          fill="url(#profile-hatch)"
        />
        <path
          d={`M${180 - half},107 V115 M${180 + half},107 V115 M${180 - half},112 H${180 + half}`}
          stroke="#a4a4a4"
          fill="none"
          strokeWidth=".7"
        />
        <text x="180" y="128" textAnchor="middle">
          W
        </text>
        <text x="16" y="19">
          |E|
        </text>
        <text x="344" y="117">
          x
        </text>
        <text x="58" y="124" fill="#868686">
          P
        </text>
        <text x="310" y="124" fill="#7c7c7c">
          N
        </text>
        <text x="190" y={Math.max(15, 100 - height)} fill="#858585">
          E
          <tspan dy="2" fontSize="7">
            max
          </tspan>
        </text>
      </svg>
      <div className="profile-caption">
        <span>← N to P</span>
      </div>
    </div>
  );
}
