import { Router, type IRouter } from "express";
import { eq, like, sql, and, desc } from "drizzle-orm";
import {
  db, hospitalsTable, hospitalSettingsTable, hospitalSubscriptionsTable,
  subscriptionPlansTable, usersTable, doctorProfilesTable, receptionistProfilesTable,
  patientProfilesTable, appointmentsTable, invoicesTable, departmentsTable
} from "@workspace/db";
import { authenticate, requireRoles, requireHospital } from "../middlewares/authenticate";
import { hashPassword } from "../lib/auth";

const router: IRouter = Router();

// ─── SUPER ADMIN ─────────────────────────────────────────────────────────────

router.get("/admin/hospitals", authenticate, requireRoles("SUPER_ADMIN"), async (req, res): Promise<void> => {
  const { search, status, page = 1, limit = 20 } = req.query as Record<string, string>;
  const offset = (Number(page) - 1) * Number(limit);

  const conditions: any[] = [];
  if (search) conditions.push(like(hospitalsTable.name, `%${search}%`));
  if (status) conditions.push(eq(hospitalsTable.status, status));

  const hospitals = await db.select().from(hospitalsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(hospitalsTable.createdAt))
    .limit(Number(limit)).offset(offset);

  const enriched = await Promise.all(hospitals.map(async (h) => {
    const doctors = await db.select({ count: sql<number>`count(*)` }).from(doctorProfilesTable).where(eq(doctorProfilesTable.hospitalId, h.id));
    const patients = await db.select({ count: sql<number>`count(*)` }).from(patientProfilesTable).where(eq(patientProfilesTable.hospitalId, h.id));
    const [sub] = await db.select({ planName: subscriptionPlansTable.name, status: hospitalSubscriptionsTable.status, endDate: hospitalSubscriptionsTable.endDate })
      .from(hospitalSubscriptionsTable).leftJoin(subscriptionPlansTable, eq(hospitalSubscriptionsTable.planId, subscriptionPlansTable.id))
      .where(eq(hospitalSubscriptionsTable.hospitalId, h.id)).orderBy(desc(hospitalSubscriptionsTable.createdAt)).limit(1);

    return {
      ...h, totalDoctors: Number(doctors[0]?.count ?? 0), totalPatients: Number(patients[0]?.count ?? 0),
      subscriptionPlan: sub?.planName ?? null, subscriptionStatus: sub?.status ?? null,
      subscriptionExpiry: sub?.endDate ? sub.endDate.toISOString() : null
    };
  }));

  const total = await db.select({ count: sql<number>`count(*)` }).from(hospitalsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json({ hospitals: enriched, total: Number(total[0]?.count ?? 0), page: Number(page), limit: Number(limit) });
});

router.get("/admin/hospitals/:id", authenticate, requireRoles("SUPER_ADMIN"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const [hospital] = await db.select().from(hospitalsTable).where(eq(hospitalsTable.id, id));
  if (!hospital) { res.status(404).json({ error: "Hospital not found" }); return; }

  const doctors = await db.select({ count: sql<number>`count(*)` }).from(doctorProfilesTable).where(eq(doctorProfilesTable.hospitalId, id));
  const patients = await db.select({ count: sql<number>`count(*)` }).from(patientProfilesTable).where(eq(patientProfilesTable.hospitalId, id));
  const [sub] = await db.select({ planName: subscriptionPlansTable.name, status: hospitalSubscriptionsTable.status, endDate: hospitalSubscriptionsTable.endDate })
    .from(hospitalSubscriptionsTable).leftJoin(subscriptionPlansTable, eq(hospitalSubscriptionsTable.planId, subscriptionPlansTable.id))
    .where(eq(hospitalSubscriptionsTable.hospitalId, id)).orderBy(desc(hospitalSubscriptionsTable.createdAt)).limit(1);

  res.json({ ...hospital, totalDoctors: Number(doctors[0]?.count ?? 0), totalPatients: Number(patients[0]?.count ?? 0), subscriptionPlan: sub?.planName ?? null, subscriptionStatus: sub?.status ?? null, subscriptionExpiry: sub?.endDate ? sub.endDate.toISOString() : null });
});

router.patch("/admin/hospitals/:id", authenticate, requireRoles("SUPER_ADMIN"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const [hospital] = await db.update(hospitalsTable).set(req.body).where(eq(hospitalsTable.id, id)).returning();
  if (!hospital) { res.status(404).json({ error: "Hospital not found" }); return; }
  res.json({ ...hospital, totalDoctors: 0, totalPatients: 0, subscriptionPlan: null, subscriptionStatus: null, subscriptionExpiry: null });
});

router.patch("/admin/hospitals/:id/status", authenticate, requireRoles("SUPER_ADMIN"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const { status } = req.body;
  await db.update(hospitalsTable).set({ status }).where(eq(hospitalsTable.id, id));
  res.json({ message: "Status updated" });
});

// ─── SUPER ADMIN: Add staff to any hospital ────────────────────────────────

router.get("/admin/hospitals/:id/staff", authenticate, requireRoles("SUPER_ADMIN"), async (req, res): Promise<void> => {
  const hospitalId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);

  const doctors = await db.select().from(doctorProfilesTable).where(eq(doctorProfilesTable.hospitalId, hospitalId));
  const enrichedDoctors = await Promise.all(doctors.map(async (d) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, d.userId));
    const [dept] = d.departmentId ? await db.select().from(departmentsTable).where(eq(departmentsTable.id, d.departmentId)) : [null];
    return { id: d.id, userId: d.userId, name: user?.name ?? "", email: user?.email ?? "", phone: (user as any)?.phone ?? null, specialization: d.specialization, qualification: d.qualification, experience: d.experience, consultationFee: d.consultationFee ? Number(d.consultationFee) : null, departmentId: d.departmentId, departmentName: dept?.name ?? null, isActive: d.isActive, createdAt: d.createdAt.toISOString() };
  }));

  const receptionists = await db.select().from(receptionistProfilesTable).where(eq(receptionistProfilesTable.hospitalId, hospitalId));
  const enrichedReceptionists = await Promise.all(receptionists.map(async (r) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, r.userId));
    return { id: r.id, userId: r.userId, name: user?.name ?? "", email: user?.email ?? "", phone: (user as any)?.phone ?? null, isActive: r.isActive, createdAt: r.createdAt.toISOString() };
  }));

  const departments = await db.select().from(departmentsTable).where(eq(departmentsTable.hospitalId, hospitalId));

  res.json({ doctors: enrichedDoctors, receptionists: enrichedReceptionists, departments });
});

