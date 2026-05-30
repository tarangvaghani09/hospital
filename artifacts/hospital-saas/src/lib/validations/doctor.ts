import { z } from "zod";

export const addDoctorSchema = z.object({
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
  specialization: z.string().trim().optional(),
  qualification: z.string().trim().optional(),
  experience: z
    .string()
    .optional()
    .refine((v) => !v || (/^\d+$/.test(v) && Number(v) >= 0), "Experience must be a valid non-negative number"),
  consultationFee: z
    .string()
    .optional()
    .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0), "Consultation fee must be a valid non-negative number"),
  departmentId: z.string().optional(),
});

export type AddDoctorFormData = z.infer<typeof addDoctorSchema>;
