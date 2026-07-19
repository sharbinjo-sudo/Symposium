"use client";

import Link, { type LinkProps } from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { WaterRippleLayer } from "@/components/ui/WaterRippleLayer";
import { useWaterRipple } from "@/components/ui/useWaterRipple";

type ButtonLinkProps = LinkProps & {
  children: ReactNode;
  className?: string;
  magnetic?: boolean;
  variant?: "primary" | "secondary" | "accent";
};

export function ButtonLink({
  children,
  className,
  magnetic = false,
  variant = "primary",
  ...props
}: ButtonLinkProps) {
  const reducedMotion = useReducedMotion();
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const { ripples, spawnRippleFromEvent } = useWaterRipple({
    variant: "button",
    maxRipples: 4,
    size: 220,
    strength: 1.12
  });

  const motionStyle: CSSProperties = {
    ["--button-offset-x" as string]: `${offset.x}px`,
    ["--button-offset-y" as string]: `${offset.y}px`
  };

  return (
    <Link
      className={cn("button", `button-${variant}`, hovered && "button-hovered", className)}
      style={motionStyle}
      onPointerMove={(event) => {
        if (magnetic && !reducedMotion && event.pointerType !== "touch") {
          const rect = event.currentTarget.getBoundingClientRect();
          setOffset({
            x: ((event.clientX - rect.left) / rect.width - 0.5) * 8,
            y: ((event.clientY - rect.top) / rect.height - 0.5) * 6
          });
        }
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        setHovered(false);
        setOffset({ x: 0, y: 0 });
      }}
      onPointerDown={(event) => {
        spawnRippleFromEvent(event, event.currentTarget, {
          variant: "button",
          size: Math.max(180, event.currentTarget.clientWidth * 0.9)
        });
      }}
      {...props}
    >
      <span className="button-reflection" aria-hidden="true" />
      <span className="button-compression" aria-hidden="true" />
      <span className="button-content">{children}</span>
      <span className="button-icon" aria-hidden="true">
        {">"}
      </span>
      <WaterRippleLayer ripples={ripples} variant="button" />
    </Link>
  );
}
