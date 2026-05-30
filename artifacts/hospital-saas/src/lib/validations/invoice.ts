import { z } from "zod";

export const createInvoiceSchema = z.object({
  patientId: z.string().min(1, "Patient required"),
  doctorId: z.string().optional(),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1, "All items need a description"),
        category: z.string().min(1),
        quantity: z.number().min(1, "Quantity must be at least 1"),
        unitPrice: z.number().min(0, "Price cannot be negative"),
        amount: z.number().min(0, "Amount cannot be negative"),
      }),
    )
    .min(1, "At least one item is required"),
  discountAmount: z.number().min(0, "Discount cannot be negative"),
  taxPercentage: z.number().min(0, "Tax cannot be negative"),
  paidAmount: z.number().min(0, "Paid amount cannot be negative"),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});
