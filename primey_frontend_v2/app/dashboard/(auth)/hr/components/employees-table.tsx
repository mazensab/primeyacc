"use client";

import { useMemo, useState } from "react";
import {
  BriefcaseIcon,
  Building2Icon,
  CircleDotIcon,
  DownloadIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  ListFilterIcon,
  Search,
  Trash2Icon
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { cn, generateAvatarFallback } from "@/lib/utils";
import { matchesFilterQuery } from "@/lib/filter-query-match";
import { Dot, StackedDots } from "@/components/table-filter-helpers";
import { Filters } from "@/components/ui/filters/filters";
import { createFilterQuery } from "@/components/ui/filters/filters-query";
import type { FilterField, FilterQuery } from "@/components/ui/filters/filters-types";

type Employee = {
  id: string;
  name: string;
  avatar: string;
  email: string;
  role: string;
  department: string;
  status: "full-time" | "freelance";
};

const employees: Employee[] = [
  {
    id: "58386974",
    name: "Justin Vetrovs",
    avatar: "https://i.pravatar.cc/150?img=11",
    email: "justinve@gmail.com",
    role: "Project Manager",
    department: "Team Projects",
    status: "full-time"
  },
  {
    id: "47958597",
    name: "Ahmad Kenter",
    avatar: "https://i.pravatar.cc/150?img=12",
    email: "kenterah@gmail.com",
    role: "Web Designer",
    department: "Head of Projects",
    status: "full-time"
  },
  {
    id: "30583964",
    name: "Davis Herwitz",
    avatar: "https://i.pravatar.cc/150?img=13",
    email: "davishe@gmail.com",
    role: "Marketing Coordinator",
    department: "Client & Team Work",
    status: "full-time"
  },
  {
    id: "48276925",
    name: "Marcus George",
    avatar: "https://i.pravatar.cc/150?img=15",
    email: "marcusg@gmail.com",
    role: "Product Designer",
    department: "Case Study",
    status: "freelance"
  },
  {
    id: "51820437",
    name: "Lydia Bergson",
    avatar: "https://i.pravatar.cc/150?img=44",
    email: "lydiab@gmail.com",
    role: "Web Designer",
    department: "Design System",
    status: "freelance"
  },
  {
    id: "63947210",
    name: "Priya Raghav",
    avatar: "https://i.pravatar.cc/150?img=41",
    email: "priyar@gmail.com",
    role: "Project Manager",
    department: "Team Projects",
    status: "full-time"
  }
];

const roles = [...new Set(employees.map((employee) => employee.role))];
const departments = [...new Set(employees.map((employee) => employee.department))];

const statusStyles = {
  "full-time": { label: "Full-time", variant: "success", dot: "bg-green-500" },
  freelance: { label: "Freelance", variant: "warning", dot: "bg-amber-500" }
} as const;

/* -------------------------------------------------------------------------- */
/*                                Filter schema                               */
/* -------------------------------------------------------------------------- */

const STATUS_DOTS = new Map(
  Object.entries(statusStyles).map(([value, config]) => [value, config.dot])
);

const fields: FilterField[] = [
  {
    id: "status",
    label: "Status",
    type: "select",
    defaultOperator: "is_any_of",
    options: Object.entries(statusStyles).map(([value, config]) => ({
      value,
      label: config.label,
      icon: <Dot className={config.dot} />
    })),
    searchable: false,
    renderValue: ({ options }) => (
      <StackedDots options={options} dots={STATUS_DOTS} empty="any status" />
    ),
    icon: <CircleDotIcon />
  },
  {
    id: "role",
    label: "Role",
    type: "select",
    defaultOperator: "is_any_of",
    options: roles.map((role) => ({ value: role, label: role })),
    icon: <BriefcaseIcon />
  },
  {
    id: "department",
    label: "Department",
    type: "select",
    defaultOperator: "is_any_of",
    options: departments.map((department) => ({ value: department, label: department })),
    icon: <Building2Icon />
  }
];

function readField(row: Employee, path: string): unknown {
  return row[path as keyof Employee];
}

function matchesSearch(row: Employee, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return [row.name, row.email, row.role, row.id].some((value) =>
    value.toLowerCase().includes(q)
  );
}

const EMPTY_QUERY: FilterQuery = createFilterQuery();

export default function EmployeesTable() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState<FilterQuery>(EMPTY_QUERY);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredEmployees = useMemo(
    () =>
      employees.filter(
        (employee) => matchesSearch(employee, search) && matchesFilterQuery(employee, query, readField)
      ),
    [search, query]
  );

  const selectedCount = selectedIds.size;
  const allSelected =
    filteredEmployees.length > 0 &&
    filteredEmployees.every((employee) => selectedIds.has(employee.id));

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(filteredEmployees.map((e) => e.id)));
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = (rows: Employee[]) => {
    const header = "Employee ID,Name,Email,Role,Department,Status";
    const lines = rows.map((employee) =>
      [
        employee.id,
        employee.name,
        employee.email,
        employee.role,
        employee.department,
        statusStyles[employee.status].label
      ].join(",")
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "employees.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Employees</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col p-0 [&_[data-slot=table-container]]:flex-1">
        <div className="flex min-h-14 items-center gap-2 border-b px-(--card-spacing) py-3">
          {selectedCount > 0 ? (
            <>
              <span className="px-1 text-sm font-medium">{selectedCount} selected</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleExport(employees.filter((employee) => selectedIds.has(employee.id)))
                }>
                <DownloadIcon /> <span className="@max-md/card:sr-only">Export</span>
              </Button>
              <Button variant="destructive" size="sm">
                <Trash2Icon /> <span className="@max-md/card:sr-only">Delete</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="ms-auto"
                onClick={() => setSelectedIds(new Set())}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <InputGroup className="w-full max-w-56 shrink-0 @max-md/card:min-w-24 @max-md/card:flex-1 @max-md/card:basis-0">
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search employee..."
                />
              </InputGroup>
              <Filters
                fields={fields}
                query={query}
                onQueryChange={setQuery}
                size="sm"
                showClear
                trigger={
                  <Button variant="outline" size="sm">
                    <ListFilterIcon /> Filters
                  </Button>
                }
                className="min-w-0 flex-1 @max-md/card:flex-initial"
              />
              <Button
                variant="outline"
                size="sm"
                className="ms-auto shrink-0"
                onClick={() => handleExport(filteredEmployees)}>
                <DownloadIcon />
                <span className="@max-md/card:sr-only">Export</span>
              </Button>
            </>
          )}
        </div>
        <Table className="min-w-[880px] table-fixed [&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all employees"
                />
              </TableHead>
              <TableHead className="w-28">Employee ID</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead className="w-40">Role</TableHead>
              <TableHead className="w-40">Departments</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-22 text-end">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((employee) => {
                const status = statusStyles[employee.status];
                const isSelected = selectedIds.has(employee.id);
                return (
                  <TableRow key={employee.id} data-state={isSelected ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRow(employee.id)}
                        aria-label={`Select ${employee.name}`}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {employee.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar>
                          <AvatarImage src={employee.avatar} alt={employee.name} />
                          <AvatarFallback>{generateAvatarFallback(employee.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{employee.name}</div>
                          <div className="text-muted-foreground truncate text-xs">
                            {employee.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="truncate">{employee.role}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="max-w-full rounded-md">
                        <span className="truncate">{employee.department}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className="gap-1.5">
                        <span className={cn("size-1.5 rounded-full", status.dot)} />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label="View employee">
                          <EyeIcon />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label="More actions">
                              <EllipsisVerticalIcon />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Profile</DropdownMenuItem>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                  No employees found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