router.post("/admin/hospitals/:id/doctors", authenticate, requireRoles("SUPER_ADMIN"), async (req, res): Promise<void> => {
  const hospitalId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const { name, email, password, phone, specialization, qualification, experience, consultationFee, departmentId } = req.body;
  if (!name || !email || !password) { res.status(400).json({ error: "Name, email, and password required" }); return; }

  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (existing) { res.status(400).json({ error: "Email already in use" }); return; }

  const hashed = await hashPassword(password);
  const [user] = await db.insert(usersTable).values({ email: email.toLowerCase(), password: hashed, name, role: "DOCTOR", hospitalId, phone: phone ?? null }).returning();
  const [profile] = await db.insert(doctorProfilesTable).values({
    userId: user.id, hospitalId, specialization: specialization ?? null, qualification: qualification ?? null,
    experience: experience ?? null, consultationFee: consultationFee ? String(consultationFee) : null,
    departmentId: departmentId ?? null
  }).returning();

  const [dept] = departmentId ? await db.select().from(departmentsTable).where(eq(departmentsTable.id, departmentId)) : [null];
  res.status(201).json({ id: profile.id, userId: profile.userId, name: user.name, email: user.email, phone: phone ?? null, specialization: profile.specialization, qualification: profile.qualification, experience: profile.experience, consultationFee: profile.consultationFee ? Number(profile.consultationFee) : null, departmentId: profile.departmentId, departmentName: dept?.name ?? null, isActive: profile.isActive, createdAt: profile.createdAt.toISOString() });
});

