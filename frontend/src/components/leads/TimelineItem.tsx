import { formatFollowUpChip, formatTimelineStamp, timeAgo } from "@/lib/time";
import type { Discussion } from "@/lib/types";
import { cn } from "@/lib/utils";

const SYSTEM_NOTE = "Lead created.";

type TimelineItemProps = {
  discussion: Discussion;
  isLatest: boolean;
  isLast: boolean;
  now: Date;
};

export function TimelineItem({
  discussion,
  isLatest,
  isLast,
  now,
}: TimelineItemProps) {
  const isSystemNote = discussion.note === SYSTEM_NOTE;

  return (
    <li className="relative pb-6 pl-8 last:pb-0">
      {isLast ? null : (
        <span
          aria-hidden
          className="absolute top-4 bottom-0 left-[6px] w-px bg-gray-200"
        />
      )}
      <span
        aria-hidden
        className={cn(
          "absolute top-1 left-0 size-3.5 rounded-full border-2 border-white",
          isLatest ? "bg-blue-500" : "bg-gray-300",
        )}
      />
      <p className="text-xs text-gray-500">
        <span className="font-medium text-gray-700">
          {formatTimelineStamp(discussion.created_at)}
        </span>{" "}
        <span className="text-gray-400">
          ({timeAgo(discussion.created_at, now)})
        </span>
      </p>
      <div className="mt-1.5 flex flex-col items-start gap-2 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800">
        <p
          className={cn(
            "whitespace-pre-wrap",
            isSystemNote && "text-gray-500 italic",
          )}
        >
          {discussion.note}
        </p>
        {discussion.follow_up_at ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
            <span aria-hidden>📅</span>
            Follow-up set for: {formatFollowUpChip(discussion.follow_up_at)}
          </span>
        ) : null}
      </div>
    </li>
  );
}
