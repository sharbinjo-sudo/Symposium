"use client";

import React, { useEffect, useRef } from "react";

const NODES = [
  { top: 12, left: 18, color: "#c9a227", delay: "0s", dur: "3.4s" },
  { top: 22, left: 72, color: "#7b1b33", delay: "1.1s", dur: "4.1s" },
  { top: 38, left: 8, color: "#c24b63", delay: "0.6s", dur: "3.8s" },
  { top: 48, left: 84, color: "#c9a227", delay: "2.2s", dur: "3.2s" },
  { top: 58, left: 34, color: "#7b1b33", delay: "0.3s", dur: "4.4s" },
  { top: 64, left: 60, color: "#c24b63", delay: "1.7s", dur: "3.6s" },
  { top: 76, left: 14, color: "#c9a227", delay: "0.9s", dur: "4.0s" },
  { top: 82, left: 90, color: "#7b1b33", delay: "2.6s", dur: "3.3s" },
  { top: 8, left: 48, color: "#c24b63", delay: "1.4s", dur: "3.9s" },
  { top: 92, left: 52, color: "#c9a227", delay: "0.4s", dur: "4.2s" },
];

const LINKS = [
  [0, 2],
  [2, 4],
  [4, 6],
  [6, 8],
  [1, 3],
  [3, 5],
  [5, 7],
  [7, 9],
  [0, 1],
  [8, 9],
  [4, 5],
  [2, 8],
];

type BackgroundStyle = React.CSSProperties & {
  "--mx": number;
  "--my": number;
  "--scroll": number;
};

