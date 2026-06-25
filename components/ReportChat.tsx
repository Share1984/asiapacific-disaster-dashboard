"use client";

import { useState } from "react";
import { MessageCircle, SendHorizonal } from "lucide-react";
import type { DashboardFilters } from "@/lib/types";
import type {
  EvidenceKind,
  EvidenceStrength,
  ReportInterrogationAnswer,
} from "@/lib/report-types";

interface ReportChatProps {
  filters: DashboardFilters;
}

const EVIDENCE_STRENGTH_STYLES: Record<EvidenceStrength, string> = {
  strong: "bg-emerald-100 text-emerald-800",
  moderate: "bg-amber-100 text-amber-800",
  weak: "bg-slate-200 text-slate-700",
};

const EVIDENCE_KIND_STYLES: Record<EvidenceKind, string> = {
  explicit: "text-emerald-700",
  implied: "text-amber-700",
  adjacent: "text-slate-600",
};

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

function StructuredAnswer({ answer }: { answer: ReportInterrogationAnswer }) {
  return (
    <div className="space-y-4">
      {answer.notExplicitlyAddressed ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This question is not directly addressed in the retrieved APDR 2025
          excerpts. Adjacent evidence may be shown below.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${EVIDENCE_STRENGTH_STYLES[answer.evidenceStrength]}`}
        >
          Evidence: {answer.evidenceStrength}
        </span>
        <span className="text-xs text-slate-500">
          Time horizon: {answer.timeHorizon}
        </span>
      </div>

      {answer.directFindings.length > 0 ? (
        <AnswerSection title="Direct report findings">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-800">
            {answer.directFindings.map((finding) => (
              <li key={finding}>{finding}</li>
            ))}
          </ul>
        </AnswerSection>
      ) : null}

      {answer.keyData.length > 0 ? (
        <AnswerSection title="Key data">
          <ul className="space-y-2 text-sm">
            {answer.keyData.map((item) => (
              <li
                key={`${item.metric}-${item.value}-${item.page ?? "na"}`}
                className="rounded-md border border-slate-200 bg-white px-3 py-2"
              >
                <span className="font-medium text-slate-900">{item.metric}:</span>{" "}
                <span className="text-slate-800">{item.value}</span>
                {item.page ? (
                  <span className="text-slate-500"> (p. {item.page})</span>
                ) : null}
                <span
                  className={`ml-2 text-xs font-medium ${EVIDENCE_KIND_STYLES[item.evidence]}`}
                >
                  {item.evidence}
                </span>
              </li>
            ))}
          </ul>
        </AnswerSection>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {answer.geographicFocus.length > 0 ? (
          <AnswerSection title="Geographic focus">
            <p className="text-sm text-slate-800">
              {answer.geographicFocus.join(", ")}
            </p>
          </AnswerSection>
        ) : null}

        {answer.hazardFocus.length > 0 ? (
          <AnswerSection title="Hazard focus">
            <p className="text-sm text-slate-800">
              {answer.hazardFocus.join(", ")}
            </p>
          </AnswerSection>
        ) : null}
      </div>

      {answer.affectedSectors.length > 0 ? (
        <AnswerSection title="Affected sectors">
          <p className="text-sm text-slate-800">
            {answer.affectedSectors.join(", ")}
          </p>
        </AnswerSection>
      ) : null}

      {answer.adjacentEvidence.length > 0 ? (
        <AnswerSection title="Adjacent evidence">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
            {answer.adjacentEvidence.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </AnswerSection>
      ) : null}

      {answer.gapsInReport.length > 0 ? (
        <AnswerSection title="Gaps in report">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
            {answer.gapsInReport.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        </AnswerSection>
      ) : null}

      {answer.citations.length > 0 ? (
        <AnswerSection title="Citations">
          <ul className="space-y-1 text-xs text-slate-500">
            {answer.citations.map((citation) => (
              <li key={citation.excerptId}>
                {citation.excerptId} · pp. {citation.pageStart}
                {citation.pageEnd !== citation.pageStart
                  ? `–${citation.pageEnd}`
                  : ""}
              </li>
            ))}
          </ul>
        </AnswerSection>
      ) : null}
    </div>
  );
}

export function ReportChat({ filters }: ReportChatProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<ReportInterrogationAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const contextLabel =
    filters.scope === "country" && filters.country
      ? `Using dashboard context: ${filters.country}`
      : filters.scope === "subregion" && filters.subregion
        ? `Using dashboard context: ${filters.subregion}`
        : filters.disasterType !== "All"
          ? `Using dashboard context: ${filters.disasterType}`
          : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) {
      return;
    }

    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          context: {
            country: filters.scope === "country" ? filters.country : undefined,
            subregion:
              filters.scope === "subregion" ? filters.subregion : undefined,
            disasterType: filters.disasterType,
          },
        }),
      });

      const data = (await response.json()) as {
        answer?: ReportInterrogationAnswer;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Request failed.");
      }

      setAnswer(data.answer ?? null);
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

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-sky-50 p-2 text-sky-700">
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-slate-900">Ask APDR 2025</h2>
          <p className="mt-1 text-sm text-slate-600">
            Interrogate the Asia-Pacific Disaster Report 2025 with structured,
            cited answers — separate from the EM-DAT charts above.
          </p>
          {contextLabel ? (
            <p className="mt-1 text-xs text-sky-700">{contextLabel}</p>
          ) : null}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label htmlFor="report-question" className="sr-only">
          Question about APDR 2025
        </label>
        <textarea
          id="report-question"
          rows={3}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="e.g. What does the report say about heat as a systemic risk multiplier?"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <SendHorizonal className="h-4 w-4" aria-hidden="true" />
          {loading ? "Analyzing report..." : "Ask"}
        </button>
      </form>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {answer ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Report interrogation
          </p>
          <div className="mt-3">
            <StructuredAnswer answer={answer} />
          </div>
          <p className="mt-4 text-xs text-slate-500">Source: APDR 2025</p>
        </div>
      ) : null}
    </section>
  );
}
