"use client";

import * as React from "react";
import { flexRender } from "@tanstack/react-table";
import { type LegacyColumnDef as ColumnDef, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useLegacyTable as useReactTable } from "@tanstack/react-table/legacy";
import type { SortingState, ColumnVisibilityState as VisibilityState } from "@tanstack/table-core";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleDotIcon,
  Columns3Icon,
  DownloadIcon,
  FlagIcon,
  ListFilterIcon,
  PlusIcon,
  SearchIcon,
  TagIcon,
  Trash2Icon
} from "lucide-react";

import { matchesFilterQuery } from "@/lib/filter-query-match";
import { Dot, SortableHeader, StackedDots } from "@/components/table-filter-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
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

import { labels, priorities, statuses } from "../data/data";
import { Task } from "../data/schema";
import { AddTaskDrawer } from "./add-task-drawer";
import { DataTableRowActions } from "./data-table-row-actions";

/* -------------------------------------------------------------------------- */
/*                                Filter schema                               */
/* -------------------------------------------------------------------------- */

const STATUS_DOTS = new Map<string, string>([
  ["backlog", "bg-slate-400"],
  ["todo", "bg-blue-500"],
  ["in progress", "bg-amber-500"],
  ["done", "bg-emerald-500"],
  ["canceled", "bg-rose-500"]
]);

const fields: FilterField[] = [
  {
    id: "status",
    label: "Status",
    type: "select",
    defaultOperator: "is_any_of",
    options: statuses.map((status) => ({
      value: status.value,
      label: status.label,
      icon: <Dot className={STATUS_DOTS.get(status.value) ?? "bg-muted-foreground"} />
    })),
    searchable: false,
    renderValue: ({ options }) => (
      <StackedDots options={options} dots={STATUS_DOTS} empty="any status" />
    ),
    icon: <CircleDotIcon />
  },
  {
    id: "priority",
    label: "Priority",
    type: "select",
    defaultOperator: "is_any_of",
    options: priorities.map((priority) => ({
      value: priority.value,
      label: priority.label,
      icon: <priority.icon />
    })),
    searchable: false,
    icon: <FlagIcon />
  },
  {
    id: "label",
    label: "Label",
    type: "select",
    defaultOperator: "is_any_of",
    options: labels.map((label) => ({ value: label.value, label: label.label })),
    searchable: false,
    icon: <TagIcon />
  }
];

/* -------------------------------------------------------------------------- */
/*                         Query tree to row predicate                        */
/* -------------------------------------------------------------------------- */

function readField(row: Task, path: string): unknown {
  return row[path as keyof Task];
}

const EMPTY_QUERY: FilterQuery = createFilterQuery();

/* -------------------------------------------------------------------------- */
/*                                   Columns                                  */
/* -------------------------------------------------------------------------- */

const columnLabels: Record<string, string> = {
  id: "Task",
  title: "Title",
  status: "Status",
  priority: "Priority"
};

export const columns: ColumnDef<Task>[] = [
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
    header: ({ column }) => <SortableHeader column={column}>Task</SortableHeader>,
    cell: ({ row }) => <span className="whitespace-nowrap">{row.original.id}</span>
  },
  {
    accessorKey: "title",
    header: ({ column }) => <SortableHeader column={column}>Title</SortableHeader>,
    cell: ({ row }) => {
      const label = labels.find((entry) => entry.value === row.original.label);
      return (
        <div className="flex min-w-0 items-center gap-2">
          {label && <Badge variant="outline">{label.label}</Badge>}
          <span className="max-w-[500px] truncate font-medium">{row.original.title}</span>
        </div>
      );
    }
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
    cell: ({ row }) => {
      const status = statuses.find((entry) => entry.value === row.original.status);
      if (!status) return null;
      return (
        <span className="flex items-center gap-2 whitespace-nowrap">
          <status.icon className="text-muted-foreground size-4" />
          {status.label}
        </span>
      );
    }
  },
  {
    accessorKey: "priority",
    header: ({ column }) => <SortableHeader column={column}>Priority</SortableHeader>,
    cell: ({ row }) => {
      const priority = priorities.find((entry) => entry.value === row.original.priority);
      if (!priority) return null;
      return (
        <span className="flex items-center gap-2 whitespace-nowrap">
          <priority.icon className="text-muted-foreground size-4" />
          {priority.label}
        </span>
      );
    }
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => <DataTableRowActions row={row} />
  }
];

/* -------------------------------------------------------------------------- */
/*                                    Table                                   */
/* -------------------------------------------------------------------------- */

export default function TaskList({ data }: { data: Task[] }) {
  const [tasks, setTasks] = React.useState<Task[]>(data);
  const [isAddTaskOpen, setAddTaskOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [query, setQuery] = React.useState<FilterQuery>(EMPTY_QUERY);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const rows = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return tasks.filter((row) => {
      if (!matchesFilterQuery(row, query, readField)) return false;
      if (!term) return true;
      return `${row.id} ${row.title}`.toLowerCase().includes(term);
    });
  }, [tasks, query, search]);

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    initialState: { pagination: { pageIndex: 0, pageSize: 25 } },
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
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <Button onClick={() => setAddTaskOpen(true)}>
          <PlusIcon /> Add Task
        </Button>
      </div>

      <AddTaskDrawer
        isOpen={isAddTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        onAddTask={(task) => setTasks((prev) => [task, ...prev])}
      />

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
                <div className="relative">
                  <SearchIcon className="text-muted-foreground absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2" />
                  <Input
                    placeholder="Search tasks..."
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      table.setPageIndex(0);
                    }}
                    className="h-7 w-40 ps-8 text-[0.8rem] lg:w-56"
                  />
                </div>
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
                    No tasks match these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex flex-col items-center justify-between gap-3 border-t px-(--card-spacing) py-3 sm:flex-row">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              Rows per page
              <Select
                value={String(pageSize)}
                onValueChange={(value) => table.setPageSize(Number(value))}>
                <SelectTrigger size="sm" className="w-fit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50].map((size) => (
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
    </div>
  );
}
