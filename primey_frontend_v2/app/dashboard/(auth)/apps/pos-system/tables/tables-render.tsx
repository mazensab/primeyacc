"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { Table, TableCategory } from "../store";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TableListItem from "./components/table-list-item";
import AddTableDialog from "./components/add-table-dialog";

type PosSystemTableRender = {
  tableCategories: TableCategory[];
  tables: Table[];
};

export default function PosSystemTableRender({ tableCategories, tables }: PosSystemTableRender) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredTables = React.useCallback(() => {
    if (!selectedCategory) {
      return tables;
    }
    return tables.filter((c) => c.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="flex flex-col md:flex-row max-w-5xl mx-auto">
      <div className="flex flex-1 flex-col gap-4 overflow-hidden md:flex-row">
        <div className="flex-1 space-y-4 overflow-auto pb-20 md:pb-0">
          <div className="sticky top-0 z-10">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Button variant="outline" asChild>
                        <Link href="/dashboard/apps/pos-system">
                          <ChevronLeft />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Menu</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <h1 className="text-xl font-bold tracking-tight lg:text-2xl">Tables</h1>
              </div>
              <div className="flex gap-2">
                <AddTableDialog tableCategories={tableCategories} />
              </div>
            </div>
          </div>

          {/* Categories */}
          <Tabs
            value={selectedCategory ?? "all"}
            onValueChange={(value) => setSelectedCategory(value === "all" ? null : value)}>
            <TabsList>
              <TabsTrigger value="all" className="px-3">
                All
              </TabsTrigger>
              {tableCategories.map((category) => (
                <TabsTrigger key={category.id} value={category.id} className="px-3">
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {/* Categories */}

          {filteredTables().length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {filteredTables().map((table) => (
                <TableListItem
                  key={table.id}
                  table={table}
                  categoryName={tableCategories.find((c) => c.id === table.category)?.name}
                />
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground py-4 text-center">There are no tables here.</div>
          )}
        </div>
      </div>
    </div>
  );
}
