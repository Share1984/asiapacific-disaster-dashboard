"use client";

import { useMemo, useState } from "react";
import { formatNumber } from "@/lib/format";
import type { MetricTotals } from "@/lib/aggregations";
import { ESCAP_SUBREGIONS, type EscapSubregion } from "@/lib/types";

interface MetricCardsProps {
  regionalTotals: MetricTotals;
  subregionTotals: Record<EscapSubregion, MetricTotals>;
  countryTotals: Record<string, MetricTotals>;
}

const METRICS = [
  { key: "disasters" as const, label: "Total Disasters" },
  { key: "deaths" as const, label: "Total Deaths" },
  { key: "affected" as const, label: "Total Affected" },
  {
    key: "damage" as const,
    label: "Total Damage, Adjusted ('000 US$)",
  },
];

const SUBREGION_SHORT: Record<EscapSubregion, string> = {
  "North and Central Asia": "NCA",
  "South and South West Asia": "SSWA",
  Pacific: "Pacific",
  "East and Northeast Asia": "ENEA",
  "Southeast Asia": "SEA",
};

type MetricKey = (typeof METRICS)[number]["key"];
type MetricTab = "regional" | "subregion" | "country";
type SortDirection = "asc" | "desc";

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">
        {formatNumber(value)}
      </p>
    </div>
  );
}

function SortableHeader({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}) {
  return (
    <th className="px-3 py-2 font-medium">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 hover:text-slate-900"
      >
        {label}
        {active && (
          <span className="text-xs text-slate-400">
            {direction === "asc" ? "↑" : "↓"}
          </span>
        )}
      </button>
    </th>
  );
}

export function MetricCards({
  regionalTotals,
  subregionTotals,
  countryTotals,
}: MetricCardsProps) {
  const [tab, setTab] = useState<MetricTab>("regional");
  const [sortKey, setSortKey] = useState<MetricKey | "name">("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const countryRows = useMemo(() => {
    const rows = Object.entries(countryTotals).map(([country, totals]) => ({
      country,
      totals,
    }));

    rows.sort((a, b) => {
      const left =
        sortKey === "name" ? a.country : a.totals[sortKey];
      const right =
        sortKey === "name" ? b.country : b.totals[sortKey];

      if (typeof left === "string" && typeof right === "string") {
        return sortDirection === "asc"
          ? left.localeCompare(right)
          : right.localeCompare(left);
      }

      const leftNum = left as number;
      const rightNum = right as number;
      return sortDirection === "asc" ? leftNum - rightNum : rightNum - leftNum;
    });

    return rows;
  }, [countryTotals, sortDirection, sortKey]);

  const handleSort = (key: MetricKey | "name") => {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection(key === "name" ? "asc" : "desc");
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Key Metrics</h2>
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          {(
            [
              ["regional", "Asia-Pacific"],
              ["subregion", "By subregion"],
              ["country", "By country"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {tab === "regional" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {METRICS.map((metric) => (
              <MetricCard
                key={metric.key}
                label={metric.label}
                value={regionalTotals[metric.key]}
              />
            ))}
          </div>
        ) : tab === "subregion" ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-2 font-medium">Subregion</th>
                  {METRICS.map((metric) => (
                    <th key={metric.key} className="px-3 py-2 font-medium">
                      {metric.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ESCAP_SUBREGIONS.map((subregion) => (
                  <tr
                    key={subregion}
                    className="border-b border-slate-100 text-slate-800"
                  >
                    <td className="px-3 py-3 font-medium">
                      <span className="block">{SUBREGION_SHORT[subregion]}</span>
                      <span className="text-xs font-normal text-slate-500">
                        {subregion}
                      </span>
                    </td>
                    {METRICS.map((metric) => (
                      <td key={metric.key} className="px-3 py-3">
                        {formatNumber(subregionTotals[subregion][metric.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <SortableHeader
                    label="Country"
                    active={sortKey === "name"}
                    direction={sortDirection}
                    onClick={() => handleSort("name")}
                  />
                  {METRICS.map((metric) => (
                    <SortableHeader
                      key={metric.key}
                      label={metric.label}
                      active={sortKey === metric.key}
                      direction={sortDirection}
                      onClick={() => handleSort(metric.key)}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {countryRows.map(({ country, totals }) => (
                  <tr
                    key={country}
                    className="border-b border-slate-100 text-slate-800"
                  >
                    <td className="px-3 py-3 font-medium">{country}</td>
                    {METRICS.map((metric) => (
                      <td key={metric.key} className="px-3 py-3">
                        {formatNumber(totals[metric.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
