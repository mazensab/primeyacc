import { generateMeta } from "@/lib/utils";
import { Metadata } from "next";

import EventCalendarApp from "./components/event-calendar-app";

export async function generateMetadata(): Promise<Metadata> {
  return generateMeta({
    title: "Event Calendar",
    additionalTitle: true,
    description:
      "Organize schedules, track deadlines, and manage events with interactive drag-and-drop functionality across month, week, and day views. A professional calendar app built with React, Next.js, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/apps/calendar"
  });
}

export default function Page() {
  return <EventCalendarApp />;
}
