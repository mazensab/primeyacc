"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleDotIcon,
  Ellipsis,
  GaugeIcon,
  ListFilterIcon,
  SearchIcon
} from "lucide-react";
import { flexRender } from "@tanstack/react-table";
import { type LegacyColumnDef as ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useLegacyTable as useReactTable } from "@tanstack/react-table/legacy";
import type { SortingState } from "@tanstack/table-core";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { matchesFilterQuery } from "@/lib/filter-query-match";
import { Dot, StackedDots } from "@/components/table-filter-helpers";
import { Filters } from "@/components/ui/filters/filters";
import { createFilterQuery } from "@/components/ui/filters/filters-query";
import type { FilterField, FilterQuery } from "@/components/ui/filters/filters-types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const data: Project[] = [
  {
    id: 1,
    name: "Product Development",
    client: {
      avatar: `https://i.pravatar.cc/150?img=1`,
      name: "Kevin Heal"
    },
    date: "20/03/2024",
    deadline: "05/04/2024",
    status: "active",
    progress: 30
  },
  {
    id: 2,
    name: "New Office Building",
    client: {
      avatar: `https://i.pravatar.cc/150?img=2`,
      name: "Sarah Johnson"
    },
    date: "15/03/2024",
    deadline: "10/04/2024",
    status: "cancel",
    progress: 60
  },
  {
    id: 3,
    name: "Mobile app design",
    client: {
      avatar: `https://i.pravatar.cc/150?img=3`,
      name: "Michael Chen"
    },
    date: "10/03/2024",
    deadline: "01/04/2024",
    status: "completed",
    progress: 100
  },
  {
    id: 4,
    name: "Website & Blog",
    client: {
      avatar: `https://i.pravatar.cc/150?img=4`,
      name: "Emily Rodriguez"
    },
    date: "05/03/2024",
    deadline: "20/03/2024",
    status: "pending",
    progress: 50
  },
  {
    id: 5,
    name: "Marketing Campaign",
    client: {
      avatar: `https://i.pravatar.cc/150?img=5`,
      name: "David Wilson"
    },
    date: "01/03/2024",
    deadline: "15/04/2024",
    status: "active",
    progress: 45
  },
  {
    id: 6,
    name: "E-commerce Platform",
    client: {
      avatar: `https://i.pravatar.cc/150?img=6`,
      name: "Jessica Lee"
    },
    date: "25/02/2024",
    deadline: "10/05/2024",
    status: "pending",
    progress: 20
  },
  {
    id: 7,
    name: "CRM Integration",
    client: {
      avatar: `https://i.pravatar.cc/150?img=7`,
      name: "Robert Brown"
    },
    date: "20/02/2024",
    deadline: "15/03/2024",
    status: "completed",
    progress: 100
  },
  {
    id: 8,
    name: "Data Analytics Dashboard",
    client: {
      avatar: `https://i.pravatar.cc/150?img=8`,
      name: "Amanda Taylor"
    },
    date: "15/02/2024",
    deadline: "30/03/2024",
    status: "active",
    progress: 75
  },
  {
    id: 9,
    name: "Mobile Payment System",
    client: {
      avatar: `https://i.pravatar.cc/150?img=9`,
      name: "Thomas Garcia"
    },
    date: "10/02/2024",
    deadline: "25/03/2024",
    status: "cancel",
    progress: 35
  },
  {
    id: 10,
    name: "AI Chatbot Development",
    client: {
      avatar: `https://i.pravatar.cc/150?img=10`,
      name: "Olivia Martinez"
    },
    date: "05/02/2024",
    deadline: "20/04/2024",
    status: "active",
    progress: 60
  },
  {
    id: 11,
    name: "Cloud Migration",
    client: {
      avatar: `https://i.pravatar.cc/150?img=1`,
      name: "William Clark"
    },
    date: "01/02/2024",
    deadline: "15/03/2024",
    status: "completed",
    progress: 95
  },
  {
    id: 12,
    name: "Security Audit",
    client: {
      avatar: `https://i.pravatar.cc/150?img=2`,
      name: "Sophia Kim"
    },
    date: "25/01/2024",
    deadline: "10/03/2024",
    status: "pending",
    progress: 40
  }
];

