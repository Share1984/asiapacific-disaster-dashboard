"use client";

import { useMemo, useState } from "react";
import {
  applyFilters,
  computeCountryTotals,
  computeSubregionTotals,
  computeTotals,
  getUniqueValues,
} from "@/lib/aggregations";
import type { DashboardFilters, DisasterRecord } from "@/lib/types";
import { FilterBar } from "./FilterBar";
import { MetricCards } from "./MetricCards";
import { LineChartWidget } from "./LineChartWidget";
import { BarChartWidget } from "./BarChartWidget";
import { PieChartWidget } from "./PieChartWidget";
import { ReportChat } from "./ReportChat";

interface DashboardProps {
  records: DisasterRecord[];
}

const DEFAULT_FILTERS: DashboardFilters = {
  yearMin: 1970,
  yearMax: 2026,
  disasterGroup: "Natural",
  disasterSubgroup: "All",
  disasterType: "All",
  disasterSubtype: "All",
  scope: "all",
  subregion: "",
  country: "",
};

export function Dashboard({ records }: DashboardProps) {
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);

  const uniqueValues = useMemo(() => getUniqueValues(records), [records]);

  const filtered = useMemo(
    () => applyFilters(records, filters),
    [records, filters],
  );

  const regionalTotals = useMemo(() => computeTotals(filtered), [filtered]);
  const subregionTotals = useMemo(
    () => computeSubregionTotals(filtered),
    [filtered],
  );
  const countryTotals = useMemo(
    () => computeCountryTotals(filtered),
    [filtered],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Asia Pacific Em-dat dashboard
        </h1>
        <p className="mt-2 text-slate-600">
          Interactive disaster data for the Asia-Pacific region (1970–2026)
        </p>
      </header>

      <ReportChat filters={filters} />

      <FilterBar
        filters={filters}
        records={records}
        disasterGroups={uniqueValues.disasterGroups}
        countries={uniqueValues.countries}
        onChange={setFilters}
      />

      <MetricCards
        regionalTotals={regionalTotals}
        subregionTotals={subregionTotals}
        countryTotals={countryTotals}
      />

      <LineChartWidget records={records} filters={filters} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <BarChartWidget records={records} filters={filters} />
        <PieChartWidget records={records} filters={filters} />
      </div>
    </div>
  );
}
