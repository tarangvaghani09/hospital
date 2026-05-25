import { pgTable, text, serial, timestamp, boolean, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subscriptionPlansTable = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  originalPrice: numeric("original_price", { precision: 10, scale: 2 }),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  billingCycle: text("billing_cycle").notNull().default("MONTHLY"), // MONTHLY | YEARLY
  maxDoctors: integer("max_doctors"), // null = unlimited
  maxReceptionists: integer("max_receptionists"),
  maxPatients: integer("max_patients"),
  features: text("features").array().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const hospitalSubscriptionsTable = pgTable("hospital_subscriptions", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").notNull(),
  planId: integer("plan_id").notNull(),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE | EXPIRED | CANCELLED | TRIAL
  startDate: timestamp("start_date", { withTimezone: true }).notNull().defaultNow(),
  endDate: timestamp("end_date", { withTimezone: true }),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  paymentMethod: text("payment_method"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlansTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlansTable.$inferSelect;
export type HospitalSubscription = typeof hospitalSubscriptionsTable.$inferSelect;
