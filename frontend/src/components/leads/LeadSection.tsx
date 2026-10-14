import type { ReactNode } from "react";

import { LeadCard } from "@/components/leads/LeadCard";
import type { FollowUpGroup } from "@/lib/time";
import type { Lead } from "@/lib/types";
import { cn } from "@/lib/utils";

type LeadSectionProps = {
  title: string;
  icon?: string;
  group: FollowUpGroup;
  leads: readonly Lead[];
  now: Date;
  onSelect?: (lead: Lead) => void;
  emptyState?: ReactNode;
};

export function LeadSection({
  title,
  icon,
  group,
  leads,
  now,
  onSelect,
  emptyState,
}: LeadSectionProps) {
  if (leads.length === 0 && !emptyState) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2
        className={cn(
          "text-xs font-semibold tracking-wider uppercase",
          group === "overdue" ? "text-red-700" : "text-gray-600",
        )}
      >
        {icon ? <span aria-hidden>{icon} </span> : null}
        {title} ({leads.length})
      </h2>
      {leads.length === 0 ? (
        emptyState
      ) : (
        <ul className="flex flex-col gap-3">
          {leads.map((lead) => (
            <li key={lead.id}>
              <LeadCard
                lead={lead}
                group={group}
                now={now}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
