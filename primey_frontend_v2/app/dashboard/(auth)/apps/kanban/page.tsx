import { generateMeta } from "@/lib/utils";

import KanbanBoard from "./components/kanban-board";

export async function generateMetadata() {
  return generateMeta({
    title: "Kanban Board",
    additionalTitle: true,
    description:
      "Organize workflows, track task progress, and manage team assignments with a dynamic drag-and-drop board. A professional project management application built with React, Next.js, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/apps/kanban"
  });
}

export default function Page() {
  return <KanbanBoard />;
}