router.post("/admin/hospitals/:id/receptionists", authenticate, requireRoles("SUPER_ADMIN"), async (req, res): Promise<void> => {
  const hospitalId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) { res.status(400).json({ error: "Name, email, and password required" }); return; }

  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (existing) { res.status(400).json({ error: "Email already in use" }); return; }

  const hashed = await hashPassword(password);
  const [user] = await db.insert(usersTable).values({ email: email.toLowerCase(), password: hashed, name, role: "RECEPTIONIST", hospitalId, phone: phone ?? null }).returning();
  const [profile] = await db.insert(receptionistProfilesTable).values({ userId: user.id, hospitalId }).returning();

  res.status(201).json({ id: profile.id, userId: profile.userId, name: user.name, email: user.email, phone: phone ?? null, isActive: profile.isActive, createdAt: profile.createdAt.toISOString() });
});

router.get("/admin/dashboard", authenticate, requireRoles("SUPER_ADMIN"), async (req, res): Promise<void> => {
  const totalHospitals = await db.select({ count: sql<number>`count(*)` }).from(hospitalsTable);
  const activeHospitals = await db.select({ count: sql<number>`count(*)` }).from(hospitalsTable).where(eq(hospitalsTable.status, "ACTIVE"));
  const expiredSubs = await db.select({ count: sql<number>`count(*)` }).from(hospitalSubscriptionsTable).where(eq(hospitalSubscriptionsTable.status, "EXPIRED"));
  const pendingApprovals = await db.select({ count: sql<number>`count(*)` }).from(hospitalsTable).where(eq(hospitalsTable.status, "PENDING"));

  const monthlyRevResult = await db.select({ total: sql<number>`sum(cast(total_amount as numeric))` }).from(invoicesTable)
    .where(sql`date_trunc('month', created_at) = date_trunc('month', now())`);
  const totalRevResult = await db.select({ total: sql<number>`sum(cast(total_amount as numeric))` }).from(invoicesTable);

  const recentHospitals = await db.select().from(hospitalsTable).orderBy(desc(hospitalsTable.createdAt)).limit(5);

  // Monthly revenue chart (last 6 months)
  const revByMonth = await db.select({
    label: sql<string>`to_char(date_trunc('month', created_at), 'Mon YYYY')`,
    revenue: sql<number>`sum(cast(total_amount as numeric))`,
    appointments: sql<number>`count(*)`
  }).from(invoicesTable)
    .where(sql`created_at >= now() - interval '6 months'`)
    .groupBy(sql`date_trunc('month', created_at)`)
    .orderBy(sql`date_trunc('month', created_at)`);

  // Hospitals by plan
  const hospByPlan = await db.select({
    plan: subscriptionPlansTable.name,
    count: sql<number>`count(*)`
  }).from(hospitalSubscriptionsTable)
    .leftJoin(subscriptionPlansTable, eq(hospitalSubscriptionsTable.planId, subscriptionPlansTable.id))
    .where(eq(hospitalSubscriptionsTable.status, "ACTIVE"))
    .groupBy(subscriptionPlansTable.name);

  res.json({
    totalHospitals: Number(totalHospitals[0]?.count ?? 0),
    activeHospitals: Number(activeHospitals[0]?.count ?? 0),
    expiredSubscriptions: Number(expiredSubs[0]?.count ?? 0),
    pendingApprovals: Number(pendingApprovals[0]?.count ?? 0),
    monthlyRevenue: Number(monthlyRevResult[0]?.total ?? 0),
    totalRevenue: Number(totalRevResult[0]?.total ?? 0),
    recentHospitals: recentHospitals.map(h => ({ ...h, totalDoctors: 0, totalPatients: 0, subscriptionPlan: null, subscriptionStatus: null, subscriptionExpiry: null })),
    revenueByMonth: revByMonth.map(r => ({ label: r.label, revenue: Number(r.revenue ?? 0), appointments: Number(r.appointments ?? 0) })),
    hospitalsByPlan: hospByPlan.map(p => ({ plan: p.plan ?? "Unknown", count: Number(p.count ?? 0) }))
  });
});

