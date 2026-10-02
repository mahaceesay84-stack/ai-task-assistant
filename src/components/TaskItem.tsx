"use client";
import { useState } from "react";
import type { Priority, Task } from "@/lib/types";
import { daysUntil } from "@/lib/ai/heuristics";
import TaskForm from "./TaskForm";

const badge: Record<Priority, string> = {
  high: "bg-rose-500/10 text-rose-300 ring-rose-500/20",
  medium: "bg-amber-500/10 text-amber-300 ring-amber-500/20",
  low: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20",
};
const dot: Record<Priority, string> = {
  high: "bg-rose-400 shadow-[0_0_8px_2px_rgb(251_113_133/0.6)]",
  medium: "bg-amber-400 shadow-[0_0_8px_2px_rgb(251_191_36/0.5)]",
  low: "bg-emerald-400 shadow-[0_0_8px_2px_rgb(52_211_153/0.5)]",
};

const ghost = "rounded-md px-2 py-1 text-xs font-medium transition disabled:opacity-50";

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
  const [showSubs, setShowSubs] = useState(true);
  const [showReason, setShowReason] = useState(false);
  const d = daysUntil(task.dueDate);
  const overdue = !task.done && d !== null && d < 0;

  if (editing) {
    return (
      <li className="glass rounded-xl border border-indigo-500/40 p-4 shadow-lg shadow-indigo-500/5">
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
  const subPct = task.subtasks.length ? Math.round((doneSubs / task.subtasks.length) * 100) : 0;
  const aiLabel = task.aiSource === "llm" ? "LLM" : task.aiSource === "heuristic" ? "Heuristic" : task.aiReason !== undefined ? "AI (source unknown)" : null;
  return (
    <li className={`fade-up glass group rounded-xl border border-slate-800/80 p-4 transition hover:border-slate-700 ${task.done ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <input type="checkbox" className="mt-1 size-4 shrink-0 cursor-pointer accent-indigo-500" checked={task.done} onChange={(e) => onUpdate(task.id, { done: e.target.checked })} aria-label={`Mark "${task.title}" complete`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span aria-hidden className={`size-2 rounded-full ${dot[task.priority]}`} />
            <span className={`font-medium ${task.done ? "text-slate-500 line-through" : "text-slate-100"}`}>{task.title}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset ${badge[task.priority]}`}>{task.priority}</span>
            {task.aiRank !== undefined && !task.done && (
              <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-300 ring-1 ring-inset ring-indigo-500/30">⚡ AI Ranked #{task.aiRank + 1}</span>
            )}
            {aiLabel && <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[11px] text-purple-300 ring-1 ring-inset ring-purple-500/20">{aiLabel}</span>}
            {task.dueDate && <span className={`text-xs tabular-nums ${overdue ? "font-semibold text-rose-400" : "text-slate-500"}`}>{overdue ? "Overdue · " : "Due "}{task.dueDate}</span>}
          </div>
          {task.notes && <p className="mt-1.5 text-sm text-slate-400">{task.notes}</p>}

          {task.aiReason && (
            <div className="mt-2 overflow-hidden rounded-lg border border-indigo-500/20 bg-indigo-500/5">
              <button onClick={() => setShowReason((v) => !v)} aria-expanded={showReason} className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs font-medium text-indigo-300 hover:bg-indigo-500/10">
                <span>🧠 AI reasoning</span>
                <span aria-hidden className={`transition-transform ${showReason ? "rotate-180" : ""}`}>▾</span>
              </button>
              {showReason && <p className="border-t border-indigo-500/10 px-3 py-2 text-sm leading-relaxed text-slate-300">{task.aiReason}</p>}
            </div>
          )}

          {task.subtasks.length > 0 && (
            <div className="mt-3">
              <button onClick={() => setShowSubs((v) => !v)} aria-expanded={showSubs} className="flex w-full items-center gap-3 text-xs text-slate-400 hover:text-slate-200">
                <span className="shrink-0">Sub-tasks {doneSubs}/{task.subtasks.length}</span>
                <span className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <span className="block h-full rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 transition-all duration-500" style={{ width: `${subPct}%` }} />
                </span>
                <span className="shrink-0 tabular-nums">{subPct}%</span>
                <span aria-hidden className={`transition-transform ${showSubs ? "rotate-180" : ""}`}>▾</span>
              </button>
              {showSubs && (
                <ul className="mt-2 space-y-1 border-l border-slate-800 pl-3">
                  {task.subtasks.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="accent-indigo-500"
                        checked={s.done}
                        aria-label={s.title}
                        onChange={(e) => onUpdate(task.id, { subtasks: task.subtasks.map((x) => (x.id === s.id ? { ...x, done: e.target.checked } : x)) })}
                      />
                      <span className={s.done ? "text-slate-600 line-through" : "text-slate-300"}>{s.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
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
            className={`${ghost} text-indigo-300 hover:bg-indigo-500/10`}
          >
            {busy ? "…" : "✨ Break down"}
          </button>
          <button onClick={() => setEditing(true)} className={`${ghost} text-slate-400 hover:bg-slate-800`}>Edit</button>
          <button onClick={() => onDelete(task.id)} className={`${ghost} text-rose-400 hover:bg-rose-500/10`}>Delete</button>
        </div>
      </div>
    </li>
  );
}
