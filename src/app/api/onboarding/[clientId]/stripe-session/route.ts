import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp } from "@/lib/onboarding/rate-limit";
import { onboardingStore } from "@/lib/onboarding/store";
import { isUuid } from "@/lib/onboarding/uuid";

const NOT_FOUND_RESPONSE = { error: "Onboarding link is invalid or has expired." } as const;

function errorMessageFrom(parsed: unknown, text: string): string {
  if (typeof parsed === "object" && parsed && "message" in parsed) {
    return String((parsed as { message?: string }).message);
  }
  if (typeof parsed === "object" && parsed && "error" in parsed) {
    return String((parsed as { error?: string }).error);
  }
  return text || "The Stripe account session request failed.";
}

interface StripeSessionRequestBody {
  email?: string;
  displayName?: string;
}

// Country/business type/currency are fixed rather than collected from the client: country is
// immutable once an account is created, and Stripe's own embedded onboarding UI is the system of
// record for the rest — it will ask the account holder to confirm/correct these as needed rather
// than us front-loading a picker for data we don't otherwise track.
const DEFAULT_COUNTRY = "US";
const DEFAULT_BUSINESS_TYPE = "individual";
const DEFAULT_CURRENCY = "usd";

// No Authorization header is attached here — this route is reachable from the public,
// unauthenticated onboarding page, so there's no ZenRM session token to forward the way
// src/app/api/zenrm/route.ts does. If the backend actually requires a server-to-server
// credential, this call will fail at runtime until one is added.
export async function POST(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
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

  const body = (await request.json()) as StripeSessionRequestBody;
  if (!body.email || !body.displayName) {
    return NextResponse.json({ error: "Missing required fields for Stripe account creation." }, { status: 400 });
  }

  let response: Response;

  try {
    response = await fetch("https://test.zenrm.co/salesforce/createEmbeddedAccountSession", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        email: body.email,
        displayName: body.displayName,
        country: DEFAULT_COUNTRY,
        businessType: DEFAULT_BUSINESS_TYPE,
        currency: DEFAULT_CURRENCY,
      }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to reach the Stripe account session service.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }

  const text = await response.text();
  let parsed: unknown = {};

  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }
  }

  if (!response.ok) {
    return NextResponse.json(
      {
        error: errorMessageFrom(parsed, text),
        details: parsed,
      },
      { status: response.status || 500 },
    );
  }

  const { accountId, clientSecret } = parsed as { accountId?: string; clientSecret?: string };
  if (!accountId || !clientSecret) {
    return NextResponse.json(
      { error: "Stripe account session response was missing required fields.", details: parsed },
      { status: 502 },
    );
  }

  await onboardingStore.setStripeAccountId(clientId, accountId);

  return NextResponse.json({ accountId, clientSecret });
}