// ─── HOSPITAL PROFILE ─────────────────────────────────────────────────────────

router.get("/hospital/profile", authenticate, requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
  const [hospital] = await db.select().from(hospitalsTable).where(eq(hospitalsTable.id, hospitalId));
  if (!hospital) { res.status(404).json({ error: "Hospital not found" }); return; }
  res.json(hospital);
});

router.patch("/hospital/profile", authenticate, requireRoles("HOSPITAL_ADMIN"), async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
  const allowed = ["name", "email", "phone", "address", "registrationNumber", "gstNumber", "websiteUrl", "emergencyPhone", "description", "themeColor", "logoUrl"];
  const updates: any = {};
  for (const key of allowed) { if (req.body[key] !== undefined) updates[key] = req.body[key]; }
  const [hospital] = await db.update(hospitalsTable).set(updates).where(eq(hospitalsTable.id, hospitalId)).returning();
  res.json(hospital);
});

router.get("/hospital/settings", authenticate, requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
  const [settings] = await db.select().from(hospitalSettingsTable).where(eq(hospitalSettingsTable.hospitalId, hospitalId));
  if (!settings) {
    const [created] = await db.insert(hospitalSettingsTable).values({ hospitalId }).returning();
    res.json(created); return;
  }
  res.json(settings);
});

router.patch("/hospital/settings", authenticate, requireRoles("HOSPITAL_ADMIN"), async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
  const [existing] = await db.select({ id: hospitalSettingsTable.id }).from(hospitalSettingsTable).where(eq(hospitalSettingsTable.hospitalId, hospitalId));
  if (!existing) {
    const [created] = await db.insert(hospitalSettingsTable).values({ hospitalId, ...req.body }).returning();
    res.json(created); return;
  }
  const [updated] = await db.update(hospitalSettingsTable).set(req.body).where(eq(hospitalSettingsTable.hospitalId, hospitalId)).returning();
  res.json(updated);
});

// ─── HOSPITAL DASHBOARD ───────────────────────────────────────────────────────

