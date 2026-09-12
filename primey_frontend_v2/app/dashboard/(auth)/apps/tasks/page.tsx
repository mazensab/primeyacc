import { z } from "zod";
import { generateMeta } from "@/lib/utils";

import TaskList from "./components/task-list";

import { taskSchema } from "./data/schema";
import tasksData from "./data/tasks.json";

export async function generateMetadata() {
  return generateMeta({
    title: "Tasks",
    additionalTitle: true,
    description:
      "Organize project issues, monitor task status, and manage priorities using a robust data table with advanced filtering and sorting. A professional task management application built with React, Next.js, TypeScript, Tailwind CSS, and Tanstack Table",
    canonical: "/apps/tasks"
  });
}

export default function TaskPage() {
  const tasks = z.array(taskSchema).parse(tasksData);

  return <TaskList data={tasks} />;
}
