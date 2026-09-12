import Link from "next/link";
import { generateMeta } from "@/lib/utils";

import { PlusCircledIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import UsersDataTable, { User } from "./data-table";
import usersData from "./data.json";

export async function generateMetadata() {
  return generateMeta({
    title: "Users List",
    additionalTitle: true,
    description:
      "Manage user records and list data efficiently. A professional admin dashboard page built with React, TypeScript, Tailwind CSS, shadcn/ui, and Tanstack Table.",
    canonical: "/pages/users"
  });
}

export default function Page() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <Button asChild>
          <Link href="#">
            <PlusCircledIcon /> Add New User
          </Link>
        </Button>
      </div>
      <UsersDataTable data={usersData as unknown as User[]} />
    </div>
  );
}
