import { generateMeta } from "@/lib/utils";
import { Metadata } from "next";

import { CourseList } from "./components/course-list";

export async function generateMetadata(): Promise<Metadata> {
  return generateMeta({
    title: "Course App",
    additionalTitle: true,
    description:
      "Browse your enrolled courses, filter by category and track progress at a glance. A professional e-learning course list page built with React, Next.js, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/apps/courses"
  });
}

export default function Page() {
  return <CourseList />;
}
