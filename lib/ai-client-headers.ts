const BYPASS_STORAGE_KEY = "ai_bypass_token";

export function getAiRequestHeaders(): HeadersInit {
  if (typeof window === "undefined") {
    return {};
  }

  const bypassToken = window.localStorage.getItem(BYPASS_STORAGE_KEY)?.trim();
  if (!bypassToken) {
    return {};
  }

  return {
    "x-ai-bypass": bypassToken,
  };
}
