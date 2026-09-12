"use client";

import * as React from "react";
import {
  CalendarDaysIcon,
  CircleDotIcon,
  FlagIcon,
  GripVertical,
  Paperclip,
  MessageSquare,
  PlusCircleIcon,
  CheckIcon,
  ListFilterIcon,
  SearchIcon,
  UsersIcon
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import * as Kanban from "@/components/ui/kanban";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import AddAssigne from "./add-assigne";
import { AddTaskDrawer } from "./add-task-drawer";
import { TaskDetailDrawer } from "./task-detail-drawer";
import { boardUsers, taskProgress, useKanbanStore, type Task } from "../store";
import { Dot, StackedDots } from "@/components/table-filter-helpers";
import { Filters } from "@/components/ui/filters/filters";
import {
  createFilterQuery,
  flattenFilterConditions
} from "@/components/ui/filters/filters-query";
import type { FilterField, FilterQuery } from "@/components/ui/filters/filters-types";

const priorityConfig: Record<Task["priority"], { label: string; dot: string }> = {
  high: { label: "High", dot: "bg-rose-500" },
  medium: { label: "Medium", dot: "bg-amber-500" },
  low: { label: "Low", dot: "bg-slate-400" }
};

/* -------------------------------------------------------------------------- */
/*                                Filter schema                               */
/* -------------------------------------------------------------------------- */

const statusFilterConfig = [
  { value: "completed", label: "Completed", dot: "bg-emerald-500" },
  { value: "inProgress", label: "In Progress", dot: "bg-amber-500" },
  { value: "notStarted", label: "Not Started", dot: "bg-slate-400" }
];

const STATUS_DOTS = new Map(statusFilterConfig.map((status) => [status.value, status.dot]));
const PRIORITY_DOTS = new Map(
  Object.entries(priorityConfig).map(([value, config]) => [value, config.dot])
);

const filterFields: FilterField[] = [
  {
    id: "status",
    label: "Status",
    type: "select",
    defaultOperator: "is_any_of",
    options: statusFilterConfig.map((status) => ({
      value: status.value,
      label: status.label,
      icon: <Dot className={status.dot} />
    })),
    searchable: false,
    renderValue: ({ options }) => (
      <StackedDots options={options} dots={STATUS_DOTS} empty="any status" />
    ),
    icon: <CircleDotIcon />
  },
  {
    id: "priority",
    label: "Priority",
    type: "select",
    defaultOperator: "is_any_of",
    options: Object.entries(priorityConfig).map(([value, config]) => ({
      value,
      label: config.label,
      icon: <Dot className={config.dot} />
    })),
    searchable: false,
    renderValue: ({ options }) => (
      <StackedDots options={options} dots={PRIORITY_DOTS} empty="any priority" />
    ),
    icon: <FlagIcon />
  },
  {
    id: "assignees",
    label: "Assignee",
    type: "select",
    defaultOperator: "is_any_of",
    options: boardUsers.map((user) => ({
      value: user.name,
      label: user.name,
      icon: (
        <Avatar className="size-4">
          <AvatarImage src={user.src} alt={user.name} />
          <AvatarFallback className="text-[8px]">{user.fallback}</AvatarFallback>
        </Avatar>
      )
    })),
    icon: <UsersIcon />
  }
];

function taskStatus(task: Task): string {
  const progress = taskProgress(task);
  if (progress === 100) return "completed";
  if (progress > 0) return "inProgress";
  return "notStarted";
}

// Tasks hold an array of assignees, which the generic query matcher cannot
// compare against, so the (flat) query is evaluated field by field here.
function taskMatchesQuery(task: Task, query: FilterQuery): boolean {
  return flattenFilterConditions(query).every((condition) => {
    if (condition.values.length === 0) return true;

    const values = condition.values.map(String);
    let match = true;

    switch (condition.field) {
      case "status":
        match = values.includes(taskStatus(task));
        break;
      case "priority":
        match = values.includes(task.priority);
        break;
      case "assignees":
        match = task.users.some((user) => values.includes(user.name));
        break;
    }

    if (condition.operator === "is_none_of") match = !match;
    return condition.negated ? !match : match;
  });
}

const EMPTY_QUERY: FilterQuery = createFilterQuery();

export default function KanbanBoard() {
  const columns = useKanbanStore((state) => state.columns);
  const setColumns = useKanbanStore((state) => state.setColumns);
  const columnTitles = useKanbanStore((state) => state.columnTitles);
  const addColumnToStore = useKanbanStore((state) => state.addColumn);
  const openAddTask = useKanbanStore((state) => state.openAddTask);
  const openTaskDetail = useKanbanStore((state) => state.openTaskDetail);

  const [isNewColumnModalOpen, setIsNewColumnModalOpen] = React.useState(false);
  const [newColumnTitle, setNewColumnTitle] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [query, setQuery] = React.useState<FilterQuery>(EMPTY_QUERY);

  // Derived in the same render as `columns` so drag-and-drop reorders show up
  // immediately; a state + effect copy lags one frame and makes dropped
  // columns animate in from their old position.
  const filteredColumns = React.useMemo(() => {
    const filtered: Record<string, Task[]> = {};

    Object.keys(columns).forEach((columnKey) => {
      filtered[columnKey] = columns[columnKey].filter((task) => {
        const searchMatch =
          searchQuery === "" ||
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
          task.users.some((user) => user.name.toLowerCase().includes(searchQuery.toLowerCase()));

        return searchMatch && taskMatchesQuery(task, query);
      });
    });

    return filtered;
  }, [columns, searchQuery, query]);

  function addColumn(title: string) {
    addColumnToStore(title);
    setNewColumnTitle("");
    setIsNewColumnModalOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-row items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">Kanban Board</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center -space-x-2">
            {boardUsers.slice(0, 3).map((user) => (
              <Avatar key={user.name} className="border-background border-2">
                <AvatarImage src={user.src} alt={user.name} />
                <AvatarFallback>{user.fallback}</AvatarFallback>
              </Avatar>
            ))}
            {boardUsers.length > 3 && (
              <Avatar className="border-background border-2">
                <AvatarFallback className="text-xs">+{boardUsers.length - 3}</AvatarFallback>
              </Avatar>
            )}
            <AddAssigne />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <PlusCircleIcon />
                <span className="hidden lg:inline">Add</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openAddTask()}>Add Task</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsNewColumnModalOpen(true)}>
                Add Board
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Tabs defaultValue="board" className="w-full">
        <div className="mb-2 flex justify-between gap-2">
          <TabsList>
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="table">Table</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <div className="relative hidden w-auto lg:block">
              <SearchIcon className="absolute top-2.5 left-3 size-4 opacity-50" />
              <Input
                placeholder="Search tasks..."
                className="ps-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="none lg:hidden">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <SearchIcon />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-0" align="end">
                  <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Filters
              fields={filterFields}
              query={query}
              onQueryChange={setQuery}
              showClear
              trigger={
                <Button variant="outline">
                  <ListFilterIcon />
                  <span className="hidden lg:inline">Filters</span>
                </Button>
              }
            />

            <Dialog open={isNewColumnModalOpen} onOpenChange={setIsNewColumnModalOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Board</DialogTitle>
                </DialogHeader>
                <div className="mt-4 flex gap-2">
                  <Input
                    id="name"
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    className="col-span-3"
                    placeholder="Enter board name..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newColumnTitle.trim()) {
                        addColumn(newColumnTitle.trim());
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!newColumnTitle.trim()}
                    onClick={() => addColumn(newColumnTitle.trim())}>
                    <CheckIcon />
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <TabsContent value="board">
          <Kanban.Root
            value={filteredColumns}
            onValueChange={setColumns}
            getItemValue={(item) => item.id}>
            <Kanban.Board className="flex w-full gap-4 overflow-x-auto pb-4 max-sm:snap-x max-sm:snap-mandatory">
              {Object.entries(filteredColumns).map(([columnValue, tasks]) => (
                <Kanban.Column
                  key={columnValue}
                  value={columnValue}
                  className="w-[340px] min-w-[340px] max-sm:w-full max-sm:min-w-full max-sm:snap-center">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{columnTitles[columnValue]}</span>
                      <Badge variant="outline">{tasks.length}</Badge>
                    </div>
                    <div className="flex">
                      <Kanban.ColumnHandle asChild>
                        <Button variant="ghost" size="icon">
                          <GripVertical className="h-4 w-4" />
                        </Button>
                      </Kanban.ColumnHandle>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openAddTask(columnValue)}>
                            <PlusCircleIcon />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Add Task</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  {tasks.length > 0 ? (
                    <div className="flex flex-col gap-2 p-0.5">
                      {tasks.map((task) => (
                        <Kanban.Item key={task.id} value={task.id} asHandle asChild>
                          <Card
                            className="cursor-pointer border-0"
                            onClick={() => openTaskDetail(columnValue, task.id)}>
                            <CardContent className="space-y-3">
                              <div className="space-y-1">
                                <div className="text-base font-semibold">{task.title}</div>
                                <p className="text-muted-foreground line-clamp-2 text-sm">
                                  {task.description}
                                </p>
                              </div>
                              <div className="text-muted-foreground flex items-center justify-between text-sm">
                                <div className="flex -space-x-2 overflow-hidden">
                                  {task.users.map((user, index) => (
                                    <Avatar
                                      key={index}
                                      className="border-background size-7 border-2">
                                      <AvatarImage
                                        src={user.src || "/placeholder.svg"}
                                        alt={user.alt}
                                      />
                                      <AvatarFallback>{user.fallback}</AvatarFallback>
                                    </Avatar>
                                  ))}
                                </div>
                                <div className="flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs tabular-nums">
                                  <div className="relative size-3.5">
                                    <svg
                                      className="size-full -rotate-90"
                                      viewBox="0 0 36 36"
                                      xmlns="http://www.w3.org/2000/svg">
                                      <circle
                                        cx="18"
                                        cy="18"
                                        r="16"
                                        fill="none"
                                        className="stroke-current text-gray-200 dark:text-neutral-700"
                                        strokeWidth="4"></circle>
                                      <circle
                                        cx="18"
                                        cy="18"
                                        r="16"
                                        fill="none"
                                        className={cn("stroke-current", {
                                          "text-emerald-600": taskProgress(task) === 100,
                                          "text-amber-500":
                                            taskProgress(task) > 50 && taskProgress(task) < 100,
                                          "text-foreground": taskProgress(task) <= 50
                                        })}
                                        strokeWidth="4"
                                        strokeDasharray={2 * Math.PI * 16}
                                        strokeDashoffset={
                                          2 * Math.PI * 16 -
                                          (2 * Math.PI * 16 * taskProgress(task)) / 100
                                        }
                                        strokeLinecap="round"></circle>
                                    </svg>
                                  </div>
                                  {`${taskProgress(task)}%`}
                                </div>
                              </div>
                              <Separator />
                              <div className="text-muted-foreground flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">
                                    <span
                                      className={cn(
                                        "size-1.5 rounded-full",
                                        priorityConfig[task.priority].dot
                                      )}
                                    />
                                    {priorityConfig[task.priority].label}
                                  </Badge>
                                  {task.dueDate && (
                                    <span className="flex items-center gap-1 text-xs whitespace-nowrap">
                                      <CalendarDaysIcon className="size-3.5" />
                                      {format(parseISO(task.dueDate), "MMM d")}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1">
                                    <Paperclip className="size-4" />
                                    <span>{task.files?.length ?? 0}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <MessageSquare className="size-4" />
                                    <span>{task.commentsList?.length ?? 0}</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Kanban.Item>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col justify-center gap-4 pt-4">
                      <div className="text-muted-foreground text-sm">No task added here.</div>
                      <Button variant="outline" onClick={() => openAddTask(columnValue)}>
                        Add Task
                      </Button>
                    </div>
                  )}
                </Kanban.Column>
              ))}
            </Kanban.Board>
            <Kanban.Overlay>
              <div className="bg-primary/10 size-full rounded-md" />
            </Kanban.Overlay>
          </Kanban.Root>
        </TabsContent>
        <TabsContent value="list">
          <Card>
            <CardContent className="p-0">
              {Object.entries(filteredColumns).map(([columnValue, tasks], columnIndex) => (
                <div key={columnValue}>
                  <div
                    className={cn(
                      "bg-muted/50 flex items-center gap-2 border-b px-(--card-spacing) py-2",
                      columnIndex > 0 && "border-t"
                    )}>
                    <span className="text-sm font-semibold">{columnTitles[columnValue]}</span>
                    <Badge variant="outline">{tasks.length}</Badge>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="ms-auto"
                      onClick={() => openAddTask(columnValue)}>
                      <span className="sr-only">Add task to {columnTitles[columnValue]}</span>
                      <PlusCircleIcon />
                    </Button>
                  </div>
                  {tasks.length > 0 ? (
                    <div className="divide-y">
                      {tasks.map((task) => (
                        <div
                          key={task.id}
                          className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 px-(--card-spacing) py-3 transition-colors"
                          onClick={() => openTaskDetail(columnValue, task.id)}>
                          <span
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              priorityConfig[task.priority].dot
                            )}
                          />
                          <div className="min-w-0 flex-1 @max-md/card:flex-initial">
                            <div className="truncate font-medium">{task.title}</div>
                            <div className="text-muted-foreground truncate text-xs">
                              {task.description}
                            </div>
                          </div>
                          {task.dueDate && (
                            <span className="text-muted-foreground hidden items-center gap-1 text-xs whitespace-nowrap sm:flex">
                              <CalendarDaysIcon className="size-3.5" />
                              {format(parseISO(task.dueDate), "MMM d")}
                            </span>
                          )}
                          <div className="hidden -space-x-2 overflow-hidden md:flex">
                            {task.users.map((user, index) => (
                              <Avatar key={index} className="border-background size-6 border-2">
                                <AvatarImage src={user.src} alt={user.alt} />
                                <AvatarFallback className="text-[9px]">
                                  {user.fallback}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                          <span className="text-muted-foreground w-10 text-end text-xs tabular-nums">
                            {taskProgress(task)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground px-(--card-spacing) py-6 text-center text-sm">
                      No task added here.
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="table">
          <Card>
            <CardContent className="p-0">
              <Table className="min-w-[860px] table-fixed [&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)">
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-28">Priority</TableHead>
                    <TableHead className="w-28">Assignees</TableHead>
                    <TableHead className="w-24">Due date</TableHead>
                    <TableHead className="w-40">Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(filteredColumns).flatMap(([columnValue, tasks]) =>
                    tasks.map((task) => (
                      <TableRow
                        key={task.id}
                        className="cursor-pointer"
                        onClick={() => openTaskDetail(columnValue, task.id)}>
                        <TableCell>
                          <div className="min-w-0">
                            <div className="truncate font-medium">{task.title}</div>
                            <div className="text-muted-foreground truncate text-xs">
                              {task.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{columnTitles[columnValue]}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <span
                              className={cn(
                                "size-1.5 rounded-full",
                                priorityConfig[task.priority].dot
                              )}
                            />
                            {priorityConfig[task.priority].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex -space-x-2 overflow-hidden">
                            {task.users.map((user, index) => (
                              <Avatar key={index} className="border-background size-6 border-2">
                                <AvatarImage src={user.src} alt={user.alt} />
                                <AvatarFallback className="text-[9px]">
                                  {user.fallback}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {task.dueDate ? format(parseISO(task.dueDate), "MMM d") : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress className="h-1.5" value={taskProgress(task)} />
                            <span className="text-muted-foreground text-xs tabular-nums">
                              {taskProgress(task)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <AddTaskDrawer />
      <TaskDetailDrawer />
    </div>
  );
}
