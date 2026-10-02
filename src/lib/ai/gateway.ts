import { NextResponse } from "next/server";

const MAX_BODY_BYTES = 32 * 1024;
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const MAX_BUCKETS = 1_024;
const buckets = new Map<string, { count: number; resetAt: number }>();

type JsonResult =
  | { ok: true; value: unknown }
  | { ok: false; response: NextResponse };

function clientKey(req: Request): string {
  return req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
}

function pruneBuckets(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function reserveBucket(key: string, now: number): { count: number; resetAt: number } {
  pruneBuckets(now);
  const existing = buckets.get(key);
  if (existing) return existing;
  if (buckets.size >= MAX_BUCKETS) {
    let oldestKey: string | undefined;
    let oldestReset = Infinity;
    for (const [candidateKey, bucket] of buckets) {
      if (bucket.resetAt < oldestReset) {
        oldestKey = candidateKey;
        oldestReset = bucket.resetAt;
      }
    }
    if (oldestKey) buckets.delete(oldestKey);
  }
  const bucket = { count: 0, resetAt: now + WINDOW_MS };
  buckets.set(key, bucket);
  return bucket;
}

function rateLimitResponse(req: Request): NextResponse | null {
  const now = Date.now();
  const key = clientKey(req);
  const bucket = reserveBucket(key, now);
  if (bucket.count >= MAX_REQUESTS) {
    return NextResponse.json(
      { error: "rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((bucket.resetAt - now) / 1000)) } },
    );
  }
  bucket.count += 1;
  return null;
}

function tooLargeResponse(): NextResponse {
  return NextResponse.json({ error: "request too large" }, { status: 413 });
}

export async function readAiJson(req: Request): Promise<JsonResult> {
  const limited = rateLimitResponse(req);
  if (limited) return { ok: false, response: limited };

  const declaredLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return { ok: false, response: tooLargeResponse() };
  }

  if (!req.body) {
    return { ok: false, response: NextResponse.json({ error: "invalid JSON" }, { status: 400 }) };
  }

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, response: tooLargeResponse() };
      }
      chunks.push(chunk.value);
    }
  } catch {
    return { ok: false, response: NextResponse.json({ error: "invalid request body" }, { status: 400 }) };
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { ok: false, response: NextResponse.json({ error: "invalid JSON" }, { status: 400 }) };
  }
}
