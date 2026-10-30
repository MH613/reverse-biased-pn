import { memo, useId, useState } from "react";
import { useSimulation } from "./SimulationContext";
import {
  BUILT_IN_VOLTAGE_V,
  EQUILIBRIUM,
  solveJunction,
  formatCurrent,
  type JunctionSolution,
} from "./model";
import "./scientific.css";
const X0 = 42,
  X1 = 320,
  Y0 = 118,
  Y1 = 26;
const fieldX = (m: number) => X0 + ((m + 1.2e-6) / 1.8e-6) * (X1 - X0);
const fieldY = (e: number) => Y0 - (e / 1.8e7) * (Y0 - Y1);
const voltageX = (v: number) => X0 + (v / 10) * (X1 - X0);
const widthY = (w: number) => Y0 - (w / 1.6e-6) * (Y0 - Y1);
const fieldPath = (s: JunctionSolution) =>
  `M${fieldX(-s.xpM)},${Y0} L${fieldX(0)},${fieldY(s.peakFieldVM)} L${fieldX(s.xnM)},${Y0}`;
const widthCurve = Array.from(
  { length: 101 },
  (_, i) =>
    `${i ? "L" : "M"}${voltageX(i / 10)},${widthY(solveJunction(i / 10).widthM)}`,
).join(" ");
const sectionX = (m: number) => 20 + ((m + 1.2e-6) / 1.8e-6) * 320;
export const ScientificPanel = memo(function ScientificPanel() {
  const sim = useSimulation()!,
    s = sim.solution;
  const [reference, setReference] = useState(true),
    id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const left = sectionX(-s.xpM),
    right = sectionX(s.xnM),
    junction = sectionX(0);
  return (
    <section
      className="science-panel"
      aria-label="Junction physics"
      data-applied-voltage={s.reverseVoltageV}
      data-width-m={s.widthM}
      data-xp-m={s.xpM}
      data-xn-m={s.xnM}
      data-peak-field-vm={s.peakFieldVM}
      data-current-a={s.terminalCurrentA}
    >
      <header className="science-heading">
        <h2>Inside the junction.</h2>
        <span>Silicon · 300 K</span>
      </header>
      <div className="science-metrics">
        <div>
          <span>Depletion width</span>
          <strong data-reading="width">
            {(s.widthM * 1e6).toFixed(3)} <small>µm</small>
          </strong>
        </div>
        <div>
          <span>Peak field</span>
          <strong data-reading="field">
            {(s.peakFieldVM / 1e5).toFixed(2)} <small>kV/cm</small>
          </strong>
        </div>
      </div>
      <div className="science-chart field-chart">
        <div className="chart-heading">
          <h3>Electric field vs. position</h3>
          <label>
            <input
              type="checkbox"
              checked={reference}
              onChange={(e) => setReference(e.target.checked)}
            />{" "}
            Equilibrium
          </label>
        </div>
        <svg
          viewBox="0 0 360 157"
          role="img"
          aria-label={`Electric field magnitude versus position. Peak ${(s.peakFieldVM / 1e5).toFixed(2)} kilovolts per centimetre at the metallurgical junction.`}
        >
          <text x="42" y="13" className="axis-unit">
            |E| (kV/cm)
          </text>
          {[0, 50, 100, 150].map((v) => (
            <g key={v}>
              <path d={`M42,${fieldY(v * 1e5)} H320`} className="chart-grid" />
              <text x="34" y={fieldY(v * 1e5) + 3} textAnchor="end">
                {v}
              </text>
            </g>
          ))}
          <path d="M42,26 V118 H320" className="chart-axis" />
          {[-1, -0.5, 0, 0.5].map((v) => (
            <g key={v}>
              <path d={`M${fieldX(v * 1e-6)},118 v4`} className="chart-axis" />
              <text x={fieldX(v * 1e-6)} y="135" textAnchor="middle">
                {v}
              </text>
            </g>
          ))}
          <path d={`M${fieldX(0)},24 V118`} className="junction-axis" />
          {reference && (
            <path
              className="equilibrium-reference"
              d={fieldPath(EQUILIBRIUM)}
            />
          )}
          <path className="field-area" d={`${fieldPath(s)} Z`} />
          <path className="field-operating-profile" d={fieldPath(s)} />
          <circle
            className="field-peak-marker"
            cx={fieldX(0)}
            cy={fieldY(s.peakFieldVM)}
            r="2.5"
          />
          <text x="183" y="152" textAnchor="middle">
            Position x (µm) · P ← 0 → N
          </text>
        </svg>
      </div>
      <div className="science-chart width-chart">
        <div className="chart-heading">
          <h3>Depletion width vs. reverse bias</h3>
          <span>
            {s.reverseVoltageV.toFixed(2)} V · {(s.widthM * 1e6).toFixed(3)} µm
          </span>
        </div>
        <svg
          viewBox="0 0 360 157"
          role="img"
          aria-label={`Depletion width versus reverse voltage, from zero to ten volts. Operating point ${s.reverseVoltageV.toFixed(2)} volts and ${(s.widthM * 1e6).toFixed(3)} micrometres.`}
        >
          <text x="42" y="13" className="axis-unit">
            W (µm)
          </text>
          {[0, 0.4, 0.8, 1.2, 1.6].map((v) => (
            <g key={v}>
              <path d={`M42,${widthY(v * 1e-6)} H320`} className="chart-grid" />
              <text x="34" y={widthY(v * 1e-6) + 3} textAnchor="end">
                {v.toFixed(1)}
              </text>
            </g>
          ))}
          <path d="M42,26 V118 H320" className="chart-axis" />
          {[0, 2, 4, 6, 8, 10].map((v) => (
            <g key={v}>
              <path d={`M${voltageX(v)},118 v4`} className="chart-axis" />
              <text x={voltageX(v)} y="135" textAnchor="middle">
                {v}
              </text>
            </g>
          ))}
          <path className="width-curve" d={widthCurve} />
          <path
            className="operating-guide"
            d={`M${voltageX(s.reverseVoltageV)},118 V${widthY(s.widthM)}`}
          />
          <circle
            className="width-operating-point"
            cx={voltageX(s.reverseVoltageV)}
            cy={widthY(s.widthM)}
            r="3.5"
          />
          <text x="181" y="152" textAnchor="middle">
            Reverse voltage V
            <tspan baselineShift="sub" fontSize="6">
              R
            </tspan>{" "}
            (V)
          </text>
        </svg>
      </div>
      <div className="science-section">
        <div className="chart-heading">
          <h3>Junction cross-section</h3>
          <span>Field ← N to P</span>
        </div>
        <svg
          viewBox="0 0 360 128"
          role="img"
          aria-label={`Cross section: depletion extends ${(s.xpM * 1e6).toFixed(3)} micrometres into P and ${(s.xnM * 1e6).toFixed(3)} micrometres into N.`}
        >
          <defs>
            <pattern
              id={`section-hatch-${id}`}
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(30)"
            >
              <path d="M0,0 V6" stroke="#ccc" strokeWidth=".6" />
            </pattern>
            <marker
              id={`section-arrow-${id}`}
              markerWidth="5"
              markerHeight="5"
              refX="4"
              refY="2.5"
              orient="auto"
            >
              <path
                d="M0,0 L5,2.5 L0,5"
                fill="none"
                stroke="#777"
                strokeWidth=".8"
              />
            </marker>
          </defs>
          <rect
            x="20"
            y="22"
            width={junction - 20}
            height="65"
            fill="#fafafa"
          />
          <rect
            x={junction}
            y="22"
            width={340 - junction}
            height="65"
            fill="#f3f3f3"
          />
          <rect
            className="section-depletion"
            x={left}
            y="22"
            width={right - left}
            height="65"
            fill="#e8e8e8"
          />
          <rect
            x={left}
            y="22"
            width={right - left}
            height="65"
            fill={`url(#section-hatch-${id})`}
          />
          {Array.from({ length: 36 }, (_, i) => {
            const x = -1.15e-6 + i * 0.05e-6;
            return [0, 1, 2].map((row) => {
              if (x < 0 && i % 2) return null;

              return (
                <text
                  key={`${i}-${row}`}
                  x={sectionX(x)}
                  y={40 + row * 17}
                  textAnchor="middle"
                  className="section-ion"
                  opacity={
                    0.12 +
                    0.68 *
                      Math.max(
                        0,
                        Math.min(
                          1,
                          (Math.min(x + s.xpM, s.xnM - x) + 0.025e-6) / 0.05e-6,
                        ),
                      )
                  }
                >
                  {x < 0 ? "−" : "+"}
                </text>
              );
            });
          })}
          <rect
            x="20"
            y="22"
            width="320"
            height="65"
            fill="none"
            stroke="#bbb"
            strokeWidth=".8"
          />
          <path d={`M${junction},17 V92`} className="junction-axis" />
          <path
            className="section-p-boundary"
            d={`M${left},22 V87`}
            data-position-m={-s.xpM}
          />
          <path
            className="section-n-boundary"
            d={`M${right},22 V87`}
            data-position-m={s.xnM}
          />
          <text x="25" y="15">
            P
          </text>
          <text x="335" y="15" textAnchor="end">
            N
          </text>
          <path
            d={`M${right - 4},57 H${left + 4}`}
            stroke="#777"
            strokeWidth="1"
            markerEnd={`url(#section-arrow-${id})`}
          />
          <text x="20" y="106">
            x
            <tspan baselineShift="sub" fontSize="6">
              p
            </tspan>{" "}
            = {(s.xpM * 1e6).toFixed(3)} µm
          </text>
          <text x="340" y="106" textAnchor="end">
            x
            <tspan baselineShift="sub" fontSize="6">
              n
            </tspan>{" "}
            = {(s.xnM * 1e6).toFixed(3)} µm
          </text>
          <text x="180" y="123" textAnchor="middle">
            Fixed ions · schematic density · boundary positions to scale
          </text>
        </svg>
      </div>
      <div className="science-current">
        <span>Reverse current magnitude</span>
        <strong>{formatCurrent(sim.loopCurrentA)}</strong>
      </div>
      <details className="model-notes">
        <summary>Model & units</summary>
        <p>
          Uniform abrupt silicon junction, depletion approximation. N
          <sub>A</sub> = 10¹⁶ cm⁻³, N<sub>D</sub> = 2 × 10¹⁶ cm⁻³. V
          <sub>bi</sub> = {BUILT_IN_VOLTAGE_V.toFixed(4)} V at 300 K. SI
          calculations; µm and kV/cm displays.
        </p>
        <p>
          Ideal diffusion current, no breakdown or generation leakage. Wire
          pulses indicate conventional current direction; speed is illustrative.
          Voltage alone is interpolated; every graph and instrument uses that
          same applied voltage.
        </p>
      </details>
    </section>
  );
});
