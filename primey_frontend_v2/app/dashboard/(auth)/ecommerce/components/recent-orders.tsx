"use client";

import * as React from "react";
import { flexRender } from "@tanstack/react-table";
import { type LegacyColumnDef as ColumnDef, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useLegacyTable as useReactTable } from "@tanstack/react-table/legacy";
import type { ColumnFiltersState, PaginationState, SortingState, ColumnVisibilityState as VisibilityState } from "@tanstack/table-core";
import { ArrowUpDown, ChevronLeft, ChevronRight, FolderUp, MoreHorizontal } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export type Order = {
  id: number;
  customer: {
    name: string;
    image: string;
  };
  product: {
    name: string;
  };
  amount: number;
  status: "processing" | "paid" | "success" | "failed";
};

const orders: Order[] = [
  {
    id: 1023,
    customer: {
      name: "Theodore Bell",
      image: `https://i.pravatar.cc/150?img=1`
    },
    product: {
      name: "Tire Doodad"
    },
    amount: 300,
    status: "processing"
  },
  {
    id: 2045,
    customer: {
      name: "Amelia Grant",
      image: `https://i.pravatar.cc/150?img=2`
    },
    product: {
      name: "Engine Kit"
    },
    amount: 450,
    status: "paid"
  },
  {
    id: 3067,
    customer: {
      name: "Eleanor Ward",
      image: `https://i.pravatar.cc/150?img=3`
    },
    product: {
      name: "Brake Pad"
    },
    amount: 200,
    status: "success"
  },
  {
    id: 4089,
    customer: {
      name: "Henry Carter",
      image: `https://i.pravatar.cc/150?img=4`
    },
    product: {
      name: "Fuel Pump"
    },
    amount: 500,
    status: "processing"
  },
  {
    id: 5102,
    customer: {
      name: "Olivia Harris",
      image: `https://i.pravatar.cc/150?img=5`
    },
    product: {
      name: "Steering Wheel"
    },
    amount: 350,
    status: "failed"
  },
  {
    id: 6123,
    customer: {
      name: "James Robinson",
      image: `https://i.pravatar.cc/150?img=6`
    },
    product: {
      name: "Air Filter"
    },
    amount: 180,
    status: "paid"
  },
  {
    id: 7145,
    customer: {
      name: "Sophia Martinez",
      image: `https://i.pravatar.cc/150?img=7`
    },
    product: {
      name: "Oil Filter"
    },
    amount: 220,
    status: "success"
  },
  {
    id: 8167,
    customer: {
      name: "Liam Thompson",
      image: `https://i.pravatar.cc/150?img=8`
    },
    product: {
      name: "Radiator Cap"
    },
    amount: 290,
    status: "processing"
  },
  {
    id: 9189,
    customer: {
      name: "Emma Wilson",
      image: `https://i.pravatar.cc/150?img=9`
    },
    product: {
      name: "Spark Plug"
    },
    amount: 150,
    status: "success"
  },
  {
    id: 10211,
    customer: {
      name: "Noah Davis",
      image: `https://i.pravatar.cc/150?img=10`
    },
    product: {
      name: "Transmission Fluid"
    },
    amount: 120,
    status: "paid"
  },
  {
    id: 11233,
    customer: {
      name: "Ava Johnson",
      image: `https://i.pravatar.cc/150?img=1`
    },
    product: {
      name: "Battery Terminal"
    },
    amount: 85,
    status: "processing"
  },
  {
    id: 12255,
    customer: {
      name: "William Brown",
      image: `https://i.pravatar.cc/150?img=2`
    },
    product: {
      name: "Alternator"
    },
    amount: 420,
    status: "failed"
  },
  {
    id: 13277,
    customer: {
      name: "Charlotte Miller",
      image: `https://i.pravatar.cc/150?img=3`
    },
    product: {
      name: "Timing Belt"
    },
    amount: 380,
    status: "success"
  },
  {
    id: 14299,
    customer: {
      name: "Benjamin Taylor",
      image: `https://i.pravatar.cc/150?img=4`
    },
    product: {
      name: "Shock Absorber"
    },
    amount: 550,
    status: "processing"
  },
  {
    id: 15321,
    customer: {
      name: "Mia Anderson",
      image: `https://i.pravatar.cc/150?img=5`
    },
    product: {
      name: "Windshield Wiper"
    },
    amount: 95,
    status: "paid"
  },
  {
    id: 16343,
    customer: {
      name: "Elijah Thomas",
      image: `https://i.pravatar.cc/150?img=6`
    },
    product: {
      name: "Headlight Assembly"
    },
    amount: 320,
    status: "success"
  }
];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const columns: ColumnDef<Order>[] = [
  {
    accessorKey: "id",
    header: "ID",
    size: 90,
    cell: ({ row }) => (
      <Button variant="link" className="text-muted-foreground hover:text-primary h-auto p-0">
        <Link href="#">#{row.getValue("id")}</Link>
      </Button>
    )
  },
  {
    accessorKey: "customer",
    header: "Customer",
    cell: ({ row }) => (
      <div className="flex items-center gap-4">
        <Avatar>
          <AvatarImage src={row.original.customer.image} alt={row.original.customer.name} />
          <AvatarFallback>{initials(row.original.customer.name)}</AvatarFallback>
        </Avatar>
        <div className="truncate font-medium capitalize">{row.original.customer.name}</div>
      </div>
    ),
    filterFn: (row, columnId, filterValue) => {
      return row.original.customer.name.toLowerCase().includes(filterValue.toLowerCase());
    }
  },
  {
    accessorKey: "product",
    header: "Product",
    size: 180,
    cell: ({ row }) => (
      <div className="text-muted-foreground capitalize">{row.original.product.name}</div>
    )
  },
  {
    accessorKey: "amount",
    size: 110,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0! hover:bg-transparent!">
          Amount
          <ArrowUpDown className="size-3" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const amount = Number.parseFloat(row.getValue("amount"));

      // Format the amount as a dollar amount
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
      }).format(amount);

      return <div className="font-medium tabular-nums">{formatted}</div>;
    }
  },
  {
    accessorKey: "status",
    header: "Status",
    size: 120,
    cell: ({ row }) => {
      const status = row.original.status;

      const statusMap = {
        success: "success",
        processing: "info",
        paid: "success",
        failed: "destructive"
      } as const;

      const statusClass = statusMap[status] ?? "default";

      return (
        <Badge variant={statusClass} className="capitalize">
          {status.replace("-", " ")}
        </Badge>
      );
    }
  },
  {
    id: "actions",
    enableHiding: false,
    size: 56,
    cell: ({ row }) => {
      const order = row.original;

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
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(String(order.id))}>
                Copy order ID
              </DropdownMenuItem>
              <DropdownMenuItem>View customer</DropdownMenuItem>
              <DropdownMenuItem>View payment details</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }
  }
];

export function EcommerceRecentOrdersCard() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [{ pageIndex, pageSize }, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 8
  });

  const pagination = React.useMemo(
    () => ({
      pageIndex,
      pageSize
    }),
    [pageIndex, pageSize]
  );

  const table = useReactTable({
    data: orders,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination
    }
  });

  const rowCount = table.getFilteredRowModel().rows.length;
  const firstRow = rowCount === 0 ? 0 : pageIndex * pageSize + 1;
  const lastRow = Math.min((pageIndex + 1) * pageSize, rowCount);

  return (
    <Card className="lg:col-span-7">
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
        <CardAction className="relative">
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
        <div className="flex min-h-14 items-center gap-2 border-b px-(--card-spacing) py-3">
          <Input
            placeholder="Filter orders..."
            value={(table.getColumn("customer")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("customer")?.setFilterValue(event.target.value)}
            className="max-w-xs"
          />
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

        <div className="flex items-center justify-between gap-2 border-t px-(--card-spacing) py-3">
          <p className="text-muted-foreground text-sm tabular-nums">
            {firstRow} - {lastRow} of {rowCount} orders
          </p>
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
