import type { AiSource, BreakdownResult, PrioritizeItem, Task } from "./types";

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

export const apiBreakdown = (t: Pick<Task, "title" | "notes" | "dueDate" | "importance">) => post<BreakdownResult>("/api/ai/breakdown", t);
export const apiPrioritize = (tasks: Task[]) => post<{ items: PrioritizeItem[]; source: AiSource }>("/api/ai/prioritize", { tasks });
export const apiSummary = (tasks: Task[]) => post<{ summary: string; source: AiSource }>("/api/ai/summary", { tasks });
