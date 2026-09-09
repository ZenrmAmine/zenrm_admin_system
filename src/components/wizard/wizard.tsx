"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldValues } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import { WizardPersonaPanel } from "./wizard-persona-panel";
import { WizardStepper } from "./wizard-stepper";
import type { WizardProps, WizardStep } from "./wizard-types";

interface WizardStepFormProps {
  step: WizardStep;
  isFirstStep: boolean;
  isLastStep: boolean;
  onBack: () => void;
  onNext: (data: unknown) => Promise<void>;
}

function submitLabel(isSubmitting: boolean, isLastStep: boolean): string {
  if (isSubmitting) return "Saving...";
  return isLastStep ? "Finish" : "Next";
}

// Each step gets its own react-hook-form instance, remounted (via the `key` prop where this is
// rendered) whenever the active step changes — this keeps each step's schema/defaultValues/
// field-array state fully isolated, matching the "save this step's fields only, on Next" contract.
function WizardStepForm({ step, isFirstStep, isLastStep, onBack, onNext }: WizardStepFormProps) {
  const form = useForm<FieldValues>({
    resolver: zodResolver(step.schema),
    defaultValues: step.defaultValues,
  });

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(async (data) => {
        await onNext(data);
      })}
      className="flex flex-col gap-6"
    >
      {step.render({ form })}
      <div className="sticky bottom-0 -mx-6 -mb-6 flex items-center justify-between gap-3 border-t bg-card/95 px-6 py-5 backdrop-blur supports-[backdrop-filter]:bg-card/85 md:static md:mx-0 md:mb-0 md:bg-transparent md:px-0 md:pb-0 md:backdrop-blur-none">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isFirstStep}
          className="h-11 min-w-24 md:h-9"
        >
          Back
        </Button>
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className={cn("h-11 min-w-24 md:h-9 bg-teal-600 text-white hover:bg-teal-600/90")}
        >
          {form.formState.isSubmitting && <Spinner className="size-4" />}
          {submitLabel(form.formState.isSubmitting, isLastStep)}
        </Button>
      </div>
    </form>
  );
}

export function Wizard({
  steps,
  personaName,
  progress,
  initialStepId,
  completedStepIds,
  onSaveStep,
  onComplete,
}: WizardProps) {
  const [activeStepId, setActiveStepId] = useState(initialStepId ?? steps[0]?.id);
  const activeIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === activeStepId),
  );
  const activeStep = steps[activeIndex];

  async function handleNext(data: unknown) {
    const result = await onSaveStep(activeStep.id, data);
    if (!result.ok) {
      toast.error(result.error ?? "Unable to save this step. Please try again.");
      return;
    }

    const nextStep = steps[activeIndex + 1];
    if (nextStep) {
      setActiveStepId(nextStep.id);
    } else if (onComplete) {
      onComplete();
    } else {
      toast.success("Onboarding complete.");
    }
  }

  function handleBack() {
    const previousStep = steps[activeIndex - 1];
    if (previousStep) {
      setActiveStepId(previousStep.id);
    }
  }

  function handleStepClick(stepId: string) {
    const targetIndex = steps.findIndex((step) => step.id === stepId);
    const reachable = steps.slice(0, targetIndex).every((step) => completedStepIds.includes(step.id));
    if (reachable || completedStepIds.includes(stepId) || stepId === activeStepId) {
      setActiveStepId(stepId);
    }
  }

  if (!activeStep) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[300px_1fr] md:gap-8">
      <WizardPersonaPanel personaName={personaName} progress={progress} />
      <div className="flex min-w-0 flex-col gap-5">
        <WizardStepper
          steps={steps}
          activeStepId={activeStep.id}
          completedStepIds={completedStepIds}
          onStepClick={handleStepClick}
        />
        <Card
          key={activeStep.id}
          className="[--card-spacing:--spacing(6)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300"
        >
          <CardHeader className="gap-2 border-b">
            <CardTitle className="text-xl">{activeStep.label}</CardTitle>
            {activeStep.description && <CardDescription>{activeStep.description}</CardDescription>}
          </CardHeader>
          <CardContent>
            <WizardStepForm
              step={activeStep}
              isFirstStep={activeIndex === 0}
              isLastStep={activeIndex === steps.length - 1}
              onBack={handleBack}
              onNext={handleNext}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
