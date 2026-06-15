"use client";

import { useMemo } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { applyFilters, disasterTypeDistribution } from "@/lib/aggregations";
import { formatPercentage } from "@/lib/format";
import type { DashboardFilters, DisasterRecord } from "@/lib/types";

const COLORS = ["#0284c7", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#94a3b8"];

interface PieChartWidgetProps {
  records: DisasterRecord[];
  filters: DashboardFilters;
}

export function PieChartWidget({ records, filters }: PieChartWidgetProps) {
  const filtered = useMemo(
    () => applyFilters(records, filters),
    [records, filters],
  );

  const slices = useMemo(
    () => disasterTypeDistribution(filtered, 5),
    [filtered],
  );

  const scopeLabel =
    filters.scope === "country" && filters.country
      ? filters.country
      : filters.scope === "subregion" && filters.subregion
        ? filters.subregion
        : "Asia-Pacific";

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        Disaster type distribution — {scopeLabel}
      </h2>

      {slices.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">
          No disasters match the current filters.
        </p>
      ) : (
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
                  const payload = props.payload as { name: string; percentage: number };
                  return `${payload.name}: ${formatPercentage(payload.percentage)}`;
                }}
              >
                {slices.map((_, index) => (
                  <Cell
                    key={slices[index].name}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, _name, item) => {
                  const payload = item.payload as { percentage: number };
                  return [
                    `${Number(value)} (${formatPercentage(payload.percentage)})`,
                    "Disasters",
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
      )}
    </section>
  );
}
