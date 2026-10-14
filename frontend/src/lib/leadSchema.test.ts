import { describe, expect, it } from "vitest";

import {
  leadSchema,
  toCreateLeadInput,
  type LeadFormValues,
} from "@/lib/leadSchema";

function values(overrides: Partial<LeadFormValues> = {}): LeadFormValues {
  return { name: "Sarah Connor", company: "", phone: "", ...overrides };
}

function messages(input: LeadFormValues): string[] {
  const result = leadSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

describe("lead schema", () => {
  it("accepts a minimal lead", () => {
    expect(messages(values())).toEqual([]);
  });

  it.each(["", "   "])("rejects a blank name %j", (name) => {
    expect(messages(values({ name }))).toEqual(["Name is required"]);
  });

  it("rejects a name longer than 120 characters", () => {
    expect(messages(values({ name: "a".repeat(121) }))).toHaveLength(1);
  });

  it("accepts a name of exactly 120 characters", () => {
    expect(messages(values({ name: "a".repeat(120) }))).toEqual([]);
  });

  it("rejects an over-long company and phone", () => {
    expect(messages(values({ company: "c".repeat(121) }))).toHaveLength(1);
    expect(messages(values({ phone: "5".repeat(33) }))).toHaveLength(1);
  });

  it("accepts a company and phone at their limits", () => {
    expect(
      messages(values({ company: "c".repeat(120), phone: "5".repeat(32) })),
    ).toEqual([]);
  });
});

describe("toCreateLeadInput", () => {
  it("omits blank optional fields", () => {
    expect(toCreateLeadInput(values({ company: "  ", phone: "" }))).toEqual({
      name: "Sarah Connor",
    });
  });

  it("trims every field", () => {
    expect(
      toCreateLeadInput({
        name: "  Sarah Connor ",
        company: " Acme Corp ",
        phone: " 555-0199 ",
      }),
    ).toEqual({ name: "Sarah Connor", company: "Acme Corp", phone: "555-0199" });
  });
});
