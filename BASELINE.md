# Asia Pacific Em-dat Dashboard — Baseline Document

**Version:** 1.4  
**Last updated:** June 25, 2026  
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
| **Report Q&A** | APDR 2025 interrogation via `/api/ask` (Anthropic); chunks in `data/apdr2025-chunks.json` |
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
| `Disaster Subgroup` | `disasterSubgroup` | e.g. Hydrological, Meteorological |
| `Disaster Type` | `disasterType` | e.g. Flood, Storm, Earthquake |
| `Disaster Subtype` | `disasterSubtype` | e.g. Riverine flood, Tropical cyclone |
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
  disasterSubgroup: string;
  disasterType: string;
  disasterSubtype: string;
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
| Disaster subgroups | 7 |
| Disaster types | 22 |
| Disaster subtypes | 46 |
| Countries (after normalization) | 47 |
| Actual year range in data | 2000 – 2026 |
| Filter year range (UI) | 1970 – 2026 |

### 2.7 EM-DAT classification hierarchy

Records follow the EM-DAT tree (all four levels stored and filterable):

```
Disaster Group → Disaster Subgroup → Disaster Type → Disaster Subtype
```

| Level | Count in dataset | Examples |
|-------|------------------|----------|
| Group | 2 | Natural, Technological |
| Subgroup | 7 | Hydrological, Meteorological, Industrial accident |
| Type | 22 | Flood, Storm, Chemical spill |
| Subtype | 46 | Riverine flood, Tropical cyclone, Ground movement |

For **Technological** disasters, type and subtype are typically 1:1. For **Natural** disasters, subtype is the most granular level.

### 2.8 APDR 2025 report pipeline (report Q&A)

Separate from EM-DAT. Powers the **Ask APDR 2025** panel only.

| Item | Value |
|------|-------|
| **Source PDF** | `AsiaPacificDR/APDR2025.pdf` (local; not required at runtime if chunks are committed) |
| **Ingest script** | `scripts/ingest-reports.ts` |
| **Command** | `npm run ingest-reports` |
| **Output** | `data/apdr2025-chunks.json` (committed; regenerate when PDF changes) |
| **Chunking** | Page-aware, paragraph-level, with metadata (`section`, `pageStart`/`pageEnd`, `chunkType`, `countries`, `hazards`, `facts[]`) |
| **Baseline chunk count** | 82 structured chunks (from ~288k characters extracted) |

**Chunk metadata** (`lib/report-types.ts`): each chunk includes `chunkType` (e.g. `executive_summary`, `projection`, `recommendation`), ESCAP geography tags, hazard tags, and optional verbatim `facts[]` extracted from sentences containing numbers.

**Retrieval** (`lib/report-search.ts`): keyword + intent scoring over chunk text and metadata; uses active dashboard filters (country, subregion, disaster type) as context; returns top 10 chunks; excludes `front_matter`.

**LLM** (`app/api/ask/route.ts`): Anthropic `claude-sonnet-4-6`; structured JSON interrogation response per `lib/report-interrogation.ts` (direct findings, key data, evidence strength, gaps, citations). Answers use **only** retrieved excerpts — not EM-DAT statistics.

**Secrets:**
- **Local:** `ANTHROPIC_API_KEY` in `.env.local` (never commit)
- **Production:** Cloud Secret Manager via `apphosting.yaml`; grant backend access with `firebase apphosting:secrets:grantaccess`

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

**Everyday filters** (always visible):

| Filter | Control | Default | Behaviour |
|--------|---------|---------|-----------|
| Year range | Dual range sliders (From / To) | 1970 – 2026 | Both sliders constrain `yearMin` and `yearMax` |
| Disaster Group | Single-select dropdown | **Natural** | Options: All groups + values from data |
| Disaster Type | Single-select dropdown | All types | Options: All types valid for selected group |

**Advanced classification** (collapsed expander):

| Filter | Control | Default | Behaviour |
|--------|---------|---------|-----------|
| Disaster Subgroup | Single-select dropdown | All subgroups | Options valid for selected group and type |
| Disaster Subtype | Single-select dropdown | All subtypes | Options valid for selected group, type, and subgroup |

**Cascading rules:**
- Changing **Group** resets type, subgroup, and subtype to All
- Changing **Type** resets subgroup and subtype to All
- Changing **Subgroup** resets subtype to All
- **All types** under Natural = all Natural events only (not Technological)

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
  disasterSubgroup: "All",
  disasterType: "All",
  disasterSubtype: "All",
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
| **By country** | Sortable table with country rows × 4 metrics |

### 5.2 Metrics displayed

