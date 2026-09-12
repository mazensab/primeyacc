"use client";

import {
  CalendarClock,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Mail,
  Table
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export function DownloadReportButton() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Download />
          <span className="hidden sm:inline">Download Report</span>
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Download report</DropdownMenuLabel>
        <DropdownMenuItem>
          <FileText /> PDF report
        </DropdownMenuItem>
        <DropdownMenuItem>
          <FileSpreadsheet /> Excel workbook
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Table /> CSV export
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Mail /> Email report
        </DropdownMenuItem>
        <DropdownMenuItem>
          <CalendarClock /> Schedule weekly report
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
