import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, departmentsTable, doctorProfilesTable } from "@workspace/db";
import { authenticate, requireRoles, requireHospital } from "../middlewares/authenticate";

const router: IRouter = Router();

router.get("/departments", authenticate, requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
  const departments = await db.select().from(departmentsTable).where(eq(departmentsTable.hospitalId, hospitalId));
  const enriched = await Promise.all(departments.map(async (d) => {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(doctorProfilesTable)
      .where(and(eq(doctorProfilesTable.departmentId, d.id), eq(doctorProfilesTable.hospitalId, hospitalId)));
    return { ...d, doctorCount: Number(result?.count ?? 0) };
  }));
  res.json(enriched);
});

router.post("/departments", authenticate, requireRoles("HOSPITAL_ADMIN"), async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
  const { name, description } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const [dept] = await db.insert(departmentsTable).values({ hospitalId, name, description: description ?? null }).returning();
  res.status(201).json({ ...dept, doctorCount: 0 });
});

router.get("/departments/:id", authenticate, requireHospital, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const hospitalId = req.user!.hospitalId!;
  const [dept] = await db.select().from(departmentsTable).where(and(eq(departmentsTable.id, id), eq(departmentsTable.hospitalId, hospitalId)));
  if (!dept) { res.status(404).json({ error: "Department not found" }); return; }
  res.json({ ...dept, doctorCount: 0 });
});

router.patch("/departments/:id", authenticate, requireRoles("HOSPITAL_ADMIN"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const hospitalId = req.user!.hospitalId!;
  const [dept] = await db.update(departmentsTable).set(req.body).where(and(eq(departmentsTable.id, id), eq(departmentsTable.hospitalId, hospitalId))).returning();
  if (!dept) { res.status(404).json({ error: "Department not found" }); return; }
  res.json({ ...dept, doctorCount: 0 });
});

router.delete("/departments/:id", authenticate, requireRoles("HOSPITAL_ADMIN"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const hospitalId = req.user!.hospitalId!;
  await db.delete(departmentsTable).where(and(eq(departmentsTable.id, id), eq(departmentsTable.hospitalId, hospitalId)));
  res.sendStatus(204);
});

export default router;
