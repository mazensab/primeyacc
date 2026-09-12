"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MoreHorizontal,
  File,
  FileText,
  Film,
  Music,
  Archive,
  Trash2,
  Download,
  Share2,
  ChevronRight,
  ImageIcon
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getFileIcon(type: string) {
  switch (type) {
    case "image":
      return <ImageIcon className="size-4" />;
    case "video":
      return <Film className="size-4" />;
    case "audio":
      return <Music className="size-4" />;
    case "archive":
      return <Archive className="size-4" />;
    case "document":
      return <FileText className="size-4" />;
    default:
      return <File className="size-4" />;
  }
}

const files = [
  {
    id: 1,
    name: "project-proposal.docx",
    type: "document",
    size: 2500000,
    uploadDate: new Date(2026, 7, 19)
  },
  {
    id: 2,
    name: "company-logo.png",
    type: "image",
    size: 1200000,
    uploadDate: new Date(2026, 7, 18)
  },
  {
    id: 3,
    name: "presentation.pptx",
    type: "document",
    size: 5600000,
    uploadDate: new Date(2026, 7, 16)
  },
  { id: 4, name: "budget.xlsx", type: "document", size: 980000, uploadDate: new Date(2026, 7, 14) },
  {
    id: 5,
    name: "product-video.mp4",
    type: "video",
    size: 158000000,
    uploadDate: new Date(2026, 7, 11)
  }
];

export function TableRecentFiles() {
  const [fileList, setFileList] = useState(files);

  const deleteFile = (id: number) => {
    setFileList(fileList.filter((file) => file.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recently Uploaded Files</CardTitle>
        <CardAction>
          <div>
            <Button variant="outline" size="sm">
              <span className="hidden lg:inline">View All</span>
              <ChevronRight />
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col p-0 [&_[data-slot=table-container]]:flex-1">
        <Table className="min-w-[560px] [&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-32">Size</TableHead>
              <TableHead className="w-40">Upload Date</TableHead>
              <TableHead className="w-14">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fileList.length ? (
              fileList.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>
                    <Link
                      href="#"
                      className="hover:text-primary flex items-center gap-2 font-medium hover:underline">
                      <span className="text-muted-foreground">{getFileIcon(file.type)}</span>
                      <span className="truncate">{file.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap tabular-nums">
                    {formatFileSize(file.size)}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {format(file.uploadDate, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Download />
                          <span>Download</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Share2 />
                          <span>Share</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => deleteFile(file.id)}>
                          <Trash2 />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                  No files uploaded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
