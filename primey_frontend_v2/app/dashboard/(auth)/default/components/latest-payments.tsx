"use client";

import * as React from "react";
import { flexRender } from "@tanstack/react-table";
import { type LegacyColumnDef as ColumnDef, getCoreRowModel, useLegacyTable as useReactTable, getPaginationRowModel, getFilteredRowModel } from "@tanstack/react-table/legacy";
import Link from "next/link";
import { MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

interface Payment {
  id: string;
  status: "success" | "processing" | "failed";
  email: string;
  firstName: string;
  lastName: string;
  amount: number;
}

export function LatestPayments() {
  const data = React.useMemo<Payment[]>(
    () => [
      {
        id: "1",
        status: "success",
        email: "ken99@yahoo.com",
        firstName: "Kenneth",
        lastName: "Thompson",
        amount: 316.0
      },
      {
        id: "2",
        status: "success",
        email: "abe45@gmail.com",
        firstName: "Abraham",
        lastName: "Lincoln",
        amount: 242.0
      },
      {
        id: "3",
        status: "processing",
        email: "monserrat44@gmail.com",
        firstName: "Monserrat",
        lastName: "Rodriguez",
        amount: 837.0
      },
      {
        id: "4",
        status: "success",
        email: "silas22@gmail.com",
        firstName: "Silas",
        lastName: "Johnson",
        amount: 874.0
      },
      {
        id: "5",
        status: "failed",
        email: "carmella@hotmail.com",
        firstName: "Carmella",
        lastName: "DeVito",
        amount: 721.0
      },
      {
        id: "6",
        status: "success",
        email: "maria@gmail.com",
        firstName: "Maria",
        lastName: "Garcia",
        amount: 529.0
      },
      {
        id: "7",
        status: "processing",
        email: "james34@outlook.com",
        firstName: "James",
        lastName: "Wilson",
        amount: 438.0
      },
      {
        id: "8",
        status: "success",
        email: "sarah.j@yahoo.com",
        firstName: "Sarah",
        lastName: "Jones",
        amount: 692.0
      },
      {
        id: "9",
        status: "failed",
        email: "robert55@gmail.com",
        firstName: "Robert",
        lastName: "Brown",
        amount: 512.0
      },
      {
        id: "10",
        status: "success",
        email: "emily.p@hotmail.com",
        firstName: "Emily",
        lastName: "Parker",
        amount: 375.0
      },
      {
        id: "11",
        status: "success",
        email: "david87@gmail.com",
        firstName: "David",
        lastName: "Miller",
        amount: 623.0
      },
      {
        id: "12",
        status: "processing",
        email: "jennifer@yahoo.com",
        firstName: "Jennifer",
        lastName: "Davis",
        amount: 459.0
      },
      {
        id: "13",
        status: "failed",
        email: "michael.s@hotmail.com",
        firstName: "Michael",
        lastName: "Smith",
        amount: 782.0
      },
      {
        id: "14",
        status: "success",
        email: "lisa.w@gmail.com",
        firstName: "Lisa",
        lastName: "Wilson",
        amount: 347.0
      },
      {
        id: "15",
        status: "success",
        email: "john.doe@outlook.com",
        firstName: "John",
        lastName: "Doe",
        amount: 594.0
      },
      {
        id: "16",
        status: "processing",
        email: "emma.j@gmail.com",
        firstName: "Emma",
        lastName: "Johnson",
        amount: 428.0
      }
    ],
    []
  );

  const [globalFilter, setGlobalFilter] = React.useState("");

  const columns = React.useMemo<ColumnDef<Payment>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Customer",
        cell: ({ row }) => (
          <div className="truncate font-medium">
            {row.original.firstName} {row.original.lastName}
          </div>
        )
      },
      {
        accessorKey: "email",
        header: "Email",
        size: 220,
        cell: ({ row }) => (
          <div className="text-muted-foreground truncate lowercase">{row.original.email}</div>
        )
      },
      {
        accessorKey: "amount",
        header: () => <div>Amount</div>,
        size: 110,
        cell: ({ row }) => {
          const amount = Number.parseFloat(row.original.amount.toString());
          return <div className="font-medium tabular-nums">${amount.toFixed(2)}</div>;
        }
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 130,
        cell: ({ row }) => {
          const status = row.original.status;

          const statusMap = {
            success: "success",
            processing: "info",
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
        size: 56,
        cell: ({ row }) => {
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
                  <DropdownMenuItem>View details</DropdownMenuItem>
                  <DropdownMenuItem>Download receipt</DropdownMenuItem>
                  <DropdownMenuItem>Contact customer</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        }
      }
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 8
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
        <CardTitle>Latest Payments</CardTitle>
        <CardDescription className="col-start-1">
          See recent payments from your customers here.
        </CardDescription>
        <CardAction className="@max-2xl/card-header:col-span-full @max-2xl/card-header:col-start-1 @max-2xl/card-header:row-start-3 @max-2xl/card-header:mt-1 @max-2xl/card-header:w-full @max-2xl/card-header:justify-self-stretch">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Filter payments..."
              className="max-w-sm min-w-0 flex-1"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
            <Button variant="outline" className="shrink-0" asChild>
              <Link href="/dashboard/payment/transactions">
                View All <ChevronRight />
              </Link>
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col p-0 [&_[data-slot=table-container]]:flex-1">
        <Table className="min-w-[640px] table-fixed [&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)">
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

        <div className="flex items-center justify-between gap-2 border-t px-(--card-spacing) py-3">
          <p className="text-muted-foreground text-sm tabular-nums">
            {firstRow} - {lastRow} of {totalRows} payments
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
