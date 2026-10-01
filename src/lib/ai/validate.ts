import type { Task } from "../types";

export function parseTasks(v: unknown): Task[] | null {
  if (!Array.isArray(v) || v.length > 200) return null;
  const ok = v.every(
    (t) => t && typeof t.id === "string" && typeof t.title === "string" && typeof t.done === "boolean" && typeof t.importance === "number" && Array.isArray(t.subtasks),
  );
  return ok ? (v as Task[]) : null;
}
