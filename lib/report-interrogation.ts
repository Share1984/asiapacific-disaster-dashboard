import type { ReportInterrogationAnswer } from "./report-types";

export const INTERROGATION_SYSTEM_PROMPT = `You are the APDR 2025 Report Interrogation Engine.

Your job is to answer ONE targeted analytical question using ONLY the provided excerpts from the Asia-Pacific Disaster Report 2025 (APDR 2025).

This is interrogation, not broad synthesis.

Rules:
- Use only the provided excerpts and extracted facts.
- Do not invent statistics, rankings, country lists, or trends.
- Do not rank countries or hazards unless the excerpts explicitly rank them.
- Every quantitative claim in keyData must appear verbatim in an excerpt.
- Label evidence as "explicit", "implied", or "adjacent".
- If the question is not directly answered in the excerpts, set notExplicitlyAddressed to true and begin directFindings with "Not explicitly addressed in APDR 2025."
- You may then add up to 3 adjacentEvidence bullets clearly labeled as adjacent, not direct.
- Distinguish observed facts from projections.
- If a checklist topic is not in the excerpts, put it in gapsInReport rather than guessing.

Evidence strength:
- strong: multiple explicit excerpts directly answer the question
- moderate: one explicit excerpt or several implied connections
- weak: only adjacent evidence

Keep directFindings to at most 8 concise bullets and keyData to at most 10 entries.

Respond with ONLY valid JSON matching this schema. Do not wrap the JSON in markdown code fences.
{
  "question": string,
  "notExplicitlyAddressed": boolean,
  "directFindings": string[],
  "keyData": [{ "metric": string, "value": string, "page": number | null, "evidence": "explicit" | "implied" | "adjacent" }],
  "geographicFocus": string[],
  "hazardFocus": string[],
  "affectedSectors": string[],
  "timeHorizon": string,
  "evidenceStrength": "strong" | "moderate" | "weak",
  "gapsInReport": string[],
  "adjacentEvidence": string[],
  "citations": [{ "excerptId": string, "pageStart": number, "pageEnd": number }]
}`;

export function buildInterrogationUserPrompt(
  question: string,
  excerptBlock: string,
  contextNote: string,
): string {
  return `Question: ${question}

Dashboard context (use only to prioritize excerpts; do not use EM-DAT statistics):
${contextNote}

Report excerpts:
${excerptBlock}`;
}

export function parseInterrogationAnswer(
  raw: string,
  question: string,
): ReportInterrogationAnswer {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return fallbackAnswer(question, raw);
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<ReportInterrogationAnswer>;
    const directFindings = (parsed.directFindings ?? []).flatMap((finding) => {
      if (typeof finding !== "string") {
        return [];
      }
      if (finding.includes('"directFindings"')) {
        try {
          const nested = JSON.parse(
            finding.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, ""),
          ) as Partial<ReportInterrogationAnswer>;
          return nested.directFindings ?? [];
        } catch {
          return [finding.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")];
        }
      }
      return [finding];
    });

    return {
      question: parsed.question ?? question,
      notExplicitlyAddressed: Boolean(parsed.notExplicitlyAddressed),
      directFindings,
      keyData: parsed.keyData ?? [],
      geographicFocus: parsed.geographicFocus ?? [],
      hazardFocus: parsed.hazardFocus ?? [],
      affectedSectors: parsed.affectedSectors ?? [],
      timeHorizon: parsed.timeHorizon ?? "Not stated",
      evidenceStrength: parsed.evidenceStrength ?? "weak",
      gapsInReport: parsed.gapsInReport ?? [],
      adjacentEvidence: parsed.adjacentEvidence ?? [],
      citations: parsed.citations ?? [],
    };
  } catch {
    return fallbackAnswer(question, raw);
  }
}

function fallbackAnswer(question: string, raw: string): ReportInterrogationAnswer {
  return {
    question,
    notExplicitlyAddressed: false,
    directFindings: [raw],
    keyData: [],
    geographicFocus: [],
    hazardFocus: [],
    affectedSectors: [],
    timeHorizon: "Not stated",
    evidenceStrength: "weak",
    gapsInReport: [],
    adjacentEvidence: [],
    citations: [],
  };
}
