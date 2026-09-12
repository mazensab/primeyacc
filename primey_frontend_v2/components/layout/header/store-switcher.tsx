"use client";

import { useState } from "react";
import { CheckIcon, ChevronsUpDown, PlusIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const stores = [
  {
    id: "shadcn-store",
    name: "Shadcn Store",
    plan: "Enterprise",
    color: "bg-gradient-to-br from-violet-500 to-purple-700"
  },
  {
    id: "shadcn-outlet",
    name: "Shadcn Outlet",
    plan: "Basic",
    color: "bg-gradient-to-br from-amber-400 to-orange-600"
  },
  {
    id: "shadcn-wholesale",
    name: "Shadcn Wholesale",
    plan: "B2B",
    color: "bg-gradient-to-br from-sky-400 to-blue-600"
  }
];

export default function StoreSwitcher() {
  const [selectedId, setSelectedId] = useState(stores[1].id);
  const selectedStore = stores.find((store) => store.id === selectedId) ?? stores[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <span className={cn("size-4 shrink-0 rounded-full", selectedStore.color)} />
          <span className="hidden font-medium md:inline">{selectedStore.name}</span>
          <ChevronsUpDown className="text-muted-foreground size-3.5!" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Stores</DropdownMenuLabel>
        {stores.map((store) => (
          <DropdownMenuItem
            key={store.id}
            onSelect={() => setSelectedId(store.id)}
            className="gap-3 py-2">
            <span className={cn("size-6 shrink-0 rounded-full", store.color)} />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{store.name}</span>
              <span className="text-muted-foreground text-xs">{store.plan}</span>
            </div>
            {store.id === selectedId && <CheckIcon className="ml-auto" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <PlusIcon />
          Create store
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
