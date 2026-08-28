import { NextResponse } from "next/server";

import { onboardingStore } from "@/lib/onboarding/store";

// Creates a fresh, empty onboarding record and returns its clientId (the link to hand the
// client). Unauthenticated for now — this stands in for a future admin "invite client" action;
// there is no admin session model in this app yet to gate it behind.
export async function POST() {
  const record = await onboardingStore.create();

  return NextResponse.json({ clientId: record.clientId, record });
}
