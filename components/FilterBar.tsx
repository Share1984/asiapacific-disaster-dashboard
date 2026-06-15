"use client";

import { getEscapSubregion } from "@/lib/escap-regions";
import {
  ESCAP_SUBREGIONS,
  type DashboardFilters,
  type EscapSubregion,
  type GeographyScope,
} from "@/lib/types";

interface FilterBarProps {
  filters: DashboardFilters;
  disasterGroups: string[];
  disasterTypes: string[];
  countries: string[];
  onChange: (filters: DashboardFilters) => void;
}

const SUBREGION_SHORT: Record<EscapSubregion, string> = {
  "North and Central Asia": "NCA",
  "South and South West Asia": "SSWA",
  Pacific: "Pacific",
  "East and Northeast Asia": "ENEA",
  "Southeast Asia": "SEA",
};

export function FilterBar({
  filters,
  disasterGroups,
  disasterTypes,
  countries,
  onChange,
}: FilterBarProps) {
  const update = (partial: Partial<DashboardFilters>) => {
    onChange({ ...filters, ...partial });
  };

  const handleScopeChange = (scope: GeographyScope) => {
    if (scope === "all") {
      onChange({
        ...filters,
        scope: "all",
        subregion: "",
        country: "",
      });
      return;
    }
    if (scope === "subregion") {
      onChange({
        ...filters,
        scope: "subregion",
        country: "",
        subregion: filters.subregion || ESCAP_SUBREGIONS[0],
      });
      return;
    }
    onChange({
      ...filters,
      scope: "country",
      country: filters.country || countries[0] || "",
      subregion: filters.country
        ? (getEscapSubregion(filters.country) ?? "")
        : countries[0]
          ? (getEscapSubregion(countries[0]) ?? "")
          : "",
    });
  };

  const handleCountryChange = (country: string) => {
    const subregion = getEscapSubregion(country) ?? "";
    onChange({
      ...filters,
      scope: "country",
      country,
      subregion,
    });
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Filters
      </h2>

      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
          <span>Year range</span>
          <span className="font-medium text-slate-900">
            {filters.yearMin} – {filters.yearMax}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            From
            <input
              type="range"
              min={1970}
              max={2026}
              value={filters.yearMin}
              onChange={(e) => {
                const yearMin = Number(e.target.value);
                update({
                  yearMin: Math.min(yearMin, filters.yearMax),
                });
              }}
              className="accent-sky-600"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            To
            <input
              type="range"
              min={1970}
              max={2026}
              value={filters.yearMax}
              onChange={(e) => {
                const yearMax = Number(e.target.value);
                update({
                  yearMax: Math.max(yearMax, filters.yearMin),
                });
              }}
              className="accent-sky-600"
            />
          </label>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-600">
          Disaster Group
          <select
            value={filters.disasterGroup}
            onChange={(e) => update({ disasterGroup: e.target.value })}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
          >
            <option value="All">All groups</option>
            {disasterGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-600">
          Disaster Type
          <select
            value={filters.disasterType}
            onChange={(e) => update({ disasterType: e.target.value })}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
          >
            <option value="All">All types</option>
            {disasterTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All Asia-Pacific"],
              ["subregion", "Subregion"],
              ["country", "Country"],
            ] as const
          ).map(([scope, label]) => (
            <button
              key={scope}
              type="button"
              onClick={() => handleScopeChange(scope)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                filters.scope === scope
                  ? "bg-sky-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filters.scope === "subregion" && (
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              ESCAP Subregion
              <select
                value={filters.subregion}
                onChange={(e) =>
                  update({ subregion: e.target.value as EscapSubregion })
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              >
                {ESCAP_SUBREGIONS.map((subregion) => (
                  <option key={subregion} value={subregion}>
                    {SUBREGION_SHORT[subregion]} — {subregion}
                  </option>
                ))}
              </select>
            </label>
          )}

          {filters.scope === "country" && (
            <>
              <label className="flex flex-col gap-1 text-sm text-slate-600">
                Country
                <select
                  value={filters.country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                >
                  {countries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-col gap-1 text-sm text-slate-600">
                <span>ESCAP Subregion (auto)</span>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                  {filters.subregion
                    ? `${SUBREGION_SHORT[filters.subregion as EscapSubregion]} — ${filters.subregion}`
                    : "—"}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
