import { Router, type IRouter } from "express";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { db, appointmentsTable, patientProfilesTable, doctorProfilesTable, usersTable, departmentsTable, doctorSchedulesTable, hospitalSettingsTable } from "@workspace/db";
import { authenticate, requireHospital } from "../middlewares/authenticate";

const router: IRouter = Router();

async function enrichAppointment(a: any) {
  const [patient] = await db.select({ name: patientProfilesTable.name, phone: patientProfilesTable.phone }).from(patientProfilesTable).where(eq(patientProfilesTable.id, a.patientId));
  const [doctorProfile] = await db.select().from(doctorProfilesTable).where(eq(doctorProfilesTable.id, a.doctorId));
  const [doctorUser] = doctorProfile ? await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, doctorProfile.userId)) : [null];
  const [dept] = a.departmentId ? await db.select({ name: departmentsTable.name }).from(departmentsTable).where(eq(departmentsTable.id, a.departmentId)) : [null];
  return {
    ...a,
    patientName: patient?.name ?? "",
    patientPhone: patient?.phone ?? null,
    doctorName: doctorUser?.name ?? "",
    departmentName: dept?.name ?? null,
    createdAt: a.createdAt.toISOString()
  };
}

router.get("/appointments", authenticate, requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
  const { doctorId, patientId, status, date, startDate, endDate, departmentId, appointmentType, page = 1, limit = 20 } = req.query as Record<string, string>;

  const conditions: any[] = [eq(appointmentsTable.hospitalId, hospitalId)];
  if (doctorId) conditions.push(eq(appointmentsTable.doctorId, parseInt(doctorId)));
  if (patientId) conditions.push(eq(appointmentsTable.patientId, parseInt(patientId)));
  if (status) conditions.push(eq(appointmentsTable.status, status));
  if (date) conditions.push(eq(appointmentsTable.appointmentDate, date));
  if (startDate) conditions.push(gte(appointmentsTable.appointmentDate, startDate));
  if (endDate) conditions.push(lte(appointmentsTable.appointmentDate, endDate));
  if (departmentId) conditions.push(eq(appointmentsTable.departmentId, parseInt(departmentId)));
  if (appointmentType) conditions.push(eq(appointmentsTable.appointmentType, appointmentType));

  // Role-based filtering
  if (req.user!.role === "DOCTOR") {
    const [doctorProfile] = await db.select({ id: doctorProfilesTable.id }).from(doctorProfilesTable).where(and(eq(doctorProfilesTable.userId, req.user!.id), eq(doctorProfilesTable.hospitalId, hospitalId)));
    if (doctorProfile) conditions.push(eq(appointmentsTable.doctorId, doctorProfile.id));
  }
  if (req.user!.role === "PATIENT") {
    const [patientProfile] = await db.select({ id: patientProfilesTable.id }).from(patientProfilesTable).where(and(eq(patientProfilesTable.userId, req.user!.id), eq(patientProfilesTable.hospitalId, hospitalId)));
    if (patientProfile) conditions.push(eq(appointmentsTable.patientId, patientProfile.id));
  }

  const offset = (Number(page) - 1) * Number(limit);
  const appointments = await db.select().from(appointmentsTable).where(and(...conditions)).orderBy(desc(appointmentsTable.createdAt)).limit(Number(limit)).offset(offset);
  const [total] = await db.select({ count: sql<number>`count(*)` }).from(appointmentsTable).where(and(...conditions));

  const enriched = await Promise.all(appointments.map(enrichAppointment));
  res.json({ appointments: enriched, total: Number(total?.count ?? 0), page: Number(page), limit: Number(limit) });
});

router.post("/appointments", authenticate, requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
  const { patientId, doctorId, departmentId, appointmentDate, appointmentTime, appointmentType, symptoms, notes, roomNumber } = req.body;

  if (!patientId || !doctorId || !appointmentDate || !appointmentTime) {
    res.status(400).json({ error: "patientId, doctorId, appointmentDate, appointmentTime required" });
    return;
  }

  // Generate token number for the day+doctor
  const [tokenResult] = await db.select({ max: sql<number>`coalesce(max(token_number), 0)` })
    .from(appointmentsTable)
    .where(and(eq(appointmentsTable.hospitalId, hospitalId), eq(appointmentsTable.doctorId, doctorId), eq(appointmentsTable.appointmentDate, appointmentDate)));
  const tokenNumber = Number(tokenResult?.max ?? 0) + 1;

  const [appointment] = await db.insert(appointmentsTable).values({
    hospitalId, patientId, doctorId, departmentId: departmentId ?? null,
    appointmentDate, appointmentTime, tokenNumber,
    appointmentType: appointmentType ?? "WALK_IN",
    symptoms: symptoms ?? null, notes: notes ?? null, roomNumber: roomNumber ?? null
  }).returning();

  res.status(201).json(await enrichAppointment(appointment));
});

