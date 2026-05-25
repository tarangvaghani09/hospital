import { Router, type IRouter } from "express";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { db, invoicesTable, invoiceItemsTable, patientProfilesTable, doctorProfilesTable, usersTable, hospitalSettingsTable } from "@workspace/db";
import { authenticate, requireHospital } from "../middlewares/authenticate";

const router: IRouter = Router();

async function enrichInvoice(inv: any) {
  const [patient] = await db.select({ name: patientProfilesTable.name, phone: patientProfilesTable.phone }).from(patientProfilesTable).where(eq(patientProfilesTable.id, inv.patientId));
  let doctorName: string | null = null;
  if (inv.doctorId) {
    const [dp] = await db.select({ userId: doctorProfilesTable.userId }).from(doctorProfilesTable).where(eq(doctorProfilesTable.id, inv.doctorId));
    if (dp) {
      const [du] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, dp.userId));
      doctorName = du?.name ?? null;
    }
  }
  const items = await db.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, inv.id));
  return {
    ...inv, patientName: patient?.name ?? "", patientPhone: patient?.phone ?? null,
    doctorName, items: items.map(i => ({ ...i, unitPrice: Number(i.unitPrice), amount: Number(i.amount) })),
    subtotal: Number(inv.subtotal), discountAmount: Number(inv.discountAmount),
    taxAmount: Number(inv.taxAmount), taxPercentage: Number(inv.taxPercentage),
    totalAmount: Number(inv.totalAmount), paidAmount: Number(inv.paidAmount),
    dueAmount: Number(inv.dueAmount), createdAt: inv.createdAt.toISOString()
  };
}

router.get("/invoices", authenticate, requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
  const { patientId, doctorId, status, paymentMethod, startDate, endDate, page = 1, limit = 20 } = req.query as Record<string, string>;

  const conditions: any[] = [eq(invoicesTable.hospitalId, hospitalId)];
  if (patientId) conditions.push(eq(invoicesTable.patientId, parseInt(patientId)));
  if (doctorId) conditions.push(eq(invoicesTable.doctorId, parseInt(doctorId)));
  if (status) conditions.push(eq(invoicesTable.status, status));
  if (paymentMethod) conditions.push(eq(invoicesTable.paymentMethod, paymentMethod));
  if (startDate) conditions.push(gte(invoicesTable.createdAt, new Date(startDate)));
  if (endDate) conditions.push(lte(invoicesTable.createdAt, new Date(endDate)));

  // Patient role filter
  if (req.user!.role === "PATIENT") {
    const [profile] = await db.select({ id: patientProfilesTable.id }).from(patientProfilesTable).where(and(eq(patientProfilesTable.userId, req.user!.id), eq(patientProfilesTable.hospitalId, hospitalId)));
    if (profile) conditions.push(eq(invoicesTable.patientId, profile.id));
    else { res.json({ invoices: [], total: 0, page: 1, limit: 20 }); return; }
  }

  const offset = (Number(page) - 1) * Number(limit);
  const invoices = await db.select().from(invoicesTable).where(and(...conditions)).orderBy(desc(invoicesTable.createdAt)).limit(Number(limit)).offset(offset);
  const [total] = await db.select({ count: sql<number>`count(*)` }).from(invoicesTable).where(and(...conditions));

  const enriched = await Promise.all(invoices.map(enrichInvoice));
  res.json({ invoices: enriched, total: Number(total?.count ?? 0), page: Number(page), limit: Number(limit) });
});

