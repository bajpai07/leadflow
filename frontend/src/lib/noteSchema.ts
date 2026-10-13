import { z } from "zod";

import type { DiscussionCreateInput } from "@/lib/types";
import { combineLocalDateTime, isFollowUpInPast } from "@/lib/time";

export function createNoteSchema(getNow: () => Date) {
  return z
    .object({
      note: z
        .string()
        .trim()
        .min(1, "Note can't be empty")
        .max(2000, "Note must be 2000 characters or fewer"),
      setFollowUp: z.boolean(),
      date: z.string(),
      time: z.string(),
    })
    .superRefine((values, ctx) => {
      if (!values.setFollowUp) return;
      if (values.date === "") {
        ctx.addIssue({
          code: "custom",
          path: ["date"],
          message: "Pick a follow-up date",
        });
      }
      if (values.time === "") {
        ctx.addIssue({
          code: "custom",
          path: ["time"],
          message: "Pick a follow-up time",
        });
      }
      if (values.date === "" || values.time === "") return;
      const followUp = combineLocalDateTime(values.date, values.time);
      if (Number.isNaN(followUp.getTime())) {
        ctx.addIssue({
          code: "custom",
          path: ["time"],
          message: "Enter a valid follow-up date and time",
        });
      } else if (isFollowUpInPast(followUp, getNow())) {
        ctx.addIssue({
          code: "custom",
          path: ["time"],
          message: "Follow-up time is in the past",
        });
      }
    });
}

export type NoteFormValues = z.infer<ReturnType<typeof createNoteSchema>>;

export function toCreateInput(values: NoteFormValues): DiscussionCreateInput {
  const note = values.note.trim();
  if (!values.setFollowUp) return { note };
  return {
    note,
    follow_up_at: combineLocalDateTime(values.date, values.time).toISOString(),
  };
}
