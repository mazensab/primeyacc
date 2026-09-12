"use client";

import { useState, useMemo } from "react";
import { flexRender } from "@tanstack/react-table";
import { useLegacyTable as useReactTable, getCoreRowModel, getPaginationRowModel, getFilteredRowModel, getSortedRowModel, type LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import type { SortingState } from "@tanstack/table-core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CircleDotIcon,
  DownloadIcon,
  DollarSignIcon,
  ListFilterIcon,
  MoreHorizontal,
  Plus,
  RulerIcon,
  Search,
  Trash2Icon
} from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { matchesFilterQuery } from "@/lib/filter-query-match";
import { Dot, StackedDots } from "@/components/table-filter-helpers";
import { Filters } from "@/components/ui/filters/filters";
import { createFilterQuery } from "@/components/ui/filters/filters-query";
import type { FilterField, FilterQuery } from "@/components/ui/filters/filters-types";
import type { RealEstateProperty } from "../../types";

interface PropertyTableProps {
  items: RealEstateProperty[];
}

const getStatusVariant = (
  status: string
): NonNullable<React.ComponentProps<typeof Badge>["variant"]> => {
  switch (status) {
    case "On rent":
      return "success";
    case "On sell":
      return "info";
    case "Renovation":
      return "warning";
    case "On Construction":
      return "secondary";
    default:
      return "outline";
  }
};

const getProgressColor = (value: number): string => {
  if (value >= 70) return "bg-green-500";
  if (value >= 40) return "bg-amber-500";
  return "bg-rose-500";
};

/* ------------------------------------------------------------------------ */
/*                               Filter schema                              */
/* ------------------------------------------------------------------------ */

const STATUSES = [
  { value: "On rent", dot: "bg-emerald-500" },
  { value: "On sell", dot: "bg-blue-500" },
  { value: "Renovation", dot: "bg-amber-500" },
  { value: "On Construction", dot: "bg-slate-400" }
];

const STATUS_DOTS = new Map(STATUSES.map((status) => [status.value, status.dot]));

const fields: FilterField[] = [
  {
    id: "status",
    label: "Status",
    type: "select",
    defaultOperator: "is_any_of",
    options: STATUSES.map((status) => ({
      value: status.value,
      label: status.value,
      icon: <Dot className={status.dot} />
    })),
    searchable: false,
    renderValue: ({ options }) => (
      <StackedDots options={options} dots={STATUS_DOTS} empty="any status" />
    ),
    icon: <CircleDotIcon />
  },
  {
    id: "priceMin",
    label: "Price",
    type: "number",
    icon: <DollarSignIcon />
  },
  {
    id: "sqft",
    label: "Sqft",
    type: "number",
    icon: <RulerIcon />
  }
];

function readField(row: RealEstateProperty, path: string): unknown {
  return row[path as keyof RealEstateProperty];
}

const EMPTY_QUERY: FilterQuery = createFilterQuery();

export function PropertyTable({ items }: PropertyTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [query, setQuery] = useState<FilterQuery>(EMPTY_QUERY);
  const [rowSelection, setRowSelection] = useState({});

  const filteredData = useMemo(
    () => items.filter((item) => matchesFilterQuery(item, query, readField)),
    [items, query]
  );

  const columns: ColumnDef<RealEstateProperty>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
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
      header: "Property name",
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={row.original.thumbnailImage}
            alt={row.original.name}
            className="aspect-video max-w-30 shrink-0 rounded-md object-cover"
          />
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.name}</div>
            <div className="text-muted-foreground text-xs">{row.original.listingCode}</div>
          </div>
        </div>
      )
    },
    {
      accessorKey: "status",
      size: 150,
      header: ({ column }) => (
        <button
          className="flex items-center gap-1"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ChevronDown className="h-4 w-4" />
        </button>
      ),
      cell: ({ row }) => {
        const statusLabel = row.original.status?.trim() || "Unknown";

        return <Badge variant={getStatusVariant(statusLabel)}>{statusLabel}</Badge>;
      }
    },
    {
      accessorKey: "priceMin",
      size: 190,
      header: ({ column }) => (
        <button
          className="flex items-center gap-1"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Price
          <ChevronDown className="h-4 w-4" />
        </button>
      ),
      cell: ({ row }) => (
        <span>
          ${row.original.priceMin.toLocaleString()} - ${row.original.priceMax.toLocaleString()}
        </span>
      )
    },
    {
      accessorKey: "sqft",
      size: 100,
      header: ({ column }) => (
        <button
          className="flex items-center gap-1"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Sqft
          <ChevronDown className="h-4 w-4" />
        </button>
      ),
      cell: ({ row }) => <span>{row.original.sqft.toLocaleString()}</span>
    },
    {
      accessorKey: "complain",
      size: 170,
      header: "Complain",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Progress
            value={row.original.complain}
            className="bg-muted w-20"
            indicatorColor={getProgressColor(row.original.complain)}
          />
          <span className="text-muted-foreground text-xs">{row.original.complain}%</span>
        </div>
      )
    },
    {
      id: "actions",
      size: 56,
      cell: () => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View details</DropdownMenuItem>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
      rowSelection
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 10
      }
    }
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const totalRows = table.getFilteredRowModel().rows.length;
  const currentPage = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const startRow = currentPage * pageSize + 1;
  const endRow = Math.min((currentPage + 1) * pageSize, totalRows);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">Properties</h1>
        <Button>
          <Plus />
          Add New Property
        </Button>
      </div>
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
                  onClick={() => table.resetRowSelection()}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <InputGroup className="w-full max-w-56 shrink-0 @max-md/card:min-w-24 @max-md/card:flex-1 @max-md/card:basis-0">
                  <InputGroupInput
                    placeholder="Search ID, property"
                    value={globalFilter}
                    onChange={(event) => {
                      setGlobalFilter(event.target.value);
                      table.setPageIndex(0);
                    }}
                  />
                  <InputGroupAddon>
                    <Search />
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

          <Table className="min-w-[900px] table-fixed [&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)">
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
                      }}
                    >
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
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex flex-col gap-4 border-t px-(--card-spacing) py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <span>
                Results: {startRow} - {endRow} of {totalRows}
                {table.getFilteredSelectedRowModel().rows.length > 0 &&
                  ` · ${table.getFilteredSelectedRowModel().rows.length} selected`}
              </span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger className="w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(table.getPageCount(), 5) }, (_, i) => (
                <Button
                  key={i}
                  variant={currentPage === i ? "default" : "outline"}
                  size="icon"
                  onClick={() => table.setPageIndex(i)}
                >
                  {i + 1}
                </Button>
              ))}
              {table.getPageCount() > 5 && (
                <>
                  <span className="text-muted-foreground px-2">...</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  >
                    {table.getPageCount()}
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
