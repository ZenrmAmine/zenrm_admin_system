import { z } from "zod";

import type { OnboardingStepId } from "@/lib/onboarding/types";

export const einSchema = z.string().regex(/^\d{2}-\d{7}$/, { message: "EIN must be in NN-NNNNNNN format." });

export const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, { message: "Enter a valid hex color, e.g. #14B8A6." });

export const passwordSchema = z
  .string()
  .min(10, { message: "Password must be at least 10 characters." })
  .regex(/[a-z]/, { message: "Password must include a lowercase letter." })
  .regex(/[A-Z]/, { message: "Password must include an uppercase letter." })
  .regex(/[0-9]/, { message: "Password must include a number." })
  .regex(/[^A-Za-z0-9]/, { message: "Password must include a symbol." });

export const clientInformationSchema = z
  .object({
    organizationName: z.string().min(1, { message: "Organization name is required." }),
    einNumber: einSchema,
    adminName: z.string().min(1, { message: "Admin/POC name is required." }),
    adminEmail: z.email({ message: "Enter a valid email address." }),
    password: z.union([passwordSchema, z.literal("")]).optional(),
    confirmPassword: z.string().optional(),
  })
  .refine((data) => !data.password || data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type ClientInformationInput = z.infer<typeof clientInformationSchema>;

export const organizationIdentitySchema = z.object({
  logoUrl: z.union([z.url({ message: "Enter a valid URL." }), z.literal("")]).optional(),
  mainColor: hexColorSchema,
  secondaryColor: hexColorSchema,
});

export type OrganizationIdentityInput = z.infer<typeof organizationIdentitySchema>;

export const additionalUserSchema = z
  .object({
    id: z.string(),
    name: z.string().min(1, { message: "Name is required." }),
    email: z.email({ message: "Enter a valid email address." }),
    password: z.union([passwordSchema, z.literal("")]).optional(),
    profile: z.enum(["admin", "employee", "guest"]),
    expirationDate: z.string().optional(),
  })
  .refine((data) => data.profile !== "guest" || !!data.expirationDate, {
    message: "Expiration date is required for Guest users.",
    path: ["expirationDate"],
  });

export const usersStepSchema = z.object({
  users: z.array(additionalUserSchema),
});

export type UsersStepInput = z.infer<typeof usersStepSchema>;

export const bankingStepSchema = z.object({
  provider: z.literal("stripe"),
  connected: z.boolean(),
  accountHolderName: z.string().optional(),
});

export type BankingStepInput = z.infer<typeof bankingStepSchema>;

export const stepSchemas = {
  "client-information": clientInformationSchema,
  "organization-identity": organizationIdentitySchema,
  users: usersStepSchema,
  "banking-legal": bankingStepSchema,
} satisfies Record<OnboardingStepId, z.ZodType>;

export function schemaForStep(stepId: string) {
  return stepId in stepSchemas ? stepSchemas[stepId as OnboardingStepId] : undefined;
}
