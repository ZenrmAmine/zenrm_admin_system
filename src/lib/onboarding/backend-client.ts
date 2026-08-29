const BACKEND_BASE_URL = "https://test.zenrm.co";

export interface BackendClientRecord {
  name: string | null;
  client_id: string;
  onboarding_data: Record<string, unknown> | null;
  status: string | null;
  logo_url: string | null;
  brand_primary_color: string | null;
  brand_secondary_color: string | null;
  brand_accent_color: string | null;
  stripe_account_id: string | null;
  crm_provider: string | null;
}

function errorMessageFrom(parsed: unknown, text: string): string {
  if (typeof parsed === "object" && parsed && "message" in parsed) {
    return String((parsed as { message?: string }).message);
  }
  if (typeof parsed === "object" && parsed && "error" in parsed) {
    return String((parsed as { error?: string }).error);
  }
  return text || "The ZenRM client request failed.";
}

async function parseJsonBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

// No Authorization header is attached here — this is called from the public, unauthenticated
// onboarding page, so there's no ZenRM session token to forward the way src/app/api/zenrm/route.ts
// does.
export async function fetchBackendClient(clientId: string): Promise<BackendClientRecord | null> {
  const response = await fetch(`${BACKEND_BASE_URL}/client/${clientId}`);

  if (response.status === 404) {
    return null;
  }

  const parsed = await parseJsonBody(response);

  if (!response.ok) {
    throw new Error(errorMessageFrom(parsed, ""));
  }

  return parsed as BackendClientRecord;
}

export async function patchBackendClient(
  clientId: string,
  patch: Record<string, unknown>,
): Promise<BackendClientRecord> {
  const response = await fetch(`${BACKEND_BASE_URL}/client/updateOnboardingData/${clientId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });

  const parsed = await parseJsonBody(response);

  if (!response.ok) {
    throw new Error(errorMessageFrom(parsed, ""));
  }

  return parsed as BackendClientRecord;
}

export interface StripeSessionResult {
  accountId: string;
  clientSecret: string;
}

// Country/business type/currency are fixed rather than collected from the client: country is
// immutable once an account is created, and Stripe's own embedded onboarding UI is the system of
// record for the rest — it will ask the account holder to confirm/correct these as needed rather
// than us front-loading a picker for data we don't otherwise track.
const DEFAULT_COUNTRY = "US";
const DEFAULT_BUSINESS_TYPE = "individual";
const DEFAULT_CURRENCY = "usd";

// Same unauthenticated-browser-call pattern as fetchBackendClient/patchBackendClient above.
export async function createEmbeddedAccountSession(
  clientId: string,
  email: string,
  displayName: string,
): Promise<StripeSessionResult> {
  const response = await fetch(`${BACKEND_BASE_URL}/salesforce/createEmbeddedAccountSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId,
      email,
      displayName,
      country: DEFAULT_COUNTRY,
      businessType: DEFAULT_BUSINESS_TYPE,
      currency: DEFAULT_CURRENCY,
    }),
  });

  const parsed = await parseJsonBody(response);

  if (!response.ok) {
    throw new Error(errorMessageFrom(parsed, ""));
  }

  const { accountId, clientSecret } = parsed as { accountId?: string; clientSecret?: string };
  if (!accountId || !clientSecret) {
    throw new Error("Stripe account session response was missing required fields.");
  }

  return { accountId, clientSecret };
}
