import { createHash, randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getFirestoreAdmin } from "./firestore-admin";

export interface AiQuotaResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string;
  bypassed: boolean;
}

export interface AiQuotaEnforcement {
  quota: AiQuotaResult;
  sessionId: string;
  setSessionCookie: boolean;
}

const QUOTA_COLLECTION = "ai_quota";
const SESSION_COOKIE = "ai_session";
const BYPASS_HEADER = "x-ai-bypass";

const DEFAULT_LIMIT = 10;

function getDailyLimit(): number {
  const parsed = Number(process.env.AI_RATE_LIMIT_MAX ?? DEFAULT_LIMIT);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LIMIT;
}

function isRateLimitDisabled(): boolean {
  return process.env.AI_RATE_LIMIT_DISABLED === "true";
}

function getUtcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function getResetAt(date = new Date()): string {
  const reset = new Date(date);
  reset.setUTCDate(reset.getUTCDate() + 1);
  reset.setUTCHours(0, 0, 0, 0);
  return reset.toISOString();
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

function readSessionCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`),
  );
  return match?.[1] ?? null;
}

function hashIdentity(sessionId: string, ip: string): string {
  return createHash("sha256")
    .update(`${sessionId}:${ip}`)
    .digest("hex")
    .slice(0, 32);
}

function hasBypassToken(request: Request): boolean {
  const expected = process.env.AI_BYPASS_TOKEN?.trim();
  if (!expected) {
    return false;
  }

  const headerToken = request.headers.get(BYPASS_HEADER)?.trim();
  return Boolean(headerToken && headerToken === expected);
}

function unlimitedQuota(limit: number): AiQuotaResult {
  return {
    allowed: true,
    remaining: limit,
    limit,
    resetAt: getResetAt(),
    bypassed: true,
  };
}

export function buildSessionCookie(sessionId: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}`;
}

export async function consumeAiQuota(
  request: Request,
): Promise<AiQuotaEnforcement> {
  const limit = getDailyLimit();
  const resetAt = getResetAt();

  const existingSession = readSessionCookie(request);
  const sessionId = existingSession ?? randomUUID();
  const setSessionCookie = !existingSession;

  if (isRateLimitDisabled() || hasBypassToken(request)) {
    return {
      quota: unlimitedQuota(limit),
      sessionId,
      setSessionCookie,
    };
  }

  const identityHash = hashIdentity(sessionId, getClientIp(request));
  const dateKey = getUtcDateKey();
  const docId = `${identityHash}_${dateKey}`;

  const db = getFirestoreAdmin();
  const docRef = db.collection(QUOTA_COLLECTION).doc(docId);

  const quota = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef);

    if (!snapshot.exists) {
      transaction.set(docRef, {
        count: 1,
        identityHash,
        dateKey,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        allowed: true,
        remaining: limit - 1,
        limit,
        resetAt,
        bypassed: false,
      };
    }

    const data = snapshot.data() as {
      count?: number;
      dateKey?: string;
    };

    const count = data.dateKey === dateKey ? (data.count ?? 0) : 0;

    if (count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        limit,
        resetAt,
        bypassed: false,
      };
    }

    const nextCount = count + 1;
    transaction.set(
      docRef,
      {
        count: nextCount,
        identityHash,
        dateKey,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return {
      allowed: true,
      remaining: limit - nextCount,
      limit,
      resetAt,
      bypassed: false,
    };
  });

  return {
    quota,
    sessionId,
    setSessionCookie,
  };
}

export async function peekAiQuota(request: Request): Promise<AiQuotaResult> {
  const limit = getDailyLimit();
  const resetAt = getResetAt();

  if (isRateLimitDisabled() || hasBypassToken(request)) {
    return unlimitedQuota(limit);
  }

  const sessionId = readSessionCookie(request);
  if (!sessionId) {
    return {
      allowed: true,
      remaining: limit,
      limit,
      resetAt,
      bypassed: false,
    };
  }

  const identityHash = hashIdentity(sessionId, getClientIp(request));
  const dateKey = getUtcDateKey();
  const docId = `${identityHash}_${dateKey}`;

  const db = getFirestoreAdmin();
  const snapshot = await db.collection(QUOTA_COLLECTION).doc(docId).get();

  if (!snapshot.exists) {
    return {
      allowed: true,
      remaining: limit,
      limit,
      resetAt,
      bypassed: false,
    };
  }

  const data = snapshot.data() as { count?: number; dateKey?: string };
  const count = data.dateKey === dateKey ? (data.count ?? 0) : 0;
  const remaining = Math.max(0, limit - count);

  return {
    allowed: remaining > 0,
    remaining,
    limit,
    resetAt,
    bypassed: false,
  };
}
