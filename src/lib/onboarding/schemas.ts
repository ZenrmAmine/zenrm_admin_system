import { z } from "zod";

export const einSchema = z.string().regex(/^\d{2}-\d{7}$/, { message: "EIN must be in NN-NNNNNNN format." });

export const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, { message: "Enter a valid hex color, e.g. #14B8A6." });

export const simpleUserPasswordSchema = z.string().min(4, { message: "Password must be at least 4 characters." });

export const clientInformationSchema = z
  .object({
    organizationName: z.string().min(1, { message: "Organization name is required." }),
    einNumber: einSchema,
    adminName: z.string().min(1, { message: "Admin / Authorized Representative name is required." }),
    adminEmail: z.email({ message: "Enter a valid email address." }),
    passwordIsSet: z.boolean(),
    password: z.union([simpleUserPasswordSchema, z.literal("")]).optional(),
    confirmPassword: z.string().optional(),
  })
  .refine((data) => data.passwordIsSet || !!data.password, {
    message: "Password is required.",
    path: ["password"],
  })
  .refine((data) => !data.password || data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type ClientInformationInput = z.infer<typeof clientInformationSchema>;

export const organizationIdentitySchema = z.object({
  logoUrl: z.url({ message: "Enter a valid URL." }),
  mainColor: hexColorSchema,
  secondaryColor: hexColorSchema,
});

export type OrganizationIdentityInput = z.infer<typeof organizationIdentitySchema>;

export const additionalUserSchema = z
  .object({
    id: z.string(),
    name: z.string().min(1, { message: "Name is required." }),
    email: z.email({ message: "Enter a valid email address." }),
    passwordIsSet: z.boolean(),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
    profile: z.enum(["admin", "employee", "guest"]),
    expirationDate: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.profile === "admin") {
      if (data.password) {
        const result = simpleUserPasswordSchema.safeParse(data.password);
        if (!result.success) {
          ctx.addIssue({ code: "custom", message: result.error.issues[0].message, path: ["password"] });
        }
      }
      return;
    }

    if (!data.passwordIsSet && !data.password) {
      ctx.addIssue({ code: "custom", message: "Password is required.", path: ["password"] });
      return;
    }

    if (data.password) {
      const result = simpleUserPasswordSchema.safeParse(data.password);
      if (!result.success) {
        ctx.addIssue({ code: "custom", message: result.error.issues[0].message, path: ["password"] });
      }
    }
  })
  .refine((data) => data.profile !== "guest" || !!data.expirationDate, {
    message: "Expiration date is required for Guest users.",
    path: ["expirationDate"],
  })
  .refine((data) => !data.password || data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const usersStepSchema = z.object({
  users: z.array(additionalUserSchema),
});

export type UsersStepInput = z.infer<typeof usersStepSchema>;

export const bankingStepSchema = z.object({
  provider: z.literal("stripe"),
  connected: z.boolean(),
});

export type BankingStepInput = z.infer<typeof bankingStepSchema>;
