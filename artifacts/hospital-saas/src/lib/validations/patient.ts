import { z } from "zod";

export const addPatientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .refine((v) => !/^\d+$/.test(v), "Name cannot be only numbers"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone is required")
    .refine((v) => /^\d+$/.test(v), "Phone must contain digits only")
    .refine((v) => v.length <= 10, "Phone cannot be more than 10 digits"),
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => v ?? "")
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Please enter a valid email address")
    .transform((v) => v.toLowerCase()),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z
    .string()
    .trim()
    .optional()
    .transform((v) => v ?? "")
    .refine((v) => v === "" || /^\d+$/.test(v), "Emergency contact must contain digits only")
    .refine((v) => v.length <= 10, "Emergency contact cannot be more than 10 digits"),
  allergies: z.string().optional(),
});

export type AddPatientFormData = z.infer<typeof addPatientSchema>;
