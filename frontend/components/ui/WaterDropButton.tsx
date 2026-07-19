"use client";

import type { ButtonHTMLAttributes, CSSProperties } from "react";
import { useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { WaterRippleLayer } from "@/components/ui/WaterRippleLayer";
import { useWaterRipple } from "@/components/ui/useWaterRipple";

type WaterDropButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "accent";
  magnetic?: boolean;
  showArrow?: boolean;
};

export function WaterDropButton({
  className,
  variant = "primary",
  magnetic = false,
  showArrow = true,
  children,
  ...props
}: WaterDropButtonProps) {
  const reducedMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const { ripples, spawnRippleFromEvent } = useWaterRipple({
    variant: "button",
    maxRipples: 4,
    size: 220,
    strength: 1.14
  });

  return (
    <button
      className={cn("button", `button-${variant}`, hovered && "button-hovered", className)}
      style={
        {
          "--button-offset-x": `${offset.x}px`,
          "--button-offset-y": `${offset.y}px`
        } as CSSProperties
      }
      {...props}
      onPointerMove={(event) => {
        if (magnetic && !reducedMotion && event.pointerType !== "touch") {
          const rect = event.currentTarget.getBoundingClientRect();
          setOffset({
            x: ((event.clientX - rect.left) / rect.width - 0.5) * 8,
            y: ((event.clientY - rect.top) / rect.height - 0.5) * 6
          });
        }
        props.onPointerMove?.(event);
      }}
      onPointerEnter={(event) => {
        setHovered(true);
        props.onPointerEnter?.(event);
      }}
      onPointerLeave={(event) => {
        setHovered(false);
        setOffset({ x: 0, y: 0 });
        props.onPointerLeave?.(event);
      }}
      onPointerDown={(event) => {
        spawnRippleFromEvent(event, event.currentTarget, {
          variant: "button",
          size: Math.max(180, event.currentTarget.clientWidth * 0.9)
        });
        props.onPointerDown?.(event);
      }}
    >
      <span className="button-reflection" aria-hidden="true" />
      <span className="button-compression" aria-hidden="true" />
      <span className="button-content">{children}</span>
      {showArrow ? (
        <span className="button-icon" aria-hidden="true">
          {">"}
        </span>
      ) : null}
      <WaterRippleLayer ripples={ripples} variant="button" />
    </button>
  );
}
