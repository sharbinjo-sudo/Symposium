"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

type AnimatedCounterProps = {
  value: string;
};

export function AnimatedCounter({ value }: AnimatedCounterProps) {
  const reducedMotion = useReducedMotion();
  const numeric = Number(value.replace(/[^\d]/g, ""));
  const [display, setDisplay] = useState(Number.isNaN(numeric) ? value : "0");

  useEffect(() => {
    if (reducedMotion || Number.isNaN(numeric)) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const totalFrames = 28;
    let animation = 0;

    const update = () => {
      frame += 1;
      const progress = frame / totalFrames;
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(String(Math.round(numeric * eased)).padStart(value.length, "0"));

      if (frame < totalFrames) {
        animation = window.requestAnimationFrame(update);
      } else {
        setDisplay(value);
      }
    };

    animation = window.requestAnimationFrame(update);

    return () => window.cancelAnimationFrame(animation);
  }, [numeric, reducedMotion, value]);

  return <>{display}</>;
}
