"use client";

import { useState, useMemo } from "react";
import { format, addDays, subDays, isToday } from "date-fns";
import {
  MoreVertical,
  Clock,
  Phone,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  CircleDotIcon,
  DoorOpenIcon,
  DownloadIcon,
  ListFilterIcon,
  Plus,
  MoreHorizontal,
  SearchIcon,
  Trash2Icon
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { matchesFilterQuery } from "@/lib/filter-query-match";
import { Dot, SortableHeader, StackedDots } from "@/components/table-filter-helpers";
import { Filters } from "@/components/ui/filters/filters";
import { createFilterQuery } from "@/components/ui/filters/filters-query";
import type { FilterField, FilterQuery } from "@/components/ui/filters/filters-types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { toast } from "sonner";
import { flexRender } from "@tanstack/react-table";
import { type LegacyColumnDef as ColumnDef, getCoreRowModel, getSortedRowModel, useLegacyTable as useReactTable } from "@tanstack/react-table/legacy";
import type { SortingState } from "@tanstack/table-core";

import { BookingFormDrawer } from "./booking-form-drawer";
import { items, BookingStatus, Booking } from "../data";

const timeSlots = [
  "07:00 AM",
  "08:00 AM",
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 AM",
  "13:00 AM"
];

const rooms = ["Room 1", "Room 2", "Room 3", "Room 4", "Room 5", "Room 6", "Room 7"];

const statusConfig: Record<
  BookingStatus,
  { label: string; variant: "success" | "info" | "warning" | "destructive"; dot: string }
> = {
  finished: { label: "Finished", variant: "info", dot: "bg-blue-500" },
  cancelled: { label: "Cancelled", variant: "destructive", dot: "bg-rose-500" },
  pending: { label: "Pending", variant: "warning", dot: "bg-amber-500" },
  approved: { label: "Approved", variant: "success", dot: "bg-emerald-500" }
};

/* -------------------------------------------------------------------------- */
/*                                Filter schema                               */
/* -------------------------------------------------------------------------- */

const STATUS_DOTS = new Map(
  Object.entries(statusConfig).map(([value, config]) => [value, config.dot])
);

const filterFields: FilterField[] = [
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
    id: "room",
    label: "Room",
    type: "select",
    defaultOperator: "is_any_of",
    options: rooms.map((room, index) => ({
      value: String(index + 1),
      label: room
    })),
    searchable: false,
    icon: <DoorOpenIcon />
  }
];

function readField(row: Booking, path: string): unknown {
  return row[path as keyof Booking];
}

function matchesSearch(row: Booking, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return [row.id, row.name, row.phone].some((value) =>
    String(value).toLowerCase().includes(q)
  );
}

const EMPTY_QUERY: FilterQuery = createFilterQuery();

const getCardStyle = (status: BookingStatus) => {
  switch (status) {
    case "finished":
      return "bg-yellow-50 dark:bg-yellow-950 border-l-4 border-l-yellow-400 dark:border-l-yellow-700";
    case "cancelled":
      return "bg-orange-50 dark:bg-orange-950 border-l-4 border-l-orange-400 dark:border-l-orange-700";
    case "pending":
      return "bg-yellow-50 dark:bg-yellow-950 border-l-4 border-l-yellow-400 dark:border-l-yellow-700";
    case "approved":
      return "bg-blue-50 dark:bg-blue-950 border-l-4 border-l-blue-400 dark:border-l-blue-700";
    default:
      return " border-l-4 border-l-gray-200";
  }
};

