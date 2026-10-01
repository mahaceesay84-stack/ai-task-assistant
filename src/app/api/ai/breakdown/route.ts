import { NextResponse } from "next/server";
import { breakdownTask } from "@/lib/ai/agent";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { title?: unknown; notes?: unknown; dueDate?: unknown; importance?: unknown } | null;
  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  const importance = typeof body.importance === "number" ? Math.min(5, Math.max(1, body.importance)) : 3;
  const result = await breakdownTask(
    body.title.slice(0, 200),
    typeof body.notes === "string" ? body.notes.slice(0, 2000) : "",
    typeof body.dueDate === "string" ? body.dueDate : null,
    importance,
  );
  return NextResponse.json(result);
}