router.get("/appointments/calendar", authenticate, requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
  const { startDate, endDate, doctorId, departmentId } = req.query as Record<string, string>;

  if (!startDate || !endDate) { res.status(400).json({ error: "startDate and endDate required" }); return; }

  const conditions: any[] = [eq(appointmentsTable.hospitalId, hospitalId), gte(appointmentsTable.appointmentDate, startDate), lte(appointmentsTable.appointmentDate, endDate)];
  if (doctorId) conditions.push(eq(appointmentsTable.doctorId, parseInt(doctorId)));
  if (departmentId) conditions.push(eq(appointmentsTable.departmentId, parseInt(departmentId)));

  // Role filter
  if (req.user!.role === "DOCTOR") {
    const [dp] = await db.select({ id: doctorProfilesTable.id }).from(doctorProfilesTable).where(and(eq(doctorProfilesTable.userId, req.user!.id), eq(doctorProfilesTable.hospitalId, hospitalId)));
    if (dp) conditions.push(eq(appointmentsTable.doctorId, dp.id));
  }

  const appointments = await db.select().from(appointmentsTable).where(and(...conditions));
  const enriched = await Promise.all(appointments.map(async (a) => {
    const e = await enrichAppointment(a);
    const statusColors: Record<string, string> = {
      SCHEDULED: "#3b82f6", CONFIRMED: "#6366f1", IN_PROGRESS: "#f59e0b",
      COMPLETED: "#22c55e", CANCELLED: "#ef4444", NO_SHOW: "#9ca3af"
    };
    return {
      id: e.id, title: `${e.patientName} — Dr. ${e.doctorName}`,
      start: `${a.appointmentDate}T${a.appointmentTime}:00`,
      end: `${a.appointmentDate}T${a.appointmentTime}:00`,
      patientName: e.patientName, doctorName: e.doctorName, departmentName: e.departmentName,
      tokenNumber: a.tokenNumber, status: a.status, appointmentType: a.appointmentType,
      paymentStatus: a.paymentStatus, color: statusColors[a.status] ?? "#3b82f6"
    };
  }));

  res.json(enriched);
});

router.get("/appointments/available-slots", authenticate, requireHospital, async (req, res): Promise<void> => {
  const { doctorId, date } = req.query as Record<string, string>;
  if (!doctorId || !date) { res.status(400).json({ error: "doctorId and date required" }); return; }
  const hospitalId = req.user!.hospitalId!;

  // Get hospital open/close times
  const [settings] = await db.select({ hospitalOpenTime: hospitalSettingsTable.hospitalOpenTime, hospitalCloseTime: hospitalSettingsTable.hospitalCloseTime })
    .from(hospitalSettingsTable).where(eq(hospitalSettingsTable.hospitalId, hospitalId));
  const hospitalOpen = (settings as any)?.hospitalOpenTime ?? "08:00";
  const hospitalClose = (settings as any)?.hospitalCloseTime ?? "20:00";

  const dayOfWeek = new Date(date + "T12:00:00").getDay();
  const [schedule] = await db.select().from(doctorSchedulesTable)
    .where(and(eq(doctorSchedulesTable.doctorId, parseInt(doctorId)), eq(doctorSchedulesTable.dayOfWeek, dayOfWeek), eq(doctorSchedulesTable.isAvailable, true)));

  if (!schedule) { res.json([]); return; }

  const bookedAppts = await db.select({ time: appointmentsTable.appointmentTime }).from(appointmentsTable)
    .where(and(eq(appointmentsTable.doctorId, parseInt(doctorId)), eq(appointmentsTable.appointmentDate, date), eq(appointmentsTable.hospitalId, hospitalId)));
  const bookedTimes = new Set(bookedAppts.map(a => a.appointmentTime));

  // Current time for today's filtering
  const todayStr = new Date().toISOString().split("T")[0];
  const isToday = date === todayStr;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Effective start/end = intersection of doctor schedule and hospital hours
  const [dStartH, dStartM] = schedule.startTime.split(":").map(Number);
  const [dEndH, dEndM] = schedule.endTime.split(":").map(Number);
  const [hOpenH, hOpenM] = hospitalOpen.split(":").map(Number);
  const [hCloseH, hCloseM] = hospitalClose.split(":").map(Number);

  const effectiveStart = Math.max(dStartH * 60 + dStartM, hOpenH * 60 + hOpenM);
  const effectiveEnd = Math.min(dEndH * 60 + dEndM, hCloseH * 60 + hCloseM);
  const duration = schedule.slotDuration ?? 30;

  let currentMinutes = effectiveStart;
  let token = 1;
  const slots: { time: string; available: boolean; tokenNumber: number | null }[] = [];

  while (currentMinutes < effectiveEnd) {
    // Skip past times when date is today
    if (!isToday || currentMinutes > nowMinutes) {
      const h = Math.floor(currentMinutes / 60).toString().padStart(2, "0");
      const m = (currentMinutes % 60).toString().padStart(2, "0");
      const time = `${h}:${m}`;
      const available = !bookedTimes.has(time);
      slots.push({ time, available, tokenNumber: available ? null : token });
      if (!available) token++;
    }
    currentMinutes += duration;
  }

  res.json(slots);
});

router.get("/appointments/:id", authenticate, requireHospital, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const hospitalId = req.user!.hospitalId!;
  const [appointment] = await db.select().from(appointmentsTable).where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.hospitalId, hospitalId)));
  if (!appointment) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.json(await enrichAppointment(appointment));
});

router.patch("/appointments/:id", authenticate, requireHospital, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const hospitalId = req.user!.hospitalId!;
  const [appointment] = await db.update(appointmentsTable).set(req.body).where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.hospitalId, hospitalId))).returning();
  if (!appointment) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.json(await enrichAppointment(appointment));
});

router.delete("/appointments/:id", authenticate, requireHospital, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const hospitalId = req.user!.hospitalId!;
  await db.update(appointmentsTable).set({ status: "CANCELLED" }).where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.hospitalId, hospitalId)));
  res.sendStatus(204);
});

router.patch("/appointments/:id/status", authenticate, requireHospital, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const hospitalId = req.user!.hospitalId!;
  const { status, notes } = req.body;
  const updates: any = { status };
  if (notes) updates.notes = notes;
  const [appointment] = await db.update(appointmentsTable).set(updates).where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.hospitalId, hospitalId))).returning();
  if (!appointment) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.json(await enrichAppointment(appointment));
});

export default router;
