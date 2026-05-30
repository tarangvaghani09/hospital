import { z } from "zod";

export const addReceptionistSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .refine((v) => !/^\d+$/.test(v), "Name cannot be only numbers"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .transform((v) => v.toLowerCase()),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => v ?? "")
    .refine((v) => v === "" || /^\d+$/.test(v), "Phone must contain digits only")
    .refine((v) => v.length <= 10, "Phone cannot be more than 10 digits"),
});

export type AddReceptionistFormData = z.infer<typeof addReceptionistSchema>;
