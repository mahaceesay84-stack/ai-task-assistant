/**
 * Minimal LLM client. Uses the GitHub Models API (GitHub Copilot's model
 * gateway, OpenAI-compatible) when GITHUB_TOKEN is set. Callers fall back to
 * heuristics when this returns null.
 */
const ENDPOINT = process.env.LLM_ENDPOINT ?? "https://models.github.ai/inference/chat/completions";
const MODEL = process.env.LLM_MODEL ?? "openai/gpt-4.1-mini";

export function llmAvailable(): boolean {
  return Boolean(process.env.GITHUB_TOKEN);
}

export async function chat(system: string, user: string, json: boolean): Promise<string | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 1200,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

export async function chatJson<T>(system: string, user: string): Promise<T | null> {
  const raw = await chat(system + " Respond with a single JSON object only.", user, true);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
