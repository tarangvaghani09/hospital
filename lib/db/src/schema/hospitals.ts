import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const hospitalsTable = pgTable("hospitals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  registrationNumber: text("registration_number"),
  gstNumber: text("gst_number"),
  websiteUrl: text("website_url"),
  emergencyPhone: text("emergency_phone"),
  description: text("description"),
  logoUrl: text("logo_url"),
  signatureUrl: text("signature_url"),
  stampUrl: text("stamp_url"),
  letterheadUrl: text("letterhead_url"),
  themeColor: text("theme_color").default("#2563eb"),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE | INACTIVE | PENDING | SUSPENDED
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const hospitalSettingsTable = pgTable("hospital_settings", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").notNull().unique(),
  invoicePrefix: text("invoice_prefix").default("INV"),
  invoiceStartNumber: integer("invoice_start_number").default(1001),
  taxEnabled: boolean("tax_enabled").notNull().default(false),
  defaultTaxPercentage: text("default_tax_percentage").default("0"),
  discountEnabled: boolean("discount_enabled").notNull().default(true),
  invoiceFooterNote: text("invoice_footer_note"),
  invoiceTerms: text("invoice_terms"),
  showLogoOnInvoice: boolean("show_logo_on_invoice").notNull().default(true),
  showGSTOnInvoice: boolean("show_gst_on_invoice").notNull().default(false),
  showSignatureOnInvoice: boolean("show_signature_on_invoice").notNull().default(false),
  showStampOnInvoice: boolean("show_stamp_on_invoice").notNull().default(false),
  showQRCodeOnInvoice: boolean("show_qr_code_on_invoice").notNull().default(false),
  currency: text("currency").default("INR"),
  calendarSlotDuration: integer("calendar_slot_duration").default(30),
  allowMultiplePatientsPerSlot: boolean("allow_multiple_patients_per_slot").notNull().default(false),
  maxPatientsPerSlot: integer("max_patients_per_slot").default(1),
  allowDoctorViewOwnBilling: boolean("allow_doctor_view_own_billing").notNull().default(false),
  allowReceptionistViewBillingReports: boolean("allow_receptionist_view_billing_reports").notNull().default(false),
  hospitalOpenTime: text("hospital_open_time").default("08:00"),
  hospitalCloseTime: text("hospital_close_time").default("20:00"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertHospitalSchema = createInsertSchema(hospitalsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHospital = z.infer<typeof insertHospitalSchema>;
export type Hospital = typeof hospitalsTable.$inferSelect;
export type HospitalSettings = typeof hospitalSettingsTable.$inferSelect;
