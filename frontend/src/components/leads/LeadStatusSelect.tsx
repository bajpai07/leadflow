import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_CONFIG, STATUS_ORDER } from "@/lib/status";
import type { LeadStatus } from "@/lib/types";

const ITEMS = STATUS_ORDER.map((value) => ({
  value,
  label: STATUS_CONFIG[value].label,
}));

type LeadStatusSelectProps = {
  value: LeadStatus;
  onChange: (status: LeadStatus) => void;
};

export function LeadStatusSelect({ value, onChange }: LeadStatusSelectProps) {
  return (
    <Select
      value={value}
      items={ITEMS}
      onValueChange={(next) => {
        const status = STATUS_ORDER.find((candidate) => candidate === next);
        if (status && status !== value) onChange(status);
      }}
    >
      <SelectTrigger aria-label="Lead status" size="sm" className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {ITEMS.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
