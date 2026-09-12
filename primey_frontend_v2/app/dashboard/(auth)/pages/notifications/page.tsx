import Link from "next/link";
import { Check, Settings } from "lucide-react";
import { generateMeta } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import NotificationsDataTable, { Notification } from "./data-table";

import notifications from "./data.json";

export async function generateMetadata() {
  return generateMeta({
    title: "Notifications Page",
    additionalTitle: true,
    description:
      "Manage user alerts, mark all as read, and configure notification preferences. A professional notifications page built with React, Next.js, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/pages/notifications"
  });
}

export default async function Page() {
  const unreadCount = notifications.filter((n) => n.status === "unread").length;

  return (
    <div className="mx-auto max-w-4xl space-y-4 lg:space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight lg:text-2xl">Notifications</h1>
            {unreadCount > 0 && <Badge>{unreadCount} unread</Badge>}
          </div>
          <p className="text-muted-foreground text-sm">
            Stay up to date with what&apos;s happening across your projects.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="max-sm:px-2.5">
            <Check />
            <span className="max-sm:sr-only">Mark All as Read</span>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/pages/settings/notifications">
              <Settings />
            </Link>
          </Button>
        </div>
      </div>
      <NotificationsDataTable data={notifications as Notification[]} />
    </div>
  );
}
