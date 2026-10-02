import { NextResponse } from "next/server";
import { breakdownTask } from "@/lib/ai/agent";
import { readAiJson } from "@/lib/ai/gateway";
import { isValidDateOnly } from "@/lib/ai/validate";

export async function POST(req: Request) {
  const parsed = await readAiJson(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value as { title?: unknown; notes?: unknown; dueDate?: unknown; importance?: unknown; today?: unknown } | null;
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 200) : "";
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const importance = typeof body?.importance === "number" && Number.isFinite(body.importance)
    ? Math.min(5, Math.max(1, Math.round(body.importance)))
    : 3;
  const dueDate = typeof body?.dueDate === "string" && isValidDateOnly(body.dueDate) ? body.dueDate : null;
  const result = await breakdownTask(
    title,
    typeof body?.notes === "string" ? body.notes.slice(0, 2000) : "",
    dueDate,
    importance,
    typeof body?.today === "string" && isValidDateOnly(body.today) ? body.today : undefined,
  );
  return NextResponse.json(result);
}
