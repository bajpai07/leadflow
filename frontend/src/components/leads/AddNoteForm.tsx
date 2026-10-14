"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import {
  createNoteSchema,
  toCreateInput,
  type NoteFormValues,
} from "@/lib/noteSchema";
import { useAddDiscussion } from "@/lib/queries";
import { toDateInputValue } from "@/lib/time";

type AddNoteFormProps = {
  leadId: number;
  now: Date;
  onSaved: () => void;
};

const DEFAULT_VALUES: NoteFormValues = {
  note: "",
  setFollowUp: false,
  date: "",
  time: "",
};

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs text-red-600">
      {message}
    </p>
  );
}

export function AddNoteForm({ leadId, now, onSaved }: AddNoteFormProps) {
  const resolver = useMemo(
    () => zodResolver(createNoteSchema(() => new Date())),
    [],
  );
  const { register, control, handleSubmit, reset, setFocus, formState } =
    useForm<NoteFormValues>({ resolver, defaultValues: DEFAULT_VALUES });
  const setFollowUp = useWatch({ control, name: "setFollowUp" });
  const mutation = useAddDiscussion(leadId);
  const { errors } = formState;

  const serverError = mutation.error
    ? mutation.error instanceof ApiError
      ? mutation.error.detail
      : "Could not save the note"
    : null;

  const onSubmit = handleSubmit((values) => {
    if (mutation.isPending) return;
    mutation.mutate(toCreateInput(values), {
      onSuccess: () => {
        toast.success("Note saved");
        reset(DEFAULT_VALUES);
        onSaved();
      },
    });
  });

  const saved = mutation.isSuccess;
  useEffect(() => {
    if (saved) setFocus("note");
  }, [saved, setFocus]);

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Textarea
          rows={3}
          placeholder="Log a new discussion..."
          aria-label="New discussion note"
          aria-invalid={errors.note ? true : undefined}
          aria-describedby={errors.note ? "note-error" : undefined}
          {...register("note")}
        />
        <FieldError id="note-error" message={errors.note?.message} />
      </div>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <Controller
          control={control}
          name="setFollowUp"
          render={({ field }) => (
            <Label className="h-8 cursor-pointer">
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                onBlur={field.onBlur}
              />
              Set Follow-up
            </Label>
          )}
        />
        <div className="flex flex-col gap-1">
          <Controller
            control={control}
            name="date"
            render={({ field }) => (
              <Input
                type="date"
                aria-label="Follow-up date"
                min={toDateInputValue(now)}
                disabled={!setFollowUp}
                aria-invalid={errors.date ? true : undefined}
                aria-describedby={errors.date ? "date-error" : undefined}
                className="w-40"
                {...field}
              />
            )}
          />
          <FieldError id="date-error" message={errors.date?.message} />
        </div>
        <div className="flex flex-col gap-1">
          <Controller
            control={control}
            name="time"
            render={({ field }) => (
              <Input
                type="time"
                aria-label="Follow-up time"
                disabled={!setFollowUp}
                aria-invalid={errors.time ? true : undefined}
                aria-describedby={errors.time ? "time-error" : undefined}
                className="w-32"
                {...field}
              />
            )}
          />
          <FieldError id="time-error" message={errors.time?.message} />
        </div>
      </div>
      {serverError ? (
        <p role="alert" className="text-sm text-red-600">
          {serverError}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button
          type="submit"
          aria-disabled={mutation.isPending || undefined}
          className="bg-gray-900 text-white hover:bg-gray-800 aria-disabled:cursor-wait aria-disabled:opacity-50"
        >
          {mutation.isPending ? "Saving..." : "Save Note"}
        </Button>
      </div>
    </form>
  );
}
