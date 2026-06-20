"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  Table2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AnalyticsTableColumn<T extends Record<string, unknown>> = {
  key: keyof T | string;
  label: string;
  className?: string;
  headerClassName?: string;
  render?: (row: T, index: number) => ReactNode;
  sortable?: boolean;
};

type AnalyticsTableAction<T extends Record<string, unknown>> = {
  label: string;
  href?: string;
  onClick?: (row: T) => void;
};

type AnalyticsTableCardProps<T extends Record<string, unknown>> = {
  title: string;
  description?: string;
  columns: AnalyticsTableColumn<T>[];
  rows: T[];

  getRowKey?: (row: T, index: number) => string;
  getRowHref?: (row: T, index: number) => string | undefined;
  rowAction?: AnalyticsTableAction<T>;

  emptyLabel?: string;
  actionLabel?: string;
  actionHref?: string;

  icon?: LucideIcon;
  loading?: boolean;
  className?: string;

  filterPlaceholder?: string;
  selectedLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
};

function formatCellValue(value: unknown): ReactNode {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "number") {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(value);
  }

  return String(value);
}

function getGridStyle(columnCount: number): CSSProperties {
  return {
    "--analytics-table-columns": columnCount,
  } as CSSProperties;
}

function AnalyticsTableRow<T extends Record<string, unknown>>({
  row,
  rowIndex,
  columns,
  rowHref,
  rowAction,
}: {
  row: T;
  rowIndex: number;
  columns: AnalyticsTableColumn<T>[];
  rowHref?: string;
  rowAction?: AnalyticsTableAction<T>;
}) {
  const content = (
    <div className="grid min-w-[900px] grid-cols-[44px_repeat(var(--analytics-table-columns),minmax(0,1fr))_44px] items-center border-b transition-colors hover:bg-muted/30">
      <div className="flex h-14 items-center justify-center">
        <input
          type="checkbox"
          aria-label="Select row"
          className="size-4 rounded border border-border bg-background accent-foreground"
          onClick={(event) => event.stopPropagation()}
        />
      </div>

      {columns.map((column) => {
        const rawValue = row[column.key as keyof T];

        return (
          <div
            key={String(column.key)}
            className={cn(
              "flex h-14 min-w-0 items-center px-3 text-sm",
              column.className,
            )}
          >
            {column.render
              ? column.render(row, rowIndex)
              : formatCellValue(rawValue)}
          </div>
        );
      })}

      <div className="flex h-14 items-center justify-center">
        {rowAction?.href ? (
          <Link
            href={rowAction.href}
            aria-label={rowAction.label}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontal className="size-4" />
          </Link>
        ) : rowAction?.onClick ? (
          <button
            type="button"
            aria-label={rowAction.label}
            onClick={(event) => {
              event.stopPropagation();
              rowAction.onClick?.(row);
            }}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <MoreHorizontal className="size-4" />
          </button>
        ) : (
          <span className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground">
            <MoreHorizontal className="size-4" />
          </span>
        )}
      </div>
    </div>
  );

  if (rowHref) {
    return (
      <Link href={rowHref} className="block focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}

export function AnalyticsTableCard<T extends Record<string, unknown>>({
  title,
  description,
  columns,
  rows,
  getRowKey,
  getRowHref,
  rowAction,
  emptyLabel,
  actionLabel,
  actionHref,
  icon: Icon = Table2,
  loading = false,
  className,
  filterPlaceholder = "Filter leads...",
  selectedLabel,
  previousLabel = "Previous",
  nextLabel = "Next",
}: AnalyticsTableCardProps<T>) {
  const columnCount = Math.max(columns.length, 1);

  return (
    <Card className={cn("h-full overflow-hidden", className)} dir="ltr">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <CardTitle>{title}</CardTitle>

            {description && <CardDescription>{description}</CardDescription>}
          </div>

          {!actionLabel && (
            <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-full border">
              <Icon className="size-4" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            placeholder={filterPlaceholder}
            className={cn(
              "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors sm:max-w-sm",
              "placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/15",
            )}
          />

          {actionHref && actionLabel ? (
            <Link href={actionHref} className="shrink-0">
              <Button variant="outline" className="h-10 rounded-md">
                <span>{actionLabel}</span>
                <ChevronDown className="size-4" />
              </Button>
            </Link>
          ) : actionLabel ? (
            <Button variant="outline" className="h-10 shrink-0 rounded-md">
              <span>{actionLabel}</span>
              <ChevronDown className="size-4" />
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="overflow-hidden rounded-md border">
            <div className="h-11 animate-pulse border-b bg-muted" />
            <div className="h-14 animate-pulse border-b bg-muted/60" />
            <div className="h-14 animate-pulse border-b bg-muted/40" />
            <div className="h-14 animate-pulse border-b bg-muted/60" />
            <div className="h-14 animate-pulse bg-muted/40" />
          </div>
        ) : rows.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-md border">
              <div style={getGridStyle(columnCount)}>
                <div className="grid min-w-[900px] grid-cols-[44px_repeat(var(--analytics-table-columns),minmax(0,1fr))_44px] items-center border-b bg-background">
                  <div className="flex h-11 items-center justify-center">
                    <input
                      type="checkbox"
                      aria-label="Select all rows"
                      className="size-4 rounded border border-border bg-background accent-foreground"
                    />
                  </div>

                  {columns.map((column) => (
                    <div
                      key={String(column.key)}
                      className={cn(
                        "flex h-11 min-w-0 items-center gap-1 px-3 text-xs font-medium text-muted-foreground",
                        column.headerClassName,
                      )}
                    >
                      <span className="truncate">{column.label}</span>

                      {column.sortable !== false && (
                        <ArrowUpDown className="size-3 shrink-0" />
                      )}
                    </div>
                  ))}

                  <div />
                </div>

                <div>
                  {rows.map((row, index) => (
                    <AnalyticsTableRow
                      key={getRowKey ? getRowKey(row, index) : String(index)}
                      row={row}
                      rowIndex={index}
                      columns={columns}
                      rowHref={getRowHref?.(row, index)}
                      rowAction={rowAction}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedLabel || `0 of ${rows.length} row(s) selected.`}
              </p>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  className="rounded-md"
                >
                  {previousLabel}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  className="rounded-md"
                >
                  {nextLabel}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex min-h-[220px] items-center justify-center rounded-md border border-dashed bg-background/50 p-6 text-center text-sm text-muted-foreground">
            {emptyLabel || "No data available"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type {
  AnalyticsTableAction,
  AnalyticsTableCardProps,
  AnalyticsTableColumn,
};