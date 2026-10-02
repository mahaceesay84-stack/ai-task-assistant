import { NextResponse } from "next/server";
import { summarizeProgress } from "@/lib/ai/agent";
import { readAiJson } from "@/lib/ai/gateway";
import { isValidDateOnly, parseAiTasks } from "@/lib/ai/validate";

export async function POST(req: Request) {
  const parsed = await readAiJson(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value as { tasks?: unknown; today?: unknown } | null;
  const tasks = parseAiTasks(body?.tasks);
  if (!tasks) return NextResponse.json({ error: "invalid tasks" }, { status: 400 });
  const today = typeof body?.today === "string" && isValidDateOnly(body.today) ? body.today : undefined;
  return NextResponse.json(await summarizeProgress(tasks, today));
}
