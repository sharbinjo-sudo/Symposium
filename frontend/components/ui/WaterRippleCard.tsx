"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { WaterRippleLayer } from "@/components/ui/WaterRippleLayer";
import { useWaterRipple } from "@/components/ui/useWaterRipple";

type WaterRippleCardProps = ComponentPropsWithoutRef<"article"> & {
  children: ReactNode;
  accent?: string;
};

export function WaterRippleCard({ className, children, accent, ...props }: WaterRippleCardProps) {
  const [pressed, setPressed] = useState(false);
  const { ripples, spawnRippleFromEvent } = useWaterRipple({
    variant: "card",
    maxRipples: 4,
    size: 320,
    strength: 1
  });

  return (
    <article
      className={cn("water-ripple-card", accent && `water-ripple-card-${accent}`, pressed && "is-pressed", className)}
      onPointerDown={(event) => {
        setPressed(true);
        spawnRippleFromEvent(event, event.currentTarget, {
          variant: "card",
          size: Math.max(event.currentTarget.clientWidth, 280)
        });
        props.onPointerDown?.(event);
      }}
      onPointerUp={(event) => {
        setPressed(false);
        props.onPointerUp?.(event);
      }}
      onPointerLeave={(event) => {
        setPressed(false);
        props.onPointerLeave?.(event);
      }}
      {...props}
    >
      {children}
      <WaterRippleLayer ripples={ripples} variant="card" />
    </article>
  );
}
