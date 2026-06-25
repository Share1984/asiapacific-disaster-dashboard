import {
  applyFilters,
  computeCountryTotals,
  computeSubregionTotals,
  computeTotals,
  countRecordsWithMetric,
  disasterFrequencyByYear,
  yearlyMetricTotals,
  type MetricTotals,
} from "./aggregations";
import { computeLinearRegression, TREND_MAX_YEAR } from "./trend";
import type { DashboardFilters, DisasterRecord, EscapSubregion } from "./types";

export type TrendDirection = "up" | "down" | "flat" | "insufficient_data";

export interface ViewSnapshotSubregionRow {
  subregion: EscapSubregion;
  totals: MetricTotals;
}

export interface ViewSnapshotCountryRow {
  country: string;
  totals: MetricTotals;
}

export interface ViewSnapshotDataQuality {
  totalEvents: number;
  eventsWithDeaths: number;
  eventsWithAffected: number;
  eventsWithDamage: number;
}

export interface ViewSnapshotYearlyPoint {
  year: number;
  count: number;
  deaths: number;
}

export interface ViewSnapshotTrend {
  frequency: TrendDirection;
  deaths: TrendDirection;
}

export interface ViewSnapshotTypeRow {
  type: string;
  count: number;
}

export interface ViewSnapshot {
  filterLabel: string;
  filters: DashboardFilters;
  totals: MetricTotals;
  subregionBreakdown: ViewSnapshotSubregionRow[];
  countryBreakdown: ViewSnapshotCountryRow[];
  yearlySeries: ViewSnapshotYearlyPoint[];
  peakYear: { year: number; count: number } | null;
  dataQuality: ViewSnapshotDataQuality;
  trendSummary: ViewSnapshotTrend;
  topDisasterTypes: ViewSnapshotTypeRow[];
}

const SLOPE_THRESHOLD = 0.05;

function classifySlope(slope: number, meanY: number): TrendDirection {
  if (!Number.isFinite(slope) || !Number.isFinite(meanY) || meanY === 0) {
    if (Math.abs(slope) < SLOPE_THRESHOLD) {
      return "flat";
    }
    return slope > 0 ? "up" : "down";
  }

  const relative = slope / meanY;
  if (Math.abs(relative) < SLOPE_THRESHOLD) {
    return "flat";
  }
  return relative > 0 ? "up" : "down";
}

function computeTrendDirection(
  points: { year: number; value: number }[],
): TrendDirection {
  const filtered = points.filter((point) => point.year <= TREND_MAX_YEAR);
  if (filtered.length < 3) {
    return "insufficient_data";
  }

  const regression = computeLinearRegression(
    filtered.map((point) => ({ x: point.year, y: point.value })),
  );
  const meanY =
    filtered.reduce((sum, point) => sum + point.value, 0) / filtered.length;

  return classifySlope(regression.slope, meanY);
}

export function buildFilterLabel(filters: DashboardFilters): string {
  const parts: string[] = [];

  parts.push(`${filters.yearMin}–${filters.yearMax}`);

  if (filters.disasterGroup !== "All") {
    parts.push(filters.disasterGroup);
  }
  if (filters.disasterType !== "All") {
    parts.push(filters.disasterType);
  }
  if (filters.disasterSubgroup !== "All") {
    parts.push(filters.disasterSubgroup);
  }
  if (filters.disasterSubtype !== "All") {
    parts.push(filters.disasterSubtype);
  }

  if (filters.scope === "country" && filters.country) {
    parts.push(filters.country);
  } else if (filters.scope === "subregion" && filters.subregion) {
    parts.push(filters.subregion);
  } else {
    parts.push("Asia-Pacific");
  }

  return parts.join(" · ");
}

function topCountries(
  countryTotals: Record<string, MetricTotals>,
  limit: number,
): ViewSnapshotCountryRow[] {
  return Object.entries(countryTotals)
    .map(([country, totals]) => ({ country, totals }))
    .sort((a, b) => b.totals.disasters - a.totals.disasters)
    .slice(0, limit);
}

