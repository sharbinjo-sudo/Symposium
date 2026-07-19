"use client";

import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { WaterRippleLayer } from "@/components/ui/WaterRippleLayer";
import { useWaterRipple, type WaterRippleVariant } from "@/components/ui/useWaterRipple";

type RippleSurfaceProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
  rippleVariant?: WaterRippleVariant;
  maxRipples?: number;
  rippleStrength?: number;
  rippleSize?: number;
  pressedClassName?: string;
  disabled?: boolean;
};

export function RippleSurface<T extends ElementType = "div">({
  as,
  children,
  className,
  rippleVariant = "surface",
  maxRipples = 4,
  rippleStrength = 1,
  rippleSize = 260,
  pressedClassName,
  disabled = false,
  ...props
}: RippleSurfaceProps<T> & Omit<ComponentPropsWithoutRef<T>, keyof RippleSurfaceProps<T>>) {
  const Component = as ?? "div";
  const [pressed, setPressed] = useState(false);
  const { ripples, spawnRippleFromEvent } = useWaterRipple({
    maxRipples,
    strength: rippleStrength,
    size: rippleSize,
    variant: rippleVariant
  });

  return (
    <Component
      className={cn("ripple-surface", pressed && pressedClassName, className)}
      onPointerDown={(event: React.PointerEvent<HTMLElement>) => {
        if (!disabled) {
          setPressed(true);
          spawnRippleFromEvent(event, event.currentTarget, { variant: rippleVariant });
        }
        (props as ComponentPropsWithoutRef<T>).onPointerDown?.(event as never);
      }}
      onPointerUp={(event: React.PointerEvent<HTMLElement>) => {
        setPressed(false);
        (props as ComponentPropsWithoutRef<T>).onPointerUp?.(event as never);
      }}
      onPointerLeave={(event: React.PointerEvent<HTMLElement>) => {
        setPressed(false);
        (props as ComponentPropsWithoutRef<T>).onPointerLeave?.(event as never);
      }}
      {...props}
    >
      {children}
      <WaterRippleLayer ripples={ripples} variant={rippleVariant} />
    </Component>
  );
}
