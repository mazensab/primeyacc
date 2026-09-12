"use client";

import * as React from "react";

import { flexRender } from "@tanstack/react-table";
import { type LegacyColumnDef as ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useLegacyTable as useReactTable } from "@tanstack/react-table/legacy";
import type { SortingState } from "@tanstack/table-core";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleDotIcon,
  DollarSignIcon,
  DownloadIcon,
  Ellipsis,
  ListFilterIcon,
  MegaphoneIcon,
  SearchIcon,
  Trash2Icon
} from "lucide-react";
import { matchesFilterQuery } from "@/lib/filter-query-match";
import { Dot, StackedDots } from "@/components/table-filter-helpers";
import { Filters } from "@/components/ui/filters/filters";
import { createFilterQuery } from "@/components/ui/filters/filters-query";
import type { FilterField, FilterQuery } from "@/components/ui/filters/filters-types";

const data: Lead[] = [
  {
    id: "m5gr84i9",
    name: "Kenneth Thompson",
    email: "ken99@yahoo.com",
    company: "Northwind Traders",
    source: "Website",
    amount: 316,
    status: "success",
    createdAt: "Aug 19, 2026"
  },
  {
    id: "3u1reuv4",
    name: "Abraham Lincoln",
    email: "abe45@gmail.com",
    company: "Fabrikam Inc.",
    source: "Referral",
    amount: 242,
    status: "success",
    createdAt: "Aug 17, 2026"
  },
  {
    id: "derv1ws0",
    name: "Monserrat Rodriguez",
    email: "monserrat44@gmail.com",
    company: "Contoso Ltd.",
    source: "LinkedIn",
    amount: 837,
    status: "processing",
    createdAt: "Aug 15, 2026"
  },
  {
    id: "5kma53ae",
    name: "Silas Johnson",
    email: "silas22@gmail.com",
    company: "Adventure Works",
    source: "Ads",
    amount: 874,
    status: "success",
    createdAt: "Aug 12, 2026"
  },
  {
    id: "bhqecj4p",
    name: "Carmella DeVito",
    email: "carmella@hotmail.com",
    company: "Tailspin Toys",
    source: "Website",
    amount: 721,
    status: "failed",
    createdAt: "Aug 10, 2026"
  },
  {
    id: "x8dk2mq1",
    name: "Maria Garcia",
    email: "maria@gmail.com",
    company: "Wide World Importers",
    source: "Referral",
    amount: 529,
    status: "pending",
    createdAt: "Aug 8, 2026"
  },
  {
    id: "p3nv7rt5",
    name: "James Wilson",
    email: "james34@outlook.com",
    company: "Proseware Inc.",
    source: "LinkedIn",
    amount: 438,
    status: "processing",
    createdAt: "Aug 5, 2026"
  }
];

export type Lead = {
  id: string;
  name: string;
  email: string;
  company: string;
  source: "Website" | "Referral" | "LinkedIn" | "Ads";
  amount: number;
  status: "pending" | "processing" | "success" | "failed";
  createdAt: string;
};

const statusVariants: Record<Lead["status"], "success" | "info" | "warning" | "destructive"> = {
  success: "success",
  processing: "info",
  pending: "warning",
  failed: "destructive"
};

/* -------------------------------------------------------------------------- */
/*                                Filter schema                               */
/* -------------------------------------------------------------------------- */

const STATUS_DOTS = new Map<string, string>([
  ["success", "bg-emerald-500"],
  ["processing", "bg-blue-500"],
  ["pending", "bg-amber-500"],
  ["failed", "bg-rose-500"]
]);

const fields: FilterField[] = [
  {
    id: "status",
    label: "Status",
    type: "select",
    defaultOperator: "is_any_of",
    options: [...STATUS_DOTS.entries()].map(([value, dot]) => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1),
      icon: <Dot className={dot} />
    })),
    searchable: false,
    renderValue: ({ options }) => (
      <StackedDots options={options} dots={STATUS_DOTS} empty="any status" />
    ),
    icon: <CircleDotIcon />
  },
  {
    id: "source",
    label: "Source",
    type: "select",
    defaultOperator: "is_any_of",
    options: ["Website", "Referral", "LinkedIn", "Ads"].map((source) => ({
      value: source,
      label: source
    })),
    searchable: false,
    icon: <MegaphoneIcon />
  },
  {
    id: "amount",
    label: "Amount",
    type: "number",
    icon: <DollarSignIcon />
  }
];

