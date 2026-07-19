"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { RippleSurface } from "@/components/ui/RippleSurface";

const flowLabels = [
  { label: "Paper", className: "hero-node-paper" },
  { label: "Code", className: "hero-node-code" },
  { label: "Web", className: "hero-node-web" },
  { label: "Data", className: "hero-node-data" }
];

export function HeroVisual() {
  const reducedMotion = useReducedMotion();
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  function updateOffset(clientX: number, clientY: number, rect: DOMRect) {
    if (reducedMotion) {
      return;
    }

    setOffset({
      x: ((clientX - rect.left) / rect.width - 0.5) * 18,
      y: ((clientY - rect.top) / rect.height - 0.5) * 18
    });
  }

  return (
    <RippleSurface className="hero-visual-shell" rippleVariant="surface" maxRipples={3} rippleSize={420} rippleStrength={0.9}>
      <motion.div
        className="hero-visual"
        initial={{ opacity: 0, y: reducedMotion ? 0 : 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        onPointerMove={(event) => updateOffset(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setOffset({ x: 0, y: 0 })}
      >
        <motion.div
          className="hero-water hero-water-one"
          animate={reducedMotion ? undefined : { x: offset.x * -0.26, y: offset.y * -0.16 }}
          transition={{ type: "spring", stiffness: 72, damping: 18 }}
        />
        <motion.div
          className="hero-water hero-water-two"
          animate={reducedMotion ? undefined : { x: offset.x * 0.22, y: offset.y * 0.18 }}
          transition={{ type: "spring", stiffness: 78, damping: 20 }}
        />
        <motion.div
          className="hero-water hero-water-three"
          animate={reducedMotion ? undefined : { x: offset.x * -0.12, y: offset.y * 0.24 }}
          transition={{ type: "spring", stiffness: 70, damping: 18 }}
        />

        <svg className="hero-contour-svg" viewBox="0 0 640 520" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M42 146C112 108 180 120 251 152C321 184 393 199 474 154C542 116 588 126 630 168" />
          <path d="M20 236C94 212 151 230 217 268C302 316 395 325 495 262C555 224 597 227 640 246" />
          <path d="M14 328C86 298 162 309 231 354C304 401 399 412 484 378C544 354 595 352 633 368" />
          <path d="M78 74C142 42 208 50 278 86C345 121 431 131 520 98C561 83 596 84 628 95" />
          <path d="M90 432C168 408 224 421 292 454C365 489 454 495 548 468C584 458 614 457 640 462" />
        </svg>

        <div className="hero-flowlines">
          <span className="hero-flowline hero-flowline-one" />
          <span className="hero-flowline hero-flowline-two" />
          <span className="hero-flowline hero-flowline-three" />
        </div>

        {flowLabels.map((item, index) => (
          <motion.div
            key={item.label}
            className={`hero-data-node ${item.className}`}
            animate={reducedMotion ? undefined : { x: offset.x * (index % 2 === 0 ? 0.22 : -0.2), y: offset.y * (0.12 + index * 0.03) }}
          >
            <span>{item.label}</span>
          </motion.div>
        ))}

        <motion.div
          className="hero-data-panel"
          animate={reducedMotion ? undefined : { x: offset.x * 0.12, y: offset.y * -0.08 }}
        >
          <strong>Fluid event map</strong>
          <span>Data, story, code, and presentation pathways converge across one calm interactive surface.</span>
        </motion.div>
      </motion.div>
    </RippleSurface>
  );
}
