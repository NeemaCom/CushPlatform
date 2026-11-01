import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

type ScoreBreakdown = {
  user: {
    id: number;
    email: string;
    displayName: string;
  };
  assessment: {
    algorithmVersion: string;
    assessmentStatus: string;
    score: number | null;
    provisionalScore: number | null;
    scoreCoveragePercent: number;
    scoredComponentCount: number;
    confidenceScore: number | null;
    confidenceBand: "low" | "medium" | "high" | null;
    components: Array<{
      key: string;
      label: string;
      weightPercent: number;
      score: number | null;
      weightedContribution: number | null;
    }>;
    confidenceBreakdown: null | {
      financialHistoryDepth: number;
      sourceQualityAndVerification: number;
      creditInformationAvailability: number;
      dataFreshness: number;
      accountCoverage: number;
      incomeSourceReliability: number;
      integrityDeduction: number;
    };
    usableHistoryMonths: number;
    missingRequirements: string[];
    activePolicyVersion: number | null;
    baseline: null | {
      destination: string;
      monthlyBaselinePence: number;
      effectiveDate: string;
      provenance: string;
    };
    generatedAt: string;
  };
};

const confidenceLabels: Array<{
  key: keyof NonNullable<ScoreBreakdown["assessment"]["confidenceBreakdown"]>;
  label: string;
}> = [
  { key: "financialHistoryDepth", label: "History depth" },
  { key: "sourceQualityAndVerification", label: "Source quality" },
  { key: "creditInformationAvailability", label: "Credit information" },
  { key: "dataFreshness", label: "Data freshness" },
  { key: "accountCoverage", label: "Account coverage" },
  { key: "incomeSourceReliability", label: "Income source" },
  { key: "integrityDeduction", label: "Integrity deductions" },
];

function moneyFromPence(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value / 100);
}

