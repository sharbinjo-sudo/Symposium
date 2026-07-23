"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { WaterRippleLayer } from "@/components/ui/WaterRippleLayer";
import { useWaterRipple } from "@/components/ui/useWaterRipple";

const MOVE_INTERVAL_MS = 24;
const MOVE_DISTANCE_PX = 8;
const TRAIL_SIZES = [34, 30, 26, 22, 19, 16, 14, 12];
const TRAIL_HEAD_EASING = 0.34;
const TRAIL_FOLLOW_EASING = 0.28;

type TrailPoint = {
  x: number;
  y: number;
  opacity: number;
  scale: number;
  initialized: boolean;
};

function createTrailPoints(): TrailPoint[] {
  return TRAIL_SIZES.map(() => ({
    x: 0,
    y: 0,
    opacity: 0,
    scale: 0.84,
    initialized: false
  }));
}

export function GlobalWaterRippleLayer() {
  const reducedMotion = useReducedMotion();
  const { ripples, spawnRipple } = useWaterRipple({
    variant: "global",
    maxRipples: 18,
    duration: 1250,
    size: 280,
    strength: 0.72,
    rings: 3
  });
  const lastMoveRef = useRef<{ x: number | null; y: number | null; time: number }>({
    x: null,
    y: null,
    time: 0
  });
  const frameRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 0, y: 0, active: false });
  const trailPointsRef = useRef<TrailPoint[]>(createTrailPoints());
  const trailRefs = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    const stopLoop = () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };

    const setTrailOrigin = (x: number, y: number) => {
      trailPointsRef.current = trailPointsRef.current.map((point) => ({
        ...point,
        x,
        y,
        initialized: true
      }));
    };

    const paintTrail = () => {
      let hasVisibleTrail = false;

      trailPointsRef.current.forEach((point, index) => {
        const element = trailRefs.current[index];
        if (!element || !point.initialized) {
          return;
        }

        const isActive = targetRef.current.active;
        const targetOpacity = isActive ? Math.max(0.12, 0.34 - index * 0.032) : 0;
        const targetScale = isActive ? Math.max(0.72, 1 - index * 0.052) : 0.88;

        point.opacity += (targetOpacity - point.opacity) * (isActive ? 0.3 : 0.12);
        point.scale += (targetScale - point.scale) * 0.18;

        element.style.opacity = point.opacity.toFixed(3);
        element.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%) scale(${point.scale.toFixed(3)})`;

        if (point.opacity > 0.015) {
          hasVisibleTrail = true;
        }
      });

      return hasVisibleTrail;
    };

    const animateTrail = () => {
      const points = trailPointsRef.current;
      const target = targetRef.current;
      const head = points[0];

      if (target.active && head) {
        head.x += (target.x - head.x) * TRAIL_HEAD_EASING;
        head.y += (target.y - head.y) * TRAIL_HEAD_EASING;
      }

      for (let index = 1; index < points.length; index += 1) {
        const point = points[index];
        const lead = points[index - 1];
        const easing = Math.max(0.14, TRAIL_FOLLOW_EASING - index * 0.018);
        point.x += (lead.x - point.x) * easing;
        point.y += (lead.y - point.y) * easing;
        point.initialized = lead.initialized;
      }

      const hasVisibleTrail = paintTrail();
      const shouldContinue = target.active || hasVisibleTrail;

      if (shouldContinue) {
        frameRef.current = window.requestAnimationFrame(animateTrail);
      } else {
        frameRef.current = null;
      }
    };

    const startLoop = () => {
      if (frameRef.current === null) {
        frameRef.current = window.requestAnimationFrame(animateTrail);
      }
    };

    const resetMoveState = () => {
      lastMoveRef.current = { x: null, y: null, time: 0 };
      targetRef.current.active = false;
      startLoop();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") {
        return;
      }

      if (!trailPointsRef.current[0]?.initialized) {
        setTrailOrigin(event.clientX, event.clientY);
      }

      targetRef.current = {
        x: event.clientX,
        y: event.clientY,
        active: !reducedMotion
      };

      startLoop();

      if (reducedMotion) {
        return;
      }

      const now = performance.now();
      const { x, y, time } = lastMoveRef.current;

      if (now - time < MOVE_INTERVAL_MS) {
        return;
      }

      if (x !== null && y !== null) {
        const distance = Math.hypot(event.clientX - x, event.clientY - y);
        if (distance < MOVE_DISTANCE_PX) {
          return;
        }
      }

      lastMoveRef.current = {
        x: event.clientX,
        y: event.clientY,
        time: now
      };

      spawnRipple(event.clientX, event.clientY, {
        variant: "global",
        kind: "drift",
        size: 200,
        duration: 1120,
        strength: 0.44,
        rings: 3
      });
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" || event.pointerType === "touch" || event.pointerType === "pen") {
        if (!trailPointsRef.current[0]?.initialized) {
          setTrailOrigin(event.clientX, event.clientY);
        }

        targetRef.current = {
          x: event.clientX,
          y: event.clientY,
          active: event.pointerType !== "touch" && !reducedMotion
        };
        lastMoveRef.current = {
          x: event.clientX,
          y: event.clientY,
          time: performance.now()
        };

        startLoop();
        spawnRipple(event.clientX, event.clientY, {
          variant: "global",
          kind: "impact",
          size: 276,
          duration: 1240,
          strength: 0.76,
          rings: 3
        });
      }
    };

    const handleMouseOut = (event: MouseEvent) => {
      if (!event.relatedTarget) {
        resetMoveState();
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointercancel", resetMoveState);
    window.addEventListener("blur", resetMoveState);
    window.addEventListener("mouseout", handleMouseOut);

    return () => {
      stopLoop();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointercancel", resetMoveState);
      window.removeEventListener("blur", resetMoveState);
      window.removeEventListener("mouseout", handleMouseOut);
    };
  }, [reducedMotion, spawnRipple]);

  return (
    <>
      <div className="pointer-fluid-trail" aria-hidden="true">
        {TRAIL_SIZES.map((size, index) => (
          <span
            key={index}
            ref={(element) => {
              trailRefs.current[index] = element;
            }}
            className="pointer-fluid-drop"
            style={{ ["--trail-size" as string]: `${size}px` } as CSSProperties}
          />
        ))}
      </div>
      <WaterRippleLayer ripples={ripples} className="global-water-ripple-layer" variant="global" />
    </>
  );
}


