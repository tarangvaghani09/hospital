import { Router, type IRouter } from "express";
import { eq, and, sql, desc } from "drizzle-orm";
import { db, usersTable, receptionistProfilesTable, appointmentsTable, invoicesTable } from "@workspace/db";
import { authenticate, requireRoles, requireHospital } from "../middlewares/authenticate";
import { hashPassword } from "../lib/auth";

const router: IRouter = Router();

router.get("/receptionists", authenticate, requireRoles("HOSPITAL_ADMIN"), async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
  const profiles = await db.select().from(receptionistProfilesTable).where(eq(receptionistProfilesTable.hospitalId, hospitalId));
  const enriched = await Promise.all(profiles.map(async (p) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, p.userId));
    return { id: p.id, userId: p.userId, name: user?.name ?? "", email: user?.email ?? "", phone: (user as any)?.phone ?? null, isActive: p.isActive, createdAt: p.createdAt.toISOString() };
  }));
  res.json(enriched);
});

router.post("/receptionists", authenticate, requireRoles("HOSPITAL_ADMIN"), async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) { res.status(400).json({ error: "Name, email, and password required" }); return; }

  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (existing) { res.status(400).json({ error: "Email already in use" }); return; }

  const hashed = await hashPassword(password);
  const [user] = await db.insert(usersTable).values({ email: email.toLowerCase(), password: hashed, name, role: "RECEPTIONIST", hospitalId }).returning();
  const [profile] = await db.insert(receptionistProfilesTable).values({ userId: user.id, hospitalId }).returning();

  res.status(201).json({ id: profile.id, userId: profile.userId, name: user.name, email: user.email, phone: phone ?? null, isActive: profile.isActive, createdAt: profile.createdAt.toISOString() });
});

router.patch("/receptionists/:id", authenticate, requireRoles("HOSPITAL_ADMIN"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const hospitalId = req.user!.hospitalId!;
  const [profile] = await db.select().from(receptionistProfilesTable).where(and(eq(receptionistProfilesTable.id, id), eq(receptionistProfilesTable.hospitalId, hospitalId)));
  if (!profile) { res.status(404).json({ error: "Receptionist not found" }); return; }

  const { name, phone, isActive } = req.body;
  if (name !== undefined || phone !== undefined) {
    await db.update(usersTable).set({
      ...(name !== undefined && { name }),
    }).where(eq(usersTable.id, profile.userId));
  }
  if (isActive !== undefined) await db.update(receptionistProfilesTable).set({ isActive }).where(eq(receptionistProfilesTable.id, id));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, profile.userId));
  const [updatedProfile] = await db.select().from(receptionistProfilesTable).where(eq(receptionistProfilesTable.id, id));
  res.json({ id: updatedProfile.id, userId: updatedProfile.userId, name: user.name, email: user.email, phone: (user as any)?.phone ?? null, isActive: updatedProfile.isActive, createdAt: updatedProfile.createdAt.toISOString() });
});

router.delete("/receptionists/:id", authenticate, requireRoles("HOSPITAL_ADMIN"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const hospitalId = req.user!.hospitalId!;
  const [profile] = await db.select().from(receptionistProfilesTable).where(and(eq(receptionistProfilesTable.id, id), eq(receptionistProfilesTable.hospitalId, hospitalId)));
  if (!profile) { res.status(404).json({ error: "Receptionist not found" }); return; }
  await db.update(usersTable).set({ isActive: false }).where(eq(usersTable.id, profile.userId));
  await db.update(receptionistProfilesTable).set({ isActive: false }).where(eq(receptionistProfilesTable.id, id));
  res.sendStatus(204);
});

// Receptionist dashboard
router.get("/receptionist/dashboard", authenticate, requireRoles("RECEPTIONIST"), async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
  const today = new Date().toISOString().split("T")[0];

  const todayAppts = await db.select().from(appointmentsTable).where(and(eq(appointmentsTable.hospitalId, hospitalId), eq(appointmentsTable.appointmentDate, today)));
  const checkedIn = todayAppts.filter(a => ["IN_PROGRESS", "CONFIRMED"].includes(a.status)).length;
  const waiting = todayAppts.filter(a => a.status === "SCHEDULED").length;
  const completed = todayAppts.filter(a => a.status === "COMPLETED").length;

  const dailyRev = await db.select({ total: sql<number>`sum(cast(total_amount as numeric))`, pending: sql<number>`sum(cast(due_amount as numeric))` })
    .from(invoicesTable).where(and(eq(invoicesTable.hospitalId, hospitalId), sql`date(created_at) = current_date`));

  const recentAppts = await db.select().from(appointmentsTable).where(and(eq(appointmentsTable.hospitalId, hospitalId), eq(appointmentsTable.appointmentDate, today))).orderBy(appointmentsTable.tokenNumber).limit(10);

  res.json({
    todayAppointments: todayAppts.length, checkedIn, waiting, completed,
    dailyCollection: Number(dailyRev[0]?.total ?? 0),
    pendingPayments: Number(dailyRev[0]?.pending ?? 0),
    recentAppointments: recentAppts.map(a => ({ ...a, patientName: "", doctorName: "" }))
  });
});

export default router;
