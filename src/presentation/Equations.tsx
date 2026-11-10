import type { ReactNode } from "react";
import { Variable } from "./Variable";
import type { BiasMode } from "../state/presentation";

const Vbi = () => (
  <Variable name="Vbi">
    V<sub>bi</sub>
  </Variable>
);
const Epsilon = () => (
  <Variable name="epsilon">
    ε<sub>s</sub>
  </Variable>
);
const N = ({ side }: { side: "A" | "D" }) => (
  <Variable name={`N${side}`}>
    N<sub>{side}</sub>
  </Variable>
);
function Fraction({ top, bottom }: { top: ReactNode; bottom: ReactNode }) {
  return (
    <span className="math-fraction">
      <span>{top}</span>
      <span>{bottom}</span>
    </span>
  );
}
function Root({
  children,
  cube = false,
}: {
  children: ReactNode;
  cube?: boolean;
}) {
  return (
    <span className={`math-root ${cube ? "cube-root" : ""}`}>
      {cube && <sup>3</sup>}
      <span className="radical-sign">√</span>
      <span className="radicand">{children}</span>
    </span>
  );
}
export function Equations({ stage, bias }: { stage: number; bias: BiasMode }) {
  const potential = (
    <>
      <Vbi />
      {stage !== 0 && (
        <>
          <span>{bias === "forward" && stage === 1 ? " − " : " + "}</span>
          <Variable name={bias === "forward" && stage === 1 ? "VF" : "VR"}>
            V<sub>{bias === "forward" && stage === 1 ? "F" : "R"}</sub>
          </Variable>
        </>
      )}
    </>
  );
  const graded = stage === 3;
  return (
    <div
      className="full-equations"
      data-junction={graded ? "graded" : "abrupt"}
      aria-label={
        graded
          ? "Linearly graded junction equations"
          : "Abrupt junction equations"
      }
    >
      <div
        className="display-equation"
        data-equation="width"
        role="group"
        aria-label={
          graded
            ? "Width equals cube root of twelve times silicon permittivity times total potential divided by elementary charge times doping gradient"
            : "Width equals square root of two times silicon permittivity over elementary charge, times the sum of acceptor and donor densities over their product, times total potential"
        }
      >
        <Variable name="W" />
        <span> = </span>
        <Root cube={graded}>
          {graded ? (
            <Fraction
              top={
                <>
                  12
                  <Epsilon />
                  <span className="math-parentheses">({potential})</span>
                </>
              }
              bottom={
                <>
                  <Variable name="q" />
                  <Variable name="a" />
                </>
              }
            />
          ) : (
            <>
              <Fraction
                top={
                  <>
                    2<Epsilon />
                  </>
                }
                bottom={<Variable name="q" />}
              />
              <Fraction
                top={
                  <>
                    <N side="A" />
                    <span> + </span>
                    <N side="D" />
                  </>
                }
                bottom={
                  <>
                    <N side="A" />
                    <N side="D" />
                  </>
                }
              />
              <span className="math-parentheses">({potential})</span>
            </>
          )}
        </Root>
      </div>
      <div
        className="display-equation"
        data-equation="field"
        role="group"
        aria-label={
          graded
            ? "Peak field magnitude equals three times total potential divided by twice the depletion width"
            : "Peak field magnitude equals twice the total potential divided by depletion width"
        }
      >
        <Variable name="Emax">
          |E<sub>max</sub>|
        </Variable>
        <span> = </span>
        <Fraction
          top={
            <>
              {graded ? "3" : "2"}
              <span className="math-parentheses">({potential})</span>
            </>
          }
          bottom={
            <>
              {graded ? "2" : ""}
              <Variable name="W" />
            </>
          }
        />
      </div>
    </div>
  );
}
