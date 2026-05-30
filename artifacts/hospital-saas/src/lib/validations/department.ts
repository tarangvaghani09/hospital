import { z } from "zod";

const normalizeSpaces = (value: string) => value.trim().replace(/\s+/g, " ");

export function makeDepartmentSchema(existingNames: string[], currentName?: string) {
  const currentNormalized = currentName ? normalizeSpaces(currentName).toLowerCase() : null;

  return z.object({
    name: z
      .string()
      .transform(normalizeSpaces)
      .refine((v) => v.length >= 2, "Department name must be at least 2 characters")
      .refine((v) => v.length <= 50, "Department name must be at most 50 characters")
      .refine((v) => !/^\d+$/.test(v), "Department name cannot be only numbers")
      .refine((v) => {
        const key = v.toLowerCase();
        if (currentNormalized && key === currentNormalized) return true;
        return !existingNames.some((n) => n.toLowerCase() === key);
      }, "Department name already exists"),
    description: z.string().optional(),
  });
}

