export const ESCAP_SUBREGIONS = [
  "North and Central Asia",
  "South and South West Asia",
  "Pacific",
  "East and Northeast Asia",
  "Southeast Asia",
] as const;

export type EscapSubregion = (typeof ESCAP_SUBREGIONS)[number];

export type GeographyScope = "all" | "subregion" | "country";

export interface DisasterRecord {
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

export interface DashboardFilters {
  yearMin: number;
  yearMax: number;
  disasterGroup: string;
  disasterSubgroup: string;
  disasterType: string;
  disasterSubtype: string;
  scope: GeographyScope;
  subregion: EscapSubregion | "";
  country: string;
}

export type BarMetric = "deaths" | "affected" | "damage";

export type LineViewMode = "all" | "subregion" | "country";

export type ClassificationLevel = "subgroup" | "type" | "subtype";

export type PieMode = "event" | "impact";
