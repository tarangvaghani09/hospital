import { Router, type IRouter } from "express";
import { eq, and, ilike, sql, desc, or } from "drizzle-orm";
import { db, patientProfilesTable, appointmentsTable, prescriptionsTable, invoicesTable, prescriptionMedicinesTable, invoiceItemsTable } from "@workspace/db";
import { authenticate, requireHospital, requireRoles } from "../middlewares/authenticate";

const router: IRouter = Router();

function formatPatient(p: any) {
  return { ...p, createdAt: p.createdAt.toISOString() };
}

router.get("/patients", authenticate, requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
  const { search, page = 1, limit = 20 } = req.query as Record<string, string>;
  const offset = (Number(page) - 1) * Number(limit);

  let query = db.select().from(patientProfilesTable).where(eq(patientProfilesTable.hospitalId, hospitalId));

  let patients;
  if (search) {
    patients = await db.select().from(patientProfilesTable).where(and(
      eq(patientProfilesTable.hospitalId, hospitalId),
      or(
        ilike(patientProfilesTable.name, `%${search}%`),
        ilike(patientProfilesTable.phone, `%${search}%`),
        ilike(patientProfilesTable.patientId, `%${search}%`)
      )
    )).orderBy(desc(patientProfilesTable.createdAt)).limit(Number(limit)).offset(offset);
  } else {
    patients = await db.select().from(patientProfilesTable).where(eq(patientProfilesTable.hospitalId, hospitalId)).orderBy(desc(patientProfilesTable.createdAt)).limit(Number(limit)).offset(offset);
  }

  const [total] = await db.select({ count: sql<number>`count(*)` }).from(patientProfilesTable).where(eq(patientProfilesTable.hospitalId, hospitalId));

  res.json({ patients: patients.map(formatPatient), total: Number(total?.count ?? 0), page: Number(page), limit: Number(limit) });
});

router.post("/patients", authenticate, requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
  const { name, email, phone, dateOfBirth, gender, bloodGroup, address, emergencyContact, allergies } = req.body;
  if (!name || !phone) { res.status(400).json({ error: "Name and phone required" }); return; }

  const count = await db.select({ c: sql<number>`count(*)` }).from(patientProfilesTable).where(eq(patientProfilesTable.hospitalId, hospitalId));
  const patientId = `PAT-${hospitalId}-${String(Number(count[0]?.c ?? 0) + 1).padStart(4, "0")}`;

  const [patient] = await db.insert(patientProfilesTable).values({
    hospitalId, patientId, name, email: email ?? null, phone, dateOfBirth: dateOfBirth ?? null,
    gender: gender ?? null, bloodGroup: bloodGroup ?? null, address: address ?? null,
    emergencyContact: emergencyContact ?? null, allergies: allergies ?? null
  }).returning();
  res.status(201).json(formatPatient(patient));
});

router.get("/patients/:id", authenticate, requireHospital, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const hospitalId = req.user!.hospitalId!;
  const [patient] = await db.select().from(patientProfilesTable).where(and(eq(patientProfilesTable.id, id), eq(patientProfilesTable.hospitalId, hospitalId)));
  if (!patient) { res.status(404).json({ error: "Patient not found" }); return; }
  res.json(formatPatient(patient));
});

router.patch("/patients/:id", authenticate, requireHospital, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const hospitalId = req.user!.hospitalId!;
  const [patient] = await db.update(patientProfilesTable).set(req.body).where(and(eq(patientProfilesTable.id, id), eq(patientProfilesTable.hospitalId, hospitalId))).returning();
  if (!patient) { res.status(404).json({ error: "Patient not found" }); return; }
  res.json(formatPatient(patient));
});

router.get("/patients/:id/history", authenticate, requireHospital, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const hospitalId = req.user!.hospitalId!;
  const [patient] = await db.select().from(patientProfilesTable).where(and(eq(patientProfilesTable.id, id), eq(patientProfilesTable.hospitalId, hospitalId)));
  if (!patient) { res.status(404).json({ error: "Patient not found" }); return; }

  const appointments = await db.select().from(appointmentsTable).where(and(eq(appointmentsTable.patientId, id), eq(appointmentsTable.hospitalId, hospitalId))).orderBy(desc(appointmentsTable.appointmentDate)).limit(20);
  const prescriptions = await db.select().from(prescriptionsTable).where(and(eq(prescriptionsTable.patientId, id), eq(prescriptionsTable.hospitalId, hospitalId))).orderBy(desc(prescriptionsTable.createdAt)).limit(10);
  const invoices = await db.select().from(invoicesTable).where(and(eq(invoicesTable.patientId, id), eq(invoicesTable.hospitalId, hospitalId))).orderBy(desc(invoicesTable.createdAt)).limit(10);

  res.json({
    patient: formatPatient(patient),
    appointments: appointments.map(a => ({ ...a, patientName: patient.name, doctorName: "" })),
    prescriptions: prescriptions.map(p => ({ ...p, patientName: patient.name, doctorName: "", doctorSpecialization: null, medicines: [], createdAt: p.createdAt.toISOString() })),
    invoices: invoices.map(i => ({ ...i, invoiceNumber: i.invoiceNumber, patientName: patient.name, doctorName: null, items: [], subtotal: Number(i.subtotal), discountAmount: Number(i.discountAmount), taxAmount: Number(i.taxAmount), taxPercentage: Number(i.taxPercentage), totalAmount: Number(i.totalAmount), paidAmount: Number(i.paidAmount), dueAmount: Number(i.dueAmount), createdAt: i.createdAt.toISOString() }))
  });
});

// Patient dashboard
router.get("/patient/dashboard", authenticate, requireRoles("PATIENT"), async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const hospitalId = req.user!.hospitalId!;
  const [profile] = await db.select().from(patientProfilesTable).where(and(eq(patientProfilesTable.userId, userId), eq(patientProfilesTable.hospitalId, hospitalId)));
  if (!profile) { res.json({ upcomingAppointments: 0, totalVisits: 0, pendingBills: 0, recentAppointments: [], recentPrescriptions: [] }); return; }

  const today = new Date().toISOString().split("T")[0];
  const upcoming = await db.select().from(appointmentsTable).where(and(eq(appointmentsTable.patientId, profile.id), eq(appointmentsTable.hospitalId, hospitalId), sql`appointment_date >= ${today}`)).orderBy(appointmentsTable.appointmentDate).limit(5);
  const total = await db.select({ count: sql<number>`count(*)` }).from(appointmentsTable).where(and(eq(appointmentsTable.patientId, profile.id), eq(appointmentsTable.hospitalId, hospitalId)));
  const pendingBills = await db.select({ total: sql<number>`sum(cast(due_amount as numeric))` }).from(invoicesTable).where(and(eq(invoicesTable.patientId, profile.id), sql`status != 'PAID'`));
  const recentPresc = await db.select().from(prescriptionsTable).where(and(eq(prescriptionsTable.patientId, profile.id), eq(prescriptionsTable.hospitalId, hospitalId))).orderBy(desc(prescriptionsTable.createdAt)).limit(3);

  res.json({
    upcomingAppointments: upcoming.length,
    totalVisits: Number(total[0]?.count ?? 0),
    pendingBills: Number(pendingBills[0]?.total ?? 0),
    recentAppointments: upcoming.map(a => ({ ...a, patientName: profile.name, doctorName: "" })),
    recentPrescriptions: recentPresc.map(p => ({ ...p, patientName: profile.name, doctorName: "", doctorSpecialization: null, medicines: [], createdAt: p.createdAt.toISOString() }))
  });
});

export default router;
