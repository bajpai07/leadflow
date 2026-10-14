import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-gray-500"
      />
      <Input
        type="text"
        inputMode="search"
        autoComplete="off"
        aria-label="Search leads by name"
        placeholder="Search by name"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-white pr-8 pl-8"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
        >
          <X aria-hidden className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
