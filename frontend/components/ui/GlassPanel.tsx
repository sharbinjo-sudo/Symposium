import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

type GlassPanelProps<T extends ElementType> = {
  as?: T;
  className?: string;
  children: ReactNode;
  tone?: "default" | "soft" | "strong";
};

export function GlassPanel<T extends ElementType = "div">({
  as,
  className,
  children,
  tone = "default",
  ...props
}: GlassPanelProps<T> & Omit<ComponentPropsWithoutRef<T>, keyof GlassPanelProps<T>>) {
  const Component = as ?? "div";

  return (
    <Component
      className={cn("glass-panel", tone === "soft" && "glass-panel-soft", tone === "strong" && "glass-panel-strong", className)}
      {...props}
    >
      {children}
    </Component>
  );
}

