"use client";

import * as React from "react";
import { flexRender } from "@tanstack/react-table";
import { type LegacyColumnDef as ColumnDef, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useLegacyTable as useReactTable } from "@tanstack/react-table/legacy";
import type { ColumnFiltersState, SortingState, ColumnVisibilityState as VisibilityState } from "@tanstack/table-core";
import { ArrowUpDown, ChevronLeft, ChevronRight, FolderUp, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
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
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type Product = {
  id: number;
  image: string;
  name: string;
  price: number;
  sold: number;
  sales: number;
};

const data: Product[] = [
  {
    id: 1,
    image: `/images/products/01.jpeg`,
    name: "Sports Shoes",
    price: 316,
    sold: 316,
    sales: 10
  },
  {
    id: 2,
    image: `/images/products/02.jpeg`,
    name: "Black T-Shirt",
    price: 274,
    sold: 274,
    sales: 20
  },
  {
    id: 3,
    image: `/images/products/03.jpeg`,
    name: "Jeans",
    price: 195,
    sold: 195,
    sales: 15
  },
  {
    id: 4,
    image: `/images/products/04.jpeg`,
    name: "Red Sneakers",
    price: 402,
    sold: 402,
    sales: 40
  },
  {
    id: 5,
    image: `/images/products/05.jpeg`,
    name: "Red Scarf",
    price: 280,
    sold: 280,
    sales: 37
  },
  {
    id: 6,
    image: `/images/products/06.jpeg`,
    name: "Kitchen Accessory",
    price: 150,
    sold: 150,
    sales: 18
  },
  {
    id: 7,
    image: `/images/products/07.jpeg`,
    name: "Bicycle",
    price: 316,
    sold: 316,
    sales: 25
  },
  {
    id: 8,
    image: `/images/products/01.jpeg`,
    name: "Sports Shoes",
    price: 290,
    sold: 290,
    sales: 12
  }
];

export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: "name",
    header: "Product",
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-3">
        <img className="size-8 shrink-0 rounded-md" src={row.original.image} alt={row.original.name} />
        <div className="truncate font-medium capitalize">{row.getValue("name")}</div>
      </div>
    )
  },
  {
    accessorKey: "sold",
    size: 90,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0! hover:bg-transparent!">
          Sold
          <ArrowUpDown className="size-3" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("sold"));

      // Format the amount as a dollar amount
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
      }).format(amount);

      return <div className="font-medium tabular-nums">{formatted}</div>;
    }
  },
  {
    accessorKey: "sales",
    size: 70,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0! hover:bg-transparent!">
          Sales
          <ArrowUpDown className="size-3" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="text-muted-foreground tabular-nums">{row.getValue("sales")}</div>
    )
  },
  {
    id: "actions",
    enableHiding: false,
    size: 48,
    cell: ({ row }) => {
      const product = row.original;

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
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(String(product.id))}>
                Copy product ID
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

export function EcommerceBestSellingProductsCard() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

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
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection
    },
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 8
      }
    }
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const rowCount = table.getFilteredRowModel().rows.length;
  const firstRow = rowCount === 0 ? 0 : pageIndex * pageSize + 1;
  const lastRow = Math.min((pageIndex + 1) * pageSize, rowCount);

  return (
    <Card className="lg:col-span-5">
      <CardHeader>
        <CardTitle>Best Selling Products</CardTitle>
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
            placeholder="Filter products..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
            className="max-w-xs"
          />
        </div>
        <Table className="table-fixed [&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)">
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
          <div className="text-muted-foreground text-sm tabular-nums">
            {firstRow} - {lastRow} of {rowCount} products
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
