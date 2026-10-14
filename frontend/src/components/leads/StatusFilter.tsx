import { STATUS_CONFIG, STATUS_ORDER } from "@/lib/status";
import type { LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type StatusFilterProps = {
  selected: LeadStatus | undefined;
  onChange: (status: LeadStatus | undefined) => void;
};

const OPTIONS: readonly { value: LeadStatus | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  ...STATUS_ORDER.map((value) => ({
    value,
    label: STATUS_CONFIG[value].label,
  })),
];

export function StatusFilter({ selected, onChange }: StatusFilterProps) {
  return (
    <div className="flex min-w-0 items-center gap-3 overflow-x-auto pb-1">
      <span className="shrink-0 text-xs font-semibold tracking-wider text-gray-600 uppercase">
        Filters:
      </span>
      <div className="flex gap-2">
        {OPTIONS.map(({ value, label }) => {
          const isSelected = value === selected;
          return (
            <button
              key={label}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(value)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none",
                isSelected
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
