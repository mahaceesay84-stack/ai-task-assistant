import type { Priority, Task } from "../types";

const DAY = 86_400_000;

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}

export function localDate(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function daysUntilOnDate(due: string | null, today: string): number | null {
  if (!due) return null;
  const dueDate = parseDateOnly(due);
  const todayDate = parseDateOnly(today);
  if (!dueDate || !todayDate) return null;
  return Math.round((dueDate.getTime() - todayDate.getTime()) / DAY);
}

export function daysUntil(due: string | null, now = Date.now()): number | null {
  const current = new Date(now);
  return Number.isNaN(current.getTime()) ? null : daysUntilOnDate(due, localDate(current));
}

/** Score 0..100 from deadline urgency + importance. */
export function score(task: Pick<Task, "dueDate" | "importance">, now = Date.now(), today?: string): number {
  const d = today ? daysUntilOnDate(task.dueDate, today) : daysUntil(task.dueDate, now);
  let urgency = 10;
  if (d !== null) urgency = d <= 0 ? 60 : d <= 1 ? 50 : d <= 3 ? 40 : d <= 7 ? 25 : 10;
  return urgency + task.importance * 8;
}

export function priorityFromScore(s: number): Priority {
  return s >= 70 ? "high" : s >= 45 ? "medium" : "low";
}

export function heuristicPrioritize(tasks: Task[], now = Date.now(), today?: string) {
  return tasks
    .filter((t) => !t.done)
    .map((t) => {
      const d = today ? daysUntilOnDate(t.dueDate, today) : daysUntil(t.dueDate, now);
      const s = score(t, now, today);
      const when = d === null ? "no deadline" : d < 0 ? `${-d}d overdue` : d === 0 ? "due today" : `due in ${d}d`;
      return {
        id: t.id,
        priority: priorityFromScore(s),
        reason: `${when}, importance ${t.importance}/5`,
        s,
      };
    })
    .sort((a, b) => b.s - a.s)
    .map(({ s: _s, ...rest }) => rest);
}

export function heuristicBreakdown(title: string, notes: string): string[] {
  const subject = title.trim() || "the task";
  const extra = notes
    .split(/[\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
  return [
    `Clarify the goal and success criteria for "${subject}"`,
    ...extra,
    `Gather the resources and information needed`,
    `Complete a first draft / first pass`,
    `Review, refine and finish`,
  ].slice(0, 6);
}

export function heuristicSummary(tasks: Task[], now = Date.now(), today?: string): string {
  if (tasks.length === 0) return "No tasks yet. Add one to get started.";
  const done = tasks.filter((t) => t.done).length;
  const open = tasks.filter((t) => !t.done);
  const overdue = open.filter((t) => {
    const days = today ? daysUntilOnDate(t.dueDate, today) : daysUntil(t.dueDate, now);
    return (days ?? 1) < 0;
  });
  const pct = Math.round((done / tasks.length) * 100);
  const next = [...open].sort((a, b) => score(b, now, today) - score(a, now, today))[0];
  const parts = [`${done} of ${tasks.length} tasks complete (${pct}%).`];
  if (overdue.length) parts.push(`${overdue.length} overdue: ${overdue.map((t) => t.title).join(", ")}.`);
  if (next) parts.push(`Focus next on "${next.title}".`);
  else parts.push("Everything is done — great work!");
  return parts.join(" ");
}
