import * as fs from "node:fs";
import * as path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  buildInterrogationUserPrompt,
  INTERROGATION_SYSTEM_PROMPT,
  parseInterrogationAnswer,
} from "@/lib/report-interrogation";
import {
  formatChunksForPrompt,
  searchReportChunks,
} from "@/lib/report-search";
import type {
  ReportAskContext,
  ReportChunkStore,
} from "@/lib/report-types";

const CHUNKS_FILE = path.join(process.cwd(), "data", "apdr2025-chunks.json");

function loadChunkStore(): ReportChunkStore {
  if (!fs.existsSync(CHUNKS_FILE)) {
    throw new Error(
      "Report chunks not found. Run: npm run ingest-reports",
    );
  }

  const raw = fs.readFileSync(CHUNKS_FILE, "utf8");
  return JSON.parse(raw) as ReportChunkStore;
}

function buildContextNote(context: ReportAskContext): string {
  const parts: string[] = [];
  if (context.country) {
    parts.push(`Country filter: ${context.country}`);
  }
  if (context.subregion) {
    parts.push(`Subregion filter: ${context.subregion}`);
  }
  if (context.disasterType && context.disasterType !== "All") {
    parts.push(`Disaster type filter: ${context.disasterType}`);
  }
  return parts.length > 0 ? parts.join("\n") : "No geography or hazard filters active.";
}

export async function POST(request: Request) {
  try {
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
      question?: string;
      context?: ReportAskContext;
    };
    const question = body.question?.trim();
    const context = body.context ?? {};

    if (!question) {
      return NextResponse.json(
        { error: "Please provide a question." },
        { status: 400 },
      );
    }

    const store = loadChunkStore();
    const matches = searchReportChunks(store.chunks, question, context, 10);
    const excerptBlock = formatChunksForPrompt(matches);
    const contextNote = buildContextNote(context);

    const client = new Anthropic({ apiKey });
    const completion = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      temperature: 0.1,
      system: INTERROGATION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildInterrogationUserPrompt(question, excerptBlock, contextNote),
        },
      ],
    });

    const textBlock = completion.content.find((block) => block.type === "text");
    const rawAnswer = textBlock?.type === "text" ? textBlock.text.trim() : "";
    if (!rawAnswer) {
      return NextResponse.json(
        { error: "No answer returned from the model." },
        { status: 502 },
      );
    }

    const answer = parseInterrogationAnswer(rawAnswer, question);

    return NextResponse.json({
      answer,
      source: store.source,
      year: store.year,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