export function AuroraBackground() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    let rafMouse: number | null = null;
    let rafScroll: number | null = null;

    const finePointer = window.matchMedia("(pointer: fine)").matches;

    const handleMove = (e: MouseEvent) => {
      if (!finePointer) return;
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      if (rafMouse) cancelAnimationFrame(rafMouse);
      rafMouse = requestAnimationFrame(() => {
        el.style.setProperty("--mx", x.toFixed(3));
        el.style.setProperty("--my", y.toFixed(3));
      });
    };

    const handleScroll = () => {
      if (rafScroll) cancelAnimationFrame(rafScroll);
      rafScroll = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? window.scrollY / max : 0;
        el.style.setProperty("--scroll", Math.min(1, Math.max(0, p)).toFixed(3));
      });
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("scroll", handleScroll);
      if (rafMouse) cancelAnimationFrame(rafMouse);
      if (rafScroll) cancelAnimationFrame(rafScroll);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="bg-root"
      style={{ "--mx": 0, "--my": 0, "--scroll": 0 } as BackgroundStyle}
      aria-hidden="true"
    >
      <style>{`
        .bg-root {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .bg-aura {
          position: absolute;
          inset: -10%;
          background: linear-gradient(120deg,
            #fdf1f2 0%, #fbe3e7 30%, #fdece7 55%, #fbe7ea 80%, #fdf1f2 100%);
          background-size: 220% 220%;
          animation: auraShift 26s ease-in-out infinite;
          filter: hue-rotate(calc(var(--scroll) * 12deg));
        }

        .bg-grid--far {
          position: absolute;
          inset: -20%;
          background-image:
            repeating-linear-gradient(45deg, rgba(123,27,51,0.035) 0px, rgba(123,27,51,0.035) 1px, transparent 1px, transparent 56px),
            repeating-linear-gradient(-45deg, rgba(123,27,51,0.03) 0px, rgba(123,27,51,0.03) 1px, transparent 1px, transparent 56px);
          animation: gridDrift 70s linear infinite;
          transform: translate(calc(var(--mx) * -6px), calc(var(--my) * -6px));
          transition: transform 0.3s ease-out;
        }

        .bg-grid--near {
          position: absolute;
          inset: -20%;
          background-image:
            repeating-linear-gradient(45deg, rgba(123,27,51,0.06) 0px, rgba(123,27,51,0.06) 1px, transparent 1px, transparent 40px),
            repeating-linear-gradient(-45deg, rgba(123,27,51,0.05) 0px, rgba(123,27,51,0.05) 1px, transparent 1px, transparent 40px);
          animation: gridDrift 40s linear infinite reverse;
          transform: translate(calc(var(--mx) * -18px), calc(var(--my) * -18px));
          transition: transform 0.25s ease-out;
        }

        .bg-motes--far, .bg-motes--near {
          position: absolute;
          inset: -20% -20%;
          background-repeat: repeat;
        }
        .bg-motes--far {
          background-image:
            radial-gradient(circle, rgba(201,162,39,0.35) 0 1px, transparent 1.5px);
          background-size: 140px 160px;
          opacity: 0.4;
          animation: motesRise 60s linear infinite;
          transform: translate(calc(var(--mx) * 8px), 0);
        }
        .bg-motes--near {
          background-image:
            radial-gradient(circle, rgba(123,27,51,0.4) 0 1.2px, transparent 1.8px);
          background-size: 90px 100px;
          opacity: 0.5;
          animation: motesRise 34s linear infinite;
          transform: translate(calc(var(--mx) * 16px), 0);
        }

        .bg-blob {
          position: absolute;
          border-radius: 9999px;
          filter: blur(90px);
          opacity: 0.35;
          will-change: transform;
          transition: transform 0.3s ease-out;
        }
        .bg-blob--maroon {
          width: 560px; height: 560px;
          top: -120px; left: -100px;
          background: radial-gradient(circle, #7b1b33 0%, transparent 70%);
          animation: driftA 34s ease-in-out infinite alternate;
          transform: translate(calc(var(--mx) * 30px), calc(var(--my) * 30px));
        }
        .bg-blob--rose {
          width: 620px; height: 620px;
          bottom: -160px; right: -120px;
          background: radial-gradient(circle, #c24b63 0%, transparent 70%);
          animation: driftB 40s ease-in-out infinite alternate;
          transform: translate(calc(var(--mx) * -24px), calc(var(--my) * -24px));
        }
        .bg-blob--gold {
          width: 420px; height: 420px;
          top: 40%; left: 60%;
          background: radial-gradient(circle, #c9a227 0%, transparent 70%);
          opacity: 0.18;
          animation: driftC 46s ease-in-out infinite alternate;
          transform: translate(calc(var(--mx) * 18px), calc(var(--my) * -18px));
        }

        .bg-circuit { position: absolute; inset: 0; width: 100%; height: 100%; }
        .bg-circuit line {
          stroke-dasharray: 4 5;
          animation: flow 3s linear infinite;
        }
        .bg-circuit line:nth-child(odd) { animation-duration: 2.4s; }
        .bg-circuit line:nth-child(3n) { animation-duration: 3.6s; animation-direction: reverse; }

        .bg-node {
          position: absolute;
          width: 5px; height: 5px;
          border-radius: 9999px;
          animation: twinkle ease-in-out infinite;
        }

        .bg-pulse {
          position: absolute;
          width: 8px; height: 8px;
          border-radius: 9999px;
          box-shadow: 0 0 16px 5px currentColor;
        }
        .bg-pulse--1 { top: 22%; color: #c9a227; background: #c9a227; animation: travelH 9s linear infinite; }
        .bg-pulse--2 { top: 68%; color: #7b1b33; background: #7b1b33; animation: travelH 13s linear infinite 2.5s; }
        .bg-pulse--3 { color: #c24b63; background: #c24b63; animation: travelDiag 11s linear infinite 4s; }

        .bg-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 40%, transparent 55%, rgba(42,16,21,0.07) 100%);
        }

        @keyframes auraShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes gridDrift {
          0%   { transform: translate(0, 0); }
          100% { transform: translate(60px, 60px); }
        }
        @keyframes motesRise {
          0%   { background-position: 0 0; }
          100% { background-position: 0 -400px; }
        }
        @keyframes driftA {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(60px, 40px) scale(1.08); }
        }
        @keyframes driftB {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-50px, -60px) scale(1.05); }
        }
        @keyframes driftC {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-40px, 30px) scale(0.9); }
        }
        @keyframes flow {
          to { stroke-dashoffset: -18; }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.6); }
        }
        @keyframes travelH {
          0%   { left: -5%; opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { left: 105%; opacity: 0; }
        }
        @keyframes travelDiag {
          0%   { top: -5%; left: -5%; opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { top: 105%; left: 105%; opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .bg-grid--near,
          .bg-motes--near,
          .bg-circuit,
          .bg-pulse,
          .bg-node {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .bg-aura, .bg-grid--far, .bg-grid--near, .bg-motes--far, .bg-motes--near,
          .bg-blob, .bg-circuit line, .bg-node, .bg-pulse--1, .bg-pulse--2, .bg-pulse--3 {
            animation: none !important;
            transition: none !important;
          }
        }

        @media (max-width: 720px) {
          .bg-root {
            background:
              radial-gradient(circle at 15% 12%, rgba(143, 29, 44, 0.14), transparent 35%),
              radial-gradient(circle at 92% 36%, rgba(217, 75, 96, 0.16), transparent 38%),
              radial-gradient(circle at 45% 88%, rgba(201, 162, 39, 0.1), transparent 36%),
              linear-gradient(135deg, #fff9fa 0%, #fdeef1 54%, #fffafa 100%);
          }

          .bg-aura {
            inset: -18%;
            opacity: 0.96;
            background: linear-gradient(135deg,
              rgba(255, 255, 255, 0.42) 0%,
              rgba(255, 231, 236, 0.7) 38%,
              rgba(255, 244, 246, 0.82) 68%,
              rgba(255, 255, 255, 0.48) 100%);
            animation-duration: 34s;
          }

          .bg-grid--far {
            display: block;
            opacity: 0.42;
            background-image:
              repeating-linear-gradient(45deg, rgba(143,29,44,0.045) 0px, rgba(143,29,44,0.045) 1px, transparent 1px, transparent 72px),
              repeating-linear-gradient(-45deg, rgba(217,75,96,0.035) 0px, rgba(217,75,96,0.035) 1px, transparent 1px, transparent 72px);
            animation-duration: 96s;
          }

          .bg-motes--far {
            display: block;
            opacity: 0.36;
            background-size: 112px 132px;
          }

          .bg-grid--near {
            display: block;
            opacity: 0.16;
            background-image:
              repeating-linear-gradient(45deg, rgba(143,29,44,0.035) 0px, rgba(143,29,44,0.035) 1px, transparent 1px, transparent 64px),
              repeating-linear-gradient(-45deg, rgba(217,75,96,0.03) 0px, rgba(217,75,96,0.03) 1px, transparent 1px, transparent 64px);
            animation-duration: 78s;
          }

          .bg-motes--near {
            display: block;
            opacity: 0.18;
            background-size: 88px 104px;
            animation-duration: 52s;
          }

          .bg-circuit {
            display: block;
            opacity: 0.32;
          }

          .bg-circuit line {
            stroke: rgba(143, 29, 44, 0.1);
            stroke-dasharray: 3 7;
            animation-duration: 4.8s;
          }

          .bg-node {
            display: block;
            width: 4px;
            height: 4px;
            opacity: 0.55;
          }

          .bg-pulse {
            display: block;
            width: 6px;
            height: 6px;
            box-shadow: 0 0 12px 4px currentColor;
          }

          .bg-pulse--3 {
            display: none;
          }

          .bg-blob {
            filter: blur(58px);
            opacity: 0.28;
          }

          .bg-blob--maroon {
            width: 260px;
            height: 260px;
            top: -70px;
            left: -80px;
          }

          .bg-blob--rose {
            width: 320px;
            height: 320px;
            right: -120px;
            bottom: 18%;
          }

          .bg-blob--gold {
            width: 220px;
            height: 220px;
            top: 48%;
            left: 18%;
            opacity: 0.18;
          }

          .bg-vignette {
            background: radial-gradient(circle at 50% 34%, transparent 56%, rgba(42,16,21,0.045) 100%);
          }
        }
      `}</style>

      <div className="bg-aura" />
      <div className="bg-grid--far" />
      <div className="bg-motes--far" />
      <div className="bg-grid--near" />
      <div className="bg-motes--near" />

      <div className="bg-blob bg-blob--maroon" />
      <div className="bg-blob bg-blob--rose" />
      <div className="bg-blob bg-blob--gold" />

      <svg className="bg-circuit" viewBox="0 0 100 100" preserveAspectRatio="none">
        {LINKS.map(([a, b], i) => (
          <line
            key={i}
            x1={NODES[a].left}
            y1={NODES[a].top}
            x2={NODES[b].left}
            y2={NODES[b].top}
            stroke="rgba(123,27,51,0.16)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {NODES.map((n, i) => (
        <div
          key={i}
          className="bg-node"
          style={{
            top: `${n.top}%`,
            left: `${n.left}%`,
            background: n.color,
            boxShadow: `0 0 6px 2px ${n.color}`,
            animationDelay: n.delay,
            animationDuration: n.dur,
          }}
        />
      ))}

      <div className="bg-pulse bg-pulse--1" />
      <div className="bg-pulse bg-pulse--2" />
      <div className="bg-pulse bg-pulse--3" />
      <div className="bg-vignette" />
    </div>
  );
}
