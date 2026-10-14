import { z } from "zod";

import type { LeadCreateInput } from "@/lib/types";

export const leadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must be 120 characters or fewer"),
  company: z.string().trim().max(120, "Company must be 120 characters or fewer"),
  phone: z.string().trim().max(32, "Phone must be 32 characters or fewer"),
});

export type LeadFormValues = z.infer<typeof leadSchema>;

export function toCreateLeadInput(values: LeadFormValues): LeadCreateInput {
  const company = values.company.trim();
  const phone = values.phone.trim();
  return {
    name: values.name.trim(),
    ...(company ? { company } : {}),
    ...(phone ? { phone } : {}),
  };
}
