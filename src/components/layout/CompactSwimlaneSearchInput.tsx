"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CompactSwimlaneSearchInputProps = {
  open: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  onClose: () => void;
  placeholder: string;
  autoFocus?: boolean;
};

export function CompactSwimlaneSearchInput({
  open,
  query,
  onQueryChange,
  onClose,
  placeholder,
  autoFocus = true,
}: CompactSwimlaneSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && autoFocus) {
      inputRef.current?.focus();
    }
  }, [open, autoFocus]);

  if (!open) return null;

  return (
    <div className="relative border-b px-2 py-1.5">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onClose();
          }
        }}
        placeholder={placeholder}
        className={cn("h-7 pl-7 pr-7 text-xs")}
        aria-label={placeholder}
        data-testid="compact-swimlane-search-input"
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close search"
        className="absolute right-3 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
