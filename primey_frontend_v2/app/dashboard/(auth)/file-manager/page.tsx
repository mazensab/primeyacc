import { generateMeta } from "@/lib/utils";

import { FileUploadDialog } from "./components/file-upload-dialog";
import { TableRecentFiles } from "./components/table-recent-files";
import { SummaryCards } from "./components/summary-cards";
import { StorageOverviewCard } from "./components/storage-overview-card";
import { ChartFileTransfer } from "./components/chart-file-transfer";
import { UserUploadActivity } from "./components/user-upload-activity";

export async function generateMetadata() {
  return generateMeta({
    title: "File Manager Admin Dashboard Template",
    description:
      "Manage files, folders, and storage status with interactive charts. A professional admin page built with React, Next.js, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/file-manager"
  });
}

export default function Page() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-row items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">File Manager</h1>
        <FileUploadDialog />
      </div>
      <SummaryCards />
      <StorageOverviewCard />
      <div className="lg:gap-6 gap-4 space-y-4 lg:grid lg:grid-cols-2 lg:space-y-0">
        <ChartFileTransfer />
        <UserUploadActivity />
      </div>
      <TableRecentFiles />
    </div>
  );
}
