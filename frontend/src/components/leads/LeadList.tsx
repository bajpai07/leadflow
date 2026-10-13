import type { ReactNode } from "react";

import { LeadSection } from "@/components/leads/LeadSection";
import type { GroupedLeads } from "@/lib/time";
import type { Lead } from "@/lib/types";

type LeadListProps = {
  groups: GroupedLeads;
  now: Date;
  onSelect?: (lead: Lead) => void;
  emptyState: ReactNode;
};

export function LeadList({ groups, now, onSelect, emptyState }: LeadListProps) {
  const isEmpty =
    groups.overdue.length + groups.today.length + groups.rest.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <LeadSection
        title="Overdue"
        group="overdue"
        leads={groups.overdue}
        now={now}
        onSelect={onSelect}
      />
      <LeadSection
        title="Today's Follow-ups"
        icon="📌"
        group="today"
        leads={groups.today}
        now={now}
        onSelect={onSelect}
      />
      <LeadSection
        title="All Leads"
        group="rest"
        leads={groups.rest}
        now={now}
        onSelect={onSelect}
        emptyState={isEmpty ? emptyState : undefined}
      />
    </div>
  );
}
