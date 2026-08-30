"use client";

import { Controller, type UseFormReturn } from "react-hook-form";

import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ClientInformationInput } from "@/lib/onboarding/schemas";

import { PasswordInput } from "./password-input";

interface ClientInformationStepProps {
  form: UseFormReturn<ClientInformationInput>;
  passwordIsSet: boolean;
}

function formatEinNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  return digits.length > 2 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : digits;
}

export function ClientInformationStep({ form, passwordIsSet }: ClientInformationStepProps) {
  const { control } = form;

  return (
    <FieldGroup className="gap-6">
      <Controller
        control={control}
        name="organizationName"
        render={({ field, fieldState }) => (
          <Field className="gap-1.5" data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="organizationName">Organization Name</FieldLabel>
            <Input {...field} id="organizationName" aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        control={control}
        name="einNumber"
        render={({ field, fieldState }) => (
          <Field className="gap-1.5" data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="einNumber">EIN Number</FieldLabel>
            <Input
              {...field}
              id="einNumber"
              placeholder="12-3456789"
              aria-invalid={fieldState.invalid}
              onChange={(event) => field.onChange(formatEinNumber(event.target.value))}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        control={control}
        name="adminName"
        render={({ field, fieldState }) => (
          <Field className="gap-1.5" data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="adminName">Admin / Authorized Representative Name</FieldLabel>
            <Input {...field} id="adminName" aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        control={control}
        name="adminEmail"
        render={({ field, fieldState }) => (
          <Field className="gap-1.5" data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="adminEmail">Admin / Authorized Representative Email</FieldLabel>
            <Input {...field} id="adminEmail" type="email" aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <div className="grid gap-6 md:grid-cols-2">
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <PasswordInput
                {...field}
                id="password"
                autoComplete="new-password"
                placeholder={passwordIsSet ? "•••••••• (saved)" : "Enter a password"}
                aria-invalid={fieldState.invalid}
              />
              {passwordIsSet && !fieldState.invalid && (
                <FieldDescription>Already set — leave blank to keep it.</FieldDescription>
              )}
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
              <PasswordInput
                {...field}
                id="confirmPassword"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>
    </FieldGroup>
  );
}
