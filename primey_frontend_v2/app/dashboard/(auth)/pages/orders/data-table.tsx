"use client";

import * as React from "react";
import Link from "next/link";
import { flexRender } from "@tanstack/react-table";
import { type LegacyColumnDef as ColumnDef, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useLegacyTable as useReactTable } from "@tanstack/react-table/legacy";
import type { SortingState, ColumnVisibilityState as VisibilityState } from "@tanstack/table-core";
import { format, parseISO } from "date-fns";
import {
  ArrowLeftRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Columns3Icon,
  DollarSignIcon,
  DownloadIcon,
  ListFilterIcon,
  MoreHorizontalIcon,
  SearchIcon,
  Trash2Icon
} from "lucide-react";

import { matchesFilterQuery } from "@/lib/filter-query-match";
import { SortableHeader } from "@/components/table-filter-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Filters } from "@/components/ui/filters/filters";
import { createFilterQuery } from "@/components/ui/filters/filters-query";
import type { FilterField, FilterQuery } from "@/components/ui/filters/filters-types";

export type Customer = {
  name: string;
  email: string;
};

export type Order = {
  id: number;
  customer: Customer;
  product_name: string;
  image: string;
  price: number;
  type: "Sale" | "Refund";
  status: "pending" | "shipped" | "delivered" | "cancelled";
  date: string;
};

/* -------------------------------------------------------------------------- */
/*                                Filter schema                               */
/* -------------------------------------------------------------------------- */

const STATUSES = [
  { value: "pending", label: "Pending", badge: "warning" as const },
  { value: "shipped", label: "Shipped", badge: "info" as const },
  { value: "delivered", label: "Delivered", badge: "success" as const },
  { value: "cancelled", label: "Cancelled", badge: "destructive" as const }
];

const TYPES = ["Sale", "Refund"];

const fields: FilterField[] = [
  {
    id: "search",
    label: "Search",
    type: "text",
    placeholder: "Order, product, customer...",
    icon: <SearchIcon />
  },
  {
    id: "type",
    label: "Type",
    type: "select",
    defaultOperator: "is_any_of",
    options: TYPES.map((type) => ({ value: type, label: type })),
    searchable: false,
    icon: <ArrowLeftRightIcon />
  },
  {
    id: "price",
    label: "Price",
    type: "number",
    icon: <DollarSignIcon />
  }
];

function readField(row: Order, path: string): unknown {
  if (path === "search")
    return `#${row.id} ${row.product_name} ${row.customer.name} ${row.customer.email}`;
  return row[path as keyof Order];
}

const EMPTY_QUERY: FilterQuery = createFilterQuery();

/* -------------------------------------------------------------------------- */
/*                                   Columns                                  */
/* -------------------------------------------------------------------------- */

const columnLabels: Record<string, string> = {
  id: "Order",
  product_name: "Product",
  customer: "Customer",
  type: "Type",
  price: "Price",
  date: "Date",
  status: "Status"
};

export const columns: ColumnDef<Order>[] = [
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
    enableHiding: false
  },
  {
    accessorKey: "id",
    header: ({ column }) => <SortableHeader column={column}>Order</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/dashboard/pages/orders/${row.original.id}`}
        className="text-muted-foreground hover:text-primary tabular-nums hover:underline">
        #{row.original.id}
      </Link>
    )
  },
  {
    accessorKey: "product_name",
    header: ({ column }) => <SortableHeader column={column}>Product</SortableHeader>,
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-3">
        <img
          src={`/images${row.original.image}`}
          width={40}
          height={40}
          alt={row.original.product_name}
          className="size-10 shrink-0 rounded-lg border object-cover"
        />
        <span className="max-w-60 truncate font-medium">{row.original.product_name}</span>
      </div>
    )
  },
  {
    accessorKey: "customer",
    header: "Customer",
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="truncate font-medium">{row.original.customer.name}</div>
        <div className="text-muted-foreground truncate text-xs">{row.original.customer.email}</div>
      </div>
    )
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => row.original.type
  },
  {
    accessorKey: "price",
    header: ({ column }) => <SortableHeader column={column}>Price</SortableHeader>,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {row.original.price.toLocaleString("en-US", {
          style: "currency",
          currency: "USD"
        })}
      </span>
    )
  },
  {
    accessorKey: "date",
    header: ({ column }) => <SortableHeader column={column}>Date</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-muted-foreground whitespace-nowrap">
        {format(parseISO(row.original.date), "MMM d, yyyy")}
      </span>
    )
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
    cell: ({ row }) => {
      const status = STATUSES.find((entry) => entry.value === row.original.status);
      return (
        <Badge variant={status?.badge ?? "default"} className="whitespace-nowrap">
          {status?.label ?? row.original.status}
        </Badge>
      );
    }
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <span className="sr-only">Open menu</span>
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/pages/orders/${row.original.id}`}>Order details</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
];

/* -------------------------------------------------------------------------- */
/*                                    Table                                   */
/* -------------------------------------------------------------------------- */

export default function OrdersDataTable({ data }: { data: Order[] }) {
  const [query, setQuery] = React.useState<FilterQuery>(EMPTY_QUERY);
  const [statusTab, setStatusTab] = React.useState("all");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const rows = React.useMemo(
    () =>
      data
        .filter((row) => statusTab === "all" || row.status === statusTab)
        .filter((row) => matchesFilterQuery(row, query, readField)),
    [data, query, statusTab]
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
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
    state: {
      sorting,
      columnVisibility,
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
              <Tabs
                value={statusTab}
                onValueChange={(value) => {
                  setStatusTab(value);
                  table.setPageIndex(0);
                }}
                className="hidden md:block">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  {STATUSES.map((status) => (
                    <TabsTrigger key={status.value} value={status.value}>
                      {status.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
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
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3Icon />
                <span className="hidden lg:inline">Columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(value)}>
                    {columnLabels[column.id] ?? column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Table className="[&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
                  No orders match these filters.
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
