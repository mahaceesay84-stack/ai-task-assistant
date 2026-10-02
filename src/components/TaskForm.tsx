"use client";
import { useState } from "react";
import type { Task } from "@/lib/types";

export interface TaskDraft {
  title: string;
  notes: string;
  dueDate: string | null;
  importance: number;
}

export default function TaskForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  extra,
  disabled,
}: {
  initial?: Pick<Task, "title" | "notes" | "dueDate" | "importance">;
  submitLabel: string;
  onSubmit: (d: TaskDraft, withAi: boolean) => void | Promise<void>;
  onCancel?: () => void;
  extra?: boolean;
  disabled?: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [due, setDue] = useState(initial?.dueDate ?? "");
  const [importance, setImportance] = useState(initial?.importance ?? 3);
  const [busy, setBusy] = useState(false);

  const submit = async (withAi: boolean) => {
    if (disabled || !title.trim()) return;
    setBusy(true);
    try {
      await onSubmit({ title: title.trim(), notes: notes.trim(), dueDate: due || null, importance }, withAi);
      if (!initial) {
        setTitle("");
        setNotes("");
        setDue("");
        setImportance(3);
      }
    } finally {
      setBusy(false);
    }
  };

  const input = "w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 transition focus:border-indigo-500/70 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(false);
      }}
    >
      <input className={input} placeholder="What needs to be done?" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" maxLength={200} required />
      <textarea className={input} placeholder="Notes (optional)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Notes" maxLength={2000} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-medium text-slate-400">
          Due date
          <input type="date" className={`${input} mt-1`} value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
        <label className="text-xs font-medium text-slate-400">
          Importance: {importance}/5
          <input type="range" min={1} max={5} value={importance} onChange={(e) => setImportance(Number(e.target.value))} className="mt-2 block accent-indigo-500" />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button disabled={disabled || busy} className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700 disabled:opacity-50">
          {submitLabel}
        </button>
        {extra && (
          <button type="button" disabled={disabled || busy || !title.trim()} onClick={() => void submit(true)} className="glow-btn rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50 disabled:shadow-none">
            {busy ? "Thinking…" : "✨ Add with AI breakdown"}
          </button>
        )}
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-800">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
