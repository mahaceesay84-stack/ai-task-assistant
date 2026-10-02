import type { AiSource, Priority, SubTask, Task } from "../types";

const PRIORITIES: Priority[] = ["high", "medium", "low"];
const SOURCES: AiSource[] = ["llm", "heuristic"];

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedText(value: unknown, max: number, allowEmpty = false): value is string {
  return typeof value === "string" && value.length <= max && (allowEmpty || value.trim().length > 0);
}

export function isValidDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isPriority(value: unknown): value is Priority {
  return PRIORITIES.includes(value as Priority);
}

function isSource(value: unknown): value is AiSource {
  return SOURCES.includes(value as AiSource);
}

function parseSubtasks(value: unknown): SubTask[] | null {
  if (!Array.isArray(value) || value.length > 100) return null;
  const ids = new Set<string>();
  const subtasks: SubTask[] = [];
  for (const item of value) {
    if (!isRecord(item) || !isBoundedText(item.id, 200) || !isBoundedText(item.title, 200) || typeof item.done !== "boolean" || ids.has(item.id)) return null;
    ids.add(item.id);
    subtasks.push({ id: item.id, title: item.title, done: item.done });
  }
  return subtasks;
}

function parseTask(value: unknown): Task | null {
  if (!isRecord(value)) return null;
  const subtasks = parseSubtasks(value.subtasks);
  if (
    !isBoundedText(value.id, 200) ||
    !isBoundedText(value.title, 200) ||
    !isBoundedText(value.notes, 2000, true) ||
    !(value.dueDate === null || isValidDateOnly(value.dueDate)) ||
    !isPriority(value.priority) ||
    typeof value.importance !== "number" || !Number.isInteger(value.importance) || value.importance < 1 || value.importance > 5 ||
    typeof value.done !== "boolean" ||
    !subtasks ||
    typeof value.createdAt !== "number" || !Number.isFinite(value.createdAt) || value.createdAt < 0
  ) return null;
  if (value.aiReason !== undefined && !isBoundedText(value.aiReason, 500, true)) return null;
  if (value.aiSource !== undefined && !isSource(value.aiSource)) return null;
  if (value.aiRank !== undefined && (typeof value.aiRank !== "number" || !Number.isInteger(value.aiRank) || value.aiRank < 0 || value.aiRank > 200)) return null;

  const task: Task = {
    id: value.id,
    title: value.title,
    notes: value.notes,
    dueDate: value.dueDate,
    priority: value.priority,
    importance: value.importance,
    done: value.done,
    subtasks,
    createdAt: value.createdAt,
  };
  if (typeof value.aiReason === "string") task.aiReason = value.aiReason;
  if (isSource(value.aiSource)) task.aiSource = value.aiSource;
  if (typeof value.aiRank === "number") task.aiRank = value.aiRank;
  return task;
}

export function parseTasks(value: unknown): Task[] | null {
  if (!Array.isArray(value) || value.length > 200) return null;
  const ids = new Set<string>();
  const tasks: Task[] = [];
  for (const item of value) {
    const task = parseTask(item);
    if (!task || ids.has(task.id)) return null;
    ids.add(task.id);
    tasks.push(task);
  }
  return tasks;
}
