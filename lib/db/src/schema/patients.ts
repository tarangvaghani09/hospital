import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const patientProfilesTable = pgTable("patient_profiles", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").notNull(),
  userId: integer("user_id"), // nullable for walk-in patients
  patientId: text("patient_id").notNull(), // e.g. PAT-001
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"),
  bloodGroup: text("blood_group"),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  allergies: text("allergies"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPatientProfileSchema = createInsertSchema(patientProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPatientProfile = z.infer<typeof insertPatientProfileSchema>;
export type PatientProfile = typeof patientProfilesTable.$inferSelect;
