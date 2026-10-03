"use client";
import { useEffect, useMemo, useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { apiBreakdown, apiPrioritize } from "@/lib/api";
import { score } from "@/lib/ai/heuristics";
import { MAX_TASKS, sameTaskSnapshot, type AiSource, type Task } from "@/lib/types";
import SummaryPanel from "./SummaryPanel";
import TaskForm from "./TaskForm";
import TaskItem from "./TaskItem";

type Filter = "all" | "open" | "done";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "done", label: "Completed" },
];
const TEMPLATES = [
  { title: "Sprint Planning", notes: "Define sprint goal, groom backlog, estimate and assign work.", importance: 4, icon: "🗓️" },
  { title: "Feature Architecture", notes: "Draft design doc: data model, API surface, rollout and risks.", importance: 5, icon: "🏗️" },
  { title: "Security Audit", notes: "Review auth, dependencies, secrets handling and input validation.", importance: 5, icon: "🛡️" },
];
const kbd = "rounded border border-slate-700 bg-slate-800/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-400";

export default function TaskApp() {
  const { tasks, loaded, storageError, add, update, updateWithAi, remove, replaceAll } = useTasks();
  const atTaskLimit = tasks.length >= MAX_TASKS;
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [prioBusy, setPrioBusy] = useState(false);
  const [provider, setProvider] = useState<AiSource | null>(null);

  const visible = useMemo(() => {
    const list = tasks.filter((t) => (filter === "all" ? true : filter === "done" ? t.done : !t.done));
    return [...list].sort((a, b) => {
      const rankA = a.aiRank ?? Number.MAX_SAFE_INTEGER;
      const rankB = b.aiRank ?? Number.MAX_SAFE_INTEGER;
      return Number(a.done) - Number(b.done) || rankA - rankB || score(b) - score(a);
    });
  }, [tasks, filter]);

  const toSubtasks = (titles: string[]) => titles.map((title) => ({ id: crypto.randomUUID(), title, done: false }));

  const breakdown = async (task: Task) => {
    setError(null);
    try {
      const r = await apiBreakdown(task);
      updateWithAi(task.id, task, (current) => ({
        subtasks: [...current.subtasks, ...toSubtasks(r.subtasks)],
        priority: r.priority,
        aiReason: r.reason,
        aiSource: r.source,
        aiRank: undefined,
      }));
      setProvider(r.source);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI request failed");
    }
  };

  const prioritize = async () => {
    setError(null);
    setPrioBusy(true);
    try {
      const snapshot = tasks;
      const { items, source } = await apiPrioritize(snapshot);
      setProvider(source);
      const map = new Map(items.map((item, rank) => [item.id, { ...item, rank }] as const));
      replaceAll((current) => {
        if (!sameTaskSnapshot(current, snapshot)) return current;
        return current.map((task) => {
          const item = map.get(task.id);
          return item
            ? { ...task, priority: item.priority, aiReason: item.reason, aiSource: source, aiRank: item.rank }
            : task;
        });
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI request failed");
    } finally {
      setPrioBusy(false);
    }
  };

  const canPrioritize = !prioBusy && !tasks.every((t) => t.done);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "p" && canPrioritize) {
        e.preventDefault();
        void prioritize();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const card = "glass rounded-2xl border border-slate-800/80 p-5 shadow-xl shadow-black/20";
  const providerLabel = provider === "llm" ? "GitHub Models" : provider === "heuristic" ? "Heuristic Engine" : "Awaiting first run";
  const providerDot = provider === "llm" ? "bg-emerald-400" : provider === "heuristic" ? "bg-amber-400" : "bg-slate-500";

  return (
    <>
    <header className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-sm shadow-lg shadow-indigo-500/30" aria-hidden>⚡</div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-100">AI Task Assistant</h1>
            <p className="text-[11px] text-slate-500">Agentic command center</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-300">
            <span className="relative flex size-2">
              <span className="pulse-ring absolute inline-flex size-full rounded-full bg-emerald-400" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            Agent live
          </span>
          <span className="hidden rounded-full border border-slate-800 bg-slate-900/60 px-2.5 py-1 font-mono text-slate-400 sm:inline">{tasks.length}/{MAX_TASKS} tasks</span>
          <span className="hidden rounded-full border border-slate-800 bg-slate-900/60 px-2.5 py-1 font-mono text-slate-400 md:inline">Next 16 · React 19</span>
          <a href="https://github.com/mahaceesay84-stack/ai-task-assistant" target="_blank" rel="noreferrer" className="rounded-full border border-slate-800 bg-slate-900/60 px-2.5 py-1 font-medium text-slate-300 transition hover:border-slate-600 hover:text-white">GitHub ↗</a>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <h2 className="bg-gradient-to-r from-slate-50 to-slate-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent">Plan less. Ship more.</h2>
        <p className="mt-1 text-slate-400">Create tasks, let the agent break them down, prioritize by deadline, and summarize progress.</p>
        <p className="mt-2 text-xs text-slate-500">When an AI feature uses a model, task titles and notes are processed by the configured AI model provider. Without a GITHUB_TOKEN, built-in heuristics run locally. AI endpoints are rate limited per client; if you hit the limit, wait a moment and retry.</p>
      </div>

      <section className={`${card} border-indigo-500/20`} aria-label="AI command bar">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className={`size-2 rounded-full ${providerDot}`} aria-hidden />
            <span>Provider: <span className="font-medium text-slate-200">{providerLabel}</span></span>
            <span className="hidden text-slate-600 sm:inline">·</span>
            <span className="hidden text-slate-500 sm:inline">{provider ? "last response" : "GitHub Models with GITHUB_TOKEN, else local heuristics"}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1 sm:flex"><kbd className={kbd}>⌘/Ctrl</kbd><kbd className={kbd}>⇧</kbd><kbd className={kbd}>P</kbd></span>
            <button onClick={() => void prioritize()} disabled={!canPrioritize} className="glow-btn rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50 disabled:shadow-none">
              {prioBusy ? "Prioritizing…" : "✨ AI prioritize"}
            </button>
          </div>
        </div>
      </section>

      <section className={card}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">New task</h2>
        {atTaskLimit && <p role="status" className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-sm text-amber-300">Task limit reached ({MAX_TASKS} tasks). Delete a task before adding another.</p>}
        <TaskForm
          submitLabel="Add task"
          disabled={atTaskLimit}
          extra
          onSubmit={async (d, withAi) => {
            if (tasks.length >= MAX_TASKS) return;
            setError(null);
            if (!withAi) return void add(d);
            try {
              const r = await apiBreakdown(d);
              add({ ...d, priority: r.priority, aiReason: r.reason, aiSource: r.source, subtasks: toSubtasks(r.subtasks) });
            } catch (e) {
              add(d);
              setError(e instanceof Error ? e.message : "AI request failed");
            }
          }}
        />
      </section>

      <SummaryPanel tasks={tasks} onSource={setProvider} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex gap-1 rounded-full border border-slate-800 bg-slate-900/60 p-1" role="tablist" aria-label="Filter tasks">
            {FILTERS.map((f) => (
              <button key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)} className={`rounded-full px-3 py-1 text-sm transition-all duration-200 ${filter === f.id ? "bg-indigo-500/20 text-indigo-200 shadow-[0_0_12px_-2px_rgb(99_102_241/0.5)] ring-1 ring-indigo-500/40" : "text-slate-400 hover:text-slate-200"}`}>
                {f.label}
              </button>
            ))}
          </div>
          <span className="text-xs tabular-nums text-slate-500">{visible.length} shown</span>
        </div>
        {error && <p role="alert" className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2 text-sm text-rose-300">{error}</p>}
        {storageError && <p role="alert" className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2 text-sm text-rose-300">{storageError}</p>}
        {loaded && visible.length === 0 && (
          tasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center">
              <p className="font-medium text-slate-200">Your workspace is empty</p>
              <p className="mt-1 text-sm text-slate-500">Start from a template or add your first task above.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {TEMPLATES.map((t) => (
                  <button key={t.title} disabled={atTaskLimit} onClick={() => add({ title: t.title, notes: t.notes, dueDate: null, importance: t.importance })} className="glass rounded-xl border border-slate-800 p-4 text-left transition hover:border-indigo-500/40 hover:bg-indigo-500/5 disabled:opacity-50">
                    <span aria-hidden className="text-xl">{t.icon}</span>
                    <p className="mt-2 text-sm font-medium text-slate-100">{t.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{t.notes}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-slate-500">No tasks here yet.</p>
          )
        )}
        <ul className="space-y-3">
          {visible.map((t) => (
            <TaskItem key={t.id} task={t} onUpdate={update} onDelete={remove} onBreakdown={breakdown} />
          ))}
        </ul>
      </section>
      <footer className="pt-4 text-center text-xs text-slate-600">Tasks are stored in your browser. Built with Next.js, React 19 &amp; Tailwind 4.</footer>
    </main>
    </>
  );
}