export function MeetingRoomSchedule() {
  const [bookings, setBookings] = useState<Booking[]>(items);
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
  const [bookingFormOpen, setBookingFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState<FilterQuery>(EMPTY_QUERY);
  const [rowSelection, setRowSelection] = useState({});

  const goToPreviousDay = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => setSelectedDate(new Date());

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => booking.date === selectedDateStr);
  }, [bookings, selectedDateStr]);

  const listRows = useMemo(
    () =>
      filteredBookings.filter(
        (row) => matchesSearch(row, search) && matchesFilterQuery(row, query, readField)
      ),
    [filteredBookings, search, query]
  );

  const columns: ColumnDef<Booking>[] = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
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
        size: 110,
        header: ({ column }) => <SortableHeader column={column}>ID</SortableHeader>,
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">{row.getValue("id")}</span>
        )
      },
      {
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
        cell: ({ row }) => <div className="truncate font-medium">{row.getValue("name")}</div>
      },
      {
        accessorKey: "room",
        size: 100,
        header: "Room",
        cell: ({ row }) => `Room ${row.getValue("room")}`
      },
      {
        id: "time",
        size: 190,
        header: "Time",
        cell: ({ row }) => (
          <div className="text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
            <Clock className="size-3.5" />
            {row.original.startTime} - {row.original.endTime}
          </div>
        )
      },
      {
        accessorKey: "phone",
        size: 170,
        header: "Phone",
        cell: ({ row }) => (
          <div className="text-muted-foreground flex items-center gap-1.5 whitespace-nowrap tabular-nums">
            <Phone className="size-3.5" />
            {row.getValue("phone")}
          </div>
        )
      },
      {
        accessorKey: "status",
        size: 120,
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("status") as BookingStatus;
          return <Badge variant={statusConfig[status].variant}>{statusConfig[status].label}</Badge>;
        }
      },
      {
        id: "actions",
        size: 56,
        cell: ({ row }) => (
          <div className="text-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <span className="sr-only">Open menu</span>
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setBookingToDelete(row.original)}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      }
    ],
    []
  );

  const table = useReactTable({
    data: listRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection
    }
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  const getBookingsForSlot = (timeSlot: string, roomIndex: number) => {
    return filteredBookings.filter(
      (booking) => booking.timeSlot === timeSlot && booking.room === roomIndex + 1
    );
  };

  const handleDeleteBooking = () => {
    if (bookingToDelete) {
      toast.success("Booking deleted successfully");
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-end justify-between lg:items-center">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <h1 className="me-6 text-xl font-bold tracking-tight lg:text-2xl">Bookings</h1>
            <div className="flex gap-2">
              <div className="flex items-center rounded-lg border">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-e-none border-e"
                  onClick={goToPreviousDay}>
                  <ChevronLeft />
                </Button>
                <div className="px-3 text-center text-sm lg:min-w-[140px]">
                  {format(selectedDate, "EEE, MMM d")}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-s-none border-s"
                  onClick={goToNextDay}>
                  <ChevronRight />
                </Button>
              </div>
              {!isToday(selectedDate) && (
                <Button variant="outline" className="hidden md:flex" onClick={goToToday}>
                  Today
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ButtonGroup>
              <Button
                variant="outline"
                size="icon"
                aria-label="Grid view"
                aria-pressed={viewMode === "grid"}
                className={cn(viewMode === "grid" && "bg-muted")}
                onClick={() => setViewMode("grid")}>
                <LayoutGrid />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="List view"
                aria-pressed={viewMode === "list"}
                className={cn(viewMode === "list" && "bg-muted")}
                onClick={() => setViewMode("list")}>
                <List />
              </Button>
            </ButtonGroup>
            <BookingFormDrawer open={bookingFormOpen} onOpenChange={setBookingFormOpen} />
          </div>
        </div>

        {/* Grid View */}
        {viewMode === "grid" && (
          <div className="overflow-hidden rounded-lg border">
            <div className="flex">
              {/* Fixed Time Column */}
              <div className="z-10 w-[100px] flex-shrink-0 border-r">
                <div className="text-muted-foreground flex h-[57px] items-center border-b p-4 text-sm">
                  Time
                </div>
                {timeSlots.map((timeSlot, timeIndex) => (
                  <div
                    key={timeIndex}
                    className="text-muted-foreground flex h-[120px] items-start justify-center border-b p-4 text-sm last:border-b-0">
                    {timeSlot}
                  </div>
                ))}
              </div>

              {/* Scrollable Rooms Area */}
              <div className="flex-1 overflow-x-auto">
                <div className="inline-flex min-w-full">
                  {rooms.map((room, roomIndex) => (
                    <div
                      key={roomIndex}
                      className="w-[200px] flex-shrink-0 border-r last:border-r-0">
                      {/* Room Header */}
                      <div className="text-muted-foreground flex h-[57px] items-center justify-center border-b p-4 text-center text-sm">
                        {room}
                      </div>
                      {/* Time Slots for this Room */}
                      {timeSlots.map((timeSlot, timeIndex) => {
                        const slotBookings = getBookingsForSlot(timeSlot, roomIndex);
                        const isEmpty = slotBookings.length === 0;

                        return (
                          <div
                            key={timeIndex}
                            className={`group relative h-[120px] border-b p-2 last:border-b-0 ${isEmpty ? "hover:bg-muted/50" : ""}`}>
                            {isEmpty && (
                              <div className="flex h-full items-center justify-center opacity-0 group-hover:opacity-100">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setBookingFormOpen(true)}>
                                  <Plus />
                                  Add
                                </Button>
                              </div>
                            )}
                            {slotBookings.map((booking, idx) => (
                              <div
                                key={`${booking.id}-${booking.room}-${booking.timeSlot}-${idx}`}
                                className={`rounded-lg p-3 shadow-xs ${getCardStyle(booking.status)}`}>
                                <div className="px-1">
                                  <div className="mb-1 flex items-start justify-between">
                                    <span className="text-foreground text-xs font-medium">
                                      {booking.id}
                                    </span>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon-sm"
                                          className="absolute end-3 top-3">
                                          <MoreHorizontal />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem>Edit</DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => setBookingToDelete(booking)}
                                          className="text-destructive focus:text-destructive">
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                  <div className="mb-1 text-xs">
                                    <strong>{booking.name}</strong>
                                  </div>
                                  <div className="text-muted-foreground flex items-center gap-1 text-xs">
                                    <Clock className="h-2.5 w-2.5" />
                                    <span>
                                      {booking.startTime} - {booking.endTime}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* List View with TanStack Table */}
        {viewMode === "list" && (
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
                        placeholder="Search name, ID, phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      <InputGroupAddon>
                        <SearchIcon />
                      </InputGroupAddon>
                    </InputGroup>
                    <Filters
                      fields={filterFields}
                      query={query}
                      onQueryChange={setQuery}
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
              <Table className="min-w-[900px] table-fixed [&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)">
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
                        No bookings found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!bookingToDelete}
        onOpenChange={(open) => !open && setBookingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the booking for{" "}
              <strong>{bookingToDelete?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBooking}
              className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
