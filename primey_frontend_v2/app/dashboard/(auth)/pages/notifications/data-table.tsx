"use client";

import * as React from "react";
import { flexRender } from "@tanstack/react-table";
import { type LegacyColumnDef as ColumnDef, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, useLegacyTable as useReactTable } from "@tanstack/react-table/legacy";
import type { ColumnVisibilityState as VisibilityState } from "@tanstack/table-core";
import {
  Check,
  ChevronDown,
  Columns,
  FileText,
  Inbox,
  MessageSquare,
  Search,
  Users,
  X
} from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type Notification = {
  id: number;
  title: string;
  description: string;
  type: "ticket" | "message" | "team";
  time: string;
  status: "read" | "unread";
  user?: {
    name: string;
    avatar?: string;
  };
  actions?: Array<{
    label: string;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    onClick?: () => void;
  }>;
};

const typeConfig: Record<
  Notification["type"],
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    iconClass: string;
    dotClass: string;
  }
> = {
  ticket: {
    icon: FileText,
    label: "Ticket",
    iconClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    dotClass: "bg-blue-500"
  },
  message: {
    icon: MessageSquare,
    label: "Message",
    iconClass: "bg-green-500/10 text-green-600 dark:text-green-400",
    dotClass: "bg-green-500"
  },
  team: {
    icon: Users,
    label: "Team",
    iconClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    dotClass: "bg-purple-500"
  }
};

export const columns: ColumnDef<Notification>[] = [
  {
    accessorKey: "notification",
    header: "Notification",
    enableHiding: false,
    cell: ({ row }) => {
      const notification = row.original;
      const config = typeConfig[notification.type];
      const Icon = config.icon;
      const isUnread = notification.status === "unread";

      return (
        <div className="flex gap-4 p-2">
          {notification.user ? (
            <Avatar className="size-10">
              <AvatarImage src={notification.user.avatar} alt={notification.user.name} />
              <AvatarFallback>
                {notification.user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full",
                config.iconClass
              )}>
              <Icon className="size-4" />
            </div>
          )}
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className={cn("text-sm font-medium", isUnread && "font-semibold")}>
                {notification.user ? notification.user.name : notification.title}
              </span>
              {isUnread && (
                <span className="size-2 shrink-0 rounded-full bg-blue-500" aria-label="Unread" />
              )}
            </div>
            <div className="text-muted-foreground text-sm">{notification.description}</div>
            {notification.actions && notification.actions.length > 0 && (
              <div className="flex gap-2 pt-2">
                {notification.actions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant || "outline"}
                    size="sm"
                    onClick={action.onClick}>
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const config = typeConfig[row.original.type];
      return (
        <Badge variant="outline" className="text-muted-foreground gap-1.5">
          <span className={cn("size-1.5 rounded-full", config.dotClass)} />
          {config.label}
        </Badge>
      );
    }
  },
  {
    accessorKey: "time",
    header: "Time",
    cell: ({ row }) => (
      <span className="text-muted-foreground pe-2 text-xs whitespace-nowrap">
        {row.getValue("time")}
      </span>
    )
  }
];

function FilterPopover({
  label,
  options,
  value,
  onChange,
  counts
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (value: string | null) => void;
  counts: Record<string, number>;
}) {
  const selected = options.find((option) => option.value === value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          {label}
          {selected ? <Badge variant="secondary">{selected.label}</Badge> : <ChevronDown />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="end">
        <Command>
          <CommandList>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => onChange(value === option.value ? null : option.value)}>
                  {option.label}
                  <span className="text-muted-foreground ms-auto text-xs">
                    {counts[option.value] ?? 0}
                  </span>
                  <Check
                    className={cn("size-4", value === option.value ? "opacity-100" : "opacity-0")}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function NotificationsDataTable({ data }: { data: Notification[] }) {
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);
  const [typeFilter, setTypeFilter] = React.useState<string | null>(null);

  const filteredData = React.useMemo(
    () =>
      data.filter(
        (notification) =>
          (!statusFilter || notification.status === statusFilter) &&
          (!typeFilter || notification.type === typeFilter)
      ),
    [data, statusFilter, typeFilter]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const { title, description, type, user } = row.original;
      return (
        title.toLowerCase().includes(search) ||
        description.toLowerCase().includes(search) ||
        type.toLowerCase().includes(search) ||
        (user?.name.toLowerCase().includes(search) ?? false)
      );
    },
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 10
      }
    },
    state: {
      columnVisibility,
      globalFilter
    }
  });

  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((notification) => {
      counts[notification.status] = (counts[notification.status] ?? 0) + 1;
    });
    return counts;
  }, [data]);

  const typeCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((notification) => {
      counts[notification.type] = (counts[notification.type] ?? 0) + 1;
    });
    return counts;
  }, [data]);

  const hasFilters = Boolean(statusFilter || typeFilter);

  const statuses = [
    { value: "unread", label: "Unread" },
    { value: "read", label: "Read" }
  ];

  const types = [
    { value: "ticket", label: "Ticket" },
    { value: "message", label: "Message" },
    { value: "team", label: "Team" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-48 grow">
          <Search className="text-muted-foreground absolute start-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search notifications..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="ps-9"
          />
        </div>
        <div className="flex gap-2">
          <FilterPopover
            label="Status"
            options={statuses}
            value={statusFilter}
            onChange={setStatusFilter}
            counts={statusCounts}
          />
          <FilterPopover
            label="Type"
            options={types}
            value={typeFilter}
            onChange={setTypeFilter}
            counts={typeCounts}
          />
          {hasFilters && (
            <Button
              variant="ghost"
              onClick={() => {
                setStatusFilter(null);
                setTypeFilter(null);
              }}>
              Reset
              <X />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Columns />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}>
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="space-y-4">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => {
                  const isUnread = row.original.status === "unread";
                  return (
                    <TableRow
                      key={row.id}
                      className={cn(isUnread && "bg-blue-500/4! dark:bg-blue-500/8!")}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            cell.column.id === "time" && "text-end max-sm:align-top",
                            cell.column.id === "notification" && "w-full whitespace-normal",
                            cell.column.id === "type" && "max-sm:hidden"
                          )}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-40 text-center">
                    <div className="text-muted-foreground flex flex-col items-center gap-2">
                      <Inbox className="size-8" />
                      <span className="text-sm">No notifications found.</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2">
          <div className="text-muted-foreground flex-1 text-sm">
            Showing{" "}
            {table.getFilteredRowModel().rows.length === 0
              ? 0
              : table.getState().pagination.pageIndex * table.getState().pagination.pageSize +
                1}{" "}
            to{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{" "}
            of {table.getFilteredRowModel().rows.length} notification(s)
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}>
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
