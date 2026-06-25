"use client";

import { useEffect, useState } from "react";
import { getAiRequestHeaders } from "@/lib/ai-client-headers";

export interface AiQuotaState {
  remaining: number;
  limit: number;
  resetAt: string;
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
  const [quota, setQuota] = useState<AiQuotaState | null>(null);

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
        // Quota display is optional; ignore fetch errors.
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
  quota: AiQuotaState | null;
  formatResetTime: (iso: string) => string;
}) {
  if (!quota) {
    return null;
  }

  return (
    <p className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600">
      AI questions today: {quota.remaining} of {quota.limit} remaining (resets{" "}
      {formatReset(quota.resetAt)} UTC). Shared across Ask APDR and Explain
      EM-DAT.
    </p>
  );
}
