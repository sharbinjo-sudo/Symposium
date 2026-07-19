"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  scale?: number;
  once?: boolean;
};

export function Reveal({ children, className, delay = 0, y = 28, scale = 1, once = true }: RevealProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={cn("reveal-block", className)}
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y, scale }}
      whileInView={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once, amount: 0.2 }}
      transition={{ duration: 0.68, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

