import { useCallback, useEffect, useRef, useState } from "react";
import { depletionWidth, type BiasMode } from "../state/presentation";
export const DURATION = 12;
export function usePresentationMotion(
  stage: number,
  playing: boolean,
  bias: BiasMode,
  manualVoltage: number | null,
  reducedMotion: boolean,
  enabled = true,
) {
  const elapsed = useRef(0),
    clock = useRef(0),
    width = useRef(30),
    applied = useRef(0),
    previousBias = useRef(bias);
  const [cycle, setCycle] = useState(0),
    [frame, setFrame] = useState({
      time: 0,
      progress: 0,
      width: 30,
      voltage: 0,
      pFraction: 2 / 3,
    });
  useEffect(() => {
    if (!enabled || !playing) return;
    let id = 0,
      previous = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - (previous || now)) / 1000, 0.05);
      previous = now;
      if (previousBias.current !== bias) {
        applied.current = 0;
        previousBias.current = bias;
      }
      if (!document.hidden) {
        elapsed.current = reducedMotion
          ? DURATION
          : Math.min(DURATION, elapsed.current + dt);
        clock.current += dt;
      }
      const progress = elapsed.current / DURATION,
        requested =
          stage === 3
            ? (manualVoltage ??
              2 + 8 * progress * progress * (3 - 2 * progress))
            : stage >= 2
              ? (bias === "forward" ? 0.4 : 2) * progress
              : 0;
      applied.current +=
        (requested - applied.current) *
        (reducedMotion ? 1 : 1 - Math.exp(-dt * 18));
      if (Math.abs(requested - applied.current) < 0.00001)
        applied.current = requested;
      const target = depletionWidth(stage, progress, applied.current, bias);
      if (stage >= 2 || reducedMotion) width.current = target;
      else width.current += (target - width.current) * (1 - Math.exp(-dt * 5));
      if (Math.abs(target - width.current) < 0.001) width.current = target;
      setFrame({
        time: clock.current,
        progress,
        width: width.current,
        voltage: applied.current,
        pFraction: 2 / 3,
      });
      // Thermal carrier motion is native CSS. Once the timeline settles there is
      // no React animation loop left running in an idle presentation.
      if (
        progress < 1 ||
        applied.current !== requested ||
        width.current !== target
      )
        id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [stage, playing, bias, manualVoltage, reducedMotion, enabled, cycle]);
  const reset = useCallback(() => {
    elapsed.current = 0;
    setCycle((n) => n + 1);
  }, []);
  const skip = useCallback(() => {
    elapsed.current = DURATION;
    setCycle((n) => n + 1);
  }, []);
  return { frame, reset, skip };
}
