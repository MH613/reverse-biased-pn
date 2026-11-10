import { useId, useState } from "react";
import { GraphSweep } from "./GraphSweep";
import { Variable } from "./Variable";
import { Avalanche } from "./Avalanche";
import { Equations } from "./Equations";
import { motion } from "motion/react";
import {
  chapters,
  type BiasMode,
  usePresentation,
} from "../state/presentation";
import {
  solveLesson,
  lessonCharge,
  lessonField,
  lessonPotential,
  type LessonSolution,
  ABRUPT_VBI,
  GRADED_VBI,
} from "../physics/lesson";

const XMAX = 1.2e-6;
const px = (x: number) => 44 + ((x + XMAX) / (2 * XMAX)) * 308;
const sample = (
  f: (x: number) => number,
  y: (v: number) => number,
  s: LessonSolution,
  xmax = XMAX,
) => {
  const px = (x: number) => 44 + ((x + xmax) / (2 * xmax)) * 308;
  // Include physical boundaries exactly, including the junction apex.
  const xs = [
    ...Array.from({ length: 181 }, (_, i) => -xmax + (i / 180) * 2 * xmax),
    -s.half,
    0,
    s.half,
  ].sort((a, b) => a - b);
  return xs
    .map((x, i) => `${i ? "L" : "M"}${px(x).toFixed(3)},${y(f(x)).toFixed(3)}`)
    .join(" ");
};
function Profile({
  type,
  s,
  reference,
  zoom = false,
}: {
  type: "charge" | "field" | "potential";
  s: LessonSolution;
  reference: boolean;
  zoom?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const { progress, reducedMotion } = usePresentation();
  const field = type === "field",
    potential = type === "potential";
  const title = field
    ? "Electric field"
    : potential
      ? "Electrostatic potential"
      : "Space charge";
  const xmax = zoom ? 0.3e-6 : XMAX;
  const px = (x: number) => 44 + ((x + xmax) / (2 * xmax)) * 308;
  const ticks = zoom ? [-0.2, 0, 0.2] : [-1, 0, 1];
  const max = field ? (zoom ? 4e6 : 1.5e7) : potential ? 11 : 2100;
  const y = (v: number) =>
    potential
      ? 158 - (v / max) * 124
      : field
        ? 42 - (v / max) * 116
        : 98 - (v / max) * 60;
  const f = field ? lessonField : potential ? lessonPotential : lessonCharge;
  const makePath = (sol: LessonSolution) => {
    if (type === "charge" && sol.kind === "abrupt") {
      const b = sol.half,
        r = lessonCharge(b / 2, sol);
      return [
        [-xmax, 0],
        [-b, 0],
        [-b, -r],
        [0, -r],
        [0, r],
        [b, r],
        [b, 0],
        [xmax, 0],
      ]
        .map(([x, v], i) => `${i ? "L" : "M"}${px(x)},${y(v)}`)
        .join(" ");
    }
    if (type === "charge") {
      const b = sol.half,
        r = lessonCharge(b, sol);
      return [
        [-xmax, 0],
        [-b, 0],
        [-b, -r],
        [b, r],
        [b, 0],
        [xmax, 0],
      ]
        .map(([x, v], i) => `${i ? "L" : "M"}${px(x)},${y(v)}`)
        .join(" ");
    }
    return sample((x) => f(x, sol), y, sol, xmax);
  };
  const d = makePath(s),
    eq = solveLesson(s.kind, 0);
  return (
    <article
      className="profile-card"
      data-profile={type}
      data-spatial-range-um={zoom ? "0.6" : "2.4"}
    >
      <div className="card-heading">
        <h2>{title}</h2>
        <span>
          {field ? "E(x) · MV/m" : potential ? "φ(x) · V" : "ρ(x) · kC/m³"}
        </span>
      </div>
      <svg
        viewBox="0 0 380 194"
        role="img"
        aria-label={`${title} against position; ${field ? "negative toward P" : potential ? "zero at the P depletion boundary" : "negative on P, positive on N"}`}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="var(--trace-line)" stopOpacity=".18" />
            <stop offset="1" stopColor="var(--trace-line)" stopOpacity=".02" />
          </linearGradient>
          <clipPath id={`${id}-reveal`}>
            <rect
              x="0"
              y="0"
              height="194"
              width={reducedMotion ? 380 : 380 * Math.min(1, progress * 5)}
            />
          </clipPath>
        </defs>
        <g className="graph-grid">
          {ticks.map((x) => (
            <path key={x} d={`M${px(x * 1e-6)},24 V158`} />
          ))}
          {[42, 98, 158].map((v) => (
            <path key={v} d={`M44,${v} H352`} />
          ))}
        </g>
        <path className="graph-zero" d={`M44,${y(0)} H352`} />
        <g className="graph-ticks">
          <text x="8" y={potential ? 34 : field ? 46 : 42}>
            {potential ? "11" : field ? "0" : "+2.1"}
          </text>
          <text x="8" y={potential ? 160 : field ? 160 : 101}>
            {potential ? "0" : field ? (zoom ? "−4" : "−15") : "0"}
          </text>
          {!field && !potential && (
            <text x="8" y="160">
              −2.1
            </text>
          )}
          {ticks.map((v) => (
            <text key={v} x={px(v * 1e-6)} y="180" textAnchor="middle">
              {v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : "0"}
            </text>
          ))}
          <text x="372" y="180" textAnchor="end">
            µm
          </text>
        </g>
        {[-s.half, s.half].map((b, i) => (
          <path key={i} className="graph-boundary" d={`M${px(b)},24 V158`} />
        ))}
        {reference && <path className="profile-reference" d={makePath(eq)} />}
        <g clipPath={`url(#${id}-reveal)`}>
          <path d={`${d} L352,${y(0)} L44,${y(0)} Z`} fill={`url(#${id})`} />
          <path className="profile-line" d={d} />
          <GraphSweep paths={[d]} />
          {field && (
            <circle
              cx={px(0)}
              cy={y(-s.peakFieldVM)}
              r="3"
              className="profile-peak"
            />
          )}
        </g>
      </svg>
      <div className="card-caption">
        <span>P region</span>
        <span>
          {potential
            ? "−dφ/dx = E"
            : field
              ? "Field direction: N → P"
              : "Metallurgical junction: x = 0"}
        </span>
        <span>N region</span>
      </div>
    </article>
  );
}
function Bands({ s }: { s: LessonSolution }) {
  const eg = 1.12,
    ecLeft = (eg + ABRUPT_VBI) / 2;
  const y = (e: number) => 30 + ((1.3 - e) / 12.8) * 128;
  const band = (offset: number) =>
    sample((x) => ecLeft - lessonPotential(x, s) + offset, y, s);
  return (
    <article className="profile-card band-card" data-profile="bands">
      <div className="card-heading">
        <h2>Energy bands</h2>
        <span>Energy · eV</span>
      </div>
      <svg
        viewBox="0 0 380 194"
        role="img"
        aria-label="Conduction and valence bands bend downward toward N. P-side Fermi level is above N-side by q times reverse voltage."
      >
        <g className="graph-grid">
          {[-1, 0, 1].map((x) => (
            <path key={x} d={`M${px(x * 1e-6)},24 V158`} />
          ))}
          {[42, 98, 158].map((v) => (
            <path key={v} d={`M44,${v} H352`} />
          ))}
        </g>
        <path d={band(0)} className="profile-line" />
        <path d={band(-eg)} className="profile-line" />
        <GraphSweep paths={[band(0), band(-eg)]} />
        <path
          d={`M44,${y(0)} H${px(-s.half)} M${px(s.half)},${y(-s.reverseVoltageV)} H352`}
          className="fermi-line"
        />
        <g className="band-labels">
          <text x="10" y={y(ecLeft) + 3}>
            E꜀
          </text>
          <text x="10" y={y(ecLeft - eg) + 5}>
            Eᵥ
          </text>
          <text x="62" y={y(0) - 7}>
            Eꜰᴘ
          </text>
          <text x="305" y={y(-s.reverseVoltageV) + 14}>
            Eꜰɴ
          </text>
        </g>
        <g className="graph-ticks">
          <text x="5" y="28">
            +1.3
          </text>
          <text x="4" y="162">
            −11.5
          </text>
          {[-1, 0, 1].map((v) => (
            <text key={v} x={px(v * 1e-6)} y="180" textAnchor="middle">
              {v === 1 ? "+1" : v === -1 ? "−1" : "0"}
            </text>
          ))}
          <text x="372" y="180" textAnchor="end">
            µm
          </text>
        </g>
      </svg>
      <div className="card-caption">
        <span>Eꜰᴘ reference: 0 eV</span>
        <span>
          <Variable name="EFp">
            E<sub>Fp</sub>
          </Variable>{" "}
          −{" "}
          <Variable name="EFn">
            E<sub>Fn</sub>
          </Variable>{" "}
          = {s.reverseVoltageV.toFixed(2)} eV
        </span>
      </div>
    </article>
  );
}
function Breakdown({ mechanism }: { mechanism: "avalanche" | "zener" }) {
  const avalanche = mechanism === "avalanche";
  const { playing, reducedMotion } = usePresentation();
  const tunnelId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <article className="profile-card breakdown-card">
      <div className="card-heading">
        <h2>{avalanche ? "Impact ionization" : "Band-to-band tunneling"}</h2>
        <span>Schematic · not to scale</span>
      </div>
      <svg
        style={{ animationPlayState: playing ? "running" : "paused" }}
        viewBox="0 0 480 330"
        role="img"
        aria-label={
          avalanche
            ? "An energetic electron creates an electron–hole pair, producing carrier multiplication."
            : "An electron tunnels from the P-side valence band into the N-side conduction band through a narrow barrier."
        }
      >
        <defs>
          <linearGradient
            id={`${tunnelId}-fade`}
            gradientUnits="userSpaceOnUse"
            x1="182"
            x2="302"
            y1="0"
            y2="0"
          >
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset=".2" stopColor="#fff" stopOpacity="1" />
            <stop offset=".8" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask
            id={`${tunnelId}-transport`}
            maskUnits="userSpaceOnUse"
            x="176"
            y="170"
            width="132"
            height="30"
          >
            <rect
              x="176"
              y="170"
              width="132"
              height="30"
              fill={`url(#${tunnelId}-fade)`}
            />
          </mask>
        </defs>
        {avalanche ? (
          <g>
            <rect
              x="28"
              y="48"
              width="424"
              height="224"
              rx="14"
              fill="#ffffff05"
              stroke="#555"
              strokeDasharray="4 5"
            />
            <Avalanche map={([x, y]) => [42 + x * 396, 70 + y * 180]} />
            <g className="mechanism-labels">
              <text x="42" y="30">
                Incoming electron
              </text>
              <text x="262" y="30">
                Impact → multiplication
              </text>
              <text x="42" y="300">
                ○ hole
              </text>
              <text x="154" y="300">
                ● conduction electron
              </text>
            </g>
          </g>
        ) : (
          <g>
            <g fill="none" stroke="#eee" strokeWidth="2">
              <path d="M42 34 H192 C218 34 230 226 256 226 H438" />
              <path d="M42 126 H192 C218 126 230 318 256 318 H438" />
            </g>
            <g
              className="tunneling-transport"
              mask={`url(#${tunnelId}-transport)`}
            >
              <path
                className="tunnel-path"
                d="M182 191 H302"
                stroke="#ccc"
                strokeWidth="1.6"
                strokeDasharray="5 7"
                fill="none"
              />
              <circle
                className="tunneling-electron"
                cx={reducedMotion ? 224 : 182}
                cy="180"
                r="5"
                fill="var(--n-ink)"
                stroke="var(--n-surface)"
                strokeWidth=".6"
              />
            </g>
            <g className="mechanism-labels">
              <text x="42" y="30">
                P · E꜀
              </text>
              <text x="42" y="112">
                Eᵥ · occupied
              </text>
              <text x="284" y="236">
                E꜀ · available
              </text>
              <text x="288" y="322">
                N · Eᵥ
              </text>
              <text x="250" y="163">
                Tunneling
              </text>
            </g>
          </g>
        )}
      </svg>
      <div className="card-caption">
        <span>
          {avalanche
            ? "Electrons accelerate toward N; holes toward P."
            : "Tunneling connects P-side valence states to N-side conduction states."}
        </span>
      </div>
    </article>
  );
}
export function LessonPanel({
  wide,
  stage,
  bias,
  voltage,
  onVoltage,
  onBias,
  mechanism,
  onMechanism,
}: {
  wide: boolean;
  stage: number;
  bias: BiasMode;
  voltage: number;
  onVoltage: (v: number) => void;
  onBias: (v: BiasMode) => void;
  mechanism: "avalanche" | "zener";
  onMechanism: (v: "avalanche" | "zener") => void;
}) {
  const frame = usePresentation();
  const [reference, setReference] = useState(false);
  const [details, setDetails] = useState(false);
  const kind = stage === 3 ? "graded" : "abrupt";
  const s = solveLesson(
    kind,
    stage === 1 && bias === "forward" ? -frame.voltage : frame.voltage,
  );
  const breakdown = stage === 2;
  return (
    <>
      <motion.section
        className="lesson-copy"
        key={stage}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: frame.reducedMotion ? 0 : 0.3 }}
        aria-labelledby="page-title"
      >
        <span className="lesson-eyebrow">
          {String(stage + 1).padStart(2, "0")} / {chapters[stage].label}
        </span>
        <h1 id="page-title">{chapters[stage].title}</h1>
        <p className="lesson-theory">
          {stage === 1 && bias === "forward"
            ? "Forward bias lowers the barrier and narrows depletion. This 0.40 V comparison uses the depletion approximation; carrier injection and forward current are outside this model."
            : chapters[stage].theory}
        </p>
        {stage === 1 && (
          <div className="bias-control" role="group" aria-label="Bias polarity">
            {(["reverse", "forward"] as const).map((b) => (
              <button
                key={b}
                aria-pressed={bias === b}
                onClick={() => onBias(b)}
              >
                {b === "reverse" ? "Reverse bias" : "Forward bias"}
              </button>
            ))}
          </div>
        )}
        {breakdown ? (
          <div
            className="bias-control"
            role="group"
            aria-label="Breakdown mechanism"
          >
            {(["avalanche", "zener"] as const).map((m) => (
              <button
                key={m}
                aria-pressed={mechanism === m}
                onClick={() => onMechanism(m)}
              >
                {m === "avalanche" ? "Avalanche" : "Zener tunneling"}
              </button>
            ))}
          </div>
        ) : (
          <Equations stage={stage} bias={bias} />
        )}
        {stage === 3 && (
          <p className="graded-comparison">
            Abrupt: square-root growth · Graded: cube-root growth
          </p>
        )}
        {((stage === 1 && bias === "reverse") || stage === 3) && (
          <div className="voltage-control">
            <div>
              <label htmlFor="voltage">Reverse voltage</label>
              <output htmlFor="voltage">
                {frame.voltage.toFixed(2)} <span>V</span>
              </output>
            </div>
            <input
              id="voltage"
              type="range"
              min="0"
              max="10"
              step=".1"
              value={voltage}
              onChange={(e) => onVoltage(Number(e.target.value))}
              aria-valuetext={`${voltage.toFixed(1)} volts reverse bias`}
            />
            <div className="range-ends">
              <span>0 V · equilibrium</span>
              <span>10 V</span>
            </div>
          </div>
        )}
        <button
          className="model-info-button"
          aria-expanded={details}
          aria-controls="model-details"
          onClick={() => setDetails(!details)}
        >
          Model & sources {details ? "−" : "+"}
        </button>
        {wide && stage === 3 && (
          <div className="graded-charge">
            <Profile type="charge" s={s} reference={reference} />
          </div>
        )}
      </motion.section>
      <div className="scene-summary" aria-label="Model state">
        {breakdown ? (
          <>
            <span>Mechanism illustration</span>
            <strong>
              {mechanism === "avalanche"
                ? "Carrier multiplication"
                : "Heavily doped · narrow barrier"}
            </strong>
          </>
        ) : (
          <>
            <div className="lesson-metrics">
              <span>
                <Variable name="W" />
                <strong data-metric="width">
                  {(s.widthM * 1e6).toFixed(3)} <small>µm</small>
                </strong>
              </span>
              <span>
                <Variable name="Emax">
                  |E<sub>max</sub>|
                </Variable>
                <strong data-metric="field">
                  {(s.peakFieldVM / 1e6).toFixed(2)} <small>MV/m</small>
                </strong>
              </span>
              <span>
                <Variable name="Vbi">
                  V<sub>bi</sub>
                </Variable>{" "}
                +{" "}
                <Variable name="VR">
                  V<sub>R</sub>
                </Variable>
                <strong>
                  {s.potentialV.toFixed(2)} <small>V</small>
                </strong>
              </span>
            </div>
          </>
        )}
      </div>
      <section
        className={`lesson-dashboard ${breakdown ? "is-breakdown" : ""}`}
        aria-label="Scientific visualizations"
        data-kind={kind}
        data-voltage={s.reverseVoltageV}
        data-width={s.widthM}
        data-field={s.peakFieldVM}
      >
        <div className="dashboard-caption">
          {!breakdown && (
            <label>
              <input
                type="checkbox"
                checked={reference}
                onChange={(e) => setReference(e.target.checked)}
              />{" "}
              Equilibrium reference
            </label>
          )}
        </div>
        <div className={`profile-grid ${stage === 0 ? "two-profiles" : ""}`}>
          {breakdown ? (
            <>
              <Breakdown mechanism={mechanism} />
              <article className="mechanism-note">
                <span className="lesson-eyebrow">
                  {mechanism === "avalanche" ? "01 / Avalanche" : "02 / Zener"}
                </span>
                <h2>
                  {mechanism === "avalanche"
                    ? "One electron releases another."
                    : "A narrow barrier permits tunneling."}
                </h2>
                <p>
                  {mechanism === "avalanche"
                    ? "An energetic carrier liberates a bound electron, creating an electron–hole pair. Two conduction electrons can then accelerate and trigger further ionization."
                    : "Heavy doping makes depletion narrow. Strong band bending allows electrons to tunnel between bands."}
                </p>
                <span className="mechanism-limit">
                  Reverse current rises sharply. The threshold depends on the
                  device; these animations do not calculate breakdown voltage.
                </span>
              </article>
            </>
          ) : (
            <>
              {!(wide && stage === 3) && (
                <Profile
                  type="charge"
                  s={s}
                  reference={reference}
                  zoom={stage === 0}
                />
              )}
              <Profile
                type="field"
                s={s}
                reference={reference}
                zoom={stage === 0}
              />
              {stage === 1 && <Bands s={s} />}{" "}
              {stage === 3 && (
                <Profile type="potential" s={s} reference={reference} />
              )}
            </>
          )}
        </div>
      </section>
      {details && (
        <aside
          id="model-details"
          className="model-details"
          aria-label="Model assumptions and sources"
        >
          <button
            aria-label="Close model details"
            onClick={() => setDetails(false)}
          >
            Close ×
          </button>
          <h2>Model & sources</h2>
          <p>
            Silicon, 300 K; complete ionization and nondegenerate doping.
            One-dimensional depletion approximation. Position increases from P
            to N; E = −dφ/dx. Geometry and carrier motion are schematic.
          </p>
          <p>
            Abrupt presentation: Nₐ = Nᴅ = 10¹⁶ cm⁻³; nᵢ = 1.5 × 10¹⁰ cm⁻³; Vᵦᵢ
            = {ABRUPT_VBI.toFixed(3)} V. The 0–10 V slider describes
            pre-breakdown electrostatics. Forward comparison: 0.40 V.
          </p>
          <p>
            Graded presentation: a = 10²⁰ cm⁻⁴. Equilibrium Vᵦᵢ ={" "}
            {GRADED_VBI.toFixed(3)} V is solved from textbook Eqs. 7.67 and
            7.70, then held fixed during bias. The zero neutral-region field is
            an approximation. Junction types use distinct doping profiles; their
            absolute widths are not a controlled comparison.
          </p>
          <p>
            Band diagram: Eɡ = 1.12 eV, Eꜰᴘ = 0 eV; Eꜰɴ = −qVᴿ. Dashed levels
            are shown only in the neutral regions. Full transport and
            quasi-Fermi profiles are not solved. The laboratory retains its
            separately documented asymmetric junction.
          </p>
          <p>
            Source: Donald A. Neamen,{" "}
            <cite>Semiconductor Physics and Devices: Basic Principles</cite>,
            Fourth Edition, Chapter 7. Pages 242–249 (equilibrium), 251–253
            (reverse bias; Fig. 7.7), 258–262 (breakdown; Fig. 7.12), and
            263–264 (graded junction; Eqs. 7.62–7.71). The supplied PDFs are
            excerpts from this textbook.
          </p>
        </aside>
      )}
    </>
  );
}
