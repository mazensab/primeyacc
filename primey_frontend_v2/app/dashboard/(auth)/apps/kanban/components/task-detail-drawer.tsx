"use client";

import * as React from "react";
import {
  CalendarDaysIcon,
  CheckIcon,
  FileIcon,
  ListChecksIcon,
  MessageSquareIcon,
  PaperclipIcon,
  PencilIcon,
  PlusIcon,
  SendIcon,
  XIcon
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { format, parseISO } from "date-fns";

import { taskProgress, useKanbanStore, type Task } from "../store";

const priorityConfig: Record<Task["priority"], { label: string; dot: string }> = {
  high: { label: "High", dot: "bg-rose-500" },
  medium: { label: "Medium", dot: "bg-amber-500" },
  low: { label: "Low", dot: "bg-slate-400" }
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, index)).toFixed(1))} ${units[index]}`;
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground w-24 shrink-0 text-sm">{label}</span>
      <div className="flex min-w-0 flex-1 justify-end">{children}</div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  children,
  count
}: {
  icon: React.ElementType;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="text-muted-foreground size-4" />
      <span className="font-semibold">{children}</span>
      {count !== undefined && <Badge variant="outline">{count}</Badge>}
    </div>
  );
}

export function TaskDetailDrawer() {
  const detailTask = useKanbanStore((state) => state.detailTask);
  const columns = useKanbanStore((state) => state.columns);
  const columnTitles = useKanbanStore((state) => state.columnTitles);
  const closeTaskDetail = useKanbanStore((state) => state.closeTaskDetail);
  const moveTask = useKanbanStore((state) => state.moveTask);
  const addSubtask = useKanbanStore((state) => state.addSubtask);
  const toggleSubtask = useKanbanStore((state) => state.toggleSubtask);
  const addComment = useKanbanStore((state) => state.addComment);
  const addFile = useKanbanStore((state) => state.addFile);

  const updateTask = useKanbanStore((state) => state.updateTask);

  const [subtaskTitle, setSubtaskTitle] = React.useState("");
  const [comment, setComment] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const task = detailTask
    ? columns[detailTask.columnId]?.find((entry) => entry.id === detailTask.taskId)
    : undefined;

  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState({
    title: "",
    description: "",
    priority: "medium" as Task["priority"],
    dueDate: ""
  });

  const startEditing = () => {
    if (!task) return;
    setDraft({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      dueDate: task.dueDate ?? ""
    });
    setIsEditing(true);
  };

  const saveEditing = () => {
    if (!detailTask || !draft.title.trim()) return;
    updateTask(detailTask.columnId, detailTask.taskId, (entry) => ({
      ...entry,
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      priority: draft.priority,
      dueDate: draft.dueDate || undefined
    }));
    setIsEditing(false);
  };

  const subtasks = task?.subtasks ?? [];
  const doneCount = subtasks.filter((subtask) => subtask.done).length;
  const files = task?.files ?? [];
  const taskComments = task?.commentsList ?? [];

  const handleAddSubtask = () => {
    if (!detailTask || !subtaskTitle.trim()) return;
    addSubtask(detailTask.columnId, detailTask.taskId, subtaskTitle.trim());
    setSubtaskTitle("");
  };

  const handleAddComment = () => {
    if (!detailTask || !comment.trim()) return;
    addComment(detailTask.columnId, detailTask.taskId, comment.trim());
    setComment("");
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!detailTask || !fileList) return;
    Array.from(fileList).forEach((file) => {
      addFile(detailTask.columnId, detailTask.taskId, {
        name: file.name,
        size: formatFileSize(file.size)
      });
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Drawer
      direction="right"
      open={detailTask !== null}
      onOpenChange={(next) => {
        if (!next) {
          setIsEditing(false);
          closeTaskDetail();
        }
      }}>
      <DrawerContent className="w-full sm:max-w-lg">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between gap-2">
            <DrawerTitle>Task Detail</DrawerTitle>
            {task &&
              (isEditing ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setIsEditing(false)}>
                    <span className="sr-only">Cancel editing</span>
                    <XIcon />
                  </Button>
                  <Button size="icon-sm" onClick={saveEditing} disabled={!draft.title.trim()}>
                    <span className="sr-only">Save changes</span>
                    <CheckIcon />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="icon-sm" onClick={startEditing}>
                  <span className="sr-only">Edit task</span>
                  <PencilIcon />
                </Button>
              ))}
          </div>
          <DrawerDescription className="sr-only">
            Details, subtasks, files, and comments for this task
          </DrawerDescription>
        </DrawerHeader>
        {task && detailTask && (
          <div className="space-y-6 overflow-y-auto p-4">
            {/* Title + description */}
            {isEditing ? (
              <div className="space-y-3">
                <div className="*:not-first:mt-1.5">
                  <Label htmlFor="detail-title">Title</Label>
                  <Input
                    id="detail-title"
                    value={draft.title}
                    onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="*:not-first:mt-1.5">
                  <Label htmlFor="detail-description">Description</Label>
                  <Textarea
                    id="detail-description"
                    rows={3}
                    value={draft.description}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, description: e.target.value }))
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <h2 className="text-lg leading-snug font-semibold">{task.title}</h2>
                {task.description && (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {task.description}
                  </p>
                )}
              </div>
            )}

            {/* Meta */}
            <div className="space-y-3">
              <MetaRow label="Status">
                <Select
                  value={detailTask.columnId}
                  onValueChange={(value) =>
                    moveTask(detailTask.taskId, detailTask.columnId, value)
                  }>
                  <SelectTrigger size="sm" className="w-fit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(columnTitles).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </MetaRow>
              <MetaRow label="Priority">
                {isEditing ? (
                  <Select
                    value={draft.priority}
                    onValueChange={(value) =>
                      setDraft((prev) => ({ ...prev, priority: value as Task["priority"] }))
                    }>
                    <SelectTrigger size="sm" className="w-fit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityConfig).map(([value, config]) => (
                        <SelectItem key={value} value={value}>
                          <span className={cn("size-1.5 rounded-full", config.dot)} />
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline">
                    <span
                      className={cn("size-1.5 rounded-full", priorityConfig[task.priority].dot)}
                    />
                    {priorityConfig[task.priority].label}
                  </Badge>
                )}
              </MetaRow>
              {isEditing ? (
                <MetaRow label="Due date">
                  <Input
                    type="date"
                    className="h-8 w-fit"
                    value={draft.dueDate}
                    onChange={(e) => setDraft((prev) => ({ ...prev, dueDate: e.target.value }))}
                  />
                </MetaRow>
              ) : (
                task.dueDate && (
                  <MetaRow label="Due date">
                    <span className="flex items-center gap-1.5 text-sm">
                      <CalendarDaysIcon className="text-muted-foreground size-3.5" />
                      {format(parseISO(task.dueDate), "MMM d, yyyy")}
                    </span>
                  </MetaRow>
                )
              )}
              <MetaRow label="Assignees">
                {task.users.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {task.users.map((user, index) => (
                        <Avatar key={index} className="border-background size-6 border-2">
                          <AvatarImage src={user.src} alt={user.name} />
                          <AvatarFallback className="text-[9px]">{user.fallback}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <span className="text-muted-foreground truncate text-sm">
                      {task.users.map((user) => user.name).join(", ")}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Unassigned</span>
                )}
              </MetaRow>
              <MetaRow label="Progress">
                <div className="flex w-40 items-center gap-2">
                  <Progress className="h-1.5" value={taskProgress(task)} />
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {taskProgress(task)}%
                  </span>
                </div>
              </MetaRow>
            </div>

            <Separator />

            {/* Subtasks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <SectionTitle icon={ListChecksIcon} count={subtasks.length}>
                  Subtasks
                </SectionTitle>
                {subtasks.length > 0 && (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {doneCount} of {subtasks.length} done
                  </span>
                )}
              </div>
              {subtasks.length > 0 && (
                <div className="divide-y rounded-lg border">
                  {subtasks.map((subtask) => (
                    <label
                      key={subtask.id}
                      className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors">
                      <Checkbox
                        checked={subtask.done}
                        onCheckedChange={() =>
                          toggleSubtask(detailTask.columnId, detailTask.taskId, subtask.id)
                        }
                      />
                      <span
                        className={cn(
                          "text-sm",
                          subtask.done && "text-muted-foreground line-through"
                        )}>
                        {subtask.title}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={subtaskTitle}
                  onChange={(e) => setSubtaskTitle(e.target.value)}
                  placeholder="Add a subtask..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddSubtask();
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleAddSubtask}
                  disabled={!subtaskTitle.trim()}>
                  <span className="sr-only">Add subtask</span>
                  <PlusIcon />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Attachments */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <SectionTitle icon={PaperclipIcon} count={files.length}>
                  Attachments
                </SectionTitle>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <PlusIcon /> Add file
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>
              {files.length > 0 ? (
                <div className="divide-y rounded-lg border">
                  {files.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md border">
                        <FileIcon className="text-muted-foreground size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{file.name}</div>
                        <div className="text-muted-foreground text-xs">{file.size}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No files attached yet.</p>
              )}
            </div>

            <Separator />

            {/* Comments */}
            <div className="space-y-3">
              <SectionTitle icon={MessageSquareIcon} count={taskComments.length}>
                Comments
              </SectionTitle>
              <div className="flex gap-2">
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Write a comment..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddComment();
                  }}
                />
                <Button size="icon" onClick={handleAddComment} disabled={!comment.trim()}>
                  <span className="sr-only">Send comment</span>
                  <SendIcon />
                </Button>
              </div>
              <div className="space-y-4">
                {taskComments.map((entry) => (
                  <div key={entry.id} className="flex gap-3">
                    <Avatar className="size-7 shrink-0">
                      <AvatarImage src={entry.avatar} alt={entry.author} />
                      <AvatarFallback className="text-[10px]">
                        {entry.author
                          .split(" ")
                          .map((part) => part[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium">{entry.author}</span>
                        <span className="text-muted-foreground text-xs">{entry.date}</span>
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed">{entry.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
