"use client";

import { useMemo, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  applyFilters,
  countRecordsWithMetric,
  disasterClassificationDistribution,
} from "@/lib/aggregations";
import { formatNumber, formatPercentage } from "@/lib/format";
import type {
  BarMetric,
  ClassificationLevel,
  DashboardFilters,
  DisasterRecord,
  PieMode,
} from "@/lib/types";

const COLORS = [
  "#0284c7",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#94a3b8",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

const IMPACT_METRIC_LABELS: Record<BarMetric, string> = {
  deaths: "Total Deaths",
  affected: "Total Affected",
  damage: "Total Damage, Adjusted ('000 US$)",
};

interface PieChartWidgetProps {
  records: DisasterRecord[];
  filters: DashboardFilters;
}

function PieChartContent({
  records,
  filters,
}: PieChartWidgetProps) {
  const [mode, setMode] = useState<PieMode>("event");
  const [impactMetric, setImpactMetric] = useState<BarMetric>("deaths");
  const [breakdownLevel, setBreakdownLevel] = useState<ClassificationLevel>("type");

  const filtered = useMemo(
    () => applyFilters(records, filters),
    [records, filters],
  );

  const effectiveLevel = breakdownLevel;

  const slices = useMemo(
    () =>
      disasterClassificationDistribution(
        filtered,
        mode,
        effectiveLevel,
        impactMetric,
        8,
      ),
    [filtered, mode, effectiveLevel, impactMetric],
  );

  const scopeLabel =
    filters.scope === "country" && filters.country
      ? filters.country
      : filters.scope === "subregion" && filters.subregion
        ? filters.subregion
        : "Asia-Pacific";

  const metricCoverage =
    mode === "impact"
      ? countRecordsWithMetric(filtered, impactMetric)
      : filtered.length;

  const valueLabel =
    mode === "event"
      ? "Disasters"
      : IMPACT_METRIC_LABELS[impactMetric];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Disaster distribution — {scopeLabel}
        </h2>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["event", "Event share"],
              ["impact", "Impact share"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === id
                  ? "bg-sky-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {mode === "impact" && (
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              Impact metric
              <select
                value={impactMetric}
                onChange={(e) => setImpactMetric(e.target.value as BarMetric)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              >
                <option value="deaths">Total Deaths</option>
                <option value="affected">Total Affected</option>
                <option value="damage">
                  Total Damage, Adjusted (&apos;000 US$)
                </option>
              </select>
            </label>
          )}

          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Break down by
            <select
              value={breakdownLevel}
              onChange={(e) =>
                setBreakdownLevel(e.target.value as ClassificationLevel)
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
            >
              <option value="subtype">Disaster Subtype</option>
              <option value="type">Disaster Type</option>
              <option value="subgroup">Disaster Subgroup</option>
            </select>
          </label>
        </div>
      </div>

      {slices.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">
          No disasters match the current filters.
        </p>
      ) : (
        <>
          <div className="h-80 min-h-80 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  label={(props) => {
                    const payload = props.payload as {
                      name: string;
                      percentage: number;
                    };
                    return `${payload.name}: ${formatPercentage(payload.percentage)}`;
                  }}
                >
                  {slices.map((slice, index) => (
                    <Cell
                      key={slice.name}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, item) => {
                    const payload = item.payload as { percentage: number };
                    const formattedValue =
                      mode === "event"
                        ? Number(value)
                        : formatNumber(Number(value));
                    return [
                      `${formattedValue} (${formatPercentage(payload.percentage)})`,
                      valueLabel,
                    ];
                  }}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {mode === "impact" && (
            <p className="mt-3 text-xs text-slate-500">
              Based on {formatNumber(metricCoverage)} of{" "}
              {formatNumber(filtered.length)} events with reported{" "}
              {impactMetric === "damage"
                ? "damage"
                : impactMetric === "deaths"
                  ? "deaths"
                  : "affected population"}
              .
            </p>
          )}
        </>
      )}
    </section>
  );
}

export function PieChartWidget({ records, filters }: PieChartWidgetProps) {
  return (
    <PieChartContent
      key={filters.disasterGroup}
      records={records}
      filters={filters}
    />
  );
}
