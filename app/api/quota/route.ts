import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  buildSessionCookie,
  peekAiQuota,
} from "@/lib/ai-rate-limit";
import { quotaPayload } from "@/lib/ai-quota-http";

export async function GET(request: Request) {
  try {
    const quota = await peekAiQuota(request);
    const response = NextResponse.json({ quota: quotaPayload(quota) });

    const cookieHeader = request.headers.get("cookie") ?? "";
    if (!cookieHeader.includes("ai_session=")) {
      response.headers.append("Set-Cookie", buildSessionCookie(randomUUID()));
    }

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Quota check failed.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
