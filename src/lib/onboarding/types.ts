export type OnboardingStepId = "client-information" | "organization-identity" | "users" | "banking-legal";

export interface ClientInformationData {
  organizationName?: string;
  einNumber?: string;
  adminName?: string;
  adminEmail?: string;
  passwordIsSet: boolean;
}

export interface OrganizationIdentityData {
  logoUrl?: string;
  mainColor?: string;
  secondaryColor?: string;
}

export type UserProfile = "admin" | "employee" | "guest";

export interface AdditionalUserData {
  id: string;
  name?: string;
  email?: string;
  profile?: UserProfile;
  expirationDate?: string;
  passwordIsSet: boolean;
}

export interface UsersStepData {
  users: AdditionalUserData[];
}

export interface BankingLegalData {
  provider: "stripe";
  connected: boolean;
  accountHolderName?: string;
}

export interface OnboardingRecord {
  clientId: string;
  createdAt: string;
  updatedAt: string;
  progress: number;
  steps: {
    "client-information": { data: ClientInformationData; completed: boolean };
    "organization-identity": { data: OrganizationIdentityData; completed: boolean };
    users: { data: UsersStepData; completed: boolean };
    "banking-legal": { data: BankingLegalData; completed: boolean };
  };
}
