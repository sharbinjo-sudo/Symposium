"use client";

import { useEffect } from "react";
import { WaterRippleLayer } from "@/components/ui/WaterRippleLayer";
import { useWaterRipple } from "@/components/ui/useWaterRipple";

export function GlobalWaterRippleLayer() {
  const { ripples, spawnRipple } = useWaterRipple({
    variant: "global",
    maxRipples: 5,
    duration: 1250,
    size: 280,
    strength: 0.72,
    rings: 3
  });

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" || event.pointerType === "touch" || event.pointerType === "pen") {
        spawnRipple(event.clientX, event.clientY, {
          variant: "global",
          size: 260
        });
      }
    };

    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [spawnRipple]);

  return <WaterRippleLayer ripples={ripples} className="global-water-ripple-layer" variant="global" />;
}
