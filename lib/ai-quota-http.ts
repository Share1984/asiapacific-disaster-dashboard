import { NextResponse } from "next/server";
import {
  buildSessionCookie,
  consumeAiQuota,
  type AiQuotaEnforcement,
  type AiQuotaResult,
} from "./ai-rate-limit";

export interface AiQuotaPayload {
  remaining: number;
  limit: number;
  resetAt: string;
}

export function quotaPayload(quota: AiQuotaResult): AiQuotaPayload {
  return {
    remaining: quota.remaining,
    limit: quota.limit,
    resetAt: quota.resetAt,
  };
}

export function quotaExceededResponse(
  enforcement: AiQuotaEnforcement,
): NextResponse {
  const { quota } = enforcement;
  const response = NextResponse.json(
    {
      error:
        "Daily AI question limit reached. You can still use the charts and filters. Try again after midnight UTC.",
      quota: quotaPayload(quota),
    },
    { status: 429 },
  );

  applyQuotaToResponse(response, enforcement);
  return response;
}

export function applyQuotaToResponse(
  response: NextResponse,
  enforcement: AiQuotaEnforcement,
): NextResponse {
  const { quota, sessionId, setSessionCookie } = enforcement;

  response.headers.set("X-AI-Quota-Remaining", String(quota.remaining));
  response.headers.set("X-AI-Quota-Limit", String(quota.limit));

  if (setSessionCookie) {
    response.headers.append("Set-Cookie", buildSessionCookie(sessionId));
  }

  return response;
}

export async function enforceAiQuotaOrRespond(
  request: Request,
): Promise<
  | { ok: true; enforcement: AiQuotaEnforcement }
  | { ok: false; response: NextResponse }
> {
  try {
    const enforcement = await consumeAiQuota(request);

    if (!enforcement.quota.allowed) {
      return { ok: false, response: quotaExceededResponse(enforcement) };
    }

    return { ok: true, enforcement };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Rate limit check failed.";
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "AI question limit could not be verified. Ensure Firestore is enabled for this Firebase project.",
          details: message,
        },
        { status: 503 },
      ),
    };
  }
}
