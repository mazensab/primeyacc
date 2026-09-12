"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { differenceInCalendarDays, format } from "date-fns";
import { CalendarIcon, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from "@/components/ui/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

const categories = ["Prototyping", "UI/UX Design", "Web Development", "Mobile Development"];

const colors = [
  { value: "orange", label: "Orange", className: "bg-orange-500" },
  { value: "blue", label: "Blue", className: "bg-blue-500" },
  { value: "green", label: "Green", className: "bg-green-500" },
  { value: "pink", label: "Pink", className: "bg-pink-500" },
  { value: "red", label: "Red", className: "bg-red-500" }
];

const formSchema = z
  .object({
    title: z
      .string()
      .min(2, { message: "Project name must be at least 2 characters." })
      .max(60, { message: "Project name must be less than 60 characters." }),
    category: z.string({ error: "Please select a category." }),
    startDate: z.string({ error: "Please select a start date." }),
    endDate: z.string({ error: "Please select an end date." }),
    color: z.string({ error: "Please select a color." })
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after the start date.",
    path: ["endDate"]
  });

function getTimeLeft(endDate: string) {
  const days = differenceInCalendarDays(new Date(endDate), new Date());
  if (days <= 0) return "0 week left";
  return `${Math.max(1, Math.ceil(days / 7))} week left`;
}

type FormValues = z.infer<typeof formSchema>;

type Task = {
  id: number;
  title: string;
  done: boolean;
};

export function NewProjectDrawer() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskInput, setTaskInput] = useState("");

  const progress =
    tasks.length > 0 ? Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100) : 0;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema)
  });
  const endDateValue = form.watch("endDate");

  function addTask() {
    const title = taskInput.trim();
    if (!title) return;
    setTasks((prev) => [...prev, { id: Date.now(), title, done: false }]);
    setTaskInput("");
  }

  function toggleTask(id: number) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function removeTask(id: number) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function handleFormSubmit(values: FormValues) {
    toast.success("Project created", {
      description: `${values.title} has been successfully added with ${tasks.length} tasks (${progress}% completed, ${getTimeLeft(values.endDate)}).`
    });
    form.reset();
    setTasks([]);
    setTaskInput("");
  }

  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button className="max-sm:px-2.5">
          <Plus />
          <span className="max-sm:sr-only">New Project</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>New Project</DrawerTitle>
          <DrawerDescription>Fill out the form to create a new project.</DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter project name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                {(["startDate", "endDate"] as const).map((name) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>{name === "startDate" ? "Start Date" : "End Date"}</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}>
                                {field.value ? (
                                  format(new Date(field.value), "PP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) =>
                                field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                              }
                              className="pointer-events-auto p-3"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              {endDateValue && (
                <p className="text-muted-foreground text-xs">
                  Time left: {getTimeLeft(endDateValue)}
                </p>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tasks</span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {progress}% completed
                  </span>
                </div>
                <Progress value={progress} />
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a task"
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTask();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Add task"
                    onClick={addTask}>
                    <Plus />
                  </Button>
                </div>
                {tasks.length > 0 && (
                  <div className="space-y-1.5">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                        <Checkbox
                          checked={task.done}
                          onCheckedChange={() => toggleTask(task.id)}
                          aria-label={`Mark ${task.title} as done`}
                        />
                        <span
                          className={cn(
                            "flex-1 truncate",
                            task.done && "text-muted-foreground line-through"
                          )}>
                          {task.title}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${task.title}`}
                          onClick={() => removeTask(task.id)}>
                          <X />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a color" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {colors.map((color) => (
                          <SelectItem key={color.value} value={color.value}>
                            <div className="flex items-center gap-2">
                              <span className={cn("size-3 shrink-0 rounded-full", color.className)} />
                              {color.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  Create Project
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
