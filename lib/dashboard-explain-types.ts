import type { ViewSnapshot } from "./view-snapshot";

export interface DashboardExplanation {
  filterSummary: string;
  findings: string[];
  keyMetrics: { label: string; value: string }[];
  caveats: string[];
  suggestedExplorations: string[];
}

export interface ExplainResponse {
  explanation: DashboardExplanation;
  snapshot: ViewSnapshot;
}
