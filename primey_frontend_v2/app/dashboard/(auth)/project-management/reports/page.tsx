import { Metadata } from "next";
import { generateMeta } from "@/lib/utils";

import { Reports } from "../components/reports";

export async function generateMetadata(): Promise<Metadata> {
  return generateMeta({
    title: "Project Reports",
    additionalTitle: true,
    description:
      "Review project budgets, timelines, and progress with advanced filtering. A professional project reports page built with React, Next.js, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/project-management/reports"
  });
}

export default function Page() {
  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">Project Reports</h1>
      </div>
      <Reports />
    </div>
  );
}
