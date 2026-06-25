# Asia Pacific EM-DAT Dashboard

Interactive disaster data dashboard for the ESCAP Asia-Pacific region, built from an EM-DAT export (2000–2026), with two separate AI features: **Ask APDR 2025** (report Q&A) and **Explain EM-DAT view** (filtered data summary).

**Live site:** https://asiapacific-disaster-dashboard--emdatdashboard.us-east4.hosted.app/

**Full specification:** see [BASELINE.md](./BASELINE.md) for data rules, filters, charts, AI features, rate limits, deployment, and restoration checklist.

## Features

- **Ask APDR 2025:** Structured Q&A over the 2025 Asia-Pacific Disaster Report (panel above filters; separate from EM-DAT charts)
- **Explain EM-DAT view:** AI summary of the current filtered disaster data (panel below filters; separate from the report Q&A)
- **AI quota:** 10 shared AI questions per day (UTC) on the live site; banner shows remaining count
- **Filters:** year range, disaster classification (Group + Type; advanced Subgroup + Subtype), ESCAP geography (region / subregion / country)
- **Key metrics:** total disasters, deaths, affected population, and adjusted damage — for Asia-Pacific, by subregion, and by country
- **Charts:** disaster frequency over time (with subregion compare), yearly impact bars, and pie chart (event share or impact share)
- **Trend lines:** linear regression on line and bar charts, fit through 2025 only (2026 excluded as partial-year data)

## Data pipeline

**EM-DAT** — source: `Emdat-asia pacific.xlsx` (project root)

```bash
npm run parse-data   # Excel → data/disasters.json
npm run build        # parse-data (prebuild) + production build
```

**APDR 2025** — source: `AsiaPacificDR/APDR2025.pdf`

```bash
npm run ingest-reports   # PDF → data/apdr2025-chunks.json
```

Re-run ingest when the PDF changes, then commit the updated chunks JSON.

## Development

```bash
npm install
npm run dev             # http://localhost:3000
npm run lint
npm run build
npm run start
```

Create `.env.local` (never commit):

```bash
ANTHROPIC_API_KEY=...
AI_RATE_LIMIT_DISABLED=true   # recommended for local dev
```

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Recharts 3 · TypeScript · Anthropic API · Firebase Admin (Firestore quota) · pdf-parse

## Deployment

Push to `main` on [GitHub](https://github.com/Share1984/asiapacific-disaster-dashboard) triggers Firebase App Hosting (`emdatdashboard`, `us-east4`, Node 22).

Production requires:
- **Secrets:** `ANTHROPIC_API_KEY`, `AI_BYPASS_TOKEN` (see `apphosting.yaml`)
- **Firestore** enabled with App Hosting service account granted **Cloud Datastore User**

See [BASELINE.md §14](./BASELINE.md#14-source-control--deployment).

## Project layout

```
app/              pages, layout, /api/ask, /api/explain, /api/quota
components/       Dashboard, ReportChat, EmdatExplain, filters, charts, useAiQuota
lib/              EM-DAT aggregations, view-snapshot, report + AI quota modules
scripts/          parse-emdat.ts, ingest-reports.ts
data/             disasters.json, apdr2025-chunks.json (generated)
AsiaPacificDR/    APDR PDF source (local)
apphosting.yaml   Firebase production secrets and env
```
