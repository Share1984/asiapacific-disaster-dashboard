# Asia Pacific EM-DAT Dashboard

Interactive disaster data dashboard for the ESCAP Asia-Pacific region, built from an EM-DAT export (2000–2026), with **Ask APDR 2025** report interrogation powered by the Asia-Pacific Disaster Report 2025.

**Live site:** https://asiapacific-disaster-dashboard--emdatdashboard.us-east4.hosted.app/

**Full specification:** see [BASELINE.md](./BASELINE.md) for data rules, filter behaviour, charts, APDR Q&A, deployment, and restoration checklist.

## Features

- **Ask APDR 2025:** Structured Q&A over the 2025 Asia-Pacific Disaster Report (collapsible panel above filters; Clear button; cited interrogation answers separate from EM-DAT charts below)
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
# Create .env.local with ANTHROPIC_API_KEY=... for local report Q&A
npm run dev             # http://localhost:3000
npm run lint
npm run build
npm run start
```

Create `.env.local` with `ANTHROPIC_API_KEY` for local report Q&A (never commit this file).

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Recharts 3 · TypeScript · Anthropic API · pdf-parse

## Deployment

Push to `main` on [GitHub](https://github.com/Share1984/asiapacific-disaster-dashboard) triggers Firebase App Hosting (`emdatdashboard`, `us-east4`, Node 22). Production requires `ANTHROPIC_API_KEY` in Cloud Secret Manager (see `apphosting.yaml` and [BASELINE.md §14](./BASELINE.md#14-source-control--deployment)).

## Project layout

```
app/              Next.js pages, layout, /api/ask
components/       Dashboard, ReportChat, filters, metrics, charts
lib/              EM-DAT aggregations + report ingest/search/interrogation
scripts/          parse-emdat.ts, ingest-reports.ts
data/             disasters.json, apdr2025-chunks.json (generated)
AsiaPacificDR/    APDR PDF source (local)
apphosting.yaml   Firebase production secrets
```
