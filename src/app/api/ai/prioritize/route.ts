import { NextResponse } from "next/server";
import { prioritizeTasks } from "@/lib/ai/agent";
import { readAiJson } from "@/lib/ai/gateway";
import { parseTasks } from "@/lib/ai/validate";

export async function POST(req: Request) {
  const parsed = await readAiJson(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value as { tasks?: unknown } | null;
  const tasks = parseTasks(body?.tasks);
  if (!tasks) return NextResponse.json({ error: "invalid tasks" }, { status: 400 });
  return NextResponse.json(await prioritizeTasks(tasks));
}
