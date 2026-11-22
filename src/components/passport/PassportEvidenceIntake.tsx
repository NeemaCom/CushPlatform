import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Clock3, Download, FileText, Loader2, Save, ShieldCheck, Trash2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { accountRequest } from "@/lib/account-api";
import { API_BASE_URL } from "@/lib/api-base";
import { getProductSessionHeaders } from "@/lib/product-session";

type FinancialProfile = {
  countryCode: string;
  currencyCode: string;
  employmentStatus: string;
  employer: string;
  jobTitle: string;
  incomeAmount: string;
  incomeFrequency: "weekly" | "monthly" | "annual" | "variable" | "";
  housingStatus: string;
  housingCost: string;
  savingsAmount: string;
  commitmentsAmount: string;
  financialHistorySummary: string;
};

type ProfileData = {
  profile: FinancialProfile | null;
  progress: {
    completed: number;
    total: number;
    percent: number;
    steps: Array<{ id: string; label: string; complete: boolean }>;
  };
  updatedAt: string | null;
};

type Submission = {
  id: number;
  documentType: string;
  label: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  countryCode: string;
  currencyCode: string;
  reviewStatus: string;
  evidenceClassification: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type SubmissionDetail = {
  submission: Submission;
  extractedDraft: string;
  correctedDraft: string | null;
  events: Array<{ eventType: string; createdAt: string }>;
};

const EMPTY_PROFILE: FinancialProfile = {
  countryCode: "GB",
  currencyCode: "GBP",
  employmentStatus: "",
  employer: "",
  jobTitle: "",
  incomeAmount: "",
  incomeFrequency: "",
  housingStatus: "",
  housingCost: "",
  savingsAmount: "",
  commitmentsAmount: "",
  financialHistorySummary: "",
};

const DOCUMENT_TYPES = [
  ["payslip", "Payslip"],
  ["bank_statement", "Bank statement"],
  ["rent_receipt", "Rent or housing record"],
  ["savings_statement", "Savings statement"],
  ["commitment_statement", "Financial commitment"],
  ["proof_of_residency", "Proof of residency"],
  ["tax_return", "Tax return"],
  ["employment_contract", "Employment contract"],
  ["transfer_receipt", "Transfer receipt"],
  ["other", "Other document"],
];

function readableStatus(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "Not submitted";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function profileRequest<T>(method: string, path: string, body?: unknown) {
  return accountRequest<T>(method, path, body);
}

async function uploadDocument(file: File, metadata: {
  documentType: string;
  label: string;
  countryCode: string;
  currencyCode: string;
}) {
  const contentType = file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "text/csv";
  const response = await fetch(`${API_BASE_URL}/api/passport/evidence-submissions`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...getProductSessionHeaders(),
      "Content-Type": contentType,
      "X-Evidence-Type": metadata.documentType,
      "X-Evidence-Label": metadata.label,
      "X-Country-Code": metadata.countryCode,
      "X-Currency-Code": metadata.currencyCode,
      "X-Evidence-Filename": encodeURIComponent(file.name),
    },
    body: file,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "The file could not be uploaded.");
  }
  return payload as { submission: Submission; extractedDraft: string; extractionStatus: string };
}

function statusTone(status: string) {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "submitted" || status === "under_review") return "border-blue-200 bg-blue-50 text-blue-800";
  if (status === "additional_information_required") return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "rejected") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

