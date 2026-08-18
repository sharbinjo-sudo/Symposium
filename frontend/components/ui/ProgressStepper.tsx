"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

type ProgressStepperProps = {
  steps: string[];
  activeStep: number;
  onStepClick?: (step: number) => void;
};

export function ProgressStepper({ steps, activeStep, onStepClick }: ProgressStepperProps) {
  return (
    <div className="progress-stepper" role="tablist" aria-label="Registration progress">
      {steps.map((step, index) => {
        const status = index === activeStep ? "active" : index < activeStep ? "complete" : "upcoming";
        const canOpenStep = index <= activeStep;
        const statusLabel = status === "active" ? "Now" : status === "complete" ? "Done" : "Upcoming";

        return (
          <button
            key={step}
            type="button"
            role="tab"
            aria-selected={index === activeStep}
            aria-disabled={!canOpenStep}
            aria-label={`${step} step, ${statusLabel}`}
            tabIndex={canOpenStep ? 0 : -1}
            className={cn("progress-step", `progress-step-${status}`)}
            onClick={() => {
              if (canOpenStep && onStepClick) {
                onStepClick(index);
              }
            }}
          >
            <span className="progress-step-meta">
              <span className="progress-step-index">0{index + 1}</span>
              <span className="progress-step-state">{statusLabel}</span>
            </span>
            <span className="progress-step-label">{step}</span>
            {index === activeStep ? <motion.span layoutId="step-indicator" className="progress-step-highlight" /> : null}
          </button>
        );
      })}
    </div>
  );
}
