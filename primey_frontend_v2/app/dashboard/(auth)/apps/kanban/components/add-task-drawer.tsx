"use client";

import * as React from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";

import { boardUsers, useKanbanStore, type Task } from "../store";

const priorities: { value: Task["priority"]; label: string; dot: string }[] = [
  { value: "high", label: "High", dot: "bg-rose-500" },
  { value: "medium", label: "Medium", dot: "bg-amber-500" },
  { value: "low", label: "Low", dot: "bg-slate-400" }
];

export function AddTaskDrawer() {
  const open = useKanbanStore((state) => state.addTaskOpen);
  const addTaskColumn = useKanbanStore((state) => state.addTaskColumn);
  const columnTitles = useKanbanStore((state) => state.columnTitles);
  const addTask = useKanbanStore((state) => state.addTask);
  const closeAddTask = useKanbanStore((state) => state.closeAddTask);

  const [column, setColumn] = React.useState<string>("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priority, setPriority] = React.useState<Task["priority"]>("medium");
  const [assignee, setAssignee] = React.useState<string>("");
  const [dueDate, setDueDate] = React.useState("");

  // Opened from a column's plus button the board is preselected; opened from
  // the page-level Add menu it starts empty.
  React.useEffect(() => {
    if (open) setColumn(addTaskColumn ?? "");
  }, [open, addTaskColumn]);

  const columnTitle = column ? (columnTitles[column] ?? column) : "";

  const resetForm = () => {
    setColumn("");
    setTitle("");
    setDescription("");
    setPriority("medium");
    setAssignee("");
    setDueDate("");
  };

  const handleClose = () => {
    closeAddTask();
    resetForm();
  };

  const handleSubmit = () => {
    if (!column || !title.trim()) return;

    const user = boardUsers.find((entry) => entry.name === assignee);

    addTask(column, {
      id: `task-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate || undefined,
      users: user ? [user] : [],
      subtasks: [],
      commentsList: [],
      files: []
    });

    toast.success(`Task added to ${columnTitle}`);
    handleClose();
  };

  return (
    <Drawer direction="right" open={open} onOpenChange={(next) => !next && handleClose()}>
      <DrawerContent className="w-full sm:max-w-md">
        <DrawerHeader className="border-b">
          <DrawerTitle>Add Task</DrawerTitle>
          <DrawerDescription>
            {columnTitle ? `New task in ${columnTitle}` : "Create a new task"}
          </DrawerDescription>
        </DrawerHeader>
        <div className="grid gap-4 overflow-y-auto p-4">
          <div className="*:not-first:mt-1.5">
            <Label htmlFor="task-status">Status</Label>
            <Select value={column} onValueChange={setColumn}>
              <SelectTrigger id="task-status" className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(columnTitles).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="*:not-first:mt-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>
          <div className="*:not-first:mt-1.5">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add more details..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="*:not-first:mt-1.5">
              <Label htmlFor="task-priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as Task["priority"])}>
                <SelectTrigger id="task-priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((entry) => (
                    <SelectItem key={entry.value} value={entry.value}>
                      <span className={cn("size-1.5 rounded-full", entry.dot)} />
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="*:not-first:mt-1.5">
              <Label htmlFor="task-due-date">Due date</Label>
              <Input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="*:not-first:mt-1.5">
            <Label htmlFor="task-assignee">Assignee</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger id="task-assignee" className="w-full">
                <SelectValue placeholder="Pick a team member" />
              </SelectTrigger>
              <SelectContent>
                {boardUsers.map((user) => (
                  <SelectItem key={user.name} value={user.name}>
                    <Avatar className="size-5">
                      <AvatarImage src={user.src} alt={user.name} />
                      <AvatarFallback className="text-[9px]">{user.fallback}</AvatarFallback>
                    </Avatar>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DrawerFooter className="mt-auto flex-row border-t sm:justify-end">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || !column}>
            Add Task
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
