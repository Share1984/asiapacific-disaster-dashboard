# Asia Pacific EM-DAT Dashboard

Interactive disaster data dashboard for the ESCAP Asia-Pacific region, built from an EM-DAT export (2000–2026).

**Live site:** https://asiapacific-disaster-dashboard--emdatdashboard.us-east4.hosted.app/

**Full specification:** see [BASELINE.md](./BASELINE.md) for data rules, filter behaviour, charts, deployment, and restoration checklist.

## Features

- **Filters:** year range, disaster classification (Group + Type; advanced Subgroup + Subtype), ESCAP geography (region / subregion / country)
- **Key metrics:** total disasters, deaths, affected population, and adjusted damage — for Asia-Pacific, by subregion, and by country
- **Charts:** disaster frequency over time (with subregion compare), yearly impact bars, and pie chart (event share or impact share)
- **Trend lines:** linear regression on line and bar charts, fit through 2025 only (2026 excluded as partial-year data)

## Data pipeline

Source file: `Emdat-asia pacific.xlsx` (project root)

```bash
npm run parse-data   # Excel → data/disasters.json
npm run build        # parse-data (prebuild) + production build
```

The parse script reads disaster group, subgroup, type, and subtype plus country, year, and impact metrics. China territories are normalized; countries are mapped to ESCAP subregions at parse time.

## Development

```bash
npm install
npm run dev          # http://localhost:3000
npm run lint
npm run build
npm run start
```

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Recharts 3 · TypeScript

## Deployment

Push to `main` on [GitHub](https://github.com/Share1984/asiapacific-disaster-dashboard) triggers Firebase App Hosting (`emdatdashboard`, `us-east4`, Node 22). See [BASELINE.md §14](./BASELINE.md#14-source-control--deployment).

## Project layout

```
app/           Next.js pages and layout
components/    Dashboard, filters, metrics, charts
lib/           types, aggregations, trend, ESCAP regions, formatting
scripts/       parse-emdat.ts
data/          disasters.json (generated)
```
