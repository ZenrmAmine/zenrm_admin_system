"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import type { WizardStep, WizardStepStatus } from "./wizard-types";

interface WizardStepperProps {
  steps: WizardStep[];
  activeStepId: string;
  completedStepIds: string[];
  onStepClick: (stepId: string) => void;
}

function statusFor(
  steps: WizardStep[],
  index: number,
  activeStepId: string,
  completedStepIds: string[],
): WizardStepStatus {
  const step = steps[index];
  if (completedStepIds.includes(step.id)) return "completed";
  if (step.id === activeStepId) return "active";

  const priorStepsComplete = steps.slice(0, index).every((priorStep) => completedStepIds.includes(priorStep.id));
  return priorStepsComplete ? "upcoming" : "disabled";
}

const CHEVRON_CLIP = "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)";
const CHEVRON_CLIP_FIRST = "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)";
const CHEVRON_CLIP_LAST = "polygon(0 0, 100% 0, 100% 100%, 0 100%, 14px 50%)";

function chevronClipFor(isFirst: boolean, isLast: boolean): string {
  if (isFirst && isLast) return "none";
  if (isLast) return CHEVRON_CLIP_LAST;
  if (isFirst) return CHEVRON_CLIP_FIRST;
  return CHEVRON_CLIP;
}

export function WizardStepper({ steps, activeStepId, completedStepIds, onStepClick }: WizardStepperProps) {
  const activeIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === activeStepId),
  );
  const activeStep = steps[activeIndex];

  return (
    <>
      {/* Compact mobile pattern: the chevron tracker's clip-path shape doesn't survive at
          narrow widths (labels get squeezed to nothing), so below sm a "Step X of Y" label
          with a slim position indicator replaces it entirely rather than trying to shrink it. */}
      <div className="flex flex-col gap-2.5 rounded-xl bg-card p-5 shadow-sm ring-1 ring-foreground/10 sm:hidden">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{activeStep?.label}</span>
          <span className="shrink-0 text-muted-foreground">
            Step {activeIndex + 1} of {steps.length}
          </span>
        </div>
        <div className="flex gap-1.5">
          {steps.map((step, index) => {
            const status = statusFor(steps, index, activeStepId, completedStepIds);
            return (
              <span
                key={step.id}
                aria-hidden="true"
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors motion-safe:duration-500",
                  status === "completed" && "bg-teal-500",
                  (status === "active" || status === "upcoming") && "bg-purple-200 dark:bg-purple-900",
                  status === "disabled" && "bg-purple-200/60 dark:bg-purple-900/60",
                )}
              />
            );
          })}
        </div>
      </div>

      <nav
        aria-label="Onboarding steps"
        className="hidden w-full overflow-hidden rounded-xl shadow-sm ring-1 ring-foreground/10 sm:flex"
      >
        {steps.map((step, index) => {
          const status = statusFor(steps, index, activeStepId, completedStepIds);
          const isFirst = index === 0;
          const isLast = index === steps.length - 1;

          return (
            <button
              key={step.id}
              type="button"
              aria-current={status === "active" ? "step" : undefined}
              aria-disabled={status === "disabled"}
              disabled={status === "disabled"}
              onClick={() => onStepClick(step.id)}
              style={{ clipPath: chevronClipFor(isFirst, isLast) }}
              className={cn(
                "flex h-14 min-w-0 flex-1 items-center justify-center gap-2.5 px-6 text-sm font-medium transition-colors motion-safe:duration-200",
                !isFirst && "-ml-3.5",
                status === "completed" && "bg-teal-600 text-white hover:bg-teal-600/90",
                (status === "active" || status === "upcoming") &&
                  "cursor-pointer bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:hover:bg-purple-900",
                status === "disabled" &&
                  "pointer-events-none cursor-not-allowed bg-purple-100/60 text-purple-700/60 dark:bg-purple-950/60 dark:text-purple-300/60",
              )}
            >
              {status === "completed" ? (
                <Check className="size-5 shrink-0" />
              ) : (
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-purple-700/10 text-xs dark:bg-purple-300/10">
                  {index + 1}
                </span>
              )}
              <span className="min-w-0 truncate">{step.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
