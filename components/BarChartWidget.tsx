"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { applyFilters, yearlyMetricTotals } from "@/lib/aggregations";
import { formatNumber } from "@/lib/format";
import { addTrendField } from "@/lib/trend";
import type { BarMetric, DashboardFilters, DisasterRecord } from "@/lib/types";

const METRIC_OPTIONS: { value: BarMetric; label: string }[] = [
  { value: "deaths", label: "Total Deaths" },
  { value: "affected", label: "Total Affected" },
  {
    value: "damage",
    label: "Total Damage, Adjusted ('000 US$)",
  },
];

interface BarChartWidgetProps {
  records: DisasterRecord[];
  filters: DashboardFilters;
}

export function BarChartWidget({ records, filters }: BarChartWidgetProps) {
  const [metric, setMetric] = useState<BarMetric>("deaths");

  const filtered = useMemo(
    () => applyFilters(records, filters),
    [records, filters],
  );

  const chartData = useMemo(() => {
    const yearly = yearlyMetricTotals(filtered, metric).map((row) => ({
      year: row.year,
      value: row.value,
    }));
    return addTrendField(yearly, "value", "valueTrend");
  }, [filtered, metric]);

  const metricLabel =
    METRIC_OPTIONS.find((m) => m.value === metric)?.label ?? metric;

  const scopeLabel =
    filters.scope === "country" && filters.country
      ? filters.country
      : filters.scope === "subregion" && filters.subregion
        ? filters.subregion
        : "Asia-Pacific";

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          {metricLabel} by year — {scopeLabel}
        </h2>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as BarMetric)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          {METRIC_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="h-80 min-h-80 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 12 }} />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickFormatter={(v) => formatNumber(Number(v))}
            />
            <Tooltip
              formatter={(value, name) => [
                formatNumber(Number(value)),
                name === "valueTrend" ? "Trend" : metricLabel,
              ]}
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Bar
              dataKey="value"
              name={metricLabel}
              fill="#0284c7"
              radius={[4, 4, 0, 0]}
            />
            <Line
              type="monotone"
              dataKey="valueTrend"
              name="Trend"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
