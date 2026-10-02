import { isPriority, type AiSource, type BreakdownResult, type PrioritizeItem, type Task } from "../types";
import { heuristicBreakdown, heuristicPrioritize, heuristicSummary, localDate, priorityFromScore, score } from "./heuristics";
import { chat, chatJson } from "./llm";
import { isValidDateOnly } from "./validate";

const isSubtask = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= 200;

function requestDate(today?: string): string {
  return isValidDateOnly(today) ? today : localDate(new Date());
}

export async function breakdownTask(title: string, notes: string, dueDate: string | null, importance: number, today?: string): Promise<BreakdownResult> {
  const currentDate = requestDate(today);
  const llm = await chatJson<{ subtasks?: unknown; priority?: unknown; reason?: unknown }>(
    'You are a task planning assistant. Break the task into 3-6 concrete, actionable sub-tasks and pick a priority. Schema: {"subtasks": string[], "priority": "high"|"medium"|"low", "reason": string}.',
    JSON.stringify({ title, notes, dueDate, importance, today: currentDate }),
  );
  const subtasks = llm && Array.isArray(llm.subtasks) ? llm.subtasks : null;
  if (subtasks && subtasks.length >= 3 && subtasks.length <= 6 && subtasks.every(isSubtask) && isPriority(llm?.priority)) {
    return {
      subtasks: subtasks.map((s) => s.trim()),
      priority: llm.priority,
      reason: typeof llm.reason === "string" ? llm.reason.trim().slice(0, 500) : "",
      source: "llm",
    };
  }
  const p = priorityFromScore(score({ dueDate, importance }, Date.now(), currentDate));
  return { subtasks: heuristicBreakdown(title, notes), priority: p, reason: "Based on deadline and importance", source: "heuristic" };
}

export async function prioritizeTasks(tasks: Task[], today?: string): Promise<{ items: PrioritizeItem[]; source: AiSource }> {
  const currentDate = requestDate(today);
  const open = tasks.filter((t) => !t.done);
  const llm = await chatJson<{ items?: unknown }>(
    'You prioritise tasks by deadline and importance. Return all given ids ordered most-urgent first. Schema: {"items":[{"id":string,"priority":"high"|"medium"|"low","reason":string}]}.',
    JSON.stringify({ today: currentDate, tasks: open.map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate, importance: t.importance })) }),
  );
  if (llm && Array.isArray(llm.items)) {
    const ids = new Set(open.map((t) => t.id));
    const seen = new Set<string>();
    const items: PrioritizeItem[] = [];
    let valid = ids.size === open.length;
    for (const value of llm.items) {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        valid = false;
        break;
      }
      const item = value as { id?: unknown; priority?: unknown; reason?: unknown };
      if (typeof item.id !== "string" || !ids.has(item.id) || seen.has(item.id) || !isPriority(item.priority)) {
        valid = false;
        break;
      }
      seen.add(item.id);
      items.push({ id: item.id, priority: item.priority, reason: typeof item.reason === "string" ? item.reason.trim().slice(0, 500) : "" });
    }
    if (valid && items.length === open.length && seen.size === ids.size) return { items, source: "llm" };
  }
  return { items: heuristicPrioritize(tasks, Date.now(), currentDate), source: "heuristic" };
}

export async function summarizeProgress(tasks: Task[], today?: string): Promise<{ summary: string; source: AiSource }> {
  const currentDate = requestDate(today);
  const text = await chat(
    "You are a concise productivity coach. Write a 2-4 sentence progress summary: what is done, what is at risk/overdue, and what to do next.",
    JSON.stringify({
      today: currentDate,
      tasks: tasks.map((t) => ({ title: t.title, done: t.done, dueDate: t.dueDate, importance: t.importance, subtasks: `${t.subtasks.filter((s) => s.done).length}/${t.subtasks.length}` })),
    }),
    false,
  );
  if (text?.trim()) return { summary: text.trim(), source: "llm" };
  return { summary: heuristicSummary(tasks, Date.now(), currentDate), source: "heuristic" };
}
