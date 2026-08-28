import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp } from "@/lib/onboarding/rate-limit";
import { schemaForStep } from "@/lib/onboarding/schemas";
import { onboardingStore } from "@/lib/onboarding/store";
import type { OnboardingStepId } from "@/lib/onboarding/types";

const NOT_FOUND_RESPONSE = { error: "Onboarding link is invalid or has expired." } as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;

  if (!checkRateLimit(clientId, getClientIp(request))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const body = (await request.json()) as { stepId?: string; data?: unknown };

  const schema = body.stepId ? schemaForStep(body.stepId) : undefined;
  if (!schema) {
    return NextResponse.json({ error: "Unknown onboarding step." }, { status: 400 });
  }

  const parsed = schema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed.", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await onboardingStore.get(clientId);
  if (!existing) {
    return NextResponse.json(NOT_FOUND_RESPONSE, { status: 404 });
  }

  const record = await onboardingStore.upsertStep(clientId, body.stepId as OnboardingStepId, parsed.data);

  return NextResponse.json({ record });
}
