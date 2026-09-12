import { generateMeta } from "@/lib/utils";
import Link from "next/link";
import { PlusIcon } from "@radix-ui/react-icons";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProductList, { Product } from "./product-list";
import productsData from "./data.json";

export async function generateMetadata(): Promise<Metadata> {
  return generateMeta({
    title: "Product List",
    additionalTitle: true,
    description:
      "Manage inventory and track sales metrics on a professional admin page. Built with React, Next.js, TypeScript, Tailwind CSS, shadcn/ui, and Tanstack Table for data handling.",
    canonical: "/pages/products"
  });
}

export default function Page() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <Button asChild>
          <Link href="/dashboard/pages/products/create">
            <PlusIcon /> Add Product
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 lg:gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { name: "Total Sales", value: "$30,230", change: "+20.1%" },
          { name: "Number of Sales", value: "982", change: "+5.02" },
          { name: "Affiliate", value: "$4,530", change: "+3.1%" },
          { name: "Discounts", value: "$2,230", change: "-3.58%" }
        ].map((item) => {
          const isPositive = !item.change.startsWith("-");
          return (
            <Card key={item.name}>
              <CardHeader>
                <CardTitle>{item.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="font-display text-2xl lg:text-3xl">{item.value}</span>
                  <Badge variant={isPositive ? "success" : "destructive"}>
                    {isPositive ? <ArrowUpIcon /> : <ArrowDownIcon />}
                    {item.change.replace(/^[+-]/, "")}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <ProductList data={productsData as Product[]} />
    </div>
  );
}
