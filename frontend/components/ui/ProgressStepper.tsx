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

        return (
          <button
            key={step}
            type="button"
            role="tab"
            aria-selected={index === activeStep}
            className={cn("progress-step", `progress-step-${status}`)}
            onClick={() => {
              if (index <= activeStep && onStepClick) {
                onStepClick(index);
              }
            }}
          >
            <span className="progress-step-index">0{index + 1}</span>
            <span className="progress-step-label">{step}</span>
            {index === activeStep ? <motion.span layoutId="step-indicator" className="progress-step-highlight" /> : null}
          </button>
        );
      })}
    </div>
  );
}

