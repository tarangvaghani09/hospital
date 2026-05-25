import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, supportTicketsTable, hospitalsTable, usersTable } from "@workspace/db";
import { authenticate, requireRoles } from "../middlewares/authenticate";

const router: IRouter = Router();

function formatTicket(t: any, hospitalName?: string | null) {
  return {
    id: t.id, subject: t.subject, message: t.message, status: t.status,
    priority: t.priority, hospitalName: hospitalName ?? null,
    resolvedAt: t.resolvedAt ? t.resolvedAt.toISOString() : null,
    createdAt: t.createdAt.toISOString()
  };
}

// Super admin: list all tickets
router.get("/admin/support-tickets", authenticate, requireRoles("SUPER_ADMIN"), async (req, res): Promise<void> => {
  const { status } = req.query as Record<string, string>;
  const tickets = status
    ? await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.status, status)).orderBy(desc(supportTicketsTable.createdAt))
    : await db.select().from(supportTicketsTable).orderBy(desc(supportTicketsTable.createdAt));

  const enriched = await Promise.all(tickets.map(async (t) => {
    const hospitalName = t.hospitalId
      ? (await db.select({ name: hospitalsTable.name }).from(hospitalsTable).where(eq(hospitalsTable.id, t.hospitalId)))[0]?.name ?? null
      : null;
    return formatTicket(t, hospitalName);
  }));
  res.json(enriched);
});

router.patch("/admin/support-tickets/:id", authenticate, requireRoles("SUPER_ADMIN"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const { status, resolution } = req.body;
  const updates: any = { status };
  if (resolution) updates.resolution = resolution;
  if (status === "RESOLVED") updates.resolvedAt = new Date();
  await db.update(supportTicketsTable).set(updates).where(eq(supportTicketsTable.id, id));
  res.json({ message: "Ticket updated" });
});

// Hospital: own tickets
router.get("/support-tickets", authenticate, async (req, res): Promise<void> => {
  const tickets = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.userId, req.user!.id)).orderBy(desc(supportTicketsTable.createdAt));
  res.json(tickets.map(t => formatTicket(t)));
});

router.post("/support-tickets", authenticate, async (req, res): Promise<void> => {
  const { subject, message, priority } = req.body;
  if (!subject || !message) { res.status(400).json({ error: "Subject and message required" }); return; }
  const [ticket] = await db.insert(supportTicketsTable).values({
    hospitalId: req.user!.hospitalId ?? null, userId: req.user!.id,
    subject, message, priority: priority ?? "MEDIUM"
  }).returning();
  res.status(201).json(formatTicket(ticket));
});

export default router;
