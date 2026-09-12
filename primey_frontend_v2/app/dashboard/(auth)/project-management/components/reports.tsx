"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { flexRender } from "@tanstack/react-table";
import { type LegacyColumnDef as ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useLegacyTable as useReactTable } from "@tanstack/react-table/legacy";
import type { SortingState } from "@tanstack/table-core";
import { format, parseISO } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  CircleDotIcon,
  DollarSignIcon,
  DownloadIcon,
  GaugeIcon,
  ListFilterIcon,
  SearchIcon,
  Trash2Icon
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { matchesFilterQuery } from "@/lib/filter-query-match";
import { Dot, SortableHeader, StackedDots } from "@/components/table-filter-helpers";
import { Filters } from "@/components/ui/filters/filters";
import { createFilterQuery } from "@/components/ui/filters/filters-query";
import type { FilterField, FilterQuery } from "@/components/ui/filters/filters-types";

// Define the data type for our table
type Project = {
  id: string;
  name: string;
  client: string;
  status: "active" | "completed" | "on-hold" | "cancelled";
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  progress: number;
  manager: string;
};

// Sample data for the table
const data: Project[] = [
  {
    id: "PRJ-001",
    name: "Website Redesign",
    client: "Acme Inc.",
    status: "active",
    startDate: "2025-01-15",
    endDate: "2025-04-30",
    budget: 12500,
    spent: 5200,
    progress: 42,
    manager: "John Smith"
  },
  {
    id: "PRJ-002",
    name: "Mobile App Development",
    client: "TechCorp",
    status: "active",
    startDate: "2025-02-01",
    endDate: "2025-06-15",
    budget: 35000,
    spent: 12800,
    progress: 36,
    manager: "Sarah Johnson"
  },
  {
    id: "PRJ-003",
    name: "Brand Identity",
    client: "GreenLife",
    status: "completed",
    startDate: "2024-11-10",
    endDate: "2025-01-20",
    budget: 8500,
    spent: 8500,
    progress: 100,
    manager: "Michael Brown"
  },
  {
    id: "PRJ-004",
    name: "E-commerce Platform",
    client: "Fashion Hub",
    status: "active",
    startDate: "2025-01-05",
    endDate: "2025-05-10",
    budget: 42000,
    spent: 18600,
    progress: 44,
    manager: "Emily Davis"
  },
  {
    id: "PRJ-005",
    name: "SEO Optimization",
    client: "Local Bistro",
    status: "on-hold",
    startDate: "2025-02-15",
    endDate: "2025-04-15",
    budget: 4500,
    spent: 1200,
    progress: 27,
    manager: "David Wilson"
  },
  {
    id: "PRJ-006",
    name: "Content Marketing",
    client: "EduTech",
    status: "active",
    startDate: "2025-01-20",
    endDate: "2025-07-20",
    budget: 18000,
    spent: 4500,
    progress: 25,
    manager: "Lisa Anderson"
  },
  {
    id: "PRJ-007",
    name: "CRM Implementation",
    client: "Global Services",
    status: "active",
    startDate: "2025-02-10",
    endDate: "2025-05-30",
    budget: 28000,
    spent: 9800,
    progress: 35,
    manager: "Robert Taylor"
  },
  {
    id: "PRJ-008",
    name: "Social Media Campaign",
    client: "FitLife Gym",
    status: "completed",
    startDate: "2024-12-01",
    endDate: "2025-02-28",
    budget: 7500,
    spent: 7500,
    progress: 100,
    manager: "Jennifer Martinez"
  },
  {
    id: "PRJ-009",
    name: "Product Launch",
    client: "Innovate Tech",
    status: "active",
    startDate: "2025-03-01",
    endDate: "2025-04-15",
    budget: 15000,
    spent: 3200,
    progress: 21,
    manager: "Thomas Clark"
  },
  {
    id: "PRJ-010",
    name: "Office Redesign",
    client: "Creative Studios",
    status: "on-hold",
    startDate: "2025-01-10",
    endDate: "2025-03-30",
    budget: 22000,
    spent: 8900,
    progress: 40,
    manager: "Amanda Lewis"
  },
  {
    id: "PRJ-011",
    name: "Data Migration",
    client: "Finance Pro",
    status: "active",
    startDate: "2025-02-20",
    endDate: "2025-04-10",
    budget: 9500,
    spent: 4200,
    progress: 44,
    manager: "Kevin White"
  },
  {
    id: "PRJ-012",
    name: "Security Audit",
    client: "SecureBank",
    status: "completed",
    startDate: "2025-01-05",
    endDate: "2025-02-15",
    budget: 12000,
    spent: 12000,
    progress: 100,
    manager: "Patricia Moore"
  },
  {
    id: "PRJ-013",
    name: "Video Production",
    client: "Media House",
    status: "active",
    startDate: "2025-02-15",
    endDate: "2025-05-01",
    budget: 18500,
    spent: 7200,
    progress: 39,
    manager: "James Wilson"
  },
  {
    id: "PRJ-014",
    name: "HR System Upgrade",
    client: "Corporate Inc.",
    status: "cancelled",
    startDate: "2025-01-10",
    endDate: "2025-04-10",
    budget: 14000,
    spent: 3500,
    progress: 25,
    manager: "Michelle Johnson"
  },
  {
    id: "PRJ-015",
    name: "Market Research",
    client: "New Ventures",
    status: "active",
    startDate: "2025-03-01",
    endDate: "2025-05-15",
    budget: 8500,
    spent: 2100,
    progress: 25,
    manager: "Daniel Brown"
  },
  {
    id: "PRJ-016",
    name: "Cloud Migration",
    client: "Tech Solutions",
    status: "active",
    startDate: "2025-02-10",
    endDate: "2025-06-30",
    budget: 32000,
    spent: 12800,
    progress: 40,
    manager: "Christopher Lee"
  },
  {
    id: "PRJ-017",
    name: "Training Program",
    client: "Education First",
    status: "on-hold",
    startDate: "2025-01-15",
    endDate: "2025-03-15",
    budget: 6500,
    spent: 2600,
    progress: 40,
    manager: "Jessica Taylor"
  },
  {
    id: "PRJ-018",
    name: "Annual Report Design",
    client: "Investment Group",
    status: "completed",
    startDate: "2024-12-15",
    endDate: "2025-02-28",
    budget: 9000,
    spent: 9000,
    progress: 100,
    manager: "Andrew Martin"
  },
  {
    id: "PRJ-019",
    name: "Customer Support Portal",
    client: "Service Pro",
    status: "active",
    startDate: "2025-02-01",
    endDate: "2025-05-15",
    budget: 16500,
    spent: 6800,
    progress: 41,
    manager: "Stephanie Garcia"
  },
  {
    id: "PRJ-020",
    name: "Inventory System",
    client: "Retail Chain",
    status: "active",
    startDate: "2025-01-20",
    endDate: "2025-04-30",
    budget: 21000,
    spent: 9450,
    progress: 45,
    manager: "Brian Wilson"
  },
  {
    id: "PRJ-021",
    name: "Loyalty Program App",
    client: "Coffee Roasters",
    status: "active",
    startDate: "2025-03-10",
    endDate: "2025-07-01",
    budget: 26500,
    spent: 8300,
    progress: 31,
    manager: "Rachel Adams"
  },
  {
    id: "PRJ-022",
    name: "Landing Page Revamp",
    client: "Startup Labs",
    status: "completed",
    startDate: "2025-01-02",
    endDate: "2025-02-10",
    budget: 5200,
    spent: 5200,
    progress: 100,
    manager: "Victor Nguyen"
  },
  {
    id: "PRJ-023",
    name: "Analytics Dashboard",
    client: "DataWorks",
    status: "active",
    startDate: "2025-02-25",
    endDate: "2025-06-20",
    budget: 30500,
    spent: 11200,
    progress: 37,
    manager: "Olivia Bennett"
  },
  {
    id: "PRJ-024",
    name: "Email Automation",
    client: "Growth Agency",
    status: "on-hold",
    startDate: "2025-02-05",
    endDate: "2025-04-25",
    budget: 7800,
    spent: 2900,
    progress: 34,
    manager: "Marcus Reed"
  },
  {
    id: "PRJ-025",
    name: "Payment Gateway Integration",
    client: "ShopEase",
    status: "active",
    startDate: "2025-03-05",
    endDate: "2025-05-30",
    budget: 19800,
    spent: 5400,
    progress: 28,
    manager: "Hannah Cole"
  },
  {
    id: "PRJ-026",
    name: "Accessibility Audit",
    client: "GovPortal",
    status: "completed",
    startDate: "2024-12-10",
    endDate: "2025-01-31",
    budget: 6800,
    spent: 6800,
    progress: 100,
    manager: "Peter Novak"
  },
  {
    id: "PRJ-027",
    name: "Warehouse Tracking",
    client: "LogiFreight",
    status: "cancelled",
    startDate: "2025-02-12",
    endDate: "2025-06-01",
    budget: 24000,
    spent: 6100,
    progress: 22,
    manager: "Elena Petrova"
  },
  {
    id: "PRJ-028",
    name: "Booking Engine Rewrite",
    client: "TravelNest",
    status: "active",
    startDate: "2025-03-15",
    endDate: "2025-08-15",
    budget: 46500,
    spent: 9800,
    progress: 18,
    manager: "Samuel Ortiz"
  },
  {
    id: "PRJ-029",
    name: "Design System Rollout",
    client: "FinServe",
    status: "on-hold",
    startDate: "2025-01-25",
    endDate: "2025-05-05",
    budget: 17200,
    spent: 7700,
    progress: 46,
    manager: "Grace Kim"
  },
  {
    id: "PRJ-030",
    name: "Chatbot Assistant",
    client: "SupportHub",
    status: "active",
    startDate: "2025-03-20",
    endDate: "2025-06-30",
    budget: 13400,
    spent: 2700,
    progress: 15,
    manager: "Noah Fischer"
  },
  {
    id: "PRJ-031",
    name: "Subscription Billing",
    client: "StreamBox",
    status: "active",
    startDate: "2025-03-25",
    endDate: "2025-07-10",
    budget: 27600,
    spent: 6900,
    progress: 24,
    manager: "Laura Sanders"
  },
  {
    id: "PRJ-032",
    name: "Onboarding Flow Redesign",
    client: "HR Cloud",
    status: "completed",
    startDate: "2024-11-20",
    endDate: "2025-01-15",
    budget: 9800,
    spent: 9800,
    progress: 100,
    manager: "Derek Holt"
  },
  {
    id: "PRJ-033",
    name: "Mobile Wallet",
    client: "PayQuick",
    status: "active",
    startDate: "2025-04-01",
    endDate: "2025-09-01",
    budget: 52000,
    spent: 8100,
    progress: 12,
    manager: "Priya Sharma"
  },
  {
    id: "PRJ-034",
    name: "Knowledge Base Portal",
    client: "HelpDesk Pro",
    status: "on-hold",
    startDate: "2025-02-18",
    endDate: "2025-05-20",
    budget: 11600,
    spent: 4300,
    progress: 38,
    manager: "Tomas Weber"
  },
  {
    id: "PRJ-035",
    name: "POS Terminal Software",
    client: "Retail Plus",
    status: "active",
    startDate: "2025-03-12",
    endDate: "2025-08-01",
    budget: 33500,
    spent: 10700,
    progress: 32,
    manager: "Angela Brooks"
  },
  {
    id: "PRJ-036",
    name: "Newsletter Platform",
    client: "MediaLetter",
    status: "cancelled",
    startDate: "2025-01-30",
    endDate: "2025-04-20",
    budget: 8900,
    spent: 1600,
    progress: 18,
    manager: "Felix Turner"
  },
  {
    id: "PRJ-037",
    name: "Fleet Management System",
    client: "MoveIt Logistics",
    status: "active",
    startDate: "2025-04-05",
    endDate: "2025-10-15",
    budget: 61000,
    spent: 7300,
    progress: 9,
    manager: "Isabella Rossi"
  },
  {
    id: "PRJ-038",
    name: "Patient Portal",
    client: "CareClinic",
    status: "active",
    startDate: "2025-03-08",
    endDate: "2025-07-25",
    budget: 38200,
    spent: 13400,
    progress: 34,
    manager: "Ethan Walker"
  },
  {
    id: "PRJ-039",
    name: "Event Ticketing Site",
    client: "LiveNation Co",
    status: "completed",
    startDate: "2024-12-05",
    endDate: "2025-02-20",
    budget: 15700,
    spent: 15700,
    progress: 100,
    manager: "Sofia Alvarez"
  },
  {
    id: "PRJ-040",
    name: "Vendor Marketplace",
    client: "TradeHub",
    status: "active",
    startDate: "2025-04-10",
    endDate: "2025-09-30",
    budget: 44800,
    spent: 5200,
    progress: 11,
    manager: "Jack Morrison"
  }
];

