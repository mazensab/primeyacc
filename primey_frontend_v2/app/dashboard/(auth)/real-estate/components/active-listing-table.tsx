"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@/components/ui/avatar";
import { Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { useState } from "react";
import type { ActiveListingRow } from "../types";

interface ActiveListingTableProps {
  items: ActiveListingRow[];
}

const statusVariant: Record<ActiveListingRow["status"], "default" | "secondary" | "destructive"> = {
  Occupied: "default",
  Available: "secondary",
  "Sold Out": "destructive"
};

export function ActiveListingTable({ items }: ActiveListingTableProps) {
  const [search, setSearch] = useState("");
  const q = search.toLowerCase();

  const filteredItems = items.filter(
    (item) => item.property.toLowerCase().includes(q) || item.location.toLowerCase().includes(q)
  );

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Active Listing</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 flex flex-col p-0 [&_[data-slot=table-container]]:flex-1">
        <div className="flex min-h-14 items-center border-b px-(--card-spacing) py-3">
          <InputGroup className="max-w-64">
            <InputGroupInput
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>
        </div>
        <Table className="min-w-[760px] table-fixed [&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)">
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead className="w-28">Type</TableHead>
              <TableHead className="w-24">Cost</TableHead>
              <TableHead className="w-32">Active Leads</TableHead>
              <TableHead className="w-20">Views</TableHead>
              <TableHead className="w-36">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  {items.length === 0
                    ? "No active listings yet."
                    : "No listings match your search."}
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-3">
                      <img
                        src={item.image}
                        alt={item.property}
                        className="size-10 shrink-0 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold" title={item.property}>
                          {item.property}
                        </p>
                        <p className="text-muted-foreground truncate text-sm" title={item.location}>
                          {item.location}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.type}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap tabular-nums">
                    {item.cost}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <AvatarGroup>
                        {item.leads.avatars.slice(0, 2).map((avatar, i) => (
                          <Avatar key={i} className="size-6">
                            <AvatarImage src={avatar} />
                            <AvatarFallback>U</AvatarFallback>
                          </Avatar>
                        ))}
                      </AvatarGroup>
                      <span className="text-muted-foreground text-xs">+{item.leads.count}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">{item.views}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[item.status]}>
                      {item.status === "Occupied"
                        ? `${item.units - 4}/${item.units} Occupied`
                        : item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
