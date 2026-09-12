import { create } from "zustand";

import { initialColumns, initialColumnTitles } from "./data";

export interface TaskUser {
  name: string;
  src: string;
  alt?: string;
  fallback?: string;
  email?: string;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface TaskComment {
  id: string;
  author: string;
  avatar?: string;
  date: string;
  text: string;
}

export interface TaskFile {
  id: string;
  name: string;
  size: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  dueDate?: string;
  users: TaskUser[];
  subtasks?: Subtask[];
  commentsList?: TaskComment[];
  files?: TaskFile[];
}

export { boardUsers, team } from "./data";

/** Completion percentage derived from subtasks; tasks without subtasks are 0%. */
export function taskProgress(task: Task): number {
  const subtasks = task.subtasks ?? [];
  if (subtasks.length === 0) return 0;
  const done = subtasks.filter((subtask) => subtask.done).length;
  return Math.round((done / subtasks.length) * 100);
}

interface KanbanStore {
  columns: Record<string, Task[]>;
  columnTitles: Record<string, string>;
  addTaskOpen: boolean;
  /** Column preselected in the Add Task drawer; null opens it without one. */
  addTaskColumn: string | null;
  /** Task shown in the detail drawer; null while closed. */
  detailTask: { columnId: string; taskId: string } | null;
  setColumns: (columns: Record<string, Task[]>) => void;
  addColumn: (title: string) => void;
  addTask: (columnId: string, task: Task) => void;
  openAddTask: (columnId?: string) => void;
  closeAddTask: () => void;
  openTaskDetail: (columnId: string, taskId: string) => void;
  closeTaskDetail: () => void;
  moveTask: (taskId: string, fromColumn: string, toColumn: string) => void;
  updateTask: (columnId: string, taskId: string, updater: (task: Task) => Task) => void;
  addSubtask: (columnId: string, taskId: string, title: string) => void;
  toggleSubtask: (columnId: string, taskId: string, subtaskId: string) => void;
  addComment: (columnId: string, taskId: string, text: string) => void;
  addFile: (columnId: string, taskId: string, file: { name: string; size: string }) => void;
}

export const useKanbanStore = create<KanbanStore>((set) => ({
  columns: initialColumns,
  columnTitles: initialColumnTitles,
  addTaskOpen: false,
  addTaskColumn: null,
  detailTask: null,

  setColumns: (columns) => set({ columns }),

  addColumn: (title) =>
    set((state) => {
      const id = `col-${Date.now()}`;
      return {
        columns: { ...state.columns, [id]: [] },
        columnTitles: { ...state.columnTitles, [id]: title }
      };
    }),

  addTask: (columnId, task) =>
    set((state) => ({
      columns: {
        ...state.columns,
        [columnId]: [...(state.columns[columnId] ?? []), task]
      }
    })),

  openAddTask: (columnId) => set({ addTaskOpen: true, addTaskColumn: columnId ?? null }),
  closeAddTask: () => set({ addTaskOpen: false, addTaskColumn: null }),

  openTaskDetail: (columnId, taskId) => set({ detailTask: { columnId, taskId } }),
  closeTaskDetail: () => set({ detailTask: null }),

  moveTask: (taskId, fromColumn, toColumn) =>
    set((state) => {
      if (fromColumn === toColumn) return state;
      const task = state.columns[fromColumn]?.find((entry) => entry.id === taskId);
      if (!task) return state;
      return {
        columns: {
          ...state.columns,
          [fromColumn]: state.columns[fromColumn].filter((entry) => entry.id !== taskId),
          [toColumn]: [...(state.columns[toColumn] ?? []), task]
        },
        detailTask:
          state.detailTask?.taskId === taskId ? { columnId: toColumn, taskId } : state.detailTask
      };
    }),

  updateTask: (columnId, taskId, updater) =>
    set((state) => ({
      columns: {
        ...state.columns,
        [columnId]: (state.columns[columnId] ?? []).map((task) =>
          task.id === taskId ? updater(task) : task
        )
      }
    })),

  addSubtask: (columnId, taskId, title) =>
    useKanbanStore.getState().updateTask(columnId, taskId, (task) => ({
      ...task,
      subtasks: [...(task.subtasks ?? []), { id: `st-${Date.now()}`, title, done: false }]
    })),

  toggleSubtask: (columnId, taskId, subtaskId) =>
    useKanbanStore.getState().updateTask(columnId, taskId, (task) => ({
      ...task,
      subtasks: (task.subtasks ?? []).map((subtask) =>
        subtask.id === subtaskId ? { ...subtask, done: !subtask.done } : subtask
      )
    })),

  addComment: (columnId, taskId, text) =>
    useKanbanStore.getState().updateTask(columnId, taskId, (task) => ({
      ...task,
      commentsList: [
        ...(task.commentsList ?? []),
        {
          id: `c-${Date.now()}`,
          author: "You",
          date: new Date().toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit"
          }),
          text
        }
      ]
    })),

  addFile: (columnId, taskId, file) =>
    useKanbanStore.getState().updateTask(columnId, taskId, (task) => ({
      ...task,
      files: [...(task.files ?? []), { id: `f-${Date.now()}`, ...file }]
    }))
}));
