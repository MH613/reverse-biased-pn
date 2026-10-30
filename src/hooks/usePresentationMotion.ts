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
    width = useRef(30);
  const config = useRef({ stage, playing, bias, manualVoltage, reducedMotion });
  config.current = { stage, playing, bias, manualVoltage, reducedMotion };
  const [frame, setFrame] = useState({
    time: 0,
    progress: 0,
    width: 30,
    voltage: 0,
  });
  useEffect(() => {
    if (!enabled) return;
    let id: number,
      previous = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - (previous || now)) / 1000, 0.05);
      previous = now;
      const c = config.current;
      if (c.playing && !document.hidden) {
        elapsed.current = Math.min(DURATION, elapsed.current + dt);
        clock.current += dt;
      }
      const progress = elapsed.current / DURATION;
      const voltage =
        c.stage === 3
          ? (c.manualVoltage ??
            2 + 3 * progress * progress * (3 - 2 * progress))
          : c.stage >= 2
            ? 2
            : 0;
      const target = depletionWidth(c.stage, progress, voltage, c.bias);
      if (c.playing)
        width.current +=
          (target - width.current) *
          (c.reducedMotion ? 1 : 1 - Math.exp(-dt * 5));
      setFrame({
        time: c.reducedMotion ? 0 : clock.current,
        progress,
        width: width.current,
        voltage,
      });
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [enabled]);
  const reset = useCallback(() => {
    elapsed.current = 0;
  }, []);
  const skip = useCallback(() => {
    elapsed.current = DURATION;
  }, []);
  return { frame, reset, skip };
}
