import { generateMeta } from "@/lib/utils";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import TransactionsTable, { Transaction } from "./transactions-table";
import transactionsData from "./data.json";
import upcomingData from "./upcoming.json";

export async function generateMetadata() {
  return generateMeta({
    title: "Transactions",
    description:
      "Monitor payment history, withdrawals, and transaction statuses. A professional admin dashboard page built with React, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/payment/transactions"
  });
}

export default function Page() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-row items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">Transactions</h1>
        <div className="flex items-center space-x-2">
          <CalendarDateRangePicker />
          <Button size="icon">
            <Download />
          </Button>
        </div>
      </div>
      <Tabs defaultValue="latest">
        <TabsList className="mb-2">
          <TabsTrigger value="latest">Latest</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        </TabsList>
        <TabsContent value="latest">
          <TransactionsTable data={transactionsData as Transaction[]} />
        </TabsContent>
        <TabsContent value="upcoming">
          <TransactionsTable data={upcomingData as Transaction[]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
