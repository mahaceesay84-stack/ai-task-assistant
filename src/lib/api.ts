import type { AiSource, BreakdownResult, PrioritizeItem, Task } from "./types";

function localToday(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

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
  return tasks.slice(0, 200).map(aiTask);
}

export const apiBreakdown = (t: Pick<Task, "title" | "notes" | "dueDate" | "importance">) => post<BreakdownResult>("/api/ai/breakdown", {
  title: t.title.trim().slice(0, 200),
  notes: t.notes.slice(0, 2000),
  dueDate: t.dueDate,
  importance: t.importance,
  today: localToday(),
});
export const apiPrioritize = (tasks: Task[]) => post<{ items: PrioritizeItem[]; source: AiSource }>("/api/ai/prioritize", { tasks: aiTasks(tasks), today: localToday() });
export const apiSummary = (tasks: Task[]) => post<{ summary: string; source: AiSource }>("/api/ai/summary", { tasks: aiTasks(tasks), today: localToday() });
