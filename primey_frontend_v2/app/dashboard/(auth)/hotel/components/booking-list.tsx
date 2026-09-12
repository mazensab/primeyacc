"use client";

import { useMemo, useState } from "react";
import { flexRender } from "@tanstack/react-table";
import { type LegacyColumnDef as ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useLegacyTable as useReactTable } from "@tanstack/react-table/legacy";
import type { SortingState } from "@tanstack/table-core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  BedDoubleIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleDotIcon,
  DownloadIcon,
  ListFilterIcon,
  SearchIcon,
  Trash2Icon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { matchesFilterQuery } from "@/lib/filter-query-match";
import { Dot, SortableHeader, StackedDots } from "@/components/table-filter-helpers";
import { Filters } from "@/components/ui/filters/filters";
import { createFilterQuery } from "@/components/ui/filters/filters-query";
import type { FilterField, FilterQuery } from "@/components/ui/filters/filters-types";

type RoomType = "Deluxe" | "Standard" | "Suite";
type BookingStatus = "Checked-In" | "Pending";

interface Booking {
  bookingId: string;
  guestName: string;
  roomType: RoomType;
  roomNumber: string;
  duration: string;
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
}

const bookings: Booking[] = [
  {
    bookingId: "LG-B00108",
    guestName: "Angus Copper",
    roomType: "Deluxe",
    roomNumber: "Room 101",
    duration: "3 nights",
    checkIn: "June 19, 2028",
    checkOut: "June 22, 2028",
    status: "Checked-In"
  },
  {
    bookingId: "LG-B00109",
    guestName: "Catherine Lopp",
    roomType: "Standard",
    roomNumber: "Room 202",
    duration: "2 nights",
    checkIn: "June 19, 2028",
    checkOut: "June 21, 2028",
    status: "Checked-In"
  },
  {
    bookingId: "LG-B00110",
    guestName: "Edgar Irving",
    roomType: "Suite",
    roomNumber: "Room 303",
    duration: "5 nights",
    checkIn: "June 19, 2028",
    checkOut: "June 24, 2028",
    status: "Pending"
  },
  {
    bookingId: "LG-B00111",
    guestName: "Ice B. Holand",
    roomType: "Standard",
    roomNumber: "Room 105",
    duration: "4 nights",
    checkIn: "June 19, 2028",
    checkOut: "June 23, 2028",
    status: "Checked-In"
  },
  {
    bookingId: "LG-B00112",
    guestName: "John Smith",
    roomType: "Deluxe",
    roomNumber: "Room 201",
    duration: "2 nights",
    checkIn: "June 20, 2028",
    checkOut: "June 22, 2028",
    status: "Pending"
  },
  {
    bookingId: "LG-B00113",
    guestName: "Mary Johnson",
    roomType: "Suite",
    roomNumber: "Room 401",
    duration: "7 nights",
    checkIn: "June 21, 2028",
    checkOut: "June 28, 2028",
    status: "Checked-In"
  }
];

const roomTypeDots: Record<RoomType, string> = {
  Deluxe: "bg-violet-500",
  Standard: "bg-emerald-500",
  Suite: "bg-sky-500"
};

/* -------------------------------------------------------------------------- */
/*                                Filter schema                               */
/* -------------------------------------------------------------------------- */

const STATUSES: { value: BookingStatus; dot: string }[] = [
  { value: "Checked-In", dot: "bg-emerald-500" },
  { value: "Pending", dot: "bg-amber-500" }
];

const STATUS_DOTS = new Map(STATUSES.map((status) => [status.value as string, status.dot]));
const ROOM_TYPE_DOTS = new Map(Object.entries(roomTypeDots));

