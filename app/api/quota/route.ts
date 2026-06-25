import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  buildSessionCookie,
  getResetAtIso,
  getDailyLimit,
  peekAiQuota,
} from "@/lib/ai-rate-limit";
import { quotaPayload } from "@/lib/ai-quota-http";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const needsSessionCookie = !cookieHeader.includes("ai_session=");

  try {
    const quota = await peekAiQuota(request);
    const response = NextResponse.json({ quota: quotaPayload(quota) });

    if (needsSessionCookie) {
      response.headers.append("Set-Cookie", buildSessionCookie(randomUUID()));
    }

    return response;
  } catch (error) {
    const limit = getDailyLimit();
    const response = NextResponse.json({
      quota: {
        remaining: limit,
        limit,
        resetAt: getResetAtIso(),
      },
      warning:
        error instanceof Error ? error.message : "Quota storage unavailable.",
    });

    if (needsSessionCookie) {
      response.headers.append("Set-Cookie", buildSessionCookie(randomUUID()));
    }

    return response;
  }
}
