"use client";

import * as React from "react";
import { flexRender } from "@tanstack/react-table";
import {
  type LegacyColumnDef as ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useLegacyTable as useReactTable,
} from "@tanstack/react-table/legacy";
import type {
  ColumnFiltersState,
  SortingState,
  ColumnVisibilityState as VisibilityState,
} from "@tanstack/table-core";
import {
  Activity,
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDown,
  FolderUp,
  MinusIcon,
} from "lucide-react";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ChangeMetric = {
  current: number;
  previous: number;
  delta: number;
  change_percent: number | null;
  direction: "up" | "down" | "stable";
};

type Events = {
  new: ChangeMetric;
  renewals: ChangeMetric;
  activated: ChangeMetric;
  expired: ChangeMetric;
};

type SubscriptionRow = {
  id: string;
  companyName: string;
  planName: string;
  billingCycle: string;
  amount: number;
  status: string;
  endDate: string;
};

type Props = {
  locale: "ar" | "en";
  events: Events;
  rows: Record<string, any>[];
  labels: {
    title: string;
    description: string;
    new: string;
    renewals: string;
    activated: string;
    expired: string;
    compare: string;
    noBaseline: string;
    filter: string;
    columns: string;
    id: string;
    company: string;
    plan: string;
    cycle: string;
    amount: string;
    status: string;
    previous: string;
    next: string;
    of: string;
    subscriptions: string;
    export: string;
    excel: string;
    print: string;
    noResults: string;
    sar: string;
  };
};

function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}
function number(value: unknown) {
  const parsed = Number(String(value ?? 0).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
function nestedName(value: unknown) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const row = value as Record<string, unknown>;
  return text(row.name || row.title || row.display_name || row.full_name);
}
function normalize(row: Record<string, any>): SubscriptionRow {
  return {
    id: text(row.id || row.pk),
    companyName: text(row.company_name) || nestedName(row.company),
    planName: text(row.plan_name) || nestedName(row.plan),
    billingCycle: text(row.billing_cycle),
    amount: number(row.total_amount ?? row.amount ?? row.price),
    status: text(row.status),
    endDate: text(row.end_date || row.ends_at),
  };
}
function money(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value ?? "0").replace(/,/g, ""));

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

function cycleLabel(value: unknown, locale: "ar" | "en") {
  const raw = text(value);
  const key = raw.toLowerCase().replace(/[\s-]+/g, "_");
  if (locale === "ar") {
    const labels: Record<string, string> = {
      monthly: "شهري",
      month: "شهري",
      yearly: "سنوي",
      annual: "سنوي",
      annually: "سنوي",
      year: "سنوي",
      quarterly: "ربع سنوي",
      weekly: "أسبوعي",
      daily: "يومي",
    };
    return labels[key] ?? raw;
  }
  return raw
    ? raw.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase())
    : "—";
}

