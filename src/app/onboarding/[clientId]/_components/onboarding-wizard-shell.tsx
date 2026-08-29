"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wizard } from "@/components/wizard/wizard";
import type { WizardSaveResult } from "@/components/wizard/wizard-types";
import { fetchBackendClient, patchBackendClient } from "@/lib/onboarding/backend-client";
import { buildStepPatch, toOnboardingRecord } from "@/lib/onboarding/backend-mapping";
import { STEP_ORDER } from "@/lib/onboarding/progress";
import type { OnboardingRecord, OnboardingStepId } from "@/lib/onboarding/types";

import { OnboardingError } from "./onboarding-error";
import { buildOnboardingSteps } from "./steps";

interface OnboardingWizardShellProps {
  clientId: string;
}

export function OnboardingWizardShell({ clientId }: OnboardingWizardShellProps) {
  const [record, setRecord] = useState<OnboardingRecord | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    let cancelled = false;

    fetchBackendClient(clientId)
      .then((backend) => {
        if (cancelled) return;
        if (!backend) {
          setStatus("error");
          return;
        }
        setRecord(toOnboardingRecord(backend));
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (status === "loading") {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[300px_1fr] md:gap-8" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading your onboarding progress…</span>
        <div className="hidden flex-col gap-8 self-start rounded-xl bg-card p-7 shadow-sm ring-1 ring-foreground/10 md:flex">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="size-20 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3.5 w-20" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-1 w-full rounded-full" />
          </div>
        </div>
        <Skeleton className="h-16 rounded-xl md:hidden" />

        <div className="flex min-w-0 flex-col gap-5">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Card className="[--card-spacing:--spacing(6)]">
            <CardHeader className="gap-2 border-b">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-64" />
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (status === "error" || !record) {
    return <OnboardingError />;
  }

  const completedStepIds = STEP_ORDER.filter((stepId) => record.steps[stepId].completed);
  const initialStepId =
    STEP_ORDER.find((stepId) => !record.steps[stepId].completed) ?? STEP_ORDER[STEP_ORDER.length - 1];
  const personaName = record.steps["client-information"].data.adminName || "New client";

  async function handleSaveStep(stepId: string, data: unknown): Promise<WizardSaveResult> {
    try {
      const current = await fetchBackendClient(clientId);
      if (!current) {
        return { ok: false, error: "Onboarding link is invalid or has expired." };
      }

      const updated = await patchBackendClient(clientId, buildStepPatch(stepId as OnboardingStepId, data, current));
      setRecord(toOnboardingRecord(updated));
      return { ok: true };
    } catch {
      return { ok: false, error: "Unable to save this step." };
    }
  }

  return (
    <Wizard
      steps={buildOnboardingSteps(record, clientId)}
      personaName={personaName}
      progress={record.progress}
      initialStepId={initialStepId}
      completedStepIds={completedStepIds}
      onSaveStep={handleSaveStep}
    />
  );
}
