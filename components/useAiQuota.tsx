"use client";

import { useEffect, useState } from "react";
import { getAiRequestHeaders } from "@/lib/ai-client-headers";

export interface AiQuotaState {
  remaining: number;
  limit: number;
  resetAt: string;
}

const DEFAULT_DAILY_LIMIT = 10;

export function buildDefaultQuota(
  limit = DEFAULT_DAILY_LIMIT,
): AiQuotaState {
  const reset = new Date();
  reset.setUTCDate(reset.getUTCDate() + 1);
  reset.setUTCHours(0, 0, 0, 0);
  return {
    remaining: limit,
    limit,
    resetAt: reset.toISOString(),
  };
}

export function formatResetTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "midnight UTC";
  }
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

export function useAiQuota() {
  const [quota, setQuota] = useState<AiQuotaState>(() => buildDefaultQuota());

  useEffect(() => {
    let cancelled = false;

    async function loadQuota() {
      try {
        const response = await fetch("/api/quota", {
          headers: getAiRequestHeaders(),
        });
        const data = (await response.json()) as {
          quota?: AiQuotaState;
        };
        if (!cancelled && data.quota) {
          setQuota(data.quota);
        }
      } catch {
        // Keep client default quota so the banner still renders.
      }
    }

    void loadQuota();
    return () => {
      cancelled = true;
    };
  }, []);

  function applyQuotaFromResponse(data: { quota?: AiQuotaState }) {
    if (data.quota) {
      setQuota(data.quota);
    }
  }

  return { quota, applyQuotaFromResponse, formatResetTime };
}

export function AiQuotaNotice({
  quota,
  formatResetTime: formatReset,
}: {
  quota: AiQuotaState;
  formatResetTime: (iso: string) => string;
}) {
  return (
    <p className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600">
      AI questions today: {quota.remaining} of {quota.limit} remaining (resets{" "}
      {formatReset(quota.resetAt)} UTC). Shared across Ask APDR and Explain
      EM-DAT.
    </p>
  );
}
