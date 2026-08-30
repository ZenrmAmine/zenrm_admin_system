"use client";

import { Plus, Trash2 } from "lucide-react";
import { type Control, Controller, useFieldArray, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UsersStepInput } from "@/lib/onboarding/schemas";

import { ExpirationDateField } from "./expiration-date-field";
import { PasswordInput } from "./password-input";

interface UsersStepProps {
  form: { control: Control<UsersStepInput> };
  existingPasswordFlags: Record<string, boolean>;
}

const PROFILE_OPTIONS: Array<{ value: "admin" | "employee" | "guest"; label: string }> = [
  { value: "admin", label: "Admin" },
  { value: "employee", label: "Employee" },
  { value: "guest", label: "Guest" },
];

export function UsersStep({ form, existingPasswordFlags }: UsersStepProps) {
  const { control } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "users" });

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm font-bold">
        You can add your employees and guests now to give them access, or you can do it at anytime later from your
        dashboard.
      </p>

      {fields.length === 0 && (
        <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed py-8 text-center">
          <p className="text-sm font-medium">No additional users yet</p>
        </div>
      )}

      {fields.map((rowField, index) => (
        <UserRow
          key={rowField.id}
          control={control}
          index={index}
          passwordIsSet={existingPasswordFlags[rowField.id]}
          onRemove={() => remove(index)}
        />
      ))}

      <Button
        type="button"
        variant="outline"
        className="h-11 w-fit md:h-8"
        onClick={() =>
          append({
            id: crypto.randomUUID(),
            name: "",
            email: "",
            passwordIsSet: false,
            password: "",
            confirmPassword: "",
            profile: "employee",
            expirationDate: "",
          })
        }
      >
        <Plus /> Add user
      </Button>
    </div>
  );
}

interface UserRowProps {
  control: Control<UsersStepInput>;
  index: number;
  passwordIsSet: boolean;
  onRemove: () => void;
}

// Its own component so `useWatch` can subscribe this row to its own profile-field changes —
// calling `form.watch(...)` directly inside the parent's `.map()` reads a snapshot but never
// re-renders that row when the Select value changes, since the parent only re-renders on
// formState changes it actually reads (e.g. isSubmitting), not on every field edit.
function UserRow({ control, index, passwordIsSet, onRemove }: UserRowProps) {
  const profile = useWatch({ control, name: `users.${index}.profile` });

  return (
    <Card size="sm" className="shadow-sm">
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">User {index + 1}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-11 md:size-7"
            onClick={onRemove}
            aria-label="Remove user"
          >
            <Trash2 />
          </Button>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Controller
            control={control}
            name={`users.${index}.name`}
            render={({ field, fieldState }) => (
              <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`users.${index}.name`}>User Name</FieldLabel>
                <Input {...field} id={`users.${index}.name`} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            control={control}
            name={`users.${index}.email`}
            render={({ field, fieldState }) => (
              <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`users.${index}.email`}>User Email</FieldLabel>
                <Input {...field} id={`users.${index}.email`} type="email" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            control={control}
            name={`users.${index}.password`}
            render={({ field, fieldState }) => (
              <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`users.${index}.password`}>User Password</FieldLabel>
                <PasswordInput
                  {...field}
                  id={`users.${index}.password`}
                  autoComplete="new-password"
                  placeholder={passwordIsSet ? "•••••••• (saved)" : "Enter a password"}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            control={control}
            name={`users.${index}.confirmPassword`}
            render={({ field, fieldState }) => (
              <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`users.${index}.confirmPassword`}>Confirm Password</FieldLabel>
                <PasswordInput
                  {...field}
                  id={`users.${index}.confirmPassword`}
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            control={control}
            name={`users.${index}.profile`}
            render={({ field, fieldState }) => (
              <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`users.${index}.profile`}>Profile</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id={`users.${index}.profile`} className="w-full" aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Select a profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFILE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          {profile === "guest" && (
            <ExpirationDateField control={control} name={`users.${index}.expirationDate`} label="Expiration Date" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
