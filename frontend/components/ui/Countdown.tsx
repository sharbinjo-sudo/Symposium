"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GlassPanel } from "@/components/ui/GlassPanel";

type CountdownProps = {
  eventDate: string;
};

function getCountdown(eventDate: string) {
  const target = new Date(eventDate).getTime();
  const difference = Math.max(target - Date.now(), 0);

  return {
    closed: difference <= 0,
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60)
  };
}

export function Countdown({ eventDate }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    closed: false,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTimeLeft(getCountdown(eventDate));
    setReady(true);

    const timer = setInterval(() => {
      setTimeLeft(getCountdown(eventDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [eventDate]);

  if (ready && timeLeft.closed) {
    return (
      <GlassPanel className="countdown-closed-card" tone="strong">
        <div className="section-eyebrow">Registration status</div>
        <h3>Registration closed</h3>
        <p className="section-copy">The deadline has passed. Backend enforcement should also keep new submissions closed.</p>
      </GlassPanel>
    );
  }

  return (
    <div className="countdown-grid" aria-live="polite">
      {Object.entries(timeLeft)
        .filter(([label]) => label !== "closed")
        .map(([label, value]) => (
        <GlassPanel key={label} className="countdown-block" tone="soft">
          <motion.strong
            key={`${label}-${value}`}
            initial={{ opacity: 0.45, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            {String(value).padStart(2, "0")}
          </motion.strong>
          <span>{label}</span>
        </GlassPanel>
      ))}
    </div>
  );
}