router.post("/invoices", authenticate, requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
  const { patientId, doctorId, appointmentId, items, discountAmount = 0, taxPercentage = 0, status = "UNPAID", paymentMethod, paidAmount = 0, notes } = req.body;

  if (!patientId || !items?.length) { res.status(400).json({ error: "patientId and items required" }); return; }

  // Generate invoice number
  const [settings] = await db.select({ invoicePrefix: hospitalSettingsTable.invoicePrefix, invoiceStartNumber: hospitalSettingsTable.invoiceStartNumber })
    .from(hospitalSettingsTable).where(eq(hospitalSettingsTable.hospitalId, hospitalId));
  const [lastInv] = await db.select({ max: sql<number>`count(*)` }).from(invoicesTable).where(eq(invoicesTable.hospitalId, hospitalId));
  const seq = (settings?.invoiceStartNumber ?? 1001) + Number(lastInv?.max ?? 0);
  const invoiceNumber = `${settings?.invoicePrefix ?? "INV"}-${seq}`;

  const subtotal = items.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
  const discount = Number(discountAmount);
  const taxPct = Number(taxPercentage);
  const taxAmount = ((subtotal - discount) * taxPct) / 100;
  const totalAmount = subtotal - discount + taxAmount;
  const paid = Number(paidAmount);
  const dueAmount = Math.max(0, totalAmount - paid);

  const finalStatus = paid >= totalAmount ? "PAID" : paid > 0 ? "PARTIAL" : status;

  const [invoice] = await db.insert(invoicesTable).values({
    hospitalId, invoiceNumber, patientId, doctorId: doctorId ?? null, appointmentId: appointmentId ?? null,
    subtotal: String(subtotal), discountAmount: String(discount), taxPercentage: String(taxPct),
    taxAmount: String(taxAmount), totalAmount: String(totalAmount), paidAmount: String(paid),
    dueAmount: String(dueAmount), status: finalStatus, paymentMethod: paymentMethod ?? null, notes: notes ?? null
  }).returning();

  // Insert items
  if (items?.length) {
    await db.insert(invoiceItemsTable).values(items.map((item: any) => ({
      invoiceId: invoice.id, hospitalId, description: item.description,
      category: item.category ?? "CONSULTATION",
      quantity: item.quantity ?? 1, unitPrice: String(item.unitPrice ?? item.amount),
      amount: String(item.amount)
    })));
  }

  res.status(201).json(await enrichInvoice(invoice));
});

router.get("/invoices/:id", authenticate, requireHospital, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const hospitalId = req.user!.hospitalId!;
  const [invoice] = await db.select().from(invoicesTable).where(and(eq(invoicesTable.id, id), eq(invoicesTable.hospitalId, hospitalId)));
  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.json(await enrichInvoice(invoice));
});

router.patch("/invoices/:id", authenticate, requireHospital, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const hospitalId = req.user!.hospitalId!;
  const { items, discountAmount, taxPercentage, notes } = req.body;

  const [existing] = await db.select().from(invoicesTable).where(and(eq(invoicesTable.id, id), eq(invoicesTable.hospitalId, hospitalId)));
  if (!existing) { res.status(404).json({ error: "Invoice not found" }); return; }

  const updates: any = {};
  if (notes !== undefined) updates.notes = notes;

  if (items?.length) {
    const subtotal = items.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
    const discount = Number(discountAmount ?? existing.discountAmount);
    const taxPct = Number(taxPercentage ?? existing.taxPercentage);
    const taxAmount = ((subtotal - discount) * taxPct) / 100;
    const totalAmount = subtotal - discount + taxAmount;
    const paidAmount = Number(existing.paidAmount);
    const dueAmount = Math.max(0, totalAmount - paidAmount);
    const finalStatus = paidAmount >= totalAmount ? "PAID" : paidAmount > 0 ? "PARTIAL" : existing.status;

    Object.assign(updates, { subtotal: String(subtotal), discountAmount: String(discount), taxPercentage: String(taxPct), taxAmount: String(taxAmount), totalAmount: String(totalAmount), dueAmount: String(dueAmount), status: finalStatus });

    await db.delete(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, id));
    await db.insert(invoiceItemsTable).values(items.map((item: any) => ({ invoiceId: id, hospitalId, description: item.description, category: item.category ?? "CONSULTATION", quantity: item.quantity ?? 1, unitPrice: String(item.unitPrice ?? item.amount), amount: String(item.amount) })));
  }

  const [invoice] = await db.update(invoicesTable).set(updates).where(eq(invoicesTable.id, id)).returning();
  res.json(await enrichInvoice(invoice));
});

router.patch("/invoices/:id/payment", authenticate, requireHospital, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const hospitalId = req.user!.hospitalId!;
  const { status, paymentMethod, paidAmount } = req.body;

  const [existing] = await db.select().from(invoicesTable).where(and(eq(invoicesTable.id, id), eq(invoicesTable.hospitalId, hospitalId)));
  if (!existing) { res.status(404).json({ error: "Invoice not found" }); return; }

  const paid = Number(paidAmount);
  const total = Number(existing.totalAmount);
  const dueAmount = Math.max(0, total - paid);

  const [invoice] = await db.update(invoicesTable).set({
    status, paymentMethod, paidAmount: String(paid), dueAmount: String(dueAmount)
  }).where(eq(invoicesTable.id, id)).returning();
  res.json(await enrichInvoice(invoice));
});

export default router;