1. **Total Disasters** — count of filtered records  
2. **Total Deaths** — sum of `totalDeaths` (nulls excluded)  
3. **Total Affected** — sum of `totalAffected` (nulls excluded)  
4. **Total Damage, Adjusted ('000 US$)** — sum of `totalDamageAdjusted` (nulls excluded)

All metrics respect Layer A + Layer B filters. Geography scope narrows the dataset; metric tabs still show regional, subregion, and country breakdowns of the filtered data.

---

## 6. Charts

All charts respect global filters (year, disaster classification, geography scope). Each chart may have additional local controls.

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
| Trend lines | Linear regression (least squares), dashed overlay; fit through **2025** only (see §7) |

**Trend line behaviour:**
- Single view: dashed gray **Trend** line alongside data line (ends at 2025)
- Compare subregions: dashed trend line per subregion (matching subregion colour; ends at 2025)

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
| Trend line | Amber dashed linear regression overlay; fit through **2025** only (see §7) |

### 6.3 Pie chart — disaster distribution

**Component:** `components/PieChartWidget.tsx`

| Feature | Behaviour |
|---------|-----------|
| Chart type | Pie chart |
| Scope | Follows global geography scope |
| Mode | **Event share** (disaster count) or **Impact share** (sum of deaths / affected / damage) |
| Break down by | Disaster Subtype, Type, or Subgroup (default: **Type**) |
| Grouping | Top **8** slices + **Other** |
| Labels | Classification name + percentage |
| Footnote | Impact share shows how many events have reported values for the selected metric |
| Trend lines | Not applicable |

### 6.4 Ask APDR 2025 — report interrogation

**Component:** `components/ReportChat.tsx`  
**API:** `POST /api/ask` with body `{ question, context?: { country?, subregion?, disasterType? } }`

| Feature | Behaviour |
|---------|-----------|
| Placement | **Above filters** (directly under page header) |
| Scope | Asia-Pacific Disaster Report **2025 only** — separate from EM-DAT charts **below** |
| Collapse | Header chevron expander; **expanded by default**; collapsed shows title + optional “Answered: …” summary |
| Input | Textarea + **Ask** + **Clear** (clears question, answer, and error) |
| Context | Passes active geography scope and disaster type to retrieval (does not send EM-DAT totals to the model) |
| Response UI | Structured sections: direct findings, key data (with evidence tags), geographic/hazard focus, sectors, time horizon, evidence strength, gaps, citations |
| Loading | Button shows “Analyzing report…” while awaiting API |

**Rules (enforced in prompt):**
- No invented statistics or rankings unless stated in excerpts
- If not directly addressed: lead with “Not explicitly addressed in APDR 2025” and optional adjacent evidence
- Quantitative `keyData` must come from excerpt text

---

## 7. Trend line implementation

**Module:** `lib/trend.ts`

- Method: **Ordinary least-squares linear regression** on (year, value) pairs
- **Constant:** `TREND_MAX_YEAR = 2025` in `lib/trend.ts`
- **Year range for trends:** regression and trend line use years **through 2025** only; **2026 is excluded** (partial-year data). Actual data bars/lines may still show 2026; trend values are `null` for 2026 so the dashed line stops at 2025.
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
| Page structure | Header → **Ask APDR 2025** → Filters → Metrics → Line chart → Bar + Pie (2-column on xl) |

---

## 9. Project structure

```
asiapacific-disaster-dashboard/
├── Emdat-asia pacific.xlsx          # EM-DAT source (~1.8 MB, committed)
├── AsiaPacificDR/
│   └── APDR2025.pdf                 # APDR source for ingest (local; optional in repo)
├── apphosting.yaml                  # Firebase App Hosting env (ANTHROPIC_API_KEY secret ref)
├── BASELINE.md                      # This document
├── data/
│   ├── disasters.json               # EM-DAT JSON (~1.3 MB; regenerated on build)
│   └── apdr2025-chunks.json         # APDR structured chunks (committed)
├── scripts/
│   ├── parse-emdat.ts               # Excel → disasters.json
│   └── ingest-reports.ts            # PDF → apdr2025-chunks.json
├── lib/
│   ├── types.ts                     # EM-DAT TypeScript interfaces
│   ├── escap-regions.ts             # Country → subregion mapping
│   ├── china-normalize.ts           # China territory rollup
│   ├── aggregations.ts              # Filter + sum + chart data helpers
│   ├── trend.ts                     # Linear regression trend lines
│   ├── format.ts                    # Number/percentage formatting
│   ├── report-types.ts              # Report chunk + interrogation answer types
│   ├── report-ingest.ts             # PDF structural chunking + metadata
│   ├── report-search.ts             # Chunk retrieval for Q&A
│   ├── report-interrogation.ts      # LLM prompt + JSON parse helpers
│   └── report-chunks.ts             # Re-exports for report modules
├── components/
│   ├── Dashboard.tsx                # Main client shell + filter state
│   ├── ReportChat.tsx               # Ask APDR 2025 panel
│   ├── FilterBar.tsx
│   ├── MetricCards.tsx
│   ├── LineChartWidget.tsx
│   ├── BarChartWidget.tsx
│   └── PieChartWidget.tsx
└── app/
    ├── api/ask/route.ts             # Report interrogation API (server)
    ├── page.tsx                     # Server page; imports JSON, renders Dashboard
    ├── layout.tsx                   # Root layout + metadata
    └── globals.css                  # Tailwind + light theme tokens
```

---

## 10. Commands

| Command | Purpose |
|---------|---------|
| `npm run parse-data` | Regenerate `data/disasters.json` from Excel |
| `npm run ingest-reports` | Regenerate `data/apdr2025-chunks.json` from `AsiaPacificDR/APDR2025.pdf` |
| `npm run dev` | Start dev server (http://localhost:3000) |
| `npm run build` | Parse EM-DAT data + production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |

---

## 11. Dependencies (baseline)

**Runtime:**
- `next` 16.2.9
- `react` / `react-dom` 19.2.4
- `recharts` ^3.8.1
- `lucide-react` ^1.18.0
- `@anthropic-ai/sdk` ^0.106.0 — report Q&A API
- `pdf-parse` ^2.4.5 — PDF text extraction (ingest script)

**Dev (data + tooling):**
- `xlsx` ^0.18.5 — Excel parsing
- `tsx` ^4.22.4 — run parse/ingest scripts
- `@types/pdf-parse` ^1.1.5
- `tailwindcss` ^4, `typescript` ^5

---

## 12. Known limitations / baseline caveats

1. **Year filter vs data:** UI allows 1970–2026, but baseline data only contains years **2000–2026**.
2. **Partial 2026 data:** 2026 may be incomplete; trend lines intentionally exclude 2026 from regression and display (§7).
3. **Country coverage:** 47 countries after normalization; not all ESCAP member states appear in the source file.
4. **Damage reporting:** Many events lack `totalDamageAdjusted`; impact totals and damage-based pie slices use only events with reported values.
5. **Pie chart:** No trend line (not meaningful for categorical distribution).
6. **SSR chart warnings:** Recharts may log width/height warnings during static generation; charts render correctly in the browser.
7. **Line chart view controls:** Geography view selectors on the line chart are independent of the global geography scope filter (both apply: global filter narrows data; local control chooses aggregation view).
8. **APDR Q&A scope:** Only APDR 2025 is indexed; answers are from retrieved PDF excerpts, not EM-DAT charts. Other annual reports (2017–2023) are not in the baseline index unless ingested separately.
9. **APDR API:** Requires `ANTHROPIC_API_KEY` at runtime; production uses Firebase Secret Manager (`apphosting.yaml`). Each question incurs API cost.
10. **PDF figures:** Chart/map content in APDR is not vision-parsed; only extracted text and captions are searchable.

---

## 13. Restoration checklist

To return to this baseline after changes:

- [ ] Source file present: `Emdat-asia pacific.xlsx`
- [ ] Run `npm run parse-data` → 5,273 records
- [ ] Default disaster group = Natural
- [ ] China territories rolled into China
- [ ] Russia mapped to ENEA only
- [ ] Metric tabs: Asia-Pacific | By subregion | By country
- [ ] Disaster filters: Group + Type (advanced: Subgroup + Subtype)
- [ ] Pie chart: Event share + Impact share modes; top 8 + Other
- [ ] Line chart: compare subregions + trend lines (through 2025)
- [ ] Bar chart: metric toggle + yearly bars + trend line (through 2025)
- [ ] Trend lines exclude 2026 from regression and display
- [ ] Ask APDR 2025 panel above filters; expander + Clear
- [ ] `data/apdr2025-chunks.json` present; `npm run ingest-reports` if PDF updated
- [ ] `apphosting.yaml` references `ANTHROPIC_API_KEY` secret; backend has secret access
- [ ] Local `.env.local` has `ANTHROPIC_API_KEY` for dev (not committed)
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
| **App Hosting backend** | `asiapacific-disaster-dashboard` |
| **Production secret** | `ANTHROPIC_API_KEY` (Cloud Secret Manager; see `apphosting.yaml`) |

**Set production API key (one-time):**

```bash
npx firebase-tools apphosting:secrets:set ANTHROPIC_API_KEY --project emdatdashboard
npx firebase-tools apphosting:secrets:grantaccess ANTHROPIC_API_KEY \
  --backend asiapacific-disaster-dashboard --project emdatdashboard
```

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
| 2026-06-24 | 1.2 | Full EM-DAT classification hierarchy (group/subgroup/type/subtype); cascading filters with advanced expander; country metrics tab; pie chart event vs impact share |
| 2026-06-24 | 1.3 | Main filters: Group + Type; advanced: Subgroup + Subtype; trend lines fit through 2025 only (2026 excluded); documentation sync |
| 2026-06-25 | 1.4 | APDR 2025 report interrogation: structured PDF ingest, `/api/ask`, ReportChat above filters, Firebase `ANTHROPIC_API_KEY` secret, expander + Clear; LineChart trend typing fix for production build |
