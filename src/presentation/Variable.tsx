import { useId, useState, type ReactNode } from "react";

const definitions: Record<string, string> = {
  epsilon: "Permittivity of silicon: εs = 11.7 ε₀, in F/m.",
  VF: "Applied forward-voltage magnitude, in volts. P is positive relative to N.",
  rho: "Volume charge density, in C/m³. In the graded model, ρ(x) = qax within depletion.",
  EFp: "P-side neutral-region Fermi level, used as the zero energy reference.",
  EFn: "N-side neutral-region Fermi level. Under reverse bias it lies qVR below the P-side level.",
  W: "Total depletion width, measured in micrometres (µm).",
  Vbi: "Built-in potential at thermal equilibrium, in volts. It stays fixed as applied bias changes.",
  VR: "Applied reverse-voltage magnitude, in volts. P is negative relative to N.",
  Emax: "Greatest electric-field magnitude, at the metallurgical junction, in V/m.",
  NA: "Net acceptor concentration in the P region, in m⁻³.",
  ND: "Net donor concentration in the N region, in m⁻³.",
  a: "Gradient of net doping concentration: 10²⁸ m⁻⁴ (10²⁰ cm⁻⁴).",
  q: "Positive elementary charge: 1.602176634 × 10⁻¹⁹ coulombs.",
  x: "Position from the metallurgical junction; positive toward N.",
};
export function Variable({
  name,
  children,
}: {
  name: string;
  children?: ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span
      className={`variable ${open ? "is-open" : ""}`}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setOpen(false);
      }}
    >
      <button
        type="button"
        aria-label={`Define ${name}`}
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      >
        {children ?? name}
      </button>
      <span className="variable-tooltip" role="tooltip" id={id}>
        {definitions[name]}
      </span>
    </span>
  );
}
