import type { BackendClientRecord } from "@/lib/onboarding/backend-client";
import { computeProgress, isStepDataComplete } from "@/lib/onboarding/progress";
import type {
  BankingStepInput,
  ClientInformationInput,
  OrganizationIdentityInput,
  UsersStepInput,
} from "@/lib/onboarding/schemas";
import type {
  AdditionalUserData,
  BankingLegalData,
  ClientInformationData,
  OnboardingRecord,
  OnboardingStepId,
  OrganizationIdentityData,
  UserProfile,
} from "@/lib/onboarding/types";

type StepInput = {
  "client-information": ClientInformationInput;
  "organization-identity": OrganizationIdentityInput;
  users: UsersStepInput;
  "banking-legal": BankingStepInput;
};

const USER_PROFILES: UserProfile[] = ["admin", "employee", "guest"];

/**
 * `PATCH /client/updateOnboardingData/<clientId>` does not map request fields onto dedicated
 * backend columns — whatever body we send becomes the new value of the `onboarding_data` column
 * verbatim, and the other top-level columns (`name`, `logo_url`, `brand_primary_color`,
 * `brand_secondary_color`, `stripe_account_id`) are left untouched by it. So the patch body must be
 * sent flat, not wrapped under an `onboarding_data` key — wrapping it would make the column's value
 * become `{ onboarding_data: {...} }` instead of `{...}`, nesting one level deeper on every save.
 * Top-level columns are only ever *read*, as a fallback for a client that hasn't been through
 * onboarding yet.
 *
 * This module is deliberately secret-free and Node-API-free — it's imported both by server code
 * (`store.ts`) and directly by client components that call the backend from the browser.
 */
