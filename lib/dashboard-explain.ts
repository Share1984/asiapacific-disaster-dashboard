import type { DashboardExplanation } from "./dashboard-explain-types";

export const EXPLAIN_SYSTEM_PROMPT = `You are the EM-DAT View Explainer for the Asia Pacific disaster dashboard.

Your job is to explain the current filtered EM-DAT view using ONLY the provided snapshot statistics.

This is explanation of dashboard data, not report narrative.

Rules:
- Use only numbers and facts present in the snapshot.
- Do not invent statistics, rankings, or trends beyond what the snapshot supports.
- When citing trends, use the provided trendSummary values (up/down/flat/insufficient_data).
- When damage or affected totals may be understated, mention reporting coverage from dataQuality.
- Do not reference APDR 2025 or any external report.
- Do not recommend policy actions; suggest data explorations only in suggestedExplorations.
- Keep findings to at most 5 concise bullets, keyMetrics to at most 6 entries, caveats to at most 3, suggestedExplorations to at most 3.

Respond with ONLY valid JSON matching this schema. Do not wrap the JSON in markdown code fences.
{
  "filterSummary": string,
  "findings": string[],
  "keyMetrics": [{ "label": string, "value": string }],
  "caveats": string[],
  "suggestedExplorations": string[]
}`;

export function buildExplainUserPrompt(
  snapshotBlock: string,
  question?: string,
): string {
  const focus = question?.trim()
    ? `Focus question: ${question.trim()}`
    : "Task: Explain what this filtered EM-DAT view shows.";

  return `${focus}

EM-DAT snapshot (authoritative — do not use any other numbers):
${snapshotBlock}`;
}

export function parseDashboardExplanation(
  raw: string,
  filterLabel: string,
): DashboardExplanation {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return fallbackExplanation(filterLabel, raw);
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<DashboardExplanation>;
    return {
      filterSummary: parsed.filterSummary ?? filterLabel,
      findings: (parsed.findings ?? []).filter(
        (item): item is string => typeof item === "string",
      ),
      keyMetrics: (parsed.keyMetrics ?? []).filter(
        (item): item is { label: string; value: string } =>
          typeof item?.label === "string" && typeof item?.value === "string",
      ),
      caveats: (parsed.caveats ?? []).filter(
        (item): item is string => typeof item === "string",
      ),
      suggestedExplorations: (parsed.suggestedExplorations ?? []).filter(
        (item): item is string => typeof item === "string",
      ),
    };
  } catch {
    return fallbackExplanation(filterLabel, raw);
  }
}

function fallbackExplanation(
  filterLabel: string,
  raw: string,
): DashboardExplanation {
  return {
    filterSummary: filterLabel,
    findings: [raw],
    keyMetrics: [],
    caveats: [],
    suggestedExplorations: [],
  };
}
