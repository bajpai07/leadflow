import { ErrorNotice } from "@/components/ErrorNotice";
import { TimelineItem } from "@/components/leads/TimelineItem";
import { Skeleton } from "@/components/ui/skeleton";
import { useDiscussions } from "@/lib/queries";

type TimelineListProps = {
  leadId: number;
  now: Date;
};

export function TimelineList({ leadId, now }: TimelineListProps) {
  const { data, error, isPending, refetch } = useDiscussions(leadId);

  if (isPending) {
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
  if (error) {
    return <ErrorNotice error={error} onRetry={() => void refetch()} />;
  }
  if (data.length === 0) return null;

  return (
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
  );
}
