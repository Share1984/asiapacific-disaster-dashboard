<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent guide — Asia Pacific EM-DAT Dashboard

## Before making changes

1. Read **[BASELINE.md](./BASELINE.md)** — authoritative spec for data rules, filters, metrics, charts, trend lines, and deployment.
2. Prefer minimal, focused diffs that match existing patterns in `components/` and `lib/`.
3. Do not commit unless the user asks.

## Project summary

Static Next.js dashboard over EM-DAT disaster records for ESCAP Asia-Pacific. Data is parsed from `Emdat-asia pacific.xlsx` into `data/disasters.json` at build time.

**Live URL:** https://asiapacific-disaster-dashboard--emdatdashboard.us-east4.hosted.app/

## Key files

| Path | Role |
|------|------|
| `BASELINE.md` | Product and technical baseline (update when behaviour changes) |
| `scripts/parse-emdat.ts` | Excel → JSON parser |
| `lib/types.ts` | `DisasterRecord`, `DashboardFilters`, chart types |
| `lib/aggregations.ts` | `applyFilters`, totals, classification options, pie distribution |
| `lib/trend.ts` | Linear regression; `TREND_MAX_YEAR = 2025` |
| `lib/escap-regions.ts` | Country → ESCAP subregion |
| `components/Dashboard.tsx` | Filter state and layout |
| `components/FilterBar.tsx` | Group + Type filters; advanced Subgroup + Subtype |
| `components/MetricCards.tsx` | Asia-Pacific / subregion / country metrics |
| `components/LineChartWidget.tsx` | Frequency over time + trend |
| `components/BarChartWidget.tsx` | Yearly deaths/affected/damage + trend |
| `components/PieChartWidget.tsx` | Event share vs impact share |

## Data and filters

- Four EM-DAT fields: `disasterGroup`, `disasterSubgroup`, `disasterType`, `disasterSubtype`
- **Main UI:** Group → Type (cascading)
- **Advanced expander:** Subgroup → Subtype (cascading)
- All widgets use `applyFilters()` from `lib/aggregations.ts`
- Null impact values are excluded from sums, not treated as zero

## Trend lines

- Only line chart and bar chart
- Regression uses years ≤ `TREND_MAX_YEAR` (2025); 2026 excluded from fit and trend display
- Actual data for 2026 may still appear on charts

## Commands

```bash
npm run parse-data   # Regenerate disasters.json
npm run dev
npm run lint
npm run build
```

## Deployment

Push to `main` → Firebase App Hosting auto-deploy. Repo: `Share1984/asiapacific-disaster-dashboard`.
