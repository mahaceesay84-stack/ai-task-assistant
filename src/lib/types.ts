export type Priority = "high" | "medium" | "low";

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
