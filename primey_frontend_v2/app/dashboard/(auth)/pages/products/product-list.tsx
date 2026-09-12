"use client";

import * as React from "react";
import { flexRender } from "@tanstack/react-table";
import { type LegacyColumnDef as ColumnDef, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useLegacyTable as useReactTable } from "@tanstack/react-table/legacy";
import type { SortingState, ColumnVisibilityState as VisibilityState } from "@tanstack/table-core";
import {
  BoxIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleDotIcon,
  Columns3Icon,
  DollarSignIcon,
  DownloadIcon,
  ListFilterIcon,
  MoreHorizontalIcon,
  SearchIcon,
  StarIcon,
  TagIcon,
  Trash2Icon
} from "lucide-react";

import { matchesFilterQuery } from "@/lib/filter-query-match";
import { Dot, SortableHeader, StackedDots } from "@/components/table-filter-helpers";
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
import { Filters } from "@/components/ui/filters/filters";
import { createFilterQuery } from "@/components/ui/filters/filters-query";
import type { FilterField, FilterQuery } from "@/components/ui/filters/filters-types";

export type Product = {
  id: number;
  name: string;
  image: string;
  description: string;
  category: string;
  sku: string;
  stock: number;
  price: number;
  rating: number;
  status: "active" | "out-of-stock" | "closed-for-sale";
  createdAt: string;
};

/* -------------------------------------------------------------------------- */
/*                                Filter schema                               */
/* -------------------------------------------------------------------------- */

const STATUSES = [
  { value: "active", label: "Active", dot: "bg-emerald-500", badge: "success" as const },
  { value: "out-of-stock", label: "Out of stock", dot: "bg-amber-500", badge: "warning" as const },
  {
    value: "closed-for-sale",
    label: "Closed for sale",
    dot: "bg-rose-500",
    badge: "destructive" as const
  }
];

const CATEGORIES = ["Accessories", "Electronics", "Hoodies", "Pants", "Sports", "T-Shirts"];

const DOTS = new Map(STATUSES.map((status) => [status.value, status.dot]));

const fields: FilterField[] = [
  {
    id: "search",
    label: "Search",
    type: "text",
    placeholder: "Name, SKU, description...",
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
    id: "category",
    label: "Category",
    type: "select",
    defaultOperator: "is_any_of",
    options: CATEGORIES.map((category) => ({ value: category, label: category })),
    searchable: false,
    icon: <TagIcon />
  },
  {
    id: "price",
    label: "Price",
    type: "number",
    icon: <DollarSignIcon />
  },
  {
    id: "stock",
    label: "Stock",
    type: "number",
    icon: <BoxIcon />
  },
  {
    id: "rating",
    label: "Rating",
    type: "number",
    icon: <StarIcon />
  }
];

/* -------------------------------------------------------------------------- */
/*                         Query tree to row predicate                        */
/* -------------------------------------------------------------------------- */

function readField(row: Product, path: string): unknown {
  if (path === "search") return `${row.name} ${row.sku} ${row.description}`;
  return row[path as keyof Product];
}

const EMPTY_QUERY: FilterQuery = createFilterQuery();

/* -------------------------------------------------------------------------- */
/*                                   Columns                                  */
/* -------------------------------------------------------------------------- */

const columnLabels: Record<string, string> = {
  name: "Product",
  category: "Category",
  price: "Price",
  stock: "Stock",
  rating: "Rating",
  status: "Status"
};

export const columns: ColumnDef<Product>[] = [
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
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column}>Product</SortableHeader>,
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-3">
        <img
          src={`/images${row.original.image}`}
          width={40}
          height={40}
          alt={row.original.name}
          className="size-10 shrink-0 rounded-lg border object-cover"
        />
        <div className="min-w-0">
          <div className="max-w-60 truncate font-medium">{row.original.name}</div>
          <div className="text-muted-foreground text-xs">{row.original.sku}</div>
        </div>
      </div>
    )
  },
  {
    accessorKey: "category",
    header: ({ column }) => <SortableHeader column={column}>Category</SortableHeader>,
    cell: ({ row }) => <span className="whitespace-nowrap">{row.original.category}</span>
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
    accessorKey: "stock",
    header: ({ column }) => <SortableHeader column={column}>Stock</SortableHeader>,
    cell: ({ row }) =>
      row.original.stock === 0 ? (
        <span className="text-muted-foreground">0</span>
      ) : (
        <span className="tabular-nums">{row.original.stock}</span>
      )
  },
  {
    accessorKey: "rating",
    header: ({ column }) => <SortableHeader column={column}>Rating</SortableHeader>,
    cell: ({ row }) => (
      <span className="flex items-center gap-1.5 tabular-nums">
        <StarIcon className="size-3.5 fill-orange-400 text-orange-400" />
        {row.original.rating.toFixed(1)}
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
    cell: () => (
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
          <DropdownMenuItem>View details</DropdownMenuItem>
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem>Copy ID</DropdownMenuItem>
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
];

/* -------------------------------------------------------------------------- */
/*                                    Table                                   */
/* -------------------------------------------------------------------------- */

export default function ProductList({ data }: { data: Product[] }) {
  const [query, setQuery] = React.useState<FilterQuery>(EMPTY_QUERY);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
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
                  No products match these filters.
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
