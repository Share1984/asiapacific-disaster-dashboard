"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  applyFilters,
  disasterFrequencyByYear,
  subregionFrequencyByYear,
} from "@/lib/aggregations";
import { addMultiTrendFields, addTrendField } from "@/lib/trend";
import {
  ESCAP_SUBREGIONS,
  type DashboardFilters,
  type DisasterRecord,
  type EscapSubregion,
  type LineViewMode,
} from "@/lib/types";

const SUBREGION_COLORS: Record<EscapSubregion, string> = {
  "North and Central Asia": "#0ea5e9",
  "South and South West Asia": "#8b5cf6",
  Pacific: "#10b981",
  "East and Northeast Asia": "#f59e0b",
  "Southeast Asia": "#ef4444",
};

interface LineChartWidgetProps {
  records: DisasterRecord[];
  filters: DashboardFilters;
}

export function LineChartWidget({ records, filters }: LineChartWidgetProps) {
  const [viewMode, setViewMode] = useState<LineViewMode>("all");
  const [compareSubregions, setCompareSubregions] = useState(false);
  const [lineSubregion, setLineSubregion] = useState<EscapSubregion>(
    ESCAP_SUBREGIONS[0],
  );
  const [lineCountry, setLineCountry] = useState("");

  const baseFiltered = useMemo(
    () => applyFilters(records, filters),
    [records, filters],
  );

  const countriesInData = useMemo(() => {
    const set = new Set(baseFiltered.map((r) => r.country));
    return Array.from(set).sort();
  }, [baseFiltered]);

  const effectiveCountry = lineCountry || countriesInData[0] || "";

  const compareChartData = useMemo(() => {
    const frequency = subregionFrequencyByYear(baseFiltered);
    return addMultiTrendFields(frequency, [...ESCAP_SUBREGIONS]);
  }, [baseFiltered]);

  const singleChartData = useMemo(() => {
    let frequency;
    if (viewMode === "all") {
      frequency = disasterFrequencyByYear(baseFiltered).map((d) => ({
        year: d.year,
        count: d.count,
      }));
    } else if (viewMode === "subregion") {
      const scoped = baseFiltered.filter(
        (r) => r.escapSubregion === lineSubregion,
      );
      frequency = disasterFrequencyByYear(scoped).map((d) => ({
        year: d.year,
        count: d.count,
      }));
    } else {
      const scoped = baseFiltered.filter((r) => r.country === effectiveCountry);
      frequency = disasterFrequencyByYear(scoped).map((d) => ({
        year: d.year,
        count: d.count,
      }));
    }

    return addTrendField(frequency, "count", "countTrend");
  }, [baseFiltered, viewMode, lineSubregion, effectiveCountry]);

  const title = compareSubregions
    ? "Disaster frequency by ESCAP subregion"
    : viewMode === "all"
      ? "Disaster frequency — Asia-Pacific"
      : viewMode === "subregion"
        ? `Disaster frequency — ${lineSubregion}`
        : `Disaster frequency — ${effectiveCountry}`;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={compareSubregions}
              onChange={(e) => setCompareSubregions(e.target.checked)}
              className="accent-sky-600"
            />
            Compare subregions
          </label>

          {!compareSubregions && (
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as LineViewMode)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="all">Asia-Pacific</option>
              <option value="subregion">Subregion</option>
              <option value="country">Country</option>
            </select>
          )}

          {!compareSubregions && viewMode === "subregion" && (
            <select
              value={lineSubregion}
              onChange={(e) =>
                setLineSubregion(e.target.value as EscapSubregion)
              }
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              {ESCAP_SUBREGIONS.map((sr) => (
                <option key={sr} value={sr}>
                  {sr}
                </option>
              ))}
            </select>
          )}

          {!compareSubregions && viewMode === "country" && (
            <select
              value={effectiveCountry}
              onChange={(e) => setLineCountry(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              {countriesInData.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="h-80 min-h-80 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          {compareSubregions ? (
            <LineChart data={compareChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              {ESCAP_SUBREGIONS.map((subregion) => (
                <Line
                  key={subregion}
                  type="monotone"
                  dataKey={subregion}
                  name={subregion}
                  stroke={SUBREGION_COLORS[subregion]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
              {ESCAP_SUBREGIONS.map((subregion) => (
                <Line
                  key={`${subregion}-trend`}
                  type="monotone"
                  dataKey={`${subregion}Trend`}
                  name={`${subregion} (trend)`}
                  stroke={SUBREGION_COLORS[subregion]}
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  dot={false}
                  legendType="line"
                />
              ))}
            </LineChart>
          ) : (
            <LineChart data={singleChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                name="Disasters"
                stroke="#0284c7"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="countTrend"
                name="Trend"
                stroke="#64748b"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </section>
  );
}
