import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, subscriptionPlansTable, hospitalSubscriptionsTable, doctorProfilesTable, receptionistProfilesTable, patientProfilesTable } from "@workspace/db";
import { authenticate, requireRoles, requireHospital } from "../middlewares/authenticate";

const router: IRouter = Router();

function formatPlan(p: any) {
  return {
    ...p,
    price: Number(p.price),
    originalPrice: p.originalPrice != null ? Number(p.originalPrice) : null,
    features: p.features ?? []
  };
}

router.get("/subscription-plans", async (_req, res): Promise<void> => {
  const plans = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.isActive, true));
  res.json(plans.map(formatPlan));
});

router.get("/subscription-plans/all", authenticate, requireRoles("SUPER_ADMIN"), async (_req, res): Promise<void> => {
  const plans = await db.select().from(subscriptionPlansTable);
  res.json(plans.map(formatPlan));
});

router.post("/subscription-plans", authenticate, requireRoles("SUPER_ADMIN"), async (req, res): Promise<void> => {
  const { name, price, originalPrice, billingCycle, description, maxDoctors, maxReceptionists, maxPatients, features } = req.body;
  const [plan] = await db.insert(subscriptionPlansTable).values({
    name, description: description ?? null,
    price: String(price),
    originalPrice: originalPrice != null ? String(originalPrice) : null,
    billingCycle: billingCycle ?? "MONTHLY",
    maxDoctors: maxDoctors ?? null, maxReceptionists: maxReceptionists ?? null,
    maxPatients: maxPatients ?? null, features: features ?? []
  }).returning();
  res.status(201).json(formatPlan(plan));
});

router.patch("/subscription-plans/:id", authenticate, requireRoles("SUPER_ADMIN"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const updates: Record<string, unknown> = { ...req.body };
  if (updates.price !== undefined) updates.price = String(updates.price);
  if (updates.originalPrice !== undefined) updates.originalPrice = updates.originalPrice != null ? String(updates.originalPrice) : null;
  const [plan] = await db.update(subscriptionPlansTable).set(updates).where(eq(subscriptionPlansTable.id, id)).returning();
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  res.json(formatPlan(plan));
});

router.delete("/subscription-plans/:id", authenticate, requireRoles("SUPER_ADMIN"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  await db.update(subscriptionPlansTable).set({ isActive: false }).where(eq(subscriptionPlansTable.id, id));
  res.sendStatus(204);
});

router.get("/hospital/subscription", authenticate, requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
  const [sub] = await db.select().from(hospitalSubscriptionsTable)
    .where(eq(hospitalSubscriptionsTable.hospitalId, hospitalId))
    .orderBy(desc(hospitalSubscriptionsTable.createdAt)).limit(1);

  if (!sub) { res.status(404).json({ error: "No subscription found" }); return; }

  const [plan] = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, sub.planId));

  const [doctorCount] = await db.select({ count: sql<number>`count(*)` }).from(doctorProfilesTable).where(eq(doctorProfilesTable.hospitalId, hospitalId));
  const [receptionistCount] = await db.select({ count: sql<number>`count(*)` }).from(receptionistProfilesTable).where(eq(receptionistProfilesTable.hospitalId, hospitalId));
  const [patientCount] = await db.select({ count: sql<number>`count(*)` }).from(patientProfilesTable).where(eq(patientProfilesTable.hospitalId, hospitalId));

  res.json({
    id: sub.id, planName: plan?.name ?? "Unknown", planId: sub.planId, status: sub.status,
    startDate: sub.startDate.toISOString(), endDate: sub.endDate ? sub.endDate.toISOString() : null,
    price: Number(sub.price), billingCycle: plan?.billingCycle ?? "MONTHLY",
    maxDoctors: plan?.maxDoctors ?? null, maxReceptionists: plan?.maxReceptionists ?? null, maxPatients: plan?.maxPatients ?? null,
    currentDoctors: Number(doctorCount?.count ?? 0),
    currentReceptionists: Number(receptionistCount?.count ?? 0),
    currentPatients: Number(patientCount?.count ?? 0),
    features: plan?.features ?? []
  });
});

router.post("/hospital/subscription/upgrade", authenticate, requireRoles("HOSPITAL_ADMIN"), async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
  const { planId, paymentMethod } = req.body;
  const [plan] = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, planId));
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }

  const endDate = new Date();
  if (plan.billingCycle === "YEARLY") endDate.setFullYear(endDate.getFullYear() + 1);
  else endDate.setMonth(endDate.getMonth() + 1);

  await db.insert(hospitalSubscriptionsTable).values({
    hospitalId, planId, status: "ACTIVE", price: plan.price, paymentMethod: paymentMethod ?? "ONLINE", endDate
  });
  res.json({ message: "Subscription updated successfully" });
});

export default router;
