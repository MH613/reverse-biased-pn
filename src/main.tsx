import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  FlaskConical,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  X,
  Plus,
  Minus,
  Layers,
  Check,
} from "lucide-react";
import { Junction } from "./components/Junction";
import { FieldProfile } from "./components/FieldProfile";
import {
  BiasMode,
  depletionWidth,
  PresentationContext,
  stages,
} from "./state/presentation";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-mono/latin-400.css";
import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import "./style.css";
const DURATION = 12;
const details: Record<string, { title: string; body: string }> = {
  holes: {
    title: "A hole is an absence.",
    body: "A missing valence electron behaves like a mobile positive charge. Holes are the majority carriers in P-type silicon and minority carriers in N-type silicon.",
  },
  electrons: {
    title: "An electron is free to move.",
    body: "Donor atoms contribute mobile electrons. Electrons are the majority carriers in N-type silicon and minority carriers in P-type silicon.",
  },
  ions: {
    title: "The lattice stays in place.",
    body: "Ionized acceptors are negatively charged on the P side; ionized donors are positively charged on the N side. They are fixed in the crystal, even as mobile carriers move.",
  },
};
function App() {
  const [stage, setStage] = useState(0),
    [playing, setPlaying] = useState(true),
    [bias, setBias] = useState<BiasMode>("reverse");
  const [manualVoltage, setManualVoltage] = useState<number | null>(null),
    [selected, setSelected] = useState<string | null>(null);
  const [showIons, setShowIons] = useState(true),
    [showCarriers, setShowCarriers] = useState(true);
  const [labOpen, setLabOpen] = useState(false),
    [fullscreen, setFullscreen] = useState(false),
    [fullError, setFullError] = useState("");
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const elapsed = useRef(0),
    clock = useRef(0),
    smoothWidth = useRef(30),
    last = useRef(0);
  const [frame, setFrame] = useState({
    time: 0,
    progress: 0,
    width: 30,
    voltage: 0,
  });
  const config = useRef({ stage, playing, bias, manualVoltage, reducedMotion });
  config.current = { stage, playing, bias, manualVoltage, reducedMotion };
  useEffect(() => {
    let id: number;
    const tick = (now: number) => {
      const dt = Math.min((now - (last.current || now)) / 1000, 0.05);
      last.current = now;
      const c = config.current;
      if (c.playing && !document.hidden) {
        elapsed.current = Math.min(DURATION, elapsed.current + dt);
        clock.current += dt;
      }
      const progress = elapsed.current / DURATION;
      const voltage =
        c.stage === 3
          ? (c.manualVoltage ??
            2 + 3 * (progress * progress * (3 - 2 * progress)))
          : c.stage >= 2
            ? 2
            : 0;
      const target = depletionWidth(c.stage, progress, voltage, c.bias);
      if (c.playing)
        smoothWidth.current +=
          (target - smoothWidth.current) *
          (c.reducedMotion ? 1 : 1 - Math.exp(-dt * 5));
      setFrame({
        time: c.reducedMotion ? 0 : clock.current,
        progress,
        width: smoothWidth.current,
        voltage,
      });
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReducedMotion(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const go = useCallback((next: number) => {
    setStage(Math.max(0, Math.min(3, next)));
    elapsed.current = 0;
    setPlaying(true);
    setSelected(null);
    setBias("reverse");
    setManualVoltage(null);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (labOpen) return;
      if (
        (e.target as HTMLElement).closest(
          'input,textarea,select,[contenteditable="true"]',
        )
      )
        return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(stage + 1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(stage - 1);
      }
      if (e.code === "Space") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, go, labOpen]);
  useEffect(() => {
    const change = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      setFullError("");
    } catch {
      setFullError("Full-screen is unavailable in this browser.");
    }
  };
  const replay = () => {
    elapsed.current = 0;
    setManualVoltage(null);
    setPlaying(true);
  };
  const skip = () => {
    elapsed.current = DURATION;
    setPlaying(true);
  };
  const closeLab = useCallback(() => setLabOpen(false), []);
  const handleVoltage = (e: React.FormEvent<HTMLInputElement>) => {
    setManualVoltage(Number(e.currentTarget.value));
    setPlaying(true);
  };
  const data = stages[stage];
  return (
    <PresentationContext.Provider
      value={{ stage, ...frame, playing, bias, reducedMotion }}
    >
      <div className="app-shell">
        <header className="header">
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              go(0);
            }}
            aria-label="Junction home"
          >
            <span className="brand-mark">
              <i />
              <i />
            </span>
            junction<span className="brand-period">.</span>
          </a>
          <div className="header-note">A FIELD GUIDE TO SEMICONDUCTORS</div>
          <button className="lab-button" onClick={() => setLabOpen(true)}>
            <FlaskConical size={15} /> The laboratory <ArrowUpRight size={14} />
            <span className="phase-tag">SOON</span>
          </button>
        </header>
        <main>
          <div className="chapter-meta">
            <span>
              <span className="live-dot" /> THE INVISIBLE, EXPLAINED.
            </span>
            <span>
              AN INTERACTIVE EXPLORATION <span className="meta-slash">/</span>{" "}
              VOL. 01
            </span>
          </div>
          <section className="hero" aria-labelledby="stage-title">
            <div className="hero-copy" key={stage}>
              <div className="eyebrow">{data.eyebrow}</div>
              <h1 id="stage-title">
                {data.title[0]}
                <br />
                <em>{data.title[1]}</em>
              </h1>
              <p className="description">{data.description}</p>
              <div className="stage-interaction">
                {stage === 0 && (
                  <div className="explore-hint">
                    <span className="tiny-cross">+</span>
                    <span>Select either material to look closer</span>
                    <ArrowUpRight size={14} />
                  </div>
                )}
                {stage === 1 && (
                  <div className="flow-explanation">
                    <div>
                      <span className="direction coral">←</span>
                      <span>Diffusion</span>
                      <small>Concentration drives carriers</small>
                    </div>
                    <div>
                      <span className="direction teal">→</span>
                      <span>Drift</span>
                      <small>The field opposes diffusion</small>
                    </div>
                    <p>
                      At equilibrium, net current is zero. Arrows show electron
                      motion; hole motion is opposite.
                    </p>
                  </div>
                )}
                {stage === 2 && (
                  <div className="bias-control">
                    <div className="segmented" aria-label="Bias polarity">
                      <button
                        className={bias === "reverse" ? "active" : ""}
                        onClick={() => {
                          setBias("reverse");
                          elapsed.current = 0;
                          setPlaying(true);
                        }}
                      >
                        Reverse bias
                      </button>
                      <button
                        className={bias === "forward" ? "active" : ""}
                        onClick={() => {
                          setBias("forward");
                          elapsed.current = 0;
                          setPlaying(true);
                        }}
                      >
                        Forward bias
                      </button>
                    </div>
                    <div className="polarity">
                      <span>
                        P <b>{bias === "reverse" ? "−" : "+"}</b>
                      </span>
                      <span className="polarity-line" />
                      <span>
                        <b>{bias === "reverse" ? "+" : "−"}</b> N
                      </span>
                      <small>
                        {bias === "reverse"
                          ? "A wider barrier"
                          : "A lower barrier"}
                      </small>
                    </div>
                  </div>
                )}
                {stage === 3 && (
                  <div className="voltage-control">
                    <div>
                      <label htmlFor="voltage">REVERSE VOLTAGE</label>
                      <output htmlFor="voltage">
                        {(manualVoltage ?? frame.voltage).toFixed(1)}{" "}
                        <span>V</span>
                      </output>
                    </div>
                    <input
                      id="voltage"
                      type="range"
                      min="0"
                      max="5"
                      step=".1"
                      value={manualVoltage ?? frame.voltage}
                      onChange={handleVoltage}
                      onInput={handleVoltage}
                      aria-valuetext={`${(manualVoltage ?? frame.voltage).toFixed(1)} volts reverse bias`}
                    />
                    <div className="range-labels">
                      <span>0 V</span>
                      <span>DRAG TO EXPLORE</span>
                      <span>5 V</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="topic-tags">
                <span>SILICON</span>
                <span>PN JUNCTION</span>
                <span>{stage < 2 ? "EQUILIBRIUM" : "APPLIED BIAS"}</span>
              </div>
            </div>
            <div className="specimen">
              <div className="specimen-heading">
                <span>
                  <Layers size={13} /> INTERACTIVE SPECIMEN
                </span>
                <span>
                  <span className="specimen-status" />
                  {stage === 0
                    ? "UNBIASED"
                    : stage === 1
                      ? "EQUILIBRIUM"
                      : bias === "forward" && stage === 2
                        ? "FORWARD BIASED"
                        : "REVERSE BIASED"}
                </span>
              </div>
              <Junction
                showIons={showIons}
                showCarriers={showCarriers}
                selected={selected}
                onSelect={setSelected}
              />
              <div className="specimen-bottom">
                <span>
                  <span className="axis">↗</span> Si{" "}
                  <span className="atomic">14</span>
                </span>
                <div className="layer-controls">
                  <button
                    onClick={() => setShowCarriers((v) => !v)}
                    aria-pressed={showCarriers}
                  >
                    <span
                      className={`check-box ${showCarriers ? "checked" : ""}`}
                    >
                      {showCarriers && <Check size={9} />}
                    </span>{" "}
                    Carriers
                  </button>
                  <button
                    onClick={() => setShowIons((v) => !v)}
                    aria-pressed={showIons}
                  >
                    <span className={`check-box ${showIons ? "checked" : ""}`}>
                      {showIons && <Check size={9} />}
                    </span>{" "}
                    Fixed ions
                  </button>
                </div>
              </div>
            </div>
          </section>
          <section
            className="observations"
            aria-label="Scientific observations"
          >
            <div className="insight-panel">
              <div className="panel-heading">
                <span>
                  {selected ? "UNDER THE SURFACE" : "THE ESSENTIAL IDEA"}
                </span>
                {selected ? (
                  <button
                    onClick={() => setSelected(null)}
                    aria-label="Close carrier detail"
                  >
                    <X size={13} />
                  </button>
                ) : (
                  <span className="small-asterisk">✳</span>
                )}
              </div>
              <h2>{selected ? details[selected].title : data.insight}</h2>
              <p>{selected ? details[selected].body : data.detail}</p>
            </div>
            <div className="legend-panel">
              <div className="panel-heading">
                <span>A LANGUAGE OF CHARGES</span>
                <span>KEY</span>
              </div>
              <button
                className={
                  selected === "holes" ? "legend-row selected" : "legend-row"
                }
                onClick={() =>
                  setSelected(selected === "holes" ? null : "holes")
                }
              >
                <span className="carrier-icon hole">
                  <Plus size={9} />
                </span>
                <span>
                  Hole<small>Mobile positive charge</small>
                </span>
                <span className="legend-sign">+</span>
              </button>
              <button
                className={
                  selected === "electrons"
                    ? "legend-row selected"
                    : "legend-row"
                }
                onClick={() =>
                  setSelected(selected === "electrons" ? null : "electrons")
                }
              >
                <span className="carrier-icon electron">
                  <Minus size={9} />
                </span>
                <span>
                  Electron<small>Mobile negative charge</small>
                </span>
                <span className="legend-sign">−</span>
              </button>
              <button
                className={
                  selected === "ions" ? "legend-row selected" : "legend-row"
                }
                onClick={() => setSelected(selected === "ions" ? null : "ions")}
              >
                <span className="ion-pair">⊖ ⊕</span>
                <span>
                  Fixed dopant ions<small>Bound to the crystal lattice</small>
                </span>
                <span className="legend-sign">±</span>
              </button>
            </div>
            <FieldProfile />
          </section>
        </main>
        <footer className="footer">
          <div className="stage-navigation">
            <span className="stage-number">
              0{stage + 1}
              <span> / 04</span>
            </span>
            <div className="stage-track">
              {stages.map((s, i) => (
                <button
                  key={s.label}
                  className={
                    i === stage ? "current" : i < stage ? "visited" : ""
                  }
                  onClick={() => go(i)}
                  aria-label={`Stage ${i + 1}: ${s.label}`}
                  aria-current={i === stage ? "step" : undefined}
                >
                  <span
                    style={{
                      width: i === stage ? `${frame.progress * 100}%` : "100%",
                    }}
                  />
                </button>
              ))}
            </div>
            <span className="stage-label">{data.label}</span>
          </div>
          <div className="playback">
            <button
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause animation" : "Play animation"}
              title={playing ? "Pause · Space" : "Play · Space"}
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              onClick={replay}
              aria-label="Replay stage animation"
              title="Replay"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={skip}
              aria-label="Skip to end of animation"
              title="Skip animation"
            >
              <SkipForward size={15} />
            </button>
            <span className="control-separator" />
            <button
              onClick={toggleFullscreen}
              aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}
              title="Full screen"
            >
              {fullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
            </button>
          </div>
          <div className="next-controls">
            <button
              className="back-button"
              disabled={stage === 0}
              onClick={() => go(stage - 1)}
              aria-label="Previous stage"
            >
              <ArrowLeft size={17} />
            </button>
            <button
              className="next-button"
              onClick={() => (stage < 3 ? go(stage + 1) : go(0))}
            >
              {stage < 3 ? "Next chapter" : "Back to the beginning"}
              <ArrowRight size={16} />
            </button>
          </div>
        </footer>
        <div className="bottom-note">
          <span>SMALL SCALE. FUNDAMENTAL IDEAS.</span>
          <span>
            USE <kbd>←</kbd> <kbd>→</kbd> TO NAVIGATE
          </span>
          <span>DESIGNED FOR CURIOSITY.</span>
        </div>
        {fullError && (
          <div className="toast" role="status">
            {fullError}
            <button onClick={() => setFullError("")} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        )}
        {labOpen && <LabDialog onClose={closeLab} />}
      </div>
    </PresentationContext.Provider>
  );
}
function LabDialog({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    closeRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const buttons = closeRef.current
          ?.closest("section")
          ?.querySelectorAll("button");
        if (!buttons) return;
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="lab-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lab-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          className="modal-close"
          onClick={onClose}
          aria-label="Close laboratory preview"
        >
          <X size={19} />
        </button>
        <div className="lab-emblem">
          <FlaskConical size={27} strokeWidth={1} />
        </div>
        <div className="eyebrow">THE NEXT EXPERIMENT</div>
        <h2 id="lab-title">
          A space to
          <br />
          <em>make connections.</em>
        </h2>
        <p>
          The isometric laboratory is coming in a later phase. Build circuits,
          connect instruments, and explore the physics with your own
          experiments.
        </p>
        <div className="lab-phase">
          <span className="live-dot" /> PHASE 1 · THE PRESENTATION
        </div>
        <button className="next-button" onClick={onClose}>
          Return to the field guide <ArrowRight size={16} />
        </button>
      </section>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