const fields: FilterField[] = [
  {
    id: "roomType",
    label: "Room Type",
    type: "select",
    defaultOperator: "is_any_of",
    options: (Object.keys(roomTypeDots) as RoomType[]).map((roomType) => ({
      value: roomType,
      label: roomType,
      icon: <Dot className={roomTypeDots[roomType]} />
    })),
    searchable: false,
    renderValue: ({ options }) => (
      <StackedDots options={options} dots={ROOM_TYPE_DOTS} empty="any type" />
    ),
    icon: <BedDoubleIcon />
  },
  {
    id: "status",
    label: "Status",
    type: "select",
    defaultOperator: "is_any_of",
    options: STATUSES.map((status) => ({
      value: status.value,
      label: status.value,
      icon: <Dot className={status.dot} />
    })),
    searchable: false,
    renderValue: ({ options }) => (
      <StackedDots options={options} dots={STATUS_DOTS} empty="any status" />
    ),
    icon: <CircleDotIcon />
  }
];

function readField(row: Booking, path: string): unknown {
  return row[path as keyof Booking];
}

function matchesSearch(row: Booking, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return [row.guestName, row.bookingId, row.roomNumber].some((value) =>
    value.toLowerCase().includes(q)
  );
}

const EMPTY_QUERY: FilterQuery = createFilterQuery();

const columns: ColumnDef<Booking>[] = [
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
    accessorKey: "bookingId",
    size: 130,
    header: ({ column }) => <SortableHeader column={column}>Booking ID</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-muted-foreground whitespace-nowrap tabular-nums">
        {row.getValue("bookingId")}
      </span>
    )
  },
  {
    accessorKey: "guestName",
    header: ({ column }) => <SortableHeader column={column}>Guest Name</SortableHeader>,
    cell: ({ row }) => <div className="truncate font-medium">{row.getValue("guestName")}</div>
  },
  {
    accessorKey: "roomType",
    size: 130,
    header: ({ column }) => <SortableHeader column={column}>Room Type</SortableHeader>,
    cell: ({ row }) => {
      const roomType = row.getValue("roomType") as RoomType;
      return (
        <Badge variant="outline">
          <span className={cn("size-1.5 rounded-full", roomTypeDots[roomType])} />
          {roomType}
        </Badge>
      );
    }
  },
  {
    accessorKey: "roomNumber",
    size: 130,
    header: ({ column }) => <SortableHeader column={column}>Room Number</SortableHeader>,
    cell: ({ row }) => <span>{row.getValue("roomNumber")}</span>
  },
  {
    accessorKey: "duration",
    size: 110,
    header: ({ column }) => <SortableHeader column={column}>Duration</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-muted-foreground whitespace-nowrap">{row.getValue("duration")}</span>
    )
  },
  {
    id: "checkInOut",
    accessorFn: (row) => row.checkIn,
    size: 240,
    header: ({ column }) => <SortableHeader column={column}>Check-In & Check-Out</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-muted-foreground whitespace-nowrap">
        {row.original.checkIn} - {row.original.checkOut}
      </span>
    )
  },
  {
    accessorKey: "status",
    size: 130,
    header: ({ column }) => (
      <div className="flex justify-end">
        <SortableHeader column={column}>Status</SortableHeader>
      </div>
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as BookingStatus;
      return (
        <div className="flex justify-end">
          <Badge variant={status === "Checked-In" ? "success" : "warning"}>{status}</Badge>
        </div>
      );
    }
  }
];

export function BookingList() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState<FilterQuery>(EMPTY_QUERY);
  const [rowSelection, setRowSelection] = useState({});

  const rows = useMemo(
    () =>
      bookings.filter(
        (row) => matchesSearch(row, search) && matchesFilterQuery(row, query, readField)
      ),
    [search, query]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      rowSelection
    },
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 10
      }
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking List</CardTitle>
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
                  placeholder="Search guest, ID, room..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
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
            </>
          )}
        </div>
        <Table className="min-w-[1050px] table-fixed [&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)">
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
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t px-(--card-spacing) py-3">
          <p className="text-muted-foreground text-sm tabular-nums">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}>
              <span className="sr-only">First page</span>
              <ChevronsLeft />
            </Button>
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
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}>
              <span className="sr-only">Last page</span>
              <ChevronsRight />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