router.get("/hospital/dashboard", authenticate, requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
  const today = new Date().toISOString().split("T")[0];

  const [totalDoctors, totalPatients, totalAppts, todayAppts, monthlyRev, pendingInv] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(doctorProfilesTable).where(eq(doctorProfilesTable.hospitalId, hospitalId)),
    db.select({ count: sql<number>`count(*)` }).from(patientProfilesTable).where(eq(patientProfilesTable.hospitalId, hospitalId)),
    db.select({ count: sql<number>`count(*)` }).from(appointmentsTable).where(eq(appointmentsTable.hospitalId, hospitalId)),
    db.select({ count: sql<number>`count(*)` }).from(appointmentsTable).where(and(eq(appointmentsTable.hospitalId, hospitalId), eq(appointmentsTable.appointmentDate, today))),
    db.select({ total: sql<number>`sum(cast(total_amount as numeric))` }).from(invoicesTable).where(and(eq(invoicesTable.hospitalId, hospitalId), sql`date_trunc('month', created_at) = date_trunc('month', now())`)),
    db.select({ total: sql<number>`sum(cast(due_amount as numeric))` }).from(invoicesTable).where(and(eq(invoicesTable.hospitalId, hospitalId), sql`status != 'PAID'`)),
  ]);

  const recentAppts = await db.select().from(appointmentsTable).where(eq(appointmentsTable.hospitalId, hospitalId)).orderBy(desc(appointmentsTable.createdAt)).limit(5);
  const apptsByStatus = await db.select({ status: appointmentsTable.status, count: sql<number>`count(*)` }).from(appointmentsTable).where(eq(appointmentsTable.hospitalId, hospitalId)).groupBy(appointmentsTable.status);
  const revByMonth = await db.select({
    label: sql<string>`to_char(date_trunc('month', created_at), 'Mon')`,
    revenue: sql<number>`sum(cast(total_amount as numeric))`,
    appointments: sql<number>`count(*)`
  }).from(invoicesTable).where(and(eq(invoicesTable.hospitalId, hospitalId), sql`created_at >= now() - interval '6 months'`))
    .groupBy(sql`date_trunc('month', created_at)`).orderBy(sql`date_trunc('month', created_at)`);

  // Top doctors by appointment count
  const topDoctors = await db.select({
    doctorId: doctorProfilesTable.id,
    doctorName: usersTable.name,
    appointments: sql<number>`count(${appointmentsTable.id})`,
    revenue: sql<number>`sum(cast(${invoicesTable.totalAmount} as numeric))`
  }).from(doctorProfilesTable)
    .leftJoin(usersTable, eq(doctorProfilesTable.userId, usersTable.id))
    .leftJoin(appointmentsTable, and(eq(appointmentsTable.doctorId, doctorProfilesTable.id), eq(appointmentsTable.hospitalId, hospitalId)))
    .leftJoin(invoicesTable, and(eq(invoicesTable.doctorId, doctorProfilesTable.id), eq(invoicesTable.hospitalId, hospitalId)))
    .where(eq(doctorProfilesTable.hospitalId, hospitalId))
    .groupBy(doctorProfilesTable.id, usersTable.name).orderBy(sql`count(${appointmentsTable.id}) desc`).limit(5);

  const apptList = recentAppts.map(a => ({ ...a, patientName: "", doctorName: "" }));

  res.json({
    totalDoctors: Number(totalDoctors[0]?.count ?? 0),
    totalPatients: Number(totalPatients[0]?.count ?? 0),
    totalAppointments: Number(totalAppts[0]?.count ?? 0),
    todayAppointments: Number(todayAppts[0]?.count ?? 0),
    monthlyRevenue: Number(monthlyRev[0]?.total ?? 0),
    pendingInvoices: Number(pendingInv[0]?.total ?? 0),
    recentAppointments: apptList,
    appointmentsByStatus: apptsByStatus.map(a => ({ status: a.status, count: Number(a.count) })),
    revenueByMonth: revByMonth.map(r => ({ label: r.label, revenue: Number(r.revenue ?? 0), appointments: Number(r.appointments ?? 0) })),
    topDoctors: topDoctors.map(d => ({ doctorId: d.doctorId, doctorName: d.doctorName ?? "", appointments: Number(d.appointments ?? 0), revenue: Number(d.revenue ?? 0) }))
  });
});

// ─── Super Admin: Assign subscription plan to a hospital ──────────────────────
router.post("/admin/hospitals/:id/subscription", authenticate, requireRoles("SUPER_ADMIN"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { planId, billingCycle } = req.body;
  if (!planId) { res.status(400).json({ error: "planId is required" }); return; }

  const [plan] = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, parseInt(planId)));
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }

  const cycle = billingCycle || plan.billingCycle || "MONTHLY";
  const startDate = new Date();
  const endDate = new Date();
  if (cycle === "YEARLY") endDate.setFullYear(endDate.getFullYear() + 1);
  else endDate.setMonth(endDate.getMonth() + 1);

  const [sub] = await db.insert(hospitalSubscriptionsTable).values({
    hospitalId: id,
    planId: plan.id,
    status: "ACTIVE",
    price: plan.price,
    billingCycle: cycle,
    startDate,
    endDate,
    paymentMethod: "ADMIN_ASSIGN",
  }).returning();

  res.json({ message: "Subscription assigned successfully", subscription: sub });
});

export default router;
