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
import { LessonPanel } from "./presentation/LessonPanel";
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
  depletionWidth,
} from "./state/presentation";
import { usePresentationMotion } from "./hooks/usePresentationMotion";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "./style.css";
import "./presentation/presentation.css";
import { motionTiming, easeOut } from "./motion";

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
  const [mechanism, setMechanism] = useState<"avalanche" | "zener">(
    "avalanche",
  );
  const [manualVoltage, setManualVoltage] = useState<number | null>(null),
    [selected, setSelected] = useState<string | null>(null);
  const [labLeaving, setLabLeaving] = useState(false);
  const [labOpen, setLabOpen] = useState(false),
    [fullscreen, setFullscreen] = useState(false),
    [fullError, setFullError] = useState("");
  const [reducedMotion, setReducedMotion] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [viewport, setViewport] = useState({
    width: innerWidth,
    height: innerHeight,
  });
  const compact = viewport.width < 760;
  const wide = viewport.width >= 1440;
  useEffect(() => {
    const resize = () =>
      setViewport({ width: innerWidth, height: innerHeight });
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
      setView(target);
      reset();
      setPlaying(true);
      setSelected(null);
      setManualVoltage(null);
      setBias("reverse");
      window.scrollTo({ top: 0 });
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
        labLeaving ||
        (e.target as HTMLElement).closest(
          'input,textarea,select,[contenteditable="true"],[role="tooltip"],.model-details',
        )
      )
        return;
      if (e.key === "Escape") setSelected(null);
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
        labLeaving ||
        e.ctrlKey ||
        (e.target as HTMLElement).closest(
          'input,[role="dialog"],.model-details',
        )
      )
        return;
      // Small screens scroll naturally; presentation-size screens move by chapter.
      if (
        innerWidth < 760 ||
        innerHeight < 640 ||
        document.documentElement.scrollHeight > innerHeight + 1
      )
        return;
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
  }, [labOpen, labLeaving]);
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
  useEffect(() => {
    if (!labOpen && !labLeaving) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [labOpen, labLeaving]);
  const restoreLabFocus = useRef(false);
  useEffect(() => {
    if (restoreLabFocus.current && !labOpen && !labLeaving) {
      restoreLabFocus.current = false;
      document
        .querySelector<HTMLButtonElement>(".lab-button")
        ?.focus({ preventScroll: true });
    }
  }, [labOpen, labLeaving]);
  const closeLab = useCallback(() => {
    restoreLabFocus.current = true;
    setLabLeaving(true);
    setLabOpen(false);
  }, []);
  const handleVoltage = (voltage: number) => {
    setManualVoltage(voltage);
    setPlaying(true);
  };
  const changeBias = (next: BiasMode) => {
    setBias(next);
    reset();
    setPlaying(true);
  };
  // Keep a clear vertical band between the overview copy and discovery controls.
  // Short screens retain the scrollable layout's minimum usable height.
  const homeSceneWidth = Math.min(
    viewport.width * (compact ? 1.12 : 0.75),
    1280,
  );
  const homeFigureHeight =
    Math.max(viewport.height, compact ? 820 : 640) - (compact ? 410 : 390);
  const homeScale =
    0.96 * Math.min(1, homeFigureHeight / (homeSceneWidth * 0.42));
  const camera = {
    x: "0vw",
    y: "0vh",
    scale: home ? homeScale : 0.95,
    rotate: home ? 0 : -1,
  };
  return (
    <MotionConfig reducedMotion="user">
      <PresentationContext.Provider
        value={{
          stage,
          ...frame,
          width:
            stage === 2 && !home
              ? mechanism === "zener"
                ? 35
                : 160
              : depletionWidth(stage, frame.progress, frame.voltage, bias),
          playing: playing && !labOpen,
          bias,
          reducedMotion,
          lesson: true,
          breakdown: stage === 2 ? mechanism : undefined,
        }}
      >
        <motion.div
          initial={false}
          animate={{ opacity: labOpen ? 0 : 1 }}
          transition={{ duration: motionTiming.view, ease: easeOut }}
          className={`app-shell ${home ? "is-home" : "is-presentation"}`}
          aria-hidden={labOpen || labLeaving}
          style={{ pointerEvents: labOpen || labLeaving ? "none" : undefined }}
          inert={labOpen || labLeaving}
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
              <button
                className={home ? "active" : ""}
                aria-current={home ? "page" : undefined}
                onClick={() => go(-1)}
              >
                Overview
              </button>
              <button
                className={!home ? "active" : ""}
                aria-current={!home ? "page" : undefined}
                onClick={() => go(0)}
              >
                The explanation <ArrowUpRight size={12} />
              </button>
            </nav>
            <button className="lab-button" onClick={() => setLabOpen(true)}>
              <FlaskConical size={15} /> Laboratory <ArrowUpRight size={13} />
            </button>
          </header>
          <p className="sr-only" role="status" aria-atomic="true">
            {home
              ? "Overview: The PN junction."
              : `Stage ${stage + 1} of 4: ${chapters[stage].label}`}
          </p>
          <main
            className="presentation"
            data-stage={home ? "intro" : stage}
            data-wide={wide}
            onTouchStart={(e) => {
              if (
                (e.target as HTMLElement).closest(
                  "input,button,a,.lesson-dashboard,.model-details",
                )
              )
                return;
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
                  showCircuit={!home && (stage === 1 || stage === 3)}
                />
              </motion.div>
            </div>
            {home ? (
              <motion.section
                className="intro-copy"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                aria-labelledby="page-title"
              >
                <span className="lesson-eyebrow">
                  PN junction / Reverse bias
                </span>
                <h1 id="page-title">
                  Effect of Reverse Bias on the
                  <br className="desktop-break" /> Depletion Width and
                  Electric-Field Profile
                  <br className="desktop-break" /> of a PN Junction
                </h1>
                <p className="theory">
                  An interactive study of depletion, electric fields, and
                  junction breakdown.
                </p>
              </motion.section>
            ) : (
              <LessonPanel
                wide={wide}
                stage={stage}
                bias={bias}
                voltage={manualVoltage ?? 0}
                onVoltage={handleVoltage}
                onBias={changeBias}
                mechanism={mechanism}
                onMechanism={setMechanism}
              />
            )}
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
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reducedMotion ? 0 : 0.4, duration: 0.35 }}
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
                <span>Depletion approximation · Silicon · 300 K</span>
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
              <span>Charge → field → potential</span>
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
        </motion.div>
        <AnimatePresence
          onExitComplete={() => {
            setLabLeaving(false);
          }}
        >
          {labOpen && (
            <Laboratory
              onClose={closeLab}
              initial={labSession.current}
              onSessionChange={saveLabSession}
            />
          )}
        </AnimatePresence>
      </PresentationContext.Provider>
    </MotionConfig>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
