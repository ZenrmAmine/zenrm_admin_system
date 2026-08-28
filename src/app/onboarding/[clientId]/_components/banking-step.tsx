"use client";

import { useEffect, useRef, useState } from "react";

import type { AppearanceOptions, StripeConnectInstance } from "@stripe/connect-js";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import { ConnectAccountOnboarding, ConnectComponentsProvider } from "@stripe/react-connect-js";
import { CheckCircle2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { BankingStepInput } from "@/lib/onboarding/schemas";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

interface BankingStepProps {
  form: UseFormReturn<BankingStepInput>;
  clientId: string;
  clientEmail: string;
  organizationName: string;
  stripeAccountId: string | undefined;
}

type Phase = "checking" | "embed" | "complete" | "error";

function appearanceFor(mode: "light" | "dark"): AppearanceOptions {
  return {
    variables: {
      colorPrimary: "#14b8a6",
      colorBackground: mode === "dark" ? "#0a0a0a" : "#ffffff",
      colorText: mode === "dark" ? "#fafafa" : "#0a0a0a",
      borderRadius: "12px",
      fontFamily: "inherit",
    },
  };
}

interface StripeStatusResponse {
  hasAccount: boolean;
  complete: boolean;
  error?: string;
}

// Stripe is the system of record for banking/legal data — this component never collects or
// stores individual field values (account holder name, country, etc.) beyond the account id and
// a derived `connected` rollup. On mount it either starts a brand-new account (fixed
// country/business type/currency defaults, since those aren't collected here — see
// stripe-session/route.ts) or, for a returning client, checks the existing account's real
// `requirements` before deciding whether to show a completion summary or resume the embedded flow.
export function BankingStep({ form, clientId, clientEmail, organizationName, stripeAccountId }: BankingStepProps) {
  const { setValue } = form;
  const resolvedThemeMode = usePreferencesStore((state) => state.resolvedThemeMode);

  const [phase, setPhase] = useState<Phase>("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connectInstance, setConnectInstance] = useState<StripeConnectInstance | null>(null);
  const [isLoadingEmbed, setIsLoadingEmbed] = useState(false);
  const hasStartedRef = useRef(false);

  async function checkStatus(): Promise<StripeStatusResponse> {
    const response = await fetch(`/api/onboarding/${clientId}/stripe-status`);
    const body = (await response.json()) as StripeStatusResponse;
    if (!response.ok) {
      throw new Error(body.error ?? "Unable to check the Stripe account's status.");
    }
    return body;
  }

  // Also used by Connect.js itself for its own internal session refreshes, so every fetch — the
  // first one and any later ones — goes through the same route and gets the same fresh data.
  async function fetchClientSecret(): Promise<string> {
    const response = await fetch(`/api/onboarding/${clientId}/stripe-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: clientEmail, displayName: organizationName }),
    });

    const body = (await response.json()) as { clientSecret?: string; error?: string };
    if (!response.ok || !body.clientSecret) {
      throw new Error(body.error ?? "Unable to start the Stripe onboarding session.");
    }

    return body.clientSecret;
  }

  function startEmbeddedOnboarding() {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      // Stripe's own SDK throws this asynchronously (outside any try/catch here) when given an
      // empty key, so it's checked up front instead — this is expected until
      // NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set in the deploy environment.
      setPhase("error");
      setErrorMessage("Stripe is not configured for this environment (missing publishable key).");
      return;
    }

    setIsLoadingEmbed(true);
    setPhase("embed");
    try {
      setConnectInstance(
        loadConnectAndInitialize({
          publishableKey,
          fetchClientSecret,
          appearance: appearanceFor(resolvedThemeMode),
        }),
      );
    } catch (error) {
      setIsLoadingEmbed(false);
      setPhase("error");
      setErrorMessage(error instanceof Error ? error.message : "Unable to start the Stripe onboarding session.");
    }
  }

  async function handleExit() {
    // Re-check against Stripe's real requirements rather than assuming the visit was
    // successful — a user can exit the embedded flow without finishing.
    try {
      const status = await checkStatus();
      if (status.complete) {
        setValue("connected", true, { shouldDirty: true });
        setPhase("complete");
      } else {
        toast.info("You can pick up Stripe onboarding again anytime before finishing this step.");
      }
    } catch {
      // Non-fatal — the embed stays on screen either way, just without an updated status.
    }
  }

  // Guarded against React StrictMode's dev-mode double-invoke: this fires a real network call
  // (account creation, on a first-time visit), which shouldn't run twice for one mount. Runs once
  // per mount (the Wizard remounts this step fresh via `key` on every visit), driven only by the
  // `stripeAccountId` this step started with — it intentionally does not react to later changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally mount-once, guarded by hasStartedRef.
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    if (!stripeAccountId) {
      startEmbeddedOnboarding();
      return;
    }

    setPhase("checking");
    checkStatus()
      .then((status) => {
        if (status.complete) {
          setValue("connected", true, { shouldDirty: true });
          setPhase("complete");
        } else {
          startEmbeddedOnboarding();
        }
      })
      .catch((error: Error) => {
        setPhase("error");
        setErrorMessage(error.message);
      });
  }, []);

  if (phase === "checking") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-4" /> Checking your Stripe account...
      </div>
    );
  }

  if (phase === "complete") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed p-6">
        <CheckCircle2 className="size-5 shrink-0 text-teal-600 dark:text-teal-400" />
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">Banking info submitted</p>
          <p className="text-sm text-muted-foreground">
            Your Stripe account is connected and ready to receive payouts.
          </p>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-6">
        <p className="text-sm text-muted-foreground">{errorMessage ?? "Something went wrong."}</p>
        <Button type="button" variant="outline" className="h-11 md:h-8" onClick={startEmbeddedOnboarding}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {isLoadingEmbed && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" /> Loading Stripe onboarding...
        </div>
      )}
      {connectInstance && (
        <ConnectComponentsProvider connectInstance={connectInstance}>
          <ConnectAccountOnboarding
            onLoaderStart={() => setIsLoadingEmbed(false)}
            onLoadError={({ error }) => {
              setIsLoadingEmbed(false);
              setConnectInstance(null);
              setPhase("error");
              setErrorMessage(error.message || "Unable to load Stripe onboarding.");
            }}
            onExit={handleExit}
          />
        </ConnectComponentsProvider>
      )}
    </div>
  );
}
