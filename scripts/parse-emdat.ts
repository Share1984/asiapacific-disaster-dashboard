import * as fs from "node:fs";
import * as path from "node:path";
import * as XLSX from "xlsx";
import { getEscapSubregion } from "../lib/escap-regions";
import { normalizeCountry } from "../lib/china-normalize";
import { parseOptionalNumber } from "../lib/aggregations";
import type { DisasterRecord } from "../lib/types";

const INPUT_FILE = path.join(process.cwd(), "Emdat-asia pacific.xlsx");
const OUTPUT_FILE = path.join(process.cwd(), "data", "disasters.json");

const DAMAGE_COLUMN = "Total Damage, Adjusted ('000 US$)";

function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(INPUT_FILE);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const records: DisasterRecord[] = [];
  let skipped = 0;

  for (const row of rows) {
    const rawCountry = String(row["Country"] ?? "").trim();
    if (!rawCountry) {
      skipped += 1;
      continue;
    }

    const country = normalizeCountry(rawCountry);
    const subregion = getEscapSubregion(country);

    if (!subregion) {
      console.warn(`No ESCAP subregion for country: ${country} (raw: ${rawCountry})`);
      skipped += 1;
      continue;
    }

    const year = Number(row["Start Year"]);
    if (!Number.isFinite(year)) {
      skipped += 1;
      continue;
    }

    records.push({
      disasterGroup: String(row["Disaster Group"] ?? ""),
      disasterType: String(row["Disaster Type"] ?? ""),
      country,
      year,
      totalDeaths: parseOptionalNumber(row["Total Deaths"]),
      totalAffected: parseOptionalNumber(row["Total Affected"]),
      totalDamageAdjusted: parseOptionalNumber(row[DAMAGE_COLUMN]),
      escapSubregion: subregion,
    });
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(records, null, 2));

  console.log(`Parsed ${records.length} records (${skipped} skipped)`);
  console.log(`Output: ${OUTPUT_FILE}`);
}

main();
