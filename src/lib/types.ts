export const MAX_TASKS = 200;
export const PRIORITIES = ["high", "medium", "low"] as const;

export type Priority = (typeof PRIORITIES)[number];

export function isPriority(value: unknown): value is Priority {
  return PRIORITIES.includes(value as Priority);
}

export interface SubTask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  dueDate: string | null; // YYYY-MM-DD
  priority: Priority;
  importance: number; // 1-5
  done: boolean;
  subtasks: SubTask[];
  aiReason?: string;
  aiSource?: AiSource;
  aiRank?: number;
  createdAt: number;
}

export function sameTaskSnapshot(current: Task[], snapshot: Task[]): boolean {
  return current.length === snapshot.length && current.every((task, index) => task === snapshot[index]);
}

export interface BreakdownResult {
  subtasks: string[];
  priority: Priority;
  reason: string;
  source: AiSource;
}

export interface PrioritizeItem {
  id: string;
  priority: Priority;
  reason: string;
}

export type AiSource = "llm" | "heuristic";
