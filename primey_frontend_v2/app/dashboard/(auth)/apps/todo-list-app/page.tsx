import { generateMeta } from "@/lib/utils";

import Tasks from "./components/tasks";

import tasksData from "./data/tasks.json";
import { Todo } from "./types";

export async function generateMetadata() {
  return generateMeta({
    title: "Todo List App",
    additionalTitle: true,
    description:
      "Organize daily tasks, categorize activities, and manage priorities with a clean, multi-pane to-do list ui featuring detailed task views. A professional productivity app built with React, Next.js, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/apps/todo-list-app"
  });
}

export default function Page() {
  return <Tasks tasks={tasksData as unknown as Todo[]} />;
}
