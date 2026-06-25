import * as fs from "node:fs";
import * as path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  applyQuotaToResponse,
  enforceAiQuotaOrRespond,
  quotaPayload,
} from "@/lib/ai-quota-http";
import {
  buildExplainUserPrompt,
  EXPLAIN_SYSTEM_PROMPT,
  parseDashboardExplanation,
} from "@/lib/dashboard-explain";
import type { DisasterRecord, DashboardFilters } from "@/lib/types";
import {
  buildViewSnapshot,
  formatSnapshotForPrompt,
} from "@/lib/view-snapshot";

const DISASTERS_FILE = path.join(process.cwd(), "data", "disasters.json");

function loadDisasters(): DisasterRecord[] {
  if (!fs.existsSync(DISASTERS_FILE)) {
    throw new Error(
      "Disaster data not found. Run: npm run parse-data",
    );
  }

  const raw = fs.readFileSync(DISASTERS_FILE, "utf8");
  return JSON.parse(raw) as DisasterRecord[];
}

function isDashboardFilters(value: unknown): value is DashboardFilters {
  if (!value || typeof value !== "object") {
    return false;
  }

  const filters = value as Record<string, unknown>;
  return (
    typeof filters.yearMin === "number" &&
    typeof filters.yearMax === "number" &&
    typeof filters.disasterGroup === "string" &&
    typeof filters.disasterSubgroup === "string" &&
    typeof filters.disasterType === "string" &&
    typeof filters.disasterSubtype === "string" &&
    typeof filters.scope === "string" &&
    typeof filters.subregion === "string" &&
    typeof filters.country === "string"
  );
}

export async function POST(request: Request) {
  try {
    const quotaCheck = await enforceAiQuotaOrRespond(request);
    if (!quotaCheck.ok) {
      return quotaCheck.response;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "ANTHROPIC_API_KEY is not configured. Add it to .env.local and restart the dev server.",
        },
        { status: 500 },
      );
    }

    const body = (await request.json()) as {
      filters?: DashboardFilters;
      question?: string;
    };

    if (!isDashboardFilters(body.filters)) {
      return NextResponse.json(
        { error: "Please provide valid dashboard filters." },
        { status: 400 },
      );
    }

    const records = loadDisasters();
    const snapshot = buildViewSnapshot(records, body.filters);
    const snapshotBlock = formatSnapshotForPrompt(snapshot);
    const question = body.question?.trim();

    const client = new Anthropic({ apiKey });
    const completion = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      temperature: 0.1,
      system: EXPLAIN_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildExplainUserPrompt(snapshotBlock, question),
        },
      ],
    });

    const textBlock = completion.content.find((block) => block.type === "text");
    const rawAnswer = textBlock?.type === "text" ? textBlock.text.trim() : "";
    if (!rawAnswer) {
      return NextResponse.json(
        { error: "No explanation returned from the model." },
        { status: 502 },
      );
    }

    const explanation = parseDashboardExplanation(
      rawAnswer,
      snapshot.filterLabel,
    );

    const response = NextResponse.json({
      explanation,
      snapshot,
      quota: quotaPayload(quotaCheck.enforcement.quota),
    });

    return applyQuotaToResponse(response, quotaCheck.enforcement);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