type Client = {
  avatar: string;
  name: string;
};

type Project = {
  id: number;
  name?: string;
  client?: Client;
  date?: string;
  deadline?: string;
  status: "pending" | "active" | "completed" | "cancel";
  progress?: number;
};

const statusConfig: Record<
  Project["status"],
  { label: string; variant: "success" | "info" | "warning" | "destructive"; dot: string }
> = {
  active: { label: "Active", variant: "success", dot: "bg-emerald-500" },
  pending: { label: "Pending", variant: "warning", dot: "bg-amber-500" },
  completed: { label: "Completed", variant: "info", dot: "bg-blue-500" },
  cancel: { label: "Cancelled", variant: "destructive", dot: "bg-rose-500" }
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
  },
  {
    id: "progress",
    label: "Progress",
    type: "number",
    icon: <GaugeIcon />
  }
];

function readField(row: Project, path: string): unknown {
  return row[path as keyof Project];
}

function matchesSearch(row: Project, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return [row.name, row.client?.name].some((value) => value?.toLowerCase().includes(q));
}

const EMPTY_QUERY: FilterQuery = createFilterQuery();

export const columns: ColumnDef<Project>[] = [
  {
    accessorKey: "name",
    header: "Project Name",
    cell: ({ row }) => <div className="truncate font-medium">{row.getValue("name")}</div>
  },
  {
    accessorKey: "client",
    size: 200,
    header: "Client Name",
    cell: ({ row }) => {
      const client = row.getValue("client") as Client;

      return (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-8">
            <AvatarImage src={client.avatar} alt={client.name} />
            <AvatarFallback>
              {client.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{client.name}</span>
        </div>
      );
    }
  },
  {
    accessorKey: "date",
    size: 110,
    header: "Start Date",
    cell: ({ row }) => (
      <span className="text-muted-foreground whitespace-nowrap tabular-nums">
        {row.getValue("date")}
      </span>
    )
  },
  {
    accessorKey: "deadline",
    size: 110,
    header: "Deadline",
    cell: ({ row }) => (
      <span className="text-muted-foreground whitespace-nowrap tabular-nums">
        {row.getValue("deadline")}
      </span>
    )
  },
  {
    accessorKey: "status",
    size: 120,
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as Project["status"];

      return <Badge variant={statusConfig[status].variant}>{statusConfig[status].label}</Badge>;
    }
  },
  {
    accessorKey: "progress",
    size: 160,
    header: "Progress",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Progress value={row.getValue("progress")} className="h-1.5" />
        <span className="text-muted-foreground text-xs tabular-nums">
          {row.getValue("progress")}%
        </span>
      </div>
    )
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
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>View Project</DropdownMenuItem>
              <DropdownMenuItem>Members</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }
  }
];

export function TableRecentProjects() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [search, setSearch] = React.useState("");
  const [query, setQuery] = React.useState<FilterQuery>(EMPTY_QUERY);

  const rows = React.useMemo(
    () =>
      data.filter((row) => matchesSearch(row, search) && matchesFilterQuery(row, query, readField)),
    [search, query]
  );

  const table = useReactTable({
    data: rows,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting
    },
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 6
      }
    }
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const firstRow = rows.length === 0 ? 0 : pageIndex * pageSize + 1;
  const lastRow = Math.min((pageIndex + 1) * pageSize, rows.length);

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Recent Projects</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col p-0 [&_[data-slot=table-container]]:flex-1">
        <div className="flex min-h-14 items-center gap-2 border-b px-(--card-spacing) py-3">
          <InputGroup className="w-full max-w-56 shrink-0 @max-md/card:min-w-24 @max-md/card:flex-1 @max-md/card:basis-0">
            <InputGroupInput
              placeholder="Search project, client..."
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
            className="flex-1 @max-md/card:flex-initial"
          />
        </div>
        <Table className="min-w-[860px] table-fixed [&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)">
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
                <TableRow key={row.id}>
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
            {firstRow} - {lastRow} of {rows.length} projects
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
