import { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "@radix-ui/react-icons";
import { generateMeta } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import OrdersDataTable, { Order } from "./data-table";
import ordersData from "./data.json";

export async function generateMetadata(): Promise<Metadata> {
  return generateMeta({
    title: "Orders Page",
    additionalTitle: true,
    description:
      "Orders Page for shadcn/ui built with React, Tailwind CSS, and TypeScript. Manage order history, status, and tracking using responsive data tables and filtering components.",
    canonical: "/pages/orders"
  });
}

export default function Page() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-row items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">Orders</h1>
        <Button asChild>
          <Link href="#">
            <PlusIcon /> Create Order
          </Link>
        </Button>
      </div>
      <OrdersDataTable data={ordersData as Order[]} />
    </div>
  );
}
