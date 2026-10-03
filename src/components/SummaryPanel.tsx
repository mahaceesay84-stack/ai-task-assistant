"use client";
import { useRef, useState } from "react";
import { sameTaskSnapshot, type AiSource, type Task } from "@/lib/types";
import { apiSummary } from "@/lib/api";
import { daysUntil } from "@/lib/ai/heuristics";

function Ring({ pct }: { pct: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-20 shrink-0" role="progressbar" aria-label="Completion" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <svg viewBox="0 0 80 80" className="size-full -rotate-90">
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="6" className="stroke-slate-800" />
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="6" strokeLinecap="round" stroke="url(#ring)" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} className="transition-all duration-700" />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-lg font-semibold tabular-nums text-slate-100">{pct}%</span>
    </div>
  );
}

function Stat({ label, value, tone = "text-slate-100" }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

export default function SummaryPanel({ tasks, onSource }: { tasks: Task[]; onSource?: (s: AiSource) => void }) {
  const [text, setText] = useState<string | null>(null);
  const [source, setSource] = useState<AiSource | null>(null);
  const [summaryTasks, setSummaryTasks] = useState<Task[] | null>(null);
  const [busy, setBusy] = useState(false);
  const latestTasks = useRef(tasks);
  latestTasks.current = tasks;
  const [error, setError] = useState<string | null>(null);

  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const open = tasks.length - done;
  const overdue = tasks.filter((t) => {
    const d = daysUntil(t.dueDate);
    return !t.done && d !== null && d < 0;
  }).length;
  const high = tasks.filter((t) => !t.done && t.priority === "high").length;
  const weekAgo = Date.now() - 7 * 86_400_000;
  const velocity = tasks.filter((t) => t.done && t.createdAt >= weekAgo).length;

  const run = async () => {
    const snapshot = tasks;
    setBusy(true);
    setError(null);
    try {
      const r = await apiSummary(snapshot);
      if (!sameTaskSnapshot(latestTasks.current, snapshot)) return;
      setText(r.summary);
      setSource(r.source);
      onSource?.(r.source);
      setSummaryTasks(snapshot);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass rounded-2xl border border-slate-800/80 p-5 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Mission metrics</h2>
        <span className="text-xs tabular-nums text-slate-500">{done}/{tasks.length} done</span>
      </div>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <Ring pct={pct} />
        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Open" value={open} />
          <Stat label="High priority" value={high} tone={high ? "text-rose-300" : undefined} />
          <Stat label="Overdue" value={overdue} tone={overdue ? "text-amber-300" : undefined} />
          <Stat label="Velocity · 7d" value={velocity} tone="text-emerald-300" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button onClick={() => void run()} disabled={busy} className="glow-btn rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50 disabled:shadow-none">
          {busy ? "Summarizing…" : "✨ Generate AI briefing"}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/10 p-2 text-sm text-rose-300">{error}</p>}
      {text && summaryTasks && sameTaskSnapshot(tasks, summaryTasks) && (
        <div className="fade-up mt-4 rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 p-4">
          <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
            <span aria-hidden>⚡</span> AI briefing
          </p>
          <p className="text-sm leading-relaxed text-slate-200">{text}</p>
          <p className="mt-3 text-xs text-slate-500">{source === "llm" ? "Generated by GitHub Models LLM" : "Generated by built-in heuristics (set GITHUB_TOKEN for LLM)"}</p>
        </div>
      )}
    </section>
  );
}
