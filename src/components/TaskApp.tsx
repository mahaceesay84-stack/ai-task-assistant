"use client";
import { useMemo, useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { apiBreakdown, apiPrioritize } from "@/lib/api";
import { score } from "@/lib/ai/heuristics";
import type { Task } from "@/lib/types";
import SummaryPanel from "./SummaryPanel";
import TaskForm from "./TaskForm";
import TaskItem from "./TaskItem";

type Filter = "all" | "open" | "done";

export default function TaskApp() {
  const { tasks, loaded, add, update, remove, replaceAll } = useTasks();
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [prioBusy, setPrioBusy] = useState(false);

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
      update(task.id, (current) => ({
        subtasks: [...current.subtasks, ...toSubtasks(r.subtasks)],
        priority: r.priority,
        aiReason: r.reason,
        aiSource: r.source,
        aiRank: undefined,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI request failed");
    }
  };

  const prioritize = async () => {
    setError(null);
    setPrioBusy(true);
    try {
      const { items, source } = await apiPrioritize(tasks);
      const map = new Map(items.map((item, rank) => [item.id, { ...item, rank }] as const));
      replaceAll((current) => current.map((task) => {
        const item = map.get(task.id);
        return item
          ? { ...task, priority: item.priority, aiReason: item.reason, aiSource: source, aiRank: item.rank }
          : task;
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI request failed");
    } finally {
      setPrioBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">AI Task Assistant</h1>
        <p className="mt-1 text-slate-600">Create tasks, let the agent break them down, prioritize by deadline, and summarize progress.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">New task</h2>
        <TaskForm
          submitLabel="Add task"
          extra
          onSubmit={async (d, withAi) => {
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

      <SummaryPanel tasks={tasks} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1" role="tablist">
            {(["all", "open", "done"] as Filter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-sm capitalize ${filter === f ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>
                {f}
              </button>
            ))}
          </div>
          <button onClick={() => void prioritize()} disabled={prioBusy || tasks.every((t) => t.done)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
            {prioBusy ? "Prioritizing…" : "✨ AI prioritize"}
          </button>
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        {loaded && visible.length === 0 && <p className="py-8 text-center text-slate-500">No tasks here yet.</p>}
        <ul className="space-y-3">
          {visible.map((t) => (
            <TaskItem key={t.id} task={t} onUpdate={update} onDelete={remove} onBreakdown={breakdown} />
          ))}
        </ul>
      </section>
      <footer className="pt-4 text-center text-xs text-slate-400">Tasks are stored in your browser. Built with Next.js, React 19 &amp; Tailwind 4.</footer>
    </main>
  );
}