function statusLabel(value: unknown, locale: "ar" | "en") {
  const raw = text(value);
  if (!raw) return "—";
  const key = raw.toLowerCase().replace(/[\s-]+/g, "_");
  if (locale === "ar") {
    const labels: Record<string, string> = {
      active: "نشط",
      inactive: "غير نشط",
      trial: "تجريبي",
      pending: "معلق",
      pending_payment: "بانتظار الدفع",
      processing: "قيد المعالجة",
      paid: "مدفوع",
      failed: "فشل",
      cancelled: "ملغي",
      canceled: "ملغي",
      expired: "منتهي",
      suspended: "موقوف",
      past_due: "متأخر السداد",
    };
    return labels[key] ?? raw;
  }
  return raw.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function metricTone(metric: ChangeMetric, inverse = false) {
  if (metric.direction === "stable") return { Icon: MinusIcon, className: "text-muted-foreground" };
  const positive = inverse ? metric.direction === "down" : metric.direction === "up";
  return {
    Icon: metric.direction === "up" ? ArrowUpIcon : ArrowDownIcon,
    className: positive ? "text-green-500" : "text-red-500",
  };
}
function statusVariant(value: unknown) {
  const key = text(value).toLowerCase().replace(/[\s-]+/g, "_");

  if (["active", "paid", "confirmed", "completed", "success", "succeeded", "ready"].includes(key)) {
    return "success";
  }

  if (["trial", "new", "new_order"].includes(key)) {
    return "info";
  }

  if (["expired", "cancelled", "canceled", "failed", "suspended", "blocked", "refunded", "partially_refunded"].includes(key)) {
    return "destructive";
  }

  if (["pending", "pending_payment", "payment_pending", "awaiting_payment", "processing", "processing_payment", "past_due", "overdue", "draft"].includes(key)) {
    return "warning";
  }

  return "outline";
}

function StatusBadge({ status, locale }: { status: string; locale: "ar" | "en" }) {
  return <Badge variant={statusVariant(status) as any}>{statusLabel(status, locale)}</Badge>;
}

export function SubscriptionStatusTable({ locale, events, rows, labels }: Props) {
  const data = React.useMemo(() => rows.map(normalize), [rows]);
  const columns = React.useMemo<ColumnDef<SubscriptionRow>[]>(
    () => [
      { accessorKey: "id", header: labels.id, size: 80 },
      {
        accessorKey: "companyName",
        header: labels.company,
        cell: ({ row }) => <div className="truncate font-medium">{row.getValue("companyName")}</div>,
      },
      {
        accessorKey: "planName",
        header: labels.plan,
        cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("planName")}</span>,
      },
      {
        accessorKey: "billingCycle",
        header: labels.cycle,
        size: 120,
        cell: ({ row }) => <span className="text-muted-foreground">{cycleLabel(row.getValue("billingCycle"), locale)}</span>,
      },
      {
        accessorKey: "amount",
        header: labels.amount,
        size: 110,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1 font-medium tabular-nums">
            <Image src="/currency/sar.svg" width={14} height={14} alt={labels.sar} />
            {money(row.getValue("amount"))}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: labels.status,
        size: 130,
        cell: ({ row }) => <StatusBadge status={row.original.status} locale={locale} />,
      },
    ],
    [labels, locale],
  );

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: { sorting, columnFilters, columnVisibility },
    initialState: { pagination: { pageIndex: 0, pageSize: 6 } },
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;
  const firstRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const lastRow = Math.min((pageIndex + 1) * pageSize, totalRows);

  const metrics = [
    { key: "new", label: labels.new, metric: events.new, bar: "bg-blue-400", bg: "bg-blue-100 dark:bg-blue-950", inverse: false },
    { key: "renewals", label: labels.renewals, metric: events.renewals, bar: "bg-teal-400", bg: "bg-teal-100 dark:bg-teal-950", inverse: false },
    { key: "activated", label: labels.activated, metric: events.activated, bar: "bg-green-400", bg: "bg-green-100 dark:bg-green-950", inverse: false },
    { key: "expired", label: labels.expired, metric: events.expired, bar: "bg-orange-400", bg: "bg-orange-100 dark:bg-orange-950", inverse: true },
  ] as const;
  const statusTotal = Math.max(1, metrics.reduce((sum, item) => sum + item.metric.current, 0));

  function exportCsv() {
    const headers = [labels.id, labels.company, labels.plan, labels.cycle, labels.amount, labels.status];
    const csvRows = data.map((row) => [row.id, row.companyName, row.planName, row.billingCycle, row.amount, row.status]);
    const csv = "\uFEFF" + [headers, ...csvRows].map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mhamcloud-system-subscriptions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle icon={Activity}>{labels.title}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FolderUp /> <span className="hidden lg:inline">{labels.export}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportCsv}>{labels.excel}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()}>{labels.print}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col p-0 [&_[data-slot=table-container]]:flex-1">
        <div className="grid gap-4 p-(--card-spacing) md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((item) => {
            const { Icon, className } = metricTone(item.metric, item.inverse);
            return (
              <div key={item.key} className="space-y-2">
                <div className="font-display text-2xl lg:text-3xl">{item.metric.current}</div>
                <div className="flex gap-2">
                  <div className="text-muted-foreground text-sm">{item.label}</div>
                  <div className={`flex items-center gap-0.5 text-xs ${className}`}>
                    <Icon className="size-3" />
                    {item.metric.change_percent === null ? "—" : `${Math.abs(item.metric.change_percent).toFixed(1)}%`}
                  </div>
                </div>
                <Progress
                  value={(item.metric.current / statusTotal) * 100}
                  className={`h-2 ${item.bg}`}
                  indicatorColor={item.bar}
                />
              </div>
            );
          })}
        </div>

        <div>
          <div className="flex min-h-14 items-center gap-2 border-y px-(--card-spacing) py-3">
            <Input
              placeholder={labels.filter}
              value={(table.getColumn("companyName")?.getFilterValue() as string) ?? ""}
              onChange={(event) => table.getColumn("companyName")?.setFilterValue(event.target.value)}
              className="max-w-sm"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ms-auto">
                  {labels.columns} <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Table className="min-w-[760px] table-fixed [&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{
                        width: header.getSize() !== 150 ? header.getSize() : undefined
                      }}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} href={row.original.id ? `/system/subscriptions/${row.original.id}` : undefined}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    {labels.noResults}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-end gap-2 border-t px-(--card-spacing) py-3">
            <div className="text-muted-foreground flex-1 text-sm tabular-nums">
              {firstRow} - {lastRow} {labels.of} {totalRows} {labels.subscriptions}
            </div>
            <div className="space-x-2 rtl:space-x-reverse">
              <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                {labels.previous}
              </Button>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                {labels.next}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
