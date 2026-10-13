import { describe, expect, it } from "vitest";

import {
  createNoteSchema,
  toCreateInput,
  type NoteFormValues,
} from "@/lib/noteSchema";

const NOW = new Date("2026-10-13T12:00:00Z");
const schema = createNoteSchema(() => NOW);

function values(overrides: Partial<NoteFormValues> = {}): NoteFormValues {
  return {
    note: "Called the client.",
    setFollowUp: false,
    date: "",
    time: "",
    ...overrides,
  };
}

function issueFor(input: NoteFormValues): { path: string; message: string }[] {
  const result = schema.safeParse(input);
  if (result.success) return [];
  return result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

describe("note schema", () => {
  it("accepts a plain note", () => {
    expect(issueFor(values())).toEqual([]);
  });

  it.each(["", "   ", "\n\t"])("rejects a blank note %j", (note) => {
    expect(issueFor(values({ note }))).toEqual([
      { path: "note", message: "Note can't be empty" },
    ]);
  });

  it("rejects a note longer than 2000 characters", () => {
    const issues = issueFor(values({ note: "a".repeat(2001) }));
    expect(issues.map((issue) => issue.path)).toEqual(["note"]);
  });

  it("accepts a note of exactly 2000 characters", () => {
    expect(issueFor(values({ note: "a".repeat(2000) }))).toEqual([]);
  });

  it("requires a date when the follow-up checkbox is on", () => {
    const issues = issueFor(
      values({ setFollowUp: true, date: "", time: "18:00" }),
    );
    expect(issues).toEqual([{ path: "date", message: "Pick a follow-up date" }]);
  });

  it("requires a time when the follow-up checkbox is on", () => {
    const issues = issueFor(
      values({ setFollowUp: true, date: "2026-10-14", time: "" }),
    );
    expect(issues).toEqual([{ path: "time", message: "Pick a follow-up time" }]);
  });

  it("rejects a follow-up in the past", () => {
    const issues = issueFor(
      values({ setFollowUp: true, date: "2026-10-13", time: "10:00" }),
    );
    expect(issues).toEqual([
      { path: "time", message: "Follow-up time is in the past" },
    ]);
  });

  it("accepts a valid future follow-up", () => {
    expect(
      issueFor(values({ setFollowUp: true, date: "2026-10-14", time: "10:30" })),
    ).toEqual([]);
  });

  it("ignores date and time when the checkbox is off", () => {
    expect(
      issueFor(values({ setFollowUp: false, date: "2020-01-01", time: "" })),
    ).toEqual([]);
  });
});

describe("toCreateInput", () => {
  it("trims the note and omits follow_up_at when unchecked", () => {
    expect(toCreateInput(values({ note: "  hello  " }))).toEqual({
      note: "hello",
    });
  });

  it("converts the local date and time to a UTC ISO string", () => {
    expect(
      toCreateInput(
        values({ setFollowUp: true, date: "2026-10-14", time: "10:30" }),
      ),
    ).toEqual({
      note: "Called the client.",
      follow_up_at: "2026-10-14T05:00:00.000Z",
    });
  });
});
