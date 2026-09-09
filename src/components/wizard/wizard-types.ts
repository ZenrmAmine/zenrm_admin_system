import type { ReactNode } from "react";

import type { FieldValues, UseFormReturn } from "react-hook-form";
import type { ZodType } from "zod";

export type WizardStepStatus = "completed" | "active" | "upcoming" | "disabled";

export interface WizardStepRenderProps<TFormValues extends FieldValues> {
  form: UseFormReturn<TFormValues>;
}

export interface WizardStep<TFormValues extends FieldValues = FieldValues> {
  id: string;
  label: string;
  description?: string;
  schema: ZodType<TFormValues, TFormValues>;
  defaultValues: TFormValues;
  render: (props: WizardStepRenderProps<TFormValues>) => ReactNode;
}

export interface WizardSaveResult {
  ok: boolean;
  error?: string;
}

export interface WizardProps {
  steps: WizardStep[];
  personaName: string;
  progress: number;
  initialStepId?: string;
  completedStepIds: string[];
  onSaveStep: (stepId: string, data: unknown) => Promise<WizardSaveResult>;
  onComplete?: () => void;
}
