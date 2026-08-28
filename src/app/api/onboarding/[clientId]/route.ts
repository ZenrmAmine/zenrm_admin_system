import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp } from "@/lib/onboarding/rate-limit";
import { onboardingStore } from "@/lib/onboarding/store";
import { isUuid } from "@/lib/onboarding/uuid";

// Same generic error, same status, for a malformed clientId and a well-formed-but-unknown one —
// callers must not be able to tell whether a given ID is invalid or simply doesn't exist.
const NOT_FOUND_RESPONSE = { error: "Onboarding link is invalid or has expired." } as const;

export async function GET(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;

  if (!checkRateLimit(clientId, getClientIp(request))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  if (!isUuid(clientId)) {
    return NextResponse.json(NOT_FOUND_RESPONSE, { status: 404 });
  }

  const record = await onboardingStore.get(clientId);
  if (!record) {
    return NextResponse.json(NOT_FOUND_RESPONSE, { status: 404 });
  }

  return NextResponse.json({ record });
}
