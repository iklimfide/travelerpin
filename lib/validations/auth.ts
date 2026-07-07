import { z } from "zod";
import { LIMITS } from "@/lib/constants";
import { usernameSchema } from "@/lib/validations/username";
import { residenceCitySchema } from "@/lib/validations/profile";

export const loginSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .transform((value) => value.trim().toLowerCase()),
  password: z.string().min(LIMITS.passwordMin, `Password must be at least ${LIMITS.passwordMin} characters`),
});

export const registerSchema = z
  .object({
    username: usernameSchema,
    email: z
      .string()
      .email("Invalid email address")
      .transform((value) => value.trim().toLowerCase()),
    password: z.string().min(LIMITS.passwordMin, `Password must be at least ${LIMITS.passwordMin} characters`),
    passwordConfirm: z
      .string()
      .min(LIMITS.passwordMin, `Password must be at least ${LIMITS.passwordMin} characters`),
    residence_city: residenceCitySchema,
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords do not match",
    path: ["passwordConfirm"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
