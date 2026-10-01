import type { AiSource, BreakdownResult, Priority, PrioritizeItem, Task } from "../types";
import { heuristicBreakdown, heuristicPrioritize, heuristicSummary, priorityFromScore, score } from "./heuristics";
import { chat, chatJson } from "./llm";

const PRIORITIES: Priority[] = ["high", "medium", "low"];
const isPriority = (v: unknown): v is Priority => PRIORITIES.includes(v as Priority);

export async function breakdownTask(title: string, notes: string, dueDate: string | null, importance: number): Promise<BreakdownResult> {
  const llm = await chatJson<{ subtasks?: unknown; priority?: unknown; reason?: unknown }>(
    'You are a task planning assistant. Break the task into 3-6 concrete, actionable sub-tasks and pick a priority. Schema: {"subtasks": string[], "priority": "high"|"medium"|"low", "reason": string}.',
    JSON.stringify({ title, notes, dueDate, importance, today: new Date().toISOString().slice(0, 10) }),
  );
  if (llm && Array.isArray(llm.subtasks) && llm.subtasks.length && isPriority(llm.priority)) {
    return {
      subtasks: llm.subtasks.filter((s): s is string => typeof s === "string").slice(0, 8),
      priority: llm.priority,
      reason: typeof llm.reason === "string" ? llm.reason : "",
      source: "llm",
    };
  }
  const p = priorityFromScore(score({ dueDate, importance }));
  return { subtasks: heuristicBreakdown(title, notes), priority: p, reason: "Based on deadline and importance", source: "heuristic" };
}

export async function prioritizeTasks(tasks: Task[]): Promise<{ items: PrioritizeItem[]; source: AiSource }> {
  const open = tasks.filter((t) => !t.done);
  const llm = await chatJson<{ items?: { id?: unknown; priority?: unknown; reason?: unknown }[] }>(
    'You prioritise tasks by deadline and importance. Return all given ids ordered most-urgent first. Schema: {"items":[{"id":string,"priority":"high"|"medium"|"low","reason":string}]}.',
    JSON.stringify({ today: new Date().toISOString().slice(0, 10), tasks: open.map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate, importance: t.importance })) }),
  );
  if (llm && Array.isArray(llm.items)) {
    const ids = new Set(open.map((t) => t.id));
    const items = llm.items.flatMap((i): PrioritizeItem[] =>
      typeof i.id === "string" && ids.has(i.id) && isPriority(i.priority)
        ? [{ id: i.id, priority: i.priority, reason: typeof i.reason === "string" ? i.reason : "" }]
        : [],
    );
    if (items.length === open.length) return { items, source: "llm" };
  }
  return { items: heuristicPrioritize(tasks), source: "heuristic" };
}

export async function summarizeProgress(tasks: Task[]): Promise<{ summary: string; source: AiSource }> {
  const text = await chat(
    "You are a concise productivity coach. Write a 2-4 sentence progress summary: what is done, what is at risk/overdue, and what to do next.",
    JSON.stringify({
      today: new Date().toISOString().slice(0, 10),
      tasks: tasks.map((t) => ({ title: t.title, done: t.done, dueDate: t.dueDate, importance: t.importance, subtasks: `${t.subtasks.filter((s) => s.done).length}/${t.subtasks.length}` })),
    }),
    false,
  );
  if (text?.trim()) return { summary: text.trim(), source: "llm" };
  return { summary: heuristicSummary(tasks), source: "heuristic" };
}
