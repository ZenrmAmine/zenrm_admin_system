import type {
  AdditionalUserData,
  BankingLegalData,
  ClientInformationData,
  OnboardingRecord,
  OnboardingStepId,
  OrganizationIdentityData,
  UsersStepData,
} from "@/lib/onboarding/types";

function clientInformationRatio(data: ClientInformationData): number {
  const required = [data.organizationName, data.einNumber, data.adminName, data.adminEmail];
  const filled = required.filter((value) => !!value).length + (data.passwordIsSet ? 1 : 0);

  return filled / (required.length + 1);
}

function organizationIdentityRatio(data: OrganizationIdentityData): number {
  const required = [data.mainColor, data.secondaryColor];
  const filled = required.filter((value) => !!value).length;

  return filled / required.length;
}

function additionalUserRatio(user: AdditionalUserData): number {
  const required = [user.name, user.email, user.profile];
  if (user.profile === "guest") {
    required.push(user.expirationDate);
  }
  const filled = required.filter((value) => !!value).length + (user.passwordIsSet ? 1 : 0);

  return filled / (required.length + 1);
}

// Users is a repeatable, optional step (zero additional users is a valid, complete state), so it
// can't contribute a fixed number of required-field "slots" to the global count the way the other
// steps do. It's treated as its own 0-1 ratio: fully satisfied when empty, otherwise the average
// completeness across the rows the client has actually added.
function usersRatio(data: UsersStepData): number {
  if (data.users.length === 0) {
    return 1;
  }

  return data.users.reduce((sum, user) => sum + additionalUserRatio(user), 0) / data.users.length;
}

function bankingRatio(data: BankingLegalData): number {
  return data.connected ? 1 : 0;
}

export function stepRatio(stepId: OnboardingStepId, record: OnboardingRecord): number {
  switch (stepId) {
    case "client-information":
      return clientInformationRatio(record.steps["client-information"].data);
    case "organization-identity":
      return organizationIdentityRatio(record.steps["organization-identity"].data);
    case "users":
      return usersRatio(record.steps.users.data);
    case "banking-legal":
      return bankingRatio(record.steps["banking-legal"].data);
    default:
      return 0;
  }
}

export const STEP_ORDER: OnboardingStepId[] = ["client-information", "organization-identity", "users", "banking-legal"];

// Each step is weighted equally (25%) toward overall progress, since the repeatable Users step
// has no fixed required-field count to fold into a single flat field tally across all steps.
export function computeProgress(record: OnboardingRecord): number {
  const total = STEP_ORDER.reduce((sum, stepId) => sum + stepRatio(stepId, record), 0);

  return Math.round((total / STEP_ORDER.length) * 100);
}

export function isStepDataComplete(stepId: OnboardingStepId, record: OnboardingRecord): boolean {
  return stepRatio(stepId, record) === 1;
}
