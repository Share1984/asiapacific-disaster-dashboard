# Asia Pacific Em-dat Dashboard — Baseline Document

**Version:** 1.1  
**Last updated:** June 24, 2026  
**Purpose:** Reference baseline for dashboard scope, data rules, UI behaviour, and implementation. Use this document to restore or compare against the agreed functionality.

---

## 1. Overview

| Item | Value |
|------|-------|
| **Title** | Asia Pacific Em-dat dashboard |
| **Subtitle** | Interactive disaster data for the Asia-Pacific region (1970–2026) |
| **Theme** | Light (slate background, white cards) |
| **Stack** | Next.js 16 (App Router), React 19, Tailwind CSS v4, Recharts 3, TypeScript |
| **Data source** | EM-DAT export (`Emdat-asia pacific.xlsx`) |
| **Runtime data** | Static JSON (`data/disasters.json`) generated at build time |
| **Live URL** | https://asiapacific-disaster-dashboard--emdatdashboard.us-east4.hosted.app/ |
| **GitHub** | https://github.com/Share1984/asiapacific-disaster-dashboard |
| **Firebase project** | `emdatdashboard` (App Hosting, Blaze plan) |

---

## 2. Data pipeline

### 2.1 Source file

- **Path:** `Emdat-asia pacific.xlsx` (project root)
- **Format:** Excel, sheet `Sheet1`
- **Baseline record count:** 5,273 disaster events (0 skipped at parse time)

### 2.2 Parse script

- **Script:** `scripts/parse-emdat.ts`
- **Command:** `npm run parse-data`
- **Output:** `data/disasters.json`
- **Build hook:** `prebuild` runs `parse-data` automatically before `npm run build`

### 2.3 Columns read from source

| Source column | JSON field | Notes |
|---------------|------------|-------|
| `Disaster Group` | `disasterGroup` | e.g. Natural, Technological |
| `Disaster Type` | `disasterType` | e.g. Flood, Earthquake |
| `Country` | `country` | Normalized (see §3.1) |
| `Start Year` | `year` | Integer |
| `Total Deaths` | `totalDeaths` | `null` if blank |
| `Total Affected` | `totalAffected` | `null` if blank |
| `Total Damage, Adjusted ('000 US$)` | `totalDamageAdjusted` | `null` if blank; exact punctuation required |

### 2.4 Derived field

- **`escapSubregion`** — assigned at parse time from country via `lib/escap-regions.ts`

### 2.5 JSON record shape

```typescript
interface DisasterRecord {
  disasterGroup: string;
  disasterType: string;
  country: string;
  year: number;
  totalDeaths: number | null;
  totalAffected: number | null;
  totalDamageAdjusted: number | null;
  escapSubregion: EscapSubregion;
}
```

### 2.6 Baseline dataset summary

| Attribute | Value |
|-----------|-------|
| Total records | 5,273 |
| Disaster groups | Natural, Technological |
| Disaster types | 22 |
| Countries (after normalization) | 47 |
| Actual year range in data | 2000 – 2026 |
| Filter year range (UI) | 1970 – 2026 |

---

## 3. Data transformation rules

### 3.1 China normalization

The following source country values are merged into **`China`**:

- `China`
- `China, Hong Kong Special Administrative Region`
- `China, Macao Special Administrative Region`
- `Taiwan (Province of China)`

Implementation: `lib/china-normalize.ts`

### 3.2 Missing values

- Blank cells in numeric columns → stored as `null`
- **`null` values are excluded from sums** (not treated as zero)

### 3.3 Russian Federation subregion

- **Counted only in East and Northeast Asia (ENEA)**
- Not included in North and Central Asia (NCA), even though Russia appears in the ESCAP NCA member list

### 3.4 ESCAP subregions

Five subregions with short codes used in the UI:

