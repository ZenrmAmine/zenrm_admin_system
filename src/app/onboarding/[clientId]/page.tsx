import { isUuid } from "@/lib/onboarding/uuid";

import { OnboardingError } from "./_components/onboarding-error";
import { OnboardingWizardShell } from "./_components/onboarding-wizard-shell";

export default async function OnboardingPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;

  // Short-circuits obviously malformed IDs without a network round trip. A well-formed but
  // unknown UUID still reaches the client shell, which shows the same generic error after the
  // GET call 404s — so a visitor can never tell "malformed" from "doesn't exist" either way.
  if (!isUuid(clientId)) {
    return <OnboardingError />;
  }

  return <OnboardingWizardShell clientId={clientId} />;
}
