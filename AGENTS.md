<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent guide — Asia Pacific EM-DAT Dashboard

## Before making changes

1. Read **[BASELINE.md](./BASELINE.md)** — authoritative spec for data rules, filters, metrics, charts, trend lines, APDR Q&A, EM-DAT explain, AI quota, and deployment.
2. Prefer minimal, focused diffs that match existing patterns in `components/` and `lib/`.
3. Do not commit unless the user asks.

## Project summary

Next.js dashboard over EM-DAT disaster records for ESCAP Asia-Pacific, with two separate AI features: **Ask APDR 2025** (report PDF) and **Explain EM-DAT view** (filtered chart data). Both share a **10 questions/day (UTC)** quota on production (Firestore). EM-DAT data is parsed from `Emdat-asia pacific.xlsx` into `data/disasters.json` at build time. APDR text is ingested from `AsiaPacificDR/APDR2025.pdf` into `data/apdr2025-chunks.json`.

**Live URL:** https://asiapacific-disaster-dashboard--emdatdashboard.us-east4.hosted.app/

## Key files

| Path | Role |
|------|------|
| `BASELINE.md` | Product and technical baseline (update when behaviour changes) |
| `apphosting.yaml` | Firebase secrets (`ANTHROPIC_API_KEY`, `AI_BYPASS_TOKEN`) + rate limit env |
| `scripts/parse-emdat.ts` | Excel → `disasters.json` |
| `scripts/ingest-reports.ts` | PDF → `apdr2025-chunks.json` |
| `lib/types.ts` | `DisasterRecord`, `DashboardFilters`, chart types |
| `lib/aggregations.ts` | `applyFilters`, totals, classification options, pie distribution |
| `lib/view-snapshot.ts` | Grounded EM-DAT stats for explain API |
| `lib/dashboard-explain.ts` | EM-DAT explain LLM prompt + parser |
| `lib/ai-rate-limit.ts` | Firestore quota consume/peek |
| `lib/ai-quota-http.ts` | Shared enforcement for AI API routes |
| `lib/trend.ts` | Linear regression; `TREND_MAX_YEAR = 2025` |
| `lib/escap-regions.ts` | Country → ESCAP subregion |
| `lib/report-ingest.ts` | Structural PDF chunking + metadata |
| `lib/report-search.ts` | Chunk retrieval for Q&A |
| `lib/report-interrogation.ts` | LLM prompt + structured answer parsing |
| `app/api/ask/route.ts` | Report interrogation API |
| `app/api/explain/route.ts` | EM-DAT view explain API |
| `app/api/quota/route.ts` | AI quota peek (GET) |
| `components/Dashboard.tsx` | Filter state, layout, shared quota |
| `components/ReportChat.tsx` | Ask APDR 2025 panel (expander, Clear) |
| `components/EmdatExplain.tsx` | Explain EM-DAT view panel |
| `components/useAiQuota.tsx` | Quota fetch + banner |
| `components/FilterBar.tsx` | Group + Type filters; advanced Subgroup + Subtype |
| `components/MetricCards.tsx` | Asia-Pacific / subregion / country metrics |
| `components/LineChartWidget.tsx` | Frequency over time + trend |
| `components/BarChartWidget.tsx` | Yearly deaths/affected/damage + trend |
| `components/PieChartWidget.tsx` | Event share vs impact share |

## Data and filters

- Four EM-DAT fields: `disasterGroup`, `disasterSubgroup`, `disasterType`, `disasterSubtype`
- **Main UI:** Group → Type (cascading)
- **Advanced expander:** Subgroup → Subtype (cascading)
- All EM-DAT widgets use `applyFilters()` from `lib/aggregations.ts`
- Null impact values are excluded from sums, not treated as zero

## APDR 2025 Q&A

- **UI:** `ReportChat` above filters; collapsible; Clear resets question + answer + error
- **API:** `POST /api/ask` with `{ question, context? }`; uses retrieved chunks only
- **Not EM-DAT:** Do not conflate report answers with chart statistics

## Explain EM-DAT view

- **UI:** `EmdatExplain` below filters; collapsed by default; Explain this view + Clear
- **API:** `POST /api/explain` with `{ filters, question? }`; uses `ViewSnapshot` only
- **Not APDR:** Do not use report excerpts in explain responses

## AI quota (production)

- **Limit:** 10/day UTC shared across `/api/ask` and `/api/explain`
- **Storage:** Firestore `ai_quota` collection
- **UI:** Banner via `GET /api/quota` + `useAiQuota.tsx`
- **Bypass:** `AI_BYPASS_TOKEN` secret; client sends `x-ai-bypass` from `localStorage.ai_bypass_token`
- **Local:** `AI_RATE_LIMIT_DISABLED=true` in `.env.local` (recommended)

## Secrets

- **Local:** `ANTHROPIC_API_KEY` in `.env.local` (never commit)
- **Production:** `ANTHROPIC_API_KEY`, `AI_BYPASS_TOKEN` in Secret Manager via `apphosting.yaml`

## Trend lines

- Only line chart and bar chart
- Regression uses years ≤ `TREND_MAX_YEAR` (2025); 2026 excluded from fit and trend display
- Actual data for 2026 may still appear on charts

## Commands

```bash
npm run parse-data      # Regenerate disasters.json
npm run ingest-reports  # Regenerate apdr2025-chunks.json
npm run dev
npm run lint
npm run build
```

## Deployment

Push to `main` → Firebase App Hosting auto-deploy. Repo: `Share1984/asiapacific-disaster-dashboard`.

Production requires:
- `ANTHROPIC_API_KEY` and `AI_BYPASS_TOKEN` in Secret Manager (both referenced in `apphosting.yaml`)
- Firestore enabled + App Hosting service account with **Cloud Datastore User**

See [BASELINE.md §14](./BASELINE.md#14-source-control--deployment).
