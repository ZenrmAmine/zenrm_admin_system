import type { WizardStep } from "@/components/wizard/wizard-types";
import {
  type BankingStepInput,
  bankingStepSchema,
  type ClientInformationInput,
  clientInformationSchema,
  type OrganizationIdentityInput,
  organizationIdentitySchema,
  type UsersStepInput,
  usersStepSchema,
} from "@/lib/onboarding/schemas";
import type { OnboardingRecord } from "@/lib/onboarding/types";

import { BankingStep } from "./banking-step";
import { ClientInformationStep } from "./client-information-step";
import { OrganizationIdentityStep } from "./organization-identity-step";
import { UsersStep } from "./users-step";

export function buildOnboardingSteps(record: OnboardingRecord): WizardStep[] {
  const clientInformation = record.steps["client-information"].data;
  const organizationIdentity = record.steps["organization-identity"].data;
  const users = record.steps.users.data;
  const bankingLegal = record.steps["banking-legal"].data;

  const existingPasswordFlags = Object.fromEntries(users.users.map((user) => [user.id, user.passwordIsSet]));

  const clientInformationStep: WizardStep<ClientInformationInput> = {
    id: "client-information",
    label: "Client Information",
    description: "Tell us about your organization and set up the primary admin account.",
    schema: clientInformationSchema,
    defaultValues: {
      organizationName: clientInformation.organizationName ?? "",
      einNumber: clientInformation.einNumber ?? "",
      adminName: clientInformation.adminName ?? "",
      adminEmail: clientInformation.adminEmail ?? "",
      password: "",
      confirmPassword: "",
    },
    render: ({ form }) => <ClientInformationStep form={form} passwordIsSet={clientInformation.passwordIsSet} />,
  };

  const organizationIdentityStep: WizardStep<OrganizationIdentityInput> = {
    id: "organization-identity",
    label: "Organization Identity",
    description: "Add your logo and brand colors so your workspace looks like you.",
    schema: organizationIdentitySchema,
    defaultValues: {
      logoUrl: organizationIdentity.logoUrl ?? "",
      mainColor: organizationIdentity.mainColor ?? "",
      secondaryColor: organizationIdentity.secondaryColor ?? "",
    },
    render: ({ form }) => <OrganizationIdentityStep form={form} />,
  };

  const usersStep: WizardStep<UsersStepInput> = {
    id: "users",
    label: "Users",
    description: "Invite teammates and guests. You can skip this and add people later.",
    schema: usersStepSchema,
    defaultValues: {
      users: users.users.map((user) => ({
        id: user.id,
        name: user.name ?? "",
        email: user.email ?? "",
        password: "",
        profile: user.profile ?? "employee",
        expirationDate: user.expirationDate ?? "",
      })),
    },
    render: ({ form }) => <UsersStep form={form} existingPasswordFlags={existingPasswordFlags} />,
  };

  const bankingLegalStep: WizardStep<BankingStepInput> = {
    id: "banking-legal",
    label: "Banking & Legal Information",
    description: "Connect a payout account so you're ready to get paid.",
    schema: bankingStepSchema,
    defaultValues: {
      provider: "stripe",
      connected: bankingLegal.connected,
      accountHolderName: bankingLegal.accountHolderName ?? "",
    },
    render: ({ form }) => <BankingStep form={form} />,
  };

  // Each step above is constructed with its own precise form-values type; the generic Wizard
  // contract (WizardStep<FieldValues>) is intentionally looser since it must hold steps of
  // different shapes in one array. This cast is the single, isolated place that bridges the two —
  // safe because Wizard only ever invokes a step's own `render` with that same step's own form.
  return [clientInformationStep, organizationIdentityStep, usersStep, bankingLegalStep] as unknown as WizardStep[];
}
