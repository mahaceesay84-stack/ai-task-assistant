# AI Task Assistant

Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 task manager with an AI agent that:

- **Breaks down** a task into actionable sub-tasks with a suggested priority
- **Prioritizes** open tasks by deadline and importance
- **Summarizes** progress

Tasks are CRUD-able (create, edit, delete, complete) and persisted in `localStorage`.

## Architecture

- `src/app/api/ai/{breakdown,prioritize,summary}` – thin route handlers
- `src/lib/ai/agent.ts` – agent logic (prompting, response validation, fallback)
- `src/lib/ai/llm.ts` – LLM client for the GitHub Models / Copilot gateway (OpenAI-compatible)
- `src/lib/ai/heuristics.ts` – deterministic fallback so the app works without a key
- `src/components`, `src/hooks` – UI and state

## Run

```bash
npm install
cp .env.example .env.local   # optional: add GITHUB_TOKEN to enable the LLM
npm run dev
npm run lint && npm run typecheck && npm run build
```

Without `GITHUB_TOKEN` the AI features use the heuristic fallback (UI labels which was used).

## Deploy

Import the repo in Vercel (zero config) and set `GITHUB_TOKEN` (needs `models:read`).
