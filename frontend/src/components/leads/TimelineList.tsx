import { ErrorNotice } from "@/components/ErrorNotice";
import { TimelineItem } from "@/components/leads/TimelineItem";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDiscussions } from "@/lib/queries";
import { viewState } from "@/lib/viewState";

type TimelineListProps = {
  leadId: number;
  now: Date;
  suppressRefreshNotice?: boolean;
};

export function TimelineList({
  leadId,
  now,
  suppressRefreshNotice = false,
}: TimelineListProps) {
  const { data, error, isPending, refetch } = useDiscussions(leadId);

  const state = viewState(data, error, isPending);

  if (state === "loading") {
    return (
      <div
        className="flex flex-col gap-4"
        aria-busy="true"
        aria-label="Loading discussions"
      >
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    );
  }
  if (state === "error" && error) {
    return <ErrorNotice error={error} onRetry={() => void refetch()} />;
  }
  if (!data || data.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {state === "stale" && !suppressRefreshNotice ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          <span>Couldn&apos;t refresh.</span>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : null}
      <ol className="flex flex-col">
        {data.map((discussion, index) => (
          <TimelineItem
            key={discussion.id}
            discussion={discussion}
            isLatest={index === 0}
            isLast={index === data.length - 1}
            now={now}
          />
        ))}
      </ol>
    </div>
  );
}
