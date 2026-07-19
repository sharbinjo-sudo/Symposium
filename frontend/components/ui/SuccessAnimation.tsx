"use client";

import { motion, useReducedMotion } from "framer-motion";

type SuccessAnimationProps = {
  registrationCode: string;
};

export function SuccessAnimation({ registrationCode }: SuccessAnimationProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="success-lockup" aria-hidden="true">
      <motion.div
        className="success-ring"
        initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.76 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      />
      <svg className="success-mark" viewBox="0 0 120 120">
        <motion.circle
          cx="60"
          cy="60"
          r="48"
          fill="none"
          stroke="url(#successGradient)"
          strokeWidth="4"
          initial={{ pathLength: reducedMotion ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        <motion.path
          d="M42 62L55 75L82 47"
          fill="none"
          stroke="#EFF6FF"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: reducedMotion ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.34, delay: 0.3, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="successGradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
      </svg>
      <motion.div
        className="success-code"
        initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.45 }}
      >
        {registrationCode}
      </motion.div>
    </div>
  );
}
