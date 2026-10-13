"use client";

import { useState } from "react";

import { LeadList } from "@/components/leads/LeadList";
import { StatusFilter } from "@/components/leads/StatusFilter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { useLeads } from "@/lib/queries";
import { STATUS_CONFIG } from "@/lib/status";
import { groupLeads } from "@/lib/time";
import type { LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useNow } from "@/lib/useNow";

function LeadListSkeleton() {
  return (
    <div
      className="flex flex-col gap-3"
      aria-busy="true"
      aria-label="Loading leads"
    >
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

function LeadListError({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  const message =
    error instanceof ApiError ? error.detail : "Something went wrong";

  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
    >
      <p>{message}</p>
      <Button variant="outline" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function EmptyState({
  status,
  onShowAll,
}: {
  status: LeadStatus | undefined;
  onShowAll: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
      {status ? (
        <>
          <p>No {STATUS_CONFIG[status].label} leads.</p>
          <Button variant="outline" onClick={onShowAll}>
            Show all
          </Button>
        </>
      ) : (
        <p>No leads yet. Add your first lead.</p>
      )}
    </div>
  );
}

export function LeadBoard() {
  const now = useNow();
  const [status, setStatus] = useState<LeadStatus | undefined>(undefined);
  const { data, error, refetch, isPlaceholderData } = useLeads(status);

  const content = (() => {
    if (error && !data) {
      return <LeadListError error={error} onRetry={() => void refetch()} />;
    }
    if (!data || now === null) {
      return <LeadListSkeleton />;
    }
    return (
      <LeadList
        groups={groupLeads(data, now)}
        now={now}
        emptyState={
          <EmptyState status={status} onShowAll={() => setStatus(undefined)} />
        }
      />
    );
  })();

  return (
    <div className="flex flex-col gap-6">
      <StatusFilter selected={status} onChange={setStatus} />
      <div
        aria-busy={isPlaceholderData}
        className={cn(
          "transition-opacity",
          isPlaceholderData && "opacity-60",
        )}
      >
        {content}
      </div>
    </div>
  );
}
