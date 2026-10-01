"use client";
import { useCallback, useEffect, useState } from "react";
import type { Task } from "@/lib/types";

const KEY = "ai-task-assistant:v1";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setTasks(JSON.parse(raw) as Task[]);
    } catch {
      /* ignore corrupt storage */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(tasks));
  }, [tasks, loaded]);

  const add = useCallback((t: Omit<Task, "id" | "createdAt" | "done" | "subtasks" | "priority"> & Partial<Pick<Task, "subtasks" | "priority" | "aiReason">>) => {
    const task: Task = { priority: "medium", subtasks: [], ...t, id: crypto.randomUUID(), createdAt: Date.now(), done: false };
    setTasks((p) => [task, ...p]);
    return task.id;
  }, []);
  const update = useCallback((id: string, patch: Partial<Task>) => setTasks((p) => p.map((t) => (t.id === id ? { ...t, ...patch } : t))), []);
  const remove = useCallback((id: string) => setTasks((p) => p.filter((t) => t.id !== id)), []);
  const replaceAll = useCallback((next: Task[]) => setTasks(next), []);

  return { tasks, loaded, add, update, remove, replaceAll };
}
