import { NextResponse } from "next/server";
import { prioritizeTasks } from "@/lib/ai/agent";
import { parseTasks } from "@/lib/ai/validate";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { tasks?: unknown } | null;
  const tasks = parseTasks(body?.tasks);
  if (!tasks) return NextResponse.json({ error: "invalid tasks" }, { status: 400 });
  return NextResponse.json(await prioritizeTasks(tasks));
}
