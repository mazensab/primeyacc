"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRightIcon,
  ChevronsUpDownIcon,
  EllipsisIcon,
  Search,
  SlidersHorizontalIcon
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { generateAvatarFallback } from "@/lib/utils";

type Member = {
  id: string;
  name: string;
  avatar: string;
  role: string;
  requests: number;
  tokens: number;
  cost: number;
  change: number;
};

const members: Member[] = [
  {
    id: "1",
    name: "Maya Chen",
    avatar: "https://i.pravatar.cc/150?img=16",
    role: "Product designer",
    requests: 2984,
    tokens: 4_320_000,
    cost: 1284.2,
    change: 18.2
  },
  {
    id: "2",
    name: "Noah Williams",
    avatar: "https://i.pravatar.cc/150?img=12",
    role: "ML engineer",
    requests: 3420,
    tokens: 5_180_000,
    cost: 1732.8,
    change: 9.4
  },
  {
    id: "3",
    name: "Sophia Bennett",
    avatar: "https://i.pravatar.cc/150?img=13",
    role: "Product manager",
    requests: 1846,
    tokens: 2_110_000,
    cost: 693.5,
    change: -4.1
  },
  {
    id: "4",
    name: "Liam Ortiz",
    avatar: "https://i.pravatar.cc/150?img=17",
    role: "Backend engineer",
    requests: 2204,
    tokens: 3_060_000,
    cost: 988.1,
    change: 12.6
  },
  {
    id: "5",
    name: "Elena Petrova",
    avatar: "https://i.pravatar.cc/150?img=44",
    role: "Growth lead",
    requests: 1128,
    tokens: 1_480_000,
    cost: 472.7,
    change: 6.3
  }
];

type SortKey = "requests" | "tokens" | "cost" | "change";

function formatTokens(value: number) {
  return `${(value / 1_000_000).toFixed(2)}M`;
}

function formatCost(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function MemberUsageTable() {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = members.filter(
      (member) =>
        !q || member.name.toLowerCase().includes(q) || member.role.toLowerCase().includes(q)
    );
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) =>
      sortDir === "desc" ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]
    );
  }, [search, sortKey, sortDir]);

  const sortableHead = (label: string, key: SortKey) => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      className="hover:text-foreground flex items-center gap-1">
      {label}
      <ChevronsUpDownIcon className="size-3.5" />
    </button>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Member usage</CardTitle>
        <CardDescription>Top contributors by token volume</CardDescription>
        <CardAction>
          <div className="flex items-center gap-2">
            <InputGroup className="w-full max-w-56">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search members"
              />
            </InputGroup>
            <Button variant="outline" size="icon-sm" aria-label="Filter members">
              <SlidersHorizontalIcon />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label="More options">
                  <EllipsisIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>View All</DropdownMenuItem>
                <DropdownMenuItem>Export CSV</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="p-0">
        <Table className="min-w-[820px] table-fixed [&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)">
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead className="w-40">Role</TableHead>
              <TableHead className="w-32">{sortableHead("Requests", "requests")}</TableHead>
              <TableHead className="w-36">{sortableHead("Tokens used", "tokens")}</TableHead>
              <TableHead className="w-38">{sortableHead("Estimated cost", "cost")}</TableHead>
              <TableHead className="w-28">{sortableHead("Change", "change")}</TableHead>
              <TableHead className="w-16 text-end">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback>{generateAvatarFallback(member.name)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate font-medium">{member.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground truncate">{member.role}</TableCell>
                  <TableCell className="tabular-nums">
                    {member.requests.toLocaleString("en-US")}
                  </TableCell>
                  <TableCell className="tabular-nums">{formatTokens(member.tokens)}</TableCell>
                  <TableCell className="tabular-nums">{formatCost(member.cost)}</TableCell>
                  <TableCell>
                    <Badge variant={member.change >= 0 ? "success" : "destructive"}>
                      {member.change >= 0 ? "+" : ""}
                      {member.change.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`View ${member.name} usage`}>
                        <ArrowUpRightIcon />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                  No members found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
