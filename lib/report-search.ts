import type {
  ChunkType,
  ReportAskContext,
  ReportChunk,
} from "./report-types";
import type { EscapSubregion } from "./types";

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "is",
  "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does",
  "did", "will", "would", "could", "should", "may", "might", "can", "what", "when",
  "where", "which", "who", "whom", "this", "that", "these", "those", "it", "its",
  "they", "them", "their", "from", "with", "about", "into", "by", "as", "how", "why",
  "does", "say", "report", "apdr",
]);

const QUESTION_INTENTS: Array<{
  patterns: RegExp[];
  hazards?: string[];
  chunkTypes?: ChunkType[];
}> = [
  {
    patterns: [/\bheat\b/i, /\bheatwave/i, /\btemperature\b/i],
    hazards: ["heatwaves"],
    chunkTypes: ["hazard_profile", "quantitative_findings", "systems_risk", "projection"],
  },
  {
    patterns: [/\bflood/i, /\briver basin/i, /\bdelta\b/i],
    hazards: ["floods"],
    chunkTypes: ["hotspot_narrative", "hazard_profile", "quantitative_findings"],
  },
  {
    patterns: [/\bdrought\b/i, /\bwater stress\b/i],
    hazards: ["drought"],
    chunkTypes: ["hazard_profile", "systems_risk"],
  },
  {
    patterns: [/\bcoastal\b/i, /\bsea[- ]level\b/i, /\bsids?\b/i, /\bisland/i],
    hazards: ["sea_level_rise", "storm_surge", "salinization"],
    chunkTypes: ["hotspot_narrative", "projection"],
  },
  {
    patterns: [/\bglacier\b/i, /\bcryosphere\b/i, /\bhimalaya/i, /\bglof\b/i],
    hazards: ["glacial_retreat"],
    chunkTypes: ["hazard_profile", "systems_risk"],
  },
  {
    patterns: [/\binfrastructure\b/i, /\benergy\b/i, /\btransport\b/i, /\btelecom\b/i],
    chunkTypes: ["infrastructure_risk", "quantitative_findings"],
  },
  {
    patterns: [/\bearly warning\b/i, /\bmhews\b/i, /\bgovernance\b/i],
    chunkTypes: ["early_warning_gap", "recommendation"],
  },
  {
    patterns: [/\bfood\b/i, /\bagricultur/i, /\bfisher/i, /\bcrop\b/i],
    chunkTypes: ["systems_risk", "quantitative_findings", "hotspot_narrative"],
  },
  {
    patterns: [/\becosystem\b/i, /\bmangrove\b/i, /\bwetland\b/i, /\bcoral\b/i],
    chunkTypes: ["systems_risk", "narrative"],
  },
  {
    patterns: [/\b2030\b/i, /\b2050\b/i, /\b2100\b/i, /\bproject/i, /\bfuture\b/i],
    chunkTypes: ["projection", "quantitative_findings"],
  },
  {
    patterns: [/\bcompound\b/i, /\bcascad/i, /\bmulti[- ]hazard\b/i, /\bsystemic\b/i],
    chunkTypes: ["systems_risk", "hotspot_narrative"],
  },
  {
    patterns: [/\brecommend/i, /\bpolicy\b/i, /\bpathway\b/i],
    chunkTypes: ["recommendation", "executive_summary"],
  },
  {
    patterns: [/\btheme\b/i, /\bmain\b/i, /\boverview\b/i, /\babout\b/i],
    chunkTypes: ["executive_summary", "hazard_profile", "recommendation"],
  },
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

function detectIntents(question: string) {
  const hazards = new Set<string>();
  const chunkTypes = new Set<ChunkType>();

  for (const intent of QUESTION_INTENTS) {
    if (intent.patterns.some((pattern) => pattern.test(question))) {
      intent.hazards?.forEach((hazard) => hazards.add(hazard));
      intent.chunkTypes?.forEach((type) => chunkTypes.add(type));
    }
  }

  return { hazards: [...hazards], chunkTypes: [...chunkTypes] };
}

function diversifyByPage(chunks: ReportChunk[], limit: number): ReportChunk[] {
  const selected: ReportChunk[] = [];
  const pageCounts = new Map<number, number>();

  for (const chunk of chunks) {
    const count = pageCounts.get(chunk.pageStart) ?? 0;
    if (count >= 2) {
      continue;
    }
    selected.push(chunk);
    pageCounts.set(chunk.pageStart, count + 1);
    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}

export function searchReportChunks(
  chunks: ReportChunk[],
  question: string,
  context: ReportAskContext = {},
  limit = 10,
): ReportChunk[] {
  const terms = tokenize(question);
  const intents = detectIntents(question);
  const searchable = chunks.filter((chunk) => chunk.chunkType !== "front_matter");

  const scored = searchable.map((chunk) => {
    const haystack = `${chunk.section} ${chunk.text}`.toLowerCase();
    let score = 0;

    for (const term of terms) {
      if (haystack.includes(term)) {
        score += 2;
      }
    }

    for (const hazard of intents.hazards) {
      if (chunk.hazards.includes(hazard)) {
        score += 4;
      }
    }

    for (const chunkType of intents.chunkTypes) {
      if (chunk.chunkType === chunkType) {
        score += 3;
      }
    }

    if (context.country && chunk.countries.includes(context.country)) {
      score += 8;
    }

    if (context.subregion && chunk.subregions.includes(context.subregion as EscapSubregion)) {
      score += 5;
    }

    if (context.disasterType && context.disasterType !== "All") {
      const disaster = context.disasterType.toLowerCase();
      if (chunk.hazards.some((hazard) => hazard.includes(disaster) || disaster.includes(hazard))) {
        score += 4;
      }
      if (haystack.includes(disaster)) {
        score += 2;
      }
    }

    if (chunk.chunkType === "executive_summary" && /\btheme|main|overview|about\b/i.test(question)) {
      score += 5;
    }

    if (chunk.facts.length > 0) {
      score += 1;
    }

    return { chunk, score };
  });

  const ranked = scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  const pool =
    ranked.length > 0
      ? ranked.map(({ chunk }) => chunk)
      : searchable.filter((chunk) =>
          ["executive_summary", "hazard_profile", "recommendation", "projection"].includes(
            chunk.chunkType,
          ),
        );

  return diversifyByPage(pool, limit);
}

export function formatChunksForPrompt(chunks: ReportChunk[]): string {
  return chunks
    .map((chunk) => {
      const factsBlock =
        chunk.facts.length > 0
          ? `\nExtracted facts:\n${chunk.facts
              .map((fact) => `- [${fact.kind}] ${fact.quote}`)
              .join("\n")}`
          : "";

      return `[Excerpt ${chunk.id} | pages ${chunk.pageStart}-${chunk.pageEnd} | ${chunk.chunkType} | section: ${chunk.section}]
Countries: ${chunk.countries.join(", ") || "none"}
Hazards: ${chunk.hazards.join(", ") || "none"}
${chunk.text}${factsBlock}`;
    })
    .join("\n\n---\n\n");
}