| Code | Full name |
|------|-----------|
| NCA | North and Central Asia |
| SSWA | South and South West Asia |
| Pacific | Pacific |
| ENEA | East and Northeast Asia |
| SEA | Southeast Asia |

**Country → subregion mapping** (baseline, as implemented in `lib/escap-regions.ts`):

**North and Central Asia:** Armenia, Azerbaijan, Georgia, Kazakhstan, Kyrgyzstan, Tajikistan, Turkmenistan, Uzbekistan

**South and South West Asia:** Afghanistan, Bangladesh, Bhutan, India, Iran (Islamic Republic of), Maldives, Nepal, Pakistan, Sri Lanka, Türkiye

**Pacific:** American Samoa, Australia, Cook Islands, Fiji, Kiribati, Marshall Islands, Micronesia (Federated States of), Northern Mariana Islands, Papua New Guinea, Samoa, Solomon Islands, Tuvalu, Vanuatu

**East and Northeast Asia:** China, Democratic People's Republic of Korea, Japan, Mongolia, Republic of Korea, Russian Federation

**Southeast Asia:** Brunei Darussalam, Cambodia, Indonesia, Lao People's Democratic Republic, Malaysia, Myanmar, Philippines, Singapore, Thailand, Timor-Leste, Viet Nam

> Note: Only countries present in the source file appear in the dashboard. The mapping includes members not currently in the dataset (e.g. Brunei Darussalam).

---

## 4. Filter model

Filters are split into two layers.

### 4.1 Layer A — global (always applies to all widgets)

| Filter | Control | Default | Behaviour |
|--------|---------|---------|-----------|
| Year range | Dual range sliders (From / To) | 1970 – 2026 | Both sliders constrain `yearMin` and `yearMax` |
| Disaster Group | Single-select dropdown | **Natural** | Options: All groups + values from data |
| Disaster Type | Single-select dropdown | All types | Options: All types + values from data |

### 4.2 Layer B — geography (mutually exclusive scope)

Single-select scope; geography filters do **not** stack with each other.

| Scope | Control | Behaviour |
|-------|---------|-----------|
| **All Asia-Pacific** | Button (default) | No geography restriction; clears subregion and country |
| **Subregion** | Button + subregion dropdown | Filters to selected ESCAP subregion |
| **Country** | Button + country dropdown | Filters to selected country; subregion auto-fills (read-only display) |

**Rules:**
- Selecting a **country** sets scope to `country` and auto-updates subregion
- Selecting **subregion** clears country selection
- Selecting **All Asia-Pacific** clears subregion and country
- All filter controls are **single-select** (no multi-select)

### 4.3 Default filter state

```typescript
{
  yearMin: 1970,
  yearMax: 2026,
  disasterGroup: "Natural",
  disasterType: "All",
  scope: "all",
  subregion: "",
  country: "",
}
```

---

## 5. Key metric cards

Component: `components/MetricCards.tsx`

### 5.1 Tab layout

| Tab | Content |
|-----|---------|
| **Asia-Pacific** | 4 summary cards for the filtered dataset |
| **By subregion** | Table with 5 subregion rows × 4 metrics |

### 5.2 Metrics displayed

