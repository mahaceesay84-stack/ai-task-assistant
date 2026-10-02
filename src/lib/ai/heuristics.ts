import type { Priority, Task } from "../types";

const DAY = 86_400_000;

export function daysUntil(due: string | null, now = Date.now()): number | null {
  if (!due || !/^\d{4}-\d{2}-\d{2}$/.test(due)) return null;
  const dueDate = new Date(`${due}T00:00:00Z`);
  if (Number.isNaN(dueDate.getTime()) || dueDate.toISOString().slice(0, 10) !== due) return null;
  const today = new Date(now);
  if (Number.isNaN(today.getTime())) return null;
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((dueDate.getTime() - todayUtc) / DAY);
}

/** Score 0..100 from deadline urgency + importance. */
export function score(task: Pick<Task, "dueDate" | "importance">, now = Date.now()): number {
  const d = daysUntil(task.dueDate, now);
  let urgency = 10;
  if (d !== null) urgency = d <= 0 ? 60 : d <= 1 ? 50 : d <= 3 ? 40 : d <= 7 ? 25 : 10;
  return urgency + task.importance * 8;
}

export function priorityFromScore(s: number): Priority {
  return s >= 70 ? "high" : s >= 45 ? "medium" : "low";
}

export function heuristicPrioritize(tasks: Task[], now = Date.now()) {
  return tasks
    .filter((t) => !t.done)
    .map((t) => {
      const d = daysUntil(t.dueDate, now);
      const s = score(t, now);
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

export function heuristicSummary(tasks: Task[], now = Date.now()): string {
  if (tasks.length === 0) return "No tasks yet. Add one to get started.";
  const done = tasks.filter((t) => t.done).length;
  const open = tasks.filter((t) => !t.done);
  const overdue = open.filter((t) => (daysUntil(t.dueDate, now) ?? 1) < 0);
  const pct = Math.round((done / tasks.length) * 100);
  const next = [...open].sort((a, b) => score(b, now) - score(a, now))[0];
  const parts = [`${done} of ${tasks.length} tasks complete (${pct}%).`];
  if (overdue.length) parts.push(`${overdue.length} overdue: ${overdue.map((t) => t.title).join(", ")}.`);
  if (next) parts.push(`Focus next on "${next.title}".`);
  else parts.push("Everything is done — great work!");
  return parts.join(" ");
}
