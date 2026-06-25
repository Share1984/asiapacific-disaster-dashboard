import { getEscapSubregion } from "./escap-regions";
import type {
  ChunkType,
  ExtractedFact,
  ReportChunk,
} from "./report-types";
import type { EscapSubregion } from "./types";

const PAGE_MARKER = /\n--\s*(\d+)\s+of\s+(\d+)\s*--\n/g;

const COUNTRY_ALIASES: Array<{ pattern: RegExp; country: string }> = [
  { pattern: /\bDemocratic People's Republic of Korea\b/gi, country: "Democratic People's Republic of Korea" },
  { pattern: /\bDPRK\b/g, country: "Democratic People's Republic of Korea" },
  { pattern: /\bNorth Korea\b/gi, country: "Democratic People's Republic of Korea" },
  { pattern: /\bRepublic of Korea\b/gi, country: "Republic of Korea" },
  { pattern: /\bSouth Korea\b/gi, country: "Republic of Korea" },
  { pattern: /\bVietnam\b/gi, country: "Viet Nam" },
  { pattern: /\bLao PDR\b/gi, country: "Lao People's Democratic Republic" },
  { pattern: /\bRussia\b/gi, country: "Russian Federation" },
  { pattern: /\bTurkey\b/gi, country: "Türkiye" },
  { pattern: /\bIran\b/gi, country: "Iran (Islamic Republic of)" },
  { pattern: /\bMicronesia\b/gi, country: "Micronesia (Federated States of)" },
  { pattern: /\bHong Kong\b/gi, country: "China" },
  { pattern: /\bTaiwan\b/gi, country: "China" },
];

const ESCAP_COUNTRIES = [
  "Armenia", "Azerbaijan", "Georgia", "Kazakhstan", "Kyrgyzstan", "Tajikistan",
  "Turkmenistan", "Uzbekistan", "Afghanistan", "Bangladesh", "Bhutan", "India",
  "Iran (Islamic Republic of)", "Maldives", "Nepal", "Pakistan", "Sri Lanka", "Türkiye",
  "Australia", "Fiji", "Kiribati", "Marshall Islands", "Micronesia (Federated States of)",
  "Papua New Guinea", "Samoa", "Solomon Islands", "Tuvalu", "Vanuatu", "American Samoa",
  "Cook Islands", "Northern Mariana Islands", "China",
  "Democratic People's Republic of Korea", "Japan", "Mongolia", "Republic of Korea",
  "Russian Federation", "Brunei Darussalam", "Cambodia", "Indonesia",
  "Lao People's Democratic Republic", "Malaysia", "Myanmar", "Philippines", "Singapore",
  "Thailand", "Timor-Leste", "Viet Nam",
].sort((a, b) => b.length - a.length);

const HAZARD_KEYWORDS: Array<{ tag: string; patterns: RegExp[] }> = [
  { tag: "heatwaves", patterns: [/\bheatwave?s?\b/i, /\bextreme heat\b/i, /\bheat stress\b/i, /\burban heat\b/i] },
  { tag: "floods", patterns: [/\bflood(?:ing|s)?\b/i, /\bflash flood\b/i, /\briverine\b/i] },
  { tag: "drought", patterns: [/\bdrought\b/i, /\bwater stress\b/i, /\baridity\b/i] },
  { tag: "cyclones", patterns: [/\bcyclone?s?\b/i, /\btyphoon?s?\b/i, /\btropical storm\b/i] },
  { tag: "storm_surge", patterns: [/\bstorm surge\b/i] },
  { tag: "landslides", patterns: [/\blandslide?s?\b/i] },
  { tag: "earthquakes", patterns: [/\bearthquake?s?\b/i, /\bseismic\b/i] },
  { tag: "tsunamis", patterns: [/\btsunami?s?\b/i] },
  { tag: "sea_level_rise", patterns: [/\bsea[- ]level rise\b/i, /\bSLR\b/] },
  { tag: "glacial_retreat", patterns: [/\bglacier\b/i, /\bglacial\b/i, /\bGLOF\b/i] },
  { tag: "wildfire", patterns: [/\bwildfire?s?\b/i, /\bbushfire?s?\b/i] },
  { tag: "salinization", patterns: [/\bsaliniz/i, /\bsalinity\b/i] },
];

const SECTION_PATTERNS: Array<{ pattern: RegExp; section: string }> = [
  { pattern: /^Foreword$/im, section: "Foreword" },
  { pattern: /^Executive [Ss]ummary/im, section: "Executive summary" },
  { pattern: /^Acknowledgements/im, section: "Acknowledgements" },
  { pattern: /^Chapter\s+(\d+)[:\s—-]*(.*)$/im, section: "Chapter" },
  { pattern: /^Annex\s+([A-Z0-9]+)/im, section: "Annex" },
  { pattern: /^References$/im, section: "References" },
];

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isLowValueChunk(text: string): boolean {
  if (text.length < 80) {
    return true;
  }

  const withoutPageMarkers = text.replace(/--\s*\d+\s+of\s+\d+\s*--/g, "").trim();
  if (withoutPageMarkers.length < 60) {
    return true;
  }

  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  const numericLines = lines.filter((line) => /^[\d.\s]+$/.test(line.trim()));
  if (lines.length > 0 && numericLines.length / lines.length > 0.6) {
    return true;
  }

  if (/^(?:ISBN|ISSN|Copyright|Sales No\.)/i.test(text)) {
    return true;
  }

  return false;
}

function detectSection(line: string, current: string): string {
  for (const { pattern, section } of SECTION_PATTERNS) {
    const match = line.match(pattern);
    if (match) {
      if (section === "Chapter" && match[1]) {
        const title = match[2]?.trim();
        return title ? `Chapter ${match[1]}: ${title}` : `Chapter ${match[1]}`;
      }
      if (section === "Annex" && match[1]) {
        return `Annex ${match[1]}`;
      }
      return section;
    }
  }
  return current;
}

function detectSubsection(line: string): string | undefined {
  if (/^\d+\.\d+(?:\.\d+)?\s+\S/.test(line.trim())) {
    return line.trim();
  }
  if (/^Box\s+\d+/i.test(line.trim())) {
    return line.trim();
  }
  return undefined;
}

function extractCountries(text: string): string[] {
  const found = new Set<string>();

  for (const country of ESCAP_COUNTRIES) {
    const pattern = new RegExp(`\\b${country.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(text)) {
      found.add(country);
    }
  }

  for (const { pattern, country } of COUNTRY_ALIASES) {
    if (pattern.test(text)) {
      found.add(country);
    }
  }

  return [...found].sort();
}

function extractHazards(text: string): string[] {
  const hazards: string[] = [];
  for (const { tag, patterns } of HAZARD_KEYWORDS) {
    if (patterns.some((pattern) => pattern.test(text))) {
      hazards.push(tag);
    }
  }
  return hazards;
}

function detectChunkType(text: string, section: string, page: number): ChunkType {
  const lower = text.toLowerCase();
  const sectionLower = section.toLowerCase();

  if (
    page <= 4 ||
    sectionLower.includes("acknowledgement") ||
    /copyright|isbn|issn|all rights reserved/.test(lower)
  ) {
    return "front_matter";
  }

  if (sectionLower.includes("executive summary") || /\bexecutive summary\b/i.test(text)) {
    return "executive_summary";
  }

  if (/early warning|MHEWS|multi-hazard early warning|forecast system/i.test(text)) {
    return "early_warning_gap";
  }

  if (/\b(2030|2050|2100|projected|projection|scenario|RCP|SSP)\b/i.test(text)) {
    return "projection";
  }

  if (/recommend|policy pathway|governments should|call(?:s)? on/i.test(text)) {
    return "recommendation";
  }

  if (/infrastructure|hydropower|transmission|transport|telecom|power grid/i.test(text)) {
    return "infrastructure_risk";
  }

  if (/cascad|compound|multiplier|nexus|interconnected|systemic risk/i.test(text)) {
    return "systems_risk";
  }

  if (/hotspot|high[- ]risk|most vulnerable|concentration of exposure/i.test(text)) {
    return "hotspot_narrative";
  }

  if (/\b\d+(?:\.\d+)?%|\b(?:million|billion|trillion)\b|\bUSD\b|\bdeaths?\b|\bmortality\b|\blosses\b/i.test(text)) {
    return "quantitative_findings";
  }

  if (/heatwave|flood|drought|cyclone|landslide|earthquake|tsunami/i.test(text)) {
    return "hazard_profile";
  }

  if (/^Figure\s+\d+|^Table\s+\d+|^Map\s+\d+/im.test(text)) {
    return "figure_caption";
  }

  return "narrative";
}

function extractFacts(text: string): ExtractedFact[] {
  const facts: ExtractedFact[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);

  for (const sentence of sentences) {
    if (sentence.length < 40) {
      continue;
    }

    const hasNumber = /\d/.test(sentence);
    if (!hasNumber) {
      continue;
    }

    let kind: ExtractedFact["kind"] = "other";
    if (/\bdeath|mortality|fatalit/i.test(sentence)) {
      kind = "mortality";
    } else if (/\bUSD|loss|damage|GDP|billion|million|trillion|cost/i.test(sentence)) {
      kind = "economic";
    } else if (/\btemperature|precipitation|warming|°C|mm\b|anomaly/i.test(sentence)) {
      kind = "climate";
    } else if (/\bexposed|affected|population|hectare|people\b/i.test(sentence)) {
      kind = "exposure";
    }

    const numberMatch = sentence.match(
      /(\d[\d,.]*(?:\.\d+)?)\s*(%|per cent|percent|people|deaths?|USD|million|billion|°C|mm)?/i,
    );

    facts.push({
      kind,
      quote: sentence.trim(),
      metric: kind,
      value: numberMatch?.[1],
      unit: numberMatch?.[2],
    });

    if (facts.length >= 5) {
      break;
    }
  }

  return facts;
}

interface PageBlock {
  page: number;
  text: string;
}

function splitIntoPages(rawText: string): PageBlock[] {
  const pages: PageBlock[] = [];
  const markers = [...rawText.matchAll(PAGE_MARKER)];

  if (markers.length === 0) {
    return [{ page: 1, text: cleanText(rawText) }];
  }

  let cursor = 0;
  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index];
    const page = Number(marker[1]);
    const markerStart = marker.index ?? 0;
    const markerEnd = markerStart + marker[0].length;
    const nextStart = markers[index + 1]?.index ?? rawText.length;
    const chunkBefore = rawText.slice(cursor, markerStart);
    const chunkAfter = rawText.slice(markerEnd, nextStart);

    if (chunkBefore.trim()) {
      pages.push({ page: pages.at(-1)?.page ?? page, text: cleanText(chunkBefore) });
    }

    pages.push({ page, text: cleanText(chunkAfter) });
    cursor = nextStart;
  }

  return pages.filter((block) => block.text.length > 0);
}

function splitPageIntoParagraphs(pageText: string): string[] {
  const paragraphs = pageText
    .split(/\n{2,}/)
    .map((part) => cleanText(part))
    .filter((part) => part.length > 0);

  const merged: string[] = [];
  for (const paragraph of paragraphs) {
    if (merged.length > 0 && paragraph.length < 120) {
      merged[merged.length - 1] = `${merged[merged.length - 1]}\n\n${paragraph}`;
    } else {
      merged.push(paragraph);
    }
  }

  return merged;
}

export function buildStructuredChunks(
  rawText: string,
  source: string,
  year: number,
): ReportChunk[] {
  const pages = splitIntoPages(rawText);
  const chunks: ReportChunk[] = [];
  let section = "Introduction";
  let chunkIndex = 0;

  for (const { page, text: pageText } of pages) {
    const paragraphs = splitPageIntoParagraphs(pageText);

    for (const paragraph of paragraphs) {
      const firstLine = paragraph.split("\n")[0]?.trim() ?? "";
      section = detectSection(firstLine, section);
      const subsection = detectSubsection(firstLine);

      if (isLowValueChunk(paragraph)) {
        continue;
      }

      const countries = extractCountries(paragraph);
      const subregions = [
        ...new Set(
          countries
            .map((country) => getEscapSubregion(country))
            .filter((value): value is EscapSubregion => value !== null),
        ),
      ];
      const hazards = extractHazards(paragraph);
      const chunkType = detectChunkType(paragraph, section, page);
      const hasProjections = /\b(2030|2050|2100|projected|projection|scenario)\b/i.test(paragraph);
      const projectionHorizon = /\b2100\b/.test(paragraph)
        ? "2100"
        : /\b2050\b/.test(paragraph)
          ? "2050"
          : /\b2030\b/.test(paragraph)
            ? "2030"
            : undefined;

      chunks.push({
        id: `chunk-${chunkIndex}`,
        source,
        year,
        section,
        subsection,
        pageStart: page,
        pageEnd: page,
        chunkType,
        countries,
        subregions,
        hazards,
        hasMortalityData: /\bdeath|mortality|fatalit/i.test(paragraph),
        hasEconomicLossData: /\bUSD|loss|damage|GDP|billion|million/i.test(paragraph),
        hasProjections,
        hasInfrastructureMention: /infrastructure|hydropower|transport|energy|telecom/i.test(paragraph),
        hasEarlyWarningMention: /early warning|MHEWS|forecast/i.test(paragraph),
        isObserved: hasProjections
          ? /\b(historical|observed|recorded|1970|1980|1990|2000|2010|2020)\b/i.test(paragraph)
          : true,
        projectionHorizon,
        text: paragraph,
        facts: extractFacts(paragraph),
      });

      chunkIndex += 1;
    }
  }

  return chunks;
}