function topDisasterTypes(
  records: DisasterRecord[],
  limit: number,
): ViewSnapshotTypeRow[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    counts.set(record.disasterType, (counts.get(record.disasterType) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function buildYearlySeries(records: DisasterRecord[]): ViewSnapshotYearlyPoint[] {
  const frequency = disasterFrequencyByYear(records);
  const deathsByYear = yearlyMetricTotals(records, "deaths");
  const deathsMap = new Map(deathsByYear.map((row) => [row.year, row.value]));

  return frequency.map((row) => ({
    year: row.year,
    count: row.count,
    deaths: deathsMap.get(row.year) ?? 0,
  }));
}

export function buildViewSnapshot(
  records: DisasterRecord[],
  filters: DashboardFilters,
): ViewSnapshot {
  const filtered = applyFilters(records, filters);
  const totals = computeTotals(filtered);
  const subregionMap = computeSubregionTotals(filtered);
  const countryMap = computeCountryTotals(filtered);
  const yearlySeries = buildYearlySeries(filtered);

  const subregionBreakdown = Object.entries(subregionMap)
    .map(([subregion, subTotals]) => ({
      subregion: subregion as EscapSubregion,
      totals: subTotals,
    }))
    .filter((row) => row.totals.disasters > 0)
    .sort((a, b) => b.totals.disasters - a.totals.disasters);

  const peakYear =
    yearlySeries.length > 0
      ? yearlySeries.reduce((peak, row) =>
          row.count > peak.count ? row : peak,
        )
      : null;

  return {
    filterLabel: buildFilterLabel(filters),
    filters,
    totals,
    subregionBreakdown,
    countryBreakdown: topCountries(countryMap, 10),
    yearlySeries,
    peakYear: peakYear ? { year: peakYear.year, count: peakYear.count } : null,
    dataQuality: {
      totalEvents: filtered.length,
      eventsWithDeaths: countRecordsWithMetric(filtered, "deaths"),
      eventsWithAffected: countRecordsWithMetric(filtered, "affected"),
      eventsWithDamage: countRecordsWithMetric(filtered, "damage"),
    },
    trendSummary: {
      frequency: computeTrendDirection(
        yearlySeries.map((row) => ({ year: row.year, value: row.count })),
      ),
      deaths: computeTrendDirection(
        yearlySeries.map((row) => ({ year: row.year, value: row.deaths })),
      ),
    },
    topDisasterTypes: topDisasterTypes(filtered, 5),
  };
}

export function formatSnapshotForPrompt(snapshot: ViewSnapshot): string {
  const lines: string[] = [
    `Filter context: ${snapshot.filterLabel}`,
    "",
    "Totals (null impact values excluded from sums):",
    `- Events: ${snapshot.totals.disasters.toLocaleString()}`,
    `- Deaths: ${snapshot.totals.deaths.toLocaleString()}`,
    `- Affected: ${snapshot.totals.affected.toLocaleString()}`,
    `- Damage (adjusted, '000 US$): ${snapshot.totals.damage.toLocaleString()}`,
    "",
    "Data quality:",
    `- Events with deaths reported: ${snapshot.dataQuality.eventsWithDeaths} of ${snapshot.dataQuality.totalEvents}`,
    `- Events with affected reported: ${snapshot.dataQuality.eventsWithAffected} of ${snapshot.dataQuality.totalEvents}`,
    `- Events with damage reported: ${snapshot.dataQuality.eventsWithDamage} of ${snapshot.dataQuality.totalEvents}`,
    "",
    `Trend (linear, years through ${TREND_MAX_YEAR}):`,
    `- Event frequency: ${snapshot.trendSummary.frequency}`,
    `- Deaths: ${snapshot.trendSummary.deaths}`,
  ];

  if (snapshot.peakYear) {
    lines.push(
      "",
      `Peak event year: ${snapshot.peakYear.year} (${snapshot.peakYear.count} events)`,
    );
  }

  if (snapshot.topDisasterTypes.length > 0) {
    lines.push("", "Top disaster types by event count:");
    for (const row of snapshot.topDisasterTypes) {
      lines.push(`- ${row.type}: ${row.count}`);
    }
  }

  if (snapshot.subregionBreakdown.length > 0) {
    lines.push("", "Subregion breakdown (events / deaths):");
    for (const row of snapshot.subregionBreakdown) {
      lines.push(
        `- ${row.subregion}: ${row.totals.disasters} events, ${row.totals.deaths.toLocaleString()} deaths`,
      );
    }
  }

  if (snapshot.countryBreakdown.length > 0) {
    lines.push("", "Top countries by event count:");
    for (const row of snapshot.countryBreakdown) {
      lines.push(
        `- ${row.country}: ${row.totals.disasters} events, ${row.totals.deaths.toLocaleString()} deaths`,
      );
    }
  }

  if (snapshot.yearlySeries.length > 0) {
    const recent = snapshot.yearlySeries.slice(-5);
    lines.push("", "Recent years (events / deaths):");
    for (const row of recent) {
      lines.push(`- ${row.year}: ${row.count} events, ${row.deaths.toLocaleString()} deaths`);
    }
  }

  return lines.join("\n");
}