function readObject(onboardingData: Record<string, unknown> | null, key: string): Record<string, unknown> {
  const value = onboardingData?.[key];
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

const MAX_UNWRAP_DEPTH = 5;

// Some existing clients were saved by older code that (unknowingly) hit the backend behavior
// described above, leaving their `onboarding_data` containing a nested `onboarding_data` key one
// or more levels deep. Current writes never produce that key, so this is purely a read-side repair
// for that stale data — unwrapping here means the next save of any step (which uses this same
// unwrapped result as its merge base) flattens it for good.
function unwrapOnboardingData(raw: Record<string, unknown> | null): Record<string, unknown> | null {
  let data = raw;
  for (let i = 0; i < MAX_UNWRAP_DEPTH; i++) {
    const nested = data?.onboarding_data;
    if (typeof nested !== "object" || nested === null || Array.isArray(nested)) break;
    data = nested as Record<string, unknown>;
  }
  return data;
}

function readClientInformation(
  backend: BackendClientRecord,
  onboardingData: Record<string, unknown> | null,
): ClientInformationData {
  const data = readObject(onboardingData, "clientInformation");

  return {
    organizationName: stringField(data.organizationName) ?? backend.name ?? undefined,
    einNumber: stringField(data.einNumber),
    adminName: stringField(data.adminName),
    adminEmail: stringField(data.adminEmail),
    passwordIsSet: data.passwordIsSet === true,
  };
}

function readOrganizationIdentity(
  backend: BackendClientRecord,
  onboardingData: Record<string, unknown> | null,
): OrganizationIdentityData {
  const data = readObject(onboardingData, "organizationIdentity");

  // Legacy fallback: older code PATCHed these under the real backend column names (`logo_url`,
  // `brand_primary_color`, `brand_secondary_color`) directly, which — per the note above — landed
  // as flat keys on `onboardingData` itself rather than under `organizationIdentity`.
  return {
    logoUrl: stringField(data.logoUrl) ?? stringField(onboardingData?.logo_url) ?? backend.logo_url ?? undefined,
    mainColor:
      stringField(data.mainColor) ??
      stringField(onboardingData?.brand_primary_color) ??
      backend.brand_primary_color ??
      undefined,
    secondaryColor:
      stringField(data.secondaryColor) ??
      stringField(onboardingData?.brand_secondary_color) ??
      backend.brand_secondary_color ??
      undefined,
  };
}

function readUsers(onboardingData: Record<string, unknown> | null): AdditionalUserData[] {
  const value = onboardingData?.users;
  if (!Array.isArray(value)) return [];

  const users: AdditionalUserData[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as Record<string, unknown>;
    const id = stringField(record.id);
    if (!id) continue;

    users.push({
      id,
      name: stringField(record.name),
      email: stringField(record.email),
      profile: USER_PROFILES.includes(record.profile as UserProfile) ? (record.profile as UserProfile) : undefined,
      expirationDate: stringField(record.expirationDate),
      passwordIsSet: record.passwordIsSet === true,
    });
  }

  return users;
}

function readBankingLegal(
  backend: BackendClientRecord,
  onboardingData: Record<string, unknown> | null,
): BankingLegalData {
  const data = readObject(onboardingData, "bankingLegal");

  return {
    provider: "stripe",
    connected: data.connected === true,
    stripeAccountId: stringField(data.stripeAccountId) ?? backend.stripe_account_id ?? undefined,
    clientSecret: stringField(data.clientSecret),
  };
}

export function toOnboardingRecord(backend: BackendClientRecord): OnboardingRecord {
  const now = new Date().toISOString();
  const onboardingData = unwrapOnboardingData(backend.onboarding_data ?? null);

  const record: OnboardingRecord = {
    clientId: backend.client_id,
    createdAt: now,
    updatedAt: now,
    progress: 0,
    steps: {
      "client-information": { data: readClientInformation(backend, onboardingData), completed: false },
      "organization-identity": { data: readOrganizationIdentity(backend, onboardingData), completed: false },
      users: { data: { users: readUsers(onboardingData) }, completed: false },
      "banking-legal": { data: readBankingLegal(backend, onboardingData), completed: false },
    },
  };

  for (const stepId of Object.keys(record.steps) as OnboardingStepId[]) {
    record.steps[stepId].completed = isStepDataComplete(stepId, record);
  }
  record.progress = computeProgress(record);

  return record;
}

/**
 * Builds the flat patch body for one step's save (becomes the new `onboarding_data` column value
 * verbatim — see the note above on why it must not be wrapped under an `onboarding_data` key).
 * Raw passwords are never included — there is no credential/auth-provisioning endpoint yet, so only
 * the derived `passwordIsSet` boolean is persisted, carried forward from whatever is already stored
 * on `current` when the step is saved again without a new password.
 */
export function buildStepPatch(
  stepId: OnboardingStepId,
  data: unknown,
  current: BackendClientRecord,
): Record<string, unknown> {
  const currentData = unwrapOnboardingData(current.onboarding_data ?? null);
  const onboardingData = { ...(currentData ?? {}) };
  // Guard against ever re-sending a nested `onboarding_data` key — see the note above on why the
  // backend PATCH endpoint must never receive one, even if `currentData` had one that
  // unwrapOnboardingData's object check couldn't strip (e.g. a non-object value there).
  delete onboardingData.onboarding_data;

  switch (stepId) {
    case "client-information": {
      const input = data as StepInput["client-information"];
      const { password, confirmPassword: _confirmPassword, ...rest } = input;
      const existing = readClientInformation(current, currentData);
      onboardingData.clientInformation = {
        ...rest,
        passwordIsSet: !!password || existing.passwordIsSet,
      };
      break;
    }
    case "organization-identity": {
      const input = data as StepInput["organization-identity"];
      onboardingData.organizationIdentity = {
        logoUrl: input.logoUrl || undefined,
        mainColor: input.mainColor,
        secondaryColor: input.secondaryColor,
      };
      break;
    }
    case "users": {
      const input = data as StepInput["users"];
      const existingPasswordFlags = new Map(readUsers(currentData).map((user) => [user.id, user.passwordIsSet]));
      onboardingData.users = input.users.map((user) => {
        const { password, ...rest } = user;
        return { ...rest, passwordIsSet: !!password || existingPasswordFlags.get(user.id) === true };
      });
      break;
    }
    case "banking-legal": {
      const input = data as StepInput["banking-legal"];
      const existing = readBankingLegal(current, currentData);
      onboardingData.bankingLegal = {
        connected: input.connected,
        stripeAccountId: existing.stripeAccountId,
        clientSecret: existing.clientSecret,
      };
      break;
    }
  }

  return onboardingData;
}

// Persists the result of createEmbeddedAccountSession so a returning client's fetchClientSecret
// can reuse the cached clientSecret (see banking-step.tsx) instead of creating a new Stripe session.
export function buildStripeSessionPatch(
  accountId: string,
  clientSecret: string,
  current: BackendClientRecord,
): Record<string, unknown> {
  const currentData = unwrapOnboardingData(current.onboarding_data ?? null);
  const onboardingData = { ...(currentData ?? {}) };
  delete onboardingData.onboarding_data;
  const existing = readBankingLegal(current, currentData);
  onboardingData.bankingLegal = { connected: existing.connected, stripeAccountId: accountId, clientSecret };
  return onboardingData;
}
