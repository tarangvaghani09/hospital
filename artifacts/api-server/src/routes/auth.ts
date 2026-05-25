import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, hospitalsTable, hospitalSettingsTable, patientProfilesTable, doctorProfilesTable, receptionistProfilesTable } from "@workspace/db";
import { signToken, hashPassword, comparePassword, generateCode } from "../lib/auth";
import { authenticate } from "../middlewares/authenticate";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (!user || !user.isActive) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await comparePassword(password, user.password);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  let hospitalName: string | null = null;
  if (user.hospitalId) {
    const [hosp] = await db.select({ name: hospitalsTable.name }).from(hospitalsTable).where(eq(hospitalsTable.id, user.hospitalId));
    hospitalName = hosp?.name ?? null;
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name, hospitalId: user.hospitalId ?? null });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name, hospitalId: user.hospitalId, hospitalName, avatarUrl: user.avatarUrl } });
});

router.post("/auth/register-hospital", async (req, res): Promise<void> => {
  const { hospitalName, adminName, email, password, phone, address } = req.body;
  if (!hospitalName || !adminName || !email || !password || !phone) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const hashed = await hashPassword(password);
  const code = generateCode(hospitalName);

  const [hospital] = await db.insert(hospitalsTable).values({ name: hospitalName, code, phone, address, status: "ACTIVE" }).returning();
  await db.insert(hospitalSettingsTable).values({ hospitalId: hospital.id });

  const [adminUser] = await db.insert(usersTable).values({
    email: email.toLowerCase(), password: hashed, name: adminName, role: "HOSPITAL_ADMIN", hospitalId: hospital.id
  }).returning();

  const token = signToken({ id: adminUser.id, email: adminUser.email, role: adminUser.role, name: adminUser.name, hospitalId: hospital.id });
  res.status(201).json({ token, user: { id: adminUser.id, email: adminUser.email, role: adminUser.role, name: adminUser.name, hospitalId: hospital.id, hospitalName: hospital.name, avatarUrl: null } });
});

router.post("/auth/register-patient", async (req, res): Promise<void> => {
  const { name, email, password, phone, hospitalCode, dateOfBirth, gender, address } = req.body;
  if (!name || !email || !password || !phone || !hospitalCode) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [hospital] = await db.select().from(hospitalsTable).where(eq(hospitalsTable.code, hospitalCode.toUpperCase()));
  if (!hospital) {
    res.status(400).json({ error: "Invalid hospital code" });
    return;
  }

  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const hashed = await hashPassword(password);
  const [user] = await db.insert(usersTable).values({
    email: email.toLowerCase(), password: hashed, name, role: "PATIENT", hospitalId: hospital.id
  }).returning();

  const count = await db.select().from(patientProfilesTable).where(eq(patientProfilesTable.hospitalId, hospital.id));
  const patientId = `PAT-${hospital.id}-${String(count.length + 1).padStart(4, "0")}`;
  await db.insert(patientProfilesTable).values({ hospitalId: hospital.id, userId: user.id, patientId, name, email: email.toLowerCase(), phone, dateOfBirth: dateOfBirth ?? null, gender: gender ?? null, address: address ?? null });

  const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name, hospitalId: hospital.id });
  res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name, hospitalId: hospital.id, hospitalName: hospital.name, avatarUrl: null } });
});

router.get("/auth/me", authenticate, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  let hospitalName: string | null = null;
  if (user.hospitalId) {
    const [hosp] = await db.select({ name: hospitalsTable.name }).from(hospitalsTable).where(eq(hospitalsTable.id, user.hospitalId));
    hospitalName = hosp?.name ?? null;
  }

  res.json({ id: user.id, email: user.email, role: user.role, name: user.name, hospitalId: user.hospitalId, hospitalName, avatarUrl: user.avatarUrl });
});

router.post("/auth/change-password", authenticate, async (req, res): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) { res.status(400).json({ error: "Missing fields" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const valid = await comparePassword(currentPassword, user.password);
  if (!valid) { res.status(400).json({ error: "Incorrect current password" }); return; }

  const hashed = await hashPassword(newPassword);
  await db.update(usersTable).set({ password: hashed }).where(eq(usersTable.id, user.id));
  res.json({ message: "Password changed successfully" });
});

export default router;
