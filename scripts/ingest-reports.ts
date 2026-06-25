import * as fs from "node:fs";
import * as path from "node:path";
import { PDFParse } from "pdf-parse";
import { buildStructuredChunks } from "../lib/report-ingest";
import type { ReportChunkStore } from "../lib/report-types";

const PDF_FILE = path.join(process.cwd(), "AsiaPacificDR", "APDR2025.pdf");
const OUTPUT_FILE = path.join(process.cwd(), "data", "apdr2025-chunks.json");
const SOURCE = "APDR2025.pdf";
const YEAR = 2025;

async function main() {
  if (!fs.existsSync(PDF_FILE)) {
    console.error(`PDF not found: ${PDF_FILE}`);
    process.exit(1);
  }

  console.log(`Reading ${PDF_FILE}...`);
  const data = fs.readFileSync(PDF_FILE);
  const parser = new PDFParse({ data });
  const result = await parser.getText();
  await parser.destroy();

  const text = result.text.trim();
  if (!text) {
    console.error("No text extracted from PDF.");
    process.exit(1);
  }

  const chunks = buildStructuredChunks(text, SOURCE, YEAR);
  const store: ReportChunkStore = {
    source: SOURCE,
    year: YEAR,
    chunkCount: chunks.length,
    chunks,
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(store, null, 2));

  const withFacts = chunks.filter((chunk) => chunk.facts.length > 0).length;
  const byType = chunks.reduce<Record<string, number>>((acc, chunk) => {
    acc[chunk.chunkType] = (acc[chunk.chunkType] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Wrote ${store.chunkCount} chunks to ${OUTPUT_FILE}`);
  console.log(`Total characters extracted: ${text.length.toLocaleString()}`);
  console.log(`Chunks with extracted facts: ${withFacts}`);
  console.log("Chunk types:", byType);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
