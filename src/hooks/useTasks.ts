"use client";
import { useCallback, useEffect, useState } from "react";
import { parseStoredTasks } from "@/lib/ai/validate";
import type { Task } from "@/lib/types";

type TaskPatch = Partial<Task> | ((task: Task) => Partial<Task>);

const KEY = "ai-task-assistant:v1";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        setTasks(parseStoredTasks(JSON.parse(raw)));
      }
    } catch {
      setLoaded(true);
      return;
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(tasks));
    } catch {
      return;
    }
  }, [tasks, loaded]);

  const add = useCallback((t: Omit<Task, "id" | "createdAt" | "done" | "subtasks" | "priority"> & Partial<Pick<Task, "subtasks" | "priority" | "aiReason" | "aiSource" | "aiRank">>) => {
    const task: Task = { priority: "medium", subtasks: [], ...t, id: crypto.randomUUID(), createdAt: Date.now(), done: false };
    setTasks((p) => [task, ...p]);
    return task.id;
  }, []);
  const update = useCallback((id: string, patch: TaskPatch) => setTasks((p) => p.map((t) => (t.id === id ? { ...t, ...(typeof patch === "function" ? patch(t) : patch) } : t))), []);
  const remove = useCallback((id: string) => setTasks((p) => p.filter((t) => t.id !== id)), []);
  const replaceAll = useCallback((next: Task[] | ((current: Task[]) => Task[])) => setTasks(next), []);

  return { tasks, loaded, add, update, remove, replaceAll };
}