export default function PassportEvidenceIntake() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [documentType, setDocumentType] = useState("bank_statement");
  const [documentLabel, setDocumentLabel] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [correctedDraft, setCorrectedDraft] = useState("");

  const profileQuery = useQuery<ProfileData>({
    queryKey: ["/api/passport/financial-profile"],
    queryFn: () => profileRequest("GET", "/api/passport/financial-profile"),
    retry: false,
  });
  const documentsQuery = useQuery<{ submissions: Submission[] }>({
    queryKey: ["/api/passport/evidence-submissions"],
    queryFn: () => profileRequest("GET", "/api/passport/evidence-submissions"),
    retry: false,
  });
  const detailQuery = useQuery<SubmissionDetail>({
    queryKey: ["/api/passport/evidence-submissions", selectedId],
    queryFn: () => profileRequest("GET", `/api/passport/evidence-submissions/${selectedId}`),
    enabled: selectedId !== null,
    retry: false,
  });
  const historyQuery = useQuery<{ events: Array<{ id: number; eventType: string; createdAt: string }> }>({
    queryKey: ["/api/passport/evidence-history"],
    queryFn: () => profileRequest("GET", "/api/passport/evidence-history"),
    retry: false,
  });

  useEffect(() => {
    if (profileQuery.data) setProfile(profileQuery.data.profile ?? EMPTY_PROFILE);
  }, [profileQuery.data]);
  useEffect(() => {
    if (detailQuery.data) {
      setCorrectedDraft(detailQuery.data.correctedDraft ?? detailQuery.data.extractedDraft);
    }
  }, [detailQuery.data]);

  const invalidateIntake = () => {
    void queryClient.invalidateQueries({ queryKey: ["/api/passport/financial-profile"] });
    void queryClient.invalidateQueries({ queryKey: ["/api/passport/evidence-submissions"] });
    void queryClient.invalidateQueries({ queryKey: ["/api/passport/evidence-history"] });
    if (selectedId !== null) void queryClient.invalidateQueries({ queryKey: ["/api/passport/evidence-submissions", selectedId] });
  };

  const saveProfile = useMutation({
    mutationFn: () => profileRequest("PUT", "/api/passport/financial-profile", profile),
    onSuccess: () => {
      invalidateIntake();
      toast({ title: "Financial profile saved", description: "These details are stored separately and do not change your Cush Score." });
    },
    onError: (error: Error) => toast({ title: "Could not save profile", description: error.message, variant: "destructive" }),
  });
  const clearProfile = useMutation({
    mutationFn: () => profileRequest("DELETE", "/api/passport/financial-profile"),
    onSuccess: () => {
      setProfile(EMPTY_PROFILE);
      invalidateIntake();
      toast({ title: "Financial profile removed" });
    },
    onError: (error: Error) => toast({ title: "Could not remove profile", description: error.message, variant: "destructive" }),
  });
  const upload = useMutation({
    mutationFn: () => {
      if (!documentFile) throw new Error("Choose a PDF or CSV first.");
      return uploadDocument(documentFile, {
        documentType,
        label: documentLabel.trim() || documentFile.name,
        countryCode: profile.countryCode,
        currencyCode: profile.currencyCode,
      });
    },
    onSuccess: (result) => {
      setSelectedId(result.submission.id);
      setCorrectedDraft(result.extractedDraft);
      setDocumentFile(null);
      setDocumentLabel("");
      invalidateIntake();
      toast({
        title: "Private document uploaded",
        description: result.extractionStatus === "text_extracted"
          ? "Review the extracted draft, correct it if needed, then submit for Cush review."
          : "No text could be extracted. Add a summary or correction before submitting.",
      });
    },
    onError: (error: Error) => toast({ title: "Upload failed", description: error.message, variant: "destructive" }),
  });
  const saveCorrection = useMutation({
    mutationFn: () => profileRequest("PUT", `/api/passport/evidence-submissions/${selectedId}/draft`, { correctedDraft }),
    onSuccess: () => {
      invalidateIntake();
      toast({ title: "Draft corrections saved" });
    },
    onError: (error: Error) => toast({ title: "Could not save corrections", description: error.message, variant: "destructive" }),
  });
  const submitDocument = useMutation({
    mutationFn: async () => {
      if (selectedId === null) throw new Error("Choose a document first.");
      await profileRequest("PUT", `/api/passport/evidence-submissions/${selectedId}/draft`, { correctedDraft });
      return profileRequest("POST", `/api/passport/evidence-submissions/${selectedId}/submit`);
    },
    onSuccess: () => {
      invalidateIntake();
      toast({ title: "Document submitted for review" });
    },
    onError: (error: Error) => toast({ title: "Could not submit document", description: error.message, variant: "destructive" }),
  });
  const deleteDocument = useMutation({
    mutationFn: (id: number) => profileRequest("DELETE", `/api/passport/evidence-submissions/${id}`),
    onSuccess: (_result, id) => {
      if (selectedId === id) setSelectedId(null);
      invalidateIntake();
      toast({ title: "Document removed" });
    },
    onError: (error: Error) => toast({ title: "Could not remove document", description: error.message, variant: "destructive" }),
  });

  const progress = profileQuery.data?.progress;
  const selected = useMemo(
    () => documentsQuery.data?.submissions.find((item) => item.id === selectedId) ?? detailQuery.data?.submission,
    [documentsQuery.data?.submissions, detailQuery.data?.submission, selectedId],
  );
  const canEditDraft = selected && ["draft", "additional_information_required"].includes(selected.reviewStatus);

  async function downloadFile(id: number, name: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/passport/evidence-submissions/${id}/file`, {
        credentials: "include",
        headers: getProductSessionHeaders(),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload?.error === "string" ? payload.error : "Download failed.");
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = name;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      toast({ title: "Could not download document", description: error instanceof Error ? error.message : "Download failed.", variant: "destructive" });
    }
  }

  return (
    <section className="space-y-5" aria-labelledby="passport-evidence-heading">
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="passport-evidence-heading" className="text-base font-bold text-slate-900">Financial profile and evidence</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Add details in your original country and currency, then attach a PDF or CSV if you choose. Your entries and uploads are private, reviewed separately, and do not change your Cush Score.
            </p>
          </div>
        </div>
        {profileQuery.isLoading ? (
          <p className="mt-5 text-sm text-slate-500">Loading your profile…</p>
        ) : profileQuery.error ? (
          <p className="mt-5 rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">
            {profileQuery.error instanceof Error ? profileQuery.error.message : "Your financial profile could not be loaded."}
          </p>
        ) : (
          <>
            <div className="mt-5 rounded-xl border border-blue-100 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Profile completeness</p>
                  <p className="mt-0.5 text-xs text-slate-500">{progress?.completed ?? 0} of {progress?.total ?? 6} areas added</p>
                </div>
                <span className="text-sm font-bold text-blue-800">{progress?.percent ?? 0}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress?.percent ?? 0}%` }} />
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {progress?.steps.map((step) => (
                  <div key={step.id} className="flex items-center gap-2 text-xs text-slate-600">
                    {step.complete
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                      : <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden="true" />}
                    {step.label}{step.complete ? "" : " — add details"}
                  </div>
                ))}
              </div>
            </div>

            <form
              className="mt-5 space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                saveProfile.mutate();
              }}
            >
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Your financial details</h3>
                <p className="mt-1 text-xs text-slate-500">Amounts stay in the currency you enter; they are not converted into scoring inputs.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="space-y-1 text-xs font-medium text-slate-700">
                  Country code
                  <input required maxLength={2} value={profile.countryCode} onChange={(event) => setProfile({ ...profile, countryCode: event.target.value.toUpperCase() })} placeholder="GB" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm uppercase" />
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-700">
                  Currency code
                  <input required maxLength={3} value={profile.currencyCode} onChange={(event) => setProfile({ ...profile, currencyCode: event.target.value.toUpperCase() })} placeholder="GBP" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm uppercase" />
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-700">
                  Employment status
                  <input maxLength={80} value={profile.employmentStatus} onChange={(event) => setProfile({ ...profile, employmentStatus: event.target.value })} placeholder="Employed, self-employed…" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-700">
                  Employer
                  <input maxLength={160} value={profile.employer} onChange={(event) => setProfile({ ...profile, employer: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-700">
                  Job title
                  <input maxLength={120} value={profile.jobTitle} onChange={(event) => setProfile({ ...profile, jobTitle: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-700">
                  Income amount
                  <input inputMode="decimal" value={profile.incomeAmount} onChange={(event) => setProfile({ ...profile, incomeAmount: event.target.value })} placeholder="e.g. 2500.00" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-700">
                  Income frequency
                  <select value={profile.incomeFrequency} onChange={(event) => setProfile({ ...profile, incomeFrequency: event.target.value as FinancialProfile["incomeFrequency"] })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                    <option value="">Select frequency</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="annual">Annual</option><option value="variable">Variable</option>
                  </select>
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-700">
                  Housing arrangement
                  <input maxLength={100} value={profile.housingStatus} onChange={(event) => setProfile({ ...profile, housingStatus: event.target.value })} placeholder="Renting, owned…" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-700">
                  Housing cost
                  <input inputMode="decimal" value={profile.housingCost} onChange={(event) => setProfile({ ...profile, housingCost: event.target.value })} placeholder="Amount in selected currency" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-700">
                  Savings amount
                  <input inputMode="decimal" value={profile.savingsAmount} onChange={(event) => setProfile({ ...profile, savingsAmount: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-700">
                  Regular commitments
                  <input inputMode="decimal" value={profile.commitmentsAmount} onChange={(event) => setProfile({ ...profile, commitmentsAmount: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                </label>
              </div>
              <label className="block space-y-1 text-xs font-medium text-slate-700">
                Financial history or context
                <textarea maxLength={2000} rows={3} value={profile.financialHistorySummary} onChange={(event) => setProfile({ ...profile, financialHistorySummary: event.target.value })} placeholder="Add relevant context about your financial history. Do not include passwords, PINs, or full account numbers." className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={saveProfile.isPending} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
                  {saveProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save details
                </button>
                {profileQuery.data?.profile && (
                  <button type="button" disabled={clearProfile.isPending} onClick={() => {
                    if (window.confirm("Remove your saved financial profile details? This does not remove uploaded documents.")) clearProfile.mutate();
                  }} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-50">
                    Clear profile
                  </button>
                )}
              </div>
            </form>
          </>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="evidence-upload-heading">
          <h3 id="evidence-upload-heading" className="text-sm font-bold text-slate-900">Add a supporting document</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">PDF and CSV only, up to 5 MB. Files and extracted text are encrypted before they are saved.</p>
          <div className="mt-4 space-y-3">
            <label className="block space-y-1 text-xs font-medium text-slate-700">
              Document type
              <select value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                {DOCUMENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="block space-y-1 text-xs font-medium text-slate-700">
              Label
              <input maxLength={120} value={documentLabel} onChange={(event) => setDocumentLabel(event.target.value)} placeholder="e.g. October payslip" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            </label>
            <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center hover:bg-blue-50">
              <Upload className="h-5 w-5 text-blue-700" aria-hidden="true" />
              <span className="mt-2 text-sm font-semibold text-slate-700">{documentFile?.name || "Choose a PDF or CSV"}</span>
              <span className="mt-1 text-xs text-slate-500">{documentFile ? `${(documentFile.size / 1024 / 1024).toFixed(2)} MB` : "Maximum 5 MB"}</span>
              <input
                type="file"
                accept=".pdf,.csv,application/pdf,text/csv"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (file && file.size > 5 * 1024 * 1024) {
                    toast({ title: "File too large", description: "Choose a PDF or CSV file no larger than 5 MB.", variant: "destructive" });
                    event.target.value = "";
                    return;
                  }
                  setDocumentFile(file);
                }}
              />
            </label>
            <button type="button" disabled={!documentFile || upload.isPending} onClick={() => upload.mutate()} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
              {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload privately
            </button>
            <p className="text-xs leading-5 text-slate-500">Only upload records relevant to your financial profile. Never upload passwords, PINs, or full payment-card details.</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="evidence-history-heading">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 id="evidence-history-heading" className="text-sm font-bold text-slate-900">Documents and review history</h3>
              <p className="mt-1 text-xs text-slate-500">An upload is not verification. Cush will update the status after review.</p>
            </div>
            <span className="text-xs text-slate-500">{documentsQuery.data?.submissions.length ?? 0} document(s)</span>
          </div>
          {documentsQuery.isLoading ? <p className="mt-4 text-sm text-slate-500">Loading documents…</p> :
            documentsQuery.error ? <p className="mt-4 text-sm text-rose-700">Documents could not be loaded.</p> :
              !documentsQuery.data?.submissions.length ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center">
                  <FileText className="mx-auto h-6 w-6 text-slate-400" aria-hidden="true" />
                  <p className="mt-2 text-sm font-medium text-slate-700">No documents yet</p>
                  <p className="mt-1 text-xs text-slate-500">Your uploads and review updates will appear here.</p>
                </div>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100">
                  {documentsQuery.data.submissions.map((item) => (
                    <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <button type="button" onClick={() => setSelectedId(item.id)} className="min-w-0 text-left">
                          <span className="block truncate text-sm font-semibold text-slate-800">{item.label}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{item.fileName} · {item.countryCode} / {item.currencyCode}</span>
                        </button>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusTone(item.reviewStatus)}`}>{readableStatus(item.reviewStatus)}</span>
                          <button type="button" aria-label={`Download ${item.fileName}`} onClick={() => void downloadFile(item.id, item.fileName)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                            <Download className="h-4 w-4" />
                          </button>
                          {["draft", "additional_information_required", "rejected"].includes(item.reviewStatus) && (
                            <button type="button" aria-label={`Delete ${item.fileName}`} disabled={deleteDocument.isPending} onClick={() => {
                              if (window.confirm(`Permanently remove ${item.fileName}?`)) deleteDocument.mutate(item.id);
                            }} className="rounded-md p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
          {selectedId !== null && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              {detailQuery.isLoading ? <p className="text-sm text-slate-500">Loading extracted draft…</p> :
                detailQuery.error ? <p className="text-sm text-rose-700">The draft could not be opened.</p> :
                  detailQuery.data && (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{detailQuery.data.submission.label}</p>
                          <p className="mt-1 text-xs text-slate-500">Extracted text is a draft; check it against your document before submitting.</p>
                        </div>
                        <button type="button" onClick={() => setSelectedId(null)} className="text-xs font-medium text-slate-500 hover:text-slate-900">Close</button>
                      </div>
                      {!detailQuery.data.extractedDraft && (
                        <p className="mt-3 flex gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                          <AlertCircle className="h-4 w-4 shrink-0" /> No text was extracted. This can happen with scanned PDFs; add a concise summary or correction below.
                        </p>
                      )}
                      <label className="mt-3 block space-y-1 text-xs font-medium text-slate-700">
                        Review or correct the extracted draft
                        <textarea
                          maxLength={25_000}
                          rows={7}
                          value={correctedDraft}
                          onChange={(event) => setCorrectedDraft(event.target.value)}
                          readOnly={!canEditDraft}
                          className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs leading-5 read-only:bg-slate-50"
                        />
                      </label>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" disabled={!canEditDraft || saveCorrection.isPending} onClick={() => saveCorrection.mutate()} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">
                          {saveCorrection.isPending ? "Saving…" : "Save corrections"}
                        </button>
                        {canEditDraft && (
                          <button type="button" disabled={submitDocument.isPending} onClick={() => submitDocument.mutate()} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                            {submitDocument.isPending ? "Submitting…" : "Submit for review"}
                          </button>
                        )}
                      </div>
                      {detailQuery.data.events.length > 0 && (
                        <div className="mt-4 border-t border-blue-100 pt-3">
                          <p className="text-xs font-semibold text-slate-700">Activity</p>
                          <ul className="mt-2 space-y-2">
                            {detailQuery.data.events.map((event, index) => (
                              <li key={`${event.eventType}-${event.createdAt}-${index}`} className="flex items-center gap-2 text-xs text-slate-600">
                                <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                                {readableStatus(event.eventType)} · {formatDate(event.createdAt)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
            </div>
          )}
          {historyQuery.data?.events.length ? (
            <details className="mt-4 rounded-lg border border-slate-200 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-slate-700">Recent account activity</summary>
              <ul className="mt-3 space-y-2">
                {historyQuery.data.events.slice(0, 8).map((event) => (
                  <li key={event.id} className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" /> {readableStatus(event.eventType)} · {formatDate(event.createdAt)}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      </div>
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
        Self-declared entries and document uploads do not affect your Score or Confidence. A file is only described as document-supported after Cush review. Independent verification is not inferred from upload or text extraction.
      </p>
    </section>
  );
}
