"use client";

import { useState } from "react";

import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { Controller } from "react-hook-form";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { hexColorSchema } from "@/lib/onboarding/schemas";

interface ColorPickerFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  placeholder?: string;
}

export function ColorPickerField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder = "#14B8A6",
}: ColorPickerFieldProps<TFieldValues>) {
  const [open, setOpen] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const isValidHex = hexColorSchema.safeParse(field.value).success;
        const swatchColor = isValidHex ? (field.value as string) : "#00000000";

        return (
          <Field className="gap-1.5" data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${name}-hex`}>{label}</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Pick ${label.toLowerCase()}`}
                      className="size-5 rounded-full border border-border"
                      style={{ backgroundColor: swatchColor }}
                    />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="start">
                    <input
                      type="color"
                      value={isValidHex ? (field.value as string) : "#000000"}
                      onChange={(event) => field.onChange(event.target.value)}
                      className="size-40"
                    />
                  </PopoverContent>
                </Popover>
              </InputGroupAddon>
              <InputGroupInput
                id={`${name}-hex`}
                value={field.value as string}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder={placeholder}
                aria-invalid={fieldState.invalid}
              />
            </InputGroup>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        );
      }}
    />
  );
}
