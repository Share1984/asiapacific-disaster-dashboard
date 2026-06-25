"use client";

import { useState } from "react";
import { BarChart3, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import type { DashboardExplanation } from "@/lib/dashboard-explain-types";
import type { DashboardFilters } from "@/lib/types";
import { getAiRequestHeaders } from "@/lib/ai-client-headers";
import type { AiQuotaState } from "./useAiQuota";

interface EmdatExplainProps {
  filters: DashboardFilters;
  quota: AiQuotaState | null;
  onQuotaUpdate: (data: { quota?: AiQuotaState }) => void;
}

function AnswerSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function StructuredExplanation({
  explanation,
}: {
  explanation: DashboardExplanation;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-slate-800">
        {explanation.filterSummary}
      </p>

      {explanation.findings.length > 0 ? (
        <AnswerSection title="Key findings">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-800">
            {explanation.findings.map((finding) => (
              <li key={finding}>{finding}</li>
            ))}
          </ul>
        </AnswerSection>
      ) : null}

      {explanation.keyMetrics.length > 0 ? (
        <AnswerSection title="Metrics">
          <ul className="space-y-2 text-sm">
            {explanation.keyMetrics.map((item) => (
              <li
                key={`${item.label}-${item.value}`}
                className="rounded-md border border-slate-200 bg-white px-3 py-2"
              >
                <span className="font-medium text-slate-900">{item.label}:</span>{" "}
                <span className="text-slate-800">{item.value}</span>
              </li>
            ))}
          </ul>
        </AnswerSection>
      ) : null}

      {explanation.caveats.length > 0 ? (
        <AnswerSection title="Caveats">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-amber-900">
            {explanation.caveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        </AnswerSection>
      ) : null}

      {explanation.suggestedExplorations.length > 0 ? (
        <AnswerSection title="Suggested explorations">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
            {explanation.suggestedExplorations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </AnswerSection>
      ) : null}
    </div>
  );
}

export function EmdatExplain({
  filters,
  quota,
  onQuotaUpdate,
}: EmdatExplainProps) {
  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState("");
  const [explanation, setExplanation] = useState<DashboardExplanation | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const quotaExhausted = quota !== null && quota.remaining <= 0;

  const canClear = Boolean(question.trim() || explanation || error);

  async function handleExplain(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);
    setExplanation(null);

    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAiRequestHeaders(),
        },
        body: JSON.stringify({
          filters,
          question: question.trim() || undefined,
        }),
      });

      const data = (await response.json()) as {
        explanation?: DashboardExplanation;
        error?: string;
        quota?: { remaining: number; limit: number; resetAt: string };
      };

      if (!response.ok) {
        onQuotaUpdate(data);
        throw new Error(data.error ?? "Request failed.");
      }

      onQuotaUpdate(data);
      setExplanation(data.explanation ?? null);
      setExpanded(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setQuestion("");
    setExplanation(null);
    setError(null);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-violet-50 p-2 text-violet-700">
          <BarChart3 className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-slate-900">
            Explain EM-DAT view
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            AI summary of the filtered disaster data in the charts below —
            separate from Ask APDR 2025 above.
          </p>
          {!expanded && explanation ? (
            <p className="mt-2 truncate text-sm text-slate-600">
              Explained: {explanation.filterSummary}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          aria-label={
            expanded ? "Collapse Explain EM-DAT view" : "Expand Explain EM-DAT view"
          }
          className="shrink-0 rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          {expanded ? (
            <ChevronDown className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {expanded ? (
        <>
          <form onSubmit={handleExplain} className="mt-5 space-y-4">
            <label htmlFor="emdat-question" className="sr-only">
              Optional focus question for EM-DAT view
            </label>
            <textarea
              id="emdat-question"
              rows={2}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Optional: e.g. What stands out about deaths in this slice? Leave blank for a general summary."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={loading || quotaExhausted}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {loading ? "Analyzing view..." : "Explain this view"}
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={loading || !canClear}
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                Clear
              </button>
            </div>
          </form>

          {error ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {explanation ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                EM-DAT explanation
              </p>
              <div className="mt-3">
                <StructuredExplanation explanation={explanation} />
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Source: EM-DAT · Numbers from current dashboard filters
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