function ScoreReviewResult({ data }: { data: ScoreBreakdown }) {
  const { assessment } = data;
  const displayedScore = assessment.score ?? assessment.provisionalScore;
  const date = new Date(assessment.generatedAt);

  return (
    <div className="mt-6 space-y-5">
      <section className="rounded-2xl border border-[#343279] bg-[#29266f] p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#c9c7ef]">
              Cush score · {assessment.assessmentStatus}
            </p>
            <h2 className="mt-1 text-xl font-semibold">{data.user.displayName}</h2>
            <p className="mt-1 text-sm text-[#d5d3f2]">{data.user.email}</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#c9c7ef]">
              {assessment.score === null ? "Provisional score" : "Cush score"}
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums">
              {displayedScore === null ? "—" : displayedScore}
              <span className="ml-1 text-sm font-medium text-[#d5d3f2]">/1000</span>
            </p>
            <p className="mt-1 text-xs text-[#d5d3f2]">
              {assessment.scoreCoveragePercent}% component coverage
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-2 border-t border-white/15 pt-4 text-xs text-[#e1e0f7] sm:grid-cols-3">
          <p>Algorithm: <span className="font-semibold">{assessment.algorithmVersion}</span></p>
          <p>Active policy: <span className="font-semibold">{assessment.activePolicyVersion === null ? "None" : `v${assessment.activePolicyVersion}`}</span></p>
          <p>
            Monthly baseline:{" "}
            <span className="font-semibold">
              {assessment.baseline
                ? `${moneyFromPence(assessment.baseline.monthlyBaselinePence)} · effective ${assessment.baseline.effectiveDate}`
                : "None active"}
            </span>
          </p>
        </div>
      </section>

      <section aria-labelledby="component-breakdown-heading">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h3 id="component-breakdown-heading" className="font-semibold text-[#24252a]">
              Component breakdown
            </h3>
            <p className="mt-1 text-xs text-[#777973]">Component scores are out of 100; contributions are Cush Score points out of 1,000.</p>
          </div>
          <span className="text-xs text-[#777973]">{assessment.scoredComponentCount}/4 scored</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {assessment.components.map((component, index) => {
            const colors = [
              ["#dbeafe", "#2563eb"],
              ["#dcfce7", "#16a34a"],
              ["#ede9fe", "#7c3aed"],
              ["#ffedd5", "#ea580c"],
            ][index]!;
            return (
              <article key={component.key} className="rounded-xl border border-[#e7e5dc] bg-[#fbfaf6] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-[#24252a]">{component.label}</h4>
                    <p className="mt-1 text-xs text-[#777973]">Weight {component.weightPercent}%</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums text-[#24252a]">
                      {component.score === null ? "—" : `${component.score}/100`}
                    </p>
                    <p className="mt-1 text-[11px] text-[#777973]">
                      {component.weightedContribution === null
                        ? "Not contributing"
                        : `+${component.weightedContribution} points`}
                    </p>
                  </div>
                </div>
                <div
                  className="mt-3 h-2 overflow-hidden rounded-full"
                  style={{ backgroundColor: colors[0] }}
                  role="progressbar"
                  aria-label={`${component.label} score`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={component.score ?? 0}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${component.score ?? 0}%`,
                      backgroundColor: colors[1],
                    }}
                  />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-[#e7e5dc] bg-[#fbfaf6] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-[#24252a]">Confidence detail</h3>
              <p className="mt-1 text-xs text-[#777973]">Evidence quality and completeness; separate from score.</p>
            </div>
            <p className="font-bold text-[#37338d]">
              {assessment.confidenceScore === null ? "—" : `${assessment.confidenceScore}/100`}
            </p>
          </div>
          {assessment.confidenceBreakdown ? (
            <dl className="mt-4 space-y-2">
              {confidenceLabels.map(({ key, label }) => (
                <div key={key} className="flex justify-between gap-4 text-xs">
                  <dt className="text-[#6f706f]">{label}</dt>
                  <dd className="font-semibold tabular-nums text-[#24252a]">
                    {key === "integrityDeduction" && assessment.confidenceBreakdown![key] > 0 ? "−" : ""}
                    {assessment.confidenceBreakdown![key]} pts
                  </dd>
                </div>
              ))}
              <div className="flex justify-between border-t border-[#e7e5dc] pt-2 text-xs">
                <dt className="text-[#6f706f]">Usable history</dt>
                <dd className="font-semibold text-[#24252a]">{assessment.usableHistoryMonths} months</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-[#777973]">Confidence is unavailable until a policy is active and evidence is present.</p>
          )}
        </section>

        <section className="rounded-xl border border-[#e7e5dc] bg-[#fbfaf6] p-4">
          <h3 className="font-semibold text-[#24252a]">Assessment requirements</h3>
          {assessment.missingRequirements.length ? (
            <ul className="mt-3 space-y-2 text-sm text-[#6f706f]">
              {assessment.missingRequirements.map((requirement) => (
                <li key={requirement} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  {requirement}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm font-medium text-emerald-700">All score completion requirements are satisfied.</p>
          )}
          <p className="mt-4 border-t border-[#e7e5dc] pt-3 text-[11px] text-[#85867f]">
            Reviewed {Number.isNaN(date.getTime()) ? assessment.generatedAt : date.toLocaleString("en-GB")}
          </p>
        </section>
      </div>
    </div>
  );
}

export default function CushUserScoreReview() {
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const queryClient = useQueryClient();
  const lookupQuery = useQuery<ScoreBreakdown>({
    queryKey: ["/api/admin/score-breakdown", submittedEmail],
    enabled: submittedEmail.length > 0,
    retry: false,
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/admin/score-breakdown", { email: submittedEmail });
      return response.json() as Promise<ScoreBreakdown>;
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    setSubmittedEmail(normalizedEmail);
    if (normalizedEmail === submittedEmail) {
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/score-breakdown", normalizedEmail] });
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-800">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Per-user score review</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Enter the user’s exact account email to see their internal component and confidence breakdown. Access is logged; raw statements and bureau responses are not displayed.
            </p>
          </div>
        </div>
        <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="score-review-email">User account email</label>
          <input
            id="score-review-email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            placeholder="user@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
          />
          <button
            type="submit"
            disabled={lookupQuery.isFetching}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#29266f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#37338d] disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            {lookupQuery.isFetching ? "Loading…" : "Review score"}
          </button>
        </form>
        {lookupQuery.isError && (
          <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {(lookupQuery.error as Error).message}
          </p>
        )}
        {lookupQuery.isLoading && submittedEmail && (
          <p role="status" className="mt-3 text-sm text-slate-500">Loading the latest calculation…</p>
        )}
      </section>
      {lookupQuery.data && <ScoreReviewResult data={lookupQuery.data} />}
    </div>
  );
}
