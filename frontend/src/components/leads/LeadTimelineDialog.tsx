"use client";

import { XIcon } from "lucide-react";
import { useRef } from "react";

import { ErrorNotice } from "@/components/ErrorNotice";
import { AddNoteForm } from "@/components/leads/AddNoteForm";
import { LeadStatusSelect } from "@/components/leads/LeadStatusSelect";
import { TimelineList } from "@/components/leads/TimelineList";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { useLead, useUpdateStatus } from "@/lib/queries";

type LeadTimelineDialogProps = {
  leadId: number;
  now: Date;
  onClose: () => void;
};

export function LeadTimelineDialog({
  leadId,
  now,
  onClose,
}: LeadTimelineDialogProps) {
  const { data: lead, error, refetch } = useLead(leadId);
  const statusMutation = useUpdateStatus(leadId);
  const timelineRef = useRef<HTMLDivElement>(null);
  const statusError = statusMutation.error
    ? statusMutation.error instanceof ApiError
      ? statusMutation.error.detail
      : "Could not update the status"
    : null;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90vh] w-full max-w-[calc(100%-2rem)] flex-col gap-0 p-0 sm:max-w-[680px]"
      >
        <DialogHeader className="flex-row items-start justify-between gap-3 border-b border-gray-200 p-4">
          <div className="min-w-0">
            {lead ? (
              <>
                <DialogTitle className="text-lg leading-tight font-bold text-gray-900">
                  {lead.name}
                  {lead.company ? (
                    <span className="ml-1.5 font-normal text-gray-500">
                      ({lead.company})
                    </span>
                  ) : null}
                </DialogTitle>
                {lead.phone ? (
                  <DialogDescription className="mt-1">
                    <span aria-hidden>📞 </span>
                    {lead.phone}
                  </DialogDescription>
                ) : null}
              </>
            ) : (
              <>
                <DialogTitle className="sr-only">Lead details</DialogTitle>
                <Skeleton className="h-6 w-48" />
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {lead ? (
              <LeadStatusSelect
                value={lead.status}
                onChange={(status) => statusMutation.mutate(status)}
              />
            ) : null}
            <DialogClose
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Close" />
              }
            >
              <XIcon aria-hidden />
            </DialogClose>
          </div>
        </DialogHeader>
        {statusError ? (
          <p
            role="alert"
            className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
          >
            {statusError}
          </p>
        ) : null}
        <div
          ref={timelineRef}
          className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
        >
          {error && !lead ? (
            <ErrorNotice error={error} onRetry={() => void refetch()} />
          ) : (
            <TimelineList leadId={leadId} now={now} />
          )}
        </div>
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <AddNoteForm
            leadId={leadId}
            now={now}
            onSaved={() => timelineRef.current?.scrollTo({ top: 0 })}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