1. **Total Disasters** — count of filtered records  
2. **Total Deaths** — sum of `totalDeaths` (nulls excluded)  
3. **Total Affected** — sum of `totalAffected` (nulls excluded)  
4. **Total Damage, Adjusted ('000 US$)** — sum of `totalDamageAdjusted` (nulls excluded)

All metrics respect Layer A + Layer B filters.

---

## 6. Charts

All charts respect global filters (year, disaster group, disaster type, geography scope). Each chart may have additional local controls.

### 6.1 Line chart — disaster frequency over time

**Component:** `components/LineChartWidget.tsx`

| Feature | Behaviour |
|---------|-----------|
| Chart type | Line chart (Recharts) |
| Y-axis | Disaster count per year |
| X-axis | Year |
| View modes | Asia-Pacific / Subregion / Country (single view at a time) |
| Subregion picker | Shown when view mode = Subregion |
| Country picker | Shown when view mode = Country |
| **Compare subregions** | Checkbox; overlays all 5 subregion lines on one chart |
| Trend lines | Linear regression (least squares), dashed overlay |

**Trend line behaviour:**
- Single view: dashed gray **Trend** line alongside data line
- Compare subregions: dashed trend line per subregion (matching subregion colour)

**Local controls** (independent of geography filter scope for view selection; still uses global filters for data):

- Compare subregions toggle
- View mode dropdown (hidden when compare is on)
- Subregion / country dropdown (contextual)

### 6.2 Bar chart — metric by year

**Component:** `components/BarChartWidget.tsx`

| Feature | Behaviour |
|---------|-----------|
| Chart type | ComposedChart (bars + trend line) |
| X-axis | Year |
| Y-axis | Selected metric value |
| Metric selector | Single-select: Total Deaths / Total Affected / Total Damage, Adjusted |
| Geography | Follows global geography scope |
| All Asia-Pacific scope | One bar per year for the whole region |
| Trend line | Amber dashed linear regression overlay |

### 6.3 Pie chart — disaster type distribution

**Component:** `components/PieChartWidget.tsx`

| Feature | Behaviour |
|---------|-----------|
| Chart type | Pie chart |
| Scope | Follows global geography scope |
| Grouping | Top **5** disaster types + **Other** |
| Labels | Type name + percentage |
| Trend lines | Not applicable |

---

## 7. Trend line implementation

**Module:** `lib/trend.ts`

- Method: **Ordinary least-squares linear regression** on (year, value) pairs
- Applied to: line chart and bar chart only
- Visual style: `strokeDasharray="6 4"`, no dots on trend lines
- Line chart trend colour: `#64748b` (single view); subregion colour (compare mode)
- Bar chart trend colour: `#f59e0b` (amber)

---

## 8. UI / UX baseline

| Aspect | Specification |
|--------|---------------|
| Theme | Light — `bg-slate-50` page, white cards, slate text |
| Layout | Max width `7xl`, responsive grid |
| Typography | Geist Sans (via `next/font`) |
| Card style | Rounded xl, border `slate-200`, light shadow |
| Accent colour | Sky blue (`#0284c7`) for primary data series |
| Page structure | Header → Filters → Metrics → Line chart → Bar + Pie (2-column on xl) |

---

## 9. Project structure

```
asiapacific-disaster-dashboard/
├── Emdat-asia pacific.xlsx          # Source data (~1.8 MB, committed)
├── BASELINE.md                      # This document
├── data/
│   └── disasters.json               # Generated JSON (~1.3 MB, committed; regenerated on build)
├── scripts/
│   └── parse-emdat.ts               # Excel → JSON parser
├── lib/
│   ├── types.ts                     # TypeScript interfaces
│   ├── escap-regions.ts             # Country → subregion mapping
│   ├── china-normalize.ts           # China territory rollup
│   ├── aggregations.ts              # Filter + sum + chart data helpers
│   ├── trend.ts                     # Linear regression trend lines
│   └── format.ts                    # Number/percentage formatting
├── components/
│   ├── Dashboard.tsx                # Main client shell + filter state
│   ├── FilterBar.tsx
│   ├── MetricCards.tsx
│   ├── LineChartWidget.tsx
│   ├── BarChartWidget.tsx
│   └── PieChartWidget.tsx
└── app/
    ├── page.tsx                     # Server page; imports JSON, renders Dashboard
    ├── layout.tsx                   # Root layout + metadata
    └── globals.css                  # Tailwind + light theme tokens
```

---

## 10. Commands

| Command | Purpose |
|---------|---------|
| `npm run parse-data` | Regenerate `data/disasters.json` from Excel |
| `npm run dev` | Start dev server (http://localhost:3000) |
| `npm run build` | Parse data + production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |

---

## 11. Dependencies (baseline)

**Runtime:**
- `next` 16.2.9
- `react` / `react-dom` 19.2.4
- `recharts` ^3.8.1
- `lucide-react` ^1.18.0

**Dev (data + tooling):**
- `xlsx` ^0.18.5 — Excel parsing
- `tsx` ^4.22.4 — run parse script
- `tailwindcss` ^4, `typescript` ^5

---

## 12. Known limitations / baseline caveats

1. **Year filter vs data:** UI allows 1970–2026, but baseline data only contains years **2000–2026**.
2. **Country coverage:** 47 countries after normalization; not all ESCAP member states appear in the source file.
3. **Pie chart:** No trend line (not meaningful for categorical distribution).
4. **SSR chart warnings:** Recharts may log width/height warnings during static generation; charts render correctly in the browser.
5. **Disaster type filter:** Shows all types from full dataset, not dynamically filtered by selected disaster group.
6. **Line chart view controls:** Geography view selectors on the line chart are independent of the global geography scope filter (both apply: global filter narrows data; local control chooses aggregation view).

---

## 13. Restoration checklist

To return to this baseline after changes:

- [ ] Source file present: `Emdat-asia pacific.xlsx`
- [ ] Run `npm run parse-data` → 5,273 records
- [ ] Default disaster group = Natural
- [ ] China territories rolled into China
- [ ] Russia mapped to ENEA only
- [ ] Metric tabs: Asia-Pacific | By subregion
- [ ] Line chart: compare subregions + trend lines
- [ ] Bar chart: metric toggle + yearly bars + trend line
- [ ] Pie chart: top 5 + Other with percentages
- [ ] Light theme, title "Asia Pacific Em-dat dashboard"
- [ ] `npm run build` and `npm run lint` pass with no TypeScript errors
- [ ] GitHub repo at `Share1984/asiapacific-disaster-dashboard`
- [ ] `git remote` points to `https://github.com/Share1984/asiapacific-disaster-dashboard.git`
- [ ] Firebase App Hosting deploy succeeds on Node 22
- [ ] Live URL loads: https://asiapacific-disaster-dashboard--emdatdashboard.us-east4.hosted.app/

---

## 14. Source control & deployment

| Item | Value |
|------|-------|
| **GitHub owner** | `Share1984` (transferred from `madusarkar-tech`) |
| **Repository** | https://github.com/Share1984/asiapacific-disaster-dashboard |
| **Default branch** | `main` |
| **Git remote** | `origin` → `https://github.com/Share1984/asiapacific-disaster-dashboard.git` |
| **Firebase project** | `emdatdashboard` |
| **Hosting** | Firebase **App Hosting** (requires **Blaze** plan) |
| **Region** | `us-east4` |
| **Deploy trigger** | Push to `main` via GitHub ↔ Firebase App Hosting |
| **Node version (Firebase)** | **22** |
| **Build command** | `npm run build` (runs `prebuild` → `parse-data`) |
| **Live URL** | https://asiapacific-disaster-dashboard--emdatdashboard.us-east4.hosted.app/ |

**Accounts:**
- **Share1984** — GitHub repo owner; connected to Firebase App Hosting for deploys
- **Firebase/Google** — `emdatdashboard` project admin via primary Google account (or IAM-granted access)

**Local git remote update** (if still pointing at old owner):

```bash
git remote set-url origin https://github.com/Share1984/asiapacific-disaster-dashboard.git
```

---

## 15. Change log

| Date | Version | Changes |
|------|---------|---------|
| 2026-06-15 | 1.0 | Initial baseline: full dashboard, static JSON pipeline, filters, metrics, three charts, trend lines on line + bar charts |
| 2026-06-24 | 1.1 | GitHub repo transferred to Share1984; Firebase App Hosting live on `emdatdashboard` (Blaze, Node 22, us-east4); deployment and live URL documented |
