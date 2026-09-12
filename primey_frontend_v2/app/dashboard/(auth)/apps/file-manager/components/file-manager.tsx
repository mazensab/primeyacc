"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { flexRender } from "@tanstack/react-table";
import { type LegacyRow, type LegacyColumnDef as ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useLegacyTable as useReactTable } from "@tanstack/react-table/legacy";
import type { SortingState } from "@tanstack/table-core";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  File,
  FileTextIcon,
  Folder,
  FolderPlus,
  Home,
  MoreHorizontalIcon,
  SearchIcon,
  UploadIcon,
  XIcon
} from "lucide-react";

import { SortableHeader } from "@/components/table-filter-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { FileUploadDialog } from "./file-upload-dialog";
import allFileItemsData from "../data.json";

interface FileItem {
  id: string;
  name: string;
  type: string;
  icon: string;
  date: string;
  size: string;
  owner: { name: string; avatar: string };
  parentPath?: string;
  children?: FileItem[];
}

const allFileItems = allFileItemsData as FileItem[];

function getFileIcon(iconType: string) {
  switch (iconType) {
    case "folder":
      return <Folder className="h-5 w-5 text-yellow-600" />;
    case "figma":
      return (
        <div className="flex h-5 w-5 items-center justify-center rounded bg-purple-500 text-xs font-bold text-white">
          F
        </div>
      );
    case "sketch":
      return (
        <div className="flex h-5 w-5 items-center justify-center rounded bg-yellow-500 text-xs font-bold text-white">
          S
        </div>
      );
    case "word":
      return (
        <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-xs font-bold text-white">
          W
        </div>
      );
    case "illustrator":
      return (
        <div className="flex h-5 w-5 items-center justify-center rounded bg-orange-600 text-xs font-bold text-white">
          Ai
        </div>
      );
    case "photoshop":
      return (
        <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-800 text-xs font-bold text-white">
          Ps
        </div>
      );
    case "pdf":
      return (
        <div className="flex h-5 w-5 items-center justify-center rounded bg-red-600 text-xs font-bold text-white">
          <FileTextIcon className="size-3" />
        </div>
      );
    case "audio":
      return (
        <div className="flex h-5 w-5 items-center justify-center rounded bg-green-600 text-xs font-bold text-white">
          ♪
        </div>
      );
    default:
      return <File className="h-5 w-5 text-gray-500" />;
  }
}

const parseFileSize = (sizeStr: string): number => {
  const size = Number.parseFloat(sizeStr);
  if (sizeStr.includes("GB")) return size * 1024 * 1024 * 1024;
  if (sizeStr.includes("MB")) return size * 1024 * 1024;
  if (sizeStr.includes("KB")) return size * 1024;
  return size;
};

const parseDate = (dateStr: string): number => {
  const [day, month, year] = dateStr.split(".");
  return new Date(
    2000 + Number.parseInt(year),
    Number.parseInt(month) - 1,
    Number.parseInt(day)
  ).getTime();
};

const columns: ColumnDef<FileItem>[] = [
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
        onClick={(e) => e.stopPropagation()}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false
  },
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-3">
        <div className="shrink-0">{getFileIcon(row.original.icon)}</div>
        <span className="min-w-0 truncate font-medium">{row.original.name}</span>
      </div>
    )
  },
  {
    accessorKey: "date",
    header: ({ column }) => <SortableHeader column={column}>Date</SortableHeader>,
    sortFn: (rowA: LegacyRow<FileItem>, rowB: LegacyRow<FileItem>) => parseDate(rowA.original.date) - parseDate(rowB.original.date),
    cell: ({ row }) => (
      <span className="text-muted-foreground whitespace-nowrap">
        {format(new Date(parseDate(row.original.date)), "d MMM yyyy")}
      </span>
    )
  },
  {
    accessorKey: "size",
    header: ({ column }) => <SortableHeader column={column}>Size</SortableHeader>,
    sortFn: (rowA: LegacyRow<FileItem>, rowB: LegacyRow<FileItem>) => parseFileSize(rowA.original.size) - parseFileSize(rowB.original.size),
    cell: ({ row }) => (
      <span className="text-muted-foreground whitespace-nowrap tabular-nums">
        {row.original.size}
      </span>
    )
  },
  {
    id: "owner",
    header: "Owner",
    enableSorting: false,
    cell: ({ row }) => (
      <Avatar className="h-6 w-6">
        <AvatarImage src={row.original.owner.avatar || "/placeholder.svg"} />
        <AvatarFallback className="text-xs">{row.original.owner.name.charAt(0)}</AvatarFallback>
      </Avatar>
    )
  },
  {
    id: "actions",
    enableHiding: false,
    cell: () => (
      <div className="text-end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <span className="sr-only">Open menu</span>
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Compress</DropdownMenuItem>
            <DropdownMenuItem>Archive</DropdownMenuItem>
            <DropdownMenuItem>Share</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Move</DropdownMenuItem>
            <DropdownMenuItem>Copy</DropdownMenuItem>
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }
];

