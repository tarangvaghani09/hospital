import { pgTable, text, serial, timestamp, boolean, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const doctorProfilesTable = pgTable("doctor_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  hospitalId: integer("hospital_id").notNull(),
  departmentId: integer("department_id"),
  specialization: text("specialization"),
  qualification: text("qualification"),
  experience: integer("experience"),
  consultationFee: numeric("consultation_fee", { precision: 10, scale: 2 }),
  bio: text("bio"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const doctorSchedulesTable = pgTable("doctor_schedules", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").notNull(), // references doctorProfilesTable.id
  hospitalId: integer("hospital_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sun 1=Mon ... 6=Sat
  startTime: text("start_time").notNull(), // "09:00"
  endTime: text("end_time").notNull(), // "17:00"
  breakStart: text("break_start"),
  breakEnd: text("break_end"),
  slotDuration: integer("slot_duration").notNull().default(30), // minutes
  maxPatients: integer("max_patients"),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const receptionistProfilesTable = pgTable("receptionist_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  hospitalId: integer("hospital_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDoctorProfileSchema = createInsertSchema(doctorProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDoctorProfile = z.infer<typeof insertDoctorProfileSchema>;
export type DoctorProfile = typeof doctorProfilesTable.$inferSelect;
export type DoctorSchedule = typeof doctorSchedulesTable.$inferSelect;
export type ReceptionistProfile = typeof receptionistProfilesTable.$inferSelect;
