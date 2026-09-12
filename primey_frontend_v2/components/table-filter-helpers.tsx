"use client";

import * as React from "react";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { FilterOption } from "@/components/ui/filters/filters-types";

export function Dot({ className }: { className?: string }) {
  return <span className={cn("size-2 shrink-0 rounded-full", className)} />;
}

/**
 * The chip's value display for a dot-coded select field: one pick reads as its
 * swatch and its word, several collapse to overlapping swatches plus a count,
 * so the chip is one width however many options are picked.
 */
export function StackedDots({
  options,
  dots,
  empty
}: {
  options: FilterOption[];
  dots: Map<string, string>;
  empty: string;
}) {
  if (options.length === 0) return <>{empty}</>;
  if (options.length === 1) {
    return (
      <span className="flex items-center gap-1.5">
        <Dot className={dots.get(options[0].value) ?? "bg-muted-foreground"} />
        {options[0].label}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex items-center">
        {options.slice(0, 4).map((option) => (
          <span
            key={option.value}
            className={cn(
              "ring-background -ml-1 size-2.5 rounded-full ring-2 first:ml-0",
              dots.get(option.value) ?? "bg-muted-foreground"
            )}
          />
        ))}
      </span>
      <span className="text-muted-foreground text-xs tabular-nums">{options.length}</span>
    </span>
  );
}

export function SortableHeader({
  column,
  children
}: {
  column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | "asc" | "desc" };
  children: React.ReactNode;
}) {
  const sorted = column.getIsSorted();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ms-2.5"
      onClick={() => column.toggleSorting(sorted === "asc")}>
      {children}
      {sorted === "asc" ? (
        <ArrowUpIcon className="size-3.5" />
      ) : sorted === "desc" ? (
        <ArrowDownIcon className="size-3.5" />
      ) : (
        <ChevronsUpDownIcon className="size-3.5 opacity-50" />
      )}
    </Button>
  );
}
