import { z } from "zod";

export const bookAppointmentSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  appointmentType: z.string().min(1, "Type is required"),
  symptoms: z.string().optional(),
  notes: z.string().optional(),
});

