"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import {
  leadSchema,
  toCreateLeadInput,
  type LeadFormValues,
} from "@/lib/leadSchema";
import { useCreateLead } from "@/lib/queries";

type AddLeadDialogProps = {
  onClose: () => void;
};

const NAME_INPUT_ID = "lead-name";
const resolver = zodResolver(leadSchema);

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs text-red-600">
      {message}
    </p>
  );
}

export function AddLeadDialog({ onClose }: AddLeadDialogProps) {
  const { register, handleSubmit, formState } = useForm<LeadFormValues>({
    resolver,
    defaultValues: { name: "", company: "", phone: "" },
  });
  const mutation = useCreateLead();
  const { errors } = formState;

  const serverError = mutation.error
    ? mutation.error instanceof ApiError
      ? mutation.error.detail
      : "Could not save the lead"
    : null;

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(toCreateLeadInput(values), {
      onSuccess: () => {
        toast.success("Lead added");
        onClose();
      },
    });
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        initialFocus={() => document.getElementById(NAME_INPUT_ID)}
        className="gap-4 p-5 sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-900">
            Add New Lead
          </DialogTitle>
          <DialogDescription className="sr-only">
            Enter the details of the new lead.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={NAME_INPUT_ID}>
              Full Name
              <span aria-hidden className="text-red-600">
                *
              </span>
            </Label>
            <Input
              id={NAME_INPUT_ID}
              placeholder="e.g., John Doe"
              autoComplete="off"
              aria-required
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? "lead-name-error" : undefined}
              {...register("name")}
            />
            <FieldError id="lead-name-error" message={errors.name?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-company">Company (Optional)</Label>
            <Input
              id="lead-company"
              placeholder="e.g., Stark Industries"
              autoComplete="off"
              aria-invalid={errors.company ? true : undefined}
              aria-describedby={errors.company ? "lead-company-error" : undefined}
              {...register("company")}
            />
            <FieldError
              id="lead-company-error"
              message={errors.company?.message}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-phone">Phone (Optional)</Label>
            <Input
              id="lead-phone"
              type="tel"
              placeholder="e.g., 555-0123"
              autoComplete="off"
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={errors.phone ? "lead-phone-error" : undefined}
              {...register("phone")}
            />
            <FieldError id="lead-phone-error" message={errors.phone?.message} />
          </div>
          {serverError ? (
            <p role="alert" className="text-sm text-red-600">
              {serverError}
            </p>
          ) : null}
          <DialogFooter className="-mx-5 -mb-5 border-t bg-transparent px-5 py-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {mutation.isPending ? "Saving..." : "Save Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
