import type { AiSource, BreakdownResult, PrioritizeItem, Task } from "./types";
import { localDate } from "./ai/heuristics";

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

function aiTask(task: Task) {
  return {
    id: task.id.slice(0, 200),
    title: task.title.trim().slice(0, 200),
    dueDate: task.dueDate,
    importance: task.importance,
    done: task.done,
    subtasks: task.subtasks.slice(0, 100).map((subtask) => ({ done: subtask.done })),
  };
}

function aiTasks(tasks: Task[]) {
  return tasks.map(aiTask);
}

export const apiBreakdown = (t: Pick<Task, "title" | "notes" | "dueDate" | "importance">) => post<BreakdownResult>("/api/ai/breakdown", {
  title: t.title.trim().slice(0, 200),
  notes: t.notes.slice(0, 2000),
  dueDate: t.dueDate,
  importance: t.importance,
  today: localDate(new Date()),
});
export const apiPrioritize = (tasks: Task[]) => post<{ items: PrioritizeItem[]; source: AiSource }>("/api/ai/prioritize", { tasks: aiTasks(tasks.filter((task) => !task.done)), today: localDate(new Date()) });
export const apiSummary = (tasks: Task[]) => post<{ summary: string; source: AiSource }>("/api/ai/summary", { tasks: aiTasks(tasks), today: localDate(new Date()) });
