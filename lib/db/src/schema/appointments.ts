import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const appointmentsTable = pgTable("appointments", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").notNull(),
  patientId: integer("patient_id").notNull(),
  doctorId: integer("doctor_id").notNull(), // doctorProfilesTable.id
  departmentId: integer("department_id"),
  appointmentDate: text("appointment_date").notNull(), // YYYY-MM-DD
  appointmentTime: text("appointment_time").notNull(), // HH:MM
  tokenNumber: integer("token_number").notNull(),
  status: text("status").notNull().default("SCHEDULED"), // SCHEDULED | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED | NO_SHOW
  appointmentType: text("appointment_type").notNull().default("WALK_IN"), // WALK_IN | BOOKED | FOLLOW_UP
  symptoms: text("symptoms"),
  diagnosis: text("diagnosis"),
  notes: text("notes"),
  followUpDate: text("follow_up_date"),
  roomNumber: text("room_number"),
  paymentStatus: text("payment_status").default("PENDING"), // PENDING | PAID | UNPAID | PARTIAL
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAppointmentSchema = createInsertSchema(appointmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointmentsTable.$inferSelect;
