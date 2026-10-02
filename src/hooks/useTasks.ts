"use client";
import { useCallback, useEffect, useState } from "react";
import { parseStoredTasks } from "@/lib/ai/validate";
import type { Task } from "@/lib/types";

type TaskPatch = Partial<Task> | ((task: Task) => Partial<Task>);

const KEY = "ai-task-assistant:v1";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw !== null) {
        const parsed = parseStoredTasks(JSON.parse(raw));
        if (parsed === null) throw new Error("invalid stored tasks");
        setTasks(parsed);
      }
      setStorageReady(true);
    } catch {
      setStorageError("Saved tasks could not be loaded. Existing data was preserved.");
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded || !storageReady) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(tasks));
      setStorageError(null);
    } catch {
      setStorageError("Tasks could not be saved in browser storage.");
    }
  }, [tasks, loaded, storageReady]);

  const add = useCallback((t: Omit<Task, "id" | "createdAt" | "done" | "subtasks" | "priority"> & Partial<Pick<Task, "subtasks" | "priority" | "aiReason" | "aiSource" | "aiRank">>) => {
    const task: Task = { priority: "medium", subtasks: [], ...t, id: crypto.randomUUID(), createdAt: Date.now(), done: false };
    setTasks((p) => [task, ...p]);
    return task.id;
  }, []);
  const update = useCallback((id: string, patch: TaskPatch) => setTasks((p) => p.map((t) => {
    if (t.id !== id) return t;
    const changes = typeof patch === "function" ? patch(t) : patch;
    return {
      ...t,
      ...changes,
      priority: "medium",
      aiReason: undefined,
      aiSource: undefined,
      aiRank: undefined,
    };
  })), []);
  const updateWithAi = useCallback((id: string, expected: Task, patch: TaskPatch) => setTasks((p) => p.map((t) => {
    if (t.id !== id || t !== expected) return t;
    return { ...t, ...(typeof patch === "function" ? patch(t) : patch) };
  })), []);
  const remove = useCallback((id: string) => setTasks((p) => p.filter((t) => t.id !== id)), []);
  const replaceAll = useCallback((next: Task[] | ((current: Task[]) => Task[])) => setTasks(next), []);

  return { tasks, loaded, storageError, add, update, updateWithAi, remove, replaceAll };
}
