import type { EscapSubregion } from "./types";

export const CHUNK_TYPES = [
  "front_matter",
  "executive_summary",
  "hotspot_narrative",
  "hazard_profile",
  "quantitative_findings",
  "infrastructure_risk",
  "early_warning_gap",
  "projection",
  "systems_risk",
  "recommendation",
  "figure_caption",
  "narrative",
] as const;

export type ChunkType = (typeof CHUNK_TYPES)[number];

export type EvidenceStrength = "strong" | "moderate" | "weak";
export type EvidenceKind = "explicit" | "implied" | "adjacent";

export interface ExtractedFact {
  kind: "mortality" | "economic" | "climate" | "exposure" | "other";
  quote: string;
  metric?: string;
  value?: string;
  unit?: string;
}

export interface ReportChunk {
  id: string;
  source: string;
  year: number;
  section: string;
  subsection?: string;
  pageStart: number;
  pageEnd: number;
  chunkType: ChunkType;
  countries: string[];
  subregions: EscapSubregion[];
  hazards: string[];
  hasMortalityData: boolean;
  hasEconomicLossData: boolean;
  hasProjections: boolean;
  hasInfrastructureMention: boolean;
  hasEarlyWarningMention: boolean;
  isObserved: boolean;
  projectionHorizon?: "2030" | "2050" | "2100";
  text: string;
  facts: ExtractedFact[];
}

export interface ReportChunkStore {
  source: string;
  year: number;
  chunkCount: number;
  chunks: ReportChunk[];
}

export interface ReportAskContext {
  country?: string;
  subregion?: string;
  disasterType?: string;
}

export interface KeyDataPoint {
  metric: string;
  value: string;
  page?: number | null;
  evidence: EvidenceKind;
}

export interface ReportCitation {
  excerptId: string;
  pageStart: number;
  pageEnd: number;
}

export interface ReportInterrogationAnswer {
  question: string;
  notExplicitlyAddressed: boolean;
  directFindings: string[];
  keyData: KeyDataPoint[];
  geographicFocus: string[];
  hazardFocus: string[];
  affectedSectors: string[];
  timeHorizon: string;
  evidenceStrength: EvidenceStrength;
  gapsInReport: string[];
  adjacentEvidence: string[];
  citations: ReportCitation[];
}

export interface ReportAskResponse {
  answer: ReportInterrogationAnswer;
  source: string;
  year: number;
}
