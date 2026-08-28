"use client";

import { CreditCard } from "lucide-react";
import { Controller, type UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { BankingStepInput } from "@/lib/onboarding/schemas";

interface BankingStepProps {
  form: UseFormReturn<BankingStepInput>;
}

// Real Stripe Elements/Connect onboarding is deferred until API keys and an account model are
// decided — this abstraction is provider-swappable (only this file changes to wire in a real
// provider), and saves through the same per-step contract as every other step in the meantime.
export function BankingStep({ form }: BankingStepProps) {
  const { control, watch } = form;
  const connected = watch("connected");

  return (
    <div className="flex flex-col gap-6">
      <Controller
        control={control}
        name="accountHolderName"
        render={({ field, fieldState }) => (
          <Field className="gap-1.5" data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="accountHolderName">Account Holder Name</FieldLabel>
            <Input {...field} id="accountHolderName" aria-invalid={fieldState.invalid} />
          </Field>
        )}
      />

      <Controller
        control={control}
        name="connected"
        render={({ field }) => (
          <Button
            type="button"
            variant={connected ? "secondary" : "default"}
            className="h-11 w-fit md:h-8"
            onClick={() => field.onChange(!connected)}
          >
            <CreditCard /> {connected ? "Connected with Stripe" : "Connect with Stripe"}
          </Button>
        )}
      />
    </div>
  );
}
