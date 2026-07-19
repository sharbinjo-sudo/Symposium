"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import type { WaterRipple, WaterRippleVariant } from "@/components/ui/useWaterRipple";

type WaterRippleLayerProps = {
  ripples: WaterRipple[];
  className?: string;
  variant?: WaterRippleVariant;
};

export function WaterRippleLayer({ ripples, className, variant = "surface" }: WaterRippleLayerProps) {
  return (
    <span className={cn("water-ripple-layer", `water-ripple-layer-${variant}`, className)} aria-hidden="true">
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className={cn("water-ripple", `water-ripple-${ripple.variant}`)}
          style={
            {
              "--ripple-x": `${ripple.x}px`,
              "--ripple-y": `${ripple.y}px`,
              "--ripple-size": `${ripple.size}px`,
              "--ripple-duration": `${ripple.duration}ms`,
              "--ripple-strength": `${ripple.strength}`
            } as CSSProperties
          }
        >
          <span className="water-ripple-impact" />
          <span className="water-ripple-highlight" />
          <span className="water-ripple-distortion" />
          {Array.from({ length: ripple.rings }).map((_, index) => (
            <span
              key={index}
              className={cn("water-ripple-ring", `water-ripple-ring-${index + 1}`)}
              style={{ ["--ring-index" as string]: `${index}` }}
            />
          ))}
        </span>
      ))}
    </span>
  );
}
