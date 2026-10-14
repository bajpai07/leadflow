import { TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";

type AppHeaderProps = {
  onAddLead: () => void;
};

export function AppHeader({ onAddLead }: AppHeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-[1000px] items-center justify-between px-4 py-3">
        <h1 className="flex items-center gap-2 text-xl font-bold text-blue-600">
          <TrendingUp aria-hidden className="size-5" />
          <span>LeadFlow</span>
        </h1>
        <Button
          onClick={onAddLead}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          + Add New Lead
        </Button>
      </div>
    </header>
  );
}