const statusConfig: Record<
  Project["status"],
  { label: string; variant: "success" | "info" | "warning" | "destructive"; dot: string }
> = {
  active: { label: "Active", variant: "success", dot: "bg-emerald-500" },
  completed: { label: "Completed", variant: "info", dot: "bg-blue-500" },
  "on-hold": { label: "On Hold", variant: "warning", dot: "bg-amber-500" },
  cancelled: { label: "Cancelled", variant: "destructive", dot: "bg-rose-500" }
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
    id: "budget",
    label: "Budget",
    type: "number",
    icon: <DollarSignIcon />
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
  return [row.id, row.name, row.client, row.manager].some((value) =>
    value.toLowerCase().includes(q)
  );
}

const EMPTY_QUERY: FilterQuery = createFilterQuery();

// Define the columns for our table
const columns: ColumnDef<Project>[] = [
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
    accessorKey: "id",
    size: 100,
    header: "ID",
    cell: ({ row }) => (
      <span className="text-muted-foreground whitespace-nowrap tabular-nums">
        {row.getValue("id")}
      </span>
    )
  },
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column}>Project Name</SortableHeader>,
    cell: ({ row }) => <div className="truncate font-medium">{row.getValue("name")}</div>
  },
  {
    accessorKey: "client",
    size: 150,
    header: "Client",
    cell: ({ row }) => (
      <div className="text-muted-foreground truncate">{row.getValue("client")}</div>
    )
  },
  {
    accessorKey: "status",
    size: 120,
    header: "Status",
    cell: ({ row }) => {
      const status = statusConfig[row.original.status];
      return <Badge variant={status.variant}>{status.label}</Badge>;
    }
  },
  {
    accessorKey: "startDate",
    size: 120,
    header: "Start Date",
    cell: ({ row }) => (
      <span className="text-muted-foreground whitespace-nowrap">
        {format(parseISO(row.getValue("startDate")), "MMM d, yyyy")}
      </span>
    )
  },
  {
    accessorKey: "endDate",
    size: 120,
    header: "End Date",
    cell: ({ row }) => (
      <span className="text-muted-foreground whitespace-nowrap">
        {format(parseISO(row.getValue("endDate")), "MMM d, yyyy")}
      </span>
    )
  },
  {
    accessorKey: "budget",
    size: 120,
    header: ({ column }) => <SortableHeader column={column}>Budget</SortableHeader>,
    cell: ({ row }) => {
      const amount = Number.parseFloat(row.getValue("budget"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
      }).format(amount);

      return <div className="font-medium tabular-nums">{formatted}</div>;
    }
  },
  {
    accessorKey: "progress",
    size: 150,
    header: ({ column }) => <SortableHeader column={column}>Progress</SortableHeader>,
    cell: ({ row }) => {
      const progress = Number.parseInt(row.getValue("progress"));

      return (
        <div className="flex items-center gap-2">
          <Progress className="h-1.5" value={progress} />
          <span className="text-muted-foreground text-xs tabular-nums">{progress}%</span>
        </div>
      );
    }
  }
];

export function Reports() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState<FilterQuery>(EMPTY_QUERY);
  const [rowSelection, setRowSelection] = useState({});

  const rows = useMemo(
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
    },
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 15
      }
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
                  placeholder="Search projects..."
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
        <Table className="min-w-[1000px] table-fixed [&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)">
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
                  No projects match these filters.
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
