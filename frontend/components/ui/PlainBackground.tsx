/**
 * PlainBackground — CYBERPUNK'26
 *
 * A simple soft gradient background for mobile.
 * No grid, no particles, no circuit lines, no cursor tracking.
 * No hooks needed — safe to render from a server component.
 */
export function PlainBackground() {
  return (
    <div className="plain-bg" aria-hidden="true">
      <style>{`
        .plain-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background: linear-gradient(120deg, #fdf1f2 0%, #fbe3e7 35%, #fdece7 65%, #fdf1f2 100%);
          background-size: 200% 200%;
          animation: plainDrift 20s ease-in-out infinite;
        }

        @keyframes plainDrift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .plain-bg { animation: none; }
        }
      `}</style>
    </div>
  );
}
