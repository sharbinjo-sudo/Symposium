"use client";

import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, TouchEvent as ReactTouchEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

export type WaterRippleVariant = "button" | "card" | "surface" | "global";
export type WaterRippleKind = "impact" | "drift";

export type WaterRipple = {
  id: number;
  x: number;
  y: number;
  createdAt: number;
  duration: number;
  size: number;
  strength: number;
  rings: number;
  variant: WaterRippleVariant;
  kind: WaterRippleKind;
};

type WaterRippleOptions = {
  duration?: number;
  maxRipples?: number;
  size?: number;
  strength?: number;
  rings?: number;
  variant?: WaterRippleVariant;
};

type PointerLikeEvent =
  | MouseEvent
  | PointerEvent
  | TouchEvent
  | ReactMouseEvent<HTMLElement>
  | ReactPointerEvent<HTMLElement>
  | ReactTouchEvent<HTMLElement>;

function getLocalPoint(event: PointerLikeEvent, rect: DOMRect) {
  if ("touches" in event && event.touches.length > 0) {
    const touch = event.touches[0];
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }

  if ("changedTouches" in event && event.changedTouches.length > 0) {
    const touch = event.changedTouches[0];
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }

  if ("clientX" in event && "clientY" in event) {
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  return { x: rect.width / 2, y: rect.height / 2 };
}

export function useWaterRipple({
  duration = 1100,
  maxRipples = 5,
  size = 280,
  strength = 1,
  rings = 3,
  variant = "surface"
}: WaterRippleOptions = {}) {
  const reducedMotion = useReducedMotion();
  const frameRef = useRef<number | null>(null);
  const rippleIdRef = useRef(0);
  const latestRipplesRef = useRef<WaterRipple[]>([]);
  const [ripples, setRipples] = useState<WaterRipple[]>([]);

  const stopLoop = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    const now = performance.now();
    const nextRipples = latestRipplesRef.current.filter((ripple) => now - ripple.createdAt < ripple.duration);

    if (nextRipples.length !== latestRipplesRef.current.length) {
      latestRipplesRef.current = nextRipples;
      setRipples(nextRipples);
    }

    if (nextRipples.length > 0 && !document.hidden) {
      frameRef.current = window.requestAnimationFrame(tick);
    } else {
      stopLoop();
    }
  }, [stopLoop]);

  useEffect(() => {
    latestRipplesRef.current = ripples;
  }, [ripples]);

  useEffect(() => stopLoop, [stopLoop]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopLoop();
      } else if (latestRipplesRef.current.length > 0 && frameRef.current === null) {
        frameRef.current = window.requestAnimationFrame(tick);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [stopLoop, tick]);

  const spawnRipple = useCallback(
    (x: number, y: number, custom?: Partial<Omit<WaterRipple, "id" | "x" | "y" | "createdAt">>) => {
      const nextRipple: WaterRipple = {
        id: (rippleIdRef.current += 1),
        x,
        y,
        createdAt: performance.now(),
        duration: reducedMotion ? 420 : custom?.duration ?? duration,
        size: custom?.size ?? size,
        strength: reducedMotion ? 0.5 : custom?.strength ?? strength,
        rings: reducedMotion ? 1 : custom?.rings ?? rings,
        variant: custom?.variant ?? variant,
        kind: custom?.kind ?? "impact"
      };

      const nextRipples = [...latestRipplesRef.current, nextRipple].slice(-maxRipples);
      latestRipplesRef.current = nextRipples;
      setRipples(nextRipples);

      if (frameRef.current === null) {
        frameRef.current = window.requestAnimationFrame(tick);
      }
    },
    [duration, maxRipples, reducedMotion, rings, size, strength, tick, variant]
  );

  const spawnRippleFromEvent = useCallback(
    (event: PointerLikeEvent, element: HTMLElement, custom?: Partial<Omit<WaterRipple, "id" | "x" | "y" | "createdAt">>) => {
      const rect = element.getBoundingClientRect();
      const point = getLocalPoint(event, rect);
      const inferredSize = Math.max(rect.width, rect.height) * (variant === "global" ? 0.34 : 0.82);
      spawnRipple(point.x, point.y, {
        size: Math.max(160, inferredSize),
        ...custom
      });
    },
    [spawnRipple, variant]
  );

  return {
    ripples,
    spawnRipple,
    spawnRippleFromEvent
  };
}