function readField(row: Lead, path: string): unknown {
  return row[path as keyof Lead];
}

function matchesSearch(row: Lead, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return [row.name, row.email, row.company].some((value) => value.toLowerCase().includes(q));
}

const EMPTY_QUERY: FilterQuery = createFilterQuery();

export const columns: ColumnDef<Lead>[] = [
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
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          className="p-0!"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Lead
          <ChevronsUpDown className="size-3!" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="truncate font-medium">{row.getValue("name")}</div>
        <div className="text-muted-foreground truncate text-xs lowercase">{row.original.email}</div>
      </div>
    )
  },
  {
    accessorKey: "company",
    size: 160,
    header: "Company",
    cell: ({ row }) => (
      <div className="text-muted-foreground truncate">{row.getValue("company")}</div>
    )
  },
  {
    accessorKey: "source",
    size: 110,
    header: "Source",
    cell: ({ row }) => <Badge variant="outline">{row.getValue("source")}</Badge>
  },
  {
    accessorKey: "status",
    size: 120,
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={statusVariants[row.original.status]} className="capitalize">
        {row.getValue("status")}
      </Badge>
    )
  },
  {
    accessorKey: "amount",
    size: 100,
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));

      // Format the amount as a dollar amount
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
      }).format(amount);

      return <div className="text-right font-medium tabular-nums">{formatted}</div>;
    }
  },
  {
    accessorKey: "createdAt",
    size: 120,
    header: "Date",
    cell: ({ row }) => (
      <span className="text-muted-foreground whitespace-nowrap">{row.getValue("createdAt")}</span>
    )
  },
  {
    id: "actions",
    enableHiding: false,
    size: 56,
    cell: ({ row }) => {
      const lead = row.original;

      return (
        <div className="text-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <span className="sr-only">Open menu</span>
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(lead.id)}>
                Copy lead ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>View customer</DropdownMenuItem>
              <DropdownMenuItem>View lead details</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }
  }
];

export function LeadsCard() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [search, setSearch] = React.useState("");
  const [query, setQuery] = React.useState<FilterQuery>(EMPTY_QUERY);
  const [rowSelection, setRowSelection] = React.useState({});

  const rows = React.useMemo(
    () =>
      data.filter((row) => matchesSearch(row, search) && matchesFilterQuery(row, query, readField)),
    [search, query]
  );

  const table = useReactTable({
    data: rows,
    columns,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      rowSelection
    }
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const firstRow = rows.length === 0 ? 0 : pageIndex * pageSize + 1;
  const lastRow = Math.min((pageIndex + 1) * pageSize, rows.length);

  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row justify-between">
        <CardTitle>Leads</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col p-0 [&_[data-slot=table-container]]:flex-1">
        <div className="flex min-h-14 items-center gap-2 border-b px-(--card-spacing) py-3">
          {selectedCount > 0 ? (
            <>
              <span className="px-1 text-sm font-medium">{selectedCount} selected</span>
              <Button variant="outline" size="sm">
                <DownloadIcon /> <span className="@max-md/card:sr-only">Export</span>
              </Button>
              <Button variant="destructive" size="sm">
                <Trash2Icon /> <span className="@max-md/card:sr-only">Delete</span>
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
            <>
              <InputGroup className="w-full max-w-56 shrink-0 @max-md/card:min-w-24 @max-md/card:flex-1 @max-md/card:basis-0">
                <InputGroupInput
                  placeholder="Filter leads..."
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    table.setPageIndex(0);
                  }}
                />
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
              </InputGroup>
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
                className="min-w-0 flex-1 @max-md/card:flex-initial"
              />
            </>
          )}
        </div>
        <Table className="min-w-[880px] table-fixed [&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
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
                  );
                })}
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
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-end gap-2 border-t px-(--card-spacing) py-3">
          <div className="text-muted-foreground flex-1 text-sm tabular-nums">
            {firstRow} - {lastRow} of {rows.length} leads
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}>
              <span className="sr-only">Previous page</span>
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}>
              <span className="sr-only">Next page</span>
              <ChevronRight />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
