"use client";

import { WaterRippleCard } from "@/components/ui/WaterRippleCard";

type PrizeCardProps = {
  title: string;
  prizes: string[];
  details: string;
  featured?: boolean;
};

export function PrizeCard({ title, prizes, details, featured = false }: PrizeCardProps) {
  return (
    <WaterRippleCard className={`prize-card${featured ? " prize-card-featured" : ""}`}>
      <div className="prize-card-header">
        <span className="section-eyebrow">Podium format</span>
        <h4>{title}</h4>
        <p className="card-copy">{details}</p>
      </div>
      <div className="prize-podium">
        <div className="prize-podium-slot">
          <span>Second</span>
          <strong>Rs. 500</strong>
        </div>
        <div className="prize-podium-slot prize-podium-slot-main">
          <span>First</span>
          <strong>Rs. 1,000</strong>
        </div>
        <div className="prize-podium-slot">
          <span>Third</span>
          <strong>Certificate</strong>
        </div>
      </div>
      <ul className="rule-list">
        {prizes.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </WaterRippleCard>
  );
}
