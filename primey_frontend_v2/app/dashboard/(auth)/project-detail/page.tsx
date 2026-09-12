import { Metadata } from "next";
import { generateMeta } from "@/lib/utils";

import { ProjectDetailTabs } from "./components/project-detail-tabs";
import { ProjectHeader } from "./components/project-header";

export async function generateMetadata(): Promise<Metadata> {
  return generateMeta({
    title: "Project Detail",
    additionalTitle: true,
    description:
      "Track project goals, tasks, files, timeline and team activity in one place. A professional admin dashboard page built with React, TypeScript, Tailwind CSS, and shadcn/ui components.",
    canonical: "/project-detail"
  });
}

export default function Page() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <ProjectHeader />
      <ProjectDetailTabs />
    </div>
  );
}
