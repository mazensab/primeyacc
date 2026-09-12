"use client";

import * as React from "react";
import { flexRender } from "@tanstack/react-table";
import { type LegacyColumnDef as ColumnDef, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useLegacyTable as useReactTable } from "@tanstack/react-table/legacy";
import type { ColumnFiltersState, SortingState, ColumnVisibilityState as VisibilityState } from "@tanstack/table-core";
import { ArrowDownIcon, ArrowUpIcon, ChevronDown, FolderUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

type Order = {
  id: string;
  customerName: string;
  items: number;
  amount: number;
  paymentMethod: string;
  status: "new-order" | "in-progress" | "completed" | "return" | "on-hold";
};

const data: Order[] = [
  {
    id: "1083",
    customerName: "Marvin Dekidis",
    items: 2,
    amount: 34.5,
    paymentMethod: "E-Wallet",
    status: "new-order"
  },
  {
    id: "1082",
    customerName: "Carter Lipshitz",
    items: 6,
    amount: 60.5,
    paymentMethod: "Bank Transfer",
    status: "in-progress"
  },
  {
    id: "1081",
    customerName: "Addison Philips",
    items: 3,
    amount: 47.5,
    paymentMethod: "E-Wallet",
    status: "new-order"
  },
  {
    id: "1079",
    customerName: "Craig Siphron",
    items: 15,
    amount: 89.8,
    paymentMethod: "Bank Transfer",
    status: "on-hold"
  },
  {
    id: "1078",
    customerName: "Emma Johnson",
    items: 4,
    amount: 120.75,
    paymentMethod: "Credit Card",
    status: "completed"
  },
  {
    id: "1077",
    customerName: "Michael Smith",
    items: 8,
    amount: 210.5,
    paymentMethod: "PayPal",
    status: "completed"
  },
  {
    id: "1076",
    customerName: "Sarah Williams",
    items: 1,
    amount: 25.99,
    paymentMethod: "E-Wallet",
    status: "in-progress"
  },
  {
    id: "1075",
    customerName: "James Brown",
    items: 3,
    amount: 78.45,
    paymentMethod: "Bank Transfer",
    status: "return"
  },
  {
    id: "1074",
    customerName: "David Miller",
    items: 5,
    amount: 145.2,
    paymentMethod: "Credit Card",
    status: "new-order"
  },
  {
    id: "1073",
    customerName: "Jennifer Davis",
    items: 2,
    amount: 67.8,
    paymentMethod: "PayPal",
    status: "in-progress"
  },
  {
    id: "1072",
    customerName: "Robert Wilson",
    items: 7,
    amount: 198.35,
    paymentMethod: "Bank Transfer",
    status: "completed"
  },
  {
    id: "1071",
    customerName: "Lisa Anderson",
    items: 4,
    amount: 112.9,
    paymentMethod: "E-Wallet",
    status: "on-hold"
  },
  {
    id: "1070",
    customerName: "Thomas Taylor",
    items: 9,
    amount: 245.75,
    paymentMethod: "Credit Card",
    status: "new-order"
  },
  {
    id: "1069",
    customerName: "Patricia Moore",
    items: 3,
    amount: 87.6,
    paymentMethod: "Bank Transfer",
    status: "return"
  },
  {
    id: "1068",
    customerName: "Christopher White",
    items: 6,
    amount: 156.4,
    paymentMethod: "PayPal",
    status: "completed"
  },
  {
    id: "1067",
    customerName: "Elizabeth Harris",
    items: 2,
    amount: 54.25,
    paymentMethod: "E-Wallet",
    status: "in-progress"
  }
];

const columns: ColumnDef<Order>[] = [
  {
    accessorKey: "id",
    header: "ID",
    size: 80
  },
  {
    accessorKey: "customerName",
    header: "Customer Name",
    cell: ({ row }) => (
      <div className="truncate font-medium">{row.getValue("customerName")}</div>
    )
  },
  {
    accessorKey: "items",
    size: 110,
    header: "Qty Items",
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">{row.getValue("items")} Items</span>
    )
  },
  {
    accessorKey: "amount",
    size: 110,
    header: "Amount",
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
          row.getValue("amount")
        )}
      </span>
    )
  },
  {
    accessorKey: "paymentMethod",
    size: 160,
    header: "Payment Method",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.getValue("paymentMethod")}</span>
    )
  },
  {
    accessorKey: "status",
    size: 130,
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;

      const statusMap = {
        completed: "success",
        "new-order": "info",
        "in-progress": "warning",
        "on-hold": "warning",
        return: "destructive"
      } as const;

      const statusClass = statusMap[status] ?? "default";

      return (
        <Badge variant={statusClass} className="capitalize">
          {status.replace("-", " ")}
        </Badge>
      );
    }
  }
];

