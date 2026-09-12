"use client";

import * as React from "react";
import { flexRender } from "@tanstack/react-table";
import { type LegacyColumnDef as ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useLegacyTable as useReactTable } from "@tanstack/react-table/legacy";
import type { SortingState } from "@tanstack/table-core";
import {
  ChevronLeft,
  ChevronRight,
  CircleDotIcon,
  Copy,
  DownloadIcon,
  ListFilterIcon,
  MoreHorizontal,
  SearchIcon,
  Trash2Icon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CreateApiKeyDialog } from "./create-api-key-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { toast } from "sonner";
import { matchesFilterQuery } from "@/lib/filter-query-match";
import { Dot, SortableHeader, StackedDots } from "@/components/table-filter-helpers";
import { Filters } from "@/components/ui/filters/filters";
import { createFilterQuery } from "@/components/ui/filters/filters-query";
import type { FilterField, FilterQuery } from "@/components/ui/filters/filters-types";

export interface ApiKey {
  id: number;
  name: string;
  api_key: string;
  created_at: string;
  expired_at: string;
  status: "active" | "inactive" | "expired";
}

const statusConfig: Record<
  ApiKey["status"],
  { label: string; variant: "success" | "warning" | "destructive"; dot: string }
> = {
  active: { label: "Active", variant: "success", dot: "bg-emerald-500" },
  inactive: { label: "Inactive", variant: "destructive", dot: "bg-rose-500" },
  expired: { label: "Expired", variant: "warning", dot: "bg-amber-500" }
};

/* -------------------------------------------------------------------------- */
/*                                Filter schema                               */
/* -------------------------------------------------------------------------- */

const STATUS_DOTS = new Map(
  Object.entries(statusConfig).map(([value, config]) => [value, config.dot])
);

const fields: FilterField[] = [
  {
    id: "status",
    label: "Status",
    type: "select",
    defaultOperator: "is_any_of",
    options: Object.entries(statusConfig).map(([value, config]) => ({
      value,
      label: config.label,
      icon: <Dot className={config.dot} />
    })),
    searchable: false,
    renderValue: ({ options }) => (
      <StackedDots options={options} dots={STATUS_DOTS} empty="any status" />
    ),
    icon: <CircleDotIcon />
  }
];

function readField(row: ApiKey, path: string): unknown {
  return row[path as keyof ApiKey];
}

function matchesSearch(row: ApiKey, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return [row.name, row.api_key].some((value) => value.toLowerCase().includes(q));
}

const EMPTY_QUERY: FilterQuery = createFilterQuery();

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success("Copied to clipboard");
};

export const columns: ColumnDef<ApiKey>[] = [
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
    header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
    cell: ({ row }) => <div className="truncate font-medium">{row.getValue("name")}</div>
  },
  {
    accessorKey: "api_key",
    size: 220,
    header: ({ column }) => <SortableHeader column={column}>Api Key</SortableHeader>,
    cell: ({ row }) => {
      const apiKey = row.original.api_key;
      return (
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground font-mono">
            {apiKey.slice(0, 8)}...{apiKey.slice(-4)}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={() => copyToClipboard(apiKey)}>
            <span className="sr-only">Copy API key</span>
            <Copy />
          </Button>
        </div>
      );
    }
  },
  {
    accessorKey: "created_at",
    size: 140,
    header: ({ column }) => <SortableHeader column={column}>Created At</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-muted-foreground whitespace-nowrap">{row.getValue("created_at")}</span>
    )
  },
  {
    accessorKey: "expired_at",
    size: 140,
    header: ({ column }) => <SortableHeader column={column}>Updated At</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-muted-foreground whitespace-nowrap">{row.getValue("expired_at")}</span>
    )
  },
  {
    accessorKey: "status",
    size: 110,
    header: "Status",
    cell: ({ row }) => {
      const status = statusConfig[row.original.status];
      return <Badge variant={status.variant}>{status.label}</Badge>;
    }
  },
  {
    id: "actions",
    enableHiding: false,
    size: 56,
    cell: () => {
      return (
        <div className="text-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem>Rename</DropdownMenuItem>
              <DropdownMenuItem>Regenerate Key</DropdownMenuItem>
              <DropdownMenuItem>Enable</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">Revoke</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }
  }
];

export function ApiKeysDataTable({ data }: { data: ApiKey[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [search, setSearch] = React.useState("");
  const [query, setQuery] = React.useState<FilterQuery>(EMPTY_QUERY);
  const [rowSelection, setRowSelection] = React.useState({});

  const rows = React.useMemo(
    () =>
      data.filter((row) => matchesSearch(row, search) && matchesFilterQuery(row, query, readField)),
    [data, search, query]
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
              <InputGroup className="w-full max-w-56 shrink-0 @max-md/card:min-w-24 @max-md/card:flex-1 @max-md/card:basis-0">
                <InputGroupInput
                  placeholder="Search key, name..."
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
              <div className="ms-auto shrink-0">
                <CreateApiKeyDialog />
              </div>
            </>
          )}
        </div>
        <Table className="min-w-[820px] table-fixed [&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)">
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
            {firstRow} - {lastRow} of {rows.length} keys
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
