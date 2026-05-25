import { Router, type IRouter } from "express";
import { eq, and, like, sql, desc } from "drizzle-orm";
import { db, usersTable, doctorProfilesTable, doctorSchedulesTable, departmentsTable, appointmentsTable, invoicesTable } from "@workspace/db";
import { authenticate, requireRoles, requireHospital } from "../middlewares/authenticate";
import { hashPassword } from "../lib/auth";

const router: IRouter = Router();

async function enrichDoctor(d: any, u: any, dept: any) {
  return {
    id: d.id, userId: d.userId, name: u.name, email: u.email, phone: u.phone ?? null,
    specialization: d.specialization, qualification: d.qualification, experience: d.experience,
    consultationFee: d.consultationFee ? Number(d.consultationFee) : null,
    departmentId: d.departmentId, departmentName: dept?.name ?? null,
    avatarUrl: u.avatarUrl, isActive: d.isActive, createdAt: d.createdAt.toISOString()
  };
}

router.get("/doctors", authenticate, requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
  const { search, departmentId, status } = req.query as Record<string, string>;

  let doctorProfiles = await db.select().from(doctorProfilesTable).where(eq(doctorProfilesTable.hospitalId, hospitalId));
  if (departmentId) doctorProfiles = doctorProfiles.filter(d => d.departmentId === parseInt(departmentId));
  if (status === "active") doctorProfiles = doctorProfiles.filter(d => d.isActive);
  if (status === "inactive") doctorProfiles = doctorProfiles.filter(d => !d.isActive);

  const enriched = await Promise.all(doctorProfiles.map(async (d) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, d.userId));
    const [dept] = d.departmentId ? await db.select().from(departmentsTable).where(eq(departmentsTable.id, d.departmentId)) : [null];
    if (search && !user.name.toLowerCase().includes(search.toLowerCase())) return null;
    return enrichDoctor(d, user, dept);
  }));

  res.json(enriched.filter(Boolean));
});

router.post("/doctors", authenticate, requireRoles("HOSPITAL_ADMIN"), async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
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
  res.status(201).json(await enrichDoctor(profile, user, dept));
});

router.get("/doctors/:id", authenticate, requireHospital, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const hospitalId = req.user!.hospitalId!;
  const [profile] = await db.select().from(doctorProfilesTable).where(and(eq(doctorProfilesTable.id, id), eq(doctorProfilesTable.hospitalId, hospitalId)));
  if (!profile) { res.status(404).json({ error: "Doctor not found" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, profile.userId));
  const [dept] = profile.departmentId ? await db.select().from(departmentsTable).where(eq(departmentsTable.id, profile.departmentId)) : [null];
  res.json(await enrichDoctor(profile, user, dept));
});

router.patch("/doctors/:id", authenticate, requireRoles("HOSPITAL_ADMIN"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const hospitalId = req.user!.hospitalId!;
  const { name, phone, specialization, qualification, experience, consultationFee, departmentId, isActive } = req.body;

  const [profile] = await db.select().from(doctorProfilesTable).where(and(eq(doctorProfilesTable.id, id), eq(doctorProfilesTable.hospitalId, hospitalId)));
  if (!profile) { res.status(404).json({ error: "Doctor not found" }); return; }

  const profileUpdates: any = {};
  if (specialization !== undefined) profileUpdates.specialization = specialization;
  if (qualification !== undefined) profileUpdates.qualification = qualification;
  if (experience !== undefined) profileUpdates.experience = experience;
  if (consultationFee !== undefined) profileUpdates.consultationFee = String(consultationFee);
  if (departmentId !== undefined) profileUpdates.departmentId = departmentId;
  if (isActive !== undefined) profileUpdates.isActive = isActive;

  const [updatedProfile] = await db.update(doctorProfilesTable).set(profileUpdates).where(eq(doctorProfilesTable.id, id)).returning();

  if (name || phone) {
    const userUpdates: any = {};
    if (name) userUpdates.name = name;
    if (phone) userUpdates.phone = phone;
    await db.update(usersTable).set(userUpdates).where(eq(usersTable.id, profile.userId));
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, profile.userId));
  const [dept] = updatedProfile.departmentId ? await db.select().from(departmentsTable).where(eq(departmentsTable.id, updatedProfile.departmentId)) : [null];
  res.json(await enrichDoctor(updatedProfile, user, dept));
});

router.delete("/doctors/:id", authenticate, requireRoles("HOSPITAL_ADMIN"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const hospitalId = req.user!.hospitalId!;
  const [profile] = await db.select().from(doctorProfilesTable).where(and(eq(doctorProfilesTable.id, id), eq(doctorProfilesTable.hospitalId, hospitalId)));
  if (!profile) { res.status(404).json({ error: "Doctor not found" }); return; }
  await db.update(usersTable).set({ isActive: false }).where(eq(usersTable.id, profile.userId));
  await db.update(doctorProfilesTable).set({ isActive: false }).where(eq(doctorProfilesTable.id, id));
  res.sendStatus(204);
});

router.get("/doctors/:id/schedule", authenticate, requireHospital, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const schedules = await db.select().from(doctorSchedulesTable).where(eq(doctorSchedulesTable.doctorId, id));
  res.json(schedules.map(s => ({ ...s, createdAt: s.createdAt.toISOString() })));
});

router.put("/doctors/:id/schedule", authenticate, requireRoles("HOSPITAL_ADMIN", "DOCTOR"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const hospitalId = req.user!.hospitalId!;
  const { schedules } = req.body;

  await db.delete(doctorSchedulesTable).where(eq(doctorSchedulesTable.doctorId, id));
  if (schedules?.length) {
    await db.insert(doctorSchedulesTable).values(schedules.map((s: any) => ({ ...s, doctorId: id, hospitalId })));
  }
  res.json({ message: "Schedule updated" });
});

// Doctor dashboard
router.get("/doctor/dashboard", authenticate, requireRoles("DOCTOR"), async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const hospitalId = req.user!.hospitalId!;
  const today = new Date().toISOString().split("T")[0];

  const [doctorProfile] = await db.select().from(doctorProfilesTable).where(and(eq(doctorProfilesTable.userId, userId), eq(doctorProfilesTable.hospitalId, hospitalId)));
  if (!doctorProfile) { res.status(404).json({ error: "Doctor profile not found" }); return; }

  const todayAppts = await db.select().from(appointmentsTable).where(and(eq(appointmentsTable.doctorId, doctorProfile.id), eq(appointmentsTable.hospitalId, hospitalId), eq(appointmentsTable.appointmentDate, today)));
  const waiting = todayAppts.filter(a => ["SCHEDULED", "CONFIRMED"].includes(a.status));
  const completed = todayAppts.filter(a => a.status === "COMPLETED");
  const totalPatients = await db.select({ count: sql<number>`count(distinct patient_id)` }).from(appointmentsTable).where(and(eq(appointmentsTable.doctorId, doctorProfile.id), eq(appointmentsTable.hospitalId, hospitalId)));

  res.json({
    todayAppointments: todayAppts.length, waitingPatients: waiting.length, completedToday: completed.length,
    totalPatients: Number(totalPatients[0]?.count ?? 0),
    todaySchedule: todayAppts.map(a => ({ ...a, patientName: "", doctorName: req.user!.name })),
    recentPrescriptions: []
  });
});

export default router;
