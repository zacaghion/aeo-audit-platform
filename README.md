# AEO Audit Platform

Answer Engine Optimization audit platform for any consumer-facing business. Analyze how AI engines (ChatGPT, Claude, Gemini, DeepSeek, Perplexity, Grok) represent your brand, benchmark against competitors, and get hyper-actionable recommendations to improve AI visibility.

**Live:** [aeo-audit-platform-production.up.railway.app](https://aeo-audit-platform-production.up.railway.app)

## Features

- **Multi-provider audits** — Query 100 prompts across up to 6 AI providers in parallel (~7 min)
- **LLM-generated prompts** — Claude generates natural, varied prompts tailored to your business type
- **Website auto-populate** — Enter a URL and Claude researches the company automatically
- **Competitive benchmarking** — Automatic light audits (25 prompts, 2 providers) on each competitor with ranking
- **LLM-powered analysis** — Two-stage Claude analysis producing natural-language narratives for visibility, sentiment, competitive positioning, and content gaps
- **Hyper-actionable recommendations** — Specific page URLs, draft copy, step-by-step instructions, and impact/effort ratings
- **Branded URLs** — Human-readable audit URLs like `/audits/appsflyer-03-10-2026`
- **7 business-type presets** — Hotel, Restaurant, SaaS, Retail, Clinic, Fitness, Other with 400+ prompt templates
- **Encrypted API keys** — AES-256-GCM encryption, no `.env` files needed

## Quick Start

```bash
git clone <repo-url>
cd aeo-audit-platform
docker compose up
```

Open [http://localhost:3000](http://localhost:3000).

## Running an Audit

1. Go to **Settings** → configure API keys for providers you want to query
2. Go to **New Audit** → enter website URL, click Auto-fill, select providers
3. Click **Start Audit** — results stream in real-time via SSE

### API Keys

| Provider | Model | Get Key | Cost (~100 prompts) |
|----------|-------|---------|-------------------|
| ChatGPT (OpenAI) | gpt-4o | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | ~$0.60 |
| Claude (Anthropic) | claude-sonnet-4-20250514 | [console.anthropic.com](https://console.anthropic.com/settings/keys) | ~$0.90 |
| Gemini (Google) | gemini-2.5-pro | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | ~$3.50 |
| DeepSeek | deepseek-chat | [platform.deepseek.com](https://platform.deepseek.com/api_keys) | ~$0.07 |
| Perplexity | sonar-pro | [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) | ~$0.50 |
| Grok (xAI) | grok-2 | [console.x.ai](https://console.x.ai) | ~$0.60 |

Additional Claude keys for analysis and recommendations can be configured in Settings.

## Audit Detail Sections

| Section | Description |
|---------|-------------|
| **Overview** | Category x provider heatmap, coverage radar, visibility bars, competitor mentions |
| **Visibility** | Score ring, provider/category breakdowns, strongest/weakest queries |
| **Sentiment** | Stacked sentiment bars by provider, positive/negative/gap theme tags |
| **Competitive** | Share of voice, competitor table with threat levels, advantages/disadvantages |
| **Benchmark** | Multi-metric radar comparing brand vs competitors across visibility/mention/sentiment |
| **Improve** | Actionable recommendations with specific URLs, before/after copy, numbered steps |
| **Raw Data** | Filterable table of all prompt/response pairs with expandable rows |

## Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Recharts
- **Backend:** Next.js API routes, Prisma ORM
- **Database:** PostgreSQL
- **Queue:** BullMQ + Redis
- **Export:** SheetJS (xlsx)
- **AI:** Claude (prompt generation, analysis, recommendations), 6 query providers
- **Deployment:** Docker Compose (local) / Railway (production)

## Architecture

```
Audit Runner Pipeline:
  Phase 1: Generate prompts (Claude LLM → fallback to templates)
  Phase 2: Query providers in parallel (per-provider concurrency limits + 429 retry)
  Phase 3: Analyze responses (heuristic stats + Claude narrative analysis + Claude recommendations)
  Phase 4: Benchmark competitors (25-prompt light audits per competitor)
```

Provider concurrency limits: ChatGPT/DeepSeek/Grok: 10, Gemini/Claude: 5, Perplexity: 3.
