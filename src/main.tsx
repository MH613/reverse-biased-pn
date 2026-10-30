import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
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
} from "lucide-react";
import { Junction } from "./components/Junction";
import {
  Laboratory,
  createLabSession,
  type LabSession,
} from "./lab/Laboratory";
import {
  type BiasMode,
  PresentationContext,
  chapters,
} from "./state/presentation";
import { usePresentationMotion } from "./hooks/usePresentationMotion";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "./style.css";

const inspection: Record<string, string> = {
  holes:
    "Holes are mobile positive charges: abundant in P-type silicon, scarce in N-type.",
  electrons:
    "Electrons are mobile negative charges: abundant in N-type silicon, scarce in P-type.",
};
function App() {
  const [view, setView] = useState(-1),
    [playing, setPlaying] = useState(true),
    [bias, setBias] = useState<BiasMode>("reverse");
  const [manualVoltage, setManualVoltage] = useState<number | null>(null),
    [selected, setSelected] = useState<string | null>(null);
  const [labOpen, setLabOpen] = useState(false),
    [fullscreen, setFullscreen] = useState(false),
    [fullError, setFullError] = useState("");
  const [reducedMotion, setReducedMotion] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [direction, setDirection] = useState(1);
  const [compact, setCompact] = useState(innerWidth < 760);
  useEffect(() => {
    const resize = () => setCompact(innerWidth < 760);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const home = view === -1,
    stage = Math.max(0, view);
  const { frame, reset, skip } = usePresentationMotion(
    stage,
    playing,
    bias,
    manualVoltage,
    reducedMotion,
    !labOpen,
  );
  const navigationLock = useRef(0),
    touchStart = useRef<{ x: number; y: number } | null>(null);
  const go = useCallback(
    (next: number) => {
      const target = Math.max(-1, Math.min(3, next));
      if (target === view) return;
      setDirection(target > view ? 1 : -1);
      setView(target);
      reset();
      setPlaying(true);
      setSelected(null);
      setManualVoltage(null);
      setBias("reverse");
    },
    [view, reset],
  );
  const goRef = useRef(go);
  goRef.current = go;
  const viewRef = useRef(view);
  viewRef.current = view;
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReducedMotion(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        labOpen ||
        (e.target as HTMLElement).closest(
          'input,textarea,select,[contenteditable="true"]',
        )
      )
        return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        goRef.current(viewRef.current + 1);
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goRef.current(viewRef.current - 1);
      }
      if (
        e.code === "Space" &&
        !(e.target as HTMLElement).closest('button,a,[role="button"]')
      ) {
        e.preventDefault();
        if (viewRef.current < 0) goRef.current(0);
        else setPlaying((p) => !p);
      }
    };
    let wheelDelta = 0,
      wheelEnd = 0;
    const onWheel = (e: WheelEvent) => {
      if (
        labOpen ||
        e.ctrlKey ||
        (e.target as HTMLElement).closest('input,[role="dialog"]')
      )
        return;
      // Small screens scroll naturally; presentation-size screens move by chapter.
      if (innerWidth < 760 || innerHeight < 640) return;
      e.preventDefault();
      const now = performance.now();
      if (now < navigationLock.current) return;
      if (now - wheelEnd > 180) wheelDelta = 0;
      wheelEnd = now;
      wheelDelta += e.deltaY;
      if (Math.abs(wheelDelta) > 55) {
        goRef.current(viewRef.current + (wheelDelta > 0 ? 1 : -1));
        wheelDelta = 0;
        navigationLock.current = now + 1150;
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
    };
  }, [labOpen]);
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setFullError("Full screen is unavailable in this browser.");
    }
  };
  const labSession = useRef<LabSession | null>(null);
  if (!labSession.current) labSession.current = createLabSession();
  const saveLabSession = useCallback((session: LabSession) => {
    labSession.current = session;
  }, []);
  const closeLab = useCallback(() => {
    setLabOpen(false);
    requestAnimationFrame(() =>
      document.querySelector<HTMLButtonElement>(".lab-button")?.focus(),
    );
  }, []);
  const handleVoltage = (e: React.FormEvent<HTMLInputElement>) => {
    setManualVoltage(Number(e.currentTarget.value));
    setPlaying(true);
  };
  const changeBias = (next: BiasMode) => {
    setBias(next);
    reset();
    setPlaying(true);
  };
  const camera = {
    x: home || compact ? "0vw" : "18vw",
    y: home
      ? compact
        ? "17vh"
        : "18vh"
      : compact
        ? "5vh"
        : `${stage >= 2 ? -5 : [-1, -2][stage]}vh`,
    scale: home
      ? 1.42
      : compact
        ? stage >= 2
          ? 0.98
          : 1.12
        : [1.02, 1.07, 0.96, 1][stage],
    rotate: home ? -4 : [-1, 1.5, -1.5, 0][stage],
  };
  return (
    <MotionConfig reducedMotion="user">
      <PresentationContext.Provider
        value={{ stage, ...frame, playing, bias, reducedMotion }}
      >
        <div
          className={`app-shell ${home ? "is-home" : "is-presentation"}`}
          style={{ display: labOpen ? "none" : undefined }}
          inert={labOpen}
        >
          <header className="header">
            <a
              className="brand"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                go(-1);
              }}
              aria-label="Junction home"
            >
              <span className="brand-mark">
                <i />
                <i />
              </span>
              junction.
            </a>
            <nav className="header-nav" aria-label="Main navigation">
              <button className={home ? "active" : ""} onClick={() => go(-1)}>
                Overview
              </button>
              <button className={!home ? "active" : ""} onClick={() => go(0)}>
                The explanation <ArrowUpRight size={12} />
              </button>
            </nav>
            <button className="lab-button" onClick={() => setLabOpen(true)}>
              <FlaskConical size={15} /> Laboratory <ArrowUpRight size={13} />
            </button>
          </header>
          <main
            className="presentation"
            onTouchStart={(e) => {
              if ((e.target as HTMLElement).closest("input,button,a")) return;
              touchStart.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
              };
            }}
            onTouchEnd={(e) => {
              if (!touchStart.current) return;
              const dx = e.changedTouches[0].clientX - touchStart.current.x,
                dy = e.changedTouches[0].clientY - touchStart.current.y;
              touchStart.current = null;
              if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.3)
                go(view + (dx < 0 ? 1 : -1));
            }}
          >
            <div
              className="scene-position"
              aria-label="Interactive junction illustration"
            >
              <motion.div
                className="scene-camera"
                initial={false}
                animate={camera}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 42, damping: 17, mass: 1.1 }
                }
              >
                <Junction
                  showCarriers
                  showIons
                  selected={selected}
                  onSelect={setSelected}
                />
              </motion.div>
            </div>
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.section
                className={home ? "intro-copy" : "chapter-copy"}
                key={view}
                custom={direction}
                initial={
                  reducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: direction * 28, filter: "blur(3px)" }
                }
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={
                  reducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: -direction * 24, filter: "blur(3px)" }
                }
                transition={{
                  duration: reducedMotion ? 0.1 : 0.36,
                  ease: [0.22, 1, 0.36, 1],
                }}
                aria-labelledby="page-title"
              >
                <h1 id="page-title">
                  {home ? (
                    <>A small junction.</>
                  ) : (
                    chapters[stage].title.split("\n").map((line, i) => (
                      <React.Fragment key={line}>
                        {i > 0 && <br />}
                        {line}
                      </React.Fragment>
                    ))
                  )}
                </h1>
                <p className="theory">
                  {home
                    ? "The invisible physics of semiconductors, one moment at a time."
                    : chapters[stage].theory}
                </p>
                {!home && stage === 2 && (
                  <div
                    className="bias-control"
                    role="group"
                    aria-label="Bias polarity"
                  >
                    <button
                      aria-pressed={bias === "reverse"}
                      onClick={() => changeBias("reverse")}
                    >
                      Reverse bias
                    </button>
                    <button
                      aria-pressed={bias === "forward"}
                      onClick={() => changeBias("forward")}
                    >
                      Forward bias
                    </button>
                  </div>
                )}
                {!home && stage === 3 && (
                  <div className="voltage-control">
                    <div>
                      <label htmlFor="voltage">Reverse voltage</label>
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
                    <div className="range-ends">
                      <span>0 V</span>
                      <span>5 V</span>
                    </div>
                  </div>
                )}
              </motion.section>
            </AnimatePresence>
            <AnimatePresence>
              {selected && !home && (
                <motion.aside
                  className="inspection"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                >
                  <p>{inspection[selected]}</p>
                  <button
                    onClick={() => setSelected(null)}
                    aria-label="Close material detail"
                  >
                    <X size={14} />
                  </button>
                </motion.aside>
              )}
            </AnimatePresence>
            {home && (
              <motion.div
                className="begin-position"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <button className="primary-button" onClick={() => go(0)}>
                  Explore the junction <ArrowRight size={17} />
                </button>
                <span className="scroll-hint">
                  Scroll to discover <span>↓</span>
                </span>
              </motion.div>
            )}
          </main>
          <footer className="footer">
            <div className="footer-left">
              {home ? (
                <span>A closer look at how things work.</span>
              ) : (
                <>
                  <button
                    className="icon-button"
                    aria-label="Previous stage"
                    onClick={() => go(view - 1)}
                  >
                    <ArrowLeft size={17} />
                  </button>
                  <span className="chapter-count">
                    {String(stage + 1).padStart(2, "0")} <span>/ 04</span>
                  </span>
                </>
              )}
            </div>
            {!home ? (
              <>
                <nav className="stage-track" aria-label="Presentation chapters">
                  {chapters.map((chapter, i) => (
                    <button
                      key={i}
                      onClick={() => go(i)}
                      className={i === stage ? "current" : ""}
                      aria-label={`Stage ${i + 1}: ${chapter.label}`}
                      aria-current={i === stage ? "step" : undefined}
                    >
                      <span className="track-base" />
                      <span
                        className="track-fill"
                        style={{
                          width:
                            i === stage
                              ? `${frame.progress * 100}%`
                              : i < stage
                                ? "100%"
                                : "0%",
                        }}
                      />
                    </button>
                  ))}
                </nav>
                <div className="footer-right">
                  <div className="playback">
                    <button
                      className="icon-button"
                      onClick={() => setPlaying((p) => !p)}
                      aria-label={
                        playing ? "Pause animation" : "Play animation"
                      }
                      title={playing ? "Pause" : "Play"}
                    >
                      {playing ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button
                      className="icon-button"
                      onClick={() => {
                        reset();
                        setManualVoltage(null);
                        setPlaying(true);
                      }}
                      aria-label="Replay stage animation"
                      title="Replay"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      className="icon-button"
                      onClick={() => {
                        skip();
                        setPlaying(true);
                      }}
                      aria-label="Skip to end of animation"
                      title="Skip animation"
                    >
                      <SkipForward size={14} />
                    </button>
                    <button
                      className="icon-button fullscreen-button"
                      onClick={toggleFullscreen}
                      aria-label={
                        fullscreen ? "Exit full screen" : "Enter full screen"
                      }
                    >
                      {fullscreen ? (
                        <Minimize size={14} />
                      ) : (
                        <Maximize size={14} />
                      )}
                    </button>
                  </div>
                  <button
                    className="next-button"
                    onClick={() => go(stage === 3 ? -1 : stage + 1)}
                  >
                    {stage === 3 ? "Back to overview" : "Next"}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </>
            ) : (
              <span>Made for the curious.</span>
            )}
          </footer>
          {fullError && (
            <div className="toast" role="status">
              {fullError}
              <button onClick={() => setFullError("")} aria-label="Dismiss">
                <X size={14} />
              </button>
            </div>
          )}
        </div>
        {labOpen && (
          <Laboratory
            onClose={closeLab}
            initial={labSession.current}
            onSessionChange={saveLabSession}
          />
        )}
      </PresentationContext.Provider>
    </MotionConfig>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