export function TableOrderStatus() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility
    },
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 6
      }
    }
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;
  const firstRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const lastRow = Math.min((pageIndex + 1) * pageSize, totalRows);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Track Order Status</CardTitle>
        <CardDescription>Analyze growth and changes in visitor patterns</CardDescription>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FolderUp /> <span className="hidden lg:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Excel</DropdownMenuItem>
              <DropdownMenuItem>PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col p-0 [&_[data-slot=table-container]]:flex-1">
        <div className="grid gap-4 p-(--card-spacing) md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <div className="font-display text-2xl lg:text-3xl">43</div>
            <div className="flex gap-2">
              <div className="text-muted-foreground text-sm">New Order</div>
              <div className="flex items-center gap-0.5 text-xs text-green-500">
                <ArrowUpIcon className="size-3" />
                0.5%
              </div>
            </div>
            <Progress
              value={43}
              className="h-2 bg-blue-100 dark:bg-blue-950"
              indicatorColor="bg-blue-400"
            />
          </div>
          <div className="space-y-2">
            <div className="font-display text-2xl lg:text-3xl">12</div>
            <div className="flex gap-2">
              <div className="text-muted-foreground text-sm">On Progress</div>
              <div className="flex items-center gap-0.5 text-xs text-red-500">
                <ArrowDownIcon className="size-3" />
                0.3%
              </div>
            </div>
            <Progress
              value={25}
              className="h-2 bg-teal-100 dark:bg-teal-950"
              indicatorColor="bg-teal-400"
            />
          </div>
          <div className="space-y-2">
            <div className="font-display text-2xl lg:text-3xl">40</div>
            <div className="flex gap-2">
              <div className="text-muted-foreground text-sm">Completed</div>
              <div className="flex items-center gap-0.5 text-xs text-green-500">
                <ArrowUpIcon className="size-3" />
                0.5%
              </div>
            </div>
            <Progress
              value={40}
              className="h-2 bg-green-100 dark:bg-green-950"
              indicatorColor="bg-green-400"
            />
          </div>
          <div className="space-y-2">
            <div className="font-display text-2xl lg:text-3xl">2</div>
            <div className="flex gap-2">
              <div className="text-muted-foreground text-sm">Return</div>
              <div className="flex items-center gap-0.5 text-xs text-red-500">
                <ArrowDownIcon className="size-3" />
                0.5%
              </div>
            </div>
            <Progress
              value={48}
              className="h-2 bg-orange-100 dark:bg-orange-950"
              indicatorColor="bg-orange-400"
            />
          </div>
        </div>

        <div>
          <div className="flex min-h-14 items-center gap-2 border-y px-(--card-spacing) py-3">
            <Input
              placeholder="Filter orders..."
              value={(table.getColumn("customerName")?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn("customerName")?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  Columns <ChevronDown />
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
          <Table className="min-w-[760px] table-fixed [&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)">
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
              {firstRow} - {lastRow} of {totalRows} orders
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
      </CardContent>
    </Card>
  );
}
