import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, prescriptionsTable, prescriptionMedicinesTable, patientProfilesTable, doctorProfilesTable, usersTable } from "@workspace/db";
import { authenticate, requireHospital } from "../middlewares/authenticate";

const router: IRouter = Router();

async function enrichPrescription(p: any) {
  const [patient] = await db.select({ name: patientProfilesTable.name }).from(patientProfilesTable).where(eq(patientProfilesTable.id, p.patientId));
  const [doctorProfile] = await db.select({ userId: doctorProfilesTable.userId, specialization: doctorProfilesTable.specialization }).from(doctorProfilesTable).where(eq(doctorProfilesTable.id, p.doctorId));
  const [doctorUser] = doctorProfile ? await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, doctorProfile.userId)) : [null];
  const medicines = await db.select().from(prescriptionMedicinesTable).where(eq(prescriptionMedicinesTable.prescriptionId, p.id));
  return {
    ...p, patientName: patient?.name ?? "", doctorName: doctorUser?.name ?? "",
    doctorSpecialization: doctorProfile?.specialization ?? null,
    medicines: medicines.map(m => ({ ...m, createdAt: undefined })),
    createdAt: p.createdAt.toISOString()
  };
}

router.get("/prescriptions", authenticate, requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
  const { patientId, doctorId, appointmentId } = req.query as Record<string, string>;

  const conditions: any[] = [eq(prescriptionsTable.hospitalId, hospitalId)];
  if (patientId) conditions.push(eq(prescriptionsTable.patientId, parseInt(patientId)));
  if (doctorId) conditions.push(eq(prescriptionsTable.doctorId, parseInt(doctorId)));
  if (appointmentId) conditions.push(eq(prescriptionsTable.appointmentId, parseInt(appointmentId)));

  // Role filter
  if (req.user!.role === "DOCTOR") {
    const [dp] = await db.select({ id: doctorProfilesTable.id }).from(doctorProfilesTable).where(and(eq(doctorProfilesTable.userId, req.user!.id), eq(doctorProfilesTable.hospitalId, hospitalId)));
    if (dp) conditions.push(eq(prescriptionsTable.doctorId, dp.id));
  }
  if (req.user!.role === "PATIENT") {
    const [pp] = await db.select({ id: patientProfilesTable.id }).from(patientProfilesTable).where(and(eq(patientProfilesTable.userId, req.user!.id), eq(patientProfilesTable.hospitalId, hospitalId)));
    if (pp) conditions.push(eq(prescriptionsTable.patientId, pp.id));
    else { res.json([]); return; }
  }

  const prescriptions = await db.select().from(prescriptionsTable).where(and(...conditions)).orderBy(desc(prescriptionsTable.createdAt));
  const enriched = await Promise.all(prescriptions.map(enrichPrescription));
  res.json(enriched);
});

router.post("/prescriptions", authenticate, requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
  const { patientId, doctorId, appointmentId, symptoms, diagnosis, medicines, advice, followUpDate } = req.body;

  if (!patientId || !doctorId) { res.status(400).json({ error: "patientId and doctorId required" }); return; }

  const [prescription] = await db.insert(prescriptionsTable).values({
    hospitalId, patientId, doctorId, appointmentId: appointmentId ?? null,
    symptoms: symptoms ?? null, diagnosis: diagnosis ?? null,
    advice: advice ?? null, followUpDate: followUpDate ?? null
  }).returning();

  if (medicines?.length) {
    await db.insert(prescriptionMedicinesTable).values(medicines.map((m: any) => ({
      prescriptionId: prescription.id, name: m.name, dosage: m.dosage,
      timing: m.timing, duration: m.duration, instructions: m.instructions ?? null
    })));
  }

  res.status(201).json(await enrichPrescription(prescription));
});

router.get("/prescriptions/:id", authenticate, requireHospital, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const hospitalId = req.user!.hospitalId!;
  const [prescription] = await db.select().from(prescriptionsTable).where(and(eq(prescriptionsTable.id, id), eq(prescriptionsTable.hospitalId, hospitalId)));
  if (!prescription) { res.status(404).json({ error: "Prescription not found" }); return; }
  res.json(await enrichPrescription(prescription));
});

router.patch("/prescriptions/:id", authenticate, requireHospital, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const hospitalId = req.user!.hospitalId!;
  const { symptoms, diagnosis, medicines, advice, followUpDate } = req.body;

  const updates: any = {};
  if (symptoms !== undefined) updates.symptoms = symptoms;
  if (diagnosis !== undefined) updates.diagnosis = diagnosis;
  if (advice !== undefined) updates.advice = advice;
  if (followUpDate !== undefined) updates.followUpDate = followUpDate;

  const [prescription] = await db.update(prescriptionsTable).set(updates).where(and(eq(prescriptionsTable.id, id), eq(prescriptionsTable.hospitalId, hospitalId))).returning();
  if (!prescription) { res.status(404).json({ error: "Prescription not found" }); return; }

  if (medicines?.length) {
    await db.delete(prescriptionMedicinesTable).where(eq(prescriptionMedicinesTable.prescriptionId, id));
    await db.insert(prescriptionMedicinesTable).values(medicines.map((m: any) => ({
      prescriptionId: id, name: m.name, dosage: m.dosage, timing: m.timing, duration: m.duration, instructions: m.instructions ?? null
    })));
  }

  res.json(await enrichPrescription(prescription));
});

router.delete("/prescriptions/:id", authenticate, requireHospital, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const hospitalId = req.user!.hospitalId!;

  const [existing] = await db
    .select({ id: prescriptionsTable.id })
    .from(prescriptionsTable)
    .where(and(eq(prescriptionsTable.id, id), eq(prescriptionsTable.hospitalId, hospitalId)));
  if (!existing) {
    res.status(404).json({ error: "Prescription not found" });
    return;
  }

  await db.delete(prescriptionMedicinesTable).where(eq(prescriptionMedicinesTable.prescriptionId, id));
  await db.delete(prescriptionsTable).where(and(eq(prescriptionsTable.id, id), eq(prescriptionsTable.hospitalId, hospitalId)));

  res.status(204).send();
});

export default router;
