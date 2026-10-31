import { useState, type ComponentProps } from "react";
import { motion, useReducedMotion } from "motion/react";
import { motionTiming } from "../motion";

type Props = Omit<
  ComponentProps<typeof motion.path>,
  "initial" | "animate" | "transition" | "onAnimationComplete"
> & { zoom: number; draw?: boolean };

/** Non-scaling strokes need zoom-aware drawing dashes and a solid settled stroke. */
export function DrawnWirePath({ zoom, draw = true, className, ...props }: Props) {
  const [drawn, setDrawn] = useState(false);
  const reducedMotion = useReducedMotion();
  return (
    <motion.path
      {...props}
      className={`drawn-wire ${className ?? ""}`}
      data-drawn={draw && (drawn || !!reducedMotion)}
      initial={draw && !reducedMotion ? { pathLength: 0 } : false}
      animate={draw ? { pathLength: zoom, pathSpacing: 10000 } : undefined}
      transition={{ duration: reducedMotion ? 0 : motionTiming.view }}
      onAnimationComplete={() => setDrawn(true)}
    />
  );
}
