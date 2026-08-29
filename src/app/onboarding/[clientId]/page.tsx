import { isClientId } from "@/lib/onboarding/client-id";

import { OnboardingError } from "./_components/onboarding-error";
import { OnboardingWizardShell } from "./_components/onboarding-wizard-shell";

export default async function OnboardingPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;

  // Short-circuits obviously malformed IDs without a network round trip. A well-formed but
  // unknown clientId still reaches the client shell, which shows the same generic error after the
  // GET call 404s — so a visitor can never tell "malformed" from "doesn't exist" either way.
  if (!isClientId(clientId)) {
    return <OnboardingError />;
  }

  return <OnboardingWizardShell clientId={clientId} />;
}
