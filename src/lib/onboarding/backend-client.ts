import { isAxiosError } from "axios";

import { apiClient, extractErrorMessage } from "@/lib/api-client";

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

// No Authorization header is attached here — this is called from the public, unauthenticated
// onboarding page, so there's no ZenRM session token to forward the way src/app/api/zenrm/route.ts
// does.
export async function fetchBackendClient(clientId: string): Promise<BackendClientRecord | null> {
  try {
    const { data } = await apiClient.get(`/client/${clientId}`);
    return data as BackendClientRecord;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw new Error(
      extractErrorMessage(isAxiosError(error) ? error.response?.data : undefined, "The ZenRM client request failed.", [
        "message",
        "error",
      ]),
    );
  }
}

// The backend responds to this PATCH with the new onboarding_data column value itself (the same
// shape as buildStepPatch's return value), not a full client record — merge it back onto a
// BackendClientRecord (e.g. the `current` fetched via fetchBackendClient) before passing it to
// toOnboardingRecord.
export async function patchBackendClient(
  clientId: string,
  patch: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  try {
    const { data } = await apiClient.patch(`/client/updateOnboardingData/${clientId}`, patch);
    return data as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      extractErrorMessage(isAxiosError(error) ? error.response?.data : undefined, "The ZenRM client request failed.", [
        "message",
        "error",
      ]),
    );
  }
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
  let data: unknown;

  try {
    const response = await apiClient.post("/salesforce/createEmbeddedAccountSession", {
      clientId,
      email,
      displayName,
      country: DEFAULT_COUNTRY,
      businessType: DEFAULT_BUSINESS_TYPE,
      currency: DEFAULT_CURRENCY,
    });
    data = response.data;
  } catch (error) {
    throw new Error(
      extractErrorMessage(isAxiosError(error) ? error.response?.data : undefined, "The ZenRM client request failed.", [
        "message",
        "error",
      ]),
    );
  }

  const { accountId, clientSecret } = data as { accountId?: string; clientSecret?: string };
  if (!accountId || !clientSecret) {
    throw new Error("Stripe account session response was missing required fields.");
  }

  return { accountId, clientSecret };
}
