# AEO Audit Platform

Answer Engine Optimization audit platform for hotels. Analyze how AI assistants (Claude, ChatGPT, Gemini, Perplexity, Grok) represent your hotel to travelers.

## Quick Start

```bash
git clone <repo-url>
cd aeo-audit-platform
docker compose up
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The app boots with a completed audit for **Ad Lib Hotel Bangkok** — 100 prompts queried across AI providers with full analysis and recommendations.

## Running New Audits

1. Go to **Settings** (`/settings`)
2. Configure API keys for the AI providers you want to query
3. Go to **New Audit** (`/audits/new`)
4. Enter hotel details and select providers
5. Click **Start Audit**

### API Key Links

| Provider | Get API Key |
|----------|------------|
| Claude (Anthropic) | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| ChatGPT (OpenAI) | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| Perplexity | [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) |
| Gemini (Google) | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| Grok (xAI) | [console.x.ai](https://console.x.ai) |

## Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Recharts
- **Backend:** Next.js API routes, Prisma ORM
- **Database:** PostgreSQL
- **Queue:** BullMQ + Redis
- **Export:** SheetJS (xlsx)
- **Deployment:** Docker Compose (zero-config)

## Architecture

All API keys are stored encrypted (AES-256-GCM) in the database. No environment variables or `.env` files needed beyond what's in `docker-compose.yml`.
