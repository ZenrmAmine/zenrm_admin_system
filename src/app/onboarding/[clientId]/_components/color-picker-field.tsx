"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { Controller } from "react-hook-form";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { hexColorSchema } from "@/lib/onboarding/schemas";

interface ColorPickerFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  placeholder?: string;
}

function toSixDigitHex(hex: string) {
  const shorthandMatch = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/.exec(hex);
  if (!shorthandMatch) return hex;
  const [, r, g, b] = shorthandMatch;
  return `#${r}${r}${g}${g}${b}${b}`;
}

export function ColorPickerField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder = "#14B8A6",
}: ColorPickerFieldProps<TFieldValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const isValidHex = hexColorSchema.safeParse(field.value).success;
        const swatchColor = isValidHex ? toSixDigitHex(field.value as string) : "#000000";

        return (
          <Field className="gap-1.5" data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${name}-hex`}>{label}</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                {/* Native input[type=color] renders its own OS-level picker; wrapping it in a
                    Radix Popover caused the popover's outside-click layer to dismiss it before
                    a color could be committed, and the browser silently rejects 3-digit hex
                    values (resetting to black) unless expanded to 6 digits first. */}
                <input
                  type="color"
                  aria-label={`Pick ${label.toLowerCase()}`}
                  value={swatchColor}
                  onChange={(event) => field.onChange(event.target.value)}
                  className="size-5 cursor-pointer appearance-none rounded-full border border-border bg-transparent p-0 [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:rounded-full [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none"
                />
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
