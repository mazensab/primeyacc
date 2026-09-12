"use client";

import * as React from "react";
import { flexRender } from "@tanstack/react-table";
import { type LegacyColumnDef as ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useLegacyTable as useReactTable } from "@tanstack/react-table/legacy";
import {
  ChevronLeft,
  ChevronRight,
  CircleDotIcon,
  DownloadIcon,
  GaugeIcon,
  ListFilterIcon,
  MoreHorizontalIcon,
  SearchIcon,
  StarIcon,
  Trash2Icon
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { matchesFilterQuery } from "@/lib/filter-query-match";
import { Dot, StackedDots } from "@/components/table-filter-helpers";
import { Filters } from "@/components/ui/filters/filters";
import { createFilterQuery } from "@/components/ui/filters/filters-query";
import type { FilterField, FilterQuery } from "@/components/ui/filters/filters-types";

const data: Course[] = [
  {
    id: 1,
    name: "Introduction to React",
    category: "Web Development",
    image: `/images/tech/react.svg`,
    score: 4.5,
    progress: 60,
    started: true
  },
  {
    id: 2,
    name: "Angular Fundamentals",
    category: "Web Development",
    image: `/images/tech/angular.svg`,
    score: 4.8,
    progress: 0,
    started: false
  },
  {
    id: 3,
    name: "Vue 3 Crash Course",
    category: "Web Development",
    image: `/images/tech/vue.svg`,
    score: 4.2,
    progress: 45,
    started: true
  },
  {
    id: 4,
    name: "Node.js API Development",
    category: "Backend",
    image: `/images/tech/nodejs.svg`,
    score: 4.6,
    progress: 0,
    started: false
  },
  {
    id: 5,
    name: "UX Design with Figma",
    category: "Design",
    image: `/images/tech/figma.svg`,
    score: 4.4,
    progress: 80,
    started: true
  },
  {
    id: 6,
    name: "Svelte Project Development",
    category: "Web Development",
    image: `/images/tech/svelte.svg`,
    score: 4.8,
    progress: 0,
    started: false
  }
];

export type Course = {
  id: number;
  name: string;
  category: string;
  image: string;
  score: number;
  progress: number;
  started: boolean;
};

// Proportional widths: the table is full width, so fixed pixel columns would
// dump all the leftover space into a single flexible column.
const columnWidths: Record<string, string> = {
  select: "40px",
  name: "32%",
  category: "20%",
  score: "11%",
  progress: "19%",
  actions: "12%"
};

/* -------------------------------------------------------------------------- */
/*                                Filter schema                               */
/* -------------------------------------------------------------------------- */

const CATEGORY_DOTS = new Map<string, string>([
  ["Web Development", "bg-sky-500"],
  ["Backend", "bg-emerald-500"],
  ["Design", "bg-violet-500"]
]);

const fields: FilterField[] = [
  {
    id: "category",
    label: "Category",
    type: "select",
    defaultOperator: "is_any_of",
    options: [...CATEGORY_DOTS.entries()].map(([value, dot]) => ({
      value,
      label: value,
      icon: <Dot className={dot} />
    })),
    searchable: false,
    renderValue: ({ options }) => (
      <StackedDots options={options} dots={CATEGORY_DOTS} empty="any category" />
    ),
    icon: <CircleDotIcon />
  },
  {
    id: "score",
    label: "Score",
    type: "number",
    icon: <StarIcon />
  },
  {
    id: "progress",
    label: "Progress",
    type: "number",
    icon: <GaugeIcon />
  }
];

function readField(row: Course, path: string): unknown {
  return row[path as keyof Course];
}

function matchesSearch(row: Course, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return [row.name, row.category].some((value) => value.toLowerCase().includes(q));
}

const EMPTY_QUERY: FilterQuery = createFilterQuery();

export const columns: ColumnDef<Course>[] = [
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
    header: "Course name",
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-3">
        <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md border p-1.5">
          <img
            className="size-full object-contain"
            src={row.original.image}
            alt={row.original.name}
          />
        </div>
        <div className="truncate font-medium">{row.getValue("name")}</div>
      </div>
    )
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("category")}</span>
  },
  {
    accessorKey: "score",
    header: "Score",
    cell: ({ row }) => (
      <div className="flex items-center gap-1 tabular-nums">
        <StarIcon className="size-4 fill-yellow-500 text-yellow-500" />
        {row.getValue("score")}
      </div>
    )
  },
  {
    accessorKey: "progress",
    header: "Progress",
    cell: ({ row }) => {
      const progress = row.getValue<number>("progress");
      if (progress === 0) {
        return <span className="text-muted-foreground text-xs">Not started</span>;
      }
      return (
        <div className="flex items-center gap-2">
          <Progress className="h-2 w-full max-w-40" value={progress} />
          <span className="text-muted-foreground text-xs tabular-nums">{progress}%</span>
        </div>
      );
    }
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      return (
        <div className="text-end whitespace-nowrap">
          {row.original.started ? (
            <Button size="sm" variant="outline">
              Continue <ChevronRight />
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Start course</DropdownMenuItem>
                <DropdownMenuItem>Add to wishlist</DropdownMenuItem>
                <DropdownMenuItem>View details</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      );
    }
  }
];

export function CoursesListTable() {
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
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      rowSelection
    }
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Popular Courses</CardTitle>
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
                  placeholder="Search courses"
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
        <Table className="min-w-[700px] table-fixed [&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      style={{ width: columnWidths[header.column.id] }}
                    >
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
          <div className="text-muted-foreground flex-1 text-sm">{rows.length} courses</div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Previous page</span>
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Next page</span>
              <ChevronRight />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