export function FileManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
  const [rowSelection, setRowSelection] = useState({});

  const currentPath = searchParams.get("path") || "";
  const pathSegments = currentPath ? currentPath.split("/").filter(Boolean) : [];

  const isMobile = useIsMobile();

  const rows = useMemo(() => {
    const currentItems = !currentPath
      ? allFileItems.filter((item) => !item.parentPath)
      : (allFileItems.find((item) => item.name === pathSegments[pathSegments.length - 1])
          ?.children ?? []);

    return currentItems.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath, searchQuery]);

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 25 } },
    state: {
      sorting,
      rowSelection
    }
  });

  useEffect(() => {
    setSelectedItem(null);
    setShowMobileDetails(false);
    setRowSelection({});
  }, [currentPath]);

  const handleItemClick = (item: FileItem) => {
    if (item.type === "folder") {
      const newPath = currentPath ? `${currentPath}/${item.name}` : item.name;
      router.push(`?path=${encodeURIComponent(newPath)}`);
    } else {
      setSelectedItem(item);
      setShowMobileDetails(true);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      router.push("/dashboard/apps/file-manager");
    } else {
      const newPath = pathSegments.slice(0, index + 1).join("/");
      router.push(`?path=${encodeURIComponent(newPath)}`);
    }
  };

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const firstRow = rows.length === 0 ? 0 : pageIndex * pageSize + 1;
  const lastRow = Math.min((pageIndex + 1) * pageSize, rows.length);

  const FileDetailContent = ({ selectedItem }: { selectedItem: FileItem }) => {
    return (
      <div className="space-y-6 px-4">
        <div className="flex flex-col items-center space-y-8 py-4">
          <div className="flex items-center">
            <div className="scale-[3]">{getFileIcon(selectedItem.icon)}</div>
          </div>
          <h2 className="text-foreground text-center">{selectedItem.name}</h2>
        </div>

        <div>
          <h3 className="text-foreground mb-4 text-xs font-semibold tracking-wider uppercase">
            Info
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">Type</span>
              <span className="text-foreground text-sm capitalize">{selectedItem.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">Size</span>
              <span className="text-foreground text-sm">{selectedItem.size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">Owner</span>
              <span className="text-foreground text-sm">ArtTemplate</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">Location</span>
              <span className="text-sm">
                {currentPath ? `My Files/${currentPath}` : "My Files"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">Modified</span>
              <span className="text-foreground text-sm">Sep 17, 2020 4:25</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">Created</span>
              <span className="text-foreground text-sm">Sep 10, 2020 2:25</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-foreground mb-4 text-xs font-semibold tracking-wider uppercase">
            Settings
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-foreground text-sm">File Sharing</span>
              <Switch checked={true} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground text-sm">Backup</span>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground text-sm">Sync</span>
              <Switch />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex">
      <div className="border-border min-w-0 flex-1 space-y-4">
        {/* Breadcrumb Navigation */}
        <div className="flex justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight">File Manager</h1>
            {pathSegments.length > 0 && (
              <>
                <Separator
                  orientation="vertical"
                  className="mx-2 data-[orientation=vertical]:h-4"
                />
                <div className="border-border/50 bg-muted/20 flex items-center overflow-x-auto">
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem
                        className="cursor-pointer"
                        onClick={() => handleBreadcrumbClick(-1)}>
                        <Home className="h-4 w-4" />
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      {pathSegments.map((segment, i) => (
                        <Fragment key={i}>
                          <BreadcrumbItem
                            className="cursor-pointer"
                            onClick={() => handleBreadcrumbClick(i)}>
                            {segment}
                          </BreadcrumbItem>
                          {i < pathSegments.length - 1 && <BreadcrumbSeparator />}
                        </Fragment>
                      ))}
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </>
            )}
          </div>

          <div className="border-border flex items-center justify-between gap-2">
            <FileUploadDialog />
          </div>
        </div>

        <Card>
          <CardContent className="flex p-0">
            {/* File List */}
            <div className="min-w-0 grow">
              <div className="flex min-h-14 items-center gap-2 border-b px-(--card-spacing) py-3">
                {selectedCount > 0 ? (
                  <>
                    <span className="px-1 text-sm font-medium">{selectedCount} selected</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          Actions
                          <ChevronDownIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem>Compress</DropdownMenuItem>
                        <DropdownMenuItem>Archive</DropdownMenuItem>
                        <DropdownMenuItem>Share</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Move</DropdownMenuItem>
                        <DropdownMenuItem>Copy</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive">Send to Trash</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ms-auto"
                      onClick={() => table.resetRowSelection()}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <div className="relative w-full">
                    <SearchIcon className="text-muted-foreground absolute start-2.5 top-1/2 size-4 -translate-y-1/2" />
                    <Input
                      placeholder="Search for files and folders..."
                      className="w-full border-0 bg-transparent ps-8 shadow-none focus-visible:ring-0 dark:bg-transparent"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        table.setPageIndex(0);
                      }}
                    />
                  </div>
                )}
              </div>

              <Table className="[&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
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
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                        className={cn(
                          "cursor-pointer",
                          selectedItem?.id === row.original.id && "bg-muted/50"
                        )}
                        onClick={() => handleItemClick(row.original)}>
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
                        {searchQuery ? (
                          <span className="text-muted-foreground">
                            No files or folders found matching &#34;{searchQuery}&#34;
                          </span>
                        ) : (
                          <div className="mx-auto max-w-md space-y-4 py-12 text-center">
                            <FolderPlus className="mx-auto size-14 opacity-50" />
                            <h2 className="text-muted-foreground">This folder is empty.</h2>
                            <div>
                              <Button>
                                <UploadIcon />
                                Upload
                              </Button>
                            </div>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="flex flex-col items-center justify-between gap-3 border-t px-(--card-spacing) py-3 sm:flex-row">
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  Rows per page
                  <Select
                    value={String(pageSize)}
                    onValueChange={(value) => table.setPageSize(Number(value))}>
                    <SelectTrigger size="sm" className="w-fit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50].map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm tabular-nums">
                    {firstRow} - {lastRow} of {rows.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}>
                      <span className="sr-only">Previous page</span>
                      <ChevronLeftIcon />
                    </Button>
                    {Array.from({ length: table.getPageCount() }, (_, index) => (
                      <Button
                        key={index}
                        variant={index === pageIndex ? "outline" : "ghost"}
                        size="icon-sm"
                        className="tabular-nums"
                        onClick={() => table.setPageIndex(index)}>
                        {index + 1}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}>
                      <span className="sr-only">Next page</span>
                      <ChevronRightIcon />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Right Panel - Details */}
            {selectedItem && !isMobile ? (
              <div className="relative w-80 shrink-0 border-s py-6">
                <Button
                  onClick={() => setSelectedItem(null)}
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2">
                  <XIcon />
                </Button>
                <FileDetailContent selectedItem={selectedItem} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {selectedItem && isMobile && (
        <Sheet open={showMobileDetails} onOpenChange={setShowMobileDetails}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>File Details</SheetTitle>
            </SheetHeader>
            <FileDetailContent selectedItem={selectedItem} />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
