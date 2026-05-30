import { z } from "zod";

export const createPrescriptionSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().optional(),
  isDoctor: z.boolean(),
  symptoms: z
    .string()
    .optional()
    .refine((v) => !v || !/^\d+$/.test(v.trim()), "Symptoms cannot be only numbers"),
  diagnosis: z
    .string()
    .optional()
    .refine((v) => !v || !/^\d+$/.test(v.trim()), "Diagnosis cannot be only numbers"),
  medicines: z
    .array(
      z.object({
        name: z.string().trim().min(1, "All medicines need a name"),
        dosage: z.string().optional(),
        timing: z.string().optional(),
        duration: z.string().optional(),
        instructions: z.string().optional(),
      }),
    )
    .min(1, "At least one medicine is required"),
  followUpDate: z.string().optional(),
}).superRefine((val, ctx) => {
  if (!val.isDoctor && !val.doctorId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Doctor is required", path: ["doctorId"] });
  }
  if (val.followUpDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const f = new Date(val.followUpDate);
    f.setHours(0, 0, 0, 0);
    if (f < today) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Past follow-up date is not allowed", path: ["followUpDate"] });
    }
  }
});
