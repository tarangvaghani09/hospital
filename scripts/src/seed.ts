import { db, usersTable, hospitalsTable, hospitalSettingsTable, subscriptionPlansTable, hospitalSubscriptionsTable, departmentsTable, doctorProfilesTable, receptionistProfilesTable, patientProfilesTable, appointmentsTable, invoicesTable, invoiceItemsTable, prescriptionsTable, prescriptionMedicinesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function hash(p: string) {
  return bcrypt.hash(p, 10);
}

async function main() {
  console.log("Seeding database...");

  // ─── SUPER ADMIN ────────────────────────────────────────────────────────────
  const existingSuperAdmin = await db.select().from(usersTable).where(eq(usersTable.email, "admin@medicore.app"));
  if (!existingSuperAdmin.length) {
    await db.insert(usersTable).values({
      email: "admin@medicore.app", password: await hash("Admin@123"),
      name: "Super Admin", role: "SUPER_ADMIN"
    });
    console.log("Created super admin: admin@medicore.app / Admin@123");
  }

  // ─── SUBSCRIPTION PLANS ─────────────────────────────────────────────────────
  const existingPlans = await db.select().from(subscriptionPlansTable);
  if (!existingPlans.length) {
    const [basicPlan, proPlan, enterprisePlan] = await db.insert(subscriptionPlansTable).values([
      {
        name: "Basic", description: "Perfect for small clinics", price: "999", billingCycle: "MONTHLY",
        maxDoctors: 5, maxReceptionists: 2, maxPatients: 500,
        features: ["Up to 5 Doctors", "2 Receptionists", "500 Patients", "Basic Reports", "Email Support"]
      },
      {
        name: "Pro", description: "Great for growing hospitals", price: "2999", billingCycle: "MONTHLY",
        maxDoctors: 20, maxReceptionists: 10, maxPatients: 5000,
        features: ["Up to 20 Doctors", "10 Receptionists", "5000 Patients", "Advanced Reports", "Priority Support", "Doctor Billing Reports", "Calendar Management"]
      },
      {
        name: "Enterprise", description: "For large hospital networks", price: "7999", billingCycle: "MONTHLY",
        maxDoctors: null, maxReceptionists: null, maxPatients: null,
        features: ["Unlimited Doctors", "Unlimited Receptionists", "Unlimited Patients", "Full Analytics Suite", "24/7 Support", "Custom Integrations", "Multi-Branch Support"]
      }
    ]).returning();
    console.log("Created subscription plans: Basic / Pro / Enterprise");

    // ─── HOSPITAL 1: Sunrise Medical Center ────────────────────────────────────
    const [hospital1] = await db.insert(hospitalsTable).values({
      name: "Sunrise Medical Center", code: "SUNR-1001", email: "info@sunrisemedical.com",
      phone: "+91-9876543210", address: "12 Healthcare Boulevard, Mumbai, Maharashtra 400001",
      registrationNumber: "MH-HOSP-2019-001", gstNumber: "27AABCU9603R1ZX",
      websiteUrl: "https://sunrisemedical.com", status: "ACTIVE", themeColor: "#2563eb"
    }).returning();
    await db.insert(hospitalSettingsTable).values({ hospitalId: hospital1.id, invoicePrefix: "SUNR", invoiceStartNumber: 1001, taxEnabled: true, defaultTaxPercentage: "18", discountEnabled: true, showLogoOnInvoice: true, showGSTOnInvoice: true });

    // Hospital admin
    const [admin1] = await db.insert(usersTable).values({
      email: "admin@sunrisemedical.com", password: await hash("Admin@123"),
      name: "Dr. Priya Sharma", role: "HOSPITAL_ADMIN", hospitalId: hospital1.id
    }).returning();
    console.log("Hospital 1 admin: admin@sunrisemedical.com / Admin@123");

    // Subscribe hospital 1 to Pro
    await db.insert(hospitalSubscriptionsTable).values({
      hospitalId: hospital1.id, planId: proPlan.id, status: "ACTIVE",
      price: proPlan.price, paymentMethod: "ONLINE",
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    // Departments for hospital 1
    const [cardiology, neurology, orthopedics, pediatrics, radiology] = await db.insert(departmentsTable).values([
      { hospitalId: hospital1.id, name: "Cardiology", description: "Heart and cardiovascular care" },
      { hospitalId: hospital1.id, name: "Neurology", description: "Brain and nervous system" },
      { hospitalId: hospital1.id, name: "Orthopedics", description: "Bone, joint, and muscle care" },
      { hospitalId: hospital1.id, name: "Pediatrics", description: "Child healthcare" },
      { hospitalId: hospital1.id, name: "Radiology", description: "Medical imaging" }
    ]).returning();

    // Doctors for hospital 1
    const [docUser1] = await db.insert(usersTable).values({
      email: "dr.arjun@sunrisemedical.com", password: await hash("Doctor@123"),
      name: "Dr. Arjun Mehta", role: "DOCTOR", hospitalId: hospital1.id
    }).returning();
    const [doc1] = await db.insert(doctorProfilesTable).values({
      userId: docUser1.id, hospitalId: hospital1.id, departmentId: cardiology.id,
      specialization: "Cardiology", qualification: "MD, DM Cardiology", experience: 12,
      consultationFee: "800"
    }).returning();

    const [docUser2] = await db.insert(usersTable).values({
      email: "dr.kavya@sunrisemedical.com", password: await hash("Doctor@123"),
      name: "Dr. Kavya Reddy", role: "DOCTOR", hospitalId: hospital1.id
    }).returning();
    const [doc2] = await db.insert(doctorProfilesTable).values({
      userId: docUser2.id, hospitalId: hospital1.id, departmentId: neurology.id,
      specialization: "Neurology", qualification: "MD, DM Neurology", experience: 8,
      consultationFee: "900"
    }).returning();

    const [docUser3] = await db.insert(usersTable).values({
      email: "dr.rahul@sunrisemedical.com", password: await hash("Doctor@123"),
      name: "Dr. Rahul Verma", role: "DOCTOR", hospitalId: hospital1.id
    }).returning();
    const [doc3] = await db.insert(doctorProfilesTable).values({
      userId: docUser3.id, hospitalId: hospital1.id, departmentId: orthopedics.id,
      specialization: "Orthopedics", qualification: "MS Orthopedics", experience: 15,
      consultationFee: "700"
    }).returning();
    console.log("Created 3 doctors for Sunrise Medical Center");
    console.log("Doctor login: dr.arjun@sunrisemedical.com / Doctor@123");

    // Receptionist for hospital 1
    const [recepUser1] = await db.insert(usersTable).values({
      email: "reception@sunrisemedical.com", password: await hash("Recep@123"),
      name: "Anjali Singh", role: "RECEPTIONIST", hospitalId: hospital1.id
    }).returning();
    await db.insert(receptionistProfilesTable).values({ userId: recepUser1.id, hospitalId: hospital1.id });
    console.log("Receptionist login: reception@sunrisemedical.com / Recep@123");

    // Patients for hospital 1
    const [pat1] = await db.insert(patientProfilesTable).values({
      hospitalId: hospital1.id, patientId: `PAT-${hospital1.id}-0001`,
      name: "Vikram Nair", email: "vikram.nair@email.com", phone: "+91-9123456789",
      dateOfBirth: "1988-03-15", gender: "MALE", bloodGroup: "O+",
      address: "45 Green Park, Mumbai"
    }).returning();

    const [pat2] = await db.insert(patientProfilesTable).values({
      hospitalId: hospital1.id, patientId: `PAT-${hospital1.id}-0002`,
      name: "Sunita Patel", email: "sunita.patel@email.com", phone: "+91-9234567890",
      dateOfBirth: "1975-07-22", gender: "FEMALE", bloodGroup: "A+",
      address: "12 Palm Avenue, Thane"
    }).returning();

    const [pat3] = await db.insert(patientProfilesTable).values({
      hospitalId: hospital1.id, patientId: `PAT-${hospital1.id}-0003`,
      name: "Rohan Joshi", email: "rohan.joshi@email.com", phone: "+91-9345678901",
      dateOfBirth: "1995-11-08", gender: "MALE", bloodGroup: "B+",
      address: "78 Lotus Colony, Pune"
    }).returning();

    const [pat4] = await db.insert(patientProfilesTable).values({
      hospitalId: hospital1.id, patientId: `PAT-${hospital1.id}-0004`,
      name: "Meena Krishnan", email: "meena.k@email.com", phone: "+91-9456789012",
      dateOfBirth: "1962-05-30", gender: "FEMALE", bloodGroup: "AB+",
      address: "33 Raja Road, Mumbai"
    }).returning();

    const [pat5] = await db.insert(patientProfilesTable).values({
      hospitalId: hospital1.id, patientId: `PAT-${hospital1.id}-0005`,
      name: "Karan Malhotra", email: "karan.m@email.com", phone: "+91-9567890123",
      dateOfBirth: "2001-09-14", gender: "MALE", bloodGroup: "O-",
      address: "22 Silver Lane, Navi Mumbai"
    }).returning();
    console.log("Created 5 patients for Sunrise Medical Center");

    // Appointments for today
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    const appts = await db.insert(appointmentsTable).values([
      { hospitalId: hospital1.id, patientId: pat1.id, doctorId: doc1.id, departmentId: cardiology.id, appointmentDate: today, appointmentTime: "09:00", tokenNumber: 1, status: "COMPLETED", appointmentType: "WALK_IN", symptoms: "Chest pain and shortness of breath", diagnosis: "Mild angina", notes: "Prescribed nitroglycerin and follow up in 2 weeks", paymentStatus: "PAID" },
      { hospitalId: hospital1.id, patientId: pat2.id, doctorId: doc1.id, departmentId: cardiology.id, appointmentDate: today, appointmentTime: "09:30", tokenNumber: 2, status: "COMPLETED", appointmentType: "BOOKED", symptoms: "Palpitations", paymentStatus: "PAID" },
      { hospitalId: hospital1.id, patientId: pat3.id, doctorId: doc2.id, departmentId: neurology.id, appointmentDate: today, appointmentTime: "10:00", tokenNumber: 1, status: "IN_PROGRESS", appointmentType: "WALK_IN", symptoms: "Severe headache and dizziness", paymentStatus: "PENDING" },
      { hospitalId: hospital1.id, patientId: pat4.id, doctorId: doc3.id, departmentId: orthopedics.id, appointmentDate: today, appointmentTime: "10:30", tokenNumber: 1, status: "SCHEDULED", appointmentType: "BOOKED", symptoms: "Knee pain", paymentStatus: "PENDING" },
      { hospitalId: hospital1.id, patientId: pat5.id, doctorId: doc1.id, departmentId: cardiology.id, appointmentDate: today, appointmentTime: "11:00", tokenNumber: 3, status: "SCHEDULED", appointmentType: "FOLLOW_UP", paymentStatus: "PENDING" },
      { hospitalId: hospital1.id, patientId: pat1.id, doctorId: doc2.id, departmentId: neurology.id, appointmentDate: yesterday, appointmentTime: "14:00", tokenNumber: 1, status: "COMPLETED", appointmentType: "WALK_IN", paymentStatus: "PAID" },
      { hospitalId: hospital1.id, patientId: pat3.id, doctorId: doc3.id, departmentId: orthopedics.id, appointmentDate: yesterday, appointmentTime: "15:00", tokenNumber: 1, status: "CANCELLED", appointmentType: "BOOKED", paymentStatus: "PENDING" },
    ]).returning();

    // Invoices
    const inv1 = await db.insert(invoicesTable).values({
      hospitalId: hospital1.id, invoiceNumber: "SUNR-1001", patientId: pat1.id, doctorId: doc1.id,
      appointmentId: appts[0].id, subtotal: "1300", discountAmount: "0", taxPercentage: "18",
      taxAmount: "234", totalAmount: "1534", paidAmount: "1534", dueAmount: "0",
      status: "PAID", paymentMethod: "CASH"
    }).returning();
    await db.insert(invoiceItemsTable).values([
      { invoiceId: inv1[0].id, hospitalId: hospital1.id, description: "Cardiology Consultation", category: "CONSULTATION", quantity: 1, unitPrice: "800", amount: "800" },
      { invoiceId: inv1[0].id, hospitalId: hospital1.id, description: "ECG Test", category: "LAB", quantity: 1, unitPrice: "350", amount: "350" },
      { invoiceId: inv1[0].id, hospitalId: hospital1.id, description: "Echo Test", category: "LAB", quantity: 1, unitPrice: "150", amount: "150" }
    ]);

    const inv2 = await db.insert(invoicesTable).values({
      hospitalId: hospital1.id, invoiceNumber: "SUNR-1002", patientId: pat2.id, doctorId: doc1.id,
      appointmentId: appts[1].id, subtotal: "800", discountAmount: "0", taxPercentage: "18",
      taxAmount: "144", totalAmount: "944", paidAmount: "944", dueAmount: "0",
      status: "PAID", paymentMethod: "UPI"
    }).returning();
    await db.insert(invoiceItemsTable).values([
      { invoiceId: inv2[0].id, hospitalId: hospital1.id, description: "Cardiology Consultation", category: "CONSULTATION", quantity: 1, unitPrice: "800", amount: "800" }
    ]);

    const inv3 = await db.insert(invoicesTable).values({
      hospitalId: hospital1.id, invoiceNumber: "SUNR-1003", patientId: pat3.id, doctorId: doc2.id,
      appointmentId: appts[2].id, subtotal: "1700", discountAmount: "100", taxPercentage: "18",
      taxAmount: "288", totalAmount: "1888", paidAmount: "1000", dueAmount: "888",
      status: "PARTIAL", paymentMethod: "CASH"
    }).returning();
    await db.insert(invoiceItemsTable).values([
      { invoiceId: inv3[0].id, hospitalId: hospital1.id, description: "Neurology Consultation", category: "CONSULTATION", quantity: 1, unitPrice: "900", amount: "900" },
      { invoiceId: inv3[0].id, hospitalId: hospital1.id, description: "MRI Scan", category: "LAB", quantity: 1, unitPrice: "800", amount: "800" }
    ]);

    // Prescriptions
    const presc1 = await db.insert(prescriptionsTable).values({
      hospitalId: hospital1.id, patientId: pat1.id, doctorId: doc1.id,
      appointmentId: appts[0].id, symptoms: "Chest pain, shortness of breath",
      diagnosis: "Mild angina pectoris", advice: "Avoid strenuous exercise, low-sodium diet",
      followUpDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]
    }).returning();
    await db.insert(prescriptionMedicinesTable).values([
      { prescriptionId: presc1[0].id, name: "Nitroglycerin", dosage: "0.5mg", timing: "SOS", duration: "30 days", instructions: "Place under tongue when chest pain occurs" },
      { prescriptionId: presc1[0].id, name: "Aspirin", dosage: "75mg", timing: "Once daily after breakfast", duration: "30 days", instructions: "Take with water" },
      { prescriptionId: presc1[0].id, name: "Atorvastatin", dosage: "20mg", timing: "Once at bedtime", duration: "30 days", instructions: "Avoid grapefruit" }
    ]);
    console.log("Created appointments, invoices, and prescriptions for hospital 1");

    // ─── HOSPITAL 2: Apollo Care Clinic ────────────────────────────────────────
    const [hospital2] = await db.insert(hospitalsTable).values({
      name: "Apollo Care Clinic", code: "APOL-2002", email: "care@apollocare.com",
      phone: "+91-8765432109", address: "88 Wellness Park, Bangalore, Karnataka 560001",
      registrationNumber: "KA-HOSP-2020-045", status: "ACTIVE", themeColor: "#7c3aed"
    }).returning();
    await db.insert(hospitalSettingsTable).values({ hospitalId: hospital2.id, invoicePrefix: "APOL", invoiceStartNumber: 2001 });

    const [admin2] = await db.insert(usersTable).values({
      email: "admin@apollocare.com", password: await hash("Admin@123"),
      name: "Dr. Rakesh Gupta", role: "HOSPITAL_ADMIN", hospitalId: hospital2.id
    }).returning();
    await db.insert(hospitalSubscriptionsTable).values({
      hospitalId: hospital2.id, planId: basicPlan.id, status: "ACTIVE",
      price: basicPlan.price, paymentMethod: "ONLINE",
      endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    });
    console.log("Hospital 2 admin: admin@apollocare.com / Admin@123");

    // Departments for hospital 2
    await db.insert(departmentsTable).values([
      { hospitalId: hospital2.id, name: "General Medicine", description: "General outpatient care" },
      { hospitalId: hospital2.id, name: "Dermatology", description: "Skin and hair care" },
      { hospitalId: hospital2.id, name: "Gynecology", description: "Women's health" }
    ]);
  }

  console.log("\n========================================");
  console.log("SEED COMPLETE - Login Credentials:");
  console.log("========================================");
  console.log("Super Admin:     admin@medicore.app / Admin@123");
  console.log("Hospital 1 Admin: admin@sunrisemedical.com / Admin@123");
  console.log("Doctor:          dr.arjun@sunrisemedical.com / Doctor@123");
  console.log("Receptionist:    reception@sunrisemedical.com / Recep@123");
  console.log("Hospital 2 Admin: admin@apollocare.com / Admin@123");
  console.log("========================================");

  

  process.exit(0);
}

main().catch(err => { console.error("Seed failed:", err); process.exit(1); });
