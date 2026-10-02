"use client";
import { useState } from "react";
import type { Priority, Task } from "@/lib/types";
import { daysUntil } from "@/lib/ai/heuristics";
import TaskForm from "./TaskForm";

const badge: Record<Priority, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-emerald-100 text-emerald-700",
};

export default function TaskItem({
  task,
  onUpdate,
  onDelete,
  onBreakdown,
}: {
  task: Task;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onBreakdown: (task: Task) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const d = daysUntil(task.dueDate);
  const overdue = !task.done && d !== null && d < 0;

  if (editing) {
    return (
      <li className="rounded-xl border border-indigo-200 bg-white p-4 shadow-sm">
        <TaskForm
          initial={task}
          submitLabel="Save"
          onCancel={() => setEditing(false)}
          onSubmit={(draft) => {
            onUpdate(task.id, draft);
            setEditing(false);
          }}
        />
      </li>
    );
  }

  const doneSubs = task.subtasks.filter((s) => s.done).length;
  const aiLabel = task.aiSource === "llm" ? "LLM" : task.aiSource === "heuristic" ? "Heuristic" : null;
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <input type="checkbox" className="mt-1 size-5 accent-indigo-600" checked={task.done} onChange={(e) => onUpdate(task.id, { done: e.target.checked })} aria-label={`Mark "${task.title}" complete`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-medium ${task.done ? "text-slate-400 line-through" : ""}`}>{task.title}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge[task.priority]}`}>{task.priority}</span>
            {task.dueDate && <span className={`text-xs ${overdue ? "font-semibold text-red-600" : "text-slate-500"}`}>{overdue ? "Overdue · " : "Due "}{task.dueDate}</span>}
          </div>
          {task.notes && <p className="mt-1 text-sm text-slate-600">{task.notes}</p>}
          {aiLabel && <p className="mt-1 text-xs italic text-indigo-600">{aiLabel}{task.aiReason ? `: ${task.aiReason}` : ""}</p>}
          {task.subtasks.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-slate-500">Sub-tasks {doneSubs}/{task.subtasks.length}</p>
              <ul className="mt-1 space-y-1">
                {task.subtasks.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={s.done}
                      aria-label={s.title}
                      onChange={(e) => onUpdate(task.id, { subtasks: task.subtasks.map((x) => (x.id === s.id ? { ...x, done: e.target.checked } : x)) })}
                    />
                    <span className={s.done ? "text-slate-400 line-through" : ""}>{s.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-1 text-sm">
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onBreakdown(task);
              } finally {
                setBusy(false);
              }
            }}
            className="rounded px-2 py-1 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
          >
            {busy ? "…" : "✨ Break down"}
          </button>
          <button onClick={() => setEditing(true)} className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100">Edit</button>
          <button onClick={() => onDelete(task.id)} className="rounded px-2 py-1 text-red-600 hover:bg-red-50">Delete</button>
        </div>
      </div>
    </li>
  );
}
