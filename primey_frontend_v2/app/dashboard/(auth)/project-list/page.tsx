import { Metadata } from "next";
import { generateMeta } from "@/lib/utils";

import { ProjectList } from "./components/project-list";

import projects from "./data.json";

export async function generateMetadata(): Promise<Metadata> {
  return generateMeta({
    title: "Project List",
    additionalTitle: true,
    description:
      "Track project status, progress, and team assignments. A professional admin dashboard page built with React, TypeScript, Tailwind CSS, and shadcn/ui components.",
    canonical: "/project-list"
  });
}

export default function Page() {
  return (
    <>
      <ProjectList projects={projects} />
    </>
  );
}
