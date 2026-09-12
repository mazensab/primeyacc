import {
  DownloadIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  ImageIcon,
  UploadIcon,
  VideoIcon
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const files = [
  {
    name: "Content calendar Q1.xlsx",
    meta: "1.2 MB · Uploaded by Andika · Feb 2, 2026",
    icon: FileSpreadsheetIcon,
    iconClass: "text-green-600 bg-green-500/10"
  },
  {
    name: "HR Onboarding article draft.docx",
    meta: "348 KB · Uploaded by Priya Patel · Feb 1, 2026",
    icon: FileTextIcon,
    iconClass: "text-blue-600 bg-blue-500/10"
  },
  {
    name: "Keyword research master sheet.xlsx",
    meta: "2.8 MB · Uploaded by Marcus Rivera · Jan 28, 2026",
    icon: FileSpreadsheetIcon,
    iconClass: "text-green-600 bg-green-500/10"
  },
  {
    name: "Blog header illustrations.zip",
    meta: "24.6 MB · Uploaded by Priya Patel · Jan 24, 2026",
    icon: ImageIcon,
    iconClass: "text-purple-600 bg-purple-500/10"
  },
  {
    name: "Kickoff meeting recording.mp4",
    meta: "182 MB · Uploaded by Andika · Jan 9, 2026",
    icon: VideoIcon,
    iconClass: "text-red-600 bg-red-500/10"
  },
  {
    name: "Project brief v2.pdf",
    meta: "864 KB · Uploaded by Sarah Chen · Jan 8, 2026",
    icon: FileTextIcon,
    iconClass: "text-orange-600 bg-orange-500/10"
  }
];

export function FilesTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline gap-2">
          Files
          <span className="text-muted-foreground text-xs font-normal">18 files · 246 MB</span>
        </CardTitle>
        <CardAction>
          <Button size="sm">
            <UploadIcon /> Upload
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {files.map((file) => (
            <div key={file.name} className="flex items-center gap-3 px-(--card-spacing) py-3">
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${file.iconClass}`}>
                <file.icon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{file.name}</div>
                <div className="text-muted-foreground truncate text-xs">{file.meta}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="ms-auto shrink-0"
                aria-label={`Download ${file.name}`}>
                <DownloadIcon />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
