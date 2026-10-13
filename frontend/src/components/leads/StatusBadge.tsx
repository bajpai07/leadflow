import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG } from "@/lib/status";
import type { LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: LeadStatus }) {
  const { label, badgeClass } = STATUS_CONFIG[status];

  return (
    <Badge
      className={cn(
        "h-6 rounded-full px-2.5 text-[11px] font-semibold tracking-wide uppercase",
        badgeClass,
      )}
    >
      {label}
    </Badge>
  );
}
