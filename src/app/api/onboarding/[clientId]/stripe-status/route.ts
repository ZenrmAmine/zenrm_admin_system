import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp } from "@/lib/onboarding/rate-limit";
import { onboardingStore } from "@/lib/onboarding/store";
import { isUuid } from "@/lib/onboarding/uuid";

const NOT_FOUND_RESPONSE = { error: "Onboarding link is invalid or has expired." } as const;

interface StripeAccount {
  details_submitted?: boolean;
  requirements?: { currently_due?: string[] };
}

// Calls Stripe's own Accounts API directly (not the ZenRM backend) since Stripe is the system of
// record for this step's data — there is no separate requirements-check endpoint to proxy.
// STRIPE_SECRET_KEY is server-only (never NEXT_PUBLIC_-prefixed) and must never reach the browser.
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

  const stripeAccountId = record.steps["banking-legal"].data.stripeAccountId;
  if (!stripeAccountId) {
    return NextResponse.json({ hasAccount: false, complete: false });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "Stripe is not configured for this environment." }, { status: 500 });
  }

  let response: Response;
  try {
    response = await fetch(`https://api.stripe.com/v1/accounts/${stripeAccountId}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to reach Stripe to check the account's status.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }

  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    return NextResponse.json({ error: "Unable to check the Stripe account's status.", details }, { status: 502 });
  }

  const account = (await response.json()) as StripeAccount;
  const currentlyDue = account.requirements?.currently_due ?? [];
  const complete = currentlyDue.length === 0 && account.details_submitted === true;

  if (complete) {
    await onboardingStore.upsertStep(clientId, "banking-legal", { provider: "stripe", connected: true });
  }

  return NextResponse.json({ hasAccount: true, complete, currentlyDue, detailsSubmitted: !!account.details_submitted });
}
