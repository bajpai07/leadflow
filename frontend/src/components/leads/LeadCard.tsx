import { StatusBadge } from "@/components/leads/StatusBadge";
import { isClosed } from "@/lib/status";
import { formatFollowUpLabel, timeAgo, type FollowUpGroup } from "@/lib/time";
import type { Lead } from "@/lib/types";
import { cn } from "@/lib/utils";

type LeadCardProps = {
  lead: Lead;
  group: FollowUpGroup;
  now: Date;
  onSelect?: (lead: Lead) => void;
};

const CARD_STYLES: Record<FollowUpGroup, string> = {
  today: "border-blue-200 bg-blue-50",
  overdue: "border-red-300 bg-red-50",
  rest: "border-gray-200 bg-white",
};

const CHIP_STYLES: Record<FollowUpGroup, { emoji: string; className: string }> =
  {
    today: { emoji: "🔔", className: "bg-blue-100 text-blue-700" },
    overdue: { emoji: "⚠️", className: "bg-red-100 text-red-700" },
    rest: { emoji: "📅", className: "bg-gray-100 text-gray-600" },
  };

export function LeadCard({ lead, group, now, onSelect }: LeadCardProps) {
  const followUpLabel = formatFollowUpLabel(lead, group);
  const chip = CHIP_STYLES[group];
  const lastActivity = lead.last_discussion_at
    ? timeAgo(lead.last_discussion_at, now)
    : null;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(lead)}
      className={cn(
        "flex w-full flex-col gap-2 rounded-xl border p-4 text-left shadow-sm transition-colors hover:border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none",
        CARD_STYLES[group],
        isClosed(lead.status) && "opacity-60",
      )}
    >
      <span className="flex w-full items-start justify-between gap-3">
        <span className="min-w-0 truncate font-semibold text-gray-900">
          {lead.name}
          {lead.company ? (
            <span className="ml-1.5 text-sm font-normal text-gray-500">
              ({lead.company})
            </span>
          ) : null}
        </span>
        <StatusBadge status={lead.status} />
      </span>
      <span className="flex w-full items-baseline gap-2 text-sm text-gray-600">
        <span className="min-w-0 truncate">
          <span className="font-semibold text-gray-700">Last Note:</span>{" "}
          {lead.last_note}
        </span>
        {lastActivity ? (
          <span className="shrink-0 text-xs text-gray-400">{lastActivity}</span>
        ) : null}
      </span>
      {followUpLabel ? (
        <span
          className={cn(
            "inline-flex w-fit items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
            chip.className,
          )}
        >
          <span aria-hidden>{chip.emoji}</span>
          {followUpLabel}
        </span>
      ) : null}
    </button>
  );
}
