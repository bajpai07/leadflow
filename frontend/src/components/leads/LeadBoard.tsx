"use client";

import { LeadList } from "@/components/leads/LeadList";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { useLeads } from "@/lib/queries";
import { groupLeads } from "@/lib/time";
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

export function LeadBoard() {
  const now = useNow();
  const { data, error, refetch } = useLeads();

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
        <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
          No leads yet. Add your first lead.
        </p>
      }
    />
  );
}
