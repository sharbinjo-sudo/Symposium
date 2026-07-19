"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

type AnimatedHeadingProps = {
  eyebrow?: string;
  title: string | string[];
  copy?: ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2" | "h3";
};

export function AnimatedHeading({ eyebrow, title, copy, align = "left", as = "h2" }: AnimatedHeadingProps) {
  const lines = Array.isArray(title) ? title : [title];
  const reducedMotion = useReducedMotion();
  const HeadingTag = as;

  return (
    <div className={`section-title section-title-${align}`}>
      {eyebrow ? (
        <motion.div
          className="section-eyebrow"
          initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.4 }}
        >
          {eyebrow}
        </motion.div>
      ) : null}

      <div className="heading-stack" aria-label={lines.join(" ")}>
        {lines.map((line, index) => (
          <motion.div
            key={line}
            className={`section-heading heading-as-${as}`}
            initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.56, delay: index * 0.08 }}
          >
            <HeadingTag>{line}</HeadingTag>
          </motion.div>
        ))}
      </div>

      {copy ? <p className="section-copy">{copy}</p> : null}
    </div>
  );
}
