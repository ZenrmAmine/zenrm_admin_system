"use client";

import { Controller, type UseFormReturn } from "react-hook-form";

import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { OrganizationIdentityInput } from "@/lib/onboarding/schemas";

import { ColorPickerField } from "./color-picker-field";

interface OrganizationIdentityStepProps {
  form: UseFormReturn<OrganizationIdentityInput>;
}

export function OrganizationIdentityStep({ form }: OrganizationIdentityStepProps) {
  const { control } = form;

  return (
    <FieldGroup className="gap-6">
      <Controller
        control={control}
        name="logoUrl"
        render={({ field, fieldState }) => (
          <Field className="gap-1.5" data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="logoUrl">Logo URL</FieldLabel>
            <Input
              {...field}
              id="logoUrl"
              type="url"
              placeholder="https://example.com/logo.png"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <div className="grid gap-6 md:grid-cols-2">
        <ColorPickerField control={control} name="mainColor" label="Main Color Code" placeholder="#14B8A6" />
        <ColorPickerField control={control} name="secondaryColor" label="Secondary Color Code" placeholder="#8B5CF6" />
      </div>
    </FieldGroup>
  );
}
