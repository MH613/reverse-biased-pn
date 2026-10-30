# Phase 3 silicon junction model

The laboratory solves a **uniformly doped, abrupt, one-dimensional silicon PN junction** under the depletion approximation. It is a quasistatic, long-base, ideal diffusion-current model at fixed temperature, with fully ionized dopants and nondegenerate Boltzmann statistics. It does not simulate breakdown, tunnelling, generation/recombination leakage in the space-charge region, surface leakage, self-heating, series resistance, capacitive displacement current, or a transient drift–diffusion PDE.

## Fixed parameters

All code calculations use SI. The UI converts metres to micrometres (×10⁶), V/m to kV/cm (÷10⁵), and amperes to femtoamperes (×10¹⁵).

| Parameter                          | SI value                 | Equivalent / rationale                          |
| ---------------------------------- | ------------------------ | ----------------------------------------------- |
| Elementary charge q                | 1.602176634 × 10⁻¹⁹ C    | SI defining constant                            |
| Boltzmann constant k               | 1.380649 × 10⁻²³ J/K     | SI defining constant                            |
| Vacuum permittivity ε₀             | 8.8541878128 × 10⁻¹² F/m | Fixed adopted value                             |
| Silicon relative permittivity      | 11.7                     | Fixed room-temperature value                    |
| Temperature T                      | 300 K                    | No temperature sweep                            |
| Intrinsic carrier density nᵢ       | 10¹⁶ m⁻³                 | 10¹⁰ cm⁻³, fixed room-temperature approximation |
| Acceptor doping Nₐ                 | 10²² m⁻³                 | 10¹⁶ cm⁻³                                       |
| Donor doping Nᴅ                    | 2 × 10²² m⁻³             | 2 × 10¹⁶ cm⁻³                                   |
| Junction area A                    | 10⁻⁸ m²                  | 100 µm × 100 µm                                 |
| Electron diffusivity Dₙ            | 0.0035 m²/s              | 35 cm²/s                                        |
| Hole diffusivity Dₚ                | 0.0012 m²/s              | 12 cm²/s                                        |
| Minority electron / hole lifetimes | 10⁻⁶ s each              | Fixed illustrative transport parameters         |
| Allowed applied reverse bias       | 0–10 V                   | Pre-breakdown operating range                   |

These are textbook-level fixed parameters, not a fit to a commercial diode. The bulk quasi-neutral regions are assumed much longer than the diffusion lengths (approximately 59.2 µm for electrons and 34.6 µm for holes). Diagrams show a magnified window around the junction; their drawn terminals do not imply the full physical die dimensions.

## Equations

With εₛ = 11.7 ε₀ and Vₜ = kT/q:

```
Vbi = Vt ln(NA ND / ni²)
W   = sqrt[(2 εs / q) (1/NA + 1/ND) (Vbi + VR)]
xp  = W ND / (NA + ND)
xn  = W NA / (NA + ND)
Emax = 2 (Vbi + VR) / W
```

The metallurgical junction is x = 0, P occupies x < 0, and N occupies x > 0. Charge neutrality gives Nₐ xₚ = Nᴅ xₙ. Because Nᴅ = 2 Nₐ, the depletion region extends twice as far into P as into N.

The field **vector** points toward P (negative x). The graph plots its nonnegative **magnitude**:

```
|E(x)| = 0                                  outside [−xp, xn]
         q NA (x + xp) / εs                  for −xp ≤ x ≤ 0
         q ND (xn − x) / εs                  for 0 ≤ x ≤ xn
```

Thus the triangular slopes differ by the doping ratio. Its area is Vbi + VR, not VR alone. There is already a nonzero depletion width and built-in field at zero applied bias.

For ideal, long-base diffusion current with ideality factor 1:

```
Ln = sqrt(Dn τn); Lp = sqrt(Dp τp)
Is = q A ni² [Dp/(Lp ND) + Dn/(Ln NA)]
I(P→N) = Is [exp(−VR / Vt) − 1]
```

`expm1` gives stable cancellation near zero. Net terminal current is **exactly zero** at 0 V and approaches −Is under reverse bias. Here Is ≈ 1.22537 fA. Such a tiny value is appropriate to this deliberately ideal diffusion-only model; real devices can have substantially larger leakage from omitted mechanisms. The ammeter reads current entering IN and leaving OUT, so swapping its leads reverses its sign. The panel reports reverse-current **magnitude**. Conventional wire pulses follow supply + toward supply −. Their sparse, slow motion indicates direction/presence, not calibrated carrier velocity or current scale.

## Pre-breakdown range

At 10 V, Emax ≈ 1.488 × 10⁷ V/m (148.77 kV/cm). This is less than half an indicative silicon critical field of 3 × 10⁷ V/m. Applying that rough threshold to this depletion model estimates a reverse voltage near 42.9 V. The selected 0–10 V range has a substantial margin below it. The threshold is a design sanity check, **not** an avalanche model or a guarantee for an unspecified physical device. No breakdown rise is added to the current.

## Shared state and rendering

`useJunctionSimulation` owns one applied-voltage scalar and creates an immutable derived snapshot using `solveJunction`. The circuit graph supplies validity and current direction. All quantitative lab views, instruments, boundary positions, field profiles and wire pulses consume that same snapshot through `SimulationContext`.

The slider thumb expresses the requested setting immediately. Applied voltage follows it with a short, non-overshooting exponential interpolation. **Only voltage is interpolated**; W, xp, xn, Emax and current are recomputed from it on every frame. No graph or boundary has a second spring or independent smoothing. Digital readouts show the applied value, with fixed precision and tabular digits. The source and graphs remain consistent even before settling. A "Setting … V" label distinguishes a requested change from the instantaneous applied bias.

Invalid/disconnected circuits immediately have zero applied voltage and current and return to the equilibrium depletion solution. This intentionally does not invent a capacitive discharge transient. Reconnecting starts at zero bias. Moving equipment preserves both the graph and physical solution.

Field axes stay fixed (−1.2 to +0.6 µm, 0–180 kV/cm). The width plot always covers 0–10 V and 0–1.6 µm; its full curve is constructed once, while one marker follows the shared state. Cross-section positions use the same physical x coordinates. The isometric view uses a fixed conversion of 300 illustration units to the 10 V depletion width; it never rescales per operating point. Ion marks illustrate density/type and are not individual atomic counts.

The presentation's reverse-bias stages reuse the same depletion model and doping ratio. Its introductory diffusion/formation sequence remains a narrative illustration rather than a simulated transient PDE. The brief forward-bias contrast uses the depletion-width reduction from the lowered barrier; forward-current simulation is outside this phase.

## Independent numerical checks

Values below were independently calculated from the equations, then pinned in automated tests.

| VR (V) | W (µm)      | xp (µm)     | xn (µm)     | Emax (kV/cm)  | I(P→N) (fA)  |
| ------ | ----------- | ----------- | ----------- | ------------- | ------------ |
| 0      | 0.376875913 | 0.251250608 | 0.125625304 | 38.858221927  | 0            |
| 5      | 1.054471321 | 0.702980880 | 0.351490440 | 108.722471269 | −1.225365613 |
| 10     | 1.442838895 | 0.961892597 | 0.480946298 | 148.765554166 | −1.225365613 |

Vbi = 0.732236392752 V. Tests also sweep 1,000 intermediate voltages for monotonic W/Emax and bounded current, check neutrality, field slopes and integrated potential, compare actual SVG coordinates and instrument text to the model, sample agreement during interpolation, and verify the reset on disconnection.
