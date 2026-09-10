export interface OnboardingUser {
  id: string;
  name: string;
  email: string;
  profile: string;
  expirationDate: string;
  passwordIsSet: boolean;
}

export interface ClientInformation {
  organizationName?: string | null;
  einNumber?: string | null;
  adminName?: string | null;
  adminEmail?: string | null;
  password?: string | null;
  passwordIsSet?: boolean;
}

export interface BankingLegal {
  connected: boolean;
  stripeAccountId?: string | null;
}

export interface OrganizationIdentity {
  logoUrl?: string | null;
  mainColor?: string | null;
  secondaryColor?: string | null;
}

export interface OnboardingData {
  users?: OnboardingUser[];
  clientInformation?: ClientInformation;
  bankingLegal?: BankingLegal;
  organizationIdentity?: OrganizationIdentity;
}

export interface ClientOrgRecord {
  name: string;
  client_id: string;
  onboarding_data?: OnboardingData | null;
  status: string;
  logo_url: string | null;
  brand_primary_color: string | null;
  brand_secondary_color: string | null;
  brand_accent_color: string | null;
  stripe_account_id: string | null;
  crm_provider: string | null;
  ein_number: string | null;
  client_secret: string | null;
  app_config: unknown | null;
  payment_threshold: number;
  created_at: string;
  updated_at: string;
}

export const FALLBACK_CLIENT_DATA: ClientOrgRecord = {
  name: "Amine Test",
  client_id: "CLT-B2D3LW",
  onboarding_data: {
    users: [
      {
        id: "18031090-25bb-45f8-a3cb-7a73b6057c95",
        name: "user1",
        email: "user1@bassam.org",
        profile: "employee",
        expirationDate: "",
        passwordIsSet: true,
      },
    ],
    clientInformation: {
      organizationName: "Bassam Org",
      einNumber: "12-3456789",
      adminName: "Bassam Org",
      adminEmail: "Bassam@org.com",
      password: "1234",
      passwordIsSet: true,
    },
    bankingLegal: {
      connected: false,
      stripeAccountId: "acct_1UAYxZFCPSZBLmtc",
    },
    organizationIdentity: {
      logoUrl: "https://example.com",
      mainColor: "#c37474",
      secondaryColor: "#a61c1c",
    },
  },
  status: "active",
  logo_url: null,
  brand_primary_color: "#111111",
  brand_secondary_color: "#FFFFFF",
  brand_accent_color: "#0F6E56",
  stripe_account_id: "acct_1TtzE9FGjEzyTWs3",
  crm_provider: null,
  ein_number: null,
  client_secret: "accs_secret__VCMYzz52TOCFXfpG9FXzrwS7aIkMuWCiBBHpSuoMFweTVv4",
  app_config: null,
  payment_threshold: 0,
  created_at: "2026-07-25T15:29:26.944Z",
  updated_at: "2026-08-31T17:25:34.740Z",
};
