"use client";

import * as React from "react";
import { flexRender } from "@tanstack/react-table";
import { type LegacyColumnDef as ColumnDef, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useLegacyTable as useReactTable } from "@tanstack/react-table/legacy";
import type { SortingState } from "@tanstack/table-core";
import { format, parseISO } from "date-fns";
import {
  ArrowLeftRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleDotIcon,
  DollarSignIcon,
  DownloadIcon,
  EllipsisIcon,
  ListFilterIcon,
  SearchIcon
} from "lucide-react";

import { cn } from "@/lib/utils";
import { matchesFilterQuery } from "@/lib/filter-query-match";
import { Dot, SortableHeader, StackedDots } from "@/components/table-filter-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Filters } from "@/components/ui/filters/filters";
import { createFilterQuery } from "@/components/ui/filters/filters-query";
import type { FilterField, FilterQuery } from "@/components/ui/filters/filters-types";

export type Transaction = {
  id: number;
  date: string;
  description: string;
  status: "completed" | "pending" | "failed";
  amount: number;
  type: "payment" | "withdrawal";
};

/* -------------------------------------------------------------------------- */
/*                                Filter schema                               */
/* -------------------------------------------------------------------------- */

const STATUSES = [
  { value: "completed", label: "Completed", dot: "bg-emerald-500", badge: "success" },
  { value: "pending", label: "Pending", dot: "bg-amber-500", badge: "warning" },
  { value: "failed", label: "Failed", dot: "bg-rose-500", badge: "destructive" }
] as const;

const DOTS = new Map(STATUSES.map((status) => [status.value, status.dot]));

const fields: FilterField[] = [
  {
    id: "search",
    label: "Search",
    type: "text",
    placeholder: "Description, bank...",
    icon: <SearchIcon />
  },
  {
    id: "status",
    label: "Status",
    type: "select",
    defaultOperator: "is_any_of",
    options: STATUSES.map((status) => ({
      value: status.value,
      label: status.label,
      icon: <Dot className={status.dot} />
    })),
    searchable: false,
    renderValue: ({ options }) => <StackedDots options={options} dots={DOTS} empty="any status" />,
    icon: <CircleDotIcon />
  },
  {
    id: "type",
    label: "Type",
    type: "select",
    defaultOperator: "is_any_of",
    options: [
      { value: "payment", label: "Payment" },
      { value: "withdrawal", label: "Withdrawal" }
    ],
    searchable: false,
    icon: <ArrowLeftRightIcon />
  },
  {
    id: "amount",
    label: "Amount",
    type: "number",
    icon: <DollarSignIcon />
  }
];

function readField(row: Transaction, path: string): unknown {
  if (path === "search") return row.description;
  return row[path as keyof Transaction];
}

const EMPTY_QUERY: FilterQuery = createFilterQuery();

/* -------------------------------------------------------------------------- */
/*                                   Columns                                  */
/* -------------------------------------------------------------------------- */

function formatAmount(amount: number) {
  const value = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${amount < 0 ? "-" : "+"}${value} USD`;
}

export const columns: ColumnDef<Transaction>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40
  },
  {
    accessorKey: "description",
    header: "Transaction",
    cell: ({ row }) => <div className="truncate font-medium">{row.original.description}</div>
  },
  {
    accessorKey: "status",
    size: 120,
    header: "Status",
    cell: ({ row }) => {
      const status = STATUSES.find((entry) => entry.value === row.original.status);
      return <Badge variant={status?.badge}>{status?.label}</Badge>;
    }
  },
  {
    accessorKey: "amount",
    size: 160,
    header: ({ column }) => <SortableHeader column={column}>Amount</SortableHeader>,
    cell: ({ row }) => (
      <span
        className={cn(
          "font-medium tabular-nums",
          row.original.amount < 0 ? "text-red-500" : "text-green-600"
        )}>
        {formatAmount(row.original.amount)}
      </span>
    )
  },
  {
    accessorKey: "date",
    size: 140,
    header: ({ column }) => <SortableHeader column={column}>Date</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-muted-foreground whitespace-nowrap">
        {format(parseISO(row.original.date), "MMM d, yyyy")}
      </span>
    )
  },
  {
    id: "actions",
    enableHiding: false,
    size: 56,
    cell: ({ row }) => (
      <div className="text-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <span className="sr-only">Open menu</span>
              <EllipsisIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View details</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(String(row.original.id))}>
              Copy transaction ID
            </DropdownMenuItem>
            <DropdownMenuItem>Download receipt</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Report an issue</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }
];

/* -------------------------------------------------------------------------- */
/*                                    Table                                   */
/* -------------------------------------------------------------------------- */

export default function TransactionsTable({ data }: { data: Transaction[] }) {
  const [query, setQuery] = React.useState<FilterQuery>(EMPTY_QUERY);
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "date", desc: true }]);
  const [rowSelection, setRowSelection] = React.useState({});

  const rows = React.useMemo(
    () => data.filter((row) => matchesFilterQuery(row, query, readField)),
    [data, query]
  );

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (row) => String(row.id),
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
    state: {
      sorting,
      rowSelection
    }
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const firstRow = rows.length === 0 ? 0 : pageIndex * pageSize + 1;
  const lastRow = Math.min((pageIndex + 1) * pageSize, rows.length);

  return (
    <Card>
      <CardContent className="flex flex-col p-0 [&_[data-slot=table-container]]:flex-1">
        <div className="flex min-h-14 items-center gap-2 border-b px-(--card-spacing) py-3">
          {selectedCount > 0 ? (
            <>
              <span className="px-1 text-sm font-medium">{selectedCount} selected</span>
              <Button variant="outline" size="sm">
                <DownloadIcon /> <span className="@max-md/card:sr-only">Export</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="ms-auto"
                onClick={() => table.resetRowSelection()}>
                Cancel
              </Button>
            </>
          ) : (
            <Filters
              fields={fields}
              query={query}
              onQueryChange={(next) => {
                setQuery(next);
                // Back to page one on every edit: a narrower query can leave
                // the current page past the end of the result set.
                table.setPageIndex(0);
              }}
              size="sm"
              showClear
              trigger={
                <Button variant="outline" size="sm">
                  <ListFilterIcon /> Filters
                </Button>
              }
              className="flex-1 @max-md/card:flex-initial"
            />
          )}
        </div>

        <Table className="min-w-[700px] table-fixed [&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{
                      // 150 is TanStack's default size: only explicitly sized
                      // columns get a width, the rest share the remaining space.
                      width: header.getSize() !== 150 ? header.getSize() : undefined
                    }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
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
                  No transactions match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex flex-col items-center justify-between gap-3 border-t px-(--card-spacing) py-3 sm:flex-row">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            Rows per page
            <Select value={String(pageSize)} onValueChange={(value) => table.setPageSize(Number(value))}>
              <SelectTrigger size="sm" className="w-fit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 25].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-sm tabular-nums">
              {firstRow} - {lastRow} of {rows.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}>
                <span className="sr-only">Previous page</span>
                <ChevronLeftIcon />
              </Button>
              {Array.from({ length: pageCount }, (_, index) => (
                <Button
                  key={index}
                  variant={index === pageIndex ? "outline" : "ghost"}
                  size="icon-sm"
                  className="tabular-nums"
                  onClick={() => table.setPageIndex(index)}>
                  {index + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}>
                <span className="sr-only">Next page</span>
                <ChevronRightIcon />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
