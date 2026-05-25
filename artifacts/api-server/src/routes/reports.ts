import { Router, type IRouter } from "express";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { db, invoicesTable, invoiceItemsTable, appointmentsTable, doctorProfilesTable, usersTable, departmentsTable, hospitalsTable } from "@workspace/db";
import { authenticate, requireHospital, requireRoles } from "../middlewares/authenticate";

const router: IRouter = Router();

function getDateRange(preset: string): { start: string; end: string } {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  switch (preset) {
    case "today": return { start: today, end: today };
    case "yesterday": {
      const d = new Date(now); d.setDate(d.getDate() - 1);
      const s = d.toISOString().split("T")[0]; return { start: s, end: s };
    }
    case "this_week": {
      const d = new Date(now); d.setDate(d.getDate() - d.getDay());
      return { start: d.toISOString().split("T")[0], end: today };
    }
    case "last_week": {
      const start = new Date(now); start.setDate(start.getDate() - start.getDay() - 7);
      const end = new Date(now); end.setDate(end.getDate() - end.getDay() - 1);
      return { start: start.toISOString().split("T")[0], end: end.toISOString().split("T")[0] };
    }
    case "this_month": {
      return { start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`, end: today };
    }
    case "last_month": {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: d.toISOString().split("T")[0], end: lastDay.toISOString().split("T")[0] };
    }
    default: return { start: today, end: today };
  }
}

router.get("/reports/doctor-billing", authenticate, requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
  const { doctorId, departmentId, startDate, endDate, preset, paymentStatus, paymentMethod } = req.query as Record<string, string>;

  let start = startDate;
  let end = endDate;
  if (preset && !startDate) {
    const range = getDateRange(preset);
    start = range.start; end = range.end;
  }
  if (!start) start = new Date(new Date().setDate(1)).toISOString().split("T")[0];
  if (!end) end = new Date().toISOString().split("T")[0];

  const doctors = await db.select().from(doctorProfilesTable).where(
    doctorId ? and(eq(doctorProfilesTable.hospitalId, hospitalId), eq(doctorProfilesTable.id, parseInt(doctorId)))
      : eq(doctorProfilesTable.hospitalId, hospitalId)
  );

  const entries = await Promise.all(doctors.map(async (doc) => {
    const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, doc.userId));
    const [dept] = doc.departmentId ? await db.select({ name: departmentsTable.name }).from(departmentsTable).where(eq(departmentsTable.id, doc.departmentId)) : [null];

    const apptConditions: any[] = [eq(appointmentsTable.doctorId, doc.id), eq(appointmentsTable.hospitalId, hospitalId), gte(appointmentsTable.appointmentDate, start!), lte(appointmentsTable.appointmentDate, end!)];
    const appointments = await db.select().from(appointmentsTable).where(and(...apptConditions));

    const invConditions: any[] = [eq(invoicesTable.doctorId, doc.id), eq(invoicesTable.hospitalId, hospitalId), gte(invoicesTable.createdAt, new Date(start!)), lte(invoicesTable.createdAt, new Date(end! + "T23:59:59"))];
    if (paymentStatus) invConditions.push(eq(invoicesTable.status, paymentStatus));
    if (paymentMethod) invConditions.push(eq(invoicesTable.paymentMethod, paymentMethod));

    const invoices = await db.select().from(invoicesTable).where(and(...invConditions));
    const items = await Promise.all(invoices.map(inv => db.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, inv.id))));
    const allItems = items.flat();

    const getRevByCategory = (cat: string) => allItems.filter(i => i.category === cat).reduce((s, i) => s + Number(i.amount), 0);

    return {
      doctorId: doc.id, doctorName: user?.name ?? "", specialization: doc.specialization ?? null,
      departmentName: dept?.name ?? null,
      totalAppointments: appointments.length,
      completedAppointments: appointments.filter(a => a.status === "COMPLETED").length,
      cancelledAppointments: appointments.filter(a => a.status === "CANCELLED").length,
      totalInvoices: invoices.length,
      consultationRevenue: getRevByCategory("CONSULTATION"),
      labRevenue: getRevByCategory("LAB"),
      medicineRevenue: getRevByCategory("MEDICINE"),
      otherRevenue: getRevByCategory("OTHER"),
      totalDiscount: invoices.reduce((s, i) => s + Number(i.discountAmount), 0),
      totalTax: invoices.reduce((s, i) => s + Number(i.taxAmount), 0),
      totalRevenue: invoices.reduce((s, i) => s + Number(i.totalAmount), 0),
      paidAmount: invoices.filter(i => i.status === "PAID").reduce((s, i) => s + Number(i.totalAmount), 0),
      unpaidAmount: invoices.filter(i => i.status === "UNPAID").reduce((s, i) => s + Number(i.totalAmount), 0),
      partialAmount: invoices.filter(i => i.status === "PARTIAL").reduce((s, i) => s + Number(i.paidAmount), 0),
      dueAmount: invoices.reduce((s, i) => s + Number(i.dueAmount), 0),
      cashTotal: invoices.filter(i => i.paymentMethod === "CASH").reduce((s, i) => s + Number(i.paidAmount), 0),
      upiTotal: invoices.filter(i => i.paymentMethod === "UPI").reduce((s, i) => s + Number(i.paidAmount), 0),
      cardTotal: invoices.filter(i => i.paymentMethod === "CARD").reduce((s, i) => s + Number(i.paidAmount), 0),
      onlineTotal: invoices.filter(i => i.paymentMethod === "ONLINE").reduce((s, i) => s + Number(i.paidAmount), 0),
    };
  }));

  const totalRevenue = entries.reduce((s, e) => s + e.totalRevenue, 0);
  const totalAppts = entries.reduce((s, e) => s + e.totalAppointments, 0);
  const totalInvoices = entries.reduce((s, e) => s + e.totalInvoices, 0);
  const paidAmount = entries.reduce((s, e) => s + e.paidAmount, 0);
  const unpaidAmount = entries.reduce((s, e) => s + e.unpaidAmount, 0);

  res.json({ entries, summary: { totalRevenue, totalAppointments: totalAppts, totalInvoices, paidAmount, unpaidAmount }, startDate: start, endDate: end });
});

router.get("/reports/daily-collection", authenticate, requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
  const date = (req.query.date as string) ?? new Date().toISOString().split("T")[0];

  const invoices = await db.select().from(invoicesTable).where(and(eq(invoicesTable.hospitalId, hospitalId), sql`date(created_at) = ${date}`));
  const total = invoices.reduce((s, i) => s + Number(i.paidAmount), 0);
  const getMethodTotal = (method: string) => invoices.filter(i => i.paymentMethod === method).reduce((s, i) => s + Number(i.paidAmount), 0);

  res.json({
    date, totalCollection: total,
    cashCollection: getMethodTotal("CASH"), upiCollection: getMethodTotal("UPI"),
    cardCollection: getMethodTotal("CARD"), onlineCollection: getMethodTotal("ONLINE"),
    totalInvoices: invoices.length,
    paidInvoices: invoices.filter(i => i.status === "PAID").length,
    pendingInvoices: invoices.filter(i => i.status !== "PAID").length
  });
});

router.get("/reports/revenue-chart", authenticate, requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
  const year = parseInt((req.query.year as string) ?? String(new Date().getFullYear()));

  const data = await db.select({
    label: sql<string>`to_char(date_trunc('month', created_at), 'Mon')`,
    revenue: sql<number>`sum(cast(total_amount as numeric))`,
    appointments: sql<number>`count(*)`
  }).from(invoicesTable).where(and(eq(invoicesTable.hospitalId, hospitalId), sql`extract(year from created_at) = ${year}`))
    .groupBy(sql`date_trunc('month', created_at)`).orderBy(sql`date_trunc('month', created_at)`);

  res.json(data.map(d => ({ label: d.label, revenue: Number(d.revenue ?? 0), appointments: Number(d.appointments ?? 0) })));
});

router.get("/reports/appointment-stats", authenticate, requireHospital, async (req, res): Promise<void> => {
  const hospitalId = req.user!.hospitalId!;
  const { startDate, endDate } = req.query as Record<string, string>;

  const conditions: any[] = [eq(appointmentsTable.hospitalId, hospitalId)];
  if (startDate) conditions.push(gte(appointmentsTable.appointmentDate, startDate));
  if (endDate) conditions.push(lte(appointmentsTable.appointmentDate, endDate));

  const appointments = await db.select().from(appointmentsTable).where(and(...conditions));
  res.json({
    total: appointments.length,
    completed: appointments.filter(a => a.status === "COMPLETED").length,
    cancelled: appointments.filter(a => a.status === "CANCELLED").length,
    pending: appointments.filter(a => ["SCHEDULED", "CONFIRMED"].includes(a.status)).length,
    walkIn: appointments.filter(a => a.appointmentType === "WALK_IN").length,
    booked: appointments.filter(a => a.appointmentType === "BOOKED").length,
    followUp: appointments.filter(a => a.appointmentType === "FOLLOW_UP").length
  });
});

// Super admin global reports
router.get("/admin/reports/global", authenticate, requireRoles("SUPER_ADMIN"), async (req, res): Promise<void> => {
  const { startDate, endDate } = req.query as Record<string, string>;
  const [totalHospitals, activeHospitals, totalAppts, totalPats] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(hospitalsTable),
    db.select({ count: sql<number>`count(*)` }).from(hospitalsTable).where(eq(hospitalsTable.status, "ACTIVE")),
    db.select({ count: sql<number>`count(*)` }).from(appointmentsTable),
    db.select({ count: sql<number>`count(*)` }).from(invoicesTable),
  ]);

  const invConditions: any[] = [];
  if (startDate) invConditions.push(gte(invoicesTable.createdAt, new Date(startDate)));
  if (endDate) invConditions.push(lte(invoicesTable.createdAt, new Date(endDate)));

  const totalRevResult = await db.select({ total: sql<number>`sum(cast(total_amount as numeric))` }).from(invoicesTable).where(invConditions.length ? and(...invConditions) : undefined);

  const byHospital = await db.select({
    hospitalId: invoicesTable.hospitalId,
    revenue: sql<number>`sum(cast(total_amount as numeric))`,
    appointments: sql<number>`count(*)`
  }).from(invoicesTable).groupBy(invoicesTable.hospitalId);

  const enriched = await Promise.all(byHospital.map(async (h) => {
    const [hosp] = await db.select({ name: hospitalsTable.name }).from(hospitalsTable).where(eq(hospitalsTable.id, h.hospitalId!));
    return { hospitalId: h.hospitalId, hospitalName: hosp?.name ?? "", revenue: Number(h.revenue ?? 0), appointments: Number(h.appointments ?? 0) };
  }));

  res.json({
    totalHospitals: Number(totalHospitals[0]?.count ?? 0),
    activeHospitals: Number(activeHospitals[0]?.count ?? 0),
    totalRevenue: Number(totalRevResult[0]?.total ?? 0),
    totalAppointments: Number(totalAppts[0]?.count ?? 0),
    totalPatients: Number(totalPats[0]?.count ?? 0),
    revenueByHospital: enriched
  });
});

router.get("/admin/revenue-chart", authenticate, requireRoles("SUPER_ADMIN"), async (req, res): Promise<void> => {
  const data = await db.select({
    label: sql<string>`to_char(date_trunc('month', created_at), 'Mon YYYY')`,
    revenue: sql<number>`sum(cast(total_amount as numeric))`,
    appointments: sql<number>`count(*)`
  }).from(invoicesTable).where(sql`created_at >= now() - interval '12 months'`)
    .groupBy(sql`date_trunc('month', created_at)`).orderBy(sql`date_trunc('month', created_at)`);
  res.json(data.map(d => ({ label: d.label, revenue: Number(d.revenue ?? 0), appointments: Number(d.appointments ?? 0) })));
});

export default router;
