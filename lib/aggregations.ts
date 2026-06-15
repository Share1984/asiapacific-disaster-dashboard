import {
  ESCAP_SUBREGIONS,
  type BarMetric,
  type DashboardFilters,
  type DisasterRecord,
  type EscapSubregion,
} from "./types";

export interface MetricTotals {
  disasters: number;
  deaths: number;
  affected: number;
  damage: number;
}

export interface YearlyCount {
  year: number;
  count: number;
}

export interface YearlyMetric {
  year: number;
  value: number;
}

export interface SubregionYearlyCount {
  year: number;
  [subregion: string]: number;
}

export interface PieSlice {
  name: string;
  value: number;
  percentage: number;
}

function parseOptionalNumber(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function applyFilters(
  records: DisasterRecord[],
  filters: DashboardFilters,
): DisasterRecord[] {
  return records.filter((record) => {
    if (record.year < filters.yearMin || record.year > filters.yearMax) {
      return false;
    }
    if (
      filters.disasterGroup !== "All" &&
      record.disasterGroup !== filters.disasterGroup
    ) {
      return false;
    }
    if (
      filters.disasterType !== "All" &&
      record.disasterType !== filters.disasterType
    ) {
      return false;
    }
    if (filters.scope === "subregion" && filters.subregion) {
      return record.escapSubregion === filters.subregion;
    }
    if (filters.scope === "country" && filters.country) {
      return record.country === filters.country;
    }
    return true;
  });
}

export function computeTotals(records: DisasterRecord[]): MetricTotals {
  let deaths = 0;
  let affected = 0;
  let damage = 0;

  for (const record of records) {
    if (record.totalDeaths !== null) {
      deaths += record.totalDeaths;
    }
    if (record.totalAffected !== null) {
      affected += record.totalAffected;
    }
    if (record.totalDamageAdjusted !== null) {
      damage += record.totalDamageAdjusted;
    }
  }

  return {
    disasters: records.length,
    deaths,
    affected,
    damage,
  };
}

export function computeSubregionTotals(
  records: DisasterRecord[],
): Record<EscapSubregion, MetricTotals> {
  const result = Object.fromEntries(
    ESCAP_SUBREGIONS.map((subregion) => [
      subregion,
      { disasters: 0, deaths: 0, affected: 0, damage: 0 },
    ]),
  ) as Record<EscapSubregion, MetricTotals>;

  for (const subregion of ESCAP_SUBREGIONS) {
    const subregionRecords = records.filter(
      (record) => record.escapSubregion === subregion,
    );
    result[subregion] = computeTotals(subregionRecords);
  }

  return result;
}

export function disasterFrequencyByYear(
  records: DisasterRecord[],
): YearlyCount[] {
  const counts = new Map<number, number>();

  for (const record of records) {
    counts.set(record.year, (counts.get(record.year) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);
}

export function subregionFrequencyByYear(
  records: DisasterRecord[],
): SubregionYearlyCount[] {
  const yearMap = new Map<number, SubregionYearlyCount>();

  for (const record of records) {
    if (!yearMap.has(record.year)) {
      const entry: SubregionYearlyCount = { year: record.year };
      for (const subregion of ESCAP_SUBREGIONS) {
        entry[subregion] = 0;
      }
      yearMap.set(record.year, entry);
    }
    const entry = yearMap.get(record.year)!;
    entry[record.escapSubregion] =
      (entry[record.escapSubregion] as number) + 1;
  }

  return Array.from(yearMap.values()).sort((a, b) => a.year - b.year);
}

export function yearlyMetricTotals(
  records: DisasterRecord[],
  metric: BarMetric,
): YearlyMetric[] {
  const yearMap = new Map<number, number>();

  for (const record of records) {
    const value =
      metric === "deaths"
        ? record.totalDeaths
        : metric === "affected"
          ? record.totalAffected
          : record.totalDamageAdjusted;

    if (value === null) {
      continue;
    }

    yearMap.set(record.year, (yearMap.get(record.year) ?? 0) + value);
  }

  return Array.from(yearMap.entries())
    .map(([year, value]) => ({ year, value }))
    .sort((a, b) => a.year - b.year);
}

export function disasterTypeDistribution(
  records: DisasterRecord[],
  topN = 5,
): PieSlice[] {
  const counts = new Map<string, number>();

  for (const record of records) {
    counts.set(record.disasterType, (counts.get(record.disasterType) ?? 0) + 1);
  }

  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const total = records.length;

  if (total === 0) {
    return [];
  }

  const top = sorted.slice(0, topN);
  const otherCount = sorted.slice(topN).reduce((sum, [, count]) => sum + count, 0);

  const slices: PieSlice[] = top.map(([name, value]) => ({
    name,
    value,
    percentage: (value / total) * 100,
  }));

  if (otherCount > 0) {
    slices.push({
      name: "Other",
      value: otherCount,
      percentage: (otherCount / total) * 100,
    });
  }

  return slices;
}

export function getUniqueValues(records: DisasterRecord[]) {
  const groups = new Set<string>();
  const types = new Set<string>();
  const countries = new Set<string>();

  for (const record of records) {
    groups.add(record.disasterGroup);
    types.add(record.disasterType);
    countries.add(record.country);
  }

  return {
    disasterGroups: Array.from(groups).sort(),
    disasterTypes: Array.from(types).sort(),
    countries: Array.from(countries).sort(),
  };
}

export { parseOptionalNumber };
